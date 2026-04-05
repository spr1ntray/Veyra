# Veyra -- Prestige / Rebirth System GDD

> **Author**: Game Designer Agent
> **Date**: 2026-03-30
> **Status**: DRAFT v2 -- pending PM review
> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Depends on**: progression-system.md, mage-classes.md

---

## 1. Design Philosophy

### Core Idea

Rebirth is a voluntary reset: the player sacrifices current progress for permanent, stacking bonuses that make the next playthrough faster and more powerful. This creates a second progression axis -- the player progresses through multiple lifetimes, not just levels.

### Player Psychology

- **Sunk cost inversion**: giving up progress feels *good* because the reward is permanent
- **Replayability**: class reset + 4 classes encourages trying new builds each cycle
- **Power fantasy escalation**: each Rebirth makes the player noticeably stronger
- **Engagement hook**: Rebirth resets the core loop (level 1-50), giving fresh pacing without new content

### Design Constraints

- Bonuses meaningful (player feels the difference) but not game-breaking (Prestige III player still fights, does not one-shot)
- Economy must not hyperinflate -- XP/gold multipliers capped and validated
- Rebirth must feel like a *choice*, never a requirement
- 3 tiers with a hard cap -- no infinite grind anxiety

---

## 2. Unlock Conditions

Rebirth becomes available when the player meets **either** condition:

| Condition | Rationale |
|-----------|-----------|
| Reach **Level 10** | ~1h 10m of play. Player has chosen a class, fought 5+ enemy types, understands combat. Enough investment to make reset feel weighty. |
| Defeat **all 7 original enemies** (Training Dummy through Void Horror) | Alternative path for skilled/optimized players who beat every enemy without grinding levels. Requires ~level 7-9 in practice. |

### Unlock Logic

```
canRebirth(state) =
  (state.level >= 10 || state.prestige.enemiesDefeated.length >= 7)
  AND state.prestige.tier < 3
```

### Edge Cases

- Level 10 but hasn't beaten all enemies: Rebirth available (level condition sufficient).
- Beats all 7 enemies at level 8 via optimized build: Rebirth available via enemy condition.
- `enemiesDefeated` is **cumulative across all cycles** (stored in `state.prestige`). Defeating Skeleton Warrior in cycle 1 counts forever. This means after first Rebirth, if all 7 were already defeated in a prior cycle, player can immediately Rebirth again at level 1 of cycle 2. **Intentional** -- enables speedrun-style prestige rushing for experienced players.
- Rebirth button appears in character/inventory screen once unlocked. Does NOT auto-trigger.
- Rebirth button disabled during combat (screen-locked).

---

## 3. What Rebirth Resets

| Resets to Default | Preserved |
|-------------------|-----------|
| Level -> 1 | Prestige tier (I/II/III) |
| XP -> 0 | All prestige bonuses (permanent) |
| Gold -> 0 | `prestige.enemiesDefeated` (cumulative) |
| All inventory items removed | `prestige.masteredClasses` |
| Equipment -> starter gear only | Prestige Stars (cosmetic, from post-50 overflow) |
| Grimoire -> [null x5] | Lifetime stats (XP, gold, kills) |
| Attribute points -> 0 (unspent + spent) | Player name |
| Buffs -> all inactive | Daily login progress |
| Combat stats (consecutiveWins, etc.) -> 0 | Timestamps (firstLogin preserved) |
| Class -> null (see section 5) | PvP data (with soft reset, see section 7) |
| Prestige Stars -> 0 | |
| Prestige XP -> 0 | |

---

## 4. Prestige Tiers and Bonuses

Three tiers. Each Rebirth advances the player one tier. After tier III, no further Rebirths available -- player has reached the final form.

### Tier Summary

