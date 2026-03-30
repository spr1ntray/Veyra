# Visual Overhaul Specification — Veyra Dark Fantasy RPG

**Author:** UI/UX-Designer
**Date:** 2026-03-15
**Status:** READY FOR IMPLEMENTATION
**Target:** Coder Agent — CSS-only changes, no JS modifications required unless noted

---

## Context & Diagnosis

After reading all four CSS files (`main.css`, `combat.css`, `ui.css`, `map.css`) and `index.html`, the following structural weaknesses were identified:

1. **Loading screen:** Logo is just a 96px emoji with a drop-shadow. Title "VEYRA" is 42px — too small for a hero moment. The ornament divider is generic.
2. **Combat arena:** The "stone floor" pseudo-element lines are barely visible (0.015 opacity). The mage is `🧙` emoji at 100px with a hue-rotate filter. The dummy body is a flat brown rectangle. There is no atmospheric depth.
3. **Spell buttons:** Correct structure but the emoji icons are at 36px without a dedicated icon frame. The cooldown/disabled state has no visual feedback. There is no tier/rarity visual language.
4. **HP bar:** 8px thin line with a flat green gradient — zero drama.
5. **Combat log:** Low contrast, no background separation from arena, entries look like debug output.
6. **Location screen action button:** `location-action-btn` is only a semi-transparent black pill with a gold border. No sense of weight or importance.
7. **Map hotspots:** Completely invisible until hovered — zero affordance for new players.
8. **Home stats panel:** Flat progress bars for stats, emoji icons, no visual hierarchy between name/level/stats.
9. **Popups:** Structurally correct but the inner corners have no ornamental detail, which makes them read as generic modals.
10. **Global:** No ambient particle/atmospheric CSS animations. Stars exist but have no secondary depth layer.

---

## PRIORITY LEGEND
- **[HIGH]** — Critical visual improvement, visible immediately, implement first
- **[MEDIUM]** — Significant polish, implement second pass
- **[LOW]** — Fine detail, implement last

---

## 1. Global / Root Changes

### 1.1 [HIGH] Deepen the star background with a second nebula layer

**File:** `main.css`
**Selector:** `#stars-bg`

Add a pseudo-element that renders a static nebula behind the stars. This gives depth to every screen.

```css
#stars-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(155, 89, 182, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(74, 144, 217, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse 40% 30% at 50% 10%, rgba(201, 168, 76, 0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
```

### 1.2 [HIGH] Add new CSS variable for deeper glow values

**File:** `main.css`
**Selector:** `:root`

Add these to the existing `:root` block:

```css
--glow-gold-strong:   0 0 20px rgba(201, 168, 76, 0.8), 0 0 50px rgba(201, 168, 76, 0.4), 0 0 100px rgba(201, 168, 76, 0.1);
--glow-purple-strong: 0 0 20px rgba(155, 89, 182, 0.8), 0 0 50px rgba(155, 89, 182, 0.4);
--glow-arcane-strong: 0 0 20px rgba(74, 144, 217, 0.8),  0 0 50px rgba(74, 144, 217, 0.4);
--border-ornament: linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent);
```

### 1.3 [MEDIUM] Add a slow vignette pulse animation class

**File:** `main.css`
**New class:** `.vignette-pulse`

Used on screen backgrounds to give breathing life.

```css
@keyframes vignettePulse {
  0%, 100% { opacity: 0.7; }
  50%       { opacity: 1.0; }
}

.vignette-pulse {
  animation: vignettePulse 8s ease-in-out infinite;
}
```

### 1.4 [HIGH] Upgrade `.panel` with corner ornaments

**File:** `main.css`
**Selector:** `.panel`

The `.panel` class is used in inventory and stats. Add a second layer border that gives it a frame-within-frame look:

```css
.panel {
  background: linear-gradient(135deg, rgba(26, 10, 46, 0.95), rgba(10, 14, 39, 0.95));
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5);
}

/* Inner highlight line at top */
.panel::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 12px;
  right: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent);
  pointer-events: none;
}

/* Inner shadow at bottom */
.panel::after {
  content: '';
  position: absolute;
  bottom: 1px;
  left: 12px;
  right: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent);
  pointer-events: none;
}
```

---

## 2. Loading Screen

### 2.1 [HIGH] Replace emoji logo with a CSS-drawn arcane sigil placeholder

**File:** `main.css`
**Selector:** `.loading-logo`, `.logo-icon`

The current emoji is placeholder-level. Until the real image arrives, replace with a CSS-drawn circle rune that radiates. Do NOT remove the emoji from HTML — hide it and draw with pseudo-elements around the container.

```css
.loading-logo {
  margin-bottom: 24px;
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Hide the emoji visually, keep for accessibility */
.loading-logo .logo-icon {
  font-size: 64px;
  line-height: 1;
  display: block;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 16px rgba(155, 89, 182, 0.9)) drop-shadow(0 0 40px rgba(155, 89, 182, 0.5));
  animation: logoPulse 3s ease-in-out infinite;
}

/* Outer rotating ring */
.loading-logo::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(201, 168, 76, 0.5);
  border-top-color: transparent;
  border-bottom-color: transparent;
  animation: sigilRotate 8s linear infinite;
}

/* Inner counter-rotating ring */
.loading-logo::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 1px solid rgba(155, 89, 182, 0.4);
  border-left-color: transparent;
  border-right-color: transparent;
  animation: sigilRotate 5s linear infinite reverse;
}

@keyframes sigilRotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes logoPulse {
  0%, 100% { filter: drop-shadow(0 0 16px rgba(155,89,182,0.5)); transform: scale(1); }
  50%       { filter: drop-shadow(0 0 40px rgba(155,89,182,1.0)) drop-shadow(0 0 20px rgba(74,144,217,0.5)); transform: scale(1.04); }
}
```

### 2.2 [HIGH] Scale up the VEYRA title and add letter-by-letter reveal

