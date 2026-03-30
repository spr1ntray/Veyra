# Veyra Dark Fantasy RPG — Visual Style Guide

## Project Overview
**Game**: Veyra — Dark Fantasy Browser RPG
**Platform**: PC Browser (Modern Web)
**Mood**: Grim, mystical, arcane. Visual touchstones: Diablo 2, Elden Ring, Dark Souls
**Rendering Style**: Painterly 2D digital illustration with rich detail and atmospheric depth

---

## Color Palette

### Core Colors
- **Primary Dark**: `#0a0e27` (deep navy, almost black)
- **Secondary Dark**: `#1a0a2e` (dark purple, shadow tone)
- **Accent Gold**: `#c9a84c` (warm metallic gold, UI highlights, runes)
- **Accent Emerald**: `#2ecc71` (vibrant green, health/life magic, glow accents)

### Palette Behavior
- **Overall Tone**: Desaturated, cool-shifted dominates. Gold and emerald are rare, strategic accents
- **Lighting Rule**: All assets favor rim lighting from above-left; deep shadows dominate
- **Saturation**: 30-50% saturation; avoid bright, vivid colors unless they are magical effects
- **Contrast**: High contrast between lit edges and shadow masses
- **Background**: Transparent for sprites; black/very dark for UI icons; atmospheric gradient for large scenes

### Forbidden Color Patterns
- No bright reds (unless blood/wounds)
- No pastels, light hues, or clean bright colors
- No vivid lime green (emerald only, and muted)
- No flesh tones lighter than mid-tan (characters weathered by dark world)
- No pure white highlights (use pale gold or cream instead)

---

## Visual Style & Rendering

### Artistic Direction
- **Base Style**: Painterly digital illustration
- **Detail Level**: High; visible brush texture, anatomical accuracy, environmental wear
- **Lighting Model**: Dramatic directional rim lighting; volumetric shadows
- **Atmosphere**: Misty, arcane aura around magical elements; dust/particle effects where relevant
- **Emotion**: Brooding, ominous, powerful, introspective

### Style Anchor Keywords
Use these in **every** prompt:

1. `painterly digital illustration` — establishes hand-crafted 2D aesthetic
2. `dark fantasy art style` — genre anchor
3. `detailed` — encourages richness and clarity
4. `dramatic rim lighting from above-left` — enforces consistent lighting direction
5. `high contrast` — ensures readability and visual impact
6. `desaturated palette` — guides color restraint
7. `atmospheric` — adds mood and depth

### Per-Asset Type Rules

#### Characters (combat_mage)
- **Pose**: Dynamic, casting or ready stance; facing right for left-side combat placement
- **Silhouette**: Clear and readable at small scales (~100px)
- **Details**: Visible clothing wrinkles, armor/robe folds, magical aura, spell energy
- **Lighting**: Face illuminated from above-left; body casts deep shadow
- **Background**: Transparent (PNG)
- **Forbidden**: Photorealism, overly muscular, generic fantasy trope, smiling/heroic poses

#### Environmental Objects (training_dummy)
- **Material Realism**: Worn wood, metal, visible damage/cracks
- **Stance**: Stable, grounded, "inert" feel (not alive)
- **Detail**: Craftsmanship visible; rust, splinters, dents from use
- **Lighting**: Edge-lit, dramatic shadows emphasizing 3D form
- **Background**: Transparent (PNG)
- **Forbidden**: Polished/new appearance, cartoony styling, anthropomorphic features

#### Spell Icons (64×64)
- **Center of Frame**: Icon centered, clear, readable at 64px
- **Visual Clarity**: No fine detail lines (will blur at small scale); bold shapes
- **Glow/Aura**: Magical elements shimmer or glow; integrated into design
- **Background**: Solid dark or subtle gradient (not transparent)
- **Color Coding**:
  - **Arcane Bolt** → Bright electric blue (exception to desaturation rule—magic is vivid)
  - **Focus** → Gold + subtle blue protection glow
  - **Shadow Pulse** → Deep purple/violet with void black center
- **Forbidden**: Photorealism, busy patterns, small text, complex backgrounds, unclear silhouette

#### Loading Screen (1920×1080)
- **Composition**: Cinematic, symmetrical or balanced asymmetry
- **Subject**: Dark sky/void, arcane magic circle on ground, lone figure silhouette (wizard) center
- **Scale**: Figure is small but compelling; circle dominates mid-ground
- **Atmosphere**: Mist, arcane energy, volumetric light rays from above
- **Palette**: Deep navy sky, gold runes in circle, emerald magic accents
- **Forbidden**: Bright colors, busy details, legible text in the image itself (UI will overlay), cheerful mood

---

## Lighting & Atmosphere

### Directional Lighting
- **Primary Light Source**: Above-left, angled ~45° downward
- **Quality**: Hard-edged rim lighting creating silhouettes and depth
- **Shadow Character**: Deep, rich shadow masses (not gray—use dark purples, navies)
- **Specular Highlights**: Rare and strategic; pale gold, cream, or cool white on metal/magic

