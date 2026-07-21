// Sandboxed preload (CommonJS): exposes a minimal, typed petAPI surface.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  /** Boot handshake: { save, species, platform } */
  getBoot: () => ipcRenderer.invoke('get-boot'),
  /** Load assets/species/<name>/meta.json (renderer can't fetch file://). */
  getMeta: (name) => ipcRenderer.invoke('get-meta', name),
  /** Persist pet state (debounced in main). */
  saveState: (state) => ipcRenderer.send('save-state', state),
  /** Make the window clickable (true) or click-through (false). */
  setInteractive: (on) => ipcRenderer.send('set-interactive', on),
  /** Linux fallback: publish interactive rects for main-process hit-testing. */
  publishHitRects: (rects) => ipcRenderer.send('publish-hit-rects', rects),
  /** Tell the tray the active species changed (syncs the radio menu). */
  speciesChanged: (species) => ipcRenderer.send('species-changed', species),
  /** Tray / menu actions: feed, play-ball, send-home, wake-up, set-species. */
  onAction: (fn) => ipcRenderer.on('pet-action', (_e, action) => fn(action)),
  /** Linux fallback: cursor position in window coordinates at 10 Hz. */
  onCursor: (fn) => ipcRenderer.on('cursor-pos', (_e, pos) => fn(pos)),
  quit: () => ipcRenderer.send('quit'),
});
