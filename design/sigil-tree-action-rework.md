# Sigil Tree — Action Rework + Slowdown Spec

**Дата:** 2026-04-26
**Статус:** ТЗ для coder-а, обоснование для пользователя
**Контекст:** pivot 2026-04-19, pivot-engine (`src/js/engine/`, `src/js/dungeon/`)
**Проблема:** игра слишком быстрая; прокачанный персонаж не проходит первый данж потому что ноды Sigil Tree не работают в action-режиме.

---

## Часть 1 — Slowdown Spec

### 1.1 Текущие константы (источник истины)

| # | Параметр | Файл:строка | Сейчас |
|---|---|---|---|
| A | Player movement | `src/js/engine/ai.js:255` (`SPEED = 10 * TILE_SIZE`) | 10 tiles/s = 320 px/s |
| B | Enemy movement (normal) | `src/js/dungeon/dungeon.js:548` (`moveSpeed: 9.0`) | 9 tiles/s |
| C | Enemy movement (elite) | `src/js/dungeon/dungeon.js:548` (`moveSpeed: 11.5`) | 11.5 tiles/s |
| D | Fireball cooldown | `src/js/dungeon/player.js:20` (`cdTicks = 1.2 * 60`) | 72 ticks = 1.2 s |
| E | Fireball projectile speed | `src/js/engine/ai.js:161` (`speed = 22 * TILE_SIZE`) | 22 tiles/s |
| F | Fireball damage | `src/js/engine/ai.js:166` (`dmg: 25`) | 25 |
| G | Auto-cast scan interval | `src/js/engine/ai.js:16` (`AUTO_CAST_INTERVAL = 6`) | 6 ticks = 100 ms |
| H | Aggro range | `src/js/engine/ai.js:102` (`8 * TILE_SIZE`) | 8 tiles |
| I | Enemy attack cooldown (normal) | `dungeon.js:551` (`80`) | 80 ticks = 1.33 s |
| J | Enemy attack cooldown (elite) | `dungeon.js:551` (`60`) | 60 ticks = 1.0 s |
| K | Enemy damage (normal/elite) | `dungeon.js:550` | 20 / 35 |
| L | Player base HP | `src/js/dungeon/player.js:31` (`hp: 100`) | 100 |
| M | Cast animation lock | `src/js/dungeon/player.js:45` (`0.4 * 60`) | 24 ticks = 0.4 s |

`DT = 1/60` (`engine/config.js:12`) — НЕ трогать, технический параметр.

### 1.2 Новые значения

| # | Параметр | Старое | Новое | Цель | Метрика приёмки |
|---|---|---|---|---|---|
| A | Player speed | 10 | **8.5** (-15%) | Дать время кликнуть skill | 5 тайлов за ~1.9 с |
| B | Enemy normal speed | 9 | **7.0** (-22%) | Игрок может кайтить short distance | За 3 с догоняет с 5 тайлов |
| C | Enemy elite speed | 11.5 | **9.0** (-22%) | Элита быстрее игрока, но не "кричаще" | Догоняет с 5 тайлов за ~1.7 с |
| D | Fireball cooldown | 72 | **84** (+17%) | Меньше "пулемёта", больше веса каста | 1 каст / 1.4 с |
| E | Projectile speed | 22 | 22 | НЕ трогаем | — |
| G | Auto-cast scan | 6 | **9** (+50%) | Реже сканировать, более spell-like | Скан / 150 мс |
| I | Enemy normal attackCD | 80 | **95** (+19%) | Больше окно для уклонения | Удар / 1.58 с |
| J | Enemy elite attackCD | 60 | **75** (+25%) | Элиты тоже не overwhelm | Удар / 1.25 с |
| M | Cast animation lock | 24 | 24 | НЕ трогать (на анимации завязано) | — |

**Базовые damage/HP не трогаем здесь** — баланс DPS будет править Sigil Tree (Часть 2).

### 1.3 Acceptance: Slowdown

