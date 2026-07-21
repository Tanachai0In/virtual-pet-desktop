// @ts-check
// Launch-at-startup toggle. Windows/macOS use the native login-item API;
// Linux writes a freedesktop autostart .desktop entry.
import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DESKTOP_FILE = path.join(os.homedir(), '.config', 'autostart', 'virtual-pet-desktop.desktop');

export function getAutostart() {
  if (process.platform === 'linux') {
    return fs.existsSync(DESKTOP_FILE);
  }
  return app.getLoginItemSettings().openAtLogin;
}

/** @param {boolean} enable */
export function setAutostart(enable) {
  if (process.platform === 'linux') {
    try {
      if (enable) {
        fs.mkdirSync(path.dirname(DESKTOP_FILE), { recursive: true });
        const exec = process.env.APPIMAGE || process.execPath;
        fs.writeFileSync(
          DESKTOP_FILE,
          [
            '[Desktop Entry]',
            'Type=Application',
            'Name=Virtual Pet Desktop',
            `Exec=${exec}`,
            'X-GNOME-Autostart-enabled=true',
            '',
          ].join('\n')
        );
      } else {
        fs.rmSync(DESKTOP_FILE, { force: true });
      }
    } catch (err) {
      console.error('[autolaunch] failed', err);
    }
    return;
  }
  app.setLoginItemSettings({ openAtLogin: enable });
}
