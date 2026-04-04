# Veyra -- Combat Class Mechanics Specification

> **Author**: Game Designer Agent
> **Date**: 2026-03-30
> **Status**: REVISED -- updated per user feedback 2026-03-30
> **Depends on**: mage-classes.md (class definitions), state.js (SPELLS_DATA, ENEMIES_DATA), combat.js (battle system)
> **Implements**: Class spell integration into existing combat.js autocast system

---

## 1. Overview

This document specifies exactly how the 4 mage classes (from `mage-classes.md`) integrate into the existing combat system (`combat.js`). It covers data model changes, combat loop modifications, passive ability triggers, elemental damage modifiers, and damage formulas for every class spell.

---

## 2. Data Model Changes -- SPELLS_DATA

### 2.1 New Fields for ALL Spells

Every entry in `SPELLS_DATA` gains these new fields:

```javascript
{
  // Existing fields remain unchanged: id, name, school, baseDmg, castTime, effect, unlockLevel, description, color, glowColor, img

  // NEW FIELDS:
  classRestriction: null,       // null = universal, 'pyromancer' | 'stormcaller' | 'tidecaster' | 'geomancer'
  elementType: null,            // null = no element, 'fire' | 'air' | 'water' | 'earth'
  passiveTrigger: true,         // boolean: does this spell trigger the class passive? (default true for all)
}
```

### 2.2 Updates to Existing Universal Spells

```javascript
// Arcane Bolt -- stays universal, triggers passives
arcane_bolt: { ...existing, classRestriction: null, elementType: null, passiveTrigger: true }

// Arcane Barrage -- stays universal, triggers passives
arcane_barrage: { ...existing, classRestriction: null, elementType: null, passiveTrigger: true }

// Mana Shield -- stays universal, triggers passives (Geomancer benefits most)
mana_shield: { ...existing, classRestriction: null, elementType: null, passiveTrigger: true }

// Focus -- stays universal, does NOT trigger passives (no damage spell, passive tracking skipped)
focus: { ...existing, classRestriction: null, elementType: null, passiveTrigger: false }
```

### 2.3 Existing Spells That Become Class-Restricted

The following currently-existing spells in SPELLS_DATA need to be reclassified:

```javascript
// Fireball -- becomes Pyromancer class spell (level 3 unlock on class select)
fireball: { ...existing, classRestriction: 'pyromancer', elementType: 'fire', unlockLevel: 3 }

// Ignite -- becomes Pyromancer class spell
ignite: { ...existing, classRestriction: 'pyromancer', elementType: 'fire', unlockLevel: 6 }

// Inferno -- becomes Pyromancer class spell
inferno: { ...existing, classRestriction: 'pyromancer', elementType: 'fire', unlockLevel: 15 }

// Frost Spike -- becomes Tidecaster class spell (not Stormcaller!)
frost_spike: { ...existing, classRestriction: 'tidecaster', elementType: 'water', unlockLevel: 3 }

// Blizzard -- becomes Tidecaster class spell
blizzard: { ...existing, classRestriction: 'tidecaster', elementType: 'water', unlockLevel: 20 }

// Shadow Bolt -- remains universal (remove if desired, or keep as universal shadow option)
shadow_bolt: { ...existing, classRestriction: null, elementType: null }

// Drain Life -- becomes Tidecaster class spell (thematic: water = sustain)
drain_life: { ...existing, classRestriction: 'tidecaster', elementType: 'water', unlockLevel: 15 }

// Void Eruption -- remains universal
void_eruption: { ...existing, classRestriction: null, elementType: null }
```

**Migration concern**: Players who have these spells equipped before choosing a class will need migration handling (see Section 8).

### 2.4 New Class Spells to Add to SPELLS_DATA

#### Pyromancer Spells (fire element)

