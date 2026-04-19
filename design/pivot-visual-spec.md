# Veyra — Pivot Visual Spec
## Top-Down 2D Pixel Art Action RPG (Diablo-style) — Prototype Asset Bundle

**Версия**: 1.0
**Дата**: 2026-04-19
**Автор**: Design Director
**Статус**: Утверждено для генерации vertical slice

---

## 1. Визуальный стиль pivot'а

### Концепция
Veyra переходит на **top-down 2D pixel art** с камерой под углом **≈45°** (ортогональная проекция в стиле Diablo 1 / Diablo 2 / Halls of Torment). Фиксированная перспектива — игрок видит голову/плечи персонажа сверху-спереди, а пол и стены уходят в глубину через параллельные линии (без реальной перспективной схождения).

Эстетически мы **НЕ меняем визуальную ДНК проекта**. Dark fantasy, готический мрак, тёплый коричневый/бронзовый как дерево и кожа, холодный стальной серо-синий как камень и тени, точечные неоново-магические акценты как единственный источник насыщенного цвета. То, что уже есть в `character_idle.png`, `hanger_empty.png`, `training_icon_v2.png`, `ICON_001`–`031` — это наш baseline. Новые ассеты должны читаться как **те же руки, та же палитра, тот же level of detail**, просто с нового ракурса.

### Ключевые визуальные признаки
- **Painterly pixel art** — внутри каждого спрайта видимые градиенты и мягкие переходы тона, но края острые, пиксели не сглажены. Это не 8-bit NES, это «16-32bit era», как у существующего мага.
- **Чёрный/тёмно-коричневый контур 1px** по силуэту — для читаемости на тёмном тайле. Внутренние детали — без контура, тенями.
- **Свет сверху-слева** (≈45°). В top-down это значит, что верх-лево каждого объекта светлее, низ-право — тень. Консистентность освещения во всех ассетах — критична.
- **Палитра 80/20**: 80% — приглушённые тёмные (уголь `#1a1a24`, сланец `#2a2a38`, камень `#4a4658`, тёмное дерево `#5a3a24`, бронза `#8a6a3a`), 20% — яркие магические акценты (огненный оранжевый `#ff6b00` / `#ff9a2a`, золотой glow `#c9a76f` / `#e8c878`, для позже — голубой/фиолетовый/зелёный неон).
- **Spell-эффекты — единственный источник яркого света в сцене**. Огненный шар буквально освещает окружающие тайлы (делается шейдером/additive blend поверх, но сам спрайт уже должен светиться изнутри — ярко-жёлтый core, оранжевое свечение, тёмно-красный outer rim).
- **Pyromancer как класс** — добавляем огненно-оранжевый trim и алый подбой плаща к существующей тёмной робе мага. Капюшон остаётся тёмно-коричневым/угольным. Жезл — с огненным навершием (раньше был кристалл/синий — теперь красный/оранжевый).

### Настроение
Мрачный крипт под светом горящего посоха. Игрок идёт в темноту, вокруг него — круг тёплого оранжевого света от магии, за его пределами — синевато-серая чернота. Зомби и скелеты выползают из тьмы, их силуэты сначала едва различимы, потом вспышка Fireball высвечивает их целиком. Это наш mood.

### Технические решения pivot'а
- **Размер спрайтов**: **48×48** для персонажа и мобов, **32×32** для тайла пола/стены, **24×24** для Fireball projectile, **64×64** для impact VFX. Почему 48 для юнитов, а 32 для тайлов — классическая схема Diablo-like: юнит занимает ~1.5 тайла по высоте, это даёт правильное ощущение масштаба и место для capeshown персонажа + жезла вверх.
- **Направления**: **4 направления** (S, E, N, W), W = mirror(E) в коде. Экономия ~25% кредитов без потери качества — для прототипа более чем достаточно. 8 направлений — полировка позже.
- **Idle — 2 кадра** (дыхание), **Walk — 4 кадра cycle**, **Attack/Cast — 4 кадра**, **Death — 4 кадра**. Минимальный viable набор.

