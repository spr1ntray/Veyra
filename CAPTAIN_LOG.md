# VEYRA -- Captain's Log (Бортовой журнал)

> Этот файл -- единственный документ, нужный для восстановления контекста проекта при перезапуске.
> Дата создания: 2026-03-30

---

## 1. Что такое Veyra

**Veyra** -- dark fantasy browser RPG. Платформа: ПК браузер (HTML5 + vanilla JS + CSS, localStorage). Без фреймворков. Без бэкенда.

Игрок управляет магом: собирает заклинания в гримуар (5 слотов), бой идёт автоматически (autocast по кругу). Есть экипировка (посох/шляпа/плащ), магазин расходников, ежедневные награды, система уровней.

**GitHub**: https://github.com/spr1ntray/Veyra (remote настроен, push работает)

---

## 2. Архитектура проекта

```
/Users/sprintray/claude_soft/Veyra/
├── index.html              -- единственная HTML-страница, все экраны внутри div.screen
├── favicon.svg
├── CAPTAIN_LOG.md           -- этот файл
├── design/
│   └── progression-system.md  -- GDD системы прогрессии (max lvl 50, attribute points, новые заклинания/враги/PvP)
├── src/
│   ├── css/
│   │   ├── main.css         -- переменные, глобальные стили, шрифты
│   │   ├── map.css          -- экран карты
│   │   ├── combat.css       -- боевой экран
│   │   ├── grimoire.css     -- экран гримуара (сборка заклинаний)
│   │   ├── ui.css           -- общие UI: popup-ы, уведомления, HUD
│   │   ├── inventory.css    -- экран инвентаря
│   │   └── shop.css         -- popup магазина
│   └── js/
│       ├── main.js          -- точка входа, навигация между экранами, обработка событий
│       ├── state.js         -- единый state (localStorage), данные предметов/заклинаний/врагов, формулы
│       ├── combat.js        -- боевая система (autocast, DoT, slow, shield, lifesteal)
│       ├── grimoire.js      -- сборка гримуара (drag&drop, клик, DPS preview)
│       ├── inventory.js     -- инвентарь (сетка 4x4, пагинация, tooltip, экипировка)
│       ├── map.js           -- карта (хотспоты поверх фонового PNG)
│       ├── shop.js          -- магазин торговца
│       ├── dailylogin.js    -- ежедневные награды (7-дневный цикл)
│       └── ui.js            -- общие UI: showScreen, HUD, popup-ы, уведомления, звёзды
└── assets/generated/pixel/  -- все спрайты и иконки (pixel art стиль)
```

### Навигация по экранам

- `screen-loading` -- стартовый экран (ввод имени / кнопка Enter Veyra)
- `screen-location` -- основной экран локации (Town Square, фон + действия)
- `screen-map` -- карта мира (хотспоты: Town Square, Home)
- `screen-home` -- экран инвентаря (вешалка + сетка предметов)
- `screen-grimoire` -- сборка гримуара перед боем
- `screen-combat` -- бой (автокаст)

### Popup-ы

- `popup-daily` -- ежедневные награды
- `popup-result` -- результат боя
- `popup-levelup` -- повышение уровня
- `popup-location` -- просмотр локации (legacy)
- `popup-shop` -- магазин торговца

### Управление состоянием

Единственный source of truth -- `state.js`. Данные хранятся в localStorage под ключом `veyra_player`. State включает: имя, уровень, XP, золото, экипировку, инвентарь, гримуар, баффы, daily login, combat stats, timestamps.

---

## 3. Текущее состояние игры (на 2026-03-30)

