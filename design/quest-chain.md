# Veyra — Quest Chain: First 30 Minutes (Level 1-3 Awakening)

> **Platform**: PC browser (HTML5/CSS/Vanilla JS, localStorage)
> **Scope**: 7 sequential quests, new player onboarding, from first login to class selection (Awakening)
> **Target duration**: 15-20 minutes to complete all 7 quests and reach level 3
> **Date**: 2026-03-30 (v2 — replaces previous parallel quest design)

---

## 1. Design Intent

The quest chain is a **sequential tutorial** that teaches one mechanic per step. Each quest gates the next via a `prerequisite` field. This creates a guided path through every core system before the player makes their first major decision (class selection at level 3).

**Why sequential, not parallel**: new players need structure. A parallel quest list creates choice paralysis ("which one do I do first?"). A linear chain says "do this next" and removes friction. Post-Awakening quests can be parallel/daily — but the onboarding must be a rail.

**Player behavior goal**: by Quest 7, the player has used combat, grimoire, inventory, and experienced leveling. They are ready for an informed class choice.

---

## 2. XP Budget Analysis

From progression-system.md:
- Level 1->2: 110 XP needed
- Level 2->3: 168 XP needed
- Total to level 3: 278 XP

Sources during quest chain:

| Source | XP | Count | Total |
|--------|-----|-------|-------|
| Quest rewards | varies | 7 quests | 135 XP |
| Training Dummy kills | 5 XP | ~8-10 | 40-50 XP |
| Skeleton Warrior kills | 12 XP | ~8-10 | 96-120 XP |

**Total estimated**: 271-305 XP in ~15-20 min. Hits level 3 reliably.

Gold from quests: 45 gold. Combined with combat gold (~30-50 from fights), player has ~75-95 gold at Awakening — enough for 1 consumable but not enough to buy everything. Creates first meaningful economic choice.

---

## 3. Quest Chain

### Quest 1: First Blood

| Field | Value |
|-------|-------|
| **ID** | `first_blood` |
| **Name** | First Blood |
| **Mechanic taught** | Basic combat (enter battle, win) |
| **Condition** | Win 1 combat against any enemy |
| **Event trigger** | `battleWon` |
| **Condition check** | Quest-local counter >= 1 |
| **Reward** | 10 XP, 5 gold |
| **Flavor text** | *"The straw dummy fell apart under your spell. A humble start — but even the Void began as a crack in nothing."* |
| **Auto-hint** | Appears immediately on first login. Points to Training Dummy on map. |

**Design note**: Training Dummy has 0 ATK, so this is unloseable. Teaches: click enemy -> enter combat -> watch grimoire autocast -> see victory screen.

---

### Quest 2: Know Thy Weapon

| Field | Value |
|-------|-------|
| **ID** | `know_thy_weapon` |
| **Name** | Know Thy Weapon |
| **Mechanic taught** | Grimoire management (equip spells to slots) |
| **Condition** | Have at least 1 spell placed in a grimoire slot |
| **Event trigger** | `grimoireChanged` |
| **Condition check** | `state.grimoire.filter(s => s !== null).length >= 1` |
| **Reward** | 15 XP, 5 gold |
| **Flavor text** | *"You bound a spell to your grimoire. The pages drank the ink eagerly, as if starving."* |
| **Prerequisite** | `first_blood` |

**Design note**: Player starts with Arcane Bolt and Focus unlocked (level 1 spells). They must place at least one into a grimoire slot. This is the first non-combat interaction.

**Edge case**: If the player entered combat for Quest 1 with an empty grimoire, combat.js may auto-fill Arcane Bolt. If auto-fill already set a slot, the quest should NOT auto-complete from that — only from the player manually visiting the grimoire screen and confirming a spell placement. This distinction requires a `source` flag on the event: `{ filledSlots: 1, source: 'manual' | 'auto' }`.

---

### Quest 3: The Weight of Bone

| Field | Value |
|-------|-------|
| **ID** | `the_weight_of_bone` |
| **Name** | The Weight of Bone |
| **Mechanic taught** | Enemy selection (fighting a real enemy that attacks back) |
| **Condition** | Defeat Skeleton Warrior 1 time |
| **Event trigger** | `battleWon` with `enemyId === 'skeleton_warrior'` |
| **Condition check** | Quest-local counter >= 1 |
| **Reward** | 20 XP, 10 gold |
| **Flavor text** | *"It clawed at you even as it crumbled. The dead do not surrender — remember that."* |
| **Prerequisite** | `know_thy_weapon` |

