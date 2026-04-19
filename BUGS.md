# BUGS.md — Трекер багов

## Активные баги

### BUG-001: passiveDamageReduction (U5, T10) не применяется в бою

**Тип:** критический
**Статус:** закрыт
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

**Примечание:** Исправление уже внесено в текущую версию combat.js (строка ~1204 использует `aggregatePassiveBonuses` с прямым импортом).

---

### BUG-002: getDefaultState() возвращает version: 2, но реальная версия схемы — 3

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** state.js — getDefaultState(), строка 1047

**Описание:**
`getDefaultState()` возвращает `version: 2`, хотя схема уже включает поле `passives` (версия 3). При создании нового сейва записывается `version: 2`. При следующей загрузке страницы сейв снова проходит ветку миграции `v3` (строка ~1309: `if (!_state.version || _state.version < 3)`), что создаёт лишний проход и может вызвать неожиданные эффекты при добавлении версии 4.

**Ожидаемое поведение:**
`getDefaultState()` должен возвращать `version: 3`.

**Шаги воспроизведения:**
1. Очистить localStorage, создать нового персонажа.
2. `JSON.parse(localStorage.getItem('veyra_player')).version` → вернёт `2`.
3. Перезагрузить страницу — снова пройдёт ветка миграции passives.

**Рекомендация:**
В `getDefaultState()` изменить `version: 2` на `version: 3`.

---

### BUG-003: Phoenix Protocol (P-K2) реализован в combat.js — ЗАКРЫТ

**Тип:** средний
**Статус:** закрыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — performEnemyAttack()

**Примечание:** Баг был зафиксирован, но уже исправлен: строки ~1320-1336 combat.js содержат полную реализацию Phoenix Protocol с `battleState._phoenixUsed` флагом.

---

### BUG-004: aggregatePassiveBonuses — флаги специфических нод не собираются

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** passives.js — aggregatePassiveBonuses(), строка 633

**Описание:**
Объект `bonuses` инициализируется только с известными на момент написания ключами. Многие эффекты нод (obsidianArmor, forgeShield, chainReaction, conflagration, eyeOfStorm, supercell, jetStream, ballLightningEcho, stormShield, magneticField, frozenGround, wellspring, glacialArmor, drown, tidalSurge, absoluteZero, leviathan, tectonicPlates, earthquake, magmaCore, landslide, livingMountain, unbreakable, seismicWrath, perpetualStorm, lightningRod и другие) не добавлены ни в начальный объект `bonuses`, ни в цикл суммирования. Combat.js вынужден напрямую читать `window._passiveNodesMap` для каждого такого флага, что ломает единственный источник истины и усиливает race condition (BUG-005).

**Ожидаемое поведение:**
`aggregatePassiveBonuses(['G14'])` должен вернуть объект с ключом `obsidianArmor: true`.

**Шаги воспроизведения:**
1. Разблокировать G14 (Obsidian Armor).
2. `aggregatePassiveBonuses(['G14'])` — ключ `obsidianArmor` отсутствует в результате.
3. Бонус фактически не применяется в бою.

