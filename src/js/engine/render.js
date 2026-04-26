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
 * Visual style: dark fantasy pixel art.
 * Character and effect sprites are drawn via SpriteSheet/AnimStrip from
 * assets/generated/pixel/pivot/. Programmatic fallbacks used if sprites fail.
 */

import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H, DEBUG_OVERLAY, ISO_Y } from './config.js';
import { sprites, computeAnimFrame, ANIM_TICKS } from './sprites.js';

/** Convert world/room coords to canvas draw position (pre-zoom, within scaled ctx) */
function toScreen(wx, wy) {
  return { sx: _camX + wx, sy: _camY + wy * ISO_Y };
}

/** Canvas 2D context — set by initRender(). */
let _ctx = null;

/** Camera offset in pixels (top-left corner of viewport). */
let _camX = 0;
let _camY = 0;

/**
 * Current zoom level. 1.0 = 1:1. Min = 0.5, Max = 2.5.
 * Applied via ctx.scale() each frame; camera formula compensates so the
 * player stays centred regardless of zoom value.
 */
let _zoomLevel = 1.0;

/** Min/max zoom — enforced on every wheel tick. */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
/** Multiplicative step per wheel tick (feels more natural than additive). */
export const ZOOM_STEP = 1.1;

/**
 * Returns the current zoom level. Used by input/ai to de-zoom click coords.
 */
export function getZoomLevel() {
  return _zoomLevel;
}

/**
 * Sets zoom level, clamped to [ZOOM_MIN, ZOOM_MAX].
 * Called by the wheel listener in input.js.
 * @param {number} z
 */
export function setZoomLevel(z) {
  _zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

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

  // Camera position driven by world.camera (follow-camera for large maps).
  // world._updateCamera() already bakes zoom into these offsets so the player
  // stays centred at any zoom level.
  _camX = world.camera ? world.camera.x : 0;
  _camY = world.camera ? world.camera.y : 0;

  // --- Clear (full canvas, outside zoom transform) ---
  ctx.fillStyle = '#060403'; // near-black warm void outside room
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  // --- Apply zoom transform — all world rendering happens inside this block ---
  // ctx.scale(z, z) shrinks/enlarges the world within the fixed canvas size.
  // _camX/_camY are in *pre-zoom world-space* (already compensated by _updateCamera),
  // so all toScreen() calls and fillRect positions work without further adjustment.
  ctx.save();
  ctx.scale(_zoomLevel, _zoomLevel);

  // --- Tilemap ---
  _drawTilemap(ctx, world.tilemap, world.tick);

  // --- Wall decorations (torn paintings) ---
  _drawWallDecorations(ctx, world);

  // --- Floor decorations (bones, skulls, rocks, mushrooms, cracks) ---
  if (world.decorations && world.decorations.length) {
    _drawDecorations(ctx, world);
  }

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

  // End zoom transform — restore canvas to unscaled state
  ctx.restore();
}

// ─────────────────────────────────────────────
// Tilemap rendering
// ─────────────────────────────────────────────

/**
 * Draws the room tilemap using 2.5D pseudo-isometric rendering.
 *
 * Each tile is compressed vertically by ISO_Y. Wall tiles get a front face
 * (depth slab below the top face) to simulate height — Diablo-like look.
 * Game logic (physics, pathfinding) remains flat 2D; only the visuals change.
 *
 * Tile culling: only tiles visible in the current viewport (+ 1 tile margin)
 * are drawn — critical for large cave maps (72×54 = 3888 tiles).
 */
