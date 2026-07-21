// @ts-nocheck — the ctx here is a deliberately minimal stub of the world
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBehaviors } from '../src/renderer/game/behaviors.js';
import { createFood } from '../src/renderer/game/food.js';
import { createBall } from '../src/renderer/game/ball.js';
import { createNeeds } from '../src/renderer/game/needs.js';

// Minimal headless pet + world (no canvas, no sprite sheets).
function makeCtx({ rng = () => 0.5 } = {}) {
  const animLog = [];
  const pet = {
    x: 300,
    dir: 1,
    targetX: null,
    name: 'Testy',
    needs: createNeeds({ hunger: 30, happiness: 70, energy: 80 }),
    inHouse: false,
    strokeHeat: 0,
    fsm: null,
    animator: {
      setAnim(name) {
        animLog.push(name);
        this.name = name;
      },
      name: 'idle',
      anim: { frames: 6, fps: 10 },
      finished: false,
    },
    headRect: () => ({ x: 280, y: 40, w: 40, h: 40 }),
    bodyRect: () => ({ x: 270, y: 40, w: 60, h: 100 }),
    speed: (kind) => (kind === 'run' ? 160 : 60),
    stepToward(tx, sp, dt) {
      const dx = tx - this.x;
      if (Math.abs(dx) <= sp * dt) {
        this.x = tx;
        return true;
      }
      this.dir = dx > 0 ? 1 : -1;
      this.x += this.dir * sp * dt;
      return false;
    },
  };
  const ctx = {
    pet,
    house: { x: 700, w: 150, h: 150, doorX: 775, side: 'right', variant: 'open' },
    foods: [],
    ball: null,
    ballIgnored: false,
    wakeRequested: false,
    goHomeRequested: false,
    particles: { spawn() {} },
    rng,
    floorY: 152,
    minX: 24,
    maxX: 900,
    scratch: {},
    animLog,
  };
  return ctx;
}

function run(fsm, seconds, dt = 1 / 30) {
  for (let t = 0; t < seconds; t += dt) fsm.update(dt);
}

test('starts idle, wanders to walk or sit after the idle timer', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  assert.equal(fsm.state, 'idle');
  run(fsm, 7);
  assert.ok(['walk', 'sit', 'idle'].includes(fsm.state));
  assert.ok(ctx.animLog.includes('walk') || ctx.animLog.includes('sit'), 'left idle at least once');
});

test('dropped food interrupts to seekFood then eat, and feeds the pet', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.foods.push(createFood('fish', 340, ctx.floorY));
  const hungerBefore = ctx.pet.needs.hunger;
  run(fsm, 1);
  assert.ok(['seekFood', 'eat'].includes(fsm.state), `state was ${fsm.state}`);
  run(fsm, 10);
  assert.equal(ctx.foods.length, 0, 'food eaten');
  assert.ok(ctx.pet.needs.hunger < hungerBefore, 'hunger reduced');
});

test('a thrown ball triggers the chase', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.ball = createBall(600, 100, 0, 0);
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'chaseBall');
  // pet runs toward the ball
  const x0 = ctx.pet.x;
  run(fsm, 0.5);
  assert.ok(ctx.pet.x > x0, 'moved toward the ball');
});

test('pounce kicks the ball when the animation finishes', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.ball = createBall(310, 140, 0, 0); // within pounce range
  fsm.update(1 / 30); // idle -> chaseBall
  fsm.update(1 / 30); // chaseBall -> pounce
  assert.equal(fsm.state, 'pounce');
  ctx.pet.animator.finished = true;
  fsm.update(1 / 30);
  assert.ok(Math.abs(ctx.ball.vx) > 0, 'ball was kicked');
});

test('stroking the head enters petted and raises happiness', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.pet.strokeHeat = 60;
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'petted');
  const h0 = ctx.pet.needs.happiness;
  run(fsm, 1);
  assert.ok(ctx.pet.needs.happiness > h0);
  // stops when stroking stops
  ctx.pet.strokeHeat = 0;
  run(fsm, 2);
  assert.notEqual(fsm.state, 'petted');
});

test('low energy sends the pet home; it sleeps and wakes rested', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.pet.needs.energy = 10;
  run(fsm, 30); // enough to walk to the door
  assert.equal(fsm.state, 'inHouse');
  assert.equal(ctx.pet.inHouse, true);
  assert.equal(ctx.house.variant, 'sleeping');
  ctx.pet.needs.energy = 96; // regen happens in world.update, simulate it
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'idle');
  assert.equal(ctx.pet.inHouse, false);
  assert.equal(ctx.house.variant, 'open');
});

test('send-home request works from any walking state', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.goHomeRequested = true;
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'goHome');
  assert.equal(ctx.goHomeRequested, false, 'request consumed');
});

test('feeding while asleep in house does not wake the pet by itself', () => {
  const ctx = makeCtx();
  const fsm = createBehaviors(ctx);
  ctx.pet.needs.energy = 10;
  run(fsm, 30);
  assert.equal(fsm.state, 'inHouse');
  ctx.foods.push(createFood('cookie', 200, ctx.floorY));
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'inHouse', 'still asleep');
  // wake request gets it out and then it goes for the food
  ctx.wakeRequested = true;
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'idle');
  fsm.update(1 / 30);
  assert.equal(fsm.state, 'seekFood');
});