| Tier | Rebirth # | Icon | XP Mult | Gold Mult | Stat Bonus | Special |
|------|-----------|------|---------|-----------|------------|---------|
| **I** | 1st | Bronze skull | x1.15 (+15%) | x1.10 (+10%) | +5 base STR, +5 base INT | Rebirth Merchant (exclusive shop) |
| **II** | 2nd | Silver skull | x1.35 (+35%) | x1.25 (+25%) | +12 base STR, +12 base INT, +50 base HP | Prestige spell: Soul Echo |
| **III** | 3rd | Gold skull | x1.50 (+50%) | x1.40 (+40%) | +20 base STR, +20 base INT, +100 base HP | Prestige passive: Eternal Flame, title "The Reborn" |

**Multipliers are cumulative replacement, not additive** -- Prestige II replaces Prestige I values (the table shows final values at each tier, not deltas).

---

### Prestige I -- Detailed

| Bonus | Value | Gameplay Effect |
|-------|-------|-----------------|
| XP multiplier | x1.15 | Level 2 in ~19 fights vs 22. Saves ~1 min/level. Total time to 50: ~19-26h (from 22-30h). |
| Gold multiplier | x1.10 | Skeleton Warrior drops 4-8g (from 4-7g, rounded). Slight economic boost. |
| Base STR +5 | Flat | Lv1: STR 10 vs 5. Lv50: 108 vs 103 (marginal at endgame). |
| Base INT +5 | Flat | Lv1: INT 10 vs 5. intMult = 1.05 vs 1.00. +5% spell damage from minute one. |
| Rebirth Merchant | Access | Exclusive shop with prestige-only consumables (section 6). |

### Prestige II -- Detailed

| Bonus | Value | Gameplay Effect |
|-------|-------|-----------------|
| XP multiplier | x1.35 | Level 2 in ~16 fights. Total time to 50: ~16-22h. |
| Gold multiplier | x1.25 | Skeleton Warrior drops 5-9g. Meaningfully faster shopping. |
| Base STR +12 | Flat | Lv1 STR = 17. Lv50 STR = 115. |
| Base INT +12 | Flat | Lv1 INT = 17. intMult at Lv1 = 1.12. |
| Base HP +50 | Flat | Lv1 HP = 150. Can challenge Skeleton Warrior at level 1. |
| Soul Echo | Spell | See section 5. Universal prestige spell. |

### Prestige III -- Detailed

| Bonus | Value | Gameplay Effect |
|-------|-------|-----------------|
| XP multiplier | x1.50 | Level 2 in ~15 fights. Total time to 50: ~15-20h. |
| Gold multiplier | x1.40 | Skeleton Warrior drops 6-10g. Economy noticeably accelerated. |
| Base STR +20 | Flat | Lv1 STR = 25. Lv50 STR = 123. |
| Base INT +20 | Flat | Lv1 INT = 25. intMult at Lv1 = 1.20. |
| Base HP +100 | Flat | Lv1 HP = 200. Equal to Training Dummy's max HP. |
| Eternal Flame | Passive | One-time death prevention per combat (section 5). |
| "The Reborn" | Title | Displayed next to player name. |

---

### Balance Validation

**Prestige III, Level 50, Full INT Build**:
- INT = 5 + 20(prestige) + 49*3(growth) + 49*4(AP) + 150(gear) = 522
- intMult = 1 + (522-5)/100 = 6.17
- Cataclysm avg: 100 * 6.17 = 617 initial + 93/tick * 5 = ~1082 total
- vs non-prestige (progression-system.md): 1038 total
- **Delta: +4.2% total damage.** Felt but does not trivialize Veyra boss fight.

**Prestige III, Level 1**:
- HP = 200, STR = 25, INT = 25
- intMult = 1.20
- Arcane Bolt avg: 20 * 1.20 = 24 dmg (vs 20 at no prestige)
- Training Dummy (200 HP): ~9 casts vs ~10. Marginal.
- Skeleton Warrior (300 HP, 12 ATK/2.5s): Player 200 HP, survives ~42s. Needs ~13 casts at ~2s = ~26s. **Winnable at level 1.** Intended reward for completing 3 full cycles.

**XP multiplier time validation**:
- No prestige: ~22-30h to level 50
- Prestige I: ~19-26h (-13%)
- Prestige II: ~16-22h (-27%)
- Prestige III: ~15-20h (-33%)
- Even at P-III, 15+ hours to 50. Not trivial.