- [ ] Игрок проходит коридор 5 тайлов за 1.9–2.1 с (раньше 1.6 с).
- [ ] Игрок может оторваться от нормального зомби на 3+ тайлов за 4 с движения (раньше — нет).
- [ ] Между двумя auto-cast Fireball — ощутимая пауза (~1.4 с), игрок успевает оценить позицию.
- [ ] Между двумя ударами зомби — окно ~1.5 с для отхода.

**Why для пользователя:** мы не делаем игру "медленной" — мы даём 200–300 мс дополнительного "thinking time" между micro-decisions. Pyromancer должен ощущаться как маг, а не как пулемёт.

---

## Часть 2 — Sigil Tree Rework

### 2.1 Корень проблемы

Текущие 80 нод (`src/js/passives.js`) спроектированы под autocast combat.js — там есть Ignite stacks, Static charges, Riptide, Stone Skin shield, Healing Rain. **В pivot-engine ничего из этого нет.** Из всего набора в action-движке работает только `spellDamageBonus` (`combat_bridge.js:67` → `ai.js:128` → flat add к damage Fireball). Всё остальное — мёртвые ноды.

**Поэтому прокачанный игрок не проходит данж:** буквально 95% его нод НЕ дают эффекта. То есть он играет на base stats против 36 врагов с HP 100 / DMG 20.

### 2.2 Принципы перепроектирования

1. **Каждая нода = одна конкретная мутация существующего параметра pivot-engine.** Если нода не маппится в `player.js / enemy.js / ai.js / dungeon.js` — её нет.
2. **Multiplicative bonuses, не flat.** Ноды множат базу, чтобы суммирование не превращалось в имбу к late-game.
3. **Soft cap через diminishing returns:** одна нода ≤ 18% буст, total max-build ≤ 3× base DPS / 2× base survival.
4. **Trade-offs у keystone.** Без trade-off keystone превращается в must-pick.
5. **Без proc-based магии.** Пока нет Ignite/Burn в pivot-движке — не вводим псевдо-DoT в нодах. (Вводим позже отдельным ТЗ для системы DoT.)

### 2.3 Spec для системы баффов (ОБЯЗАТЕЛЬНО для coder-а)

Сейчас аггрегация баффов сидит в `state.js:aggregatePassiveBonuses()` и возвращает плоский объект, который читает только `combat_bridge.js`. **Нужен новый агрегатор для action-engine.**

**Создать:** `src/js/dungeon/passive_runtime.js`

Экспорт:
```js
// Принимает unlockedIds, возвращает плоский объект мультипликаторов.
export function buildActionBuffs(unlockedIds) {
  return {
    // Combat
    spellDmgMul:        1.0,  // умножает p.dmg в spawnFireball
    spellCdMul:         1.0,  // умножает skill.cdTicks
    spellRangeMul:      1.0,  // умножает aggroRange в _nearestEnemyInRange
    projSpeedMul:       1.0,
    projRadiusMul:      1.0,  // hitbox снаряда
    aoeRadius:          0,    // px — если > 0, при impact spawn radial damage zone
    pierceCount:        0,    // снаряд пробивает N целей перед уничтожением
    critChance:         0.0,  // 0..1
    critMul:            1.5,  // ×1.5 по умолчанию
    // Survival
    maxHpMul:           1.0,
    dmgTakenMul:        1.0,  // multiplicative, < 1 = броня
    hpRegenPerSec:      0,    // flat HP/s (новая система; добавить в player.update)
    dodgeChance:        0.0,  // полный мисс vs урон
    // Movement
    moveSpeedMul:       1.0,
    // Meta
    goldMul:            1.0,
    xpMul:              1.0,
  };
}
```

