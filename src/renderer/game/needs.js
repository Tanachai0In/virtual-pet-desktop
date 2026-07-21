// @ts-check
// Pet needs (hunger / happiness / energy, all 0..100). Pure module.
// Decay is driven by wall-clock deltas so time also passes while the app is
// closed; offline decay is clamped to OFFLINE_CAP_S.

export const OFFLINE_CAP_S = 8 * 3600;

// Rates are per minute.
export const RATES = {
  hungerAwake: 2,
  hungerAsleep: 0.5,
  happinessDecay: 1,
  energyAwake: 1.2,
  energyAsleepRegen: 10,
  energyNapRegen: 5,
};

/** @typedef {{ hunger: number, happiness: number, energy: number }} Needs */

/** @param {number} v */
export function clampNeed(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * @param {Partial<Needs>} [init]
 * @returns {Needs}
 */
export function createNeeds(init = {}) {
  return {
    hunger: clampNeed(init.hunger ?? 30),
    happiness: clampNeed(init.happiness ?? 70),
    energy: clampNeed(init.energy ?? 80),
  };
}

/**
 * Apply time-based decay in place.
 * @param {Needs} needs
 * @param {number} seconds
 * @param {{ asleep?: boolean, napping?: boolean }} [mode]
 */
export function decay(needs, seconds, mode = {}) {
  const min = seconds / 60;
  const asleep = Boolean(mode.asleep);
  needs.hunger = clampNeed(needs.hunger + (asleep ? RATES.hungerAsleep : RATES.hungerAwake) * min);
  needs.happiness = clampNeed(needs.happiness - RATES.happinessDecay * min);
  if (asleep) {
    needs.energy = clampNeed(needs.energy + RATES.energyAsleepRegen * min);
  } else if (mode.napping) {
    needs.energy = clampNeed(needs.energy + RATES.energyNapRegen * min);
  } else {
    needs.energy = clampNeed(needs.energy - RATES.energyAwake * min);
  }
  return needs;
}

/**
 * Apply offline decay for elapsed seconds (clamped). The pet is assumed to
 * have been asleep while the app was closed — gentler on stats.
 * @param {Needs} needs
 * @param {number} elapsedSeconds
 */
export function applyOffline(needs, elapsedSeconds) {
  const s = Math.max(0, Math.min(OFFLINE_CAP_S, elapsedSeconds));
  return decay(needs, s, { asleep: true });
}

/**
 * @param {Needs} needs
 * @param {{ nutrition: number }} food
 */
export function applyFood(needs, food) {
  needs.hunger = clampNeed(needs.hunger - food.nutrition);
  needs.happiness = clampNeed(needs.happiness + 5);
  return needs;
}
