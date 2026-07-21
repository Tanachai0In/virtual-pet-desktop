// @ts-check
// Capped, tiered game loop. This file owns the CPU budget:
//  - rAF throttled by timestamp delta to the current tier's fps
//  - tier 'off' cancels rAF entirely and polls a wake condition every 5s
//    (used while the pet sleeps inside the house)
// calm stays at 24 so the 24fps walk/run sprite cycles render every frame.
export const TIERS = { active: 30, calm: 24, drowsy: 8, off: 0 };

const WAKE_POLL_MS = 5000;
const MAX_DT = 0.15; // clamp so the drowsy tier never slows simulation

/**
 * @param {{
 *   update: (dt: number) => void,
 *   draw: () => void,
 *   getTier: () => keyof typeof TIERS,
 * }} opts
 */
export function createLoop({ update, draw, getTier }) {
  /** @type {number | null} */
  let rafId = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let wakeTimer = null;
  let last = 0;
  let running = false;

  /** @param {number} now */
  function frame(now) {
    rafId = null;
    if (!running) return;
    const tier = getTier();
    const fps = TIERS[tier] ?? 30;

    if (fps === 0) {
      // Full stop: draw one static frame, then poll for wake conditions.
      draw();
      wakeTimer = setTimeout(checkWake, WAKE_POLL_MS);
      return;
    }

    const interval = 1000 / fps;
    if (now - last >= interval) {
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;
      update(dt);
      draw();
    }
    rafId = requestAnimationFrame(frame);
  }

  function checkWake() {
    wakeTimer = null;
    if (!running) return;
    if (getTier() !== 'off') {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    } else {
      wakeTimer = setTimeout(checkWake, WAKE_POLL_MS);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (wakeTimer !== null) clearTimeout(wakeTimer);
      rafId = null;
      wakeTimer = null;
    },
    /** Wake immediately from the 'off' tier (e.g. user interaction). */
    nudge() {
      if (!running) return;
      if (rafId === null) {
        if (wakeTimer !== null) clearTimeout(wakeTimer);
        wakeTimer = null;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    },
  };
}