**File:** `main.css`
**Selector:** `.loading-title`

```css
.loading-title {
  font-family: var(--font-title);
  font-size: 72px;           /* was 42px — hero scale */
  font-weight: 900;
  color: var(--color-gold);
  text-shadow:
    0 0 20px rgba(201, 168, 76, 0.8),
    0 0 60px rgba(201, 168, 76, 0.4),
    0 0 120px rgba(201, 168, 76, 0.15),
    0 4px 8px rgba(0, 0, 0, 1);
  letter-spacing: 16px;      /* was 4px — spread it out */
  text-transform: uppercase;
  margin-bottom: 4px;
  animation: titleAppear 1.2s cubic-bezier(0.2, 0, 0.4, 1) both;
}

@keyframes titleAppear {
  from {
    opacity: 0;
    letter-spacing: 40px;
    filter: blur(8px);
  }
  to {
    opacity: 1;
    letter-spacing: 16px;
    filter: blur(0);
  }
}
```

### 2.3 [HIGH] Subtitle styling — italic serif tagline feel

**File:** `main.css`
**Selector:** `.loading-subtitle`

```css
.loading-subtitle {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--color-text-muted);
  font-size: 16px;
  letter-spacing: 4px;
  margin-bottom: 48px;
  text-transform: uppercase;
  opacity: 0.75;
  animation: fadeInUp 1s ease 0.4s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 0.75; transform: translateY(0); }
}
```

### 2.4 [HIGH] Upgrade the ornament divider

**File:** `main.css`
**Selector:** `.ornament`, `.ornament-symbol`

The current `✦` is too plain. Add a longer decorative line with multiple diamonds:

```css
.ornament {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(201, 168, 76, 0.4);
  width: 100%;
  max-width: 360px;
  margin: 20px 0 28px;
}

.ornament::before,
.ornament::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.5), rgba(201, 168, 76, 0.2));
}

.ornament::after {
  background: linear-gradient(90deg, rgba(201, 168, 76, 0.2), rgba(201, 168, 76, 0.5), transparent);
}

.ornament-symbol {
  color: var(--color-gold);
  font-size: 18px;
  text-shadow: 0 0 10px rgba(201, 168, 76, 0.6);
  letter-spacing: 6px;   /* adds ✦ ✦ ✦ visual spacing */
}

/* Override: make the ornament-symbol render as 3 diamonds */
/* In HTML change to: <span class="ornament-symbol">✦ ✦ ✦</span> */
```

**Note for Developer:** Change the ornament-symbol span content in HTML from `✦` to `✦ ✦ ✦`.

### 2.5 [HIGH] Name input field — dark fantasy input styling

**File:** `main.css`
**Selector:** `#hero-name-input`, `.name-section`

```css
.name-section {
  width: 100%;
  max-width: 340px;
  margin-bottom: 28px;
}

.name-label {
  font-family: var(--font-title);
  font-size: 10px;
  letter-spacing: 4px;
  color: rgba(201, 168, 76, 0.6);
  text-transform: uppercase;
  margin-bottom: 10px;
  text-align: center;
}

#hero-name-display {
  font-family: var(--font-title);
  font-size: 22px;
  color: var(--color-text);
  margin-bottom: 16px;
  text-align: center;
  min-height: 28px;
  text-shadow: 0 0 12px rgba(255,255,255,0.1);
}

#hero-name-input {
  flex: 1;
  background: rgba(10, 14, 39, 0.8);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 6px;
  padding: 10px 16px;
  color: var(--color-text);
  font-family: var(--font-title);    /* was font-body — use title for character name */
  font-size: 16px;
  letter-spacing: 1px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  text-align: center;
}

#hero-name-input::placeholder {
  color: rgba(138, 122, 106, 0.5);
  font-style: italic;
  font-family: var(--font-body);
  letter-spacing: 0;
}

#hero-name-input:focus {
  border-color: rgba(201, 168, 76, 0.7);
  box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.08), 0 0 20px rgba(201, 168, 76, 0.2);
  background: rgba(10, 14, 39, 0.95);
}
```

### 2.6 [HIGH] Upgrade the "Enter Veyra" button to feel monumental

**File:** `main.css`
**Selector:** `#btn-start`

```css
#btn-start {
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 6px;         /* was 3px */
  text-transform: uppercase;
  color: #0a0e27;
  background: linear-gradient(135deg, #f0d060 0%, #c9a84c 50%, #9a7030 100%);
  border: none;
  border-radius: 4px;          /* sharper corners — more medieval feel */
  padding: 18px 56px;          /* was 14px 40px — taller and wider */
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow:
    0 0 25px rgba(201, 168, 76, 0.5),
    0 0 60px rgba(201, 168, 76, 0.2),
    0 6px 20px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Shimmer sweep */
#btn-start::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  transform: skewX(-20deg);
  transition: left 0.6s ease;
}

#btn-start:hover::before {
  left: 160%;
}

/* Top inner highlight */
#btn-start::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.5);
}

#btn-start:hover {
  transform: translateY(-3px);
  box-shadow:
    0 0 40px rgba(201, 168, 76, 0.8),
    0 0 80px rgba(201, 168, 76, 0.3),
    0 10px 30px rgba(0, 0, 0, 0.7);
  background: linear-gradient(135deg, #f5d868 0%, #d4a84c 50%, #a07838 100%);
}

#btn-start:active {
  transform: translateY(-1px);
  box-shadow:
    0 0 20px rgba(201, 168, 76, 0.5),
    0 3px 10px rgba(0, 0, 0, 0.5);
}
```

---

## 3. Combat Screen

### 3.1 [HIGH] Arena background — deeper atmosphere with fog and light sources

**File:** `combat.css`
**Selector:** `#screen-combat`, `#screen-combat::before`, `#screen-combat::after`

Replace the barely-visible floor lines with a more atmospheric treatment:

