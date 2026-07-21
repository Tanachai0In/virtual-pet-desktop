// @ts-check
// Pooled particles: hearts (petting), zzz (napping), crumbs (eating).
// Fixed-size pool, zero allocation in the hot path.
import { drawItem } from './spritesheet.js';

const POOL_SIZE = 24;

export function createParticles() {
  const pool = Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    kind: 'heart',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 1,
    seed: 0,
  }));

  let liveCount = 0;

  /**
   * @param {'heart'|'zzz'|'crumb'} kind
   * @param {number} x
   * @param {number} y
   */
  function spawn(kind, x, y) {
    const p = pool.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.age = 0;
    p.seed = Math.random() * Math.PI * 2;
    if (kind === 'heart') {
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = -55;
      p.life = 1.4;
    } else if (kind === 'zzz') {
      p.vx = 12;
      p.vy = -25;
      p.life = 2.2;
    } else {
      p.vx = (Math.random() - 0.5) * 80;
      p.vy = -120;
      p.life = 0.7;
    }
    liveCount++;
  }

  /** @param {number} dt */
  function update(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        liveCount--;
        continue;
      }
      p.x += (p.vx + Math.sin(p.age * 6 + p.seed) * 15) * dt;
      p.y += p.vy * dt;
      if (p.kind === 'crumb') p.vy += 500 * dt;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ meta: any, items: HTMLImageElement }} common
   */
  function draw(ctx, common) {
    for (const p of pool) {
      if (!p.active) continue;
      const alpha = 1 - p.age / p.life;
      if (p.kind === 'heart') {
        drawItem(ctx, common, 'heart', p.x, p.y, 22, alpha);
      } else if (p.kind === 'zzz') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#8fa8d8';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('z', p.x, p.y);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#c9a06a';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
        ctx.restore();
      }
    }
  }

  return {
    spawn,
    update,
    draw,
    get liveCount() {
      return liveCount;
    },
  };
}
