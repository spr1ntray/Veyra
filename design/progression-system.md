# Veyra — Progression System GDD

> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Combat**: Grimoire Autocast (5-slot spell rotation, auto-cast)
> **Character**: Mage with Strength / Intelligence stats
> **Currency**: Gold
> **Date**: 2026-03-30

---

## 1. Level Curve (XP)

### Current State

- Formula: `xpForLevel(level) = floor(100 * level^1.3)`
- Max level: 10 (hardcoded cap in `addXP`)
- Level-up reward: `5 * newLevel` gold

### New Design: Max Level 50 (Revised Economy v2)

**Formula**: `xpForLevel(level) = floor(110 * level^1.5)`

Rationale: The previous formula (`80 * level^1.45`) was far too generous -- a player could reach level 50 in ~3 hours. The new formula uses a base of 110 and exponent of 1.5, which creates a significantly steeper curve. Combined with reduced XP rewards (especially for Training Dummy), reaching level 50 now requires ~25-35 hours of gameplay.

**Key pacing target**: Level 3 (class selection) should take ~15-25 minutes of actual play.

**Target pacing**:

| Level | XP Required | Cumulative XP | Typical Enemy | Fights to Level | Session Estimate |
|-------|------------|---------------|---------------|-----------------|------------------|
| 1->2  | 110        | 110           | Dummy (5 XP)  | 22              | ~6 min           |
| 2->3  | 168        | 278           | Skeleton (12 XP) | 14           | ~6 min (12 min total) |
| 3->4  | 228        | 506           | Shadow Wraith (15 XP) | 15      | ~7 min (19 min total) |
| 5->6  | 363        | 1,325         | Frost Elem (18 XP) | 20        | ~10 min (35 min total) |
| 10->11| 905        | 6,200         | Undead Knight (25 XP) | 36      | ~18 min (1h 10m total) |
| 15->16| 1,613      | 17,100        | Demon Lord (35 XP) | 46        | ~25 min (2h 10m total) |
| 20->21| 2,473      | 36,500        | Void Horror (50 XP) | 49       | ~35 min (3h 30m total) |
| 25->26| 3,464      | 66,000        | Cursed Golem (60 XP) | 58      | ~40 min (5h 15m total) |
| 30->31| 4,574      | 107,000       | Banshee (75 XP) | 61           | ~45 min (7h 30m total) |
| 40->41| 7,141      | 225,000       | Abyssal Watcher (110 XP) | 65  | ~50 min (14h total) |
| 49->50| 10,070     | 385,000       | The Hollow (180 XP) | 56       | ~45 min (22h total) |

**Total play time to level 50**: approximately 22-30 hours (including shopping, grimoire management, exploration)

**Post-Max (Level 50)**:
- XP continues to accumulate into a "Prestige XP" counter
- Every 10,000 Prestige XP = 1 Prestige Star (cosmetic, displayed next to name)
- Prestige Stars: unlimited, serve as bragging rights
- Gold reward per prestige tick: 100 gold

### Coder Handoff: `xpForLevel()` and `addXP()`

```
// Change formula
export function xpForLevel(level) {
  return Math.floor(110 * Math.pow(level, 1.5));
}

// Change max level from 10 to 50
// Add prestige logic after level 50
// Add state.prestigeXP, state.prestigeStars to getDefaultState()
```

---

## 2. Stats Per Level-Up

### Design: Hybrid System (Auto-Growth + Attribute Points)

Each level-up grants:
1. **Automatic stat growth** (fixed, always applied)
2. **1 Attribute Point** (player choice: Strength or Intelligence)
3. **Gold bonus**: `5 * newLevel` (reduced from 10 to align with tighter economy)

### Auto-Growth Per Level

| Stat         | Growth Per Level | Base (Lv1) | At Lv10 | At Lv25 | At Lv50 |
|--------------|-----------------|------------|---------|---------|---------|
| Strength     | +2              | 5          | 23      | 53      | 103     |
| Intelligence | +3              | 5          | 32      | 77      | 152     |
| Max HP       | +15             | 100        | 235     | 460     | 835     |

### Attribute Points

- 1 point per level = 49 total points by level 50
- Each point invested in **Strength**: +3 Strength
- Each point invested in **Intelligence**: +4 Intelligence
- Points stored in `state.attributePoints.unspent`, `state.attributePoints.strength`, `state.attributePoints.intelligence`

