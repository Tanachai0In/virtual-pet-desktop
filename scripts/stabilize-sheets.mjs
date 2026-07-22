// Stabilizes AI-generated sprite sheets in place. gpt-image draws each frame
// independently, so within one animation row the character drifts a few px in
// position and several percent in size — at 12-24fps that reads as shaking
// and pulsing. For every frame this script:
//
//   1. re-centers the content horizontally (bbox center -> x=64)
//   2. pins grounded rows to a fixed feet baseline (bbox bottom -> y=117);
//      airborne rows (run/pounce) keep their vertical arc
//   3. normalizes per-frame size toward the row's median pixel mass
//      (clamped so intended squash/stretch survives)
//
// Finally it normalizes every animation row to the walk row's visual mass in
// the PNG itself. Runtime rendering therefore always uses one renderScale;
// changing state cannot make the pet visibly shrink or grow.
//
// Usage: node scripts/stabilize-sheets.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const ALPHA = 8;
const BASELINE_Y = 117;
const AIRBORNE = new Set(['run', 'pounce']);
const FRAME_SCALE_MIN = 0.93;
const FRAME_SCALE_MAX = 1.08;
const ROW_SCALE_CLAMP = { grounded: [0.85, 1.35], airborne: [0.9, 1.15] };
const SAFE_PAD = 10;

/** Opaque bbox + pixel mass of an RGBA raster region. */
function analyze(rgba, w, h) {
  let minX = w, maxX = -1, minY = h, maxY = -1, mass = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > ALPHA) {
        mass++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return mass ? { minX, maxX, minY, maxY, mass, cx: (minX + maxX) / 2 } : null;
}

/** Bilinear scale of an RGBA raster (premultiplied to avoid halo fringes). */
function scaleRaster(src, sw, sh, s) {
  const dw = Math.max(1, Math.round(sw * s));
  const dh = Math.max(1, Math.round(sh * s));
  const pre = new Float32Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) {
    const a = src[i * 4 + 3] / 255;
    pre[i * 4] = src[i * 4] * a;
    pre[i * 4 + 1] = src[i * 4 + 1] * a;
    pre[i * 4 + 2] = src[i * 4 + 2] * a;
    pre[i * 4 + 3] = a;
  }
  const out = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1.001, (y + 0.5) / s - 0.5);
    const y0 = Math.max(0, Math.floor(fy));
    const ty = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1.001, (x + 0.5) / s - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const tx = fx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = pre[(y0 * sw + x0) * 4 + c];
        const p10 = pre[(y0 * sw + Math.min(sw - 1, x0 + 1)) * 4 + c];
        const p01 = pre[(Math.min(sh - 1, y0 + 1) * sw + x0) * 4 + c];
        const p11 = pre[(Math.min(sh - 1, y0 + 1) * sw + Math.min(sw - 1, x0 + 1)) * 4 + c];
        const v = p00 * (1 - tx) * (1 - ty) + p10 * tx * (1 - ty) + p01 * (1 - tx) * ty + p11 * tx * ty;
        out[o + c] = c === 3 ? Math.round(v * 255) : v;
      }
    }
  }
  // unpremultiply
  for (let i = 0; i < dw * dh; i++) {
    const a = out[i * 4 + 3] / 255;
    if (a > 0) {
      out[i * 4] = Math.min(255, Math.round(out[i * 4] / a));
      out[i * 4 + 1] = Math.min(255, Math.round(out[i * 4 + 1] / a));
      out[i * 4 + 2] = Math.min(255, Math.round(out[i * 4 + 2] / a));
    }
  }
  return { data: out, w: dw, h: dh };
}

const median = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

/** Largest scale that keeps an analyzed frame inside the sheet safe area. */
function maxScaleAtAnchor(st, w, h, anchor) {
  const limits = [];
  if (st.minX < anchor.x) limits.push((anchor.x - SAFE_PAD) / (anchor.x - st.minX));
  if (st.maxX > anchor.x) limits.push((w - 1 - SAFE_PAD - anchor.x) / (st.maxX - anchor.x));
  if (st.minY < anchor.y) limits.push((anchor.y - SAFE_PAD) / (anchor.y - st.minY));
  if (st.maxY > anchor.y) limits.push((h - 1 - SAFE_PAD - anchor.y) / (st.maxY - anchor.y));
  return Math.min(...limits, Infinity);
}

/** Scale a frame around the documented feet anchor, preserving transparent padding. */
function scaleFrameAtAnchor(frame, w, h, anchor, s) {
  const scaled = scaleRaster(frame, w, h, s);
  const out = new Uint8Array(w * h * 4);
  const dx = Math.round(anchor.x - anchor.x * s);
  const dy = Math.round(anchor.y - anchor.y * s);
  for (let y = 0; y < scaled.h; y++) {
    const oy = y + dy;
    if (oy < 0 || oy >= h) continue;
    for (let x = 0; x < scaled.w; x++) {
      const ox = x + dx;
      if (ox < 0 || ox >= w) continue;
      const so = (y * scaled.w + x) * 4;
      if (scaled.data[so + 3] === 0) continue;
      out.set(scaled.data.subarray(so, so + 4), (oy * w + ox) * 4);
    }
  }
  return out;
}

