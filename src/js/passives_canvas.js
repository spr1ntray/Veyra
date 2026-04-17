/**
 * passives_canvas.js — Skyrim-style constellation visualiser for the Ley Loom passive tree.
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
 * Visual radius of the star shape (hit-radius is slightly larger for ease of clicking).
 * Minor = small star, Keystone = bright pulsing star.
 */
const STAR_RADIUS = {
  minor:    12,
  major:    18,
  keystone: 26
};

/** Number of constellation particles per active (both-unlocked) edge */
const PARTICLES_PER_EDGE = 4;

/** Total background stars to scatter across the canvas */
const BG_STAR_COUNT = 650;

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

    // Input
    _canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    _canvas.addEventListener('mouseleave', () => _hideTooltip());
    _canvas.addEventListener('click',     e => this._onClick(e));

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
  _ctx.fillStyle = '#050810';
  _ctx.fillRect(0, 0, W, H);

  // Nebula cloud layer drawn first, under stars
  _drawNebula(W, H);
  _drawStars(W, H, ts);

  // Decorative magic circle — very faint arcane substrate beneath the node graph
  _drawMagicCircle(W, H, state.classType);

  // Graph parallax offset — slightly less than near stars for depth illusion
  const gOX = _mx * 12;
  const gOY = _my * 12;

  // ---- Universal cluster label ----
  _ctx.font      = '10px "Cinzel", serif';
  _ctx.fillStyle = 'rgba(255, 213, 79, 0.4)';
  _ctx.textAlign = 'center';
  const uLabelX = W * UNIV_CLUSTER_X_FRAC + gOX;
  const uLabelY = H * UNIV_CLUSTER_Y_FRAC - 58 + gOY;
  _ctx.fillText('UNIVERSAL', uLabelX, uLabelY);

  // ---- Class label ----
  if (state.classType) {
    _ctx.font      = '11px "Cinzel", serif';
    _ctx.fillStyle = `${_colorWithAlpha(CLASS_COLORS[state.classType] || '#ffffff', 0.35)}`;
    _ctx.textAlign = 'center';
    _ctx.fillText(state.classType.toUpperCase(), W * 0.55 + gOX, H * 0.52 - ARC_RADIUS.outer - 22 + gOY);
  }

  // ---- Edges (offset by graph parallax) ----
  for (const edge of _edges) {
    const fromU = unlocked.includes(edge.from.data.id);
    const toU   = unlocked.includes(edge.to.data.id);
    _drawEdge(edge.from, edge.to, fromU && toU, gOX, gOY);
  }

  // ---- Particles (advance + draw) ----
  for (const p of _particles) {
    p.t += p.speed;
    if (p.t > 1) p.t -= 1;
    _drawParticle(p, ts, gOX, gOY);
  }

  // ---- Cursor beams (drawn beneath nodes so nodes render on top) ----
  _drawCursorBeams(unlocked, gOX, gOY);

  // ---- Nodes ----
  for (const ln of _nodes) {
    _drawNode(ln, ts, gOX, gOY);
  }
}

// ---------------------------------------------------------------------------
// Drawing: background stars
// ---------------------------------------------------------------------------

/**
 * Draw blurred nebula patches behind the star field.
 * Uses radial gradients with very low opacity so they read as subtle colour
 * variation rather than bright blobs. Positions are static (do not parallax).
 */
