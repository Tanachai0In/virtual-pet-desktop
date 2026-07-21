// Generates placeholder sprite sheets, house/items sheets and app icons as
// real PNGs conforming to docs/SPRITE_CONTRACT.md, so the app works out of
// the box before AI-generated art exists. Pure Node — no dependencies.
//
// Usage: node scripts/gen-placeholders.mjs [--only-missing]
//        node scripts/gen-placeholders.mjs --species=cat --animations=idle,sit
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG, Raster } from './lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLY_MISSING = process.argv.includes('--only-missing');
const speciesArg = process.argv.find((arg) => arg.startsWith('--species='));
const animationsArg = process.argv.find((arg) => arg.startsWith('--animations='));
const SELECTED_SPECIES = speciesArg ? new Set(speciesArg.slice('--species='.length).split(',')) : null;
const SELECTED_ANIMATIONS = animationsArg
  ? new Set(animationsArg.slice('--animations='.length).split(','))
  : null;

const FRAME = 128;
const COLS = 16;
const ROWS = 9;

const PALETTES = {
  cat: {
    body: [245, 227, 200, 255],
    patch: [217, 185, 138, 255],
    earInner: [246, 188, 190, 255],
    outline: [120, 100, 80, 255],
    nose: [235, 140, 150, 255],
  },
  dog: {
    body: [234, 217, 168, 255],
    patch: [201, 166, 106, 255],
    earInner: [201, 166, 106, 255],
    outline: [110, 90, 70, 255],
    nose: [120, 90, 70, 255],
  },
};

const EYE = [60, 50, 55, 255];
const EYE_SHINE = [255, 255, 255, 255];
const BLUSH = [246, 170, 180, 160];

/**
 * Draw one chibi placeholder frame. The artwork stays inside a 10px safe
 * margin, matching the resized 256px-source-grid contract.
 * The look is intentionally simple — a big-headed blob with ears — but it
 * animates recognizably and respects anchors, so real art drops in cleanly.
 */
