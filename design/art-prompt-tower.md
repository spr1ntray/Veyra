# Art Prompt — The Spire of Colwick (Tower Entrance)

> **Date**: 2026-04-10
> **Target**: Stable Diffusion / DALL-E
> **Usage**: Tower entrance screen background, map hotspot icon
> **Style**: Consistent with existing Veyra pixel art (dark fantasy, gold/brown palette)

---

## Prompt 1: Tower Entrance — Full Background (for screen-tower)

**Resolution**: 1920x1080, landscape orientation

```
A towering dark stone spire rising from crumbling ruins, dark fantasy pixel art style, 
32-bit color depth, detailed pixel work. The tower is ancient and imposing, built from 
blackened stone blocks with faintly glowing golden runes carved into its surface. 

The spire has 10 visible floor levels marked by narrow window slits that emit different 
colored light — warm orange at the bottom floors fading to cold blue-white at the top. 
The peak is shrouded in dark storm clouds with occasional lightning.

At the base of the tower, a massive arched entrance gate with iron-and-gold ornate doors 
standing half-open. Golden light spills from the entrance onto cracked stone steps. 
Two stone gargoyle sentinels flank the gate, their eyes glowing faint amber.

The environment: dead trees with twisted branches, scattered broken stone pillars, 
a path of worn cobblestones leading to the entrance. Dark sky with deep purple and 
charcoal tones. Faint stars visible through cloud breaks.

Atmosphere: ominous but beckoning, the tower promises both danger and reward. 
Color palette: blacks, deep browns, charcoal grays with gold and amber accent lighting.
No characters visible — the scene is empty, waiting for the player.

Style: pixel art, dark fantasy RPG, top-quality sprite work, atmospheric lighting, 
reminiscent of classic dungeon crawlers. NOT photorealistic. Clean pixel edges.
```

---

## Prompt 2: Tower Icon (for map hotspot)

**Resolution**: 128x128, square, transparent background

```
A single dark stone tower icon, pixel art style, 64-bit sprite quality scaled to 128x128. 
Dark fantasy aesthetic. The tower is tall and narrow, built from blackened stone with 
golden rune markings. A single arched doorway at the base glows amber. The tower peak 
has a faint magical aura — swirling gold particles. 

Transparent background. Clean pixel edges. Color palette: dark stone gray, black, 
with gold and amber accents. Suitable as a clickable map icon in a browser RPG.

Style: pixel art icon, dark fantasy, consistent with inventory item icons (64x64 
base style upscaled). Sharp, readable at small sizes.
```

---

## Prompt 3: Floor Guardian Enemies (batch — 10 sprites)

**Resolution**: 128x128 each, transparent background

### Floor 1: Spire Sentinel
```
A stone golem guard, pixel art sprite, 128x128, transparent background. 
Dark gray stone body with golden rune cracks running along joints. 
Humanoid form, bulky, holding a stone hammer. Glowing amber eyes. 
Dark fantasy pixel art style, earth element creature.
```

### Floor 2: Ember Wraith
```
A ghostly fire spirit, pixel art sprite, 128x128, transparent background. 
Translucent body made of flickering orange-red flames with a dark skeletal 
form visible inside. Floating, no legs — trails of ember particles below. 
Burning eye sockets. Dark fantasy pixel art style, fire element creature.
```

### Floor 3: Storm Gargoyle
```
A winged stone gargoyle, pixel art sprite, 128x128, transparent background. 
Gray stone body with cracks of electric blue lightning coursing through veins. 
Bat-like wings spread wide, crouched attack pose. Crackling electricity 
around clawed hands. Dark fantasy pixel art style, air element creature.
```

### Floor 4: Frost Warden
```
An armored ice knight, pixel art sprite, 128x128, transparent background. 
Plate armor made of crystallized ice, pale blue with white frost details. 
Wielding a frozen halberd. Breath visible as cold mist. Icicle formations 
on shoulders. Dark fantasy pixel art style, water element creature.
```

### Floor 5: Bone Colossus
```
A massive skeleton construct, pixel art sprite, 128x128, transparent background. 
Built from hundreds of fused bones into a towering humanoid form. Ribcage 
visible with a dark purple energy core inside. Bone armor plates on shoulders 
and forearms. Glowing purple eye sockets. Dark fantasy pixel art style, 
earth element undead creature.
```

### Floor 6: Phantom Duelist
```
An ethereal swordsman ghost, pixel art sprite, 128x128, transparent background. 
Semi-transparent blue-white spectral figure in tattered noble clothing. 
Wielding two rapiers with ghostly silver glow. Aristocratic posture, 
fencing stance. Trailing wisps of ectoplasm. Dark fantasy pixel art style, 
air element undead creature.
```

### Floor 7: Abyssal Tide
```
A water elemental horror, pixel art sprite, 128x128, transparent background. 
A mass of dark ocean water shaped into a vaguely humanoid torso with 
tentacle-like arms. Deep blue-green coloring with bioluminescent teal 
spots. Multiple eyes embedded in the water body. Dripping, wave-like 
movement implied. Dark fantasy pixel art style, water element creature.
```

### Floor 8: Infernal Knight
```
A demon in burning plate armor, pixel art sprite, 128x128, transparent background. 
Black iron armor with cracks of molten lava visible between plates. 
Horned helmet with flames erupting from the visor. Wielding a massive 
two-handed flaming greatsword. Standing in a pool of fire at its feet. 
Dark fantasy pixel art style, fire element demon creature.
```

### Floor 9: Void Sentinel
```
An alien void entity, pixel art sprite, 128x128, transparent background. 
A tall, thin figure made of swirling dark purple-black void energy. 
No clear features — a silhouette of absolute darkness with star-like 
white pinpoint eyes. Geometric void crystals orbiting its body. 
Reality distortion effect around edges. Dark fantasy pixel art style, 
void/null element creature.
```

### Floor 10: Archon of Colwick (Boss)
```
An ancient archmage lich, pixel art sprite, 128x128, transparent background. 
A towering skeletal mage in ornate golden robes with black and deep purple 
trim. A crown of floating golden runes orbits its skull. Holds a staff 
made of crystallized magic — shifting between fire, lightning, ice, and 
earth at the tip. Eyes burn with intense white-gold light. Tattered cape 
flowing with magical energy. The most imposing enemy in the game. 
Dark fantasy pixel art style, legendary boss creature.
```

---

## Style Consistency Notes

- All sprites should match the existing Veyra pixel art style (see `assets/generated/pixel/` for reference)
- Color palette: dark backgrounds, gold/amber accents, element-specific colors (fire: orange-red, air: electric blue, water: teal-blue, earth: brown-orange)
- Transparent backgrounds required for all sprites
- Image rendering will use `image-rendering: pixelated` in CSS
- Target display size in-game: 80-120px, so detail should be readable at that scale
