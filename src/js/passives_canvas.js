/**
 * passives_canvas.js — Skyrim-style constellation visualiser for the Sigil Tree passive tree.
 *
 * Renders passive nodes as stars on a dark cosmic background, connected by
 * glowing constellation lines. Nodes are arranged in concentric arcs by tier
 * (minor → major → keystone), Universal nodes in a separate top-left cluster.
 *
 * Public API:
 *   PassiveTreeCanvas.init(containerEl)  — attach canvas to DOM, start render loop
 *   PassiveTreeCanvas.refresh()          — call after state changes (unlock / respec)
 *   PassiveTreeCanvas.destroy()          — stop loop, remove canvas
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
// Constants
// ---------------------------------------------------------------------------

/** Class accent colours */
const CLASS_COLORS = {
  pyromancer:  '#ff6b35',
  stormcaller: '#64b5f6',
  tidecaster:  '#26c6da',
  geomancer:   '#a5d6a7',
  universal:   '#ffd54f'
};

/**
 * Node hex-cell outer radius (circumradius of the hexagon).
 * Minor = small hex, Keystone = large glowing hex.
 */
const STAR_RADIUS = {
  minor:    14,
  major:    21,
  keystone: 32
};

/** Number of constellation particles per active (both-unlocked) edge */
const PARTICLES_PER_EDGE = 4;

/** Total background stars to scatter across the canvas */
const BG_STAR_COUNT = 320;

// Constellation arc layout parameters (radii from the class tree centre)
const ARC_RADIUS = {
  // Minor nodes that have no prerequisites → starter ring close to centre
  innerMinor: 80,
  // All other minor + major nodes
  mid:        180,
  // Keystones
  outer:      290
};

// The class tree occupies the right ~80% of the canvas; Universal cluster is top-left
const UNIV_CLUSTER_X_FRAC = 0.12; // fraction of canvas width
const UNIV_CLUSTER_Y_FRAC = 0.18; // fraction of canvas height

// Angular arc that class nodes spread over (radians).
// ~220° so the arc doesn't wrap all the way around and leave gaps.
const CLASS_ARC_SPAN = (220 / 180) * Math.PI;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _canvas    = null;
let _ctx       = null;
let _container = null;
let _rafId     = null;

/** Accumulated rotation (radians) for the central runic sigil */
let _sigilRot  = 0;

/** Computed layout nodes — { data, x, y, radius, color, state } */
let _nodes     = [];
/** Edges — { from: layoutNode, to: layoutNode } */
let _edges     = [];
/** Particles — { edge, t, speed } */
let _particles = [];

let _tooltip   = null;   // DOM overlay
let _hoveredId = null;
let _lastTs    = 0;      // timestamp from last RAF for delta-time
let _roHandle  = null;   // ResizeObserver

// Cached static star field — regenerated when canvas dimensions change
let _starCache = null;

// Parallax mouse state: smoothed normalised position in range -0.5..0.5
let _mx = 0;   // current smoothed X
let _my = 0;   // current smoothed Y
let _targetMX = 0;  // raw normalised from last mousemove
let _targetMY = 0;

// Last known raw canvas mouse coords (used for cursor-beam feature)
let _rawMouseX = 0;
let _rawMouseY = 0;

// ── Zoom / pan view transform ─────────────────────────────────────────────
// Applied to the graph layer only (nodes, edges, particles).
// Background (stars, nebulae) stays fixed.
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.5;
let _view = { scale: 1, dx: 0, dy: 0 };

// Drag state (null when not dragging)
let _drag = null; // { startX, startY, startDx, startDy }

/**
 * Falling gold sparks — SHOULD 6
 * Each spark: { x, y, vx, vy, alpha, r }
 * Initialised once; wraps around when spark falls off the bottom.
 */
const SPARK_COUNT = 25;
let _sparks = [];

// ---------------------------------------------------------------------------
// Public API (object export keeps the same interface as the previous version)
// ---------------------------------------------------------------------------

export const PassiveTreeCanvas = {

  /**
   * Attach canvas to containerEl and start the render loop.
   * @param {HTMLElement} containerEl
   */
  init(containerEl) {
    _container = containerEl;

    _canvas = document.createElement('canvas');
    _canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default;';
    containerEl.appendChild(_canvas);

    _ctx = _canvas.getContext('2d');

    // Tooltip overlay (positioned absolutely inside the container)
    _tooltip = document.createElement('div');
    _tooltip.className = 'ptc-tooltip';
    _tooltip.style.display = 'none';
    containerEl.style.position = 'relative';
    containerEl.appendChild(_tooltip);

    // Keep pixel dimensions in sync with CSS layout
    _roHandle = new ResizeObserver(() => this._resize());
    _roHandle.observe(containerEl);
    this._resize();

    // Seed falling sparks (SHOULD 6)
    _initSparks();

    // Input
    _canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    _canvas.addEventListener('mouseleave', () => { _hideTooltip(); _drag = null; });
    _canvas.addEventListener('click',      e => this._onClick(e));
    _canvas.addEventListener('wheel',      e => this._onWheel(e), { passive: false });
    _canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    _canvas.addEventListener('mouseup',    () => { _drag = null; _canvas.style.cursor = _hoveredId ? 'pointer' : 'default'; });

    this.refresh();
    this._startLoop();
  },

  /** Recompute layout and particle set from current game state. */
  refresh() {
    _computeLayout();
    _rebuildParticles();
  },

  /** Stop loop and remove DOM elements. */
  destroy() {
    if (_rafId)    cancelAnimationFrame(_rafId);
    if (_roHandle) _roHandle.disconnect();
    if (_canvas)   _canvas.remove();
    if (_tooltip)  _tooltip.remove();
    _canvas = _ctx = _container = _tooltip = _roHandle = null;
    _nodes = _edges = _particles = [];
    _view = { scale: 1, dx: 0, dy: 0 };
    _drag = null;
  },

  // ---- internal helpers ----

  _resize() {
    if (!_canvas || !_container) return;
    const r = _container.getBoundingClientRect();
    _canvas.width  = r.width;
    _canvas.height = r.height;
    _starCache = null;  // invalidate star field
    _computeLayout();
    _rebuildParticles();
  },

  _startLoop() {
    const loop = ts => {
      _drawFrame(ts);
      _rafId = requestAnimationFrame(loop);
    };
    _rafId = requestAnimationFrame(loop);
  },

  _onMouseMove(e) {
    if (!_canvas) return;
    const { mx, my } = _canvasCoords(e);

    // Drag-to-pan
    if (_drag) {
      _view.dx = _drag.startDx + (mx - _drag.startX);
      _view.dy = _drag.startDy + (my - _drag.startY);
      _canvas.style.cursor = 'grabbing';
      return; // skip tooltip while dragging
    }

    // Update raw mouse for cursor-beam effect
    _rawMouseX = mx;
    _rawMouseY = my;

    // Update parallax target (normalised -0.5..0.5)
    _targetMX = mx / _canvas.width  - 0.5;
    _targetMY = my / _canvas.height - 0.5;

    const hit = _getNodeAt(mx, my);
    if (hit) {
      _canvas.style.cursor = 'pointer';
      _hoveredId = hit.data.id;
      _showTooltip(hit, e.clientX - _canvas.getBoundingClientRect().left,
                        e.clientY - _canvas.getBoundingClientRect().top);
    } else {
      _canvas.style.cursor = 'default';
      _hoveredId = null;
      _hideTooltip();
    }
  },

  _onWheel(e) {
    e.preventDefault();
    if (!_canvas) return;
    const { mx, my } = _canvasCoords(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, _view.scale * factor));
    if (newScale === _view.scale) return;
    // Zoom toward cursor position
    _view.dx = mx + (_view.dx - mx) * (newScale / _view.scale);
    _view.dy = my + (_view.dy - my) * (newScale / _view.scale);
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
    const hit = _getNodeAt(mx, my);
    if (!hit) return;

    const state    = getState();
    const passives = state.passives || {};
    const unlocked = passives.unlocked || [];

    if (unlocked.includes(hit.data.id)) return; // already unlocked

    const { canUnlock, reason } = canUnlockNode(hit.data.id, unlocked, passives.leyThreads || 0);
    if (!canUnlock) {
      showNotification(reason || 'Cannot unlock', 'warning');
      return;
    }
    _confirmUnlock(hit);
  }
};

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------

