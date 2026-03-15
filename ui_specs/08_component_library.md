# Veyra — Мастер-таблица компонентов UI

## Описание
Все переиспользуемые UI-компоненты проекта. Разработчик реализует каждый компонент один раз и переиспользует по экранам.

---

## Цветовые токены

| Токен | Hex | Назначение |
|-------|-----|------------|
| `color-bg-primary` | `#0a0e27` | Основной фон экранов |
| `color-bg-secondary` | `#1a0a2e` | Фон попапов, карточек, панелей |
| `color-bg-accent-green` | `#0a2e1a` | Фон кнопок с зелёным акцентом |
| `color-gold` | `#c9a84c` | Золото: монеты, заголовки, акценты |
| `color-emerald` | `#2ecc71` | Изумруд: XP, открытые локации, успех |
| `color-text-primary` | `#e8e0d0` | Основной текст (пергамент) |
| `color-text-muted` | `#8a7a6a` | Вторичный текст, подписи |
| `color-border-default` | `#3a2a5a` | Рамки, разделители |
| `color-border-dark` | `#2a1a4a` | Тёмные рамки (claimed ячейки) |
| `color-spell-arcane` | `#4477cc` | Arcane Bolt |
| `color-spell-verdant` | `#2ecc71` | Verdant Flame |
| `color-spell-shadow` | `#9944cc` | Shadow Strike |
| `color-rarity-common` | `#e8e0d0` | Common редкость |
| `color-rarity-uncommon` | `#2ecc71` | Uncommon редкость |
| `color-rarity-rare` | `#4477cc` | Rare редкость |
| `color-rarity-epic` | `#9944cc` | Epic редкость |
| `color-rarity-legendary` | `#ff8800` | Legendary редкость |
| `color-hp-bar` | `#cc4444` | HP бар (враг) |
| `color-overlay-dark` | rgba(0,0,0,0.65) | Затемнение backdrop |

---

## Типографика

| Токен | Шрифт | Weight | Применение |
|-------|-------|--------|------------|
| `font-heading` | Cinzel | 700 | Заголовки экранов, логотип, название локаций |
| `font-heading-light` | Cinzel | 400 | Числа в HUD, счётчики, метки |
| `font-body` | Crimson Text | 400 | Описания, подписи, диалоги |
| `font-body-italic` | Crimson Text | 400 italic | Описания предметов, цитаты |

**Базовые размеры:**

| Размер | px | Применение |
|--------|----|------------|
| `text-xs` | 10px | Крошечные бейджи (НАДЕТ, ВЫ ЗДЕСЬ) |
| `text-sm` | 12–13px | Подписи в ячейках, мелкий UI |
| `text-base` | 15–16px | Основной текст попапов, нав-меню |
| `text-md` | 18px | Названия предметов, кнопки |
| `text-lg` | 22–24px | Заголовки секций |
| `text-xl` | 36–48px | Result screen title |
| `text-2xl` | 72–96px | Логотип, Level number display |

---

## Компоненты

### 1. PrimaryButton

| Свойство | Значение |
|----------|----------|
| Высота | 48–52px |
| Минимальная ширина | 160px |
| Padding | 0 24px |
| Bg default | `#0a2e1a` |
| Border | 1px `#2ecc71` opacity 0.6 |
| Text | Cinzel 18–20px, `#e8e0d0` |
| Hover | bg `#0a3d20`, border opacity 1.0, box-shadow `0 0 20px #2ecc7133` |
| Active | scale 0.97 |
| Disabled | opacity 0.4, cursor not-allowed |
| Border-radius | 2px |

**Используется на:** LoadingScreen (`enter_button`), BattleResultScreen (`continue_button`), InventoryScreen (`equip_button` — вариант)

---

### 2. GoldButton

| Свойство | Значение |
|----------|----------|
| Высота | 48px |
| Минимальная ширина | 160px |
| Bg default | `#c9a84c` |
| Text | Cinzel 18px, `#0a0e27` |
| Hover | bg `#d4b55c`, box-shadow `0 0 20px #c9a84c66`, scale 1.02 |
| Active | scale 0.96, bg `#a8893d` |
| Disabled | opacity 0.5, cursor not-allowed |
| Border-radius | 2px |

**Используется на:** DailyLoginPopup (`claim_button`), LevelUpPopup (`accept_button`)

---

### 3. SpellButton

| Свойство | Значение |
|----------|----------|
| Высота | 88px |
| Ширина | calc(33.3% - 16px) |
| Padding | 12px |
| Layout | flex column, align center |
| Border | 1px цвет заклинания, opacity 0.6 |
| Bg | тёмный фон по цвету заклинания |
| Icon | 32px, top |
| Name | Cinzel 15px, center |
| Damage range | Crimson Text 13px, `#8a7a6a` |
| Hover | border opacity 1.0, box-shadow `0 0 16px [color]66`, scale 1.02 |
| Active | scale 0.97 |
| Disabled | opacity 0.4, cursor not-allowed |
| Border-radius | 2px |

