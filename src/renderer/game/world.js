// @ts-check
// The world owns all entities and orchestrates update/draw. It is also the
// behavior ctx (see behaviors.js).
import { createPet } from './pet.js';
import { createHouse, drawHouse, houseRect } from './house.js';
import { createBehaviors } from './behaviors.js';
import { decay } from './needs.js';
import { stepBall, createBall, DESPAWN_AFTER_REST_S } from './ball.js';
import { createFood, FOOD_DESPAWN_S } from './food.js';
import { createParticles } from '../engine/particles.js';
import { drawItem } from '../engine/spritesheet.js';
import { drawHud } from '../ui/hud.js';

const FLOOR_PAD = 8;
const EDGE_MARGIN = 24;
const SAVE_EVERY_S = 10;
const BALL_R = 14;

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   sheets: Record<string, any>,
 *   common: any,
 *   save: any,
 *   api: any,
 *   rng?: () => number,
 *   viewW?: number,
 *   viewH?: number,
 *   dpr?: number,
 * }} opts
 */
export function createWorld({
  canvas,
  sheets,
  common,
  save,
  api,
  rng = Math.random,
  viewW = canvas.width,
  viewH = canvas.height,
  dpr = 1,
}) {
  const ctx2d = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  const world = {
    canvas,
    sheets,
    common,
    api,
    rng,
    species: sheets[save.species] ? save.species : Object.keys(sheets)[0],
    // Logical (CSS-pixel) viewport; the canvas backing store is this times
    // dpr so sprites stay crisp on hi-dpi screens.
    viewW,
    viewH,
    dpr,
    floorY: viewH - FLOOR_PAD,
    minX: EDGE_MARGIN,
    maxX: viewW - EDGE_MARGIN,
    /** @type {import('./food.js').FoodItem[]} */
    foods: [],
    /** @type {import('./ball.js').Ball | null} */
    ball: null,
    ballIgnored: false,
    wakeRequested: false,
    goHomeRequested: false,
    particles: createParticles(),
    /** @type {Record<string, any>} */
    scratch: {},
    cursor: { x: -1, y: -1, inside: false, interactive: false },
    saveTimer: 0,
    settings: save.settings ?? { houseSide: 'right', autostart: false },
    house: /** @type {import('./house.js').House} */ (/** @type {any} */ (null)),
    pet: /** @type {import('./pet.js').Pet} */ (/** @type {any} */ (null)),
    /** ball drag state */
    drag: { active: false, history: /** @type {{x:number,y:number,t:number}[]} */ ([]) },

    /**
     * Set the logical viewport (CSS px) and pixel density. The caller sizes
     * the canvas backing store to viewW*dpr × viewH*dpr.
     * @param {number} [w] @param {number} [h] @param {number} [dpr]
     */
    resize(w = this.viewW, h = this.viewH, dpr = this.dpr) {
      this.viewW = w;
      this.viewH = h;
      this.dpr = dpr;
      this.floorY = h - FLOOR_PAD;
      this.maxX = w - EDGE_MARGIN;
      this.house = createHouse({
        barW: w,
        side: this.settings.houseSide,
        renderHeight: this.common.meta.house.renderHeight ?? 150,
      });
      if (this.pet) this.pet.x = Math.min(Math.max(this.pet.x, this.minX), this.maxX);
    },

    /** @param {string} name */
    setSpecies(name) {
      if (!this.sheets[name]) return;
      this.species = name;
      this.pet.sheet = this.sheets[name];
      this.pet.animator.setSheet(this.sheets[name]);
      this.api.speciesChanged?.(name);
    },

    /** @param {number} dt */
    update(dt) {
      const pet = this.pet;
      const state = pet.fsm ? pet.fsm.state : 'idle';

      pet.strokeHeat = Math.max(0, pet.strokeHeat - 60 * dt);
      decay(pet.needs, dt, { asleep: pet.inHouse, napping: state === 'nap' });
      pet.fsm?.update(dt);
      pet.animator.update(dt);

      if (this.ball) {
        stepBall(this.ball, dt, { floorY: this.floorY - BALL_R, wallL: this.minX, wallR: this.maxX });
        if (this.ball.resting && this.ball.restTime > DESPAWN_AFTER_REST_S) {
          this.ball = null;
          this.ballIgnored = false;
        }
      }

      for (let i = this.foods.length - 1; i >= 0; i--) {
        this.foods[i].age += dt;
        if (this.foods[i].age > FOOD_DESPAWN_S) this.foods.splice(i, 1);
      }

      this.particles.update(dt);

      this.saveTimer += dt;
      if (this.saveTimer >= SAVE_EVERY_S) {
        this.saveTimer = 0;
        this.api.saveState?.(this.stateForSave());
      }
    },

    draw() {
      ctx2d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx2d.clearRect(0, 0, this.viewW, this.viewH);
      drawHouse(ctx2d, this.house, this.common, this.floorY);
      for (const f of this.foods) {
        const def = /** @type {any} */ (this.common.meta.items.cells);
        const cell = { fish: 'fish', bone: 'bone', kibble: 'bowl', cookie: 'cookie' }[f.type] ?? 'cookie';
        if (def) drawItem(ctx2d, this.common, cell, f.x, this.floorY - 16, 36);
      }
      if (this.ball) drawItem(ctx2d, this.common, 'ball', this.ball.x, this.ball.y, BALL_R * 2);
      if (!this.pet.inHouse) {
        this.pet.animator.draw(ctx2d, this.pet.x, this.floorY, { flip: this.pet.dir === -1 });
      }
      this.particles.draw(ctx2d, this.common);
      drawHud(ctx2d, this);
    },

    /** Current fps tier for the loop. @returns {'active'|'calm'|'drowsy'|'off'} */
    tier() {
      const state = this.pet.fsm ? this.pet.fsm.state : 'idle';
      if (this.pet.inHouse && this.particles.liveCount === 0 && !this.cursor.interactive) return 'off';
      if (
        this.particles.liveCount > 0 ||
        this.cursor.interactive ||
        this.ball !== null ||
        state === 'petted' ||
        state === 'chaseBall' ||
        state === 'pounce' ||
        state === 'eat'
      ) {
        return 'active';
      }
      if (state === 'sit' || state === 'nap' || state === 'inHouse') return 'drowsy';
      return 'calm';
    },

    /** Interactive rects (canvas coords) — pet, house, ball, foods. */
    hitRects() {
      const rects = [];
      if (!this.pet.inHouse) {
        const r = this.pet.bodyRect(this.floorY);
        rects.push({ x: r.x - 12, y: r.y - 12, w: r.w + 24, h: r.h + 24 });
      }
      rects.push(houseRect(this.house, this.floorY));
      if (this.ball) {
        rects.push({ x: this.ball.x - 24, y: this.ball.y - 24, w: 48, h: 48 });
      }
      for (const f of this.foods) rects.push({ x: f.x - 20, y: this.floorY - 40, w: 40, h: 40 });
      return rects;
    },

    /** @param {{x:number,y:number}} pt */
    hitTest(pt) {
      return this.hitRects().some(
        (r) => pt.x >= r.x && pt.x < r.x + r.w && pt.y >= r.y && pt.y < r.y + r.h
      );
    },

    // ---- user input ----

    /** @param {{x:number,y:number}} pt @param {number} movedDist */
    onPointerMove(pt, movedDist) {
      this.cursor.x = pt.x;
      this.cursor.y = pt.y;
      this.cursor.inside = true;
      if (this.drag.active && this.ball) {
        this.ball.x = pt.x;
        this.ball.y = pt.y;
        this.drag.history.push({ x: pt.x, y: pt.y, t: performance.now() });
        if (this.drag.history.length > 8) this.drag.history.shift();
        return;
      }
      // Stroking the head = petting.
      if (!this.pet.inHouse && movedDist > 0) {
        const head = this.pet.headRect(this.floorY);
        if (pt.x >= head.x && pt.x < head.x + head.w && pt.y >= head.y && pt.y < head.y + head.h) {
          this.pet.strokeHeat += movedDist;
        }
      }
    },

    /** @param {{x:number,y:number}} pt */
    onPointerDown(pt) {
      // Grab the ball?
      if (this.ball) {
        const dx = pt.x - this.ball.x;
        const dy = pt.y - this.ball.y;
        if (dx * dx + dy * dy < 26 * 26) {
          this.ball.held = true;
          this.drag.active = true;
          this.drag.history = [{ x: pt.x, y: pt.y, t: performance.now() }];
          return;
        }
      }
      // House: click roof to send home / bring out.
      const hr = houseRect(this.house, this.floorY);
      if (pt.x >= hr.x && pt.x < hr.x + hr.w && pt.y >= hr.y && pt.y < hr.y + hr.h) {
        if (this.pet.inHouse) {
          this.wakeRequested = true;
        } else {
          this.goHomeRequested = true;
        }
        return;
      }
      // Pet: a click is a pat (also wakes a napping pet).
      if (!this.pet.inHouse) {
        const b = this.pet.bodyRect(this.floorY);
        if (pt.x >= b.x && pt.x < b.x + b.w && pt.y >= b.y && pt.y < b.y + b.h) {
          this.pet.strokeHeat += 50;
          this.wakeRequested = true;
        }
      }
    },

    onPointerUp() {
      if (this.drag.active && this.ball) {
        this.ball.held = false;
        this.drag.active = false;
        // Throw velocity from recent drag history.
        const h = this.drag.history;
        if (h.length >= 2) {
          const a = h[0];
          const b = h[h.length - 1];
          const dtms = Math.max(16, b.t - a.t);
          this.ball.vx = Math.max(-900, Math.min(900, ((b.x - a.x) / dtms) * 1000));
          this.ball.vy = Math.max(-900, Math.min(300, ((b.y - a.y) / dtms) * 1000));
        }
        this.ball.rolling = false;
        this.ball.resting = false;
        this.ball.restTime = 0;
      }
    },

    /** Tray / menu actions. @param {{type:string, food?:string, species?:string, name?:string}} action */
    handleAction(action) {
      switch (action.type) {
        case 'feed': {
          const x = this.cursor.inside && this.cursor.x > 0
            ? this.cursor.x
            : this.minX + this.rng() * (this.maxX - this.minX) * 0.6;
          const type = /** @type {any} */ (action.food ?? 'cookie');
          this.foods.push(createFood(type, Math.min(Math.max(x, this.minX), this.maxX), this.floorY));
          this.wakeRequested = true;
          break;
        }
        case 'play-ball': {
          const x = this.minX + this.rng() * (this.maxX - this.minX);
          this.ball = createBall(x, this.floorY - 120, (this.rng() - 0.5) * 500, -150);
          this.ballIgnored = false;
          this.scratch.kicks = 0;
          this.wakeRequested = true;
          break;
        }
        case 'send-home':
          this.goHomeRequested = true;
          break;
        case 'wake-up':
          this.wakeRequested = true;
          break;
        case 'set-species':
          if (action.species) this.setSpecies(action.species);
          break;
        case 'rename':
          if (typeof action.name === 'string' && action.name.trim()) {
            this.pet.name = action.name.trim();
            this.api.nameChanged?.(this.pet.name);
            this.api.saveState?.(this.stateForSave());
          }
          break;
      }
    },

    stateForSave() {
      return {
        version: 1,
        species: this.species,
        name: this.pet.name,
        hunger: this.pet.needs.hunger,
        happiness: this.pet.needs.happiness,
        energy: this.pet.needs.energy,
        lastSeenISO: new Date().toISOString(),
        settings: this.settings,
      };
    },
  };

  world.resize();
  world.pet = createPet({
    sheet: sheets[world.species],
    save,
    x: world.minX + (world.maxX - world.minX) * 0.35,
  });
  createBehaviors(/** @type {any} */ (world));
  return world;
}
