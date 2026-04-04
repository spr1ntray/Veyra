# Art Prompts -- Consumable Icons (64x64 pixel art, dark fantasy)

> **Author**: Art Director Agent
> **Date**: 2026-03-30
> **Style reference**: dark fantasy pixel art, 64x64 px, dark/black background, high contrast, glowing accents, no text, single item centered.
> **Output**: PNG with transparency or solid dark background.
> **IMPORTANT**: Do NOT mention any specific AI generation tool in prompts.

---

## ICON_017 -- Mana Elixir (mana_elixir)

**Prompt:**
A small round glass vial filled with bright cyan-blue luminous potion, pixel art style, 64x64 pixels, dark fantasy RPG inventory icon. The liquid inside glows intensely with arcane energy, casting soft blue light on the glass surface. Tiny magical sparks and mote particles float upward from the liquid. Glass stopper with a small crystal embedded on top. The vial has a slightly bulbous shape with a narrow neck. Color palette: deep cyan (#00bcd4), bright electric blue (#4fc3f7), white spark highlights. Dark background, nearly black. Clean pixel edges, no anti-aliasing, no dithering on outlines. Top-down perspective, centered composition.

**Filename:** `assets/generated/pixel/ICON_017.png`
**Status:** NEEDS GENERATION

---

## ICON_018 -- Crystal Shard (crystal_shard)

**Prompt:**
A sharp, jagged crystalline shard with angular facets, pixel art style, 64x64 pixels, dark fantasy RPG inventory icon. The crystal is a mix of deep violet and icy blue, glowing from within with pulsing inner light. Light refracts through the facets creating small prismatic highlights at the edges. The shard is pointed upward at an angle, slightly asymmetric and raw -- not polished, as if broken from a larger formation. Faint purple-blue aura haze surrounds the base. Color palette: deep purple (#7b1fa2), icy blue (#4dd0e1), violet-white glow highlights (#e1bee7). Dark background, nearly black. Clean pixel edges, no anti-aliasing, no dithering on outlines. Top-down perspective, centered composition.

**Filename:** `assets/generated/pixel/ICON_018.png`
**Status:** NEEDS GENERATION

---

## ICON_019 -- Iron Flask (iron_flask)

**Prompt:**
A sturdy medieval iron hip flask with runic engravings etched into the metal surface, pixel art style, 64x64 pixels, dark fantasy RPG inventory icon. The flask is squat and rounded with riveted seams and a heavy screw cap. Faint reddish-orange glow emanates from a thin seam or crack near the cap, suggesting something volatile inside. The runic symbols along the side glow with a dim warm ember light. Dark patina on the iron with subtle metallic highlights on edges. Color palette: dark gunmetal gray (#37474f), warm ember red (#ff5722), orange glow (#ff8a65), rust brown (#795548). Dark background, nearly black. Clean pixel edges, no anti-aliasing, no dithering on outlines. Top-down perspective, centered composition.

**Filename:** `assets/generated/pixel/ICON_019.png`
**Status:** NEEDS GENERATION

---

## ICON_020 -- Shadow Dust (shadow_dust)

**Prompt:**
A small cloth drawstring pouch made of dark fabric, slightly open at the top with black-purple magical dust spilling out, pixel art style, 64x64 pixels, dark fantasy RPG inventory icon. The pouch is tied with a thin dark cord. Fine particles of shadow dust rise upward from the opening, forming wispy tendrils that dissolve into the air. Tiny violet-purple sparks flicker among the rising dust particles. The fabric texture is rough, matte, and dark. Color palette: near-black fabric (#1a1a2e), deep purple dust (#4a148c), violet sparks (#ce93d8), faint magenta glow (#ab47bc). Dark background, nearly black. Clean pixel edges, no anti-aliasing, no dithering on outlines. Top-down perspective, centered composition.

**Filename:** `assets/generated/pixel/ICON_020.png`
**Status:** NEEDS GENERATION

---

## Summary

| # | Item | Filename | Status | Priority |
|---|------|----------|--------|----------|
| ICON_017 | Mana Elixir | ICON_017.png | **NEEDS GENERATION** | High -- already referenced in ITEMS_DATA |
| ICON_018 | Crystal Shard | ICON_018.png | **NEEDS GENERATION** | High -- already referenced in ITEMS_DATA |
| ICON_019 | Iron Flask | ICON_019.png | **NEEDS GENERATION** | High -- already referenced in ITEMS_DATA |
| ICON_020 | Shadow Dust | ICON_020.png | **NEEDS GENERATION** | High -- already referenced in ITEMS_DATA |

**Note:** All 4 items are already referenced in `state.js` ITEMS_DATA with `img` paths pointing to these files. The shop (`shop.js`) and inventory (`inventory.js`) will show broken images until these are generated. This is the current blocker for visual completeness of the merchant shop feature.

**Art Direction Notes:**
- All icons must feel cohesive with existing equipment icons (ICON_001 through ICON_016)
- Consumables should be visually distinct from equipment -- smaller objects, more "held in hand" feeling
- Glow effects should be subtle but visible against the dark inventory background
- Each icon should be instantly recognizable at 48x48 display size (the 64x64 source gives room for downscaling)
