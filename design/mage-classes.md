# Veyra -- Mage Class System GDD

> **Author**: Game Designer Agent
> **Date**: 2026-03-30
> **Status**: DRAFT -- pending PM review
> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Depends on**: progression-system.md (level curve, attribute points, spell unlock framework)

---

## 1. Design Philosophy

### Core Pillars

1. **Distinct Fantasy** -- each class feels fundamentally different, not just a color swap
2. **Strategic Depth** -- class choice affects spell selection, grimoire composition, and combat approach
3. **Asymmetric Balance** -- classes are balanced around different strengths; no class dominates all situations
4. **Meaningful Choice** -- class is selected once at level 3, can be changed via expensive respec

### Why 4 Elements?

The elemental system (Fire / Air / Water / Earth) maps naturally to combat roles:
- **Fire** = offense, burst, DoT
- **Air** = speed, chain damage, evasion
- **Water** = sustain, lifesteal, control
- **Earth** = defense, shields, attrition

This creates a clear rock-paper-scissors dynamic for PvP while offering distinct PvE playstyles.

---

## 2. Class Overview

| Class | Element | Playstyle | Identity | Color |
|-------|---------|-----------|----------|-------|
| **Pyromancer** | Fire | Aggressive burst & DoT | "Kill before you die" | #e74c3c |
| **Stormcaller** | Air | Fast-casting chain damage | "Death by a thousand cuts" | #3498db |
| **Tidecaster** | Water | Sustain & control | "Outlast everything" | #1abc9c |
| **Geomancer** | Earth | Tank & attrition | "Unmovable wall" | #e67e22 |

### Class Selection

- **When**: Level 3 (player has fought a few battles, understands basic combat, but still early enough to feel excited about specializing)
- **How**: Special "Awakening" event at level 3. UI shows 4 class choices with preview of:
  - Class passive ability
  - First class spell (unlocked immediately)
  - Spell tree preview (locked spells shown grayed out with lock icon -- teasing future content)
- **Respec**: Available from inventory screen for `100 * level` gold. Discourages frivolous switching while remaining achievable (e.g., at level 25 = 2,500 gold, roughly 20-30 mid-tier fights worth of gold)
- **On respec**: All class spells removed from grimoire, replaced with universal equivalents. Class spells remain in inventory but unusable until re-selecting that class.

### Grimoire Spell Visibility

- **Unlocked spells**: shown normally, can be equipped
- **Locked class spells (wrong class or level too low)**: shown grayed out with a lock icon and requirement label (e.g., "Pyromancer Lv.15"). Visible to all players to tease content and help inform class choice
- **Locked universal spells (level too low)**: shown grayed out with level requirement

---

## 3. Universal vs Class Spells

### Universal Spells (Available to ALL Classes)

These are the existing spells that remain available regardless of class:

| Spell | Level | Role |
|-------|-------|------|
| Arcane Bolt | 1 | Baseline damage |
| Focus | 1 | Damage amplifier (x2 next) |
| Mana Shield | 3 | Survivability |
| Arcane Barrage | 5 | Multi-hit burst |

**4 universal spells** remain in every class's pool. Class spells fill the remaining space, giving each class **8 unique class spells** (12 total = 4 universal + 8 class).

**Important: Universal spells DO trigger class passives.** Arcane Bolt and Arcane Barrage count as spell casts and generate Ember stacks (Pyromancer), Static charges (Stormcaller), etc. This keeps universal spells viable in endgame grimoire compositions and prevents them from feeling like dead slots. It also makes the transition into a class (level 3) feel impactful immediately, since existing spells suddenly interact with the new passive.

### Grimoire Composition

With 5 grimoire slots and 12 available spells (4 universal + 8 class), players must choose their rotation carefully. This is the core strategic layer.

---

## 4. Class: Pyromancer (Fire)

> *"The world is fuel. I am the spark."*

### Identity

