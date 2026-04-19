/**
 * engine/sprites.js — Sprite sheet loader and frame renderer
 *
 * Layout convention used by ALL pivot assets:
 *   - Columns = direction index (0=S, 1=E, 2=N, 3=W)
 *   - Rows    = frame index    (0-based, top to bottom)
 *
 * Actual generated frame sizes differ from the 48×48 spec because
 * SpriteCook generates at higher resolution. Sizes are declared per-sheet
 * in SPRITE_DEFS below, measured from the real PNG dimensions.
 *
 * Direction mapping (4-dir sprites):
 *   0 = S (South, facing viewer / down)
 *   1 = E (East, facing right)
 *   2 = N (North, facing away / up)
 *   3 = W (West, facing left) — rendered as mirror of E
 *
 * Usage:
 *   await loadAllSprites();            // call once before game loop
 *   sprites.pyromancer.idle.drawFrame(ctx, dx, dy, dirIdx, frameIdx);
 */

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Maps direction string to column index. */
export const DIR_INDEX = Object.freeze({ S: 0, E: 1, N: 2, W: 3 });

// ─────────────────────────────────────────────
// SpriteSheet class
// ─────────────────────────────────────────────

/**
 * Wraps a single sprite sheet image and knows how to slice frames from it.
 */
export class SpriteSheet {
  /**
   * @param {string}  imgPath      — URL path to PNG (relative to document root)
   * @param {number}  frameW       — width  of one frame in the sheet (px)
   * @param {number}  frameH       — height of one frame in the sheet (px)
   * @param {number}  dirsCount    — number of direction columns (1 for non-directional)
   * @param {number}  framesPerDir — number of frame rows per direction
   * @param {Object}  [opts]
   * @param {boolean} [opts.rowIsDir=false] — if true: row=dir, col=frame (vs default col=dir, row=frame)
   * @param {number}  [opts.drawW]  — override render width  (scale to this; default = frameW)
   * @param {number}  [opts.drawH]  — override render height (scale to this; default = frameH)
   */
  constructor(imgPath, frameW, frameH, dirsCount, framesPerDir, opts = {}) {
    this.imgPath     = imgPath;
    this.frameW      = frameW;
    this.frameH      = frameH;
    this.dirsCount   = dirsCount;
    this.framesPerDir = framesPerDir;
    this.rowIsDir    = opts.rowIsDir || false;
    // Render size — can differ from frame size to scale output
    this.drawW       = opts.drawW !== undefined ? opts.drawW : frameW;
    this.drawH       = opts.drawH !== undefined ? opts.drawH : frameH;

    /** @type {HTMLImageElement|null} */
    this.img    = null;
    this.loaded = false;
    this.failed = false;
  }

  /**
   * Begins loading the image.
   * @returns {Promise<void>} — resolves on load, resolves (not rejects) on error
   */
  load() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.img    = img;
        this.loaded = true;
        resolve();
      };
      img.onerror = () => {
        console.warn(`[sprites] Failed to load: ${this.imgPath} — falling back to placeholder geometry`);
        this.failed = true;
        resolve(); // resolve, not reject — engine continues with placeholder
      };
      img.src = this.imgPath;
    });
  }

  /**
   * Draws one frame onto the canvas context.
   *
   * If the sheet failed to load this is a no-op (caller draws placeholder instead).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} dx         — destination top-left X on canvas
   * @param {number} dy         — destination top-left Y on canvas
   * @param {number} dirIndex   — 0..3 (S/E/N/W). For W, mirrors the E column.
   * @param {number} frameIndex — 0-based frame within direction
   */
  drawFrame(ctx, dx, dy, dirIndex, frameIndex) {
    if (!this.loaded || this.failed) return;

    // Clamp frame index to valid range
    const frame = frameIndex % this.framesPerDir;

    // West = mirror of East
    const mirror  = dirIndex === DIR_INDEX.W;
    const colIdx  = mirror ? DIR_INDEX.E : dirIndex;

    let sx, sy;
    if (this.rowIsDir) {
      // row = direction, col = frame
      sx = frame  * this.frameW;
      sy = colIdx * this.frameH;
    } else {
      // col = direction, row = frame (default)
      sx = colIdx * this.frameW;
      sy = frame  * this.frameH;
    }

    // Ensure pixel art stays crispy
    ctx.imageSmoothingEnabled = false;

    if (mirror) {
      // Flip horizontally around the draw center
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.img,
        sx, sy, this.frameW, this.frameH,
        -(dx + this.drawW), dy, this.drawW, this.drawH
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        this.img,
        sx, sy, this.frameW, this.frameH,
        dx, dy, this.drawW, this.drawH
      );
    }
  }
}

