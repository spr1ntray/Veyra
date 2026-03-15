# LoadingScreen — Главный экран / Загрузка

## Описание
Первый экран игры. Устанавливает атмосферу dark fantasy, даёт игроку войти в мир. Минимальный UI — только логотип, кнопка и подпись.

---

## Допущения
- [ASSUMPTION] Нет авторизации: кнопка сразу запускает игру (или продолжает сохранение из localStorage).
- [ASSUMPTION] Логотип — текстовый, шрифт Cinzel, не растровый файл.
- [ASSUMPTION] Фоновая анимация — CSS-звёзды, без видео.

---

## Layout (1280px+, fullscreen)

```
┌─────────────────────────────────────────────────────────┐  0%
│                                                         │
│                  [звёздное небо, туман]                 │  5%
│                                                         │
│              ░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│              ░  VEYRA (логотип)       ░               │ 30–42%
│              ░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│                                                         │
│                 [подзаголовок]                          │  47%
│                                                         │
│              [ ВОЙТИ В МИР ]  (кнопка)                 │  58%
│                                                         │
│                                                         │
│                                                         │
│                  Built on Shelby                        │  95%
└─────────────────────────────────────────────────────────┘ 100%
```

---

## Элементы

| Элемент | Тип | Позиция (% от экрана) | Размер | Цвет | Состояния |
|---------|-----|----------------------|--------|------|-----------|
| `bg_canvas` | canvas / div | 0% 0% (fullscreen) | 100vw 100vh | `#0a0e27` градиент до `#1a0a2e` | — |
| `star_particle_layer` | анимированный слой | 0% 0% (fullscreen) | 100vw 100vh | белые точки, opacity 0.6–1.0 | анимация: мерцание бесконечно |
| `moon_glow` | div с blur | top 8%, right 15% | 180×180px | `#e8e0d0` opacity 0.12, box-shadow `#c9a84c` 80px | статичный |
| `fog_layer` | div с gradient | bottom 0%, fullwidth | 100% × 25% высоты | `#1a0a2e` opacity 0.7, fade up | медленное покачивание translateY ±8px, 8s ease-in-out |
| `logo_veyra` | h1, шрифт Cinzel | center-x, top 35% | font-size 96px | `#c9a84c`, text-shadow `0 0 40px #c9a84c88` | default: свечение пульсирует 3s |
| `logo_ornament_left` | декор SVG | left от logo, center-y | 60×8px | `#3a2a5a` | статичный |
| `logo_ornament_right` | декор SVG | right от logo, center-y | 60×8px | `#3a2a5a` | статичный |
| `tagline_label` | p, шрифт Crimson Text | center-x, top 47% | font-size 18px | `#8a7a6a` | статичный |
| `enter_button` | button | center-x, top 58% | 240×52px | bg `#0a2e1a`, border 1px `#2ecc71`, text `#e8e0d0` | default / hover / active |
| `enter_button_text` | span внутри кнопки | center внутри button | font-size 20px, Cinzel | `#e8e0d0` | наследует от button |
| `built_on_label` | p, шрифт Crimson Text | center-x, bottom 4% | font-size 13px | `#3a2a5a` | статичный |

---

## Текстовые значения

| Элемент | Текст |
|---------|-------|
| `logo_veyra` | VEYRA |
| `tagline_label` | *"Тьма не конец пути — она его начало"* |
| `enter_button_text` | ВОЙТИ В МИР |
| `built_on_label` | Built on Shelby |

---

## Состояния и поведение

### Default
- Фон `#0a0e27` → `#1a0a2e` радиальный градиент, центр чуть левее.
- Звёзды: ~120 точек, случайные позиции. Каждая мерцает независимо: opacity 0.4 → 1.0 → 0.4, длительность 1.5–4s (рандом на каждую), ease-in-out, бесконечно.
- Луна: статичный белый круг с размытым золотым свечением, не анимирован.
- Логотип VEYRA: пульсирующий text-shadow `0 0 20px #c9a84c` → `0 0 60px #c9a84ccc`, 3s ease-in-out, infinite.
- Туман внизу: translateY от 0 до -8px и обратно, 8s ease-in-out, infinite.
- Кнопка: border цвет `#2ecc71` opacity 0.6.

### Hover (enter_button)
- Фон кнопки: `#0a3d20` (чуть светлее).
- Border opacity 1.0, цвет `#2ecc71`.
- Text-shadow кнопки: `0 0 12px #2ecc71aa`.
- Box-shadow кнопки: `0 0 20px #2ecc7133` снаружи.
- Cursor: pointer.
- Transition: all 0.2s ease.

### Active (enter_button при клике)
- Scale: 0.97.
- Фон: `#061a0d`.
- Transition: 0.1s.

### Загрузка после клика (loading state)
- Кнопка переходит в disabled.
- Текст кнопки меняется на три мерцающих точки: `· · ·` (каждая появляется последовательно, 0.4s interval).
- Border opacity 0.4.
- Длительность: 800ms (время инициализации из localStorage).

---

## Переходы

| Действие | Цель | Тип перехода |
|----------|------|--------------|
| Клик `enter_button` (новый день) | DailyLoginPopup | Fade-out экрана (0.4s) → Fade-in WorldMap → появление Popup (0.3s scale + fade) |
| Клик `enter_button` (тот же день) | WorldMap | Fade-out (0.4s) → Fade-in WorldMap |

---

## Анимация звёзд — технические параметры для разработчика

- Количество точек: 120.
- Размер: 1–3px, случайный.
- Позиция: случайная в пределах 100vw × 70vh (только верхние 70% экрана).
- Opacity animation: `keyframes flicker { 0%,100% {opacity:0.4} 50% {opacity:1} }`.
- Каждая звезда: `animation-duration: random(1.5s, 4s)`, `animation-delay: random(0s, 5s)`.
- ~10% звёзд имеют размер 4–5px и opacity до 1.0 — "яркие" звёзды, без изменений.

---

## Notes for Developer

- `bg_canvas` — обычный div с CSS, canvas не нужен.
- Звёзды генерируются JS-ом при инициализации: создать 120 div/span, случайные top/left/width, добавить CSS-анимацию.
- Кнопка `enter_button`: при клике сначала читать `localStorage` (sync), затем решать, куда перейти.
- `built_on_label` должен быть всегда видимым поверх тумана — z-index выше `fog_layer`.
- Минимальная ширина экрана: 1280px. Контент центрирован по горизонтали. Вертикально — фиксированные % от 100vh.

---

## Notes for Art Director

- Референс атмосферы: фото `photo_2026-03-15_16-37-08.jpg` (маг смотрит в звёздное небо под деревом) — именно это настроение.
- Луна не должна быть агрессивной — едва заметный белый ореол, намёк, не доминанта.
- Логотип VEYRA: буквы с засечками Cinzel, золотой (#c9a84c), никаких декоративных иконок рядом — только орнаментальные линии по бокам (тонкие, 1px, с ромбом по центру).
- Туман — это размытый градиент снизу вверх, не отдельный слой с текстурой.
- Общее ощущение: тишина, ожидание, нечто огромное за пределами экрана.