```javascript
scorch: {
  id: 'scorch', name: 'Scorch', school: 'fire',
  baseDmg: { min: 10, max: 15 }, castTime: 1.0,
  effect: { type: 'conditional_bonus', condition: 'target_has_ignite', bonusDmgPercent: 0.50 },
  unlockLevel: 10, classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
  description: 'Fast cast. +50% damage if target has Ignite.',
  color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

pyroblast: {
  id: 'pyroblast', name: 'Pyroblast', school: 'fire',
  baseDmg: { min: 70, max: 100 }, castTime: 3.5,
  effect: { type: 'ember_bonus', extraEmberStacks: 2 },
  unlockLevel: 20, classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
  description: 'Slow cast, massive damage. Generates 2 Ember stacks instead of 1.',
  color: '#e74c3c', glowColor: 'rgba(231,76,60,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

living_bomb: {
  id: 'living_bomb', name: 'Living Bomb', school: 'fire',
  baseDmg: { min: 25, max: 35 }, castTime: 2.0,
  effect: { type: 'delayed_detonation', delay: 4.0, detonationDmg: 60 },
  unlockLevel: 28, classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
  description: 'Direct damage + timed bomb: detonates after 4s for 60 damage.',
  color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

flame_wave: {
  id: 'flame_wave', name: 'Flame Wave', school: 'fire',
  baseDmg: { min: 45, max: 65 }, castTime: 2.8,
  effect: { type: 'ignite_apply', stacks: 1, scorchWindow: 3.0 },
  unlockLevel: 38, classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
  description: 'Damage + applies 1 Ignite stack + Scorch costs 0 cast time for 3s.',
  color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

cataclysm: {
  id: 'cataclysm', name: 'Cataclysm', school: 'fire',
  baseDmg: { min: 80, max: 120 }, castTime: 5.0,
  effect: { type: 'dot', tickDmg: 15, ticks: 5, interval: 1.0, maxStacks: 1 },
  unlockLevel: 50, classRestriction: 'pyromancer', elementType: 'fire', passiveTrigger: true,
  description: 'Capstone. Massive direct + DoT (15/tick, 5 ticks). Cannot stack.',
  color: '#ff4500', glowColor: 'rgba(255,69,0,0.8)', img: 'assets/generated/spell_arcane_bolt.png'
}
```

#### Stormcaller Spells (air element)

```javascript
gust: {
  id: 'gust', name: 'Gust', school: 'air',
  baseDmg: { min: 12, max: 18 }, castTime: 1.0,
  effect: { type: 'extra_static', extraCharges: 1 },
  unlockLevel: 3, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Fastest spell. Generates +1 extra Static charge.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

lightning_bolt: {
  id: 'lightning_bolt', name: 'Lightning Bolt', school: 'air',
  baseDmg: { min: 25, max: 35 }, castTime: 1.5,
  effect: { type: 'double_strike', procChance: 0.10 },
  unlockLevel: 6, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Solid damage. 10% chance to strike twice.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

zephyr: {
  id: 'zephyr', name: 'Zephyr', school: 'air',
  baseDmg: { min: 8, max: 12 }, castTime: 1.2,
  effect: { type: 'evasion', dodgeChance: 0.25, duration: 3.0, counterDmgPercent: 0.50 },
  unlockLevel: 10, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Low damage. Grants 25% dodge chance for 3s. On successful dodge: counter-attack for 50% of avoided damage.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.5)', img: 'assets/generated/spell_arcane_bolt.png'
},

chain_lightning: {
  id: 'chain_lightning', name: 'Chain Lightning', school: 'air',
  baseDmg: { min: 30, max: 45 }, castTime: 2.0,
  effect: { type: 'chain', bounces: 2, decayPercent: 0.70 },
  unlockLevel: 15, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Bounces 2 times, each at 70% of previous damage.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

tailwind: {
  id: 'tailwind', name: 'Tailwind', school: 'air',
  baseDmg: { min: 0, max: 0 }, castTime: 0.5,
  effect: { type: 'haste', hastePercent: 0.40, hasteSpells: 3 },
  unlockLevel: 20, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: false, // no damage spell, passive tracking skipped
  description: 'Next 3 spells cast 40% faster. No damage.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.5)', img: 'assets/generated/spell_arcane_bolt.png'
},

ball_lightning: {
  id: 'ball_lightning', name: 'Ball Lightning', school: 'air',
  baseDmg: { min: 20, max: 30 }, castTime: 2.5,
  effect: { type: 'persistent_dot', tickDmg: 10, tickInterval: 1.5, duration: 9.0 },
  unlockLevel: 28, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Direct damage + persistent: 10 dmg every 1.5s for 9s (60 total).',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

cyclone: {
  id: 'cyclone', name: 'Cyclone', school: 'air',
  baseDmg: { min: 35, max: 50 }, castTime: 2.0,
  effect: { type: 'slow', slowPercent: 0.40, duration: 4.0 },
  unlockLevel: 38, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Damage + 40% slow for 4s. Air\'s only CC.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

tempest: {
  id: 'tempest', name: 'Tempest', school: 'air',
  baseDmg: { min: 60, max: 90 }, castTime: 3.5,
  effect: { type: 'multi_hit_static', hits: 3, hitInterval: 0.5, extraStaticPerHit: 1 },
  unlockLevel: 50, classRestriction: 'stormcaller', elementType: 'air', passiveTrigger: true,
  description: 'Capstone. 3 hits over 1.5s, each generates 1 Static charge.',
  color: '#3498db', glowColor: 'rgba(52,152,219,0.8)', img: 'assets/generated/spell_arcane_bolt.png'
}
```

