# PROMPT: Inventory Background — Left Panel (Hanger Wall)

## Asset Info
- **Asset ID**: UI_INV_003
- **Name**: Inventory Left Panel Background
- **Type**: UI Element / Background
- **Target Model**: Midjourney
- **Aspect Ratio**: 3:5 (Portrait, 40% width column)
- **Size**: 300×500px or 360×600px
- **Background**: Solid texture (not transparent)

---

## MAIN PROMPT

```
A dark fantasy stone wall background for a wizard's tower inventory panel. Pixel art style, 16-32bit inspired. Vertical panel for UI background.

Wall structure: The left panel is the interior wall of a wizard's tower chamber. Aged stone blocks in charcoal gray (#1a1a2e) and deep navy (#0a0e27). The stones are roughly rectangular, with irregular mortar seams in dark gray (#0a0a14). The stonework is ancient—visible cracks, weathering, and age marks in muted orange-brown (#5a4a2a) where stone has oxidized.

Magical atmosphere: The wall emanates a faint mystical glow in neon purple (#9b40ff) and electric blue (#00c8ff). This glow is NOT a bright neon tube; instead, it's an ethereal arcane aura that subtly illuminates the stone edges and cracks. The glow is diffuse and atmospheric, suggesting old magical enchantments seeping through the stone itself.

Glow placement: Concentrated around the edges of cracks and mortar seams, as if the mystical energy runs through the stone's gaps. The glow is strongest (maybe 20-30% visible) on the left and right edges of the panel, subtly framing the composition. Top and bottom edges have less glow. The effect is NOT uniform—pockets of brighter and dimmer areas suggest uneven magic saturation.

Lighting: Overall cool-toned. The magical glow provides the primary illumination, creating deep purples and blues in the shadows. No warm light sources (no torches, no sunlight). The stone is lit by arcane magic, not fire. Subtle rim lighting from magical sources, not sun.

Texture detail: The stone surface has visible pixel-based texture — small variations in color across individual stones, suggesting age and weathering. The texture is NOT photorealistic; it's stylized pixel art with internal color variation creating form. The mortar seams are thin, clean lines in darker gray, creating grid-like structure.

Composition: The wall fills the entire 40% left column. No decorative elements, no items (the hanger overlays on top of this background). The background is pure atmosphere — it supports the hanger without competing.

Colour palette: Charcoal, navy, dark gray, muted orange-brown for stone. Neon purple and electric blue for magical glow ONLY. No bright reds, greens, or yellows. The purple and blue account for maybe 10-15% of total visual weight; 85-90% is stone tones.

Render: Pixel art, 16-32bit inspired. Internal color gradients suggest stone form and age without photorealism. The magical glow is soft and diffuse, suggesting arcane energy without harsh neon outlines. Game asset quality.

Atmosphere: Ancient, mystical, powerful. This is the chamber where a great wizard practices magic. The walls themselves hum with residual arcane energy. Ominous but not threatening—this is a place of knowledge and power.

Vertical composition: Panel extends from top to bottom, designed to frame the inventory hanger in the center. The stone and glow create visual depth, so the hanger appears to be resting against a real wall, not floating in a void.

Professional pixel art UI background for dark fantasy RPG inventory system.
```

---

## NEGATIVE PROMPT

```
blurry, low quality, watermark, signature, text, deformed, photorealistic, realistic stone, soft focus, bright colors, vivid reds, lime greens, pastel tones, cartoon style, anime, 3D render, glossy surface, glass reflection, overly uniform stone pattern, modern architecture, brick pattern (stone blocks only, not brick), excessive ornate decorations, statues, sculptures, visible items, weapons, armor visible, bright torch light, warm yellow light, sunlight, windows, doors, furniture, plant vegetation, characters visible, floating particles, animated effects, glowing runes with text, oversaturated glow, neon glare harsh edges, multiple light sources
```

---

## STYLE NOTES

The left panel background is a **visual stage** for the inventory hanger. Its design must:

- **Frame the hanger**: Provide a neutral but atmospheric backdrop; let the hanger + items be the focal point
- **Establish setting**: Immediately communicate "this is a wizard's tower, ancient and magical"
- **Mood consistency**: Dark, cool-toned, mystical—aligns with overall game aesthetic
- **Magical identity**: The purple and blue glow identify this space as arcane, not mundane
- **Depth perception**: The glowing cracks suggest the wall has layers and substance; the hanger is a physical object resting against it
- **Restraint**: No busy patterns, no competing details; support without distraction
- **Scalability**: Works at 300px width (mobile-small), 360px width (tablet), and can extend to 400px+ for desktop

**Key design principle**: This background is to inventory UI what the loading screen is to the game launch—it sets mood and establishes context without overwhelming the player. The hanger is the active element; the wall is the environment.

**Color choice rationale**:
- **Charcoal/navy stone**: Dark palette matches overall game aesthetic; suggests underground/tower location
- **Purple glow**: Ties to wizard/magic identity; reiterates the game's magical color system (purple = magical/protective)
- **Blue glow**: Secondary magical accent; suggests cool arcane energy, not warm fire
- **Muted orange-brown**: Suggests age and weathering; adds realism to stone without photorealism

**Glow intensity balance**:
- Too much glow → feels artificial and neon-ish (breaks immersion)
- Too little glow → looks like a regular wall (loses magical atmosphere)
- Target: 10-15% visual weight, concentrated in cracks and edges, just enough to suggest "this is enchanted"

---

## MIDJOURNEY COMMAND

```
/imagine pixel art stone wall background for wizard tower inventory panel, dark fantasy UI element, charcoal gray (#1a1a2e) and deep navy (#0a0e27) aged stone blocks, irregular mortar seams in dark gray (#0a0a14), weathering oxidation marks in muted orange-brown (#5a4a2a), faint neon purple (#9b40ff) and electric blue (#00c8ff) magical glow emanating from cracks and edges, glow concentrated on left right edges subtly framing composition, cool-toned arcane lighting not torch light, subtle magical rim lighting, pixel-based texture with color variation suggesting age and form, thin clean mortar grid lines, vertical panel composition 3:5 aspect ratio, 10-15% visual weight magical glow 85-90% stone tones, 16-32bit pixel art style, ancient mystical powerful atmosphere, supports inventory hanger overlay, game asset quality --ar 3:5 --niji 6 --q 2 -no blur, photorealistic, realistic stone, bright colors, vivid reds greens yellows, cartoon, 3D render, glossy, reflection, uniform patterns, modern architecture, ornate decorations, bright torch light warm yellow light, sunlight, excessive glow harsh neon edges
```

---

## TECHNICAL NOTES

- **Seamless tiling**: The background should be a flat panel (not tileable); designed specifically for the left inventory column
- **Overlay compatibility**: The hanger (UI_INV_001) will be composited on top of this background; ensure there's visual separation (glow shouldn't obscure hanger silhouette)
- **Glow effect intensity**: The magical glow should not be so bright that it creates bloom/halo on edges (keep it diffuse and atmospheric)
- **Color accuracy**: Verify neon purple (#9b40ff) and electric blue (#00c8ff) are correctly rendered; these are non-negotiable magic color anchors
- **Vertical repetition**: If the panel needs to scale taller (e.g., for tablet/desktop), ensure the glow pattern doesn't create obvious repeating artifacts
- **Edge blending**: Ensure left/right edges of the background blend seamlessly when adjacent to the 60% right panel (item grid)
- **Contrast with right panel**: The left background should be slightly darker/more atmospheric than the right panel's background to create visual hierarchy