```css
#screen-combat {
  background:
    /* Top vignette */
    radial-gradient(ellipse 120% 40% at 50% 0%, rgba(26, 10, 46, 0.9) 0%, transparent 70%),
    /* Center arena spotlight */
    radial-gradient(ellipse 80% 60% at 50% 45%, rgba(40, 20, 70, 0.4) 0%, transparent 70%),
    /* Base gradient */
    linear-gradient(180deg,
      #0a071e 0%,
      #0d0b22 35%,
      #0f0d1a 60%,
      #0a0c14 100%
    );
  flex-direction: column;
  overflow: hidden;
}

/* Stone floor — higher contrast, perspective-like */
#screen-combat::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background:
    /* Vertical lines */
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 79px,
      rgba(255,255,255,0.03) 79px,
      rgba(255,255,255,0.03) 80px
    ),
    /* Horizontal lines — thicker spacing at top, closer at bottom (perspective) */
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 39px,
      rgba(255,255,255,0.03) 39px,
      rgba(255,255,255,0.03) 40px
    ),
    /* Floor shading */
    linear-gradient(180deg,
      transparent 0%,
      rgba(20, 10, 5, 0.6) 100%
    );
  pointer-events: none;
  z-index: 1;
}

/* Two torch light sources on left and right walls */
#screen-combat::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    /* Left torch */
    radial-gradient(ellipse 20% 35% at 3% 30%, rgba(201, 168, 76, 0.12) 0%, transparent 100%),
    /* Right torch */
    radial-gradient(ellipse 20% 35% at 97% 30%, rgba(201, 168, 76, 0.12) 0%, transparent 100%),
    /* Floor center glow */
    radial-gradient(ellipse 60% 20% at 50% 100%, rgba(74, 144, 217, 0.06) 0%, transparent 100%);
  pointer-events: none;
  z-index: 1;
  animation: torchFlicker 4s ease-in-out infinite;
}

@keyframes torchFlicker {
  0%, 100% { opacity: 1; }
  25%       { opacity: 0.88; }
  50%       { opacity: 0.95; }
  75%       { opacity: 0.85; }
}
```

### 3.2 [HIGH] Add torch flame elements as ::before on combat-header

**File:** `combat.css`
**Selector:** `.combat-header`

Add decorative torch dots visible in the header area corners:

```css
.combat-header {
  padding: 14px 20px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 10;
  /* Separator line below header */
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

/* Decorative torch glow spots in top corners (CSS-only) */
.combat-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0) 100%);
  box-shadow: 0 0 12px rgba(201,168,76,0.4), 4px 0 20px rgba(201,168,76,0.15);
}

.combat-header::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0) 100%);
  box-shadow: 0 0 12px rgba(201,168,76,0.4), -4px 0 20px rgba(201,168,76,0.15);
}
```

### 3.3 [HIGH] Action counter — make it feel like a dramatic countdown

**File:** `combat.css`
**Selector:** `.combat-round-display`

```css
.combat-round-display {
  font-family: var(--font-title);
  font-size: 11px;
  letter-spacing: 3px;
  color: var(--color-gold);
  text-shadow: 0 0 12px rgba(201,168,76,0.6);
  text-transform: uppercase;
  padding: 4px 12px;
  background: rgba(201, 168, 76, 0.06);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 3px;
}

/* Battles remaining counter */
#fights-remaining {
  font-family: var(--font-title);
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(138, 122, 106, 0.7);
  text-transform: uppercase;
}
```

### 3.4 [HIGH] Mage figure — dramatic arcane aura with layered glows

**File:** `combat.css`
**Selector:** `#combat-mage`, `.mage-figure`

The mage emoji needs to feel like a powerful arcane entity, not a greeting card wizard.

```css
#combat-mage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  transition: transform 0.3s ease;
}

/* Aura ring behind mage */
#combat-mage::before {
  content: '';
  position: absolute;
  bottom: 28px;       /* aligns with base of emoji */
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 24px;
  background: radial-gradient(ellipse, rgba(46, 204, 113, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: auraBreath 3s ease-in-out infinite;
  filter: blur(4px);
}

/* Vertical arcane energy column rising from feet */
#combat-mage::after {
  content: '';
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 40px;
  background: linear-gradient(180deg, transparent 0%, rgba(46,204,113,0.6) 50%, transparent 100%);
  animation: energyRise 2s ease-in-out infinite;
  filter: blur(1px);
}

@keyframes auraBreath {
  0%, 100% { opacity: 0.4; transform: translateX(-50%) scaleX(1); }
  50%       { opacity: 0.9; transform: translateX(-50%) scaleX(1.3); }
}

@keyframes energyRise {
  0%   { opacity: 0; transform: translateX(-50%) translateY(0); }
  50%  { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
}

.mage-figure {
  font-size: 100px;
  line-height: 1;
  position: relative;
  z-index: 2;
  filter:
    drop-shadow(0 0 8px rgba(46, 204, 113, 0.9))
    drop-shadow(0 0 20px rgba(46, 204, 113, 0.5))
    drop-shadow(0 0 40px rgba(155, 89, 182, 0.3))
    brightness(1.1);
  animation: mageFloat 4s ease-in-out infinite;
}

/* Platform glow under mage feet */
.mage-label {
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--color-emerald);
  text-shadow: 0 0 8px rgba(46,204,113,0.8);
  text-transform: uppercase;
  background: rgba(46, 204, 113, 0.06);
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid rgba(46, 204, 113, 0.2);
}
```

### 3.5 [HIGH] Training dummy — proper wooden feel with texture and wear

**File:** `combat.css`
**Selector:** `.dummy-figure`