#### Tidecaster Spells (water element)

```javascript
// frost_spike -- already exists, reclassified (see 2.3)
// drain_life -- already exists, reclassified (see 2.3)
// blizzard -- already exists, reclassified (see 2.3)

healing_rain: {
  id: 'healing_rain', name: 'Healing Rain', school: 'water',
  baseDmg: { min: 0, max: 0 }, castTime: 1.5,
  effect: { type: 'heal', baseHeal: 30, maxHpPercent: 0.05, emergencyMultiplier: 2.0, emergencyThreshold: 0.50 },
  unlockLevel: 6, classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
  description: 'Heals mage for 30 + 5% max HP. Cast time 1.5s. If HP < 50% when cast: heals for 2x.',
  color: '#1abc9c', glowColor: 'rgba(26,188,156,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

tidal_wave: {
  id: 'tidal_wave', name: 'Tidal Wave', school: 'water',
  baseDmg: { min: 25, max: 40 }, castTime: 2.2,
  effect: { type: 'slow', slowPercent: 0.30, duration: 2.0 },
  unlockLevel: 10, classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
  description: 'Stronger slow than Frost Spike. 30% for 2s.',
  color: '#1abc9c', glowColor: 'rgba(26,188,156,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

tsunami: {
  id: 'tsunami', name: 'Tsunami', school: 'water',
  baseDmg: { min: 50, max: 70 }, castTime: 3.5,
  effect: { type: 'conditional_bonus', condition: 'target_is_slowed', bonusDmgPercent: 0.40, slow: { slowPercent: 0.25, duration: 3.0 } },
  unlockLevel: 28, classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
  description: 'Damage + 25% slow. If enemy already slowed: +40% damage.',
  color: '#1abc9c', glowColor: 'rgba(26,188,156,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

frozen_tomb: {
  id: 'frozen_tomb', name: 'Frozen Tomb', school: 'water',
  baseDmg: { min: 15, max: 20 }, castTime: 2.5,
  effect: { type: 'chill', attackSpeedReduction: 0.70, chillDuration: 2.0, postChillSlow: { slowPercent: 0.40, duration: 3.0 } },
  unlockLevel: 38, classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
  description: 'Soft CC: reduces enemy attack speed by 70% for 2s. Then 40% slow for 3s. (Does NOT fully freeze -- enemy can still attack slowly, preventing guaranteed long casts under CC.)',
  color: '#1abc9c', glowColor: 'rgba(26,188,156,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

maelstrom: {
  id: 'maelstrom', name: 'Maelstrom', school: 'water',
  baseDmg: { min: 45, max: 65 }, castTime: 4.0,
  effect: { type: 'maelstrom', lifestealPercent: 0.30, slow: { slowPercent: 0.35, duration: 5.0 } },
  unlockLevel: 50, classRestriction: 'tidecaster', elementType: 'water', passiveTrigger: true,
  description: 'Capstone. Damage + 30% lifesteal + 35% slow for 5s.',
  color: '#1abc9c', glowColor: 'rgba(26,188,156,0.8)', img: 'assets/generated/spell_arcane_bolt.png'
}
```