### Stat Formulas (Updated)

```
Strength     = 5 + (level-1)*2 + attributePoints.strength*3 + floor(BonusPower*0.4)
Intelligence = 5 + (level-1)*3 + attributePoints.intelligence*4 + BonusPower
Max HP       = 100 + (level-1)*15 + floor(BonusPower*0.5) + attributePoints.strength*5
```

**Strength effects**:
- Physical damage component (future melee spells): `base * (1 + STR/100)`
- HP bonus: each Strength point invested also adds +5 Max HP
- Item equip requirements (future legendary items may require STR thresholds)

**Intelligence effects**:
- Spell damage multiplier: `intMult = 1 + (INT - 5) / 100` (unchanged from current)
- Mana Shield scaling: `40 + INT * 0.8` (unchanged)
- Spell unlock: no change (level-gated, not INT-gated)

### Intended Player Behavior

- **Glass cannon build**: all points into INT -> max spell damage, low HP
- **Survivor build**: all points into STR -> high HP/survivability, lower DPS
- **Balanced build**: split points -> jack of all trades
- This choice creates replayability and meaningful customization without needing a class system

### Edge Cases

- If player has unspent points and levels up again: points accumulate (no cap on unspent)
- Respec (attribute points): costs `50 * level` gold, refunds all attribute points. Can respec at any time from inventory screen
- Respec (class change): costs `100 * level` gold (see mage-classes.md). More expensive because class change is a bigger decision
- At level 50 with all points spent: no more attribute choices, only gear optimization remains

### Coder Handoff: `state.js`

```
// Add to getDefaultState():
attributePoints: {
  unspent: 0,
  strength: 0,
  intelligence: 0
}

// In addXP(), on level-up:
state.attributePoints.unspent += 1;

// New function: spendAttributePoint(stat)
// New function: respecAttributes()

// Update getStats() to include attributePoints
// Update calcMageMaxHP() in combat.js
```

**UI/UX Handoff**: Level-up modal with STR/INT choice buttons. Show preview of stat change before confirming. Show "X points available" badge in inventory if unspent > 0.

---

## 3. Spell Unlock Schedule

### Current State

All 12 spells have `unlockLevel` fields. `getUnlockedSpells()` already filters by level. But current max level is 10 and spells go up to `unlockLevel: 9`.

### New Schedule (Expanded to 16 Spells)

**Note**: This schedule represents the pre-class-system universal spell list. With the mage class system (see `mage-classes.md`), many of these spells become class-specific. The 4 universal spells are: Arcane Bolt, Focus, Mana Shield, Arcane Barrage. All other spells are distributed across Pyromancer/Stormcaller/Tidecaster/Geomancer class spell trees.

Spaced across 50 levels. New spells marked with `[NEW]`.

| Level | Spell             | School   | Role               |
|-------|-------------------|----------|--------------------|
| 1     | Arcane Bolt       | Arcane   | Baseline damage    |
| 1     | Focus             | Utility  | Damage amplifier   |
| 2     | Fireball          | Fire     | High single-hit    |
| 2     | Shadow Bolt       | Shadow   | Lifesteal          |
| 3     | Frost Spike       | Frost    | Slow + damage      |
| 3     | Mana Shield       | Utility  | Survivability      |
| 5     | Arcane Barrage    | Arcane   | Multi-hit burst    |
| 6     | Ignite            | Fire     | DoT stacking       |
| 8     | Drain Life        | Shadow   | High lifesteal     |
| 10    | Blizzard          | Frost    | Heavy slow         |
| 12    | Inferno           | Fire     | Highest burst      |
| 15    | Void Eruption     | Shadow   | Debuff amplifier   |
| 20    | `[NEW]` Chain Lightning | Arcane | Bouncing damage |
| 30    | `[NEW]` Soul Siphon     | Shadow | AoE lifesteal   |
| 40    | `[NEW]` Permafrost       | Frost  | Freeze (stun)   |
| 50    | `[NEW]` Cataclysm        | Fire   | Ultimate nuke    |

### New Spell Definitions

