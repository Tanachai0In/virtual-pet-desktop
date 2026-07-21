// Imports one transparent 4×4 gpt-image source grid into a species sheet.
// It resizes an input grid to 1024×1024, maps each 256px cell to a 128px
// sheet frame, clears the target row (including unused cells), and preserves
// the rest of the sheet.
//
// Usage: node scripts/import-sprite-grid.mjs <cat|dog> <animation> <grid.png>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [species, animation, gridFile] = process.argv.slice(2);
if (!['cat', 'dog'].includes(species) || !animation || !gridFile) {
  throw new Error('usage: <cat|dog> <animation> <grid.png>');
}
const dir = path.join(ROOT, 'assets/species', species);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const anim = meta.animations[animation];
if (!anim) throw new Error(`unknown ${species} animation: ${animation}`);
const sheetFile = path.join(dir, 'sheet.png');
const sheet = decodePNG(fs.readFileSync(sheetFile));
const grid = decodePNG(fs.readFileSync(gridFile));
const { w: fw, h: fh } = meta.frame;
const SAFE_SCALE = 0.84;
const SOURCE_ANCHOR = { x: 64, y: 120 };
const TARGET_ANCHOR = { x: 64, y: 111 };

// Clear the full row so unused source-grid cells cannot leak into playback.
sheet.rgba.fill(0, anim.row * fh * sheet.width * 4, (anim.row + 1) * fh * sheet.width * 4);
for (let i = 0; i < anim.frames; i++) {
  const frame = new Uint8Array(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      // Scale any returned grid to 1024px, then take a 2×2 average to make
      // the documented 256px source cell into the 128px runtime frame.
      const samples = [];
      for (let oy = 0; oy < 2; oy++) {
        for (let ox = 0; ox < 2; ox++) {
          const gx = Math.min(grid.width - 1, Math.floor(((i % 4) * 256 + x * 2 + ox) * grid.width / 1024));
          const gy = Math.min(grid.height - 1, Math.floor((Math.floor(i / 4) * 256 + y * 2 + oy) * grid.height / 1024));
          samples.push((gy * grid.width + gx) * 4);
        }
      }
      const target = (y * fw + x) * 4;
      for (let c = 0; c < 4; c++) {
        frame[target + c] = Math.round(samples.reduce((sum, offset) => sum + grid.rgba[offset + c], 0) / 4);
      }
    }
  }
  // gpt-image sometimes returns art larger than its requested source-cell
  // padding. Keep the whole generated frame, but normalize it into the
  // runtime cell around the documented feet anchor rather than clipping it.
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const source = (y * fw + x) * 4;
      if (frame[source + 3] === 0) continue;
      const tx = Math.round(TARGET_ANCHOR.x + (x - SOURCE_ANCHOR.x) * SAFE_SCALE);
      const ty = Math.round(TARGET_ANCHOR.y + (y - SOURCE_ANCHOR.y) * SAFE_SCALE);
      if (tx < 0 || tx >= fw || ty < 0 || ty >= fh) continue;
      const target = ((anim.row * fh + ty) * sheet.width + i * fw + tx) * 4;
      if (frame[source + 3] >= sheet.rgba[target + 3]) {
        sheet.rgba.set(frame.subarray(source, source + 4), target);
      }
    }
  }
}
fs.writeFileSync(sheetFile, encodePNG(sheet.width, sheet.height, sheet.rgba));
console.log(`imported ${species}/${animation} from ${gridFile}`);
