// @ts-check
// In-canvas HUD: a stat bubble when hovering the pet, and a "hungry" thought
// bubble when hunger runs high.

const BAR_W = 64;
const BAR_H = 6;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} world
 */
export function drawHud(ctx, world) {
  const pet = world.pet;
  if (pet.inHouse) return;

  const body = pet.bodyRect(world.floorY);
  const hover =
    world.cursor.inside &&
    world.cursor.x >= body.x &&
    world.cursor.x < body.x + body.w &&
    world.cursor.y >= body.y &&
    world.cursor.y < body.y + body.h;

  if (hover) {
    drawStatBubble(ctx, world, body);
  } else if (pet.needs.hunger > 75 && pet.fsm?.state !== 'eat') {
    drawThoughtBubble(ctx, world, body);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} world
 * @param {{x:number,y:number,w:number,h:number}} body
 */
function drawStatBubble(ctx, world, body) {
  const pet = world.pet;
  const w = 96;
  const h = 58;
  const x = Math.round(Math.min(Math.max(body.x + body.w / 2 - w / 2, 4), world.viewW - w - 4));
  const y = Math.round(Math.max(body.y - h - 8, 2));

  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,120,140,0.6)';
  ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(pet.name, x + 8, y + 14);

  drawBar(ctx, x + 8, y + 22, 100 - pet.needs.hunger, '#f28c8c'); // fullness
  drawBar(ctx, x + 8, y + 32, pet.needs.happiness, '#f2a5c8');
  drawBar(ctx, x + 8, y + 42, pet.needs.energy, '#9fc2f2');
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} value 0..100
 * @param {string} color
 */
function drawBar(ctx, x, y, value, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(x, y, BAR_W, BAR_H);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round((BAR_W * Math.max(0, Math.min(100, value))) / 100), BAR_H);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} world
 * @param {{x:number,y:number,w:number,h:number}} body
 */
function drawThoughtBubble(ctx, world, body) {
  const cx = Math.round(body.x + body.w / 2 + 26);
  const cy = Math.round(Math.max(body.y - 14, 14));
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.arc(cx - 12, cy + 12, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍖', cx, cy + 1);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
