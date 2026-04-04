# Grimoire — Class Spell UX

## Description
Extends the grimoire screen to display class-locked spells with visual differentiation, adds an elemental icon to the HUD after class selection, and adds a spell filter toggle to the right page.

## Assumptions
- `ASSUMPTION: state.class` хранит строку `'pyromancer' | 'stormcaller' | 'tidecaster' | 'geomancer' | null`.
- `ASSUMPTION: SPELLS_DATA[id].classRequired` — строка класса или `null` для универсальных спеллов.
- `ASSUMPTION: SPELLS_DATA[id].unlockLevel` — минимальный уровень для разблокировки.
- `ASSUMPTION: getState().level` доступен в grimoire.js.
- Фильтр "All / My Class" хранится в локальной переменной `poolFilter` в grimoire.js (не в state, не персистируется — сбрасывается при открытии экрана).

---

## 1. Классификация состояний спелла в пуле

Каждый спелл в пуле попадает в одно из четырёх состояний на основе `playerClass` и `playerLevel`:

| State ID | Условие | CSS-класс | Описание |
|---|---|---|---|
| `available` | (classRequired === null ИЛИ classRequired === playerClass) И unlockLevel <= playerLevel | (нет модификатора) | Спелл доступен, стандартный вид |
| `locked-level` | classRequired === playerClass И unlockLevel > playerLevel | `spell-locked-level` | Свой класс, но уровень не достигнут |
| `locked-class` | classRequired !== null И classRequired !== playerClass | `spell-locked-class` | Чужой класс |
| `no-class` | playerClass === null И classRequired !== null | `spell-locked-class` | Класс ещё не выбран, все классовые спеллы — locked-class |

Порядок проверки в JS: сначала classRequired, потом unlockLevel.

---

## 2. HTML-изменения

### 2.1 HUD — элементальный значок рядом с именем

**Файл**: `index.html`, блок `.location-hud` (строки 92-97).

**До:**
```html
<div class="location-hud">
  <span id="loc-hud-name" class="loc-hud-name">Mage</span>
  <span id="loc-hud-level" class="loc-hud-level">Lv. 1</span>
  <span id="loc-hud-gold" class="loc-hud-gold">🪙 0</span>
  <div class="hud-buffs" id="hud-buffs"></div>
</div>
```

**После — добавить `hud-class-badge` между именем и уровнем:**
```html
<div class="location-hud">
  <span id="loc-hud-name" class="loc-hud-name">Mage</span>
  <span id="loc-hud-class-badge" class="hud-class-badge" style="display:none"></span>
  <span id="loc-hud-level" class="loc-hud-level">Lv. 1</span>
  <span id="loc-hud-gold" class="loc-hud-gold">🪙 0</span>
  <div class="hud-buffs" id="hud-buffs"></div>
</div>
```

- `hud-class-badge` скрыт по умолчанию (`display:none`).
- JS показывает его сразу после выбора класса и при загрузке, если `state.class !== null`.
- Содержимое элемента генерируется JS: символ элемента + аббревиатура класса (см. раздел JS-логика).

### 2.2 Гримуар — фильтр-переключатель на правой странице

**Файл**: `index.html`, блок `.grimoire-page-right` (строки 262-271).

**До:**
```html
<div class="grimoire-page grimoire-page-right">
  <div class="grimoire-page-title">Available Spells</div>
  <div class="grimoire-spell-pool" id="grimoire-spell-pool">
    <!-- Генерируется через JS -->
  </div>
  <div class="grimoire-page-lore">
    Arsenal of available spells. Each new ability<br>awakens as your power grows.
  </div>
</div>
```

**После — добавить `grimoire-filter-bar` под заголовком страницы:**
```html
<div class="grimoire-page grimoire-page-right">
  <div class="grimoire-page-title">Available Spells</div>

  <div class="grimoire-filter-bar" id="grimoire-filter-bar">
    <button class="grimoire-filter-btn grimoire-filter-btn-active" data-filter="all" id="filter-btn-all">All</button>
    <button class="grimoire-filter-btn" data-filter="myclass" id="filter-btn-myclass">My Class</button>
  </div>

  <div class="grimoire-spell-pool" id="grimoire-spell-pool">
    <!-- Генерируется через JS -->
  </div>
  <div class="grimoire-page-lore">
    Arsenal of available spells. Each new ability<br>awakens as your power grows.
  </div>
</div>
```

- `filter-btn-myclass` скрыт через CSS если класс не выбран (`state.class === null`). JS добавляет класс `grimoire-filter-bar--no-class` на `#grimoire-filter-bar`, CSS скрывает `filter-btn-myclass` в этом состоянии.

