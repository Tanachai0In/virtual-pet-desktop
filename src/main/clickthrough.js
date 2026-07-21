// @ts-check
// Click-through management. The window starts fully click-through; the
// renderer hit-tests the cursor against interactive rects (pet, house, food,
// ball) and asks us to flip interactivity only on transitions.
//
// Windows/macOS: setIgnoreMouseEvents(..., { forward: true }) keeps mousemove
// flowing to the renderer even while ignored, so the renderer drives it all.
//
// Linux: `forward` is not supported, so while ignored the renderer sees no
// mouse events at all. Fallback: the main process polls the cursor at 10 Hz,
// hit-tests against rects the renderer publishes, toggles interactivity and
// feeds cursor positions to the renderer over IPC. All of that platform seam
// lives in this file only.
import { ipcMain, screen } from 'electron';

const POLL_MS = 100;

/**
 * @param {import('electron').BrowserWindow} win
 */
export function initClickthrough(win) {
  let interactive = false;
  const setInteractive = (/** @type {boolean} */ on) => {
    if (on === interactive || win.isDestroyed()) return;
    interactive = on;
    win.setIgnoreMouseEvents(!on, { forward: true });
  };

  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-interactive', (_e, on) => setInteractive(Boolean(on)));

  if (process.platform !== 'linux') return;

  // ---- Linux fallback ----
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  let hitRects = [];
  ipcMain.on('publish-hit-rects', (_e, rects) => {
    hitRects = Array.isArray(rects) ? rects : [];
  });

  /** @type {NodeJS.Timeout | null} */
  let poll = null;
  const tick = () => {
    if (win.isDestroyed()) {
      if (poll) clearInterval(poll);
      return;
    }
    if (!win.isVisible()) return;
    const cursor = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const lx = cursor.x - b.x;
    const ly = cursor.y - b.y;
    const inside =
      lx >= 0 &&
      ly >= 0 &&
      lx < b.width &&
      ly < b.height &&
      hitRects.some((r) => lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h);
    setInteractive(inside);
    if (!win.isDestroyed()) {
      win.webContents.send('cursor-pos', { x: lx, y: ly });
    }
  };
  poll = setInterval(tick, POLL_MS);
  win.on('closed', () => {
    if (poll) clearInterval(poll);
  });
}