The Pyromancer is pure offense. Highest raw damage output of any class, but almost no survivability tools. Fights are short -- you either win fast or die fast. Masters of damage-over-time through Ignite stacking, with a devastating endgame nuke.

### Class Passive: **Combustion**

Every fire spell that hits applies 1 stack of **Ember** (max 5 stacks). At 5 stacks, Ember detonates for `15% of total damage dealt during stacking` as bonus damage and resets to 0.

- Rewards filling grimoire with fire spells
- Creates a rhythm: build stacks -> detonate -> build again
- Works with DoT ticks (each Ignite tick counts as a hit)

### Class Spells

| # | Spell | Unlock Level | Cast Time | Damage | Effect | DPS Notes |
|---|-------|-------------|-----------|--------|--------|-----------|
| 1 | **Fireball** | 3 (on class select) | 2.0s | 30-50 | None | Clean burst. Bread & butter. |
| 2 | **Ignite** | 6 | 1.8s | 12-18 | DoT: 8 dmg/tick, 4 ticks, 1.0s interval. Stacks to 3. | Primary DPS engine. 3 stacks = 24 dmg/s persistent. |
| 3 | **Scorch** | 10 | 1.0s | 10-15 | Fast cast. If target has Ignite: +50% damage. | Filler spell, combos with Ignite. |
| 4 | **Inferno** | 15 | 2.5s | 55-75 | Consumes all Ignite stacks. Bonus: +20 dmg per stack consumed. | Big burst. 3 stacks consumed = +60 bonus = 115-135 hit. |
| 5 | **Pyroblast** | 20 | 3.5s | 70-100 | Slow cast. Guaranteed Ember stack x2. | Slow but Combustion accelerator. |
| 6 | **Living Bomb** | 28 | 2.0s | 25-35 | Applies timed detonation: explodes after 4s for 60 damage. | Delayed burst. Set and forget. |
| 7 | **Flame Wave** | 38 | 2.8s | 45-65 | Applies Ignite (1 stack) + 3s Scorch window (Scorch costs 0 cast time). | Combo enabler. |
| 8 | **Cataclysm** | 50 | 5.0s | 80-120 | DoT: 15 dmg/tick, 5 ticks, 1.0s. Cannot stack. Max 1. | Ultimate. 155-195 total. Level 50 capstone. |

### Pyromancer Grimoire Archetypes

**Sustained Burn** (DoT focus):
`Ignite - Scorch - Flame Wave - Ignite - Focus`
Strategy: Stack Ignite to 3, keep it rolling, Scorch for filler.

**Big Burst** (nuke focus):
`Fireball - Pyroblast - Inferno - Cataclysm - Focus`
Strategy: Focus -> Pyroblast -> Inferno for massive spike damage.

### Strengths & Weaknesses

| Strengths | Weaknesses |
|-----------|------------|
| Highest DPS of any class | No healing or lifesteal |
| DoT stacking creates massive persistent damage | No slow or CC abilities |
| Combustion passive adds free burst | Fights that go long = death |
| Great vs high-HP enemies | Terrible vs fast-attacking enemies |

### Elemental Interactions

- **Strong vs Earth enemies**: Fire melts shields and armor thematically. +10% damage vs Earth-type enemies.
- **Weak vs Water enemies**: Water douses fire. -10% damage vs Water-type enemies. Ignite duration halved.

---

## 5. Class: Stormcaller (Air)

> *"You cannot hit what you cannot see."*

### Identity

The Stormcaller is about speed and chain reactions. Fastest average cast times, with spells that bounce and multiply. Lower per-hit damage than Pyromancer, but more total casts means more total damage over time. Has a unique Evasion mechanic that occasionally dodges enemy attacks entirely.

### Class Passive: **Static Charge**

Every spell cast generates 1 **Static** charge (max 10). At 10 charges, the next spell triggers **Thunderstorm**: deals `5 * playerLevel` bonus damage and resets all current spell cooldowns (if cooldown system is added) or reduces next spell cast time by 50%.