---

## 3. CSS-классы

### 3.1 Locked — чужой класс

```css
/* Спелл чужого класса: сильно затенён, замок поверх иконки */
.spell-pool-card.spell-locked-class {
  opacity: 0.4;
  filter: grayscale(80%);
  cursor: default;
  pointer-events: none; /* не перетаскивается, не кликается */
}

.spell-pool-card.spell-locked-class:hover {
  transform: none;
  box-shadow: none;
}
```

Hover отключён через `pointer-events: none`. Tooltip реализуется через `title` атрибут — он читается браузером даже при `pointer-events: none`, поэтому tooltip работает. Однако для более стильного кастомного tooltip (см. раздел Notes) `pointer-events` можно оставить `all`, убрав только drag и click в JS.

**Решение**: оставить `pointer-events: none` на карточке. Tooltip через нативный `title` — этого достаточно для MVP.

### 3.2 Locked — свой класс, уровень не достигнут

```css
/* Спелл своего класса: чуть светлее, иконка замка, но "родной" */
.spell-pool-card.spell-locked-level {
  opacity: 0.6;
  filter: grayscale(40%);
  cursor: default;
  pointer-events: none;
}

.spell-pool-card.spell-locked-level:hover {
  transform: none;
  box-shadow: none;
}
```

### 3.3 Оверлей с замком поверх иконки

Замок рендерится JS как дополнительный `<div class="pool-card-lock-overlay">` внутри карточки, поверх `.pool-card-icon`.

```css
/* Контейнер иконки должен быть position:relative (добавить в существующий .pool-card-icon) */
.pool-card-icon {
  position: relative; /* добавить к существующему правилу */
}

/* Оверлей замка — абсолютный, поверх иконки */
.pool-card-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
  font-size: 1.6em;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}
```

Символ замка: `🔒` (unicode lock). Если нужен более минималистичный вариант — `⊘` или ASCII `[X]`. Рекомендую `🔒` — узнаваемо без объяснений.

### 3.4 Элементальные рамки для доступных спеллов своего класса

Рамка добавляется только на спеллы с `classRequired !== null` (классовые) в состоянии `available`. Универсальные спеллы рамки не получают — у них нет класса.

```css
/* Базовый элемент: цветная рамка снизу утолщается, добавляется тонкая боковая */
.spell-pool-card.spell-element-fire {
  border-color: rgba(231, 76, 60, 0.5);
  border-bottom-color: #e74c3c;
  border-bottom-width: 3px;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.15), inset 0 -2px 6px rgba(231, 76, 60, 0.08);
}

.spell-pool-card.spell-element-fire:hover {
  border-color: rgba(231, 76, 60, 0.8);
  box-shadow: 0 0 16px rgba(231, 76, 60, 0.35);
}

.spell-pool-card.spell-element-air {
  border-color: rgba(52, 152, 219, 0.5);
  border-bottom-color: #3498db;
  border-bottom-width: 3px;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.15), inset 0 -2px 6px rgba(52, 152, 219, 0.08);
}

.spell-pool-card.spell-element-air:hover {
  border-color: rgba(52, 152, 219, 0.8);
  box-shadow: 0 0 16px rgba(52, 152, 219, 0.35);
}

.spell-pool-card.spell-element-water {
  border-color: rgba(26, 188, 156, 0.5);
  border-bottom-color: #1abc9c;
  border-bottom-width: 3px;
  box-shadow: 0 0 8px rgba(26, 188, 156, 0.15), inset 0 -2px 6px rgba(26, 188, 156, 0.08);
}

.spell-pool-card.spell-element-water:hover {
  border-color: rgba(26, 188, 156, 0.8);
  box-shadow: 0 0 16px rgba(26, 188, 156, 0.35);
}

.spell-pool-card.spell-element-earth {
  border-color: rgba(230, 126, 34, 0.5);
  border-bottom-color: #e67e22;
  border-bottom-width: 3px;
  box-shadow: 0 0 8px rgba(230, 126, 34, 0.15), inset 0 -2px 6px rgba(230, 126, 34, 0.08);
}

.spell-pool-card.spell-element-earth:hover {
  border-color: rgba(230, 126, 34, 0.8);
  box-shadow: 0 0 16px rgba(230, 126, 34, 0.35);
}
```

### 3.5 HUD — class badge

