# Veyra — The Spire of Colwick (Mage Tower) GDD

> **Author**: PM Orchestrator (tech-architect + game-design-narrator)
> **Date**: 2026-04-10
> **Status**: DRAFT v1 — pending user review
> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Depends on**: progression-system.md, mage-classes.md, combat-class-mechanics.md

---

## 1. Design Philosophy

The Spire of Colwick is a **10-floor gauntlet** — a single continuous run where the player fights progressively harder enemies floor by floor, without healing between floors (except via spell effects). It is the game's first endgame content.

### Core Fantasy
The tower is an ancient structure left by the mages who founded Colwick. Each floor is a trial — the deeper you go, the more the tower tests your mastery. Reaching floor 10 is a statement: you have mastered your class.

### Design Goals
- **Skill check, not gear check**: optimal spell rotation and grimoire composition matter more than raw stats
- **Replayable**: tower resets daily, rewards scale with highest floor reached
- **Class-agnostic fairness**: each class should have a viable path to floor 10, though strategies differ
- **Not grindable in one session**: floor 10 should require level 30+ with good gear and optimized build

---

## 2. Architecture

### Data Structure (state.js)

```js
// In getDefaultState():
tower: {
  highestFloor: 0,           // best floor ever reached
  currentRun: null,          // { floor: 1, mageHP: ..., mageShield: 0, buffsActive: [...] } or null
  dailyAttempts: 0,          // attempts today
  lastAttemptDate: null,     // ISO date string for daily reset
  totalClears: 0,            // total floor-10 completions (lifetime)
  rewards: {                 // unclaimed rewards from last run
    gold: 0,
    xp: 0,
    items: []
  }
}
```

### Screen Flow

```
[Map] → [Tower Entrance Screen] → [Floor Preview] → [Combat] → [Floor Result]
                                                                    ↓
                                                              [Next Floor] or [Exit Tower]
                                                                    ↓
                                                              [Run Summary] (on exit/death)
```

### New Screen: `screen-tower`

A dedicated screen showing:
- Tower visualization (10 floors stacked, current floor highlighted)
- Current run status (HP carried over, floor number)
- "Enter the Spire" button (starts run from floor 1)
- Best record display
- Daily attempts counter (3 per day)

### Module: `tower.js`

New JS module managing tower logic:
- `initTower()` — renders tower entrance screen
- `startTowerRun()` — begins a new run, sets currentRun in state
- `startTowerFloor(floor)` — sets up combat for specific floor
- `onTowerFloorWon(floor, remainingHP, remainingShield)` — handles floor completion
- `onTowerFloorLost(floor)` — handles death, shows run summary
- `exitTower()` — voluntary exit, collect rewards for floors cleared
- `getTowerEnemy(floor)` — returns enemy data for specific floor
- `getTowerRewards(highestFloor)` — calculates rewards

---

## 3. Floor Design & Enemy Scaling

### Scaling Philosophy

Floors 1-3: warm-up (slightly harder than open-world enemies).
Floors 4-6: mid-tier (requires class synergy).
Floors 7-9: hard (requires optimized grimoire + consumable buffs).
Floor 10: boss (requires near-perfect play, level 30+ recommended).

### Floor Table

| Floor | Enemy Name | HP | ATK | ATK Interval | Element | Resistances | Special Mechanic |
|-------|-----------|-----|-----|-------------|---------|-------------|-----------------|
| 1 | Spire Sentinel | 350 | 10 | 2.5s | earth | fire:1.3, shadow:0.8 | None — standard fight |
| 2 | Ember Wraith | 300 | 16 | 1.8s | fire | water:1.3, fire:0.5 | Burns mage: 5 dmg/2s passive DoT |
| 3 | Storm Gargoyle | 450 | 14 | 2.2s | air | earth:1.3, air:0.5 | 20% chance to dodge spells |
| 4 | Frost Warden | 500 | 12 | 2.8s | water | fire:1.5, water:0.3 | Slows mage cast speed by 15% |
| 5 | Bone Colossus | 650 | 18 | 2.0s | earth | fire:1.2, shadow:0.7, earth:0.5 | 30% damage reduction when HP > 50% |
| 6 | Phantom Duelist | 400 | 24 | 1.4s | air | arcane:1.3, air:0.6 | Counterattack: reflects 15% damage taken |
| 7 | Abyssal Tide | 700 | 20 | 1.8s | water | earth:1.3, water:0.4 | Heals 3% max HP every 5s |
| 8 | Infernal Knight | 800 | 22 | 1.6s | fire | water:1.5, fire:0.3 | Enrages at 30% HP: ATK x1.5, interval x0.7 |
| 9 | Void Sentinel | 900 | 25 | 1.5s | null | all:0.85 (15% resist to everything) | Dispels mage shield every 10s |
| 10 | Archon of Colwick | 1200 | 28 | 1.3s | null | all:0.9, weakest_to_player_element:1.2 | Phase 2 at 50% HP: summons 2 adds (200HP each) |

### Key Balance Notes

- **HP carryover**: mage enters each floor with HP remaining from previous. No free heals.
- **Tidecaster advantage**: Healing Rain and Drain Life allow HP recovery between floors. Intentional — Tidecaster's class fantasy is endurance.
- **Geomancer advantage**: shields carry over. Stone Skin + Fortify mean entering floors with effective HP above max.
- **Pyromancer strategy**: burst floors fast to minimize damage taken. Ember stacks from passive help clear quickly.
- **Stormcaller strategy**: Zephyr dodge + Tailwind haste for speed-clear. Cyclone slow reduces incoming damage.

