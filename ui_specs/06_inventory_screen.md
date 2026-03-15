# InventoryScreen — Инвентарь

## Описание
Полный экран инвентаря. Слева — силуэт мага с тремя кликабельными слотами экипировки. Справа — сетка всех предметов в инвентаре. При клике на предмет появляется всплывающая карточка с деталями и кнопкой "Экипировать".

---

## Допущения
- [ASSUMPTION] Персонаж всегда одет — три стартовых предмета в слотах, которые нельзя снять.
- [ASSUMPTION] Клик на пустой слот не вызывает действия (слот всегда занят стартовым предметом или лучшим).
- [ASSUMPTION] Предметы с quantity=0 не отображаются в сетке инвентаря.
- [ASSUMPTION] "Персонаж" в нижней навигации открывает этот же экран с фокусом на левую панель (силуэт). Нет отдельного CharacterScreen.
- [ASSUMPTION] Экипировать можно только предметы, подходящие по слоту.
- [ASSUMPTION] Стартовые предметы (starter_staff, starter_hat, starter_cloak) отображаются в слотах, но в сетке инвентаря не показываются — нет смысла.

---

## Layout (1280px+, fullscreen)

```
┌──────────────────────────────────────────────────────────┐  0%
│  [BACK BUTTON]  [ИНВЕНТАРЬ]              [gold | level]  │  0–7%
├────────────────────────┬─────────────────────────────────┤
│                        │                                 │
│   [СИЛУЭТ МАГА]        │  [СЕТКА ПРЕДМЕТОВ]              │
│                        │                                 │
│   [слот: шляпа]        │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│   [силуэт тела]        │  │  │ │  │ │  │ │  │ │  │     │  7–87%
│   [слот: накидка]      │  └──┘ └──┘ └──┘ └──┘ └──┘     │
│   [слот: посох]        │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│                        │  │  │ │  │ │  │ │  │ │  │     │
│   [суммарный          │  └──┘ └──┘ └──┘ └──┘ └──┘     │
│    BonusPower]        │                                 │
│                        │  [пустое состояние — если нет] │
├────────────────────────┴─────────────────────────────────┤
│  [BOTTOM NAV: Карта | Инвентарь (активен) | Персонаж]   │  87–100%
└──────────────────────────────────────────────────────────┘
```

**Левая панель:** 35% ширины экрана.
**Правая панель:** 65% ширины экрана.
**Разделитель:** 1px `#3a2a5a`, вертикальный.

---

## Элементы

### Top Bar

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `top_bar` | div | top 0, fullwidth | 100% × 52px | bg `#0a0e27cc`, border-bottom 1px `#3a2a5a` | — |
| `back_button` | button | left 16px, vcenter | 36×36px | border 1px `#3a2a5a` | default / hover |
| `screen_title` | span, Cinzel | left 64px, vcenter | font-size 18px | `#e8e0d0` | "ИНВЕНТАРЬ" |
| `hud_gold_icon` | SVG | right 120px, vcenter | 18×18px | `#c9a84c` | — |
| `hud_gold_amount` | span, Cinzel | right 90px, vcenter | font-size 15px | `#c9a84c` | — |
| `hud_level_badge` | div | right 16px, vcenter | 52×28px | bg `#1a0a2e`, border `#c9a84c` 1px | — |
| `hud_level_text` | span, Cinzel | center badge | font-size 13px | `#c9a84c` | "УР. [N]" |

### Левая панель — Силуэт мага

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `left_panel` | div | left 0, top HUD | 35% × (100vh - 116px) | bg `#0a0e27` | — |
| `mage_silhouette` | SVG или img | center left_panel, top 12% | ~180×280px | тёмный силуэт, граница `#2a1a4a` | статичный |
| `equipment_slot_hat` | div кликабельный | поверх мага — голова | 48×48px | bg `#1a0a2e`, border 1px `#3a2a5a` | default / hover / equipped |
| `equipment_slot_cloak` | div кликабельный | поверх мага — торс | 48×48px | аналогично | default / hover / equipped |
| `equipment_slot_staff` | div кликабельный | правее мага — рука | 48×48px | аналогично | default / hover / equipped |
| `slot_item_icon` | img/SVG | center equipment_slot | 36×36px | полная яркость если экипирован | — |
| `slot_label` | span, Crimson Text | под слотом | font-size 10px | `#4a3a5a` | "Шляпа" / "Накидка" / "Посох" |
| `bonus_power_section` | div | bottom 15% left_panel | auto | — | — |
| `bonus_power_label` | span, Crimson Text | center | font-size 13px | `#8a7a6a` | "Сила магии" |
| `bonus_power_value` | span, Cinzel | center | font-size 28px | `#2ecc71` | динамический: суммарный BonusPower |
| `bonus_power_breakdown` | div | под value | auto | — | — |
| `bonus_power_line` (×3) | span | в breakdown | font-size 11px | `#4a3a5a` | "Посох: +[N]", "Шляпа: +[N]", "Накидка: +[N]" |

