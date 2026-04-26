# Sigil Tree — Visual Redesign v2

**Author**: Design Director
**Date**: 2026-04-26
**Status**: APPROVED concept, awaits coder implementation
**Replaces**: 2026-04-18 cosmic-constellation iteration (REJECTED — "убого")
**Files affected later**: `src/js/passives_canvas.js`, `src/css/passives.css`, `index.html`

---

## 0. Diagnosis — почему текущий "выглядит убого"

Текущий рендер пытается быть всем сразу: космос (звёзды + 4 nebulae), готическая рамка (corner ornaments + clip-path), runic sigil крутится в центре, золотые искры падают сверху. Слишком много идей в одном кадре, ни одна не доминирует. Капюшон-кадр `#0d1130` с акцентом `#c9a84c` — это палитра старого dark-fantasy спека, она **конфликтует** с принятой `cute-minimalism` 12-цветной палитрой. Нужен полный визуальный pivot, а не очередной декоративный слой.

**Vision**: вместо космоса — **тёмная плитка крипта с выгравированными рунами**. Дерево — это не "звёзды на небе", а **алтарь-табличка**, на которой проступают руны по мере вложения Sigils. Это сразу синхронизирует Sigil Tree с эстетикой dungeon'а (Pyromancer и зомби живут в том же мире).

---

## 1. Layout (общая композиция)

```
┌─────────────────────────────────────────────────────────────┐
│  ◀ BACK    SIGIL TREE        Sigils: 12                     │ ← header 56px, #05050a bg, gold #e8b44a 1px bottom border
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  CHAR    │                                                  │
│  CARD    │            ╔════════════════════╗               │
│  220px   │            ║                    ║               │
│          │            ║   CONSTELLATION    ║   NODE         │
│  Sigils  │            ║   (canvas, takes   ║   PANEL        │
│  Big #   │            ║   ~70% width,     ║   260px        │
│          │            ║   centered)       ║                │
│  Legend  │            ║                    ║   - Name       │
│          │            ╚════════════════════╝   - Type tag  │
│  Respec  │                                     - Effect    │
│  btn     │      Pan/zoom hint bottom-right     - Cost      │
│          │                                     - Unlock btn│
└──────────┴──────────────────────────────────────────────────┘
```

**Ключевые изменения относительно текущего**:
- **Описание ноды переезжает в правую панель 260px** (sticky), вместо плавающего tooltip'а. Tooltip остаётся ТОЛЬКО как hover-имя без описания (имя + type, 2 строки, 140px). Tooltip — для скоростного skim'а; принятие решения — в правой панели.
- **Header** снижается с готической рамки до плоской полосы `#1a1a24` с 1px gold border снизу. Никаких corner ornaments, никаких ::before clip-path стрелок.
- **Левая панель** теряет двойную gold-обводку и bg gradient. Становится плоской `#1a1a24` с 1px `#3a3a4a` правым бордером.
- **Канвас** теряет cosmic frame, gothic arch, corners. Получает прямой 1px бордер `#e8b44a` 30% alpha — и всё.

---

## 2. Topology — выбор: **Hex-Cluster Constellation (modified)**

Рассмотренные варианты:
- **Radial spokes** — слишком "wheel of fortune", плохо масштабируется на 30+ нод
- **PoE-organic freeform** — мощно, но требует ручной разметки каждой ноды и непрозрачно для игрока
- **Pure hex grid** — слишком "PuzzleQuest", теряет magical vibe
- **Hex-cluster constellation** ← **выбрано**

**Hex-cluster constellation**: ноды лежат на воображаемой hex-сетке (snap to hex centres), но связи между ними — **кривые Безье**, не прямые линии. Hex даёт регулярность и инженерную чистоту, кривые — органику и "магический поток". Это решает обе проблемы радиальной (бедность) и фриформа (хаос).

**Кластеры**:
- **Universal cluster** — top-left, 8 нод в плотном hex-патче (2 ряда × 4 ноды)
- **Class cluster** — центр, 18-22 ноды организованы в 3 кольца:
  - **Inner ring** — 6 starter minor нод (близко к центру)
  - **Middle ring** — 8-10 minor + major нод
  - **Outer ring** — 4-6 keystone (углы и направления — каждый keystone "тянет" к себе)
- **Центр** — пустой hex с runic glyph класса (Pyromancer = огонь, Stormcaller = молния, etc). Декоративный, не кликабельный, но **пульсирует с прогрессом**: чем больше нод unlocked, тем ярче glow.