### UX-приоритеты (всегда побеждают эстетику)
1. **Силуэт мобов читается на 48×48 с расстояния 1.5м от монитора**. Zombie vs Skeleton Archer должны быть различимы по форме силуэта за 0.3 секунды. Это критично — если игрок не может мгновенно опознать угрозу, visual fails.
2. **Projectile виден на любом фоне**. Fireball яркий — пусть выбивается из палитры, это нормально, магия — единственное исключение из desaturation rule.
3. **Пол не перетягивает внимание**. Floor tiles — низкий контраст, чтобы персонаж и мобы читались. 3-4 вариации — чтобы не было visible tiling, но не больше.

---

## 2. Asset list для прототипа

| # | Asset | Size | Frames | Directions | Priority | SpriteCook credits (est.) |
|---|-------|------|--------|------------|----------|----------------------------|
| 1 | Pyromancer — Idle | 48×48 | 2 | 4 (S/E/N/W) | **P0** | ~8 |
| 2 | Pyromancer — Walk | 48×48 | 4 | 4 | **P0** | ~12 |
| 3 | Pyromancer — Cast | 48×48 | 4 | 4 | **P0** | ~12 |
| 4 | Pyromancer — Death | 48×48 | 4 | 1 (S only) | **P1** | ~4 |
| 5 | Tileset — Floor (4 variants) | 32×32 | static | — | **P0** | ~6 |
| 6 | Tileset — Wall (solid + broken + moss + 4 corners) | 32×32 | static | — | **P0** | ~10 |
| 7 | Tileset — Exit portal (glowing circle) | 64×64 | 4 (pulse loop) | — | **P1** | ~6 |
| 8 | Tileset — Stairs down | 64×64 | static | — | **P1** | ~2 |
| 9 | Zombie — Idle | 48×48 | 2 | 4 | **P0** | ~8 |
| 10 | Zombie — Walk | 48×48 | 4 | 4 | **P0** | ~12 |
| 11 | Zombie — Attack | 48×48 | 4 | 4 | **P0** | ~12 |
| 12 | Zombie — Death | 48×48 | 4 | 1 | **P1** | ~4 |
| 13 | Skeleton Archer — Idle | 48×48 | 2 | 4 | **P1** | ~8 |
| 14 | Skeleton Archer — Walk | 48×48 | 4 | 4 | **P1** | ~12 |
| 15 | Skeleton Archer — Shoot | 48×48 | 4 | 4 | **P1** | ~12 |
| 16 | Skeleton Archer — Death | 48×48 | 4 | 1 | **P2** | ~4 |
| 17 | Projectile — Fireball | 24×24 | 6 (loop) | 1 (sym) | **P0** | ~4 |
| 18 | VFX — Fire Impact | 64×64 | 6 (one-shot) | 1 | **P0** | ~6 |
| 19 | UI — HP bar frame | 256×32 | static | — | **P1** | ~2 |
| 20 | UI — Mana bar frame | 256×32 | static | — | **P1** | ~2 |
| 21 | UI — Hotbar (5 slots) | 320×64 | static | — | **P1** | ~3 |
| 22 | UI — Minimap frame | 160×160 | static | — | **P2** | ~2 |

**Приоритеты:**
- **P0** (MUST-HAVE для запуска прототипа): #1, 2, 3, 5, 6, 9, 10, 11, 17, 18 → **~90 кредитов**
- **P1** (важно для first playable): #4, 7, 8, 12, 13, 14, 15, 19, 20, 21 → **~62 кредита**
- **P2** (полировка): #16, 22 → **~6 кредитов**

**Итого по всему списку**: ~158 кредитов. Бюджет 100 → берём весь P0 (~90) + один P1 по выбору (HP bar, ~2 кредита) = **~92 кредита**. Запас 8 кредитов на reroll любого неудачного спрайта.

---

## 3. SpriteCook prompts

### Общие style anchors (использовать в КАЖДОМ промпте)
```
pixel art, dark fantasy, 32bit era inspired, painterly pixel shading,
clean silhouette, 1px dark outline, dramatic lighting from upper-left,
high contrast, muted palette with warm brown and cool slate accents,
transparent background, no anti-aliasing, no dithering on edges
```

### Общий negative prompt (использовать в КАЖДОМ промпте)
```
blurry, soft edges, anti-aliased, smooth gradients, cartoon, anime,
cel shading, thick outlines, 3D render, photorealistic, watermark,
signature, text, modern objects, cheerful, bright primary colors,
low resolution, jpeg artifacts, deformed anatomy, extra limbs,
multiple heads, oversaturated, neon glow on non-magical elements,
side-view, profile view, front-facing portrait
```

