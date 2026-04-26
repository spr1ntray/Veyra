/**
 * engine/ai.js — Enemy AI primitives + player auto-cast FSM
 *
 * AI runs inside world.update() using world.tick — no performance.now().
 * The auto-cast logic scans for the nearest enemy every 6 ticks (~100ms at 60Hz)
 * and fires a skill if its cooldown is ready.
 */

import { ActorState } from './entities.js';
import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H, ISO_Y }  from './config.js';
import { findPath }   from './pathfinding.js';
import { velToDir }   from './sprites.js';
import { getZoomLevel } from './render.js';

// Auto-cast scan interval in ticks.
// 9 ticks ≈ 150ms at 60Hz — less "machine-gun", more deliberate spell-like cadence.
const AUTO_CAST_INTERVAL = 9;

// ─────────────────────────────────────────────
// PLAYER AUTO-CAST FSM
// ─────────────────────────────────────────────

/**
 * Updates the player's auto-cast logic.
 * Reads input snapshot from world.input to handle manual overrides.
 *
 * @param {import('../dungeon/player.js').PlayerActor} player
 * @param {Object} world
 */
export function updatePlayerAI(player, world) {
  const input = world.input;

  // --- Compute camera offset + zoom once per AI update ---
  // Input coords are canvas-space (0..VIEWPORT_W/H, unscaled).
  // The canvas is rendered with ctx.scale(zoom), so a canvas-space coord must
  // first be divided by zoom to get pre-zoom world-space, then camX/camY subtracted.
  //   world_x = canvas_x / zoom - camX
  //   world_y = (canvas_y / zoom - camY) / ISO_Y
  const camX = world.camera ? world.camera.x : 0;
  const camY = world.camera ? world.camera.y : 0;
  const zoom = getZoomLevel();

  // --- Manual override: RMB click on enemy ---
  if (input.rightClicks.length > 0) {
    const click = input.rightClicks[0];
    const rx = click.x / zoom - camX;
    const ry = (click.y / zoom - camY) / ISO_Y;
    const enemy = _nearestEnemyAt(rx, ry, world, 32);
    if (enemy) {
      player.forcedTarget = enemy;
      _trySkill(player, 0, enemy, world);
    }
  }

  // --- Manual override: key '1' → fire at nearest enemy ---
  if (input.keysPressed.has('1')) {
    const enemy = _nearestEnemy(player, world);
    if (enemy) {
      _trySkill(player, 0, enemy, world);
    }
  }

  // --- LMB click → set move target (A* path) ---
  if (input.leftClicks.length > 0) {
    const click = input.leftClicks[input.leftClicks.length - 1];
    // Convert canvas-space → world-relative coords.
    // Divide by zoom first (undo ctx.scale), then subtract camera offset.
    // Invert ISO_Y to recover flat world-space Y from visually compressed screen Y.
    const rx = click.x / zoom - camX;
    const ry = (click.y / zoom - camY) / ISO_Y;

    // Check if clicking near the exit portal (portal coords are room-relative)
    if (world.exitPortal) {
      const ep = world.exitPortal;
      const dx = rx - ep.x;
      const dy = ry - ep.y;
      if (Math.sqrt(dx*dx + dy*dy) < ep.radius + 10) {
        // Move toward portal using room-relative coords
        player.moveTarget = { x: ep.x, y: ep.y };
        player.path = findPath(world.tilemap, player.x, player.y, ep.x, ep.y);
        return;
      }
    }
    // Room-relative destination for pathfinding
    player.moveTarget = { x: rx, y: ry };
    player.path = findPath(world.tilemap, player.x, player.y, rx, ry);
    player.forcedTarget = null;
  }

  // --- LMB held → continuously steer toward cursor (Diablo 3 style) ---
  // Uses else-if so we don't double-call A* on the same tick as a leftClick.
  // Throttled to every 3 ticks (~50ms) to avoid excessive pathfinding.
  else if (input.leftButtonDown && world.tick % 3 === 0) {
    const rx = input.mouseX / zoom - camX;
    const ry = (input.mouseY / zoom - camY) / ISO_Y;
    player.moveTarget = { x: rx, y: ry };
    player.path = findPath(world.tilemap, player.x, player.y, rx, ry);
    player.forcedTarget = null;
  }

  // --- Auto-cast scan (every AUTO_CAST_INTERVAL ticks) ---
  if (world.tick % AUTO_CAST_INTERVAL === 0) {
    // Base aggro range scaled by spellRangeMul from passive buffs
    const buffs      = world.actionBuffs;
    const rangeMul   = (buffs && buffs.spellRangeMul) || 1.0;
    const aggroRange = 8 * TILE_SIZE * rangeMul;
    const enemy = _nearestEnemyInRange(player, world, aggroRange);
    if (enemy && player.autoCastEnabled) {
      _trySkill(player, 0, enemy, world);
    }
  }

  // --- Movement along path ---
  _followPath(player, world);
}

