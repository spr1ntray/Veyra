# LevelUpPopup — Повышение уровня

## Описание
Модальное окно, появляющееся автоматически поверх BattleResultScreen, когда набранный XP достигает порога следующего уровня. Объявляет новый уровень, показывает полученные награды. Закрывается кнопкой "Принять".

---

## Допущения
- [ASSUMPTION] Попап всегда появляется поверх BattleResultScreen — никогда во время боя.
- [ASSUMPTION] Если за один бой набирается достаточно XP для нескольких уровней (теоретически на низких уровнях), попапы показываются последовательно, один за другим.
- [ASSUMPTION] После закрытия попапа BattleResultScreen остаётся видимым и доступным.
- [ASSUMPTION] Награды за уровень берутся из статической таблицы GDD (уровни 1-10).

---

## Layout (модальное окно, центр экрана)

```
┌──────────────────────────────────────────────────────────┐
│              [overlay: затемнение + blur]                │
│                                                         │
│     ┌───────────────────────────────────────────────┐   │
│     │  [частицы и свечение по всему окну]           │   │
│     │                                               │   │
│     │          НОВЫЙ УРОВЕНЬ                        │   │
│     │                                               │   │
│     │      ◈  УРОВЕНЬ  [N]  ◈                      │   │
│     │                                               │   │
│     │      ─────────── ✦ ──────────────             │   │
│     │                                               │   │
│     │      НАГРАДЫ:                                 │   │
│     │      • +[N] золота                           │   │
│     │      • [звание, если есть]                   │   │
│     │      • [сундук, если есть]                   │   │
│     │                                               │   │
│     │              [ ПРИНЯТЬ ]                      │   │
│     └───────────────────────────────────────────────┘   │
│                                                         │
└──────────────────────────────────────────────────────────┘
```

**Размер попапа:** 520×380px, center экрана.

---

## Элементы

| Элемент | Тип | Позиция внутри попапа | Размер | Цвет | Состояния |
|---------|-----|----------------------|--------|------|-----------|
| `overlay_backdrop` | div | fullscreen | 100vw 100vh | `#000` opacity 0.75 + backdrop-filter blur 6px | — |
| `levelup_container` | div | center экрана | 520×380px | bg `#1a0a2e`, border 1px `#3a2a5a` | — |
| `levelup_glow_bg` | div | fullsize внутри контейнера | 100% | radial-gradient `#c9a84c` opacity 0.06 → 0 | пульсирует |
| `levelup_border_ornament` | SVG | по периметру | inset 8px | уголки `#c9a84c`, стороны `#3a2a5a` | — |
| `particle_layer` | canvas/div | fullsize | 100% | золотые частицы | активная анимация |
| `levelup_header_label` | span, Cinzel | top 8% popup, center-x | font-size 15px | `#8a7a6a` letter-spacing 4px | "НОВЫЙ УРОВЕНЬ" |
| `level_number_display` | div | top 18% popup, center-x | auto | — | — |
| `level_ornament_left` | SVG ромб | left от number | 20×20px | `#c9a84c` | — |
| `level_number_text` | span, Cinzel | center display | font-size 72px bold | `#c9a84c`, text-shadow glow | анимация появления |
| `level_ornament_right` | SVG ромб | right от number | 20×20px | `#c9a84c` | — |
| `levelup_label_below` | span, Cinzel | под number | font-size 16px letter-spacing 6px | `#c9a84c` | "УРОВЕНЬ" |
| `levelup_divider` | div | top 50% popup | 60% ширины, 1px + ромб | `#3a2a5a` / `#c9a84c` | — |
| `rewards_header` | span, Cinzel | top 56% popup, left 15% | font-size 13px | `#8a7a6a` letter-spacing 3px | "НАГРАДЫ:" |
| `rewards_list` | ul | top 64% popup, left 15% | auto | — | — |
| `reward_item` (×N) | li, Crimson Text | в списке, gap 6px | font-size 16px | `#e8e0d0` | появляются поочерёдно |
| `reward_item_icon` | span | left reward_item | 16px | цвет по типу награды | — |
| `accept_button` | button | bottom 8% popup, center-x | 200×48px | bg `#c9a84c`, text `#0a0e27` | default / hover / active |
| `accept_button_text` | span, Cinzel | center | font-size 18px | `#0a0e27` | "ПРИНЯТЬ" |

---

## Данные наград по уровням (из GDD)

| Новый уровень | Золото | Дополнительно |
|---------------|--------|---------------|
| 2 | +5 | — |
| 3 | +10 | — |
| 4 | +15 | — |
| 5 | +20 | Сундук тренировки |
| 6 | +25 | Звание "Адепт" |
| 7 | +30 | — |
| 8 | +35 | Сундук тренировки |
| 9 | +40 | — |
| 10 | +50 | Звание "Маг Shelby" |

**Формат строк `reward_item`:**
- Золото: `[монета-иконка]  +[N] золота`
- Сундук: `[сундук-иконка]  Сундук тренировки`
- Звание: `[корона-иконка]  Звание "[название]"`

---

## Анимация появления

### Последовательность (от момента открытия попапа):