- Rewards rapid casting (low cast-time spells generate charges faster)
- Creates a predictable power spike every ~10 casts
- Synergizes with Air's fast cast times

### Class Spells

| # | Spell | Unlock Level | Cast Time | Damage | Effect | DPS Notes |
|---|-------|-------------|-----------|--------|--------|-----------|
| 1 | **Gust** | 3 (on class select) | 1.0s | 12-18 | Fastest base spell. Generates +1 extra Static. | Rapid fire. 2 Static per cast. |
| 2 | **Lightning Bolt** | 6 | 1.5s | 25-35 | 10% chance to strike twice (same damage). | Solid base damage with proc upside. |
| 3 | **Zephyr** | 10 | 1.2s | 8-12 | Grants **Evasion**: 25% dodge chance for 3 seconds. | Defensive utility. Low damage. |
| 4 | **Chain Lightning** | 15 | 2.0s | 30-45 | Bounces 2 times. Each bounce = 70% of previous. | Single target: 30-45 + 21-31 + 15-22 = ~66-98 total. |
| 5 | **Tailwind** | 20 | 0.5s | 0 | Next 3 spells cast 40% faster. | Pure haste buff. Insane with burst rotation. |
| 6 | **Ball Lightning** | 28 | 2.5s | 20-30 | Persistent: deals 10 dmg every 1.5s for 9s (6 ticks). | Set-and-forget damage. 60 total over time. |
| 7 | **Cyclone** | 38 | 2.0s | 35-50 | Slows enemy by 40% for 4s. | Air's only CC. Late-game unlock. |
| 8 | **Tempest** | 50 | 3.5s | 60-90 | Hits 3 times over 1.5s. Each hit generates 1 Static. | Capstone. 180-270 total + 3 Static charges. |

### Stormcaller Grimoire Archetypes

**Speed Demon** (maximum casts):
`Gust - Lightning Bolt - Gust - Tailwind - Zephyr`
Strategy: Cast as fast as possible, trigger Thunderstorm every ~5 rotations.

**Chain Master** (sustained damage):
`Chain Lightning - Ball Lightning - Tempest - Tailwind - Focus`
Strategy: Tailwind -> Tempest -> Chain Lightning for rapid burst window.

### Strengths & Weaknesses

| Strengths | Weaknesses |
|-----------|------------|
| Fastest cast times = most casts per fight | Low per-hit damage |
| Evasion (Zephyr) provides dodge chance | No shields or healing |
| Thunderstorm passive = periodic burst | Damage is inconsistent (proc-dependent) |
| Chain Lightning scales well in future multi-target | Weak vs enemies with high regen |

### Elemental Interactions

- **Strong vs Water enemies**: Electricity + water. +10% damage vs Water-type enemies.
- **Weak vs Earth enemies**: Air disperses against stone. -10% damage vs Earth-type enemies. Evasion chance halved.

---

## 6. Class: Tidecaster (Water)

> *"The tide is patient. The tide always wins."*

### Identity

The Tidecaster is the sustain class. Every spell either heals, slows, or both. Fights take longer, but the Tidecaster rarely dies. The class fantasy is about inevitability -- you slowly grind the enemy down while keeping yourself healthy. Best class for new players and for fights against hard-hitting enemies.

### Class Passive: **Riptide**

Whenever the Tidecaster falls below 40% HP, **Riptide** triggers automatically (once per combat): instantly heals for `20% of max HP` and applies **Drenched** to the enemy (30% slow for 5 seconds).

- Safety net passive -- rewards the "barely survive" playstyle
- Only triggers once per fight, so it is not overpowered
- The slow component buys time to heal back up

### Class Spells

