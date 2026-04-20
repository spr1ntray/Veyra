# Veyra — Cute Minimalism Dark Fantasy Style Guide

**Версия**: 1.0
**Дата**: 2026-04-20
**Автор**: Design Director
**Статус**: APPROVED — заменяет `pivot-visual-spec.md` (REJECTED)
**Целевая платформа**: ПК браузер, Canvas 2D, 2D top-down, camera 90° (pure top-down, не 45°)

---

## 0. Почему новый стиль

Предыдущий спек (painterly pixel art 32-bit era, gothic filigree, cool slate + warm bronze, 45° perspective) был отклонён пользователем. Причина — ассеты выглядели "взрослыми", перегруженными, терялись на фоне, не считывались за 0.3 сек. Новый стиль — **cute-minimalism-dark-fantasy** — берёт душевность Deltarune, читаемость Nuclear Throne, тональность Hades UI, и склеивает в узнаваемый собственный голос Veyra.

**Главный принцип**: каждый объект в сцене должен опознаваться по **силуэту**, а эмоциональный тон передаваться через **цвет одной детали** (глаз, огонёк, кристалл). Ни одного лишнего пикселя.

---

## 1. Style Principles

### Principle 1 — Chibi silhouettes, high-contrast reading
Все живые существа имеют chibi-пропорции: голова/капюшон ≈ 50–60% высоты фигуры, тело маленькое, ножки крошечные. Это даёт мгновенно читаемый силуэт даже на 32×32. Тест: сделай ассет чёрным силуэтом на белом фоне — если с двух метров ты понимаешь, что это, силуэт прошёл.

### Principle 2 — Dark base, single-point color accent
Базовая палитра объекта — тёмная монохромная (один hue в 2–3 оттенках). Цветной акцент — **только один на фигуру**: у Пиромансера — огонёк на жезле, у Зомби — зелёные глаза-точки, у Fireball — весь он и есть акцент. Это решает проблему предыдущего спека, где персонаж тонул в деталях.