---

### 3.1 Pyromancer — Idle (48×48, 2 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of a Pyromancer mage seen from above at 45-degree
angle (Diablo 2 camera), standing idle pose, breathing subtly. Male figure
in dark charcoal-brown hooded robe with deep crimson inner lining visible
at the collar and cuff openings, orange-bronze trim along the hem, thin
leather belt with small fire-rune buckle. Holding a wooden staff in right
hand, staff topped with a small glowing ember-orange crystal casting a
faint warm light on the character's shoulder. Hood shadows the face,
only a hint of warm skin and glowing orange eye visible. Boots dark
leather. Palette: charcoal #1a1a24, slate #2a2a38, dark brown #3a2418,
crimson #5a1a1a, ember orange #ff6b00, warm glow #ffb04a, bronze trim
#8a6a3a. 2-frame idle breathing loop: frame 1 shoulders slightly raised,
frame 2 shoulders slightly lowered. Generate as 4 directions sheet:
South (facing viewer/down), East (facing right), North (facing away/up),
West (facing left). Size 48x48 per frame, transparent background.
[style anchors] [negative prompt]
```

---

### 3.2 Pyromancer — Walk (48×48, 4 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of a Pyromancer mage seen from above at 45-degree
angle, walking cycle 4 frames. Same character as idle: dark hooded robe
with crimson lining, orange-bronze trim, ember-crystal staff in right
hand. Frames: 1) left foot forward mid-step, staff slightly back,
2) passing pose feet together, staff vertical, 3) right foot forward
mid-step, staff slightly forward, 4) passing pose feet together,
staff vertical. Robe hem sways gently between frames. Hood slightly
bounces. Ember glow on staff tip flickers subtly. Palette same as idle:
#1a1a24, #2a2a38, #3a2418, #5a1a1a, #ff6b00, #ffb04a, #8a6a3a. Generate
as 4 directions: South, East, North, West. 48x48 per frame, transparent
background. [style anchors] [negative prompt]
```

---

