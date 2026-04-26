/**
 * dungeon/hud.js — DOM overlay HUD for the action combat screen
 *
 * Elements are read from existing DOM nodes injected in index.html.
 * This module only reads + writes values — it does not create elements,
 * except for the hotbar slots which are built dynamically from player.skills.
 */

import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H } from '../engine/config.js';
import { getState } from '../state.js';

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

  // Set character name
  const nameEl = document.getElementById('action-char-name');
  if (nameEl) {
    const state = getState();
    nameEl.textContent = state.heroName || 'Wizard';
  }

  // Build hotbar slots from player skills
  if (world.player) {
    _buildHotbar(world.player);
  }
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

  // --- Gold display (icon drawn in initHUD; just update the number) ---
  const goldNumEl = document.getElementById('action-gold-number');
  if (player && goldNumEl) {
    goldNumEl.textContent = player.goldCollected;
  }

  // --- Run timer ---
  const timerEl = document.getElementById('action-timer');
  if (timerEl) {
    const secs = Math.floor(world.tick / 60);
    const mm   = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss   = String(secs % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }

  // --- Hotbar cooldown overlays ---
  _updateHotbar(player, world);

  // --- Mini-map ---
  _drawMinimap(world);
}

// ─────────────────────────────────────────────
// Hotbar
// ─────────────────────────────────────────────

/**
 * Builds hotbar DOM from player.skills — only filled slots are shown.
 * Each slot gets a small canvas with a drawn skill icon.
 */
function _buildHotbar(player) {
  const hotbar = document.getElementById('action-hotbar');
  if (!hotbar || !player || !player.skills) return;
  hotbar.innerHTML = '';

  player.skills.forEach((skill, i) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    slot.id = `hotbar-slot-${i + 1}`;

    const keySpan = document.createElement('span');
    keySpan.className = 'hotbar-key';
    keySpan.textContent = String(i + 1);
    slot.appendChild(keySpan);

    const iconCanvas = document.createElement('canvas');
    iconCanvas.className = 'hotbar-icon-canvas';
    iconCanvas.width  = 40;
    iconCanvas.height = 40;
    slot.appendChild(iconCanvas);
    _drawSkillIcon(iconCanvas, skill);

    const cdOverlay = document.createElement('div');
    cdOverlay.className = 'hotbar-cd-overlay';
    cdOverlay.style.display = 'none';
    slot.appendChild(cdOverlay);

    hotbar.appendChild(slot);
  });
}

/** Draws a skill icon onto a small canvas element. */
function _drawSkillIcon(canvas, skill) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  if (skill.icon === 'fire' || skill.id === 'fireball') {
    // Outer glow
    const grd = ctx.createRadialGradient(cx, cy + 2, 2, cx, cy, 16);
    grd.addColorStop(0, '#ffee80');
    grd.addColorStop(0.5, '#ff6a00');
    grd.addColorStop(1, 'rgba(180,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    // Flame body
    ctx.fillStyle = '#ff8c20';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.bezierCurveTo(cx + 9, cy - 8, cx + 8, cy + 4, cx + 5, cy + 10);
    ctx.bezierCurveTo(cx + 2, cy + 15, cx - 2, cy + 15, cx - 5, cy + 10);
    ctx.bezierCurveTo(cx - 8, cy + 4, cx - 9, cy - 8, cx, cy - 14);
    ctx.fill();
    // Hot core
    ctx.fillStyle = '#fff8a0';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _updateHotbar(player, world) {
  if (!player || !player.skills) return;

  player.skills.forEach((skill, i) => {
    const slot = document.getElementById(`hotbar-slot-${i + 1}`);
    if (!slot) return;
    const overlay = slot.querySelector('.hotbar-cd-overlay');
    if (!overlay) return;

    const remaining = Math.max(0, skill.cdTicks - (world.tick - skill.lastUsedTick));
    const fraction  = remaining / skill.cdTicks;
    if (fraction > 0) {
      overlay.style.display = 'block';
      overlay.style.background = `conic-gradient(rgba(0,0,0,0.65) ${fraction * 360}deg, transparent 0deg)`;
    } else {
      overlay.style.display = 'none';
    }
  });
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

  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, mw, mh);

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

  for (const p of world.pickups) {
    if (!p.alive) continue;
    ctx.fillStyle = '#ffd700';
    const px = p.x * scaleX;
    const py = p.y * scaleY;
    ctx.fillRect(Math.round(px - 1), Math.round(py - 1), 3, 3);
  }

  if (world.exitPortal) {
    ctx.fillStyle = '#ffd700';
    const px = world.exitPortal.x * scaleX;
    const py = world.exitPortal.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ff3333';
  for (const e of world.entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const px = e.x * scaleX;
    const py = e.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (world.player && world.player.alive) {
    ctx.fillStyle = '#4488ff';
    const px = world.player.x * scaleX;
    const py = world.player.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0, 0, mw, mh);
}