```css
.dummy-figure {
  width: 80px;
  height: 130px;
  /* Layered wood grain simulation */
  background:
    /* Surface cracks/grain overlay */
    repeating-linear-gradient(
      175deg,
      transparent 0px,
      transparent 8px,
      rgba(0,0,0,0.06) 8px,
      rgba(0,0,0,0.06) 9px
    ),
    repeating-linear-gradient(
      5deg,
      transparent 0px,
      transparent 12px,
      rgba(255,255,255,0.02) 12px,
      rgba(255,255,255,0.02) 13px
    ),
    /* Base wood color — worn, darker */
    linear-gradient(180deg,
      #5a3a1a 0%,
      #4a2e10 30%,
      #3a2008 70%,
      #2a1505 100%
    );
  border-radius: 6px 6px 3px 3px;
  border: 2px solid rgba(90, 60, 20, 0.8);
  border-bottom: 3px solid rgba(30, 15, 0, 0.9);
  position: relative;
  /* Drop shadow + inner depth */
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.7),
    inset 2px 0 4px rgba(255,255,255,0.04),
    inset -2px 0 4px rgba(0,0,0,0.3),
    inset 0 2px 3px rgba(255,255,255,0.06);
}

/* Head */
.dummy-figure::before {
  content: '';
  position: absolute;
  top: -26px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  background:
    radial-gradient(circle at 40% 35%, rgba(255,255,255,0.06) 0%, transparent 50%),
    linear-gradient(145deg, #5a3a1a, #3a2008);
  border-radius: 50%;
  border: 2px solid rgba(90, 58, 20, 0.9);
  box-shadow:
    0 4px 8px rgba(0,0,0,0.5),
    inset 0 2px 3px rgba(255,255,255,0.05);
}

/* Arm crossbar */
.dummy-figure::after {
  content: '';
  position: absolute;
  top: 22px;
  left: -20px;
  right: -20px;
  height: 12px;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.04) 0%,
      #503010 30%,
      #3a2008 100%
    );
  border-radius: 4px;
  border: 1px solid rgba(80, 50, 15, 0.9);
  box-shadow:
    0 3px 8px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(255,255,255,0.04);
}

/* Target rings painted on body — using a wrapper div */
/* Note for Developer: add <div class="dummy-target-rings"></div> inside .dummy-figure in HTML */
```

**Note for Developer:** Add `<div class="dummy-target-rings"></div>` as a child of `.dummy-figure` in the HTML.

```css
.dummy-target-rings {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -45%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(201, 100, 50, 0.4);
  box-shadow:
    0 0 0 6px rgba(201, 100, 50, 0.1),
    0 0 0 12px rgba(201, 100, 50, 0.05);
}

.dummy-target-rings::before {
  content: '';
  position: absolute;
  inset: 30%;
  border-radius: 50%;
  background: rgba(201, 80, 30, 0.3);
}
```

### 3.6 [HIGH] HP bar — dramatic wide health bar with color shift on damage

**File:** `combat.css`
**Selector:** `.dummy-hp-container`, `#dummy-hp-bar`, `#dummy-hp-text`

```css
.dummy-hp-container {
  width: 140px;
  height: 14px;           /* was 8px — needs to be visible */
  background: rgba(0,0,0,0.7);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
  margin-top: 4px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
}

/* Glass overlay */
.dummy-hp-container::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 40%;
  background: rgba(255,255,255,0.06);
  pointer-events: none;
  border-radius: 3px 3px 0 0;
}

#dummy-hp-bar {
  height: 100%;
  width: 100%;
  /* Full health: green; under 50%: yellow; under 25%: red — controlled via JS width */
  background: linear-gradient(90deg, #27ae60 0%, #2ecc71 100%);
  border-radius: 2px;
  transition: width 0.5s ease, background 0.5s ease;
  position: relative;
}

/* HP bar shine pulse */
#dummy-hp-bar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.15) 50%,
    transparent 100%
  );
  animation: hpShine 2s ease-in-out infinite;
}

@keyframes hpShine {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* HP text */
#dummy-hp-text {
  font-family: var(--font-title);
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(200, 200, 200, 0.6);
  margin-top: 3px;
  text-align: center;
}
```

**Note for Developer:** Add JS-controlled class swapping on `#dummy-hp-bar` for color states:
- Width > 50%: default green gradient (as above)
- Width 25–50%: `background: linear-gradient(90deg, #e67e22, #f39c12)`
- Width < 25%: `background: linear-gradient(90deg, #c0392b, #e74c3c)` with `animation: hpCritical 0.8s ease-in-out infinite`

```css
/* Critical HP state class: .hp-critical — added/removed via JS */
.hp-critical {
  background: linear-gradient(90deg, #c0392b, #e74c3c) !important;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.6);
}

@keyframes hpCriticalPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
```

### 3.7 [HIGH] Combat log — dark scroll, styled like a grimoire page

**File:** `combat.css`
**Selector:** `.combat-log-container`, `#combat-log`, `.log-entry`

```css
.combat-log-container {
  padding: 0 16px 8px;
  height: 90px;          /* slightly taller — was 80px */
  overflow: hidden;
  position: relative;
  z-index: 10;
}

/* Top fade gradient to soften older entries */
.combat-log-container::before {
  content: '';
  position: absolute;
  top: 0; left: 16px; right: 16px;
  height: 24px;
  background: linear-gradient(180deg, rgba(10,7,30,1) 0%, transparent 100%);
  pointer-events: none;
  z-index: 5;
}

/* Bottom separator line */
.combat-log-container::after {
  content: '';
  position: absolute;
  bottom: 0; left: 16px; right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent);
}

#combat-log {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: none;
  padding-top: 4px;
}

.log-entry {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  font-family: var(--font-body);
  padding: 3px 10px;
  background: rgba(255,255,255,0.02);
  border-radius: 3px;
  border-left: 2px solid rgba(201, 168, 76, 0.3);
  animation: logEntryIn 0.25s ease;
  line-height: 1.4;
}

/* Most recent entry — highlighted */
.log-entry:last-child {
  background: rgba(201,168,76,0.05);
  border-left-color: rgba(201, 168, 76, 0.7);
}

.log-round {
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 1px;
  color: rgba(138, 122, 106, 0.6);
  min-width: 48px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.log-spell {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--color-text);
  flex: 1;
  font-size: 13px;
}

.log-damage {
  font-family: var(--font-title);
  font-size: 12px;
  color: #e74c3c;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(231,76,60,0.4);
  flex-shrink: 0;
}

.log-focus {
  font-family: var(--font-title);
  font-size: 11px;
  color: var(--color-gold);
  text-shadow: 0 0 8px rgba(201,168,76,0.5);
}
```

