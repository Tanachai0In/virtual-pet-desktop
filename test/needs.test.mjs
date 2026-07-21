import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeeds,
  decay,
  applyOffline,
  applyFood,
  clampNeed,
  RATES,
  OFFLINE_CAP_S,
} from '../src/renderer/game/needs.js';

test('clampNeed bounds to 0..100', () => {
  assert.equal(clampNeed(-5), 0);
  assert.equal(clampNeed(105), 100);
  assert.equal(clampNeed(50), 50);
});

test('awake decay: hunger rises, energy and happiness fall', () => {
  const n = createNeeds({ hunger: 30, happiness: 70, energy: 80 });
  decay(n, 60); // one minute awake
  assert.equal(n.hunger, 30 + RATES.hungerAwake);
  assert.equal(n.happiness, 70 - RATES.happinessDecay);
  assert.equal(n.energy, 80 - RATES.energyAwake);
});

test('asleep decay: hunger rises slowly, energy regenerates', () => {
  const n = createNeeds({ hunger: 30, happiness: 70, energy: 50 });
  decay(n, 60, { asleep: true });
  assert.equal(n.hunger, 30 + RATES.hungerAsleep);
  assert.equal(n.energy, 50 + RATES.energyAsleepRegen);
});

test('napping regenerates energy at the nap rate', () => {
  const n = createNeeds({ energy: 50 });
  decay(n, 60, { napping: true });
  assert.equal(n.energy, 50 + RATES.energyNapRegen);
});

test('offline decay is clamped to the 8h cap', () => {
  const a = createNeeds({ hunger: 0, happiness: 100, energy: 0 });
  const b = createNeeds({ hunger: 0, happiness: 100, energy: 0 });
  applyOffline(a, OFFLINE_CAP_S);
  applyOffline(b, OFFLINE_CAP_S * 100); // a month away != a month of decay
  assert.deepEqual(a, b);
});

test('offline decay ignores negative elapsed (clock skew)', () => {
  const n = createNeeds({ hunger: 40, happiness: 60, energy: 50 });
  const before = { ...n };
  applyOffline(n, -3600);
  assert.deepEqual(n, before);
});

test('feeding reduces hunger and boosts happiness, clamped', () => {
  const n = createNeeds({ hunger: 20, happiness: 98 });
  applyFood(n, { nutrition: 35 });
  assert.equal(n.hunger, 0);
  assert.equal(n.happiness, 100);
});