| # | Spell | Unlock Level | Cast Time | Damage | Effect | DPS Notes |
|---|-------|-------------|-----------|--------|--------|-----------|
| 1 | **Frost Spike** | 3 (on class select) | 2.0s | 18-28 | Slows enemy 20% for 3s. | Control + damage. Core spell. |
| 2 | **Healing Rain** | 6 | 2.5s | 0 | Heals mage for 30 + 5% max HP. | Pure sustain. ~60-90 HP at mid-game. |
| 3 | **Tidal Wave** | 10 | 2.2s | 25-40 | Slows enemy 30% for 2s. | Stronger version of Frost Spike. |
| 4 | **Drain Life** | 15 | 2.0s | 20-30 | 50% of damage dealt heals mage. | Hybrid: damage + sustain. |
| 5 | **Blizzard** | 20 | 3.0s | 35-55 | Heavy slow: 50% for 4s. | Strongest slow in game. |
| 6 | **Tsunami** | 28 | 3.5s | 50-70 | Slows 25% for 3s. If enemy already slowed: +40% damage. | Conditional burst. Combos with any slow. |
| 7 | **Frozen Tomb** | 38 | 2.5s | 15-20 | **Freeze**: enemy cannot attack for 2.0s. Then 40% slow for 3s. | Hard CC. Game-changing at high levels. |
| 8 | **Maelstrom** | 50 | 4.0s | 45-65 | Damage + heals for 30% of damage dealt + slows 35% for 5s. | Capstone. Does everything. |

### Tidecaster Grimoire Archetypes

**Unkillable Wall** (max sustain):
`Healing Rain - Drain Life - Frost Spike - Frozen Tomb - Mana Shield`
Strategy: Never die. Slowly whittle enemy down. Fights last 60+ seconds.

**Frost Control** (slow lock):
`Frost Spike - Blizzard - Tsunami - Tidal Wave - Focus`
Strategy: Keep enemy permanently slowed. Tsunami deals bonus damage on slowed targets.

### Strengths & Weaknesses

| Strengths | Weaknesses |
|-----------|------------|
| Best survivability of any class | Lowest raw DPS |
| Perma-slow locks enemy attacks | Fights take much longer |
| Riptide passive = free emergency heal | Terrible at speed-clearing weak enemies |
| Great for hard bosses and PvP | If enemy ignores slow (future immune enemies), class suffers |

### Elemental Interactions

- **Strong vs Fire enemies**: Water extinguishes fire. +10% damage vs Fire-type enemies. Slow duration +1s.
- **Weak vs Air enemies**: Wind scatters water. -10% damage vs Air-type enemies. Slow effectiveness halved.

---

## 7. Class: Geomancer (Earth)

> *"Mountains do not kneel."*

### Identity

The Geomancer is the tank/attrition class. Massive shields, damage reduction, and reflect mechanics. The fantasy is being an immovable fortress -- you don't dodge, you don't heal, you just absorb everything and punish the attacker. Lowest raw damage but highest effective HP. Shines in long fights and against burst damage.

### Class Passive: **Bedrock**

While the Geomancer has any active shield (Mana Shield or class shields), incoming damage is reduced by **15%**. Additionally, 10% of absorbed shield damage is reflected back to the attacker.

- Rewards keeping shields up at all times
- Damage reflection creates passive DPS while tanking
- Synergizes with class shield spells

### Class Spells

