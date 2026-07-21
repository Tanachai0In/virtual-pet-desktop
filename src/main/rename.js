// @ts-check
// Small always-on-top dialog for renaming the pet (Electron has no native
// text prompt). Submits over IPC; the new name is forwarded to the renderer
// as a normal pet-action.
import { BrowserWindow, ipcMain, screen } from 'electron';
import { sanitizeName, MAX_NAME_LEN } from './name-util.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {BrowserWindow | null} */
let dialog = null;

/**
 * @param {import('electron').BrowserWindow} petWin
 * @param {() => string} getCurrentName
 */
export function openRenameDialog(petWin, getCurrentName) {
  if (dialog && !dialog.isDestroyed()) {
    dialog.focus();
    return;
  }
  const { workArea } = screen.getPrimaryDisplay();
  const w = 300;
  const h = 150;
  dialog = new BrowserWindow({
    width: w,
    height: h,
    x: Math.round(workArea.x + (workArea.width - w) / 2),
    y: Math.round(workArea.y + (workArea.height - h) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  dialog.loadFile('src/renderer/rename.html');
  dialog.once('ready-to-show', () => {
    if (!dialog || dialog.isDestroyed()) return;
    dialog.webContents.send('rename-init', { name: getCurrentName(), max: MAX_NAME_LEN });
    dialog.show();
  });
  dialog.on('closed', () => {
    dialog = null;
  });

  const close = () => {
    if (dialog && !dialog.isDestroyed()) dialog.close();
  };

  ipcMain.removeAllListeners('rename-submit');
  ipcMain.removeAllListeners('rename-cancel');
  ipcMain.once('rename-cancel', close);
  ipcMain.once('rename-submit', (_e, raw) => {
    const name = sanitizeName(raw);
    if (name && !petWin.isDestroyed()) {
      petWin.webContents.send('pet-action', { type: 'rename', name });
    }
    close();
  });
}