function _drawTilemap(ctx, tilemap, tick) {
  const T = TILE_SIZE;
  const tileH = Math.round(T * ISO_Y);

  // Effective viewport in world-space shrinks when zoomed in.
  // _camX/_camY are pre-zoom world coords; the zoom is applied via ctx.scale().
  const effW = VIEWPORT_W / _zoomLevel;
  const effH = VIEWPORT_H / _zoomLevel;

  // Only draw tiles visible in the current viewport (+ 1 tile margin)
  const startC = Math.max(0,            Math.floor(-_camX / T) - 1);
  const endC   = Math.min(tilemap.cols, Math.ceil((-_camX + effW) / T) + 1);
  const startR = Math.max(0,            Math.floor(-_camY / tileH) - 1);
  const endR   = Math.min(tilemap.rows, Math.ceil((-_camY + effH) / tileH) + 2);

  for (let r = startR; r < endR; r++) {
    for (let c = startC; c < endC; c++) {
      const wx = c * T;
      const wy = r * T;
      const { sx: px, sy: py } = toScreen(wx, wy);

      if (tilemap.isWall(c, r)) {
        // ── Wall top face — dark cave stone ────────────────────────────────
        ctx.fillStyle = '#1c1c22';
        ctx.fillRect(px, py, T, tileH);
        // Stone crack lines on top
        const mMid   = (tileH / 2) | 0;
        const hBrick = (T / 2) | 0;
        ctx.fillStyle = '#0e0e12';
        ctx.fillRect(px + 1, py + mMid, T - 2, 1);
        ctx.fillRect(px + hBrick, py + 1, 1, mMid - 1);
        // Top edge highlight (subtle cave ceiling shimmer)
        ctx.fillStyle = '#2e2e38';
        ctx.fillRect(px, py, T, 1);
        ctx.fillRect(px, py, 1, tileH);

        // ── Wall front face — dark gray stone, clearly distinct from floor ─
        const faceH = 12;
        ctx.fillStyle = '#252530';
        ctx.fillRect(px, py + tileH, T, faceH);

        // Bright light-gray rim at very top — strong visual break from floor
        ctx.fillStyle = '#5a5a70';
        ctx.fillRect(px, py + tileH, T, 2);
        // Sub-rim
        ctx.fillStyle = '#323240';
        ctx.fillRect(px, py + tileH + 2, T, 1);

        // Horizontal stone seam lines
        ctx.fillStyle = '#131318';
        ctx.fillRect(px + 1, py + tileH + 5, T - 2, 1);
        ctx.fillRect(px + 1, py + tileH + 9, T - 2, 1);

        // Vertical seam joints
        ctx.fillStyle = '#111116';
        ctx.fillRect(px + hBrick,                    py + tileH + 3,  1, 2);
        ctx.fillRect(px + (hBrick >> 1),             py + tileH + 6,  1, 3);
        ctx.fillRect(px + hBrick + (hBrick >> 1),    py + tileH + 6,  1, 3);
        ctx.fillRect(px + hBrick,                    py + tileH + 10, 1, 2);

        // Bottom and right shadow
        ctx.fillStyle = '#0a0a0e';
        ctx.fillRect(px, py + tileH + faceH - 1, T, 1);
        ctx.fillStyle = '#0f0f14';
        ctx.fillRect(px + T - 1, py + tileH, 1, faceH);
      } else {
        // ── Floor — biome type determines texture ──
        const fv   = tilemap.floorVariants ? tilemap.floorVariants[r * tilemap.cols + c] : 0;
        const ft   = tilemap.floorTypes    ? tilemap.floorTypes[r * tilemap.cols + c]    : 0;
        _drawFloorTile(ctx, px, py, T, tileH, ft, fv, tick);
      }
    }
  }
}

// ─────────────────────────────────────────────
// Floor tile renderer (biome-aware)
// ─────────────────────────────────────────────

/**
 * Draws a single floor tile according to its biome type.
 * ft = floor type: 0=stone, 1=earth/moss, 2=water, 3=dark stone
 * fv = floor variant 0..3 (subtle per-tile variation within biome)
 */