#### Chain Lightning (Level 20)
```
id: 'chain_lightning'
school: 'arcane'
baseDmg: { min: 30, max: 45 }
castTime: 2.0
effect: { type: 'chain', bounces: 2, decayPercent: 0.30 }
description: 'Hits target, then bounces to 2 more targets. Each bounce deals 70% of previous.'
```
*Note: in current single-target combat, bounces hit the same enemy for reduced damage. Future multi-enemy encounters unlock full potential.*

Effective damage vs single target: `base + base*0.7 + base*0.49 = base * 2.19`

#### Soul Siphon (Level 30)
```
id: 'soul_siphon'
school: 'shadow'
baseDmg: { min: 35, max: 55 }
castTime: 3.0
effect: { type: 'lifesteal', percent: 0.40, selfHeal: 20 }
description: 'Damage + 40% lifesteal + flat 20 HP heal. The ultimate sustain spell.'
```

#### Permafrost (Level 40)
```
id: 'permafrost'
school: 'frost'
baseDmg: { min: 20, max: 35 }
castTime: 2.5
effect: { type: 'freeze', duration: 2.0, slowAfter: 0.50, slowDuration: 4 }
description: 'Freezes enemy for 2 sec (no attacks), then 50% slow for 4 sec.'
```

#### Cataclysm (Level 50)
```
id: 'cataclysm'
school: 'fire'
baseDmg: { min: 80, max: 120 }
castTime: 5.0
effect: { type: 'dot', tickDmg: 15, ticks: 5, interval: 1.0, maxStacks: 1 }
description: 'Massive initial hit + 15 dmg/sec for 5 sec. The endgame nuke.'
```

### Edge Cases

- Spell added to grimoire before unlock (e.g., level down from respec): grimoire slot becomes invalid, auto-replaced with null. Combat requires minimum 3 non-null slots.
- No level-down mechanic exists, so this is defensive-only.

---

## 4. Item System and Drops

### Current State

- 12 equipment items across 3 slots (staff/hat/cloak), 4 tiers (starter/common/uncommon/rare/epic)
- 4 consumables
- Drop: flat 5% chance after any win, uniform random from entire pool
- No legendary tier exists
- All items given to player at start (for testing) -- this will change

### New Rarity Tiers

| Rarity     | Color     | BonusPower Range | Drop Weight | Sell Value |
|------------|-----------|-----------------|-------------|------------|
| Common     | #aaa      | 1-5             | 50          | 5 gold     |
| Uncommon   | #2ecc71   | 8-18            | 30          | 15 gold    |
| Rare       | #4a90d9   | 20-28           | 15          | 40 gold    |
| Epic       | #9b59b6   | 30-40           | 4           | 100 gold   |
| Legendary  | #f39c12   | 45-60           | 1           | 250 gold   |

Total weight: 100. Drop chance for legendary = 1%.

### New Legendary Items (3 total, one per slot)

#### Ashbringer Staff
```
id: 'ashbringer_staff'
name: 'Ashbringer'
slot: 'staff', bonus: 50, rarity: 'legendary'
desc: 'Fire spells deal +20% damage'
specialEffect: { school: 'fire', damageBonus: 0.20 }
minLevel: 25
```

#### Voidcrown
```
id: 'voidcrown'
name: 'Voidcrown'
slot: 'hat', bonus: 45, rarity: 'legendary'
desc: 'Shadow spells heal 10% of damage dealt'
specialEffect: { school: 'shadow', lifestealBonus: 0.10 }
minLevel: 30
```

#### Mantle of Eternity
```
id: 'mantle_eternity'
name: 'Mantle of Eternity'
slot: 'cloak', bonus: 55, rarity: 'legendary'
desc: 'Mana Shield starts each combat automatically'
specialEffect: { type: 'auto_shield' }
minLevel: 35
```

### Drop Mechanics (Reworked)

**Base drop chance**: scales with enemy difficulty

| Enemy            | Base Drop % | Rarity Modifier |
|------------------|-------------|-----------------|
| Training Dummy   | 3%          | Common/Uncommon only |
| Skeleton Warrior | 6%          | Standard weights  |
| Shadow Wraith    | 8%          | Standard weights  |
| Frost Elemental  | 10%         | Standard weights  |
| Undead Knight     | 12%         | +5 weight to Rare |
| Demon Lord       | 15%         | +3 weight to Epic |
| Void Horror      | 18%         | +1 weight to Legendary |

