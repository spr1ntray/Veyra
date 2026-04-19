/**
 * dungeon/enemy.js — Enemy actor
 *
 * Extends Actor with AI-state machine, movement speed, and loot config.
 * AI logic lives in engine/ai.js — this file only holds the data shape.
 */

import { Actor, ActorState } from '../engine/entities.js';
import { velToDir } from '../engine/sprites.js';

export class EnemyActor extends Actor {
  /**
   * @param {Object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.radius
   * @param {number} opts.hp
   * @param {number} opts.damage        — melee hit damage
   * @param {number} opts.moveSpeed     — tiles per second
   * @param {number} opts.aggroRange    — pixels
   * @param {number} opts.attackRange   — pixels
   * @param {string} opts.color         — CSS color for placeholder circle
   * @param {number} opts.goldDrop      — gold granted on kill
   * @param {number} opts.xpDrop        — xp granted on kill
   */
  constructor(opts) {
    super({ x: opts.x, y: opts.y, radius: opts.radius || 16, hp: opts.hp || 30, team: 'enemy' });

    this.damage      = opts.damage     || 10;
    this.moveSpeed   = opts.moveSpeed  || 1.8;  // tiles/sec
    this.aggroRange  = opts.aggroRange || (8 * 32);  // pixels
    this.attackRange = opts.attackRange || 36;         // pixels (~1 tile + radius)
    this.color       = opts.color      || '#44cc44';
    this.goldDrop    = opts.goldDrop   || 5;
    this.xpDrop      = opts.xpDrop    || 10;

    // AI FSM state — read/written by engine/ai.js
    this.aiState = 'idle';

    // Internal AI timers (in ticks) — set by ai.js
    this._lastAttackTick = 0;
    this._pathTick       = 0;
    this._path           = [];

    // Death tick — used for brief death flash in render.js
    this._deathTick = 0;
  }

  update(dt, world) {
    if (this.state !== ActorState.DEAD) {
      world.tilemap.resolveMove(this, { x: this.vx, y: this.vy }, this.radius);
    }

    // ── Animation state machine ───────────────────────────────────────
    if (!this.alive || this.state === ActorState.DEAD) {
      this.setAnimState('death', world);
      return;
    }

    // Update direction from velocity when moving
    const newDir = velToDir(this.vx, this.vy, this.dirIndex);
    this.dirIndex = newDir;

    // Map AI state → animation state
    switch (this.aiState) {
      case 'attack':
        this.setAnimState('attack', world);
        break;
      case 'chase': {
        const speed = this.vx * this.vx + this.vy * this.vy;
        if (speed > 0.001) {
          this.setAnimState('walk', world);
        } else {
          this.setAnimState('idle', world);
        }
        break;
      }
      default:
        this.setAnimState('idle', world);
    }
  }

  onDestroy(world) {
    this._deathTick = world.tick;
    world.events.push({
      type:      'enemy_died',
      x:         this.x,
      y:         this.y,
      goldDrop:  this.goldDrop,
      xpDrop:    this.xpDrop,
    });
  }
}