**Интеграция (file:line):**
- `combat_bridge.js:65` — пробросить `actionBuffs: buildActionBuffs(state.passives.unlocked)` в `startRun()`.
- `dungeon.js:440` — сохранить `_world.actionBuffs = playerConfig.actionBuffs`.
- `player.js:14-22` (`_classSkill`) — умножить `cdTicks` на `world.actionBuffs.spellCdMul` (через init после конструктора в `dungeon.js`).
- `ai.js:100-107` — умножить `aggroRange` на `actionBuffs.spellRangeMul`.
- `ai.js:156-169` (`_spawnFireball`) — применить `spellDmgMul`, `projSpeedMul`, `projRadiusMul`, `critChance`, `critMul`. Если `aoeRadius > 0` — пометить projectile как `aoe: aoeRadius`.
- `dungeon.js:_updateProjectiles` — если `p.aoe` и попадание в стену/врага: scan all enemies в `aoeRadius`, нанести `p.dmg * 0.7` каждому. Если `p.pierceCount > 0` — не убивать снаряд при первом попадании, декрементировать.
- `player.js:31` (`hp: 100`) — после конструктора умножить `this.hpMax = 100 * actionBuffs.maxHpMul; this.hp = this.hpMax;`.
- `player.js:107` (`takeDamage`) — `amount *= actionBuffs.dmgTakenMul`. Перед `super.takeDamage` — `if (Math.random() < actionBuffs.dodgeChance) return false`.
- `player.js:update` — добавить regen: `if (actionBuffs.hpRegenPerSec > 0) { this.hp = Math.min(this.hpMax, this.hp + actionBuffs.hpRegenPerSec / 60); }`.
- `ai.js:_followPath` — `SPEED = 10 * TILE_SIZE * actionBuffs.moveSpeedMul`.
- `loot.js` (gold pickup) — `amount *= actionBuffs.goldMul`.
- `dungeon.js:stopRun` — `xpEarned *= actionBuffs.xpMul`.

### 2.4 Ноды — 8 Universal

| ID | Имя | Tier | Эффект | Параметр | Стиль | Why | Risk |
|---|---|---|---|---|---|---|---|
| `U_M01` | Vital Bloom | Minor | +12% Max HP | `maxHpMul *= 1.12` | Survival | Базовая выживаемость | Низкий |
| `U_M02` | Hunter's Pace | Minor | +8% movement speed | `moveSpeedMul *= 1.08` | Speed | Микро-перемещение легче | Низкий |
| `U_M03` | Sigil Conductor | Minor | +10% spell damage | `spellDmgMul *= 1.10` | DPS | Ядро DPS-billing | Низкий |
| `U_M04` | Hawk's Eye | Minor | +15% cast range | `spellRangeMul *= 1.15` | Utility | Решает проблему "враг в углу экрана", позволяет первый удар | Имба для kite-buildов — следить вместе с move speed |
| `U_J01` | Stone Lung | Major | +18% Max HP, +5% dmg reduction | `maxHpMul *= 1.18; dmgTakenMul *= 0.95` | Survival | Тонкий tank-инкремент | Низкий |
| `U_J02` | Glassblower's Focus | Major | +15% spell damage, +12% taken | `spellDmgMul *= 1.15; dmgTakenMul *= 1.12` | DPS | Trade-off: DPS за фрагильность | Может стать default-pick — следить за win rate |
| `U_J03` | Wayfarer | Major | +12% gold, +12% XP | `goldMul *= 1.12; xpMul *= 1.12` | Utility/Meta | Out-of-combat | Низкий |
| `U_KS` | Crimson Veil | Keystone | +30% spell damage, -20% Max HP | `spellDmgMul *= 1.30; maxHpMul *= 0.80` | DPS Build-defining | Glass cannon путь | Высокий — мониторить death rate, может быть слишком наказан slow + дамаг |

### 2.5 Ноды — 18 Pyromancer

