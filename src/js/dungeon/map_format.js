/**
 * dungeon/map_format.js — Map JSON contract v1
 *
 * Schema v1:
 * {
 *   schemaVersion: 1,
 *   name: string,
 *   tileSize: 32,
 *   cols: int (16..80),
 *   rows: int (12..60),
 *   biome: 'cave' | 'ruins' | 'crypt',
 *   biomeSeed: int,
 *   walls: base64-encoded Uint8Array (cols*rows, 0=floor 1=wall),
 *   markers: [
 *     { type: 'start'|'exit'|'enemy'|'loot'|'decor', c, r, kind?, elite?, amount?, sprite? }
 *   ]
 * }
 *
 * Limits enforced:
 *   cols: 16..80  rows: 12..60
 *   Exactly 1 'start' and 1 'exit' marker required.
 *   BFS from start must reach exit.
 */

// ─── Size limits (match ADR Decision 4) ──────────────────────────────────────
export const MAP_MIN_COLS = 16;
export const MAP_MAX_COLS = 80;
export const MAP_MIN_ROWS = 12;
export const MAP_MAX_ROWS = 60;

// ─── Base64 helpers ───────────────────────────────────────────────────────────

/**
 * Encodes a Uint8Array to a base64 string.
 * Uses btoa over a binary string for broadest browser compat.
 * @param {Uint8Array} u8
 * @returns {string}
 */
