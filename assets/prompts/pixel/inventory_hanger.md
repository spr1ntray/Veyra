# PROMPT: Inventory Hanger — Wizard Equipment Display

## Asset Info
- **Asset ID**: UI_INV_001
- **Name**: Inventory Hanger with Wizard Equipment
- **Type**: UI Element / Interactive Display
- **Target Model**: Midjourney
- **Aspect Ratio**: 9:16 (Portrait, vertical hanger display)
- **Size**: 300×480px
- **Background**: Transparent (PNG) or dark transparent gradient

---

## MAIN PROMPT

```
A pixel art wooden hanger/clothes rack for a dark fantasy game UI. Vertical composition, minimalist 16-32bit style.

Structure: A tall wooden standing hanger in dark brown (#3a2a1a) and charcoal (#0a0a14). The hanger has a simple vertical post with a horizontal crossbar near the top, classic T-shape or Y-shape. Wood is weathered, with visible grain lines and age marks in muted orange-brown (#6b4a00). The wood is sturdy but ancient, showing cracks and splinters. No ornate decorations — pure utilitarian design.

Hanging items (arranged vertically on the hanger):
1. Dark mage's cloak/robe: Draping fabric in deep purple (#1a0a2e) and midnight blue (#0a0e27), hanging from the top crossbar. Fabric folds are clean and pixel-geometric, suggesting heavy wool. No bright highlights — fabric is shadowed, absorbing light.

2. Wizard's hat: Pointed/conical hat in dark purple (#2a1a3e) with minimal gold trim (#c9a84c) at the brim. The hat sits on the upper portion of the hanger, angled slightly. Simple silhouette, no texture details, just clean outlines.

3. Wooden staff: Leaning against the base of the hanger (bottom-left or right), dark wood (#2a1a0a) with subtle magical glow. The staff has a simple carved top (crescent moon or orb shape) in pale gold (#d4a74a), suggesting age and craftsmanship. Faint neon blue shimmer (#0099ff) around the orb, indicating arcane power — restrained glow, not overwhelming.

Lighting: Minimal overhead light from above-left, creating subtle rim lighting on hanger edges and fabric folds. The magical glow (staff and minimal aura) provides secondary illumination. Overall tone: dark, shadowed, mysterious.

Composition: Hanger fills 70% of the frame vertically. Items arranged naturally — cloak draped, hat positioned, staff leaning. 30% empty space around edges (suggesting the hanger is a physical object in space, not floating).

Colour palette: Desaturated browns, dark purples, deep blues. Gold and cyan accents only on magical items (hat trim, staff glow). No bright reds, greens, or whites. Muted, cohesive, dark fantasy.

Render: Clean pixel art, 16-32bit inspired. Sharp geometric shapes for structure, soft internal shading for fabric depth. No photorealism. Game asset quality, readable at 300px width.

Atmosphere: Ancient, magical, purposeful. This hanger holds a wizard's most essential gear — the weight of power and knowledge.

Professional pixel art UI element for dark fantasy RPG.
```

---

## NEGATIVE PROMPT

```
blurry, low quality, watermark, signature, text, deformed, photorealistic, soft edges, realistic fabric, bright colors, vivid reds, lime greens, pastel tones, cartoon style, anime, 3D render, metallic shine, glass reflection, floating particles, multiple halos, oversaturated magic, cute appearance, ornate decorations, excessive gold, excessive detail, animation frames, UI buttons visible, multiple clothing items stacked confusingly, arms or body parts visible, modern materials, plastic texture, shiny surfaces, high contrast neon, misaligned items, cropped clothing
```

---

## STYLE NOTES

The inventory hanger is a **visual anchor for the left panel** of the inventory screen. Its design prioritizes:

- **Functional clarity**: Player instantly recognizes this as equipment display (hanger + clothing items)
- **Magical identity**: The staff's arcane glow and purple color palette identify this as wizard equipment, not generic fantasy
- **Composition stability**: Vertical arrangement allows scaling to different screen heights without awkwardness
- **Restrained glow**: Unlike spell icons (bright neon), the staff glow is subtle—this is equipment, not active magic
- **Dark palette consistency**: Matches the game's overall desaturated, dark aesthetic; no jarring bright elements
- **Minimalist craftsmanship**: Simple wooden post, clean fabric folds, aged appearance—suggests durability and history
- **Cultural signification**: Purple + wizard's hat + staff = player immediately understands this is a mage's loadout

The hanger should feel like an ancient, well-used piece of furniture—similar in tone to the training_dummy (weathered, utilitarian) but more elegant (wizard's personal gear vs. training tool).

**Key visual distinctions from characters/objects**:
- Unlike combat_mage (dynamic pose, emotion), this is static and composed
- Unlike spell icons (abstract geometry), this is representational and grounded
- Unlike loading_hero (cinematic atmosphere), this is intimate and functional

---

## MIDJOURNEY COMMAND

```
/imagine pixel art vertical wooden hanger for wizard equipment, dark brown (#3a2a1a) and charcoal (#0a0a14) wood with visible grain and cracks, weathered aged appearance, T-shaped hanger post and crossbar, dark purple deep robe (#1a0a2e) and midnight blue (#0a0e27) fabric draped from top, pointed wizard hat in dark purple (#2a1a3e) with gold trim (#c9a84c) positioned on hanger, dark wooden staff (#2a1a0a) leaning against base with carved crescent moon top in pale gold (#d4a74a) and faint neon blue shimmer (#0099ff) indicating arcane magic, 16-32bit pixel art style, minimalist dark fantasy, clean geometric shapes with soft fabric shading, subtle overhead rim lighting from above-left, 70% hanger and items 30% empty space, desaturated browns purples blues palette, no bright colors, game asset quality, professional pixel art UI element, vertical composition 9:16 --ar 9:16 --niji 6 --q 2 -no blur, photorealistic, bright colors, cartoon, 3D render, ornate decorations, excessive detail, floating particles, cute appearance
```

---

## TECHNICAL NOTES

- **Transparency**: This asset MUST have a transparent background for proper UI compositing over the background_left
- **Aspect ratio**: 9:16 (portrait) allows hanger to extend from top to bottom of left panel
- **Scaling considerations**: Asset should remain readable and balanced when scaled to 250px or 350px width
- **Color accuracy**: Gold trim and blue glow are the ONLY bright elements—all other colors must be muted
- **Alignment**: Hanger post should be vertically centered; items slightly left-of-center to suggest natural draping
