/**
 * passives.js — Passive Skill Tree (Sigil Tree)
 * 80 nodes: 8 Universal + 18 per class (4 classes × 10 minor + 6 major + 2 keystone)
 * Each node has: id, name, type, cost, classRestriction, requires[], effect{}, description
 */

export const PASSIVE_NODES = [

  // ===== UNIVERSAL (8 nodes, available to all classes) =====
  // IDs: U_M01–U_M04 (minor), U_J01–U_J03 (major), U_KS (keystone)
  // actionEffect: pivot-engine multipliers consumed by passive_runtime.js
  // effect: legacy autocast-engine fields (kept for state.js aggregation compat)

  {
    id: 'U_M01', name: 'Vital Bloom',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { maxHpPercent: 0.12 },
    actionEffect: { maxHpMul: 1.12 },
    description: '+12% Max HP'
  },
  {
    id: 'U_M02', name: "Hunter's Pace",
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: {},
    actionEffect: { moveSpeedMul: 1.08 },
    description: '+8% movement speed'
  },
  {
    id: 'U_M03', name: 'Sigil Conductor',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { fireDamageBonus: 0.10 },
    actionEffect: { spellDmgMul: 1.10 },
    description: '+10% spell damage'
  },
  {
    id: 'U_M04', name: "Hawk's Eye",
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: {},
    actionEffect: { spellRangeMul: 1.15 },
    description: '+15% cast range'
  },
  {
    id: 'U_J01', name: 'Stone Lung',
    type: 'major', cost: 2, classRestriction: null, requires: ['U_M01'],
    effect: { maxHpPercent: 0.18, damageReduction: 0.05 },
    actionEffect: { maxHpMul: 1.18, dmgTakenMul: 0.95 },
    description: '+18% Max HP, +5% damage reduction'
  },
  {
    id: 'U_J02', name: "Glassblower's Focus",
    type: 'major', cost: 2, classRestriction: null, requires: ['U_M03'],
    effect: { fireDamageBonus: 0.15 },
    actionEffect: { spellDmgMul: 1.15, dmgTakenMul: 1.12 },
    description: '+15% spell damage, +12% damage taken (trade-off)'
  },
  {
    id: 'U_J03', name: 'Wayfarer',
    type: 'major', cost: 2, classRestriction: null, requires: [],
    effect: { goldBonus: 0.12, xpBonus: 0.12 },
    actionEffect: { goldMul: 1.12, xpMul: 1.12 },
    description: '+12% gold, +12% XP'
  },
  {
    id: 'U_KS', name: 'Crimson Veil',
    type: 'keystone', cost: 3, classRestriction: null, requires: ['U_J01', 'U_J02'],
    effect: { fireDamageBonus: 0.30, maxHpPercent: -0.20 },
    actionEffect: { spellDmgMul: 1.30, maxHpMul: 0.80 },
    description: '+30% spell damage, -20% Max HP (glass cannon)'
  },

  // ===== PYROMANCER (18 nodes: 12 minor + 4 major + 2 keystone) =====
  // All nodes work in pivot action-engine via actionEffect.
  // TODO: Stormcaller / Tidecaster / Geomancer nodes below do NOT work in
  //       pivot action-engine yet — they only affect legacy autocast combat.
  //       A separate rework ТЗ is pending for S/T/G action-engine integration.

  // --- Minor ---
  {
    id: 'pyro_M01', name: 'Ember Wick',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { fireDamageBonus: 0.12 },
    actionEffect: { spellDmgMul: 1.12 },
    description: '+12% Fireball damage'
  },
  {
    id: 'pyro_M02', name: 'Quicklight',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { spellCdMul: 0.90 },
    description: '-10% Fireball cooldown'
  },
  {
    id: 'pyro_M03', name: 'Heatseeker',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { projRadiusMul: 1.20 },
    description: '+20% projectile size (easier to hit moving targets)'
  },
  {
    id: 'pyro_M04', name: 'Searing Reach',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { spellRangeMul: 1.12 },
    description: '+12% cast range'
  },
  {
    id: 'pyro_M05', name: 'Cinder Veil',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { damageReduction: 0.08 },
    actionEffect: { dmgTakenMul: 0.92 },
    description: '-8% damage taken'
  },
  {
    id: 'pyro_M06', name: 'Furnace Heart',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { maxHpPercent: 0.10 },
    actionEffect: { maxHpMul: 1.10 },
    description: '+10% Max HP'
  },
  {
    id: 'pyro_M07', name: 'Ash Walker',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { moveSpeedMul: 1.06 },
    description: '+6% movement speed (better kiting)'
  },
  {
    id: 'pyro_M08', name: 'Firetongue',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { critChance: 0.05 },
    description: '+5% crit chance on Fireball'
  },
  {
    id: 'pyro_M09', name: 'Sparkfall',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { projSpeedMul: 1.12 },
    description: '+12% projectile speed (less leading shot required)'
  },
  {
    id: 'pyro_M10', name: 'Slow Burn',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { fireDamageBonus: 0.08 },
    actionEffect: { spellDmgMul: 1.08, projSpeedMul: 0.97 },
    description: '+8% Fireball damage, -3% projectile speed (micro trade-off)'
  },
  {
    id: 'pyro_M11', name: 'Reignition',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { hpRegenPerSec: 0.4 },
    description: 'Regenerate 0.4 HP per second'
  },
  {
    id: 'pyro_M12', name: "Mage's Stride",
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: {},
    actionEffect: { moveSpeedMul: 1.06, spellRangeMul: 1.06 },
    description: '+6% movement speed, +6% cast range'
  },

  // --- Major ---
  {
    id: 'pyro_J01', name: 'Crucible Strike',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['pyro_M01'],
    effect: { fireDamageBonus: 0.18 },
    actionEffect: { spellDmgMul: 1.18, critChance: 0.05 },
    description: '+18% spell damage, +5% crit chance'
  },
  {
    id: 'pyro_J02', name: 'Blastwave',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['pyro_M03'],
    effect: {},
    actionEffect: { aoeRadius: 48 },
    description: 'Fireball explodes on impact — AoE 48px radius, 70% damage to nearby enemies'
  },
  {
    id: 'pyro_J03', name: 'Pyre Vigil',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['pyro_M06'],
    effect: { maxHpPercent: 0.20, damageReduction: 0.05 },
    actionEffect: { maxHpMul: 1.20, dmgTakenMul: 0.95, hpRegenPerSec: 0.3 },
    description: '+20% Max HP, +5% damage reduction, +0.3 HP/sec regen'
  },
  {
    id: 'pyro_J04', name: 'Inferno Conduit',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['pyro_M02'],
    effect: { fireDamageBonus: 0.08 },
    actionEffect: { spellCdMul: 0.85, spellDmgMul: 1.08 },
    description: '-15% Fireball cooldown, +8% spell damage'
  },

  // --- Keystone ---
  {
    id: 'pyro_KS01', name: 'Eternal Pyre',
    type: 'keystone', cost: 3, classRestriction: 'pyromancer', requires: ['pyro_J01', 'pyro_J04'],
    effect: { fireDamageBonus: 0.40 },
    actionEffect: { spellDmgMul: 1.40, spellRangeMul: 1.20, moveSpeedMul: 0.75, maxHpMul: 0.85 },
    description: '+40% spell damage, +20% range, -25% movement speed, -15% Max HP (stationary turret build)'
  },
  {
    id: 'pyro_KS02', name: 'Wreath of Cinders',
    type: 'keystone', cost: 3, classRestriction: 'pyromancer', requires: ['pyro_J02'],
    effect: { fireDamageBonus: -0.25 },
    // aoeRadiusMul applied on top of existing aoeRadius from pyro_J02 if both taken
    actionEffect: { pierceCount: 2, aoeRadiusMul: 1.10, spellDmgMul: 0.75, projSpeedMul: 0.90 },
    description: 'Fireball pierces 2 enemies, +10% AoE radius, -25% damage, -10% projectile speed (crowd-control build)'
  },

  // ===== STORMCALLER (18 nodes: 10 minor + 6 major + 2 keystone) =====

  // --- Minor ---
  {
    id: 'S1', name: 'Charged Atmosphere',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { airDamageBonus: 0.05 },
    description: '+5% air damage'
  },
  {
    id: 'S2', name: 'Quick Fingers',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { airCastSpeed: 0.05 },
    description: '+5% cast speed for air spells'
  },
  {
    id: 'S3', name: 'Overcharge',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { staticDischargeDmg: 0.15 },
    description: 'Static Discharge +15% damage'
  },
  {
    id: 'S4', name: 'Storm Surge',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { stormSurge: 0.03 },
    description: '+3% damage per Static charge consumed (max 15%)'
  },
  {
    id: 'S5', name: 'Wind Walker',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { dodgeBonus: 0.08 },
    description: '+8% dodge chance'
  },
  {
    id: 'S6', name: 'Conductive',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { chainLightningRetain: 0.80 },
    description: 'Chain Lightning bounces retain 80% (was 70%)'
  },
  {
    id: 'S7', name: 'Thunder Clap',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { thunderClap: 0.10 },
    description: '10% chance to stun enemy 0.5s on air spell hit'
  },
  {
    id: 'S8', name: 'Tailwind Boost',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { tailwindHaste: 0.50 },
    description: 'Tailwind haste increased to 50% (was 40%)'
  },
  {
    id: 'S9', name: 'Galvanic',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { galvanic: 0.05 },
    description: '+5% damage for 3s after dodging'
  },
  {
    id: 'S10', name: 'Crackling Energy',
    type: 'minor', cost: 1, classRestriction: 'stormcaller', requires: [],
    effect: { cracklingEnergy: 0.05 },
    description: '5% chance to gain +1 free Static charge on cast'
  },

  // --- Major ---
  // S11 requires S1 (Charged Atmosphere) + S4 (Storm Surge) — raw air damage branch
  {
    id: 'S11', name: 'Eye of the Storm',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S1', 'S4'],
    effect: { eyeOfStorm: true },
    description: 'Every 5th cast: next air spell deals ×2 damage'
  },
  // S12 requires S3 (Overcharge) + S10 (Crackling Energy) — Static charge branch
  {
    id: 'S12', name: 'Supercell',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S3', 'S10'],
    effect: { supercell: 0.30 },
    description: 'Static Discharge: 30% chance to proc a second time'
  },
  // S13 requires S2 (Quick Fingers) + S8 (Tailwind Boost) — cast speed / haste branch
  {
    id: 'S13', name: 'Jet Stream',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S2', 'S8'],
    effect: { jetStream: 0.20 },
    description: '3 spells cast in 4s: +20% damage for 3s'
  },
  // S14 requires S3 (Overcharge) + S6 (Conductive) — chain/bounce branch
  {
    id: 'S14', name: 'Ball Lightning Echo',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S3', 'S6'],
    effect: { ballLightningEcho: 0.15 },
    description: 'Ball Lightning ticks: 15% chance to chain to a second hit'
  },
  // S15 requires S5 (Wind Walker) + S9 (Galvanic) — dodge/counter branch
  {
    id: 'S15', name: 'Storm Shield',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S5', 'S9'],
    effect: { stormShield: 0.25 },
    description: 'Zephyr dodge: reflect 25% of avoided damage'
  },
  // S16 requires S1 (Charged Atmosphere) + S7 (Thunder Clap) — air control branch
  {
    id: 'S16', name: 'Magnetic Field',
    type: 'major', cost: 2, classRestriction: 'stormcaller', requires: ['S1', 'S7'],
    effect: { magneticField: 0.10 },
    description: 'Cyclone slow: enemy takes +10% air damage'
  },

  // --- Keystone ---
  // Path to S-K1: S3 → S10 → S12 (Major) + S4 → S11 (Major) + S4 extra = 5 nodes, ~9 threads
  {
    id: 'S-K1', name: 'Perpetual Storm',
    type: 'keystone', cost: 3, classRestriction: 'stormcaller', requires: ['S12', 'S4'],
    effect: { perpetualStorm: true },
    description: 'Static charges no longer auto-discharge. At 10 charges: mega-discharge ×3 damage'
  },
  // Path to S-K2: S5 → S9 → S15 (Major) + S7 (Thunder Clap) as extra minor = 4 nodes, ~8 threads
  {
    id: 'S-K2', name: 'Lightning Rod',
    type: 'keystone', cost: 3, classRestriction: 'stormcaller', requires: ['S15', 'S7'],
    effect: { lightningRod: true },
    description: '-20% incoming damage, 40% lightning counter on hit. Dodge disabled.'
  },

  // ===== TIDECASTER (18 nodes: 10 minor + 6 major + 2 keystone) =====

  // --- Minor ---
  {
    id: 'T1', name: 'Tidal Strength',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { waterDamageBonus: 0.05 },
    description: '+5% water damage'
  },
  {
    id: 'T2', name: 'Deep Currents',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { lifeStealBonus: 0.10 },
    description: '+10% lifesteal effectiveness'
  },
  {
    id: 'T3', name: 'Numbing Cold',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { slowDurationBonus: 0.20 },
    description: '+20% slow duration'
  },
  {
    id: 'T4', name: 'Rejuvenation',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { healingRainBonus: 0.15 },
    description: '+15% healing from Healing Rain'
  },
  {
    id: 'T5', name: 'Permafrost',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { vsSlowedBonus: 0.05 },
    description: '+5% damage vs slowed enemies'
  },
  {
    id: 'T6', name: 'Water Shield',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { waterShield: 10 },
    description: 'When hit while HP > 80%: gain +10 shield'
  },
  {
    id: 'T7', name: 'Undertow',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { undertow: 0.03 },
    description: '+3% damage per active slow effect (max 12%)'
  },
  {
    id: 'T8', name: 'Cold Snap',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { coldSnap: 0.15 },
    description: 'Frost Spike: 15% chance to apply double slow duration'
  },
  {
    id: 'T9', name: 'Ebb and Flow',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { ebbAndFlow: 0.08 },
    description: 'After healing: next spell deals +8% damage'
  },
  {
    id: 'T10', name: 'Thick Skin',
    type: 'minor', cost: 1, classRestriction: 'tidecaster', requires: [],
    effect: { damageReduction: 0.08 },
    description: '+8% damage reduction'
  },

  // --- Major ---
  // T11 requires T2 (Deep Currents) + T9 (Ebb and Flow) — lifesteal/healing synergy branch
  {
    id: 'T11', name: 'Riptide Mastery',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T2', 'T9'],
    effect: { riptideMastery: true },
    description: 'Riptide heals 4% max HP (was 3%), triggers after 4 casts (was 5)'
  },
  // T12 requires T3 (Numbing Cold) + T8 (Cold Snap) — slow control branch
  {
    id: 'T12', name: 'Frozen Ground',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T3', 'T8'],
    effect: { frozenGround: 0.15 },
    description: 'Enemies slowed below 40% attack speed deal -15% damage'
  },
  // T13 requires T4 (Rejuvenation) + T6 (Water Shield) — healing/shield branch
  {
    id: 'T13', name: 'Wellspring',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T4', 'T6'],
    effect: { wellspring: 0.15 },
    description: 'Healing Rain: convert 15% of next spell damage to bonus heal'
  },
  // T14 requires T3 (Numbing Cold) + T5 (Permafrost) — frost/slow damage branch
  {
    id: 'T14', name: 'Glacial Armor',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T3', 'T5'],
    effect: { glacialArmor: 50 },
    description: 'Frozen Tomb: grants +50 shield for its duration'
  },
  // T15 requires T5 (Permafrost) + T7 (Undertow) — bonus damage vs slowed branch
  {
    id: 'T15', name: 'Drown',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T5', 'T7'],
    effect: { drown: 0.60 },
    description: 'Tsunami bonus vs slowed enemies increased to 60% (was 40%)'
  },
  // T16 requires T1 (Tidal Strength) + T10 (Thick Skin) — raw water damage + survivability branch
  {
    id: 'T16', name: 'Tidal Surge',
    type: 'major', cost: 2, classRestriction: 'tidecaster', requires: ['T1', 'T10'],
    effect: { tidalSurge: true },
    description: 'Every 3rd water cast: +25% damage and -0.3s cast time'
  },

  // --- Keystone ---
  // Path to T-K1: T3 → T8 → T12 (Major) + T5 → T14 (Major) + T7 extra = 5 nodes, ~9 threads
  {
    id: 'T-K1', name: 'Absolute Zero',
    type: 'keystone', cost: 3, classRestriction: 'tidecaster', requires: ['T12', 'T7'],
    effect: { absoluteZero: true },
    description: 'All slows reduce enemy damage (50% of slow%). Frozen Tomb +1s. Water casts +0.3s.'
  },
  // Path to T-K2: T2 → T9 → T11 (Major) + T6 (Water Shield) as extra minor = 4 nodes, ~8 threads
  {
    id: 'T-K2', name: 'Leviathan',
    type: 'keystone', cost: 3, classRestriction: 'tidecaster', requires: ['T11', 'T6'],
    effect: { leviathan: true },
    description: 'Lifesteal overflow converts to shield (cap 30% maxHP). Drain Life 70% lifesteal. Non-lifesteal heals -40%.'
  },

  // ===== GEOMANCER (18 nodes: 10 minor + 6 major + 2 keystone) =====

  // --- Minor ---
  {
    id: 'G1', name: 'Bedrock Strength',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { earthDamageBonus: 0.05 },
    description: '+5% earth damage'
  },
  {
    id: 'G2', name: 'Iron Will',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { shieldBonus: 0.08 },
    description: '+8% shield effectiveness'
  },
  {
    id: 'G3', name: 'Aftershock',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { tremorBonus: 0.10 },
    description: '+10% Tremor damage'
  },
  {
    id: 'G4', name: 'Stoneskin Boost',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { stoneSkinBonus: 15 },
    description: 'Stone Skin shield +15 base value'
  },
  {
    id: 'G5', name: 'Unmovable',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { shieldedReduction: 0.05 },
    description: '+5% damage reduction while shielded'
  },
  {
    id: 'G6', name: 'Quake',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { quake: 0.10 },
    description: 'Earthen Spike: 10% chance to stun enemy 0.3s'
  },
  {
    id: 'G7', name: 'Rubble',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { rubble: 20 },
    description: 'When shield is destroyed: deal 20 earth damage to enemy'
  },
  {
    id: 'G8', name: 'Geological Survey',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { geologicalSurvey: 0.05 },
    description: '+5% damage per active buff/shield (max 15%)'
  },
  {
    id: 'G9', name: 'Dense Core',
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { maxHpPercent: 0.12 },
    description: '+12% max HP'
  },
  {
    id: 'G10', name: "Mountain's Patience",
    type: 'minor', cost: 1, classRestriction: 'geomancer', requires: [],
    effect: { mountainPatience: 0.03 },
    description: '+3% damage per second in battle (max 15% after 5s)'
  },

  // --- Major ---
  // G11 requires G2 (Iron Will) + G4 (Stoneskin Boost) — shield sustain branch
  {
    id: 'G11', name: 'Tectonic Plates',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G2', 'G4'],
    effect: { tectonicPlates: 0.03 },
    description: 'Shield regenerates 3% of max shield per second'
  },
  // G12 requires G3 (Aftershock) + G6 (Quake) — stun/tremor branch
  {
    id: 'G12', name: 'Earthquake',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G3', 'G6'],
    effect: { earthquake: true },
    description: 'Petrify stun +0.5s and +10% damage amplification'
  },
  // G13 requires G1 (Bedrock Strength) + G8 (Geological Survey) — offensive damage branch
  {
    id: 'G13', name: 'Magma Core',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G1', 'G8'],
    effect: { magmaCore: 0.10 },
    description: 'While shielded: +10% fire damage bonus'
  },
  // G14 requires G5 (Unmovable) + G7 (Rubble) — damage reduction / counter branch
  {
    id: 'G14', name: 'Obsidian Armor',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G5', 'G7'],
    effect: { obsidianArmor: true },
    description: 'Bedrock passive damage reduction: 3% → 5%'
  },
  // G15 requires G4 (Stoneskin Boost) + G9 (Dense Core) — bulk/shield scaling branch
  {
    id: 'G15', name: 'Landslide',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G4', 'G9'],
    effect: { landslide: 0.30 },
    description: 'Avalanche shield scaling increased to 30% (was 20%)'
  },
  // G16 requires G2 (Iron Will) + G5 (Unmovable) — fortify/shield mastery branch
  {
    id: 'G16', name: 'Living Mountain',
    type: 'major', cost: 2, classRestriction: 'geomancer', requires: ['G2', 'G5'],
    effect: { livingMountain: true },
    description: 'Fortify triples the shield (was doubled)'
  },

  // --- Keystone ---
  // Path to G-K1: G2 → G5 → G16 (Major) + G4 → G11 (Major) + G9 extra = 5 nodes, ~9 threads
  {
    id: 'G-K1', name: 'Unbreakable',
    type: 'keystone', cost: 3, classRestriction: 'geomancer', requires: ['G16', 'G9'],
    effect: { unbreakable: true },
    description: 'Shield cap 150% maxHP (was 100%). Hits below 15% HP blocked while shield > 50% HP. Healing -50%.'
  },
  // Path to G-K2: G2 → G4 → G11 (Major) + G3 → G6 → G12 (Major) + G10 extra = 5 nodes, ~9 threads
  {
    id: 'G-K2', name: 'Seismic Wrath',
    type: 'keystone', cost: 3, classRestriction: 'geomancer', requires: ['G12', 'G10'],
    effect: { seismicWrath: true },
    description: 'Each hit taken: +1 Wrath stack (max 10). +4% damage per stack. At 10: ×3 next earth spell. Shield gen -25%.'
  }

];

