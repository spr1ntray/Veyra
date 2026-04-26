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
   * Resolves entity movement against wall tiles using AABB vs tile-grid.
   * Applies split-axis sliding: tries X move first, then Y independently,
   * so entities slide along walls instead of stopping cold at corners.
   *
   * Anchor: entity (x, y) is the bottom-center of the hitbox.
   * The AABB is centered at (x, y - halfH) with half-extents (halfW, halfH).
   * For simplicity we treat it as a square centered at (x, y): halfW = halfH = half.
   *
   * @param {{x: number, y: number}} pos  — current position (modified in place)
   * @param {{x: number, y: number}} vel  — velocity to apply this tick (px)
   * @param {number} half                  — half-size of the AABB (halfW = halfH)
   */
  resolveMove(pos, vel, half) {
    const nx = pos.x + vel.x;
    const ny = pos.y + vel.y;

    // Slide X independently
    if (!this._aabbBlockedAt(nx, pos.y, half)) {
      pos.x = nx;
    }

    // Slide Y independently
    if (!this._aabbBlockedAt(pos.x, ny, half)) {
      pos.y = ny;
    }

    // Clamp to map bounds (keep AABB fully inside the tile grid)
    pos.x = Math.max(half, Math.min(this.pixelW - half, pos.x));
    pos.y = Math.max(half, Math.min(this.pixelH - half, pos.y));
  }

  /**
   * Returns true if a square AABB centred at (cx, cy) with given half-size
   * overlaps any wall tile.
   *
   * Tests only the four corner points of the AABB (1px inset to avoid
   * flush-wall sticking that arises from exact boundary touches).
   *
   * @param {number} cx   — centre X in pixels
   * @param {number} cy   — centre Y in pixels
   * @param {number} half — half-extent in pixels (halfW == halfH)
   * @returns {boolean}
   */
  _aabbBlockedAt(cx, cy, half) {
    const inset = 1; // 1-px inset prevents flush-wall sticking
    const h = half - inset;
    const corners = [
      [cx - h, cy - h],
      [cx + h, cy - h],
      [cx - h, cy + h],
      [cx + h, cy + h],
    ];
    for (const [px, py] of corners) {
      if (this.isWall(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE))) return true;
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
 * Builds a Diablo 1-style dungeon: rectangular rooms connected by straight corridors.
 *
 * Algorithm:
 *   1. Place 6–9 non-overlapping rectangular rooms spread across the map.
 *   2. Sort rooms left-to-right; connect each pair with an L-shaped corridor
 *      (4 tiles wide → feels like an actual hallway, not a crack in the wall).
 *   3. One cross-connection between far rooms creates an optional shortcut loop.
 *   4. BFS flood-fill removes any unreachable floor tiles.
 *
 * Result: clear rooms separated by walls, corridors you walk through, a readable
 * "enter room → fight → leave through corridor → enter next room" flow.
 *
 * @param {number}   cols
 * @param {number}   rows
 * @param {Function} rng
 * @returns {Tilemap}
 */
export function buildCaveTilemap(cols, rows, rng) {
  const walls = new Uint8Array(cols * rows).fill(1);

  // Carve a rectangular floor patch (safe: never touches map border row/col)
  function carveRect(c0, r0, cw, rh) {
    for (let r = r0; r < r0 + rh; r++)
      for (let c = c0; c < c0 + cw; c++)
        if (r >= 1 && c >= 1 && r < rows - 1 && c < cols - 1)
          walls[r * cols + c] = 0;
  }

  // L-shaped corridor between two tile-space points, CORR_W tiles wide.
  // Horizontal leg at ar level, then vertical leg at bc column.
  // Width=2 at tile=32 gives a 64px passage — comfortable for a 24px AABB.
  function carveCorridor(ac, ar, bc, br) {
    const W    = 2; // corridor width (tiles) — 2 tiles = 64px, fits 24px AABB with ease
    const half = Math.floor(W / 2);
    const cMin = Math.min(ac, bc), cMax = Math.max(ac, bc);
    const rMin = Math.min(ar, br), rMax = Math.max(ar, br);
    carveRect(cMin - half, ar - half, (cMax - cMin) + W, W);  // horizontal leg
    carveRect(bc - half,   rMin - half, W, (rMax - rMin) + W); // vertical leg
  }

  // ── Place rooms ───────────────────────────────────────────────────────────
  // Sizes in tiles — scaled for TILE_SIZE=32. At tile=12 rooms were 20–32 wide;
  // dividing by ~2.5 keeps the same physical footprint in pixels.
  const MIN_W = 8,  MAX_W = 13;  // room width range (tiles)
  const MIN_H = 6,  MAX_H = 10;  // room height range (tiles)
  const PAD   = 2;               // minimum gap between room edges (tiles)
  const BORDER = 2;              // distance from map edge (tiles)

  const rooms = [];
  const targetCount = 6 + Math.floor(rng() * 4); // 6–9 rooms

  for (let attempt = 0; attempt < 300 && rooms.length < targetCount; attempt++) {
    const w  = MIN_W + Math.floor(rng() * (MAX_W - MIN_W + 1));
    const h  = MIN_H + Math.floor(rng() * (MAX_H - MIN_H + 1));
    const c0 = BORDER + Math.floor(rng() * (cols - w - BORDER * 2));
    const r0 = BORDER + Math.floor(rng() * (rows - h - BORDER * 2));

    // Reject if overlapping (+ padding) any existing room
    let ok = true;
    for (const rm of rooms) {
      if (c0 < rm.c0 + rm.w + PAD && c0 + w + PAD > rm.c0 &&
          r0 < rm.r0 + rm.h + PAD && r0 + h + PAD > rm.r0) {
        ok = false; break;
      }
    }
    if (!ok) continue;

    rooms.push({
      c0, r0, w, h,
      cx: c0 + Math.floor(w / 2),
      cy: r0 + Math.floor(h / 2),
    });
    carveRect(c0, r0, w, h);
  }

  // Fallback: at least one room so BFS has something to flood
  if (rooms.length === 0) {
    const c0 = 4, r0 = 4, w = cols - 8, h = rows - 8;
    rooms.push({ c0, r0, w, h, cx: Math.floor(cols / 2), cy: Math.floor(rows / 2) });
    carveRect(c0, r0, w, h);
  }

  // Sort left-to-right for natural exploration flow
  rooms.sort((a, b) => a.cx - b.cx);

  // ── Connect rooms with corridors ─────────────────────────────────────────
  for (let i = 0; i < rooms.length - 1; i++) {
    carveCorridor(rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
  }

  // One cross-link: leftmost room → middle room (optional shortcut)
  if (rooms.length >= 4) {
    const mid = Math.floor(rooms.length / 2);
    carveCorridor(rooms[0].cx, rooms[0].cy, rooms[mid].cx, rooms[mid].cy);
  }

  // ── Ruins / structural elements inside rooms ─────────────────────────────
  // Adds pillars, partial walls, and ruined enclosures so rooms look inhabited
  // rather than empty boxes. Placed BEFORE BFS so flood-fill sees final geometry.

  function blockWall(c, r) {
    if (c >= 1 && r >= 1 && c < cols - 1 && r < rows - 1) walls[r * cols + c] = 1;
  }
  function blockRect(c0, r0, cw, rh) {
    for (let r = r0; r < r0 + rh; r++)
      for (let c = c0; c < c0 + cw; c++) blockWall(c, r);
  }
  // Hollow rectangle outline (ruined building frame) with doorway gaps
  function blockOutline(c0, r0, cw, rh) {
    for (let c = c0; c < c0 + cw; c++) { blockWall(c, r0); blockWall(c, r0 + rh - 1); }
    for (let r = r0; r < r0 + rh; r++) { blockWall(c0, r); blockWall(c0 + cw - 1, r); }
    // Doorways (2-tile gaps) on all four sides so no area gets cut off
    const mC = c0 + Math.floor(cw / 2);
    const mR = r0 + Math.floor(rh / 2);
    carveRect(mC - 1, r0,          2, 1);
    carveRect(mC - 1, r0 + rh - 1, 2, 1);
    carveRect(c0,          mR - 1, 1, 2);
    carveRect(c0 + cw - 1, mR - 1, 1, 2);
  }

  const EDGE = 1; // minimum tiles between structure and room wall (scaled down from 3)

  for (const room of rooms) {
    const { c0, r0, w, h } = room;

    // ── Corner pillars (1×1) in rooms wide enough (≥9×7 tiles) ──────────
    // Thresholds scaled from 22/16 by ÷2.5 → 9/6
    if (w >= 9 && h >= 7) {
      const pS = 1; // pillar size (1 tile = 32px at new scale)
      blockRect(c0 + EDGE,          r0 + EDGE,          pS, pS);
      blockRect(c0 + w - EDGE - pS, r0 + EDGE,          pS, pS);
      blockRect(c0 + EDGE,          r0 + h - EDGE - pS, pS, pS);
      blockRect(c0 + w - EDGE - pS, r0 + h - EDGE - pS, pS, pS);
    }

    // ── Ruined enclosure in large rooms (≥11×8 tiles) ────────────────────
    // Thresholds scaled from 28/20 by ÷2.5 → 11/8
    if (w >= 11 && h >= 8) {
      const eW = 4, eH = 3; // enclosure dims scaled from 9×7
      const eC = c0 + Math.floor((w - eW) / 2);
      const eR = r0 + Math.floor((h - eH) / 2);
      blockOutline(eC, eR, eW, eH);
    }

    // ── Single partial wall divider in medium rooms (10×7 but <11 wide) ──
    // Thresholds scaled from 24/18 by ÷2.5 → 10/7
    if (w >= 10 && h >= 7 && w < 11) {
      const horiz = rng() < 0.55;
      if (horiz) {
        const wLen = 3 + Math.floor(rng() * 2); // scaled from 7+rng*4
        const wC   = c0 + Math.floor((w - wLen) / 2);
        const wR   = r0 + Math.floor(h / 2) + Math.floor((rng() - 0.5) * 2);
        blockRect(wC, wR, wLen, 1);
        carveRect(wC + Math.floor(wLen / 2) - 1, wR, 2, 1); // gap
      } else {
        const wLen = 2 + Math.floor(rng() * 2); // scaled from 5+rng*4
        const wC   = c0 + Math.floor(w / 2) + Math.floor((rng() - 0.5) * 2);
        const wR   = r0 + Math.floor((h - wLen) / 2);
        blockRect(wC, wR, 1, wLen);
        carveRect(wC, wR + Math.floor(wLen / 2) - 1, 1, 2); // gap
      }
    }
  }

  // ── BFS flood-fill from leftmost room center ─────────────────────────────
  const seedC = rooms[0].cx;
  const seedR = rooms[0].cy;
  let startC = seedC, startR = seedR;
  outer: for (let d = 0; d <= 5; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        const nr = seedR + dr, nc = seedC + dc;
        if (nr >= 1 && nc >= 1 && nr < rows - 1 && nc < cols - 1 &&
            !walls[nr * cols + nc]) {
          startC = nc; startR = nr; break outer;
        }
      }
    }
  }

  const visited   = new Uint8Array(cols * rows);
  const reachable = [];
  const queue     = [[startC, startR]];
  visited[startR * cols + startC] = 1;
  let qi = 0;
  while (qi < queue.length) {
    const [c, r] = queue[qi++];
    reachable.push({ c, r });
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (visited[nr * cols + nc] || walls[nr * cols + nc]) continue;
      visited[nr * cols + nc] = 1;
      queue.push([nc, nr]);
    }
  }

  for (let i = 0; i < walls.length; i++)
    if (!walls[i] && !visited[i]) walls[i] = 1;

  const floorVariants = new Uint8Array(cols * rows);
  for (const { c, r } of reachable) {
    const roll = rng();
    floorVariants[r * cols + c] = roll < 0.60 ? 0 : roll < 0.80 ? 1 : roll < 0.95 ? 2 : 3;
  }

  // ── Floor biome types ─────────────────────────────────────────────────────
  // 0 = stone (grey-dark, default),  1 = earth/moss (warm brown-green)
  // 2 = water/stream (teal-blue),    3 = dark stone (shadowed)
  //
  // Assignment: angle from map center determines base biome.
  // A "stream" path connects two far reachable tiles through the map.
  const floorTypes = new Uint8Array(cols * rows);

  // Angle-based biome zones (outer tiles only — inner core stays stone)
  const mapMidC = Math.floor(cols / 2);
  const mapMidR = Math.floor(rows / 2);
  const maxDist = Math.sqrt(mapMidC * mapMidC + mapMidR * mapMidR) * 0.6;
  for (const { c, r } of reachable) {
    const dx   = c - mapMidC;
    const dy   = r - mapMidR;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < maxDist * 0.3) continue; // inner core stays stone (0)
    const ang = Math.atan2(dy, dx); // -π..π
    if (ang > -Math.PI * 0.75 && ang < -Math.PI * 0.1) {
      // Upper-right quadrant → dark stone
      floorTypes[r * cols + c] = 3;
    } else if (ang > Math.PI * 0.1 && ang < Math.PI * 0.75) {
      // Lower-right quadrant → earth/moss
      floorTypes[r * cols + c] = 1;
    }
    // Others remain stone (0)
  }

  // Generate one water stream: greedy walk between two distant reachable tiles
  // Pick start from the leftmost 10% of BFS order, end from the rightmost 10%
  if (reachable.length > 20) { // lowered threshold for smaller tile grids
    const streamW  = 1; // 1-tile wide stream at new tile size
    const src      = reachable[Math.floor(reachable.length * 0.05)];
    const dst      = reachable[Math.floor(reachable.length * 0.90)];
    let   sc2 = src.c, sr2 = src.r;
    const visited2 = new Uint8Array(cols * rows);
    visited2[sr2 * cols + sc2] = 1;
    let steps = 0;
    const maxStream = cols + rows;
    while ((sc2 !== dst.c || sr2 !== dst.r) && steps < maxStream) {
      steps++;
      // Mark a small cross of tiles as water
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc2 = sc2 + dc, nr2 = sr2 + dr;
          if (nc2 > 0 && nr2 > 0 && nc2 < cols - 1 && nr2 < rows - 1 &&
              !walls[nr2 * cols + nc2]) {
            floorTypes[nr2 * cols + nc2] = 2;
          }
        }
      }
      // Move toward destination with bias + noise
      const dxS = dst.c - sc2;
      const dyS = dst.r - sr2;
      const dirs = [];
      if (Math.abs(dxS) >= Math.abs(dyS)) {
        dirs.push([Math.sign(dxS), 0], [0, Math.sign(dyS)]);
      } else {
        dirs.push([0, Math.sign(dyS)], [Math.sign(dxS), 0]);
      }
      if (rng() < 0.25) dirs.unshift([Math.sign(rng() - 0.5), 0]);
      let moved = false;
      for (const [ddc, ddr] of dirs) {
        const nc2 = sc2 + ddc, nr2 = sr2 + ddr;
        if (nc2 > 0 && nr2 > 0 && nc2 < cols - 1 && nr2 < rows - 1 &&
            !walls[nr2 * cols + nc2] && !visited2[nr2 * cols + nc2]) {
          visited2[nr2 * cols + nc2] = 1;
          sc2 = nc2; sr2 = nr2;
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
  }

  const tilemap = new Tilemap(cols, rows, walls, floorVariants);
  tilemap.reachableTiles = reachable;
  tilemap.startTile      = { c: startC, r: startR };
  tilemap.floorTypes     = floorTypes;
  return tilemap;
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
