# NPC: Merchant — Veyra Town Square

> **Author**: Narrative Designer Agent
> **Date**: 2026-03-30
> **Status**: DRAFT
> **Depends on**: mage-classes.md, state.js (ITEMS_DATA)

---

## Character Brief

### Name: **Morthis Dray**

*"Morthis" — from old mercantile cant, "mort" (dead goods, wares of the recently deceased). "Dray" — a low cart used to haul heavy loads. Together: a man who moves dead weight for a living, and knows it.*

### Personality

Morthis has been selling equipment to mages for thirty years. He has watched hundreds of them walk away brimming with ambition and return in pieces — or not return at all. This has not made him cruel. It has made him economical with hope.

He is not evil. He is not warm. He is a man who has seen enough to have opinions, and enough sense to keep most of them to himself — mostly. He uses dark humor as punctuation. He does not lie about his wares, but he does not go out of his way to mention the previous owner's fate either.

He carries a slight limp from an incident he will not discuss. He drinks something dark from a flask between customers. He knows everyone's name by their third visit and never admits it.

**Tone registers:**
- Dry, matter-of-fact
- Occasional gallows humor, never cheap
- Weary competence — he's heard every question before
- Genuine (if reluctant) respect for players who survive long enough to earn it

---

## Dialogue JSON

### 1. Shop Open — Random Greeting Lines
*Trigger: player opens the merchant UI. One line selected at random from the pool.*

```json
[
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "Still breathing. That puts you ahead of my last three regulars.",
    "emotion": "dry_neutral"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "Everything you see here is battle-tested. The testers didn't all make it, but that's beside the point.",
    "emotion": "deadpan"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "Business is good when the world is bad. You're keeping me comfortable.",
    "emotion": "sardonic"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "Don't touch what you can't afford. That includes the flask.",
    "emotion": "flat_warning"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "I restocked last night. Didn't sleep, but the shelves look better than I do.",
    "emotion": "tired_wry"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "What can I say — death is steady work, and I'm the man between you and it.",
    "emotion": "philosophical_dry"
  },
  {
    "character": "Morthis Dray",
    "trigger": "shop_open_random",
    "line": "Looking to spend or looking to browse? One of those I charge extra for.",
    "emotion": "pointed"
  }
]
```

---

### 2. Item Purchase — Specific Lines
*Trigger: player confirms purchase of a specific item. 2–3 variants per item, one selected at random.*

#### Mana Elixir
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:mana_elixir",
    "line": "Brewed it myself. Don't ask what's in it. Do ask what happens if you drink two.",
    "emotion": "conspiratorial"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:mana_elixir",
    "line": "Three combats of amplified spellwork. Use it on something that deserves it.",
    "emotion": "pragmatic"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:mana_elixir",
    "line": "Smells terrible. Works perfectly. In my experience that's true of most useful things.",
    "emotion": "dry_approval"
  }
]
```

#### Crystal Shard
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:crystal_shard",
    "line": "Buying money with money. There's a philosophy in there somewhere.",
    "emotion": "amused_dry"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:crystal_shard",
    "line": "Five fights, extra gold each time. Assuming you survive five fights.",
    "emotion": "matter_of_fact"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:crystal_shard",
    "line": "The shard draws fortune like a magnet draws iron. Don't ask how. I didn't.",
    "emotion": "evasive_dry"
  }
]
```

#### Iron Flask
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:iron_flask",
    "line": "Forty extra HP. Not glamorous. Glamour doesn't stop a sword.",
    "emotion": "blunt"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:iron_flask",
    "line": "My most sensible seller. Nobody ever died wishing they had less HP.",
    "emotion": "approving"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:iron_flask",
    "line": "Good choice. You've got the right kind of cowardice — the kind that keeps you alive.",
    "emotion": "backhanded_praise"
  }
]
```

#### Shadow Dust
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:shadow_dust",
    "line": "Double experience for two fights. I don't know what's in it. I know what it costs to get it. That's enough.",
    "emotion": "deliberately_vague"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:shadow_dust",
    "line": "You'll level fast. Whether fast is good depends on what's waiting at the next level.",
    "emotion": "ominous_neutral"
  }
]
```