**Level-scaled rarity shift**: for every 5 player levels above enemy `recommendedLevel`, shift +2 weight from Common to Uncommon. Prevents high-level players from farming low-level enemies for rares.

**Drop algorithm**:
```
1. Roll dropChance = enemy.baseDropChance + (playerLevel * 0.2)%
   Cap at 25%.
2. If drop triggers:
   a. Pick random slot (staff/hat/cloak — equal 33% each)
   b. Roll rarity using weighted table + enemy modifier
   c. Select item matching slot + rarity
   d. If no item exists for that rarity, downgrade one tier
3. Legendary items: additional check — player level must be >= item.minLevel
   If not met, re-roll as Epic
```

### Item Selling

- Player can sell items from inventory for gold
- Sell value = defined per rarity (see table above)
- Equipped items cannot be sold
- Starter items cannot be sold

### Consumable Shop

Already exists. Prices:
- Mana Elixir: 50g
- Crystal Shard: 40g
- Iron Flask: 60g
- Shadow Dust: 80g

Add new consumable at level 20:

#### Scroll of Haste
```
id: 'scroll_of_haste'
name: 'Scroll of Haste'
slot: 'consumable', bonus: 0, rarity: 'uncommon'
desc: '-20% cast time for 3 combats'
buffId: 'haste_buff', buffCombats: 3
price: 100
```

### Edge Cases

- Player at max inventory capacity (future): show "Inventory Full" notification, auto-sell lowest rarity item for gold, or discard
- Duplicate legendary: allowed. Can sell extra for 250g. No "unique equipped" restriction.
- Drop during loss: 0% drop chance. Timeout: 0% drop chance. Win only.

---

## 5. Enemy Progression (Expanded for 50 Levels)

### Current Enemies (Revised XP & Gold -- Economy v2)

XP and gold rewards have been significantly reduced to match the new slower progression curve. Training Dummy in particular now gives minimal rewards -- it exists for practice, not farming.

| Enemy           | HP  | ATK | Interval | Rec.Lv | XP  | Gold      | Change Notes |
|-----------------|-----|-----|----------|--------|-----|-----------|-------------|
| Training Dummy  | 200 | 0   | -        | 1      | **5**   | **1-2**   | Drastically reduced. Practice only. |
| Skeleton Warrior| 300 | 12  | 2.5s     | 2      | **12**  | **4-7**   | Reduced ~50%. First real fight. |
| Shadow Wraith   | 250 | 18  | 1.8s     | 3      | **15**  | **5-9**   | Reduced ~50%. |
| Frost Elemental | 400 | 10  | 3.0s     | 4      | **18**  | **6-11**  | Reduced ~50%. |
| Undead Knight   | 450 | 15  | 2.0s     | 5      | **25**  | **8-14**  | Reduced ~45%. |
| Demon Lord      | 600 | 22  | 1.5s     | 7      | **35**  | **12-20** | Reduced ~40%. |
| Void Horror     | 800 | 25  | 1.8s     | 9      | **50**  | **18-30** | Reduced ~40%. |

### New Enemies (Level 12-50) -- Revised Economy v2

| Enemy              | HP    | ATK | Interval | Rec.Lv | XP    | Gold      | Weakness | Special              |
|--------------------|-------|-----|----------|--------|-------|-----------|----------|----------------------|
| Cursed Golem       | 1000  | 18  | 2.5s     | 12     | **60**  | **22-35** | arcane   | 30% phys resist      |
| Banshee            | 700   | 30  | 1.2s     | 15     | **75**  | **28-42** | fire     | Screams: -15% cast speed debuff |
| Blood Revenant     | 1200  | 22  | 2.0s     | 18     | **90**  | **35-50** | frost    | 15% lifesteal on attacks |
| Abyssal Watcher    | 1500  | 28  | 1.8s     | 22     | **110** | **42-60** | shadow   | 20% spell reflect    |
| Lich King          | 2000  | 35  | 1.5s     | 28     | **140** | **55-80** | fire     | Summons shields (200 HP every 10s) |
| Elder Dragon       | 3000  | 40  | 2.0s     | 35     | **180** | **70-100**| frost    | Enrages at 30% HP (+50% ATK) |
| The Hollow         | 4000  | 50  | 1.5s     | 42     | **230** | **90-130**| arcane   | Heals 5% HP every 8s |
| Veyra (Final Boss) | 5500  | 60  | 1.2s     | 48     | **300** | **120-180**| none    | Rotates resistances every 10s |

