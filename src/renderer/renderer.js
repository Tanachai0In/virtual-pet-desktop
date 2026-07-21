// @ts-check
// Renderer bootstrap: handshake with main, load sheets, build world, start
// the tiered loop, wire input + tray actions.
import { loadSpecies, loadCommon } from './engine/spritesheet.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createWorld } from './game/world.js';
import { applyOffline } from './game/needs.js';

async function boot() {
  const api = /** @type {any} */ (window).petAPI;
  const { save, species, platform } = await api.getBoot();

  // Offline decay: time kept passing while the app was closed.
  const elapsedS = Math.max(0, (Date.now() - Date.parse(save.lastSeenISO || '')) / 1000 || 0);
  const needs = applyOffline(
    { hunger: save.hunger, happiness: save.happiness, energy: save.energy },
    elapsedS
  );
  Object.assign(save, needs);

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('stage'));
  const fit = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  fit();

  const [common, ...sheetList] = await Promise.all([
    loadCommon(),
    ...species.map((/** @type {string} */ s) => loadSpecies(s)),
  ]);
  /** @type {Record<string, any>} */
  const sheets = {};
  for (const sheet of sheetList) sheets[sheet.name] = sheet;

  const world = createWorld({ canvas, sheets, common, save, api });
  const input = createInput({ world, api, platform });

  const loop = createLoop({
    update(dt) {
      input.tick();
      world.update(dt);
    },
    draw() {
      world.draw();
    },
    getTier() {
      return world.tier();
    },
  });

  api.onAction((/** @type {any} */ action) => {
    world.handleAction(action);
    loop.nudge();
  });

  window.addEventListener('resize', () => {
    fit();
    world.resize();
    loop.nudge();
  });

  window.addEventListener('mousemove', () => loop.nudge(), { passive: true });

  // Final save when the page goes away (main also flushes on quit).
  window.addEventListener('pagehide', () => api.saveState(world.stateForSave()));

  api.speciesChanged?.(world.species);
  loop.start();
}

boot().catch((err) => {
  console.error('[renderer] boot failed', err);
});
