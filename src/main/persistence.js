// @ts-check
// Pet state persistence: one small JSON file in userData, atomic write
// (tmp + rename), debounced 5s, synchronous flush on quit.
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const SAVE_DEBOUNCE_MS = 5000;

/** @typedef {{
 *   version: number,
 *   species: string,
 *   name: string,
 *   hunger: number,
 *   happiness: number,
 *   energy: number,
 *   lastSeenISO: string,
 *   settings: { houseSide: 'left'|'right', autostart: boolean }
 * }} SaveState */

/** @returns {SaveState} */
export function defaultState() {
  return {
    version: 1,
    species: 'cat',
    name: 'Mochi',
    hunger: 30,
    happiness: 70,
    energy: 80,
    lastSeenISO: new Date().toISOString(),
    settings: { houseSide: 'right', autostart: false },
  };
}

function savePath() {
  return path.join(app.getPath('userData'), 'save.json');
}

/** @type {SaveState | null} */
let pending = null;
/** @type {NodeJS.Timeout | null} */
let timer = null;

/** @returns {SaveState} */
export function loadState() {
  try {
    const raw = fs.readFileSync(savePath(), 'utf8');
    const data = JSON.parse(raw);
    if (data && data.version === 1) {
      return { ...defaultState(), ...data, settings: { ...defaultState().settings, ...data.settings } };
    }
  } catch {
    // first run or corrupt file — start fresh
  }
  return defaultState();
}

function writeAtomic(/** @type {SaveState} */ state) {
  const file = savePath();
  const tmp = file + '.tmp';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('[persistence] write failed', err);
  }
}

/** Queue a debounced save. @param {SaveState} state */
export function saveState(state) {
  pending = state;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (pending) {
      writeAtomic(pending);
      pending = null;
    }
  }, SAVE_DEBOUNCE_MS);
}

/** Flush any pending save synchronously (called on quit). */
export function flushStateSync() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    writeAtomic(pending);
    pending = null;
  }
}
