/**
 * passives_canvas.js — Constellation / Bubble-map visualiser for the Ley Loom passive tree.
 *
 * Renders all passive nodes as glowing bubbles on a Canvas 2D context, connected
 * by luminescent constellation lines. Handles hover tooltips and click-to-unlock
 * interaction. Animates available nodes (pulsing) and emits particles along
 * active connections.
 *
 * Public API:
 *   PassiveTreeCanvas.init(containerEl)   — attach canvas to DOM, start render loop
 *   PassiveTreeCanvas.refresh()           — call after state changes (unlock / respec)
 *   PassiveTreeCanvas.destroy()           — stop loop, remove canvas
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

const CLASS_COLORS = {
  pyromancer:  '#ff6b35',
  stormcaller: '#4fc3f7',
  tidecaster:  '#40c4ff',
  geomancer:   '#8d6e63',
  universal:   '#c9a84c'
};

const NODE_RADIUS = {
  minor:    22,
  major:    30,
  keystone: 40
};

// Vertical layout bands (as fraction of canvas height for the class tree area)
const BAND_Y_FRACTION = {
  keystone: 0.22,  // top of class area
  major:    0.50,
  minor:    0.80
};

// Particle count per active edge
const PARTICLES_PER_EDGE = 2;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _canvas      = null;
let _ctx         = null;
let _container   = null;
let _rafId       = null;
let _nodes       = [];        // computed layout: { node, x, y, color, radius }
let _edges       = [];        // { from: layoutNode, to: layoutNode }
let _particles   = [];        // { edge, t, speed }
let _tooltip     = null;      // DOM element
let _hoveredId   = null;
let _tick        = 0;         // frame counter for animation

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const PassiveTreeCanvas = {

  /**
   * Attach the canvas to `containerEl`, compute layout, start render loop.
   * @param {HTMLElement} containerEl
   */
  init(containerEl) {
    _container = containerEl;

    // Create canvas
    _canvas = document.createElement('canvas');
    _canvas.style.display = 'block';
    _canvas.style.width   = '100%';
    _canvas.style.height  = '100%';
    _canvas.style.cursor  = 'default';
    containerEl.appendChild(_canvas);

    _ctx = _canvas.getContext('2d');

    // Tooltip element (plain HTML, positioned absolutely over the canvas)
    _tooltip = document.createElement('div');
    _tooltip.className = 'ptc-tooltip';
    _tooltip.style.display = 'none';
    containerEl.style.position = 'relative';
    containerEl.appendChild(_tooltip);

    // Resize observer keeps canvas pixel dimensions in sync with CSS layout
    const ro = new ResizeObserver(() => this._resize());
    ro.observe(containerEl);
    this._resize();

    // Input
    _canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    _canvas.addEventListener('mouseleave', () => this._hideTooltip());
    _canvas.addEventListener('click', e => this._onClick(e));

    // Initial layout + loop
    this.refresh();
    this._startLoop();
  },

  /** Recompute layout from current state and rebuild particle set. */
  refresh() {
    _computeLayout();
    _rebuildParticles();
  },

  /** Stop animation and remove DOM elements. */
  destroy() {
    if (_rafId) cancelAnimationFrame(_rafId);
    if (_canvas)  _canvas.remove();
    if (_tooltip) _tooltip.remove();
    _canvas = _ctx = _container = _tooltip = null;
    _nodes = _edges = _particles = [];
  },

  // ---- internal ----

  _resize() {
    if (!_canvas || !_container) return;
    const rect = _container.getBoundingClientRect();
    _canvas.width  = rect.width;
    _canvas.height = rect.height;
    // Layout must be recomputed whenever canvas size changes
    _computeLayout();
    _rebuildParticles();
  },

  _startLoop() {
    const loop = () => {
      _tick++;
      _drawFrame();
      _rafId = requestAnimationFrame(loop);
    };
    _rafId = requestAnimationFrame(loop);
  },

  _onMouseMove(e) {
    if (!_canvas) return;
    const rect = _canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (_canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (_canvas.height / rect.height);

    const hit = _hitTest(mx, my);
    if (hit) {
      _canvas.style.cursor = 'pointer';
      _hoveredId = hit.node.id;
      _showTooltip(hit, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      _canvas.style.cursor = 'default';
      _hoveredId = null;
      _hideTooltip();
    }
  },

  _hideTooltip: () => _hideTooltip(),

  _onClick(e) {
    if (!_canvas) return;
    const rect = _canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (_canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (_canvas.height / rect.height);

    const hit = _hitTest(mx, my);
    if (!hit) return;

    const state    = getState();
    const passives = state.passives || {};
    const unlocked = passives.unlocked || [];

    if (unlocked.includes(hit.node.id)) {
      // Already unlocked — tooltip is enough
      return;
    }

    const { canUnlock, reason } = canUnlockNode(hit.node.id, unlocked, passives.leyThreads || 0);
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

function _computeLayout() {
  if (!_canvas) return;

  const state    = getState();
  const classType = state.classType || null;

  const W = _canvas.width;
  const H = _canvas.height;

  // Universal strip: top 18% of canvas
  const UNIV_H = H * 0.18;
  // Class tree: remaining height
  const CLASS_TOP = UNIV_H + 20;
  const CLASS_H   = H - CLASS_TOP - 20;

  _nodes = [];
  _edges = [];

  // --- Universal nodes (horizontal strip) ---
  const univNodes = getUniversalNodes();
  const uCount    = univNodes.length;
  const uStep     = W / (uCount + 1);
  const uY        = UNIV_H * 0.55;

  const univLayoutMap = {}; // id -> layoutNode
  univNodes.forEach((n, i) => {
    const ln = {
      node:   n,
      x:      uStep * (i + 1),
      y:      uY,
      color:  CLASS_COLORS.universal,
      radius: NODE_RADIUS[n.type] || 22
    };
    _nodes.push(ln);
    univLayoutMap[n.id] = ln;
  });

  // --- Class nodes ---
  const classLayoutMap = {}; // id -> layoutNode
  if (classType) {
    const classNodes = getClassNodes(classType);
    const color = CLASS_COLORS[classType] || '#c9a84c';

    // Separate by tier
    const minorNodes    = classNodes.filter(n => n.type === 'minor');
    const majorNodes    = classNodes.filter(n => n.type === 'major');
    const keystoneNodes = classNodes.filter(n => n.type === 'keystone');

    const placeRow = (arr, yFrac) => {
      const y    = CLASS_TOP + CLASS_H * yFrac;
      const step = W / (arr.length + 1);
      arr.forEach((n, i) => {
        const ln = {
          node:   n,
          x:      step * (i + 1),
          y,
          color,
          radius: NODE_RADIUS[n.type] || 22
        };
        _nodes.push(ln);
        classLayoutMap[n.id] = ln;
      });
    };

    placeRow(keystoneNodes, BAND_Y_FRACTION.keystone);
    placeRow(majorNodes,    BAND_Y_FRACTION.major);
    placeRow(minorNodes,    BAND_Y_FRACTION.minor);

    // Build edges from requires[] relationships
    const allLayoutMap = { ...univLayoutMap, ...classLayoutMap };
    for (const n of classNodes) {
      const toLn = classLayoutMap[n.id];
      if (!toLn) continue;
      for (const reqId of n.requires) {
        const fromLn = allLayoutMap[reqId];
        if (fromLn) {
          _edges.push({ from: fromLn, to: toLn });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Particle system
// ---------------------------------------------------------------------------

function _rebuildParticles() {
  _particles = [];

  const state    = getState();
  const unlocked = (state.passives?.unlocked) || [];

  for (const edge of _edges) {
    if (unlocked.includes(edge.from.node.id) && unlocked.includes(edge.to.node.id)) {
      // Spawn particles staggered along the edge
      for (let i = 0; i < PARTICLES_PER_EDGE; i++) {
        _particles.push({
          edge,
          t:     i / PARTICLES_PER_EDGE,  // 0..1 position along edge
          speed: 0.003 + Math.random() * 0.002
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function _drawFrame() {
  if (!_ctx || !_canvas) return;

  const W = _canvas.width;
  const H = _canvas.height;
  const state    = getState();
  const unlocked = (state.passives?.unlocked) || [];
  const threads  = state.passives?.leyThreads || 0;

  // Clear
  _ctx.clearRect(0, 0, W, H);

  // Background
  _ctx.fillStyle = '#07080f';
  _ctx.fillRect(0, 0, W, H);

  // Faint star-field
  _drawStars(W, H);

  // Universal strip separator line
  const univH = H * 0.18;
  _ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
  _ctx.lineWidth   = 1;
  _ctx.setLineDash([6, 8]);
  _ctx.beginPath();
  _ctx.moveTo(20, univH + 10);
  _ctx.lineTo(W - 20, univH + 10);
  _ctx.stroke();
  _ctx.setLineDash([]);

  // Section labels
  _ctx.font      = '11px "Cinzel", serif';
  _ctx.fillStyle = 'rgba(201, 168, 76, 0.45)';
  _ctx.textAlign = 'left';
  _ctx.fillText('UNIVERSAL CORE', 16, 14);

  if (state.classType) {
    const label = state.classType.toUpperCase();
    _ctx.fillText(`${label} SKILLS`, 16, univH + 28);
  }

  // Edges
  for (const edge of _edges) {
    _drawEdge(edge, unlocked);
  }

  // Particles
  for (const p of _particles) {
    _advanceParticle(p);
    _drawParticle(p);
  }

  // Nodes
  for (const ln of _nodes) {
    _drawNode(ln, unlocked, threads);
  }
}

// Deterministic star field — same positions every frame
let _starCache = null;
function _drawStars(W, H) {
  if (!_starCache || _starCache.w !== W || _starCache.h !== H) {
    // Regenerate star positions when canvas size changes
    const stars = [];
    const seed  = 42;
    let rng = seed;
    const rand = () => {
      rng = (rng * 16807 + 0) % 2147483647;
      return (rng - 1) / 2147483646;
    };
    for (let i = 0; i < 120; i++) {
      stars.push({ x: rand() * W, y: rand() * H, r: rand() * 1.2 + 0.2, a: rand() * 0.4 + 0.05 });
    }
    _starCache = { w: W, h: H, stars };
  }
  for (const s of _starCache.stars) {
    _ctx.beginPath();
    _ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    _ctx.fillStyle = `rgba(200,220,255,${s.a})`;
    _ctx.fill();
  }
}

function _drawEdge(edge, unlocked) {
  const fromUnlocked = unlocked.includes(edge.from.node.id);
  const toUnlocked   = unlocked.includes(edge.to.node.id);
  const bothUnlocked = fromUnlocked && toUnlocked;
  const color = edge.from.color;

  if (bothUnlocked) {
    // Glowing line
    _ctx.save();
    _ctx.strokeStyle = color;
    _ctx.lineWidth   = 2.5;
    _ctx.shadowColor = color;
    _ctx.shadowBlur  = 10;
    _ctx.setLineDash([]);
    _ctx.beginPath();
    _ctx.moveTo(edge.from.x, edge.from.y);
    _ctx.lineTo(edge.to.x,   edge.to.y);
    _ctx.stroke();
    _ctx.restore();
  } else {
    // Thin dashed grey line
    _ctx.save();
    _ctx.strokeStyle = 'rgba(120,130,150,0.30)';
    _ctx.lineWidth   = 1;
    _ctx.setLineDash([4, 6]);
    _ctx.beginPath();
    _ctx.moveTo(edge.from.x, edge.from.y);
    _ctx.lineTo(edge.to.x,   edge.to.y);
    _ctx.stroke();
    _ctx.setLineDash([]);
    _ctx.restore();
  }
}

function _advanceParticle(p) {
  p.t += p.speed;
  if (p.t > 1) p.t -= 1;
}

function _drawParticle(p) {
  const { from, to } = p.edge;
  const x = from.x + (to.x - from.x) * p.t;
  const y = from.y + (to.y - from.y) * p.t;
  const color = from.color;

  _ctx.save();
  _ctx.shadowColor = color;
  _ctx.shadowBlur  = 8;
  _ctx.beginPath();
  _ctx.arc(x, y, 3, 0, Math.PI * 2);
  _ctx.fillStyle = '#ffffff';
  _ctx.fill();
  _ctx.restore();
}

function _drawNode(ln, unlocked, threads) {
  const { node, x, y, color, radius } = ln;
  const isUnlocked = unlocked.includes(node.id);
  const { canUnlock } = canUnlockNode(node.id, unlocked, threads);
  const isHovered  = _hoveredId === node.id;

  // Pulse for available nodes
  const pulse  = isUnlocked ? 0 : (canUnlock ? Math.sin(_tick * 0.05) * 0.5 + 0.5 : 0);
  const r      = isUnlocked ? radius : (canUnlock ? radius + pulse * 3 : radius);
  const alpha  = isUnlocked ? 1.0    : (canUnlock ? 0.6 + pulse * 0.3 : 0.25);

  _ctx.save();
  _ctx.globalAlpha = alpha;

  // Outer glow
  if (isUnlocked || canUnlock) {
    const glowR = isUnlocked ? (node.type === 'keystone' ? 60 : 40) : 28 + pulse * 10;
    const glowA = isUnlocked ? (node.type === 'keystone' ? 0.55 : 0.40) : 0.20 + pulse * 0.15;
    const grad  = _ctx.createRadialGradient(x, y, r * 0.3, x, y, glowR);
    grad.addColorStop(0, _colorWithAlpha(color, glowA));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.beginPath();
    _ctx.arc(x, y, glowR, 0, Math.PI * 2);
    _ctx.fillStyle = grad;
    _ctx.fill();
  }

  // Keystone pulsing halo (gold ring)
  if (node.type === 'keystone' && isUnlocked) {
    const haloScale = 1 + Math.sin(_tick * 0.04) * 0.08;
    _ctx.beginPath();
    _ctx.arc(x, y, r * haloScale + 8, 0, Math.PI * 2);
    _ctx.strokeStyle = `rgba(201,168,76,${0.3 + Math.sin(_tick * 0.04) * 0.2})`;
    _ctx.lineWidth   = 2;
    _ctx.stroke();
  }

  // Node fill
  const fillGrad = _ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  if (isUnlocked) {
    fillGrad.addColorStop(0, _lighten(color, 0.4));
    fillGrad.addColorStop(1, _darken(color, 0.5));
  } else if (canUnlock) {
    fillGrad.addColorStop(0, _darken(color, 0.2));
    fillGrad.addColorStop(1, _darken(color, 0.7));
  } else {
    fillGrad.addColorStop(0, '#2a2e3a');
    fillGrad.addColorStop(1, '#141820');
  }

  _ctx.beginPath();
  _ctx.arc(x, y, r, 0, Math.PI * 2);
  _ctx.fillStyle = fillGrad;
  _ctx.fill();

  // Node border
  _ctx.beginPath();
  _ctx.arc(x, y, r, 0, Math.PI * 2);
  if (isUnlocked) {
    _ctx.strokeStyle = color;
    _ctx.lineWidth   = isHovered ? 3 : 2;
    _ctx.shadowColor = color;
    _ctx.shadowBlur  = isHovered ? 20 : 12;
  } else if (canUnlock) {
    _ctx.strokeStyle = _lighten(color, -0.2);
    _ctx.lineWidth   = isHovered ? 2.5 : 1.5;
    _ctx.shadowBlur  = 0;
  } else {
    _ctx.strokeStyle = 'rgba(100,110,130,0.4)';
    _ctx.lineWidth   = 1;
    _ctx.shadowBlur  = 0;
  }
  _ctx.stroke();
  _ctx.shadowBlur = 0;

  // Label inside bubble
  _ctx.globalAlpha = isUnlocked ? 1.0 : (canUnlock ? 0.75 + pulse * 0.25 : 0.4);
  _ctx.textAlign   = 'center';
  _ctx.textBaseline= 'middle';

  const shortName  = _abbreviate(node.name, r);
  const fontSize   = node.type === 'keystone' ? 9 : (node.type === 'major' ? 8 : 7);
  _ctx.font        = `600 ${fontSize}px "Crimson Text", Georgia, serif`;
  _ctx.fillStyle   = isUnlocked ? '#ffffff' : (canUnlock ? '#ddd8c4' : '#6a7080');
  _ctx.fillText(shortName, x, y);

  // Cost label below bubble
  const costY = y + r + 10;
  _ctx.font      = `${fontSize - 1}px "Crimson Text", Georgia, serif`;
  _ctx.fillStyle = isUnlocked ? 'rgba(201,168,76,0.7)' : (canUnlock ? 'rgba(201,168,76,0.5)' : 'rgba(100,110,130,0.4)');
  _ctx.fillText(`${node.cost}T`, x, costY);

  _ctx.restore();
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function _showTooltip(ln, canvasX, canvasY) {
  if (!_tooltip || !_container) return;

  const state    = getState();
  const unlocked = (state.passives?.unlocked) || [];
  const threads  = state.passives?.leyThreads || 0;
  const node     = ln.node;

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

  // Position tooltip so it stays inside the container
  const TT_W = 220;
  const TT_H = 120; // estimate
  const containerRect = _container.getBoundingClientRect();
  let tx = canvasX + 16;
  let ty = canvasY - TT_H / 2;

  if (tx + TT_W > containerRect.width - 8) tx = canvasX - TT_W - 16;
  if (ty < 4) ty = 4;
  if (ty + TT_H > containerRect.height - 4) ty = containerRect.height - TT_H - 4;

  _tooltip.style.display = 'block';
  _tooltip.style.left    = `${tx}px`;
  _tooltip.style.top     = `${ty}px`;
}

function _hideTooltip() {
  if (_tooltip) _tooltip.style.display = 'none';
  _hoveredId = null;
  if (_canvas) _canvas.style.cursor = 'default';
}

// ---------------------------------------------------------------------------
// Unlock confirm (inline overlay)
// ---------------------------------------------------------------------------

function _confirmUnlock(ln) {
  const node = ln.node;

  // Remove any existing confirm
  const existing = document.getElementById('ptc-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ptc-confirm-overlay';
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

  // Click outside to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

function _doUnlock(nodeId) {
  const state    = getState();
  const passives = state.passives;
  if (!passives) return;

  const node = PASSIVE_NODES_MAP[nodeId];
  if (!node) return;

  const { canUnlock, reason } = canUnlockNode(nodeId, passives.unlocked, passives.leyThreads);
  if (!canUnlock) {
    showNotification(reason || 'Cannot unlock', 'warning');
    return;
  }

  passives.leyThreads -= node.cost;
  passives.unlocked.push(nodeId);
  saveState();

  showNotification(`Unlocked: ${node.name}`, 'success');

  // Refresh canvas
  PassiveTreeCanvas.refresh();

  // Update left-panel thread counters directly (avoids circular import)
  _refreshLeftPanel(passives);
}

/** Update the left panel thread counts without importing passives_ui. */
function _refreshLeftPanel(passives) {
  const threadsEl = document.getElementById('passives-threads-value');
  const headerEl  = document.getElementById('passives-header-threads');
  if (threadsEl) threadsEl.textContent = passives.leyThreads;
  if (headerEl)  headerEl.textContent  = passives.leyThreads;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _hitTest(mx, my) {
  // Reverse iteration so topmost (last drawn) node gets priority
  for (let i = _nodes.length - 1; i >= 0; i--) {
    const ln = _nodes[i];
    const dx = mx - ln.x;
    const dy = my - ln.y;
    if (dx * dx + dy * dy <= (ln.radius + 4) * (ln.radius + 4)) {
      return ln;
    }
  }
  return null;
}

/** Shorten node name to fit inside a bubble. */
function _abbreviate(name, radius) {
  // For small nodes, show first word only or up to ~10 chars
  const maxChars = radius < 24 ? 8 : (radius < 32 ? 12 : 18);
  if (name.length <= maxChars) return name;

  // Try to fit two words
  const words = name.split(' ');
  if (words.length >= 2) {
    const two = `${words[0]} ${words[1]}`;
    if (two.length <= maxChars) return two;
    return words[0].slice(0, maxChars - 1) + '…';
  }
  return name.slice(0, maxChars - 1) + '…';
}

function _capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Lighten or darken a hex color by a factor (-1..1).
 * Positive factor brightens, negative darkens.
 */
function _lighten(hex, factor) {
  const [r, g, b] = _hexToRgb(hex);
  if (factor >= 0) {
    return `rgb(${Math.min(255, r + (255 - r) * factor) | 0},${Math.min(255, g + (255 - g) * factor) | 0},${Math.min(255, b + (255 - b) * factor) | 0})`;
  }
  const f = 1 + factor;
  return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
}

function _darken(hex, factor) {
  return _lighten(hex, -factor);
}

function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

/**
 * Convert a hex color string to an rgba() CSS string with the given alpha.
 * @param {string} hex  e.g. '#ff6b35'
 * @param {number} alpha 0..1
 */
function _colorWithAlpha(hex, alpha) {
  const [r, g, b] = _hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