**Связи (кривые)**: каждое ребро — quadratic Bezier с control point'ом, смещённым на 15-20% длины ребра в перпендикуляре. Это даёт лёгкий изгиб, как будто это "ley line", а не CAD-чертёж. Активные рёбра (обе ноды unlocked) — толще, светятся, имеют 2-3 движущихся искры.

---

## 3. Палитра (наследует cute-minimalism)

| Role | Hex | Описание |
|---|---|---|
| **Canvas BG** | `#0e0e18` | Shadow Ink — основа полотна |
| **Tile Grid** | `#1a1a24` | Crypt Stone — едва видимая hex-сетка под нодами (2% alpha) |
| **Locked Node** | `#3a3a4a` | Moss Grey — недоступная руна, тусклая |
| **Available Node** | `#e8b44a` | Ember Gold — пульсирует, "приглашает" |
| **Unlocked Node** | `#ff7a1a` | Fire Orange — активная (горящая руна) |
| **Class Accent** | per-class | Пиромансер `#ff7a1a`, Storm `#8b5cd6`, Tide `#5c9fd6`*, Geo `#5cd66b` |
| **Edge Locked** | `#3a3a4a` 25% | едва видимая кривая |
| **Edge Active** | gradient class-accent → `#e8b44a` | поток |
| **Text Primary** | `#d8d2c0` | Bone — все labels |
| **Text Dim** | `#3a3a4a` | locked node labels |

*Tide blue — единственное расширение палитры (новый стихийный цвет, в рамках допущения §1.5 cute-minimalism guide).

**Запрещено**: фиолетовый `#0d1130`, navy `#080c1e`, синий `#9db8d4` из старого CSS. Они уходят. Никаких `linear-gradient(180deg, #0d0a1a, ...)`. Никаких box-shadow с blur > 8px.

---

## 4. Состояния нод

Все ноды — **hexagonal tiles**, не stars. Hex даёт snap-to-grid и читается как "руна-плитка".

### Locked
- Hex fill `#1a1a24`, hex border 1px `#3a3a4a`
- Внутри: символ руны (см. §6) `#3a3a4a` 30% alpha
- Без glow, без анимации

### Available
- Hex fill `#1a1a24`, border 1px `#e8b44a`
- Внутри: руна `#e8b44a` 70%
- **Пульсация**: border alpha 0.5↔1.0 за 1.6 сек (sin), радиус не меняется
- Тонкое внешнее свечение (8px blur, `#e8b44a` 25% alpha)

### Unlocked
- Hex fill — **gradient** `#3a2418` (centre) → `#1a1a24` (rim), это даёт тёплое "горящее" дно
- Border 1.5px solid class-accent (`#ff7a1a` для Pyromancer)
- Внутри: руна полная class-accent + 1px highlight `#e8b44a`
- **Glow**: 12px blur, class-accent 40% alpha, пульсирует тише (alpha 0.3↔0.5, 3 сек)
- Keystone unlocked — добавляется тонкое вращающееся 6-точечное гало (1px dots class-accent на радиусе 1.5x от hex)

### Hovered
- Любое состояние + дополнительный hex inset 2px внутри основного hex'а (#e8b44a 60%)
- Cursor: pointer
- Highlights связанных рёбер (становятся ярче на 30%)

### Class-restricted (нода другого класса, видно но недоступно)
- Сейчас пользователь видит только ноды своего класса. Решение остаётся.
- Если в будущем добавим показ всех классов (unlikely), они отображаются как **silhouette only**: hex border `#3a3a4a` 0.5px, внутри пусто, без руны. Не кликаются. Tooltip: "Class: Stormcaller — locked".

---

## 5. Анимации (немного, не цирк)

Жёсткое правило: всё движется **медленно** или **по триггеру**. Никаких 60fps fireworks.

| Element | Animation | Speed |
|---|---|---|
| Available node border | sin pulse alpha | 1.6s loop |
| Unlocked node glow | sin pulse alpha (тише) | 3.0s loop |
| Active edge | 2 искры движутся вдоль кривой | speed 0.0015/frame (медленнее текущего) |
| Center class glyph | rotation | 60 секунд на полный оборот |
| Center class glow intensity | scales with unlocked node count | static state, не анимация |
| Node unlock event | hex flash white 100ms → class-accent | one-shot |
| Hover state transition | border + inset fade | 150ms ease-out |
| Pan/zoom | smooth follow cursor для zoom | already implemented, оставить |

**Удаляется**:
- Cosmic nebulae layers (4 штуки) — выкинуть
- Background star field (320 stars) — выкинуть
- Falling gold sparks — выкинуть
- Cursor beams (linecast от cursor к близким нодам) — выкинуть
- Magic circle с ⛤ — выкинуть
- Parallax mouse-follow для всего layer'а — выкинуть (zoom/pan остаётся)