**Варианты:** arcane (#4477cc bg #0a1a3e), verdant (#2ecc71 bg #0a2e1a), shadow (#9944cc bg #1a0a2e)

**Используется на:** BattleScreen

---

### 4. ModalContainer

| Свойство | Значение |
|----------|----------|
| Backdrop | `#000` opacity 0.65, backdrop-filter blur 4–6px |
| Container bg | `#1a0a2e` |
| Container border | 1px `#3a2a5a` |
| Border-radius | 2px |
| Padding | 24–32px |
| Ornament corners | SVG, `#c9a84c` уголки 8px |
| Появление | scale 0.85→1.0 + opacity 0→1, 0.35s ease-out |
| Закрытие | scale 1.0→0.9 + opacity→0, 0.25s |

**Используется на:** DailyLoginPopup, LevelUpPopup, ItemTooltip (вариант без backdrop-blur)

---

### 5. HUDBar

| Свойство | Значение |
|----------|----------|
| Высота | 52–56px |
| Bg | `#0a0e27cc` (полупрозрачный) |
| Border-bottom | 1px `#3a2a5a` |
| Z-index | всегда поверх контента |

**Стандартное содержимое:** имя персонажа / заголовок экрана (left), кнопка назад (left), данные персонажа (right)

**Используется на:** WorldMap (top HUD), BattleScreen (top bar), InventoryScreen (top bar)

---

### 6. BottomNavBar

| Свойство | Значение |
|----------|----------|
| Высота | 64px |
| Bg | `#0a0e27ee` |
| Border-top | 1px `#3a2a5a` |
| Tabs | 3 равных: Карта, Инвентарь, Персонаж |
| Icon размер | 24×24px SVG |
| Label | Cinzel 11px |
| Default state | icon `#8a7a6a`, label `#8a7a6a` |
| Active state | icon `#c9a84c`, label `#c9a84c`, border-top-inner 2px `#c9a84c`, bg `#1a0a2e` |
| Hover (не активный) | icon `#e8e0d0`, label `#e8e0d0`, transition 0.15s |

**Используется на:** WorldMap, InventoryScreen (и потенциально все будущие экраны)

---

### 7. XPBar

| Свойство | Значение |
|----------|----------|
| Размер контейнера | 200×16px |
| Bg | `#1a0a2e` |
| Border | 1px `#3a2a5a` |
| Fill цвет | `#2ecc71` |
| Fill анимация | width transition 0.6s ease при обновлении |
| Label | Cinzel 11px, center, `#e8e0d0` |
| Format | "[текущий XP] / [необходимый XP] XP" |
| Border-radius | 1px |

**Используется на:** WorldMap (HUD)

---

### 8. HPBar (вражеский)

| Свойство | Значение |
|----------|----------|
| Размер контейнера | 300×18px |
| Bg | `#1a0a2e` |
| Border | 1px `#3a2a5a` |
| Fill цвет | gradient `#cc4444` → `#ff6666` |
| Fill анимация | width transition 0.4s ease при уроне |
| Label | Cinzel 12px, center, `#e8e0d0` |
| Format | "[HP] / 100" |

**Используется на:** BattleScreen

---

### 9. ItemCard (карточка предмета)

Минимальный вариант (в сетке инвентаря):

| Свойство | Значение |
|----------|----------|
| Размер | 72×88px |
| Bg | `#1a0a2e` |
| Border | 1px `#3a2a5a` |
| Icon | 40×40px, center-top |
| Name | Crimson Text 10px, 2 строки, center-bottom |
| Rarity dot | 8×8px circle, top-right |
| Equipped badge | "НА МАСТЕРЕ" 9px, bottom-left |
| Hover | border → rarity color, scale 1.03 |

Расширенный вариант (ItemTooltip):

| Свойство | Значение |
|----------|----------|
| Размер | 320×280px |
| Rarity bar | 6×280px, left side |
| Icon | 56×56px |
| Name | Cinzel 18px, rarity color |
| Slot | Crimson Text 13px |
| BonusPower | Cinzel 18px, `#2ecc71` |
| Description | Crimson Text 14px italic, `#8a7a6a` |

**Используется на:** InventoryScreen (оба варианта), BattleResultScreen (drop card — средний вариант)

---

### 10. DamageNumber

| Свойство | Значение |
|----------|----------|
| Текст | "-[N]" |
| Шрифт | Cinzel bold |
| Размер | 32px |
| Цвет | `#e8e0d0` |
| Outline | 1px solid `#0a0e27` |
| Анимация | translateY -40px за 1000ms + opacity 1→0 начиная с 600ms |
| Создание | динамический DOM-элемент, удаляется после 1500ms |

**Используется на:** BattleScreen

---

### 11. OrnamentalDivider

| Свойство | Значение |
|----------|----------|
| Ширина | 80% родителя (или явно заданная) |
| Высота | 1px |
| Цвет линии | `#3a2a5a` |
| Центральный ромб | 8×8px, `#c9a84c`, rotate 45deg |
| Отступы | 16px сверху и снизу |

**Используется на:** DailyLoginPopup, LevelUpPopup, ItemTooltip

---

### 12. GoldBadge

| Свойство | Значение |
|----------|----------|
| Icon | 18–20px SVG монета |
| Amount | Cinzel 14–22px, `#c9a84c` |
| Layout | flex row, gap 6px, align center |

**Используется на:** WorldMap HUD, InventoryScreen HUD, BattleResultScreen

---

### 13. LevelBadge

| Свойство | Значение |
|----------|----------|
| Размер | 32–52px (два варианта) |
| Bg | `#1a0a2e` |
| Border | 1px `#c9a84c` |
| Text | Cinzel, `#c9a84c` |
| Format маленький | "[N]" |
| Format большой | "УР. [N]" |

**Используется на:** WorldMap HUD, InventoryScreen HUD

---

### 14. LocationIcon

| Свойство | Значение |
|----------|----------|
| Размер | 48×48px |
| Форма | круг или ромб (по локации) |
| Open border | 1px `#2ecc71` |
| Locked border | 1px `#2a1a4a` dashed |
| Open hover | box-shadow `0 0 16px #2ecc7166`, scale 1.08 |
| Lock overlay | `#0a0e27` opacity 0.7 |
| Lock icon | замок SVG 20×20px, `#3a2a5a` |

**Используется на:** WorldMap

---

## Сводная таблица использования компонентов по экранам

| Компонент | LoadingScreen | DailyLoginPopup | WorldMap | BattleScreen | BattleResult | InventoryScreen | LevelUpPopup |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| PrimaryButton | ✓ | — | — | — | ✓ | ✓ | — |
| GoldButton | — | ✓ | — | — | — | — | ✓ |
| SpellButton | — | — | — | ✓ | — | — | — |
| ModalContainer | — | ✓ | — | — | — | ✓(tooltip) | ✓ |
| HUDBar | — | — | ✓ | ✓ | — | ✓ | — |
| BottomNavBar | — | — | ✓ | — | — | ✓ | — |
| XPBar | — | — | ✓ | — | — | — | — |
| HPBar | — | — | — | ✓ | — | — | — |
| ItemCard (мини) | — | — | — | — | — | ✓ | — |
| ItemCard (полный) | — | — | — | — | ✓ | ✓ | — |
| DamageNumber | — | — | — | ✓ | — | — | — |
| OrnamentalDivider | — | ✓ | — | — | ✓ | ✓ | ✓ |
| GoldBadge | — | — | ✓ | — | ✓ | ✓ | — |
| LevelBadge | — | — | ✓ | — | — | ✓ | — |
| LocationIcon | — | — | ✓ | — | — | — | — |

---

## Анимационные паттерны (глобальные)

| Паттерн | Параметры | Применение |
|---------|-----------|------------|
| `fade-in` | opacity 0→1, 0.3s ease | Большинство переходов |
| `modal-enter` | scale 0.85→1.0 + fade, 0.35s ease-out | Все попапы |
| `modal-exit` | scale 1.0→0.9 + fade, 0.25s | Закрытие попапов |
| `button-hover` | scale 1.02 + glow, 0.15s | Все кнопки |
| `button-press` | scale 0.96–0.97, 0.1s | Все кнопки |
| `counter-up` | от 0 до значения за 0.8s, easeOut | Числа наград |
| `float-idle` | translateY -4px↔0, 2s infinite | Player icon |
| `star-flicker` | opacity 0.4↔1.0, random 1.5–4s | Звёзды на LoadingScreen |
| `screen-push-left` | translateX 0→-100%, 0.35s | Переход вперёд |
| `screen-push-right` | translateX -100%→0, 0.35s | Переход назад |
| `damage-float` | translateY -40px + fade, 1s | DamageNumber |
| `hp-decrease` | width transition 0.4s | HP бар |
| `pulse-glow` | box-shadow min→max→min, 2s infinite | Активные элементы |

---

## Пространственная сетка

**Базовая единица:** 8px.

Все отступы кратны 8: 8, 16, 24, 32, 48px.

**Минимальная ширина:** 1280px.
**Нет адаптации под мобильный** — PC only.
**Центрирование:** контент центрируется при ширине > 1280px. Максимальная ширина игрового контейнера: 1600px.
