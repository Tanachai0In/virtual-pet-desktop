// @ts-check
// Ball physics along the bar: gravity, floor bounce with energy loss, wall
// reflection, rolling friction, rest detection. Pure step function.

export const GRAVITY = 1800; // px/s^2
export const BOUNCE = 0.55;
export const BOUNCE_FRICTION = 0.85;
export const WALL_BOUNCE = 0.8;
export const ROLL_DRAG = 3; // proportional per second
export const REST_VX = 5;
export const ROLL_VY = 40;
export const DESPAWN_AFTER_REST_S = 20;

/** @typedef {{
 *   x: number, y: number, vx: number, vy: number,
 *   rolling: boolean, resting: boolean, restTime: number,
 *   held: boolean,
 * }} Ball */

/**
 * @param {number} x
 * @param {number} y
 * @param {number} vx
 * @param {number} vy
 * @returns {Ball}
 */
export function createBall(x, y, vx, vy) {
  return { x, y, vx, vy, rolling: false, resting: false, restTime: 0, held: false };
}

/**
 * Advance ball physics by dt seconds. Mutates and returns the ball.
 * @param {Ball} ball
 * @param {number} dt
 * @param {{ floorY: number, wallL: number, wallR: number }} env
 */
export function stepBall(ball, dt, env) {
  if (ball.held) return ball;
  if (ball.resting) {
    ball.restTime += dt;
    return ball;
  }

  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y >= env.floorY) {
    ball.y = env.floorY;
    if (Math.abs(ball.vy) < ROLL_VY) {
      ball.vy = 0;
      ball.rolling = true;
    } else {
      ball.vy = -ball.vy * BOUNCE;
      ball.vx *= BOUNCE_FRICTION;
    }
  }

  if (ball.rolling) {
    ball.vx *= Math.max(0, 1 - ROLL_DRAG * dt);
    if (Math.abs(ball.vx) < REST_VX) {
      ball.vx = 0;
      ball.resting = true;
      ball.restTime = 0;
    }
  }

  if (ball.x < env.wallL) {
    ball.x = env.wallL;
    ball.vx = -ball.vx * WALL_BOUNCE;
  } else if (ball.x > env.wallR) {
    ball.x = env.wallR;
    ball.vx = -ball.vx * WALL_BOUNCE;
  }

  return ball;
}

/** Kick the ball away from a kicker at kickerX. @param {Ball} ball @param {number} kickerX */
export function kickBall(ball, kickerX) {
  const dir = ball.x >= kickerX ? 1 : -1;
  ball.vx = dir * (220 + Math.abs(ball.vx) * 0.3);
  ball.vy = -420;
  ball.rolling = false;
  ball.resting = false;
  ball.restTime = 0;
  return ball;
}