function drawPetFrame(r, species, anim, i, n) {
  const p = PALETTES[species];
  const phase = (i / n) * Math.PI * 2;
  const cx = 64;
  const floor = 116;

  let headBob = 0;
  let bodyLift = 0;
  let lean = 0;
  let sitting = false;
  let sleeping = false;
  let eyes = 'open'; // open | closed | happy
  let legPhase = null;

  switch (anim) {
    case 'idle':
      headBob = Math.sin(phase) * 2;
      if (i === 3 || i === 4) eyes = 'closed';
      break;
    case 'walk':
      headBob = Math.abs(Math.sin(phase)) * 3;
      legPhase = phase;
      break;
    case 'run':
      headBob = Math.abs(Math.sin(phase)) * 5;
      legPhase = phase * 1.5;
      lean = 6;
      bodyLift = Math.abs(Math.sin(phase)) * 4;
      break;
    case 'sit':
      sitting = true;
      if (i >= 2) headBob = Math.sin(phase) * 1.5;
      if (i === 4) eyes = 'closed';
      break;
    case 'sleep':
      sleeping = true;
      eyes = 'closed';
      break;
    case 'eat':
      headBob = 6 + Math.sin(phase) * 4;
      eyes = i % 2 ? 'happy' : 'open';
      break;
    case 'happy':
      eyes = 'happy';
      bodyLift = Math.abs(Math.sin(phase)) * 5;
      break;
    case 'pounce': {
      if (i < 2) {
        sitting = true; // crouch
      } else if (i < 5) {
        bodyLift = 18 - (i - 2) * 4;
        lean = 10;
      } else if (i < 7) {
        bodyLift = 2;
      }
      eyes = 'open';
      break;
    }
  }

  if (sleeping) {
    // Curled ball: one big soft ellipse + tail wrap; breathing scales slightly.
    const breathe = 1 + 0.03 * Math.sin(phase);
    r.fillEllipse(cx, floor - 18, 30 * breathe, 18 * breathe, p.body);
    r.fillEllipse(cx - 20, floor - 14, 10, 6, p.patch); // tail wrap
    r.fillEllipse(cx + 12, floor - 24, 12, 10, p.body); // head resting
    // closed eye
    r.fillRect(cx + 12, floor - 25, 6, 2, EYE);
    return;
  }

  const bodyY = (sitting ? floor - 14 : floor - 18) - bodyLift;
  const headY = (sitting ? floor - 46 : floor - 52) - bodyLift - headBob;
  const headX = cx + lean;

  // legs (walk/run): little swinging paws under the body
  if (legPhase !== null) {
    const sw = Math.sin(legPhase) * 6;
    r.fillEllipse(cx - 12 + sw, floor - 4, 6, 5, p.patch);
    r.fillEllipse(cx + 12 - sw, floor - 4, 6, 5, p.patch);
  } else {
    r.fillEllipse(cx - 10, floor - 3, 6, 4, p.patch);
    r.fillEllipse(cx + 10, floor - 3, 6, 4, p.patch);
  }

  // tail
  if (species === 'cat') {
    const wag = Math.sin(phase) * 5;
    r.fillEllipse(cx - 26, bodyY - 8 + wag, 5, 12, p.patch);
  } else {
    const wag = Math.sin(phase * 2) * 6;
    r.fillEllipse(cx - 24 + wag * 0.3, bodyY - 10, 7, 7, p.patch);
  }

  // body (small — chibi proportions)
  // A seated body is intentionally a little shorter so it retains the same
  // 10px bottom safe margin as the standing pose.
  r.fillEllipse(cx, bodyY, 22, sitting ? 14 : 15, p.body);
  r.fillEllipse(cx + 4, bodyY + 2, 12, 8, [255, 255, 255, 90]); // belly light

  // ears
  if (species === 'cat') {
    r.fillTriangle(headX - 26, headY - 16, headX - 8, headY - 34, headX - 2, headY - 14, p.body);
    r.fillTriangle(headX + 26, headY - 16, headX + 8, headY - 34, headX + 2, headY - 14, p.patch);
    r.fillTriangle(headX - 20, headY - 17, headX - 10, headY - 28, headX - 6, headY - 16, p.earInner);
  } else {
    r.fillEllipse(headX - 26, headY - 4, 8, 16, p.patch); // floppy ears
    r.fillEllipse(headX + 26, headY - 4, 8, 16, p.patch);
  }

  // big head
  r.fillCircle(headX, headY, 28, p.body);
  if (species === 'cat') r.fillEllipse(headX - 16, headY - 18, 8, 6, p.patch); // ear patch

  // face
  const eyeY = headY + 2;
  if (eyes === 'open') {
    r.fillEllipse(headX - 11, eyeY, 5, 6, EYE);
    r.fillEllipse(headX + 11, eyeY, 5, 6, EYE);
    r.fillCircle(headX - 9, eyeY - 2, 1.6, EYE_SHINE);
    r.fillCircle(headX + 13, eyeY - 2, 1.6, EYE_SHINE);
  } else if (eyes === 'closed') {
    r.fillRect(headX - 15, eyeY, 8, 2, EYE);
    r.fillRect(headX + 7, eyeY, 8, 2, EYE);
  } else {
    // happy: ^ ^ arcs
    r.fillTriangle(headX - 15, eyeY + 2, headX - 11, eyeY - 3, headX - 7, eyeY + 2, EYE);
    r.fillTriangle(headX - 14, eyeY + 2, headX - 11, eyeY - 1, headX - 8, eyeY + 2, p.body);
    r.fillTriangle(headX + 7, eyeY + 2, headX + 11, eyeY - 3, headX + 15, eyeY + 2, EYE);
    r.fillTriangle(headX + 8, eyeY + 2, headX + 11, eyeY - 1, headX + 14, eyeY + 2, p.body);
  }
  r.fillEllipse(headX, eyeY + 8, 3, 2, p.nose);
  r.fillEllipse(headX - 19, eyeY + 8, 5, 3, BLUSH);
  r.fillEllipse(headX + 19, eyeY + 8, 5, 3, BLUSH);
}

