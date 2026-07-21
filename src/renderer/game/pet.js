// @ts-check
// The Pet entity: position on the 1D bar, facing, needs, animator and the
// behavior FSM (attached by behaviors.js).
import { Animator } from '../engine/animator.js';
import { createNeeds } from './needs.js';

/**
 * @param {{ sheet: import('../engine/animator.js').SpeciesSheet & {name?: string},
 *           save?: { hunger?: number, happiness?: number, energy?: number, name?: string },
 *           x?: number }} opts
 */
export function createPet({ sheet, save = {}, x = 200 }) {
  const pet = {
    x,
    dir: 1, // 1 = facing right, -1 = facing left
    targetX: /** @type {number | null} */ (null),
    name: save.name ?? 'Mochi',
    sheet,
    animator: new Animator(sheet, 'idle'),
    needs: createNeeds(save),
    inHouse: false,
    /** accumulated stroking from input (px of cursor movement over the head) */
    strokeHeat: 0,
    /** @type {import('./statemachine.js').FSM<any> | null} */
    fsm: null,

    /** Pet body rect in canvas coords (for hover/click). @param {number} floorY */
    bodyRect(floorY) {
      const m = this.sheet.meta;
      const s = m.renderScale;
      const w = m.frame.w * s * 0.62;
      const h = m.frame.h * s * 0.78;
      return { x: this.x - w / 2, y: floorY - h, w, h };
    },

    /** Head rect (petting zone), from meta.headBox, flip-aware. @param {number} floorY */
    headRect(floorY) {
      const m = /** @type {any} */ (this.sheet.meta);
      const s = m.renderScale;
      const hb = m.headBox ?? { x: 24, y: 8, w: 80, h: 60 };
      const ax = m.anchor.x;
      const ay = m.anchor.y;
      const left =
        this.dir === 1 ? this.x + (hb.x - ax) * s : this.x + (ax - hb.x - hb.w) * s;
      return { x: left, y: floorY - ay * s + hb.y * s, w: hb.w * s, h: hb.h * s };
    },

    /** Walk/run speed in px/s from meta. @param {'walk'|'run'} kind */
    speed(kind) {
      const speeds = /** @type {any} */ (this.sheet.meta).speeds ?? { walk: 60, run: 160 };
      return speeds[kind] ?? 60;
    },

    /** Face and step toward x; returns true when arrived. @param {number} tx @param {number} sp @param {number} dt */
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
  return pet;
}

/** @typedef {ReturnType<typeof createPet>} Pet */