#### Geomancer Spells (earth element)

```javascript
rock_shard: {
  id: 'rock_shard', name: 'Rock Shard', school: 'earth',
  baseDmg: { min: 20, max: 30 }, castTime: 2.0,
  effect: null,
  unlockLevel: 3, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Solid, reliable damage. Bread & butter.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

stone_skin: {
  id: 'stone_skin', name: 'Stone Skin', school: 'earth',
  baseDmg: { min: 0, max: 0 }, castTime: 1.5,
  effect: { type: 'class_shield', baseShield: 25, maxHpPercent: 0.10, stacksWithManaShield: true },
  unlockLevel: 6, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Shield: absorbs 25 + 10% max HP. Stacks with Mana Shield.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.5)', img: 'assets/generated/spell_arcane_bolt.png'
},

tremor: {
  id: 'tremor', name: 'Tremor', school: 'earth',
  baseDmg: { min: 15, max: 25 }, castTime: 2.5,
  effect: { type: 'conditional_bonus', condition: 'mage_has_shield', bonusDmgPercent: 0.30, slow: { slowPercent: 0.15, duration: 2.0 } },
  unlockLevel: 10, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Damage + 15% slow. If mage has shield: +30% damage.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.6)', img: 'assets/generated/spell_arcane_bolt.png'
},

earthen_spike: {
  id: 'earthen_spike', name: 'Earthen Spike', school: 'earth',
  baseDmg: { min: 35, max: 50 }, castTime: 2.2,
  effect: null,
  unlockLevel: 15, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Highest base damage Earth spell. Pure damage.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

fortify: {
  id: 'fortify', name: 'Fortify', school: 'earth',
  baseDmg: { min: 0, max: 0 }, castTime: 2.0,
  effect: { type: 'fortify', doubleShield: true, fallbackShield: 50, hardCap: 'mageMaxHP' },
  unlockLevel: 20, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Doubles current shield HP (hard cap: mage max HP). If no shield: creates 50 HP shield.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.5)', img: 'assets/generated/spell_arcane_bolt.png'
},

avalanche: {
  id: 'avalanche', name: 'Avalanche', school: 'earth',
  baseDmg: { min: 40, max: 60 }, castTime: 3.0,
  effect: { type: 'shield_scaling', shieldDmgPercent: 0.20 },
  unlockLevel: 28, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Damage + bonus equal to 20% of current shield HP.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

petrify: {
  id: 'petrify', name: 'Petrify', school: 'earth',
  baseDmg: { min: 10, max: 15 }, castTime: 3.0,
  effect: { type: 'petrify', stunDuration: 1.5, damageAmpPercent: 0.25, damageAmpDuration: 3.0 },
  unlockLevel: 38, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Hard CC: 1.5s stun + enemy takes +25% damage for 3s.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.7)', img: 'assets/generated/spell_arcane_bolt.png'
},

tectonic_shift: {
  id: 'tectonic_shift', name: 'Tectonic Shift', school: 'earth',
  baseDmg: { min: 55, max: 80 }, castTime: 4.5,
  effect: { type: 'mega_shield', baseShield: 80, maxHpPercent: 0.20, reflectPercent: 0.25, reflectDuration: 8.0, hardCap: 'mageMaxHP' },
  unlockLevel: 50, classRestriction: 'geomancer', elementType: 'earth', passiveTrigger: true,
  description: 'Capstone. Damage + mega-shield (80 + 20% max HP, hard cap: mage max HP). Reflects 25% of absorbed damage for 8s.',
  color: '#e67e22', glowColor: 'rgba(230,126,34,0.8)', img: 'assets/generated/spell_arcane_bolt.png'
}
```

---

## 3. ENEMIES_DATA Changes -- Elemental Tags

Add `elementType` field to each enemy:

```javascript
training_dummy:    { ...existing, elementType: null },      // untyped (not neutral) — no elemental interaction
skeleton_warrior:  { ...existing, elementType: 'earth' },   // Bone and stone
shadow_wraith:     { ...existing, elementType: 'air' },     // Ethereal
frost_elemental:   { ...existing, elementType: 'water' },   // Ice = water
undead_knight:     { ...existing, elementType: 'earth' },   // Heavy armor
demon_lord:        { ...existing, elementType: 'fire' },    // Infernal
void_horror:       { ...existing, elementType: null },      // Void = no element
```