function genSpeciesSheet(species, meta, existing) {
  const sheet = new Raster(COLS * FRAME, ROWS * FRAME);
  if (existing) sheet.data.set(existing.rgba);
  for (const [animName, anim] of Object.entries(meta.animations)) {
    if (SELECTED_ANIMATIONS && !SELECTED_ANIMATIONS.has(animName)) continue;
    // Clear the complete output row, including unused cells. This prevents
    // pixels from a bad source-grid slice leaking into a repaired animation.
    sheet.data.fill(0, anim.row * FRAME * sheet.width * 4, (anim.row + 1) * FRAME * sheet.width * 4);
    for (let i = 0; i < anim.frames; i++) {
      const frame = new Raster(FRAME, FRAME);
      drawPetFrame(frame, species, animName, i, anim.frames);
      sheet.blit(frame, i * FRAME, anim.row * FRAME);
    }
  }
  return encodePNG(sheet.width, sheet.height, sheet.data);
}

function drawHouseVariant(r, ox, variant) {
  const wall = [250, 240, 225, 255];
  const roof = [242, 165, 190, 255];
  const doorDark = [90, 75, 85, 255];
  const cx = ox + 128;
  // walls
  r.fillRect(ox + 48, 120, 160, 116, wall);
  // roof
  r.fillTriangle(ox + 32, 124, cx, 40, ox + 224, 124, roof);
  r.fillEllipse(cx, 44, 10, 10, roof);
  // heart sign
  r.fillCircle(cx - 5, 88, 6, [240, 120, 150, 255]);
  r.fillCircle(cx + 5, 88, 6, [240, 120, 150, 255]);
  r.fillTriangle(cx - 10, 91, cx + 10, 91, cx, 103, [240, 120, 150, 255]);
  // door arch
  r.fillRect(cx - 30, 160, 60, 76, doorDark);
  r.fillEllipse(cx, 162, 30, 26, doorDark);
  if (variant === 1) {
    // curtain closed
    r.fillRect(cx - 28, 162, 56, 72, [244, 200, 180, 255]);
    r.fillEllipse(cx, 162, 28, 24, [244, 200, 180, 255]);
    r.fillRect(cx - 1, 150, 2, 84, [220, 170, 150, 255]);
  }
  // round window
  const glow = variant === 2 ? [255, 220, 130, 255] : [180, 210, 235, 255];
  r.fillCircle(ox + 190, 150, 14, [160, 140, 120, 255]);
  r.fillCircle(ox + 190, 150, 11, glow);
}

function genHouse() {
  const r = new Raster(3 * 256, 256);
  for (let v = 0; v < 3; v++) drawHouseVariant(r, v * 256, v);
  return encodePNG(r.width, r.height, r.data);
}

