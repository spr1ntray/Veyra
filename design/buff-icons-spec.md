# Buff Icons — TЗ + lobby_bg.png

**Author**: Design Director
**Date**: 2026-04-26
**Status**: APPROVED — готов к SpriteCook генерации
**Style anchor**: `design/style_guide_pixel.md` + `design/cute-minimalism-style-guide.md` (палитра)
**Replaces emoji symbols**: 🛡 / ✨ / M / C в `state.js BUFF_META`

---

## 0. Решение: иконка = визуализация ЭФФЕКТА, не дубль зелья

**Почему не дубль**: иконки зелий уже есть в инвентаре (ICON_017–ICON_020, см. `art-prompts-consumables.md`). Если бафф-pill в HUD будет копией flask-иконки, игрок видит ОДИН и ТОТ ЖЕ объект в двух местах — это визуальный шум. Хуже того, зелье-иконка всегда показывает "сосуд", а активный бафф — это уже эффект ВНЕ сосуда; он растёкся, действует. Дубль обманывает мысленную модель.

**Что выбираем**: иконка-эффект — **символ магической ауры**, исходящий от персонажа. Каждый эффект имеет узнаваемую метафору.

| Buff | Эффект | Метафора иконки |
|---|---|---|
| `mana_surge` (Mana Elixir) | restore MP | Капля + дуга энергии — "перезарядка" |
| `crystal_fortune` (Crystal Shard) | +crit chance | Грань кристалла + блик-spark — "удачный осколок" |
| `iron_flask_buff` (Iron Flask) | +40 armor | Щит-руна с заклёпками — "укрепление" |
| `shadow_dust_buff` (Shadow Dust) | dodge/+xp | Силуэт с тенью-двойником — "размытие реальности" |

Каждая иконка должна быть **узнаваема за 0.3 сек на размере 24×24 px**. Это размер pill в HUD.

---

## 1. Размер: **24×24** (не 32×32)

Сейчас pill'ы в HUD (`#hud-buffs`, см. `src/css/main.css`) — компактные плашки около размера эмодзи (16-20px высотой). Иконка 32×32 будет слишком большой — она "съест" header HUD. **24×24** влезает в pill 28×28 с 2px padding с каждой стороны и сохраняет читаемость.

SpriteCook генерит **48×48** (2x source) — coder downscale до 24×24 на Canvas с `image-rendering: pixelated`.

---

## 2. SpriteCook промпты (4 иконки)

### Общие style anchors (вставлять в каждый промпт)
```
pixel art, 48x48 pixels, dark fantasy RPG buff icon, single visual symbol
centered, transparent background, top-down or three-quarter symbolic view,
flat shading, single-pixel outline #05050a only on silhouette, NO internal
black outlines, ONE primary color accent + bone-white highlight #d8d2c0,
clean pixel edges, no anti-aliasing, no dithering, readable as glanceable
HUD icon at 24x24 size, no text, no numbers, no UI frame
```

### Общий negative prompt
```
realistic, photorealistic, gradient shading, anime, kawaii, bright cheerful
colors, 3D render, multiple colored accents, busy texture, detailed cloth
folds, cluttered, neon glow, purple haze (default), AI-art shimmer, pastels,
dithering, anti-aliasing, multiple objects, text, numbers, frame, border,
inventory item shape (no flask, no vial, no bottle visible), background
scenery
```

---

### 2.1 BUFF_001 — Mana Surge (mana_elixir effect)

**File**: `assets/generated/pixel/buff_mana_surge.png`

```
Pixel art buff icon 48x48, dark fantasy. Subject: a single luminous teardrop
of arcane mana suspended in the centre, with a thin 1-pixel curved arc of
energy spiralling once around it. The teardrop is the focal point: deep
electric blue #4a90d9 core with a tiny bone-white #d8d2c0 highlight at the
upper-left, 1-pixel cyan #5c9fd6 rim. The energy arc is 1 pixel thick, same
electric blue, dashed (3 pixels on, 1 pixel off) suggesting motion.
Background fully transparent (alpha 0). NO bottle, NO vial, NO flask — only
the freed mana energy itself. Outline 1 pixel #05050a around the teardrop
silhouette only. Palette: blue #4a90d9, cyan #5c9fd6, bone #d8d2c0, void
black #05050a. [style anchors] [negative prompt]
```

---

### 2.2 BUFF_002 — Crystal Fortune (crystal_shard effect)

**File**: `assets/generated/pixel/buff_crystal_fortune.png`

