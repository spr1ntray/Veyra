# WorldMap — Карта мира (основной игровой хаб)

## Описание
Главный экран игры. Изометрический вид карты с 2 открытыми и 7 закрытыми локациями. Верхний HUD с характеристиками, нижняя навигация. Маг стоит на текущей локации.

---

## Допущения
- [ASSUMPTION] Карта — статичное изображение с изометрической перспективой (~30°), не интерактивная 3D-сцена.
- [ASSUMPTION] Иконки локаций — кликабельные div-оверлеи поверх фонового изображения карты.
- [ASSUMPTION] "Городская площадь" — текущая локация по умолчанию (стартовая). Маг стоит на ней.
- [ASSUMPTION] Туман войны — CSS-фильтр grayscale + overlay тёмного цвета поверх иконок закрытых локаций.
- [ASSUMPTION] Локации в тумане показывают название только при hover, без описания механики.

---

## Layout (1280px+, fullscreen)

```
┌──────────────────────────────────────────────────────────┐  0%
│  [TOP HUD: имя | уровень | золото | XP-бар]             │  0–7%
├──────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│        [КАРТА — изометрический арт, ~30°]               │  7–87%
│                                                         │
│   ◆ Тренировочная площадка   ◉ Городская площадь       │
│       (открыта)                 (открыта, ТЫ ЗДЕСЬ)    │
│                                                         │
│   ░ ░ ░ ░ ░ ░ ░  [7 иконок в тумане, серые]            │
│                                                         │
│   [мага иконка — маленькая зелёная шляпа]              │
│                                                         │
├──────────────────────────────────────────────────────────┤
│  [BOTTOM NAV: Карта (активна) | Инвентарь | Персонаж]   │  87–100%
└──────────────────────────────────────────────────────────┘
```

**Карта занимает:** весь экран кроме top HUD (56px) и bottom nav (64px).

---

## Элементы

### Top HUD

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `hud_bar` | div | top 0, fullwidth | 100% × 56px | bg `#0a0e27cc` + border-bottom 1px `#3a2a5a` | — |
| `char_name_label` | span, Cinzel | left 24px, vcenter | font-size 16px | `#e8e0d0` | — |
| `level_badge` | div | left: после имени + 12px | 32×32px | bg `#1a0a2e`, border `#c9a84c` 1px | — |
| `level_number` | span, Cinzel | center badge | font-size 14px | `#c9a84c` | — |
| `gold_icon` | span (монета) | left ~220px | 20×20px | `#c9a84c` | — |
| `gold_amount` | span, Cinzel | left: после иконки + 6px | font-size 16px | `#c9a84c` | — |
| `xp_bar_container` | div | right 24px, vcenter | 200×16px | bg `#1a0a2e`, border 1px `#3a2a5a` | — |
| `xp_bar_fill` | div | inside container | ширина = xp/xp_required * 200px, h 100% | bg `#2ecc71` | animated fill при изменении |
| `xp_bar_label` | span, Cinzel | поверх xp_bar | font-size 11px, center | `#e8e0d0` | динамический: "240 / 415 XP" |

### Карта (основная область)

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `map_background` | div с background-image | fullscreen под HUD и nav | 100% | изометрический арт | статичный |
| `location_icon` (×9) | div-оверлей | абсолютное позиционирование на карте | 48×48px | см. состояния | default / hover / locked / active |
| `location_label` (×9) | span, Cinzel | под location_icon | font-size 12px | `#e8e0d0` или `#4a3a5a` | по состоянию локации |
| `player_icon` | div | поверх location_icon текущей локации | 32×32px | зелёная остроконечная шляпа SVG | медленное покачивание |
| `fog_overlay` (×7) | div | поверх закрытых location_icon | 100% ячейки | `#0a0e27` opacity 0.7 | hover: opacity 0.4 + tooltip |
| `location_tooltip` | div | появляется при hover над закрытой | auto | bg `#1a0a2e`, border `#3a2a5a` | hover triggered |
| `location_locked_icon` | SVG замок | center fog_overlay | 20×20px | `#3a2a5a` | статичный |

### Bottom Navigation

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `bottom_nav_bar` | div | bottom 0, fullwidth | 100% × 64px | bg `#0a0e27ee` + border-top 1px `#3a2a5a` | — |
| `nav_item_map` | button | 1/3 ширины, left | 100%/3 × 64px | активный | active / default |
| `nav_item_inventory` | button | 2/3 ширины, center | 100%/3 × 64px | неактивный | default / hover / active |
| `nav_item_character` | button | 3/3 ширины, right | 100%/3 × 64px | неактивный | default / hover / active |
| `nav_icon_[name]` | SVG иконка | top 10px, center-x nav_item | 24×24px | `#c9a84c` (active), `#8a7a6a` (default) | — |
| `nav_label_[name]` | span, Cinzel | bottom 8px, center-x nav_item | font-size 11px | `#c9a84c` (active), `#8a7a6a` (default) | — |

---

## Позиции локаций на карте (% от карта-области, x% от левого края, y% от верхнего)

| Локация | X% | Y% | Состояние |
|---------|----|----|-----------|
| Тренировочная площадка | 38% | 55% | open |
| Городская площадь (стартовая) | 55% | 62% | open + current |
| Сумеречный рынок | 65% | 42% | locked |
| Замок Утопленников | 20% | 35% | locked |
| Гнилая чаща | 15% | 60% | locked |
| Башня отшельника | 72% | 68% | locked |
| Лунная деревня | 48% | 28% | locked |
| Звёздная долина | 82% | 38% | locked |
| Пик Чёрного рыцаря | 25% | 22% | locked |

