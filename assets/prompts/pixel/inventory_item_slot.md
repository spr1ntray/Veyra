# PROMPT: Inventory Item Slot — Empty

## Asset Info
- **Asset ID**: UI_INV_002
- **Name**: Inventory Item Slot (Empty)
- **Type**: UI Element / Icon
- **Target Model**: Midjourney
- **Aspect Ratio**: 1:1 (Square)
- **Size**: 64×64px or 128×128px
- **Background**: Dark solid or transparent

---

## MAIN PROMPT

```
A single inventory item slot for a dark fantasy RPG UI. Pixel art style, 16-32bit inspired. Square shape, minimalist design.

Slot structure: A recessed square frame in dark charcoal (#1a1a24) with a subtle 2-3 pixel border. The border outline is in muted gray (#2a2a34) or dark gold (#5a4a2a). The border has a slight bevel or inset effect, suggesting depth — as if the slot is a recessed pocket or compartment in a wooden inventory panel.

Interior fill: The slot interior is solid dark charcoal black (#0a0a14). This is the empty/background color. No gradient, no gloss, no reflection. Pure flat dark colour.

Optional subtle detail (very minimal): Inside the slot, a barely-visible subtle texture pattern — NOT a busy grid or complex pattern, just 2-3 horizontal or diagonal pixel lines in deep gray (#1a1a1e), barely visible. This suggests the slot has depth and material, without being visually noisy. The texture occupies maybe 5% visual weight of the interior.

Alternative (no texture): Completely flat dark charcoal interior with no texture at all. Both are acceptable.

Border effect: The outline creates a "sunken" appearance, as if clicking on this slot will place an item inside. The bevel/inset is subtle — achieved through 1-2 pixel light/dark outlines (lighter gold or gray on top-left, darker charcoal on bottom-right), NOT a dramatic 3D effect.

Colour palette: ONLY charcoal black, muted gray, and optional dark gold. No bright colors. No cyan, purple, or other accent colors (those are for filled items/icons). The empty slot is intentionally plain and neutral — ready to receive any item.

Sharpness: Every edge is pixel-perfect sharp. No anti-aliasing, no soft glow, no rounded corners. Sharp 90-degree angles on the square frame.

Readability: Must be instantly readable at 64×64px. The square frame is unmistakable even when squinted at. Players should instantly recognize this as an "empty slot where I can place an item."

Render: Pure pixel art, no 3D render, no photorealism. Clean geometric forms. This is a UI element, not a character or object.

Atmosphere: Utilitarian, neutral, receptive. This empty slot is waiting for the player to fill it with equipment or items.

Professional pixel art UI element for dark fantasy RPG inventory system.
```

---

## NEGATIVE PROMPT

```
blurry, low quality, watermark, signature, text, deformed, photorealistic, soft glow, rounded corners, bright colors, cyan, purple, gold, red highlights, vibrant colors, gradient background, complex patterns, busy texture, cartoon style, anime, 3D render, glossy surface, reflection, shadow effects, filled slot (must be empty), cluttered interior, illegible at 64x64 size, beveled too much (must be subtle), beveled too little (must have inset effect), multiple colors beyond palette, anti-aliased edges, modern UI design, glass texture, metallic shine, ornate decoration, character face, item preview visible
```

---

## STYLE NOTES

The inventory item slot is a **foundational UI component** repeated across the entire grid. Its design must be:

- **Neutral placeholder**: Empty slots must not distract or draw attention; they're scaffolding for future items
- **Consistency**: Every empty slot in the 64-slot grid is identical; creates visual order
- **Depth suggestion**: The inset bevel gives the sense of a pocket/compartment where items rest (not floating on surface)
- **Restraint**: No color; no glow; no personality—lets filled items shine when they appear
- **Scalability**: Works at 64×64px (small), 128×128px (large preview), and maintains clarity
- **Visual recognition**: Square shape is universal for inventory slots in gaming UX
- **Dark palette adherence**: Charcoal background matches the game's overall dark fantasy mood

**Key design principle**: Empty slots are like silence in music—they define structure and allow filled items (colorful icons, glowing equipment) to stand out. Too much detail or color in empty slots would destroy this hierarchy.

**Comparison with filled item icons**:
- Empty slot: Dark, neutral, no glow, minimal texture
- Filled spell icon: Bright color (cyan, purple, gold), central focal point, high contrast
- This contrast makes the UI scannable and intuitive

---

## MIDJOURNEY COMMAND

```
/imagine pixel art inventory item slot UI element, square 64x64, dark charcoal (#1a1a24) solid interior, 2-3 pixel border outline in muted gray (#2a2a34) or dark gold (#5a4a2a), subtle inset bevel effect creating recessed pocket appearance, optional barely-visible horizontal diagonal pixel lines texture (#1a1a1e) at 5% visual weight, no gradient no gloss, pure flat dark colour, sharp 90-degree corner angles pixel-perfect, 16-32bit pixel art style, utilitarian neutral receptive design, empty ready for items, professional UI element, high contrast readable at 64x64 size, dark fantasy RPG inventory system --ar 1:1 --niji 6 --q 2 -no blur, soft glow, rounded corners, bright colors, cyan purple gold, gradient, complex patterns, photorealistic, 3D render, glossy, reflection, filled slot, cluttered, anti-aliased
```

---

## TECHNICAL NOTES

- **Tileable**: This asset should work as a repeating tile in a grid layout (e.g., 8×8 grid for 64 slots)
- **Alignment**: Ensure the slot frame aligns cleanly to pixel grid; no subpixel positioning
- **Border width**: 2-3 pixels at 64×64 scale; if scaling to 128×128, increase proportionally (4-6 pixels)
- **Bevel depth**: The inset effect should be subtle—1-2 pixel depth perception, not dramatic
- **Transparency**: If using transparent background, ensure the border outline is fully opaque
- **Contrast check**: Ensure dark gold border (#5a4a2a) has enough contrast against charcoal interior (#0a0a14)
- **Grid behavior**: When repeated in 8×8 layout, slots should appear as unified cohesive grid with 1-2px spacing between cells
