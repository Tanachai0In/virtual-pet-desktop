// @ts-check
// The pet house: sits at one edge of the bar; the pet walks to its door,
// disappears inside and sleeps (house window glows). Drawing uses
// common/house.png (variants: open / closed / sleeping).

/** @typedef {{
 *   x: number, w: number, h: number, doorX: number, side: 'left'|'right',
 *   variant: 'open'|'closed'|'sleeping',
 * }} House */

/**
 * @param {{ barW: number, side?: 'left'|'right', renderHeight?: number }} opts
 * @returns {House}
 */
export function createHouse({ barW, side = 'right', renderHeight = 150 }) {
  const w = renderHeight; // house art is square
  const margin = 6;
  const x = side === 'right' ? barW - w - margin : margin;
  return {
    x,
    w,
    h: renderHeight,
    doorX: x + w / 2,
    side,
    variant: 'open',
  };
}

/** Bounding rect (for hover/click hit-testing). @param {House} house @param {number} floorY */
export function houseRect(house, floorY) {
  return { x: house.x, y: floorY - house.h, w: house.w, h: house.h };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {House} house
 * @param {{ meta: any, house: HTMLImageElement }} common
 * @param {number} floorY
 */
export function drawHouse(ctx, house, common, floorY) {
  const frame = common.meta.house.frame;
  const idx = common.meta.house.variants[house.variant] ?? 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    common.house,
    idx * frame.w,
    0,
    frame.w,
    frame.h,
    Math.round(house.x),
    Math.round(floorY - house.h),
    house.w,
    house.h
  );
  ctx.restore();
}