| # | Spell | Unlock Level | Cast Time | Damage | Effect | DPS Notes |
|---|-------|-------------|-----------|--------|--------|-----------|
| 1 | **Rock Shard** | 3 (on class select) | 2.0s | 20-30 | None. Solid, reliable. | Bread & butter damage. |
| 2 | **Stone Skin** | 6 | 1.5s | 0 | Grants shield: absorbs next `25 + 10% max HP` damage. Stacks with Mana Shield. | Core defense. ~70-120 HP shield at mid-game. |
| 3 | **Tremor** | 10 | 2.5s | 15-25 | Slows enemy 15% for 2s. If mage has shield: +30% damage. | Conditional: weak alone, strong with shield up. |
| 4 | **Earthen Spike** | 15 | 2.2s | 35-50 | Highest base damage Earth spell. | Pure damage option. |
| 5 | **Fortify** | 20 | 2.0s | 0 | Doubles current shield HP. If no shield: creates shield for 50 HP. | Shield amplifier. Stone Skin -> Fortify = huge shield. |
| 6 | **Avalanche** | 28 | 3.0s | 40-60 | If mage has shield: deals bonus damage equal to 20% of current shield HP. | Shield-scaling damage. More shield = more damage. |
| 7 | **Petrify** | 38 | 3.0s | 10-15 | **Petrify**: enemy cannot attack for 1.5s. Enemy takes +25% damage while petrified. | Hard CC + damage amp. |
| 8 | **Tectonic Shift** | 50 | 4.5s | 55-80 | Creates mega-shield (200 + 20% max HP). Reflects 25% of all damage absorbed for 8s. | Capstone. Fortress mode. |

### Geomancer Grimoire Archetypes

**Fortress** (maximum shield uptime):
`Stone Skin - Fortify - Mana Shield - Avalanche - Tremor`
Strategy: Layer shields endlessly. Avalanche converts shield HP into damage. Bedrock passive reflects while shielded.

**Counter-Puncher** (reflect focus):
`Stone Skin - Tectonic Shift - Petrify - Earthen Spike - Focus`
Strategy: Build shields, reflect damage, Petrify for burst windows.

### Strengths & Weaknesses

| Strengths | Weaknesses |
|-----------|------------|
| Highest effective HP (shields + damage reduction) | Lowest raw damage output |
| Damage reflection = passive DPS | Relies on shield uptime -- if shields break, class is weak |
| Petrify provides hard CC + damage amplifier | Very slow kill speed on low-damage enemies |
| Best class for boss fights and PvP survival | Worst class for speed farming |

### Elemental Interactions

- **Strong vs Air enemies**: Earth grounds air. +10% damage vs Air-type enemies. Shields gain +20% HP.
- **Weak vs Fire enemies**: Fire cracks stone. -10% damage vs Fire-type enemies. Shields lose 20% effectiveness.

---

## 8. Elemental Interaction Matrix

### Damage Modifiers (Class vs Enemy Element)

|  | vs Fire Enemy | vs Air Enemy | vs Water Enemy | vs Earth Enemy |
|--|--------------|-------------|---------------|---------------|
| **Pyromancer** | 1.0x (neutral) | 1.0x (neutral) | **0.90x** (weak) | **1.10x** (strong) |
| **Stormcaller** | 1.0x (neutral) | 1.0x (neutral) | **1.10x** (strong) | **0.90x** (weak) |
| **Tidecaster** | **1.10x** (strong) | **0.90x** (weak) | 1.0x (neutral) | 1.0x (neutral) |
| **Geomancer** | **0.90x** (weak) | **1.10x** (strong) | 1.0x (neutral) | 1.0x (neutral) |

### Cycle

```
Fire  --> Earth --> Air --> Water --> Fire
 ^                                    |
 +------------------------------------+
```

Fire beats Earth. Earth beats Air. Air beats Water. Water beats Fire.

### PvP Implications

In PvP, this creates a soft counter system:
- Pyromancer vs Geomancer: Pyromancer advantage (Fire > Earth)
- Geomancer vs Stormcaller: Geomancer advantage (Earth > Air)
- Stormcaller vs Tidecaster: Stormcaller advantage (Air > Water)
- Tidecaster vs Pyromancer: Tidecaster advantage (Water > Fire)

The 10% modifier is intentionally small -- skill (grimoire composition, spell choice) matters more than counter-picking. At 10%, the advantage is felt but not decisive: a well-played weaker element can still win through superior grimoire composition.

---

## 9. Enemy Elemental Tags

Existing and new enemies receive elemental tags for the interaction system:

| Enemy | Element | Rationale |
|-------|---------|-----------|
| Training Dummy | None | Tutorial, no elemental interaction |
| Skeleton Warrior | Earth | Bone and stone |
| Shadow Wraith | Air | Ethereal, wind-like |
| Frost Elemental | Water | Ice = water |
| Undead Knight | Earth | Heavy armor, earthbound |
| Demon Lord | Fire | Infernal flames |
| Void Horror | None | Void transcends elements |
| Cursed Golem | Earth | Stone construct |
| Banshee | Air | Screaming spirit |
| Blood Revenant | Water | Blood = fluid |
| Abyssal Watcher | None | Eldritch, beyond elements |
| Lich King | Fire | Necromantic flame |
| Elder Dragon | Fire | Dragon fire |
| The Hollow | Air | Emptiness, wind |
| Veyra (Boss) | None | Final boss, no weakness |

Enemies tagged "None" have no elemental interaction (1.0x for all classes).

---

## 10. Balance Analysis

### DPS Comparison at Level 25 (Full INT Build, ~220 INT)

`intMult = 1 + (220-5)/100 = 3.15`

**Pyromancer** (Ignite x3 + Scorch + Inferno rotation):
- Ignite tick: 8 * 3 stacks * 3.15 = ~75 DPS persistent
- Inferno (3 stacks consumed): (65 + 60) * 3.15 = ~394 burst every ~8s
- Combustion detonation: ~15% of accumulated = ~50 bonus every 5 fire hits
- **Effective DPS: ~130-150**

**Stormcaller** (Gust + Lightning Bolt + Chain Lightning + Tailwind rotation):
- Gust: 15 avg * 3.15 / 1.0s = ~47 DPS
- Lightning Bolt: 30 avg * 3.15 / 1.5s = ~63 DPS (+ 10% double proc)
- Chain Lightning: 66 avg total * 3.15 / 2.0s = ~104 DPS
- Tailwind: 0 DPS but accelerates others by 40% for 3 casts
- Thunderstorm: ~125 bonus every 10 casts
- **Effective DPS: ~95-115** (but more consistent, with Evasion utility)

**Tidecaster** (Frost Spike + Drain Life + Blizzard + Tsunami rotation):
- Frost Spike: 23 avg * 3.15 / 2.0s = ~36 DPS + slow
- Drain Life: 25 avg * 3.15 / 2.0s = ~39 DPS + ~20 heal
- Tsunami (on slowed target): 60 * 1.4 * 3.15 / 3.5s = ~75 DPS
- **Effective DPS: ~65-80** (but enemy slowed 40-50%, effectively halving their DPS)
- **Effective HPS (healing per second): ~25-35**
- **Net advantage**: Enemy deals ~50% DPS, Tidecaster heals ~30 HPS = massive survivability

**Geomancer** (Rock Shard + Stone Skin + Fortify + Avalanche rotation):
- Rock Shard: 25 avg * 3.15 / 2.0s = ~39 DPS
- Avalanche (with 150 shield): (50 + 30) * 3.15 / 3.0s = ~84 DPS
- Bedrock reflect: enemy deals ~50 DPS, reflect 10% = ~5 DPS passive
- **Effective DPS: ~65-80**
- **Effective Shield HPS: ~40-60** (constant shield generation)
- **Damage Reduction: 15%** while shielded

### Balance Assessment

| Class | Raw DPS | Survivability | Time-to-Kill (Lich King, 2000 HP) |
|-------|---------|---------------|-----------------------------------|
| Pyromancer | Highest (~140) | Lowest | ~14s |
| Stormcaller | High (~105) | Low-Medium (Evasion) | ~19s |
| Tidecaster | Low (~72) | Highest | ~28s |
| Geomancer | Low (~72) | Very High | ~28s |

All classes can kill Lich King within the 60s combat timer. Pyromancer kills fastest but risks dying to Lich King's 35 ATK / 1.5s = 23 DPS. Tidecaster and Geomancer are safest.

**This spread is intentional and healthy.**

---