```css
.hud-class-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 10px;
  font-family: var(--font-ui);
  font-size: var(--fs-2xs);
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid transparent;
  /* цвет задаётся JS через inline style или модификаторы */
}

/* Цвет по элементу */
.hud-class-badge.badge-fire   { color: #e74c3c; border-color: rgba(231,76,60,0.4);  background: rgba(231,76,60,0.08); }
.hud-class-badge.badge-air    { color: #3498db; border-color: rgba(52,152,219,0.4); background: rgba(52,152,219,0.08); }
.hud-class-badge.badge-water  { color: #1abc9c; border-color: rgba(26,188,156,0.4); background: rgba(26,188,156,0.08); }
.hud-class-badge.badge-earth  { color: #e67e22; border-color: rgba(230,126,34,0.4); background: rgba(230,126,34,0.08); }
```

### 3.6 Фильтр-переключатель в гримуаре

```css
.grimoire-filter-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  justify-content: flex-end;
}

.grimoire-filter-btn {
  font-family: var(--font-ui);
  font-size: var(--fs-2xs);
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 3px;
  border: 1px solid rgba(201, 168, 76, 0.2);
  background: transparent;
  color: rgba(138, 122, 106, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.grimoire-filter-btn:hover {
  border-color: rgba(201, 168, 76, 0.5);
  color: rgba(201, 168, 76, 0.9);
}

.grimoire-filter-btn.grimoire-filter-btn-active {
  border-color: rgba(201, 168, 76, 0.6);
  color: var(--color-gold);
  background: rgba(201, 168, 76, 0.08);
  text-shadow: var(--glow-gold);
}

/* Скрываем кнопку My Class когда класс не выбран */
.grimoire-filter-bar--no-class #filter-btn-myclass {
  display: none;
}
```

---

## 4. JS-логика для grimoire.js

### 4.1 Новые переменные

```
// Фильтр пула: 'all' | 'myclass'
let poolFilter = 'all';
```

Сбрасывается в `'all'` в начале `initGrimoire()`.

### 4.2 Функция классификации спелла

Добавить чистую функцию `getSpellPoolState(spell, playerClass, playerLevel)`:

- Возвращает одну из строк: `'available'`, `'locked-level'`, `'locked-class'`
- Логика:
  1. Если `spell.classRequired` не null И `spell.classRequired !== playerClass` → `'locked-class'`
  2. Если `spell.unlockLevel > playerLevel` → `'locked-level'`
  3. Иначе → `'available'`
- Случай `playerClass === null`:
  - Шаг 1 сработает для всех классовых спеллов (любой classRequired !== null), они уйдут в `'locked-class'`
  - Универсальные (classRequired === null) пройдут дальше к шагу 2

### 4.3 Изменения в renderSpellPool()

Текущий код рендерит только `unlocked` спеллы (результат `getUnlockedSpells()`). Нужно изменить источник данных.

**Новый источник**: все спеллы (и классовые, и универсальные) из `SPELLS_DATA`, отсортированные или сгруппированные.

**Порядок рендера спеллов в пуле** (по убыванию доступности):
1. Доступные (`available`) — все элементы своего класса + универсальные, разблокированные
2. Заблокированные по уровню (`locked-level`) — своего класса, уровень ещё не достигнут
3. Заблокированные по классу (`locked-class`) — чужие классы, группируются вместе, внутри группы по классам (Pyromancer, Stormcaller, Tidecaster, Geomancer)

**Фильтр `poolFilter === 'myclass'`**: показывать только спеллы где `classRequired === null ИЛИ classRequired === playerClass`. Все `locked-class` скрываются. `locked-level` своего класса остаются — игрок видит, что его ждёт.

**Для каждой карточки** в зависимости от `spellState`:

| spellState | CSS-классы добавляются | lock overlay | title атрибут | drag | click |
|---|---|---|---|---|---|
| `available`, classRequired = null | (нет element-класса) | нет | стандартный | да | да |
| `available`, classRequired !== null | `spell-element-{element}` | нет | стандартный | да | да |
| `locked-level` | `spell-locked-level`, `spell-element-{element}` | да, с `🔒` | "Unlocks at level X" | нет | нет |
| `locked-class` | `spell-locked-class` | да, с `🔒` | "Requires [ClassName]" | нет | нет |

Элемент для `spell-element-*` берётся из маппинга класса на элемент:
```
pyromancer → 'fire'
stormcaller → 'air'
tidecaster → 'water'
geomancer → 'earth'
```

Маппинг определить как константу `CLASS_ELEMENT` в grimoire.js.

### 4.4 Функция updateHudClassBadge()