```
Pixel art buff icon 48x48, dark fantasy. Subject: a single sharp crystalline
shard pointing upward at a slight angle, with a bright 4-pixel star-spark
flare at its upper tip. Shard body is angular with 3 visible facets in deep
violet #8b5cd6 with one bright spirit-purple highlight facet #c9a4f0 catching
light. Tip flare: 4-pixel + cross sparkle in bone-white #d8d2c0 with violet
glow halo 1 pixel around it #8b5cd6. NO bag, NO pouch, NO ground — only the
shard floating. Outline 1 pixel #05050a around shard silhouette only.
Palette strictly: violet #8b5cd6, light violet #c9a4f0, bone #d8d2c0, black
#05050a. [style anchors] [negative prompt]
```

---

### 2.3 BUFF_003 — Iron Flask buff (armor up)

**File**: `assets/generated/pixel/buff_iron_armor.png`

```
Pixel art buff icon 48x48, dark fantasy. Subject: a small kite-shield rune
emblem viewed straight-on, NOT a heater shield — symbolic compact runic
plate. Shield body is dark gunmetal grey #3a3a4a with 2 visible iron rivets
(1-pixel #d8d2c0 dots) on left and right edges. Centre of shield carries a
single rune sigil — a horizontal bar with a downward-pointing triangle below
it (looks like a stylized "armor" glyph) in glowing ember #e8b44a, 1-pixel
inner highlight #ff7a1a. Faint warm glow halo 1 pixel #e8b44a around the
shield perimeter. NO sword, NO chains, NO crest, NO heraldry. Outline 1
pixel #05050a around shield silhouette only. Palette: grey #3a3a4a, gold
#e8b44a, orange #ff7a1a, bone #d8d2c0, black #05050a. [style anchors]
[negative prompt]
```

---

### 2.4 BUFF_004 — Shadow Dust buff (evasion / xp)

**File**: `assets/generated/pixel/buff_shadow_step.png`

```
Pixel art buff icon 48x48, dark fantasy. Subject: a small chibi humanoid
silhouette (shoulders and hood only, head occupies 60% — same chibi
proportions as game characters) standing centred, with an OFFSET shadow-
duplicate of itself shifted 4 pixels to the right and 1 pixel down, drawn
at 50% alpha. The main figure is silhouetted in deep shadow ink #0e0e18
with bright violet eye-glint pixel #8b5cd6 (single 1x1 pixel where eyes
would be). The duplicate ghost is fully violet #8b5cd6 at 50% alpha,
representing the dodge afterimage. 3 small floating violet dust particles
#8b5cd6 around the figure (1 pixel each). NO weapon, NO ground, NO
background. Outline 1 pixel #05050a only on main figure silhouette.
Palette: ink #0e0e18, violet #8b5cd6, void #05050a. [style anchors]
[negative prompt]
```

---

## 3. Coder integration spec

### 3.1 Где меняется

**File**: `src/js/state.js`, lines 1771-1777, the `BUFF_META` object.

Заменить `symbol` (строка эмодзи/буквы) на `iconPath`:

```js
const BUFF_META = {
  mana_surge:       { label: 'Mana Surge',      color: '#4a90d9', iconPath: 'assets/generated/pixel/buff_mana_surge.png' },
  crystal_fortune:  { label: 'Crystal Fortune', color: '#8b5cd6', iconPath: 'assets/generated/pixel/buff_crystal_fortune.png' },
  iron_flask_buff:  { label: 'Iron Flask',      color: '#e8b44a', iconPath: 'assets/generated/pixel/buff_iron_armor.png' },
  shadow_dust_buff: { label: 'Shadow Dust',     color: '#8b5cd6', iconPath: 'assets/generated/pixel/buff_shadow_step.png' }
};
```

