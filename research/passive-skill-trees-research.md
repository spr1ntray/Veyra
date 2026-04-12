# Research: Passive Skill Trees in RPGs — Findings for Veyra

> **Date**: 2026-04-10
> **Scope**: Analysis of passive skill trees in Path of Exile, Diablo 4, Lost Ark, Hades 2, Vampire Survivors, Melvor Idle
> **Goal**: Extract patterns that work for a browser RPG with 4 mage classes

---

## 1. Analysis of Key Games

### Path of Exile — Massive Shared Tree
- **Structure**: One enormous shared tree (1325 nodes), classes start from different positions
- **Node types**: small (+10 STR), notable (named, medium effect), keystone (game-changing tradeoff)
- **What works**: Feeling of "building toward something" — visible path to next big node. Keystones create build identity.
- **What doesn't for Veyra**: Too complex for browser RPG. 1000+ nodes = paralysis. Requires wiki/build guide dependency.
- **Takeaway**: The 3-tier node system (small/notable/keystone) is brilliant and scalable. Use it.

### Diablo 4 — Class-Specific Trees
- **Structure**: Linear skill tree per class, passive nodes alongside active skills
- **Node types**: +% damage, +% crit, conditional passives ("when you use fire spell, gain X")
- **Resource**: Skill points (1 per level)
- **What works**: Class-specific trees mean every node feels relevant. No "trap" choices.
- **What doesn't for Veyra**: Diablo has too many active skills mixed with passives — Veyra has grimoire for actives.
- **Takeaway**: Keep passives SEPARATE from active spells. 1 point per level is clean economy.

### Lost Ark — Engravings
- **Structure**: Flat list of engraving slots (not a tree), but with levels (1/2/3)
- **What works**: Simple to understand, powerful at high levels. Mix-and-match feel.
- **Takeaway**: Tiered passives (level 1/2/3 of same passive) is cleaner than many unique small nodes.

### Hades 2 — Mirror of Night
- **Structure**: Linear progression, each node has A/B choice (mutually exclusive)
- **Resource**: Darkness (farmable resource from runs)
- **What works**: Binary choices are fast and interesting. No analysis paralysis.
- **Takeaway**: A/B choice nodes could work for Veyra — "pick one of two" at certain tiers.

### Vampire Survivors — Power-ups
- **Structure**: Flat upgrades purchased with meta-currency between runs
- **What works**: Simple, satisfying, always-relevant upgrades
- **Takeaway**: Some passives should be universal (all classes benefit), not just class-specific.

### Melvor Idle — Agility/Mastery
- **Structure**: Mastery per skill, passive bonuses at milestones
- **What works**: Passive progression tied to usage — feels earned, not just spent
- **Takeaway**: Could tie some passives to combat milestones (X kills, X crits, etc.)

---

## 2. Universal Patterns That Work

### Resource for Skill Points
| Approach | Pros | Cons |
|----------|------|------|
| 1 per level | Simple, predictable | Nothing to farm specifically |
| Separate currency (farmable) | Dedicated grind loop, more content | Can feel like busywork |
| Milestone-based (kill 100 enemies = 1 point) | Achievement-driven | Hard to balance, may gate progression |
| Hybrid (1/level + bonus from achievements) | Best of both worlds | More complex |

**Recommendation for Veyra**: Hybrid. Base: 1 point per level (49 total by lv50). Bonus: "Insight" points from tower clears, quest completions, prestige tiers. This gives ~55-65 total points.

### Tree Structure
| Approach | Pros | Cons |
|----------|------|------|
| Massive shared tree (PoE) | Freedom, exploration | Overwhelming |
| Class-specific linear (D4) | Focused, no traps | Less creative freedom |
| Small tree per class + shared core (hybrid) | Class identity + universal utility | Medium complexity |
| Flat list with tiers (engravings) | Dead simple | No spatial exploration fun |

**Recommendation for Veyra**: Small tree per class (15-20 nodes) + 5-8 shared "universal" nodes. Total: ~25 nodes per class path. Manageable for browser, still feels like a tree.

### Node Taxonomy
Every good passive tree has these categories:
1. **Stat boost** (+X% damage, +Y HP) — bread and butter, always useful
2. **Conditional** (when X happens, gain Y) — creates playstyle identity
3. **Proc/trigger** (10% chance on hit to...) — exciting randomness
4. **Keystone/capstone** (major effect, often with tradeoff) — build-defining
5. **Utility** (gold find, XP boost, cooldown reduction) — quality of life

---

## 3. Anti-Patterns to Avoid

1. **"Math only" passives**: +2% damage nodes that feel invisible. Need at least some nodes with VISIBLE effects (visual feedback on proc).
2. **Respec anxiety**: If respec is impossible or very expensive, players avoid experimentation. Cheap respec = better engagement.
3. **Mandatory paths**: If one path is clearly optimal, tree is effectively linear. Need multiple viable paths.
4. **Too many nodes**: For browser RPG, 20-25 per class is plenty. More = spreadsheet game.
5. **Disconnected from gameplay**: Passives should reference actual game mechanics (spells, combat events), not abstract stats.

---

## 4. Interesting Resource Ideas for Veyra

Instead of generic "skill points", the resource could be thematic:

| Name | Source | Fantasy |
|------|--------|---------|
| **Arcane Essence** | Absorbed from defeated enemies | You harvest magical energy from combat |
| **Memory Fragments** | From tower clears and boss kills | You recover ancient mage knowledge |
| **Ley Threads** | 1 per level + bonus from quests | You weave ley line energy into your soul |
| **Ember / Static / Tide / Stone** (class-specific) | Element-themed, from using class spells | Mastery grows through practice |

**Recommendation**: **"Ley Threads"** — fits the mage fantasy, sounds unique to Veyra, works as both universal and class-specific currency.