Новая функция, вызывается:
- При инициализации гримуара (`initGrimoire`)
- После выбора класса в Awakening screen
- При загрузке игры (вместе с остальным HUD)

Логика:
1. Получить `state.class`
2. Если `null` — установить `display: none` на `#loc-hud-class-badge`, выйти
3. Определить элемент: `element = CLASS_ELEMENT[state.class]`
4. Определить символ и аббревиатуру:

| class | symbol | abbr |
|---|---|---|
| pyromancer | 🔥 | Pyro |
| stormcaller | ⚡ | Storm |
| tidecaster | 💧 | Tide |
| geomancer | ⛰ | Geo |

5. Установить innerHTML badge: `${symbol} ${abbr}`
6. Сбросить все `badge-*` классы, добавить `badge-{element}`
7. Установить `display: ''` (показать)

Экспортировать `updateHudClassBadge` или вызывать её через общий `updateHUD()` в main.js / state update flow.

### 4.5 Обработчики фильтра

В `bindGrimoireEvents()` добавить:

```
document.getElementById('filter-btn-all')?.addEventListener('click', () => {
  poolFilter = 'all';
  syncFilterButtons();
  renderSpellPool();
});

document.getElementById('filter-btn-myclass')?.addEventListener('click', () => {
  poolFilter = 'myclass';
  syncFilterButtons();
  renderSpellPool();
});
```

`syncFilterButtons()` — вспомогательная функция, снимает `grimoire-filter-btn-active` с обеих кнопок, вешает на ту, чей `data-filter === poolFilter`.

### 4.6 Состояние filter-bar при отсутствии класса

В начале `renderSpellPool()`:
```
const filterBar = document.getElementById('grimoire-filter-bar');
if (filterBar) {
  if (!state.class) {
    filterBar.classList.add('grimoire-filter-bar--no-class');
  } else {
    filterBar.classList.remove('grimoire-filter-bar--no-class');
  }
}
```

### 4.7 Drag & drop и клики на locked-спелл

Locked-карточки (`locked-level`, `locked-class`) не должны быть `draggable`, не должны реагировать на одиночный или двойной клик. Это обеспечивается двумя способами:
1. CSS `pointer-events: none` убирает все взаимодействия (самый простой путь)
2. ИЛИ в JS явно не добавлять `addEventListener` и не ставить `card.draggable = true` для locked-карточек

Рекомендую CSS `pointer-events: none` — проще и надёжнее. Tooltip через нативный `title` при этом не работает в некоторых браузерах. Если нужен гарантированный tooltip — убрать `pointer-events: none`, но в JS отдельно гвардировать обработчики через `if (spellState === 'available')`.

**Решение для MVP**: `pointer-events: none` + нативный `title`. Браузеры показывают нативный tooltip при наведении даже на `pointer-events: none` элементы в большинстве случаев. Проверить в Chrome при реализации.

---

## 5. Формат tooltip (title атрибут)

| Состояние | title |
|---|---|
| locked-class (Pyromancer) | `Requires Pyromancer` |
| locked-class (Stormcaller) | `Requires Stormcaller` |
| locked-class (Tidecaster) | `Requires Tidecaster` |
| locked-class (Geomancer) | `Requires Geomancer` |
| locked-level | `Unlocks at level X` (X = spell.unlockLevel) |
| available | `{spell.name}\n{spell.description}\nCast: {spell.castTime}s` (текущий формат) |

Имена классов в tooltip — с заглавной буквы, полные (не аббревиатуры).

---

## 6. Элементы таблицы (сводная)

| Element | Type | Parent | ID / Class | States |
|---|---|---|---|---|
| `hud_class_badge` | span | `.location-hud` | `#loc-hud-class-badge`, `.hud-class-badge` | hidden (no class), `.badge-fire/air/water/earth` |
| `filter_bar` | div | `.grimoire-page-right` | `#grimoire-filter-bar`, `.grimoire-filter-bar` | default, `.grimoire-filter-bar--no-class` |
| `filter_btn_all` | button | `#grimoire-filter-bar` | `#filter-btn-all` | default, `.grimoire-filter-btn-active` |
| `filter_btn_myclass` | button | `#grimoire-filter-bar` | `#filter-btn-myclass` | default, `.grimoire-filter-btn-active`, hidden (no class) |
| `spell_pool_card` | div | `#grimoire-spell-pool` | `.spell-pool-card` | + `.spell-locked-class`, `.spell-locked-level`, `.spell-element-fire/air/water/earth` |
| `pool_card_lock_overlay` | div | `.pool-card-icon` | `.pool-card-lock-overlay` | показывается только на locked-карточках |

