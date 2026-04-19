/**
 * dungeon/player.js — Player actor
 *
 * Extends Actor with auto-cast state, skill cooldowns, and movement path.
 * All per-tick logic is called from world.update() via ai.updatePlayerAI().
 */

import { Actor, ActorState } from '../engine/entities.js';
import { velToDir } from '../engine/sprites.js';

export class PlayerActor extends Actor {
  /**
   * @param {{ x: number, y: number }} opts
   */
  constructor({ x, y }) {
    super({ x, y, radius: 20, hp: 100, team: 'player' });

    // Click-to-move state
    this.moveTarget   = null; // {x, y} destination
    this.path         = [];   // waypoints from A*

    // Auto-cast state
    this.autoCastEnabled  = true;
    this.forcedTarget     = null; // enemy targeted by RMB
    this.fireballLastTick = 0;    // tick when fireball was last fired

    // Cast animation timing
    // ai.js sets these when a fireball is fired so update() can lock cast anim
    this._castStartTick    = 0;
    this._castDurationTicks = Math.round(0.4 * 60); // 0.4s cast visual lock (4 frames at 80ms)

    // Run-loot accumulator
    this.goldCollected = 0;
  }

  update(dt, world) {
    // Movement is handled by ai.updatePlayerAI → _followPath
    // Apply velocity (set by ai.js)
    if (this.state !== ActorState.DEAD) {
      world.tilemap.resolveMove(this, { x: this.vx, y: this.vy }, this.radius);
    }

    // Death transition — fallback for any hp drain that bypasses takeDamage()
    // (e.g. future DoT, environmental damage written directly to this.hp).
    // takeDamage() is the primary path and already calls onDestroy() itself;
    // this guard ensures player_died is always emitted even in edge cases.
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      this.transitionTo(ActorState.DEAD, world);
      this.onDestroy(world); // BUG-022: emit player_died via unified death path
    }

    // ── Animation state machine ───────────────────────────────────────
    // Priority: death > cast (timed) > walk > idle
    if (this.state === ActorState.DEAD) {
      this.setAnimState('death', world);
      return;
    }

    // Update direction from velocity when moving
    const newDir = velToDir(this.vx, this.vy, this.dirIndex);
    this.dirIndex = newDir;

    // Cast anim: locked for castDuration ticks from castStartTick
    if (this._castStartTick && world.tick - this._castStartTick < this._castDurationTicks) {
      this.setAnimState('cast', world);
      return;
    }

    // Walk vs idle by velocity magnitude
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
}