**Design note**: First fight where player takes damage. Skeleton Warrior: 300 HP, 12 ATK, 2.5s interval = 4.8 DPS. At level 1 (HP 100, INT 5), player has ~21 seconds before dying. Arcane Bolt deals ~33 avg per cast (1.8s) = ~18.3 DPS. Time to kill: ~16.4 sec. Player takes ~79 damage. Survivable but tight — creates tension.

Player should reach level 2 around this quest from accumulated XP: Q1 (10) + Q2 (15) + ~8 Dummy kills (40) + 20 = 85 XP from quests + 40 combat = ~125 XP. Level 2 at 110 XP — reached during or just after Q3.

---

### Quest 4: Dressed to Kill

| Field | Value |
|-------|-------|
| **ID** | `dressed_to_kill` |
| **Name** | Dressed to Kill |
| **Mechanic taught** | Equipment system (equip gear from inventory) |
| **Condition** | Equip any non-starter item in any equipment slot |
| **Event trigger** | `itemEquipped` |
| **Condition check** | Any equipment slot contains a non-starter item ID |
| **Reward** | 20 XP, 10 gold |
| **Flavor text** | *"Better cloth, sharper focus. You are no longer dressed like a beggar — merely like a poor man."* |
| **Prerequisite** | `the_weight_of_bone` |

**Design note**: Currently `getDefaultState()` starts the player with all items (testing mode). When economy goes live and inventory starts empty, Quest 3's Skeleton Warrior kill must guarantee a Common item drop if player has no non-starter items. This prevents a softlock.

**Coder flag**: Add a `guaranteedDropIfInventoryEmpty` check to the Skeleton Warrior kill path.

---

### Quest 5: A Fuller Grimoire

| Field | Value |
|-------|-------|
| **ID** | `a_fuller_grimoire` |
| **Name** | A Fuller Grimoire |
| **Mechanic taught** | Multi-spell grimoire optimization (fill 3+ slots) |
| **Condition** | Have 3 or more spells equipped in grimoire |
| **Event trigger** | `grimoireChanged` |
| **Condition check** | `state.grimoire.filter(s => s !== null).length >= 3` |
| **Reward** | 20 XP, 5 gold |
| **Flavor text** | *"Three spells hum in concert. The grimoire throbs with hunger for more."* |
| **Prerequisite** | `dressed_to_kill` |

**Design note**: By level 2 the player has access to: Arcane Bolt (lv1), Focus (lv1), Shadow Bolt (lv2). Exactly 3 spells — the minimum to complete this quest. This forces the player to return to the grimoire and experiment with their loadout before harder fights.

---

### Quest 6: Trial of Shadows

| Field | Value |
|-------|-------|
| **ID** | `trial_of_shadows` |
| **Name** | Trial of Shadows |
| **Mechanic taught** | Farming / core loop (repeating fights for progression) |
| **Condition** | Win 5 combats after quest activation (any enemy) |
| **Event trigger** | `battleWon` |
| **Condition check** | Quest-local counter >= 5 (counts only wins AFTER quest becomes active) |
| **Reward** | 25 XP, 5 gold |
| **Flavor text** | *"Five victories. Five echoes in the dark. The Veil noticed you today."* |
| **Prerequisite** | `a_fuller_grimoire` |

**Design note**: This is the "grind" quest. Player should be around 200-230 XP at this point. 5 wins (mix of Dummy and Skeleton) provide ~35-60 combat XP + 25 quest XP, pushing very close to level 3 (278 cumulative). Teaches: repeating fights is the core loop, progression happens through repetition.

**XP checkpoint**: After Q6 completion, estimated total XP = Q1-Q6 rewards (110 XP) + combat XP from ~15-20 fights (~120-160 XP) = ~230-270 XP. Player is at or near level 3.

---

### Quest 7: The Awakening

| Field | Value |
|-------|-------|
| **ID** | `the_awakening` |
| **Name** | The Awakening |
| **Mechanic taught** | Class selection milestone |
| **Condition** | Reach level 3 |
| **Event trigger** | `levelUp` |
| **Condition check** | `state.level >= 3` |
| **Reward** | 25 XP, 5 gold (banked toward level 4) |
| **Flavor text** | *"Power stirs in your blood. Four paths open before you: flame, storm, tide, and stone. Choose — and the grimoire will rewrite itself."* |
| **Prerequisite** | `trial_of_shadows` |

