import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeName, MAX_NAME_LEN } from '../src/main/name-util.js';

test('trims whitespace and accepts normal names', () => {
  assert.equal(sanitizeName('  Mochi  '), 'Mochi');
  assert.equal(sanitizeName('น้องส้ม'), 'น้องส้ม');
});

test('strips control characters', () => {
  assert.equal(sanitizeName('Mo\u0000chi\u001f\u007f'), 'Mochi');
});

test('caps length at MAX_NAME_LEN', () => {
  const long = 'a'.repeat(MAX_NAME_LEN + 10);
  assert.equal(sanitizeName(long)?.length, MAX_NAME_LEN);
});

test('rejects empty and non-string input', () => {
  assert.equal(sanitizeName('   '), null);
  assert.equal(sanitizeName(''), null);
  assert.equal(sanitizeName(null), null);
  assert.equal(sanitizeName(42), null);
});