**Рекомендация:**
Добавить все флаговые эффекты в `bonuses` и цикл, либо применить универсальное копирование:
```js
for (const [k, v] of Object.entries(e)) {
  if (k in bonuses) {
    if (typeof v === 'boolean') bonuses[k] = bonuses[k] || v;
    else if (typeof v === 'number') bonuses[k] += v;
  } else {
    // Новый ключ — добавляем с типовым начальным значением
    bonuses[k] = v;
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
`window._passiveNodesMap` устанавливается в `passives_ui.js`. В `state.js::getStats()` и в нескольких местах `combat.js` используется паттерн `const nodeMap = window._passiveNodesMap || null; if (!nodeMap) break;`. Если `getStats()` вызывается до импорта `passives_ui.js`, все пассивные бонусы в статах равны нулю. Порядок инициализации критичен, но нигде не защищён.

**Ожидаемое поведение:**
Пассивные бонусы доступны немедленно, независимо от порядка загрузки модулей.

**Рекомендация:**
Вынести `PASSIVE_NODES_MAP` в `passives_data.js` без зависимостей. Это устранит race condition и `window` глобал.

---

### BUG-006: Комментарий к PASSIVE_NODES указывает 88 нод вместо реальных 80

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** passives.js, строка 3

**Описание:**
Комментарий: `80 nodes: 8 Universal + 20 per class`. Фактически: 10 minor + 6 major + 2 keystone = 18 per class. Итого 8 + 18×4 = 80 нод. Комментарий неверен.

**Рекомендация:**
Исправить на `80 nodes: 8 Universal + 18 per class (4 classes × 18)`.

---

### BUG-007: Infinite recursion в scheduleNextCast при гримуаре из одних пустых слотов

**Тип:** критический
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — scheduleNextCast(), строка ~388

**Описание:**
`initBattle()` требует минимум 3 заполненных слота и возвращает `false` при меньшем количестве. Однако в `battleState.grimoire` записывается `activeSlots = state.grimoire.filter(id => id !== null)` — только непустые слоты. При гримуаре из 3+ корректных слотов это работает. Но если все 3 слота содержат спеллы **несовместимого класса** (classRestriction !== state.classType), `scheduleNextCast()` входит в бесконечную синхронную рекурсию:
```
scheduleNextCast() → spell.classRestriction mismatch → advanceGrimoire() → scheduleNextCast() → ...
```
Это вызывает Stack Overflow. Такая ситуация реальна: игрок мог сохранить гримуар с заклинаниями другого класса до выбора класса, а после Awakening гримуар не полностью валидируется.

**Ожидаемое поведение:**
Если все слоты заняты несовместимыми спеллами — бой должен прерваться с сообщением об ошибке, а не падать.

**Шаги воспроизведения:**
1. До выбора класса заполнить гримуар огненными спеллами (если доступны через devpanel).
2. Выбрать класс Stormcaller.
3. Войти в бой (devpanel может позволить это сделать с несовместимыми слотами).
4. Stack Overflow в консоли.

**Рекомендация:**
Добавить счётчик пропусков в `scheduleNextCast()`:
```js
function scheduleNextCast(skipCount = 0) {
  if (!battleState.active) return;
  if (skipCount >= battleState.grimoire.length) {
    // Все слоты пропущены — завершить бой как timeout
    endBattle('timeout');
    return;
  }
  // ...existing code...
  if (/* wrong class */) {
    advanceGrimoire();
    battleState.castTimeout = setTimeout(() => {
      if (battleState.active) scheduleNextCast(skipCount + 1);
    }, CAST_GAP);
    return;
  }
  // ...
}
```

---

### BUG-008: useConsumable удаляет ключ из inventory при count=0, что ломает проверки

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** state.js — useConsumable(), строка ~1786

**Описание:**
После использования расходника при достижении `count = 0` выполняется `delete state.inventory[itemId]`. Это создаёт несоответствие с `getDefaultState()`, где все расходники присутствуют с `count: 0`. После удаления ключа:
- `addItemToInventory(itemId)` вернёт `false` (строка ~1514: `hasOwnProperty` вернёт `false`).
- При получении того же расходника через Daily Login (строка ~1617) используется `state.inventory[itemId] = (state.inventory[itemId] || 0) + 1` — это сработает корректно, но создаёт несогласованное состояние.
- Магазин `buyItem()` (строка ~1836) использует `if (!state.inventory[itemId]) state.inventory[itemId] = 0` — это исправляет проблему для магазина, но не для `addItemToInventory`.

**Ожидаемое поведение:**
Расходники никогда не должны удаляться из инвентаря; при исчерпании count остаётся 0, а не ключ удаляется.

**Шаги воспроизведения:**
1. Купить 1x Mana Elixir.
2. Использовать его.
3. `addItemToInventory('mana_elixir')` теперь вернёт `false`.
4. Если Mana Elixir выпадет как лут — предмет не добавится в инвентарь.

**Рекомендация:**
В `useConsumable()` убрать `delete`:
```js
state.inventory[itemId]--;
// НЕ удалять ключ — просто оставить 0
// if (state.inventory[itemId] <= 0) { delete state.inventory[itemId]; } // УБРАТЬ
```

---

### BUG-009: Tower — continueRun расходует попытку повторно при перезагрузке страницы

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** tower.js — startTowerRun(), _renderTowerScreen()

**Описание:**
`startTowerRun()` инкрементирует `state.tower.attemptsToday++` при старте новой попытки. Кнопка "CONTINUE RUN" на экране башни вызывает `_startFloor(nextFloor)` напрямую, не расходуя попытку — это правильно. Однако если игрок закрыл вкладку находясь **на экране гримуара** между этажами башни (run существует, currentFloor уже обновлён), то при возврате в игру `restoreTowerSummary()` показывает summary только если `floorsCleared > 0`. Если игрок был на гримуаре для floor 2 (floorsCleared=1), summary покажется корректно. Но если игрок закрыл страницу **во время** `startTowerRun()` (после `attemptsToday++`, но до начала боя), попытка будет потеряна навсегда.

**Ожидаемое поведение:**
Попытка должна считаться потраченной только после первого урона в бою (или после выхода из гримуара на межэтажный экран).

**Шаги воспроизведения:**
1. Войти в башню, нажать "Enter".
2. Закрыть вкладку сразу после перехода на экран гримуара (до нажатия "Begin Battle").
3. Открыть игру — попытка потрачена, но ни один этаж не пройден.

**Рекомендация:**
Инкрементировать `attemptsToday` не при `startTowerRun()`, а при первом успешном запуске боя (в колбеке "Begin Battle" из `_startFloor()`).

---

### BUG-010: Tooltip инвентаря не скрывается при смене экрана

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** inventory.js — hideTooltip()

**Описание:**
`hideTooltip()` вызывается только внутри `renderHomeScreen()` и по клику вне ячейки / Escape. Если игрок открыл tooltip предмета, затем нажал кнопку навигации (например, переход на карту через HUD), tooltip с классом `visible` остаётся в DOM. При возврате на screen-home tooltip отображается над другим контентом до следующего рендера.

**Ожидаемое поведение:**
Tooltip скрывается при любом уходе с экрана инвентаря.

**Шаги воспроизведения:**
1. Открыть инвентарь, кликнуть на предмет — появится tooltip.
2. Нажать Back на карту (через HUD или кнопку).
3. Вернуться в инвентарь — старый tooltip будет виден поверх интерфейса до рендера.

**Рекомендация:**
В `main.js::navigateTo()` или в хуке ухода с `screen-home` добавить вызов `hideTooltip()`. Либо вызывать `hideTooltip()` в начале `renderHomeScreen()` (уже делается) — но дополнительно экспортировать и вызывать при `goToLocation()`.

---

### BUG-011: Grimoire — фильтр "All" показывает универсальные спеллы классовому игроку

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** grimoire.js — renderSpellPool(), строка ~330

**Описание:**
В `renderSpellPool()` есть явная логика:
```js
// Если класс выбран — скрываем универсальные спеллы (classRestriction: null)
if (playerClass && spell.classRestriction === null) return;
```
Это означает, что при выбранном классе универсальные спеллы (arcane_bolt, arcane_barrage, mana_shield, focus, shadow_bolt, void_eruption) **никогда** не отображаются в пуле — ни при фильтре "All", ни при "My Class". Игрок лишается доступа к 6 универсальным спеллам после Awakening. При этом эти спеллы могут оставаться в гримуаре (помечаются как "Wrong class" ошибочно — они не wrong class, у них `classRestriction: null`).

**Ожидаемое поведение:**
Универсальные спеллы должны быть доступны всем классам. Фильтр "All" должен показывать их наряду с классовыми.

**Шаги воспроизведения:**
1. Выбрать любой класс (Awakening level 3+).
2. Открыть гримуар — Arcane Bolt, Focus и остальные универсальные спеллы исчезли.
3. Если они были в слотах — помечены красным "Wrong class".

**Рекомендация:**
Убрать блок фильтрации универсальных спеллов после Awakening (строки ~329-331 grimoire.js):
```js
// УДАЛИТЬ этот блок:
if (playerClass && spell.classRestriction === null) return;
```
Универсальные спеллы уже корректно отфильтрованы `getSpellPoolState()` — там они возвращают `'available'` для любого класса.

---

### BUG-012: XP и золото начисляются дважды при победе над башенным врагом (tower + обычный endBattle)

**Тип:** критический
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — endBattle(), tower.js — claimRewards()

**Описание:**
При `_isTowerCombat === true` функция `endBattle()` правильно пропускает начисление наград (строки ~1367-1391). Награды должны начисляться только через `tower.js::claimRewards()`. Однако XP-врагов башни (`xpReward: 0`, `goldReward: {min:0, max:0}`) не влияют на это — правильно. Реальная проблема: `state.combat.fightsToday++` **не инкрементируется** для башенных боёв. Это означает, что ежедневный лимит обычных боёв (FIGHTS_LIMIT = 5) не учитывает башенные бои, что потенциально выгодно, но ломает ожидаемую механику если дизайн предполагает общий счётчик.

Отдельная проблема: `tickBuffs()` не вызывается после башенного боя (строки ~1456-1458 только в ветке обычного боя), что означает активные баффы (mana_elixir, crystal_fortune) не тикают в башне и не истекают — это потенциальный эксплойт.

**Ожидаемое поведение:**
Баффы должны тикать после каждого боя независимо от контекста.

**Шаги воспроизведения:**
1. Использовать Mana Elixir (3 боя).
2. Пройти 3 этажа башни.
3. Проверить `state.buffs.mana_surge.combatsLeft` — всё ещё 3, не уменьшилось.

**Рекомендация:**
В `endBattle()`, в ветке `_isTowerCombat`, добавить `tickBuffs()` перед `saveState()`.

---

### BUG-013: Arcane Barrage не проверяет win после нанесения урона каждым снарядом

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — performCast(), строка ~633

**Описание:**
В блоке `arcane_barrage` (3 снаряда):
```js
for (let i = 0; i < 3; i++) {
  battleState.enemyHP -= dmg;
}
// проверка win ПОСЛЕ цикла
if (battleState.enemyHP <= 0) { endBattle('win'); return; }
```
Если враг умирает от первого снаряда (`enemyHP` становится ≤ 0), оставшиеся 2 снаряда всё равно наносят урон. `battleState.enemyHP` уходит в отрицательные значения. Затем вызывается `updateEnemyHP()` и `triggerPassives()` — в том числе Combustion/Static Charge — уже на мёртвом враге. `endBattle('win')` вызывается поздно.

**Ожидаемое поведение:**
После убийства врагом первым снарядом бой должен немедленно завершаться.

**Рекомендация:**
Добавить проверку после каждого удара в цикле:
```js
for (let i = 0; i < 3; i++) {
  const dmg = calcDmg(base, true, i === 0);
  totalDmg += dmg;
  battleState.enemyHP -= dmg;
  if (battleState.enemyHP <= 0) {
    showDamageNumber(totalDmg, spell.color);
    await playSpellAnimation(spell, totalDmg);
    endBattle('win'); return;
  }
}
```

---

### BUG-014: Tempest (multi_hit_static) — Thunderstorm может триггериться внутри performCast без await на анимацию

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** combat.js — performCast(), строка ~688

**Описание:**
В блоке `multi_hit_static` (Tempest) после цикла хитов идёт явная проверка Thunderstorm:
```js
if (state.classType === 'stormcaller' && battleState.staticCharges >= 10) {
  const thunderDmg = 5 * state.level;
  battleState.enemyHP -= thunderDmg;
  showDamageNumber(thunderDmg, '#00bfff');
  ...
  battleState.staticCharges = 0;
  updateEnemyHP();
}
```
Затем после этого блока вызывается `triggerPassives()` который **снова** проверяет Thunderstorm:
```js
if (battleState.staticCharges >= 10) { ... Thunderstorm ... }
```
Поскольку после первой проверки `staticCharges` сбрасывается в 0, второй триггер не сработает. Но Tempest также вызывает `triggerPassives(totalDmg, spell)` — который для Stormcaller инкрементирует `staticCharges += 1`. После 3 хитов Tempest + 1 от triggerPassives = `staticCharges` может снова достичь 10 неожиданно, особенно если до Tempest зарядов было 7+.

**Ожидаемое поведение:**
Thunderstorm должен тригериться ровно один раз за прохождение 10 зарядов.

**Рекомендация:**
В `triggerPassives()` для Stormcaller добавить ещё один сброс: проверять `staticCharges` после каждого `+= 1` перед Thunderstorm, что уже делается. Проблема незначительная — дублирования в большинстве случаев нет.

---

### BUG-015: Migrated v3 passives — leyThreads не сохраняется если passives уже существует в сейве

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-10
**Компонент:** state.js — loadState(), строка ~1306

**Описание:**
Ветка миграции v3 (строки ~1296-1311):
```js
if (!_state.passives) {
  // Новый игрок — выдаём ретроактивные треды
  const retroThreads = Math.max(0, (_state.level || 1) - 1);
  _state.passives = { ...defaultPassives, leyThreads: retroThreads, ... };
} else {
  // Уже есть passives — просто мёрджим с defaults
  _state.passives = { ...getDefaultState().passives, ..._state.passives };
}
```
Если у игрока уже есть `passives` с `leyThreads: 5`, мёрдж сохранит это значение. **Однако** если `getDefaultState().passives` когда-либо изменит значение `leyThreads` (например, на 0), мёрдж `{ ...getDefaultState().passives, ..._state.passives }` всё равно применит сохранённое значение — это правильно. Реальный баг: если игрок находится на уровне 15 и только что добавился `passives` (т.е. раньше `!_state.passives` было true), то retroThreads = 14. Но если `passives` уже был (например, предыдущая частичная миграция сохранила пустой объект `{}`), то ретроактивные треды не выдаются — ветка `else` не вычисляет retroThreads.

**Ожидаемое поведение:**
Игрок с уровнем 15 без разблокированных нод должен иметь 14 leyThreads при первой встрече с системой пассивов.

**Шаги воспроизведения:**
1. Иметь сейв с `passives: { leyThreads: 0, unlocked: [] }` (частичная миграция).
2. Загрузить игру на уровне 10.
3. `leyThreads` останется 0 вместо 9.

**Рекомендация:**
В ветке `else` добавить проверку:
```js
_state.passives = { ...getDefaultState().passives, ..._state.passives };
// Если leyThreadsTotal === 0 и unlocked пустой — это нетронутые passives, выдаём ретро-треды
if (_state.passives.leyThreadsTotal === 0 && _state.passives.unlocked.length === 0) {
  const retroThreads = Math.max(0, (_state.level || 1) - 1);
  _state.passives.leyThreads = retroThreads;
  _state.passives.leyThreadsTotal = retroThreads;
}
```

---

### BUG-017: _schedule() вызывает async fn() синхронно — performCast не ждёт результата при fast-forward

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-18
**Компонент:** combat.js — _schedule(), scheduleNextCast(), строки 39-53 / 525-536

**Описание:**
`_schedule(fn, delay)` при `_fastForward=true` вызывает `fn()` синхронно и возвращает `null`. Проблема в том, что `scheduleNextCast` передаёт в `_schedule` **async-функцию** (`async () => { await performCast(spell); ... }`). При синхронном вызове `fn()` возвращается Promise, который никуда не сохраняется и не awaited. Все `await` внутри `performCast` резолвятся через microtask queue в непредсказуемом порядке.

В режиме `_fastForward` это не критично — `simulateBattle()` вызывается **вместо** обычного цикла `scheduleNextCast → performCast`, а не вместе с ним. Но если по какой-то причине `scheduleNextCast` вызывается при `_fastForward=true` вне `simulateBattle`, async-цепочка будет выполняться в неопределённом порядке по отношению к синхронным операциям `simulateBattle`. Это может вызвать double `endBattle` вызовы — защита `if (!battleState.active) return;` в начале `endBattle` должна это сдержать, но гарантии нет при граничных условиях (например, отмена таймеров в `simulateBattle` не убирает уже поставленные в очередь microtask-и).

**Ожидаемое поведение:**
`_schedule` при `_fastForward` должен либо игнорировать вызов (так как `simulateBattle` берёт управление), либо вызывать только синхронные функции.

**Шаги воспроизведения:**
1. Быстро нажать Skip Fight сразу после начала боя (< INTRO_DELAY = 800мс)
2. Первый `castTimeout` из `startBattleLoop` может уже стоять в очереди
3. `simulateBattle` отменяет его (`clearTimeout`), но если таймер уже сработал до `clearTimeout`, его async-тело продолжает выполняться параллельно с симуляцией.

**Рекомендация:**
В callback `_schedule` при `_fastForward` проверять `battleState.active && battleState._fastForward` перед вызовом, или переключить логику `scheduleNextCast` так, чтобы при `_fastForward` callback был no-op.

---

### BUG-018: useConsumable — инвентарь может остаться с отрицательным значением при быстром двойном клике

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-18
**Компонент:** state.js — useConsumable(), строки ~1793-1796

**Описание:**
Изменение в сессии заменило `delete state.inventory[itemId]` на `state.inventory[itemId] = 0` с защитой `if (state.inventory[itemId] < 0)`. Это правильно для сохранения совместимости. Однако граничный случай: если `useConsumable` вызывается дважды подряд до рендера (например, двойной клик), `itemId` уменьшается до -1, затем фиксируется в 0. Это не критично, но при `count === 0` кнопка должна быть заблокирована на UI-уровне — следует проверить, что UI-кнопки потребления дизейблятся при count <= 0.

**Рекомендация:**
В начале `useConsumable` добавить: `if ((state.inventory[itemId] || 0) <= 0) return null;`

---

### BUG-016: scheduleNextCast вызывает endBattle('win') при classType === null — бой не начинается

**Тип:** критический
**Статус:** закрыт
**Дата обнаружения:** 2026-04-17
**Дата закрытия:** 2026-04-18
**Компонент:** combat.js — scheduleNextCast(), несохранённые изменения

**Описание:**
В несохранённых изменениях `scheduleNextCast` получил защиту от бесконечной рекурсии (попытка починить BUG-007). Когда счётчик `skipCount + 1 >= totalSlots` (все слоты пропущены), вызывался `endBattle('win')`. Если `state.classType === null` (игрок до Awakening), **все классовые спеллы** попадали в ветку `classRestriction !== state.classType` и через `CAST_GAP * N` мс вызывался `endBattle('win')`.

**Примечание:** Исправлено в сессии 2026-04-18. `initBattle()` теперь фильтрует слоты с учётом classType (при null — все валидны), `scheduleNextCast` заменил `endBattle('win')` на `endBattle('loss')` с уведомлением.

---

### BUG-007: Бои в башне не стартуют после миграции v3→v4 — ЗАКРЫТ
**Тип:** критический
**Статус:** закрыт
**Дата обнаружения:** 2026-04-19
**Дата закрытия:** 2026-04-19
**Компонент:** src/js/combat.js::initBattle(), src/js/state.js (миграция v3→v4)

**Описание:**
Миграция v3→v4 (state.js:1283) заменяет удалённые спеллы (arcane_barrage, shadow_bolt, void_eruption) на null. В combat.js:254 `rawSlots.length < 3` возвращает false без уведомления → визуально "персонажи стоят и ничего не делают".

**Фикс:** порог в initBattle понижен до 1, добавлен showNotification на все return false. В state.js миграция теперь автозаполняет пустые слоты совместимыми спеллами из knownSpells.

---

## Закрытые баги

### BUG-001: passiveDamageReduction не применялась в бою
**Дата закрытия:** 2026-04-10
**Примечание:** Исправлено в текущей версии combat.js — `aggregatePassiveBonuses` импортируется напрямую и применяется в `performEnemyAttack()`.

### BUG-003: Phoenix Protocol (P-K2) не был реализован
**Дата закрытия:** 2026-04-10
**Примечание:** Реализован в combat.js строки 1319-1336 с флагом `_phoenixUsed`.

### BUG-016: scheduleNextCast → endBattle('win') при исчерпании skipCount
**Дата закрытия:** 2026-04-18
**Примечание:** Исправлено — обе ветки заменены на `endBattle('loss')`. `initBattle` теперь фильтрует слоты по classType (при null — все валидны), возвращает false с уведомлением если список пуст.

---

---

## Pivot prototype — initial QA (2026-04-19)

---

### BUG-019: input.js — addEventListener вызывается при каждом enterCombat, listener'ы накапливаются

**Тип:** средний
**Статус:** FIXED (2026-04-19)
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/engine/input.js — initInput(), строки 44-69

**Fix summary:** Добавлена функция `destroyInput()` (экспортируемая), которая снимает все handler'ы с container и window. `initInput()` вызывает `destroyInput()` в первой строке, поэтому повторный вызов всегда начинается с чистого листа. Handler'ы хранятся в модульном объекте `_handlers` (не анонимные лямбды) — это необходимо для корректного `removeEventListener`.

**Описание:**
`initInput(canvas, container)` вызывается из `dungeon.js::startRun()` при каждом запуске раны. Функция вызывает `addEventListener` на `container` и `window` без проверки — не существует флага "уже инициализировано" и не вызывается `removeEventListener` при очистке. `clearInput()` только сбрасывает данные, но не снимает обработчики. При третьем запуске в одной сессии на `window` будут висеть три keydown/keyup listener'а, что вызовет тройную регистрацию каждого клика и клавиши. Реальный эффект: `_tryFireball` может вызываться несколько раз за один тик при нажатии `1` — суперпозиция listener'ов на `window.addEventListener('keydown', ...)`.

**Ожидаемое поведение:**
Каждый listener добавляется ровно один раз за сессию.

**Шаги воспроизведения:**
1. Войти в Action Dungeon, умереть или экстрактиться.
2. Войти снова.
3. Нажать `1` — Fireball срабатывает дважды за тик (два projectile в одном кадре).

**Рекомендация:**
Добавить флаг `let _initialized = false;` в `input.js`. Если `true` — `initInput` пропускает привязку обработчиков. Альтернатива — хранить ссылки на handler'ы и вызывать `removeEventListener` в `clearInput()`. window-обработчики снимать при `clearInput()`:
```js
let _keydownHandler = null;
let _keyupHandler = null;
// в initInput:
if (_keydownHandler) window.removeEventListener('keydown', _keydownHandler);
_keydownHandler = (e) => { ... };
window.addEventListener('keydown', _keydownHandler);
```

---

### BUG-020: dungeon.js — seed не детерминирован: использует Date.now() вместо переданного seed

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/dungeon/dungeon.js — startRun(), строка 308

**Описание:**
ADR §2.2 требует deterministic seed для on-chain верификации. В `startRun()` seed вычисляется как `Date.now() & 0xFFFFFFFF` — это всегда уникальный нон-детерминированный seed. `enterCombat()` не передаёт seed в `startRun()`. Как следствие: (1) replay двух одинаковых ранов невозможен; (2) Abstract L2 PvP-верификация сломается, когда её будут добавлять. `combat_bridge.js::enterCombat()` также не принимает и не передаёт seed.

**Ожидаемое поведение:**
`enterCombat(biomeId, opts)` должен принимать `opts.seed` и передавать его в `startRun(seed)`. Если seed не задан — генерировать и логировать его (для последующей воспроизводимости).

**Рекомендация:**
```js
// combat_bridge.js
export function enterCombat(biomeId = 'crypt_1', opts = {}) {
  const seed = opts.seed ?? (Date.now() & 0xFFFFFFFF);
  console.log('[run] seed:', seed); // для debug
  startRun(seed);
}
// dungeon.js
export function startRun(seed) {
  _world = new World(seed ?? (Date.now() & 0xFFFFFFFF));
  ...
}
```

---

### BUG-021: entities.js — _nextId не сбрасывается между ранами, ID растёт бесконечно

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/engine/entities.js — _nextId, строка 15

**Описание:**
`_nextId` — модульная переменная, начинается с 1 и растёт при каждом `new Entity()`. `resetEntityIds()` экспортирована, но нигде не вызывается — ни в `startRun()`, ни в `stopRun()`. После 10 ранов в сессии ID у врагов/игрока продолжают расти. Практического эффекта на MVP нет (ID используются только для `ownerId` в projectile), но при масштабировании может привести к: (1) ID overflow на uint32 при очень длинной сессии (маловероятно, но возможно); (2) сложность отладки реплеев.

**Рекомендация:**
Вызвать `resetEntityIds()` в `startRun()` перед созданием мира:
```js
import { resetEntityIds } from '../engine/entities.js';
// в начале startRun():
resetEntityIds();
```

---

### BUG-022: player.js — onDestroy не вызывается из takeDamage когда hp=0, если transitionTo DEAD вызван раньше

**Тип:** критический
**Статус:** FIXED (2026-04-19)
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/engine/entities.js — takeDamage(), строка 83; src/js/dungeon/player.js — update(), строка 38

**Fix summary:** В `player.js::update()` добавлен вызов `this.onDestroy(world)` в fallback-ветке смерти (строка 50). Это обеспечивает эмит `player_died` при любом источнике урона — включая будущие DoT и прямую запись в `this.hp`. `takeDamage()` остаётся основным путём (он уже вызывал `onDestroy`); `update()` теперь служит страховкой.

**Описание:**
Смерть игрока реализована в двух местах с потенциальным конфликтом:

1. `entities.js::takeDamage()` — если `hp <= 0`: вызывает `transitionTo(DEAD)` → `onDestroy(world)`.
2. `player.js::update()` — если `hp <= 0 && this.alive`: вызывает `transitionTo(DEAD, world)` без `onDestroy`.

`EnemyActor` использует только путь через `takeDamage()` — `onDestroy` у него вызывается корректно (эмит `enemy_died`). Игрок тоже получает урон через `takeDamage()` (из `ai.js::updateEnemyAI`, строка 221). Значит первичный путь — `takeDamage` → `this.alive = false` → `onDestroy` → эмит `player_died`.

Но `player.js::update()` содержит дублирующую проверку: `if (this.hp <= 0 && this.alive) { this.alive = false; transitionTo(DEAD, world); }` — без вызова `onDestroy`. Если по какой-то причине `takeDamage` не вызывается (например, будущая DoT-логика обновляет `hp` напрямую), `player_died` не будет эмитирован и игра зависнет.

**Ожидаемое поведение:**
Смерть игрока должна всегда эмитировать `player_died` через единый путь.

**Рекомендация:**
В `player.js::update()` заменить:
```js
if (this.hp <= 0 && this.alive) {
  this.alive = false;
  this.transitionTo(ActorState.DEAD, world);
  // ДОБАВИТЬ:
  this.onDestroy(world);
}
```
Либо убрать дублирующую проверку из `update()` — она избыточна, так как `takeDamage` уже делает то же самое.

---

### BUG-023: ai.js — _lastAttackTick инициализирован 0, первая атака происходит немедленно (тик 0)

**Тип:** средний
**Статус:** FIXED (2026-04-19)
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/engine/ai.js — updateEnemyAI(), строки 218-223; src/js/dungeon/enemy.js — строка 44

**Fix summary:** В `updateEnemyAI()` при переходе из `chase` → `attack` добавлена строка `enemy._lastAttackTick = world.tick` (ai.js:200). Теперь первый удар происходит через полный `attackCooldownTicks` (90 тиков = 1.5s) после первого касания дистанции атаки. Инициализация конструктора `enemy.js:41` не изменялась — значение 0 при спавне безвредно, так как враг не переходит в `attack` state без прохождения `chase` → `attack`.

**Описание:**
`EnemyActor._lastAttackTick = 0` (строка 44 enemy.js). В `updateEnemyAI` первая атака происходит когда `world.tick - enemy._lastAttackTick >= attackCD`. На тике 90+ враг, впервые вошедший в `attack` state, немедленно бьёт (90 - 0 = 90 >= 90). Однако если игрок стартует в центре 25×18 комнаты, а враги — в углах, они достигнут игрока примерно за 1.5–2 секунды (90–120 тиков). На момент первого `attack` тик уже > 90, значит `world.tick - 0 >= 90` — атака **немедленно** без визуального замаха. Это создаёт instant-hit ощущение при первом контакте.

**Ожидаемое поведение:**
Первый удар должен происходить через `attackCooldown` тиков ПОСЛЕ перехода в `attack` state, не от тика 0.

**Рекомендация:**
В `updateEnemyAI` при переходе в `attack` state инициализировать `_lastAttackTick` текущим тиком:
```js
case 'chase':
  if (dist <= attackRange) {
    enemy.aiState = 'attack';
    enemy._lastAttackTick = world.tick; // первый удар через полный CD
    break;
  }