/**
 * Attempts to cast skill[skillIdx] at target if cooldown is ready.
 * Central dispatch for the skill system — new spells added here.
 */
function _trySkill(player, skillIdx, target, world) {
  const skill = player.skills && player.skills[skillIdx];
  if (!skill) return;
  if (world.tick - skill.lastUsedTick < skill.cdTicks) return;
  if (!world.tilemap.hasLOS(player.x, player.y, target.x, target.y)) return;

  skill.lastUsedTick = world.tick;
  player._castStartTick = world.tick;
  _faceTarget(player, target);

  // Spell damage bonus from player INT stat (passed in world.playerConfig)
  const dmgBonus = (world.playerConfig && world.playerConfig.spellDamageBonus) || 0;

  if (skill.id === 'fireball') {
    if (Math.random() < 0.05) {
      _spawnVolley(player, target, world, dmgBonus);
    } else {
      _spawnFireball(player, target, world, dmgBonus);
    }
  } else if (skill.id === 'lightning') {
    _spawnLightning(player, target, world, dmgBonus);
  } else if (skill.id === 'waterbolt') {
    _spawnWaterbolt(player, target, world, dmgBonus);
  } else if (skill.id === 'earthspike') {
    _spawnEarthspike(player, target, world, dmgBonus);
  }
}

/** Points player sprite toward target using dominant-axis snap. */
function _faceTarget(player, target) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    player.dirIndex = dx > 0 ? 1 : 3;
  } else {
    player.dirIndex = dy > 0 ? 0 : 2;
  }
}

function _spawnFireball(player, target, world, dmgBonus = 0) {
  const dx  = target.x - player.x;
  const dy  = target.y - player.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const buffs = world.actionBuffs || {};

  // Base constants from SPELLS spec
  const BASE_SPEED  = 22 * TILE_SIZE;
  const BASE_RADIUS = 8;
  const BASE_DMG    = 25;
  const BASE_TTL    = 1.5;

  // Apply passive multipliers
  const speed  = BASE_SPEED  * (buffs.projSpeedMul  || 1.0);
  const radius = BASE_RADIUS * (buffs.projRadiusMul || 1.0);
  const aoe    = buffs.aoeRadius    || 0;
  const pierce = buffs.pierceCount  || 0;

  // Base damage: flat INT bonus (legacy compat) + passive spellDmgMul multiplier
  let dmg = (BASE_DMG + dmgBonus) * (buffs.spellDmgMul || 1.0);

  // Crit roll
  const crit = Math.random() < (buffs.critChance || 0);
  if (crit) {
    dmg *= (buffs.critMul || 1.5);
  }

  dmg = Math.round(dmg);

  world.spawnProjectile({
    x: player.x, y: player.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    radius,
    ttl:          BASE_TTL,
    dmg,
    ownerId:      player.id,
    team:         'player',
    color:        crit ? '#ffdd00' : '#ff6a00', // golden tint on crit
    aoeRadius:    aoe,    // handled in dungeon._updateProjectiles
    pierceCount:  pierce, // handled in dungeon._updateProjectiles
    pierceHits:   pierce, // countdown — decremented on each pierce hit
  });
}

