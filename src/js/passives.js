/**
 * passives.js — Passive Skill Tree (Ley Loom)
 * 80 nodes: 8 Universal + 18 per class (4 classes × 10 minor + 6 major + 2 keystone)
 * Each node has: id, name, type, cost, classRestriction, requires[], effect{}, description
 */

export const PASSIVE_NODES = [

  // ===== UNIVERSAL (8 nodes, available to all classes) =====

  {
    id: 'U1', name: 'Resilient Body',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { maxHpPercent: 0.10 },
    description: '+10% Max HP'
  },
  {
    id: 'U2', name: 'Quick Study',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { xpBonus: 0.08 },
    description: '+8% XP from combat'
  },
  {
    id: 'U3', name: 'Fortune Seeker',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { goldBonus: 0.12 },
    description: '+12% gold from combat'
  },
  {
    id: 'U4', name: 'Arcane Efficiency',
    type: 'minor', cost: 2, classRestriction: null, requires: [],
    effect: { castTimeFlat: -0.1 },
    description: '-0.1s cast time on all spells'
  },
  {
    id: 'U5', name: 'Battle Hardened',
    type: 'minor', cost: 2, classRestriction: null, requires: [],
    effect: { damageReduction: 0.05 },
    description: '+5% damage reduction'
  },
  {
    id: 'U6', name: 'Mana Overflow',
    type: 'major', cost: 2, classRestriction: null, requires: [],
    effect: { shieldBurstDamage: 0.30 },
    description: 'When shield is destroyed: deal 30% of shield HP as arcane damage to enemy'
  },
  {
    id: 'U7', name: 'Second Wind',
    type: 'major', cost: 2, classRestriction: null, requires: [],
    effect: { secondWind: true },
    description: 'Once per battle: when HP drops below 15%, heal 20% max HP'
  },
  {
    id: 'U8', name: 'Executioner',
    type: 'minor', cost: 1, classRestriction: null, requires: [],
    effect: { executioner: 0.15 },
    description: '+15% damage vs enemies below 25% HP'
  },

  // ===== PYROMANCER (18 nodes: 10 minor + 6 major + 2 keystone) =====

  // --- Minor ---
  {
    id: 'P1', name: 'Searing Touch',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { fireDamageBonus: 0.05 },
    description: '+5% fire damage'
  },
  {
    id: 'P2', name: 'Pyromaniac',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { dotDamageBonus: 0.08 },
    description: '+8% DoT damage'
  },
  {
    id: 'P3', name: 'Heat Wave',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { igniteSpeedBonus: 0.10 },
    description: 'Ignite ticks 10% faster'
  },
  {
    id: 'P4', name: 'Burning Blood',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { maxHpPercent: 0.05, fireDamageBonus: 0.03 },
    description: '+5% max HP, +3% fire damage'
  },
  {
    id: 'P5', name: 'Volatile Embers',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { emberDuration: 2 },
    description: 'Ember stacks last +2s'
  },
  {
    id: 'P6', name: 'Kindling',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { firstSpellBonus: 0.10 },
    description: '+10% damage on the first spell cast in battle'
  },
  {
    id: 'P7', name: 'Crucible',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { igniteStackBonus: 0.04 },
    description: '+4% damage per Ignite stack on enemy (max 12%)'
  },
  {
    id: 'P8', name: 'Flash Point',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { scorchCastTime: -0.2 },
    description: 'Scorch cast time -0.2s'
  },
  {
    id: 'P9', name: 'Fire Eater',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { igniteHeal: 2 },
    description: 'Heal 2 HP per Ignite tick'
  },
  {
    id: 'P10', name: 'Smoke Screen',
    type: 'minor', cost: 1, classRestriction: 'pyromancer', requires: [],
    effect: { postFireDodge: 0.08 },
    description: '8% dodge for 2s after casting a fire spell'
  },

  // --- Major ---
  // P11 requires P1 (Searing Touch) + P4 (Burning Blood) — two minor nodes on fire-damage branch
  {
    id: 'P11', name: 'Infernal Momentum',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P1', 'P4'],
    effect: { infernalMomentum: true },
    description: 'Each fire cast grants +5% to the next (max 25%); resets on non-fire spell'
  },
  // P12 requires P2 (Pyromaniac) + P7 (Crucible) — two minor nodes on DoT/Ignite branch
  {
    id: 'P12', name: 'Living Furnace',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P2', 'P7'],
    effect: { igniteMaxStacks: 5 },
    description: 'Ignite max stacks increased from 3 to 5'
  },
  // P13 requires P1 (Searing Touch) + P6 (Kindling) — fire damage + first-strike branch
  {
    id: 'P13', name: 'Meltdown',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P1', 'P6'],
    effect: { meltdown: 0.20 },
    description: '+20% fire damage vs enemies below 30% HP'
  },
  // P14 requires P2 (Pyromaniac) + P3 (Heat Wave) — DoT synergy branch
  {
    id: 'P14', name: 'Backdraft',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P2', 'P3'],
    effect: { backdraft: 0.50 },
    description: 'When Ignite expires: final explosion for 50% of total DoT dealt'
  },
  // P15 requires P4 (Burning Blood) + P8 (Flash Point) — sustain/survivability branch
  {
    id: 'P15', name: 'Forge Shield',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P4', 'P8'],
    effect: { forgeShield: 0.15 },
    description: 'Every 4th fire cast: gain shield equal to 15% of damage dealt'
  },
  // P16 requires P2 (Pyromaniac) + P5 (Volatile Embers) — ember/DoT explosion branch
  {
    id: 'P16', name: 'Chain Reaction',
    type: 'major', cost: 2, classRestriction: 'pyromancer', requires: ['P2', 'P5'],
    effect: { chainReaction: 0.30 },
    description: 'Living Bomb explosion: 30% chance to apply 1 Ignite stack'
  },

  // --- Keystone ---
  // Path to P-K1: P1 → P4 → P11 (Major) + P6 → P13 (Major) + P9 (extra minor) = 5 nodes, ~9 threads
  {
    id: 'P-K1', name: 'Conflagration',
    type: 'keystone', cost: 3, classRestriction: 'pyromancer', requires: ['P11', 'P9'],
    effect: { conflagration: true },
    description: '+20% Ignite chance, Ignite damage +30%, direct fire damage -10%'
  },
  // Path to P-K2: P2 → P7 → P12 (Major) + P9 (Fire Eater) as extra minor = 4 nodes, ~8 threads
  {
    id: 'P-K2', name: 'Phoenix Protocol',
    type: 'keystone', cost: 3, classRestriction: 'pyromancer', requires: ['P12', 'P10'],
    effect: { phoenixProtocol: true, maxHpPercent: -0.15 },
    description: 'Once per battle: resurrect with 30% HP. -15% max HP.'
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
 * Requirements: player has enough Ley Threads AND all prerequisite nodes are unlocked.
 *
 * @param {string} nodeId
 * @param {string[]} unlockedIds - currently unlocked node ids
 * @param {number} leyThreads - available threads
 * @returns {{ canUnlock: boolean, reason: string|null }}
 */
export function canUnlockNode(nodeId, unlockedIds, leyThreads) {
  const node = PASSIVE_NODES_MAP[nodeId];
  if (!node) return { canUnlock: false, reason: 'Unknown node' };
  if (unlockedIds.includes(nodeId)) return { canUnlock: false, reason: 'Already unlocked' };

  if (leyThreads < node.cost) {
    return { canUnlock: false, reason: `Need ${node.cost} Ley Thread${node.cost > 1 ? 's' : ''}` };
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
