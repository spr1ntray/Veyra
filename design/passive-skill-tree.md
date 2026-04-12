# Veyra — Passive Skill Tree GDD

> **Author**: PM Orchestrator (researcher + game-creative-director + game-design-narrator)
> **Date**: 2026-04-10
> **Status**: DRAFT v1 — pending user review
> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Depends on**: mage-classes.md, progression-system.md, combat-class-mechanics.md
> **Research basis**: research/passive-skill-trees-research.md

---

## 1. Design Vision

### What Are Passives?
Permanent bonuses that define your mage's playstyle beyond spell selection. They are NOT spells — they don't go in the grimoire. They are always active once unlocked.

### Core Metaphor: The Ley Loom
The player weaves **Ley Threads** into a magical tapestry — their passive tree. Each thread powers a node. The visual is a constellation-like web (not a literal tree), where nodes glow when activated and connections shimmer with the class element color.

### Resource: Ley Threads
| Source | Amount | Notes |
|--------|--------|-------|
| Level up (2-50) | 1 per level | 49 total by max level |
| Tower floor 5 clear | 2 bonus | First clear only |
| Tower floor 10 clear | 3 bonus | First clear only |
| Prestige (each tier) | 3 bonus | 9 total across 3 tiers |
| Quest completions | 1 each (select quests) | ~5 total from quest chain |
| **Grand total** | ~68 threads | Enough for ~60-70% of all nodes |

**Respec cost**: 50 gold per thread refunded. Cheap enough to experiment, expensive enough to not be free.

---

## 2. Tree Structure

### Layout: Class Ring + Universal Core

```
         [Universal Core]
        /    |    |    \
  [Pyro] [Storm] [Tide] [Geo]
   Ring    Ring    Ring    Ring
```

- **Universal Core**: 8 nodes, available to all classes
- **Class Ring**: 20 nodes per class, only accessible to that class
- **Total**: 28 nodes visible per player (8 universal + 20 class)

### Node Types

| Type | Icon | Cost | Count per class | Effect magnitude |
|------|------|------|----------------|-----------------|
| **Minor** | Small circle | 1 thread | 10 | +3-5% stat, small procs |
| **Major** | Large circle | 2 threads | 6 | +8-12% stat, strong conditionals |
| **Keystone** | Diamond | 3 threads | 2 | Game-changing effect, build-defining |
| **Universal** | Star | 1-2 threads | 8 (shared) | Generic utility/stats |

### Node Budget
At max progression (~68 threads), player can unlock:
- All 8 universal nodes (cost: ~12 threads)
- ~10 minor + ~5 major + 1-2 keystones from class ring (cost: ~10 + 10 + 3-6 = ~26 threads)
- Total: ~38 threads spent, ~30 leftover for flexibility
- **This means ~70% of available nodes unlocked** — enough to feel powerful, not enough for everything

---

## 3. Universal Core Nodes (8 nodes)

| # | Name | Cost | Effect |
|---|------|------|--------|
| U1 | Resilient Body | 1 | +10% Max HP |
| U2 | Quick Study | 1 | +8% XP gained from combat |
| U3 | Fortune Seeker | 1 | +12% gold from combat |
| U4 | Arcane Efficiency | 2 | -0.1s cast time on all spells (min 0.5s) |
| U5 | Battle Hardened | 2 | +5% damage reduction from all sources |
| U6 | Mana Overflow | 2 | When shield breaks, deal 30% of shield HP as arcane damage to enemy |
| U7 | Second Wind | 2 | Once per combat: when HP drops below 15%, heal 20% max HP |
| U8 | Executioner | 1 | +15% damage to enemies below 25% HP |

---

## 4. Pyromancer Class Ring (20 nodes)

### Theme: Escalation — damage ramps up the longer the fight goes

#### Minor Nodes (10)
| # | Name | Effect |
|---|------|--------|
| P1 | Searing Touch | +5% fire damage |
| P2 | Pyromaniac | +8% DoT damage |
| P3 | Heat Wave | Ignite ticks 10% faster |
| P4 | Burning Blood | +5% max HP, +3% fire damage |
| P5 | Volatile Embers | Ember stacks last 2s longer |
| P6 | Kindling | +10% damage on first spell cast each combat |
| P7 | Crucible | +4% damage per active Ignite stack on enemy (max 12%) |
| P8 | Flash Point | Scorch cast time -0.2s |
| P9 | Fire Eater | Heal 2 HP per Ignite tick on enemy |
| P10 | Smoke Screen | 8% chance to dodge after casting a fire spell (lasts 2s) |

#### Major Nodes (6)
| # | Name | Effect |
|---|------|--------|
| P11 | Infernal Momentum | Each fire spell cast increases next fire spell damage by 5% (stacks to 25%, resets on non-fire cast) |
| P12 | Living Furnace | Ignite max stacks: 3 -> 5. Each stack beyond 3 ticks for 50% damage. |
| P13 | Meltdown | When enemy HP < 30%, all fire spells gain +20% damage |
| P14 | Backdraft | When Ignite expires, it deals a final burst equal to 50% of total DoT dealt |
| P15 | Forge Shield | Every 4th fire spell cast creates a shield equal to 15% of damage dealt |
| P16 | Chain Reaction | Living Bomb detonation has 30% chance to apply Ignite (1 stack) |

