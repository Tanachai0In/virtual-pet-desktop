import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBall, stepBall, kickBall, BOUNCE, DESPAWN_AFTER_REST_S } from '../src/renderer/game/ball.js';

const ENV = { floorY: 140, wallL: 20, wallR: 800 };

function simulate(ball, seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) stepBall(ball, dt, ENV);
  return ball;
}

test('gravity pulls the ball to the floor', () => {
  const b = createBall(400, 0, 0, 0);
  simulate(b, 1);
  assert.ok(b.y <= ENV.floorY + 0.001);
});

test('floor bounce loses energy', () => {
  const b = createBall(400, 100, 0, 300);
  let prevPeak = Infinity;
  // measure two consecutive bounce peaks
  for (let bounce = 0; bounce < 2; bounce++) {
    // fall until floor contact
    while (b.vy >= 0 || b.y < ENV.floorY) {
      stepBall(b, 1 / 120, ENV);
      if (b.resting) break;
    }
    // rise to peak
    let peak = b.y;
    while (b.vy < 0) {
      stepBall(b, 1 / 120, ENV);
      peak = Math.min(peak, b.y);
    }
    const height = ENV.floorY - peak;
    assert.ok(height < prevPeak, `bounce ${bounce} should be lower`);
    prevPeak = height;
    if (b.resting) break;
  }
});

test('wall reflection flips vx with energy loss', () => {
  const b = createBall(30, ENV.floorY, -500, 0);
  stepBall(b, 0.1, ENV);
  assert.ok(b.x >= ENV.wallL);
  assert.ok(b.vx > 0, 'vx should flip to positive');
  assert.ok(Math.abs(b.vx) < 500, 'reflection loses energy');
});

test('ball comes to rest and tracks rest time', () => {
  const b = createBall(400, 100, 250, 0);
  simulate(b, 20);
  assert.equal(b.resting, true);
  assert.equal(b.vx, 0);
  const before = b.restTime;
  stepBall(b, 1, ENV);
  assert.equal(b.restTime, before + 1);
  assert.ok(DESPAWN_AFTER_REST_S > 0);
});

test('held ball does not move', () => {
  const b = createBall(400, 50, 100, 100);
  b.held = true;
  stepBall(b, 1, ENV);
  assert.equal(b.x, 400);
  assert.equal(b.y, 50);
});

test('kickBall sends the ball away from the kicker and re-activates it', () => {
  const b = createBall(400, ENV.floorY, 0, 0);
  b.resting = true;
  b.restTime = 5;
  kickBall(b, 350); // kicker on the left → ball flies right
  assert.ok(b.vx > 0);
  assert.ok(b.vy < 0);
  assert.equal(b.resting, false);
  assert.equal(b.restTime, 0);
});

test('bounce constant is lossy', () => {
  assert.ok(BOUNCE > 0 && BOUNCE < 1);
});