### 3.8 [HIGH] Spell buttons — RPG skill bar look with icon wells and spell type colors

**File:** `combat.css`
**Selector:** `.spell-btn`, `.spell-emoji`, `.spell-name`, `.combat-spells-panel`

```css
.combat-spells-panel {
  padding: 10px 16px 20px;
  position: relative;
  z-index: 10;
  /* Top ornament line */
  border-top: 1px solid rgba(201, 168, 76, 0.12);
  background: linear-gradient(180deg, rgba(5,5,15,0.6) 0%, rgba(5,5,15,0.9) 100%);
}

.spells-label {
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 3px;
  color: rgba(138, 122, 106, 0.5);
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 10px;
}

#spell-buttons {
  display: flex;
  gap: 8px;
}

.spell-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0 0 10px;
  background: rgba(5, 5, 20, 0.7);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  /* Subtle bottom edge color hint */
  border-bottom: 2px solid var(--spell-color, rgba(255,255,255,0.1));
}

/* Icon well — top portion of button */
.spell-btn .spell-emoji {
  width: 100%;
  padding: 12px 0 10px;
  font-size: 34px;
  line-height: 1;
  text-align: center;
  position: relative;
  z-index: 1;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 8px;
  filter: drop-shadow(0 0 8px var(--spell-color, rgba(255,255,255,0.3)));
  transition: filter 0.2s ease, transform 0.2s ease;
}

/* Subtle tint in icon well */
.spell-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;         /* icon well height */
  background: radial-gradient(ellipse at 50% 0%, var(--spell-color, rgba(255,255,255,0.1)) 0%, transparent 80%);
  opacity: 0.1;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

/* Bottom ambient glow */
.spell-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: radial-gradient(ellipse at 50% 100%, var(--spell-color, rgba(255,255,255,0.1)) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.spell-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: var(--spell-color, rgba(255,255,255,0.3));
  border-bottom-color: var(--spell-color, rgba(255,255,255,0.5));
  box-shadow:
    0 0 20px var(--spell-glow, rgba(255,255,255,0.2)),
    0 8px 20px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.05);
  background: rgba(10, 10, 30, 0.9);
}

.spell-btn:hover:not(:disabled)::before {
  opacity: 0.2;
}

.spell-btn:hover:not(:disabled)::after {
  opacity: 0.15;
}

.spell-btn:hover:not(:disabled) .spell-emoji {
  filter: drop-shadow(0 0 14px var(--spell-color, rgba(255,255,255,0.5)));
  transform: scale(1.08) translateY(-2px);
}

.spell-btn:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 0 10px var(--spell-glow, rgba(255,255,255,0.1));
}

/* DISABLED state — grayed out, locked feel */
.spell-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
  filter: grayscale(60%);
}

.spell-btn:disabled .spell-emoji {
  filter: none;
}

.spell-info {
  padding: 0 8px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.spell-name {
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 1px;
  color: rgba(200, 190, 170, 0.8);
  text-transform: uppercase;
  line-height: 1.3;
  transition: color 0.2s ease;
  display: block;
  margin-bottom: 3px;
}

.spell-btn:hover:not(:disabled) .spell-name {
  color: var(--spell-color, #fff);
}

.spell-stats {
  font-family: var(--font-body);
  font-size: 12px;
  color: rgba(138, 122, 106, 0.7);
}

.spell-type-label {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 10px;
  color: rgba(138, 122, 106, 0.5);
  margin-top: 1px;
  opacity: 0.8;
}

/* Hotkey indicator */
.spell-hotkey {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-family: var(--font-title);
  font-size: 8px;
  color: rgba(138, 122, 106, 0.4);
  letter-spacing: 0;
}
```

**Note for Developer:** Add `<span class="spell-hotkey">[1]</span>` (etc.) inside each `.spell-btn` dynamically.

---

## 4. Location Screen (Town Square)

### 4.1 [HIGH] HUD — glass pill with proper separation from background

**File:** `main.css`
**Selector:** `.location-hud`, `.loc-hud-name`, `.loc-hud-level`, `.loc-hud-gold`

```css
.location-hud {
  position: absolute;
  top: 16px;
  left: 20px;
  z-index: 20;
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: var(--font-title);
  /* Glass pill background */
  background: rgba(5, 5, 20, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 24px;
  padding: 6px 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
}

.loc-hud-name {
  color: var(--color-gold);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 0 12px rgba(201,168,76,0.5);
}

/* Separator between name and level */
.loc-hud-name::after {
  content: '·';
  margin-left: 10px;
  color: rgba(201,168,76,0.3);
  font-weight: 400;
}

.loc-hud-level {
  color: var(--color-arcane);
  font-size: 13px;
  letter-spacing: 1px;
  /* Remove old pill style — now contained in parent */
  padding: 0;
  border: none;
  background: none;
}

.loc-hud-gold {
  color: var(--color-gold);
  font-size: 13px;
  opacity: 0.9;
}
```

### 4.2 [HIGH] Action button "Training" — dramatic call-to-action

**File:** `main.css`
**Selector:** `.location-action-btn`