**Total investment for full Prestige III completion**: ~60-80 hours across 4 runs (initial + 3 Rebirth cycles).

---

## 5. Prestige-Exclusive Rewards

### Soul Echo (Prestige II+)

```
id: 'soul_echo'
school: 'arcane'
classRequired: null       // universal, all classes
unlockLevel: 1            // usable immediately after Rebirth
baseDmg: { min: 15, max: 25 }
castTime: 2.0
effect: {
  type: 'echo',
  echoPercent: 0.30,      // repeats previous grimoire spell at 30% power
  echoCasts: 1
}
description: 'Deals damage, then repeats the previous spell in grimoire at 30% power.'
prestige: 2
```

**Design intent**: Rewards grimoire composition. Placing Soul Echo after a high-damage spell (Cataclysm, Inferno) creates a "free" 30% repeat. Adds strategic depth without raw power creep -- the echo deals reduced damage and uses a grimoire slot.

**Edge cases**:
- Soul Echo in slot 1 (no previous spell): deals base damage only, no echo.
- Previous spell was also Soul Echo: no echo (prevents infinite loops).
- Echo triggers class passives (e.g., generates Ember stack for Pyromancer if echoed spell is fire).

### Eternal Flame (Prestige III)

```
id: 'eternal_flame'
trigger: 'on_death'
effect: 'Revives mage with 15% max HP, once per combat. No cooldown limitation needed (triggers only once).'
prestige: 3
```

**Design intent**: One-time death prevention per fight. At 15% HP, player is still in danger -- extends fights by ~5-10s, not making them trivially easy. Safety net similar to Tidecaster's Riptide but available to all classes.

**Interaction with Riptide (Tidecaster)**: Riptide triggers at 40% HP. Eternal Flame triggers at 0% HP (death). No conflict. A Prestige III Tidecaster gets both. Powerful but earned through 3 full cycles (~60+ hours).

**Edge case**: Both player and enemy die same tick -- enemy dies first (player wins), Eternal Flame does not trigger. If enemy would survive: player revives at 15% HP, fight continues.

---

## 6. Class Decision: RESET on Rebirth

**Decision: Class resets to `null` on Rebirth.**

### Rationale

1. **Replayability**: Rebirth is the natural moment to try a new class. Locking the same class across 3 prestiges wastes the 4-class design.
2. **Balance**: Class spells scale with level. Keeping Pyromancer at level 1 stats feels dissonant -- the player has the *memory* of being powerful but the *reality* of being weak. Better to re-earn class identity.
3. **Narrative fit**: Rebirth is reincarnation. The mage's soul returns, but elemental attunement does not -- it must be re-awakened (at level 3, as before).
4. **Strategic depth**: player can plan "this Rebirth I go Tidecaster for survivability to speed through early levels" or "Pyromancer for fastest kill times."

### Class Memory System

After Rebirth, any class the player reached **level 10+** with before Rebirth is marked as **"Mastered"**.

- Stored in `state.prestige.masteredClasses[]`
- Mastered classes unlock **1 bonus grimoire slot (6 slots instead of 5)** when re-selected in a future cycle
- Maximum grimoire size: 6 (even if all 4 classes mastered -- no stacking)
- This is a soft incentive to try all 4 classes across Rebirths, without forcing it

### Edge Cases

- Player Rebirths with a class below level 10: class is not added to masteredClasses.
- Player re-selects a non-mastered class: 5 grimoire slots (standard).
- Player selects a mastered class: 6 grimoire slots immediately upon selection at level 3.
- Player has no class yet (level 1-2 after Rebirth): forced class selection modal at level 3 (same as first playthrough).

---

## 7. Rebirth Merchant

Unlocked at Prestige I. Exclusive shop tab with prestige-only consumables.

