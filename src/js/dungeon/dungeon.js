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
import { DT, MAX_FRAME_DELTA, TILE_SIZE, VIEWPORT_W, VIEWPORT_H } from '../engine/config.js';
import { toggleDebug }               from '../engine/config.js';
import { buildRoomTilemap }          from '../engine/tilemap.js';
import { initRender, draw }          from '../engine/render.js';
import { loadAllSprites }            from '../engine/sprites.js';
import { initInput, snapshotInput, clearInput } from '../engine/input.js';
import { ObjectPool }                from '../engine/pools.js';
import { updatePlayerAI }            from '../engine/ai.js';
import { updateEnemyAI }             from '../engine/ai.js';
import { PlayerActor }               from './player.js';
import { EnemyActor }                from './enemy.js';
import { collectPickups, createGoldPickup } from './loot.js';
import { createExitPortal, checkExtractionTrigger } from './extraction.js';
import { updateHUD as updateDungeonHUD, initHUD, destroyHUD } from './hud.js';

// ─────────────────────────────────────────────
// Room configuration (25×18 tiles)
// ─────────────────────────────────────────────
const ROOM_COLS = 25;
const ROOM_ROWS = 18;

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
    p.x          = opts.x;
    p.y          = opts.y;
    p.vx         = opts.vx;
    p.vy         = opts.vy;
    p.radius     = opts.radius || 8;
    p.ticksLeft  = Math.round((opts.ttl || 2.0) * 60);
    p.dmg        = opts.dmg   || 25;
    p.ownerId    = opts.ownerId;
    p.team       = opts.team  || 'player';
    p.color      = opts.color || '#ff6a00';
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

      // Wall collision
      const tc = this.tilemap.toTile(p.x, p.y);
      if (this.tilemap.isWall(tc.col, tc.row)) {
        p.alive = false;
        this._spawnImpact(p.x, p.y);
        this._spawnImpactParticles(p.x, p.y, '#ff6a00', 5);
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
          // Hit!
          const died = e.takeDamage(p.dmg, this);
          this._spawnImpact(p.x, p.y);
          this._spawnImpactParticles(p.x, p.y, '#ff6a00', 8);
          this._spawnDamageNumber(e.x, e.y - e.radius - 10, p.dmg, '#ffdd00');
          p.alive = false;
          if (died) {
            this.killCount++;
          }
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
export async function startRun() {
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
  _world.tilemap = buildRoomTilemap(ROOM_COLS, ROOM_ROWS, _world.rng);

  // Offset tiles → pixel space (room is centered in viewport)
  const roomOffX = Math.round((VIEWPORT_W - _world.tilemap.pixelW) / 2);
  const roomOffY = Math.round((VIEWPORT_H - _world.tilemap.pixelH) / 2);

  /**
   * Converts tile (col, row) → pixel center relative to room origin.
   * The render layer adds _camX/_camY again, so entity coords are
   * room-relative (0..roomPixelW, 0..roomPixelH).
   */
  function tileToRoom(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  // Spawn player at room centre
  const centerCol = Math.floor(ROOM_COLS / 2);
  const centerRow = Math.floor(ROOM_ROWS / 2);
  const pPos = tileToRoom(centerCol, centerRow);
  _world.player = new PlayerActor({ x: pPos.x, y: pPos.y });

  // Spawn 3 Zombies near corners (avoiding walls)
  const zombieSpawns = [
    tileToRoom(2, 2),
    tileToRoom(ROOM_COLS - 3, 2),
    tileToRoom(2, ROOM_ROWS - 3),
  ];
  for (const pos of zombieSpawns) {
    _world.entities.push(new EnemyActor({
      x:           pos.x,
      y:           pos.y,
      radius:      16,
      hp:          30,
      damage:      10,
      moveSpeed:   1.8,
      aggroRange:  8 * TILE_SIZE,
      attackRange: 36,
      color:       '#44cc44',
      goldDrop:    8,
      xpDrop:      15,
    }));
  }

  // Exit portal at opposite corner (bottom-right interior tile)
  const portalPos = tileToRoom(ROOM_COLS - 3, ROOM_ROWS - 3);
  _world.exitPortal = createExitPortal(portalPos);

  // A few gold piles scattered around
  const goldPositions = [
    tileToRoom(5, 5),
    tileToRoom(10, 3),
    tileToRoom(18, 9),
    tileToRoom(8, 14),
  ];
  for (const pos of goldPositions) {
    _world.pickups.push(createGoldPickup({ x: pos.x, y: pos.y, amount: 5 + Math.floor(_world.rng() * 10) }));
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

  const xpBase = _world ? _world.killCount * 15 : 0;
  const xpMult = (_world && _world._deathXpHalf) ? 0.5 : 1.0;
  const result = {
    outcome,
    goldEarned: _world ? _world.player.goldCollected : 0,
    xpEarned:   Math.floor(xpBase * xpMult),
    kills:      _world ? _world.killCount             : 0,
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
        // Drop gold at death location
        if (_world) {
          _world.pickups.push(createGoldPickup({
            x:      ev.x,
            y:      ev.y,
            amount: ev.goldDrop || 5,
          }));
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
        if (_world.exitPortal) _world.exitPortal.triggered = false;
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
