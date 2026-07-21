// Validates every sprite sheet against its meta.json and the contract in
// docs/SPRITE_CONTRACT.md. Exit 1 on hard errors; transparency drift in
// unused cells is a warning only (AI-generated art can be slightly messy).
//
// Usage: node scripts/validate-sheets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG } from './lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPECIES_DIR = path.join(ROOT, 'assets/species');

let errors = 0;
let warnings = 0;

const err = (msg) => {
  console.error(`ERROR: ${msg}`);
  errors++;
};
const warn = (msg) => {
  console.warn(`warn:  ${msg}`);
  warnings++;
};

/** Returns true when every pixel of the region is fully transparent. */
function regionTransparent(img, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (img.rgba[(y * img.width + x) * 4 + 3] !== 0) return false;
    }
  }
  return true;
}

function validateSpecies(name) {
  const dir = path.join(SPECIES_DIR, name);
  const metaFile = path.join(dir, 'meta.json');
  const sheetFile = path.join(dir, 'sheet.png');
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

  if (!fs.existsSync(sheetFile)) {
    err(`${name}: sheet.png missing (run: npm run placeholders)`);
    return;
  }
  let img;
  try {
    img = decodePNG(fs.readFileSync(sheetFile));
  } catch (e) {
    err(`${name}: sheet.png unreadable — ${e.message}`);
    return;
  }

  const fw = meta.frame?.w;
  const fh = meta.frame?.h;
  if (!fw || !fh) {
    err(`${name}: meta.json missing frame.w/frame.h`);
    return;
  }
  if (img.colorType !== 6) err(`${name}: sheet.png has no alpha channel (color type ${img.colorType})`);
  if (img.width % fw !== 0) err(`${name}: sheet width ${img.width} not a multiple of frame w ${fw}`);
  if (img.height % fh !== 0) err(`${name}: sheet height ${img.height} not a multiple of frame h ${fh}`);

  const cols = Math.floor(img.width / fw);
  const rows = Math.floor(img.height / fh);
  const anims = meta.animations ?? {};
  if (Object.keys(anims).length === 0) err(`${name}: meta.json has no animations`);

  for (const [animName, a] of Object.entries(anims)) {
    if (a.row >= rows) {
      err(`${name}/${animName}: row ${a.row} outside sheet (${rows} rows)`);
      continue;
    }
    if (a.frames > cols) {
      err(`${name}/${animName}: ${a.frames} frames > ${cols} columns`);
      continue;
    }
    if (a.loopFrom !== undefined && (a.loopFrom < 0 || a.loopFrom >= a.frames)) {
      err(`${name}/${animName}: loopFrom ${a.loopFrom} outside 0..${a.frames - 1}`);
    }
    // Used frames should contain some pixels; unused cells should be empty.
    for (let i = 0; i < a.frames; i++) {
      if (regionTransparent(img, i * fw, a.row * fh, fw, fh)) {
        err(`${name}/${animName}: frame ${i} is fully transparent`);
      }
    }
    for (let i = a.frames; i < cols; i++) {
      if (!regionTransparent(img, i * fw, a.row * fh, fw, fh)) {
        warn(`${name}/${animName}: cell ${i} beyond frame count is not transparent`);
      }
    }
  }
  const anchorOk =
    meta.anchor && meta.anchor.x >= 0 && meta.anchor.x < fw && meta.anchor.y >= 0 && meta.anchor.y < fh;
  if (!anchorOk) err(`${name}: anchor missing or outside the frame`);
  console.log(`${name}: ${img.width}x${img.height}, ${Object.keys(anims).length} animations checked`);
}

function validateCommon() {
  const dir = path.join(SPECIES_DIR, 'common');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));

  const houseFile = path.join(dir, 'house.png');
  if (!fs.existsSync(houseFile)) {
    err('common: house.png missing');
  } else {
    const img = decodePNG(fs.readFileSync(houseFile));
    const f = meta.house.frame;
    const variants = Object.keys(meta.house.variants).length;
    if (img.width < variants * f.w || img.height < f.h) {
      err(`common: house.png is ${img.width}x${img.height}, need ${variants * f.w}x${f.h}`);
    }
  }

  const itemsFile = path.join(dir, 'items.png');
  if (!fs.existsSync(itemsFile)) {
    err('common: items.png missing');
  } else {
    const img = decodePNG(fs.readFileSync(itemsFile));
    const size = meta.items.size;
    const cells = Object.keys(meta.items.cells).length;
    if (img.width < cells * size || img.height < size) {
      err(`common: items.png is ${img.width}x${img.height}, need ${cells * size}x${size}`);
    }
  }
  console.log('common: house + items checked');
}

const speciesNames = fs
  .readdirSync(SPECIES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'common')
  .map((d) => d.name);

for (const name of speciesNames) validateSpecies(name);
validateCommon();

console.log(errors ? `${errors} error(s), ${warnings} warning(s)` : `OK (${warnings} warning(s))`);
process.exit(errors ? 1 : 0);