#### Oak Staff / Novice Hat / Road Cloak (common equipment)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:common_equipment",
    "line": "Solid. Nothing special about it, and that's a virtue — nothing special will break it either.",
    "emotion": "approving_neutral"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:common_equipment",
    "line": "Reliable. I've seen flashier gear split in half on the first good hit.",
    "emotion": "dry_wisdom"
  }
]
```

#### Amethyst Staff / Runic Hood / Veil of Mist (uncommon equipment)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:uncommon_equipment",
    "line": "Moving up in the world. Or sideways. Hard to tell until you're already there.",
    "emotion": "wry_neutral"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:uncommon_equipment",
    "line": "Good piece. Previous owner left it in perfect condition. I'm sure they're fine.",
    "emotion": "studied_innocence"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:uncommon_equipment",
    "line": "A step above apprentice-grade. There's more air between you and catastrophe now.",
    "emotion": "pragmatic_approval"
  }
]
```

#### Void Scepter / Eclipse Hat / Nightweave Cloak (rare equipment)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:rare_equipment",
    "line": "I had to pry that off someone who didn't want to let go. They weren't in a position to argue.",
    "emotion": "dark_flat"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:rare_equipment",
    "line": "Rare. Not rare like it's hard to find — rare like it costs what it costs and you pay it.",
    "emotion": "mercantile_blunt"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:rare_equipment",
    "line": "Smart. This kind of investment tends to pay itself back. Tends to.",
    "emotion": "qualified_approval"
  }
]
```

#### Ancient Rod / Crown of Ash / Abyssal Shroud (epic equipment)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:epic_equipment",
    "line": "That is not something I expected to move today. Or this year.",
    "emotion": "genuine_surprise"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:epic_equipment",
    "line": "I'll tell you what I know about that piece: not much. What I know about its price: everything.",
    "emotion": "dry_honest"
  },
  {
    "character": "Morthis Dray",
    "trigger": "buy_item:epic_equipment",
    "line": "You either know exactly what you're doing, or you have no idea. Both types tend to buy these.",
    "emotion": "philosophical"
  }
]
```

---

### 3. Low Gold Lines
*Trigger: player attempts to buy and cannot afford it (not enough gold).*

```json
[
  {
    "character": "Morthis Dray",
    "trigger": "purchase_failed:no_gold",
    "line": "Pockets empty, ambitions full. You're not my first.",
    "emotion": "tired_sympathy"
  },
  {
    "character": "Morthis Dray",
    "trigger": "purchase_failed:no_gold",
    "line": "That's more gold than you have. Go win some fights. I'll wait — I always wait.",
    "emotion": "flat_dismissal"
  }
]
```

*Trigger: player opens the shop while total gold is under 30.*
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "shop_open:gold_under_30",
    "line": "Looking is free. Touching is not. Buying is currently theoretical for you.",
    "emotion": "dry_observation"
  }
]
```

---

### 4. Progress-Gated Lines
*Triggered once per condition — fire-and-forget, not repeated.*

#### First Visit (visitCount === 1)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "first_visit",
    "line": "New face. Good. The old ones keep coming back and that's starting to feel like a bad sign.",
    "emotion": "wry_welcome"
  }
]
```