| Item | Price | Effect | Prestige Req |
|------|-------|--------|--------------|
| **Soulstone** | 150g | Next combat: +25% XP earned. Consumed after 1 fight. | I |
| **Ashen Tonic** | 200g | Heals 50% max HP instantly (out of combat). | I |
| **Veil of Ages** | 300g | Next 3 combats: enemy drops +1 rarity tier (Common->Uncommon, etc.). Cap at Legendary. | II |
| **Chronoshard** | 500g | Instantly grants XP equal to `xpForLevel(currentLevel) * 0.25`. One-time use. | III |

**Economic balance**: Expensive at early levels post-Rebirth (150-500g is significant when earning 4-8g/fight). Affordable luxuries at level 30+. Cannot break economy because gold resets each Rebirth and multipliers do not apply to purchase prices.

---

## 8. XP and Gold Economy Impact

### Modified Income, Not Requirements

Base XP formula unchanged: `xpForLevel(level) = floor(110 * level^1.5)`

Prestige modifies the **income** side only:

```
effectiveXP   = floor(baseXP * PRESTIGE_CONFIG[tier].xpMult)
effectiveGold = floor(baseGold * PRESTIGE_CONFIG[tier].goldMult)
```

### XP Curve Comparison (Fights to Level, Skeleton Warrior 12 XP base)

| Transition | Base (12 XP) | P-I (14 XP) | P-II (16 XP) | P-III (18 XP) |
|------------|-------------|-------------|--------------|---------------|
| 2->3 | 14 fights | 12 | 11 | 10 |
| 5->6 | 21 fights | 18 | 16 | 14 |
| 10->11 | 36 fights | 31 | 27 | 24 |
| 25->26 | 58 fights | 50 | 43 | 39 |
| 49->50 | 56 fights (Hollow, 230 XP) | 49 (265 XP) | 42 (311 XP) | 37 (345 XP) |

### Gold Multiplier Applies To

- Combat gold rewards (enemy drops)
- Level-up gold bonus (`5 * level * goldMult`)
- Item sell value (`sellPrice * goldMult`)

### Gold Multiplier Does NOT Apply To

- Shop purchase prices (prevents infinite arbitrage)
- Respec costs (preserves decision weight)

### Anti-Exploit Analysis

| Risk | Outcome |
|------|---------|
| Hoard gold before Rebirth | Gold fully reset. No exploit. |
| Buy consumables, Rebirth, sell | Inventory wiped on Rebirth. No exploit. |
| P-III farming low-level enemies | 1-2g base * 1.40 = 2-3g. Not worth farming vs level-appropriate enemies. |
| Speedrun Rebirth at level 10 to stack tiers fast | Intentionally allowed. Player still needs to replay 15-20h per cycle even with bonuses. |

---

## 9. PvP Interaction

On Rebirth, PvP rating undergoes a **hard soft reset**:

```
newRating = max(800, currentRating - 400)
```

Harsher than seasonal reset (-300, floor 1000) because Rebirth strips gear and level.

- PvP locked until level 15 (same as base game). After Rebirth, must re-reach level 15.
- Diamond player (1900+) Rebirths -> 1500 (Gold tier). At level 15, they fight Gold opponents with Prestige stat bonuses but no gear/high spells. Balances out.

---

## 10. Data Model (`state.js` Changes)

### New Fields in `getDefaultState()`

```javascript
prestige: {
  tier: 0,                    // 0 = no prestige, 1/2/3
  totalRebirths: 0,           // lifetime counter (stats display)
  masteredClasses: [],        // ['pyromancer', ...] classes at lv10+ before Rebirth
  enemiesDefeated: [],        // ['training_dummy', ...] unique enemy IDs ever beaten
  lifetimeXP: 0,              // cumulative XP across all cycles (cosmetic)
  lifetimeGold: 0,            // cumulative gold earned (cosmetic)
  lifetimeKills: 0            // cumulative kills (cosmetic)
}
```

### Prestige Constants

