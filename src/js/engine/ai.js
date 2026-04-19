/**
 * engine/ai.js — Enemy AI primitives + player auto-cast FSM
 *
 * AI runs inside world.update() using world.tick — no performance.now().
 * The auto-cast logic scans for the nearest enemy every 6 ticks (~100ms at 60Hz)
 * and fires a skill if its cooldown is ready.
 */

import { ActorState } from './entities.js';
import { TILE_SIZE }  from './config.js';
import { findPath }   from './pathfinding.js';

// Auto-cast scan interval in ticks (6 ticks ≈ 100ms at 60Hz)
const AUTO_CAST_INTERVAL = 6;

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

  // --- Manual override: RMB click on enemy ---
  if (input.rightClicks.length > 0) {
    const click = input.rightClicks[0];
    const enemy = _nearestEnemyAt(click.x, click.y, world, 32);
    if (enemy) {
      player.forcedTarget = enemy;
      _tryFireball(player, enemy, world);
    }
  }

  // --- Manual override: key '1' → fire at nearest enemy ---
  if (input.keysPressed.has('1')) {
    const enemy = _nearestEnemy(player, world);
    if (enemy) {
      _tryFireball(player, enemy, world);
    }
  }

  // --- LMB click → set move target (A* path) ---
  if (input.leftClicks.length > 0) {
    const click = input.leftClicks[input.leftClicks.length - 1];
    // Check if clicking on exit portal
    if (world.exitPortal) {
      const ep = world.exitPortal;
      const dx = click.x - ep.x;
      const dy = click.y - ep.y;
      if (Math.sqrt(dx*dx + dy*dy) < ep.radius + 10) {
        // Move toward portal
        player.moveTarget = { x: ep.x, y: ep.y };
        player.path = findPath(world.tilemap, player.x, player.y, ep.x, ep.y);
        return;
      }
    }
    player.moveTarget = { x: click.x, y: click.y };
    player.path = findPath(world.tilemap, player.x, player.y, click.x, click.y);
    player.forcedTarget = null;
  }

  // --- Auto-cast scan (every AUTO_CAST_INTERVAL ticks) ---
  if (world.tick % AUTO_CAST_INTERVAL === 0) {
    const aggroRange = 8 * TILE_SIZE;
    const enemy = _nearestEnemyInRange(player, world, aggroRange);
    if (enemy && player.autoCastEnabled) {
      _tryFireball(player, enemy, world);
    }
  }

  // --- Movement along path ---
  _followPath(player, world);
}

/**
 * Attempts to fire a Fireball at target if cooldown is ready.
 * Spawns the projectile via world.spawnProjectile().
 */
function _tryFireball(player, target, world) {
  const CD_TICKS = Math.round(1.2 * 60); // 1.2s cooldown at 60Hz
  const lastFire = player.fireballLastTick || 0;
  if (world.tick - lastFire < CD_TICKS) return; // on cooldown

  player.fireballLastTick = world.tick;
  // Lock cast animation for a short window
  player._castStartTick = world.tick;

  // Direction toward target
  const dx = target.x - player.x;
  const dy = target.y - player.y;

  // Point player toward the target when casting
  if (Math.abs(dx) >= Math.abs(dy)) {
    player.dirIndex = dx > 0 ? 1 : 3; // E or W
  } else {
    player.dirIndex = dy > 0 ? 0 : 2; // S or N
  }
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const speed  = 8 * TILE_SIZE; // 8 tiles/sec × 32 px/tile = 256 px/s
  const vx     = (dx / len) * speed;
  const vy     = (dy / len) * speed;

  world.spawnProjectile({
    x:        player.x,
    y:        player.y,
    vx,
    vy,
    radius:   8,
    ttl:      2.0,      // seconds lifetime (converted to ticks inside spawnProjectile)
    dmg:      25,
    ownerId:  player.id,
    team:     'player',
    color:    '#ff6a00', // orange fireball
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
  const SPEED   = 3.5 * TILE_SIZE; // tiles/sec × px/tile = px/sec
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
      if (dist > aggroRange * 1.5) {
        enemy.aiState = 'idle';
        enemy.vx = 0;
        enemy.vy = 0;
        break;
      }
      if (dist <= attackRange) {
        enemy.aiState = 'attack';
        // BUG-023: stamp current tick so the first melee hit waits a full
        // attackCooldown instead of firing instantly (world.tick - 0 >= CD).
        enemy._lastAttackTick = world.tick;
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

    case 'attack':
      enemy.vx = 0;
      enemy.vy = 0;
      if (dist > attackRange) {
        enemy.aiState = 'chase';
        break;
      }
      // Melee attack: cooldown 1.5s = 90 ticks
      const attackCD = enemy.attackCooldownTicks || 90;
      if (!enemy._lastAttackTick) enemy._lastAttackTick = 0;
      if (world.tick - enemy._lastAttackTick >= attackCD) {
        enemy._lastAttackTick = world.tick;
        player.takeDamage(enemy.damage || 10, world);
        // Notify world for damage number display
        world.events.push({ type: 'damage', x: player.x, y: player.y - 20, amount: enemy.damage || 10, team: 'player' });
      }
      break;
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
    if (d <= r2 && d < bestDist) { bestDist = d; best = e; }
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