### Principle 3 — No line art on internal details, outline only on silhouette
Контур 1 px по периметру силуэта, цвет контура — `#05050a` (почти чёрный, слегка синеватый). Внутренние переходы цвета — через тонкие тени (2-3 pixel'а более тёмного оттенка), без чёрных линий. Это даёт ощущение "плотной кукольности", а не "нарисованного комикса".

### Principle 4 — Orthogonal top-down, not isometric
Камера строго сверху (90°). У персонажа видно макушку/капюшон + плечи-руки; пола касаются ножки. Забываем про 45°, забываем про "поворот на 4 стороны со светом сверху-слева". Свет — **равномерный ambient + единичные point-source'ы от магии**. Тень персонажа — маленький овал `#05050a` 30% alpha под ногами (4 px × 2 px для 32-го, 6 px × 3 px для 48-го).

### Principle 5 — Palette discipline: 12 colors total on screen, max
Не добавлять новые hex'ы вне палитры. Это непопулярное требование, но оно — причина, почему Deltarune или Hotline Miami читаются как целостный мир. Новый цвет появляется только когда вводится новая стихия (вода — голубой, земля — коричневый), и тогда он заменяет ранее введённый "условный" оттенок, а не добавляется сверху.

### Master Palette (12 colors total)

| Role | Hex | Описание |
|---|---|---|
| **Void Black** | `#05050a` | Контуры, глубокая тень, провалы |
| **Shadow Ink** | `#0e0e18` | Фон сцены за пределами dungeon'а, self-shadow |
| **Crypt Stone** | `#1a1a24` | Стены, главный dark bg |
| **Floor Slate** | `#242432` | Пол крипта, вторичный dark |
| **Moss Grey** | `#3a3a4a` | Детали среды, mortar, светлый слой стен |
| **Bone** | `#d8d2c0` | Светлые акценты (кости, бумага, ткань света), typography |
| **Ember Gold** | `#e8b44a` | Золотые runes, UI border, portal core, HP text |
| **Fire Orange** | `#ff7a1a` | Огонь (core fireball, trim Pyromancer) |
| **Blood Red** | `#c9322a` | HP-bar, damage numbers, critical accents, red gem |
| **Necro Green** | `#5cd66b` | Глаза undead, poison/rot, zombie eyes (SINGLE-POINT) |
| **Spirit Purple** | `#8b5cd6` | Магия арканная, ultra-rare, future sigils |
| **Robe Umber** | `#3a2418` | Роба Пиромансера, кожа, тёмное дерево |

**ВАЖНО**: ничего вне этих 12 цветов. Промежуточные оттенки — через alpha/blend на Canvas, а не через новые hex'ы.

---

## 2. Character Specs

### 2.1 Pyromancer (player character)

**Размер**: **32×32** (базовый спрайт, выводится на Canvas с scale 2× = 64 визуальных пикселя на экране при 1280×720 viewport).

**Пропорции**:
```
Y=0..14   Hood (большой конусовидный капюшон, округлый сверху)
Y=15..22  Body (миниатюрный прямоугольник-трапеция, роба)
Y=23..28  Legs (две крошечные ножки-столбика)
Y=29..30  Shadow oval (6×2 px, #05050a 30% alpha)
Y=31      пусто
```
Капюшон **занимает половину высоты фигуры** — это главный chibi-сигнал.

**Цветовая разметка**:
- Hood: `#3a2418` (Robe Umber) с 2-pixel тенью `#1a1a24` (Crypt Stone) по низу капюшона
- Body robe: `#3a2418`, с **fire-trim полосой 1px** снизу по подолу — `#ff7a1a` (Fire Orange)
- Legs: `#05050a` (Void Black, как обувь)
- Staff: вертикальная линия 1px `#3a2418` справа от персонажа, длина 10 px
- Staff tip: кружок 3×3 `#ff7a1a` core + 1 px glow `#e8b44a` по краям
- **Лицо не рисуется** (капюшон полностью скрывает). В darkness под капюшоном — 1-pixel точка `#ff7a1a` (отсвет огня в глазах). Этого достаточно, чтобы передать "живой маг".

**Shape description (для Canvas)**:
```
ctx.fillStyle = '#3a2418';  // Hood
ctx.beginPath();
ctx.ellipse(cx, cy-8, 10, 7, 0, 0, Math.PI*2);  // Rounded hood top
ctx.fill();
ctx.fillRect(cx-8, cy-8, 16, 2);  // Hood brim line shadow
ctx.fillStyle = '#1a1a24';
ctx.fillRect(cx-8, cy-3, 16, 2);  // Hood bottom shadow

ctx.fillStyle = '#3a2418';  // Body
ctx.beginPath();
ctx.moveTo(cx-5, cy-1);
ctx.lineTo(cx+5, cy-1);
ctx.lineTo(cx+6, cy+7);
ctx.lineTo(cx-6, cy+7);
ctx.closePath();
ctx.fill();
ctx.fillStyle = '#ff7a1a';  // Fire trim
ctx.fillRect(cx-6, cy+6, 12, 1);

ctx.fillStyle = '#05050a';  // Legs
ctx.fillRect(cx-3, cy+7, 2, 4);
ctx.fillRect(cx+1, cy+7, 2, 4);

ctx.fillStyle = '#3a2418';  // Staff
ctx.fillRect(cx+7, cy-6, 1, 10);
ctx.fillStyle = '#e8b44a';  // Ember glow outer
ctx.fillRect(cx+6, cy-8, 3, 3);
ctx.fillStyle = '#ff7a1a';  // Ember core
ctx.fillRect(cx+7, cy-7, 1, 1);

ctx.fillStyle = 'rgba(5,5,10,0.3)';  // Shadow
ctx.beginPath();
ctx.ellipse(cx, cy+11, 6, 2, 0, 0, Math.PI*2);
ctx.fill();
```

**Анимации**:

- **Idle (2 frames, 600 ms/frame)**:
  - Frame A: staff ember = `#ff7a1a` core, `#e8b44a` glow 3×3
  - Frame B: staff ember = `#e8b44a` core, `#ff7a1a` glow 5×5 (дышит). Капюшон на 1 пиксель выше (вдох).
  Эффект: персонаж стоит, его огонёк медленно пульсирует.

- **Walk (4 frames, 150 ms/frame)**:
  - Frame 1: левая ножка `-1px y`, правая в норме
  - Frame 2: обе в норме (нейтральная)
  - Frame 3: правая ножка `-1px y`, левая в норме
  - Frame 4: обе в норме
  Капюшон слегка покачивается на 1 px влево-вправо в такт (1→2 влево, 3→4 вправо).

- **Cast (4 frames, 120 ms/frame, non-loop)**:
  - Frame 1 (wind-up): staff наклонён назад, ember становится `#e8b44a` 4×4
  - Frame 2 (charge): staff вертикально, ember `#ffffff`-core 5×5 (peak)
  - Frame 3 (release): staff в направлении курсора, fireball spawns at tip
  - Frame 4 (recover): staff возвращается, ember back to `#ff7a1a` 3×3

- **Death (4 frames, 200 ms/frame, non-loop)**:
  - Frame 1: персонаж смещён на 2 px (flinch)
  - Frame 2: робa приседает, staff падает
  - Frame 3: роба на полу, капюшон повёрнут боком (overlap овала)
  - Frame 4: тёмная лужа `#1a1a24` + staff с угасающим серым угольком `#3a3a4a`

**Направления**: 1 спрайт (top-down view одинаков с любого направления, staff всегда показывается "в сторону движения" — во время walk staff наклоняется к вектору движения).

---

### 2.2 Zombie (enemy)

**Размер**: **32×32**.

**Пропорции**:
```
Y=0..10   Big Head (округлая, распадающаяся, ~60% высоты)
Y=11..19  Body (прямоугольный торс в рваных тряпках)
Y=20..26  Stumpy arms (короткие, свисают по бокам, выше ног)
Y=22..28  Legs (кривые столбики)
Y=29..30  Shadow
```
**Головa больше чем тело** — это читабельность с 10 метров.

**Цветовая разметка**:
- Head: `#3a3a4a` (Moss Grey) — гниющая плоть
- Jaw/teeth: 1-pixel точки `#d8d2c0` (Bone) на нижней кромке головы
- **Eyes**: 2 точки 1×1 px `#5cd66b` (Necro Green) — **ЕДИНСТВЕННЫЙ акцент**, это визитная карточка зомби
- Body (рваная ткань): `#242432` (Floor Slate) с 1-pixel разрывами `#05050a` (Void Black) — 2-3 рваные линии
- Arms: `#3a3a4a` с 1-pixel "пальцами-крючками" `#05050a` на концах
- Legs: `#242432`

**Shape description**:
```
ctx.fillStyle = '#3a3a4a';  // Head
ctx.beginPath();
ctx.ellipse(cx, cy-5, 8, 6, 0, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = '#05050a';  // Head shadow under jaw
ctx.fillRect(cx-7, cy-1, 14, 1);
ctx.fillStyle = '#5cd66b';  // Eyes
ctx.fillRect(cx-3, cy-5, 1, 1);
ctx.fillRect(cx+2, cy-5, 1, 1);

ctx.fillStyle = '#242432';  // Body
ctx.fillRect(cx-5, cy+1, 10, 8);
ctx.fillStyle = '#05050a';  // Rag tears
ctx.fillRect(cx-4, cy+3, 2, 1);
ctx.fillRect(cx+1, cy+6, 3, 1);
ctx.fillRect(cx-3, cy+7, 1, 2);

ctx.fillStyle = '#3a3a4a';  // Arms (stumpy)
ctx.fillRect(cx-7, cy+3, 2, 5);
ctx.fillRect(cx+5, cy+3, 2, 5);
ctx.fillStyle = '#05050a';  // Claw tips
ctx.fillRect(cx-7, cy+8, 2, 1);
ctx.fillRect(cx+5, cy+8, 2, 1);

ctx.fillStyle = '#242432';  // Legs
ctx.fillRect(cx-3, cy+9, 2, 4);
ctx.fillRect(cx+1, cy+9, 2, 4);

ctx.fillStyle = 'rgba(5,5,10,0.3)';  // Shadow
ctx.beginPath();
ctx.ellipse(cx, cy+13, 7, 2, 0, 0, Math.PI*2);
ctx.fill();
```

**Анимации**:

- **Idle (2 frames, 500 ms/frame)**:
  - Frame A: фигура на 1 px смещена влево, руки свисают
  - Frame B: фигура на 1 px смещена вправо, голова слегка провисла (на 1 px ниже)
  Эффект: медленное покачивание, "пьяное" движение.

- **Walk (4 frames, 180 ms/frame)**:
  - Классический 4-кадровый цикл: left foot forward, neutral, right foot forward, neutral
  - Тяжёлый — в нейтральных кадрах голова ниже на 1 px (медленно ковыляет, а не бодро идёт)
  - Руки отстают от тела на 1 кадр — покачиваются разболтанно

- **Attack (4 frames, 140 ms/frame, non-loop)**:
  - Frame 1: руки приподнимаются (y-1)
  - Frame 2: руки подняты над головой (y-4)
  - Frame 3: руки выбрасываются вперёд, голова тянется (вся фигура +1 px в сторону игрока)
  - Frame 4: руки возвращаются

- **Death (4 frames, 180 ms/frame, non-loop)**:
  - Frame 1: вспышка `#c9322a` по силуэту (hit flash)
  - Frame 2: голова наклоняется назад, тело падает
  - Frame 3: фигура на земле (горизонтальная), зелёные глаза ещё горят
  - Frame 4: чёрная куча + 2 пикселя `#5cd66b` с alpha 30% (глаза тухнут)

---

### 2.3 Fireball (projectile)

**Размер**: **16×16** (маленький компактный projectile; выводится на Canvas как есть, без scale).

**Shape description**: не реалистичное пламя, а **cartoon орб с хвостиком**.

```
ctx.fillStyle = '#c9322a';  // Outer ring (Blood Red)
ctx.beginPath();
ctx.arc(cx, cy, 6, 0, Math.PI*2);
ctx.fill();

ctx.fillStyle = '#ff7a1a';  // Core (Fire Orange)
ctx.beginPath();
ctx.arc(cx, cy, 4, 0, Math.PI*2);
ctx.fill();

ctx.fillStyle = '#e8b44a';  // Hot center (Ember Gold)
ctx.beginPath();
ctx.arc(cx-1, cy-1, 2, 0, Math.PI*2);
ctx.fill();

// Pointed tail — direction vector opposite to velocity
ctx.fillStyle = '#ff7a1a';
ctx.beginPath();
ctx.moveTo(cx - vx*2, cy - vy*2);
ctx.lineTo(cx - vx*5 - vy*2, cy - vy*5 + vx*2);
ctx.lineTo(cx - vx*5 + vy*2, cy - vy*5 - vx*2);
ctx.closePath();
ctx.fill();

// Spark trail — 3 particles (#e8b44a) at positions (cx-vx*n, cy-vy*n) with alpha fading
for (let i=1; i<=3; i++) {
  ctx.fillStyle = `rgba(232,180,74,${0.6 - i*0.15})`;
  ctx.fillRect(cx - vx*i*3 + (Math.random()*2-1), cy - vy*i*3 + (Math.random()*2-1), 2, 2);
}
```

**Анимация (looping, 80 ms/frame, 4 frames)**:
- Frame A: ядро в центре
- Frame B: ядро на 1px влево, outer ring на 1px шире
- Frame C: ядро в центре, outer ring обычный
- Frame D: ядро на 1px вправо, outer ring чуть меньше

Эффект: fireball "кипит" в полёте. Хвост всегда за скоростью.

**Impact VFX (при попадании)**: одноразовая вспышка 32×32, 5 frames @ 60ms:
- F1: white point 2×2 `#d8d2c0`
- F2: orange ring r=6 `#ff7a1a`
- F3: orange ring r=10 + red outer `#c9322a`
- F4: fading orange ring r=12 alpha 50%, smoke `#3a3a4a` cloud 2×2 в центре
- F5: только smoke, fade-out

---

## 3. Environment Specs

### 3.1 Floor Tile (Ruins/Crypt biome)

**Размер**: **32×32**, seamless tileable.

**Shape description**:
Базовый фон `#242432` (Floor Slate). Поверх — 4 рандомизированные детали:
- 3 пикселя `#1a1a24` в случайных точках (subtle pitting)
- 1 тонкая трещина 4-5 px `#05050a` по диагонали (каждый 4-й тайл)
- 1 точка `#3a3a4a` (светлый камень) в случайной позиции — 1 пиксель

**ВАЖНО**: детали не должны лежать на краях тайла (иначе виден tiling). Keep 3 px border of plain `#242432` по периметру.

**Variants**: 4 варианта тайла (random rotate/mirror не достаточно, нужны 4 разных):
1. Plain slate (95% покрытия в карте)
2. Cracked (большая трещина по диагонали, `#05050a`, 7 px)
3. Moss (2-3 пикселя `#5cd66b` alpha 40% в углу — капля тусклого мха)
4. Blood-stained (2-3 пикселя `#c9322a` alpha 30% — старая засохшая кровь)

Редкие варианты (2–4) спавнятся с частотой 3–5% каждый. Игрок не должен видеть их чаще чем раз на экран.

### 3.2 Wall Tile

**Размер**: **32×32**.

**Shape description**:
Стена в top-down — это "блок", вид сверху. Рисуется как:
- Основа `#1a1a24` (Crypt Stone) на всём тайле
- Верхняя грань (Y=0..4) — `#3a3a4a` (Moss Grey) — это та часть стены, которая обращена к камере (pseudo-3D top illusion)
- Контур 1 px `#05050a` по периметру тайла
- Внутри — 2-3 субтильных stone-block segments: тонкие линии `#242432` 1 px, делящие тайл на 4 блока (имитация каменной кладки)

**Shape code**:
```
ctx.fillStyle = '#1a1a24';
ctx.fillRect(0, 0, 32, 32);
ctx.fillStyle = '#3a3a4a';  // Top "face"
ctx.fillRect(0, 0, 32, 5);
ctx.fillStyle = '#05050a';  // Outline
ctx.strokeStyle = '#05050a';
ctx.lineWidth = 1;
ctx.strokeRect(0.5, 0.5, 31, 31);
ctx.fillStyle = '#242432';  // Block mortar lines
ctx.fillRect(16, 5, 1, 27);
ctx.fillRect(0, 18, 32, 1);
```

**Variants**: (все 32×32)
1. Solid wall (default)
2. Cracked wall (1 `#05050a` trapezoidal crack на top face)
3. Corner pieces (NE, NW, SE, SW) — top-face рисуется только с двух сторон
4. T-junction (top-face с трёх сторон)

### 3.3 Exit Portal

**Размер**: **48×48**.

**Shape description**: Swirling golden vortex (top-down, НЕ пещера уходящая вниз).

Основа:
- Background disk r=22, `#05050a` (Void Black) — "дыра"
- Ring r=22, 2 px thick, `#e8b44a` (Ember Gold) — outer rune ring
- Ring r=16, 1 px, `#ff7a1a` (Fire Orange) — inner glow
- Ring r=10, 1 px, `#e8b44a` — core ring
- Center: `#ff7a1a` cross или spiral, 8×8 rotating sigil

**4-frame pulse animation (400 ms/frame)**:
- Frame A: inner glow r=16, центральный крест маленький
- Frame B: inner glow r=18, крест побольше, добавляется pulse sparkle (2 пикселя `#ffffff`-ish = `#d8d2c0`)
- Frame C: inner glow r=16, крест поворот на 45°
- Frame D: inner glow r=14, dim — "втягивание"

Центральный sigil всегда медленно вращается (на Canvas через `ctx.rotate()`, не через кадры).

**Glow on floor**: вокруг портала рисуется дополнительный radial gradient `#ff7a1a` alpha 15% → 0%, радиус 48px, чтобы портал "освещал" тайлы пола вокруг. Этого достаточно, чтобы он не выглядел "наклеенным".

---

## 4. UI Specs

### 4.1 HP Bar (HUD)

**Размер**: **120×16** (scaled 2× to 240×32 на экране).

**Структура**:
- Frame: `#05050a` (контур 1 px) + `#1a1a24` заливка
- Inside fill area (2 px inset): `#c9322a` (Blood Red) = current HP
- Text overlay: `#d8d2c0` (Bone), 1-bit font, "HP 450/500" центрировано

**Style**: плоский stone tablet, без filigree. Углы скруглены 1 пикселем (не rounded rectangle — буквально нарисуй 4 `#05050a` пикселя в углах поверх квадрата). Это и есть "cute minimalism" — чуть-чуть мягкие углы, но без излишеств.

### 4.2 Mana Bar
— **НЕ в MVP** (пользователь убрал ману).

### 4.3 Hotbar (5 slots)

**Размер**: **176×32** (scaled 2× to 352×64). Each slot: 32×32.

**Структура**:
- Base: `#1a1a24` заливка на всей длине
- Outer border: `#e8b44a` 1 px (золотая линия!) — это главный UI-акцент
- Slot dividers: `#05050a` 1 px вертикальные линии между ячейками
- Slot inner: `#242432` (внутренняя заливка)
- Hotkey indicator: цифра 1-5 в левом-верхнем углу ячейки, `#d8d2c0` 1-bit font
- CD overlay: `#05050a` alpha 60% radial mask (sweep clockwise) — рисуется при CD > 0
- Spell icon: центр ячейки, 24×24 (оставляем 4 px padding на каждую сторону)

Этот стиль наследуется от **Hades hotbar** — тёмное дно, тонкая золотая рамка, ничего лишнего. Плитки-иконки светятся из тьмы.

### 4.4 Spell Icon template (для Fireball)

**Размер**: 24×24 (внутри hotbar slot 32×32).

**Shape description** (Fireball icon):
- BG circle r=11, `#c9322a`
- Inner circle r=7, `#ff7a1a`
- Highlight r=3 upper-left, `#e8b44a`
- Subtle 1-pixel `#05050a` outline

Эффект: tiny self-contained fireball. Всё, что нужно игроку — узнать скилл по цвету + форме.

---

## 5. SpriteCook Prompts (для будущей генерации)

Используются, когда будем конвертить программные спрайты в полноценные PNG. **Не использовать на MVP** — пользователь предпочитает программную отрисовку. Но если решим позже улучшить — вот готовые промпты.

### Общие style anchors (добавлять во ВСЕ промпты)
```
cute minimalist pixel art, chibi proportions, dark fantasy, flat shading,
high contrast silhouette, single-color accent detail, thin 1 pixel outline,
solid dark background-friendly, top-down orthogonal view 90 degrees,
no anti-aliasing, no dithering, no filigree, no gradients on internal details,
game-ready sprite, transparent background
```

### Общий negative prompt
```
realistic, detailed texture, gradient shading, anime, chibi 3D render,
bright cheerful colors, children's book, kawaii pink, side-view, isometric,
45-degree perspective, gothic filigree, painterly, 32-bit era details,
thick black outlines on internal features, cel-shaded lines, multiple color
accents, busy pattern, anti-aliased pixels
```

---

### 5.1 Pyromancer — Idle+Walk combined sheet (32×32, 6 frames)
```
Top-down orthogonal view (90 degree camera, looking straight down) of a tiny
chibi pyromancer mage. Large dark umber #3a2418 pointed hood occupying 50%
of figure height, small triangular dark robe body with a single bright
orange #ff7a1a trim line at the hem, tiny black stub legs, thin wooden
staff held to the right side with a glowing ember tip (orange #ff7a1a core,
gold #e8b44a halo). Face completely hidden inside hood shadow except for a
single orange-glow pixel where the eyes would be. Silhouette reads as mage
in under 0.3 seconds. Sprite sheet 6 frames: 2 frames idle breathing
(ember pulsing size), 4 frames walk cycle (leg alternation + subtle hood
bob). Character always faces the viewer (single direction — staff leans
toward movement vector in walk). 32x32 pixels per frame. Palette strictly
limited to: #3a2418 umber, #1a1a24 dark, #ff7a1a orange, #e8b44a gold,
#05050a black, 30% alpha shadow oval under feet. [style anchors]
[negative prompt]
```

### 5.2 Pyromancer — Cast animation (32×32, 4 frames)
```
Top-down orthogonal view of same chibi pyromancer casting fireball,
4-frame animation. Frame 1: staff tilted back, ember grows gold #e8b44a
4x4 pixels. Frame 2: staff vertical, ember peak brightness with white-hot
#d8d2c0 core 5x5, radiant sparkle pixels around. Frame 3: staff points
toward cast direction (east by default), small fireball emerging at staff
tip. Frame 4: staff returning to idle position, ember back to normal
orange #ff7a1a 3x3. Character silhouette stays chibi — big hood, tiny
body. 32x32 per frame. Palette: umber #3a2418, dark #1a1a24, orange
#ff7a1a, gold #e8b44a, bone-white highlight #d8d2c0, black outline
#05050a. [style anchors] [negative prompt]
```

### 5.3 Zombie — Idle+Walk sheet (32×32, 6 frames)
```
Top-down orthogonal view of a tiny chibi zombie enemy. Oversized
rotting head (60% of figure height) moss-grey #3a3a4a with two bright
toxic-green #5cd66b single-pixel eyes as the ONLY color accent — these
eyes are the visual signature. Small ragged body in tattered dark cloth
#242432 with 2-3 pixel rips showing black void #05050a beneath. Stumpy
arms hanging at sides with tiny black claw-tips. Crooked columnar legs.
Single-pixel bone teeth #d8d2c0 on lower jaw. Silhouette must be
distinguishable from pyromancer at 0.3s glance — zombie is squatter,
wider, no hood peak, no staff. Sprite sheet 6 frames: 2 idle sway, 4
walk cycle with uneven shambling gait (head bobs lower in neutral frames).
32x32 per frame. Palette strictly: moss #3a3a4a, slate #242432, green
#5cd66b, bone #d8d2c0, black #05050a. [style anchors] [negative prompt]
```

### 5.4 Zombie — Attack+Death sheet (32×32, 8 frames)
```
Top-down orthogonal view of same chibi zombie. Frames 1-4 attack
animation: arms rising overhead, then thrusting forward with claws
extended, body lurching toward victim, recovery. Frames 5-8 death
animation: red #c9322a flash on silhouette on frame 5 (hit), frame 6
head snaps back body collapsing, frame 7 horizontal ragdoll on ground
with green eyes still glowing, frame 8 dark puddle and fading eye
glow at 30% alpha. 32x32 per frame. Same palette as idle/walk.
[style anchors] [negative prompt]
```

### 5.5 Fireball Projectile (16×16, 4 frames loop)
```
Top-down view of a tiny cartoon fireball projectile, NOT realistic flame.
Compact round orb: outer ring dark red #c9322a (6 pixel radius), middle
core bright orange #ff7a1a (4 pixel radius), hot inner highlight gold
#e8b44a (2 pixel radius, offset upper-left). Small pointed triangular
tail extending backward. 3 small ember sparkle particles trailing
behind fading out. Animated over 4 frames: core pulses between centered
and offset positions, outer ring slightly expands/contracts. Radial
symmetric. Self-illuminating — faint 1-2 pixel warm orange aura around
the ball. 16x16 per frame, transparent background. Must read as
"magic fireball" at a glance. Palette: red #c9322a, orange #ff7a1a,
gold #e8b44a. [style anchors] [negative prompt]
```

### 5.6 Fire Impact VFX (32×32, 5 frames one-shot)
```
Top-down one-shot explosion VFX, 5 frames, plays once and disappears.
Frame 1: single bright white-hot pixel #d8d2c0 at center 2x2. Frame 2:
expanding orange #ff7a1a ring radius 6 pixels. Frame 3: peak expansion
orange ring radius 10 with dark red #c9322a outer rim radius 12.
Frame 4: fading orange ring radius 12 at 50% alpha, grey #3a3a4a smoke
cloud 2x2 center. Frame 5: only smoke wisps drifting up, fading out.
Radial symmetry. No realistic flame — cartoon explosion puff style.
32x32 per frame, transparent background. Palette: bone #d8d2c0, orange
#ff7a1a, red #c9322a, grey smoke #3a3a4a. [style anchors] [negative prompt]
```

### 5.7 Floor Tileset (32×32, 4 variants side-by-side)
```
Top-down orthogonal 32x32 pixel art floor tiles for dark fantasy crypt,
seamless tileable, 4 variants in one row. Base color flat slate #242432.
Subtle detailing (keep 3 pixel border plain for seamlessness):
Variant 1 plain — 3 tiny dark #1a1a24 pitting pixels scattered. Variant
2 cracked — single diagonal 5 pixel crack in #05050a black. Variant 3
moss — 2-3 green moss pixels #5cd66b at 40% alpha in one corner.
Variant 4 bloodstain — 2-3 dried blood pixels #c9322a at 30% alpha in
opposite corner. All tiles must tile perfectly when placed adjacent —
no visible seams, no edge detail. Minimal style, must NOT distract
from characters on top. Palette: slate #242432, dark #1a1a24, black
#05050a, green #5cd66b, red #c9322a. [style anchors] [negative prompt]
```

### 5.8 Wall Tileset (32×32, 7 pieces)
```
Top-down orthogonal 32x32 pixel art wall tiles for dark fantasy crypt.
Pseudo-3D top-down illusion — top 5 pixels of tile are lighter
(moss-grey #3a3a4a) representing the wall's top face visible to camera,
remaining 27 pixels are dark stone #1a1a24 representing the side.
1 pixel black outline #05050a around tile perimeter. 2-3 subtle slate
#242432 mortar lines splitting tile into stone blocks. 7 pieces in
sheet: 1 straight horizontal, 2 straight vertical, 3 cracked variant
(one black crack on top face), 4 inner corner NE (top face on two
sides), 5 outer corner NE, 6 T-junction (top face on three sides),
7 solid wall block. All pieces must tile seamlessly. Palette strictly:
stone #1a1a24, top-face #3a3a4a, mortar #242432, crack #05050a.
[style anchors] [negative prompt]
```

### 5.9 Exit Portal (48×48, 4 frames pulse loop)
```
Top-down orthogonal view of a magical golden vortex portal on dark crypt
floor, 48x48 pixels, 4 frame pulse loop. Central black void disk radius
22 (dark #05050a). Concentric rings: outer gold #e8b44a rune ring 2
pixels thick, middle orange #ff7a1a glow 1 pixel, inner gold core ring 1
pixel. Center has a small rotating cross/sigil in orange that spins
across frames. Radial light bleed onto surrounding floor at 15% alpha
orange within 48 pixel radius. Frame sequence: dim — bright with white
sparkle pixels — bright rotated — dimming. Feels like a pool of warm
light in cold darkness. Palette: black #05050a, stone #242432
background, gold #e8b44a, orange #ff7a1a, white sparkle #d8d2c0.
[style anchors] [negative prompt]
```

### 5.10 Hotbar UI frame (176×32, static)
```
Pixel art UI frame for action-RPG hotbar, 176x32 pixels, 5 equal slots
each 32x32. Flat minimalist style — NO filigree, NO ornamental corners.
Outer border thin 1 pixel gold #e8b44a line — this is the signature
visual element. Inner fill dark #1a1a24. Thin 1 pixel black #05050a
dividers between slots. Each slot inner area darker #242432 for spell
icon placement (leave empty — icons rendered separately). Tiny corner
numbers 1-5 in bone #d8d2c0 at top-left of each slot, 3 pixel font.
Hades-inspired minimal dark UI vibe, no bronze, no gothic, no
flourishes. Palette: dark #1a1a24, slate #242432, gold #e8b44a, black
#05050a, bone #d8d2c0. [style anchors] [negative prompt]
```

### 5.11 HP Bar UI frame (120×16, static)
```
Pixel art UI frame for HP bar, 120x16 pixels. Flat stone tablet style,
NO filigree, NO gems, NO ornamental elements. Thin 1 pixel black #05050a
outline with 1 pixel rounded corners (single dark pixel in each corner
over the outline). Inner fill area 2 pixel inset dark #1a1a24 background
where the red #c9322a HP bar will fill. Leave HP fill empty for code to
render. Cute minimalist brutalist vibe, single clean rectangle.
Palette: black #05050a, dark #1a1a24, red #c9322a. [style anchors]
[negative prompt]
```

---

## 6. Programmatic Drawing Guide (для coder — CURRENT APPROACH)

Это основной способ отрисовки для прототипа. PNG-ассеты из SpriteCook пока НЕ используем — рисуем всё на Canvas 2D шейпами из палитры. Плюсы: zero-asset pipeline, мгновенные правки, zero loading time, идеально для итерации стиля.

### 6.1 Core render utilities

Создать модуль `src/js/engine/procedural_sprites.js` с функциями:

```js
// Palette as constants
export const PAL = {
  VOID: '#05050a',
  SHADOW: '#0e0e18',
  STONE: '#1a1a24',
  SLATE: '#242432',
  MOSS: '#3a3a4a',
  BONE: '#d8d2c0',
  GOLD: '#e8b44a',
  FIRE: '#ff7a1a',
  BLOOD: '#c9322a',
  NECRO: '#5cd66b',
  SPIRIT: '#8b5cd6',
  UMBER: '#3a2418',
};

export function drawPyromancer(ctx, x, y, frame, direction) { ... }
export function drawZombie(ctx, x, y, frame, state /* idle|walk|attack|death */) { ... }
export function drawFireball(ctx, x, y, frame, vx, vy) { ... }
export function drawFloorTile(ctx, tileX, tileY, variant) { ... }
export function drawWallTile(ctx, tileX, tileY, type) { ... }
export function drawExitPortal(ctx, x, y, frame, time) { ... }
export function drawFireImpact(ctx, x, y, frame) { ... }
export function drawHotbar(ctx, x, y, slots, cooldowns) { ... }
export function drawHPBar(ctx, x, y, hp, maxHP) { ... }
```

### 6.2 Render order (важно — сверху вниз)
1. Floor tiles (слой 0)
2. Floor overlays (blood, moss, portal glow) (слой 1)
3. Shadows (овалы под персонажами) (слой 2)
4. Entities sorted by Y coordinate (слой 3) — так они рисуются "один перед другим"
5. Projectiles (слой 4)
6. VFX (impact explosions) (слой 5)
7. UI (hotbar, HP bar) (слой 6)

### 6.3 Pixel-perfect scaling
- Internal render на Canvas 640×360 (квартер-HD)
- Scale x2 на display (image-rendering: pixelated)
- Это даёт жирные пиксели в стиле Nuclear Throne + идеальный performance

### 6.4 Performance notes
- **Не рисовать одинаковые спрайты заново каждый кадр**. Для Pyromancer, Zombie и тайлов — кэшировать готовые фреймы в offscreen canvas (ImageData), брать оттуда через drawImage.
- Pre-render 4 кадра walk Пиромансера в init'е, затем drawImage(cachedFrame[frameIdx], x, y).
- Это ключ к 60 fps с 20+ мобами на экране.

### 6.5 Frame timing
- `frameIdx = Math.floor(animationTime / frameDurationMs) % frameCount`
- Idle: 600ms/frame
- Walk: 150ms/frame
- Cast: 120ms/frame (non-loop: frame = Math.min(time/120, 3))
- Zombie attack: 140ms/frame
- Death: 200ms/frame (non-loop)
- Portal: 400ms/frame (loop)
- Fireball: 80ms/frame (loop)
- Fire impact: 60ms/frame (non-loop, 5 frames total, removes VFX at end)

---

## 7. Usage Examples

### ✅ Правильное применение

1. **Pyromancer на floor tile**: персонаж читается мгновенно, огонёк на посохе — единственный цветной акцент.
2. **3 зомби одновременно на экране**: все одинаковые, но по разным фазам idle animation — стая выглядит живой без индивидуализации.
3. **Fireball полёт**: ярко-оранжевый шар оставляет золотой трейл на тёмном фоне, видно его везде.
4. **Exit Portal мигает на краю карты**: его золотое свечение видно с 15 метров — игрок интуитивно ведёт туда персонажа.

### ❌ Неправильное применение

1. **НЕ добавлять детали на одежду Пиромансера** (пуговицы, узоры на робe, декоративные карманы). Это сразу тянет вид обратно в "painterly pixel art", который был отклонён.
2. **НЕ использовать 2+ цветовых акцента на одной фигуре**. Если у зомби появляется и зелёные глаза, и кровь на груди, и рваный флаг — читаемость теряется.
3. **НЕ использовать gradients через alpha на тёмной палитре** без необходимости. Исключение: только portal glow и shadow ovals.
4. **НЕ рисовать 8 направлений**. Top-down 90° + chibi = работает одинаково со всех сторон, поворачивать не нужно.
5. **НЕ добавлять цвета вне палитры**. Если появится новый элемент (water biome) — он получит `#5c9fd6` (новый голубой), но этот цвет заменит один из текущих в карте, а не добавится сверху.

---

## 8. Исключения и отклонения

### Exception #1 — полная замена визуального стиля
- **Что**: отклонён весь предыдущий стиль (painterly pixel art, 45°, gothic filigree, bronze/slate palette). Переход на cute-minimalism-dark-fantasy.
- **Почему**: пользователь отклонил старые ассеты. Чёткий запрос на новый визуальный голос, вдохновлённый Deltarune/Nuclear Throne/Hades UI.
- **Кто принял**: Design Director + user direct request
- **Дата**: 2026-04-20
- **Последствия**: `pivot-visual-spec.md` считается archived. Все ассеты `assets/generated/pixel/pivot/` больше не используются в новом прототипе (удалить или пометить `_deprecated`).

### Exception #2 — смена камеры 45° → 90° (pure top-down)
- **Что**: предыдущий спек был "Diablo camera" 45°. Новый — строго сверху.
- **Почему**: chibi-пропорции + 45° = дисфункция. Большая голова в 45° выглядит нелепо. 90° решает это — голова/капюшон занимает всю верхнюю половину фигуры как центральная читаемая единица.
- **Компромисс**: теряем глубину сцены (стены теперь — это блоки, а не вертикальные поверхности). Компенсируется pseudo-3D trick (верхняя грань стены светлее на 5 пикселей).
- **Кто принял**: Design Director
- **Дата**: 2026-04-20

### Exception #3 — программная отрисовка вместо PNG
- **Что**: ассеты рисуются на Canvas 2D формами, не загружаются из PNG файлов.
- **Почему**: быстрее итерировать, zero loading, zero credits, стиль в палитре = легко поддерживать консистентность. PNG через SpriteCook — план B если программная отрисовка упрётся в ограничения.
- **Компромисс**: анимации ограничены тем, что можно нарисовать кодом. Сложные вещи (плащ развевается, волосы дёргаются) — не получится. Но cute-minimalism и не требует таких деталей.
- **Кто принял**: Design Director + согласовано с user (вся задача описывает программную отрисовку как приоритет)
- **Дата**: 2026-04-20

### Exception #4 — палитра-лимит 12 цветов
- **Что**: жёсткий лимит 12 hex'ов на весь проект.
- **Почему**: это главное, что даёт стилю узнаваемость. Deltarune — 16, Hotline Miami — ~20. 12 — наш выбор, чуть экстремальнее, чтобы звучало уникально.
- **Исключения**: новые биомы могут потребовать новых стихийных цветов (water biome → светло-голубой). Решение — НЕ добавлять, а заменять (moss-green можно убрать из crypt'а, если мох там не виден, и освободить слот).
- **Кто принял**: Design Director
- **Дата**: 2026-04-20

---

## 9. Миграция от предыдущего стиля

### Что сохраняется
- Общая dark-fantasy тональность. Мрачная атмосфера крипта сохраняется.
- Огненная магия как signature Пиромансера (trim + staff ember).
- Основной gameplay-signal "fireball — это самый яркий объект на экране".

### Что меняется
- **Все спрайты перерисовываются**. Старые PNG в `assets/generated/pixel/pivot/` deprecated.
- **Камера**: 45° → 90°.
- **Детализация**: painterly 32-bit → flat 2-3 colors per object.
- **Персонаж**: взрослые пропорции → chibi.
- **UI**: bronze filigree → flat golden line minimalism.

### Action items для команды
1. **Coder**: имплементировать `src/js/engine/procedural_sprites.js` по §6 этого документа. Подключить в render loop вместо PNG-sprite системы.
2. **Design Director (follow-up)**: через неделю после интеграции — провести silhouette test, confirmation UX-ревью.
3. **DevOps**: не генерировать новых SpriteCook ассетов до отдельного запроса. Сохранить кредиты.
4. **Game Designer**: новые биомы (Catacombs, Ashen Vault) — расширение палитры в рамках 12-лимита, через замену, не добавление.

---

## 10. Checklist приёмки каждого ассета

- [ ] Использованы ТОЛЬКО цвета из Master Palette (12 hex)
- [ ] Ровно 1 цветовой акцент на фигуру
- [ ] Контур `#05050a` 1 px только по силуэту, не на внутренних деталях
- [ ] Chibi-пропорции (голова/капюшон ≥ 40% высоты для живых существ)
- [ ] Силуэт читается за 0.3 сек (silhouette test: чёрная заливка на белом фоне — опознаваем?)
- [ ] Камера 90° (top-down), не 45°
- [ ] Тень — овал `#05050a` 30% alpha под ногами
- [ ] Анимация: idle 2 frames / walk 4 frames минимум
- [ ] Размер сетки — 32×32 для юнитов, 16×16 для fireball, 48×48 для portal
- [ ] На тёмном тайле `#242432` — силуэт не сливается с фоном
- [ ] Нет gradients (кроме portal glow и shadow)
- [ ] Нет filigree, нет декоративных узоров, нет bronze

---

## Версионирование

- **v1.0** (2026-04-20) — initial cute-minimalism spec, replaces rejected pivot-visual-spec v1.0