---

## 4. Combat State Changes -- battleState

Add to `battleState` in combat.js:

```javascript
battleState = {
  ...existing,

  // Class passive tracking
  emberStacks: 0,              // Pyromancer: current Ember count (0-5)
  emberDamageAccumulated: 0,   // Pyromancer: total damage dealt during current stack cycle
  staticCharges: 0,            // Stormcaller: current Static count (0-10)
  riptideTriggered: false,     // Tidecaster: has Riptide fired this fight?
  // Geomancer Bedrock: no state needed -- it's a passive modifier on damage taken

  // New combat effects
  evasionActive: false,        // Stormcaller: dodge chance active?
  evasionExpireAt: 0,          // timestamp
  evasionChance: 0,            // 0.0-1.0
  hasteRemaining: 0,           // Stormcaller Tailwind: spells remaining with haste
  hastePercent: 0,             // how much faster (0.40 = 40%)
  scorchWindowExpireAt: 0,     // Pyromancer Flame Wave: Scorch free cast window
  chillActive: false,          // Tidecaster Frozen Tomb: enemy attack speed reduced by 70%?
  chillExpireAt: 0,
  petrifyActive: false,        // Geomancer Petrify: enemy stunned?
  petrifyExpireAt: 0,
  petrifyAmpActive: false,     // +25% damage amp after petrify
  petrifyAmpExpireAt: 0,
  reflectActive: false,        // Geomancer Tectonic Shift reflect
  reflectPercent: 0,
  reflectExpireAt: 0,
  livingBombs: [],             // Pyromancer: [{detonateAt, damage}]
};
```

---

## 5. Class Passive Mechanics -- Detailed Trigger Logic

### 5.1 Pyromancer -- Combustion

**Trigger**: After ANY spell cast where `passiveTrigger === true` AND (spell.elementType === 'fire' OR spell.classRestriction === null)

Wait -- per GDD: "Every fire spell that hits" and "Universal spells DO trigger class passives". So:

**Actual trigger**: After any spell that deals damage (baseDmg > 0) AND `passiveTrigger === true`. This includes universal damage spells (Arcane Bolt, Arcane Barrage, Shadow Bolt, etc.) and all fire class spells.

**Logic**:
```
On spell hit (after damage applied):
  if (playerClass === 'pyromancer' && spell.passiveTrigger && spellDealtDamage) {
    emberStacks += (spell.effect?.extraEmberStacks || 1)  // Pyroblast gives 2
    emberDamageAccumulated += damageDealt

    if (emberStacks >= 5) {
      bonusDamage = floor(emberDamageAccumulated * 0.15)
      enemyHP -= bonusDamage
      log("Combustion detonates for {bonusDamage} bonus damage!")
      emberStacks = 0
      emberDamageAccumulated = 0
    }
  }
```

**Edge case — DoT ticks and Ember stacking**: DoT ticks (Ignite, Cataclysm) do NOT freely stack Ember. Instead, each unique DoT source may contribute at most **1 Ember stack per second**, regardless of how many ticks fire. This prevents scenarios where 3 stacked Ignites (3 ticks/s) + Cataclysm (1 tick/s) would generate 4 Ember stacks per second, trivializing the 5-stack threshold.

Implementation: track `lastEmberTickTimestamp` per DoT source. Only grant Ember if `now - lastEmberTickTimestamp >= 1000ms` for that source. Direct spell hits (non-DoT) always grant Ember normally.

### 5.2 Stormcaller -- Static Charge

**Trigger**: After any spell cast where `passiveTrigger === true` (includes universals).

**Logic**:
```
On spell cast (after cast resolves):
  if (playerClass === 'stormcaller' && spell.passiveTrigger) {
    staticCharges += 1 + (spell.effect?.extraCharges || 0)  // Gust gives +1 extra
    // Tempest gives +1 per hit (3 hits = 3 charges, handled in multi-hit logic)

    if (staticCharges >= 10) {
      thunderstormDamage = 5 * playerLevel
      enemyHP -= thunderstormDamage
      log("Thunderstorm! {thunderstormDamage} bonus damage!")

      // Reduce next spell cast time by 50%
      hasteRemaining = 1
      hastePercent = 0.50

      staticCharges = 0
    }
  }
```