### 3.3 Pyromancer — Cast/Attack (48×48, 4 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of a Pyromancer mage seen from above at 45-degree
angle, casting fireball animation 4 frames. Same character as idle. Frames:
1) wind-up, staff pulled back to side, free hand gathering orange-red
magical energy between fingers, 2) charge, staff raises, ember-crystal
glows bright yellow-white, embers particle around staff tip, 3) release,
staff thrusts forward, both arms extended, burst of orange light from
staff tip, cloak flares backward from the force, 4) recovery, staff
lowers, faint smoke wisps from staff tip. Dramatic orange rim light
on character during frames 2-3 from the magic charge. Palette same +
bright magic highlights: ember core #fff2a8, flame #ff6b00, dark red
#8b2000. Generate as 4 directions: South, East, North, West. 48x48 per
frame, transparent background. [style anchors] [negative prompt]
```

---

### 3.4 Pyromancer — Death (48×48, 4 frames × 1 dir South) — **P1**

**Prompt:**
```
Top-down 2D game sprite of a Pyromancer mage seen from above at 45-degree
angle, death animation 4 frames, facing south. Same character. Frames:
1) hit flinch, body staggers backward, staff drops from hand, 2) falls
to knees, hood falls back slightly, 3) collapsing to ground sideways,
staff on ground glowing dimly, 4) lying dead face-down on ground, robe
spread around, staff beside body with ember fading from orange to dull
grey. Palette same as idle, ember glow dims across frames. 48x48 per
frame, transparent background, single direction only.
[style anchors] [negative prompt]
```

---

### 3.5 Tileset — Floor variants (32×32, static, 4 variants) — **P0**

**Prompt:**
```
Top-down 32x32 pixel art floor tiles for a dark fantasy crypt / catacombs
biome, seamless tileable. 4 variants in one sheet side-by-side:
1) Plain cobblestone, irregular dark grey slate stones with thin mortar
cracks, palette slate #2a2a38 to stone #4a4658 with darker grout #1a1a24.
2) Cracked stone, same but with visible large crack running diagonally
and one missing tile edge showing dark pit below.
3) Moss-covered stone, same base + patches of dark emerald-green moss
#1a3a2a to #2a5a3a in corners and between cracks.
4) Bloodstained stone, same base + faint dried dark-red #3a1010 splatter
across one corner.
All 4 tiles must tile seamlessly when placed adjacent in any combination.
Subtle lighting from upper-left. Low contrast - floor should not distract
from characters. No grid lines, no tile borders visible when tiled.
[style anchors] [negative prompt]
```

---

### 3.6 Tileset — Walls (32×32, static, 7 pieces) — **P0**

**Prompt:**
```
Top-down 32x32 pixel art wall tiles for a dark fantasy crypt biome,
seen at 45-degree angle (tall wall visible, top face + vertical face).
7 pieces in one sheet:
1) Straight wall horizontal - dark carved stone blocks, top of wall
catches cold blue-grey light, vertical face in deep shadow.
2) Straight wall vertical - same but rotated 90 degrees.
3) Broken wall segment - same stone but cracked, one block missing at
top revealing dark interior, rubble pile at base.
4) Moss-covered wall - same + creeping dark emerald moss growing down
vertical face.
5) Inner corner NE.
6) Outer corner NE.
7) T-junction.
Palette: stone #4a4658, highlight #6a6878, shadow #1a1a24, moss
#1a3a2a, mortar #2a2430. Consistent lighting upper-left.
Tiles must connect seamlessly. [style anchors] [negative prompt]
```

---

### 3.7 Tileset — Exit portal (64×64, 4 frames pulse loop) — **P1**

**Prompt:**
```
Top-down 64x64 pixel art magical portal on crypt floor, 4-frame pulse
animation loop. Glowing runic circle carved into dark stone floor,
concentric circle with ancient runes around edge, pentagram-like sigil
in center. Frames: 1) dim glow, runes barely visible orange #c9a76f,
2) brightening, runes glowing warm orange #ff9a2a with faint particles,
3) peak brightness, runes blazing ember-yellow #ffc86a with rising
ember-particles and light beam shooting up, 4) dimming back toward 1.
Circle casts warm orange pool of light on surrounding floor tiles.
Palette: stone base #2a2a38, rune #c9a76f to #ffc86a, embers #ff9a2a.
64x64 per frame, transparent background (floor shows through).
[style anchors] [negative prompt]
```

---

### 3.8 Tileset — Stairs down (64×64, static) — **P1**

**Prompt:**
```
Top-down 64x64 pixel art stone stairs descending into darkness, 45-degree
angle. Square stone opening in floor with 4-5 visible steps leading down,
each step slightly darker than the one above, deepest step fading into
pure black #0a0a0e. Stone edge has carved border, slightly worn. Faint
cold blue-grey light #4a5868 on top step, absolute darkness below.
Palette: stone #4a4658, shadow steps #2a2a38 to #0a0a0e, edge carving
highlight #6a6878. Transparent background around the pit.
[style anchors] [negative prompt]
```

---

### 3.9 Zombie — Idle (48×48, 2 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of a shambling undead zombie seen from above at
45-degree angle, idle pose, 2-frame sway loop. Decomposing corpse in
tattered grey-brown burial rags hanging in shreds, exposed grey-green
rotting flesh on arms and torso, hunched posture, head tilted forward,
arms dangling loosely. Empty dark eye sockets with faint sickly green
glow #2a5a3a. Palette: rag grey-brown #3a3028, rotted flesh #5a6450,
dried blood #3a1a1a, bone #8a8474, sickly green glow #2a5a3a. Frame 1
body leaning slightly left, frame 2 slightly right. Silhouette must be
clearly distinguishable from skeleton archer - bulkier, hunched, arms
forward like it's reaching. 48x48 per frame, 4 directions: S, E, N, W.
Transparent background. [style anchors] [negative prompt]
```

---

