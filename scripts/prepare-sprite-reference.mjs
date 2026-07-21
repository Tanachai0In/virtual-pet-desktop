// Builds a 4×4 1024px reference grid from an intact animation row. This is
// suitable for attaching to gpt-image when regenerating another row so the
// character design stays consistent with the shipped sheet.
//
// Usage: node scripts/prepare-sprite-reference.mjs <cat|dog> [animation]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const species = process.argv[2];
const animation = process.argv[3] ?? 'walk';
if (!['cat', 'dog'].includes(species)) throw new Error('usage: <cat|dog> [animation]');

const dir = path.join(ROOT, 'assets/species', species);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const anim = meta.animations[animation];
if (!anim) throw new Error(`unknown ${species} animation: ${animation}`);
const img = decodePNG(fs.readFileSync(path.join(dir, 'sheet.png')));
const { w: fw, h: fh } = meta.frame;
const out = new Uint8Array(1024 * 1024 * 4);

for (let i = 0; i < anim.frames; i++) {
  const dx = (i % 4) * 256;
  const dy = Math.floor(i / 4) * 256;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const sx = Math.min(fw - 1, Math.floor(x / 2));
      const sy = Math.min(fh - 1, Math.floor(y / 2));
      const source = ((anim.row * fh + sy) * img.width + i * fw + sx) * 4;
      const target = ((dy + y) * 1024 + dx + x) * 4;
      out.set(img.rgba.subarray(source, source + 4), target);
    }
  }
}

const output = path.join(ROOT, 'tmp/imagegen', `${species}-${animation}-reference.png`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, encodePNG(1024, 1024, out));
console.log(output);
