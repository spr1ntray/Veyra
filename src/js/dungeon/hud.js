/**
 * dungeon/hud.js — DOM overlay HUD for the action combat screen
 *
 * Elements are read from existing DOM nodes injected in index.html.
 * This module only reads + writes values — it does not create elements.
 *
 * updateHUD(world) is called from the render loop every frame,
 * but DOM writes are throttled to every 6 ticks to avoid layout thrashing.
 */

import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H } from '../engine/config.js';

// Canvas reference for mini-map drawing
let _minimapCanvas = null;
let _minimapCtx    = null;

// Throttle counter
let _lastHudTick = -1;

/**
 * Initialises HUD DOM elements and the mini-map canvas.
 * Called once from dungeon.startRun().
 *
 * @param {Object} world
 */
export function initHUD(world) {
  _minimapCanvas = document.getElementById('action-minimap');
  if (_minimapCanvas) {
    _minimapCtx = _minimapCanvas.getContext('2d');
  }
  _lastHudTick = -1;

  // Show the HUD container
  const hud = document.getElementById('action-hud');
  if (hud) hud.style.display = 'flex';
}

/**
 * Destroys / hides HUD elements.
 * Called from dungeon.stopRun().
 */
export function destroyHUD() {
  const hud = document.getElementById('action-hud');
  if (hud) hud.style.display = 'none';
  _minimapCanvas = null;
  _minimapCtx    = null;
}

/**
 * Updates the DOM HUD.
 * Throttled to every 4 ticks to reduce layout pressure.
 *
 * @param {Object} world
 */
export function updateHUD(world) {
  if (!world) return;
  // Throttle: update every 4 ticks
  if (world.tick - _lastHudTick < 4) return;
  _lastHudTick = world.tick;

  const player = world.player;

  // --- HP bar ---
  const hpBar  = document.getElementById('action-hp-bar-fill');
  const hpText = document.getElementById('action-hp-text');
  if (player && hpBar && hpText) {
    const pct = Math.max(0, player.hp / player.hpMax);
    hpBar.style.width = `${pct * 100}%`;
    hpText.textContent = `${Math.max(0, player.hp)} / ${player.hpMax}`;
  }

  // --- Gold display ---
  const goldEl = document.getElementById('action-gold');
  if (player && goldEl) {
    goldEl.textContent = `Gold: ${player.goldCollected}`;
  }

  // --- Run timer ---
  const timerEl = document.getElementById('action-timer');
  if (timerEl) {
    const secs  = Math.floor(world.tick / 60);
    const mm    = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss    = String(secs % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }

  // --- Hotbar cooldown overlay (slot 1 = Fireball) ---
  _updateHotbar(player, world);

  // --- Mini-map ---
  _drawMinimap(world);
}

// ─────────────────────────────────────────────
// Hotbar
// ─────────────────────────────────────────────

function _updateHotbar(player, world) {
  if (!player) return;
  const slot1 = document.getElementById('hotbar-slot-1');
  if (!slot1) return;

  const CD_TICKS    = Math.round(1.2 * 60);
  const lastFire    = player.fireballLastTick || 0;
  const ticksSince  = world.tick - lastFire;
  const overlay     = slot1.querySelector('.hotbar-cd-overlay');

  if (overlay) {
    const remaining = Math.max(0, CD_TICKS - ticksSince);
    const fraction  = remaining / CD_TICKS; // 0 = ready, 1 = just fired
    if (fraction > 0) {
      overlay.style.display = 'block';
      // Radial sweep using conic-gradient
      overlay.style.background = `conic-gradient(rgba(0,0,0,0.65) ${fraction * 360}deg, transparent 0deg)`;
    } else {
      overlay.style.display = 'none';
    }
  }
}

// ─────────────────────────────────────────────
// Mini-map
// ─────────────────────────────────────────────

function _drawMinimap(world) {
  if (!_minimapCtx || !world.tilemap) return;
  const ctx  = _minimapCtx;
  const mw   = _minimapCanvas.width;
  const mh   = _minimapCanvas.height;
  const scaleX = mw / world.tilemap.pixelW;
  const scaleY = mh / world.tilemap.pixelH;

  // Background
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, mw, mh);

  // Tiles
  for (let r = 0; r < world.tilemap.rows; r++) {
    for (let c = 0; c < world.tilemap.cols; c++) {
      if (!world.tilemap.isWall(c, r)) {
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(
          Math.round(c * TILE_SIZE * scaleX),
          Math.round(r * TILE_SIZE * scaleY),
          Math.ceil(TILE_SIZE * scaleX),
          Math.ceil(TILE_SIZE * scaleY)
        );
      }
    }
  }

  // Gold pickups
  for (const p of world.pickups) {
    if (!p.alive) continue;
    ctx.fillStyle = '#ffd700';
    const px = p.x * scaleX;
    const py = p.y * scaleY;
    ctx.fillRect(Math.round(px - 1), Math.round(py - 1), 3, 3);
  }

  // Exit portal
  if (world.exitPortal) {
    ctx.fillStyle = '#ffd700';
    const px = world.exitPortal.x * scaleX;
    const py = world.exitPortal.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies (red dots)
  ctx.fillStyle = '#ff3333';
  for (const e of world.entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const px = e.x * scaleX;
    const py = e.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player (blue dot)
  if (world.player && world.player.alive) {
    ctx.fillStyle = '#4488ff';
    const px = world.player.x * scaleX;
    const py = world.player.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Border
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0, 0, mw, mh);
}