/**
 * Compute pixel positions for every node.
 *
 * Universal nodes: small cluster in the top-left corner, arranged in a
 * tight grid / radial scatter.
 *
 * Class nodes: arranged on concentric circular arcs centred in the middle
 * of the right portion of the canvas.
 *   - Starter minors (requires:[])  → inner arc  (r = 80)
 *   - Other minors + all majors     → mid arc     (r = 180)
 *   - Keystones                     → outer arc   (r = 290)
 */
function _computeLayout() {
  if (!_canvas) return;

  const W = _canvas.width;
  const H = _canvas.height;

  _nodes = [];
  _edges = [];

  const univLMap  = {};   // id → layoutNode  (universal)
  const classLMap = {};   // id → layoutNode  (class)

  // ---- Universal cluster (top-left) ----
  const univNodes = getUniversalNodes();
  const uCX = W * UNIV_CLUSTER_X_FRAC;
  const uCY = H * UNIV_CLUSTER_Y_FRAC;
  const uCount = univNodes.length;

  univNodes.forEach((n, i) => {
    // Arrange in a small radial fan, 2 rows
    const cols   = Math.ceil(uCount / 2);
    const col    = i % cols;
    const row    = Math.floor(i / cols);
    const xStep  = 52;
    const yStep  = 48;
    const xOff   = (col - (cols - 1) / 2) * xStep;
    const yOff   = (row - 0.5) * yStep;

    const ln = {
      data:   n,
      x:      uCX + xOff,
      y:      uCY + yOff,
      radius: STAR_RADIUS[n.type] || STAR_RADIUS.minor,
      color:  CLASS_COLORS.universal,
      state:  'locked'   // resolved each frame in _drawFrame
    };
    _nodes.push(ln);
    univLMap[n.id] = ln;
  });

  // ---- Class nodes (concentric arcs) ----
  const state     = getState();
  const classType = state.classType || null;

  if (classType) {
    const classNodes = getClassNodes(classType);
    const color      = CLASS_COLORS[classType] || CLASS_COLORS.universal;

    // Arc centre — horizontally centred in the right 75% of the canvas
    const cx = W * 0.55;
    const cy = H * 0.52;

    // Split nodes into layout tiers
    const starterMinors = classNodes.filter(n => n.type === 'minor' && n.requires.length === 0);
    const otherMinors   = classNodes.filter(n => n.type === 'minor' && n.requires.length > 0);
    const majors        = classNodes.filter(n => n.type === 'major');
    const keystones     = classNodes.filter(n => n.type === 'keystone');

    // Mid arc holds other minors + majors together, sorted so minors come first
    const midNodes = [...otherMinors, ...majors];

    const placeOnArc = (arr, arcR, startAngle) => {
      const count = arr.length;
      if (count === 0) return;
      const span  = count === 1 ? 0 : CLASS_ARC_SPAN;
      const step  = count === 1 ? 0 : span / (count - 1);
      arr.forEach((n, i) => {
        const angle = startAngle + i * step;
        const ln = {
          data:   n,
          x:      cx + arcR * Math.cos(angle),
          y:      cy + arcR * Math.sin(angle),
          radius: STAR_RADIUS[n.type] || STAR_RADIUS.minor,
          color,
          state:  'locked'
        };
        _nodes.push(ln);
        classLMap[n.id] = ln;
      });
    };

    // Arc start angle: rotated so the arc fans downward-ish (top = −90° offset)
    const BASE_ANGLE = -Math.PI / 2 - CLASS_ARC_SPAN / 2;

    placeOnArc(starterMinors, ARC_RADIUS.innerMinor, BASE_ANGLE);
    placeOnArc(midNodes,      ARC_RADIUS.mid,        BASE_ANGLE);
    placeOnArc(keystones,     ARC_RADIUS.outer,      BASE_ANGLE);

    // Build edges from requires[] relationships
    const allLMap = { ...univLMap, ...classLMap };
    for (const n of classNodes) {
      const toLn = classLMap[n.id];
      if (!toLn) continue;
      for (const reqId of n.requires) {
        const fromLn = allLMap[reqId];
        if (fromLn) _edges.push({ from: fromLn, to: toLn });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Particle system
// ---------------------------------------------------------------------------

function _rebuildParticles() {
  _particles = [];
  const unlocked = (getState().passives?.unlocked) || [];

  for (const edge of _edges) {
    const bothUnlocked =
      unlocked.includes(edge.from.data.id) &&
      unlocked.includes(edge.to.data.id);
    if (!bothUnlocked) continue;

    for (let i = 0; i < PARTICLES_PER_EDGE; i++) {
      _particles.push({
        edge,
        t:     i / PARTICLES_PER_EDGE,
        speed: 0.0025 + Math.random() * 0.0015
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Main render loop
// ---------------------------------------------------------------------------

function _drawFrame(ts) {
  if (!_ctx || !_canvas) return;

  const dt = Math.min((ts - _lastTs) / 1000, 0.05); // seconds, capped at 50ms
  _lastTs  = ts;

  // Smooth parallax follow — lerp factor 0.08 per frame (independent of dt for feel)
  _mx += (_targetMX - _mx) * 0.08;
  _my += (_targetMY - _my) * 0.08;

  const W       = _canvas.width;
  const H       = _canvas.height;
  const state   = getState();
  const unlocked = (state.passives?.unlocked) || [];
  // leyThreads field kept for save compat; displayed as "Sigils"
  const threads  = state.passives?.leyThreads || 0;

  // Resolve node states (unlocked / available / locked)
  for (const ln of _nodes) {
    if (unlocked.includes(ln.data.id)) {
      ln.state = 'unlocked';
    } else {
      const { canUnlock } = canUnlockNode(ln.data.id, unlocked, threads);
      ln.state = canUnlock ? 'available' : 'locked';
    }
  }

  // ---- Clear ----
  _ctx.clearRect(0, 0, W, H);

  // ---- Cosmic background ----
  _ctx.fillStyle = '#030508';
  _ctx.fillRect(0, 0, W, H);

  // Nebula cloud layer drawn first, under stars
  _drawNebula(W, H, ts);
  _drawStars(W, H, ts);

  // Decorative magic circle — very faint arcane substrate
  _drawMagicCircle(W, H, state.classType);

  // Falling gold sparks (not affected by zoom/pan)
  _updateAndDrawSparks(dt, W, H, ts);

  // Graph parallax offset (reduced when zoomed in)
  const parallaxFactor = Math.max(0, 1 - (_view.scale - 1) * 0.5);
  const gOX = _mx * 12 * parallaxFactor + _view.dx;
  const gOY = _my * 12 * parallaxFactor + _view.dy;

  // Apply view transform to graph layer
  _ctx.save();
  _ctx.translate(_view.dx, _view.dy);
  _ctx.scale(_view.scale, _view.scale);
  const invScale = 1 / _view.scale;

  // Compute graph-local offsets (parallax only, no pan — pan is in ctx transform)
  const pOX = _mx * 12 * parallaxFactor;
  const pOY = _my * 12 * parallaxFactor;

  // ---- Universal cluster label ----
  _ctx.font      = `${10 * invScale}px "Cinzel", serif`;
  _ctx.fillStyle = 'rgba(255, 213, 79, 0.4)';
  _ctx.textAlign = 'center';
  _ctx.fillText('UNIVERSAL', W * UNIV_CLUSTER_X_FRAC + pOX, H * UNIV_CLUSTER_Y_FRAC - 58 + pOY);

  // ---- Class label ----
  if (state.classType) {
    _ctx.font      = `${11 * invScale}px "Cinzel", serif`;
    _ctx.fillStyle = `${_colorWithAlpha(CLASS_COLORS[state.classType] || '#ffffff', 0.35)}`;
    _ctx.textAlign = 'center';
    _ctx.fillText(state.classType.toUpperCase(), W * 0.55 + pOX, H * 0.52 - ARC_RADIUS.outer - 22 + pOY);
  }

  // ---- Edges ----
  for (const edge of _edges) {
    const fromU = unlocked.includes(edge.from.data.id);
    const toU   = unlocked.includes(edge.to.data.id);
    _drawEdge(edge.from, edge.to, fromU && toU, pOX, pOY, ts);
  }

  // ---- Particles ----
  for (const p of _particles) {
    p.t += p.speed;
    if (p.t > 1) p.t -= 1;
    _drawParticle(p, ts, pOX, pOY);
  }

  // ---- Cursor beams ----
  // Convert raw mouse to graph space for beam origin check
  const gMouseX = (_rawMouseX - _view.dx) * invScale;
  const gMouseY = (_rawMouseY - _view.dy) * invScale;
  _drawCursorBeams(unlocked, pOX, pOY, gMouseX, gMouseY);

  // ---- Nodes ----
  for (const ln of _nodes) {
    _drawNode(ln, ts, pOX, pOY);
  }

  _ctx.restore();

  // ---- Zoom hint (fade in when zoomed, then fade) ----
  if (_view.scale !== 1 || (_view.dx !== 0 || _view.dy !== 0)) {
    _ctx.save();
    _ctx.fillStyle = 'rgba(255,255,255,0.18)';
    _ctx.font = '10px monospace';
    _ctx.textAlign = 'right';
    _ctx.fillText(`${(_view.scale * 100) | 0}%  scroll=zoom  drag=pan`, W - 8, H - 8);
    _ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Falling gold sparks (SHOULD 6)
// ---------------------------------------------------------------------------

/**
 * Seed the _sparks array with randomised starting positions spread across
 * the full canvas height so sparks don't all spawn at once on init.
 */
function _initSparks() {
  _sparks = [];
  const W = _canvas ? _canvas.width  : 800;
  const H = _canvas ? _canvas.height : 600;
  for (let i = 0; i < SPARK_COUNT; i++) {
    _sparks.push(_makeSpark(W, H, /* randomY */ true));
  }
}

/**
 * Create a single spark with randomised properties.
 * @param {number} W - canvas width
 * @param {number} H - canvas height
 * @param {boolean} randomY - if true, start at random Y (for init); else spawn at top
 */
function _makeSpark(W, H, randomY = false) {
  return {
    x:     Math.random() * W,
    y:     randomY ? Math.random() * H : -4,
    vy:    8 + Math.random() * 12,          // fall speed px/sec (8–20)
    vxAmp: 10 + Math.random() * 20,         // sinusoidal X drift amplitude
    phase: Math.random() * Math.PI * 2,     // random phase offset
    freq:  0.4 + Math.random() * 0.8,       // oscillation frequency
    alpha: 0.3 + Math.random() * 0.3,       // base alpha 0.3–0.6
    r:     1,                               // radius 1px per spec
  };
}

/**
 * Advance each spark by dt seconds and draw. Wraps sparks that fall off the bottom.
 */
function _updateAndDrawSparks(dt, W, H, ts) {
  const t = ts / 1000;
  _ctx.save();
  _ctx.fillStyle = 'rgba(201,168,76,1)';  // gold

  for (const sp of _sparks) {
    // Advance position
    sp.y += sp.vy * dt;
    // Sinusoidal X drift
    const driftX = Math.sin(t * sp.freq + sp.phase) * sp.vxAmp;
    const drawX  = sp.x + driftX;

    // Wrap when off the bottom
    if (sp.y > H + 4) {
      sp.y = -4;
      sp.x = Math.random() * W;
    }

    // Draw
    _ctx.globalAlpha = sp.alpha;
    _ctx.beginPath();
    _ctx.arc(drawX, sp.y, sp.r, 0, Math.PI * 2);
    _ctx.fill();
  }

  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: background stars
// ---------------------------------------------------------------------------

/**
 * Draws real-looking space nebulae using layered elliptical gradients.
 * Inspired by emission nebulae (Orion, Eagle, Lagoon) — warm reds/oranges,
 * cool blues/teals, bright star clusters embedded in dense regions.
 * Uses a slow breathing animation for a living-cosmos feel.
 */
function _drawNebula(W, H, ts) {
  const t = ts / 1000;

  // ── Layer 1: large diffuse background clouds ──────────────────────────────
  const bgClouds = [
    // [cxF, cyF, rx, ry, rot, r, g, b, alpha0, alpha1]
    // Large emission cloud (red hydrogen, Orion-like)
    [ 0.55, 0.50, 340, 240, 0.2,  210, 55, 40,  0.00, 0.16 ],
    // Outer purple/blue haze
    [ 0.50, 0.48, 380, 280, -0.1, 60,  35, 140, 0.00, 0.10 ],
    // Right-side teal reflection
    [ 0.72, 0.55, 240, 160, 0.4,  30, 110, 180, 0.00, 0.09 ],
    // Left cluster — blue stellar nursery
    [ 0.32, 0.52, 200, 160, -0.3, 40,  80, 200, 0.00, 0.08 ],
  ];

  for (const [cxF, cyF, rx, ry, rot, r, g, b, a0, a1] of bgClouds) {
    const cx = W * cxF;
    const cy = H * cyF;
    _ctx.save();
    _ctx.translate(cx, cy);
    _ctx.rotate(rot);
    _ctx.scale(1, ry / rx);
    const grad = _ctx.createRadialGradient(0, 0, rx * a0, 0, 0, rx);
    grad.addColorStop(0,   `rgba(${r},${g},${b},${a1})`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},${(a1 * 0.5).toFixed(3)})`);
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    _ctx.fillStyle = grad;
    _ctx.beginPath();
    _ctx.arc(0, 0, rx, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.restore();
  }

  // ── Layer 2: bright inner nebula cores (hot spots) ────────────────────────
  const hotSpots = [
    // Bright emission core — red/orange, like Trapezium in Orion
    [ 0.60, 0.46, 120,  80, 0.3,  240, 100, 50, 0.22 ],
    // Oxygen region — teal/green
    [ 0.64, 0.52,  90,  60, 0.6,  60, 200, 170, 0.18 ],
    // Golden star-forming region
    [ 0.55, 0.42,  80,  55, -0.2, 255, 200, 80, 0.15 ],
    // Purple Herbig-Haro jets
    [ 0.48, 0.58, 100,  50, 0.8,  140, 50, 200, 0.14 ],
    // Secondary orange hot spot
    [ 0.70, 0.44,  70,  50, -0.4, 255, 140, 30, 0.16 ],
    // Blue reflection nebula patch
    [ 0.42, 0.40,  85,  60,  0.5,  80, 160, 240, 0.13 ],
  ];

  const breathe = 1 + 0.04 * Math.sin(t * 0.3);
  for (const [cxF, cyF, rx, ry, rot, r, g, b, alpha] of hotSpots) {
    const cx = W * cxF;
    const cy = H * cyF;
    const a  = alpha * breathe;
    _ctx.save();
    _ctx.translate(cx, cy);
    _ctx.rotate(rot);
    _ctx.scale(1, ry / rx);
    const grad = _ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0,    `rgba(${r},${g},${b},${a.toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},${(a * 0.55).toFixed(3)})`);
    grad.addColorStop(0.7,  `rgba(${r},${g},${b},${(a * 0.15).toFixed(3)})`);
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    _ctx.fillStyle = grad;
    _ctx.beginPath();
    _ctx.arc(0, 0, rx, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.restore();
  }

  // ── Layer 3: bright star clusters embedded in nebulae ────────────────────
  _drawNebulaStarClusters(W, H, ts);
}

/**
 * Colored star clusters within bright nebula regions.
 * Stars have tinted colors based on the nebula region (O-type blue-white,
 * M-type orange-red, young T Tauri yellow-white).
 */
function _drawNebulaStarClusters(W, H, ts) {
  const t = ts / 1000;

  // Seeded deterministic RNG for consistent clusters each session
  let rng = 77431;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };

  const clusters = [
    { cx: 0.60, cy: 0.46, r: 55, count: 55, R: 255, G: 180, B: 140 }, // orange-red stars
    { cx: 0.64, cy: 0.52, r: 45, count: 40, R: 160, G: 230, B: 220 }, // teal-white stars
    { cx: 0.55, cy: 0.42, r: 50, count: 50, R: 255, G: 245, B: 200 }, // yellow-white
    { cx: 0.70, cy: 0.44, r: 40, count: 35, R: 255, G: 200, B: 100 }, // orange hot stars
    { cx: 0.42, cy: 0.40, r: 40, count: 30, R: 160, G: 190, B: 255 }, // blue-white O-type
    { cx: 0.48, cy: 0.58, r: 35, count: 25, R: 200, G: 140, B: 255 }, // purple young stars
  ];

  for (const cl of clusters) {
    const cx = W * cl.cx;
    const cy = H * cl.cy;
    for (let i = 0; i < cl.count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist  = Math.pow(rand(), 0.6) * cl.r; // bias toward center
      const sx    = cx + Math.cos(angle) * dist;
      const sy    = cy + Math.sin(angle) * dist;
      // Star brightness: core cluster brighter
      const brightness = 0.3 + rand() * 0.55;
      const twinkle    = rand() > 0.65 ? 0.15 * Math.sin(t * (1 + rand() * 3) + rand() * 6) : 0;
      const alpha      = Math.max(0, Math.min(1, brightness + twinkle));
      const sr         = rand() * 1.4 + 0.3;

      _ctx.beginPath();
      _ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      _ctx.fillStyle = `rgba(${cl.R},${cl.G},${cl.B},${alpha.toFixed(2)})`;
      _ctx.fill();

      // Occasional "bright star" with a small cross glow
      if (rand() > 0.92) {
        _ctx.save();
        _ctx.globalAlpha = alpha * 0.4;
        _ctx.strokeStyle = `rgba(${cl.R},${cl.G},${cl.B},1)`;
        _ctx.lineWidth = 0.5;
        const gl = sr * 4;
        _ctx.beginPath(); _ctx.moveTo(sx - gl, sy); _ctx.lineTo(sx + gl, sy); _ctx.stroke();
        _ctx.beginPath(); _ctx.moveTo(sx, sy - gl); _ctx.lineTo(sx, sy + gl); _ctx.stroke();
        _ctx.restore();
      }
    }
  }
}

function _drawStars(W, H, ts) {
  // Rebuild cache when canvas size changes (already invalidated in _resize)
  if (!_starCache || _starCache.w !== W || _starCache.h !== H) {
    const stars = [];
    let rng = 12345;
    const rand = () => {
      rng = (rng * 16807) % 2147483647;
      return (rng - 1) / 2147483646;
    };
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      // Classify as near (large, bright) or far (small, dim) for parallax
      const isFar = i < BG_STAR_COUNT * 0.7;
      stars.push({
        x:       rand() * W,
        y:       rand() * H,
        r:       isFar ? rand() * 0.9 + 0.3 : rand() * 1.2 + 0.8,
        baseA:   isFar ? rand() * 0.25 + 0.04 : rand() * 0.35 + 0.15,
        // Some stars twinkle: give them a random phase + speed
        twinkle: rand() > 0.7,
        phase:   rand() * Math.PI * 2,
        freq:    rand() * 1.5 + 0.5,
        far:     isFar
      });
    }
    _starCache = { w: W, h: H, stars };
  }

  const tsS = ts / 1000;
  for (const s of _starCache.stars) {
    const alpha = s.twinkle
      ? s.baseA * (0.6 + 0.4 * Math.sin(tsS * s.freq + s.phase))
      : s.baseA;

    // Parallax offset: far stars move less, near stars more
    const offX = s.far ? _mx * 8 : _mx * 20;
    const offY = s.far ? _my * 8 : _my * 20;

    _ctx.beginPath();
    _ctx.arc(s.x + offX, s.y + offY, s.r, 0, Math.PI * 2);
    _ctx.fillStyle = `rgba(210,225,255,${alpha.toFixed(3)})`;
    _ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Drawing: magic circle (decorative arcane substrate under the node graph)
// ---------------------------------------------------------------------------

/**
 * Renders 3 faint concentric rings and 6 hexagram spokes centred on the class
 * tree origin (W*0.55, H*0.52).  Everything is drawn at very low opacity so
 * the design reads as an atmospheric suggestion rather than a solid UI element.
 *
 * @param {number} W          canvas pixel width
 * @param {number} H          canvas pixel height
 * @param {string|null} classType  used to tint the rings with the class colour
 */
function _drawMagicCircle(W, H, classType) {
  const cx = W * 0.55;
  const cy = H * 0.52;

  // Resolve tint from class colour, falling back to gold
  const baseColor = CLASS_COLORS[classType] || CLASS_COLORS.universal;
  // Parse hex to rgb for rgba() strings
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  _ctx.save();

  // --- Concentric rings ---
  const rings = [
    { radius: 90,  alpha: 0.07 },
    { radius: 185, alpha: 0.05 },
    { radius: 295, alpha: 0.04 },
  ];

  for (const { radius, alpha } of rings) {
    _ctx.beginPath();
    _ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    _ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    _ctx.lineWidth   = 1;
    _ctx.stroke();
  }

  // --- Hexagram spokes (6 lines from centre, every 60°) ---
  const SPOKE_REACH = 310; // px from centre to tip
  const SPOKE_ALPHA = 0.05;
  _ctx.strokeStyle = `rgba(${r},${g},${b},${SPOKE_ALPHA})`;
  _ctx.lineWidth   = 0.75;

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    _ctx.beginPath();
    _ctx.moveTo(cx, cy);
    _ctx.lineTo(cx + SPOKE_REACH * Math.cos(angle), cy + SPOKE_REACH * Math.sin(angle));
    _ctx.stroke();
  }

  // --- Central rotating runic sigil ---
  // Advances _sigilRot by 0.002 rad per call (~60fps ≈ 7°/sec, full rotation ≈ 50s)
  _sigilRot += 0.002;

  _ctx.save();
  _ctx.translate(cx, cy);
  _ctx.rotate(_sigilRot);

  // Draw the sigil as text centred at origin; alpha 0.14
  const sigilAlpha = 0.14 + 0.04 * Math.sin(_sigilRot * 3); // gentle alpha breathe
  _ctx.globalAlpha = sigilAlpha;
  _ctx.shadowColor = baseColor;
  _ctx.shadowBlur  = 24;
  _ctx.font        = '64px serif';
  _ctx.fillStyle   = baseColor;
  _ctx.textAlign   = 'center';
  _ctx.textBaseline = 'middle';
  _ctx.fillText('⛤', 0, 0);

  _ctx.restore();

  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: edges
// ---------------------------------------------------------------------------

function _drawEdge(n1, n2, bothUnlocked, oX = 0, oY = 0, ts = 0) {
  _ctx.save();
  if (bothUnlocked) {
    // SHOULD 4: living ley-line — 3 sinusoidal passes at different alphas
    const color = n1.color;
    const x1 = n1.x + oX;
    const y1 = n1.y + oY;
    const x2 = n2.x + oX;
    const y2 = n2.y + oY;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular unit vector for wave displacement
    const nx = -dy / len;
    const ny =  dx / len;
    const t = ts / 1000; // seconds

    // Draw 3 passes: bright core, mid glow, outer haze
    const passes = [
      { alpha: 0.85, lineWidth: 2, shadowBlur: 12 },
      { alpha: 0.4,  lineWidth: 3, shadowBlur: 8  },
      { alpha: 0.2,  lineWidth: 4, shadowBlur: 4  },
    ];

    for (const pass of passes) {
      _ctx.globalAlpha = pass.alpha;
      _ctx.strokeStyle = color;
      _ctx.lineWidth   = pass.lineWidth;
      _ctx.shadowColor = color;
      _ctx.shadowBlur  = pass.shadowBlur;
      _ctx.setLineDash([]);
      _ctx.beginPath();

      // Build wavy path: sample 24 segments, sine wave perpendicular to edge
      const STEPS = 24;
      for (let i = 0; i <= STEPS; i++) {
        const frac = i / STEPS;
        const px = x1 + dx * frac;
        const py = y1 + dy * frac;
        // Wave: amplitude 2px, frequency driven by time + position
        const wave = Math.sin(t * 2 + frac * Math.PI * 4) * 2;
        const wx = px + nx * wave;
        const wy = py + ny * wave;
        if (i === 0) _ctx.moveTo(wx, wy);
        else         _ctx.lineTo(wx, wy);
      }
      _ctx.stroke();
    }
  } else {
    // Dim dashed line for inactive edges
    _ctx.strokeStyle = 'rgba(100,120,160,0.25)';
    _ctx.lineWidth   = 1;
    _ctx.setLineDash([4, 7]);
    _ctx.globalAlpha = 1;
    _ctx.beginPath();
    _ctx.moveTo(n1.x + oX, n1.y + oY);
    _ctx.lineTo(n2.x + oX, n2.y + oY);
    _ctx.stroke();
    _ctx.setLineDash([]);
  }
  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: particles along active edges
// ---------------------------------------------------------------------------

function _drawParticle(p, ts, oX = 0, oY = 0) {
  const { from, to } = p.edge;
  const x     = from.x + (to.x - from.x) * p.t + oX;
  const y     = from.y + (to.y - from.y) * p.t + oY;
  const alpha = 0.6 + 0.4 * Math.sin(ts / 300 + p.t * Math.PI * 4);

  _ctx.save();
  _ctx.globalAlpha = alpha;
  _ctx.shadowColor = from.color;
  _ctx.shadowBlur  = 10;
  _ctx.beginPath();
  _ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  _ctx.fillStyle = '#ffffff';
  _ctx.fill();
  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: cursor proximity beams
// ---------------------------------------------------------------------------

/**
 * For each node within 60px of the cursor, draw a thin glowing line from the
 * node centre toward the cursor. Opacity falls off with distance so the beam
 * fades as the cursor moves away.
 *
 * @param {string[]} unlocked  Array of unlocked node IDs
 * @param {number}   oX        Graph parallax X offset
 * @param {number}   oY        Graph parallax Y offset
 */
function _drawCursorBeams(unlocked, oX, oY, mouseX, mouseY) {
  const BEAM_RADIUS = 60;
  const mx = mouseX !== undefined ? mouseX : _rawMouseX;
  const my = mouseY !== undefined ? mouseY : _rawMouseY;

  for (const ln of _nodes) {
    const nx = ln.x + oX;
    const ny = ln.y + oY;
    const dx = mx - nx;
    const dy = my - ny;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > BEAM_RADIUS || dist < 1) continue;

    // Closer = more opaque; linear falloff from 1.0 at dist=0 to 0 at BEAM_RADIUS
    const opacity = (1 - dist / BEAM_RADIUS) * 0.7;

    _ctx.save();
    _ctx.globalAlpha  = opacity;
    _ctx.strokeStyle  = ln.color;
    _ctx.lineWidth    = 1;
    _ctx.shadowColor  = ln.color;
    _ctx.shadowBlur   = 8;
    _ctx.beginPath();
    _ctx.moveTo(nx, ny);
    _ctx.lineTo(mx, my);
    _ctx.stroke();
    _ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Drawing: nodes (stars)
// ---------------------------------------------------------------------------

function _drawNode(ln, ts, oX = 0, oY = 0) {
  const { data, radius, color, state } = ln;
  const x = ln.x + oX;
  const y = ln.y + oY;
  const isUnlocked  = state === 'unlocked';
  const isAvailable = state === 'available';
  const isHovered   = _hoveredId === data.id;
  const tsS         = ts / 1000;

  // Pulse factor (0..1) for available nodes — time-based sin for smooth animation
  const pulse = isAvailable ? (Math.sin(tsS * 2.0) * 0.5 + 0.5) : 0;
  // Scale for available nodes: oscillates 0.95↔1.05
  const availableScale = isAvailable ? (0.95 + 0.10 * pulse) : 1.0;

  // Effective alpha
  // locked: 0.14 (desaturated); available: mid-range with pulse; unlocked: full
  let alpha;
  if (isUnlocked)       alpha = 1.0;
  else if (isAvailable) alpha = 0.55 + pulse * 0.35;
  else                  alpha = 0.14;  // MUST 3: locked nodes very dim

  _ctx.save();
  _ctx.globalAlpha = alpha;

  // --- Outer aura / glow gradient ---
  if (isUnlocked) {
    // MUST 3 unlocked: constant double radial halo  (inner color@0.8 → outer color@0 at 4×radius)
    const innerR = radius * 1.5;
    const outerR = radius * 4.0;
    const grad1 = _ctx.createRadialGradient(x, y, 0, x, y, innerR);
    grad1.addColorStop(0, _colorWithAlpha(color, 0.8));
    grad1.addColorStop(1, _colorWithAlpha(color, 0.15));
    _ctx.beginPath();
    _ctx.arc(x, y, innerR, 0, Math.PI * 2);
    _ctx.fillStyle = grad1;
    _ctx.fill();

    const grad2 = _ctx.createRadialGradient(x, y, innerR * 0.8, x, y, outerR);
    grad2.addColorStop(0, _colorWithAlpha(color, 0.15));
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.beginPath();
    _ctx.arc(x, y, outerR, 0, Math.PI * 2);
    _ctx.fillStyle = grad2;
    _ctx.fill();
  } else if (isAvailable) {
    // Standard pulsing aura for available nodes
    const auraR = radius * (2.4 + pulse * 0.8);
    const auraA = 0.12 + pulse * 0.15;
    const grad  = _ctx.createRadialGradient(x, y, radius * 0.5, x, y, auraR);
    grad.addColorStop(0, _colorWithAlpha(color, auraA));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.beginPath();
    _ctx.arc(x, y, auraR, 0, Math.PI * 2);
    _ctx.fillStyle = grad;
    _ctx.fill();
  }

  // Available: dashed pulsing ring just outside the hex
  if (isAvailable) {
    const dashRingR = radius * 1.55 * availableScale;
    _ctx.save();
    _ctx.globalAlpha = 0.5 + pulse * 0.3;
    _ctx.strokeStyle = _colorWithAlpha(color, 0.7);
    _ctx.lineWidth   = 1;
    _ctx.setLineDash([2, 4]);
    _ctx.shadowColor = color;
    _ctx.shadowBlur  = 4;
    _ctx.beginPath();
    _ctx.arc(x, y, dashRingR, 0, Math.PI * 2);
    _ctx.stroke();
    _ctx.setLineDash([]);
    _ctx.restore();
  }

  // --- Keystone pulsing ring ---
  if (data.type === 'keystone' && isUnlocked) {
    const ringAlpha  = 0.25 + 0.2 * Math.sin(tsS * 1.5);
    const ringRadius = radius + 10 + 4 * Math.sin(tsS * 1.5);
    _ctx.beginPath();
    _ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    _ctx.strokeStyle = _colorWithAlpha(color, ringAlpha);
    _ctx.lineWidth   = 1.5;
    _ctx.stroke();
  }

  // --- Star shape ---
  const drawRadius = isAvailable ? radius + pulse * 2 : radius;
  const shadowStr  = isUnlocked  ? (data.type === 'keystone' ? 28 : 18)
                   : isAvailable ? (8 + pulse * 8)
                   : 0;

  _ctx.shadowColor = color;
  _ctx.shadowBlur  = isHovered ? shadowStr + 12 : shadowStr;

  _drawStar(x, y, drawRadius, color, isUnlocked, isAvailable);

  // --- Hover ring ---
  if (isHovered) {
    _ctx.beginPath();
    _ctx.arc(x, y, drawRadius + 5, 0, Math.PI * 2);
    _ctx.strokeStyle = _colorWithAlpha(color, 0.7);
    _ctx.lineWidth   = 1.5;
    _ctx.stroke();
  }

  _ctx.shadowBlur  = 0;
  _ctx.shadowColor = 'transparent';

  // --- Label below star ---
  _ctx.globalAlpha = isUnlocked ? 0.9 : (isAvailable ? 0.65 + pulse * 0.25 : 0.3);
  _ctx.textAlign   = 'center';
  _ctx.textBaseline = 'top';

  const labelLines = _wrapLabel(data.name, drawRadius);
  const fontSize   = 10;
  _ctx.font        = `${fontSize}px "Cinzel", serif`;
  _ctx.fillStyle   = '#ffffff';

  // Subtle text shadow for legibility on the star field
  _ctx.shadowColor = 'rgba(0,0,0,0.9)';
  _ctx.shadowBlur  = 4;

  const labelY = y + drawRadius + 5;
  labelLines.forEach((line, i) => {
    _ctx.fillText(line, x, labelY + i * (fontSize + 2));
  });

  _ctx.restore();
}

/**
 * Draw a hexagonal rune-cell node (PoE/Diablo-style) centred at (cx, cy).
 * Shape: flat-top hexagon with an inner circle for unlocked nodes.
 *
 * @param {number}  cx, cy   Centre
 * @param {number}  r        Outer hex circumradius
 * @param {string}  color    Accent colour (hex)
 * @param {boolean} unlocked
 * @param {boolean} available
 */
function _drawStar(cx, cy, r, color, unlocked, available) {
  // ── Hex path (flat-top orientation) ──────────────────────────────────────
  function hexPath(radius) {
    _ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = cx + radius * Math.cos(a);
      const py = cy + radius * Math.sin(a);
      if (i === 0) _ctx.moveTo(px, py);
      else         _ctx.lineTo(px, py);
    }
    _ctx.closePath();
  }

  // ── Background plate ─────────────────────────────────────────────────────
  if (unlocked) {
    const grad = _ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r * 1.1);
    grad.addColorStop(0, _lighten(color, 0.25));
    grad.addColorStop(0.55, _darken(color, 0.25));
    grad.addColorStop(1,   _darken(color, 0.55));
    hexPath(r);
    _ctx.fillStyle = grad;
    _ctx.fill();
  } else if (available) {
    hexPath(r);
    _ctx.fillStyle = '#141824';
    _ctx.fill();
  } else {
    hexPath(r);
    _ctx.fillStyle = '#0c0e14';
    _ctx.fill();
  }

  // ── Outer hex border ─────────────────────────────────────────────────────
  hexPath(r);
  _ctx.strokeStyle = unlocked  ? color
                   : available ? _darken(color, 0.15)
                   : 'rgba(55,65,90,0.45)';
  _ctx.lineWidth   = unlocked ? 1.5 : 1;
  _ctx.stroke();

  // ── Inner ring (inset by 3px) for visual depth ───────────────────────────
  if (r > 14) {
    hexPath(r - 3);
    _ctx.strokeStyle = unlocked  ? _lighten(color, 0.35)
                     : available ? _darken(color, 0.3)
                     : 'rgba(40,50,75,0.35)';
    _ctx.lineWidth = 0.75;
    _ctx.stroke();
  }

  // ── Bright inner circle for unlocked nodes (rune glow core) ──────────────
  if (unlocked) {
    const coreR = r * 0.38;
    const cGrad = _ctx.createRadialGradient(cx, cy - coreR * 0.3, coreR * 0.1, cx, cy, coreR);
    cGrad.addColorStop(0, '#ffffff');
    cGrad.addColorStop(0.4, _lighten(color, 0.7));
    cGrad.addColorStop(1, color);
    _ctx.beginPath();
    _ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    _ctx.fillStyle = cGrad;
    _ctx.fill();
  } else if (available) {
    // Pulsing dim core dot
    _ctx.beginPath();
    _ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
    _ctx.fillStyle = _darken(color, 0.4);
    _ctx.fill();
    // Bright rim on the inner dot
    _ctx.strokeStyle = _darken(color, 0.1);
    _ctx.lineWidth = 1;
    _ctx.stroke();
  } else {
    // Locked: tiny dark circle, nearly invisible
    _ctx.beginPath();
    _ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    _ctx.fillStyle = 'rgba(30,38,60,0.7)';
    _ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function _showTooltip(ln, canvasX, canvasY) {
  if (!_tooltip || !_container) return;

  const state    = getState();
  const unlocked = (state.passives?.unlocked) || [];
  const threads  = state.passives?.leyThreads || 0;
  const node     = ln.data;

  const isUnlocked = unlocked.includes(node.id);
  const { canUnlock, reason } = canUnlockNode(node.id, unlocked, threads);

  let statusHtml;
  if (isUnlocked) {
    statusHtml = '<span class="ptc-tt-status ptc-tt-unlocked">Unlocked</span>';
  } else if (canUnlock) {
    statusHtml = `<span class="ptc-tt-status ptc-tt-available">Click to unlock (${node.cost} Sigil${node.cost > 1 ? 's' : ''})</span>`;
  } else {
    statusHtml = `<span class="ptc-tt-status ptc-tt-locked">${reason || 'Locked'}</span>`;
  }

  const reqNames = node.requires
    .map(id => PASSIVE_NODES_MAP[id]?.name || id)
    .join(', ');

  _tooltip.innerHTML = `
    <div class="ptc-tt-name">${node.name}</div>
    <div class="ptc-tt-type">${_capitalize(node.type)}</div>
    <div class="ptc-tt-desc">${node.description}</div>
    ${reqNames ? `<div class="ptc-tt-req">Requires: ${reqNames}</div>` : ''}
    ${statusHtml}
  `;

  const TT_W = 220;
  const TT_H = 130;
  const cW   = _container.getBoundingClientRect().width;
  const cH   = _container.getBoundingClientRect().height;

  let tx = canvasX + 18;
  let ty = canvasY - TT_H / 2;
  if (tx + TT_W > cW - 8)  tx = canvasX - TT_W - 18;
  if (ty < 4)               ty = 4;
  if (ty + TT_H > cH - 4)  ty = cH - TT_H - 4;

  _tooltip.style.display = 'block';
  _tooltip.style.left    = `${tx}px`;
  _tooltip.style.top     = `${ty}px`;
}

function _hideTooltip() {
  if (_tooltip)  _tooltip.style.display = 'none';
  _hoveredId = null;
  if (_canvas) _canvas.style.cursor = 'default';
}

// ---------------------------------------------------------------------------
// Unlock confirm overlay
// ---------------------------------------------------------------------------

function _confirmUnlock(ln) {
  const node = ln.data;

  const existing = document.getElementById('ptc-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id        = 'ptc-confirm-overlay';
  overlay.className = 'ptc-confirm-overlay';
  overlay.innerHTML = `
    <div class="ptc-confirm-box">
      <div class="ptc-confirm-title">${node.name}</div>
      <div class="ptc-confirm-desc">${node.description}</div>
      <div class="ptc-confirm-cost">Cost: ${node.cost} Sigil${node.cost > 1 ? 's' : ''}</div>
      <div class="ptc-confirm-btns">
        <button class="ptc-btn-yes">Unlock</button>
        <button class="ptc-btn-no">Cancel</button>
      </div>
    </div>
  `;

  _container.appendChild(overlay);

  overlay.querySelector('.ptc-btn-yes').addEventListener('click', () => {
    overlay.remove();
    _doUnlock(node.id);
  });
  overlay.querySelector('.ptc-btn-no').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

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
  _refreshLeftPanel(passives);
}

function _refreshLeftPanel(passives) {
  const el1 = document.getElementById('passives-threads-value');
  const el2 = document.getElementById('passives-header-threads');
  if (el1) el1.textContent = passives.leyThreads;
  if (el2) el2.textContent = passives.leyThreads;
}

// ---------------------------------------------------------------------------
// Hit-test
// ---------------------------------------------------------------------------

/**
 * Return the layout node under canvas coordinates (mx, my), or null.
 * Stars use a circular hit zone slightly larger than the visual radius.
 */
function _getNodeAt(mx, my) {
  // Convert canvas coords → graph-local coords (accounting for zoom/pan + parallax)
  const invScale = 1 / _view.scale;
  const gx = (mx - _view.dx) * invScale;
  const gy = (my - _view.dy) * invScale;
  const parallaxFactor = Math.max(0, 1 - (_view.scale - 1) * 0.5);
  const oX = _mx * 12 * parallaxFactor;
  const oY = _my * 12 * parallaxFactor;
  for (let i = _nodes.length - 1; i >= 0; i--) {
    const ln = _nodes[i];
    const dx = gx - (ln.x + oX);
    const dy = gy - (ln.y + oY);
    const hitR = ln.radius + 6;
    if (dx * dx + dy * dy <= hitR * hitR) return ln;
  }
  return null;
}

/** Convert a MouseEvent to pixel coordinates on the canvas. */
function _canvasCoords(e) {
  const rect  = _canvas.getBoundingClientRect();
  const scaleX = _canvas.width  / rect.width;
  const scaleY = _canvas.height / rect.height;
  return {
    mx: (e.clientX - rect.left) * scaleX,
    my: (e.clientY - rect.top)  * scaleY
  };
}

// ---------------------------------------------------------------------------
// Label wrapping
// ---------------------------------------------------------------------------

/**
 * Split a node name into at most 2 lines that fit beneath the star.
 * Tries to break on whitespace; always returns 1–2 strings.
 */
function _wrapLabel(name, radius) {
  // Rough char limit based on star size
  const maxChars = Math.max(8, Math.floor(radius * 1.4));
  if (name.length <= maxChars) return [name];

  const words = name.split(' ');
  if (words.length === 1) return [name.slice(0, maxChars - 1) + '…'];

  // Try to fit into two lines
  let line1 = '';
  let line2 = '';
  let splitIdx = words.length; // index of first word that goes to line2
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    if (line1.length === 0)                       line1 = w;
    else if ((line1 + ' ' + w).length <= maxChars) line1 += ' ' + w;
    else { splitIdx = wi; line2 = words.slice(wi).join(' '); break; }
  }
  if (line2.length > maxChars) line2 = line2.slice(0, maxChars - 1) + '…';
  return line2 ? [line1, line2] : [line1];
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function _colorWithAlpha(hex, alpha) {
  const [r, g, b] = _hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Lighten (factor > 0) or darken (factor < 0) a hex colour.
 * Factor range: -1..1
 */
function _lighten(hex, factor) {
  const [r, g, b] = _hexToRgb(hex);
  if (factor >= 0) {
    return `rgb(${Math.min(255, (r + (255 - r) * factor) | 0)},${Math.min(255, (g + (255 - g) * factor) | 0)},${Math.min(255, (b + (255 - b) * factor) | 0)})`;
  }
  const f = 1 + factor;
  return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
}

function _darken(hex, factor) {
  return _lighten(hex, -factor);
}

function _capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
