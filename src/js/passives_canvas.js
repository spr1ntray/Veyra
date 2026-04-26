/**
 * passives_canvas.js — Sigil Tree canvas renderer (v2 crypt-altar aesthetic)
 *
 * Renders passive nodes as hexagonal tiles on a hex-cluster constellation
 * layout, connected by quadratic Bezier curves. Background: dark crypt
 * stone with faint runic symbols. No stars, nebulae, sparks, or ⛤.
 *
 * Layout:
 *   - Universal cluster: top-left, 2 rows × 4 hex-snapped positions
 *   - Class cluster: centre-right, 3 rings (inner/mid/outer)
 *
 * Public API:
 *   PassiveTreeCanvas.init(containerEl)  — attach canvas, start pulse loop
 *   PassiveTreeCanvas.refresh()          — recompute layout + node states
 *   PassiveTreeCanvas.destroy()          — stop loop, remove DOM elements
 */

import {
  PASSIVE_NODES_MAP,
  getUniversalNodes,
  getClassNodes,
  canUnlockNode
} from './passives.js';
import { getState, saveState } from './state.js';
import { showNotification } from './ui.js';

// ---------------------------------------------------------------------------
// Palette — strictly from sigil-tree-visual-v2.md
// ---------------------------------------------------------------------------

const C = {
  bg:           '#0e0e18',   // Shadow Ink
  tileGrid:     '#1a1a24',   // Crypt Stone
  locked:       '#3a3a4a',   // Moss Grey
  available:    '#e8b44a',   // Ember Gold
  unlocked:     '#ff7a1a',   // Fire Orange
  edgeLocked:   '#3a3a4a',   // 25% alpha applied at draw-time
  textPrimary:  '#d8d2c0',   // Bone
  textDim:      '#3a3a4a',
  pyromancer:   '#ff7a1a',
  stormcaller:  '#8b5cd6',
  tidecaster:   '#5c9fd6',
  geomancer:    '#5cd66b',
  universal:    '#e8b44a',
};

/** Per-class accent colour lookup */
function classColor(cls) {
  return C[cls] || C.universal;
}

// ---------------------------------------------------------------------------
// Hex geometry
// ---------------------------------------------------------------------------

/** Flat-top hexagon circumradius per node type */
const HEX_R = {
  minor:    20,
  major:    26,
  keystone: 34,
};

/**
 * Return the 6 vertices of a flat-top hex centred at (cx, cy) with circumradius r.
 * @returns {Array<[number,number]>}
 */
function hexVertices(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6; // flat-top: offset -30°
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** Draw a closed hex path at (cx, cy) with circumradius r. */
function hexPath(ctx, cx, cy, r) {
  const v = hexVertices(cx, cy, r);
  ctx.beginPath();
  ctx.moveTo(v[0][0], v[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(v[i][0], v[i][1]);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Hex-grid coordinate helpers (offset row layout)
// ---------------------------------------------------------------------------

/**
 * Convert (col, row) in a flat-top hex grid to pixel (x, y).
 * Odd rows are offset by half the column spacing.
 * @param {number} col
 * @param {number} row
 * @param {number} hexR   circumradius of hex cell
 * @param {number} gap    pixel gap between hex cells
 */
function hexToPixel(col, row, hexR, gap) {
  const w    = hexR * 2;                        // flat-top hex width
  const h    = hexR * Math.sqrt(3);             // flat-top hex height
  const colW = w * 0.75 + gap;                  // horizontal pitch
  const rowH = h + gap;                         // vertical pitch
  const x = col * colW;
  const y = row * rowH + (col % 2 === 1 ? rowH / 2 : 0);
  return [x, y];
}

// ---------------------------------------------------------------------------
// Runic glyph catalogue — all drawn procedurally via Canvas paths
// ---------------------------------------------------------------------------

/**
 * Draw a category glyph inside hex at (cx, cy), scaled to innerR.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} glyphKey
 * @param {number} cx
 * @param {number} cy
 * @param {number} innerR  usable radius inside the hex
 */
function drawGlyph(ctx, glyphKey, cx, cy, innerR) {
  const s = innerR * 0.55; // glyph scale
  ctx.beginPath();
  switch (glyphKey) {
    case 'triple-stroke': {
      // 3 vertical strokes ↑↑↑ — damage bonus
      const gap = s * 0.55;
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(cx + i * gap, cy - s);
        ctx.lineTo(cx + i * gap, cy + s);
      }
      break;
    }
    case 'cross': {
      // Rotated + — crit / range
      ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
      break;
    }
    case 'square': {
      // Rounded square — HP
      const hs = s * 0.75;
      ctx.rect(cx - hs, cy - hs, hs * 2, hs * 2);
      break;
    }
    case 'triangle-up': {
      // Triangle △ — mana / speed
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.87, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.87, cy + s * 0.5);
      ctx.closePath();
      break;
    }
    case 'diamond': {
      // ◆ — major node
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.7, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.7, cy);
      ctx.closePath();
      break;
    }
    case 'six-star': {
      // 6-point star (2 overlapping triangles) — keystone
      for (let t = 0; t < 2; t++) {
        const offset = t * Math.PI / 3;
        ctx.moveTo(
          cx + s * Math.cos(-Math.PI / 2 + offset),
          cy + s * Math.sin(-Math.PI / 2 + offset)
        );
        for (let i = 1; i <= 3; i++) {
          const a = -Math.PI / 2 + offset + (i * 2 * Math.PI) / 3;
          ctx.lineTo(cx + s * Math.cos(a), cy + s * Math.sin(a));
        }
        ctx.closePath();
      }
      break;
    }
    case 'circle': {
      // ⊙ — universal node
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.moveTo(cx + s * 0.35, cy);
      ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
      break;
    }
    case 'arrow-up': {
      // Arrow up — projectile/speed
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.55, cy);
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx - s * 0.55, cy);
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx, cy + s);
      break;
    }
    default: {
      // Fallback: small circle
      ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    }
  }
}

