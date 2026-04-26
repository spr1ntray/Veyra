/**
 * dungeon/player.js — Player actor
 *
 * Extends Actor with auto-cast state, skill cooldowns, and movement path.
 * All per-tick logic is called from world.update() via ai.updatePlayerAI().
 */

import { Actor, ActorState } from '../engine/entities.js';

// AABB half-size for collision resolution (24×24px box, half=12).
// Kept separate from Actor.radius so combat hit-detection range stays independent.
const PLAYER_COLLISION_HALF = 12;

/** Returns the primary skill definition for a given class. */
function _classSkill(classType) {
  switch (classType) {
    case 'stormcaller': return { id: 'lightning', name: 'Lightning Bolt', icon: 'lightning', cdTicks: Math.round(0.7 * 60), lastUsedTick: 0 };
    case 'tidecaster':  return { id: 'waterbolt', name: 'Water Bolt',     icon: 'water',     cdTicks: Math.round(1.0 * 60), lastUsedTick: 0 };
    case 'geomancer':   return { id: 'earthspike',name: 'Earth Spike',    icon: 'earth',     cdTicks: Math.round(1.8 * 60), lastUsedTick: 0 };
    default:            return { id: 'fireball',  name: 'Fireball',       icon: 'fire',      cdTicks: Math.round(1.2 * 60), lastUsedTick: 0 };
  }
}

export class PlayerActor extends Actor {
  /**
   * @param {{ x: number, y: number }} opts
   */
  constructor({ x, y, classType = 'pyromancer' }) {
    // radius=12 is used for combat hit-detection (projectile impact checks).
    // Movement collision uses PLAYER_COLLISION_HALF (also 12) via AABB resolveMove.
    super({ x, y, radius: 12, hp: 100, team: 'player' });

    this.classType = classType;

    // Click-to-move state
    this.moveTarget   = null; // {x, y} destination
    this.path         = [];   // waypoints from A*

    // Auto-cast state
    this.autoCastEnabled = true;
    this.forcedTarget    = null;

    // Cast animation timing
    this._castStartTick     = 0;
    this._castDurationTicks = Math.round(0.4 * 60);

    // Skill slots — per class. ai.js reads this array; hud.js renders hotbar.
    this.skills = [_classSkill(classType)];

    // Run-loot accumulator
    this.goldCollected = 0;
  }

  update(dt, world) {
    if (this.state !== ActorState.DEAD) {
      // Use AABB half-size for movement (not combat radius) — see PLAYER_COLLISION_HALF
      world.tilemap.resolveMove(this, { x: this.vx, y: this.vy }, PLAYER_COLLISION_HALF);
    }

    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      this.transitionTo(ActorState.DEAD, world);
      this.onDestroy(world);
    }

    if (this.state === ActorState.DEAD) {
      this.setAnimState('death', world);
      return;
    }

    // Direction: pick from moveTarget (stable across the whole click→arrive
    // movement) so N/S/E/W are all reachable and never oscillate. velToDir
    // operates on per-tick vx/vy which flip sign on zigzag A* segments.
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      // dead zone: ~0.4 × TILE_SIZE(32) = 13px — suppress facing flip when nearly at target
      if (ax > 13 || ay > 13) {
        if (ax >= ay) this.dirIndex = dx > 0 ? 1 : 3; // E / W
        else          this.dirIndex = dy > 0 ? 0 : 2; // S / N
      }
    }

    if (this._castStartTick && world.tick - this._castStartTick < this._castDurationTicks) {
      this.setAnimState('cast', world);
      return;
    }

    const speed = this.vx * this.vx + this.vy * this.vy;
    if (speed > 0.001) {
      this.setAnimState('walk', world);
    } else {
      this.setAnimState('idle', world);
    }
  }

  onDestroy(world) {
    world.events.push({ type: 'player_died' });
  }

  /**
   * Override: on any damage, trigger a brief camera shake for feedback.
   * Shake scales with damage amount (10 dmg → 6px, 50 dmg → 12px peak).
   */
  takeDamage(amount, world) {
    const died = super.takeDamage(amount, world);
    if (world && typeof world.triggerShake === 'function') {
      const mag = Math.min(14, 4 + Math.sqrt(amount) * 1.2);
      world.triggerShake(mag, died ? 24 : 12);
    }
    return died;
  }
}