### Что работает:
- Стартовый экран с вводом имени
- Навигация: Loading -> Location -> Map -> Inventory / Grimoire -> Combat
- Боевая система: autocast гримуара, DoT (Ignite), lifesteal (Shadow Bolt, Drain Life), slow (Frost), debuff (Void Eruption), Focus (x2), Mana Shield
- 12 заклинаний (arcane/fire/shadow/frost/utility)
- 7 врагов (Training Dummy -> Void Horror)
- Инвентарь: 12 предметов экипировки + 4 расходника
- Магазин торговца (4 расходника)
- Daily Login (7-дневный цикл)
- Система баффов (расходники дают баффы на N боёв)
- Визуальный стиль: dark fantasy, gold/brown палитра, pixel art ассеты

### Что НЕ работает / известные баги:
- **БАГ: Инвентарь не перелистывается** -- кнопки пагинации не видны или обрезаны overflow:hidden. Анализ: при стандартном инвентаре (12 предметов) сетка 4x4=16 ячеек -- пагинация скрывается (totalPages=1). Баг воспроизводится когда предметов >16 и кнопки Prev/Next обрезаются контейнером `.inv-layout { overflow: hidden }`. ТАКЖЕ: даже если пагинация видна, `.inv-right` может не вмещать и сетку и пагинацию одновременно.

### Что в документации / планах (design/progression-system.md):
- Max level расширение до 50 (новая XP формула)
- Attribute Points (STR/INT выбор при level up)
- 4 новых заклинания (Chain Lightning, Soul Siphon, Permafrost, Cataclysm)
- 3 legendary предмета
- 8 новых врагов (Cursed Golem -> Veyra final boss)
- Рeworked drop system (weighted rarity)
- PvP (async, Elo rating) -- future
- Item selling
- Migration plan для существующих сохранений

---

## 4. Git и GitHub

- **Remote**: origin -> github.com/spr1ntray/Veyra.git (настроен, работает)
- **Ветка**: main (единственная)
- **ВНИМАНИЕ**: в git remote URL содержится Personal Access Token в открытом виде -- нужно убрать из URL и использовать credential helper

### Незакоммиченные изменения (на момент начала сессии):
- `D from_user/map.png` (удалены из staging)
- ` D from_user/sqare.png, from_user/wizard.jpeg` (удалены в рабочей директории)
- ` M index.html, src/css/grimoire.css, src/css/inventory.css, src/css/main.css, src/js/inventory.js` (изменены)
- `?? design/progression-system.md` (новый файл, не отслеживается)

---

## 5. Команда агентов и распределение задач

| Агент | Зона ответственности |
|-------|---------------------|
| Game Designer | Механики, баланс, классы, прогрессия |
| Lore & Narrative Writer | Лор, диалоги, описания |
| UI/UX Designer | Интерфейсы, экраны, UX |
| Art Director | Визуальный стиль, промпты для арта |
| Asset Generator | Генерация изображений по промптам |
| Vision Reviewer | QA визуала, проверка консистентности |
| Coder | Код на JS/CSS/HTML |
| Researcher | Ресёрч технологий, конкурентов |
| Tester | Тестирование, QA, баги |
| DevOps | GitHub, деплой, CI/CD |

---

## 6. Активные задачи

### [DONE] Баг: инвентарь не перелистывается
- **Агент**: Coder
- **Суть**: Пагинация инвентаря не работала. Причина: контейнер `.inv-layout` имел `overflow: hidden`, кнопки пагинации обрезались.
- **Решение**: Заменено `overflow: hidden` на `overflow: visible` в `.inv-layout` (`src/css/inventory.css`, строка 84). `.inv-right` и `.inv-grid` уже имели `overflow: visible`.
- **Дата**: 2026-03-30

### [DONE] Система классов магов -- GDD
- **Агент**: Game Designer
- **Суть**: Разработан полноценный GDD по 4 классам магов (Pyromancer, Stormcaller, Tidecaster, Geomancer).
- **Документ**: `design/mage-classes.md`
- **Содержание**: уникальные пассивки, по 8 заклинаний на класс, элементальные взаимодействия (15% бонус/штраф), баланс-анализ DPS, архетипы гримуаров, план миграции, план имплементации.
- **Статус**: DRAFT -- ожидает review пользователя перед реализацией.
- **Дата**: 2026-03-30