## 11. Class Progression Feel

### Level 3-10 (Class Discovery)
- Player gets class passive + first class spell at level 3
- Class identity is immediately felt but not fully realized
- 2-3 class spells available, grimoire is a mix of universal and class spells

### Level 10-20 (Class Identity Solidifies)
- 3-4 class spells available
- Grimoire becomes majority class spells
- Players start discovering combos (e.g., Ignite stacking, Shield + Avalanche)
- This is where "class fantasy" clicks

### Level 20-35 (Mastery Phase)
- 5-6 class spells, many options for grimoire composition
- Multiple viable archetypes per class
- Strategic depth peaks -- which 5 of ~10 spells to equip?

### Level 35-50 (Capstone Phase)
- 7-8 class spells, all powerful
- Capstone spell (level 50) defines endgame identity
- Grimoire optimization becomes the endgame puzzle

---

## 12. Implementation Plan

### Data Model Changes (state.js)

```
// Add to getDefaultState():
class: null,  // 'pyromancer' | 'stormcaller' | 'tidecaster' | 'geomancer' | null

// CLASS_DATA object:
CLASS_DATA = {
  pyromancer: {
    name: 'Pyromancer',
    element: 'fire',
    color: '#e74c3c',
    passive: { id: 'combustion', ... },
    spells: ['fireball', 'ignite', 'scorch', 'inferno', 'pyroblast', 'living_bomb', 'flame_wave', 'cataclysm']
  },
  stormcaller: { ... },
  tidecaster: { ... },
  geomancer: { ... }
}

// SPELLS_DATA: add all 32 class spells (8 per class) with:
// - classRequired: 'pyromancer' | 'stormcaller' | etc.
// - unlockLevel: as defined above

// ENEMIES_DATA: add elementType field to each enemy
```

### Combat System Changes (combat.js)

```
// Class passive execution:
// - Pyromancer Combustion: track emberStacks in combat state
// - Stormcaller Static Charge: track staticCharges in combat state
// - Tidecaster Riptide: track riptideTriggered boolean
// - Geomancer Bedrock: modify damage taken calculation when shield > 0

// Elemental damage modifier:
// In damage calculation: finalDmg *= getElementalModifier(playerClass, enemyElement)
```

### UI Changes Required (UI/UX Handoff)

1. **Class Selection Screen** (Level 3 "Awakening" event)
   - 4 class cards with art, description, passive preview
   - Spell tree preview per class
   - Confirm button with "Are you sure?" prompt

2. **Class indicator in HUD**
   - Small class icon/color next to player name
   - Class name in inventory screen

3. **Grimoire screen updates**
   - Class spells marked with element color
   - Universal spells marked as "Universal"
   - Locked spells show class requirement

4. **Respec button in inventory**
   - Shows cost: `200 * level` gold
   - Warning: "All class spells will be unequipped"

### Art Direction Handoff

Each class needs:
- Class icon (small, for HUD) -- 32x32 pixel art
- Class selection card art (for Awakening screen) -- 256x384 pixel art
- Spell icons for all 8 class spells -- 48x48 pixel art (32 total, 8 per class)
- Class-themed particle effects for passive triggers

---

## 13. Migration Plan

For existing saves (pre-class system):
```javascript
if (!state.class) {
  state.class = null;
  // Player will be prompted to choose class on next login if level >= 3
  // If level < 3, class selection triggers automatically at level 3
}
```

Existing spells that become class-specific (Fireball, Ignite, Inferno, Frost Spike, Drain Life, Blizzard):
- If player has them in grimoire and hasn't chosen a class yet: they remain usable until class selection
- On class selection: incompatible spells are removed from grimoire, added to inventory as "locked"

---

## 14. Resolved Design Decisions