---

## 7. States & Behavior

### Filter bar
- **Default (All)**: `filter-btn-all` активен. Все спеллы видны: available + locked-level + locked-class (в конце, приглушённые).
- **My Class**: `filter-btn-myclass` активен. Видны только `classRequired === null` И `classRequired === playerClass`. Чужие классы скрыты полностью.
- **No class**: `filter-btn-myclass` скрыт. Только кнопка All видна. При сбросе класса (respec): `poolFilter` → `'all'`.

### Spell cards — locked states
- **locked-class**: opacity 0.4, grayscale 80%, замок поверх иконки, нет hover-эффекта, нет drag, нет клика, tooltip "Requires X".
- **locked-level**: opacity 0.6, grayscale 40%, замок поверх иконки, нет hover-эффекта, нет drag, нет клика, tooltip "Unlocks at level X". Имеет элементальную рамку (`.spell-element-*`) — игрок видит, к какому классу спелл относится.
- **available** (классовый): стандартный hover + drag + клик, плюс цветная элементальная рамка.
- **available** (универсальный): стандартный вид без элементальной рамки (как сейчас).

### HUD badge
- **No class** (`state.class === null`): `display: none`.
- **Class selected**: показан, символ + аббревиатура, цвет элемента. Обновляется немедленно после выбора класса.

---

## 8. Transitions
- Выбор класса на Awakening screen → `updateHudClassBadge()` вызывается сразу → badge появляется (fade in через CSS `opacity` transition 0.3s).
- Respec в инвентаре → `state.class = null` → `updateHudClassBadge()` → badge скрывается → `poolFilter = 'all'` → `renderSpellPool()`.

---

## 9. Notes for Developer

1. `getUnlockedSpells()` в state.js сейчас возвращает только разблокированные спеллы. Для нового пула нужна функция `getAllSpells()` или прямое обращение к `Object.values(SPELLS_DATA)` — обсудить с Coder какой вариант предпочтительнее.
2. Маппинг `CLASS_ELEMENT` лучше вынести в `state.js` рядом с `CLASS_DATA` и импортировать в `grimoire.js` — не дублировать.
3. `pool-card-icon` нуждается в добавлении `position: relative` в существующем правиле CSS — иначе `pool-card-lock-overlay` с `position: absolute` будет позиционироваться относительно карточки, а не иконки.
4. Символы классов в badge (🔥⚡💧⛰) — проверить рендеринг шрифта. Если emoji нестабильны — заменить на unicode без emoji variation selector: U+1F525, U+26A1, U+1F4A7, U+26F0. Фоллбэк: текстовые аббревиатуры без символов.
5. Порядок отображения locked-class спеллов: все спеллы одного чужого класса идут вместе. Внутри — по `unlockLevel` по возрастанию. Это помогает игроку "читать" дерево спеллов чужого класса и осознанно принимать решение о respec.
6. `bindGrimoireEvents()` вызывается один раз при старте — обработчики фильтра добавлять туда же.
7. При `poolFilter === 'myclass'` и `state.class === null` — показывать только универсальные спеллы (classRequired === null), как если бы фильтр был "All" но без классовых. Это edge case до выбора класса.

---

## 10. Notes for Art Director

- Замок на картах (`pool-card-lock-overlay`): эмодзи 🔒 достаточно для MVP. В финальной версии — пиксельный замок 24x24px в стиле игры, полупрозрачный, без тени.
- HUD badge: очень маленький элемент (высота ~18px), рядом с именем. Не должен перегружать HUD. Рекомендую без символа в финале, только цветной кружок 8x8px с цветом элемента — минимализм. Решение за AD.
- Элементальные рамки карточек: тонкие (border-bottom 3px), не кричащие. Общий цвет карточки остаётся тёмным. Только рамка даёт класс. Не делать фоновый градиент цветом элемента.
- Locked-class карточки в конце пула визуально "уходят в туман" — grayscale + opacity. Эффект должен передавать "недостижимость", но не раздражать. Не делать их полностью невидимыми.

---

## Open Questions for Product Owner

1. Нужен ли счётчик "X/8 class spells unlocked" над пулом для мотивации прогрессии?
2. Нужна ли анимация появления класса в HUD (flash эффект) при первом выборе класса?
3. Показывать ли locked-class спеллы вообще до выбора класса (pre-class state)? Сейчас — да, все показываются как locked-class, что teases контент. Альтернатива — скрыть полностью до level 3.