```javascript
const PRESTIGE_CONFIG = {
  0: { xpMult: 1.00, goldMult: 1.00, bonusSTR: 0,  bonusINT: 0,  bonusHP: 0,   unlocks: [] },
  1: { xpMult: 1.15, goldMult: 1.10, bonusSTR: 5,  bonusINT: 5,  bonusHP: 0,   unlocks: ['rebirth_merchant'] },
  2: { xpMult: 1.35, goldMult: 1.25, bonusSTR: 12, bonusINT: 12, bonusHP: 50,  unlocks: ['rebirth_merchant', 'soul_echo'] },
  3: { xpMult: 1.50, goldMult: 1.40, bonusSTR: 20, bonusINT: 20, bonusHP: 100, unlocks: ['rebirth_merchant', 'soul_echo', 'eternal_flame', 'title_the_reborn'] }
};
```

### Updated Stat Formulas (with Prestige)

```
Strength     = 5 + P.bonusSTR + (level-1)*2 + AP.strength*3 + floor(BP*0.4)
Intelligence = 5 + P.bonusINT + (level-1)*3 + AP.intelligence*4 + BP
Max HP       = 100 + P.bonusHP + (level-1)*15 + floor(BP*0.5) + AP.strength*5
```

Where `P = PRESTIGE_CONFIG[state.prestige.tier]`.

### Updated XP/Gold Award

```javascript
// In addXP():
const effectiveXP = Math.floor(amount * (PRESTIGE_CONFIG[state.prestige.tier]?.xpMult || 1));

// In combat gold reward:
const effectiveGold = Math.floor(goldRoll * (PRESTIGE_CONFIG[state.prestige.tier]?.goldMult || 1));
```

---

## 11. Rebirth Execution Function

```javascript
export function performRebirth() {
  const state = getState();

  // Validate
  const canRebirth =
    (state.level >= 10 || (state.prestige.enemiesDefeated || []).length >= 7)
    && (state.prestige.tier || 0) < 3;
  if (!canRebirth) return false;

  // Record lifetime stats
  state.prestige.lifetimeXP += getTotalXPEarned(state);
  state.prestige.lifetimeGold += state.gold; // approximate
  state.prestige.lifetimeKills += state.combat?.totalKills || 0;

  // Record mastered class
  if (state.classType && state.level >= 10) {
    if (!state.prestige.masteredClasses.includes(state.classType)) {
      state.prestige.masteredClasses.push(state.classType);
    }
  }

  // Advance prestige
  state.prestige.tier++;
  state.prestige.totalRebirths++;

  // Reset progression
  state.level = 1;
  state.xp = 0;
  state.gold = 0;
  state.classType = null;            // class resets
  state.attributePoints = 0;
  state.attributes = { strength: 0, intelligence: 0 };
  state.equipment = {
    staff: 'starter_staff',
    hat: 'starter_hat',
    cloak: 'starter_cloak'
  };
  state.inventory = {
    mana_elixir: 0,
    crystal_shard: 0,
    iron_flask: 0,
    shadow_dust: 0
  };
  state.grimoire = [null, null, null, null, null];
  state.buffs = {
    mana_surge:       { active: false, combatsLeft: 0 },
    crystal_fortune:  { active: false, combatsLeft: 0 },
    iron_flask_buff:  { active: false, combatsLeft: 0 },
    shadow_dust_buff: { active: false, combatsLeft: 0 }
  };
  state.combat = {
    fightsToday: 0,
    lastFightDate: '',
    consecutiveWins: 0
  };
  state.battleState = {
    emberStacks: 0,
    staticChargeCount: 0,
    riptideUsed: false,
    bedrockActive: false,
    shieldHP: 0
  };
  state.prestigeXP = 0;
  state.prestigeStars = 0;

  // PvP soft reset
  if (state.pvp) {
    state.pvp.rating = Math.max(800, (state.pvp.rating || 1000) - 400);
    state.pvp.peakRating = state.pvp.rating;
  }

  saveState();
  return true;
}
```

---

## 12. Narrative Framing (Lore Writer Handoff)

**Core concept**: The mage's soul is bound to the Veyra -- the dark entity that is both the world and the final boss. Each Rebirth is literal death and reincarnation. The Veyra feeds on the mage's accumulated power (consuming spells, items, knowledge), but each time the soul returns *harder*, carrying echoes of past lives as prestige bonuses.

