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
    radius: 8,
    kind:   'gold',
    amount,
  };
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