| ID | Имя | Tier | Эффект | Параметр | Стиль | Why | Risk |
|---|---|---|---|---|---|---|---|
| `pyro_M01` | Ember Wick | Minor | +12% Fireball damage | `spellDmgMul *= 1.12` | DPS | Чистый DPS prim | Низкий |
| `pyro_M02` | Quicklight | Minor | -10% Fireball cooldown | `spellCdMul *= 0.90` | DPS/Speed | Cast rate | Стак с U_M03 даёт ощутимый burst — норм |
| `pyro_M03` | Heatseeker | Minor | +20% projectile size | `projRadiusMul *= 1.20` | Utility | Легче попадать по движущимся | Низкий |
| `pyro_M04` | Searing Reach | Minor | +12% cast range | `spellRangeMul *= 1.12` | Utility | Ранний контакт | Низкий |
| `pyro_M05` | Cinder Veil | Minor | -8% damage taken | `dmgTakenMul *= 0.92` | Survival | Лёгкая броня | Низкий |
| `pyro_M06` | Furnace Heart | Minor | +10% Max HP | `maxHpMul *= 1.10` | Survival | Тонкий HP | Низкий |
| `pyro_M07` | Ash Walker | Minor | +6% movement speed | `moveSpeedMul *= 1.06` | Speed | Помогает kiting | Низкий |
| `pyro_M08` | Firetongue | Minor | +5% crit chance | `critChance += 0.05` | DPS | Вводит crit систему | Средний — нужно правильно UI показать |
| `pyro_M09` | Sparkfall | Minor | +12% projectile speed | `projSpeedMul *= 1.12` | Utility | Меньше leading shot | Низкий |
| `pyro_M10` | Slow Burn | Minor | +8% Fireball damage, -3% projectile speed | `spellDmgMul *= 1.08; projSpeedMul *= 0.97` | DPS (trade) | Damage с micro-tradeoff | Низкий |
| `pyro_M11` | Reignition | Minor | Регенерация 0.4 HP/sec | `hpRegenPerSec += 0.4` | Survival | Out-of-combat sustain | Низкий |
| `pyro_M12` | Mage's Stride | Minor | +6% move speed, +6% range | `moveSpeedMul *= 1.06; spellRangeMul *= 1.06` | Utility | Combo-нода | Низкий |
| `pyro_J01` | Crucible Strike | Major | +18% spell damage, +5% crit | `spellDmgMul *= 1.18; critChance += 0.05` | DPS | Главная DPS-major | Стек с pyro_M01 + U_M03 = +50% — на верхнем краю, но в рамках 3× cap |
| `pyro_J02` | Blastwave | Major | Fireball взрыв, AoE 48 px (1.5 тайла), 70% damage | `aoeRadius = 48` | AoE | Решает проблему групп врагов | **Приоритет** — самая важная нода для проходимости |
| `pyro_J03` | Pyre Vigil | Major | +20% Max HP, +5% dmg reduction, +0.3 HP/sec regen | `maxHpMul *= 1.20; dmgTakenMul *= 0.95; hpRegenPerSec += 0.3` | Survival | Tank-инкремент для фронтлайнеров | Низкий |
| `pyro_J04` | Inferno Conduit | Major | -15% cooldown, +8% spell damage | `spellCdMul *= 0.85; spellDmgMul *= 1.08` | DPS/Speed | Burst | Стак с pyro_M02 = -23% CD, проверить feel |
| `pyro_KS01` | Eternal Pyre | Keystone | +40% spell damage, +20% range, **-25% movement speed**, **-15% Max HP** | `spellDmgMul *= 1.40; spellRangeMul *= 1.20; moveSpeedMul *= 0.75; maxHpMul *= 0.85` | DPS Build-defining | "Stationary turret" archetype — макс DPS, но позиционирование критично | Высокий — может стать ловушкой для новых игроков, надо ясный tooltip |
| `pyro_KS02` | Wreath of Cinders | Keystone | Fireball **pierce 2 врагов**, +10% AoE radius, **-25% damage**, **-10% projectile speed** | `pierceCount = 2; aoeRadius = (current * 1.10); spellDmgMul *= 0.75; projSpeedMul *= 0.90` | AoE/Control Build-defining | Crowd-control build для коридоров с толпами | Средний — синергия с pyro_J02; если оба взяты — слишком silver bullet, проверить |

### 2.6 Структура — где какие ноды