function _drawFloorTile(ctx, px, py, T, tileH, ft, fv, tick) {
  if (ft === 1) {
    // ── Earth / moss ──
    const baseColors = ['#1a1509', '#1e180a', '#18130a', '#1c160b'];
    const hlColors   = ['#27200f', '#2b2210', '#24190e', '#291e0f'];
    ctx.fillStyle = baseColors[fv];
    ctx.fillRect(px, py, T, tileH);
    ctx.fillStyle = hlColors[fv];
    ctx.fillRect(px + 1, py + 1, T - 3, tileH - 2);
    // Top-left bevel
    ctx.fillStyle = '#342a14';
    ctx.fillRect(px + 1, py + 1, T - 3, 1);
    ctx.fillRect(px + 1, py + 1, 1, tileH - 2);
    // Moss/grass tufts (tiny green-brown pixels)
    const gColors = ['#1e2e0c', '#253512', '#1a280a'];
    ctx.fillStyle = gColors[fv % 3];
    if (fv === 0) {
      ctx.fillRect(px + 4,  py + 3, 2, 1);
      ctx.fillRect(px + 22, py + 5, 2, 1);
    } else if (fv === 1) {
      ctx.fillRect(px + 9,  py + 2, 1, 2);
      ctx.fillRect(px + 18, py + 6, 1, 2);
      ctx.fillRect(px + 25, py + 3, 1, 1);
    } else if (fv === 2) {
      ctx.fillRect(px + 5,  py + 5, 3, 1);
    } else {
      ctx.fillRect(px + 14, py + 3, 2, 2);
      ctx.fillRect(px + 7,  py + 6, 1, 1);
    }
    ctx.fillStyle = '#0f0c05';
    ctx.fillRect(px + T - 1, py, 1, tileH);
    ctx.fillRect(px, py + tileH - 1, T, 1);

  } else if (ft === 2) {
    // ── Water / stream ──
    const depth  = 0.5 + 0.5 * Math.sin((tick * 0.04) + px * 0.1 + py * 0.07);
    const bBase  = ['#091520', '#0b1822', '#0a1620', '#0c1921'][fv];
    const bShine = ['#0f2535', '#122938', '#102333', '#132a39'][fv];
    ctx.fillStyle = bBase;
    ctx.fillRect(px, py, T, tileH);
    // Animated ripple highlight
    ctx.fillStyle = bShine;
    ctx.fillRect(px + 1, py + 1, T - 3, tileH - 2);
    // Water shimmer lines (2-3 animated pixels)
    const shimmerY = ((tick * 0.07 + px * 0.03) % (tileH - 3) | 0) + py + 1;
    ctx.fillStyle = `rgba(100,200,220,${0.12 + depth * 0.12})`;
    ctx.fillRect(px + 3,  shimmerY, 8, 1);
    ctx.fillRect(px + 16, shimmerY + 2, 6, 1);
    ctx.fillRect(px + 24, shimmerY - 1, 5, 1);
    // Reflection dot
    ctx.fillStyle = `rgba(150,220,240,${0.25 + depth * 0.15})`;
    ctx.fillRect(px + 12, py + 4, 2, 1);
    // Dark edge (water depth)
    ctx.fillStyle = '#040d14';
    ctx.fillRect(px + T - 1, py, 1, tileH);
    ctx.fillRect(px, py + tileH - 1, T, 1);

  } else if (ft === 3) {
    // ── Dark stone (shadowed areas) ──
    const baseColors = ['#08070a', '#0a080c', '#07060a', '#09080b'];
    const hlColors   = ['#121018', '#141319', '#100f16', '#131118'];
    ctx.fillStyle = baseColors[fv];
    ctx.fillRect(px, py, T, tileH);
    ctx.fillStyle = hlColors[fv];
    ctx.fillRect(px + 1, py + 1, T - 3, tileH - 2);
    ctx.fillStyle = '#1c1a20';
    ctx.fillRect(px + 1, py + 1, T - 3, 1);
    ctx.fillRect(px + 1, py + 1, 1, tileH - 2);
    ctx.fillStyle = '#040306';
    ctx.fillRect(px + 1, py + tileH - 1, T - 2, 1);
    ctx.fillRect(px + T - 2, py + 1, 1, tileH - 2);
    // Faint purple rune glint on variant 0 and 2
    if (fv === 0 || fv === 2) {
      ctx.fillStyle = '#1a1230';
      ctx.fillRect(px + 13, py + 4, 3, 2);
      ctx.fillRect(px + 14, py + 3, 1, 4);
    }
    ctx.fillStyle = '#030204';
    ctx.fillRect(px + T - 1, py, 1, tileH);
    ctx.fillRect(px, py + tileH - 1, T, 1);

  } else {
    // ── Stone (default, type 0) ──
    const baseColors = ['#0e0c09', '#110f0b', '#0c0a07', '#100d0a'];
    const hlColors   = ['#1a1712', '#1d1a14', '#181510', '#1c1813'];
    ctx.fillStyle = baseColors[fv];
    ctx.fillRect(px, py, T, tileH);
    ctx.fillStyle = hlColors[fv];
    ctx.fillRect(px + 1, py + 1, T - 3, tileH - 2);
    ctx.fillStyle = '#252018';
    ctx.fillRect(px + 1, py + 1, T - 3, 1);
    ctx.fillRect(px + 1, py + 1, 1, tileH - 2);
    ctx.fillStyle = '#080604';
    ctx.fillRect(px + 1, py + tileH - 1, T - 2, 1);
    ctx.fillRect(px + T - 2, py + 1, 1, tileH - 2);
    if (fv === 1) {
      ctx.fillStyle = '#090704';
      ctx.fillRect(px + 10, py + 4, 1, 1);
      ctx.fillRect(px + 11, py + 5, 1, 1);
      ctx.fillRect(px + 12, py + 6, 1, 1);
    } else if (fv === 2) {
      ctx.fillStyle = '#1a2510';
      ctx.fillRect(px + 6,  py + 3, 1, 1);
      ctx.fillRect(px + 20, py + 7, 1, 1);
    }
    ctx.fillStyle = '#060504';
    ctx.fillRect(px + T - 1, py, 1, tileH);
    ctx.fillRect(px, py + tileH - 1, T, 1);
  }
}