```

---

### BUG-024: extraction.js — TRIGGER_RANGE слишком мал, игрок должен стоять вплотную к порталу

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/dungeon/extraction.js — строки 12, 44

**Описание:**
`TRIGGER_RANGE = TILE_SIZE * 1.2 = 38.4 px`. Условие срабатывания: `dist < player.radius + portal.radius + TRIGGER_RANGE = 20 + 24 + 38.4 = 82.4 px`. При player.radius=20 и portal.radius=24 суммарный контакт = 44 px. Trigger_range добавляет 38 px сверху, итого ~2.5 тайла вокруг портала. Это разумно. Однако в `_drawPortal` в render.js портал рисуется относительно `_camX + portal.x`, а координаты портала в dungeon.js задаются через `tileToRoom(ROOM_COLS-3, ROOM_ROWS-3)` — это пиксельный центр тайла в **room-space**, но render добавляет `_camX/_camY` к этим координатам при рисовании. В `checkExtractionTrigger` проверяется расстояние `player.x - portal.x` в **room-space** (без камеры). Это правильно — симуляция вся в room-space. Проблемы нет.

**Уточнение:** после повторной проверки BUG-024 не является реальным багом в координатной системе. Однако визуально портал рисуется с двойным смещением камеры. Render вызывает `_camX + portal.x`, где `portal.x` — уже room-space координата (например ~704px для col=22). `_camX` — смещение комнаты от края viewport. Итого portal рисуется на `_camX + 704 = ~80 + 704 = 784px` по X — правильно для комнаты 25 тайлов×32px = 800px, viewport 1280px, offset (1280-800)/2 = 240px → фактически `_camX=240`. Тогда портал рисуется на `240 + 704 = 944px` по X. Это корректно.

**Вердикт:** Координатная система согласована. Пометить как ложный баг.

**Статус:** закрыт (ложный)

---

### BUG-025: dungeon.js — после смерти rAF останавливается, но _loop может выполниться ещё раз до cancelAnimationFrame

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/dungeon/dungeon.js — _showDeathScreen(), строки 516-523; _loop(), строки 418-442

**Описание:**
`_showDeathScreen()` вызывается изнутри `_processEvents()`, которая вызывается из `_loop()`. Внутри `_showDeathScreen()`:
```js
cancelAnimationFrame(_rafId);
_rafId = null;
```
Но к моменту, когда `_processEvents` вызвана, rAF уже перепланирован: `_rafId = requestAnimationFrame(_loop)` выполнен в **начале** `_loop()` (строка 421). Это означает: cancel отменяет уже следующий кадр (правильно). Но в текущем кадре после `_processEvents` ещё выполняется `draw()` и `updateDungeonHUD()` (строки 439–441). Т.е. мёртвый мир ещё один раз рендерится и обновляет HUD. Это не критично само по себе.

Реальная проблема: если `player_died` эмитируется и `_showDeathScreen()` зануляет `_rafId=null` и `_world`, а затем (на следующем микрофреймовом тике) `_loop()` всё же вызывается (race condition), в начале `_loop()` есть guard `if (!_world) return;` — это защищает. Однако `_rafId = requestAnimationFrame(_loop)` в строке 421 записывается в `_rafId` до guard'а, что означает `_rafId` уже перезаписан до того как `_showDeathScreen` пытается его отменить внутри того же кадра.

Конкретный race: `cancelAnimationFrame(_rafId)` в `_showDeathScreen` отменяет **уже следующий** scheduled frame — тот, который был запланирован в **этом** вызове `_loop` (строка 421). Это корректно. Но `draw()` и `updateDungeonHUD()` после `_processEvents()` запускаются на уже остановленном мире с `_world = null` (если `stopRun` вызывается внутри `yesBtn.click` — но он вызывается позже, при клике). Т.е. сам `stopRun` вызывается только из кнопки popup, не из `_showDeathScreen`. `_world` остаётся жив. Реального null-crash нет.

**Вердикт:** Архитектурная слабость: две точки остановки (popup button + cancelAnimationFrame в showDeathScreen). Без run-time crash, но запутывает поток управления.

**Рекомендация:**
Убрать `cancelAnimationFrame` из `_showDeathScreen`. Пусть loop продолжается — добавить guard `if (_deathShown || _extractionShown) return;` в начало _loop после `if (!_world) return;`. Единственная точка остановки — `stopRun()`.

---

### BUG-026: hud.js — mini-map координаты врагов не учитывают camera offset, рисуются в room-space

**Тип:** визуальный
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/dungeon/hud.js — _drawMinimap(), строки 172-181

**Описание:**
В `_drawMinimap` врагов рисуют по формуле `px = e.x * scaleX`. Но `scaleX = mw / world.tilemap.pixelW` — масштаб от размера **комнаты** (25×32=800px) к размеру мини-карты (150px). Это корректно для room-space координат (0..800). Игрок и враги хранят координаты в room-space (0..pixelW). Рисование `e.x * scaleX` правильно.

Однако портал и gold pickups рисуются так же, и они тоже в room-space. Согласованность соблюдена.

**Вердикт:** Мини-карта отображает координаты корректно. Ложный баг, пометить как закрыт.

**Статус:** закрыт (ложный)

---

### BUG-027: Нет Dash (Space) механики — GDD §2.1 требует, не реализовано

**Тип:** средний
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/engine/ai.js, src/js/dungeon/player.js — функция отсутствует

**Описание:**
GDD §2.1: "Hotkey Space (dash) → рывок на 4 тайла в направлении курсора. CD 4 секунды. Неуязвимость 0.3 сек." ADR §9.4 Definition of Done: "Dash (Space) работает." Полный grep по движку и dungeon показывает нулевое упоминание `Space` или `dash`. Эта механика не реализована.

**Это нормально для placeholder-версии** (ADR roadmap step 5 — только click-to-move). Но если это блокер MVP launch критерия — нужно добавить.

**Рекомендация:**
Реализовать в `updatePlayerAI()`:
```js
if (input.keysPressed.has(' ')) {
  const DASH_TILES = 4;
  const DASH_PX = DASH_TILES * TILE_SIZE;
  const dx = input.mouseX - player.x;
  const dy = input.mouseY - player.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  player.x += (dx/len) * DASH_PX; // instant teleport
  player.y += (dy/len) * DASH_PX;
  world.tilemap.resolveMove(player, {x:0, y:0}, player.radius); // de-wall
}
```

---

### BUG-028: Нет run timer в HUD для Death Wave — только отсчёт секунд, нет предупреждения на 8 мин

**Тип:** незначительный
**Статус:** открыт
**Дата обнаружения:** 2026-04-19
**Компонент:** src/js/dungeon/hud.js, src/js/dungeon/dungeon.js

**Описание:**
GDD §3.5: "Через 8 минут — уведомление `Death Wave incoming in 60s`." Таймер в HUD работает (отображает `mm:ss`), но никакого callback'а при достижении 8 минут (28800 тиков) нет. Не является блокером MVP (GDD явно говорит "для MVP можно взять hard timeout 10 минут"), но нужно добавить хотя бы hard-timeout 10 мин.

**Рекомендация:**
В `world.update()` добавить:
```js
const RUN_LIMIT_TICKS = 10 * 60 * 60; // 10 минут
if (this.tick >= RUN_LIMIT_TICKS) {
  this.events.push({ type: 'portal_reached' }); // форс-экстракция
}
```

---

## Статистика

- Всего найдено: 28
- Открыто: 17
- Закрыто: 9 (BUG-001, 003, 007, 016, 024, 026 — реальные/ложные; BUG-019, 022, 023 — fixed 2026-04-19)

---

*Последнее обновление: 2026-04-19 (BUG-019, 022, 023 fixed — pre-demo session)*