**Tier narrative hooks**:
- **Prestige I -- "First Death"**: The mage dies and wakes at the beginning. Fragments of memory remain. The world is the same, but they are not.
- **Prestige II -- "The Echo"**: Two deaths. The soul carries resonance -- Soul Echo is literally the ghost of a past life's magic bleeding through.
- **Prestige III -- "The Reborn"**: Three deaths. The soul has transcended the Veyra's cycle. Eternal Flame is the soul refusing extinction. The title "The Reborn" marks a mage who has broken free of death.

**Class reset narrative**: Elemental attunement (class) is not soul-deep -- it is learned through communion with the elements. Each new life requires re-awakening this bond. But the soul *remembers* mastered classes, making the re-awakening deeper (6th grimoire slot).

**Rebirth UI moment**: Confirmation screen should show the mage's avatar disintegrating into embers, then reforming as a level 1 mage with the prestige skull icon. This is a *ceremony*, not just a button press.

> Full narrative text, dialogue, NPC design outside Game Designer scope. Above provides the mechanical-narrative bridge.

---

## 13. Flow Diagram

```
[Player in Character Screen]
    |
    v
[Rebirth Button visible?]
    |
    +--> state.level >= 10 OR prestige.enemiesDefeated.length >= 7
    |    AND prestige.tier < 3
    |
    +--> [Yes] --> [Show "Rebirth {next tier}" Button]
    |                |
    |           [Player clicks]
    |                |
    |           [Confirmation Modal]
    |             "You will lose: Level, Gold, Items, Spells, Class"
    |             "You will gain: [tier-specific bonuses]"
    |             "This cannot be undone."
    |                |
    |           [Confirm] --> performRebirth()
    |                |            |
    |                |       [Cinematic: disintegrate -> reform]
    |                |            |
    |                |       [Main screen, Level 1]
    |                |       [Flash: "Prestige {tier} Achieved"]
    |                |       [Bonuses active immediately]
    |                |
    |           [Cancel] --> [Return]
    |
    +--> [No] --> [Button hidden or grayed out]
```

---

## 14. Full Progression Timeline

```
[Run 1: No Prestige, ~22-30 hours]
    |
    v
[Level 10 reached OR all 7 enemies defeated]
    |
    v
[REBIRTH I] --> Bronze skull, x1.15 XP, x1.10 Gold, +5 STR/INT, Merchant
    |
    v
[Run 2: Prestige I, ~19-26 hours]
    |
    v
[Level 10 OR 7 enemies (cumulative)]
    |
    v
[REBIRTH II] --> Silver skull, x1.35 XP, x1.25 Gold, +12 STR/INT, +50 HP, Soul Echo
    |
    v
[Run 3: Prestige II, ~16-22 hours]
    |
    v
[Level 10 OR 7 enemies]
    |
    v
[REBIRTH III] --> Gold skull, x1.50 XP, x1.40 Gold, +20 STR/INT, +100 HP, Eternal Flame, Title
    |
    v
[Run 4: Prestige III (FINAL), ~15-20 hours]
    |
    v
[Endgame: Level 50, P-III, all bonuses, PvP, Prestige Stars, grimoire optimization]

Total: ~60-80 hours across all runs
```

---

## 15. Edge Cases

| Scenario | Handling |
|----------|----------|
| Player at Prestige III tries Rebirth | Button grayed out. Tooltip: "You have transcended the cycle." |
| Rebirth with unspent attribute points | Points lost. Warning in confirmation modal. |
| Rebirth mid-combat | Impossible. Button only on character screen, inaccessible during combat. |
| Soul Echo in grimoire after Rebirth III | Soul Echo stays available (P-II unlock persists at P-III). Grimoire resets but spell re-equippable at level 1. |
| Player rebirths at level 10 with 0 gold | Valid. They lose nothing meaningful. Bonuses make next cycle faster. |
| enemiesDefeated cumulative allows instant re-Rebirth | Intentional. Experienced players can speedrun: defeat all 7 in cycle 1, then Rebirth at level 1 in cycles 2-3 (using cumulative enemy log). Still must replay full 15-20h per cycle for the actual progression. |
| Class was null + prestige II+ | At level 3, force class selection modal before combat (same as base game). |
| Mastered class data after Rebirth | Persists permanently in `prestige.masteredClasses[]`. Player re-selecting a mastered class gets 6 grimoire slots. |
| localStorage migration | See section 16. |