// ─────────────────────────────────────────────
// SimpleAnimStrip — for non-directional strips
// (fireball loop, fire_impact one-shot)
// ─────────────────────────────────────────────

/**
 * A horizontal or 2-column strip of frames, no direction axis.
 * Frames are read left-to-right, top-to-bottom (row-major).
 */
export class AnimStrip {
  /**
   * @param {string}  imgPath     — URL path to PNG
   * @param {number}  frameW      — source frame width
   * @param {number}  frameH      — source frame height
   * @param {number}  totalFrames — how many frames in the strip
   * @param {number}  cols        — number of columns in the grid
   * @param {Object}  [opts]
   * @param {number}  [opts.drawW] — render width
   * @param {number}  [opts.drawH] — render height
   */
  constructor(imgPath, frameW, frameH, totalFrames, cols, opts = {}) {
    this.imgPath     = imgPath;
    this.frameW      = frameW;
    this.frameH      = frameH;
    this.totalFrames = totalFrames;
    this.cols        = cols;
    this.drawW       = opts.drawW !== undefined ? opts.drawW : frameW;
    this.drawH       = opts.drawH !== undefined ? opts.drawH : frameH;

    this.img    = null;
    this.loaded = false;
    this.failed = false;
  }

  load() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { this.img = img; this.loaded = true; resolve(); };
      img.onerror = () => {
        console.warn(`[sprites] Failed to load: ${this.imgPath}`);
        this.failed = true;
        resolve();
      };
      img.src = this.imgPath;
    });
  }

  /**
   * Draws frame at index, centered on (cx, cy).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx   — center X
   * @param {number} cy   — center Y
   * @param {number} frameIndex
   * @param {number} [angle=0] — rotation in radians (for directional projectiles)
   */
  drawCentered(ctx, cx, cy, frameIndex, angle = 0) {
    if (!this.loaded || this.failed) return;

    const f  = frameIndex % this.totalFrames;
    const col = f % this.cols;
    const row = Math.floor(f / this.cols);
    const sx  = col * this.frameW;
    const sy  = row * this.frameH;

    ctx.imageSmoothingEnabled = false;

    if (angle !== 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(
        this.img,
        sx, sy, this.frameW, this.frameH,
        -this.drawW / 2, -this.drawH / 2, this.drawW, this.drawH
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        this.img,
        sx, sy, this.frameW, this.frameH,
        cx - this.drawW / 2, cy - this.drawH / 2, this.drawW, this.drawH
      );
    }
  }
}

// ─────────────────────────────────────────────
// TileSheet — for static tile palettes
// ─────────────────────────────────────────────

/**
 * A grid of static tiles in a single image.
 * drawTile() blits one tile by its grid index.
 */
export class TileSheet {
  /**
   * @param {string} imgPath
   * @param {number} tileW   — source tile width
   * @param {number} tileH   — source tile height
   * @param {number} cols    — columns in the grid
   * @param {Object} [opts]
   * @param {number} [opts.drawW] — render size
   * @param {number} [opts.drawH]
   */
  constructor(imgPath, tileW, tileH, cols, opts = {}) {
    this.imgPath = imgPath;
    this.tileW   = tileW;
    this.tileH   = tileH;
    this.cols    = cols;
    this.drawW   = opts.drawW !== undefined ? opts.drawW : tileW;
    this.drawH   = opts.drawH !== undefined ? opts.drawH : tileH;

    this.img    = null;
    this.loaded = false;
    this.failed = false;
  }