```css
.location-action-btn {
  background:
    linear-gradient(180deg, rgba(201,168,76,0.12) 0%, rgba(0,0,0,0.5) 100%);
  color: var(--color-gold);
  border: 1px solid rgba(201, 168, 76, 0.5);
  border-top: 1px solid rgba(201, 168, 76, 0.8);
  padding: 16px 48px;
  border-radius: 6px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 30px rgba(0,0,0,0.5),
    0 4px 16px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.08);
  text-shadow: 0 0 12px rgba(201,168,76,0.6);
}

/* Shimmer */
.location-action-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -80%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  transform: skewX(-20deg);
  transition: left 0.5s ease;
}

.location-action-btn:hover::before {
  left: 150%;
}

.location-action-btn:hover {
  background:
    linear-gradient(180deg, rgba(201,168,76,0.2) 0%, rgba(0,0,0,0.4) 100%);
  border-color: rgba(201,168,76,0.9);
  box-shadow:
    0 0 40px rgba(201,168,76,0.3),
    0 0 80px rgba(201,168,76,0.1),
    0 8px 24px rgba(0,0,0,0.5);
  transform: translateY(-4px);
  text-shadow: 0 0 20px rgba(201,168,76,0.9);
}

.location-action-btn:active {
  transform: translateY(-1px);
}
```

### 4.3 [MEDIUM] HUD buttons top-right — unified glass style

**File:** `main.css`
**Selector:** `.loc-btn-gold`, `.loc-btn-outline`

```css
.loc-btn-gold {
  background: rgba(201,168,76,0.15);
  color: var(--color-gold);
  border: 1px solid rgba(201,168,76,0.5);
  padding: 9px 18px;
  border-radius: 6px;
  font-family: var(--font-title);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(201,168,76,0.4);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
}

.loc-btn-outline {
  background: rgba(5,5,20,0.6);
  color: var(--color-text-muted);
  border: 1px solid rgba(255,255,255,0.15);
  padding: 9px 18px;
  border-radius: 6px;
  font-family: var(--font-title);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.loc-btn-gold:hover,
.loc-btn-outline:hover {
  transform: translateY(-2px);
}

.loc-btn-gold:hover {
  background: rgba(201,168,76,0.25);
  border-color: rgba(201,168,76,0.8);
  box-shadow: 0 0 20px rgba(201,168,76,0.3), 0 4px 12px rgba(0,0,0,0.4);
}

.loc-btn-outline:hover {
  color: var(--color-text);
  border-color: rgba(201,168,76,0.4);
  box-shadow: 0 0 12px rgba(201,168,76,0.15), 0 4px 12px rgba(0,0,0,0.4);
}
```

---

## 5. Map Screen

### 5.1 [HIGH] Map hotspots — always visible indicator marker, not just hover reveal

**File:** `map.css`
**Selector:** `.map-hotspot`, `.map-hotspot-label`

```css
.map-hotspot {
  position: absolute;
  cursor: pointer;
  z-index: 10;
  border-radius: 8px;
  /* Always-on subtle outline so player knows something is here */
  outline: 1px solid rgba(201,168,76,0.15);
  transition: all 0.35s ease;
}

/* Subtle pulse so the hotspot breathes even without hover */
.map-hotspot::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  border: 1px solid rgba(201,168,76,0.3);
  opacity: 0;
  animation: hotspotPulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes hotspotPulse {
  0%, 100% { opacity: 0;   box-shadow: inset 0 0 0px rgba(201,168,76,0); }
  50%       { opacity: 0.6; box-shadow: inset 0 0 30px rgba(201,168,76,0.05); }
}

/* Hover reveal — full gold border + inner tint */
.map-hotspot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.35s ease;
  pointer-events: none;
}

.map-hotspot:hover::after {
  border-color: rgba(201,168,76,1);
  box-shadow:
    0 0 30px rgba(201,168,76,0.5),
    0 0 60px rgba(201,168,76,0.2),
    inset 0 0 40px rgba(201,168,76,0.08);
}

/* Location name label — always visible (faint), bright on hover */
.map-hotspot-label {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-title);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(232, 196, 106, 0.5);     /* faint gold — always visible */
  white-space: nowrap;
  opacity: 1;                           /* was 0 — now always shown */
  transition: color 0.3s ease, text-shadow 0.3s ease;
  background: rgba(0,0,0,0.6);
  padding: 3px 10px;
  border-radius: 3px;
  pointer-events: none;
  z-index: 5;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(201,168,76,0.15);
}

.map-hotspot:hover .map-hotspot-label {
  color: #e8c46a;
  text-shadow: 0 0 12px rgba(201,168,76,0.8);
  border-color: rgba(201,168,76,0.4);
}
```

### 5.2 [MEDIUM] Back button — unified with other back buttons

**File:** `map.css`
**Selector:** `.map-back-btn`

```css
.map-back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 20;
  background: rgba(5,5,20,0.7);
  color: var(--color-text-muted);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 9px 18px;
  border-radius: 6px;
  font-family: var(--font-title);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.map-back-btn:hover {
  border-color: rgba(201,168,76,0.4);
  color: var(--color-gold);
  transform: translateX(-2px);
}
```

---

## 6. Home / Inventory Screen

### 6.1 [HIGH] Stats panel header — add title divider

**File:** `main.css`
**Selector:** `.home-stats-panel`, `.home-char-name`, `.home-char-level`

```css
.home-stats-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  z-index: 20;
  padding: 36px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  /* Left edge gradient border */
  border-left: 1px solid rgba(201, 168, 76, 0.2);
  background: linear-gradient(
    to left,
    rgba(10, 14, 39, 0.0) 0%,
    rgba(10, 14, 39, 0.0) 0%
  );
}

.home-char-name {
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-gold);
  text-shadow: 0 0 20px rgba(201,168,76,0.5), 0 2px 4px rgba(0,0,0,0.8);
  line-height: 1.2;
  letter-spacing: 1px;
}

.home-char-level {
  font-family: var(--font-title);
  font-size: 11px;
  color: var(--color-arcane);
  letter-spacing: 4px;
  text-transform: uppercase;
  opacity: 0.8;
  margin-top: -8px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(201, 168, 76, 0.15);
}
```

### 6.2 [MEDIUM] Stat bars — increase height, add section title

