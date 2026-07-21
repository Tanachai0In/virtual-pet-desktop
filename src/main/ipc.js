// @ts-check
// All ipcMain handlers in one place (except click-through, which lives in
// clickthrough.js because of its Linux fallback).
import { app, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveState } from './persistence.js';
import { listSpecies } from './tray.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPECIES_DIR = path.join(__dirname, '../../assets/species');

/**
 * @param {import('electron').BrowserWindow} win
 * @param {import('./persistence.js').SaveState} savedState
 */
export function registerIpc(win, savedState) {
  // Renderer boot handshake: saved state + available species + platform.
  ipcMain.handle('get-boot', () => ({
    save: savedState,
    species: listSpecies(),
    platform: process.platform,
  }));

  // Renderer pages are file:// and cannot fetch() local JSON, so sprite
  // metadata is served over IPC. Images load fine via <img src>.
  ipcMain.handle('get-meta', (_e, name) => {
    if (typeof name !== 'string' || !/^[a-z0-9_-]+$/i.test(name)) return null;
    try {
      return JSON.parse(fs.readFileSync(path.join(SPECIES_DIR, name, 'meta.json'), 'utf8'));
    } catch {
      return null;
    }
  });

  ipcMain.on('save-state', (_e, state) => {
    if (state && typeof state === 'object') saveState(state);
  });

  ipcMain.on('quit', () => app.quit());
}