function genItems() {
  const r = new Raster(6 * 64, 64);
  const cell = (i) => i * 64 + 32;
  // ball: red/white
  r.fillCircle(cell(0), 32, 22, [235, 90, 90, 255]);
  r.fillEllipse(cell(0), 24, 20, 10, [255, 250, 245, 255]);
  r.fillCircle(cell(0) - 7, 26, 4, [255, 255, 255, 200]);
  // fish
  r.fillEllipse(cell(1) - 4, 32, 16, 10, [130, 180, 230, 255]);
  r.fillTriangle(cell(1) + 10, 32, cell(1) + 24, 22, cell(1) + 24, 42, [110, 160, 215, 255]);
  r.fillCircle(cell(1) - 12, 30, 2, [40, 50, 70, 255]);
  // bone
  r.fillRect(cell(2) - 12, 28, 24, 8, [250, 245, 235, 255]);
  for (const dx of [-12, 12]) {
    r.fillCircle(cell(2) + dx, 27, 6, [250, 245, 235, 255]);
    r.fillCircle(cell(2) + dx, 37, 6, [250, 245, 235, 255]);
  }
  // kibble bowl
  r.fillEllipse(cell(3), 40, 20, 10, [235, 150, 120, 255]);
  r.fillEllipse(cell(3), 36, 16, 6, [170, 120, 90, 255]);
  for (const dx of [-8, 0, 8]) r.fillCircle(cell(3) + dx, 35, 2.5, [120, 85, 60, 255]);
  // heart cookie
  r.fillCircle(cell(4) - 6, 28, 9, [225, 185, 130, 255]);
  r.fillCircle(cell(4) + 6, 28, 9, [225, 185, 130, 255]);
  r.fillTriangle(cell(4) - 14, 32, cell(4) + 14, 32, cell(4), 48, [225, 185, 130, 255]);
  r.fillCircle(cell(4) - 4, 30, 1.5, [140, 100, 70, 255]);
  r.fillCircle(cell(4) + 5, 33, 1.5, [140, 100, 70, 255]);
  // heart
  r.fillCircle(cell(5) - 7, 27, 10, [246, 130, 160, 255]);
  r.fillCircle(cell(5) + 7, 27, 10, [246, 130, 160, 255]);
  r.fillTriangle(cell(5) - 16, 32, cell(5) + 16, 32, cell(5), 50, [246, 130, 160, 255]);
  r.fillCircle(cell(5) - 8, 25, 3, [255, 255, 255, 160]);
  return encodePNG(r.width, r.height, r.data);
}

function genIcon(size) {
  const r = new Raster(size, size);
  const s = size / 32; // designed on a 32px grid
  const cx = 16 * s;
  const cy = 18 * s;
  const p = PALETTES.cat;
  r.fillTriangle(cx - 12 * s, cy - 6 * s, cx - 7 * s, cy - 16 * s, cx - 2 * s, cy - 7 * s, p.body);
  r.fillTriangle(cx + 12 * s, cy - 6 * s, cx + 7 * s, cy - 16 * s, cx + 2 * s, cy - 7 * s, p.patch);
  r.fillCircle(cx, cy, 11 * s, p.body);
  r.fillEllipse(cx - 4 * s, cy - 1 * s, 1.8 * s, 2.2 * s, EYE);
  r.fillEllipse(cx + 4 * s, cy - 1 * s, 1.8 * s, 2.2 * s, EYE);
  r.fillEllipse(cx, cy + 3 * s, 1.4 * s, 1 * s, p.nose);
  return encodePNG(size, size, r.data);
}

function writeIfNeeded(file, gen) {
  if (ONLY_MISSING && fs.existsSync(file)) {
    console.log(`skip (exists): ${path.relative(ROOT, file)}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gen());
  console.log(`wrote: ${path.relative(ROOT, file)}`);
}

for (const species of ['cat', 'dog']) {
  if (SELECTED_SPECIES && !SELECTED_SPECIES.has(species)) continue;
  const metaFile = path.join(ROOT, 'assets/species', species, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const sheetFile = path.join(ROOT, 'assets/species', species, 'sheet.png');
  writeIfNeeded(sheetFile, () => {
    const existing = fs.existsSync(sheetFile) ? decodePNG(fs.readFileSync(sheetFile)) : null;
    return genSpeciesSheet(species, meta, existing);
  });
}
if (!SELECTED_SPECIES) {
  writeIfNeeded(path.join(ROOT, 'assets/species/common/house.png'), genHouse);
  writeIfNeeded(path.join(ROOT, 'assets/species/common/items.png'), genItems);
  writeIfNeeded(path.join(ROOT, 'assets/icons/tray-32.png'), () => genIcon(32));
  writeIfNeeded(path.join(ROOT, 'assets/icons/app-256.png'), () => genIcon(256));
  writeIfNeeded(path.join(ROOT, 'assets/icons/app-512.png'), () => genIcon(512));
}
console.log('placeholder assets ready.');