#### Keystones (2)
| # | Name | Cost | Effect |
|---|------|------|--------|
| P-K1 | **Conflagration** | 3 | ALL fire damage has +20% chance to apply 1 Ignite stack. Ignite damage +30%. Trade-off: direct fire damage reduced by 10%. |
| P-K2 | **Phoenix Protocol** | 3 | Once per combat: upon death, resurrect with 30% HP and deal (level * 5) fire damage to enemy. 10s invulnerability after resurrection. Trade-off: max HP permanently reduced by 15%. |

---

## 5. Stormcaller Class Ring (20 nodes)

### Theme: Speed and chain reactions — fast casting, procs cascading

#### Minor Nodes (10)
| # | Name | Effect |
|---|------|--------|
| S1 | Charged Atmosphere | +5% air damage |
| S2 | Quick Fingers | +5% cast speed for air spells |
| S3 | Overcharge | Static Discharge (passive) deals +15% damage |
| S4 | Storm Surge | +3% damage per Static charge consumed (max 15%) |
| S5 | Wind Walker | +8% dodge chance |
| S6 | Conductive | Chain Lightning bounces deal 80% damage instead of 70% |
| S7 | Thunder Clap | 10% chance on air spell hit to stun enemy for 0.5s |
| S8 | Tailwind Boost | Tailwind haste increased from 40% to 50% |
| S9 | Galvanic | +5% damage after dodging an attack (lasts 3s) |
| S10 | Crackling Energy | 5% chance on any cast to generate 1 free Static charge |

#### Major Nodes (6)
| # | Name | Effect |
|---|------|--------|
| S11 | Eye of the Storm | Every 5th spell cast: next air spell guaranteed double strike |
| S12 | Supercell | When Static Discharge procs, 30% chance to proc again immediately |
| S13 | Jet Stream | After casting 3 spells in 4 seconds, gain 20% damage for 3s |
| S14 | Ball Lightning Echo | Ball Lightning persistent damage hits have 15% chance to chain to enemy (extra 50% hit) |
| S15 | Storm Shield | Zephyr dodge now also reflects 25% of avoided damage |
| S16 | Magnetic Field | Enemies slowed by Cyclone also take 10% more air damage |

#### Keystones (2)
| # | Name | Cost | Effect |
|---|------|------|--------|
| S-K1 | **Perpetual Storm** | 3 | Static charges no longer discharge automatically — instead, at 10 charges, unleash a mega-discharge dealing 3x normal. Charges build faster (+1 per 2 casts instead of per 3). Trade-off: no more small random discharges. |
| S-K2 | **Lightning Rod** | 3 | All damage taken is reduced by 20%. When hit, counter-attack with a lightning bolt dealing 40% of damage taken. Trade-off: cannot dodge (Zephyr dodge disabled). |

---

## 6. Tidecaster Class Ring (20 nodes)

### Theme: Endurance and control — outlast everything, punish aggression

#### Minor Nodes (10)
| # | Name | Effect |
|---|------|--------|
| T1 | Tidal Strength | +5% water damage |
| T2 | Deep Currents | +10% lifesteal effectiveness |
| T3 | Numbing Cold | Slow effects last 20% longer |
| T4 | Rejuvenation | +15% healing from Healing Rain |
| T5 | Permafrost | +5% damage to slowed enemies |
| T6 | Water Shield | When hit while above 80% HP, gain 10 shield |
| T7 | Undertow | +3% damage per active slow effect on enemy (max 12%) |
| T8 | Cold Snap | Frost Spike has 15% chance to apply double slow |
| T9 | Ebb and Flow | After healing, next damage spell +8% damage |
| T10 | Thick Skin | +8% damage reduction |

#### Major Nodes (6)
| # | Name | Effect |
|---|------|--------|
| T11 | Riptide Mastery | Riptide passive (class) heal increased to 4% (from 3%) and triggers at every 4th cast (from 5th) |
| T12 | Frozen Ground | Enemies slowed below 40% attack speed also deal 15% less damage |
| T13 | Wellspring | Healing Rain now also heals 15% of damage dealt by next spell |
| T14 | Glacial Armor | Frozen Tomb also grants mage 50 shield for its duration |
| T15 | Drown | Tsunami bonus damage vs slowed targets increased to 60% (from 40%) |
| T16 | Tidal Surge | Every 3rd water spell cast: next water spell deals +25% damage and costs 0.3s less cast time |

#### Keystones (2)
| # | Name | Cost | Effect |
|---|------|------|--------|
| T-K1 | **Absolute Zero** | 3 | All slow effects now also reduce enemy damage by half the slow percentage. Frozen Tomb duration +1s. Trade-off: all water spell cast times +0.3s. |
| T-K2 | **Leviathan** | 3 | Lifesteal cap removed (can heal above max HP, excess becomes shield, cap at 30% max HP as shield). Drain Life lifesteal: 50% -> 70%. Trade-off: healing from non-lifesteal sources (Healing Rain, Riptide) reduced by 40%. |