#### After Level 3 — Awakening Occurred (playerLevel >= 3 AND class !== null)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "post_awakening:first_visit_after",
    "line": "You've chosen your path. Good. Mages who stay undecided tend to stay dead.",
    "emotion": "measured_respect"
  },
  {
    "character": "Morthis Dray",
    "trigger": "post_awakening:class_specific_pyromancer",
    "line": "A Pyromancer. I'll keep flammables behind the counter from now on.",
    "emotion": "dry_caution"
  },
  {
    "character": "Morthis Dray",
    "trigger": "post_awakening:class_specific_stormcaller",
    "line": "Stormcaller. Don't cast anything near the glassware.",
    "emotion": "flat_practicality"
  },
  {
    "character": "Morthis Dray",
    "trigger": "post_awakening:class_specific_tidecaster",
    "line": "A Tidecaster. Patient type. You'll outlive most of your enemies — and most of your friends.",
    "emotion": "knowing_neutral"
  },
  {
    "character": "Morthis Dray",
    "trigger": "post_awakening:class_specific_geomancer",
    "line": "Geomancer. Slow, hard to kill, and eventually wins by exhausting everyone around it. Reminds me of my business model.",
    "emotion": "dry_self_reference"
  }
]
```

#### After Level 5+ (Veteran Recognition)
```json
[
  {
    "character": "Morthis Dray",
    "trigger": "player_level_gte_5:first_trigger",
    "line": "Still here. I'm not surprised anymore. That's the closest thing I have to a compliment.",
    "emotion": "grudging_respect"
  }
]
```

---

## Quest: The Severed Finger

### Overview

A minor quest delivered conversationally — no quest screen, just dialogue and an inventory flag.

Morthis lost a business contact, a fence named **Colwick**, to a Skeleton Warrior patrol that now controls the road east of town. He wants proof the road is clear — but what he actually wants is the iron ring Colwick was carrying when he died. He doesn't say that last part unless pressed (second dialogue trigger).

### Quest Dialogue

**Quest Offer** *(trigger: playerLevel >= 2, questNotStarted)*
```json
{
  "character": "Morthis Dray",
  "trigger": "quest_offer:severed_finger",
  "line": "You look like someone who handles problems for coin. I have a problem. It's on the road east of here, wearing bone armor, and it's sitting on something that belongs to me. Bring me proof it's dealt with — I'll make the price worth the walk.",
  "emotion": "businesslike_direct"
}
```

**Quest Hint — if player asks what to bring back** *(optional second line)*
```json
{
  "character": "Morthis Dray",
  "trigger": "quest_hint:severed_finger",
  "line": "The warrior at the front of the patrol. Has a cracked helmet. There should be an iron ring somewhere on what's left of him. I'd like it back. The rest of Colwick I've made my peace with.",
  "emotion": "quiet_grief_suppressed"
}
```

**Quest Complete** *(trigger: player carries `skeleton_iron_ring` in inventory)*
```json
{
  "character": "Morthis Dray",
  "trigger": "quest_complete:severed_finger",
  "line": "There it is. Good. ..That'll be twenty-five years of business in a ring. Take what I promised you — I'd rather not look at either of you right now.",
  "emotion": "grief_controlled"
}
```

**Quest Reward** *(delivered with quest_complete)*

| Reward | Value |
|--------|-------|
| Gold | 120 |
| Permanent shop discount | 10% off all consumables |
| Morthis disposition shift | He now greets the player by a nickname ("back again, killer") |

### Item Required
`skeleton_iron_ring` — a drop item added to the Skeleton Warrior loot table. Not named obviously; described only as *"A worn iron ring. Someone's initials are scratched inside."*

---

## Implementation Notes

**Trigger system approach (for Coder):**

| Trigger ID | Condition |
|------------|-----------|
| `shop_open_random` | On shop open; exclude progress-gated lines; pick from pool |
| `buy_item:{itemId}` | On confirmed purchase; match to item rarity group if no item-specific line exists |
| `purchase_failed:no_gold` | On failed purchase due to insufficient funds |
| `shop_open:gold_under_30` | On shop open; player gold < 30; shown before random greeting |
| `first_visit` | `merchantVisitCount === 1`; shown once, flag set |
| `post_awakening:first_visit_after` | `state.class !== null` AND `merchantSeenAwakening !== true`; shown once, flag set |
| `post_awakening:class_specific_{class}` | Variant of above, keyed to `state.class` value |
| `player_level_gte_5:first_trigger` | `state.level >= 5` AND `merchantSeenVeteran !== true`; shown once, flag set |
| `quest_offer:severed_finger` | `state.level >= 2` AND `questSeveredFinger.status === 'not_started'` |
| `quest_hint:severed_finger` | During quest; player interacts second time without completing |
| `quest_complete:severed_finger` | `state.inventory.skeleton_iron_ring >= 1` |

Progress-gated one-shot lines use boolean flags stored in `state.merchantFlags` (to be added by Coder).

---

*Document created: 2026-03-30*
*Status: DRAFT — pending review*
*Next: add `skeleton_iron_ring` to Skeleton Warrior loot table in state.js, add `merchantFlags` to getDefaultState().*
