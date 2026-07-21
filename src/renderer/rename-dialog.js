// @ts-check
// Logic for the tiny rename dialog window.
const api = /** @type {any} */ (window).petAPI;

const input = /** @type {HTMLInputElement} */ (document.getElementById('name'));
const ok = /** @type {HTMLButtonElement} */ (document.getElementById('ok'));
const cancel = /** @type {HTMLButtonElement} */ (document.getElementById('cancel'));

api.onRenameInit((/** @type {{name: string, max: number}} */ init) => {
  input.value = init.name ?? '';
  input.maxLength = init.max ?? 20;
  input.focus();
  input.select();
});

const submit = () => api.submitRename(input.value);
const close = () => api.cancelRename();

ok.addEventListener('click', submit);
cancel.addEventListener('click', close);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') close();
});