### 5.3 Tidecaster -- Riptide

**Trigger**: When mage HP drops below 40% of max HP, once per combat.

**Logic**:
```
In performEnemyAttack(), after HP reduction:
  if (playerClass === 'tidecaster' && !riptideTriggered && mageHP < mageMaxHP * 0.40) {
    healAmount = floor(mageMaxHP * 0.20)
    mageHP = min(mageHP + healAmount, mageMaxHP)
    riptideTriggered = true

    // Apply Drenched to enemy
    enemySlowPercent = 0.30
    enemySlowExpireAt = Date.now() + 5000

    log("Riptide! Healed {healAmount} HP + enemy Drenched (30% slow, 5s)")
  }
```

### 5.4 Geomancer -- Bedrock

**Trigger**: Passive modifier whenever mage has active shield (shieldHP > 0).

**Logic**:
```
In performEnemyAttack(), when calculating damage:
  if (playerClass === 'geomancer' && shieldHP > 0) {
    // 15% damage reduction
    incomingDamage = floor(incomingDamage * 0.85)

    // After shield absorbs, reflect 10% of absorbed amount
    absorbed = min(shieldHP, incomingDamage)
    reflectDmg = floor(absorbed * 0.10)
    enemyHP -= reflectDmg
    log("Bedrock reflects {reflectDmg} damage!")
  }
```

---

## 6. Elemental Damage Modifier

### 6.1 The Modifier Function

```javascript
function getElementalModifier(playerClassType, enemyElementType) {
  if (!playerClassType || !enemyElementType) return 1.0;

  const CYCLE = {
    fire:  { strong: 'earth', weak: 'water' },
    air:   { strong: 'water', weak: 'earth' },
    water: { strong: 'fire',  weak: 'air'   },
    earth: { strong: 'air',   weak: 'fire'  }
  };

  const CLASS_ELEMENTS = {
    pyromancer:  'fire',
    stormcaller: 'air',
    tidecaster:  'water',
    geomancer:   'earth'
  };

  const playerElement = CLASS_ELEMENTS[playerClassType];
  if (!playerElement) return 1.0;

  const relations = CYCLE[playerElement];
  if (enemyElementType === relations.strong) return 1.10;  // +10%
  if (enemyElementType === relations.weak)   return 0.90;  // -10%
  return 1.0;
}
```

### 6.2 Where It Applies

In `performCast()`, the elemental modifier is applied to the FINAL damage calculation for ALL spells (universal and class):

```
finalDmg = floor(baseDmg * intMult * schoolMod * debuffMod * focusMod * buffMod * elementalMod)
```

The `elementalMod` replaces `schoolMod` conceptually, but they stack:
- `schoolMod` = per-enemy resistance to spell school (arcane/fire/shadow/frost) -- **existing mechanic**
- `elementalMod` = class vs enemy element (fire/air/water/earth cycle) -- **new mechanic**

Both multiply into damage. This means a Pyromancer using Fireball against a Skeleton (Earth, fire weakness 1.3x):
- schoolMod = 1.3 (fire vs skeleton)
- elementalMod = 1.10 (fire class strong vs earth)
- Total = 1.43x damage

### 6.3 Special Elemental Interactions

Per GDD, some classes have extra effects vs weak elements:
- **Pyromancer vs Water**: Ignite duration halved
- **Stormcaller vs Earth**: Evasion chance halved
- **Tidecaster vs Air**: Slow effectiveness halved
- **Geomancer vs Fire**: Shields lose 20% effectiveness

Implementation: check `getElementalModifier()` result. If 0.90 (weak), apply the penalty to relevant effects.

---

## 7. Damage Formulas for Each Class Spell