1. **t=0**: `overlay_backdrop` — fade-in opacity 0 → 0.75, 0.3s. Blur появляется одновременно.
2. **t=0.15s**: `levelup_container` — scale 0.7 → 1.05 → 1.0, opacity 0 → 1, 0.45s ease-out.
3. **t=0.3s**: `particle_layer` — начинают лететь частицы снизу вверх и во все стороны из центра контейнера. 20–30 частиц, gold (#c9a84c) и emerald (#2ecc71).
4. **t=0.5s**: `levelup_glow_bg` начинает пульсировать: opacity 0.02 → 0.1 → 0.02, 1.5s, 3 раза.
5. **t=0.5s**: `levelup_header_label` — fade-in 0.3s + translateY +10px → 0.
6. **t=0.7s**: `level_number_text` — scale 0.3 → 1.2 → 1.0, opacity 0 → 1, 0.5s. Одновременно: text-shadow `0 0 60px #c9a84c` вспыхивает и затухает до `0 0 20px #c9a84c88`.
7. **t=1.1s**: `rewards_header` — fade-in 0.2s.
8. **t=1.2s–1.6s**: `reward_item` появляются по одному, каждый через 0.15s: translateX -10px → 0 + opacity 0 → 1.
9. **t=1.7s**: `accept_button` — scale 0.9 → 1.0 + fade-in 0.25s.

### Частицы (технические параметры)
- Количество: 25.
- Размер: 4–8px, случайный.
- Форма: ромб (rotate 45deg square) или круг — 50/50 рандом.
- Цвет: 70% `#c9a84c`, 30% `#2ecc71`.
- Направление: случайное, радиально от центра контейнера.
- Скорость: translateX/Y от 0 до random(60px, 150px) за random(1s, 2s).
- Opacity: 1 → 0 начиная с 60% пути.
- Повторение: 2 волны (t=0.3s и t=0.8s).

---

## Состояния и поведение

### Default (попап открыт)
- `accept_button`: bg `#c9a84c`, cursor pointer.
- Кнопка активна сразу (не нужно ждать анимации).

### Hover (accept_button)
- Bg: `#d4b55c`.
- Box-shadow: `0 0 20px #c9a84c66`.
- Scale: 1.02.
- Transition: 0.15s.

### Active (при клике)
- Scale: 0.96.
- Bg: `#a8893d`.
- Transition: 0.1s.

### После клика "ПРИНЯТЬ"
1. Награды зачисляются в localStorage (gold, возможно item в inventory).
2. `levelup_container` — scale 1.0 → 0.9 + opacity → 0, 0.3s.
3. `overlay_backdrop` — fade-out 0.25s.
4. BattleResultScreen снова интерактивен.

---

## Edge Cases

### Уровень 10 (максимальный)
- `levelup_header_label`: "МАКСИМАЛЬНЫЙ УРОВЕНЬ"
- Уровень `level_number_text`: "10"
- Дополнительная строка в `rewards_list`: "Вы достигли предела мощи в этом мире..."
- Золотое свечение усилено (текст-тень 0 0 80px #c9a84c).
- После закрытия: в HUD карты уровень отображается как "10 MAX".

### Несколько level-up за один бой
- Попапы показываются последовательно.
- Каждый следующий появляется через 0.3s после закрытия предыдущего.
- Анимации повторяются полностью для каждого.

---

## Переходы

| Действие | Результат |
|----------|-----------|
| Клик `accept_button` | Попап закрывается, BattleResultScreen в фокусе |
| Клик `overlay_backdrop` | Нет реакции (нельзя закрыть без клика "Принять") |

---

## Notes for Developer

- Проверка level up выполняется в BattleResultScreen.js после записи XP в localStorage.
- Логика: `while (xp >= xp_required(level)) { level++; xp -= xp_required(level-1); applyLevelRewards(level); showLevelUpPopup(level); }`
- Попап показывается ПОСЛЕ того, как все данные записаны.
- `accept_button` не блокируется на время анимации — игрок может кликнуть сразу.
- Если сундук тренировки выдан как награда за уровень — добавить случайный Common-предмет в `inventory`, выбрать рандомно из 9 предметов GDD.

---

## Notes for Art Director

- Этот попап — эмоциональный пик сессии. Он должен ощущаться как событие.
- `level_number_text` 72px Cinzel bold с золотым свечением — самый крупный элемент всего UI. Только эта цифра. Размер не компромисс.
- Частицы: строго геометрические (ромбы, квадраты под 45°, маленькие звёзды). Никаких органических форм. Золото и изумруд — только эти два цвета.
- `levelup_glow_bg`: очень тонкий — почти незаметный gold-radial-gradient из центра. Ощущение внутреннего свечения контейнера, не кислотный glow.
- Звание ("Адепт", "Маг Shelby") в `reward_item` выделяется иконкой короны `#c9a84c` и подчёркиванием или курсивом.
- Рамка попапа: тот же стиль, что у DailyLoginPopup — орнаментальные уголки с `#c9a84c`. На LevelUpPopup уголки чуть крупнее (12px вместо 8px) — больший визуальный вес.