### 3.10 Zombie — Walk (48×48, 4 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of zombie shambling-walk cycle, 4 frames,
45-degree top-down view. Same zombie as idle. Frames: 1) left foot
dragging forward, body leaning left, arms swaying slightly,
2) passing pose, both feet on ground, body upright hunched, 3) right
foot dragging forward, body leaning right, 4) passing pose. Slow,
heavy, uneven gait - NOT smooth walk. Rags sway between frames.
Palette same as idle. 48x48 per frame, 4 directions S/E/N/W,
transparent background. [style anchors] [negative prompt]
```

---

### 3.11 Zombie — Attack (48×48, 4 frames × 4 dirs) — **P0**

**Prompt:**
```
Top-down 2D game sprite of zombie melee attack animation, 4 frames,
45-degree top-down view. Same zombie. Frames: 1) wind-up, both arms
pulled back, body coiled, 2) lunge forward, arms extending with
grasping claw-like hands, mouth opening to reveal dark maw, 3) impact
strike, arms fully extended forward, body pitched forward aggressively,
4) recovery, arms retracting, body returning to hunched pose.
Palette same as idle. 48x48 per frame, 4 directions S/E/N/W,
transparent background. [style anchors] [negative prompt]
```

---

### 3.12 Zombie — Death (48×48, 4 frames × 1 dir) — **P1**

**Prompt:**
```
Top-down 2D game sprite of zombie death animation, 4 frames, facing
south only. Same zombie. Frames: 1) hit flinch, body jolts back, head
thrown back, 2) collapsing to knees, 3) falling forward face-down,
4) lying dead on ground, a small puddle of dark viscous fluid spreading
from body, faint green eye glow fading out. 48x48 per frame, transparent
background. [style anchors] [negative prompt]
```

---

### 3.13 Skeleton Archer — Idle (48×48, 2 frames × 4 dirs) — **P1**

**Prompt:**
```
Top-down 2D game sprite of an undead skeleton archer seen from above at
45-degree angle, idle pose, 2-frame sway loop. Skeletal figure in tattered
dark leather armor scraps and a weathered hood, bone-white skull exposed
with sickly green eye glow #2a5a3a, holding a short curved bow in left
hand, quiver of arrows on back. Thin, angular silhouette - clearly
different from bulky zombie. Palette: bone #a89c84, dark leather #2a1a14,
hood grey-brown #3a3028, bow wood #5a3a24, sickly green glow #2a5a3a,
arrow shafts #8a7a60 with dark iron tips. 48x48 per frame, 4 directions
S/E/N/W, transparent background. Silhouette test: must read as "ranged
skeleton" at a glance even at 24x24 thumbnail.
[style anchors] [negative prompt]
```

---

### 3.14 Skeleton Archer — Walk (48×48, 4 frames × 4 dirs) — **P1**

**Prompt:**
```
Top-down 2D game sprite of skeleton archer walking cycle, 4 frames,
45-degree view. Same skeleton. Light, rattling, quick gait (NOT heavy
like zombie). Frames: standard 4-frame walk cycle - left forward, pass,
right forward, pass. Bow held low in left hand, arrow-less. Hood bobs
slightly. Bones visibly rattle by small offset between frames.
Palette same as idle. 48x48 per frame, 4 directions S/E/N/W,
transparent background. [style anchors] [negative prompt]
```

---

### 3.15 Skeleton Archer — Shoot (48×48, 4 frames × 4 dirs) — **P1**

**Prompt:**
```
Top-down 2D game sprite of skeleton archer shooting animation, 4 frames,
45-degree view. Same skeleton. Frames: 1) drawing arrow from quiver,
bow still low, 2) nocking arrow onto bowstring, raising bow,
3) full draw - bow raised, string pulled back, arrow pointing forward,
glowing green eye sockets intensely focused, 4) release - arrow flying
off, bowstring snapping forward, skeleton recoiling slightly.
Palette same as idle. 48x48 per frame, 4 directions S/E/N/W,
transparent background. [style anchors] [negative prompt]
```

---

### 3.16 Skeleton Archer — Death (48×48, 4 frames × 1 dir) — **P2**

**Prompt:**
```
Top-down 2D game sprite of skeleton collapsing, 4 frames, facing south.
Same skeleton. Frames: 1) hit, bones rattle visibly, bow drops,
2) skull detaches and falls, body buckling, 3) bones falling apart mid-air,
4) pile of bones and armor scraps on the ground, skull resting on top
with eye glow extinguished. 48x48 per frame, transparent background.
[style anchors] [negative prompt]
```

---

### 3.17 Projectile — Fireball (24×24, 6 frames loop) — **P0**

**Prompt:**
```
Top-down 24x24 pixel art magical fireball projectile, 6-frame looping
animation. Sphere of swirling flame with bright yellow-white core
#fff2a8, hot orange middle #ff6b00, dark red outer flame #8b2000,
trailing smoke wisps behind in direction of travel. Flames swirl and
pulse between frames - core shifts position slightly, outer flame
licks in different directions each frame, small ember particles flicker
around it. Slight motion blur trail behind (2-3px of darker red fading
out). Self-illuminating - casts warm orange light that would affect
surroundings (include a faint 1-2px orange aura around the ball).
24x24 per frame, transparent background, single direction (east-facing,
game engine will rotate). [style anchors] [negative prompt]
```

---

### 3.18 VFX — Fire Impact explosion (64×64, 6 frames one-shot) — **P0**

**Prompt:**
```
Top-down 64x64 pixel art fire impact explosion VFX, 6-frame one-shot
animation (plays once and disappears). Frames: 1) small bright impact
flash at center, yellow-white point #fff2a8, 2) rapidly expanding orange
fireball #ff6b00 with ember particles radiating outward, 3) peak expansion,
full flame burst with dark red outer edge #8b2000, smoke starting to rise,
4) flame collapsing inward, leaving scorch mark, 5) fading fire with smoke
wisps rising, 6) only faint smoke and glowing embers dissipating. Radial
symmetry. Self-illuminating. 64x64 per frame, transparent background.
[style anchors] [negative prompt]
```

---

### 3.19 UI — HP bar frame (256×32, static) — **P1**

**Prompt:**
```
Dark fantasy pixel art UI frame for a health bar, 256x32 pixels.
Ornate dark bronze metal frame with gothic filigree corners matching
the style of the existing hanger_empty.png asset, inner cavity for the
bar fill (bar fill itself is NOT part of this asset - empty cavity should
be transparent/dark). Small red crystal gem icon embedded on left end of
frame. Palette: dark bronze #5a3a24, bronze highlight #8a6a3a, deep
shadow #1a1a24, red gem #c42a1a. 256x32 exact, transparent background
outside frame. [style anchors] [negative prompt]
```

---

### 3.20 UI — Mana bar frame (256×32, static) — **P1**

**Prompt:**
```
Dark fantasy pixel art UI frame for a mana bar, 256x32 pixels.
Matches the HP bar frame exactly in shape and filigree style, but with
small blue crystal gem on left end instead of red. Palette same bronze
+ blue gem #2a6acc. Transparent background outside frame.
[style anchors] [negative prompt]
```

---

### 3.21 UI — Hotbar 5 slots (320×64, static) — **P1**

**Prompt:**
```
Dark fantasy pixel art action hotbar, 320x64 pixels, 5 equal square
slots side-by-side. Each slot is 64x64 with ornate dark bronze border
matching hanger_empty.png filigree style, inner cavity transparent/dark
for spell icon to be placed by the game. Small gap 0-2px between slots.
Bottom of each slot has a tiny hotkey tab for "1", "2", "3", "4", "5"
indicator area (leave blank - game renders the number). Palette: bronze
frame #5a3a24 with #8a6a3a highlights, inner slot background #1a1a24.
320x64 exact, transparent background outside frame.
[style anchors] [negative prompt]
```

---

### 3.22 UI — Minimap frame (160×160, static) — **P2**

**Prompt:**
```
Dark fantasy pixel art minimap frame, 160x160 pixels, circular ornate
bronze frame with gothic corner filigree matching hanger_empty.png style.
Inner circular viewport 140x140 where the game will render the map -
should be transparent. Four small decorative corner pieces (compass-like
N/E/S/W markers in bronze). Palette: bronze #5a3a24 with #8a6a3a
highlights, deep shadow #1a1a24. 160x160 exact, transparent viewport
and transparent outside frame. [style anchors] [negative prompt]
```

---

## 4. Style anchors — существующие ассеты

Эти ассеты задают baseline визуального качества и палитры. Новые ассеты должны выглядеть так, будто их делал тот же художник.

1. **`/Users/sprintray/claude_soft/Veyra/assets/generated/pixel/character_idle.png`** — эталон персонажа. Robe silhouette, hood, staff, палитра (тёмно-коричневый + серо-синий + бронза). Новый Pyromancer = этот силуэт + красный/оранжевый акцент в подбое и навершии посоха.

2. **`/Users/sprintray/claude_soft/Veyra/assets/generated/pixel/character_attack.png`** — эталон анимации каста. Движение посоха, embers на навершии — референс для Pyromancer Cast.

3. **`/Users/sprintray/claude_soft/Veyra/assets/generated/pixel/hanger_empty.png`** — эталон UI-рамки. Все UI-frames (HP, mana, hotbar, minimap) должны наследовать эту bronze-filigree эстетику.

4. **`/Users/sprintray/claude_soft/Veyra/assets/generated/pixel/training_icon_v2.png`** — эталон composite-иконки (книга + жезлы). Показывает уровень painterly детализации на маленьком размере — этому же уровню должны соответствовать 48×48 юниты.

5. **`/Users/sprintray/claude_soft/Veyra/assets/generated/pixel/ICON_001.png`** — эталон spell-иконки (посох с кристаллом). Показывает, как работают магические акценты на тёмной палитре. Fireball projectile должен использовать ту же логику свечения, но в огненных тонах вместо холодных.

---

## 5. Исключения и отклонения от Style Guide

### Отклонение #1 — Переход от side-view к top-down
- **Что**: Существующие спрайты (`character_idle.png`, `training_dummy.png`) — side-view 2D. Новые спрайты pivot'а — top-down 45°.
- **Почему**: Продуктовый pivot на Diablo-style action RPG требует top-down камеры. Side-view несовместим с геймплеем «ходить по лабиринту в 4 направлениях».
- **Что сохраняется**: палитра, уровень детализации, chalk-painterly стиль пикселей, лайтинг upper-left. Стиль узнаваем как «тот же Veyra», просто с нового ракурса.
- **Кто принял**: Design Director + согласование с game-designer
- **Дата**: 2026-04-19

### Отклонение #2 — Pyromancer warm palette vs existing cool-mage palette
- **Что**: Style guide favors cool blue/cyan для магии. Pyromancer = тёплый огненный класс, красный/оранжевый акцент.
- **Почему**: Класс Pyromancer определён game-designer'ом как огненный. Визуально несовместим с холодной палитрой.
- **Компромисс**: Базовая роба остаётся тёмной (уголь/слейт), огненные акценты только на trim, подбое, navershie staff. 80/20 правило соблюдается — тёмного всё ещё больше, огонь — точечный акцент. Магическое ЯВЛЕНИЕ (fireball, impact) — тут огненная палитра полностью оправдана, это exception to desaturation rule, как прописано в оригинальном Style Guide для magic icons.
- **Кто принял**: Design Director + game-designer
- **Дата**: 2026-04-19

### Отклонение #3 — Диагональные спрайты 45° vs ortho 4-dir
- **Что**: Diablo-style обычно 8 направлений (включая диагонали NE/SE/SW/NW). Мы берём 4.
- **Почему**: Бюджет кредитов. 8 направлений × 4 анимации × 4 кадра = 128 спрайтов персонажа, нереально. 4 направления = 32 спрайта, что уже ощутимо.
- **Компромисс**: Игрок при движении NE визуально движется N (или E) — ок для прототипа. Если будет feedback «некрасиво на диагоналях» — добавим NE/SE/NW/SW во второй итерации.
- **Кто принял**: Design Director
- **Дата**: 2026-04-19

---

## 6. Checklist приёмки каждого ассета

Перед апрувом любого сгенерированного спрайта проверять:

- [ ] Палитра соответствует (hex-коды из спека, не оригинальничать)
- [ ] Силуэт читается на фактическом игровом размере (48×48 для юнитов)
- [ ] Лайтинг upper-left консистентен с другими ассетами
- [ ] Контур 1px dark по периметру силуэта
- [ ] Нет soft edges / anti-aliasing / dithering
- [ ] Прозрачный фон там, где требуется
- [ ] Анимация читается (можно понять что происходит по одиночным frame'ам)
- [ ] Zombie vs Skeleton Archer различимы по силуэту
- [ ] Размер файла в пикселях точно соответствует спеку (48×48, не 50×50)
- [ ] Магические акценты — единственный источник насыщенного цвета в кадре

---

## Версионирование
- **v1.0** (2026-04-19) — initial pivot spec, vertical slice asset bundle