All questions from the initial draft have been resolved with player input:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Class selection level | **Level 3** | Fast enough to feel exciting, late enough to understand combat basics. ~15-25 min of play. |
| 2 | Locked spells visibility | **Show grayed out with lock icon** | Teases future content, helps inform class choice. |
| 3 | Elemental modifier | **10%** (not 15%) | Felt but not oppressive. No class dominates. Skill > counter-picking. |
| 4 | Respec cost | **100 * level** gold | At level 25 = 2,500g (~20-30 fights). Achievable but not trivial. Fits economy. |
| 5 | Universal spells + passives | **Yes, universals DO trigger passives** | Keeps universals viable, makes class selection impactful immediately. |

---

## 15. Elemental Combat Animations (Pixel Art, Gigaverse-style)

### Design Philosophy

Simple, 2-3 frame pixel animations that play during combat when elemental interactions occur. Inspired by Gigaverse's rock-paper-scissors animations (e.g., sword breaking on shield). These are NOT full spell animations -- they are short elemental interaction vignettes.

### When Animations Play

Animations trigger when a class spell hits an enemy with an elemental tag:

- **Advantage hit** (strong element vs weak): short "domination" animation
- **Disadvantage hit** (weak element vs strong): short "resistance" animation
- **Neutral hit**: no special animation (default spell effect only)

### Animation Specs

**Format**: CSS sprite sheet, 3 frames, 48x48px per frame
**Duration**: 0.3-0.5 seconds total
**Position**: overlaid on enemy sprite, centered

### Required Animations (8 total)

| Animation | Trigger | Frames Description |
|-----------|---------|-------------------|
| **Fire > Earth** | Pyromancer hits Earth enemy | Frame 1: flame hits stone. Frame 2: stone cracks with orange glow. Frame 3: stone crumbles into ember particles. |
| **Earth > Air** | Geomancer hits Air enemy | Frame 1: rock fist rises. Frame 2: wind swirls get trapped. Frame 3: wind dissipates against stone wall. |
| **Air > Water** | Stormcaller hits Water enemy | Frame 1: lightning arcs. Frame 2: water conducts electricity (blue-white flash). Frame 3: water evaporates in sparks. |
| **Water > Fire** | Tidecaster hits Fire enemy | Frame 1: water wave approaches flame. Frame 2: steam explosion. Frame 3: flame extinguished, dripping. |
| **Fire < Water** | Pyromancer hits Water enemy | Frame 1: fireball hits water. Frame 2: fireball fizzles (shrinks). Frame 3: puff of steam, no damage visual. |
| **Earth < Fire** | Geomancer hits Fire enemy | Frame 1: rock hits flame. Frame 2: rock glows red-hot. Frame 3: rock melts/crumbles. |
| **Air < Earth** | Stormcaller hits Earth enemy | Frame 1: wind blast hits stone. Frame 2: wind deflects off wall. Frame 3: dust settles, stone unmoved. |
| **Water < Air** | Tidecaster hits Air enemy | Frame 1: water wave forms. Frame 2: wind scatters droplets. Frame 3: mist dissipates. |

### Implementation Notes

- Animations are purely cosmetic -- they do NOT affect damage calculation timing
- They overlay on the existing combat UI, above the enemy sprite
- Use CSS `animation` with `steps()` timing function for pixel-art feel
- Asset delivery: single sprite sheet per animation (144x48: 3 frames of 48x48)
- Fallback: if sprite not loaded, skip animation (combat flow unaffected)

### Art Direction Handoff

Each animation sprite sheet should follow the game's existing dark fantasy pixel art style:
- Dark background transparency
- Fire: orange/red tones (#e74c3c, #f39c12)
- Air: electric blue/white (#3498db, #ecf0f1)
- Water: teal/deep blue (#1abc9c, #2980b9)
- Earth: brown/amber (#e67e22, #8B4513)

---

*Document created: 2026-03-30*
*Status: APPROVED -- decisions finalized*
*Next steps: Coder implements data model + combat changes. UI/UX designs class selection screen + grimoire locked spell display. Art Director prepares prompts for elemental animation sprites.*