for (const species of fs
  .readdirSync(path.join(ROOT, 'assets/species'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'common')
  .map((d) => d.name)) {
  const dir = path.join(ROOT, 'assets/species', species);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const img = decodePNG(fs.readFileSync(path.join(dir, 'sheet.png')));
  const FW = meta.frame.w;
  const FH = meta.frame.h;
  const out = new Uint8Array(img.rgba); // copy; rows rewritten in place

  const rowMedianMass = {};
  const anchor = meta.anchor ?? { x: Math.floor(FW / 2), y: FH - SAFE_PAD - 1 };

  for (const [animName, a] of Object.entries(meta.animations)) {
    // extract frames
    const frames = [];
    for (let i = 0; i < a.frames; i++) {
      const buf = new Uint8Array(FW * FH * 4);
      for (let y = 0; y < FH; y++) {
        const srcOff = (((a.row * FH + y) * img.width) + i * FW) * 4;
        buf.set(img.rgba.subarray(srcOff, srcOff + FW * 4), y * FW * 4);
      }
      frames.push(buf);
    }
    const stats = frames.map((f) => analyze(f, FW, FH));
    const masses = stats.filter(Boolean).map((s) => s.mass);
    if (!masses.length) continue;
    const medMass = median(masses);
    rowMedianMass[animName] = medMass;

    for (let i = 0; i < frames.length; i++) {
      const st = stats[i];
      if (!st) continue;
      // 3) per-frame size toward row median (mass is a pose-robust proxy)
      let s = Math.sqrt(medMass / st.mass);
      s = Math.min(FRAME_SCALE_MAX, Math.max(FRAME_SCALE_MIN, s));
      // never scale content out of the safe padding box
      const maxS = Math.min(
        (FW - 2 * SAFE_PAD) / (st.maxX - st.minX + 1),
        (FH - 2 * SAFE_PAD) / (st.maxY - st.minY + 1)
      );
      s = Math.min(s, maxS);

      const scaled = scaleRaster(frames[i], FW, FH, s);
      const sst = analyze(scaled.data, scaled.w, scaled.h);
      if (!sst) continue;

      // 1) horizontal center; 2) baseline (grounded rows only)
      const dx = Math.round(FW / 2 - sst.cx);
      const targetBottom = AIRBORNE.has(animName)
        ? Math.round(st.maxY * s) // keep the original arc, just scaled
        : BASELINE_Y;
      const dy = Math.round(Math.min(FH - 1 - SAFE_PAD, targetBottom) - sst.maxY);

      // compose back into the sheet row
      for (let y = 0; y < FH; y++) {
        const rowOff = (((a.row * FH + y) * img.width) + i * FW) * 4;
        out.fill(0, rowOff, rowOff + FW * 4);
      }
      for (let y = 0; y < scaled.h; y++) {
        const oy = y + dy;
        if (oy < 0 || oy >= FH) continue;
        for (let x = 0; x < scaled.w; x++) {
          const ox = x + dx;
          if (ox < 0 || ox >= FW) continue;
          const so = (y * scaled.w + x) * 4;
          if (scaled.data[so + 3] === 0) continue;
          const doff = (((a.row * FH + oy) * img.width) + i * FW + ox) * 4;
          out[doff] = scaled.data[so];
          out[doff + 1] = scaled.data[so + 1];
          out[doff + 2] = scaled.data[so + 2];
          out[doff + 3] = scaled.data[so + 3];
        }
      }
    }
  }

  // Re-measure the cleaned rows before normalizing cross-row size. This must
  // be rasterized into the sheet, not stored as animation metadata: drawing
  // different actions at different scales causes a visible pop on transition.
  for (const [animName, a] of Object.entries(meta.animations)) {
    const masses = [];
    for (let i = 0; i < a.frames; i++) {
      const frame = new Uint8Array(FW * FH * 4);
      for (let y = 0; y < FH; y++) {
        const off = (((a.row * FH + y) * img.width) + i * FW) * 4;
        frame.set(out.subarray(off, off + FW * 4), y * FW * 4);
      }
      const st = analyze(frame, FW, FH);
      if (st) masses.push(st.mass);
    }
    if (masses.length) rowMedianMass[animName] = median(masses);
  }

  // Cross-row scale from mass, relative to walk. Apply it around the common
  // feet anchor so every frame remains planted in exactly the same place.
  const ref = rowMedianMass.walk ?? median(Object.values(rowMedianMass));
  for (const [animName, a] of Object.entries(meta.animations)) {
    const m = rowMedianMass[animName];
    if (!m) continue;
    const [lo, hi] = AIRBORNE.has(animName) ? ROW_SCALE_CLAMP.airborne : ROW_SCALE_CLAMP.grounded;
    const s = Math.min(hi, Math.max(lo, Math.sqrt(ref / m)));
    for (let i = 0; i < a.frames; i++) {
      const frame = new Uint8Array(FW * FH * 4);
      for (let y = 0; y < FH; y++) {
        const off = (((a.row * FH + y) * img.width) + i * FW) * 4;
        frame.set(out.subarray(off, off + FW * 4), y * FW * 4);
      }
      const st = analyze(frame, FW, FH);
      if (!st) continue;
      const cap = maxScaleAtAnchor(st, FW, FH, anchor);
      // Leave one extra pixel before rounding. A scale exactly at the edge
      // can round an antialiased outline back into the unsafe margin.
      const safeScale = cap < s ? cap * 0.98 : s;
      const normalized = scaleFrameAtAnchor(frame, FW, FH, anchor, safeScale);
      for (let y = 0; y < FH; y++) {
        const off = (((a.row * FH + y) * img.width) + i * FW) * 4;
        out.set(normalized.subarray(y * FW * 4, (y + 1) * FW * 4), off);
      }
    }
    delete a.scale;
  }

  if (DRY) {
    console.log(`${species}: would write sheet + meta (dry run)`);
    continue;
  }
  fs.writeFileSync(path.join(dir, 'sheet.png'), encodePNG(img.width, img.height, out));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(
    `${species}: stabilized ${Object.keys(meta.animations).length} rows; runtime scale: 1.0 for every animation`
  );
}