**Design note**: Completes the onboarding. The 25 XP reward is banked toward level 4 (228 XP needed), giving a head start. Class selection UI should appear immediately after quest completion notification is dismissed.

**Edge case**: If player reached level 3 during Quest 6 (from combat XP before Q6 was completed), Quest 7 auto-completes on activation because condition is already met. This is correct behavior — the chain resolves instantly.

---

## 4. Summary Table

| # | ID | Name | Trigger Event | Reward XP | Reward Gold | Cumulative Quest XP | Mechanic |
|---|-----|------|---------------|-----------|-------------|---------------------|----------|
| 1 | `first_blood` | First Blood | `battleWon` | 10 | 5 | 10 | Combat basics |
| 2 | `know_thy_weapon` | Know Thy Weapon | `grimoireChanged` | 15 | 5 | 25 | Grimoire slots |
| 3 | `the_weight_of_bone` | The Weight of Bone | `battleWon` (skeleton) | 20 | 10 | 45 | Enemy selection |
| 4 | `dressed_to_kill` | Dressed to Kill | `itemEquipped` | 20 | 10 | 65 | Equipment |
| 5 | `a_fuller_grimoire` | A Fuller Grimoire | `grimoireChanged` | 20 | 5 | 85 | Spell loadout |
| 6 | `trial_of_shadows` | Trial of Shadows | `battleWon` (x5) | 25 | 5 | 110 | Core loop |
| 7 | `the_awakening` | The Awakening | `levelUp` (lv3) | 25 | 5 | 135 | Class selection |

**Total quest rewards**: 135 XP, 45 gold.

---

## 5. Data Structure: `QUESTS_DATA`

```javascript
// Add to state.js alongside ENEMIES_DATA and SPELLS_DATA

export const QUESTS_DATA = {
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Win your first combat.',
    flavorText: 'The straw dummy fell apart under your spell. A humble start — but even the Void began as a crack in nothing.',
    triggerEvent: 'battleWon',
    condition: { type: 'winsTotal', count: 1 },
    reward: { xp: 10, gold: 5, item: null },
    prerequisite: null,
    order: 1
  },
  know_thy_weapon: {
    id: 'know_thy_weapon',
    name: 'Know Thy Weapon',
    description: 'Place a spell into your grimoire.',
    flavorText: 'You bound a spell to your grimoire. The pages drank the ink eagerly, as if starving.',
    triggerEvent: 'grimoireChanged',
    condition: { type: 'grimoireSlotsFilled', count: 1 },
    reward: { xp: 15, gold: 5, item: null },
    prerequisite: 'first_blood',
    order: 2
  },
  the_weight_of_bone: {
    id: 'the_weight_of_bone',
    name: 'The Weight of Bone',
    description: 'Defeat a Skeleton Warrior.',
    flavorText: 'It clawed at you even as it crumbled. The dead do not surrender — remember that.',
    triggerEvent: 'battleWon',
    condition: { type: 'defeatEnemy', enemyId: 'skeleton_warrior', count: 1 },
    reward: { xp: 20, gold: 10, item: null },
    prerequisite: 'know_thy_weapon',
    order: 3
  },
  dressed_to_kill: {
    id: 'dressed_to_kill',
    name: 'Dressed to Kill',
    description: 'Equip a non-starter item.',
    flavorText: 'Better cloth, sharper focus. You are no longer dressed like a beggar — merely like a poor man.',
    triggerEvent: 'itemEquipped',
    condition: { type: 'equipNonStarter', count: 1 },
    reward: { xp: 20, gold: 10, item: null },
    prerequisite: 'the_weight_of_bone',
    order: 4
  },
  a_fuller_grimoire: {
    id: 'a_fuller_grimoire',
    name: 'A Fuller Grimoire',
    description: 'Fill 3 grimoire slots with spells.',
    flavorText: 'Three spells hum in concert. The grimoire throbs with hunger for more.',
    triggerEvent: 'grimoireChanged',
    condition: { type: 'grimoireSlotsFilled', count: 3 },
    reward: { xp: 20, gold: 5, item: null },
    prerequisite: 'dressed_to_kill',
    order: 5
  },
  trial_of_shadows: {
    id: 'trial_of_shadows',
    name: 'Trial of Shadows',
    description: 'Win 5 combats.',
    flavorText: 'Five victories. Five echoes in the dark. The Veil noticed you today.',
    triggerEvent: 'battleWon',
    condition: { type: 'winsAfterActivation', count: 5 },
    reward: { xp: 25, gold: 5, item: null },
    prerequisite: 'a_fuller_grimoire',
    order: 6
  },
  the_awakening: {
    id: 'the_awakening',
    name: 'The Awakening',
    description: 'Reach level 3.',
    flavorText: 'Power stirs in your blood. Four paths open before you: flame, storm, tide, and stone. Choose — and the grimoire will rewrite itself.',
    triggerEvent: 'levelUp',
    condition: { type: 'reachLevel', level: 3 },
    reward: { xp: 25, gold: 5, item: null },
    prerequisite: 'trial_of_shadows',
    order: 7
  }
};
```

