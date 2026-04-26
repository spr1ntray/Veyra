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

/**
 * Returns the primary skill definition for a given class.
 * Fireball base CD: 84 ticks (1.4 s) — slowed from 72 ticks (1.2 s) for better pacing.
 * spellCdMul from passive buffs is applied after construction in dungeon.js.
 */
function _classSkill(classType) {
  switch (classType) {
    case 'stormcaller': return { id: 'lightning', name: 'Lightning Bolt', icon: 'lightning', cdTicks: Math.round(0.7 * 60), lastUsedTick: 0 };
    case 'tidecaster':  return { id: 'waterbolt', name: 'Water Bolt',     icon: 'water',     cdTicks: Math.round(1.0 * 60), lastUsedTick: 0 };
    case 'geomancer':   return { id: 'earthspike',name: 'Earth Spike',    icon: 'earth',     cdTicks: Math.round(1.8 * 60), lastUsedTick: 0 };
    default:            return { id: 'fireball',  name: 'Fireball',       icon: 'fire',      cdTicks: Math.round(1.4 * 60), lastUsedTick: 0 };
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

    // HP regeneration from passive buffs (hpRegenPerSec).
    // Applied every tick at 1/60 s resolution, clamped to hpMax.
    if (this.state !== ActorState.DEAD && this.alive) {
      const buffs = world.actionBuffs;
      if (buffs && buffs.hpRegenPerSec > 0) {
        this.hp = Math.min(this.hpMax, this.hp + buffs.hpRegenPerSec / 60);
      }
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
   * Override: on any damage, apply passive defensive buffs then trigger camera shake.
   *
   * Order of operations:
   *  1. Dodge roll — if success, skip all damage (full miss).
   *  2. dmgTakenMul — reduce/amplify incoming amount (armour / Glassblower trade-off).
   *  3. Camera shake proportional to final damage taken.
   *
   * @param {number} amount — incoming raw damage
   * @param {Object} world
   * @returns {boolean} whether the hit killed the player
   */
  takeDamage(amount, world) {
    const buffs = world && world.actionBuffs;

    // Dodge: full miss — no damage, tiny visual hint
    if (buffs && buffs.dodgeChance > 0 && Math.random() < buffs.dodgeChance) {
      // Spawn a "DODGE" damage number in grey as visual feedback
      if (world && typeof world._spawnDamageNumber === 'function') {
        world._spawnDamageNumber(this.x, this.y - 40, 'DODGE', '#aaaaaa');
      }
      return false;
    }

    // dmgTakenMul: < 1.0 = damage reduction, > 1.0 = fragile trade-off
    let finalAmount = amount;
    if (buffs && buffs.dmgTakenMul != null) {
      finalAmount = Math.round(amount * buffs.dmgTakenMul);
    }

    const died = super.takeDamage(finalAmount, world);
    if (world && typeof world.triggerShake === 'function') {
      const mag = Math.min(14, 4 + Math.sqrt(finalAmount) * 1.2);
      world.triggerShake(mag, died ? 24 : 12);
    }
    return died;
  }
}