**Позиции слотов на силуэте (% от mage_silhouette):**
- `equipment_slot_hat`: top 2%, left 50% (над головой, center-x)
- `equipment_slot_cloak`: top 38%, left 60% (правое плечо)
- `equipment_slot_staff`: top 42%, left 88% (правее силуэта — рука с посохом)

### Правая панель — Сетка предметов

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `right_panel` | div | right side, top HUD | 65% × (100vh - 116px) | bg `#0a0e27` | — |
| `inventory_grid` | div grid | padding 24px | columns: 5 штук, gap 12px | — | — |
| `inventory_header` | span, Cinzel | top 12px left 24px | font-size 14px | `#8a7a6a` | "ПРЕДМЕТЫ" |
| `item_cell` | div | в сетке | 72×88px | bg `#1a0a2e`, border 1px `#3a2a5a` | default / hover / equipped |
| `item_cell_icon` | img/SVG | top 8px, center-x | 40×40px | по редкости | — |
| `item_cell_name` | span, Crimson Text | bottom 8px, center | font-size 10px, 2 строки max | `#e8e0d0` | — |
| `item_cell_rarity_dot` | div | top-right угол | 8×8px, border-radius 50% | цвет редкости | — |
| `item_cell_equipped_badge` | span | bottom-left угол | auto | bg `#0a2e1a`, border `#2ecc71`, font-size 9px | visible только если экипирован |
| `empty_inventory_label` | p, Crimson Text | center right_panel | font-size 16px italic | `#4a3a5a` | visible только если inventory пуст |

**Текст `empty_inventory_label`:** "Предметов пока нет. Сразитесь с манекеном — возможно, повезёт."

---

## Состояния item_cell

### Default
- Bg: `#1a0a2e`.
- Border: 1px `#3a2a5a`.
- Cursor: pointer.

### Hover
- Border: 1px цвет редкости предмета.
- Box-shadow: `0 0 10px [rarity_color]44`.
- Bg: `#1f1040`.
- Scale: 1.03.
- Transition: 0.15s.

### Equipped (предмет надет)
- `item_cell_equipped_badge` видимый: "НА МАСТЕРЕ" (9px, Cinzel, зелёный фон, зелёный текст).
- Border: 1px `#2ecc71`, opacity 0.7.

---

## Состояния equipment_slot

### Default (стартовый предмет)
- Border: 1px `#3a2a5a`.
- Иконка предмета — приглушённая (opacity 0.7).

### Hover
- Border: 1px `#c9a84c`.
- Box-shadow: `0 0 12px #c9a84c44`.
- Scale: 1.05.
- Transition: 0.15s.
- Cursor: pointer.
- Tooltip появляется: название и BonusPower экипированного предмета.

### Equipped (улучшенный предмет)
- Border: 1px `#2ecc71`.
- Иконка — полная яркость.

---

## ItemTooltip — всплывающая карточка предмета

Появляется при клике на `item_cell`.

**Позиция:** фиксированная — center экрана (модальная карточка, не привязана к ячейке).

**Размер:** 320×280px.

```
┌──────────────────────────────────────┐
│ ▌ [иконка предмета 56px]             │
│ ▌ [Название предмета]  [редкость]    │
│ ▌ [Слот: Посох]                      │
│ ──────────────────────────────────── │
│   Сила магии: +[N]                   │
│                                      │
│   [Описание предмета italic]          │
│                                      │
│   [ЭКИПИРОВАТЬ]     [✕ закрыть]      │
└──────────────────────────────────────┘
```

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `tooltip_backdrop` | div | fullscreen | 100vw 100vh | `#000` opacity 0.45 | click-to-close |
| `item_tooltip_card` | div | center экрана | 320×280px | bg `#1a0a2e`, border 2px по редкости | — |
| `tooltip_rarity_bar` | div | left 0, top 0, fullheight | 6×280px | цвет редкости | — |
| `tooltip_item_icon` | img/SVG | top 20px, left 30px | 56×56px | — | — |
| `tooltip_item_name` | span, Cinzel | top 20px, left 100px | font-size 18px | цвет редкости | — |
| `tooltip_rarity_label` | span, Cinzel | top 42px, left 100px | font-size 12px | `#8a7a6a` | редкость текстом |
| `tooltip_slot_label` | span, Crimson Text | top 62px, left 100px | font-size 13px | `#8a7a6a` | "Слот: [слот]" |
| `tooltip_divider` | div | top 92px, left 30px | 260×1px | `#3a2a5a` | — |
| `tooltip_bonus_power` | span, Cinzel | top 102px, left 30px | font-size 18px | `#2ecc71` | "Сила магии: +[N]" |
| `tooltip_description` | p, Crimson Text italic | top 132px, left 30px | font-size 14px, max-w 260px | `#8a7a6a` | описание из GDD |
| `equip_button` | button | bottom 20px, left 30px | 160×40px | bg `#0a2e1a`, border `#2ecc71` | default / hover / active / disabled |
| `equip_button_text` | span, Cinzel | center | font-size 15px | `#e8e0d0` | "ЭКИПИРОВАТЬ" / "УЖЕ НАДЕТ" |
| `tooltip_close_button` | button | bottom 20px, right 20px | 40×40px | border `#3a2a5a` | default / hover |
| `tooltip_close_icon` | span | center | font-size 18px | `#8a7a6a` | "✕" |