### [DONE] Инвентарь — Вариант B: динамическая пагинация
- **Агент**: Coder
- **Суть**: Реализована динамическая пагинация инвентаря. При инициализации и при resize окна вычисляется доступная высота .inv-right, рассчитывается количество строк: rows = Math.floor(availableHeight / (cellSize + gap)). PAGE_SIZE = cols * rows (cols = 5). Используется ResizeObserver.
- **Файлы**: `src/js/inventory.js`, `src/css/inventory.css`
- **CSS**: .inv-right: overflow: hidden, height: 100%; .inv-grid: flex: 1, overflow: hidden, align-content: start; .inv-pagination: margin-top: auto (всегда внизу)
- **Дата**: 2026-03-30

### [DONE] XP-формула и enemy rewards — Economy v2
- **Агент**: Coder
- **Суть**: Обновлена XP-формула с `100 * level^1.3` на `110 * level^1.5`. Max level поднят с 10 до 50. Добавлено поле `classType: null` в getDefaultState(). Обновлены награды всех 7 врагов согласно таблице из progression-system.md (Training Dummy: 5 XP/1-2g, Skeleton: 12 XP/4-7g, Shadow Wraith: 15 XP/5-9g, Frost Elem: 18 XP/6-11g, Undead Knight: 25 XP/8-14g, Demon Lord: 35 XP/12-20g, Void Horror: 50 XP/18-30g).
- **Файл**: `src/js/state.js`
- **Дата**: 2026-03-30

### [DONE] Промпты для арта — 7 предметов
- **Агент**: Art Director
- **Суть**: Созданы промпты для pixel art иконок 64x64 (dark fantasy стиль) для 7 предметов. Из них 3 нуждаются в генерации (ICON_001 Apprentice Staff, ICON_002 Worn Hat, ICON_003 Faded Cloak). Остальные 4 (ICON_017-020) уже имеют ассеты, промпты — для справки.
- **Файл**: `design/art-prompts-items.md`
- **Дата**: 2026-03-30

### [DONE] Attribute Points система
- **Агент**: Coder
- **Суть**: Реализована система очков атрибутов: `attributePoints` и `attributes: { strength, intelligence }` в getDefaultState(). При level up начисляется +1 attribute point. Функция `spendAttributePoint(attr)` тратит 1 очко. `getStats()` обновлён: STR = base + ap.strength*3, INT = base + ap.intelligence*4. Бонусы: +2% physical resistance per STR point, +3% spell damage per INT point. Миграция: старые сейвы получают retroactive points (level - 1).
- **Файлы**: `src/js/state.js`, `src/js/ui.js`
- **Дата**: 2026-03-30

### [DONE] Коммит и push
- **Агент**: DevOps
- **Суть**: Закоммичены все изменения (11 файлов, 1857 insertions). Commit: `c261ffa`. Push на origin/main выполнен.
- **Дата**: 2026-03-30

### [DONE] Иконки стартовых предметов — привязка к ITEMS_DATA
- **Агент**: Coder
- **Суть**: Пользователь загрузил ICON_001.png (Apprentice Staff), ICON_002.png (Worn Hat), ICON_003.png (Faded Cloak) в assets/generated/pixel/. Добавлено поле `img` к starter_staff, starter_hat, starter_cloak в ITEMS_DATA (state.js). Consumables (ICON_017-020) помечены TODO — файлы ещё не сгенерированы.
- **Файл**: `src/js/state.js`
- **Дата**: 2026-03-30