/**
 * Map a node data object to its glyph key.
 * Keystones always get 'six-star'. Universal gets 'circle'.
 * Others keyed on effect fields and name patterns.
 */
function glyphForNode(node) {
  if (node.type === 'keystone') return 'six-star';
  if (node.type === 'major')    return 'diamond';
  if (!node.classRestriction)   return 'circle'; // universal minor

  // Class minor — pick by dominant effect
  const e  = node.actionEffect || {};
  const name = node.name.toLowerCase();
  if (e.spellDmgMul || e.critChance || name.includes('damage') || name.includes('ember') || name.includes('crucible')) return 'triple-stroke';
  if (e.spellCdMul || e.projSpeedMul || name.includes('speed') || name.includes('pace') || name.includes('stride'))   return 'arrow-up';
  if (e.maxHpMul || e.dmgTakenMul || name.includes('hp') || name.includes('heart') || name.includes('veil') || name.includes('bloom')) return 'square';
  if (e.spellRangeMul || name.includes('range') || name.includes('reach') || name.includes('eye')) return 'cross';
  if (e.moveSpeedMul || name.includes('walk') || name.includes('ash') || name.includes('wayfarer')) return 'triangle-up';
  return 'cross';
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function lighten(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, (r + (255 - r) * f) | 0)},${Math.min(255, (g + (255 - g) * f) | 0)},${Math.min(255, (b + (255 - b) * f) | 0)})`;
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _canvas    = null;
let _ctx       = null;
let _container = null;
let _rafId     = null;
let _roHandle  = null;

/** Computed layout nodes: { data, x, y, radius, color, state:'locked'|'available'|'unlocked' } */
let _nodes = [];
/** Edges: { from:layoutNode, to:layoutNode } */
let _edges = [];

/** Hover node id */
let _hoveredId = null;

/** Selected node id — shown in right panel */
let _selectedId = null;

/** Timestamp for last RAF — delta-time budget */
let _lastTs = 0;

// Zoom / pan view transform (graph layer only)
const MIN_SCALE = 0.3;
const MAX_SCALE = 4.0;
let _view = { scale: 1, dx: 0, dy: 0 };
let _drag = null; // { startX, startY, startDx, startDy }

/** Pre-generated runic background symbols — re-seeded on canvas resize */
let _runeCache = null;

/** Minimal hover tooltip (name + type, no description — that lives in sigil-panel) */
let _tooltip = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const PassiveTreeCanvas = {

  init(containerEl) {
    _container = containerEl;

    _canvas = document.createElement('canvas');
    _canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default;';
    containerEl.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');

    _roHandle = new ResizeObserver(() => this._resize());
    _roHandle.observe(containerEl);
    this._resize();

    // Minimal tooltip overlay (name + type only)
    _tooltip = document.createElement('div');
    _tooltip.className = 'ptc-tooltip';
    _tooltip.style.display = 'none';
    containerEl.style.position = 'relative';
    containerEl.appendChild(_tooltip);

    // Input events
    _canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    _canvas.addEventListener('mouseleave', () => {
      _hoveredId = null;
      _drag = null;
      _canvas.style.cursor = 'default';
      if (_tooltip) _tooltip.style.display = 'none';
    });
    _canvas.addEventListener('click',      e => this._onClick(e));
    _canvas.addEventListener('wheel',      e => this._onWheel(e), { passive: false });
    _canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    _canvas.addEventListener('mouseup',    () => { _drag = null; _canvas.style.cursor = _hoveredId ? 'pointer' : 'default'; });

    this.refresh();
    this._startLoop();
  },

  refresh() {
    _computeLayout();
    _scheduleRedraw();
  },

  destroy() {
    if (_rafId)    cancelAnimationFrame(_rafId);
    if (_roHandle) _roHandle.disconnect();
    if (_canvas)   _canvas.remove();
    if (_tooltip)  _tooltip.remove();
    _canvas = _ctx = _container = _roHandle = _tooltip = null;
    _nodes = []; _edges = [];
    _view  = { scale: 1, dx: 0, dy: 0 };
    _drag  = null;
  },

  // ---- internals ----

  _resize() {
    if (!_canvas || !_container) return;
    const r = _container.getBoundingClientRect();
    _canvas.width  = r.width;
    _canvas.height = r.height;
    _runeCache = null;
    _computeLayout();
    _scheduleRedraw();
  },

  _startLoop() {
    // RAF loop: only needed for pulsing animations (available nodes, unlocked glow).
    // We run it continuously but it's cheap — only background + pulse sin().
    const loop = ts => {
      _drawFrame(ts);
      _rafId = requestAnimationFrame(loop);
    };
    _rafId = requestAnimationFrame(loop);
  },

  _onMouseMove(e) {
    if (!_canvas) return;
    const { mx, my } = _canvasCoords(e);

    if (_drag) {
      _view.dx = _drag.startDx + (mx - _drag.startX);
      _view.dy = _drag.startDy + (my - _drag.startY);
      _canvas.style.cursor = 'grabbing';
      return;
    }

    const hit = _hitTest(mx, my);
    const newId = hit ? hit.data.id : null;
    if (newId !== _hoveredId) {
      _hoveredId = newId;
      _canvas.style.cursor = _hoveredId ? 'pointer' : 'default';
    }

    // Update hover tooltip (name + type, 2 lines, 140px per ТЗ §1)
    if (hit && _tooltip) {
      _tooltip.style.display = 'block';
      _tooltip.innerHTML = `
        <div class="ptc-tt-name">${hit.data.name}</div>
        <div class="ptc-tt-type">${hit.data.type}</div>
      `;
      const cx = _container.getBoundingClientRect();
      let tx = (e.clientX - cx.left) + 14;
      let ty = (e.clientY - cx.top)  - 30;
      if (tx + 150 > cx.width - 8)  tx = (e.clientX - cx.left) - 154;
      if (ty < 2) ty = 2;
      _tooltip.style.left = `${tx}px`;
      _tooltip.style.top  = `${ty}px`;
    } else if (_tooltip) {
      _tooltip.style.display = 'none';
    }
  },

  _onWheel(e) {
    e.preventDefault();
    if (!_canvas) return;
    const { mx, my } = _canvasCoords(e);
    const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, _view.scale * factor));
    if (newScale === _view.scale) return;
    _view.dx    = mx + (_view.dx - mx) * (newScale / _view.scale);
    _view.dy    = my + (_view.dy - my) * (newScale / _view.scale);
    _view.scale = newScale;
  },

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const { mx, my } = _canvasCoords(e);
    _drag = { startX: mx, startY: my, startDx: _view.dx, startDy: _view.dy };
    _canvas.style.cursor = 'grabbing';
  },

  _onClick(e) {
    if (!_canvas) return;
    const { mx, my } = _canvasCoords(e);
    const hit = _hitTest(mx, my);
    if (!hit) { _selectedId = null; _updateRightPanel(null); return; }

    // Select → show in right panel
    _selectedId = hit.data.id;
    _updateRightPanel(hit);
  },
};

// ---------------------------------------------------------------------------
// Dirty-flag for on-demand redraws (non-animation frames)
// ---------------------------------------------------------------------------

let _dirty = true;
function _scheduleRedraw() { _dirty = true; }

// ---------------------------------------------------------------------------
// Layout computation — hex-cluster constellation
// ---------------------------------------------------------------------------

/**
 * Universal cluster: top-left quadrant.
 * 8 nodes laid out in 2 rows × 4 columns of a flat-top hex grid.
 *
 * Class cluster: centre of canvas.
 * Organised as 3 hex rings:
 *   inner (r=1): 6 starter minors (no prereqs)
 *   mid (r=2):   remaining minors + majors
 *   outer (r=3): keystones
 *
 * All positions snap to hex-grid centres with a constant cell gap.
 */
function _computeLayout() {
  if (!_canvas) return;

  const W = _canvas.width;
  const H = _canvas.height;

  _nodes = [];
  _edges = [];

  const allLMap = {};   // id → layoutNode

  // ── Universal cluster ─────────────────────────────────────────────────────
  const univNodes = getUniversalNodes();
  const uBaseX    = W * 0.10;  // cluster anchor x
  const uBaseY    = H * 0.14;  // cluster anchor y
  const uCellR    = 24;        // hex circumradius for univ cells
  const uGap      = 6;         // pixel gap between cells

  univNodes.forEach((n, i) => {
    const cols = 4;
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const [ox, oy] = hexToPixel(col, row, uCellR, uGap);
    const ln = {
      data:   n,
      x:      uBaseX + ox,
      y:      uBaseY + oy,
      radius: HEX_R.minor,   // universal nodes are all minor-sized
      color:  C.universal,
      state:  'locked',
    };
    _nodes.push(ln);
    allLMap[n.id] = ln;
  });

  // ── Class cluster ─────────────────────────────────────────────────────────
  const state     = getState();
  const classType = state.classType || null;

  if (classType) {
    const classNodes = getClassNodes(classType);
    const accent     = classColor(classType);

    // Cluster centre — offset slightly right of canvas centre
    const cx = W * 0.56;
    const cy = H * 0.52;

    // Ring radii in pixels
    const RING = { inner: 90, mid: 175, outer: 285 };

    // Partition nodes into rings
    const starterMinors = classNodes.filter(n => n.type === 'minor' && n.requires.length === 0);
    const otherMinors   = classNodes.filter(n => n.type === 'minor' && n.requires.length > 0);
    const majors        = classNodes.filter(n => n.type === 'major');
    const keystones     = classNodes.filter(n => n.type === 'keystone');

    // Mid ring = remaining minors first, then majors (for visual grouping)
    const midNodes = [...otherMinors, ...majors];

    // Place an array of nodes evenly around a ring, snapped to nearest hex-grid angle
    function placeRing(arr, ringR) {
      const count  = arr.length;
      if (count === 0) return;
      // Angular step — spread 330° so no full wrap
      const spanRad = count === 1 ? 0 : (330 / 180) * Math.PI;
      const stepRad = count === 1 ? 0 : spanRad / (count - 1);
      // Start from top-left (−90° − half-span)
      const startA  = -Math.PI / 2 - spanRad / 2;

      arr.forEach((n, i) => {
        const angle = startA + i * stepRad;
        // Snap angle to nearest 30° (π/6) to honour hex grid
        const snapAngle = Math.round(angle / (Math.PI / 6)) * (Math.PI / 6);
        const ln = {
          data:   n,
          x:      cx + ringR * Math.cos(snapAngle),
          y:      cy + ringR * Math.sin(snapAngle),
          radius: HEX_R[n.type] || HEX_R.minor,
          color:  accent,
          state:  'locked',
        };
        _nodes.push(ln);
        allLMap[n.id] = ln;
      });
    }

    placeRing(starterMinors, RING.inner);
    placeRing(midNodes,      RING.mid);
    placeRing(keystones,     RING.outer);

    // Build edges from requires[] fields
    for (const n of classNodes) {
      const toLn = allLMap[n.id];
      if (!toLn) continue;
      for (const reqId of n.requires) {
        const fromLn = allLMap[reqId];
        if (fromLn) _edges.push({ from: fromLn, to: toLn });
      }
    }
  }

  // Build universal edges
  for (const n of univNodes) {
    const toLn = allLMap[n.id];
    if (!toLn) continue;
    for (const reqId of n.requires) {
      const fromLn = allLMap[reqId];
      if (fromLn) _edges.push({ from: fromLn, to: toLn });
    }
  }
}

// ---------------------------------------------------------------------------
// Main render loop
// ---------------------------------------------------------------------------

function _drawFrame(ts) {
  if (!_ctx || !_canvas) return;

  // Node states change only when unlock/respec occur, but pulse needs every frame.
  // Resolve states every frame (cheap array lookup).
  const state    = getState();
  const unlocked = state.passives?.unlocked || [];
  const threads  = state.passives?.leyThreads || 0;

  for (const ln of _nodes) {
    if (unlocked.includes(ln.data.id)) {
      ln.state = 'unlocked';
    } else {
      const { canUnlock } = canUnlockNode(ln.data.id, unlocked, threads);
      ln.state = canUnlock ? 'available' : 'locked';
    }
  }

  const W = _canvas.width;
  const H = _canvas.height;

  _ctx.clearRect(0, 0, W, H);

  // ── Background: crypt stone + faint runes ─────────────────────────────────
  _drawBackground(W, H, ts);

  // ── Graph layer (with zoom/pan transform) ─────────────────────────────────
  _ctx.save();
  _ctx.translate(_view.dx, _view.dy);
  _ctx.scale(_view.scale, _view.scale);

  _drawEdges(unlocked, ts);
  _drawNodes(ts);

  _ctx.restore();

  // ── Zoom hint (bottom-right, always in screen space) ──────────────────────
  if (_view.scale !== 1 || _view.dx !== 0 || _view.dy !== 0) {
    _ctx.save();
    _ctx.fillStyle = 'rgba(216,210,192,0.25)';
    _ctx.font = '10px monospace';
    _ctx.textAlign = 'right';
    _ctx.fillText(`${(_view.scale * 100) | 0}%  scroll=zoom  drag=pan`, W - 8, H - 8);
    _ctx.restore();
  }

  _lastTs  = ts;
  _dirty   = false;
}

// ---------------------------------------------------------------------------
// Background: crypt stone + faint rune symbols
// ---------------------------------------------------------------------------

/**
 * Build a cache of runic background glyphs — placed randomly, drawn at ~0.07 alpha.
 * Very cheap to render (just strokes). Re-seeded on canvas resize.
 */
function _buildRuneCache(W, H) {
  let rng = 99371;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };

  const RUNE_KEYS = ['triple-stroke', 'cross', 'square', 'triangle-up', 'diamond', 'circle', 'arrow-up'];
  const COUNT = 40;
  const runes = [];
  for (let i = 0; i < COUNT; i++) {
    runes.push({
      x:     rand() * W,
      y:     rand() * H,
      r:     18 + rand() * 28,
      key:   RUNE_KEYS[Math.floor(rand() * RUNE_KEYS.length)],
      alpha: 0.03 + rand() * 0.05,
      // slight breathe offset so they don't all pulse in sync
      phase: rand() * Math.PI * 2,
    });
  }
  return runes;
}

function _drawBackground(W, H, ts) {
  // Base fill — Shadow Ink
  _ctx.fillStyle = C.bg;
  _ctx.fillRect(0, 0, W, H);

  // Very faint tile grid suggestion — a few subtle horizontal lines
  _ctx.save();
  _ctx.strokeStyle = rgba(C.tileGrid, 0.06);
  _ctx.lineWidth = 1;
  const gridStep = 48;
  for (let y = gridStep; y < H; y += gridStep) {
    _ctx.beginPath();
    _ctx.moveTo(0, y);
    _ctx.lineTo(W, y);
    _ctx.stroke();
  }
  for (let x = gridStep; x < W; x += gridStep) {
    _ctx.beginPath();
    _ctx.moveTo(x, 0);
    _ctx.lineTo(x, H);
    _ctx.stroke();
  }
  _ctx.restore();

  // Faint runic glyphs — "engravings in stone"
  if (!_runeCache) _runeCache = _buildRuneCache(W, H);

  const t = ts / 1000;
  _ctx.save();
  _ctx.strokeStyle = C.textDim;
  _ctx.lineWidth = 1;
  for (const ru of _runeCache) {
    // Very slow breathing — period ~8s, amplitude ±0.02 alpha
    const breathe = ru.alpha + 0.02 * Math.sin(t * 0.4 + ru.phase);
    _ctx.globalAlpha = Math.max(0, breathe);
    drawGlyph(_ctx, ru.key, ru.x, ru.y, ru.r);
    _ctx.stroke();
  }
  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Edge rendering — quadratic Bezier curves
// ---------------------------------------------------------------------------

/**
 * For each edge, draw a quadratic Bezier with the control point offset
 * perpendicular to the edge by 15% of the edge length.
 * Active edges (both nodes unlocked): warm gold gradient, thicker.
 * Inactive edges: dim #3a3a4a at 25% alpha.
 */
function _drawEdges(unlocked, ts) {
  for (const edge of _edges) {
    const { from, to } = edge;
    const bothUnlocked = unlocked.includes(from.data.id) && unlocked.includes(to.data.id);

    const x1 = from.x, y1 = from.y;
    const x2 = to.x,   y2 = to.y;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Perpendicular offset for Bezier control point (15% of edge length)
    const perp  = len * 0.15;
    const nx    = -dy / len;
    const ny    =  dx / len;
    const cpX   = (x1 + x2) / 2 + nx * perp;
    const cpY   = (y1 + y2) / 2 + ny * perp;

    _ctx.save();
    _ctx.beginPath();
    _ctx.moveTo(x1, y1);
    _ctx.quadraticCurveTo(cpX, cpY, x2, y2);

    if (bothUnlocked) {
      // Active edge: gradient from class accent → ember gold
      const accent  = from.color;
      const grad    = _ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, rgba(accent, 0.85));
      grad.addColorStop(1, rgba(C.available, 0.85));
      _ctx.strokeStyle = grad;
      _ctx.lineWidth   = 2;
      _ctx.shadowColor = accent;
      _ctx.shadowBlur  = 6;
    } else {
      _ctx.strokeStyle = rgba(C.edgeLocked, 0.25);
      _ctx.lineWidth   = 1;
      _ctx.shadowBlur  = 0;
    }
    _ctx.stroke();
    _ctx.restore();

    // Active edges: 2 slow drift sparks along the Bezier
    if (bothUnlocked) {
      _drawEdgeSparks(edge, cpX, cpY, ts);
    }
  }
}

/**
 * Draw 2 sparks drifting along the quadratic Bezier of an active edge.
 * Speed: 0.0015/frame (very slow, per ТЗ §5).
 */
function _drawEdgeSparks(edge, cpX, cpY, ts) {
  const { from, to } = edge;
  // Two sparks offset by 0.5 so they're on opposite halves
  const tOffsets = [((ts * 0.0015) % 1), ((ts * 0.0015 + 0.5) % 1)];
  for (const t of tOffsets) {
    // Quadratic Bezier point: B(t) = (1-t)²·P0 + 2(1-t)t·CP + t²·P1
    const it = 1 - t;
    const sx = it * it * from.x + 2 * it * t * cpX + t * t * to.x;
    const sy = it * it * from.y + 2 * it * t * cpY + t * t * to.y;

    _ctx.save();
    _ctx.globalAlpha = 0.7 + 0.3 * Math.sin(ts / 400 + t * Math.PI * 2);
    _ctx.shadowColor = from.color;
    _ctx.shadowBlur  = 8;
    _ctx.fillStyle   = C.available;
    _ctx.beginPath();
    _ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Node rendering
// ---------------------------------------------------------------------------

function _drawNodes(ts) {
  const tsS = ts / 1000;

  for (const ln of _nodes) {
    const { data, x, y, radius, color, state } = ln;
    const isUnlocked  = state === 'unlocked';
    const isAvailable = state === 'available';
    const isHovered   = _hoveredId === data.id;
    const isSelected  = _selectedId === data.id;

    // Pulse sin for available nodes — period 1.6s (ω = 2π/1.6 ≈ 3.93)
    const pulse   = isAvailable ? (Math.sin(tsS * 3.93) * 0.5 + 0.5) : 0;
    // Quieter pulse for unlocked glow — period 3s
    const gPulse  = isUnlocked  ? (Math.sin(tsS * 2.09) * 0.5 + 0.5) : 0;

    _ctx.save();

    // ── Outer glow / pulse ring ───────────────────────────────────────────
    if (isAvailable) {
      // Pulsing outer ring: alpha 0.5↔1.0 (ТЗ §4)
      const ringAlpha = 0.5 + pulse * 0.5;
      _ctx.save();
      _ctx.shadowColor = color;
      _ctx.shadowBlur  = 8;
      hexPath(_ctx, x, y, radius + 4);
      _ctx.strokeStyle = rgba(color, ringAlpha);
      _ctx.lineWidth   = 1.5;
      _ctx.stroke();
      _ctx.restore();
    }
    if (isUnlocked) {
      // Static halo with quiet pulse — 12px blur, class-accent 40% → 30%↔50%
      const haloAlpha = 0.30 + gPulse * 0.20;
      _ctx.save();
      _ctx.shadowColor = color;
      _ctx.shadowBlur  = 12;
      hexPath(_ctx, x, y, radius + 6);
      _ctx.strokeStyle = rgba(color, haloAlpha);
      _ctx.lineWidth   = 1.5;
      _ctx.stroke();
      _ctx.restore();
    }

    // ── Hex fill ──────────────────────────────────────────────────────────
    hexPath(_ctx, x, y, radius);
    if (isUnlocked) {
      // Warm gradient: centre #3a2418 → rim #1a1a24
      const grad = _ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0,   '#3a2418');
      grad.addColorStop(1,   C.tileGrid);
      _ctx.fillStyle = grad;
    } else {
      _ctx.fillStyle = C.tileGrid;
    }
    _ctx.fill();

    // ── Hex border ────────────────────────────────────────────────────────
    hexPath(_ctx, x, y, radius);
    if (isUnlocked) {
      _ctx.strokeStyle = color;
      _ctx.lineWidth   = 1.5;
    } else if (isAvailable) {
      _ctx.strokeStyle = C.available;
      _ctx.lineWidth   = 1;
    } else {
      _ctx.strokeStyle = rgba(C.locked, 0.5);
      _ctx.lineWidth   = 1;
    }
    _ctx.stroke();

    // ── Hover inset: 2px inner hex ring ───────────────────────────────────
    if (isHovered || isSelected) {
      hexPath(_ctx, x, y, radius - 3);
      _ctx.strokeStyle = rgba(C.available, 0.6);
      _ctx.lineWidth   = 1;
      _ctx.stroke();
    }

    // ── Runic glyph inside hex ────────────────────────────────────────────
    const gKey      = glyphForNode(data);
    const innerR    = radius * 0.55;
    const glyphAlpha = isUnlocked ? 1.0 : isAvailable ? 0.70 : 0.30;
    const glyphColor = isUnlocked ? lighten(color, 0.15)
                     : isAvailable ? C.available
                     : C.locked;
    _ctx.save();
    _ctx.globalAlpha = glyphAlpha;
    _ctx.strokeStyle = glyphColor;
    _ctx.lineWidth   = 1.2;
    _ctx.shadowColor = isUnlocked ? color : 'transparent';
    _ctx.shadowBlur  = isUnlocked ? 4 : 0;
    drawGlyph(_ctx, gKey, x, y, innerR);
    _ctx.stroke();
    _ctx.restore();

    // ── Keystone unlocked: rotating 6-dot halo ────────────────────────────
    if (data.type === 'keystone' && isUnlocked) {
      const dotR   = radius * 1.5;
      // 60-second full rotation (ω = 2π/60 ≈ 0.1047)
      const rot    = _lastTs / 1000 * 0.1047;
      _ctx.save();
      _ctx.fillStyle = rgba(color, 0.6);
      for (let d = 0; d < 6; d++) {
        const a  = rot + (d / 6) * Math.PI * 2;
        const dx = x + dotR * Math.cos(a);
        const dy = y + dotR * Math.sin(a);
        _ctx.beginPath();
        _ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        _ctx.fill();
      }
      _ctx.restore();
    }

    // ── Label below hex ───────────────────────────────────────────────────
    const labelAlpha = isUnlocked ? 0.9 : isAvailable ? 0.65 : 0.3;
    _ctx.globalAlpha  = labelAlpha;
    _ctx.fillStyle    = isUnlocked ? C.textPrimary : isAvailable ? C.textPrimary : C.textDim;
    _ctx.font         = `11px "Cinzel", Georgia, serif`;
    _ctx.textAlign    = 'center';
    _ctx.textBaseline = 'top';
    _ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    _ctx.shadowBlur   = 3;

    const labelLines = _wrapLabel(data.name, radius);
    const labelY     = y + radius + 5;
    labelLines.forEach((line, i) => {
      _ctx.fillText(line, x, labelY + i * 13);
    });

    _ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Right panel updates
// ---------------------------------------------------------------------------

/**
 * Update the `.sigil-panel` DOM element with info from the selected node.
 * Called on canvas click; also called with null to clear the panel.
 */
function _updateRightPanel(ln) {
  const panel = document.getElementById('sigil-panel');
  if (!panel) return;

  if (!ln) {
    panel.innerHTML = _emptyPanelHTML();
    return;
  }

  const state    = getState();
  const unlocked = state.passives?.unlocked || [];
  const threads  = state.passives?.leyThreads || 0;
  const node     = ln.data;

  const isUnlocked = unlocked.includes(node.id);
  const { canUnlock, reason } = canUnlockNode(node.id, unlocked, threads);

  const typeBadge = {
    minor:    'MINOR',
    major:    'MAJOR',
    keystone: 'KEYSTONE',
  }[node.type] || node.type.toUpperCase();

  const reqNames = node.requires
    .map(id => PASSIVE_NODES_MAP[id]?.name || id)
    .join(', ');

  const accent = ln.color;

  let actionHTML;
  if (isUnlocked) {
    actionHTML = `<div class="sp-status sp-status-unlocked">Unlocked</div>`;
  } else if (canUnlock) {
    actionHTML = `<button class="sp-unlock-btn" id="sp-unlock-btn">Unlock &mdash; ${node.cost} Sigil${node.cost > 1 ? 's' : ''}</button>`;
  } else {
    actionHTML = `<div class="sp-status sp-status-locked">${reason || 'Locked'}</div>`;
  }

  panel.innerHTML = `
    <div class="sp-node-name" style="color:${C.available}">${node.name.toUpperCase()}</div>
    <div class="sp-type-badge">${typeBadge} &bull; ${node.cost} Sigil${node.cost > 1 ? 's' : ''}</div>
    <div class="sp-divider"></div>
    <div class="sp-desc">${node.description}</div>
    ${reqNames ? `<div class="sp-req">Requires: ${reqNames}</div>` : ''}
    <div class="sp-spacer"></div>
    ${actionHTML}
  `;

  const unlockBtn = document.getElementById('sp-unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      _doUnlock(node.id);
      // Re-render panel after unlock
      _updateRightPanel(_nodes.find(n => n.data.id === node.id) || null);
    });
  }
}

function _emptyPanelHTML() {
  return `<div class="sp-empty">Select a node to view details</div>`;
}

// ---------------------------------------------------------------------------
// Unlock
// ---------------------------------------------------------------------------

function _doUnlock(nodeId) {
  const state    = getState();
  const passives = state.passives;
  if (!passives) return;

  const node = PASSIVE_NODES_MAP[nodeId];
  if (!node)  return;

  const { canUnlock, reason } = canUnlockNode(nodeId, passives.unlocked, passives.leyThreads);
  if (!canUnlock) {
    showNotification(reason || 'Cannot unlock', 'warning');
    return;
  }

  passives.leyThreads -= node.cost;
  passives.unlocked.push(nodeId);
  saveState();

  showNotification(`Unlocked: ${node.name}`, 'success');
  PassiveTreeCanvas.refresh();
  _refreshCounters(passives);

  // Re-select to update panel action button
  const selectedLn = _nodes.find(n => n.data.id === nodeId);
  if (selectedLn) _updateRightPanel(selectedLn);
}

function _refreshCounters(passives) {
  const el1 = document.getElementById('passives-threads-value');
  const el2 = document.getElementById('passives-header-threads');
  if (el1) el1.textContent = passives.leyThreads;
  if (el2) el2.textContent = passives.leyThreads;
}

// ---------------------------------------------------------------------------
// Hit-test: return layout node under canvas coords, or null
// ---------------------------------------------------------------------------

function _hitTest(mx, my) {
  // Convert canvas coords to graph-local coords (zoom+pan transform)
  const inv = 1 / _view.scale;
  const gx  = (mx - _view.dx) * inv;
  const gy  = (my - _view.dy) * inv;

  for (let i = _nodes.length - 1; i >= 0; i--) {
    const ln   = _nodes[i];
    const dx   = gx - ln.x;
    const dy   = gy - ln.y;
    const hitR = ln.radius + 6;
    if (dx * dx + dy * dy <= hitR * hitR) return ln;
  }
  return null;
}

function _canvasCoords(e) {
  const rect   = _canvas.getBoundingClientRect();
  const scaleX = _canvas.width  / rect.width;
  const scaleY = _canvas.height / rect.height;
  return {
    mx: (e.clientX - rect.left) * scaleX,
    my: (e.clientY - rect.top)  * scaleY,
  };
}

// ---------------------------------------------------------------------------
// Label wrapping: max 2 lines
// ---------------------------------------------------------------------------

function _wrapLabel(name, radius) {
  const maxChars = Math.max(8, Math.floor(radius * 1.6));
  if (name.length <= maxChars) return [name];

  const words = name.split(' ');
  if (words.length === 1) return [name.slice(0, maxChars - 1) + '…'];

  let line1 = '', line2 = '';
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    if (!line1)                              line1 = w;
    else if ((line1 + ' ' + w).length <= maxChars) line1 += ' ' + w;
    else { line2 = words.slice(wi).join(' '); break; }
  }
  if (line2.length > maxChars) line2 = line2.slice(0, maxChars - 1) + '…';
  return line2 ? [line1, line2] : [line1];
}