  load() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { this.img = img; this.loaded = true; resolve(); };
      img.onerror = () => {
        console.warn(`[sprites] Failed to load: ${this.imgPath}`);
        this.failed = true;
        resolve();
      };
      img.src = this.imgPath;
    });
  }

  /**
   * Draws a tile at destination pixel position.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} tileIndex — flat grid index (0-based, row-major)
   * @param {number} dx        — destination left
   * @param {number} dy        — destination top
   */
  drawTile(ctx, tileIndex, dx, dy) {
    if (!this.loaded || this.failed) return false;

    const col = tileIndex % this.cols;
    const row = Math.floor(tileIndex / this.cols);
    const sx  = col * this.tileW;
    const sy  = row * this.tileH;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.img,
      sx, sy, this.tileW, this.tileH,
      dx, dy, this.drawW, this.drawH
    );
    return true;
  }
}

// ─────────────────────────────────────────────
// Sprite definitions
//
// Actual frame sizes measured from real PNG dimensions:
//
//   pyromancer_idle  200×200 : 4 dirs × 2 frames → col=dir, row=frame → frame 50×100
//   pyromancer_walk  512×192 : 4 dirs × 4 frames → col=dir, row=frame → frame 128×48
//   pyromancer_cast  512×192 : 4 dirs × 4 frames → col=dir, row=frame → frame 128×48
//   zombie_idle      256×256 : 4 dirs × 4 frames → col=dir, row=frame → frame 64×64
//   zombie_walk      512×192 : 4 dirs × 4 frames → col=dir, row=frame → frame 128×48
//   zombie_attack    512×192 : 4 dirs × 4 frames → col=dir, row=frame → frame 128×48
//   fireball         200×200 : 6 frames, 2 cols × 4 rows (rows 0-2 fully used, row3 col0 only)
//                              frame 100×50, strip with 2 cols
//   fire_impact      384×64  : 6 frames in a single row → frame 64×64
//   tileset_floor    256×256 : 4 tiles in 2×2 grid → tile 128×128
//   tileset_wall     240×240 : 7 tiles, 4 cols × 2 rows (last slot empty) → tile 60×120
//
// Render sizes: all character sprites drawn at 48×96 on-screen (full height ≥ 1.5× tile)
// Tiles rendered at TILE_SIZE×TILE_SIZE (32×32).
// ─────────────────────────────────────────────

const BASE = 'assets/generated/pixel/pivot/';

// Render dimensions for character sprites on-screen
const CHAR_DRAW_W = 48;
const CHAR_DRAW_H = 96;

// Render size for fireball projectile on-screen
const FB_DRAW_W = 32;
const FB_DRAW_H = 32;

// Render size for fire impact on-screen
const IMPACT_DRAW_W = 64;
const IMPACT_DRAW_H = 64;

// Render size for tiles (must match TILE_SIZE from config.js — 32)
const TILE_DRAW = 32;

/**
 * All sprite sheets used in the dungeon scene.
 * Populated by loadAllSprites().
 */