---

## 4. Balance Validation

### Can a Level 30 player reach Floor 10?

**Assumptions at Level 30**:
- Intelligence: 5 + 29*3 + ~20*4 = 172 (20 INT attribute points)
- INT multiplier: 1 + (172-5)/100 = 2.67
- Max HP: 100 + 29*15 + ~9*5 = 580 HP (9 STR points)
- Equipment bonus: ~+40 total (uncommon/rare gear)
- Total INT with gear: ~212, multiplier: ~3.07

**DPS estimate (Pyromancer, optimized grimoire)**:
- Fireball (30-50 avg 40) * 3.07 = 123 dmg / 2.2s
- Ignite (10-15 avg 12.5 + 24 DoT) * 3.07 = ~112 effective / 1.5s
- Scorch (10-15 avg 12.5 * 1.5 conditional) * 3.07 = ~58 / 1.0s
- Focus (0 dmg, enables x2 on next)
- Inferno (50-75 avg 62.5) * 3.07 = 192 / 3.5s

Average cycle DPS: ~55-65 DPS

**Time to clear floors 1-10 total**: ~180-220 seconds of combat
**Total damage taken estimate**: ~800-1100 (depends on slow/shield usage)
**Starting HP**: 580

**Verdict**: Floor 10 is very tight at level 30. Player needs:
- Good equipment (rare+ in at least 2 slots)
- Optimized grimoire for their class
- At least 1 consumable (Iron Flask for +40 HP or Mana Elixir for burst)
- Minimal wasted casts

A level 35-40 player should be able to reliably clear. Level 25 is possible but extremely challenging.

### Difficulty Tuning Levers

If floor 10 is too hard/easy, adjust:
1. `Archon HP` (1200 is the primary knob)
2. `enrage threshold` on floor 8 (30% -> 40% makes it harder)
3. `heal percent` on floor 7 (3% -> 5% makes it much harder)
4. `daily attempts` (3 per day prevents brute-force)

---

## 5. Reward System

### Per-Floor Rewards (accumulated, claimed on exit)

| Floor | Gold | XP | Special |
|-------|------|----|---------|
| 1 | 8 | 15 | — |
| 2 | 12 | 20 | — |
| 3 | 15 | 25 | — |
| 4 | 20 | 35 | — |
| 5 | 25 | 45 | Random common/uncommon drop |
| 6 | 30 | 55 | — |
| 7 | 40 | 70 | Random uncommon/rare drop |
| 8 | 50 | 85 | — |
| 9 | 60 | 100 | — |
| 10 | 100 | 150 | **Guaranteed rare+ drop** + Tower Champion title |

**Total for full clear**: 360 gold, 600 XP, 2-3 item drops

### First Clear Bonus (one-time)
- 500 bonus gold
- Unique legendary item: **Staff of the Archon** (bonus: 45, rarity: legendary)
- Achievement: "Spire Conqueror"

### Daily Reset
- 3 attempts per day (resets at midnight UTC)
- Best floor record persists forever
- Rewards only for floors cleared beyond previous best in that day's run (prevents farming floor 1 endlessly)

---

## 6. UI Specification

### Tower Entrance Screen
- Dark stone background with tower silhouette
- 10 floor indicators (circles/blocks stacked vertically)
  - Cleared: gold glow
  - Current highest: pulsing
  - Locked: dim
- "Enter the Spire" button (disabled if 0 attempts remaining)
- "Attempts: 2/3" counter
- "Best: Floor 7" record display

### Floor Transition (between combats)
- Brief screen showing:
  - "Floor X Cleared" with gold text
  - HP remaining bar
  - "Continue" and "Exit Tower" buttons
  - Preview of next floor enemy (name + element icon)

### Run Summary (after death or exit)
- Floors cleared this run
- Total rewards earned
- Comparison to best record
- "Claim Rewards" button

---

## 7. Implementation Priority

### Phase 1 (MVP)
1. Tower data structure in state.js
2. tower.js module with floor progression logic
3. Basic tower screen (enter, fight, next floor, exit)
4. 10 tower enemies in ENEMIES_DATA (or separate TOWER_ENEMIES)
5. HP carryover between floors
6. Reward accumulation and claiming

### Phase 2 (Polish)
1. Tower entrance screen with visual floor indicator
2. Floor transition animations
3. Daily attempt limit + reset logic
4. First-clear bonus rewards
5. Tower-specific consumables (sold at Morthis Dray)

### Phase 3 (Future)
1. Tower leaderboard (local, tracks best times)
2. Hard mode (modifiers: +30% enemy HP, -20% mage HP)
3. Seasonal tower rotations (different enemy sets each week)

---

## 8. Technical Notes

### Separation from regular combat
Tower combat uses the same `combat.js` engine but with modified parameters:
- `isTowerCombat: true` flag in combat context
- No flee option during tower combat
- HP/shield state preserved between floors via `tower.currentRun`
- Tower enemies stored separately or flagged in ENEMIES_DATA

### State persistence
- `tower.currentRun` saved to localStorage after each floor
- If player closes browser mid-run, they can resume from current floor
- Run abandoned if daily reset occurs while mid-run

### Daily reset check
```js
function checkTowerDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  const state = getState();
  if (state.tower.lastAttemptDate !== today) {
    state.tower.dailyAttempts = 0;
    state.tower.lastAttemptDate = today;
    state.tower.currentRun = null;
    saveState();
  }
}
```