// ─────────────────────────────────────────────
// Wall decorations — torn paintings/tapestries
// ─────────────────────────────────────────────

/**
 * Draws wall paintings/tapestries on the front face of wall tiles.
 * Called after tilemap, so it draws on top of wall fronts.
 */
function _drawWallDecorations(ctx, world) {
  if (!world.wallDecorations || !world.wallDecorations.length) return;
  const T     = TILE_SIZE;
  const tileH = Math.round(T * ISO_Y);
  const faceH = 12;

  for (const wd of world.wallDecorations) {
    const wx = wd.c * T;
    const wy = wd.r * T;
    const { sx: px, sy: py } = toScreen(wx, wy);
    // The painting is drawn on the wall front face (below the top face)
    const facePy = py + tileH;

    // Quick viewport cull
    if (px + T < -_camX || px > VIEWPORT_W - _camX ||
        facePy > VIEWPORT_H - _camY || facePy + faceH < -_camY) continue;

    _drawPainting(ctx, px, facePy, wd.variant);
  }
}

/**
 * Draws a single torn painting on the wall face.
 * paintX, paintY = top-left of the wall front face (32×20 area)
 */
function _drawPainting(ctx, paintX, paintY, variant) {
  // Frame dimensions (centered on the wall face)
  const fw = 18, fh = 12;
  const fx = paintX + 7, fy = paintY + 3;

  // Painting subjects by variant
  const subjects = [
    // 0: Dark landscape — silhouetted mountains + dim sky
    () => {
      ctx.fillStyle = '#1a0f06'; // dark amber sky
      ctx.fillRect(fx + 1, fy + 1, fw - 2, fh - 2);
      ctx.fillStyle = '#0d080350'; // darker mountains (programmatic)
      ctx.fillStyle = '#2a1a08';
      ctx.fillRect(fx + 1, fy + 4, fw - 2, fh - 5);
      ctx.fillStyle = '#1a0d04';
      ctx.fillRect(fx + 3, fy + 2, 5, 5);  // mountain left
      ctx.fillRect(fx + 9, fy + 3, 6, 4);  // mountain right
      ctx.fillStyle = '#c89040'; // tiny moon
      ctx.fillRect(fx + 13, fy + 1, 2, 2);
    },
    // 1: Rune inscription — arcane text
    () => {
      ctx.fillStyle = '#0d0a12';
      ctx.fillRect(fx + 1, fy + 1, fw - 2, fh - 2);
      ctx.fillStyle = '#4020a0';
      // Rune strokes
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(fx + 2 + i * 5, fy + 2, 1, 6);
        ctx.fillRect(fx + 1 + i * 5, fy + 4, 3, 1);
      }
      ctx.fillStyle = '#6030c0';
      ctx.fillRect(fx + 1, fy + 7, fw - 2, 1);
    },
    // 2: Portrait silhouette — shadowy figure with hood
    () => {
      ctx.fillStyle = '#150e08';
      ctx.fillRect(fx + 1, fy + 1, fw - 2, fh - 2);
      ctx.fillStyle = '#2e1a0a'; // robed figure
      ctx.fillRect(fx + 5, fy + 2, 8, 7); // body
      ctx.fillRect(fx + 6, fy + 1, 6, 4); // head+hood
      ctx.fillStyle = '#e8a030'; // glowing eyes
      ctx.fillRect(fx + 7, fy + 2, 1, 1);
      ctx.fillRect(fx + 10, fy + 2, 1, 1);
    },
    // 3: Battle scene — crossed weapons + shield
    () => {
      ctx.fillStyle = '#100a08';
      ctx.fillRect(fx + 1, fy + 1, fw - 2, fh - 2);
      ctx.fillStyle = '#604020'; // shield
      ctx.fillRect(fx + 7, fy + 2, 5, 6);
      ctx.fillStyle = '#a08050'; // crossed swords
      ctx.fillRect(fx + 2, fy + 2, 1, 7); // sword 1 vertical
      ctx.fillRect(fx + 1, fy + 5, 7, 1); // sword 1 crossguard
      ctx.fillRect(fx + 12, fy + 2, 1, 7); // sword 2
      ctx.fillRect(fx + 10, fy + 5, 4, 1);
      ctx.fillStyle = '#c0a060'; // blood dot
      ctx.fillRect(fx + 8, fy + 8, 1, 1);
    },
  ];

  ctx.save();

  // Torn/aged canvas background (parchment)
  ctx.fillStyle = '#2a1e0e';
  ctx.fillRect(fx, fy, fw, fh);

  // Draw painting subject
  (subjects[variant % 4])();

  // Frame — aged wood with worn edges
  ctx.strokeStyle = '#6e4a20';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);

  // Corner brackets
  ctx.fillStyle = '#8a5c28';
  ctx.fillRect(fx,          fy,          2, 1); // TL
  ctx.fillRect(fx,          fy,          1, 2);
  ctx.fillRect(fx + fw - 2, fy,          2, 1); // TR
  ctx.fillRect(fx + fw - 1, fy,          1, 2);
  ctx.fillRect(fx,          fy + fh - 1, 2, 1); // BL
  ctx.fillRect(fx,          fy + fh - 2, 1, 2);
  ctx.fillRect(fx + fw - 2, fy + fh - 1, 2, 1); // BR
  ctx.fillRect(fx + fw - 1, fy + fh - 2, 1, 2);

  // Torn tear effect — 2-3 irregular dark marks at edges
  ctx.fillStyle = '#0a0704';
  ctx.fillRect(fx + 4,      fy,          3, 1); // top tear
  ctx.fillRect(fx + fw - 5, fy + fh - 1, 4, 1); // bottom tear
  ctx.fillRect(fx + fw - 1, fy + 3,      1, 3); // right tear

  ctx.restore();
}

