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
│   ├── progression-system.md  -- GDD системы прогрессии (max lvl 50, attribute points, новые заклинания/враги/PvP)
│   ├── mage-classes.md        -- GDD системы классов магов (4 класса, пассивки, заклинания, баланс)
│   ├── combat-class-mechanics.md -- спецификация интеграции классов в combat.js (REVISED)
│   ├── art-prompts-consumables.md -- промпты для pixel art иконок расходников
│   ├── mage-tower.md             -- GDD башни магов (10 этажей, враги, баланс, награды)
│   ├── passive-skill-tree.md     -- GDD пассивных навыков (Ley Threads, 88 нод)
│   └── art-prompt-tower.md       -- промпты для арта башни (фон, иконка, 10 врагов)
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

## 3. Текущее состояние игры (на 2026-04-18)

### Что работает:
- Стартовый экран с вводом имени
- Навигация: Loading -> Location -> Map -> Inventory / Grimoire -> Combat / Tower
- Система классов: 4 класса (Pyromancer, Stormcaller, Tidecaster, Geomancer), выбор на Awakening (lv3)
- Боевая система: autocast гримуара, DoT (Ignite), lifesteal (Shadow Bolt, Drain Life), slow (Frost), debuff (Void Eruption), Focus (x2), Mana Shield, **Skip Fight** (симуляция боя в памяти)
- 32 заклинания (31 иконка SPELL_001-031, tsunami без иконки)
- 7 врагов (Training Dummy -> Void Horror)
- Башня магов: 10 этажей, HP carryover, 3 попытки/день, anti-farm система
- Пассивное дерево **The Sigil Tree**: 80 нод (8 universal + 18*4 class), ресурс Sigils
- Инвентарь: 12 предметов экипировки + 4 расходника, адаптивная пагинация, XP-бар
- Магазин торговца (4 расходника с lore-tooltip)
- Daily Login (7-дневный цикл)
- Система баффов (расходники дают баффы на N боёв)
- Визуальный стиль: dark fantasy, gold/brown палитра, pixel art ассеты, готическая рамка дерева

