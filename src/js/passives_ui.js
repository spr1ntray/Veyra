/**
 * passives_ui.js — Ley Loom UI
 * Renders the passive skill tree screen and handles unlock/respec actions.
 */

import { getState, saveState, getStats } from './state.js';
import {
  PASSIVE_NODES,
  PASSIVE_NODES_MAP,
  getUniversalNodes,
  getClassNodes,
  canUnlockNode,
  calcRespecCost
} from './passives.js';
import { showNotification } from './ui.js';

// Expose node map on window so combat.js and state.js can access it without circular import
window._passiveNodesMap = PASSIVE_NODES_MAP;

// Navigation callback — set once from main.js
let _onBack = null;

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

  // --- Right panel content ---
  _renderUniversalSection(unlocked, passives.leyThreads);
  _renderClassSection(unlocked, passives.leyThreads, state.classType);
}

// --- Section renderers ---

function _renderUniversalSection(unlocked, leyThreads) {
  const container = document.getElementById('passives-universal-nodes');
  if (!container) return;

  const nodes = getUniversalNodes();
  container.innerHTML = '';
  _renderNodeGroups(container, nodes, unlocked, leyThreads);
}

function _renderClassSection(unlocked, leyThreads, classType) {
  const container  = document.getElementById('passives-class-nodes');
  const titleEl    = document.getElementById('passives-class-title');
  const noClassEl  = document.getElementById('passives-no-class');

  if (!container) return;
  container.innerHTML = '';

  if (!classType) {
    if (noClassEl) noClassEl.style.display = 'block';
    if (titleEl)   titleEl.textContent = 'Class Skills';
    return;
  }

  if (noClassEl) noClassEl.style.display = 'none';
  if (titleEl) {
    const classLabel = classType.charAt(0).toUpperCase() + classType.slice(1);
    titleEl.textContent = `${classLabel} Skills`;
  }

  const nodes = getClassNodes(classType);
  _renderNodeGroups(container, nodes, unlocked, leyThreads);
}

/**
 * Groups nodes by type (minor/major/keystone) and renders each group.
 */
function _renderNodeGroups(container, nodes, unlocked, leyThreads) {
  const groups = { minor: [], major: [], keystone: [] };

  for (const node of nodes) {
    if (groups[node.type]) groups[node.type].push(node);
  }

  for (const [type, groupNodes] of Object.entries(groups)) {
    if (groupNodes.length === 0) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'passives-type-group';

    const label = document.createElement('div');
    label.className = 'passives-type-label';
    label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    groupEl.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'passives-nodes-grid';

    for (const node of groupNodes) {
      grid.appendChild(_buildNodeCard(node, unlocked, leyThreads));
    }

    groupEl.appendChild(grid);
    container.appendChild(groupEl);
  }
}

/**
 * Builds a single node card element.
 */
function _buildNodeCard(node, unlocked, leyThreads) {
  const { canUnlock, reason } = canUnlockNode(node.id, unlocked, leyThreads);
  const isUnlocked = unlocked.includes(node.id);

  const card = document.createElement('div');
  card.className = 'passive-node';
  card.dataset.type = node.type;
  card.dataset.id   = node.id;

  if (isUnlocked) {
    card.classList.add('node-unlocked');
  } else if (canUnlock) {
    card.classList.add('node-available');
  } else {
    card.classList.add('node-locked');
  }

  // Header row: name + cost
  const header = document.createElement('div');
  header.className = 'passive-node-header';

  const nameEl = document.createElement('div');
  nameEl.className = 'passive-node-name';
  nameEl.textContent = node.name;

  const costEl = document.createElement('div');
  costEl.className = 'passive-node-cost';
  costEl.textContent = `${node.cost} Thread${node.cost > 1 ? 's' : ''}`;

  header.appendChild(nameEl);
  header.appendChild(costEl);
  card.appendChild(header);

  // Description
  const descEl = document.createElement('div');
  descEl.className = 'passive-node-desc';
  descEl.textContent = node.description;
  card.appendChild(descEl);

  // Prerequisites hint (only when locked due to prereq)
  if (!isUnlocked && node.requires.length > 0) {
    const metReqs = node.requires.filter(id => unlocked.includes(id));
    if (metReqs.length < node.requires.length) {
      const reqNames = node.requires
        .filter(id => !unlocked.includes(id))
        .map(id => PASSIVE_NODES_MAP[id]?.name || id)
        .join(', ');
      const reqEl = document.createElement('div');
      reqEl.className = 'passive-node-req';
      reqEl.textContent = `Requires: ${reqNames}`;
      card.appendChild(reqEl);
    }
  }

  // Unlock button or unlocked badge
  if (isUnlocked) {
    const badge = document.createElement('div');
    badge.className = 'passive-unlocked-badge';
    badge.textContent = 'Unlocked';
    card.appendChild(badge);
  } else {
    const btn = document.createElement('button');
    btn.className = 'passive-unlock-btn';
    btn.textContent = 'Unlock';
    btn.disabled = !canUnlock;

    if (!canUnlock && reason) {
      btn.title = reason;
    }

    btn.addEventListener('click', () => {
      _handleUnlock(node.id);
    });
    card.appendChild(btn);
  }

  return card;
}

// --- Actions ---

/**
 * Handles clicking "Unlock" on a node.
 */
function _handleUnlock(nodeId) {
  const state   = getState();
  const passives = state.passives;
  if (!passives) return;

  const node = PASSIVE_NODES_MAP[nodeId];
  if (!node) return;

  const { canUnlock, reason } = canUnlockNode(nodeId, passives.unlocked, passives.leyThreads);
  if (!canUnlock) {
    showNotification(reason || 'Cannot unlock this node', 'warning');
    return;
  }

  // Deduct threads and add to unlocked
  passives.leyThreads -= node.cost;
  passives.unlocked.push(nodeId);
  saveState();

  showNotification(`Unlocked: ${node.name}`, 'success');
  renderPassivesScreen();
}

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