**File:** `main.css`
**Selector:** `.stat-row`, `.stat-bar-wrap`, `.stat-bar`, `.stat-name`, `.stat-icon`

```css
.stat-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  font-size: 16px;
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.2));
}

.stat-name {
  font-family: var(--font-title);
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(138, 122, 106, 0.7);
  text-transform: uppercase;
  width: 80px;
  flex-shrink: 0;
}

.stat-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(0,0,0,0.5);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

.stat-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Stat bar shine */
.stat-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  background: rgba(255,255,255,0.2);
  border-radius: 3px 3px 0 0;
}

.stat-value {
  font-family: var(--font-title);
  font-size: 12px;
  color: var(--color-text);
  min-width: 28px;
  text-align: right;
  flex-shrink: 0;
}
```

### 6.3 [MEDIUM] Home gold display — treat it as a prominent figure

**File:** `main.css`
**Selector:** `.home-gold`

```css
.home-gold {
  font-family: var(--font-title);
  font-size: 15px;
  color: var(--color-gold);
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(201,168,76,0.4);
  padding: 8px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
```

### 6.4 [MEDIUM] Equipment list — cleaner rows with slot emphasis

**File:** `main.css`
**Selector:** `.home-equip-row`, `.home-equip-slot`, `.home-equip-name`

```css
.home-equipment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding-top: 10px;
}

/* Section label for equipment */
.home-equipment-list::before {
  content: 'EQUIPPED';
  display: block;
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 4px;
  color: rgba(138,122,106,0.5);
  margin-bottom: 6px;
}

.home-equip-row {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text-muted);
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 5px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.02);
  transition: background 0.15s ease;
}

.home-equip-row:hover {
  background: rgba(201,168,76,0.04);
}

.home-equip-slot {
  color: rgba(138,122,106,0.6);
  min-width: 50px;
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.home-equip-name {
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
}
```

---

## 7. Global UI Component Upgrades

### 7.1 [HIGH] Buttons: `.btn-primary` — stronger gold presence

**File:** `main.css`
**Selector:** `.btn-primary`

```css
.btn-primary {
  font-family: var(--font-title);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #0a0e27;
  background: linear-gradient(135deg, #f0d060, #c9a84c, #9a7030);
  border: none;
  border-radius: 4px;
  padding: 12px 28px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    0 0 12px rgba(201,168,76,0.3),
    0 3px 8px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.3);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: rgba(255,255,255,0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 25px rgba(201,168,76,0.6),
    0 6px 16px rgba(0,0,0,0.5);
  background: linear-gradient(135deg, #f5d868, #d4a84c, #a07838);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### 7.2 [MEDIUM] Buttons: `.btn-secondary` — ghosted but visible

**File:** `main.css`
**Selector:** `.btn-secondary`

```css
.btn-secondary {
  font-family: var(--font-title);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(232, 224, 208, 0.6);
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  color: var(--color-text);
  border-color: rgba(201,168,76,0.3);
  background: rgba(255,255,255,0.06);
  transform: translateY(-1px);
}
```

### 7.3 [HIGH] Popups: corner ornaments on `.popup-window`

**File:** `main.css`
**Selector:** `.popup-window`

Add after the existing styles:

```css
.popup-window {
  background: linear-gradient(160deg, #1f1040 0%, #0d1230 100%);
  border: 1px solid rgba(201, 168, 76, 0.35);
  border-radius: 12px;     /* was 16px — slightly sharper */
  padding: 32px 36px;
  width: 100%;
  max-width: 520px;
  position: relative;
  box-shadow:
    var(--glow-purple),
    0 0 0 1px rgba(255,255,255,0.03) inset,
    0 24px 80px rgba(0,0,0,0.7);
  animation: popupSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Top golden rule */
.popup-window::before {
  content: '';
  position: absolute;
  top: 0; left: 20%; right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.7), transparent);
}

