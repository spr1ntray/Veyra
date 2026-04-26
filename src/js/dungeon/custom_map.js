/**
 * dungeon/custom_map.js — Bridge: editor JSON → runtime Tilemap + spawns
 *
 * Responsibilities:
 *   importCustomMap(json)  — validate → build Tilemap → extract spawn lists
 *   loadPendingCustomMap() — read one-shot localStorage key 'veyra:loadMap'
 *
 * This module is intentionally isolated from procedural gen (tilemap.js
 * buildCaveTilemap). dungeon.js chooses one path or the other.
 */

import { Tilemap }                       from '../engine/tilemap.js';
import { mulberry32 }                    from '../engine/rng.js';
import { deserializeMap, validateMap }   from './map_format.js';

// localStorage key — one-shot: read once, then deleted
const LS_KEY = 'veyra:loadMap';

// ─── Floor variant / type painters ───────────────────────────────────────────

/**
 * Paints floorVariants (0..3) and floorTypes (0..3) for all floor tiles
 * using a seeded RNG so appearance is deterministic per biomeSeed.
 *
 * Replicates the weighted distribution used in buildCaveTilemap:
 *   60% variant 0 (plain), 20% variant 1 (cracked), 15% variant 2 (moss), 5% variant 3 (blood)
 *
 * FloorTypes use angle-from-center zoning (same as procedural gen).
 *
 * @param {Tilemap}  tilemap
 * @param {number}   biomeSeed
 */
function _paintBiome(tilemap, biomeSeed) {
  const rng = mulberry32(biomeSeed);
  const { cols, rows, walls } = tilemap;

  const floorVariants = new Uint8Array(cols * rows);
  const floorTypes    = new Uint8Array(cols * rows);

  const mapMidC = Math.floor(cols / 2);
  const mapMidR = Math.floor(rows / 2);
  const maxDist = Math.sqrt(mapMidC * mapMidC + mapMidR * mapMidR) * 0.6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (walls[idx]) continue; // skip walls

      // Variant (texture variation within the tile)
      const roll = rng();
      floorVariants[idx] = roll < 0.60 ? 0 : roll < 0.80 ? 1 : roll < 0.95 ? 2 : 3;

      // Floor type (biome zone via angle from map centre)
      const dx   = c - mapMidC;
      const dy   = r - mapMidR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist * 0.3) continue; // inner core stays stone (0)
      const ang = Math.atan2(dy, dx);
      if (ang > -Math.PI * 0.75 && ang < -Math.PI * 0.1) {
        floorTypes[idx] = 3; // dark stone
      } else if (ang > Math.PI * 0.1 && ang < Math.PI * 0.75) {
        floorTypes[idx] = 1; // earth/moss
      }
      // Other sectors stay 0 (stone)
    }
  }

  tilemap.floorVariants = floorVariants;
  tilemap.floorTypes    = floorTypes;
}

// ─── BFS: collect all tiles reachable from seed ───────────────────────────────

/**
 * BFS flood-fill from (sc, sr). Returns the ordered list of reachable floor tiles.
 * Used to build tilemap.reachableTiles (renderer + dungeon.js use this).
 *
 * @param {Tilemap} tilemap
 * @param {number}  sc — start col
 * @param {number}  sr — start row
 * @returns {Array<{c:number, r:number}>}
 */
function _bfsReachable(tilemap, sc, sr) {
  const { cols, rows, walls } = tilemap;
  const visited   = new Uint8Array(cols * rows);
  const reachable = [];
  const queue     = [[sc, sr]];
  visited[sr * cols + sc] = 1;

  let qi = 0;
  while (qi < queue.length) {
    const [c, r] = queue[qi++];
    reachable.push({ c, r });
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (visited[nr * cols + nc] || walls[nr * cols + nc]) continue;
      visited[nr * cols + nc] = 1;
      queue.push([nc, nr]);
    }
  }
  return reachable;
}

// ─── Public: importCustomMap ──────────────────────────────────────────────────

