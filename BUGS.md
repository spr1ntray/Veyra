# BUGS.md — Трекер багов

## Активные баги

### BUG-001: passiveDamageReduction (U5, T10) не применяется в бою

**Тип:** критический
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — performEnemyAttack()

**Описание:**
Пассивные ноды U5 (Battle Hardened, +5% DR) и T10 (Thick Skin, +8% DR) записывают эффект `damageReduction` в `aggregatePassiveBonuses()`. `getStats()` корректно суммирует их в `passiveDamageReduction`. Однако в `performEnemyAttack()` (combat.js, ~строка 1119) к итоговому `dmg` перед вычитанием из `mageHP` ни разу не применяется множитель `(1 - passiveDamageReduction)`. Код только проверяет Geomancer Bedrock (хард-код 15%) — universally-passive DR полностью игнорируется.

**Ожидаемое поведение:**
Разблокировав U5 + T10, игрок должен получить −13% урона от каждой атаки врага (до вычета щита).

**Шаги воспроизведения:**
1. Разблокировать U5 или T10 в Ley Loom.
2. Войти в бой.
3. Дать врагу ударить без щита.
4. Урон будет полным, без какого-либо снижения.

**Рекомендация:**
В `performEnemyAttack()` после строки `let dmg = enemy.attack;` добавить:
```js
// Passive damage reduction (U5, T10, etc.)
const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
const unlockedIds = (state.passives && state.passives.unlocked) || [];
let passiveDR = 0;
if (nodeMap) {
  for (const id of unlockedIds) {
    const n = nodeMap[id];
    if (n && n.effect.damageReduction) passiveDR += n.effect.damageReduction;
  }
}
dmg = Math.floor(dmg * (1 - passiveDR));
```

---

### BUG-002: getDefaultState() возвращает version: 2, но реальная версия схемы — 3

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** state.js — getDefaultState(), loadState()

**Описание:**
`getDefaultState()` (state.js, строка 1047) возвращает `version: 2`, хотя схема уже добавила поле `passives` — это версия 3. При создании нового сейва `loadState()` вызывает `_state = getDefaultState()`, что записывает `version: 2`. При следующей загрузке страницы сейв снова проходит ветку миграции `v3` (строка 1303: `if (!_state.version || _state.version < 3)`), создавая ретроактивные треды для нового игрока (уровень 1 → retroThreads = 0, но сам код выполняется лишний раз). Важнее: если в будущем появится `version: 3` в дефолте, а сейв уже имеет `version: 2` — логика перезапишет passives.

**Ожидаемое поведение:**
`getDefaultState()` должен возвращать `version: 3` (текущая актуальная схема).

**Шаги воспроизведения:**
1. Очистить localStorage, создать нового персонажа.
2. Проверить `JSON.parse(localStorage.getItem('veyra_save')).version` — будет `2`.
3. Перезагрузить страницу — снова пройдёт ветка миграции passives.

**Рекомендация:**
В `getDefaultState()` изменить `version: 2` на `version: 3` (строка 1047).

---

### BUG-003: Phoenix Protocol (P-K2) не реализован в combat.js

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — performEnemyAttack() / endBattle()

**Описание:**
Нода P-K2 Phoenix Protocol (`effect: { phoenixProtocol: true, maxHpPercent: -0.15 }`) описывает воскрешение с 30% HP один раз за бой при смерти. В combat.js нет ни одного обращения к `phoenixProtocol`. В `performEnemyAttack()` при `mageHP <= 0` немедленно вызывается `endBattle('loss')` без проверки флага. Нода разблокируется и тратит треды, но не работает.

**Ожидаемое поведение:**
При первой смерти мага за бой, если P-K2 разблокирован, смерть должна быть отменена и HP восстановлен до 30% maxHP.

**Шаги воспроизведения:**
1. Разблокировать P-K2 (требует P12, cost 3).
2. Позволить врагу убить мага.
3. Смерть наступает немедленно без воскрешения.

**Рекомендация:**
В `performEnemyAttack()`, перед `endBattle('loss')`:
```js
if (battleState.mageHP <= 0) {
  const passiveIds = (state.passives && state.passives.unlocked) || [];
  if (passiveIds.includes('P-K2') && !battleState._phoenixUsed) {
    battleState._phoenixUsed = true;
    battleState.mageHP = Math.floor(battleState.mageMaxHP * 0.30);
    addCombatLog('Phoenix Protocol! Resurrected with 30% HP!', '#e74c3c');
    updateMageHP();
    return;
  }
  endBattle('loss');
}
```
Также добавить `_phoenixUsed: false` в `initBattle()`.