---

## 6. State: Quest Tracking

Add to `getDefaultState()`:

```javascript
quests: {
  active: null,          // ID of currently active quest (string or null)
  completed: [],         // Array of completed quest IDs, in order
  progress: {}           // { questId: { counter: 0, activatedAt: timestamp } }
}
```

### Quest State Machine

```
[locked] ──prerequisite met──> [active] ──condition met──> [completed]
                                  |
                           (only 1 quest active at a time)
```

**Rules**:

1. On game start: if `quests.active === null` and `quests.completed` is empty, activate `first_blood`.
2. On quest activation: initialize `progress[questId] = { counter: 0, activatedAt: Date.now() }`.
3. On quest completion: push quest ID to `completed[]`, grant rewards via `addXP()` and `state.gold += reward.gold`, set `active = null`.
4. After completion: find next quest where `prerequisite` is in `completed` and quest ID is NOT in `completed`. Activate it.
5. If no next quest exists: chain is done. `active` stays null.
6. On activation of a new quest: immediately check if condition is already met (handles cases where player leveled up or equipped items between quests). If met, auto-complete and advance.

---

## 7. Event Dispatch: Tracking Logic

Each event is dispatched from existing game code. The quest system listens passively.

| Event | Dispatched From | Payload | Quests That Listen |
|-------|----------------|---------|-------------------|
| `battleWon` | `combat.js` after victory | `{ enemyId: string }` | first_blood, the_weight_of_bone, trial_of_shadows |
| `grimoireChanged` | grimoire UI after slot change | `{ filledSlots: number, source: 'manual' }` | know_thy_weapon, a_fuller_grimoire |
| `itemEquipped` | `inventory.js` after equip | `{ itemId: string, slot: string }` | dressed_to_kill |
| `levelUp` | `state.js` in `addXP()` | `{ newLevel: number }` | the_awakening |

### Condition Evaluation

```
Condition Type           | Evaluation Logic
-------------------------|--------------------------------------------------
winsTotal                | Increment quest-local counter on battleWon. Check >= count.
grimoireSlotsFilled      | Count non-null entries in state.grimoire. Check >= count.
defeatEnemy              | Match enemyId from battleWon payload. Check quest-local counter >= count.
equipNonStarter          | Check if equipped itemId is not in [starter_staff, starter_hat, starter_cloak].
winsAfterActivation      | Counter starts at 0 when quest activates. Increment on any battleWon. Check >= count.
reachLevel               | Check state.level >= condition.level.
```

**Coder handoff**: Implement `checkQuestProgress(eventName, payload)`. Called after every tracked event. Checks if active quest matches the event, evaluates condition, triggers completion if met. Also call this function on game load for the current active quest (handles returning players).

---

## 8. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Player already meets condition when quest activates (e.g., already level 3 when Q7 activates) | Check condition immediately on activation. Auto-complete and chain-advance. Allow multiple auto-completions in sequence within one frame. |
| Player resets grimoire after completing Q2 (removes all spells) | Completed quests stay completed. No revocation. |
| Player reaches level 3 before Quest 7 activates | Quest 7 auto-completes on activation. Intermediate quests also chain-resolve if their conditions are met. |
| Player clears localStorage | Full state reset including quests. Player restarts from Quest 1. |
| Quest 3: player has no items to equip for Quest 4 (future empty-inventory economy) | Quest 3 Skeleton Warrior kill must guarantee a Common drop if `inventory` contains no non-starter equipment. Prevents softlock. |
| All 7 quests completed | `quests.active` stays null. Quest tracker UI hides. |
| Multiple events fire in same frame (e.g., battleWon + levelUp) | Process events sequentially. Complete active quest, activate next, check next event against new quest. Chain reactions within one frame are allowed. |
| Quest reward XP causes level-up | Apply reward via `addXP()`. If that level-up matches next quest's condition, the next quest auto-completes on activation. |
| Player wins combat but quest notification would interrupt flow | Quest notification appears AFTER combat reward screen (XP, gold, drop). Never interrupt combat result. |

