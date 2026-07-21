// @ts-check
// Generic finite state machine. Pure module — no DOM, no Electron —
// so behaviors can be unit-tested headlessly with `node --test`.

/**
 * @template C
 * @typedef {{
 *   enter?: (ctx: C, fsm: FSM<C>) => void,
 *   update?: (ctx: C, dt: number, fsm: FSM<C>) => string | null | undefined | void,
 *   exit?: (ctx: C, fsm: FSM<C>) => void,
 * }} StateDef
 */

/**
 * @template C
 * @typedef {{
 *   state: string,
 *   elapsed: number,
 *   update: (dt: number) => void,
 *   transition: (next: string) => void,
 * }} FSM
 */

/**
 * @template C
 * @param {{ initial: string, states: Record<string, StateDef<C>>, ctx: C }} opts
 * @returns {FSM<C>}
 */
export function createFSM({ initial, states, ctx }) {
  if (!states[initial]) throw new Error(`unknown initial state: ${initial}`);
  let current = initial;
  let elapsed = 0;

  const fsm = {
    get state() {
      return current;
    },
    get elapsed() {
      return elapsed;
    },
    /** @param {string} next */
    transition(next) {
      if (!states[next]) throw new Error(`unknown state: ${next}`);
      if (next === current) return;
      states[current].exit?.(ctx, fsm);
      current = next;
      elapsed = 0;
      states[current].enter?.(ctx, fsm);
    },
    /** @param {number} dt */
    update(dt) {
      elapsed += dt;
      const next = states[current].update?.(ctx, dt, fsm);
      if (typeof next === 'string' && next !== current) {
        fsm.transition(next);
      }
    },
  };

  states[initial].enter?.(ctx, fsm);
  return fsm;
}