// ─────────────────────────────────────────────
// Floor decorations (bones, rocks, skulls, mushrooms, cracks)
//
// Drawn programmatically — small props that fill the dungeon floor so it
// doesn't feel like empty boxes. Each decoration is placed once at level
// generation and is purely cosmetic (no physics, no interaction).
// ─────────────────────────────────────────────

function _drawDecorations(ctx, world) {
  // Viewport cull in world-space. Convert effective (pre-zoom) viewport to world coords.
  const marginPx = 40; // allow props to extend across tile boundaries
  const effW = VIEWPORT_W / _zoomLevel;
  const effH = VIEWPORT_H / _zoomLevel;
  const minX = -_camX - marginPx;
  const maxX = -_camX + effW + marginPx;
  const minY = (-_camY - marginPx) / ISO_Y;
  const maxY = (-_camY + effH + marginPx) / ISO_Y;

  for (const d of world.decorations) {
    if (d.x < minX || d.x > maxX || d.y < minY || d.y > maxY) continue;
    const { sx: px, sy: py } = toScreen(d.x, d.y);
    switch (d.type) {
      case 'skull':    _drawSkull(ctx, px, py, d.rot);            break;
      case 'bones':    _drawBones(ctx, px, py, d.rot, d.variant); break;
      case 'rock':     _drawRock(ctx, px, py, d.variant);          break;
      case 'mushroom': _drawMushroom(ctx, px, py, d.variant);      break;
      case 'crack':    _drawCrack(ctx, px, py, d.rot, d.variant);  break;
    }
  }
}