- 8 Universal: 4 Minor + 3 Major + 1 Keystone (как в текущей структуре)
- 18 Pyromancer: 12 Minor + 4 Major + 2 Keystone

(Старые универсалы U1–U8 и Pyro P1–P-K2 в `passives.js` **полностью заменяются** новыми ID. Stormcaller / Tidecaster / Geomancer ноды остаются как есть до отдельного rework — но для них тоже работает только `spellDamageBonus`, поэтому они тоже не работают; flag это в TODO.)

### 2.7 Балансная проверка max-build (Pyromancer)

**DPS-build (все ноды направления DPS):**
`U_M03 × U_J02 × U_KS × pyro_M01 × pyro_M02 × pyro_M08 × pyro_M10 × pyro_J01 × pyro_J04 × pyro_KS01`
- spellDmgMul = 1.10 × 1.15 × 1.30 × 1.12 × 1.08 × 1.18 × 1.40 = **3.06×** base DPS (на cap)
- spellCdMul = 0.90 × 0.85 = 0.765 → cooldown 0.84 × 0.765 = 1.07 s (ещё ускорение)
- moveSpeedMul = 0.75 (медленный)
- maxHpMul = 0.80 × 0.85 = 0.68 → HP 68 (фрагильный)
- **DPS итог:** ≈ 25 × 3.06 / 1.07 = 71.5 dps vs base 25/1.4 = 17.8 dps → **4.0× базовый DPS**, но **HP в 1.5 раза меньше** и **скорость в 1.33 раза меньше**.

**Survival build:**
`U_M01 × U_M02 × U_J01 × pyro_M05 × pyro_M06 × pyro_M07 × pyro_M11 × pyro_J03`
- maxHpMul = 1.12 × 1.18 × 1.10 × 1.20 = **1.74×** base HP (174)
- dmgTakenMul = 0.95 × 0.92 × 0.95 = **0.83** (-17% taken)
- moveSpeedMul = 1.08 × 1.06 = 1.145 (+14.5%)
- hpRegenPerSec = 0.7
- **Effective HP:** 174 / 0.83 = **210 EHP** vs base 100 → **2.1× survival** (на cap).

Cap соблюдён: ≤ 3× DPS (DPS-build на 4× из-за trade-off — keystone берёт фрагильность; чистый DPS без keystone ≈ 2.2×). Survival ≤ 2.1×. Разные стили дают РАЗНЫЕ subtotals — нет универсально-лучшего билда.

---

## Часть 3 — Acceptance Criteria

### 3.1 Файлы которые правит coder

| Файл | Что меняется |
|---|---|
| `src/js/engine/ai.js` | строки 16, 102, 161, 255 — slowdown константы; `_spawnFireball` — buff hooks; `_nearestEnemyInRange` — range mul |
| `src/js/dungeon/dungeon.js` | строки 548, 551 — slowdown enemy stats; `_updateProjectiles` — pierce/AoE логика; `startRun` — пробросить actionBuffs |
| `src/js/dungeon/player.js` | строки 17–20 — slowdown CD; конструктор — apply maxHpMul; `takeDamage` — dmgTakenMul + dodge; `update` — hpRegenPerSec |
| `src/js/dungeon/passive_runtime.js` | **NEW FILE** — `buildActionBuffs(unlockedIds)` |
| `src/js/passives.js` | заменить U1–U8 + P1–P-K2 на новый набор (ID и effects из таблиц 2.4–2.5). **TODO:** S/T/G ноды пока не работают в pivot — пометить в комментариях |
| `src/js/combat_bridge.js` | строка 65 — добавить `actionBuffs: buildActionBuffs(state.passives.unlocked)` в `startRun` |

### 3.2 Spec для нового spell-конфига

**TODO в скоупе coder-а:** вынести Fireball constants в `src/js/dungeon/spells.js`:
```js
export const SPELLS = {
  fireball: {
    baseDamage:     25,
    baseCdTicks:    84,
    baseSpeed:      22 * TILE_SIZE,
    baseRadius:     8,
    baseTtl:        1.5,
    baseAoeRadius:  0,
    basePierce:     0,
  }
};
```
`ai.js:_spawnFireball` тогда читает из `SPELLS.fireball.*` × `actionBuffs.*`. Это упростит дальнейший balancing и подготовит сцену для аналогичного rework для Lightning/Waterbolt/Earthspike.