### XP Curve Validation (Economy v2)

At level 48, player needs ~9,700 XP to reach 49. Fighting Veyra (300 XP/win), that is ~32 fights. At 50-second average fight, that is ~27 minutes of combat for one level. This creates a meaningful endgame grind where each level feels earned. Fighting The Hollow (230 XP) is ~42 fights -- slower but safer for non-optimized builds.

---

## 6. PvP Progression (Future Design)

### PvP Format

**Asynchronous PvP**: Player fights AI-controlled avatars of other players. Not real-time.

- Each player has a "PvP Profile": their equipped gear, grimoire loadout, level, stats
- Matchmaking picks an opponent avatar near the player's rating
- Combat runs identically to PvE: both grimoires auto-cast against each other

### Rating System: Modified Elo

**Initial rating**: 1000 for all new players.

```
K-factor: 32 (for ratings < 1500), 24 (1500-2000), 16 (2000+)
Expected score: E_a = 1 / (1 + 10^((R_b - R_a) / 400))
New rating: R_a' = R_a + K * (S - E_a)
  where S = 1 (win), 0.5 (timeout), 0 (loss)
```

### Leagues

| League      | Rating Range | Season Reward        |
|-------------|-------------|----------------------|
| Bronze      | 0-999       | 200 gold             |
| Silver      | 1000-1299   | 500 gold + 1 consumable |
| Gold        | 1300-1599   | 1000 gold + rare item |
| Platinum    | 1600-1899   | 2000 gold + epic item |
| Diamond     | 1900-2199   | 3000 gold + legendary item |
| Grandmaster | 2200+       | 5000 gold + exclusive cosmetic |

### PvP Balance Approach

**No level scaling**. Higher level = genuine advantage. This is intentional:
- PvP is an endgame activity. Players below level 20 should not be matched.
- Elo naturally separates: a level 20 player who wins a lot will rise, a level 50 player who loses will fall. Rating reflects effective power, not raw level.
- Gear matters. A well-geared level 30 can beat a poorly-geared level 40. This makes loot progression meaningful.

**Anti-smurf**: minimum level 15 to unlock PvP. New accounts cannot tank rating on purpose.

### Seasons

- Season length: 30 days
- At season end: rating soft-resets to `max(1000, currentRating - 300)`
- Season rewards distributed based on peak rating during the season (not end rating)
- Seasons prevent rating stagnation and create recurring engagement hooks

### Edge Cases

- Player has no grimoire set: cannot queue PvP. Minimum 3 spells required (same as PvE).
- Both mages die same tick: draw. Both get S = 0.5.
- Opponent avatar is outdated (player changed gear since snapshot): PvP profile updates on every login and after every gear change.
- Rating goes below 0: floor at 0.

---

## 7. Implementation Plan (Technical Specification)

### Changes to `state.js`

#### 7.1 Update `getDefaultState()`

Add fields:
```javascript
// In getDefaultState() return object:
attributePoints: {
  unspent: 0,
  strength: 0,
  intelligence: 0
},
prestigeXP: 0,
prestigeStars: 0,
pvp: {
  rating: 1000,
  peakRating: 1000,
  season: 1,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0
}
```

Remove from `getDefaultState().inventory`: all non-starter items that currently start at `1`. New players start with starter gear only. Items must be earned.

```javascript
inventory: {
  // Starter gear is in equipment, not inventory
  // Consumables start at 0
  mana_elixir: 0,
  crystal_shard: 0,
  iron_flask: 0,
  shadow_dust: 0
}
```

#### 7.2 Update `xpForLevel()`

```javascript
export function xpForLevel(level) {
  return Math.floor(110 * Math.pow(level, 1.5));
}
```

#### 7.3 Update `addXP()`

```javascript
export function addXP(amount) {
  const state = getState();
  state.xp += amount;
  const levelUps = [];

  while (state.level < 50) {
    const needed = xpForLevel(state.level);
    if (state.xp >= needed) {
      state.xp -= needed;
      state.level++;
      state.attributePoints.unspent += 1;
      levelUps.push(state.level);
      state.gold += 5 * state.level;
    } else {
      break;
    }
  }

  // Post-50 prestige
  if (state.level >= 50) {
    state.prestigeXP += state.xp; // overflow XP goes to prestige
    state.xp = 0;
    while (state.prestigeXP >= 10000) {
      state.prestigeXP -= 10000;
      state.prestigeStars++;
      state.gold += 100;
    }
  }

  saveState();
  return levelUps;
}
```

