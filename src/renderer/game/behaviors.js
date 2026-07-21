// @ts-check
// Behavior state definitions for the pet FSM. Pure module: ctx is the world
// (pet, house, foods, ball, particles, rng, geometry) — injectable in tests.
import { createFSM } from './statemachine.js';
import { applyFood, clampNeed } from './needs.js';
import { FOODS } from './food.js';
import { kickBall } from './ball.js';

const RUN_DISTANCE = 250;
const POUNCE_RANGE = 34;
const STROKE_TRIGGER = 40;

/**
 * @typedef {{
 *   pet: import('./pet.js').Pet,
 *   house: import('./house.js').House,
 *   foods: import('./food.js').FoodItem[],
 *   ball: import('./ball.js').Ball | null,
 *   ballIgnored: boolean,
 *   wakeRequested: boolean,
 *   goHomeRequested: boolean,
 *   particles: { spawn: (kind: 'heart'|'zzz'|'crumb', x: number, y: number) => void },
 *   rng: () => number,
 *   floorY: number,
 *   minX: number,
 *   maxX: number,
 *   scratch: Record<string, any>,
 * }} BehaviorCtx
 */

/** Interrupts shared by idle/walk/sit. @param {BehaviorCtx} ctx @returns {string | null} */
function commonInterrupts(ctx) {
  const { pet } = ctx;
  if (pet.strokeHeat > STROKE_TRIGGER) return 'petted';
  if (ctx.goHomeRequested) return 'goHome';
  if (ctx.ball && !ctx.ballIgnored && !ctx.ball.resting) return 'chaseBall';
  if (ctx.foods.length > 0) return 'seekFood';
  if (pet.needs.energy < 20) return 'goHome';
  return null;
}

