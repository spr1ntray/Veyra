/**
 * engine/render.js — Canvas 2D rendering
 *
 * Renders tilemap + entities each animation frame.
 * interpolation alpha is passed from the game loop for smooth motion
 * at variable frame rates without affecting simulation.
 *
 * Layering order (back → front):
 *   1. Floor tiles      (programmatic: dark arena look)
 *   2. Wall tiles       (programmatic: perimeter border only)
 *   3. Exit portal      (programmatic: glowing ring with ✦ symbol)
 *   4. Pickups (gold piles)
 *   5. Entities sorted by Y (depth sort) — programmatic placeholder art
 *   6. Projectiles      (programmatic: fireball with trail)
 *   7. Impact VFX       (programmatic: particle burst on hit)
 *   8. Particles
 *   9. Damage numbers
 *  10. Debug overlay (if enabled)
 *
 * Visual style: cute-minimalism-dark-fantasy placeholder.
 * All rendering is purely programmatic (no PNG sprite sheets) until
 * the design director delivers the final visual spec.
 *
 * Sprite imports are kept so the module compiles; they are not actively used.
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
    _drawPortal(ctx, world.exitPortal, world.tick);
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
 * Draws the room tilemap using pure programmatic rendering.
 *
 * Visual spec (placeholder):
 *   Floor: #1a1a24 fill with thin #22222e grid lines (0.5px) between tiles
 *   Wall (perimeter only): #0d0d14 fill, #2a2a3a border highlight
 *   The room reads as a single open arena — no internal obstacles.
 */
function _drawTilemap(ctx, tilemap, tick) {
  for (let r = 0; r < tilemap.rows; r++) {
    for (let c = 0; c < tilemap.cols; c++) {
      const px = _camX + c * TILE_SIZE;
      const py = _camY + r * TILE_SIZE;

      if (tilemap.isWall(c, r)) {
        // Perimeter wall — very dark fill, subtle inner-edge highlight
        ctx.fillStyle = '#0d0d14';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Edge highlight on the interior-facing sides
        ctx.fillStyle = '#2a2a3a';
        // bottom edge of top-row walls, top edge of bottom-row walls, etc.
        if (r === 0) {
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
        }
        if (r === tilemap.rows - 1) {
          ctx.fillRect(px, py, TILE_SIZE, 2);
        }
        if (c === 0) {
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
        }
        if (c === tilemap.cols - 1) {
          ctx.fillRect(px, py, 2, TILE_SIZE);
        }
      } else {
        // Floor tile — dark base
        ctx.fillStyle = '#1a1a24';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Thin grid lines on right and bottom edge of each tile
        ctx.fillStyle = '#22222e';
        ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
        ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
      }
    }
  }
}

// ─────────────────────────────────────────────
// Entity rendering
// ─────────────────────────────────────────────

/**
 * Draws an entity using programmatic placeholder art.
 * Entity (x, y) is the physics/feet centre, room-relative.
 * _camX/_camY are added here to translate to canvas-space.
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

/**
 * Pyromancer placeholder — cute-minimalism-dark-fantasy style.
 *
 * Visual spec:
 *   - Gold circle radius 14px, fill #e8b84b, glow shadowBlur=15 #f5c842
 *   - Small wizard-hat triangle above (#c9901a)
 *   - Direction dot 3px white in the facing direction
 */
