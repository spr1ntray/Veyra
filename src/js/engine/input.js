/**
 * engine/input.js — mouse/keyboard input collector
 *
 * Collects raw browser events and exposes a snapshot that the game
 * loop reads once per tick. This decouples event timing from simulation
 * timing and keeps update() deterministic.
 *
 * NOTE: performance.now() is allowed here (input layer only).
 * It must NEVER flow into game-logic code.
 */

import { getZoomLevel, setZoomLevel, ZOOM_STEP } from './render.js';

// Raw accumulated state (mutated by event handlers)
const _raw = {
  // Latest mouse position relative to the canvas (pixel coords)
  mouseX: 0,
  mouseY: 0,

  // Clicks queued since last snapshot
  leftClicks:  [],  // [{x, y}]
  rightClicks: [], // [{x, y}]

  // True while the left mouse button is physically held down
  leftButtonDown: false,

  // Keys currently held down
  keysDown: new Set(),

  // Keys that were pressed (not held) since last snapshot
  keysPressed: new Set(),
};

// Scale factor applied to raw DOM coords → canvas coords
// Updated whenever the CSS transform scale changes
let _scaleX = 1;
let _scaleY = 1;
let _canvasOffX = 0;
let _canvasOffY = 0;

// BUG-019: keep named references so destroyInput() can remove them.
// Without this, each startRun() call stacks another copy of every listener.
let _handlers = {
  mousemove:   null,
  mousedown:   null,
  mouseup:     null,
  contextmenu: null,
  keydown:     null,
  keyup:       null,
  wheel:       null, // zoom wheel
  // The container element the first three are bound to
  container:   null,
};

/**
 * Removes all event listeners added by the most recent initInput() call.
 * Safe to call even if initInput() has never been called.
 *
 * BUG-019: must run at the top of initInput() so re-entering the dungeon
 * doesn't stack duplicate listeners on window and the container.
 */
export function destroyInput() {
  const c = _handlers.container;
  if (c) {
    if (_handlers.mousemove)   c.removeEventListener('mousemove',   _handlers.mousemove);
    if (_handlers.mousedown)   c.removeEventListener('mousedown',   _handlers.mousedown);
    if (_handlers.mouseup)     c.removeEventListener('mouseup',     _handlers.mouseup);
    if (_handlers.contextmenu) c.removeEventListener('contextmenu', _handlers.contextmenu);
    if (_handlers.wheel)       c.removeEventListener('wheel',       _handlers.wheel);
  }
  if (_handlers.keydown) window.removeEventListener('keydown', _handlers.keydown);
  if (_handlers.keyup)   window.removeEventListener('keyup',   _handlers.keyup);

  _handlers.mousemove   = null;
  _handlers.mousedown   = null;
  _handlers.mouseup     = null;
  _handlers.contextmenu = null;
  _handlers.keydown     = null;
  _handlers.keyup       = null;
  _handlers.wheel       = null;
  _handlers.container   = null;
}

/**
 * Call once to attach input listeners to the canvas element.
 * Safe to call multiple times — destroys previous listeners first (BUG-019).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} container — the scaled wrapper div
 */
export function initInput(canvas, container) {
  // BUG-019: tear down any previously attached listeners before re-binding.
  destroyInput();

  _handlers.container = container;

  // Use the container for events because the canvas may be scaled
  _handlers.mousemove = (e) => {
    const coords = _domToCanvas(e, container);
    _raw.mouseX = coords.x;
    _raw.mouseY = coords.y;
  };
  container.addEventListener('mousemove', _handlers.mousemove);

  // mousedown starts movement immediately (vs click which fires on release)
  _handlers.mousedown = (e) => {
    if (e.button !== 0) return;
    // Ignore clicks that originated from UI overlays (popup buttons, hotbar, etc.)
    // Only register movement when clicking directly on the game canvas or bare container.
    if (e.target.id !== 'action-canvas' && e.target !== container) return;
    e.preventDefault();
    _raw.leftButtonDown = true;
    const coords = _domToCanvas(e, container);
    _raw.leftClicks.push({ x: coords.x, y: coords.y }); // immediate path update
  };
  container.addEventListener('mousedown', _handlers.mousedown);

  _handlers.mouseup = (e) => {
    if (e.button === 0) _raw.leftButtonDown = false;
  };
  container.addEventListener('mouseup', _handlers.mouseup);

  _handlers.contextmenu = (e) => {
    e.preventDefault();
    const coords = _domToCanvas(e, container);
    _raw.rightClicks.push({ x: coords.x, y: coords.y });
  };
  container.addEventListener('contextmenu', _handlers.contextmenu);

  _handlers.keydown = (e) => {
    _raw.keysDown.add(e.key);
    _raw.keysPressed.add(e.key);
  };
  window.addEventListener('keydown', _handlers.keydown);

  _handlers.keyup = (e) => {
    _raw.keysDown.delete(e.key);
  };
  window.addEventListener('keyup', _handlers.keyup);

  // --- Wheel → zoom ---
  // Only plain wheel (not ctrl+wheel, which is the browser's native page zoom).
  // Bound to container so it only fires when the dungeon viewport is focused/hovered.
  // `{ passive: false }` required so preventDefault() actually suppresses page scroll.
  _handlers.wheel = (e) => {
    // Let ctrl+wheel pass through — that's the browser zoom shortcut
    if (e.ctrlKey) return;
    e.preventDefault();
    // deltaY > 0  = scroll down = zoom out
    // deltaY < 0  = scroll up   = zoom in
    const current = getZoomLevel();
    const next    = e.deltaY < 0
      ? current * ZOOM_STEP           // zoom in: multiply
      : current / ZOOM_STEP;          // zoom out: divide
    setZoomLevel(next);               // setZoomLevel clamps to [ZOOM_MIN, ZOOM_MAX]
  };
  container.addEventListener('wheel', _handlers.wheel, { passive: false });
}

/**
 * Converts a MouseEvent's client coords into canvas-space coords,
 * accounting for CSS transform: scale().
 */
function _domToCanvas(e, container) {
  const rect = container.getBoundingClientRect();
  // rect dimensions reflect CSS scale — divide by actual CSS scale
  const cssW = rect.width;
  const cssH = rect.height;
  const canvasW = 1280; // VIEWPORT_W — avoid circular import
  const canvasH = 720;  // VIEWPORT_H
  const sx = canvasW / cssW;
  const sy = canvasH / cssH;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top)  * sy,
  };
}

/**
 * Returns a frozen snapshot of current input state, then resets
 * one-shot events (clicks, keysPressed).
 *
 * Called once per simulation tick from world.update().
 *
 * @returns {{ mouseX, mouseY, leftClicks, rightClicks, keysDown, keysPressed }}
 */
export function snapshotInput() {
  const snap = {
    mouseX:          _raw.mouseX,
    mouseY:          _raw.mouseY,
    leftClicks:      _raw.leftClicks.splice(0),  // drain
    rightClicks:     _raw.rightClicks.splice(0), // drain
    keysDown:        new Set(_raw.keysDown),
    keysPressed:     new Set(_raw.keysPressed),
    leftButtonDown:  _raw.leftButtonDown,
  };
  _raw.keysPressed.clear();
  return snap;
}

/**
 * Clears all queued events — call when leaving the dungeon screen.
 */
export function clearInput() {
  _raw.leftClicks.length  = 0;
  _raw.rightClicks.length = 0;
  _raw.keysPressed.clear();
  _raw.keysDown.clear();
  _raw.leftButtonDown = false;
}
