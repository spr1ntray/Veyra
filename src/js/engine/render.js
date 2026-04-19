/**
 * engine/render.js — Canvas 2D rendering
 *
 * Renders tilemap + entities each animation frame.
 * interpolation alpha is passed from the game loop for smooth motion
 * at variable frame rates without affecting simulation.
 *
 * Layering order (back → front):
 *   1. Floor tiles      (tileset_floor.png variants)
 *   2. Wall tiles       (tileset_wall.png)
 *   3. Exit portal
 *   4. Pickups (gold piles)
 *   5. Entities sorted by Y (depth sort) — sprites or placeholder fallback
 *   6. Projectiles      (fireball.png animated)
 *   7. Impact VFX       (fire_impact.png one-shot)
 *   8. Particles
 *   9. Damage numbers
 *  10. Debug overlay (if enabled)
 *
 * Sprite system:
 *   - sprites.pyromancer / sprites.zombie — SpriteSheet (col=dir, row=frame)
 *   - sprites.fireball / sprites.impact   — AnimStrip (row-major frames)
 *   - sprites.floor / sprites.wall        — TileSheet (grid index)
 *
 * Fallback: if a sprite sheet failed to load, placeholder geometry is drawn
 * instead (colored circle / rectangle). The engine never crashes on missing assets.
 *
 * Pixel art crispness:
 *   ctx.imageSmoothingEnabled = false is set inside SpriteSheet/AnimStrip/TileSheet
 *   before every drawImage call. It's also cleared here at the start of draw()
 *   for non-sprite canvas ops that don't need smoothing.
 */

import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H, DEBUG_OVERLAY } from './config.js';
import { sprites, computeAnimFrame, ANIM_TICKS } from './sprites.js';

/** Canvas 2D context — set by initRender(). */
let _ctx = null;

/** Camera offset in pixels (top-left corner of viewport). */
let _camX = 0;
let _camY = 0;

/**
 * Initializes the renderer.
 * @param {HTMLCanvasElement} canvas
 */
export function initRender(canvas) {
  _ctx = canvas.getContext('2d');
  _ctx.imageSmoothingEnabled = false; // critical for pixel art
}

/**
 * Main draw call — called every animation frame.
 *
 * @param {Object} world   — full world state
 * @param {number} alpha   — interpolation factor [0,1] for sub-tick smoothing
 */
export function draw(world, alpha) {
  if (!_ctx) return;
  const ctx = _ctx;

  // Pixel art — disable smoothing at the top of every frame
  // (some browser ops reset this flag)
  ctx.imageSmoothingEnabled = false;

  // Center the room in the viewport
  _camX = Math.round((VIEWPORT_W - world.tilemap.pixelW) / 2);
  _camY = Math.round((VIEWPORT_H - world.tilemap.pixelH) / 2);

  // --- Clear ---
  ctx.fillStyle = '#0a0a0e'; // deep dark background outside room
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  // --- Tilemap ---
  _drawTilemap(ctx, world.tilemap, world.tick);

  // --- Exit portal ---
  if (world.exitPortal) {
    _drawPortal(ctx, world.exitPortal);
  }

  // --- Pickups ---
  for (const p of world.pickups) {
    if (p.alive) _drawPickup(ctx, p);
  }

  // --- Entities (depth-sorted) ---
  // Build render list: player + all alive enemies
  const renderList = [];
  if (world.player && world.player.alive) renderList.push(world.player);
  for (const e of world.entities) {
    if (e.alive && e.team === 'enemy') renderList.push(e);
  }
  renderList.sort((a, b) => a.y - b.y);

  for (const e of renderList) {
    _drawEntity(ctx, e, world.tick);
  }

  // --- Dead entity markers (brief) ---
  for (const e of world.entities) {
    if (!e.alive && e.team === 'enemy' && e._deathTick && world.tick - e._deathTick < 30) {
      _drawDeathFlash(ctx, e);
    }
  }

  // --- Projectiles ---
  world.projectilePool.forEach(p => {
    if (p.alive) _drawProjectile(ctx, p, world.tick);
  });

  // --- Impact VFX (fire_impact one-shot animations) ---
  if (world.impactPool) {
    world.impactPool.forEach(imp => {
      if (imp.alive) _drawImpact(ctx, imp, world.tick);
    });
  }

  // --- Particles ---
  world.particlePool.forEach(p => {
    if (p.alive) _drawParticle(ctx, p);
  });

  // --- Damage numbers ---
  for (const dn of world.damageNumbers) {
    if (dn.alive) _drawDamageNumber(ctx, dn);
  }

  // --- Debug overlay ---
  if (DEBUG_OVERLAY) {
    _drawDebug(ctx, world);
  }
}

// ─────────────────────────────────────────────
// Tilemap rendering
// ─────────────────────────────────────────────