/**
 * Returns a map of node id -> node object for O(1) lookups
 */
export const PASSIVE_NODES_MAP = Object.fromEntries(
  PASSIVE_NODES.map(n => [n.id, n])
);

/**
 * Returns nodes for the universal section (classRestriction === null)
 */
export function getUniversalNodes() {
  return PASSIVE_NODES.filter(n => n.classRestriction === null);
}

/**
 * Returns nodes for a specific class
 * @param {string} classType - 'pyromancer' | 'stormcaller' | 'tidecaster' | 'geomancer'
 */
export function getClassNodes(classType) {
  return PASSIVE_NODES.filter(n => n.classRestriction === classType);
}

/**
 * Checks whether a given node can be unlocked given the current unlocked set.
 * Requirements: player has enough Sigils (stored as leyThreads in state for save compat) AND all prerequisite nodes are unlocked.
 *
 * @param {string} nodeId
 * @param {string[]} unlockedIds - currently unlocked node ids
 * @param {number} leyThreads - available sigils (leyThreads field kept for save compat; displayed as "Sigils")
 * @returns {{ canUnlock: boolean, reason: string|null }}
 */
export function canUnlockNode(nodeId, unlockedIds, leyThreads) {
  const node = PASSIVE_NODES_MAP[nodeId];
  if (!node) return { canUnlock: false, reason: 'Unknown node' };
  if (unlockedIds.includes(nodeId)) return { canUnlock: false, reason: 'Already unlocked' };

  if (leyThreads < node.cost) {
    return { canUnlock: false, reason: `Need ${node.cost} Sigil${node.cost > 1 ? 's' : ''}` };
  }

  for (const reqId of node.requires) {
    if (!unlockedIds.includes(reqId)) {
      const reqNode = PASSIVE_NODES_MAP[reqId];
      return { canUnlock: false, reason: `Requires: ${reqNode ? reqNode.name : reqId}` };
    }
  }

  return { canUnlock: true, reason: null };
}

