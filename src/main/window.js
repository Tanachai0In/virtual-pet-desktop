// @ts-check
// Creates the transparent bottom-strip window and keeps it docked to the
// bottom edge of the primary display's work area (i.e. just above the taskbar).
import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BAR_HEIGHT = 160;

/**
 * Compute the strip bounds for the current primary display work area.
 * workArea already excludes the taskbar/dock/panel on every OS, so the strip
 * always sits directly above it.
 */
export function computeBarBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x,
    y: workArea.y + workArea.height - BAR_HEIGHT,
    width: workArea.width,
    height: BAR_HEIGHT,
  };
}

export function createPetWindow() {
  const bounds = computeBarBounds();
  const win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // The strip is always visible; we do our own fps throttling in the
      // renderer, so Chromium must not throttle rAF behind our back.
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  // macOS: follow the user across Spaces, but stay out of fullscreen apps.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  return win;
}

/**
 * Re-dock the window to the bottom of the current work area.
 * @param {import('electron').BrowserWindow} win
 */
export function dockWindow(win) {
  if (win.isDestroyed()) return;
  win.setBounds(computeBarBounds());
}

/**
 * Re-dock whenever displays change (resolution, taskbar move, plug/unplug).
 * @param {import('electron').BrowserWindow} win
 */
export function watchDisplays(win) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const redock = () => {
    clearTimeout(timer);
    timer = setTimeout(() => dockWindow(win), 250);
  };
  screen.on('display-metrics-changed', redock);
  screen.on('display-added', redock);
  screen.on('display-removed', redock);
  win.on('show', () => dockWindow(win));
}