### 3.3 Passive proc-механика (правила)

- **Multiplier:** `mul *= node.value` (стак мультипликативный — два +10% = 1.21, не 1.20).
- **Flat add:** `additive += node.value` (для `critChance`, `hpRegenPerSec`, `pierceCount`, `aoeRadius`).
- **Override (max wins):** для `aoeRadius` и `pierceCount` — берём максимум среди нод (не суммируем).
- **Применение buffs — один раз на старте run** в `startRun()`. Никакого in-combat пересчёта (избегаем GC + сложности).

### 3.4 Тест-кейсы для приёмки

- [ ] Респекнуть в `Vital Bloom + Stone Lung + Pyre Vigil` → HP должно быть 100 × 1.12 × 1.18 × 1.20 = 158, проверить в HUD.
- [ ] Респекнуть в `Ember Wick + Crucible Strike + Crimson Veil` → Fireball damage 25 × 1.12 × 1.18 × 1.30 = 42.9 → отображается ~43.
- [ ] Респекнуть в `Quicklight + Inferno Conduit` → Fireball CD = 1.4 × 0.90 × 0.85 = 1.07 s, заметно быстрее.
- [ ] Респекнуть в `Blastwave` → попадание Fireball в одного зомби в группе → 2–3 соседа получают damage = 70% базы.
- [ ] Респекнуть в `Wreath of Cinders` → Fireball проходит через 2 зомби, не исчезая на первом.
- [ ] **Главное:** прокачанный Pyromancer (любой осмысленный билд из 6+ нод) проходит первый процедурный данж в > 60% запусков. Сейчас — близко к 0%.

---

## TL;DR (для конца сессии)

### Slowdown TL;DR
Player и enemy движения замедлены на 15–22%, Fireball cooldown +17%, enemy attack cooldowns +19/25%. Базовые HP/damage не трогаем — баланс едет через Sigil Tree. Получаем ~250 ms дополнительного "thinking time" между micro-decisions. Ничего не ломается, просто "оседает".

### Sigil Tree TL;DR
Текущие 80 нод спроектированы под старый autocast и не работают в pivot — единственный рабочий бонус это `spellDamageBonus` через INT. Перепроектированы 8 universal + 18 Pyromancer ноды на прямые мутации pivot-параметров (damage / cd / range / projectile size / AoE / pierce / crit / HP / dmg taken / dodge / move speed / regen). Каждый Minor ≤ 18%, Major ≤ 25%, Keystone до 40% с явным trade-off. Max-build даёт 3–4× DPS ИЛИ 2.1× survival, но не оба. Stormcaller / Tide / Geo — TODO, пока не работают.

### Top-5 нод по impact на проходимость данжа

1. **`pyro_J02` Blastwave** — Fireball получает AoE 48 px / 70% damage. Решает фундаментальную проблему "одна цель за раз" против 36 зомби.
2. **`pyro_KS02` Wreath of Cinders** — Pierce 2 врага. Превращает коридоры с толпами из death trap в зону комфорта.
3. **`U_M04` Hawk's Eye** + **`pyro_M04` Searing Reach** — суммарно +28% range. Игрок начинает стрелять раньше зомби входят в attack range — решает проблему "зомби уже бьёт пока я только увидел".
4. **`pyro_J04` Inferno Conduit** + **`pyro_M02` Quicklight** — суммарно -23% Fireball cooldown. Превращает 1.4 s/каст в 1.07 s/каст без overpowered burst.
5. **`U_J01` Stone Lung** + **`pyro_J03` Pyre Vigil** — суммарно +44% HP, -10% taken, 0.3 HP/s regen. Игрок переживает первый промах и не помирает с одного contact-burst элиты.