export const sprites = {
  pyromancer: {
    idle:   new SpriteSheet(BASE + 'pyromancer_idle.png',  50, 100, 4, 2, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
    walk:   new SpriteSheet(BASE + 'pyromancer_walk.png', 128,  48, 4, 4, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
    cast:   new SpriteSheet(BASE + 'pyromancer_cast.png', 128,  48, 4, 4, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
  },
  zombie: {
    idle:   new SpriteSheet(BASE + 'zombie_idle.png',   64,  64, 4, 4, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
    walk:   new SpriteSheet(BASE + 'zombie_walk.png',  128,  48, 4, 4, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
    attack: new SpriteSheet(BASE + 'zombie_attack.png', 128, 48, 4, 4, { drawW: CHAR_DRAW_W, drawH: CHAR_DRAW_H }),
  },
  fireball: new AnimStrip(BASE + 'fireball.png',    100, 50, 6, 2, { drawW: FB_DRAW_W, drawH: FB_DRAW_H }),
  impact:   new AnimStrip(BASE + 'fire_impact.png',  64, 64, 6, 6, { drawW: IMPACT_DRAW_W, drawH: IMPACT_DRAW_H }),
  floor:    new TileSheet(BASE + 'tileset_floor.png', 128, 128, 2, { drawW: TILE_DRAW, drawH: TILE_DRAW }),
  wall:     new TileSheet(BASE + 'tileset_wall.png',   60, 120, 4, { drawW: TILE_DRAW, drawH: TILE_DRAW }),
};

// ─────────────────────────────────────────────
// Loading
// ─────────────────────────────────────────────

let _loaded = false;

/**
 * Preloads all sprite sheets in parallel.
 * Shows a loading overlay on the canvas during load, removes it when done.
 *
 * @param {HTMLCanvasElement} [canvas] — optional; if provided, shows loading text
 * @returns {Promise<void>}
 */
export async function loadAllSprites(canvas) {
  if (_loaded) return;

  // Show loading overlay if canvas is provided
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#c9a76f';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading assets...', canvas.width / 2, canvas.height / 2);
  }

  // Collect all loadable objects
  const allSheets = [
    sprites.pyromancer.idle,
    sprites.pyromancer.walk,
    sprites.pyromancer.cast,
    sprites.zombie.idle,
    sprites.zombie.walk,
    sprites.zombie.attack,
    sprites.fireball,
    sprites.impact,
    sprites.floor,
    sprites.wall,
  ];

  await Promise.all(allSheets.map(s => s.load()));

  _loaded = true;
  console.log('[sprites] All sprite sheets loaded.');
}

/**
 * Returns true if sprites have been loaded (or load was attempted).
 */
export function spritesReady() {
  return _loaded;
}

// ─────────────────────────────────────────────
// Animation helpers
// ─────────────────────────────────────────────

/**
 * Frame timing constants (in ticks at 60 Hz).
 * 120ms = ~7.2 ticks → round to 7
 * 100ms = 6 ticks
 *  80ms = ~4.8 → round to 5
 */
export const ANIM_TICKS = Object.freeze({
  idle:   7,  // ~120ms/frame
  walk:   6,  // ~100ms/frame
  cast:   5,  // ~80ms/frame
  attack: 5,
  death:  8,
});

/**
 * Computes the current animation frame from world tick and the entity's
 * stateEnterTick. Uses world.tick so anim is deterministic.
 *
 * @param {number} tick          — world.tick
 * @param {number} stateEnterTick — tick when current state began
 * @param {number} framesPerDir  — number of frames in the animation
 * @param {string} animKey       — key into ANIM_TICKS
 * @param {boolean} [loop=true]  — if false, clamps to last frame
 * @returns {number} frame index 0..framesPerDir-1
 */
export function computeAnimFrame(tick, stateEnterTick, framesPerDir, animKey, loop = true) {
  const ticksPerFrame = ANIM_TICKS[animKey] || 6;
  const elapsed       = tick - stateEnterTick;
  const frameIdx      = Math.floor(elapsed / ticksPerFrame);
  if (loop) {
    return frameIdx % framesPerDir;
  }
  return Math.min(frameIdx, framesPerDir - 1);
}

/**
 * Derives a direction index (0..3 = S/E/N/W) from a velocity vector.
 * Falls back to the entity's lastDir if velocity is near zero.
 *
 * @param {number} vx
 * @param {number} vy
 * @param {number} [fallback=0] — previous direction index
 * @returns {number} 0=S, 1=E, 2=N, 3=W
 */
export function velToDir(vx, vy, fallback = 0) {
  const speed = vx * vx + vy * vy;
  if (speed < 0.001) return fallback;

  // Determine predominant axis
  if (Math.abs(vx) >= Math.abs(vy)) {
    return vx > 0 ? DIR_INDEX.E : DIR_INDEX.W;
  }
  return vy > 0 ? DIR_INDEX.S : DIR_INDEX.N;
}
