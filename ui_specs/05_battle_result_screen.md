# BattleResultScreen — Результат боя

## Описание
Полный экран, появляющийся после завершения 3 раундов боя. Показывает результат (победа/провал), полученные золото и XP, и при наличии — выпавший предмет. При level up поверх этого экрана открывается LevelUpPopup.

---

## Допущения
- [ASSUMPTION] Экран рендерится с fade-in поверх BattleScreen.
- [ASSUMPTION] Предмет выпадает только при победе (3% шанс Common-дропа по GDD).
- [ASSUMPTION] Level up проверяется после зачисления XP — если сработал, LevelUpPopup показывается автоматически поверх этого экрана.
- [ASSUMPTION] Кнопка "Продолжить" всегда одна, поведение зависит от контекста (следующий бой или карта).
- [ASSUMPTION] Бонус за серию 5 побед (+25 золота +50 XP) добавляется к награде последнего боя в серии и показывается отдельной строкой.

---

## Layout (1280px+, fullscreen)

```
┌──────────────────────────────────────────────────────────┐  0%
│                                                         │
│              ПОБЕДА! / МАНЕКЕН УСТОЯЛ                   │  12%
│              ─────────── ✦ ─────────────                │  18%
│                                                         │
│              [анимация результата — частицы]            │  22-38%
│              [или: манекен целый / обломки]             │
│                                                         │
│         +[N] золота        +[N] XP                     │  42%
│         [иконка монет]     [иконка XP]                  │
│                                                         │
│         [бонус серии — если есть]                       │  52%
│                                                         │
│         ╔══════════════════════════════╗                │  58%
│         ║ НОВЫЙ ПРЕДМЕТ! (если выпал) ║                │
│         ║ [карточка предмета]          ║                │
│         ╚══════════════════════════════╝                │
│                                                         │
│              [ ПРОДОЛЖИТЬ ]  (кнопка)                   │  80%
│                                                         │
│         Осталось боёв сегодня: [N] / 5                  │  88%
└──────────────────────────────────────────────────────────┘ 100%
```

---

## Элементы

### Результат (заголовок)

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `result_bg` | div | fullscreen | 100vw 100vh | bg `#0a0e27` gradient, victory/defeat overlay | — |
| `result_title` | h1, Cinzel | top 12%, center-x | font-size 48px | победа: `#c9a84c`; провал: `#8a7a6a` | статичный |
| `result_subtitle` | p, Crimson Text | top 19%, center-x | font-size 18px italic | `#8a7a6a` | статичный |
| `result_divider` | div | top 23%, center-x | 300×1px + ромб | `#3a2a5a` / `#c9a84c` | — |
| `result_visual` | div анимированный | top 26%, center-x | 200×120px | зависит от результата | анимация при появлении |

### Награды

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `reward_row` | div flex | top 43%, center-x | auto × 40px | — | — |
| `gold_reward_icon` | SVG монета | left в reward_row | 28×28px | `#c9a84c` | — |
| `gold_reward_amount` | span, Cinzel | рядом с иконкой | font-size 22px | `#c9a84c` | counter-up анимация |
| `gold_reward_label` | span, Crimson Text | под amount | font-size 13px | `#8a7a6a` | "золото" |
| `xp_reward_icon` | SVG звезда | right в reward_row | 28×28px | `#2ecc71` | — |
| `xp_reward_amount` | span, Cinzel | рядом с иконкой | font-size 22px | `#2ecc71` | counter-up анимация |
| `xp_reward_label` | span, Crimson Text | под amount | font-size 13px | `#8a7a6a` | "опыт" |
| `streak_bonus_row` | div | top 52%, center-x | auto | — | visible только при 5-й победе подряд |
| `streak_bonus_text` | span, Cinzel | center streak_bonus_row | font-size 16px | `#c9a84c` | "Бонус серии: +25 зол. +50 XP" |

### Карточка предмета (только при дропе)

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `item_drop_container` | div | top 57%, center-x | 320×120px | bg `#1a0a2e`, border 2px по редкости | visible / hidden |
| `item_drop_header` | span, Cinzel | top 8px, center | font-size 13px | `#8a7a6a` | "НАЙДЕННЫЙ ПРЕДМЕТ" |
| `item_rarity_indicator` | div | left 16px, vcenter | 6×48px | цвет редкости | — |
| `item_icon` | SVG/img | left 36px, vcenter | 48×48px | — | — |
| `item_name` | span, Cinzel | right от иконки, top | font-size 16px | цвет редкости | — |
| `item_slot_label` | span, Crimson Text | под item_name | font-size 12px | `#8a7a6a` | слот предмета |
| `item_bonus_power` | span, Cinzel | right от иконки, bottom | font-size 14px | `#2ecc71` | "+N к силе" |

### Нижняя часть

| Элемент | Тип | Позиция | Размер | Цвет | Состояния |
|---------|-----|---------|--------|------|-----------|
| `continue_button` | button | top 80%, center-x | 240×52px | bg `#0a2e1a`, border `#2ecc71` | default / hover / active |
| `continue_button_text` | span, Cinzel | center кнопки | font-size 20px | `#e8e0d0` | — |
| `fights_left_label` | p, Crimson Text | top 89%, center-x | font-size 14px | `#8a7a6a` | динамический |

---

## Текстовые значения по состоянию результата