Поле `symbol` оставить для legacy (notification toast'ы могут использовать), но добавить `iconPath`. Также обновить `getActiveBuffs()` — добавить `iconPath` в возвращаемый объект.

### 3.2 Где рендерится

**File**: `src/js/ui.js`, function `renderHudBuffs()`, lines 78-98.

**Текущий рендер** (line 94): `pill.textContent = buff.symbol;` (вставляет эмодзи).

**Новый рендер**:
```js
pill.innerHTML = `
  <img src="${buff.iconPath}" class="buff-pill-icon" alt="${buff.label}">
  <span class="buff-pill-counter">${buff.combatsLeft}</span>
`;
pill.title = `${buff.label} — ${buff.combatsLeft} combats left`;
```

То же самое в `src/js/inventory.js`, function `renderInvBuffs()`, line 504. Заменить span с symbol на img-tag.

### 3.3 CSS (добавить в `src/css/main.css` или `src/css/ui.css`)

```css
.hud-buff-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 4px;
  border-radius: 12px;
  border: 1px solid;             /* color set inline via JS */
  background: rgba(0,0,0,0.5);   /* override the inline 20% tint */
  font-family: 'Cinzel', serif;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.buff-pill-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  flex-shrink: 0;
}

.buff-pill-counter {
  color: #d8d2c0;
  font-weight: 600;
  min-width: 12px;
  text-align: center;
}

/* Hover lifts pill slightly + brightens border */
.hud-buff-pill:hover {
  filter: brightness(1.2);
  transform: translateY(-1px);
  transition: transform 0.15s, filter 0.15s;
}
```

### 3.4 Расположение в HUD

`#hud-buffs` уже существует. Не двигать. Оставляем горизонтальный flex row справа от XP-bar в HUD-капсуле. Pills группируются gap'ом 6px, max 4 одновременно (4 buff types).

### 3.5 Tooltip

Native `title` атрибут (уже есть, line 95) — норм для MVP. На будущее (NICE) — заменить на tooltip-компонент c HUD-style стилизацией (`#1a1a24` bg + `#e8b44a` border 1px), показывающий: имя баффа большим шрифтом, эффект (например "+40 Armor"), оставшиеся combats. Но это отдельная задача — не в этом ТЗ.

### 3.6 Стек одного баффа

Если игрок выпил Mana Elixir 3 раза подряд — бафф не стакается, refresh'ится таймер (см. `useConsumable()` line 1799). Pill остаётся ОДИН, counter обновляется. Никаких "x3" значков — это уже есть в логике, ничего не меняем.

### 3.7 Pre-load иконок

В `src/js/main.js`, в init или в loading screen — preload 4 PNG через `new Image(); img.src = path` чтобы первая активация баффа не дала flicker. Cache-friendly, маленькие файлы (<2 KB каждый).

---

## C. lobby_bg.png — SpriteCook prompt

**File**: `assets/generated/pixel/lobby_bg.png`
**Size**: **1280×720** (16:9, под viewport одного экрана; downscale до меньших — CSS `background-size: cover`)
**Status**: NEEDS GENERATION — заменит программный CSS gradient в `src/css/lobby.css` (`.lobby-bg`)

### Style anchor
Pixel art, dark fantasy, painterly-but-restrained. НЕ полный cute-minimalism (это ВНЕ-dungeon UI, может быть чуть детальнее), НО соблюдает dark fantasy палитру оригинального `style_guide.md`. Тональность ближе к Hades-вестибюлю / Diablo-главное-меню, чем к Crypt biome.

### Prompt

```
Pixel art background, 1280x720, dark fantasy preparation hall before
entering a magical tower. Wide horizontal scene, atmospheric, NO characters
visible (the player portrait will be rendered on top of this background by
the game engine). Composition is symmetric: left and right walls of weathered
bronze-trimmed dark stone framing the view, a deep central archway leading
into shadow at the back of the hall. Two bronze sconces with warm orange
flame #ff7a1a flicker on the left and right walls at mid-height, casting
soft warm glow #e8b44a 25% alpha onto adjacent stone. Floor is ancient
flagstone #242432 with subtle wear, slightly receding into perspective
toward the dark archway. Ceiling implied by darker shadow at top. CENTRE
of the image MUST be relatively dark and detail-light — the lower-middle
30% region is reserved for character portrait + UI buttons that will be
drawn on top, so keep that zone an unobtrusive shadow gradient. Mood is
solemn, ceremonial, "calm before the storm". NO modern elements, NO bright
sky, NO sun, NO outdoor scene, NO characters, NO weapons on walls, NO
banners, NO text. Palette: stone dark #1a1a24, slate #242432, moss grey
#3a3a4a, bronze #5a4a30, ember orange #ff7a1a, gold accent #e8b44a 30% use
only, bone highlights #d8d2c0 sparingly. Painterly pixel art with subtle
texture, not flat — but no anti-aliasing on edges. Dark fantasy, brooding,
mystical preparation chamber.
```

### Negative
```
modern, sci-fi, neon, AI-style purple gradient, bright daylight, sun, sky,
blue tones, vegetation, characters visible, NPCs, weapons hanging, banners,
text, watermark, signatures, cluttered, busy detail in centre, photo-
realistic, anime, cartoon, anti-aliased pixels, dithering, cheerful mood,
realistic flames, pastels.
```

### Integration

1. Generate via SpriteCook → place file at `assets/generated/pixel/lobby_bg.png`
2. In `src/css/lobby.css`, replace `.lobby-bg` rule:
   ```css
   .lobby-bg {
     position: absolute;
     inset: 0;
     background: url('../../assets/generated/pixel/lobby_bg.png') center/cover no-repeat;
     image-rendering: pixelated;
     z-index: 0;
   }
   ```
3. Удалить `.lobby-bg::before` (SVG noise overlay) — больше не нужен, текстура внутри PNG
4. Удалить `.lobby-arch` (программный stone arch) — теперь часть PNG
5. `.lobby-vignette` оставить — даёт дополнительный bottom shadow для контраста с UI buttons
6. Торчи `.lobby-torch` (программные) — оставить ПОВЕРХ PNG (дают анимацию пламени поверх статичных факелов из PNG; если выглядит плохо — убрать программные, но факелы из PNG не будут анимированы)