### Atmospheric Effects
- **Mist/Haze**: Subtle volumetric fog in backgrounds, especially for large scenes
- **Magical Glow**: Arcane elements emit soft glow (not harsh neon); blue for cold magic, gold for protective
- **Dust/Particles**: Visible in dramatic light rays; suggests age, decay, or magical disturbance
- **Obscuration**: Use shadow and haze to hide details and create mystery

---

## Typography Aesthetics
(Applies to UI context, not image generation, but documented for consistency)

- **Headings**: Playfair Display (serif, elegant, authoritative)
- **Body**: Segoe UI or system sans-serif (clean, readable)
- **Mood**: Classical fantasy with modern clarity; no novelty fonts

---

## Forbidden Elements — Absolute Rules

These must **never** appear in any generated asset:

- **Modern/Contemporary Objects**: Cars, phones, electricity, neon signs, contemporary architecture
- **Bright, Cheerful Aesthetics**: Smiling faces, bright primary colors, cartoon style, whimsical elements
- **Low Quality Markers**: Blurry, low resolution, watermarks, signatures, visible text/watermarks
- **Anatomical Errors**: Extra limbs, fused fingers, distorted proportions, unrealistic anatomy
- **Generic Fantasy Clichés**: Overly muscular heroes, sexualized character designs, anime-inspired big eyes
- **Environmental Mismatches**: Lush greenery, sunny skies, pastoral scenery (Veyra is dark and cursed)
- **Inconsistent Art Styles**: Photorealism mixed with painterly, 3D render mixed with 2D illustration
- **UI Clutter in Scene Art**: Text, HUD elements, menus, dialog boxes should not appear in scene artwork

---

## Reference Keywords by Category

### Always Include
- `painterly digital illustration`
- `dark fantasy art style`
- `detailed`
- `dramatic rim lighting from above-left`
- `high contrast`
- `desaturated palette`
- `atmospheric`
- `ArtStation trending` (or `concept art` depending on type)

### Color References (specific to asset)
- For characters & objects: reference exact hex codes in prompt
- For icons: specific color names (e.g., "electric blue," "deep violet")
- For scenes: reference mood words (e.g., "moonlit," "shadow-dominated," "arcane-lit")

### Mood Anchors (by asset type)
- **Characters**: `brooding`, `powerful`, `introspective`, `determined`
- **Objects**: `weathered`, `war-torn`, `ancient craftsmanship`
- **Magic/Icons**: `arcane`, `eldritch`, `mystical`, `ethereal`
- **Scenes**: `ominous`, `cinematic`, `haunting`, `mystical`

### Negative Prompt Standards

**Always include these baseline negatives:**
```
blurry, low quality, watermark, signature, text, deformed, extra limbs, bad anatomy, distorted proportions, inconsistent lighting, oversaturated, stock photo, generic, modern, bright, cartoon, anime, photorealistic, neon, out of frame, cropped
```

**Asset-specific additions:**

- **Characters**: `multiple heads, fused fingers, asymmetrical face, unrealistic proportions, too muscular, oversexualized`
- **Objects**: `anthropomorphic features, polished/new, shiny plastic, unrealistic proportions`
- **Icons**: `complex background, photorealistic, 3D render, cluttered, illegible, blended shapes, text`
- **Scenes**: `daylight, bright sky, green vegetation, sunlight, cheerful, contemporary, futuristic`

---

## Asset Specifications Summary

| Asset ID | Type | Size | Background | Style Notes |
|----------|------|------|------------|------------|
| combat_mage | Character Portrait | 200×300px | Transparent | Casting pose, right-facing, arcane aura |
| training_dummy | Environmental Sprite | 180×280px | Transparent | Worn wood & metal, damage visible |
| spell_arcane_bolt | Icon | 64×64px | Dark solid | Electric blue orb, bright exception |
| spell_focus | Icon | 64×64px | Dark solid | Gold shield + blue rune glow |
| spell_shadow_pulse | Icon | 64×64px | Dark solid | Deep purple void swirl |
| loading_hero | Scene Art | 1920×1080px (or 512×512) | Atmospheric | Cinematic, figure silhouette, magic circle |

---

## Generation Model Notes

### Recommended Models
- **Midjourney v6** (preferred for detail, consistency, fantasy art)
- **Flux Pro** (good for prompt precision, slightly more photorealistic—may need extra style anchors)
- **Stable Diffusion 3.5** (acceptable, less consistent on fantasy mood)

### Model-Specific Adjustments
- **Midjourney**: Style anchors work reliably; add `--style raw` for painterly effect; aspect ratio via `--ar`
- **Flux**: More literal prompt interpretation; include "illustration," "painting," "digital art" explicitly; avoid abstract metaphors
- **DALL-E 3**: Better at scenes than characters; requires very explicit descriptors; less reliable on dark moods

---

## Revision History & Notes

**Created**: 2026-03-15
**Version**: 1.0
**Status**: Foundation complete, ready for prompt generation

**Future Considerations**:
- Seasonal assets may require palette adjustments (autumn reds, winter grays)
- Boss characters may warrant premium reference art attachment
- Loading screens might benefit from animated versions (particle effects, glow)
- Icon hover states may need brightened variants

