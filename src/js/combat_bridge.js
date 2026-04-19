/**
 * combat_bridge.js — Bridge between the new action engine and existing state/UI
 *
 * This is the ONLY file that imports from both dungeon/ and state.js.
 * The engine never touches localStorage — all persistence happens here.
 *
 * Public API:
 *   enterCombat()  — called from main.js to start a run
 *   setOnRunEnd()  — not exposed publicly; handled internally
 */

import { getState, saveState } from './state.js';
import { showScreen }          from './ui.js';
import { startRun, setOnRunEnd, bindPopupEvents, resetRunFlags } from './dungeon/dungeon.js';

// Whether popup events have been bound (once per session)
let _popupBound = false;

// ResizeObserver for CSS-scale viewport fit
let _resizeObserver = null;

/**
 * Updates the CSS transform scale of the action-combat-container
 * so it always fits inside the viewport while preserving 1280×720 ratio.
 */
function _updateScale() {
  const container = document.getElementById('action-combat-container');
  if (!container) return;
  const scaleX = window.innerWidth  / 1280;
  const scaleY = window.innerHeight / 720;
  const scale  = Math.min(scaleX, scaleY);
  container.style.transform = `scale(${scale})`;
}

/**
 * Enters the action dungeon combat screen and starts a run.
 * Called from main.js "TEST: Action Dungeon" button.
 */
export function enterCombat() {
  // Show the action combat screen
  showScreen('screen-action-combat');

  // Apply viewport scale
  _updateScale();
  if (!_resizeObserver) {
    window.addEventListener('resize', _updateScale);
    _resizeObserver = true; // flag that handler is attached
  }

  // Bind popup buttons (only once per page load)
  if (!_popupBound) {
    bindPopupEvents();
    _popupBound = true;
  }

  // Reset per-run flags so death/extraction don't carry over
  resetRunFlags();

  // Register run-end callback
  setOnRunEnd(_handleRunEnd);

  // Start the dungeon run
  startRun();
}

/**
 * Handles the end of a run — commits loot to state and returns to map.
 *
 * @param {{ outcome: string, goldEarned: number, xpEarned: number, kills: number }} result
 */
function _handleRunEnd(result) {
  const state = getState();

  if (result.outcome === 'extracted') {
    // Full loot commit
    state.gold += result.goldEarned;
    state.xp   += Math.floor(result.xpEarned);
    saveState();
  } else if (result.outcome === 'died') {
    // 50% XP, no gold (death penalty)
    state.xp += Math.floor(result.xpEarned); // xpEarned already halved in dungeon.js
    saveState();
  }
  // 'aborted' → no state changes

  // Return to map
  showScreen('screen-map');
}