### Победа
- `result_title`: "МАНЕКЕН УНИЧТОЖЕН!"
- `result_subtitle`: "Ваша магия нашла цель."
- `result_bg`: едва заметный золотисто-зелёный gradient overlay `#c9a84c` opacity 0.04.
- Частицы: 15–20 золотых и зелёных осколков взлетают от нижнего края за 1.5s.

### Провал
- `result_title`: "МАНЕКЕН УСТОЯЛ"
- `result_subtitle`: "Сила ещё не пришла к вам."
- `result_bg`: синевато-серый overlay `#3a3a5a` opacity 0.06.
- Частицы: нет.

### Бои исчерпаны (fightsToday = 5 после этого боя)
- `fights_left_label`: "Все попытки на сегодня исчерпаны. Возвращайтесь завтра."
- `continue_button_text`: "НА КАРТУ"

### Бои ещё есть
- `fights_left_label`: "Осталось боёв сегодня: [N] / 5"
- `continue_button_text`: "СЛЕДУЮЩИЙ БОЙ" или "НА КАРТУ" — кнопка одна, текст зависит

[ASSUMPTION]: Кнопка всегда одна. Если бои остались — "СЛЕДУЮЩИЙ БОЙ". Если исчерпаны — "НА КАРТУ".

---

## Анимация появления карточки предмета

1. `item_drop_container` изначально hidden (display:none, opacity 0).
2. Появляется через 1.2s после fade-in экрана.
3. Сначала появляется header "НАЙДЕННЫЙ ПРЕДМЕТ" (fade-in 0.3s).
4. Затем карточка scale 0.7 → 1.05 → 1.0 за 0.4s.
5. Box-shadow по цвету редкости пульсирует дважды: `0 0 30px [rarity_color]aa` → `0 0 0px` → `0 0 30px [rarity_color]44`.

---

## Цвета редкостей (для `item_rarity_indicator`, `item_name`, border `item_drop_container`)

| Редкость | Цвет |
|----------|------|
| Common | `#e8e0d0` (белый/пергамент) |
| Uncommon | `#2ecc71` (зелёный) |
| Rare | `#4477cc` (синий) |
| Epic | `#9944cc` (фиолетовый) |
| Legendary | `#ff8800` (оранжевый) |

В MVP только Common (#e8e0d0).

---

## Состояния и поведение

### Появление экрана
- Fade-in из BattleScreen: opacity 0 → 1, 0.5s.
- Элементы появляются последовательно:
  - t=0: bg.
  - t=200ms: `result_title` (slide-down 20px + fade-in, 0.4s).
  - t=400ms: `result_subtitle` (fade-in 0.3s).
  - t=600ms: частицы (победа) или нет (провал).
  - t=700ms: `reward_row` — числа начинают counter-up анимацию (от 0 до значения за 0.8s).
  - t=800ms: `streak_bonus_row` (если активен) — fade-in.
  - t=1200ms: `item_drop_container` (если дроп) — анимация карточки.
  - t=1500ms: `continue_button` — scale 0.9 → 1.0 + fade-in.
  - t=1600ms: `fights_left_label` — fade-in.

### Hover (continue_button)
- Bg: `#0a3d20`.
- Border opacity: 1.0.
- Box-shadow: `0 0 20px #2ecc7133`.
- Transition: 0.2s.

### Active (continue_button)
- Scale: 0.97.
- Transition: 0.1s.

---

## Переходы

| Действие | Условие | Цель | Тип |
|----------|---------|------|-----|
| Клик `continue_button` | fightsToday < 5 | BattleScreen (новый бой) | Fade-out 0.3s → Fade-in |
| Клик `continue_button` | fightsToday === 5 | WorldMap | Slide-right 0.35s |
| Level up произошёл | Автоматически | LevelUpPopup (overlay) | Scale+fade-in 0.35s |
| LevelUpPopup закрыт | Автоматически | BattleResultScreen остаётся | — |

---

## Notes for Developer

- Вычислить результат до fade-in экрана: `isVictory = dummy_hp_remaining <= 0`.
- Золото и XP: начислить в localStorage сразу при открытии экрана (до анимации).
- Бонус серии: если `combat.consecutiveWins` после этого боя === 5 → добавить +25 gold +50 xp, показать `streak_bonus_row`.
- Проверка level up: после начисления XP сравнить `xp >= xp_required(level)`. Если да — инкрементировать level, обнулить XP (остаток переносить: `xp = xp - xp_required(old_level)`), показать LevelUpPopup.
- Counter-up анимация: использовать requestAnimationFrame, от 0 до целевого числа за 800ms, easeOut.
- `item_drop_container`: если `isVictory && random() < 0.03` → выбрать случайный Common-предмет из пула, добавить в localStorage `inventory[item_key]++`, показать карточку.

---

## Notes for Art Director

- `result_visual` для победы: SVG или CSS-анимация обломков манекена, разлетающихся в стороны. Деревянные доски разлетаются из центра. Длительность 1s.
- `result_visual` для провала: манекен стоит целый, мерно покачивается (как насмехается).
- Частицы победы: не конфетти — золотые ромбы и изумрудные искры, геометрически строгие.
- Карточка предмета: рамка с орнаментом по редкости. Common — тонкая белая рамка, спокойная. Фон карточки чуть светлее `#1a0a2e`.
- Кнопка "Продолжить" — идентична `enter_button` на LoadingScreen по визуальному весу.
