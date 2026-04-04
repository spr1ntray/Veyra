/**
 * state.js — управление состоянием игры, localStorage
 * Единственный источник истины для всех данных персонажа
 */

// Ключ для localStorage
const STORAGE_KEY = 'veyra_player';

// Данные всех предметов игры (названия и описания на английском)
export const ITEMS_DATA = {
  // Стартовые предметы (BonusPower: 0, нельзя снять)
  starter_staff: {
    id: 'starter_staff', name: 'Apprentice Staff',
    slot: 'staff', bonus: 0, rarity: 'starter',
    desc: 'Every mage\'s first staff', canUnequip: false,
    img: 'assets/generated/pixel/ICON_001.png'
  },
  starter_hat: {
    id: 'starter_hat', name: 'Worn Hat',
    slot: 'hat', bonus: 0, rarity: 'starter',
    desc: 'Seen better days, but still holds', canUnequip: false,
    img: 'assets/generated/pixel/ICON_002.png'
  },
  starter_cloak: {
    id: 'starter_cloak', name: 'Faded Cloak',
    slot: 'cloak', bonus: 0, rarity: 'starter',
    desc: 'The color faded long ago', canUnequip: false,
    img: 'assets/generated/pixel/ICON_003.png'
  },

  // Common предметы (белый цвет)
  oak_staff: {
    id: 'oak_staff', name: 'Oak Staff',
    slot: 'staff', bonus: 3, rarity: 'common',
    desc: 'Sturdy and reliable', canUnequip: true,
    img: 'assets/generated/pixel/ICON_005.png'
  },
  amethyst_staff: {
    id: 'amethyst_staff', name: 'Amethyst Staff',
    slot: 'staff', bonus: 5, rarity: 'uncommon',
    desc: 'The purple gem faintly glimmers', canUnequip: true,
    img: 'assets/generated/pixel/ICON_006.png'
  },
  novice_hat: {
    id: 'novice_hat', name: 'Novice Hat',
    slot: 'hat', bonus: 3, rarity: 'common',
    desc: 'Simple, but intact', canUnequip: true,
    img: 'assets/generated/pixel/ICON_009.png'
  },
  road_cloak: {
    id: 'road_cloak', name: 'Road Cloak',
    slot: 'cloak', bonus: 3, rarity: 'common',
    desc: 'Smells of campfire smoke', canUnequip: true,
    img: 'assets/generated/pixel/ICON_011.png'
  },

  // Rare посохи (синий цвет)
  void_scepter: {
    id: 'void_scepter', name: 'Void Scepter',
    slot: 'staff', bonus: 20, rarity: 'rare',
    desc: 'Tears holes in reality', canUnequip: true,
    img: 'assets/generated/pixel/ICON_007.png'
  },

  // Epic посохи (фиолетовый цвет)
  ancient_rod: {
    id: 'ancient_rod', name: 'Ancient Rod',
    slot: 'staff', bonus: 30, rarity: 'epic',
    desc: 'Older than the world itself', canUnequip: true,
    img: 'assets/generated/pixel/ICON_008.png'
  },

  // Uncommon шляпы
  runic_hood: {
    id: 'runic_hood', name: 'Runic Hood',
    slot: 'hat', bonus: 14, rarity: 'uncommon',
    desc: 'Runes shimmer in the dark', canUnequip: true,
    img: 'assets/generated/pixel/ICON_13.png'
  },

  // Rare шляпы
  eclipse_hat: {
    id: 'eclipse_hat', name: 'Eclipse Hat',
    slot: 'hat', bonus: 22, rarity: 'rare',
    desc: 'Blocks out all light', canUnequip: true,
    img: 'assets/generated/pixel/ICON_014.png'
  },

  // Epic шляпы
  crown_of_ash: {
    id: 'crown_of_ash', name: 'Crown of Ash',
    slot: 'hat', bonus: 35, rarity: 'epic',
    desc: 'From a fallen king', canUnequip: true,
    img: 'assets/generated/pixel/ICON_010.png'
  },

  // Uncommon плащи
  veil_of_mist: {
    id: 'veil_of_mist', name: 'Veil of Mist',
    slot: 'cloak', bonus: 15, rarity: 'uncommon',
    desc: 'Shifts like fog', canUnequip: true,
    img: 'assets/generated/pixel/ICON_015.png'
  },

  // Rare плащи
  nightweave_cloak: {
    id: 'nightweave_cloak', name: 'Nightweave Cloak',
    slot: 'cloak', bonus: 24, rarity: 'rare',
    desc: 'Woven from shadows', canUnequip: true,
    img: 'assets/generated/pixel/ICON_016.png'
  },

  // Epic плащи
  abyssal_shroud: {
    id: 'abyssal_shroud', name: 'Abyssal Shroud',
    slot: 'cloak', bonus: 38, rarity: 'epic',
    desc: 'The void made cloth', canUnequip: true,
    img: 'assets/generated/pixel/ICON_012.png'
  },

  // Расходники (consumables)
  mana_elixir: {
    id: 'mana_elixir', name: 'Mana Elixir',
    slot: 'consumable', bonus: 0, rarity: 'common',
    desc: '+25% spell damage for 3 combats', canUnequip: false,
    img: 'assets/generated/pixel/ICON_017.png',
    buffId: 'mana_surge', buffCombats: 3,
    price: 50
  },
  crystal_shard: {
    id: 'crystal_shard', name: 'Crystal Shard',
    slot: 'consumable', bonus: 0, rarity: 'common',
    desc: '+15 bonus gold per victory for 5 combats', canUnequip: false,
    img: 'assets/generated/pixel/ICON_018.png',
    buffId: 'crystal_fortune', buffCombats: 5,
    price: 40
  },
  iron_flask: {
    id: 'iron_flask', name: 'Iron Flask',
    slot: 'consumable', bonus: 0, rarity: 'uncommon',
    desc: '+40 max HP for 3 combats', canUnequip: false,
    img: 'assets/generated/pixel/ICON_019.png',
    buffId: 'iron_flask_buff', buffCombats: 3,
    price: 60
  },
  shadow_dust: {
    id: 'shadow_dust', name: 'Shadow Dust',
    slot: 'consumable', bonus: 0, rarity: 'rare',
    desc: '×2 XP for 2 combats', canUnequip: false,
    img: 'assets/generated/pixel/ICON_020.png',
    buffId: 'shadow_dust_buff', buffCombats: 2,
    price: 80
  }
};

