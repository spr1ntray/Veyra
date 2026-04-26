/**
 * dungeon/dungeon.js — World object + game loop entry point
 *
 * The World holds all simulation state. update(dt) runs the fixed-step
 * logic. The render function is called each animation frame from loop().
 *
 * startRun()  — initialises world, starts rAF loop
 * stopRun()   — halts loop, cleans up DOM listeners
 */

import { mulberry32 }                from '../engine/rng.js';
import { DT, MAX_FRAME_DELTA, TILE_SIZE, VIEWPORT_W, VIEWPORT_H, ISO_Y } from '../engine/config.js';
import { toggleDebug }               from '../engine/config.js';
import { buildRoomTilemap, buildCaveTilemap } from '../engine/tilemap.js';
import { initRender, draw, getZoomLevel } from '../engine/render.js';
import { loadAllSprites }            from '../engine/sprites.js';
import { initInput, snapshotInput, clearInput, destroyInput } from '../engine/input.js';
import { ObjectPool }                from '../engine/pools.js';
import { updatePlayerAI }            from '../engine/ai.js';
import { updateEnemyAI }             from '../engine/ai.js';
import { PlayerActor }               from './player.js';
import { EnemyActor }                from './enemy.js';
import { collectPickups, createGoldPickup, updateGoldMagnet } from './loot.js';
import { createExitPortal, checkExtractionTrigger } from './extraction.js';
import { updateHUD as updateDungeonHUD, initHUD, destroyHUD } from './hud.js';
import { loadPendingCustomMap, importCustomMap } from './custom_map.js';
import { buildActionBuffs } from './passive_runtime.js';

// ─────────────────────────────────────────────
// Cave configuration
// ─────────────────────────────────────────────
// At TILE_SIZE=32 the world pixel size is CAVE_COLS*32 × CAVE_ROWS*32.
// 75×52 ≈ 2400×1664px — same physical area as the old 200×140 @ 12px/tile.
const CAVE_COLS = 75;
const CAVE_ROWS = 52;

/**
 * World — holds ALL simulation state for one run.
 * Nothing in here is persisted to localStorage.
 */
