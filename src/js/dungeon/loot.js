/**
 * dungeon/loot.js — Gold pickup entities
 *
 * Gold piles appear when enemies die or are pre-placed in the room.
 * Player walks over them to collect (within pickup radius).
 */

/**
 * Creates a gold pickup object.
 * Not a full Entity subclass — kept plain for simplicity and pool-friendliness.
 *
 * @param {{ x: number, y: number, amount: number }} opts
 * @returns {Object}
 */
export function createGoldPickup({ x, y, amount }) {
  return {
    alive:  true,
    x,
    y,
    vx:     0,  // velocity for magnet attraction
    vy:     0,
    radius: 8,
    kind:   'gold',
    amount,
  };
}

/**
 * Moves gold pickups within MAGNET_RANGE toward the player.
 * Call once per tick from world.update().
 */
export function updateGoldMagnet(player, pickups, TILE_SIZE) {
  const MAGNET_RANGE = 5 * TILE_SIZE;  // pixels
  const MAGNET_SPEED = 14 * TILE_SIZE; // px/s
  const DT           = 1 / 60;

  if (!player || !player.alive) return;

  for (const p of pickups) {
    if (!p.alive) continue;
    const dx   = player.x - p.x;
    const dy   = player.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.5 && dist < MAGNET_RANGE) {
      // Accelerate toward player, speed grows as they get closer
      const speedMult = 1 + (1 - dist / MAGNET_RANGE) * 2;
      p.x += (dx / dist) * MAGNET_SPEED * speedMult * DT;
      p.y += (dy / dist) * MAGNET_SPEED * speedMult * DT;
    }
  }
}

/**
 * Checks all pickups against the player and collects any in range.
 * Collected pickups have alive set to false.
 *
 * @param {Object} player
 * @param {Object[]} pickups
 * @param {Object} world — for event emission
 */
export function collectPickups(player, pickups, world) {
  for (const p of pickups) {
    if (!p.alive) continue;
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < player.radius + p.radius + 4) {
      p.alive = false;
      player.goldCollected += p.amount;
      world.events.push({ type: 'gold_collected', amount: p.amount });
    }
  }
}