---

## 16. Migration Plan

```javascript
// In loadState(), after merge:
if (!state.prestige) {
  state.prestige = {
    tier: 0,
    totalRebirths: 0,
    masteredClasses: [],
    enemiesDefeated: [],
    lifetimeXP: 0,
    lifetimeGold: 0,
    lifetimeKills: 0
  };
}
if (!Array.isArray(state.prestige.enemiesDefeated)) {
  state.prestige.enemiesDefeated = [];
}
if (!Array.isArray(state.prestige.masteredClasses)) {
  state.prestige.masteredClasses = [];
}
```

Existing players keep all progress. Rebirth is purely opt-in.

---

## 17. Dependencies

| System | Interaction | Notes |
|--------|-------------|-------|
| **Stat formulas** (state.js) | P bonuses modify base STR/INT/HP | Update `getStats()`, `calcMageMaxHP()` |
| **XP system** (state.js) | P xpMult applied in `addXP()` | Applied before level-up check |
| **Gold system** (combat.js) | P goldMult applied on combat reward | Applied to enemy gold drop roll |
| **Class system** (mage-classes.md) | Class resets on Rebirth. Mastered classes tracked. | masteredClasses -> 6th grimoire slot |
| **Grimoire** | Resets to 5 null slots. 6th if mastered class re-selected. | Grimoire size check needed |
| **Item system** | Full inventory wipe on Rebirth | Starter gear re-equipped |
| **PvP** (future) | Rating soft reset (-400, floor 800). PvP locked until lv15. | Section 9 |
| **Merchant** (shop.js) | New Rebirth Merchant tab | Visible at P-I+ |
| **Combat** (combat.js) | Eternal Flame on-death check (P-III) | New hook in combat death handler |
| **Combat** (combat.js) | Track enemy defeats | Push to `prestige.enemiesDefeated` on win |
| **Spells** (SPELLS_DATA) | Soul Echo (P-II), `prestige` field for gating | `getUnlockedSpells()` checks prestige |

---

## 18. Coder Handoff Summary

### Priority order:

1. Add `prestige` object to `getDefaultState()` + migration in `loadState()`
2. Track enemy defeats: on combat win, push enemy ID to `state.prestige.enemiesDefeated` (if not already present)
3. Update `getStats()` and `calcMageMaxHP()` to include prestige stat bonuses
4. Apply XP/gold multipliers in `addXP()` and combat reward calculation
5. Implement `performRebirth()` function
6. Implement `canRebirth()` check
7. Add Soul Echo spell to `SPELLS_DATA` with `prestige: 2` gate
8. Add Eternal Flame passive in combat death handler
9. Add mastered class tracking + 6th grimoire slot logic
10. Add Rebirth Merchant items to shop data

### UI/UX Handoff:

- Rebirth button in character/inventory screen (visible when unlocked)
- Confirmation modal: loss/gain summary, deliberate confirm (hold button or type)
- Prestige skull icon next to player name (bronze/silver/gold by tier)
- Rebirth cinematic: ember disintegration -> reformation
- Rebirth Merchant tab in shop
- "The Reborn" title display (Prestige III)
- 6th grimoire slot visual when playing mastered class

---

*Document created: 2026-03-30 (v1)*
*Revised: 2026-03-30 (v2 -- class reset decision, either/or unlock, mastered classes, Rebirth Merchant, Eternal Flame)*
*Next steps: PM review -> Coder implements sections 10-11 + 18. Lore Writer develops narrative from section 12. UI/UX designs Rebirth modal and prestige icons.*