/**
 * Calculates the respec cost in gold: sum of all unlocked node costs × 50
 * @param {string[]} unlockedIds
 * @returns {number}
 */
export function calcRespecCost(unlockedIds) {
  let totalThreads = 0;
  for (const id of unlockedIds) {
    const node = PASSIVE_NODES_MAP[id];
    if (node) totalThreads += node.cost;
  }
  return totalThreads * 50;
}

/**
 * Aggregates all passive bonuses from unlocked nodes into a single flat object.
 * Additive effects are summed; boolean flags are OR'd.
 *
 * Note: proc-based passives (infernalMomentum, phoenixProtocol, etc.) are intentionally
 * omitted here — they are checked directly in combat.js via state.passives.unlocked.
 * This function handles only stat-modifying bonuses (DR, damage%, HP%, etc.).
 *
 * @param {string[]} unlockedIds
 * @returns {object}
 */
export function aggregatePassiveBonuses(unlockedIds) {
  const bonuses = {
    maxHpPercent: 0,
    xpBonus: 0,
    goldBonus: 0,
    castTimeFlat: 0,
    damageReduction: 0,
    fireDamageBonus: 0,
    waterDamageBonus: 0,
    airDamageBonus: 0,
    earthDamageBonus: 0,
    dotDamageBonus: 0,
    shieldBonus: 0,
    executioner: 0,
    shieldBurstDamage: 0,
    secondWind: false,
    lifeStealBonus: 0,
    infernalMomentum: false,
    meltdown: 0,
    backdraft: 0,
    igniteMaxStacks: 0
  };

  for (const id of unlockedIds) {
    const node = PASSIVE_NODES_MAP[id];
    if (!node) continue;
    const e = node.effect;

    if (e.maxHpPercent)       bonuses.maxHpPercent       += e.maxHpPercent;
    if (e.xpBonus)            bonuses.xpBonus            += e.xpBonus;
    if (e.goldBonus)          bonuses.goldBonus          += e.goldBonus;
    if (e.castTimeFlat)       bonuses.castTimeFlat       += e.castTimeFlat;
    if (e.damageReduction)    bonuses.damageReduction    += e.damageReduction;
    if (e.fireDamageBonus)    bonuses.fireDamageBonus    += e.fireDamageBonus;
    if (e.waterDamageBonus)   bonuses.waterDamageBonus   += e.waterDamageBonus;
    if (e.airDamageBonus)     bonuses.airDamageBonus     += e.airDamageBonus;
    if (e.earthDamageBonus)   bonuses.earthDamageBonus   += e.earthDamageBonus;
    if (e.dotDamageBonus)     bonuses.dotDamageBonus     += e.dotDamageBonus;
    if (e.shieldBonus)        bonuses.shieldBonus        += e.shieldBonus;
    if (e.executioner)        bonuses.executioner        += e.executioner;
    if (e.shieldBurstDamage)  bonuses.shieldBurstDamage  += e.shieldBurstDamage;
    if (e.secondWind)         bonuses.secondWind          = true;
    if (e.lifeStealBonus)     bonuses.lifeStealBonus     += e.lifeStealBonus;
    if (e.infernalMomentum)   bonuses.infernalMomentum    = true;
    if (e.meltdown)           bonuses.meltdown            += e.meltdown;
    if (e.backdraft)          bonuses.backdraft           += e.backdraft;
    if (e.igniteMaxStacks)    bonuses.igniteMaxStacks     = Math.max(bonuses.igniteMaxStacks, e.igniteMaxStacks);
  }

  return bonuses;
}