---

## 7. Geomancer Class Ring (20 nodes)

### Theme: Fortification and retaliation — absorb damage, punish attackers

#### Minor Nodes (10)
| # | Name | Effect |
|---|------|--------|
| G1 | Bedrock Strength | +5% earth damage |
| G2 | Iron Will | +8% shield effectiveness |
| G3 | Aftershock | +10% Tremor damage |
| G4 | Stoneskin Boost | Stone Skin shield +15 base |
| G5 | Unmovable | +5% damage reduction while shielded |
| G6 | Quake | Earthen Spike has 10% chance to stun for 0.3s |
| G7 | Rubble | When shield breaks, deal 20 earth damage to enemy |
| G8 | Geological Survey | +5% damage for each buff/shield active on mage (max 15%) |
| G9 | Dense Core | +12% max HP |
| G10 | Mountain's Patience | +3% damage per second spent in combat (max 15% at 5s) |

#### Major Nodes (6)
| # | Name | Effect |
|---|------|--------|
| G11 | Tectonic Plates | Shield from Stone Skin and Fortify regenerates 3% of max shield per second |
| G12 | Earthquake | Petrify stun duration +0.5s, damage amp +10% (35% total) |
| G13 | Magma Core | While shielded, all spells deal +10% damage as bonus fire damage |
| G14 | Obsidian Armor | Bedrock passive (class) damage reduction increased to 5% per stack (from 3%) |
| G15 | Landslide | Avalanche shield scaling increased to 30% (from 20%) |
| G16 | Living Mountain | Fortify can now triple shield (instead of double). Hard cap still applies. |

#### Keystones (2)
| # | Name | Cost | Effect |
|---|------|------|--------|
| G-K1 | **Unbreakable** | 3 | Shield hard cap raised to 150% of max HP (from 100%). When shield is above 50% of max HP, mage takes 0 damage from hits below 15% max HP. Trade-off: all healing reduced by 50%. |
| G-K2 | **Seismic Wrath** | 3 | Every time mage is hit, gain 1 Wrath stack (max 10). Each stack: +4% damage. At 10 stacks, next earth spell deals triple damage and consumes all stacks. Trade-off: shield generation reduced by 25%. |

---

## 8. UI Specification

### New Screen: `screen-passives`

**Access**: Button in inventory screen (next to stats) or from map menu.

**Layout**:
- Left panel (30%): Mage info (name, level, class), Ley Threads counter (available/total), Respec button
- Center (70%): Constellation-style tree visualization
  - Universal core nodes at center
  - Class ring nodes radiating outward
  - Connected by glowing lines (element color)
  - Unlocked nodes: full brightness + glow
  - Locked but affordable: dim, pulsing border
  - Locked (not enough threads): gray
  - Prerequisite not met: faded with lock icon

**Node interaction**:
- Click: show tooltip (name, effect, cost, prerequisites)
- Click "Unlock" in tooltip: spend threads, node glows
- Hover: show connection lines to adjacent nodes

**Visual style**:
- Background: deep space / dark void with subtle star particles
- Nodes: golden circles (universal), element-colored circles (class)
- Connections: thin glowing lines
- Unlocked: bright with radial glow
- Overall aesthetic: magical constellation map

### Tooltip Format
```
[Node Name]
[Minor / Major / Keystone]
Cost: 2 Ley Threads
─────────────
[Effect description]
─────────────
Requires: [prerequisite node name]
```

---

## 9. Data Structure (state.js)

```js
// In getDefaultState():
passives: {
  leyThreads: 0,           // available to spend
  leyThreadsTotal: 0,      // total ever earned (for display)
  unlocked: [],             // array of node IDs: ['P1', 'P3', 'U1', ...]
  respecCount: 0            // number of times respecced
}
```

### Node Data (new constant)

```js
export const PASSIVE_NODES = {
  U1: { id: 'U1', name: 'Resilient Body', type: 'minor', cost: 1, 
        classRestriction: null, requires: [], 
        effect: { maxHpPercent: 0.10 },
        description: '+10% Max HP' },
  // ... etc
};
```

---

## 10. Implementation Priority

### Phase 1 (Foundation)
1. PASSIVE_NODES data constant in state.js
2. passives object in getDefaultState() + migration
3. Ley Thread award on level up (in addXP)
4. Apply passive effects in getStats() and combat.js
5. Basic passives screen (list view, not tree visualization)

### Phase 2 (Visualization)
1. Canvas/SVG constellation tree rendering
2. Click-to-unlock interaction
3. Tooltip with full info
4. Respec functionality
5. Ley Thread rewards from tower and quests

### Phase 3 (Polish)
1. Unlock animations (node glow burst)
2. Sound effects on unlock
3. Tree preview for other classes (grayed out, "what if")
4. Achievement for unlocking all keystones