/**
 * Draws floor then wall tiles.
 * Uses tileset sprites when loaded; falls back to colored rectangles.
 *
 * Wall tile index mapping from tileset_wall.png (4 cols × 2 rows = 8 slots):
 *   Index 0 — straight wall horizontal
 *   Index 1 — straight wall vertical
 *   Index 2 — broken wall
 *   Index 3 — moss-covered wall
 *   Index 4 — inner corner
 *   Index 5 — outer corner
 *   Index 6 — T-junction
 *   (slot 7 is empty in the sheet — never used)
 *
 * For the current single-room layout (perimeter walls only) we always
 * use index 0 (solid wall). Corner/junction detection can be added later.
 */
function _drawTilemap(ctx, tilemap, tick) {
  const floorLoaded = sprites.floor.loaded && !sprites.floor.failed;
  const wallLoaded  = sprites.wall.loaded  && !sprites.wall.failed;

  for (let r = 0; r < tilemap.rows; r++) {
    for (let c = 0; c < tilemap.cols; c++) {
      const px = _camX + c * TILE_SIZE;
      const py = _camY + r * TILE_SIZE;

      if (tilemap.isWall(c, r)) {
        if (wallLoaded) {
          // Use wall tile index 0 (straight wall) for all perimeter walls
          ctx.imageSmoothingEnabled = false;
          sprites.wall.drawTile(ctx, 0, px, py);
        } else {
          // Placeholder: dark rect with edge highlight
          ctx.fillStyle = '#0a0a0e';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#1a1a28';
          ctx.fillRect(px, py, TILE_SIZE, 2);
          ctx.fillRect(px, py, 2, TILE_SIZE);
        }
      } else {
        if (floorLoaded) {
          // Pick variant from pre-assigned map (seeded RNG at build time)
          const variantIdx = tilemap.floorVariants[r * tilemap.cols + c];
          ctx.imageSmoothingEnabled = false;
          sprites.floor.drawTile(ctx, variantIdx, px, py);
        } else {
          // Placeholder: dark floor with subtle grid lines
          ctx.fillStyle = '#2a2a33';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#22222b';
          ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
          ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────
// Entity rendering
// ─────────────────────────────────────────────

/**
 * Draws an entity using its sprite sheet if available.
 *
 * Sprite anchor offset:
 *   The entity position (x, y) is the feet/base of the character (physics centre).
 *   The 48×96 sprite is drawn so its bottom-centre aligns with (x, y).
 *   Therefore top-left corner = (x - 24, y - 90).
 *
 *   The -90 (instead of -96) gives a small ground anchor, so the character
 *   doesn't appear to float. Adjust if sprites look sunken.
 */
function _drawEntity(ctx, entity, tick) {
  const px = _camX + entity.x;
  const py = _camY + entity.y;

  if (entity.team === 'player') {
    _drawPlayer(ctx, entity, px, py, tick);
  } else if (entity.team === 'enemy') {
    _drawEnemy(ctx, entity, px, py, tick);
  }
}

function _drawPlayer(ctx, player, px, py, tick) {
  const DRAW_W = 48;
  const DRAW_H = 96;
  // Bottom-center of sprite at entity position; slight upward offset so feet are on the tile
  const dx = px - DRAW_W / 2;
  const dy = py - DRAW_H + 6; // +6 = 6px ground anchor

  const animKey  = player.animState || 'idle';
  const dirIndex = player.dirIndex  || 0;

  // Pick sprite sheet for current anim state
  let sheet = sprites.pyromancer.idle;
  if (animKey === 'walk' && sprites.pyromancer.walk.loaded && !sprites.pyromancer.walk.failed) {
    sheet = sprites.pyromancer.walk;
  } else if (animKey === 'cast' && sprites.pyromancer.cast.loaded && !sprites.pyromancer.cast.failed) {
    sheet = sprites.pyromancer.cast;
  }

  if (sheet.loaded && !sheet.failed) {
    const frame = computeAnimFrame(tick, player.animEnterTick, sheet.framesPerDir, animKey, animKey !== 'death');
    ctx.imageSmoothingEnabled = false;
    sheet.drawFrame(ctx, dx, dy, dirIndex, frame);
  } else {
    // Fallback: blue circle
    ctx.beginPath();
    ctx.arc(px, py, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4488ff';
    ctx.fill();
    ctx.strokeStyle = '#aaccff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Direction dot
    ctx.beginPath();
    ctx.arc(px, py - player.radius * 0.5, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

function _drawEnemy(ctx, enemy, px, py, tick) {
  const DRAW_W = 48;
  const DRAW_H = 96;
  const dx = px - DRAW_W / 2;
  const dy = py - DRAW_H + 6;

  const animKey  = enemy.animState || 'idle';
  const dirIndex = enemy.dirIndex  || 0;

  // For now all enemies are zombies — can be extended when more enemy types added
  let sheet = sprites.zombie.idle;
  if (animKey === 'walk' && sprites.zombie.walk.loaded && !sprites.zombie.walk.failed) {
    sheet = sprites.zombie.walk;
  } else if (animKey === 'attack' && sprites.zombie.attack.loaded && !sprites.zombie.attack.failed) {
    sheet = sprites.zombie.attack;
  }

  if (sheet.loaded && !sheet.failed) {
    const frame = computeAnimFrame(tick, enemy.animEnterTick, sheet.framesPerDir, animKey, true);
    ctx.imageSmoothingEnabled = false;
    sheet.drawFrame(ctx, dx, dy, dirIndex, frame);
  } else {
    // Fallback: green circle
    ctx.beginPath();
    ctx.arc(px, py, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color || '#44cc44';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // HP bar is always drawn (even over sprite) — small bar above the sprite
  const barW  = DRAW_W;
  const barH  = 3;
  const barX  = px - DRAW_W / 2;
  const barY  = dy - 5; // 5px above sprite top
  const pct   = enemy.hp / enemy.hpMax;

  ctx.fillStyle = '#1a0000';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = pct > 0.5 ? '#22cc44' : pct > 0.25 ? '#ffaa00' : '#cc2222';
  ctx.fillRect(barX, barY, barW * pct, barH);
}

function _drawDeathFlash(ctx, entity) {
  const px = _camX + entity.x;
  const py = _camY + entity.y;
  ctx.beginPath();
  ctx.arc(px, py, entity.radius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
  ctx.fill();
}

// ─────────────────────────────────────────────
// Projectile rendering
// ─────────────────────────────────────────────

/**
 * Draws a fireball projectile.
 * Rotates the AnimStrip frame to match flight direction.
 * Falls back to glowing circle if sprite not loaded.
 */
function _drawProjectile(ctx, proj, tick) {
  const px = _camX + proj.x;
  const py = _camY + proj.y;

  if (sprites.fireball.loaded && !sprites.fireball.failed) {
    // Compute angle from velocity
    const angle = Math.atan2(proj.vy, proj.vx);
    // 6-frame loop, 5 ticks/frame
    const frame = Math.floor(tick / 5) % sprites.fireball.totalFrames;
    ctx.imageSmoothingEnabled = false;
    sprites.fireball.drawCentered(ctx, px, py, frame, angle);
  } else {
    // Fallback: glowing orange circle
    ctx.beginPath();
    ctx.arc(px, py, proj.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 100, 0, 0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = proj.color || '#ff6a00';
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
// Impact VFX rendering
// ─────────────────────────────────────────────

/**
 * Draws one frame of a fire_impact one-shot animation.
 * The impact is centered at (imp.x, imp.y).
 */
function _drawImpact(ctx, imp, tick) {
  if (!sprites.impact.loaded || sprites.impact.failed) return;

  const TICKS_PER_FRAME = 5;
  const frameIdx = Math.floor((tick - imp.spawnTick) / TICKS_PER_FRAME);
  if (frameIdx >= sprites.impact.totalFrames) return; // already expired

  const px = _camX + imp.x;
  const py = _camY + imp.y;

  ctx.imageSmoothingEnabled = false;
  sprites.impact.drawCentered(ctx, px, py, frameIdx, 0);
}

// ─────────────────────────────────────────────
// Portal, pickup, particle, damage number
// ─────────────────────────────────────────────

function _drawPortal(ctx, portal) {
  const px = _camX + portal.x;
  const py = _camY + portal.y;

  // Glow ring
  ctx.beginPath();
  ctx.arc(px, py, portal.radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(px, py, portal.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(px, py, portal.radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8c0';
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', px, py + portal.radius + 16);
}

function _drawPickup(ctx, pickup) {
  const px = _camX + pickup.x;
  const py = _camY + pickup.y;
  ctx.beginPath();
  ctx.arc(px, py, pickup.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.fill();
}

function _drawParticle(ctx, p) {
  const px = _camX + p.x;
  const py = _camY + p.y;
  const alpha = p.life / p.lifeMax;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(1, p.size * alpha), 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function _drawDamageNumber(ctx, dn) {
  const px = _camX + dn.x;
  const py = _camY + dn.y;
  const alpha = dn.life / dn.lifeMax;
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${dn.size || 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = dn.color || '#ffdd00';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeText(dn.text, px, py);
  ctx.fillText(dn.text, px, py);
  ctx.globalAlpha = 1;
}

function _drawDebug(ctx, world) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(4, 4, 220, 96);
  ctx.fillStyle = '#0f0';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`tick: ${world.tick}`, 10, 18);
  ctx.fillText(`entities: ${world.entities.length}`, 10, 32);
  ctx.fillText(`proj: ${world.projectilePool.getAlive().length}`, 10, 46);
  ctx.fillText(`particles: ${world.particlePool.getAlive().length}`, 10, 60);
  ctx.fillText(`sprites: floor=${sprites.floor.loaded} wall=${sprites.wall.loaded}`, 10, 74);
  if (world.player) {
    ctx.fillText(`player: (${Math.round(world.player.x)}, ${Math.round(world.player.y)}) dir=${world.player.dirIndex} anim=${world.player.animState}`, 10, 88);
  }
}

/**
 * Returns current camera offset (used by HUD mini-map).
 */
export function getCameraOffset() {
  return { x: _camX, y: _camY };
}
