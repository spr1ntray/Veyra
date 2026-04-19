/**
 * engine/tilemap.js — tile grid storage, wall queries, LOS
 *
 * Tiles are stored in a flat Uint8Array (row-major).
 * tile index 0 = floor, 1 = wall.
 * All queries take tile coords (col, row), not pixel coords.
 *
 * Each floor tile also has a variant index (0..3) stored in floorVariants
 * — assigned at build time using seeded RNG so the room looks consistent
 * across frames but different across runs.
 */

import { TILE_SIZE } from './config.js';

export class Tilemap {
  /**
   * @param {number}    cols         — width in tiles
   * @param {number}    rows         — height in tiles
   * @param {Uint8Array} walls       — 0 = passable, 1 = wall (length cols*rows)
   * @param {Uint8Array} [floorVariants] — floor tile variant index per tile (0..3)
   */
  constructor(cols, rows, walls, floorVariants) {
    this.cols  = cols;
    this.rows  = rows;
    this.walls = walls; // Uint8Array
    this.pixelW = cols * TILE_SIZE;
    this.pixelH = rows * TILE_SIZE;

    // Floor variant per tile (0..3) — used by renderer to pick tile sheet index.
    // Defaults to all-zero if not provided.
    this.floorVariants = floorVariants || new Uint8Array(cols * rows);
  }

  /** Returns true if the tile at (col, row) is a wall. */
  isWall(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return true;
    return this.walls[row * this.cols + col] === 1;
  }

  /** Converts pixel position to tile coords. */
  toTile(px, py) {
    return {
      col: Math.floor(px / TILE_SIZE),
      row: Math.floor(py / TILE_SIZE),
    };
  }

  /** Center pixel of tile (col, row). */
  tileCenter(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /**
   * Resolves a circular entity's movement against wall tiles.
   * Slides along surfaces instead of stopping cold.
   *
   * @param {{x: number, y: number}} pos   — current position (modified in place)
   * @param {{x: number, y: number}} vel   — velocity to apply (dx, dy per tick)
   * @param {number} radius                 — entity radius in pixels
   */
  resolveMove(pos, vel, radius) {
    // Try full move first
    const nx = pos.x + vel.x;
    const ny = pos.y + vel.y;

    // Slide X
    if (!this._circleBlockedAt(nx, pos.y, radius)) {
      pos.x = nx;
    }

    // Slide Y
    if (!this._circleBlockedAt(pos.x, ny, radius)) {
      pos.y = ny;
    }

    // Clamp to map bounds
    pos.x = Math.max(radius, Math.min(this.pixelW - radius, pos.x));
    pos.y = Math.max(radius, Math.min(this.pixelH - radius, pos.y));
  }

  /**
   * Returns true if a circle at (cx, cy) with given radius overlaps any wall tile.
   * Checks the 4 cardinal extents + centre tile.
   */
  _circleBlockedAt(cx, cy, radius) {
    const r = radius - 1; // small inset so we don't stick to adjacent tiles
    const checks = [
      [cx,     cy    ],
      [cx - r, cy    ],
      [cx + r, cy    ],
      [cx,     cy - r],
      [cx,     cy + r],
    ];
    for (const [px, py] of checks) {
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      if (this.isWall(col, row)) return true;
    }
    return false;
  }

  /**
   * Line-of-sight check using DDA tile traversal.
   * Returns true if (ax,ay) → (bx,by) is unobstructed by walls.
   *
   * @param {number} ax @param {number} ay — start pixel pos
   * @param {number} bx @param {number} by — end pixel pos
   * @returns {boolean}
   */
  hasLOS(ax, ay, bx, by) {
    const T = TILE_SIZE;
    let col = Math.floor(ax / T);
    let row = Math.floor(ay / T);
    const col2 = Math.floor(bx / T);
    const row2 = Math.floor(by / T);

    const dx = bx - ax;
    const dy = by - ay;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;

    // tMax: distance along ray to first grid crossing in each axis
    let tMaxX = dx !== 0
      ? ((stepX > 0 ? (col + 1) * T : col * T) - ax) / dx
      : Infinity;
    let tMaxY = dy !== 0
      ? ((stepY > 0 ? (row + 1) * T : row * T) - ay) / dy
      : Infinity;

    const tDeltaX = dx !== 0 ? Math.abs(T / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(T / dy) : Infinity;

    // Walk at most cols+rows steps to prevent infinite loop
    const maxSteps = this.cols + this.rows;
    for (let step = 0; step < maxSteps; step++) {
      if (this.isWall(col, row)) return false;
      if (col === col2 && row === row2) return true;

      if (tMaxX < tMaxY) {
        tMaxX += tDeltaX;
        col   += stepX;
      } else {
        tMaxY += tDeltaY;
        row   += stepY;
      }
    }
    return true;
  }
}

/**
 * Builds a simple single-room tilemap:
 *   - all interior tiles = floor (0)
 *   - perimeter = wall (1)
 *
 * Floor tiles get a seeded-random variant (0..3) from `rng` if provided.
 * Using the world RNG keeps room appearance deterministic per run seed.
 *
 * @param {number}   cols
 * @param {number}   rows
 * @param {Function} [rng] — mulberry32 instance; pass world.rng for determinism
 * @returns {Tilemap}
 */
export function buildRoomTilemap(cols, rows, rng) {
  const walls         = new Uint8Array(cols * rows);
  const floorVariants = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        walls[idx] = 1;
      } else if (rng) {
        // Weighted toward plain tiles (index 0) to avoid busy floor
        // 60% plain, 20% cracked, 15% moss, 5% bloodstained
        const roll = rng();
        if (roll < 0.60)      floorVariants[idx] = 0;
        else if (roll < 0.80) floorVariants[idx] = 1;
        else if (roll < 0.95) floorVariants[idx] = 2;
        else                  floorVariants[idx] = 3;
      }
    }
  }
  return new Tilemap(cols, rows, walls, floorVariants);
}
