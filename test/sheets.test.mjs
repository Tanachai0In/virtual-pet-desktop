import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG, decodePNG, Raster } from '../scripts/lib/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('png round-trip (encode → decode)', () => {
  const r = new Raster(16, 8);
  r.fillRect(2, 2, 5, 3, [255, 0, 0, 255]);
  r.fillCircle(12, 4, 3, [0, 128, 255, 200]);
  const png = encodePNG(r.width, r.height, r.data);
  const back = decodePNG(png);
  assert.equal(back.width, 16);
  assert.equal(back.height, 8);
  assert.equal(back.colorType, 6);
  // a filled pixel survives
  const o = (2 * 16 + 2) * 4;
  assert.deepEqual([...back.rgba.slice(o, o + 4)], [255, 0, 0, 255]);
  // an untouched pixel stays transparent
  assert.equal(back.rgba[3], 0);
});

test('shipped sheets pass the contract validator', () => {
  // Ensure placeholders exist (postinstall may have been skipped in CI).
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/gen-placeholders.mjs'), '--only-missing']);
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/validate-sheets.mjs')], {
    encoding: 'utf8',
  });
  assert.match(out, /OK/);
});

test('species meta files match the sheet grid', () => {
  for (const species of ['cat', 'dog']) {
    const dir = path.join(ROOT, 'assets/species', species);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const img = decodePNG(fs.readFileSync(path.join(dir, 'sheet.png')));
    assert.equal(img.width % meta.frame.w, 0);
    assert.equal(img.height % meta.frame.h, 0);
    for (const [name, a] of Object.entries(meta.animations)) {
      assert.ok((a.row + 1) * meta.frame.h <= img.height, `${species}/${name} row fits`);
      assert.ok(a.frames * meta.frame.w <= img.width, `${species}/${name} frames fit`);
      assert.ok(a.fps > 0 && a.frames > 0, `${species}/${name} sane meta`);
    }
  }
});