### Universal damage formula:
```
finalDmg = floor(randInt(min, max) * intMult * schoolMod * elementalMod * debuffMod * focusMod * buffMod)

where:
  intMult = 1 + (INT - 5) / 100
  schoolMod = enemy.resistances[spell.school] || 1.0
  elementalMod = getElementalModifier(state.classType, enemy.elementType)
  debuffMod = voidDebuffActive ? 1.15 : 1.0
  focusMod = focusCharged ? 2.0 : 1.0
  buffMod = manaSurgeActive ? 1.25 : 1.0
```

### Per-spell special damage calculations:

| Spell | Special Calculation |
|-------|-------------------|
| **Scorch** | If target has Ignite DoT: `finalDmg *= 1.50` |
| **Inferno** | Consumes all Ignite stacks: `finalDmg += 20 * igniteStacksConsumed * intMult` |
| **Pyroblast** | Standard formula. Generates 2 Ember stacks instead of 1. |
| **Living Bomb** | Direct hit = standard formula. Detonation after 4s = `60 * intMult * elementalMod` (fixed, ignores focusMod AND buffMod AND schoolMod) |
| **Flame Wave** | Standard formula + applies 1 Ignite stack + sets scorchWindowExpireAt |
| **Cataclysm** | Direct hit = standard formula. DoT: `15 * intMult * schoolMod` per tick, 5 ticks, max 1 stack |
| **Gust** | Standard formula. +1 extra Static charge |
| **Lightning Bolt** | Standard formula. 10% chance: `deal damage twice` (second hit = same calculation) |
| **Zephyr** | Standard formula (low). Sets evasion for 3s. On successful dodge: deals counter-damage = `floor(avoidedDamage * 0.50)` |
| **Chain Lightning** | Hit 1 = standard formula. Hit 2 = `Hit1 * 0.70`. Hit 3 = `Hit1 * 0.49` (i.e. `Hit1 * 0.70 * 0.70`). Total logged as sum. |
| **Tailwind** | No damage. Sets hasteRemaining = 3, hastePercent = 0.40 |
| **Ball Lightning** | Direct hit = standard formula. Persistent DoT: `10 * intMult` every 1.5s for 9s |
| **Cyclone** | Standard formula + slow (uses existing slow mechanic) |
| **Tempest** | 3 hits, each = `randInt(min,max)/3 * intMult * ...`. Each hit generates 1 Static |
| **Healing Rain** | `healAmount = 30 + floor(mageMaxHP * 0.05)`. If mage HP < 50% max HP at cast time: `healAmount *= 2`. Cast time: 1.5s. No damage. |
| **Tidal Wave** | Standard formula + slow 30%/2s |
| **Tsunami** | Standard formula. If enemy slowed: `finalDmg *= 1.40`. Also applies 25% slow/3s |
| **Frozen Tomb** | Standard formula (low). Reduces enemy attack speed by 70% for 2s. Then 40% slow/3s. (Soft CC, enemy still attacks slowly.) |
| **Maelstrom** | Standard formula + lifesteal 30% + slow 35%/5s |
| **Rock Shard** | Standard formula. No special effects. |
| **Stone Skin** | `shieldHP += 25 + floor(mageMaxHP * 0.10)`. Stacks with existing shield. |
| **Tremor** | Standard formula + slow. If mage has shield: `finalDmg *= 1.30` |
| **Earthen Spike** | Standard formula. No special effects. |
| **Fortify** | If shieldHP > 0: `shieldHP = min(shieldHP * 2, mageMaxHP)`. If shieldHP === 0: `shieldHP = 50`. Hard cap: shield cannot exceed mage max HP. |
| **Avalanche** | Standard formula + `bonusDmg = floor(shieldHP * 0.20)` |
| **Petrify** | Standard formula (low). Stun 1.5s + enemy takes +25% damage for 3s |
| **Tectonic Shift** | Standard formula + shield `min(80 + floor(mageMaxHP * 0.20), mageMaxHP)` + reflect 25% for 8s. Hard cap: shield cannot exceed mage max HP. |

---

## 8. Migration Plan

### Existing Players (pre-class update)

When loading a save without `classType`:

1. `classType` defaults to `null` (already in getDefaultState)
2. All current spells remain usable until class selection
3. At class selection (level 3+ Awakening popup):
   - `state.classType` is set
   - Scan grimoire for incompatible spells (classRestriction !== null AND classRestriction !== selectedClass)
   - Remove incompatible spells from grimoire, replace with empty slots
   - Incompatible spells remain in "known spells" but shown as locked
   - Show notification listing removed spells

