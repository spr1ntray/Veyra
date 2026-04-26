/**
 * dungeon/passive_runtime.js — Action-engine passive buff aggregator
 *
 * Reads the array of unlocked node IDs from state.passives.unlocked and
 * computes a flat multiplier object consumed by the pivot action-engine at
 * run-start (startRun → combat_bridge.js).
 *
 * Rules (per design spec):
 *  - Multiplier fields (spellDmgMul, maxHpMul, …): multiplicative stacking
 *    (two ×1.10 nodes → ×1.21, NOT ×1.20).
 *  - Flat additive fields (critChance, hpRegenPerSec, pierceCount, aoeRadius):
 *    plain addition, except aoeRadius and pierceCount which use max-wins.
 *  - Hard caps applied after aggregation to prevent runaway builds.
 *
 * Hard caps (from design spec):
 *  spellDmgMul  : ≤ 3.0  of base
 *  moveSpeedMul : ≤ 1.5  of base
 *  maxHpMul     : ≤ 2.5  (but can go below 1 for trade-off nodes — floor 0.5)
 *  dmgTakenMul  : floor 0.40
 *  dodgeChance  : ≤ 0.45
 *  critChance   : ≤ 0.70
 *
 * Export: buildActionBuffs(unlockedIds) → ActionBuffs object
 */

import { PASSIVE_NODES } from '../passives.js';

/** @typedef {Object} ActionBuffs */

/**
 * Returns the zero/identity ActionBuffs object (all bonuses at neutral).
 * Used as the base before any nodes are applied.
 * @returns {ActionBuffs}
 */
function _baseBuffs() {
  return {
    // Combat — spell
    spellDmgMul:    1.0,  // multiplied into Fireball dmg
    spellCdMul:     1.0,  // multiplied into cdTicks
    spellRangeMul:  1.0,  // multiplied into aggroRange in _nearestEnemyInRange
    projSpeedMul:   1.0,  // multiplied into projectile speed
    projRadiusMul:  1.0,  // multiplied into projectile radius / hitbox
    aoeRadius:      0,    // px — if > 0, spawn radial AoE zone on impact
    pierceCount:    0,    // projectile pierces this many targets before dying

    // Combat — crit
    critChance:     0.0,  // 0..1
    critMul:        1.5,  // damage multiplier on crit hit (not changed by nodes yet)

    // Survival
    maxHpMul:       1.0,  // base HP × this
    dmgTakenMul:    1.0,  // incoming damage × this (< 1 = armour)
    hpRegenPerSec:  0,    // flat HP healed per second (in player.update)
    dodgeChance:    0.0,  // 0..1 — full miss vs incoming hit

    // Movement
    moveSpeedMul:   1.0,  // player SPEED constant × this

    // Meta
    goldMul:        1.0,  // gold amount on pickup × this
    xpMul:          1.0,  // xp earned at stopRun × this
  };
}

/**
 * Build a quick id→node lookup from PASSIVE_NODES.
 * Cached in module scope — PASSIVE_NODES is a constant.
 */
let _nodeMapCache = null;
function _getNodeMap() {
  if (!_nodeMapCache) {
    _nodeMapCache = Object.fromEntries(PASSIVE_NODES.map(n => [n.id, n]));
  }
  return _nodeMapCache;
}

/**
 * Aggregates all unlocked passive nodes into a flat ActionBuffs object.
 * Called once per run-start from combat_bridge.js.
 *
 * @param {string[]} unlockedIds — array of node ids from state.passives.unlocked
 * @returns {ActionBuffs}
 */
export function buildActionBuffs(unlockedIds) {
  const buffs   = _baseBuffs();
  const nodeMap = _getNodeMap();

  // Track aoeRadius and pierceCount separately — max-wins semantics
  let maxAoe    = 0;
  let maxPierce = 0;

  for (const id of (unlockedIds || [])) {
    const node = nodeMap[id];
    if (!node || !node.actionEffect) continue; // no pivot-engine effect defined

    const e = node.actionEffect;

    // Multiplicative fields
    if (e.spellDmgMul   != null) buffs.spellDmgMul   *= e.spellDmgMul;
    if (e.spellCdMul    != null) buffs.spellCdMul     *= e.spellCdMul;
    if (e.spellRangeMul != null) buffs.spellRangeMul  *= e.spellRangeMul;
    if (e.projSpeedMul  != null) buffs.projSpeedMul   *= e.projSpeedMul;
    if (e.projRadiusMul != null) buffs.projRadiusMul  *= e.projRadiusMul;
    if (e.maxHpMul      != null) buffs.maxHpMul        *= e.maxHpMul;
    if (e.dmgTakenMul   != null) buffs.dmgTakenMul    *= e.dmgTakenMul;
    if (e.moveSpeedMul  != null) buffs.moveSpeedMul   *= e.moveSpeedMul;
    if (e.goldMul       != null) buffs.goldMul         *= e.goldMul;
    if (e.xpMul         != null) buffs.xpMul           *= e.xpMul;

    // Flat additive fields
    if (e.critChance    != null) buffs.critChance      += e.critChance;
    if (e.hpRegenPerSec != null) buffs.hpRegenPerSec   += e.hpRegenPerSec;

    // Max-wins fields
    if (e.aoeRadius    != null) maxAoe    = Math.max(maxAoe,    e.aoeRadius);
    if (e.pierceCount  != null) maxPierce = Math.max(maxPierce, e.pierceCount);

    // Special: aoeRadius can also be scaled by a multiplier (for pyro_KS02)
    if (e.aoeRadiusMul != null && maxAoe > 0) {
      maxAoe = Math.round(maxAoe * e.aoeRadiusMul);
    }
  }

  buffs.aoeRadius   = maxAoe;
  buffs.pierceCount = maxPierce;

  // ── Hard caps ─────────────────────────────────────────────────────────
  buffs.spellDmgMul  = Math.min(buffs.spellDmgMul,  3.0);
  buffs.moveSpeedMul = Math.min(buffs.moveSpeedMul,  1.5);
  buffs.maxHpMul     = Math.min(Math.max(buffs.maxHpMul, 0.5), 2.5);
  buffs.dmgTakenMul  = Math.max(buffs.dmgTakenMul,  0.40);
  buffs.dodgeChance  = Math.min(buffs.dodgeChance,   0.45);
  buffs.critChance   = Math.min(buffs.critChance,    0.70);

  return buffs;
}