---

### BUG-004: aggregatePassiveBonuses — if-guard блокирует суммирование отрицательных значений (P-K2 maxHpPercent: -0.15)

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** passives.js — aggregatePassiveBonuses(), строка 620

**Описание:**
Все эффекты в `aggregatePassiveBonuses` суммируются через паттерн `if (e.maxHpPercent) bonuses.maxHpPercent += e.maxHpPercent`. При `e.maxHpPercent = -0.15` (нода P-K2) условие `if (-0.15)` истинно и работает корректно, **однако** при `e.maxHpPercent = 0` (нейтральный эффект) условие ложно — но 0 и не должно суммироваться. Реальная проблема в другом: нода `G14 Obsidian Armor` имеет `effect: { obsidianArmor: true }` — флаг `obsidianArmor` не добавлен в начальный объект `bonuses` и не суммируется в цикле. Аналогично для всех специфических флагов нод (infernalMomentum, meltdown, backdraft, forgeShield, chainReaction, conflagration, phoenixProtocol, eyeOfStorm и т.д.) — они не инициализированы в `bonuses` и не читаются в цикле.

**Ожидаемое поведение:**
`aggregatePassiveBonuses` должен собирать все эффекты, включая флаги специфичных нод, чтобы combat.js мог читать единый объект вместо самостоятельного обращения к window._passiveNodesMap.

**Шаги воспроизведения:**
Разблокировать любую major/keystone ноду (например, P11 Infernal Momentum) и проверить результат `aggregatePassiveBonuses(['P11'])` — объект не будет содержать поле `infernalMomentum`.

**Рекомендация:**
Либо добавить все известные специфические флаги в `bonuses` (полный список из всех `effect` объектов), либо добавить универсальное копирование неизвестных ключей:
```js
for (const [k, v] of Object.entries(e)) {
  if (typeof v === 'boolean') {
    bonuses[k] = bonuses[k] || v;
  } else if (typeof v === 'number' && k in bonuses) {
    bonuses[k] += v;
  }
}
```

---

### BUG-005: window._passiveNodesMap — race condition при старте страницы

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js, state.js — использование window._passiveNodesMap

**Описание:**
`window._passiveNodesMap` устанавливается в `passives_ui.js` строка 18: `window._passiveNodesMap = PASSIVE_NODES_MAP;`. Это происходит при импорте модуля `passives_ui.js`. В `state.js` и `combat.js` в цикле агрегации: `if (!nodeMap) break;` — при отсутствии карты все бонусы становятся нулевыми без предупреждения. Если `getStats()` вызывается до того, как `passives_ui.js` был импортирован (например, из другого модуля при инициализации), все пассивные бонусы в `getStats()` будут нулями. Порядок импорта в `main.js` критичен, но нигде не задокументирован и не защищён.

**Ожидаемое поведение:**
Пассивные бонусы должны быть доступны независимо от порядка загрузки модулей.

**Шаги воспроизведения:**
Вызвать `getStats()` до отображения экрана Passives (до импорта passives_ui.js); бонусы DR, HP% и прочие будут нулевыми.

**Рекомендация:**
Вынести `PASSIVE_NODES_MAP` в отдельный файл `passives_data.js` без зависимостей, который могут импортировать и `state.js`, и `combat.js` напрямую. Это устраняет и race condition, и необходимость в `window._passiveNodesMap`.

---

### BUG-006: Количество нод на класс — 18 вместо заявленных 20

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** passives.js — PASSIVE_NODES

**Описание:**
Комментарий в заголовке файла гласит: `88 nodes: 8 Universal + 20 per class`. Фактически каждый класс содержит только 18 нод: 10 minor + 6 major + 2 keystone = 18. Суммарно нод: 8 + 18×4 = 80, не 88.

**Ожидаемое поведение:**
Либо комментарий должен отражать реальное число (80 нод: 8 Universal + 18 per class), либо каждому классу нужно добавить по 2 недостающих ноды.

**Шаги воспроизведения:**
Подсчёт: `grep -c "classRestriction: 'pyromancer'" passives.js` → 18 (не 20).

**Рекомендация:**
Исправить комментарий в строке 3: `* 80 nodes: 8 Universal + 18 per class (4 classes)` — или добавить по 2 minor-ноды на класс для достижения заявленных 20.

---

## Закрытые баги

_(пока нет)_

---

## Статистика

- Всего найдено: 6
- Открыто: 6
- Закрыто: 0