### [DONE] Баги инвентаря — 4 фикса
- **Агент**: Coder
- **Суть**: Исправлены 4 бага в inventory.js:
  1. Event listener утечка в renderGrid() — добавлен AbortController, abort при каждом перерендере
  2. _currentPage не сбрасывался при смене фильтра — добавлен `_currentPage = 0` в initHangerFilter()
  3. Safety cap для calcDynamicRows — `Math.min(rows, 10)` чтобы PAGE_SIZE не взрывался
  4. ResizeObserver fallback — обёрнут в `if (typeof ResizeObserver !== 'undefined')`, fallback на window.addEventListener('resize')
- **Файл**: `src/js/inventory.js`
- **Дата**: 2026-03-30

### [DONE] UI: попап Awakening (выбор класса на уровне 3)
- **Агент**: Coder
- **Суть**: Полностью реализован Awakening popup. HTML: 4 карточки классов (Pyromancer/fire/#e74c3c, Stormcaller/air/#3498db, Tidecaster/water/#1abc9c, Geomancer/earth/#e67e22) с описаниями, пассивками, первым заклинанием. CSS: отдельный файл awakening.css, overlay с backdrop-filter blur, grid 4 карточки, selected state с элементальным glow, disabled Awaken кнопка пока не выбран класс. JS: триггер при level >= 3 и classType === null (после боя и при входе в игру), запись classType в state, блокировка закрытия без выбора (Escape и overlay click blocked).
- **Файлы**: `index.html`, `src/css/awakening.css` (новый), `src/js/main.js`
- **Дата**: 2026-03-30

### [BLOCKED] Генерация ассетов ICON_017-020 (consumable иконки)
- **Агент**: Asset Generator
- **Суть**: ICON_017 (Mana Elixir), ICON_018 (Crystal Shard), ICON_019 (Iron Flask), ICON_020 (Shadow Dust) не существуют в assets/generated/pixel/. Промпты нужно создать. Пути уже прописаны в ITEMS_DATA.
- **Зависит от**: Art Director промпты -> генерация

### [PENDING] GitHub setup
- **Агент**: DevOps
- **Суть**: Убрать токен из remote URL, настроить credential helper

---

## 7. История решений

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-03-30 | Создан бортовой журнал (CAPTAIN_LOG.md) | Для восстановления контекста при перезапуске |
| 2026-03-30 | Платформа: только ПК браузер | Решение пользователя |
| 2026-03-30 | Vanilla JS, без фреймворков | Архитектурное решение (заложено с начала проекта) |
| 2026-03-30 | Не использовать Midjourney в промптах для арта | Требование пользователя |
| 2026-03-30 | 4 класса магов: Fire/Air/Water/Earth | Элементальная система с циклом: Fire>Earth>Air>Water>Fire |
| 2026-03-30 | Выбор класса на уровне 5 (Awakening event) | Игрок успевает понять боевую систему до выбора |
| 2026-03-30 | Инвентарь: Вариант B (динамическая пагинация) | Адаптивность к любому viewport без хардкода строк |
| 2026-03-30 | XP формула: 110 * level^1.5, max 50 | Economy v2, ~22-30 часов до level 50 |
| 2026-03-30 | classType в state (null до уровня 3) | Подготовка к системе классов |
| 2026-03-30 | Attribute Points: flat structure (attributePoints + attributes) | Проще чем nested object из GDD, легче мигрировать |
| 2026-03-30 | STR: +3 per point, INT: +4 per point | Из GDD progression-system.md, баланс для ~50 points |
| 2026-03-30 | Выбор класса на уровне 3 (не 5) | Решение Game Designer — быстрее вовлечение |

---

## 8. Как продолжить работу после перезапуска

1. Прочитай этот файл (CAPTAIN_LOG.md)
2. Проверь секцию "Активные задачи" -- там текущий статус
3. Проверь `git status` и `git diff` чтобы увидеть незакоммиченные изменения
4. Прочитай `design/progression-system.md` если нужен контекст по дизайну прогрессии
5. Прочитай `design/mage-classes.md` если нужен контекст по системе классов магов
6. Помни: ты -- дирижёр, делегируй работу агентам (Coder, Game Designer и т.д.)