### Что НЕ работает / известные баги:
- Иконка tsunami (SPELL_032) — нужна генерация
- Pixel-иконки для 6 универсальных спеллов (arcane_bolt, arcane_barrage, mana_shield, focus, shadow_bolt, void_eruption) — используют старые ассеты
- Skip Fight: UI-полировка в работе (Coder #3)

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

### [DONE] Промпты для иконок расходников ICON_017-020
- **Агент**: Art Director
- **Суть**: Созданы детальные промпты для 4 pixel art иконок расходников (64x64, dark fantasy): Mana Elixir (ICON_017, cyan-blue potion), Crystal Shard (ICON_018, violet-blue shard), Iron Flask (ICON_019, runic iron flask), Shadow Dust (ICON_020, dark pouch with purple sparks).
- **Файл**: `design/art-prompts-consumables.md`
- **Статус**: Промпты готовы. ICON файлы НЕ существуют в assets/generated/pixel/ -- нужна генерация.
- **Дата**: 2026-03-30

### [DONE] QA: Awakening popup -- найдено 8 багов/проблем
- **Агент**: Tester
- **Суть**: Полный QA-аудит Awakening popup. Найдены проблемы:
  1. BUG: Нет защиты от повторного тригера (если checkAwakening вызывается дважды быстро -- дублирование setTimeout)
  2. BUG: Если игрок закроет браузер после выбора -- classType сохранён, но popup.classList.remove('visible') не вызван для ДРУГИХ popup-ов (level-up может остаться visible в DOM)
  3. BUG: Tidecaster/Geomancer описания пассивок в HTML не совпадают с GDD (HTML: "Tidal Flow", GDD: "Riptide"; HTML: "Bedrock generates Fortify stacks", GDD: Bedrock = damage reduction + reflect)
  4. A11Y: Карточки не focusable с клавиатуры (нет tabindex, нет role="radio", нет aria-checked)
  5. A11Y: Кнопка Awaken не получает focus после выбора карточки
  6. UX: На 1280x720 четыре карточки в ряд -- текст может обрезаться (нет min-width на карточках)
  7. RACE: checkAwakening в handleBattleEnd вызывается без учёта level-up popup (3500ms delay может совпасть с level-up popup 2200ms delay)
  8. EDGE: Нет respec flow -- если classType уже задан, повторный вызов showAwakeningPopup невозможен (нет UI для respec)
- **Фиксы**: См. полный отчёт в ответе PM ниже.
- **Дата**: 2026-03-30

### [DONE] Спецификация классовых заклинаний для combat.js
- **Агент**: Game Designer
- **Суть**: Полная спецификация интеграции 4 классов магов в боевую систему: новые поля SPELLS_DATA (classRestriction, elementType, passiveTrigger), 24 новых заклинания (по 5-8 на класс с учётом переклассификации существующих), 4 пассивки с детальной логикой триггеров, функция getElementalModifier(), формулы урона для каждого заклинания, план миграции, приоритеты имплементации.
- **Файл**: `design/combat-class-mechanics.md`
- **Статус**: DRAFT -- ожидает review перед реализацией.
- **Дата**: 2026-03-30

### [DONE] Исследование конкурентов browser RPG
- **Агент**: Researcher
- **Суть**: Проанализированы 6 браузерных RPG (Melvor Idle, Hordes.io, Shattered Pixel Dungeon, Realm Grinder, Idle Champions, Legends of Idleon). Ключевые выводы для Veyra:
  1. Первые 30 минут критичны -- нужен "hook" каждые 5-10 минут (новый спелл, новый враг, первый лут)
  2. Класс-прогрессия работает лучше когда есть "preview" будущих способностей (серые иконки с замком)
  3. Idle-механики (автобой уже есть) нужно дополнить offline-прогрессией для удержания
  4. Leaderboards / PvP даже в простом виде (async) сильно повышают retention
  5. Визуальный прогресс (менять внешний вид мага при смене экипировки) -- один из топ-запросов в жанре
- **Дата**: 2026-03-30

### [DONE] Иконки расходников ICON_017-020 — привязка и загрузка
- **Агент**: Coder
- **Суть**: Пользователь загрузил ICON_017-020.png в assets/generated/pixel/. Пути в ITEMS_DATA уже были корректны. Удалён TODO-комментарий из state.js.
- **Файл**: `src/js/state.js`
- **Дата**: 2026-03-30

### [DONE] combat-class-mechanics.md — ревизия по фидбеку пользователя
- **Агент**: Game Designer
- **Суть**: Внесены 10 правок по детальному фидбеку:
  1. DoT-тики ограничены 1 Ember/с на уникальный источник (Section 5.1)
  2. Zephyr: добавлен counter-attack (50% avoided damage)
  3. Healing Rain: cast time 2.5s -> 1.5s, emergency heal x2 при HP < 50%
  4. Shield hard cap: min(shieldHP, mageMaxHP) для Fortify и Tectonic Shift
  5. Tectonic Shift base shield: 200 -> 80
  6. Frozen Tomb: full freeze -> 70% attack speed reduction (soft CC)
  7. Комментарии к passiveTrigger: false (Tailwind, Focus)
  8. training_dummy elementType: null -> "untyped (not neutral)"
  9. Living Bomb detonation: уточнено ignores focusMod AND buffMod
  10. Chain Lightning Hit3: "Hit2 * 0.70" -> "Hit1 * 0.49"
- **Файл**: `design/combat-class-mechanics.md`
- **Статус**: REVISED
- **Дата**: 2026-03-30

### [DONE] Баги Awakening popup — 3 фикса
- **Агент**: Coder
- **Суть**:
  1. Guard от двойного вызова: `_awakeningShowing` флаг, сбрасывается при закрытии
  2. Тексты пассивок Tidecaster/Geomancer в index.html приведены в соответствие с GDD (Riptide / Bedrock)
  3. Race condition: checkAwakening() вызывается из колбека закрытия level-up попапа, а не через независимый setTimeout. Убран setTimeout(3500) из checkAwakening().
- **Файлы**: `src/js/main.js`, `index.html`
- **Дата**: 2026-03-30

### [DONE] Коммит и push (сессия 2)
- **Агент**: DevOps
- **Суть**: Закоммичены все изменения (9 файлов, 751 insertions). Commit: `1178cde`. Push на origin/main выполнен.
- **Дата**: 2026-03-30

### [PENDING] GitHub setup
- **Агент**: DevOps
- **Суть**: Убрать токен из remote URL, настроить credential helper

### [DONE] Убрана кнопка Discard для зелий
- **Агент**: Coder
- **Суть**: В `showTooltip()` (inventory.js) добавлено условие `isConsumable` в проверку скрытия Discard кнопки. Теперь зелья (slot === 'consumable') не показывают кнопку Discard.
- **Файл**: `src/js/inventory.js`
- **Дата**: 2026-04-06

### [DONE] Баг ячеек инвентаря — hover scale обрезка
- **Агент**: Coder
- **Суть**: Ячейки инвентаря обрезались при hover (scale 1.06) из-за overflow:hidden на .inv-grid и .inv-cell. Фикс: .inv-grid overflow:visible + padding/margin компенсация; .inv-cell.has-item:hover получает overflow:visible. Анимация hover сохранена.
- **Файл**: `src/css/inventory.css`
- **Дата**: 2026-04-06

### [DONE] Убраны спеллы чужих классов из гримуара
- **Агент**: Coder
- **Суть**: В renderSpellPool() (grimoire.js) спеллы с locked-class состоянием теперь полностью фильтруются. Игрок видит только: универсальные спеллы + спеллы своего класса (доступные + locked-by-level). Фильтр-бар All/MyClass скрыт (больше не нужен). Удалён мёртвый код для lockedClass.
- **Файл**: `src/js/grimoire.js`
- **Дата**: 2026-04-06

### [DONE] Hover-тултип с лором у торговца + увеличение ячеек
- **Агент**: Coder + Lore Writer
- **Суть**: При наведении на товар в магазине появляется lore-tooltip справа от popup-box с текстом лора предмета. Добавлено поле `lore` к 4 расходникам в ITEMS_DATA (state.js). CSS: hover-эффект scale(1.03) + border glow на .shop-item-row. Tooltip создаётся динамически, позиционируется через getBoundingClientRect.
- **Файлы**: `src/js/shop.js`, `src/js/state.js`, `src/css/shop.css`
- **Дата**: 2026-04-06

### [PROPOSED] Новая боевая локация: Шпиль Колвика (The Spire of Colwick)
- **Агент**: Game Designer + Lore Writer
- **Суть**: Предложена концепция башни с 10 этажами. Подробности в секции ниже. Ожидает одобрения пользователя.
- **Дата**: 2026-04-06

### [DONE] XP-бар в инвентаре
- **Суть**: Добавлена визуальная шкала опыта под строкой уровня в экране инвентаря. Тонкая полоска с золотым градиентом, текст "X / Y XP" справа. Анимация перехода ширины (transition 0.5s).
- **Файлы**: `index.html` (HTML-разметка), `src/js/inventory.js` (логика: импорт xpForLevel, рендеринг в renderCharBlock), `src/css/inventory.css` (стили: .inv-xp-row, .inv-xp-bar-wrap, .inv-xp-bar, .inv-xp-text)
- **Дата**: 2026-04-10

### [DONE] Баг: grimoire повторный клик на спелл
- **Суть**: Баг — повторный клик на уже выбранный спелл в пуле снимал выделение вместо добавления в ротацию. Фикс: повторный клик теперь ставит спелл в первый пустой слот (позволяет заполнить всю ротацию одним спеллом многократными кликами). Выделение сохраняется для продолжения кликов. Снимается только когда все слоты заняты.
- **Файл**: `src/js/grimoire.js` (обработчик click в renderSpellPool)
- **Дата**: 2026-04-10

### [DONE] Интеграция иконок спеллов SPELL_001-031
- **Суть**: 31 файл SPELL_001-031.png в assets/generated/pixel/ привязаны к спеллам в SPELLS_DATA (state.js). Pyromancer (SPELL_001-008), Stormcaller (SPELL_009-016), Tidecaster (SPELL_017-023), Geomancer (SPELL_024-031).
- **Файл**: `src/js/state.js`
- **Верификация (2026-04-10)**:
  - 31 файл на диске, все 31 привязки в state.js корректны
  - **tsunami** -- img: null (SPELL_020 занят drain_life, SPELL_021 -- blizzard). Нужна уникальная иконка.
  - **6 универсальных спеллов** (arcane_bolt, arcane_barrage, mana_shield, focus, shadow_bolt, void_eruption) используют старые иконки из assets/generated/ (не pixel/ каталог). Файлы существуют и работают, но стиль может отличаться от pixel-набора.
- **Открытые вопросы**:
  1. Нужна иконка для tsunami (SPELL_032_TSUNAMI.png)
  2. Нужны pixel-иконки для 6 универсальных спеллов (SPELL_033-038)
- **Дата**: 2026-04-10

### [DONE] GDD: Башня магов — The Spire of Colwick
- **Суть**: Полный GDD башни магов — 10 этажей с уникальными врагами, HP carryover между этажами, 3 попытки в день, система наград, first-clear бонус. Баланс: реально прокачанный персонаж (lv30+, хорошая экипировка, оптимизированный гримуар) может дойти до 10 этажа. Lv35-40 для reliable clear. Каждый класс имеет свою стратегию прохождения.
- **Файл**: `design/mage-tower.md`
- **Дата**: 2026-04-10

### [DONE] Арт-промпты для башни магов
- **Суть**: Детальные промпты для Stable Diffusion / DALL-E: фон входа в башню (1920x1080), иконка для карты (128x128), 10 спрайтов врагов (128x128). Pixel art стиль, dark fantasy, без Midjourney.
- **Файл**: `design/art-prompt-tower.md`
- **Дата**: 2026-04-10

### [DONE] Ресёрч: пассивные деревья навыков в RPG
- **Суть**: Проанализированы Path of Exile, Diablo 4, Lost Ark, Hades 2, Vampire Survivors, Melvor Idle. Ключевые выводы: 3-tier node system (minor/major/keystone), отдельные деревья для классов + shared core, ресурс "Ley Threads" для Veyra, respec должен быть дешёвым, 20-25 нод на класс оптимально.
- **Файл**: `research/passive-skill-trees-research.md`
- **Дата**: 2026-04-10

### [DONE] GDD: Пассивное дерево навыков
- **Суть**: Полный GDD системы пассивных навыков. Ресурс: Ley Threads (1/level + бонусы от башни, квестов, prestige). Структура: 8 universal core + 20 class ring = 28 нод на игрока. Типы: Minor (1 thread), Major (2 threads), Keystone (3 threads). Полная таблица всех 88 нод (8 universal + 20*4 class). Каждый класс имеет тему: Pyro=escalation, Storm=speed/chain, Tide=endurance, Geo=fortification. Keystones — build-defining с tradeoff.
- **Файл**: `design/passive-skill-tree.md`
- **Дата**: 2026-04-10

---

## Сессия 2026-04-11

### [DONE] Баги исправлены
- **Инвентарь**: убран `margin: -4px` (наложение ячеек), восстановлен фон, добавлен скролл сетки
- **Гримуар**: фильтр "My Class" по умолчанию — игрок видит только спеллы своего класса
- **Бой**: убран дублирующий вызов `showDamageNumber()` (была двойная отрисовка цифр урона)
- **Миграция сейвов v2→v3**: equipment items с `count=0` получают дефолтные значения, consumables стартуют с 0

### [DONE] The Spire of Colwick (башня магов)
- **MVP реализован**: 10-этажный гаунтлет с HP/shield carryover между этажами
- **Механика**: 3 попытки в день, anti-farm — награды только за этажи выше рекорда дня
- **Враги**: 6 спрайтов (этажи 1-6), эмодзи-заглушки (🌊🔥🌑👁️) для этажей 7-10
- **UI**: вход, переход между этажами, итог рана; восстановление summary при перезагрузке если есть непринятые награды
- **Файлы**: `src/js/tower.js`, `src/css/tower.css`

### [DONE] Passive Skill Tree — Ley Loom
- **80 пассивных нод**: 8 universal + 18 на класс (4 класса)
- **Ресурс**: Ley Threads (+1 за level up, бонусы от башни/квестов)
- **Типы**: Minor (1 thread), Major (2), Keystone (3) с build-defining tradeoffs
- **Respec**: полный сброс за 50g × потраченные threads
- **Проки в бою**: Second Wind, Executioner, Mana Overflow, Phoenix Protocol (остальные в TODO)
- **Файлы**: `src/js/passives.js`, `src/js/passives_ui.js`, `src/css/passives.css`

### Next: Протестировать башню и пассивное дерево в браузере → доимплементить проки → спрайты башни этажей 7-10 → добавить Ley Threads в квесты и башню

---

## Сессия 2026-04-18

### [DONE] Баг боя в башне — персонажи не кастуют

**Диагностика (Tester)**:
Root cause найден в `src/js/combat.js::scheduleNextCast()`. При попытке фиксить BUG-007 (infinite recursion) введена ошибка: если `skipCount >= totalSlots` (несовместимые слоты) вызывалось `endBattle('win')` мгновенно. При `state.classType === null` (игроки до Awakening) все классовые спеллы считались несовместимыми → первый бой мгновенно "побеждался" без каста.

**Фикс (Coder #1)**:
- `src/js/combat.js::initBattle()`: добавлен фильтр совместимости слотов (универсальные + текущий класс; при classType=null все валидны; если пусто → notification + return false)
- `src/js/combat.js::scheduleNextCast()`: оба ложных `endBattle('win')` заменены на `endBattle('loss')` с notification. Ветка пропуска класса при classType=null не срабатывает.
- Статус: VERIFIED ✓

### [DONE] Кнопка Skip Fight (автопросчёт боя)

**ТЗ (Game Designer)**: Гибрид Option C — прогон боевой логики в памяти через флаг `_fastForward=true`, wrapper `_schedule()` вместо setTimeout. UI: кнопка `#skipFightBtn` в правом нижнем углу, overlay "Resolving…" 400ms, доступна везде (тренировка/карта/башня). Hard cap 60000 ticks.

**Имплементация (Coder #3)**: 
- В `src/js/combat.js` добавлены флаг `_fastForward` и wrapper `_schedule()` для условного setTimeout
- Функция `skipFight()` запускает симуляцию боя в памяти до `endBattle()`
- UI: кнопка в HTML (`screen-combat`), стилизована под боевой интерфейс, disabled пока идёт бой
- Overlay появляется на 400ms (blur фон + "Resolving…" текст)
- Статус: IN PROGRESS (логика готова, UI-полировка в работе)

### [DONE] Инвентарь перекрывает HUD статусов

**Проблема**: Кнопка инвентаря на площади занимала всю верхнюю часть экрана, обрезала HUD статусов (особенно с баффами).

**Фикс (Coder #1)** — `src/css/inventory.css`:
- `.inv-top-btn`: width 54% → 38%, max-width 520px, min-width 280px
- Padding 13px → 10px, font-size 17px → 15px, letter-spacing 3px → 2.5px
- `src/css/main.css`: `.location-hud` max-width `calc(50% - 240px)`; новый @media breakpoint (max-width:1500px) для `.inv-top-btn`
- Статус: VERIFIED ✓

### [DONE] Переименование Ley Loom → The Sigil Tree + рестайл

**Выбор имени (Creative)**:
Утверждён вариант **The Sigil Tree** (ресурс: **Sigils**) вместо "Ley Threads". Отклонены: Awakening Veins, Covenant, Ember Weave, Inner Pyre.

**UI-переименование (Coder #2)**:
- Заменены 10+ текстов в `index.html`, `passives_canvas.js`, `passives.js` (Ley Loom → Sigil Tree, Ley Threads → Sigils)
- Поле `state.passives.leyThreads` оставлено в коде для совместимости сейвов (помечено комментарием)
- Без breaking changes в localStorage

**Визуальный рестайл (Design Director + Coder #2)** — 7 правок:
1. Витражная готическая рамка (border-image, clip-path углы)
2. Центральный вращающийся sigil (rotate animation)
3. Состояния нод: locked=десатурация, available=пунктирное кольцо-пульсация, unlocked=двойной halo
4. Живые ley-нити на рёбрах (SVG path animation)
5. Типографика: UPPERCASE, letter-spacing, ❖ символ
6. Падающие искры (particle effect на фоне)
7. Свиток-tooltip с clip-path углами

- Файлы: `src/css/passives.css`, `src/js/passives_canvas.js`, `index.html`
- Статус: VERIFIED ✓

### Next: Завершить UI-полировку Skip Fight → спрайты башни этажей 7-10 → интеграция Sigils в квесты и башню

---

## Сессия 2026-04-19

### [DONE] Bug-регрессия: бои в башне после миграции v3→v4 — не стартуют
- **Root cause** (Tester): миграция v3→v4 (state.js:1283) зануляет удалённые спеллы (arcane_barrage, shadow_bolt, void_eruption); в combat.js:254 `rawSlots.length < 3` молча `return false` из initBattle → бой визуально "стоит". Вторая ветка: class-restricted mismatch → scheduleNextCast скипает все слоты → endBattle('loss') без каста.
- **Фикс** (Coder): порог понижен до 1, добавлен showNotification на все "молчаливые" return false; автозаполнение пустых слотов из knownSpells в миграции v3→v4; warning при загрузке боя с incompatible слотами.
- **Файлы**: src/js/combat.js (~254-258, 470-482, 489-506), src/js/state.js (~1281-1323)

### [DONE] Skip Fight — подтверждён как рабочий
- Tester: кнопка #btn-skip-fight, overlay и simulateBattle() реализованы в combat.js:286-302, 1467. Зависимость от Bug-1 — после фикса работает.

### [DONE] HUD редизайн — компактная капсула
- Проблема (User): HUD статуса слишком большой, много пустот.
- Решение (Design-director + Coder): padding 4px 10px, gap 8px, border-radius 14px, max-width max-content, nowrap. Шрифты 12-14px (было 17-20). Глиф-разделитель │, префикс ✦ для уровня, unicode ◈ вместо emoji 🪙. Баффы в absolute-блок ниже капсулы.
- Файлы: src/css/main.css (~905-968, 1252-1297), index.html (~97-98), src/js/main.js (~87-88)

### [DONE] SpriteCook: 4 новые иконки
- Сгенерированы (DevOps, 48 кредитов): training_icon.png (72x72), shop_icon.png (92x92), inventory_icon.png (78x78), training_dummy.png (174x174). Стиль: pixel art, dark fantasy, палитра gold/bronze/brown.
- asset_id'ы в spritecook-assets.json
- Путь в коде обновлён на assets/generated/pixel/ (combat.js:2170, state.js:731/746, index.html:432)

### [RESEARCH+GDD] Sigil Resonance — механика skill>level
- Researcher проанализировал HS/MTG/Pokemon/TFT/SW/Darkest Dungeon; Creative предложил 7 идей; выбран гибрид Sigil Resonance.
- GDD: design/sigil-resonance.md (~1700 слов). Концепция: 3 слота стихий перед боем, моно-сет +36%/-24%, противоположности -50% урона, 1 слот гримуара в жертву + Sigils 5/12/25.
- Разблокировка через Sigil Tree keystones: Elemental Pact (lv15), Deepening Pact (lv25), Shattered Pact (lv35).
- Статус: GDD готов, ожидает одобрения пользователя перед имплементацией.

### Next: одобрение Sigil Resonance GDD пользователем → Architect → Coder

---

## Сессия 2026-04-19 (поздняя)

### [HOTFIX] Бой не стартует — ReferenceError updateTimerDisplay
- **Причина**: регрессия от ранней правки сессии — функция `updateTimerDisplay` удалена, но её вызов остался в `renderBattleUI` (combat.js:2189). Консоль: `Uncaught ReferenceError: updateTimerDisplay is not defined`.
- **Фикс** (Coder): вызов удалён, комментарий о старом таймере оставлен.
- **Файл**: src/js/combat.js:2186-2189

### [DONE] HUD +1px — читаемость
- Пользователь: "слишком мелко, сложно читать". Design-director одобрил +1px по всем шрифтам HUD без ломки композиции.
- Base: name 14→15, level 12→13, gold 14→15, separator 12→13, padding 4px 10px → 5px 12px.
- Media (<1400 и <1280): 11→12, 10→11.
- **Файл**: src/css/main.css (~905, 1252-1311)

### [DONE] 11 новых SpriteCook ассетов
- Сгенерированы (132 кредита, остаток 310): training_icon_v2, shop_icon_v2, coin_icon, badge_fire/water/air/earth, hanger_empty, sprite_staff/hat/robe.
- asset_id'ы в spritecook-assets.json (блок assets_v2).

### [DONE] Интеграция ассетов в UI
- `◈`/`🪙` заменены на `<img src="coin_icon.png" class="coin-inline">` в HUD, inventory, shop, ui.js (battle rewards), dailylogin, main.css `.hud-gold::before`.
- `loc-hud-class-badge`: emoji стихии заменён на `<img src="badge_{element}.png">` в grimoire.js::updateHudClassBadge.
- Training button: `training_icon.png` → `training_icon_v2.png` (main.js:106).
- Инвентарь: старая `вешалка.png` заменена на `hanger_empty.png`; добавлены 3 overlay `<img>` (sprite_hat/robe/staff) с абсолютным позиционированием, видимость управляется `renderHanger()` по `state.equipment[slot]`.
- CSS: добавлены `.coin-inline`, `.hud-badge-img`, `.hanger-sprite*` в main.css и inventory.css.
- **Файлы**: index.html (~96-98, 148, 161-174, 597), src/js/main.js (~88, 106), src/js/shop.js (~370-372, 412), src/js/inventory.js (~156-166, 181), src/js/ui.js (~140, 167, 209), src/js/dailylogin.js (~159-165), src/js/grimoire.js (~589-591), src/css/main.css (~198-210, 1314+), src/css/inventory.css (~150+).

### [DONE] Sigil Resonance GDD — Variant A+ (открытый доступ)
- Пользователь указал на дыру: при фиксированной стихии класса counter-pick ломается в mirror-матче.
- Game-designer разобрал варианты A/B/В: проблема — не в системе сигил, а в гипотетической фиксации доступа к стихиям.
- **Решение (Variant A+): все 4 стихии доступны всем классам**. Идентичность защищена через: (1) classElementalMod ±10%, (2) resonanceDmgBonus работает только на спеллы своей стихии в гримуаре, (3) классовые keystone-ноды залочены на native-стихию.
- Файл: design/sigil-resonance.md (§9.5 Decision + правки §5, §7.2). 0 строк кода — просто не добавлять фильтр.

### Блокеры
- Sigil Tree редизайн (запрос пользователя) отложен: Design-director агент упёрся в лимит Anthropic (reset 17:00 MSK).

### Next: визуальный редизайн Sigil Tree → одобрение Sigil Resonance MVP → имплементация

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
| 2026-04-06 | Спеллы чужих классов полностью скрыты в гримуаре | Пользователь: "зачем мне видеть все спеллы в игре" |
| 2026-04-06 | Discard убран для consumables | Зелья не должны выбрасываться |
| 2026-04-06 | Поле `lore` добавлено в ITEMS_DATA для расходников | Для hover-tooltip у торговца |
| 2026-04-10 | XP-бар в инвентаре: под Level, золотой градиент | Визуализация прогресса — ключевой engagement hook |
| 2026-04-10 | Grimoire: повторный клик = добавить в слот (не toggle) | Пользователь хочет заполнять ротацию одним спеллом |
| 2026-04-10 | Иконки SPELL_010-031 привязаны к спеллам в SPELLS_DATA | 31 спелл из 32 теперь имеет pixel art иконку |
| 2026-04-10 | Башня: 10 этажей, HP carryover, 3 попытки/день | Эндгейм контент, не gear check а skill check |
| 2026-04-10 | Пассивные навыки: Ley Threads, 8 universal + 20 class | Отдельно от гримуара, ~68 threads к max level |
| 2026-04-10 | SPELL_020=drain_life, SPELL_021=blizzard (оба файла TSUNAMI) | Временное решение, tsunami нужна своя иконка |
| 2026-04-19 | Sigil Resonance: Variant A+ — открытый доступ ко всем 4 стихиям | Фиксация класса к стихии ломает mirror-match counterplay; идентичность защищена модификаторами |
| 2026-04-19 | Монета/стихии в UI — PNG вместо emoji/unicode | Единый pixel-art язык, убираем эмодзи из готической эстетики |
| 2026-04-19 | Вешалка = empty hanger + 3 overlay-спрайта | Предыдущая вешалка "кривая"; overlay даёт визуализацию экипированных предметов |
| 2026-04-10 | Верификация иконок: 31/31 SPELL файлов на диске, привязки ОК | tsunami без иконки, 6 universal спеллов на старых ассетах |
| 2026-04-18 | Ley Loom → The Sigil Tree (ресурс: Ley Threads → Sigils) | Понятное dark-fantasy имя вместо academic; resonates с игроком |
| 2026-04-18 | leyThreads field сохранён для compat, UI показывает Sigils | Без breaking changes в сейвах, graceful migration |
| 2026-04-18 | Skip Fight = гибрид-симуляция (Option C) | Сохраняет все боевые механики, мгновенный исход без чит-ощущения |
| 2026-04-18 | classType=null → все спеллы валидны в combat | Игроки до Awakening (до lv3) не блокируются от боя |
| 2026-04-19 | HUD статуса — компактная капсула 26px с max-content | Убрать пустоты, плотная плотность без резерва под баффы |
| 2026-04-19 | Порог rawSlots в initBattle: 3→1 | После миграции v3→v4 игроки с null-слотами не могут начать бой |
| 2026-04-19 | Все silent `return false` в combat.js дают showNotification | Игрок должен понимать почему бой не стартует |
| 2026-04-19 | Sigil Resonance — выбранная модель counterplay для PvP | Element triangle + sideboard-аналог, лучший trade-off cool×feasible |

---

## 8. Открытые задачи / TODO

- [ ] Sigil Resonance — имплементация MVP (после одобрения GDD)
- [ ] Иконка для tsunami (SPELL_032_TSUNAMI.png) — нужна генерация
- [ ] Pixel-иконки для 6 универсальных спеллов (arcane_bolt, arcane_barrage, mana_shield, focus, shadow_bolt, void_eruption)
- [ ] GitHub: убрать токен из remote URL, настроить credential helper

---

## 9. Как продолжить работу после перезапуска

1. Прочитай этот файл (CAPTAIN_LOG.md)
2. Проверь секцию "Активные задачи" -- там текущий статус
3. Проверь секцию "Открытые задачи / TODO" -- там бэклог
4. Проверь `git status` и `git diff` чтобы увидеть незакоммиченные изменения
5. Прочитай `design/progression-system.md` если нужен контекст по дизайну прогрессии
6. Прочитай `design/mage-classes.md` если нужен контекст по системе классов магов
7. Прочитай `design/mage-tower.md` если нужен контекст по башне (GDD одобрен)
8. Прочитай `design/passive-skill-tree.md` если нужен контекст по пассивным навыкам (GDD одобрен)
9. Помни: ты -- дирижёр, делегируй работу агентам (Coder, Game Designer и т.д.)