/* Bottom golden rule */
.popup-window::after {
  content: '';
  position: absolute;
  bottom: 0; left: 20%; right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
}
```

### 7.4 [HIGH] Notifications — more atmospheric

**File:** `main.css`
**Selector:** `.notification`

```css
.notification {
  background: rgba(8, 6, 22, 0.95);
  border-radius: 6px;
  padding: 10px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text);
  border-left: 3px solid var(--color-gold);
  /* Right edge subtle glow */
  box-shadow:
    0 4px 20px rgba(0,0,0,0.6),
    0 0 0 1px rgba(255,255,255,0.03),
    inset 0 1px 0 rgba(255,255,255,0.04);
  opacity: 0;
  transform: translateX(30px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification.notif-show {
  opacity: 1;
  transform: translateX(0);
}

.notification.notif-success {
  border-left-color: var(--color-emerald);
  box-shadow: 0 4px 20px rgba(0,0,0,0.6), -2px 0 12px rgba(46,204,113,0.15);
}

.notification.notif-warning {
  border-left-color: #f39c12;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6), -2px 0 12px rgba(243,156,18,0.15);
}

.notification.notif-info {
  border-left-color: var(--color-arcane);
  box-shadow: 0 4px 20px rgba(0,0,0,0.6), -2px 0 12px rgba(74,144,217,0.15);
}
```

### 7.5 [LOW] Popup Level Up — particle color and scale upgrade

**File:** `ui.css`
**Selector:** `#popup-levelup .popup-window`, `.levelup-crown`, `#levelup-number`

```css
#popup-levelup .popup-window {
  background: linear-gradient(160deg, #251050, #0d1230, #1a0a1a);
  border-color: var(--color-gold);
  border-width: 1px;
  text-align: center;
  overflow: hidden;
  /* Extra strong glow for this special moment */
  box-shadow:
    0 0 30px rgba(201,168,76,0.3),
    0 0 80px rgba(201,168,76,0.15),
    0 30px 100px rgba(0,0,0,0.8);
}

/* Top gold shimmer rule — celebratory */
#popup-levelup .popup-window::before {
  left: 0;
  right: 0;
  background: linear-gradient(90deg,
    transparent,
    rgba(201,168,76,0.6) 30%,
    rgba(255,240,150,1) 50%,
    rgba(201,168,76,0.6) 70%,
    transparent
  );
  animation: levelupShimmer 2s ease-in-out infinite;
}

@keyframes levelupShimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}

.levelup-crown {
  font-size: 56px;
  margin-bottom: 8px;
  animation: crownBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: block;
  filter: drop-shadow(0 0 20px rgba(201,168,76,0.7));
}

#levelup-number {
  font-family: var(--font-title);
  font-size: 72px;            /* was 56px */
  font-weight: 900;
  color: var(--color-gold);
  text-shadow:
    0 0 20px rgba(201,168,76,0.9),
    0 0 60px rgba(201,168,76,0.5),
    0 0 100px rgba(201,168,76,0.2);
  line-height: 1;
  display: block;
  animation: levelNumPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}
```

---

## 8. New CSS Animations to Add (Atmosphere)

**File:** `main.css` — add at end of file

### 8.1 [MEDIUM] Floating ember particles (ambient — pure CSS)

```css
/* Floating ambient embers — attach .ember-particle class to JS-generated divs */
@keyframes emberFloat {
  0%   { transform: translateY(100vh) translateX(0px) scale(0); opacity: 0; }
  5%   { opacity: 1; transform: translateY(95vh) scale(1); }
  95%  { opacity: 0.3; }
  100% { transform: translateY(-20px) translateX(var(--drift, 20px)) scale(0.5); opacity: 0; }
}

.ember-particle {
  position: fixed;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-gold);
  pointer-events: none;
  z-index: 0;
  animation: emberFloat var(--dur, 8s) ease-in var(--delay, 0s) infinite;
  box-shadow: 0 0 4px var(--color-gold);
}
```

**Note for Developer:** Generate 8–12 `.ember-particle` elements in the `#stars-bg` container via JS with random `--dur`, `--delay`, `--drift` CSS variables and `left` positions. Duration range: 6–14s. Only display on screens where atmosphere matters (combat, loading).

### 8.2 [MEDIUM] Screen transition — fade through black

**File:** `main.css`

```css
/* Applied to .screen.active during transitions via JS class toggle */
@keyframes screenFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.screen-enter {
  animation: screenFadeIn 0.4s ease forwards;
}
```

**Note for Developer:** Add `.screen-enter` class to the incoming `.screen.active` element and remove it after 400ms.

### 8.3 [LOW] Damage number — more dramatic pop

**File:** `combat.css`
**Selector:** `.damage-number`, `@keyframes damageFloat`

```css
.damage-number {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-title);
  font-size: 28px;           /* was 24px */
  font-weight: 900;
  pointer-events: none;
  z-index: 30;
  animation: damageFloat 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  white-space: nowrap;
  /* Color set via JS: red for damage, gold for crits, green for healing */
}

@keyframes damageFloat {
  0%   { opacity: 0; transform: translateX(-50%) translateY(0) scale(0.3); filter: blur(4px); }
  15%  { opacity: 1; transform: translateX(-50%) translateY(-12px) scale(1.4); filter: blur(0); }
  40%  { opacity: 1; transform: translateX(-50%) translateY(-24px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-70px) scale(0.7); filter: blur(2px); }
}
```

---

## 9. Implementation Priority Order

Execute in this order to see maximum visual impact per session:

### Session 1 — Loading Screen + Global (visible immediately on game open)
1. 2.2 — VEYRA title scale-up to 72px with `titleAppear` animation
2. 2.6 — "Enter Veyra" button monumental upgrade
3. 2.1 — Logo sigil rings animation
4. 2.4 — Ornament divider with 3 diamonds
5. 1.2 — New CSS variables in `:root`
6. 1.1 — Nebula layer on `#stars-bg`

### Session 2 — Combat Screen (most played screen)
7. 3.1 — Arena atmosphere (torch lights, floor texture)
8. 3.4 — Mage aura rings
9. 3.5 — Wooden dummy texture
10. 3.6 — HP bar (14px, shine animation, color states)
11. 3.8 — Spell buttons (icon well structure)
12. 3.7 — Combat log (grimoire style)
13. 3.3 — Action counter pill

### Session 3 — Location + Global UI
14. 4.2 — Training button dramatic CTA
15. 4.1 — HUD glass pill
16. 7.1 — btn-primary upgrade
17. 7.3 — Popup corner ornaments
18. 7.4 — Notification atmosphere

### Session 4 — Map + Home
19. 5.1 — Hotspot always-visible + pulse
20. 6.1 — Stats panel header divider
21. 6.3 — Gold display prominence
22. 8.2 — Screen transition fade

### Session 5 — Polish
23. 3.2 — Combat header torch columns
24. 7.5 — Level up popup upgrade
25. 8.1 — Ember particles (JS assist needed)
26. 8.3 — Damage number dramatic pop

---

## Open Questions for Developer

1. **HP color states** (section 3.6): JS needs to add/remove `.hp-low` and `.hp-critical` classes on `#dummy-hp-bar` at 50% and 25% thresholds. The CSS for the transitions is defined — only the class toggle is needed.
2. **Hotkey spans** (section 3.8): `<span class="spell-hotkey">[1]</span>` elements inside spell buttons — add in JS spell generation loop.
3. **Dummy target rings** (section 3.5): `<div class="dummy-target-rings"></div>` inside `.dummy-figure` — one line in HTML.
4. **Ornament symbol** (section 2.4): Change `✦` to `✦ ✦ ✦` in `index.html` line 58.
5. **Ember particles** (section 8.1): JS generation of 8–12 `.ember-particle` divs inside `#stars-bg` with randomized CSS variables.
6. **Screen transitions** (section 8.2): JS screen switcher should add `.screen-enter` to the newly active screen and remove it after 400ms.
