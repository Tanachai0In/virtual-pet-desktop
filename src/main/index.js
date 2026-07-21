// @ts-check
// Main entry: app lifecycle, single-instance lock, smoke-test mode.
import { app, BrowserWindow } from 'electron';
import { createPetWindow, dockWindow, watchDisplays } from './window.js';
import { initClickthrough } from './clickthrough.js';
import { createTray } from './tray.js';
import { loadState, flushStateSync } from './persistence.js';
import { registerIpc } from './ipc.js';

const isSmoke = process.argv.includes('--smoke');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      dockWindow(win);
    }
  });

  app.whenReady().then(async () => {
    const savedState = loadState();
    const win = createPetWindow();
    registerIpc(win, savedState);
    initClickthrough(win);
    watchDisplays(win);
    if (!isSmoke) createTray(win);
    await win.loadFile('src/renderer/index.html');
    win.showInactive();

    if (isSmoke) runSmokeTest(win);
  });

  app.on('before-quit', () => {
    flushStateSync();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

/**
 * Smoke test for CI: verify the window docked inside the display work area,
 * relay renderer console errors, optionally save a screenshot
 * (SMOKE_SHOT=/path.png), then exit 0 (or 1 on failure) after 3 seconds.
 * @param {import('electron').BrowserWindow} win
 */
function runSmokeTest(win) {
  let rendererErrors = 0;
  win.webContents.on('console-message', (_e, level, message) => {
    console.log(`[renderer:${level}] ${message}`);
    if (level >= 3) rendererErrors++;
  });
  setTimeout(async () => {
    try {
      const { screen } = await import('electron');
      const wa = screen.getPrimaryDisplay().workArea;
      const b = win.getBounds();
      if (process.env.SMOKE_SHOT) {
        const image = await win.webContents.capturePage();
        const fs = await import('node:fs');
        fs.writeFileSync(process.env.SMOKE_SHOT, image.toPNG());
        console.log('[smoke] screenshot saved to', process.env.SMOKE_SHOT);
      }
      if (rendererErrors > 0) {
        console.error(`[smoke] renderer logged ${rendererErrors} error(s)`);
        app.exit(1);
        return;
      }
      const ok =
        b.x >= wa.x &&
        b.y >= wa.y &&
        b.x + b.width <= wa.x + wa.width + 1 &&
        b.y + b.height <= wa.y + wa.height + 1;
      if (!ok) {
        console.error('[smoke] window bounds outside work area', { bounds: b, workArea: wa });
        app.exit(1);
        return;
      }
      console.log('[smoke] OK — window docked at', b);
      app.exit(0);
    } catch (err) {
      console.error('[smoke] failed', err);
      app.exit(1);
    }
  }, 3000);
}