### Состояние equip_button

**Default (не экипирован):**
- Text: "ЭКИПИРОВАТЬ".
- Border `#2ecc71`, bg `#0a2e1a`.
- Cursor: pointer.

**Disabled (уже надет):**
- Text: "УЖЕ НАДЕТ".
- Border `#3a2a5a`, bg `#1a0a2e`.
- Cursor: not-allowed.
- Opacity 0.5.

**После клика "ЭКИПИРОВАТЬ":**
1. Кнопка переходит в disabled.
2. Tooltip закрывается через 0.5s (scale 1.0 → 0.9 + opacity → 0).
3. Соответствующий `equipment_slot` на силуэте обновляется (анимация: иконка появляется со scale 0 → 1.1 → 1.0, 0.3s).
4. `bonus_power_value` обновляется с counter-up за 0.5s.

---

## Открытие/закрытие ItemTooltip

**Открытие (клик на item_cell):**
- `tooltip_backdrop`: fade-in opacity 0 → 0.45, 0.2s.
- `item_tooltip_card`: scale 0.85 → 1.0 + opacity 0 → 1, 0.25s ease-out.

**Закрытие (клик ✕ или клик backdrop):**
- `item_tooltip_card`: scale 1.0 → 0.9 + opacity → 0, 0.2s.
- `tooltip_backdrop`: fade-out 0.15s.

---

## Состояния экрана

### Default
- Левая панель: силуэт мага с тремя слотами.
- Правая панель: сетка предметов (или empty state).
- ItemTooltip: скрыт.

### Empty (нет предметов в инвентаре)
- `inventory_grid`: display none.
- `empty_inventory_label`: visible, center right_panel.

---

## Переходы

| Действие | Цель | Тип |
|----------|------|-----|
| Клик `back_button` | WorldMap | Slide-right 0.3s |
| Клик `nav_item_map` | WorldMap | Slide-right 0.3s |
| Клик `nav_item_character` | Скролл/фокус к левой панели | Нет навигации, highlight |
| Клик `nav_item_inventory` (уже здесь) | Нет реакции | — |
| Клик `item_cell` | ItemTooltip (overlay) | Scale+fade 0.25s |
| Клик `equip_button` | Обновление слота + закрытие tooltip | Анимация 0.5s |

---

## Notes for Developer

- `inventory_grid` строится из `shelby_player.inventory` — показывать только те предметы, где `quantity > 0`.
- `item_cell_equipped_badge` — сравнивать ключ предмета с `shelby_player.equipment[slot]`.
- `equip_button` disabled: если `equipment[slot] === item_key` (предмет уже надет).
- После экипировки: обновить `equipment[slot] = item_key` в localStorage.
- `bonus_power_value` = сумма BonusPower по трём слотам. Вычисляется из статической таблицы предметов.
- Сетка `inventory_grid`: CSS grid, 5 columns, auto-fill, gap 12px. Padding: 48px сверху (для header), 24px с остальных сторон.
- `mage_silhouette`: статичный SVG-силуэт. Слоты позиционируются абсолютно поверх него.

---

## Notes for Art Director

- `mage_silhouette`: силуэт вида анфас, выполнен в одном тёмном цвете (`#1a0a2e`), контурная линия `#2a1a4a`. Видны силуэт шляпы, плаща, руки с посохом. Высота ~280px.
- `equipment_slot_*`: квадратные ячейки с закруглёнными углами 4px, орнаментальная рамка из тонких угловых линий (не простой border — уголки в стиле рамки попапа).
- `item_cell`: на ячейке тёмный фон, иконка предмета рисованная. Common-предметы: деревянные, потёртые, приземлённые. Шляпы выглядят как шляпы, посохи как посохи — без упрощения до иконок.
- `tooltip_rarity_bar` (6px вертикальная полоска слева) — основной цветовой маркер редкости. Остальные цвета редкости — вторичные.
- Правая панель: небольшой внутренний отступ и орнаментальный заголовок "ПРЕДМЕТЫ" с линиями-разделителями по бокам (────── ПРЕДМЕТЫ ──────).