function _drawPlayer(ctx, player, px, py, tick) {
  const R = 14;

  // Derive facing angle from dirIndex (0=S, 1=E, 2=N, 3=W)
  // Used to place the direction indicator dot
  const DIR_ANGLES = [Math.PI / 2, 0, -Math.PI / 2, Math.PI]; // S, E, N, W
  const angle = DIR_ANGLES[player.dirIndex || 0];

  // --- Outer glow ---
  ctx.save();
  ctx.shadowBlur  = 15;
  ctx.shadowColor = '#f5c842';

  // --- Main body circle ---
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fillStyle = '#e8b84b';
  ctx.fill();

  ctx.restore(); // clear shadow before drawing crisp overlays

  // --- Wizard hat (small triangle above the circle) ---
  const hatW = 10;
  const hatH = 12;
  const hatBaseY = py - R + 2; // sits on top of circle
  ctx.beginPath();
  ctx.moveTo(px, hatBaseY - hatH);          // tip
  ctx.lineTo(px - hatW / 2, hatBaseY);      // bottom-left
  ctx.lineTo(px + hatW / 2, hatBaseY);      // bottom-right
  ctx.closePath();
  ctx.fillStyle = '#c9901a';
  ctx.fill();

  // --- Direction dot (3px, white) at facing edge ---
  const dotX = px + Math.cos(angle) * (R - 3);
  const dotY = py + Math.sin(angle) * (R - 3);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/**
 * Zombie placeholder — cute-minimalism-dark-fantasy style.
 *
 * Visual spec:
 *   - Dark green circle radius 13px, fill #3d4a3a, outline #6b8b5e 2px
 *   - Two small green dot eyes (#a8ff78, 3px each)
 *   - Direction dot 2px #a8ff78 at facing edge
 *   - HP bar above
 */
function _drawEnemy(ctx, enemy, px, py, tick) {
  const R = enemy.radius || 13;
  // Clamp visual radius so it's consistent regardless of physics radius
  const VR = 13;

  // Derive facing angle from velocity (or fall back to 0=S)
  let angle = Math.PI / 2; // default S
  const speed = enemy.vx * enemy.vx + enemy.vy * enemy.vy;
  if (speed > 0.0001) {
    angle = Math.atan2(enemy.vy, enemy.vx);
  }

  // --- Main body circle ---
  ctx.beginPath();
  ctx.arc(px, py, VR, 0, Math.PI * 2);
  ctx.fillStyle = '#3d4a3a';
  ctx.fill();
  ctx.strokeStyle = '#6b8b5e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- Eyes: two small dots offset from centre ---
  // Eyes are placed ~5px above centre, spaced 5px apart
  const eyeY = py - 3;
  const eyeOffsets = [-4, 4];
  for (const ex of eyeOffsets) {
    ctx.beginPath();
    ctx.arc(px + ex, eyeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#a8ff78';
    ctx.fill();
  }

  // --- Direction dot (2px, green) at facing edge ---
  const dotX = px + Math.cos(angle) * (VR - 2);
  const dotY = py + Math.sin(angle) * (VR - 2);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#a8ff78';
  ctx.fill();

  // --- HP bar above the enemy ---
  const barW = VR * 2 + 10;
  const barH = 3;
  const barX = px - barW / 2;
  const barY = py - VR - 8;
  const pct  = enemy.hp / enemy.hpMax;

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
 * Draws a fireball projectile — programmatic placeholder.
 *
 * Visual spec:
 *   - Core circle radius 7px, fill #ff6b2b, inner glow shadowBlur=12 #ffaa40
 *   - Trail: 4 semi-transparent circles behind the ball, fading out
 */
function _drawProjectile(ctx, proj, tick) {
  const px = _camX + proj.x;
  const py = _camY + proj.y;

  const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
  const R = 7;

  // --- Trail (4 ghost circles behind the ball along the velocity axis) ---
  if (speed > 0) {
    const nx = proj.vx / speed; // normalised direction
    const ny = proj.vy / speed;
    for (let i = 1; i <= 4; i++) {
      const tx = px - nx * i * 5;
      const ty = py - ny * i * 5;
      const trailAlpha = 0.18 - i * 0.04;
      const trailR = Math.max(2, R - i * 1.5);
      ctx.beginPath();
      ctx.arc(tx, ty, trailR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 107, 43, ${trailAlpha})`;
      ctx.fill();
    }
  }

  // --- Core glow ---
  ctx.save();
  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#ffaa40';
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b2b';
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────
// Impact VFX rendering
// ─────────────────────────────────────────────

/**
 * Draws a hit-impact burst using programmatic particles.
 *
 * Visual spec:
 *   - 5 orange spark dots radiate from impact point
 *   - Total lifetime 18 ticks (~300ms at 60Hz)
 *   - Alpha fades from 1.0 → 0 over lifetime
 */
function _drawImpact(ctx, imp, tick) {
  const LIFETIME = 18; // ticks
  const elapsed  = tick - imp.spawnTick;
  if (elapsed >= LIFETIME) return;

  const progress = elapsed / LIFETIME;     // 0..1
  const alpha    = 1 - progress;
  const px       = _camX + imp.x;
  const py       = _camY + imp.y;

  // 5 sparks at evenly-spaced angles, moving outward over lifetime
  const NUM_SPARKS = 5;
  const MAX_DIST   = 18; // max travel distance in pixels

  ctx.globalAlpha = alpha;
  for (let i = 0; i < NUM_SPARKS; i++) {
    const a  = (i / NUM_SPARKS) * Math.PI * 2;
    const d  = progress * MAX_DIST;
    const sx = px + Math.cos(a) * d;
    const sy = py + Math.sin(a) * d;
    const r  = Math.max(1, 3 * (1 - progress));
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c40';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────
// Portal, pickup, particle, damage number
// ─────────────────────────────────────────────

/**
 * Exit portal — cute-minimalism-dark-fantasy placeholder.
 *
 * Visual spec:
 *   - Translucent fill circle rgba(201,168,76,0.15), radius 22
 *   - Dashed gold border #c9a84c, 2px, animated rotation
 *   - Outer glow shadowBlur=20 #c9a84c
 *   - Inner ✦ symbol #c9a84c 16px
 */
function _drawPortal(ctx, portal, tick) {
  const px = _camX + portal.x;
  const py = _camY + portal.y;
  const R  = portal.radius || 22;

  // Outer ambient glow (no shadow needed — just a larger semi-transparent circle)
  ctx.beginPath();
  ctx.arc(px, py, R + 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(201, 168, 76, 0.07)';
  ctx.fill();

  // Fill
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(201, 168, 76, 0.15)';
  ctx.fill();

  // Animated dashed border — rotate by using ctx.save/rotate
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((tick * 0.015) % (Math.PI * 2)); // slow clockwise spin
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]); // reset dash
  ctx.restore();

  // Glow highlight on top (rendered via shadowBlur)
  ctx.save();
  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#c9a84c';
  ctx.beginPath();
  ctx.arc(px, py, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();

  // ✦ symbol centred inside
  ctx.fillStyle = '#c9a84c';
  ctx.font      = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', px, py);
  ctx.textBaseline = 'alphabetic'; // restore default
}

/**
 * Gold pickup — small 8×8 square with thin glow.
 */
function _drawPickup(ctx, pickup) {
  const px = _camX + pickup.x;
  const py = _camY + pickup.y;
  const S  = 8; // square size

  ctx.save();
  ctx.shadowBlur  = 6;
  ctx.shadowColor = '#f0c040';
  ctx.fillStyle   = '#f0c040';
  ctx.fillRect(px - S / 2, py - S / 2, S, S);
  ctx.restore();
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
