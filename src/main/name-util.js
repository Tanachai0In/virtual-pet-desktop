// @ts-check
// Pet-name sanitizing. Pure module (no Electron) so it is unit-testable.

export const MAX_NAME_LEN = 20;

/** Trim, drop control characters, cap length. Returns null if unusable. @param {unknown} raw */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_NAME_LEN);
  return clean.length > 0 ? clean : null;
}
