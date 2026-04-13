/**
 * passives_ui.js — Ley Loom UI
 * Manages the left panel (threads, respec) and delegates the node visualisation
 * to PassiveTreeCanvas (Canvas 2D constellation renderer).
 */

import { getState, saveState } from './state.js';
import {
  PASSIVE_NODES_MAP,
  calcRespecCost
} from './passives.js';
import { showNotification } from './ui.js';
import { PassiveTreeCanvas } from './passives_canvas.js';

// Expose node map on window so combat.js and state.js can access it without circular import
window._passiveNodesMap = PASSIVE_NODES_MAP;

// Navigation callback — set once from main.js
let _onBack = null;
// Track whether the canvas has been initialised
let _canvasReady = false;

/**
 * Initialises the passives screen navigation (call once from main.js).
 * @param {{ onBack: function }} opts
 */
export function initPassivesScreen({ onBack }) {
  _onBack = onBack;

  const backBtn = document.getElementById('btn-passives-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (_onBack) _onBack();
    });
  }

  // Initialise the canvas inside the right panel container
  const canvasContainer = document.getElementById('passives-canvas-container');
  if (canvasContainer && !_canvasReady) {
    PassiveTreeCanvas.init(canvasContainer);
    _canvasReady = true;
  }
}

/**
 * Renders the full passives screen from current state.
 * Call this whenever the screen becomes visible.
 */
export function renderPassivesScreen() {
  const state = getState();
  const passives = state.passives || { leyThreads: 0, leyThreadsTotal: 0, unlocked: [], respecCount: 0 };
  const unlocked = passives.unlocked || [];

  // --- Left panel ---
  const nameEl    = document.getElementById('passives-char-name');
  const classEl   = document.getElementById('passives-char-class');
  const threadsEl = document.getElementById('passives-threads-value');
  const totalEl   = document.getElementById('passives-threads-total');
  const respecBtn = document.getElementById('btn-passives-respec');

  if (nameEl) nameEl.textContent = state.name;
  if (classEl) {
    classEl.textContent = state.classType
      ? state.classType.charAt(0).toUpperCase() + state.classType.slice(1)
      : 'No Class';
  }
  if (threadsEl) threadsEl.textContent = passives.leyThreads;
  if (totalEl) totalEl.textContent = `${passives.leyThreadsTotal} total earned`;

  const respecCost = calcRespecCost(unlocked);
  if (respecBtn) {
    respecBtn.disabled = unlocked.length === 0;
    respecBtn.textContent = `Respec All (${respecCost}g)`;
  }

  // --- Header threads display ---
  const headerCountEl = document.getElementById('passives-header-threads');
  if (headerCountEl) {
    headerCountEl.textContent = passives.leyThreads;
  }

  // --- Right panel content: delegate to canvas ---
  if (_canvasReady) {
    PassiveTreeCanvas.refresh();
  }
}

// --- Actions ---

/**
 * Handles the "Respec All" button — shows inline confirm dialog.
 */
export function handleRespec() {
  const state = getState();
  const passives = state.passives;
  if (!passives || passives.unlocked.length === 0) return;

  const cost = calcRespecCost(passives.unlocked);
  if (state.gold < cost) {
    showNotification(`Need ${cost}g to respec (you have ${state.gold}g)`, 'warning');
    return;
  }

  // Show confirm dialog in the right panel
  const rightPanel = document.getElementById('passives-right-panel');
  if (!rightPanel) return;

  // Remove any existing confirm dialog
  const existing = document.getElementById('passives-respec-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.id = 'passives-respec-dialog';
  dialog.className = 'passives-respec-confirm';
  dialog.innerHTML = `
    <p>Reset all ${passives.unlocked.length} passive node${passives.unlocked.length > 1 ? 's' : ''}?<br>
    Cost: <strong>${cost} gold</strong></p>
    <div class="passives-respec-confirm-btns">
      <button class="btn-respec-confirm" id="btn-respec-yes">Confirm Respec</button>
      <button class="btn-respec-cancel" id="btn-respec-no">Cancel</button>
    </div>
  `;

  rightPanel.insertBefore(dialog, rightPanel.firstChild);

  document.getElementById('btn-respec-yes')?.addEventListener('click', () => {
    _performRespec();
    dialog.remove();
  });
  document.getElementById('btn-respec-no')?.addEventListener('click', () => {
    dialog.remove();
  });
}

/**
 * Executes the full respec: refunds all threads, charges gold.
 */
function _performRespec() {
  const state   = getState();
  const passives = state.passives;
  if (!passives) return;

  const cost = calcRespecCost(passives.unlocked);
  if (state.gold < cost) {
    showNotification('Not enough gold for respec', 'warning');
    return;
  }

  // Refund threads spent (restore leyThreads to leyThreadsTotal - 0 = all)
  let refundedThreads = 0;
  for (const id of passives.unlocked) {
    const node = PASSIVE_NODES_MAP[id];
    if (node) refundedThreads += node.cost;
  }

  state.gold -= cost;
  passives.leyThreads += refundedThreads;
  passives.unlocked = [];
  passives.respecCount++;
  saveState();

  showNotification(`Respec complete! ${refundedThreads} threads refunded. ${cost}g spent.`, 'info');
  renderPassivesScreen();
}

/**
 * Binds the respec button (call once from main.js or initPassivesScreen).
 */
export function bindPassivesEvents() {
  document.getElementById('btn-passives-respec')?.addEventListener('click', handleRespec);
}