### Spell Availability Logic

```javascript
function isSpellAvailable(spellId, state) {
  const spell = SPELLS_DATA[spellId];
  if (!spell) return false;
  if (state.level < spell.unlockLevel) return false;
  if (spell.classRestriction && spell.classRestriction !== state.classType) return false;
  return true;
}
```

---

## 9. Implementation Priority

| Priority | Task | Complexity |
|----------|------|-----------|
| 1 | Add `classRestriction`, `elementType`, `passiveTrigger` to existing SPELLS_DATA | Low |
| 2 | Add `elementType` to ENEMIES_DATA | Low |
| 3 | Add new class spells to SPELLS_DATA (32 spells) | Medium |
| 4 | Implement `getElementalModifier()` in combat.js | Low |
| 5 | Extend `battleState` with passive tracking fields | Low |
| 6 | Implement Combustion passive (Pyromancer) | Medium |
| 7 | Implement Static Charge passive (Stormcaller) | Medium |
| 8 | Implement Riptide passive (Tidecaster) | Low |
| 9 | Implement Bedrock passive (Geomancer) | Low |
| 10 | Implement new effect types: heal, class_shield, fortify, freeze, petrify, chain, haste, evasion, conditional_bonus, delayed_detonation, shield_scaling, mega_shield | High |
| 11 | Update grimoire.js to show locked/class-restricted spells | Medium |
| 12 | Spell availability filtering (isSpellAvailable) | Low |
| 13 | Migration logic for existing saves | Low |

**Estimated total**: ~600-800 lines of new/modified JS code across combat.js and state.js.

---

*Document created: 2026-03-30*
*Revised: 2026-03-30 -- user feedback applied*

---

## 10. Revision Log (2026-03-30 Feedback)

| # | Issue | Change | Rationale |
|---|-------|--------|-----------|
| 1 | Combustion vs Static Charge imbalance: DoT ticks freely stacking Ember | DoT sources limited to max 1 Ember stack per second per unique source (Section 5.1) | 3 stacked Ignites + Cataclysm would generate 4 Ember/s, trivializing the 5-stack threshold |
| 2 | Zephyr (Stormcaller) dodge useless in 1v1 | Added counter-attack: on successful dodge, deals 50% of avoided damage back to enemy | Makes Zephyr a damage+defense hybrid instead of pure defense; cross-class comparison with Bedrock reflect is favorable |
| 3 | Healing Rain cast time too long (2.5s) | Reduced to 1.5s. Added emergency heal: 2x heal when HP < 50% at cast time | 2.5s was too slow for a pure heal spell with no damage. Emergency mechanic rewards low-HP risk-taking aligned with Tidecaster identity |
| 4 | Fortify + Avalanche: shield HP could scale infinitely | Hard cap on all shields: `min(shieldHP, mageMaxHP)`. Tectonic Shift base shield reduced from 200 to 80 | Prevents degenerate Stone Skin -> Fortify -> Fortify loop creating infinite shields. Cap = mage max HP keeps it proportional |
| 5 | Frozen Tomb: full freeze too strong as CC | Replaced full freeze (0 attacks) with 70% attack speed reduction for 2s | Full freeze allowed guaranteed cast of Maelstrom (4.0s) or Tsunami (3.5s) under CC. 70% slow still provides a significant window but enemy can interrupt long casts |
| 6a | passiveTrigger: false lacked explanation | Added comment "no damage spell, passive tracking skipped" to Tailwind and Focus | Clarity for implementors |
| 6b | training_dummy elementType: null ambiguous | Added comment "untyped (not neutral)" | Distinguishes from a hypothetical neutral element |
| 6c | Living Bomb detonation modifiers unclear | Clarified: detonation ignores focusMod AND buffMod (not just schoolMod) | Detonation is fixed damage, should not double-dip with Focus or Mana Surge |
| 6d | Chain Lightning Hit3 formula misleading | Changed "Hit2 * 0.70" to "Hit1 * 0.49" | Makes the compound decay explicit instead of requiring mental multiplication |
