// @ts-check
// Tray icon + context menu. All pet actions are forwarded to the renderer
// over the 'pet-action' channel; the renderer's world reacts to them.
import { app, Tray, Menu, nativeImage, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAutostart, getAutostart } from './autolaunch.js';
import { dockWindow } from './window.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '../../assets');

/** @type {Tray | null} */
let tray = null;

/** Scan assets/species for available species (folders with meta.json, excluding common). */
export function listSpecies() {
  const dir = path.join(ASSETS, 'species');
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'common')
      .filter((d) => fs.existsSync(path.join(dir, d.name, 'meta.json')))
      .map((d) => d.name);
  } catch {
    return ['cat'];
  }
}

/**
 * @param {import('electron').BrowserWindow} win
 */
export function createTray(win) {
  const iconPath = path.join(ASSETS, 'icons', 'tray-32.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Virtual Pet');

  let currentSpecies = 'cat';
  let visible = true;

  const send = (/** @type {string} */ type, /** @type {object} */ payload = {}) => {
    if (!win.isDestroyed()) win.webContents.send('pet-action', { type, ...payload });
  };

  const rebuild = () => {
    const menu = Menu.buildFromTemplate([
      { label: 'Virtual Pet', enabled: false },
      { type: 'separator' },
      {
        label: 'Feed',
        submenu: [
          { label: '🐟 Fish', click: () => send('feed', { food: 'fish' }) },
          { label: '🦴 Bone', click: () => send('feed', { food: 'bone' }) },
          { label: '🍪 Cookie', click: () => send('feed', { food: 'cookie' }) },
        ],
      },
      { label: '⚽ Play ball', click: () => send('play-ball') },
      { label: '🏠 Send home', click: () => send('send-home') },
      { label: '☀️ Wake up', click: () => send('wake-up') },
      { type: 'separator' },
      {
        label: 'Choose pet',
        submenu: listSpecies().map((s) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          type: /** @type {'radio'} */ ('radio'),
          checked: s === currentSpecies,
          click: () => {
            currentSpecies = s;
            send('set-species', { species: s });
            rebuild();
          },
        })),
      },
      {
        label: 'Launch at startup',
        type: 'checkbox',
        checked: getAutostart(),
        click: (item) => setAutostart(item.checked),
      },
      {
        label: visible ? 'Hide pet' : 'Show pet',
        click: () => {
          visible = !visible;
          if (visible) {
            win.showInactive();
            dockWindow(win);
          } else {
            win.hide();
          }
          rebuild();
        },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray?.setContextMenu(menu);
  };

  // Keep the species radio in sync when the renderer restores a saved species.
  ipcMain.on('species-changed', (_e, species) => {
    if (typeof species === 'string' && species !== currentSpecies) {
      currentSpecies = species;
      rebuild();
    }
  });

  rebuild();
  return tray;
}
