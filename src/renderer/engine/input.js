// @ts-check
// Mouse input + click-through driving.
//
// Windows/macOS: setIgnoreMouseEvents(..., {forward:true}) keeps mousemove
// arriving even while the window is click-through, so we hit-test here and
// flip interactivity only on transitions (never per frame).
//
// Linux: no forward support — the main process polls the cursor and feeds
// positions via onCursor; it also needs our hit rects (publishHitRects).

const RECT_PUBLISH_EPS = 8;

/**
 * @param {{ world: any, api: any, platform: string }} opts
 */
export function createInput({ world, api, platform }) {
  let lastSent = false;
  let lastPos = { x: -1, y: -1 };
  let pendingMove = /** @type {{x:number,y:number,moved:number} | null} */ (null);
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  let lastRects = [];

  const toLocal = (/** @type {MouseEvent} */ e) => ({ x: e.clientX, y: e.clientY });

  window.addEventListener('mousemove', (e) => {
    const pt = toLocal(e);
    const moved =
      lastPos.x < 0 ? 0 : Math.abs(pt.x - lastPos.x) + Math.abs(pt.y - lastPos.y);
    lastPos = pt;
    // Coalesce to one world update per game tick.
    if (pendingMove) {
      pendingMove.x = pt.x;
      pendingMove.y = pt.y;
      pendingMove.moved += moved;
    } else {
      pendingMove = { x: pt.x, y: pt.y, moved };
    }
  });

  window.addEventListener('mousedown', (e) => {
    world.onPointerDown(toLocal(e));
  });
  window.addEventListener('mouseup', () => {
    world.onPointerUp();
  });
  window.addEventListener('mouseleave', () => {
    world.cursor.inside = false;
  });

  if (platform === 'linux') {
    api.onCursor((/** @type {{x:number,y:number}} */ pos) => {
      const moved =
        lastPos.x < 0 ? 0 : Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y);
      lastPos = pos;
      if (pendingMove) {
        pendingMove.x = pos.x;
        pendingMove.y = pos.y;
        pendingMove.moved += moved;
      } else {
        pendingMove = { x: pos.x, y: pos.y, moved };
      }
    });
  }

  /** Called once per game tick from the renderer loop. */
  function tick() {
    if (pendingMove) {
      world.onPointerMove({ x: pendingMove.x, y: pendingMove.y }, pendingMove.moved);
      pendingMove = null;
    }

    // Interactivity transitions.
    const hit = world.cursor.inside && world.hitTest(world.cursor);
    world.cursor.interactive = hit;
    if (hit !== lastSent) {
      lastSent = hit;
      api.setInteractive(hit);
    }

    // Linux fallback: publish hit rects when they materially change.
    if (platform === 'linux') {
      const rects = world.hitRects();
      if (rectsChanged(lastRects, rects)) {
        lastRects = rects;
        api.publishHitRects(rects);
      }
    }
  }

  return { tick };
}

/**
 * @param {{x:number,y:number,w:number,h:number}[]} a
 * @param {{x:number,y:number,w:number,h:number}[]} b
 */
function rectsChanged(a, b) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (
      Math.abs(a[i].x - b[i].x) > RECT_PUBLISH_EPS ||
      Math.abs(a[i].y - b[i].y) > RECT_PUBLISH_EPS ||
      Math.abs(a[i].w - b[i].w) > RECT_PUBLISH_EPS ||
      Math.abs(a[i].h - b[i].h) > RECT_PUBLISH_EPS
    ) {
      return true;
    }
  }
  return false;
}