#### 7.4 New: `spendAttributePoint(stat)`

```javascript
export function spendAttributePoint(stat) {
  const state = getState();
  if (state.attributePoints.unspent <= 0) return false;
  if (stat !== 'strength' && stat !== 'intelligence') return false;

  state.attributePoints.unspent--;
  state.attributePoints[stat]++;
  saveState();
  return true;
}
```

#### 7.5 New: `respecAttributes()`

```javascript
export function respecAttributes() {
  const state = getState();
  const cost = 50 * state.level;
  if (state.gold < cost) return false;

  state.gold -= cost;
  const totalSpent = state.attributePoints.strength + state.attributePoints.intelligence;
  state.attributePoints.unspent += totalSpent;
  state.attributePoints.strength = 0;
  state.attributePoints.intelligence = 0;
  saveState();
  return true;
}
```

#### 7.6 Update `getStats()`

```javascript
export function getStats() {
  const state = getState();
  const bp = getBonusPower();
  const ap = state.attributePoints || { strength: 0, intelligence: 0 };

  const str = 5 + (state.level - 1) * 2 + ap.strength * 3 + Math.floor(bp * 0.4);
  const int = 5 + (state.level - 1) * 3 + ap.intelligence * 4 + bp;

  // Dynamic max based on level 50, all points in one stat, BiS legendary gear
  const maxStr = 5 + 49 * 2 + 49 * 3 + Math.floor(150 * 0.4);  // ~310
  const maxInt = 5 + 49 * 3 + 49 * 4 + 150;                      // ~498

  return {
    strength: str,
    intelligence: int,
    maxStrength: maxStr,
    maxIntelligence: maxInt
  };
}
```

#### 7.7 Update `rollItemDrop()` — Level-Weighted Rarity

```javascript
export function rollItemDrop(enemyId, playerLevel) {
  const enemy = ENEMIES_DATA[enemyId];
  const baseChance = enemy?.baseDropChance || 0.05;
  const dropChance = Math.min(0.25, baseChance + playerLevel * 0.002);

  if (Math.random() > dropChance) return null;

  // Pick slot
  const slots = ['staff', 'hat', 'cloak'];
  const slot = slots[Math.floor(Math.random() * slots.length)];

  // Roll rarity with enemy modifier
  const weights = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 };
  // Apply enemy-specific modifiers here (see design doc section 4)

  const rarity = weightedRandom(weights);

  // Find matching item
  const pool = ITEM_POOLS[slot].filter(id => ITEMS_DATA[id].rarity === rarity);
  if (pool.length === 0) {
    // Downgrade: try next lower rarity
    // Implementation detail for Coder
  }

  // Legendary level gate
  const item = ITEMS_DATA[pool[Math.floor(Math.random() * pool.length)]];
  if (item.rarity === 'legendary' && playerLevel < (item.minLevel || 1)) {
    // Re-roll as epic
  }

  return item.id;
}
```

#### 7.8 Update `calcMageMaxHP()` in `combat.js`

```javascript
function calcMageMaxHP() {
  const state = getState();
  const bp = getBonusPower();
  const ap = state.attributePoints || { strength: 0 };
  let base = 100 + (state.level - 1) * 15 + Math.floor(bp * 0.5) + ap.strength * 5;
  if (state.buffs?.iron_flask_buff?.active) base += 40;
  return base;
}
```

#### 7.9 Update `getUnlockedSpells()`

Already correct. Just add new spells to `SPELLS_DATA` with appropriate `unlockLevel` values. The function filters automatically.

#### 7.10 Add `baseDropChance` to `ENEMIES_DATA`

Add field to each enemy entry:
```
training_dummy:   baseDropChance: 0.03
skeleton_warrior: baseDropChance: 0.06
shadow_wraith:    baseDropChance: 0.08
frost_elemental:  baseDropChance: 0.10
undead_knight:    baseDropChance: 0.12
demon_lord:       baseDropChance: 0.15
void_horror:      baseDropChance: 0.18
```

---

## 8. Progression Flow Diagram