function _drawNebula(W, H) {
  const patches = [
    // [cx_frac, cy_frac, radius, r, g, b, opacity]
    [ 0.62, 0.45, 320, 61, 26, 110, 0.10 ],   // purple centre
    [ 0.25, 0.65, 260, 10, 26,  61, 0.09 ],   // deep blue lower-left
    [ 0.78, 0.72, 220, 61, 15,  15, 0.07 ],   // faint red lower-right
    [ 0.42, 0.22, 200, 20, 40,  90, 0.08 ],   // cold blue upper
  ];

  for (const [cxF, cyF, radius, r, g, b, alpha] of patches) {
    const cx = W * cxF;
    const cy = H * cyF;
    const grad = _ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    _ctx.save();
    _ctx.globalAlpha = 1;
    _ctx.beginPath();
    _ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    _ctx.fillStyle = grad;
    _ctx.fill();
    _ctx.restore();
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

  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: edges
// ---------------------------------------------------------------------------

function _drawEdge(n1, n2, bothUnlocked, oX = 0, oY = 0) {
  _ctx.save();
  if (bothUnlocked) {
    // Bright glowing constellation line
    const color = n1.color;
    _ctx.strokeStyle = color;
    _ctx.lineWidth   = 2;
    _ctx.shadowColor = color;
    _ctx.shadowBlur  = 12;
    _ctx.setLineDash([]);
    _ctx.globalAlpha = 0.85;
  } else {
    // Dim dashed line
    _ctx.strokeStyle = 'rgba(100,120,160,0.25)';
    _ctx.lineWidth   = 1;
    _ctx.setLineDash([4, 7]);
    _ctx.globalAlpha = 1;
  }
  _ctx.beginPath();
  _ctx.moveTo(n1.x + oX, n1.y + oY);
  _ctx.lineTo(n2.x + oX, n2.y + oY);
  _ctx.stroke();
  _ctx.setLineDash([]);
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
function _drawCursorBeams(unlocked, oX, oY) {
  const BEAM_RADIUS = 60; // pixels — activation distance

  for (const ln of _nodes) {
    const nx = ln.x + oX;
    const ny = ln.y + oY;
    const dx = _rawMouseX - nx;
    const dy = _rawMouseY - ny;
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
    _ctx.lineTo(_rawMouseX, _rawMouseY);
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

  // Pulse factor (0..1) for available nodes
  const pulse = isAvailable ? (Math.sin(tsS * 2.0) * 0.5 + 0.5) : 0;

  // Effective alpha
  let alpha;
  if (isUnlocked)       alpha = 1.0;
  else if (isAvailable) alpha = 0.55 + pulse * 0.35;
  else                  alpha = 0.22;

  _ctx.save();
  _ctx.globalAlpha = alpha;

  // --- Outer aura / glow gradient ---
  if (isUnlocked || isAvailable) {
    const auraR = radius * (isUnlocked ? 3.2 : 2.4 + pulse * 0.8);
    const auraA = isUnlocked ? 0.35 : (0.12 + pulse * 0.15);
    const grad  = _ctx.createRadialGradient(x, y, radius * 0.5, x, y, auraR);
    grad.addColorStop(0, _colorWithAlpha(color, auraA));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.beginPath();
    _ctx.arc(x, y, auraR, 0, Math.PI * 2);
    _ctx.fillStyle = grad;
    _ctx.fill();
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
  const fontSize   = 9;
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
 * Draw a 5-pointed star centred at (cx, cy) with outer radius `r`.
 * Colours and fill differ by node state.
 *
 * @param {number}  cx, cy   Centre
 * @param {number}  r        Outer radius
 * @param {string}  color    Accent colour (hex)
 * @param {boolean} unlocked
 * @param {boolean} available
 */
function _drawStar(cx, cy, r, color, unlocked, available) {
  const points = 5;
  const inner  = r * 0.42;   // inner radius of the star notch
  const rot    = -Math.PI / 2; // point upward

  _ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = rot + (i * Math.PI) / points;
    const radius = i % 2 === 0 ? r : inner;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) _ctx.moveTo(px, py);
    else         _ctx.lineTo(px, py);
  }
  _ctx.closePath();

  // Fill
  if (unlocked) {
    // Bright core with lighter tint
    const grad = _ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, _lighten(color, 0.55));
    grad.addColorStop(1, color);
    _ctx.fillStyle = grad;
  } else if (available) {
    _ctx.fillStyle = _darken(color, 0.55);
  } else {
    _ctx.fillStyle = '#1a1e2a';
  }
  _ctx.fill();

  // Stroke / rim
  _ctx.strokeStyle = unlocked ? color
                   : available ? _darken(color, 0.2)
                   : 'rgba(80,90,110,0.5)';
  _ctx.lineWidth   = unlocked ? 1.5 : 1;
  _ctx.stroke();
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
    statusHtml = `<span class="ptc-tt-status ptc-tt-available">Click to unlock (${node.cost} Thread${node.cost > 1 ? 's' : ''})</span>`;
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
      <div class="ptc-confirm-cost">Cost: ${node.cost} Ley Thread${node.cost > 1 ? 's' : ''}</div>
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
  // Account for graph parallax offset so click hits where the node is visually
  const oX = _mx * 12;
  const oY = _my * 12;
  for (let i = _nodes.length - 1; i >= 0; i--) {
    const ln = _nodes[i];
    const dx = mx - (ln.x + oX);
    const dy = my - (ln.y + oY);
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