function u8ToBase64(u8) {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

/**
 * Decodes a base64 string back to a Uint8Array.
 * @param {string} b64
 * @returns {Uint8Array}
 */
function base64ToU8(b64) {
  const bin = atob(b64);
  const u8  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ─── Schema v0 → v1 migration ─────────────────────────────────────────────────

/**
 * Migrates a legacy (schemaVersion absent or 0) editor JSON to v1 format.
 * Editor v0 stored walls as a plain JSON Array.
 *
 * @param {object} raw — raw parsed JSON from editor
 * @returns {object} — v1-conformant object (walls still as base64)
 */
function _migrateV0(raw) {
  // walls stored as plain array in v0
  const wallsArr = Array.isArray(raw.walls) ? raw.walls : [];
  const u8 = new Uint8Array(wallsArr.length);
  for (let i = 0; i < wallsArr.length; i++) u8[i] = wallsArr[i] ? 1 : 0;

  return {
    schemaVersion: 1,
    name:          raw.name || 'untitled',
    tileSize:      32,
    cols:          raw.cols | 0,
    rows:          raw.rows | 0,
    biome:         raw.biome || 'cave',
    biomeSeed:     raw.biomeSeed || Math.floor(Math.random() * 0xFFFFFFFF),
    walls:         u8ToBase64(u8),
    markers:       Array.isArray(raw.markers) ? raw.markers.map(m => ({ ...m })) : [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serializes a Tilemap + markers array into a v1 map object.
 *
 * @param {import('../engine/tilemap.js').Tilemap} tilemap
 * @param {Array}  markers    — [{ type, c, r, ...opts }]
 * @param {object} [meta]     — optional overrides: { name, biome, biomeSeed }
 * @returns {object}          — v1 map object (JSON-ready)
 */
export function serializeMap(tilemap, markers, meta = {}) {
  return {
    schemaVersion: 1,
    name:          meta.name      || 'untitled',
    tileSize:      32,
    cols:          tilemap.cols,
    rows:          tilemap.rows,
    biome:         meta.biome     || 'cave',
    biomeSeed:     meta.biomeSeed || (Date.now() & 0xFFFFFFFF),
    walls:         u8ToBase64(tilemap.walls),
    markers:       markers.map(m => ({ ...m })),
  };
}

/**
 * Deserializes a v1 map object (or migrates v0 on the fly).
 *
 * @param {object} json — parsed JSON (v0 or v1)
 * @returns {{ cols, rows, walls: Uint8Array, markers, biome, biomeSeed, name }}
 * @throws {Error} if the JSON cannot be interpreted at all
 */
export function deserializeMap(json) {
  if (!json || typeof json !== 'object') throw new Error('map is not an object');

  // Migrate v0 (no schemaVersion) to v1 shape
  let data = json;
  if (!json.schemaVersion || json.schemaVersion < 1) {
    data = _migrateV0(json);
  }

  const walls = base64ToU8(data.walls);

  return {
    cols:      data.cols | 0,
    rows:      data.rows | 0,
    walls,
    markers:   Array.isArray(data.markers) ? data.markers.map(m => ({ ...m })) : [],
    biome:     data.biome     || 'cave',
    biomeSeed: data.biomeSeed || 0,
    name:      data.name      || 'untitled',
  };
}

/**
 * Validates a v1 map object and returns a structured result.
 *
 * Checks:
 *  - schemaVersion === 1 (or migratable)
 *  - cols/rows within limits
 *  - walls.length === cols*rows
 *  - exactly 1 'start' marker, exactly 1 'exit' marker
 *  - BFS from start reaches exit
 *
 * @param {object} json — raw parsed JSON
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateMap(json) {
  const errors   = [];
  const warnings = [];

  if (!json || typeof json !== 'object') {
    return { ok: false, errors: ['Not a valid JSON object'], warnings };
  }

  // Migrate v0 silently for validation purposes
  let data;
  try {
    data = deserializeMap(json);
  } catch (e) {
    return { ok: false, errors: [`Cannot parse map: ${e.message}`], warnings };
  }

  const { cols, rows, walls, markers } = data;

  // Dimension limits
  if (cols < MAP_MIN_COLS || cols > MAP_MAX_COLS) {
    errors.push(`cols=${cols} out of range [${MAP_MIN_COLS}, ${MAP_MAX_COLS}]`);
  }
  if (rows < MAP_MIN_ROWS || rows > MAP_MAX_ROWS) {
    errors.push(`rows=${rows} out of range [${MAP_MIN_ROWS}, ${MAP_MAX_ROWS}]`);
  }

  // Wall buffer size
  if (walls.length !== cols * rows) {
    errors.push(`walls.length=${walls.length} does not match cols×rows=${cols * rows}`);
  }

  // Marker counts
  const starts  = markers.filter(m => m.type === 'start');
  const exits   = markers.filter(m => m.type === 'exit');

  if (starts.length !== 1) {
    errors.push(`Expected exactly 1 'start' marker, found ${starts.length}`);
  }
  if (exits.length !== 1) {
    errors.push(`Expected exactly 1 'exit' marker, found ${exits.length}`);
  }

  // BFS reachability — only if we have exactly one start + one exit and correct wall size
  if (starts.length === 1 && exits.length === 1 && walls.length === cols * rows) {
    const { c: sc, r: sr } = starts[0];
    const { c: ec, r: er } = exits[0];

    const visited = new Uint8Array(cols * rows);
    const queue   = [[sc, sr]];

    if (!walls[sr * cols + sc]) {
      visited[sr * cols + sc] = 1;
    } else {
      errors.push("'start' marker is placed on a wall tile");
    }

    if (walls[er * cols + ec]) {
      errors.push("'exit' marker is placed on a wall tile");
    }

    let qi = 0;
    while (qi < queue.length) {
      const [c, r] = queue[qi++];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (visited[nr * cols + nc] || walls[nr * cols + nc]) continue;
        visited[nr * cols + nc] = 1;
        queue.push([nc, nr]);
      }
    }

    if (!visited[er * cols + ec]) {
      errors.push("'exit' is not reachable from 'start' (BFS check failed — map may have disconnected areas)");
    }
  }

  // Warnings — non-fatal
  if (markers.filter(m => m.type === 'enemy' || m.type === 'elite').length === 0) {
    warnings.push('No enemy markers — dungeon will be empty (valid for testing)');
  }

  return { ok: errors.length === 0, errors, warnings };
}