class World {
  constructor(seed) {
    this.tick    = 0;
    this.rng     = mulberry32(seed);
    this.seed    = seed;

    // Entities: enemies only (player is separate for clarity)
    this.entities = [];
    this.player   = null;

    // Exit portal
    this.exitPortal = null;

    // Gold pickups
    this.pickups = [];

    // Static floor decorations — purely visual, no collision, no interaction.
    // Each: { x, y, type: 'skull'|'bones'|'rock'|'mushroom'|'crack', variant: 0..2 }
    this.decorations = [];

    // Wall decorations — torn paintings/tapestries drawn on wall front faces.
    // Each: { x, y, variant: 0..3 }  (x,y = tile-pixel coords of the wall)
    this.wallDecorations = [];

    // Object pools — pre-allocated, zero GC in hot path
    this.projectilePool = new ObjectPool(256, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0,
      radius: 8, ttl: 0, ticksLeft: 0,
      dmg: 0, ownerId: 0, team: 'player', color: '#ff6a00',
    }));
    this.particlePool = new ObjectPool(512, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, lifeMax: 0, color: '#fff', size: 4,
    }));

    // Impact VFX pool — fire_impact sprite one-shot animations
    // Each impact plays 6 frames at 5 ticks/frame = 30 ticks total
    this.impactPool = new ObjectPool(32, () => ({
      alive: false, x: 0, y: 0,
      spawnTick: 0,     // world.tick when impact was spawned
      totalTicks: 30,   // 6 frames × 5 ticks = 30 ticks (one-shot)
    }));

    // Floating damage numbers
    this.damageNumbers = [];

    // Event queue — processed once per tick by dungeon.js, then cleared
    this.events = [];

    // Tilemap — set during init
    this.tilemap = null;

    // Follow-camera offset (top-left of viewport in world-space).
    // Updated every tick by _updateCamera() to keep player centred.
    this.camera = { x: 0, y: 0 };

    // Camera shake — decays over `ticksLeft` ticks. Peak offset = magnitude.
    // Triggered via triggerShake() (e.g. player hit, explosion).
    this.cameraShake = { magnitude: 0, ticksLeft: 0, totalTicks: 0 };

    // Input snapshot — set at start of each tick
    this.input = null;

    // Run stats
    this.runStartTick = 0;
    this.killCount    = 0;
  }

  /**
   * Fixed-step update — called once per tick (DT = 1/60 s).
   */
  update(dt) {
    this.input = snapshotInput();

    // Debug toggle
    if (this.input.keysPressed.has('F3')) toggleDebug();

    // Player AI (auto-cast + movement)
    if (this.player && this.player.alive) {
      updatePlayerAI(this.player, this);
    }

    // Enemy AI
    for (const e of this.entities) {
      if (e.alive && e.team === 'enemy') {
        updateEnemyAI(e, this);
      }
    }

    // Update all entities
    if (this.player) this.player.update(dt, this);
    for (const e of this.entities) {
      if (e.alive) e.update(dt, this);
    }

    // Projectiles
    this._updateProjectiles();

    // Particles
    this._updateParticles();

    // Impact VFX
    this._updateImpacts();

    // Damage numbers
    this._updateDamageNumbers();

    // Gold magnet — pulls coins toward player within range
    updateGoldMagnet(this.player, this.pickups, TILE_SIZE);

    // Gold pickup collection
    if (this.player && this.player.alive) {
      collectPickups(this.player, this.pickups, this);
    }

    // Exit portal proximity
    if (this.player && this.player.alive) {
      checkExtractionTrigger(this.player, this.exitPortal, this);
    }

    // Cull dead entities (keep for death-flash rendering for 30 ticks)
    this.entities = this.entities.filter(e => e.alive || (e._deathTick && this.tick - e._deathTick < 35));

    this.tick++;

    // Update follow-camera to keep player centred in viewport
    this._updateCamera();
  }

  /**
   * Recomputes world.camera so the player stays centred, clamped to map edges.
   * Called at the end of every update tick.
   *
   * With zoom, the visible area in world-space is VIEWPORT / zoom. Camera offset
   * (camX, camY) is in pre-zoom world-space; render.js applies ctx.scale(zoom).
   * Centre of viewport in world-space = (VIEWPORT/2) / zoom.
   */
  _updateCamera() {
    if (!this.player || !this.tilemap) return;
    const p    = this.player;
    const t    = this.tilemap;
    const zoom = getZoomLevel();

    // Half-viewport in world-space (shrinks as zoom increases)
    const halfW = (VIEWPORT_W / 2) / zoom;
    const halfH = (VIEWPORT_H / 2) / zoom;

    let cx = Math.round(halfW - p.x);
    let cy = Math.round(halfH - p.y * ISO_Y);

    // Effective viewport size in world-space
    const effW = VIEWPORT_W / zoom;
    const effH = VIEWPORT_H / zoom;
    const mapScreenH = Math.round(t.pixelH * ISO_Y);

    // Clamp so map edges don't go past viewport edges
    cx = Math.max(effW - t.pixelW, Math.min(0, cx));
    cy = Math.max(effH - mapScreenH, Math.min(0, cy));

    // Apply decaying shake offset. Magnitude tapers linearly to 0.
    // RNG-based direction each tick so motion reads as "impact tremor".
    const s = this.cameraShake;
    if (s.ticksLeft > 0) {
      const k = s.ticksLeft / s.totalTicks; // 1 → 0 over duration
      const amp = s.magnitude * k;
      cx += ((this.rng() - 0.5) * 2 * amp) | 0;
      cy += ((this.rng() - 0.5) * 2 * amp) | 0;
      s.ticksLeft--;
    }

    this.camera.x = cx;
    this.camera.y = cy;
  }

  /**
   * Triggers a camera shake. Replaces any ongoing shake if the new one is stronger.
   * @param {number} magnitude — peak offset in pixels (e.g. 8 for a hit)
   * @param {number} ticks     — duration in ticks (e.g. 10 ≈ 167ms)
   */
  triggerShake(magnitude, ticks) {
    const s = this.cameraShake;
    if (magnitude > s.magnitude || s.ticksLeft <= 0) {
      s.magnitude  = magnitude;
      s.ticksLeft  = ticks;
      s.totalTicks = ticks;
    }
  }

  // ─────────────────────────────────────────────
  // Projectile lifecycle
  // ─────────────────────────────────────────────

  /**
   * Spawns a projectile from the pool.
   *
   * @param {Object} opts
   */
  spawnProjectile(opts) {
    const p = this.projectilePool.spawn();
    if (!p) return; // pool exhausted
    p.x           = opts.x;
    p.y           = opts.y;
    p.vx          = opts.vx;
    p.vy          = opts.vy;
    p.radius      = opts.radius || 8;
    p.ticksLeft   = Math.round((opts.ttl || 2.0) * 60);
    p.dmg         = opts.dmg   || 25;
    p.ownerId     = opts.ownerId;
    p.team        = opts.team  || 'player';
    p.color       = opts.color || '#ff6a00';
    // Passive-buff extensions
    p.aoeRadius   = opts.aoeRadius  || 0;   // px — > 0 triggers AoE splash on impact
    p.pierceCount = opts.pierceCount || 0;   // max enemies to pierce
    p.pierceHits  = opts.pierceHits  || 0;   // remaining pierce charges (counts down)
  }

  _updateProjectiles() {
    const DT_SEC = 1 / 60;
    this.projectilePool.forEach(p => {
      if (!p.alive) return;

      p.x += p.vx * DT_SEC;
      p.y += p.vy * DT_SEC;
      p.ticksLeft--;

      if (p.ticksLeft <= 0) {
        p.alive = false;
        return;
      }

      // Wall collision — AoE also triggers on wall hit
      const tc = this.tilemap.toTile(p.x, p.y);
      if (this.tilemap.isWall(tc.col, tc.row)) {
        p.alive = false;
        this._spawnImpact(p.x, p.y);
        this._spawnImpactParticles(p.x, p.y, '#ff6a00', 5);
        // Wall AoE splash
        if (p.aoeRadius > 0) {
          const splashDmg = Math.round(p.dmg * 0.70);
          const r2 = p.aoeRadius * p.aoeRadius;
          for (const other of this.entities) {
            if (!other.alive) continue;
            if (other.team === p.team) continue;
            const ox = other.x - p.x;
            const oy = other.y - p.y;
            if (ox*ox + oy*oy < r2) {
              const splashDied = other.takeDamage(splashDmg, this);
              this._spawnImpactParticles(other.x, other.y, '#ff8800', 5);
              this._spawnDamageNumber(other.x, other.y - 80, splashDmg, '#ffcc66');
              if (splashDied) this.killCount++;
            }
          }
        }
        return;
      }

      // Hit detection vs entities
      for (const e of this.entities) {
        if (!e.alive) continue;
        if (e.team === p.team) continue; // no friendly fire
        const dx   = e.x - p.x;
        const dy   = e.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < e.radius + p.radius) {
          // ── Direct hit ────────────────────────────────────────────────
          const died = e.takeDamage(p.dmg, this);
          this._spawnImpact(p.x, p.y);
          this._spawnImpactParticles(p.x, p.y, '#ff6a00', 8);
          // y-80 puts number near head in screen space (drawH=48, ISO_Y=0.6 → 48/0.6≈80)
          this._spawnDamageNumber(e.x, e.y - 80, p.dmg, '#ffee40');
          if (died) this.killCount++;

          // ── AoE splash (Blastwave / Wreath of Cinders) ────────────────
          // Deals 70% of primary hit damage to all other enemies in aoeRadius.
          if (p.aoeRadius > 0) {
            const splashDmg = Math.round(p.dmg * 0.70);
            const r2 = p.aoeRadius * p.aoeRadius;
            for (const other of this.entities) {
              if (other === e) continue;      // already hit above
              if (!other.alive) continue;
              if (other.team === p.team) continue;
              const ox = other.x - p.x;
              const oy = other.y - p.y;
              if (ox*ox + oy*oy < r2) {
                const splashDied = other.takeDamage(splashDmg, this);
                this._spawnImpactParticles(other.x, other.y, '#ff8800', 5);
                this._spawnDamageNumber(other.x, other.y - 80, splashDmg, '#ffcc66');
                if (splashDied) this.killCount++;
              }
            }
          }

          // ── Pierce (Wreath of Cinders) ─────────────────────────────────
          // Projectile passes through up to pierceCount enemies before dying.
          if (p.pierceHits != null && p.pierceHits > 0) {
            p.pierceHits--;
            // Don't mark p.alive = false — continue traveling
            return; // restart forEach iteration (not nested; skip remaining checks)
          }

          p.alive = false;
          return;
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // Particle helpers
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // Impact VFX helpers
  // ─────────────────────────────────────────────

  /**
   * Spawns a fire_impact one-shot VFX at (x, y).
   * The VFX is rendered via the impact AnimStrip in render.js.
   */
  _spawnImpact(x, y) {
    const imp = this.impactPool.spawn();
    if (!imp) return;
    imp.x         = x;
    imp.y         = y;
    imp.spawnTick = this.tick;
    imp.totalTicks = 30; // 6 frames × 5 ticks
  }

  _updateImpacts() {
    this.impactPool.forEach(imp => {
      if (!imp.alive) return;
      if (this.tick - imp.spawnTick >= imp.totalTicks) {
        imp.alive = false;
      }
    });
  }

  _spawnImpactParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.spawn();
      if (!p) return;
      const angle = this.rng() * Math.PI * 2;
      const speed = 40 + this.rng() * 80;
      p.x       = x;
      p.y       = y;
      p.vx      = Math.cos(angle) * speed;
      p.vy      = Math.sin(angle) * speed;
      p.life    = 20 + Math.round(this.rng() * 10);
      p.lifeMax = p.life;
      p.color   = color;
      p.size    = 3 + this.rng() * 3;
    }
  }

  _updateParticles() {
    const DT_SEC = 1 / 60;
    this.particlePool.forEach(p => {
      if (!p.alive) return;
      p.x    += p.vx * DT_SEC;
      p.y    += p.vy * DT_SEC;
      p.vx   *= 0.92; // drag
      p.vy   *= 0.92;
      p.life--;
      if (p.life <= 0) p.alive = false;
    });
  }

  // ─────────────────────────────────────────────
  // Damage numbers
  // ─────────────────────────────────────────────

  _spawnDamageNumber(x, y, amount, color) {
    this.damageNumbers.push({
      alive:   true,
      x,
      y,
      text:    String(amount),
      color:   color || '#ffdd00',
      size:    14,
      life:    50,
      lifeMax: 50,
      vy:      -0.5, // float upward
    });
  }

  _updateDamageNumbers() {
    for (const dn of this.damageNumbers) {
      if (!dn.alive) continue;
      dn.y    += dn.vy;
      dn.life--;
      if (dn.life <= 0) dn.alive = false;
    }
    // Trim dead numbers to avoid unbounded growth
    if (this.damageNumbers.length > 80) {
      this.damageNumbers = this.damageNumbers.filter(dn => dn.alive);
    }
  }
}

// ─────────────────────────────────────────────
// Module-level run state
// ─────────────────────────────────────────────

let _world     = null;
let _rafId     = null;
let _lastTs    = 0;
let _accumulator = 0;
let _canvas    = null;
let _container = null;

// Callbacks set by combat_bridge.js
let _onRunEnd = null;

/**
 * Called by main.js to register the run-end callback.
 * @param {Function} cb — cb({ outcome, goldEarned, xpEarned, kills })
 */
export function setOnRunEnd(cb) {
  _onRunEnd = cb;
}

/**
 * Starts a new dungeon run.
 * Called from combat_bridge.js (which is called from main.js).
 * Async: preloads all sprite sheets before starting the game loop.
 */
export async function startRun(playerConfig = {}) {
  // Pick up canvas and container references
  _canvas    = document.getElementById('action-canvas');
  _container = document.getElementById('action-combat-container');
  if (!_canvas || !_container) {
    console.error('[dungeon] action-canvas or action-combat-container not found');
    return;
  }

  // Init renderer
  initRender(_canvas);

  // Preload all sprite sheets — shows "Loading assets..." on canvas while waiting
  await loadAllSprites(_canvas);

  // Init input on the container (handles CSS-scaled coords correctly)
  initInput(_canvas, _container);

  // Build deterministic seed from current time
  const seed = Date.now() & 0xFFFFFFFF;

  _world = new World(seed);
  _world.playerConfig = playerConfig; // { classType, spellDamageBonus, unlockedPassives }

  // Build action buffs from unlocked passive nodes — used throughout the run.
  // Stored on world so ai.js / player.js can read without coupling to state.js.
  const unlockedPassives = playerConfig.unlockedPassives || [];
  _world.actionBuffs = buildActionBuffs(unlockedPassives);

  /** Converts tile (col, row) → pixel centre (world-relative). */
  function tileCenter(c, r) {
    return { x: c * TILE_SIZE + TILE_SIZE / 2, y: r * TILE_SIZE + TILE_SIZE / 2 };
  }

  // ── Tilemap: custom map OR procedural generation ───────────────────────────
  // Priority 1: assets/maps/active.json (file dropped into project by developer).
  // Priority 2: localStorage['veyra:loadMap'] (sent from map-editor via "Send to Game").
  // Priority 3: procedural cave generation.
  //
  // fetch() with cache:'no-store' so a freshly-placed file is always picked up.
  // 404 or JSON errors are caught silently — fall through to next priority.
  let customMapResult = null;

  try {
    const resp = await fetch('assets/maps/active.json', { cache: 'no-store' });
    if (resp.ok) {
      const json = await resp.json();
      const result = importCustomMap(json);
      if (result) {
        customMapResult = result;
        console.log('[dungeon] assets/maps/active.json loaded as custom map');
      }
    }
  } catch {
    // 404 or parse error — fall through to localStorage / procedural
  }

  // If no file-based map, check localStorage (editor "Send to Game" flow)
  if (!customMapResult) {
    customMapResult = loadPendingCustomMap();
  }

  let reachable, sc, sr, useCustomSpawns = false, customSpawns = null;

  if (customMapResult) {
    // Custom map path — use editor-defined tilemap and marker-based spawns
    _world.tilemap  = customMapResult.tilemap;
    customSpawns    = customMapResult.spawns;
    useCustomSpawns = true;
    reachable = _world.tilemap.reachableTiles;
    sc = customSpawns.start.c;
    sr = customSpawns.start.r;
    console.log('[dungeon] custom map loaded:', _world.tilemap.cols, '×', _world.tilemap.rows,
      '| enemies:', customSpawns.enemies.length, '| loot:', customSpawns.loot.length);
  } else {
    // Procedural generation path (unchanged)
    _world.tilemap = buildCaveTilemap(CAVE_COLS, CAVE_ROWS, _world.rng);
    reachable = _world.tilemap.reachableTiles;
    const startTile = _world.tilemap.startTile;
    sc = startTile.c;
    sr = startTile.r;
  }

  // Player at start tile
  const pPos = tileCenter(sc, sr);
  _world.player = new PlayerActor({ x: pPos.x, y: pPos.y, classType: playerConfig.classType || 'pyromancer' });

  // Apply passive buff overrides that must be set once at run-start:
  //  maxHpMul  — scale player's max and starting HP
  //  spellCdMul — scale Fireball (and other) skill cooldowns
  {
    const buffs = _world.actionBuffs;
    if (buffs.maxHpMul !== 1.0) {
      _world.player.hpMax = Math.round(100 * buffs.maxHpMul);
      _world.player.hp    = _world.player.hpMax;
    } else {
      // Ensure hpMax is always set even without buffs (referenced by regen)
      _world.player.hpMax = _world.player.hp;
    }
    if (buffs.spellCdMul !== 1.0) {
      for (const skill of _world.player.skills) {
        skill.cdTicks = Math.round(skill.cdTicks * buffs.spellCdMul);
      }
    }
  }

  // Initial camera position — centred on player before first update tick.
  // getZoomLevel() at this point returns 1.0 (default), but call it correctly
  // so the formula is consistent with _updateCamera().
  {
    const t    = _world.tilemap;
    const zoom = getZoomLevel();
    const effW = VIEWPORT_W / zoom;
    const effH = VIEWPORT_H / zoom;
    let cx = Math.round(effW / 2 - pPos.x);
    let cy = Math.round(effH / 2 - pPos.y * ISO_Y);
    const mapScreenH = Math.round(t.pixelH * ISO_Y);
    cx = Math.max(effW - t.pixelW, Math.min(0, cx));
    cy = Math.max(effH - mapScreenH, Math.min(0, cy));
    _world.camera = { x: cx, y: cy };
  }

  // ── Exit portal ────────────────────────────────────────────────────────────
  if (useCustomSpawns) {
    // Exit at the editor-placed exit marker
    _world.exitPortal = createExitPortal(tileCenter(customSpawns.exit.c, customSpawns.exit.r));
  } else {
    // Procedural: furthest reachable tile from player start (end of BFS)
    const portalTile = reachable[reachable.length - 1];
    _world.exitPortal = createExitPortal(tileCenter(portalTile.c, portalTile.r));
  }

  // ── Enemy spawns ───────────────────────────────────────────────────────────
  if (useCustomSpawns) {
    // Marker-based — no BFS distribution required.
    // Zero enemies is valid (editor can draw empty test maps).
    for (const em of customSpawns.enemies) {
      const pos = tileCenter(em.c, em.r);
      _world.entities.push(new EnemyActor({
        x:                   pos.x,
        y:                   pos.y,
        radius:              em.elite ? 14 : 12,
        collisionHalf:       em.elite ? 14 : 10,
        hp:                  em.elite ? 200 : 100,
        damage:              em.elite ? 35 : 20,
        // Slowed from 11.5/9.0 → 9.0/7.0 (-22%) for better kiting window
        moveSpeed:           em.elite ? 9.0 : 7.0,
        aggroRange:          14 * TILE_SIZE,
        attackRange:         28,
        // Attack CDs increased: normal 80→95 (+19%), elite 60→75 (+25%)
        attackCooldownTicks: em.elite ? 75 : 95,
        color:               em.elite ? '#cc2222' : '#44cc44',
        goldDrop:            em.elite ? 22 : 12,
        xpDrop:              em.elite ? 40 : 22,
      }));
    }
  } else {
    // Procedural: 36 enemies spread across reachable tiles
    // Unpowered character (~INT 10) deals ~25 dmg/1.2s; enemy HP 100 needs ~5 shots.
    // Elite HP 200 needs ~10 shots while it does 35 dmg/1.5s = ~24 dps → dies in 4s.
    const skip = Math.floor(reachable.length * 0.20);
    const pool = reachable.slice(skip);
    const count = 36;
    const step  = Math.floor(pool.length / count);
    for (let i = 0; i < count && i * step < pool.length; i++) {
      const { c, r } = pool[i * step];
      const pos = tileCenter(c, r);
      const elite = (i % 4 === 3);
      _world.entities.push(new EnemyActor({
        x:              pos.x,
        y:              pos.y,
        // radius = combat hit-detection sphere (used by projectile impact check)
        radius:         elite ? 14 : 12,
        // collisionHalf = AABB half-size for movement — separate from combat radius
        collisionHalf:  elite ? 14 : 10,
        hp:             elite ? 200 : 100,
        damage:         elite ? 35 : 20,
        // Slowed: player base 8.5 tiles/s; elites 9.0 (faster), normals 7.0 (kitable)
        // Previously 11.5/9.0 — reduced 22% for better thinking window.
        moveSpeed:      elite ? 9.0 : 7.0,
        aggroRange:     14 * TILE_SIZE,
        attackRange:    28, // pixels — melee contact range (TILE_SIZE=32; ~1 tile reach)
        // Attack CDs: normal 80→95 ticks (+19%), elite 60→75 (+25%) — more dodge window
        attackCooldownTicks: elite ? 75 : 95,
        color:          elite ? '#cc2222' : '#44cc44',
        goldDrop:       elite ? 22 : 12,
        xpDrop:         elite ? 40 : 22,
      }));
    }
  }

  // ── Gold pickups ───────────────────────────────────────────────────────────
  if (useCustomSpawns) {
    // Use loot markers from custom map
    for (const lm of customSpawns.loot) {
      const pos = tileCenter(lm.c, lm.r);
      _world.pickups.push(createGoldPickup({
        x: pos.x, y: pos.y,
        amount: lm.amount || 20,
      }));
    }
  } else {
    // Procedural: spread 12 gold piles across reachable area
    const goldCount = 12;
    const skip = Math.floor(reachable.length * 0.10);
    const pool = reachable.slice(skip);
    const step = Math.floor(pool.length / goldCount);
    for (let i = 0; i < goldCount && i * step < pool.length; i++) {
      const { c, r } = pool[i * step + Math.floor(step * 0.5)];
      const pos = tileCenter(c, r);
      _world.pickups.push(createGoldPickup({
        x: pos.x, y: pos.y,
        amount: 5 + Math.floor(_world.rng() * 10),
      }));
    }
  }

  // Floor decorations — scatter cute-dark props (always procedural, independent of custom map)
  // Weights: bones 25, rock 25, crack 20, skull 15, mushroom 15
  {
    const decorCount = Math.floor(reachable.length * 0.025);
    const tilesUsed  = new Set();
    let placed = 0, attempts = 0;
    while (placed < decorCount && attempts < decorCount * 4) {
      attempts++;
      const t    = reachable[Math.floor(_world.rng() * reachable.length)];
      const key  = t.r * _world.tilemap.cols + t.c;
      if (tilesUsed.has(key)) continue;
      tilesUsed.add(key);

      const roll = _world.rng();
      let type;
      if      (roll < 0.25) type = 'bones';
      else if (roll < 0.50) type = 'rock';
      else if (roll < 0.70) type = 'crack';
      else if (roll < 0.85) type = 'skull';
      else                  type = 'mushroom';

      _world.decorations.push({
        x: t.c * TILE_SIZE + TILE_SIZE / 2 + (_world.rng() - 0.5) * 10,
        y: t.r * TILE_SIZE + TILE_SIZE / 2 + (_world.rng() - 0.5) * 10,
        type,
        variant: Math.floor(_world.rng() * 3),
        rot:     (_world.rng() - 0.5) * Math.PI,
      });
      placed++;
    }
  }

  // Wall decorations — torn paintings/tapestries on wall faces.
  // Pick walls that have a floor tile directly in front (south side).
  {
    const placed = new Set();
    let count = 0;
    const maxCount = 10;
    const candidates = [];

    for (const { c, r } of reachable) {
      // Wall must exist one tile above this floor tile
      if (_world.tilemap.isWall(c, r - 1) && !_world.tilemap.isWall(c, r)) {
        candidates.push({ c, r: r - 1 });
      }
    }

    // Shuffle candidates using rng, pick up to maxCount
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(_world.rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const { c, r } of candidates) {
      if (count >= maxCount) break;
      const key = r * _world.tilemap.cols + c;
      if (placed.has(key)) continue;
      placed.add(key);
      _world.wallDecorations.push({
        c, r,
        x: c * TILE_SIZE + TILE_SIZE / 2,
        y: r * TILE_SIZE,
        variant: Math.floor(_world.rng() * 4),
      });
      count++;
    }
  }

  _world.runStartTick = 0;

  // Init DOM HUD
  initHUD(_world);

  // Start game loop
  _accumulator = 0;
  _lastTs      = 0;
  _rafId = requestAnimationFrame(_loop);
}

/**
 * Stops the run and emits the result.
 * @param {'extracted'|'died'|'aborted'} outcome
 */
export function stopRun(outcome) {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  clearInput();
  destroyHUD();

  const xpBase    = _world ? _world.killCount * 15 : 0;
  const deathMult = (_world && _world._deathXpHalf) ? 0.5 : 1.0;
  const xpPassive = (_world && _world.actionBuffs && _world.actionBuffs.xpMul) || 1.0;
  const goldPassive = (_world && _world.actionBuffs && _world.actionBuffs.goldMul) || 1.0;
  const rawGold   = _world ? _world.player.goldCollected : 0;
  const result = {
    outcome,
    goldEarned: Math.round(rawGold * goldPassive),
    xpEarned:   Math.floor(xpBase * deathMult * xpPassive),
    kills:      _world ? _world.killCount : 0,
  };

  _world = null;

  if (_onRunEnd) _onRunEnd(result);
}

// ─────────────────────────────────────────────
// Game loop
// ─────────────────────────────────────────────

/**
 * requestAnimationFrame loop.
 * Fixed 60Hz update + variable render (interpolated).
 */
function _loop(ts) {
  if (!_world) return;

  _rafId = requestAnimationFrame(_loop);

  const frameMs = Math.min(ts - (_lastTs || ts), MAX_FRAME_DELTA * 1000);
  _lastTs = ts;
  _accumulator += frameMs / 1000; // convert to seconds

  // Fixed-step simulation
  while (_accumulator >= DT) {
    _world.update(DT);
    _accumulator -= DT;

    // Process world events
    _processEvents(_world.events.splice(0));
  }

  // Render at variable rate (sub-tick interpolation alpha)
  const alpha = _accumulator / DT;
  draw(_world, alpha);

  // Update DOM HUD (throttled to every 3 ticks inside updateDungeonHUD)
  updateDungeonHUD(_world);
}

// ─────────────────────────────────────────────
// Event processing
// ─────────────────────────────────────────────

/**
 * Processes one batch of events emitted during world.update().
 * Side effects: updates DOM, triggers popups, stops run.
 */
function _processEvents(events) {
  for (const ev of events) {
    switch (ev.type) {

      case 'player_died': {
        // Show death screen, then stop
        _showDeathScreen();
        break;
      }

      case 'enemy_died': {
        if (_world) {
          // Drop gold
          _world.pickups.push(createGoldPickup({
            x:      ev.x,
            y:      ev.y,
            amount: ev.goldDrop || 5,
          }));
          // Track kills for XP calculation in stopRun
          _world.killCount++;
        }
        break;
      }

      case 'damage': {
        // Show player damage number (red) when enemy hits player
        if (_world && ev.team === 'player') {
          _world._spawnDamageNumber(ev.x, ev.y - 80, ev.amount, '#ff6060');
        }
        break;
      }

      case 'gold_collected': {
        // HUD update is handled by updateDungeonHUD polling player.goldCollected
        break;
      }

      case 'portal_reached': {
        _showExtractionPopup();
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────
// Popup UI
// ─────────────────────────────────────────────

let _deathShown     = false;
let _extractionShown = false;

function _showExtractionPopup() {
  if (_extractionShown) return;
  _extractionShown = true;

  // Pause auto-cast (player is at portal)
  if (_world && _world.player) {
    _world.player.autoCastEnabled = false;
    _world.player.vx = 0;
    _world.player.vy = 0;
    _world.player.path = [];
  }

  const popup = document.getElementById('action-popup');
  const gold  = _world ? _world.player.goldCollected : 0;
  const biome = 1;

  document.getElementById('action-popup-text').innerHTML =
    `Extract? Loot: <span style="color:#ffd700">${gold}g</span>, biome ${biome}`;

  popup.style.display = 'flex';
}

function _showDeathScreen() {
  if (_deathShown) return;
  _deathShown = true;

  // Pause loop events
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  const popup = document.getElementById('action-popup');
  document.getElementById('action-popup-text').innerHTML =
    `<span style="color:#ff4444;font-size:1.4em">You Died</span><br>All run loot lost.`;

  document.getElementById('action-popup-yes').textContent  = 'Return to Map';
  document.getElementById('action-popup-no').style.display = 'none';

  popup.style.display = 'flex';
}

// ─────────────────────────────────────────────
// Popup button wiring (called once from combat_bridge.js)
// ─────────────────────────────────────────────

/**
 * Wires the Yes / No buttons in the extraction / death popup.
 * Must be called once after the DOM is ready.
 */
export function bindPopupEvents() {
  const yesBtn = document.getElementById('action-popup-yes');
  const noBtn  = document.getElementById('action-popup-no');

  if (yesBtn) {
    yesBtn.addEventListener('click', () => {
      const popup = document.getElementById('action-popup');
      popup.style.display = 'none';

      if (_deathShown) {
        // Death: 50% XP (halved before stopRun so the bridge gets correct value), no loot gold
        // Temporarily adjust world state before stopRun reads it
        if (_world) {
          _world._deathXpHalf = true; // flag for stopRun to halve XP
          _world.player.goldCollected = 0; // wipe run gold on death
        }
        stopRun('died');
        return;
      }

      // Extraction: full loot
      stopRun('extracted');
    });
  }

  if (noBtn) {
    noBtn.addEventListener('click', () => {
      const popup = document.getElementById('action-popup');
      popup.style.display = 'none';
      _extractionShown = false;

      // Re-enable auto-cast and resume
      if (_world && _world.player) {
        _world.player.autoCastEnabled = true;
        if (_world.exitPortal) _world.exitPortal.dismissed = true; // suppress until player leaves range
      }
      if (!_rafId && _world) {
        _lastTs = 0;
        _rafId = requestAnimationFrame(_loop);
      }
    });
  }
}

/**
 * Resets per-run state flags (death / extraction shown).
 * Called from startRun so flags don't carry over between runs.
 */
export function resetRunFlags() {
  _deathShown      = false;
  _extractionShown = false;
}
