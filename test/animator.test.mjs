import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameIndexAt, isFinished } from '../src/renderer/engine/animator.js';

const WALK = { row: 1, frames: 8, fps: 12, loop: true };
const SIT = { row: 3, frames: 6, fps: 8, loop: true, loopFrom: 2 };
const POUNCE = { row: 7, frames: 8, fps: 14, loop: false };

test('frame advances with time at anim fps', () => {
  assert.equal(frameIndexAt(WALK, 0), 0);
  assert.equal(frameIndexAt(WALK, 1 / 12 + 1e-6), 1);
  assert.equal(frameIndexAt(WALK, 7 / 12 + 1e-6), 7);
});

test('plain loop wraps to frame 0', () => {
  assert.equal(frameIndexAt(WALK, 8 / 12 + 1e-6), 0);
  assert.equal(frameIndexAt(WALK, 17 / 12 + 1e-6), 1);
});

test('loopFrom plays intro once then cycles the tail', () => {
  // 6 frames, loopFrom 2 → after 0..5, cycle 2,3,4,5,2,...
  const f = (t) => frameIndexAt(SIT, t / 8 + 1e-6);
  assert.equal(f(5), 5);
  assert.equal(f(6), 2);
  assert.equal(f(7), 3);
  assert.equal(f(9), 5);
  assert.equal(f(10), 2);
});

test('non-loop clamps on last frame and reports finished', () => {
  const dur = POUNCE.frames / POUNCE.fps;
  assert.equal(frameIndexAt(POUNCE, dur * 10), POUNCE.frames - 1);
  assert.equal(isFinished(POUNCE, dur * 0.5), false);
  assert.equal(isFinished(POUNCE, dur + 1e-6), true);
});

test('looping animations never finish', () => {
  assert.equal(isFinished(WALK, 1000), false);
});

test('negative time clamps to frame 0', () => {
  assert.equal(frameIndexAt(WALK, -1), 0);
});
