/**
 * dungeon/extraction.js — Exit portal entity + proximity trigger
 *
 * The portal is a plain object positioned in the room.
 * When the player approaches within 1 tile, world.events receives
 * 'portal_reached' — the dungeon manager then triggers the popup.
 */

import { TILE_SIZE } from '../engine/config.js';

/** Proximity threshold to trigger extraction popup (pixels). */
const TRIGGER_RANGE = TILE_SIZE * 1.2; // ~1 tile

/**
 * Creates an exit portal object.
 *
 * @param {{ x: number, y: number }} opts — pixel position (tile center)
 * @returns {Object}
 */
export function createExitPortal({ x, y }) {
  return {
    x,
    y,
    radius: 24,
    triggered: false, // prevent repeated triggers
  };
}

/**
 * Checks if the player is close enough to trigger the extraction popup.
 * Emits 'portal_reached' event exactly once.
 *
 * @param {Object} player
 * @param {Object} portal
 * @param {Object} world
 */
export function checkExtractionTrigger(player, portal, world) {
  if (!portal || portal.triggered) return;
  if (!player.alive) return;

  const dx = player.x - portal.x;
  const dy = player.y - portal.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < player.radius + portal.radius + TRIGGER_RANGE) {
    portal.triggered = true;
    world.events.push({ type: 'portal_reached' });
  }
}