Это всё было компенсацией за "убогую" статику. После редизайна сами ноды интересны — никаких backstage эффектов не нужно.

---

## 6. Иконки рун (внутри hex)

Каждая нода рисуется кодом как **простой geometric glyph 8×8** в центре hex'а. Не буквы, не unicode-символы (они выглядят как текст, не как руна). Примеры:

- Damage-bonus minor: 3 vertical strokes ↑↑↑
- Crit-chance minor: rotated cross +
- Health-bonus minor: rounded square ▢
- Mana-cost reduction: triangle pointing up △
- Major (powerful): diamond ◆
- Keystone: 6-point star (drawn as 2 overlapping triangles)
- Universal: small circle inside hex ⊙

12 базовых glyph'ов закрывают 90% случаев. Уникальные keystone'ы получают индивидуальный glyph (4-6 уникальных). Все рисуются процедурно через Canvas paths, никаких SVG-ассетов.

---

## 7. Типографика

- **Header** "SIGIL TREE": `Cinzel`, 22px, letter-spacing 0.28em, color `#e8b44a`. (web-safe fallback: `Georgia, serif`)
- **Node label** (под hex'ом): `Cinzel`, 11px, color `#d8d2c0` (unlocked) / `#3a3a4a` (locked). Wrap до 2 строк.
- **Right panel — node name**: `Cinzel`, 18px, color `#e8b44a`.
- **Right panel — node description**: `Crimson Text` italic, 14px, color `#d8d2c0`, line-height 1.5.
- **Right panel — type/cost labels**: `Cinzel`, 11px uppercase, letter-spacing 0.08em, color `#3a3a4a`.
- **Tooltip** (hover на ноде): `Cinzel`, 13px, color `#d8d2c0`, без описания.

Шрифты Cinzel + Crimson Text уже подключены — оставляем. Они подходят dark fantasy, web-safe fallback есть.

---

## 8. Mood — "выглядит как..."

1. **Алтарь-табличка из крипта Hollow Knight** — каменная плита с проступающими светящимися символами, тёмный фон, минимальные акценты, никакого космоса.
2. **Inventory grid в Path of Exile, но в 3 раза менее загруженный** — структурная hex-сетка, чёткие плитки, ничего лишнего.
3. **UI Hades после первого прохождения** — тёмная база, золотая обводка как единственный декоративный элемент, всё остальное — чистая геометрия.
4. **Тёмная плитка-головоломка из Manifold Garden** — гипнотическая регулярность сетки, акценты дают ощущение progress'а.

---

## 9. CSS-доступность — что генерится, что кодится

**Без новых ассетов вообще.** Всё рисуется на Canvas (ноды, рёбра, glyph'ы) + CSS (header, левая/правая панель, респек-кнопка).

Опционально — **1 SVG-ассет**: центральный class glyph (4 файла, по одному на класс — Pyromancer, Stormcaller, Tidecaster, Geomancer). Каждый ~32×32 SVG с monochromatic shape, фигуру coder сам залит class-accent цветом. Если генерация SVG лишняя — Canvas нарисует свою стилизованную руну. Я бы предпочёл всё на Canvas, чтобы исключить ассет-pipeline.

---

## 10. Acceptance checklist

- [ ] Канвас занимает центр, без gothic frame, без corner ornaments
- [ ] Right node panel 260px заменяет floating tooltip с описанием
- [ ] Hex-cluster constellation, кривые Безье вместо прямых рёбер
- [ ] Палитра только из cute-minimalism 12 colors + tide blue
- [ ] 4 node states: locked / available / unlocked / hovered (ясно различимы за 0.3 сек)
- [ ] 2 анимации: pulse available node, drift sparks по active edge
- [ ] Удалены: nebulae, background stars, falling sparks, cursor beams, magic circle, parallax
- [ ] Hex glyphs процедурные, без unicode-символов как маркеров

---

## 11. Открытые вопросы для game-designer

1. Сколько keystone нод на класс? Текущий код подразумевает гибкость — для outer ring оптимально 4-6.
2. Должна ли центральная class glyph быть кликабельной (например, "respec class")? Сейчас не предусмотрено — оставляем декорацией.
3. Появятся ли межклассовые ноды? Если да — где они физически живут на канвасе? Предложение: отдельный 5-й кластер "ASCENDANT" под Universal'ом.

---

**Версия**: 2.0
**Готов к imp**: после согласования с game-designer
