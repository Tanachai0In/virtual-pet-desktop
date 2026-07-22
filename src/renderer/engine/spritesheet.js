// @ts-check
// Loads sprite sheets. Metadata comes over IPC (file:// pages can't fetch
// local JSON); images load through <img> which file:// allows.

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Load a species sheet + metadata.
 * @param {string} name
 * @returns {Promise<import('./animator.js').SpeciesSheet & { name: string }>}
 */
export async function loadSpecies(name) {
  const meta = await /** @type {any} */ (window).petAPI.getMeta(name);
  if (!meta) throw new Error(`no meta.json for species: ${name}`);
  const image = await loadImage(`../../assets/species/${name}/sheet.png`);
  return { name, meta, image };
}

/**
 * Load the shared sheet (house, items).
 * @returns {Promise<{
 *   meta: { house: { frame: {w:number,h:number}, variants: Record<string, number>, renderHeight: number },
 *           items: { size: number, cells: Record<string, number> } },
 *   house: HTMLImageElement,
 *   items: HTMLImageElement,
 * }>}
 */
export async function loadCommon() {
  const meta = await /** @type {any} */ (window).petAPI.getMeta('common');
  if (!meta) throw new Error('no meta.json for common assets');
  const [house, items] = await Promise.all([
    loadImage('../../assets/species/common/house.png'),
    loadImage('../../assets/species/common/items.png'),
  ]);
  return { meta, house, items };
}

/**
 * Draw one cell of the items sheet centered at (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ meta: any, items: HTMLImageElement }} common
 * @param {string} cellName
 * @param {number} x
 * @param {number} y
 * @param {number} [size] rendered size in px
 * @param {number} [alpha]
 */
export function drawItem(ctx, common, cellName, x, y, size = 40, alpha = 1) {
  const cells = common.meta.items.cells;
  const cell = cells[cellName];
  if (cell === undefined) return;
  const s = common.meta.items.size;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = alpha;
  ctx.drawImage(common.items, cell * s, 0, s, s, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  ctx.restore();
}