function _spawnVolley(player, target, world, dmgBonus = 0) {
  const dx    = target.x - player.x;
  const dy    = target.y - player.y;
  const len   = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const baseAngle = Math.atan2(dy, dx);
  const count     = 9;
  const spread    = 0.28;
  const speed     = 22 * TILE_SIZE;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i - (count - 1) / 2) * spread;
    world.spawnProjectile({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 6, ttl: 1.2, dmg: 18 + dmgBonus,
      ownerId: player.id, team: 'player', color: '#ff8c00',
    });
  }
}

/** Stormcaller: fast thin bolt, lower dmg but high rate, chain-sparks on hit */
function _spawnLightning(player, target, world, dmgBonus = 0) {
  const dx  = target.x - player.x;
  const dy  = target.y - player.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const speed = 30 * TILE_SIZE;
  world.spawnProjectile({
    x: player.x, y: player.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    radius: 5, ttl: 1.0, dmg: 18 + dmgBonus,
    ownerId: player.id, team: 'player', color: '#88ddff',
  });
}

/** Tidecaster: homing-style slow bolt, bigger radius, decent dmg */
function _spawnWaterbolt(player, target, world, dmgBonus = 0) {
  const dx  = target.x - player.x;
  const dy  = target.y - player.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const speed = 18 * TILE_SIZE;
  world.spawnProjectile({
    x: player.x, y: player.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    radius: 10, ttl: 2.0, dmg: 22 + dmgBonus,
    ownerId: player.id, team: 'player', color: '#44aaff',
  });
}

/** Geomancer: slow heavy boulder, large radius, high dmg */
function _spawnEarthspike(player, target, world, dmgBonus = 0) {
  const dx  = target.x - player.x;
  const dy  = target.y - player.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const speed = 14 * TILE_SIZE;
  world.spawnProjectile({
    x: player.x, y: player.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    radius: 12, ttl: 2.5, dmg: 40 + dmgBonus,
    ownerId: player.id, team: 'player', color: '#88aa44',
  });
}

/**
 * Moves the player along the waypoint path.
 * Removes waypoints as they are reached (within 4px).
 */
function _followPath(player, world) {
  if (!player.path || player.path.length === 0) {
    player.vx = 0;
    player.vy = 0;
    return;
  }

  const wp      = player.path[0];
  const dx      = wp.x - player.x;
  const dy      = wp.y - player.y;
  const dist    = Math.sqrt(dx * dx + dy * dy);
  // Player base speed: 8.5 tiles/sec (slowed from 10 — gives ~200ms extra thinking time).
  // Scaled by moveSpeedMul from passive buffs if available.
  const buffs      = world.actionBuffs || {};
  const speedMul   = buffs.moveSpeedMul || 1.0;
  const SPEED   = 8.5 * TILE_SIZE * speedMul;
  const DT_SEC  = 1 / 60;

  if (dist < 4) {
    // Reached waypoint — advance to next
    player.path.shift();
    if (player.path.length === 0) {
      player.vx = 0;
      player.vy = 0;
    }
    return;
  }

  player.vx = (dx / dist) * SPEED * DT_SEC;
  player.vy = (dy / dist) * SPEED * DT_SEC;
  // dirIndex debounce lives in player.js update() — reads the final vx/vy each tick
}

// ─────────────────────────────────────────────
// ENEMY AI FSM
// ─────────────────────────────────────────────

/**
 * Updates AI for a single enemy actor.
 *
 * @param {import('../dungeon/enemy.js').EnemyActor} enemy
 * @param {Object} world
 */