/**
 * Imports a custom map from a parsed JSON object.
 *
 * Steps:
 *   1. Validate — returns null + logs on failure (caller shows notification)
 *   2. Deserialize → raw { cols, rows, walls, markers, biomeSeed }
 *   3. Build Tilemap (no procedural gen — walls taken verbatim from JSON)
 *   4. Paint biome variants (deterministic via biomeSeed)
 *   5. BFS from start to populate reachableTiles
 *   6. Extract spawn lists from markers
 *
 * @param {object} json — parsed map JSON (v0 or v1)
 * @returns {{ tilemap: Tilemap, spawns: object } | null}
 *   spawns: { start: {c,r}, exit: {c,r}, enemies: Array, loot: Array, decor: Array }
 *   Returns null if validation fails.
 */
export function importCustomMap(json) {
  // ── 1. Validate ────────────────────────────────────────────────────────────
  const { ok, errors, warnings } = validateMap(json);

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn('[custom_map] warning:', w));
  }
  if (!ok) {
    errors.forEach(e => console.error('[custom_map] validation error:', e));
    return null;
  }

  // ── 2. Deserialize ─────────────────────────────────────────────────────────
  const { cols, rows, walls, markers, biomeSeed } = deserializeMap(json);

  // ── 3. Build Tilemap ───────────────────────────────────────────────────────
  // Tilemap constructor expects a pre-filled Uint8Array — pass walls directly.
  // floorVariants will be set by _paintBiome below.
  const tilemap = new Tilemap(cols, rows, walls);

  // ── 4. Paint biome ─────────────────────────────────────────────────────────
  _paintBiome(tilemap, biomeSeed);

  // ── 5. BFS from start ──────────────────────────────────────────────────────
  const startMarker = markers.find(m => m.type === 'start');
  const exitMarker  = markers.find(m => m.type === 'exit');
  // Both are guaranteed to exist (validateMap passed)

  const reachable = _bfsReachable(tilemap, startMarker.c, startMarker.r);
  tilemap.reachableTiles = reachable;
  tilemap.startTile      = { c: startMarker.c, r: startMarker.r };

  // ── 6. Extract spawns from markers ─────────────────────────────────────────
  const enemies = [];
  const loot    = [];
  const decor   = [];

  for (const m of markers) {
    switch (m.type) {
      case 'enemy':
        // Normal enemy marker
        enemies.push({ c: m.c, r: m.r, elite: false, kind: m.kind || 'zombie' });
        break;

      case 'elite':
        // Elite enemy (editor uses 'elite' as a separate paint type)
        enemies.push({ c: m.c, r: m.r, elite: true, kind: m.kind || 'zombie' });
        break;

      case 'loot':
      case 'gold':
        // Gold pile
        loot.push({ c: m.c, r: m.r, kind: m.kind || 'gold', amount: m.amount || 20 });
        break;

      case 'decor':
        decor.push({ c: m.c, r: m.r, sprite: m.sprite || 'barrel' });
        break;

      // 'start' and 'exit' are extracted above; unknown types are silently skipped
      default:
        if (m.type !== 'start' && m.type !== 'exit') {
          console.warn('[custom_map] unknown marker type ignored:', m.type);
        }
    }
  }

  return {
    tilemap,
    spawns: {
      start:   { c: startMarker.c, r: startMarker.r },
      exit:    { c: exitMarker.c,  r: exitMarker.r  },
      enemies,
      loot,
      decor,
    },
  };
}

// ─── Public: loadPendingCustomMap ─────────────────────────────────────────────

/**
 * Checks localStorage for a pending custom map written by the editor.
 *
 * Key: 'veyra:loadMap' — one-shot: the key is deleted immediately after reading
 * so that a page reload doesn't re-apply the same map.
 *
 * @returns {{ tilemap: Tilemap, spawns: object } | null}
 */
export function loadPendingCustomMap() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;

  // Delete immediately — one-shot semantics
  localStorage.removeItem(LS_KEY);

  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('[custom_map] localStorage entry is not valid JSON:', e);
    return null;
  }

  const result = importCustomMap(json);
  if (!result) {
    console.error('[custom_map] loadPendingCustomMap: map failed validation, using procedural gen');
  }
  return result;
}