function _drawSkull(ctx, px, py, rot) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot * 0.3); // subtle tilt
  // Cranium
  ctx.fillStyle = '#d8cdb0';
  ctx.beginPath();
  ctx.ellipse(0, -1, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Jaw
  ctx.fillStyle = '#c2b698';
  ctx.fillRect(-3, 2.5, 6, 2);
  // Eyes
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(-3, -2, 2, 2);
  ctx.fillRect( 1, -2, 2, 2);
  // Nose
  ctx.fillRect(-0.5, 0.5, 1, 1.5);
  ctx.restore();
}

function _drawBones(ctx, px, py, rot, variant) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);
  ctx.strokeStyle = '#cec2a6';
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = 'round';
  if (variant === 0) {
    // Single long bone with knobs
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#cec2a6';
    ctx.beginPath(); ctx.arc(-6, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 6, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  } else if (variant === 1) {
    // Crossed bones
    ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(5,  4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5,  4); ctx.lineTo(5, -4); ctx.stroke();
    ctx.fillStyle = '#cec2a6';
    for (const [x,y] of [[-5,-4],[5,4],[-5,4],[5,-4]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Rib fragment — three short parallel bones
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-4, i * 2); ctx.lineTo(4, i * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function _drawRock(ctx, px, py, variant) {
  const sizes = [[7, 4], [5, 3], [9, 5]];
  const [rx, ry] = sizes[variant % 3];
  // Base
  ctx.fillStyle = '#3a352e';
  ctx.beginPath();
  ctx.ellipse(px, py + 1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = '#5a5247';
  ctx.beginPath();
  ctx.ellipse(px - rx * 0.25, py - ry * 0.35, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function _drawMushroom(ctx, px, py, variant) {
  // Stem
  ctx.fillStyle = '#e8ddc0';
  ctx.fillRect(px - 1, py - 1, 2, 4);
  // Cap — dark purple for cute-dark palette
  const capColors = ['#5a2240', '#4a1a35', '#6e2a4c'];
  ctx.fillStyle = capColors[variant % 3];
  ctx.beginPath();
  ctx.ellipse(px, py - 2, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spore dots
  ctx.fillStyle = '#ffd6a0';
  ctx.fillRect(px - 2, py - 3, 1, 1);
  ctx.fillRect(px + 1, py - 2, 1, 1);
}

function _drawCrack(ctx, px, py, rot, variant) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);
  ctx.strokeStyle = '#050302';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  if (variant === 0) {
    // Y-shaped crack
    ctx.moveTo(-6, 0); ctx.lineTo(0, 0);
    ctx.moveTo( 0, 0); ctx.lineTo(4, -3);
    ctx.moveTo( 0, 0); ctx.lineTo(4,  3);
  } else if (variant === 1) {
    // Zig-zag
    ctx.moveTo(-5, -1); ctx.lineTo(-1, 1); ctx.lineTo(2, -1); ctx.lineTo(5, 1);
  } else {
    // Short jagged line
    ctx.moveTo(-4, 0); ctx.lineTo(-1, -1); ctx.lineTo(1, 1); ctx.lineTo(4, 0);
  }
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────
// Entity rendering
// ─────────────────────────────────────────────

/**
 * Draws an entity using programmatic 2.5D art.
 * Entity (x, y) is the physics/feet centre, room-relative.
 * toScreen() applies the ISO_Y compression to translate to canvas-space.
 */
function _drawEntity(ctx, entity, tick) {
  const { sx: px, sy: py } = toScreen(entity.x, entity.y);
  if (entity.team === 'player') {
    _drawPlayer(ctx, entity, px, py, tick);
  } else if (entity.team === 'enemy') {
    _drawEnemy(ctx, entity, px, py, tick);
  }
}

/**
 * Pyromancer — drawn from the cute-dark sprite sheet.
 * (px, py) is the physics/feet centre in screen space.
 *
 * Visual stack (back → front):
 *   floor glow · shadow · sprite body · cast-glow burst (≤10 ticks post-fire)
 */
function _drawPlayer(ctx, player, px, py, tick) {
  // Floor glow — large, very faint ambient light pool
  ctx.save();
  ctx.globalAlpha = 0.12;
  const grd = ctx.createRadialGradient(px, py, 0, px, py, 28);
  grd.addColorStop(0, '#ff8822');
  grd.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(px, py, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Shadow ellipse at feet
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(px, py, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sprite body
  const animKey = player.animState || 'idle';
  const pSheet  = sprites.pyromancer[animKey] || sprites.pyromancer.idle;
  const drawH   = pSheet.drawH;
  if (pSheet.loaded && !pSheet.failed) {
    const frameIdx = computeAnimFrame(tick, player.animEnterTick, pSheet.framesPerDir, animKey);
    pSheet.drawFrame(ctx, (px - pSheet.drawW / 2) | 0, (py - drawH) | 0, player.dirIndex, frameIdx);
  } else {
    // Sprite failed to load — magenta circle so the problem is obvious
    ctx.fillStyle = '#f0f';
    ctx.beginPath();
    ctx.arc(px, py - drawH / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cast-glow burst — expanding ring at chest height for 10 ticks after fire
  if (player._castStartTick && tick - player._castStartTick < 10) {
    const t = (tick - player._castStartTick) / 10;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.shadowBlur  = 25;
    ctx.shadowColor = '#ff5500';
    ctx.beginPath();
    ctx.arc(px, py - drawH * 0.55, 18 * (1 + t * 0.8), 0, Math.PI * 2);
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Zombie enemy — drawn from the cute-dark sprite sheet.
 * Stack: floor glow · shadow · sprite body · HP bar above head.
 */
function _drawEnemy(ctx, enemy, px, py, tick) {
  // Floor glow — amber heat aura
  ctx.save();
  ctx.globalAlpha = 0.07;
  const grd = ctx.createRadialGradient(px, py, 0, px, py, 22);
  grd.addColorStop(0, '#ff8833');
  grd.addColorStop(1, 'rgba(200,80,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(px, py, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Shadow ellipse at feet
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(px, py, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sprite body
  const eAnimKey = enemy.animState || 'idle';
  const zSheet   = sprites.zombie[eAnimKey] || sprites.zombie.idle;
  const drawH    = zSheet.drawH;
  if (zSheet.loaded && !zSheet.failed) {
    const frameIdx = computeAnimFrame(tick, enemy.animEnterTick, zSheet.framesPerDir, eAnimKey);
    zSheet.drawFrame(ctx, (px - zSheet.drawW / 2) | 0, (py - drawH) | 0, enemy.dirIndex, frameIdx);
  } else {
    ctx.fillStyle = '#f0f';
    ctx.beginPath();
    ctx.arc(px, py - drawH / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // HP bar above head
  const barW = 28;
  const barH = 4;
  const barX = px - barW / 2;
  const barY = py - drawH - 4;
  const pct  = enemy.hp / enemy.hpMax;
  ctx.fillStyle = '#1a0000';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = pct > 0.5 ? '#e87020' : pct > 0.25 ? '#cc8800' : '#cc2222';
  ctx.fillRect(barX, barY, barW * pct, barH);
}

function _drawDeathFlash(ctx, entity) {
  const { sx: px, sy: py } = toScreen(entity.x, entity.y);
  ctx.beginPath();
  ctx.ellipse(px, py, entity.radius * 1.5, entity.radius, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
  ctx.fill();
}

// ─────────────────────────────────────────────
// Projectile rendering
// ─────────────────────────────────────────────

/**
 * Draws a fireball projectile — Diablo 3-style.
 *
 * Visual spec:
 *   - 6-ghost trail fading behind the ball along velocity axis
 *   - Core: radial gradient from bright yellow centre to deep red edge
 *   - Strong orange glow via shadowBlur
 */
function _drawProjectile(ctx, proj, tick) {
  const { sx: px, sy: py } = toScreen(proj.x, proj.y);
  const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
  const R = 9;

  // Trail — 6 ghost circles, longer and more visible than before
  if (speed > 0) {
    const nx = proj.vx / speed;
    const ny = proj.vy / speed;
    for (let i = 1; i <= 6; i++) {
      const tx = px - nx * i * 6;
      const ty = py - ny * i * 6;
      const trailAlpha = 0.25 - i * 0.035;
      const trailR = Math.max(2, R - i * 1.2);
      ctx.beginPath();
      ctx.arc(tx, ty, trailR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 100, 30, ${trailAlpha})`;
      ctx.fill();
    }
  }

  // Fireball sprite or programmatic core fallback
  if (sprites.fireball.loaded && !sprites.fireball.failed) {
    const frameIdx = Math.floor(tick / 3) % sprites.fireball.totalFrames;
    const fbAngle  = speed > 0 ? Math.atan2(proj.vy * ISO_Y, proj.vx) : 0;
    sprites.fireball.drawCentered(ctx, px, py, frameIdx, fbAngle);
  } else {
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#ff8800';
    ctx.beginPath();
    ctx.arc(px, py, R, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, R);
    coreGrad.addColorStop(0, '#ffee80');
    coreGrad.addColorStop(0.4, '#ff6b2b');
    coreGrad.addColorStop(1, '#cc2200');
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.restore();
  }
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
  const elapsed = tick - imp.spawnTick;
  if (elapsed >= imp.totalTicks) return;
  const { sx: px, sy: py } = toScreen(imp.x, imp.y);

  if (sprites.impact.loaded && !sprites.impact.failed) {
    const frameIdx = Math.floor(elapsed / 5); // 5 ticks per frame, 6 frames = 30 ticks
    sprites.impact.drawCentered(ctx, px, py, frameIdx);
  } else {
    const progress = elapsed / 18;
    if (progress >= 1) return;
    ctx.globalAlpha = 1 - progress;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const d = progress * 18;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, Math.max(1, 3 * (1 - progress)), 0, Math.PI * 2);
      ctx.fillStyle = '#ff8c40';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────
// Portal, pickup, particle, damage number
// ─────────────────────────────────────────────

/**
 * Exit portal — Diablo 3-style dramatic gold portal.
 *
 * Visual spec:
 *   - Outer ambient bloom (large, very faint)
 *   - Inner translucent fill (warm gold core)
 *   - Two counter-rotating dashed rings at R and R*0.7
 *   - Glow ring via shadowBlur
 *   - Pulsing ✦ centre symbol
 */
function _drawPortal(ctx, portal, tick) {
  const { sx: px, sy: py } = toScreen(portal.x, portal.y);
  const R  = portal.radius || 22;

  // Outer ambient bloom
  ctx.save();
  const bloom = ctx.createRadialGradient(px, py, R * 0.5, px, py, R * 2.5);
  bloom.addColorStop(0, 'rgba(180, 140, 50, 0.15)');
  bloom.addColorStop(1, 'rgba(180, 140, 50, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(px, py, R * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner fill — warm gold gradient
  ctx.save();
  const inner = ctx.createRadialGradient(px, py, 0, px, py, R);
  inner.addColorStop(0, 'rgba(255, 220, 80, 0.3)');
  inner.addColorStop(0.6, 'rgba(201, 168, 76, 0.15)');
  inner.addColorStop(1, 'rgba(100, 80, 20, 0.05)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer rotating dashed ring (clockwise)
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((tick * 0.02) % (Math.PI * 2));
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Inner rotating dashed ring (counter-clockwise)
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-(tick * 0.012) % (Math.PI * 2));
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 220, 80, 0.6)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Glow ring
  ctx.save();
  ctx.shadowBlur  = 22;
  ctx.shadowColor = '#c9a84c';
  ctx.beginPath();
  ctx.arc(px, py, R - 1, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  // Centre symbol — pulsing ✦
  const pulse = 1 + 0.1 * Math.sin(tick * 0.08);
  ctx.save();
  ctx.shadowBlur   = 12;
  ctx.shadowColor  = '#ffd700';
  ctx.fillStyle    = '#ffd700';
  ctx.font         = `${Math.round(18 * pulse)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', px, py);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/**
 * Gold pickup — small 8×8 square with thin glow.
 */
function _drawPickup(ctx, pickup) {
  const { sx: px, sy: py } = toScreen(pickup.x, pickup.y);
  const S  = 8; // square size

  ctx.save();
  ctx.shadowBlur  = 6;
  ctx.shadowColor = '#f0c040';
  ctx.fillStyle   = '#f0c040';
  ctx.fillRect(px - S / 2, py - S / 2, S, S);
  ctx.restore();
}

function _drawParticle(ctx, p) {
  const { sx: px, sy: py } = toScreen(p.x, p.y);
  const alpha = p.life / p.lifeMax;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(1, p.size * alpha), 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function _drawDamageNumber(ctx, dn) {
  const { sx: px, sy: py } = toScreen(dn.x, dn.y);
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