```
[Win Combat]
    |
    +--> [+XP] --> [Level Up?]
    |                 |
    |            [Yes] --> [+1 Attribute Point]
    |                 |        |
    |                 |    [Player chooses STR or INT]
    |                 |
    |                 +--> [New Spell Unlocked?] --> [Notification]
    |                 |
    |                 +--> [+Gold (5*level)]
    |
    +--> [+Gold (enemy reward)]
    |
    +--> [Drop Roll] --> [Item?]
    |                      |
    |                 [Yes] --> [Rarity Roll] --> [Add to Inventory]
    |
    +--> [Buff Tick] --> [Decrement active buff combats]
    |
    +--> [At Level 50?] --> [Prestige XP accumulation]
```

---

## 9. Balance Checkpoints

### Level 1 (New Player) -- Economy v2

- HP: 100
- STR: 5, INT: 5
- Spells: Arcane Bolt, Focus
- Enemy: Training Dummy (200 HP, 0 ATK)
- Expected fight time: ~15 sec
- Expected XP: **5**. Need **110** to level 2. ~**22 fights** (~5-6 min).
- This is intentionally slow for the Dummy. The player should progress to Skeleton Warrior quickly.

### Level 10 (Early Mid-Game) -- Economy v2

- HP: ~235 + gear (~260)
- STR: ~23 + gear, INT: ~32 + gear
- Spells: 10 unlocked, pick best 5
- Enemy: Undead Knight (450 HP, 15 ATK, 2.0s)
- Expected fight time: ~30 sec
- Expected XP: **25**. Need **905** to level 11. ~**36 fights** (~18 min).

### Level 25 (Mid-Game)

- HP: ~460 + gear + AP (~550)
- INT (full INT build): ~77 + 100 (25 AP * 4) + gear = ~220
- intMult = 1 + (220-5)/100 = 3.15
- Fireball avg: 40 * 3.15 = 126 damage per cast
- Enemy: Lich King (2000 HP). ~16 casts to kill. At ~2.2s each = ~35 sec.
- Feels right: challenging but doable.

### Level 50 (Endgame)

- HP (full STR build): 835 + 49*5(AP) + gear = ~1180
- INT (full INT build): 152 + 196(49*4) + 150(gear) = ~498
- intMult = 1 + 493/100 = 5.93
- Cataclysm avg: 100 * 5.93 = 593 initial + 89/tick * 5 = ~1038 total
- Veyra (5500 HP, 60 ATK, 1.2s) = needs ~6 Cataclysm rotations, ~30+ sec fight.
- At 60 ATK / 1.2s = 50 DPS. Player has ~1180 HP = survives ~24 sec. Tight. Requires shields, lifesteal, or slow. Intended.

---

## 10. Migration Plan (Existing Saves)

Players with existing localStorage saves need migration:

```javascript
// In loadState(), after merge:
if (!state.attributePoints) {
  state.attributePoints = { unspent: 0, strength: 0, intelligence: 0 };
  // Grant retroactive points for levels already gained
  state.attributePoints.unspent = Math.max(0, state.level - 1);
}
if (state.prestigeXP === undefined) state.prestigeXP = 0;
if (state.prestigeStars === undefined) state.prestigeStars = 0;
if (!state.pvp) {
  state.pvp = { rating: 1000, peakRating: 1000, season: 1, matchesPlayed: 0, wins: 0, losses: 0, draws: 0 };
}
```

Existing players who had all items in inventory: keep them. Only new accounts start empty.

---

## Dependencies

| System             | Depends On                | File(s)          |
|--------------------|--------------------------|------------------|
| XP / Level-Up      | Combat rewards            | state.js, combat.js |
| Attribute Points   | Level-Up system           | state.js          |
| Spell Unlocks      | Level system              | state.js (SPELLS_DATA) |
| Item Drops         | Combat win, enemy data    | state.js, combat.js |
| PvP Rating         | Combat system (async)     | state.js (future pvp.js) |
| Stat Formulas      | Attribute Points, Gear    | state.js, combat.js |
| Level-Up UI        | Attribute Points          | **UI/UX Handoff** |
| Respec UI          | Gold, Attribute Points    | **UI/UX Handoff** |

---

*Document created: 2026-03-30*
*Next steps: Coder implements sections 7.1-7.10. UI/UX designs level-up modal and respec button.*