// ===== ДАННЫЕ ЗАКЛИНАНИЙ (Grimoire Autocast) =====

export const SPELLS_DATA = {
  // ===== UNIVERSAL SPELLS (available to all classes) =====
  arcane_bolt: {
    id: 'arcane_bolt',
    name: 'Arcane Bolt',
    school: 'arcane',
    baseDmg: { min: 25, max: 40 },
    castTime: 1.8,
    effect: null,
    unlockLevel: 1,
    classRestriction: null, elementType: null, passiveTrigger: true,
    description: 'Pure arcane damage. No frills, just power.',
    color: '#4a90d9',
    glowColor: 'rgba(74,144,217,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  arcane_barrage: {
    id: 'arcane_barrage',
    name: 'Arcane Barrage',
    school: 'arcane',
    baseDmg: { min: 15, max: 20 },
    castTime: 1.0,
    effect: { type: 'multishot', hits: 3 },
    unlockLevel: 4,
    classRestriction: null, elementType: null, passiveTrigger: true,
    description: 'Three arcane missiles. Fast but lower total damage.',
    color: '#6aabf7',
    glowColor: 'rgba(106,171,247,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  mana_shield: {
    id: 'mana_shield',
    name: 'Mana Shield',
    school: 'utility',
    baseDmg: { min: 0, max: 0 },
    castTime: 1.2,
    effect: { type: 'shield', baseShield: 40, intMultiplier: 0.8 },
    unlockLevel: 3,
    classRestriction: null, elementType: null, passiveTrigger: true,
    description: 'Creates a shield of 40 + INT*0.8 HP. Overwrites existing shield.',
    color: '#c9a84c',
    glowColor: 'rgba(201,168,76,0.6)',
    img: 'assets/generated/spell_focus.png'
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    school: 'utility',
    baseDmg: { min: 0, max: 0 },
    castTime: 1.0,
    effect: { type: 'focus', multiplier: 2.0 },
    unlockLevel: 1,
    classRestriction: null, elementType: null, passiveTrigger: false,
    description: 'Next damaging spell deals x2.0 damage.',
    color: '#f1c40f',
    glowColor: 'rgba(241,196,15,0.6)',
    img: 'assets/generated/spell_focus.png'
  },
  // Universal shadow spells (no class restriction)
  shadow_bolt: {
    id: 'shadow_bolt',
    name: 'Shadow Bolt',
    school: 'shadow',
    baseDmg: { min: 20, max: 35 },
    castTime: 1.8,
    effect: { type: 'lifesteal', percent: 0.20 },
    unlockLevel: 2,
    classRestriction: null, elementType: null, passiveTrigger: true,
    description: 'Damage + 20% lifesteal.',
    color: '#8e44ad',
    glowColor: 'rgba(142,68,173,0.6)',
    img: 'assets/generated/spell_shadow_pulse.png'
  },
  void_eruption: {
    id: 'void_eruption',
    name: 'Void Eruption',
    school: 'shadow',
    baseDmg: { min: 40, max: 60 },
    castTime: 2.8,
    effect: { type: 'debuff', debuffType: 'void', ampPercent: 0.15, duration: 5 },
    unlockLevel: 9,
    classRestriction: null, elementType: null, passiveTrigger: true,
    description: 'Damage + debuff: enemy takes +15% damage for 5 sec.',
    color: '#4a235a',
    glowColor: 'rgba(74,35,90,0.7)',
    img: 'assets/generated/spell_shadow_pulse.png'
  },

  // ===== PYROMANCER SPELLS (fire element) =====
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    school: 'fire',
    baseDmg: { min: 30, max: 50 },
    castTime: 2.2,
    effect: null,
    unlockLevel: 3,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'High single-hit damage. A classic.',
    color: '#e74c3c',
    glowColor: 'rgba(231,76,60,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  ignite: {
    id: 'ignite',
    name: 'Ignite',
    school: 'fire',
    baseDmg: { min: 10, max: 15 },
    castTime: 1.5,
    effect: { type: 'dot', tickDmg: 8, ticks: 3, interval: 1.5, maxStacks: 3 },
    unlockLevel: 6,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Weak hit + DoT: 8 dmg/tick, 3 ticks. Stacks up to 3 times.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  scorch: {
    id: 'scorch',
    name: 'Scorch',
    school: 'fire',
    baseDmg: { min: 10, max: 15 },
    castTime: 1.0,
    effect: { type: 'conditional_bonus', condition: 'target_has_ignite', bonusDmgPercent: 0.50 },
    unlockLevel: 10,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Fast cast. +50% damage if target has Ignite.',
    color: '#e74c3c',
    glowColor: 'rgba(231,76,60,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    school: 'fire',
    baseDmg: { min: 50, max: 75 },
    castTime: 3.5,
    effect: null,
    unlockLevel: 15,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Massive fire strike. Highest burst damage in the game. Long cast.',
    color: '#ff4500',
    glowColor: 'rgba(255,69,0,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  pyroblast: {
    id: 'pyroblast',
    name: 'Pyroblast',
    school: 'fire',
    baseDmg: { min: 70, max: 100 },
    castTime: 3.5,
    effect: { type: 'ember_bonus', extraEmberStacks: 2 },
    unlockLevel: 20,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Slow cast, massive damage. Generates 2 Ember stacks instead of 1.',
    color: '#e74c3c',
    glowColor: 'rgba(231,76,60,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  living_bomb: {
    id: 'living_bomb',
    name: 'Living Bomb',
    school: 'fire',
    baseDmg: { min: 25, max: 35 },
    castTime: 2.0,
    effect: { type: 'delayed_detonation', delay: 4.0, detonationDmg: 60 },
    unlockLevel: 28,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Direct damage + timed bomb: detonates after 4s for 60 damage.',
    color: '#e74c3c',
    glowColor: 'rgba(231,76,60,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  flame_wave: {
    id: 'flame_wave',
    name: 'Flame Wave',
    school: 'fire',
    baseDmg: { min: 45, max: 65 },
    castTime: 2.8,
    effect: { type: 'ignite_apply', stacks: 1, scorchWindow: 3.0 },
    unlockLevel: 38,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Damage + applies 1 Ignite stack + Scorch costs 0 cast time for 3s.',
    color: '#e74c3c',
    glowColor: 'rgba(231,76,60,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  cataclysm: {
    id: 'cataclysm',
    name: 'Cataclysm',
    school: 'fire',
    baseDmg: { min: 80, max: 120 },
    castTime: 5.0,
    effect: { type: 'dot', tickDmg: 15, ticks: 5, interval: 1.0, maxStacks: 1 },
    unlockLevel: 50,
    classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
    description: 'Capstone. Massive direct + DoT (15/tick, 5 ticks). Cannot stack.',
    color: '#ff4500',
    glowColor: 'rgba(255,69,0,0.8)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },

  // ===== STORMCALLER SPELLS (air element) =====
  gust: {
    id: 'gust',
    name: 'Gust',
    school: 'air',
    baseDmg: { min: 12, max: 18 },
    castTime: 1.0,
    effect: { type: 'extra_static', extraCharges: 1 },
    unlockLevel: 3,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Fastest spell. Generates +1 extra Static charge.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    school: 'air',
    baseDmg: { min: 25, max: 35 },
    castTime: 1.5,
    effect: { type: 'double_strike', procChance: 0.10 },
    unlockLevel: 6,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Solid damage. 10% chance to strike twice.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  zephyr: {
    id: 'zephyr',
    name: 'Zephyr',
    school: 'air',
    baseDmg: { min: 8, max: 12 },
    castTime: 1.2,
    effect: { type: 'evasion', dodgeChance: 0.25, duration: 3.0, counterDmgPercent: 0.50 },
    unlockLevel: 10,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Low damage. Grants 25% dodge for 3s. On dodge: counter-attack 50% of avoided damage.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.5)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    school: 'air',
    baseDmg: { min: 30, max: 45 },
    castTime: 2.0,
    effect: { type: 'chain', bounces: 2, decayPercent: 0.70 },
    unlockLevel: 15,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Bounces 2 times, each at 70% of previous damage.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tailwind: {
    id: 'tailwind',
    name: 'Tailwind',
    school: 'air',
    baseDmg: { min: 0, max: 0 },
    castTime: 0.5,
    effect: { type: 'haste', hastePercent: 0.40, hasteSpells: 3 },
    unlockLevel: 20,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: false,
    description: 'Next 3 spells cast 40% faster. No damage.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.5)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  ball_lightning: {
    id: 'ball_lightning',
    name: 'Ball Lightning',
    school: 'air',
    baseDmg: { min: 20, max: 30 },
    castTime: 2.5,
    effect: { type: 'persistent_dot', tickDmg: 10, tickInterval: 1.5, duration: 9.0 },
    unlockLevel: 28,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Direct damage + persistent: 10 dmg every 1.5s for 9s (60 total).',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  cyclone: {
    id: 'cyclone',
    name: 'Cyclone',
    school: 'air',
    baseDmg: { min: 35, max: 50 },
    castTime: 2.0,
    effect: { type: 'slow', slowPercent: 0.40, duration: 4.0 },
    unlockLevel: 38,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: "Damage + 40% slow for 4s. Air's only CC.",
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tempest: {
    id: 'tempest',
    name: 'Tempest',
    school: 'air',
    baseDmg: { min: 60, max: 90 },
    castTime: 3.5,
    effect: { type: 'multi_hit_static', hits: 3, hitInterval: 0.5, extraStaticPerHit: 1 },
    unlockLevel: 50,
    classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
    description: 'Capstone. 3 hits over 1.5s, each generates 1 Static charge.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.8)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },

  // ===== TIDECASTER SPELLS (water element) =====
  frost_spike: {
    id: 'frost_spike',
    name: 'Frost Spike',
    school: 'water',
    baseDmg: { min: 20, max: 30 },
    castTime: 1.5,
    effect: { type: 'slow', slowPercent: 0.20, duration: 3 },
    unlockLevel: 3,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Damage + 20% attack slow for 3 sec.',
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  healing_rain: {
    id: 'healing_rain',
    name: 'Healing Rain',
    school: 'water',
    baseDmg: { min: 0, max: 0 },
    castTime: 1.5,
    effect: { type: 'heal', baseHeal: 30, maxHpPercent: 0.05, emergencyMultiplier: 2.0, emergencyThreshold: 0.50 },
    unlockLevel: 6,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Heals mage for 30 + 5% max HP. If HP < 50%: heals 2x.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    school: 'water',
    baseDmg: { min: 25, max: 40 },
    castTime: 2.2,
    effect: { type: 'slow', slowPercent: 0.30, duration: 2.0 },
    unlockLevel: 10,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Stronger slow than Frost Spike. 30% for 2s.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  drain_life: {
    id: 'drain_life',
    name: 'Drain Life',
    school: 'water',
    baseDmg: { min: 15, max: 25 },
    castTime: 2.5,
    effect: { type: 'lifesteal', percent: 0.50 },
    unlockLevel: 15,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Medium damage + 50% lifesteal. Core survival tool.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    school: 'water',
    baseDmg: { min: 25, max: 40 },
    castTime: 2.8,
    effect: { type: 'slow', slowPercent: 0.40, duration: 4 },
    unlockLevel: 20,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Damage + 40% attack slow for 4 sec.',
    color: '#1a6da0',
    glowColor: 'rgba(26,109,160,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tsunami: {
    id: 'tsunami',
    name: 'Tsunami',
    school: 'water',
    baseDmg: { min: 50, max: 70 },
    castTime: 3.5,
    effect: { type: 'conditional_bonus', condition: 'target_is_slowed', bonusDmgPercent: 0.40, slow: { slowPercent: 0.25, duration: 3.0 } },
    unlockLevel: 28,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Damage + 25% slow. If enemy already slowed: +40% damage.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  frozen_tomb: {
    id: 'frozen_tomb',
    name: 'Frozen Tomb',
    school: 'water',
    baseDmg: { min: 15, max: 20 },
    castTime: 2.5,
    effect: { type: 'chill', attackSpeedReduction: 0.70, chillDuration: 2.0, postChillSlow: { slowPercent: 0.40, duration: 3.0 } },
    unlockLevel: 38,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Soft CC: -70% enemy attack speed for 2s, then 40% slow for 3s.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  maelstrom: {
    id: 'maelstrom',
    name: 'Maelstrom',
    school: 'water',
    baseDmg: { min: 45, max: 65 },
    castTime: 4.0,
    effect: { type: 'maelstrom', lifestealPercent: 0.30, slow: { slowPercent: 0.35, duration: 5.0 } },
    unlockLevel: 50,
    classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
    description: 'Capstone. Damage + 30% lifesteal + 35% slow for 5s.',
    color: '#1abc9c',
    glowColor: 'rgba(26,188,156,0.8)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },

  // ===== GEOMANCER SPELLS (earth element) =====
  rock_shard: {
    id: 'rock_shard',
    name: 'Rock Shard',
    school: 'earth',
    baseDmg: { min: 20, max: 30 },
    castTime: 2.0,
    effect: null,
    unlockLevel: 3,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Solid, reliable damage. Bread & butter.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  stone_skin: {
    id: 'stone_skin',
    name: 'Stone Skin',
    school: 'earth',
    baseDmg: { min: 0, max: 0 },
    castTime: 1.5,
    effect: { type: 'class_shield', baseShield: 25, maxHpPercent: 0.10, stacksWithManaShield: true },
    unlockLevel: 6,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Shield: absorbs 25 + 10% max HP. Stacks with Mana Shield.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.5)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tremor: {
    id: 'tremor',
    name: 'Tremor',
    school: 'earth',
    baseDmg: { min: 15, max: 25 },
    castTime: 2.5,
    effect: { type: 'conditional_bonus', condition: 'mage_has_shield', bonusDmgPercent: 0.30, slow: { slowPercent: 0.15, duration: 2.0 } },
    unlockLevel: 10,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Damage + 15% slow. If mage has shield: +30% damage.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.6)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  earthen_spike: {
    id: 'earthen_spike',
    name: 'Earthen Spike',
    school: 'earth',
    baseDmg: { min: 35, max: 50 },
    castTime: 2.2,
    effect: null,
    unlockLevel: 15,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Highest base damage Earth spell. Pure damage.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  fortify: {
    id: 'fortify',
    name: 'Fortify',
    school: 'earth',
    baseDmg: { min: 0, max: 0 },
    castTime: 2.0,
    effect: { type: 'fortify', doubleShield: true, fallbackShield: 50, hardCap: 'mageMaxHP' },
    unlockLevel: 20,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Doubles current shield HP (hard cap: mage max HP). If no shield: creates 50 HP shield.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.5)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    school: 'earth',
    baseDmg: { min: 40, max: 60 },
    castTime: 3.0,
    effect: { type: 'shield_scaling', shieldDmgPercent: 0.20 },
    unlockLevel: 28,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Damage + bonus equal to 20% of current shield HP.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  petrify: {
    id: 'petrify',
    name: 'Petrify',
    school: 'earth',
    baseDmg: { min: 10, max: 15 },
    castTime: 3.0,
    effect: { type: 'petrify', stunDuration: 1.5, damageAmpPercent: 0.25, damageAmpDuration: 3.0 },
    unlockLevel: 38,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Hard CC: 1.5s stun + enemy takes +25% damage for 3s.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.7)',
    img: 'assets/generated/spell_arcane_bolt.png'
  },
  tectonic_shift: {
    id: 'tectonic_shift',
    name: 'Tectonic Shift',
    school: 'earth',
    baseDmg: { min: 55, max: 80 },
    castTime: 4.5,
    effect: { type: 'mega_shield', baseShield: 80, maxHpPercent: 0.20, reflectPercent: 0.25, reflectDuration: 8.0, hardCap: 'mageMaxHP' },
    unlockLevel: 50,
    classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
    description: 'Capstone. Damage + mega-shield (80 + 20% max HP). Reflects 25% for 8s.',
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.8)',
    img: 'assets/generated/spell_arcane_bolt.png'
  }
};

// ===== ДАННЫЕ ВРАГОВ =====

export const ENEMIES_DATA = {
  training_dummy: {
    id: 'training_dummy',
    name: 'Training Dummy',
    hp: 200,
    attack: 0,
    attackInterval: 0,
    resistances: { arcane: 1.0, fire: 1.0, shadow: 1.0, frost: 1.0, air: 1.0, water: 1.0, earth: 1.0 },
    weakness: null,
    elementType: null, // untyped -- no elemental interaction
    xpReward: 5,
    goldReward: { min: 1, max: 2 },
    description: 'Does not attack. For practice.',
    recommendedLevel: 1,
    img: 'assets/generated/training_dummy.png'
  },
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: 'Skeleton Warrior',
    hp: 300,
    attack: 12,
    attackInterval: 2.5,
    resistances: { arcane: 1.0, fire: 1.3, shadow: 0.7, frost: 1.0, air: 1.0, water: 1.0, earth: 0.8 },
    weakness: 'fire',
    elementType: 'earth', // Bone and stone
    xpReward: 12,
    goldReward: { min: 4, max: 7 },
    description: 'Slow and predictable. Weak to Fire.',
    recommendedLevel: 2,
    img: 'assets/generated/training_dummy.png'
  },
  shadow_wraith: {
    id: 'shadow_wraith',
    name: 'Shadow Wraith',
    hp: 250,
    attack: 18,
    attackInterval: 1.8,
    resistances: { arcane: 1.3, fire: 0.7, shadow: 1.0, frost: 1.0, air: 0.8, water: 1.0, earth: 1.0 },
    weakness: 'arcane',
    elementType: 'air', // Ethereal
    xpReward: 15,
    goldReward: { min: 5, max: 9 },
    description: 'Fast attacks, medium HP. High DPS pressure.',
    recommendedLevel: 3,
    img: 'assets/generated/training_dummy.png'
  },
  frost_elemental: {
    id: 'frost_elemental',
    name: 'Frost Elemental',
    hp: 400,
    attack: 10,
    attackInterval: 3.0,
    resistances: { arcane: 1.0, fire: 1.5, shadow: 1.0, frost: 0.5, air: 1.0, water: 0.5, earth: 1.0 },
    weakness: 'fire',
    elementType: 'water', // Ice = water
    xpReward: 18,
    goldReward: { min: 6, max: 11 },
    description: 'Huge HP, weak attacks. A tank.',
    recommendedLevel: 4,
    img: 'assets/generated/training_dummy.png'
  },
  undead_knight: {
    id: 'undead_knight',
    name: 'Undead Knight',
    hp: 450,
    attack: 15,
    attackInterval: 2.0,
    resistances: { arcane: 1.0, fire: 1.3, shadow: 0.7, frost: 0.7, air: 1.0, water: 1.0, earth: 0.8 },
    weakness: 'fire',
    elementType: 'earth', // Heavy armor
    xpReward: 25,
    goldReward: { min: 8, max: 14 },
    description: 'Two resistances, one weakness. Prepared mages only.',
    recommendedLevel: 5,
    img: 'assets/generated/training_dummy.png'
  },
  demon_lord: {
    id: 'demon_lord',
    name: 'Demon Lord',
    hp: 600,
    attack: 22,
    attackInterval: 1.5,
    resistances: { arcane: 1.0, fire: 0.5, shadow: 1.15, frost: 1.3, air: 1.0, water: 1.3, earth: 1.0 },
    weakness: 'frost',
    elementType: 'fire', // Infernal
    xpReward: 35,
    goldReward: { min: 12, max: 20 },
    description: 'High DPS and HP. Boss encounter.',
    recommendedLevel: 7,
    img: 'assets/generated/training_dummy.png'
  },
  void_horror: {
    id: 'void_horror',
    name: 'Void Horror',
    hp: 800,
    attack: 25,
    attackInterval: 1.8,
    resistances: { arcane: 0.7, fire: 1.0, shadow: 1.3, frost: 1.0, air: 1.0, water: 1.0, earth: 1.0 },
    weakness: 'shadow',
    elementType: null, // Void = no element
    xpReward: 50,
    goldReward: { min: 18, max: 30 },
    description: 'Endgame. Optimal rotation required.',
    recommendedLevel: 9,
    img: 'assets/generated/training_dummy.png'
  }
};

// Пулы предметов по слотам для случайного дропа
// Включают все non-starter и non-consumable предметы по слотам
export const ITEM_POOLS = {
  staff: [
    'oak_staff', 'amethyst_staff',  // common / uncommon
    'void_scepter',                  // rare
    'ancient_rod'                    // epic
  ],
  hat: [
    'novice_hat',    // common
    'runic_hood',    // uncommon
    'eclipse_hat',   // rare
    'crown_of_ash'   // epic
  ],
  cloak: [
    'road_cloak',        // common
    'veil_of_mist',      // uncommon
    'nightweave_cloak',  // rare
    'abyssal_shroud'     // epic
  ]
};

// Дефолтное состояние нового игрока
function getDefaultState() {
  const now = Date.now();
  return {
    version: 1,
    name: 'Unnamed Wizard',
    level: 1,
    xp: 0,
    gold: 0,
    classType: null, // выбирается на уровне 3 (pyromancer/stormcaller/tidecaster/geomancer)
    attributePoints: 0,
    attributes: { strength: 0, intelligence: 0 },
    equipment: {
      staff: 'starter_staff',
      hat: 'starter_hat',
      cloak: 'starter_cloak'
    },
    // По 1 штуке каждого не-стартового предмета у которого есть иконка (img)
    // Расходники начинаются с 0 (покупаются в магазине)
    inventory: {
      // 12 уникальных предметов с разными иконками
      oak_staff: 1, amethyst_staff: 1,
      void_scepter: 1,
      ancient_rod: 1,
      novice_hat: 1,
      runic_hood: 1,
      eclipse_hat: 1,
      crown_of_ash: 1,
      road_cloak: 1,
      veil_of_mist: 1,
      nightweave_cloak: 1,
      abyssal_shroud: 1,
      // Расходники — начинают с 0, покупаются в магазине
      mana_elixir: 0,
      crystal_shard: 0,
      iron_flask: 0,
      shadow_dust: 0
    },
    dailyLogin: {
      currentDay: 1,
      lastClaimTimestamp: 0,
      cyclesCompleted: 0
    },
    combat: {
      fightsToday: 0,
      lastFightDate: '',
      consecutiveWins: 0
    },
    // Гримуар: 5 слотов, хранит spell id или null
    grimoire: [null, null, null, null, null],
    buffs: {
      mana_surge:       { active: false, combatsLeft: 0 },
      crystal_fortune:  { active: false, combatsLeft: 0 },
      iron_flask_buff:  { active: false, combatsLeft: 0 },
      shadow_dust_buff: { active: false, combatsLeft: 0 }
    },
    timestamps: {
      firstLogin: now,
      lastLogin: now
    },
    // Состояние класс-пассивов — сбрасывается при каждом бою
    battleState: {
      emberStacks: 0,           // Pyromancer: счётчик Ember (0-5)
      staticChargeCount: 0,     // Stormcaller: счётчик Static Charge (0-10)
      riptideUsed: false,       // Tidecaster: сработал ли Riptide в этом бою
      bedrockActive: false,     // Geomancer: есть ли активный щит (вычисляется по shieldHP)
      shieldHP: 0               // Текущий HP щита (Mana Shield / Stone Skin)
    }
  };
}

// Текущее состояние в памяти
let _state = null;

/**
 * Загружает состояние из localStorage или создаёт новое
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const defaults = getDefaultState();
      // Глубокий мёрдж: гарантируем наличие всех вложенных ключей
      _state = {
        ...defaults,
        ...parsed,
        dailyLogin:  { ...defaults.dailyLogin,  ...(parsed.dailyLogin  || {}) },
        combat:      { ...defaults.combat,       ...(parsed.combat      || {}) },
        timestamps:  { ...defaults.timestamps,   ...(parsed.timestamps  || {}) },
        equipment:   { ...defaults.equipment,    ...(parsed.equipment   || {}) },
        // Инвентарь берём только из сохранения — без мёрджа с defaults
        // чтобы использованные зелья не восстанавливались после перезагрузки
        inventory:   parsed.inventory || defaults.inventory,
        // Гримуар: массив 5 слотов — берём из сохранения если есть
        grimoire:    Array.isArray(parsed.grimoire) ? parsed.grimoire : defaults.grimoire,
        buffs:       {
          mana_surge:       { ...defaults.buffs.mana_surge,       ...((parsed.buffs && parsed.buffs.mana_surge)       || {}) },
          crystal_fortune:  { ...defaults.buffs.crystal_fortune,  ...((parsed.buffs && parsed.buffs.crystal_fortune)  || {}) },
          iron_flask_buff:  { ...defaults.buffs.iron_flask_buff,  ...((parsed.buffs && parsed.buffs.iron_flask_buff)  || {}) },
          shadow_dust_buff: { ...defaults.buffs.shadow_dust_buff, ...((parsed.buffs && parsed.buffs.shadow_dust_buff) || {}) }
        }
      };

      // === Migration: attribute points system ===
      if (_state.attributePoints === undefined) {
        // Grant retroactive points for levels already gained (1 per level after 1)
        _state.attributePoints = Math.max(0, (_state.level || 1) - 1);
      }
      if (!_state.attributes) {
        _state.attributes = { strength: 0, intelligence: 0 };
      }

      // === Migration: class system ===
      if (_state.classType === undefined) {
        _state.classType = null;
      }

      // === Migration: grimoire cleanup for class-restricted spells ===
      // If player has class, remove incompatible spells from grimoire
      if (_state.classType && Array.isArray(_state.grimoire)) {
        _state.grimoire = _state.grimoire.map(spellId => {
          if (!spellId) return null;
          const spell = SPELLS_DATA[spellId];
          if (!spell) return null;
          if (spell.classRestriction && spell.classRestriction !== _state.classType) {
            return null; // Remove incompatible class spells
          }
          return spellId;
        });
      }

      // === Migration: battleState fields ===
      // Старые сейвы не имели battleState — добавляем с дефолтными значениями
      if (!_state.battleState) {
        _state.battleState = {
          emberStacks: 0,
          staticChargeCount: 0,
          riptideUsed: false,
          bedrockActive: false,
          shieldHP: 0
        };
      } else {
        // Частичная миграция: добавляем только отсутствующие поля
        const defaults = getDefaultState().battleState;
        _state.battleState = { ...defaults, ..._state.battleState };
      }

      saveState();
    } else {
      _state = getDefaultState();
    }
  } catch (e) {
    console.error('State load error:', e);
    _state = getDefaultState();
  }
  return _state;
}

/**
 * Сохраняет текущее состояние в localStorage
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.error('State save error:', e);
  }
}

/**
 * Возвращает текущее состояние
 */
export function getState() {
  if (!_state) loadState();
  return _state;
}

/**
 * Вычисляет суммарный BonusPower из экипировки
 */
export function getBonusPower() {
  const state = getState();
  let total = 0;
  for (const slot of ['staff', 'hat', 'cloak']) {
    const itemId = state.equipment[slot];
    if (itemId && ITEMS_DATA[itemId]) {
      total += ITEMS_DATA[itemId].bonus || 0;
    }
  }
  return total;
}

/**
 * Вычисляет производные статы персонажа на основе уровня и экипировки.
 * Возвращает текущие значения и максимумы для прогресс-баров.
 */
export function getStats() {
  const state = getState();
  const bp = getBonusPower();
  const ap = state.attributes || { strength: 0, intelligence: 0 };

  const str = 5 + (state.level - 1) * 2 + ap.strength * 3 + Math.floor(bp * 0.4);
  const int = 5 + (state.level - 1) * 3 + ap.intelligence * 4 + bp;

  // Dynamic max based on level 50, all points in one stat, BiS legendary gear (~150 bp)
  const maxStr = 5 + 49 * 2 + 49 * 3 + Math.floor(150 * 0.4);  // ~310
  const maxInt = 5 + 49 * 3 + 49 * 4 + 150;                      // ~498

  return {
    strength: str,
    intelligence: int,
    maxStrength: maxStr,
    maxIntelligence: maxInt,
    // Derived bonuses from attribute points
    physicalResistBonus: ap.strength * 2,      // +2% physical resistance per STR point
    spellDamageBonus:    ap.intelligence * 3   // +3% spell damage per INT point
  };
}

/**
 * Формула XP до следующего уровня
 */
export function xpForLevel(level) {
  return Math.floor(110 * Math.pow(level, 1.5));
}

/**
 * Добавляет XP и проверяет повышение уровня
 * Возвращает массив уровней которые были получены
 */
export function addXP(amount) {
  const state = getState();
  state.xp += amount;
  const levelUps = [];

  // Проверяем повышение уровня (максимум 50)
  while (state.level < 50) {
    const needed = xpForLevel(state.level);
    if (state.xp >= needed) {
      state.xp -= needed;
      state.level++;
      levelUps.push(state.level);

      // +1 attribute point per level up
      state.attributePoints = (state.attributePoints || 0) + 1;

      // Награда за уровень
      const goldReward = 5 * state.level;
      state.gold += goldReward;
    } else {
      break;
    }
  }

  saveState();
  return levelUps;
}

/**
 * Тратит 1 attribute point на указанный атрибут.
 * @param {'strength'|'intelligence'} attr
 * @returns {boolean} true если успешно
 */
export function spendAttributePoint(attr) {
  if (attr !== 'strength' && attr !== 'intelligence') return false;
  const state = getState();
  if ((state.attributePoints || 0) <= 0) return false;

  state.attributePoints--;
  if (!state.attributes) state.attributes = { strength: 0, intelligence: 0 };
  state.attributes[attr]++;
  saveState();
  return true;
}

/**
 * Добавляет золото
 */
export function addGold(amount) {
  const state = getState();
  state.gold += amount;
  saveState();
}

/**
 * Добавляет предмет в инвентарь
 */
export function addItemToInventory(itemId) {
  const state = getState();
  if (state.inventory.hasOwnProperty(itemId)) {
    state.inventory[itemId]++;
    saveState();
    return true;
  }
  return false;
}

/**
 * Экипирует предмет из инвентаря
 * Возвращает true если успешно
 */
export function equipItem(itemId) {
  const state = getState();
  const item = ITEMS_DATA[itemId];
  if (!item || item.slot === 'consumable') return false;

  // Проверяем наличие в инвентаре
  if (!state.inventory.hasOwnProperty(itemId) || state.inventory[itemId] <= 0) return false;

  const slot = item.slot;
  const currentEquipped = state.equipment[slot];

  // Снимаем текущий предмет если он не стартовый
  if (currentEquipped && ITEMS_DATA[currentEquipped] && ITEMS_DATA[currentEquipped].canUnequip) {
    state.inventory[currentEquipped] = (state.inventory[currentEquipped] || 0) + 1;
  }

  // Экипируем новый предмет
  state.equipment[slot] = itemId;
  state.inventory[itemId]--;

  saveState();
  return true;
}

/**
 * Сбрасывает счётчик боёв если наступил новый день
 */
export function checkDailyReset() {
  const state = getState();
  const today = new Date().toDateString();

  if (state.combat.lastFightDate !== today) {
    state.combat.fightsToday = 0;
    state.combat.lastFightDate = today;
    state.combat.consecutiveWins = 0;
    saveState();
  }
}

/**
 * Проверяет можно ли сегодня заклаймить Daily Login
 */
export function canClaimDailyLogin() {
  const state = getState();
  const lastClaim = state.dailyLogin.lastClaimTimestamp;
  if (lastClaim === 0) return true;

  const lastDate = new Date(lastClaim).toDateString();
  const today = new Date().toDateString();
  return lastDate !== today;
}

/**
 * Данные наград Daily Login (7 дней) — переведены на английский
 */
export const DAILY_REWARDS = [
  { day: 1, gold: 10, item: null, label: '10 gold' },
  { day: 2, gold: 20, item: null, label: '20 gold' },
  { day: 3, gold: 30, item: 'mana_elixir', label: '30 gold + Mana Elixir' },
  { day: 4, gold: 50, item: null, label: '50 gold' },
  { day: 5, gold: 40, item: 'crystal_shard', label: '40 gold + Crystal Shard' },
  { day: 6, gold: 75, item: null, label: '75 gold' },
  { day: 7, gold: 0, item: 'chest', label: 'Training Chest' }
];

/**
 * Выдаёт награду Daily Login
 * Возвращает объект с данными о награде
 */
export function claimDailyLogin() {
  const state = getState();
  if (!canClaimDailyLogin()) return null;

  const dayIndex = (state.dailyLogin.currentDay - 1) % 7;
  const reward = DAILY_REWARDS[dayIndex];

  // Начисляем золото
  if (reward.gold > 0) {
    state.gold += reward.gold;
  }

  let itemReceived = null;

  // Обрабатываем предмет-награду
  if (reward.item === 'chest') {
    // Случайный Common предмет из любого слота
    itemReceived = getRandomCommonItem();
    if (itemReceived) {
      state.inventory[itemReceived] = (state.inventory[itemReceived] || 0) + 1;
    }
  } else if (reward.item) {
    state.inventory[reward.item] = (state.inventory[reward.item] || 0) + 1;
    itemReceived = reward.item;
  }

  // Обновляем данные Daily Login
  state.dailyLogin.lastClaimTimestamp = Date.now();
  if (state.dailyLogin.currentDay >= 7) {
    state.dailyLogin.currentDay = 1;
    state.dailyLogin.cyclesCompleted++;
  } else {
    state.dailyLogin.currentDay++;
  }

  state.timestamps.lastLogin = Date.now();
  saveState();

  return { reward, itemReceived, gold: reward.gold };
}

/**
 * Возвращает случайный Common предмет из всех слотов
 */
export function getRandomCommonItem() {
  const allItems = [...ITEM_POOLS.staff, ...ITEM_POOLS.hat, ...ITEM_POOLS.cloak];
  return allItems[Math.floor(Math.random() * allItems.length)];
}

/**
 * Возвращает случайный дроп-предмет по слоту
 */
export function rollItemDrop() {
  const slots = ['staff', 'hat', 'cloak'];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const pool = ITEM_POOLS[slot];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== ELEMENTAL MODIFIER =====

/**
 * Возвращает множитель урона на основе стихии заклинания и стихии врага.
 * Цикл преимуществ: fire > earth > air > water > fire
 *   +10% если spellElement «силён» против enemyElement
 *   -10% если spellElement «слаб» против enemyElement
 *   1.0  во всех остальных случаях (null, совпадение стихий, нейтральная)
 *
 * @param {string|null} spellElement  - 'fire' | 'air' | 'water' | 'earth' | null
 * @param {string|null} enemyElement  - 'fire' | 'air' | 'water' | 'earth' | null
 * @returns {number} 1.10 (advantage), 0.90 (disadvantage), or 1.0 (neutral)
 */
export function getElementalModifier(spellElement, enemyElement) {
  if (!spellElement || !enemyElement) return 1.0;

  // Таблица стихийных преимуществ/слабостей
  const CYCLE = {
    fire:  { strong: 'earth', weak: 'water' },
    air:   { strong: 'water', weak: 'earth' },
    water: { strong: 'fire',  weak: 'air'   },
    earth: { strong: 'air',   weak: 'fire'  }
  };

  const relations = CYCLE[spellElement];
  if (!relations) return 1.0; // неизвестная стихия — нейтрально

  if (enemyElement === relations.strong) return 1.10; // преимущество +10%
  if (enemyElement === relations.weak)   return 0.90; // слабость -10%
  return 1.0;
}

/**
 * Checks if a spell is available to the player (level + class restriction).
 * @param {string} spellId
 * @param {object} state - player state
 * @returns {boolean}
 */
export function isSpellAvailable(spellId, state) {
  const spell = SPELLS_DATA[spellId];
  if (!spell) return false;
  if (state.level < spell.unlockLevel) return false;
  if (spell.classRestriction && spell.classRestriction !== state.classType) return false;
  return true;
}

/**
 * Returns the reason a spell is locked, or null if available.
 * @param {string} spellId
 * @param {object} state - player state
 * @returns {{ reason: string, detail: string }|null}
 */
export function getSpellLockReason(spellId, state) {
  const spell = SPELLS_DATA[spellId];
  if (!spell) return { reason: 'unknown', detail: 'Spell not found' };
  if (spell.classRestriction && spell.classRestriction !== state.classType) {
    const className = spell.classRestriction.charAt(0).toUpperCase() + spell.classRestriction.slice(1);
    return { reason: 'wrong_class', detail: `Requires ${className}` };
  }
  if (state.level < spell.unlockLevel) {
    return { reason: 'level_too_low', detail: `Unlocks at level ${spell.unlockLevel}` };
  }
  return null;
}

/**
 * Возвращает список заклинаний доступных на текущем уровне игрока
 * Includes class-restricted filtering
 */
export function getUnlockedSpells() {
  const state = getState();
  return Object.values(SPELLS_DATA).filter(s => isSpellAvailable(s.id, state));
}

/**
 * Returns ALL spells visible in the grimoire (including locked ones for display).
 * Each spell gets an extra `_locked` and `_lockReason` property.
 */
export function getAllVisibleSpells() {
  const state = getState();
  return Object.values(SPELLS_DATA).map(spell => {
    const lockReason = getSpellLockReason(spell.id, state);
    return {
      ...spell,
      _locked: lockReason !== null,
      _lockReason: lockReason
    };
  });
}

/**
 * Сохраняет гримуар (массив из 5 spell id или null)
 */
export function saveGrimoire(slots) {
  const state = getState();
  state.grimoire = slots.slice(0, 5);
  saveState();
}

// ===== BUFF SYSTEM =====

/** Metadata for each buff type */
const BUFF_META = {
  mana_surge:       { label: 'Mana Surge',      color: '#4a90d9', symbol: 'M' },
  crystal_fortune:  { label: 'Crystal Fortune', color: '#9b59b6', symbol: 'C' },
  iron_flask_buff:  { label: 'Iron Flask',       color: '#c0392b', symbol: '🛡' },
  shadow_dust_buff: { label: 'Shadow Dust',      color: '#8e44ad', symbol: '✨' }
};

/**
 * Uses a consumable item — activates (or refreshes) its buff.
 * Decrements inventory count. Returns { success, buffId, buffLabel } or null.
 */
export function useConsumable(itemId) {
  const state = getState();
  const item = ITEMS_DATA[itemId];
  if (!item || item.slot !== 'consumable') return null;
  if (!state.inventory[itemId] || state.inventory[itemId] <= 0) return null;

  const buffId = item.buffId;
  if (!buffId || !state.buffs[buffId]) return null;

  // Decrement inventory, удаляем предмет если кончился
  state.inventory[itemId]--;
  if (state.inventory[itemId] <= 0) {
    delete state.inventory[itemId];
  }

  // Activate / refresh buff
  state.buffs[buffId].active = true;
  state.buffs[buffId].combatsLeft = item.buffCombats;

  saveState();

  const meta = BUFF_META[buffId];
  return { success: true, buffId, buffLabel: meta ? meta.label : buffId };
}

/**
 * Called after each combat — decrements combatsLeft on active buffs.
 * Deactivates expired buffs. Returns array of expired buff labels.
 */
export function tickBuffs() {
  const state = getState();
  const expired = [];

  for (const [buffId, buff] of Object.entries(state.buffs)) {
    if (!buff.active) continue;
    buff.combatsLeft--;
    if (buff.combatsLeft <= 0) {
      buff.active = false;
      buff.combatsLeft = 0;
      const meta = BUFF_META[buffId];
      expired.push(meta ? meta.label : buffId);
    }
  }

  saveState();
  return expired;
}

/**
 * Купить предмет в магазине. Возвращает { success, reason }.
 */
export function buyItem(itemId) {
  const state = getState();
  const item = ITEMS_DATA[itemId];
  if (!item || !item.price) return { success: false, reason: 'not_for_sale' };
  if (state.gold < item.price) return { success: false, reason: 'no_gold' };
  state.gold -= item.price;
  if (!state.inventory[itemId]) state.inventory[itemId] = 0;
  state.inventory[itemId]++;
  saveState();
  return { success: true };
}

/**
 * Returns array of currently active buffs for UI rendering.
 * Each entry: { buffId, combatsLeft, label, color, symbol }
 */
export function getActiveBuffs() {
  const state = getState();
  const result = [];

  for (const [buffId, buff] of Object.entries(state.buffs)) {
    if (!buff.active) continue;
    const meta = BUFF_META[buffId];
    result.push({
      buffId,
      combatsLeft: buff.combatsLeft,
      label: meta ? meta.label : buffId,
      color: meta ? meta.color : '#888',
      symbol: meta ? meta.symbol : '?'
    });
  }

  return result;
}