export function updateEnemyAI(enemy, world) {
  if (!enemy.alive) return;

  const player = world.player;
  if (!player || !player.alive) return;

  const dx   = player.x - enemy.x;
  const dy   = player.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const aggroRange  = enemy.aggroRange  || 8 * TILE_SIZE;
  const attackRange = enemy.attackRange || TILE_SIZE; // 1 tile melee

  switch (enemy.aiState) {
    case 'idle':
      if (dist <= aggroRange) {
        enemy.aiState = 'chase';
      }
      enemy.vx = 0;
      enemy.vy = 0;
      break;

    case 'chase':
      // Once aggroed, enemies pursue across the entire map — no kiting
      if (dist > aggroRange * 6) {
        enemy.aiState = 'idle';
        enemy.vx = 0;
        enemy.vy = 0;
        break;
      }
      if (dist <= attackRange) {
        enemy.aiState = 'attack';
        break;
      }
      // LOS check — direct line if clear, else just steer toward player
      const hasLOS = world.tilemap.hasLOS(enemy.x, enemy.y, player.x, player.y);
      if (hasLOS) {
        // Greedy steering: move straight toward player
        const speed  = (enemy.moveSpeed || 1.8) * TILE_SIZE;
        const DT_SEC = 1 / 60;
        enemy.vx = (dx / dist) * speed * DT_SEC;
        enemy.vy = (dy / dist) * speed * DT_SEC;
      } else {
        // Fallback: use cached A* path (recomputed every 30 ticks = 0.5s)
        if (!enemy._pathTick || world.tick - enemy._pathTick > 30) {
          enemy._path = findPath(world.tilemap, enemy.x, enemy.y, player.x, player.y);
          enemy._pathTick = world.tick;
        }
        _followEnemyPath(enemy, world);
      }
      break;

    case 'attack': {
      enemy.vx = 0;
      enemy.vy = 0;
      if (dist > attackRange) {
        enemy.aiState = 'chase';
        break;
      }
      const attackCD = enemy.attackCooldownTicks || 90;
      // null = never attacked; give a 15-tick windup on first entry only
      if (enemy._lastAttackTick === null) {
        enemy._lastAttackTick = world.tick - attackCD + 15;
      }
      if (world.tick - enemy._lastAttackTick >= attackCD) {
        enemy._lastAttackTick = world.tick;
        player.takeDamage(enemy.damage || 10, world);
        world.events.push({ type: 'damage', x: player.x, y: player.y - 20, amount: enemy.damage || 10, team: 'player' });
      }
      break;
    }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function _nearestEnemy(player, world) {
  let best = null;
  let bestDist = Infinity;
  for (const e of world.entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d  = dx*dx + dy*dy;
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function _nearestEnemyInRange(player, world, range) {
  const r2 = range * range;
  let best = null;
  let bestDist = Infinity;
  for (const e of world.entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d  = dx*dx + dy*dy;
    if (d > r2 || d >= bestDist) continue;
    // Don't target enemies behind walls — auto-cast should only see what the
    // player can see. Prevents firing into walls when an enemy is nearby but
    // on the other side.
    if (!world.tilemap.hasLOS(player.x, player.y, e.x, e.y)) continue;
    bestDist = d; best = e;
  }
  return best;
}

function _nearestEnemyAt(px, py, world, tolerance) {
  const t2 = tolerance * tolerance;
  let best = null;
  let bestDist = Infinity;
  for (const e of world.entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const dx = e.x - px;
    const dy = e.y - py;
    const d  = dx*dx + dy*dy;
    if (d <= t2 && d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function _followEnemyPath(enemy, world) {
  if (!enemy._path || enemy._path.length === 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  }
  const wp    = enemy._path[0];
  const dx    = wp.x - enemy.x;
  const dy    = wp.y - enemy.y;
  const dist  = Math.sqrt(dx*dx + dy*dy);
  if (dist < 4) {
    enemy._path.shift();
    return;
  }
  const speed  = (enemy.moveSpeed || 1.8) * TILE_SIZE;
  const DT_SEC = 1 / 60;
  enemy.vx = (dx / dist) * speed * DT_SEC;
  enemy.vy = (dy / dist) * speed * DT_SEC;
}