/** Nearest food item or null. @param {BehaviorCtx} ctx */
function nearestFood(ctx) {
  let best = null;
  let bestD = Infinity;
  for (const f of ctx.foods) {
    const d = Math.abs(f.x - ctx.pet.x);
    if (d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}

/** Random wander target that avoids the house interior. @param {BehaviorCtx} ctx */
function pickWanderTarget(ctx) {
  const { house, rng } = ctx;
  const lo = house.side === 'left' ? house.x + house.w + 20 : ctx.minX;
  const hi = house.side === 'right' ? house.x - 20 : ctx.maxX;
  return lo + rng() * Math.max(1, hi - lo);
}

/** Build the behavior FSM and attach it to ctx.pet. @param {BehaviorCtx} ctx */
export function createBehaviors(ctx) {
  const { pet } = ctx;
  const anim = (/** @type {string} */ name, restart = false) => pet.animator.setAnim(name, restart);

  /** @type {Record<string, import('./statemachine.js').StateDef<BehaviorCtx>>} */
  const states = {
    idle: {
      enter(c) {
        anim('idle');
        c.scratch.idleUntil = 2 + c.rng() * 4;
      },
      update(c, _dt, fsm) {
        const intr = commonInterrupts(c);
        if (intr) return intr;
        if (pet.needs.energy < 35 && c.rng() < 0.002) return 'nap';
        if (fsm.elapsed > c.scratch.idleUntil) {
          return c.rng() < 0.7 ? 'walk' : 'sit';
        }
      },
    },

    walk: {
      enter(c) {
        anim('walk');
        pet.targetX = pickWanderTarget(c);
      },
      update(c, dt) {
        const intr = commonInterrupts(c);
        if (intr) return intr;
        if (pet.targetX === null) return 'idle';
        if (pet.stepToward(pet.targetX, pet.speed('walk'), dt)) {
          pet.targetX = null;
          return 'idle';
        }
      },
    },

    sit: {
      enter(c) {
        anim('sit');
        c.scratch.sitUntil = 3 + c.rng() * 5;
      },
      update(c, _dt, fsm) {
        const intr = commonInterrupts(c);
        if (intr) return intr;
        if (fsm.elapsed > c.scratch.sitUntil) return 'idle';
      },
    },

    nap: {
      enter(c) {
        anim('sleep');
        c.scratch.napUntil = 20 + c.rng() * 20;
        c.scratch.zzzTimer = 0;
      },
      update(c, dt, fsm) {
        c.scratch.zzzTimer += dt;
        if (c.scratch.zzzTimer > 1.2) {
          c.scratch.zzzTimer = 0;
          c.particles.spawn('zzz', pet.x + 14 * pet.dir, c.floorY - 70);
        }
        if (c.wakeRequested || pet.strokeHeat > STROKE_TRIGGER) return 'idle';
        if (fsm.elapsed > c.scratch.napUntil || pet.needs.energy > 85) return 'idle';
        if (c.ball && !c.ballIgnored && !c.ball.resting) return 'chaseBall';
      },
      exit(c) {
        c.wakeRequested = false;
      },
    },

    petted: {
      enter(c) {
        anim('happy');
        c.scratch.heartTimer = 0;
      },
      update(c, dt, fsm) {
        pet.needs.happiness = clampNeed(pet.needs.happiness + 4 * dt);
        c.scratch.heartTimer += dt;
        if (c.scratch.heartTimer > 0.35) {
          c.scratch.heartTimer = 0;
          const head = pet.headRect(c.floorY);
          c.particles.spawn('heart', head.x + head.w / 2, head.y);
        }
        if (fsm.elapsed > 1.2 && pet.strokeHeat < 5) return 'idle';
      },
    },

    seekFood: {
      enter() {
        anim('walk');
      },
      update(c, dt) {
        if (pet.strokeHeat > STROKE_TRIGGER) return 'petted';
        const food = nearestFood(c);
        if (!food) return 'idle';
        const dist = Math.abs(food.x - pet.x);
        anim(dist > RUN_DISTANCE ? 'run' : 'walk');
        const sp = pet.speed(dist > RUN_DISTANCE ? 'run' : 'walk');
        if (pet.stepToward(food.x, sp, dt)) {
          c.scratch.eatingFood = food;
          return 'eat';
        }
      },
    },

    eat: {
      enter(c) {
        anim('eat', true);
        c.scratch.biteTimer = 0;
      },
      update(c, dt) {
        const food = c.scratch.eatingFood;
        if (!food || !c.foods.includes(food)) return 'idle';
        const a = pet.animator.anim;
        const loopDur = a.frames / a.fps;
        c.scratch.biteTimer += dt;
        if (c.scratch.biteTimer >= loopDur) {
          c.scratch.biteTimer = 0;
          food.bites -= 1;
          c.particles.spawn('crumb', food.x, c.floorY - 20);
          if (food.bites <= 0) {
            c.foods.splice(c.foods.indexOf(food), 1);
            applyFood(pet.needs, FOODS[food.type] ?? FOODS.cookie);
            c.scratch.eatingFood = null;
            return 'idle';
          }
        }
      },
    },

    chaseBall: {
      enter(c) {
        anim('run');
        c.scratch.kicks = c.scratch.kicks ?? 0;
      },
      update(c, dt) {
        const ball = c.ball;
        if (!ball || c.ballIgnored) return 'idle';
        if (ball.resting && ball.restTime > 2) return 'idle';
        const dist = Math.abs(ball.x - pet.x);
        if (dist <= POUNCE_RANGE) return 'pounce';
        anim(dist > RUN_DISTANCE ? 'run' : 'run');
        pet.stepToward(ball.x, pet.speed('run'), dt);
      },
    },

    pounce: {
      enter(c) {
        anim('pounce', true);
        c.scratch.pounceDone = false;
      },
      update(c) {
        if (!pet.animator.finished) return;
        const ball = c.ball;
        if (ball) {
          kickBall(ball, pet.x);
          pet.needs.happiness = clampNeed(pet.needs.happiness + 3);
          pet.needs.energy = clampNeed(pet.needs.energy - 2);
          c.scratch.kicks = (c.scratch.kicks ?? 0) + 1;
          if (c.scratch.kicks >= c.scratch.maxKicks) {
            c.ballIgnored = true;
            c.scratch.kicks = 0;
            return 'idle';
          }
          return 'chaseBall';
        }
        return 'idle';
      },
    },

    goHome: {
      enter(c) {
        anim('walk');
        c.goHomeRequested = false;
      },
      update(c, dt) {
        if (pet.strokeHeat > STROKE_TRIGGER) return 'petted';
        if (pet.stepToward(c.house.doorX, pet.speed('walk'), dt)) return 'inHouse';
      },
    },

    inHouse: {
      enter(c) {
        pet.inHouse = true;
        c.house.variant = 'sleeping';
      },
      update(c) {
        if (c.wakeRequested || pet.needs.energy >= 95) return 'idle';
      },
      exit(c) {
        pet.inHouse = false;
        pet.x = c.house.doorX;
        c.house.variant = 'open';
        c.wakeRequested = false;
      },
    },
  };

  ctx.scratch.maxKicks = 3 + Math.floor(ctx.rng() * 4);
  const fsm = createFSM({ initial: 'idle', states, ctx });
  pet.fsm = fsm;
  return fsm;
}