---

## Состояния локаций

### Открытая локация (`open`)
- `location_icon`: полная яркость, border 1px `#2ecc71` (круглый или ромбовидный).
- `location_label`: `#e8e0d0`, видна всегда.
- Cursor: pointer.
- Hover: box-shadow `0 0 16px #2ecc7166`, scale 1.08, transition 0.2s.
- Active (клик): scale 0.95, transition 0.1s.

### Текущая локация (`open` + игрок здесь)
- Всё как у `open`, плюс:
- `player_icon` (маленькая зелёная шляпа) парит над иконкой: translateY `-4px` → `0px` → `-4px`, 2s ease-in-out, infinite.
- Под `location_label`: подпись "ВЫ ЗДЕСЬ" размер 10px, цвет `#2ecc71`.

### Закрытая локация (`locked`)
- `location_icon`: filter grayscale(80%) + opacity 0.4.
- `fog_overlay` поверх: opacity 0.7.
- `location_locked_icon`: замок по центру.
- `location_label`: скрыта (display: none).
- Cursor: default.
- Hover: `fog_overlay` opacity → 0.4 (локация чуть проявляется), `location_tooltip` появляется над иконкой.

---

## Location Tooltip (для закрытых локаций)

**Размер:** 160px ширина, auto высота.
**Позиция:** centered-x над иконкой, bottom: icon_top - 8px.
**Содержимое:**
```
┌──────────────────────┐
│  🔒 Сумеречный рынок │
│  ───────────────── │
│  Откроется позже   │
└──────────────────────┘
```
- Bg: `#1a0a2e`, border 1px `#3a2a5a`.
- Название: Cinzel 13px, `#8a7a6a`.
- Подпись: Crimson Text 12px italic, `#4a3a5a`.
- Появляется: opacity 0 → 1 за 0.15s при hover.
- Исчезает: при mouse leave, 0.1s.

---

## Navigation Items — текст

| nav_item | Иконка (ключ) | Текст |
|----------|--------------|-------|
| `nav_item_map` | map_icon | КАРТА |
| `nav_item_inventory` | bag_icon | ИНВЕНТАРЬ |
| `nav_item_character` | person_icon | ПЕРСОНАЖ |

Активный таб: border-top 2px `#c9a84c` внутри nav_item, bg `#1a0a2e`.

---

## Состояния и поведение экрана

### Default
- Карта видна, маг стоит на Городской площади.
- HUD показывает актуальные данные из localStorage.
- Bottom nav: "КАРТА" — активна.

### После получения награды (Daily Login завершён)
- Числа в HUD (`gold_amount`, `xp_bar_fill`) обновляются с анимацией: counter-up (числа перебирают значения от старого до нового за 0.8s).

### Бои исчерпаны (fightsToday === 5)
- Иконка Тренировочной площадки получает overlay с текстом "5/5" и lock-иконкой.
- При hover: tooltip "Вернитесь завтра. Бои обновятся в полночь."
- Cursor: not-allowed.

---

## Переходы

| Действие | Цель | Тип |
|----------|------|-----|
| Клик на "Тренировочная площадка" (бои есть) | BattleScreen | Push (slide-left, 0.35s) |
| Клик на "Тренировочная площадка" (бои исчерпаны) | Tooltip появляется | Нет перехода |
| Клик на закрытую локацию | Нет — только hover tooltip | Нет перехода |
| Клик `nav_item_inventory` | InventoryScreen | Push (slide-left, 0.3s) |
| Клик `nav_item_character` | InventoryScreen (якорь на силуэт) | Push (slide-left, 0.3s) |
| Клик `nav_item_map` (уже на карте) | Нет реакции | — |

---

## Notes for Developer

- Карта: позиционирование иконок локаций — абсолютное, % от размера `map_background`. При изменении размера окна (хотя min 1280px) пропорции должны сохраняться.
- `player_icon` рендерится поверх location_icon текущей локации, z-index выше.
- HUD `xp_bar_fill`: ширина вычисляется как `(xp / xp_required) * 200px`, min 4px, max 200px.
- XP required для уровня N: `floor(100 * N^1.3)` — вычислять на фронте.
- Бои исчерпаны: сравнивать `combat.fightsToday >= 5` И `combat.lastFightDate === today`.
- `char_name_label` берётся из `shelby_player.name` (localStorage). Если `"Unnamed Mage"` — показывать как есть.

---

## Notes for Art Director

- Фоновая карта (арт): изометрический вид тёмного фэнтези-пейзажа. Ночь, луна справа сверху. Открытые зоны слегка подсвечены изумрудным или золотым (фонари, огни). Закрытые зоны погружены в синеватый туман.
- Референс стиля карты: мрачный, но не монохромный. Тёмно-синий (#0a0e27) доминирует, изумрудные огни деревень (лунная деревня, городская площадь), фиолетовые мерцания замка.
- `player_icon` — маленькая зелёная остроконечная шляпа (18–24px высота) с тёмным силуэтом под ней. Шляпа узнаваема сразу. Мягкое зелёное свечение под ней (box-shadow `#2ecc71` 8px).
- Иконки локаций: 48px кружки или ромбы с характерным символом каждой локации. Тренировочная — мишень/посох. Городская площадь — ворота/фонарь.
- Нижняя навигация: не выбивается из стиля — никаких iOS-подобных иконок. Тонкие линейные SVG в духе рунических символов.
