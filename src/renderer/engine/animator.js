// @ts-check
// Sprite animation frame math (pure) + Animator that owns an entity's
// current animation. Draw happens against a loaded sprite sheet.

/** @typedef {{ row: number, frames: number, fps: number, loop: boolean, loopFrom?: number }} AnimMeta */

/**
 * Frame index for an animation at elapsed time t (seconds). Pure.
 * Non-looping animations clamp on their last frame. Looping animations with
 * loopFrom play 0..frames-1 once, then cycle loopFrom..frames-1.
 * @param {AnimMeta} anim
 * @param {number} t
 */
export function frameIndexAt(anim, t) {
  const idx = Math.floor(Math.max(0, t) * anim.fps);
  const total = anim.frames;
  if (idx < total) return idx;
  if (!anim.loop) return total - 1;
  const from = anim.loopFrom ?? 0;
  const len = total - from;
  return from + ((idx - total) % len);
}

/**
 * True when a non-looping animation has played through.
 * @param {AnimMeta} anim
 * @param {number} t
 */
export function isFinished(anim, t) {
  if (anim.loop) return false;
  return Math.floor(Math.max(0, t) * anim.fps) >= anim.frames;
}

/**
 * @typedef {{ image: CanvasImageSource, meta: {
 *   frame: {w:number,h:number}, anchor: {x:number,y:number}, renderScale: number,
 *   animations: Record<string, AnimMeta>
 * } }} SpeciesSheet
 */

export class Animator {
  /** @param {SpeciesSheet} sheet @param {string} [initial] */
  constructor(sheet, initial = 'idle') {
    this.sheet = sheet;
    this.name = initial;
    this.t = 0;
  }

  /** @param {SpeciesSheet} sheet */
  setSheet(sheet) {
    this.sheet = sheet;
    if (!sheet.meta.animations[this.name]) this.name = 'idle';
    this.t = 0;
  }

  /** @param {string} name @param {boolean} [restart] */
  setAnim(name, restart = false) {
    if (!this.sheet.meta.animations[name]) name = 'idle';
    if (name !== this.name || restart) {
      this.name = name;
      this.t = 0;
    }
  }

  get anim() {
    return this.sheet.meta.animations[this.name];
  }

  get frameIndex() {
    return frameIndexAt(this.anim, this.t);
  }

  get finished() {
    return isFinished(this.anim, this.t);
  }

  /** @param {number} dt */
  update(dt) {
    this.t += dt;
  }

  /**
   * Draw with the anchor (feet) at world (x, y). flip=true mirrors left.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {{ flip?: boolean }} [opts]
   */
  draw(ctx, x, y, opts = {}) {
    const { meta, image } = this.sheet;
    const a = this.anim;
    const fi = this.frameIndex;
    const fw = meta.frame.w;
    const fh = meta.frame.h;
    // Every row is normalized into the PNG around the shared feet anchor.
    // A single runtime scale prevents a visible size pop when states change.
    const s = meta.renderScale;
    const sx = fi * fw;
    const sy = a.row * fh;
    ctx.save();
    // Painted (non-pixel) art: smooth downscaling keeps it crisp.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (opts.flip) {
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(image, sx, sy, fw, fh, -meta.anchor.x * s, -meta.anchor.y * s, fw * s, fh * s);
    } else {
      ctx.drawImage(
        image,
        sx,
        sy,
        fw,
        fh,
        Math.round(x - meta.anchor.x * s),
        Math.round(y - meta.anchor.y * s),
        fw * s,
        fh * s
      );
    }
    ctx.restore();
  }
}
