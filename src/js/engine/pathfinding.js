/**
 * engine/pathfinding.js — A* pathfinding on a tile grid
 *
 * Used by the player for click-to-move paths (called rarely — only on new click).
 * Enemies use LOS + greedy steering instead (see ai.js) to save CPU.
 *
 * Returns an array of pixel-center waypoints: [{x, y}, ...]
 * Returns [] if no path found (destination is a wall or disconnected).
 */

import { TILE_SIZE } from './config.js';

/**
 * A* on the tilemap from pixel position (startX, startY) to (goalX, goalY).
 *
 * @param {import('./tilemap.js').Tilemap} tilemap
 * @param {number} startX @param {number} startY — pixel coords
 * @param {number} goalX  @param {number} goalY  — pixel coords
 * @returns {{ x: number, y: number }[]} — array of pixel waypoints (not including start)
 */
export function findPath(tilemap, startX, startY, goalX, goalY) {
  const cols  = tilemap.cols;
  const rows  = tilemap.rows;
  const T     = TILE_SIZE;

  const sc = Math.floor(startX / T);
  const sr = Math.floor(startY / T);
  let   gc = Math.floor(goalX  / T);
  let   gr = Math.floor(goalY  / T);

  // If goal is a wall, snap to nearest passable tile
  if (tilemap.isWall(gc, gr)) {
    const snapped = _nearestPassable(tilemap, gc, gr);
    if (!snapped) return [];
    gc = snapped.col;
    gr = snapped.row;
  }

  if (sc === gc && sr === gr) return []; // already there

  const idx = (c, r) => r * cols + c;
  const total = cols * rows;

  // g, f costs — Float32Array is faster than plain array for large grids
  const g = new Float32Array(total).fill(Infinity);
  const f = new Float32Array(total).fill(Infinity);
  // parent encoded as single int index (-1 = none)
  const parent = new Int32Array(total).fill(-1);
  // visited flag (closed set)
  const closed = new Uint8Array(total);

  const startIdx = idx(sc, sr);
  g[startIdx] = 0;
  f[startIdx] = _octile(sc, sr, gc, gr);

  // Open set: array-based min-heap by f value
  const open = new MinHeap();
  open.push(startIdx, f[startIdx]);

  const goalIdx = idx(gc, gr);

  // 8-connected neighbours — diagonals use √2 cost; corner-cutting is blocked below
  const SQRT2 = Math.SQRT2;
  const DIRS  = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],                          // cardinal, cost 1
    [1, 1, SQRT2], [-1, 1, SQRT2], [1, -1, SQRT2], [-1, -1, SQRT2],        // diagonal, cost √2
  ];

  while (!open.isEmpty()) {
    const cur = open.pop();
    if (cur === goalIdx) break;
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cc = cur % cols;
    const cr = (cur / cols) | 0;

    for (const [dc, dr, dcost] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (tilemap.isWall(nc, nr)) continue;

      // Prevent diagonal corner-cutting: both adjacent cardinal tiles must be passable
      if (dc !== 0 && dr !== 0) {
        if (tilemap.isWall(cc + dc, cr) || tilemap.isWall(cc, cr + dr)) continue;
      }

      const ni = idx(nc, nr);
      if (closed[ni]) continue;

      const ng = g[cur] + dcost;
      if (ng < g[ni]) {
        g[ni]      = ng;
        f[ni]      = ng + _octile(nc, nr, gc, gr);
        parent[ni] = cur;
        open.push(ni, f[ni]);
      }
    }
  }

  if (parent[goalIdx] === -1 && goalIdx !== startIdx) return []; // unreachable

  // Reconstruct path
  const tilePath = [];
  let cur = goalIdx;
  while (cur !== startIdx && cur !== -1) {
    tilePath.push(cur);
    cur = parent[cur];
  }
  tilePath.reverse();

  // Convert tile indices to pixel centers, then smooth
  const pixelPath = tilePath.map(i => {
    const c = i % cols;
    const r = (i / cols) | 0;
    return { x: c * T + T / 2, y: r * T + T / 2 };
  });
  return _smoothPath(pixelPath, tilemap);
}

// --- helpers ---

/** Octile heuristic — consistent with diagonal cost √2. */
function _octile(c1, r1, c2, r2) {
  const dx = Math.abs(c1 - c2);
  const dy = Math.abs(r1 - r2);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * String-pull smoothing: removes intermediate waypoints that lie on a
 * straight unobstructed line between their neighbours.
 * Looks ahead up to 10 waypoints to find the furthest reachable via LOS.
 *
 * @param {{ x: number, y: number }[]} path
 * @param {import('./tilemap.js').Tilemap} tilemap
 * @returns {{ x: number, y: number }[]}
 */
function _smoothPath(path, tilemap) {
  if (path.length <= 2) return path;
  const result = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    // Look ahead up to 10 waypoints for the furthest reachable via LOS
    let j = Math.min(i + 10, path.length - 1);
    while (j > i + 1) {
      if (tilemap.hasLOS(path[i].x, path[i].y, path[j].x, path[j].y)) break;
      j--;
    }
    result.push(path[j]);
    i = j;
  }
  return result;
}

/** Finds nearest non-wall tile via BFS. */
function _nearestPassable(tilemap, startC, startR) {
  const visited = new Set();
  const queue   = [{ col: startC, row: startR }];
  while (queue.length) {
    const { col, row } = queue.shift();
    const key = row * tilemap.cols + col;
    if (visited.has(key)) continue;
    visited.add(key);
    if (!tilemap.isWall(col, row)) return { col, row };
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nr >= 0 && nc < tilemap.cols && nr < tilemap.rows) {
        queue.push({ col: nc, row: nr });
      }
    }
    if (visited.size > 200) break; // safety
  }
  return null;
}

/**
 * Minimal binary min-heap for A* open set.
 * Stores [index, priority] pairs.
 */
class MinHeap {
  constructor() { this._data = []; }
  isEmpty() { return this._data.length === 0; }

  push(idx, priority) {
    this._data.push({ idx, priority });
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top = this._data[0].idx;
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].priority <= this._data[i].priority) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].priority < this._data[smallest].priority) smallest = l;
      if (r < n && this._data[r].priority < this._data[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}