---

## 9. Quest Tracker UI (UI/UX Handoff)

**Location**: Bottom-left corner of the location/map screen.

**Panel specs**:
- Width: ~280px, semi-transparent dark background (`rgba(0,0,0,0.7)`), gold border (`#c9a84c`), 1px solid
- Quest name: Playfair Display (matches existing typography), color `#c9a84c`, 14px
- Quest description: system font, color `#aaa`, 12px
- Progress bar for count-based quests (e.g., "3/5 victories"): thin gold bar below description

**States**:

| State | Display |
|-------|---------|
| **Active quest** | Name + description + progress indicator |
| **Quest completing** | Gold flash animation (0.5s), reward floats up (+XP, +Gold), 1s delay, next quest slides in from bottom |
| **No active quest** | Panel fades out (0.3s transition) |
| **Hover** | Panel expands vertically to show flavor text in italic |

**Not dismissible** during onboarding chain. After Awakening, future quest trackers should have a minimize button.

**No separate quest log** for onboarding chain — the single-quest tracker is sufficient for 7 linear quests. A full quest log UI is needed only when parallel/daily quests are added post-Awakening.

---

## 10. Flow Diagram

```
[First Login]
     |
     v
[Q1: First Blood] ───battleWon───> +10 XP, +5g
     |
     v
[Q2: Know Thy Weapon] ───grimoireChanged───> +15 XP, +5g
     |
     v
[Q3: Weight of Bone] ───battleWon(skeleton)───> +20 XP, +10g
     |                                           (~level 2 here)
     v
[Q4: Dressed to Kill] ───itemEquipped───> +20 XP, +10g
     |
     v
[Q5: A Fuller Grimoire] ───grimoireChanged(3+)───> +20 XP, +5g
     |
     v
[Q6: Trial of Shadows] ───5x battleWon───> +25 XP, +5g
     |                                      (level 3 during or after)
     v
[Q7: The Awakening] ───levelUp(3)───> +25 XP, +5g
     |
     v
[CLASS SELECTION MODAL]
     |
     v
[Pyromancer / Stormcaller / Tidecaster / Geomancer]
     |
     v
[Post-Awakening content]
```

---

## 11. Dependencies

| System | Interaction | File(s) |
|--------|------------|---------|
| Combat | Dispatches `battleWon` with enemyId | combat.js |
| Grimoire UI | Dispatches `grimoireChanged` with filledSlots and source | grimoire UI code |
| Inventory | Dispatches `itemEquipped` with itemId | inventory.js |
| Progression | Dispatches `levelUp` in `addXP()`. Quest rewards call `addXP()` and mutate gold. | state.js |
| Class Selection | Quest 7 completion triggers class selection modal | Depends on mage-classes system |
| Item Drops | Quest 3 may need guaranteed Common drop (edge case) | combat.js / state.js |
| localStorage | `quests` object persisted in player state | state.js |

---

## 12. Coder Handoff Summary

1. Add `QUESTS_DATA` export to `state.js` (Section 5 above).
2. Add `quests` object to `getDefaultState()` (Section 6).
3. Implement `checkQuestProgress(eventName, payload)` — central quest evaluation function.
4. Implement `activateNextQuest()` — finds next quest by prerequisite chain, activates it, runs immediate condition check.
5. Add event dispatches: `battleWon` in combat.js, `grimoireChanged` in grimoire code, `itemEquipped` in inventory.js, `levelUp` already exists in `addXP()`.
6. Handle auto-completion chain: when a quest auto-completes on activation, immediately try to activate and check the next one.
7. Handle guaranteed Common item drop on Quest 3 if inventory is empty (future economy).
8. On game load: if `quests.active` is null and `completed` is empty, activate `first_blood`. If `active` is set, run condition check (returning player may have fulfilled it offline).

**UI/UX Handoff**: Quest tracker panel (Section 9). Completion animation. Flavor text on hover.

---

*Document created: 2026-03-30 (v2)*
*Replaces: previous parallel quest design (v1)*
*Depends on: progression-system.md, mage-classes system*
*Next: Coder implements quest system. Post-Awakening quest chain is a separate design doc.*
