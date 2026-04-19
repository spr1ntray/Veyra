/**
 * engine/entities.js — Entity and Actor base classes
 *
 * Entity hierarchy:
 *   Entity (base: position, velocity, radius, alive)
 *     Actor extends Entity (HP, team, FSM state)
 *       Player extends Actor
 *       Enemy  extends Actor
 *
 * All concrete behaviour lives in dungeon/ files.
 * Engine only defines the data shape + minimal FSM helpers.
 */

// Auto-incrementing entity ID
let _nextId = 1;

/**
 * Base entity — anything that exists in the world.
 */
export class Entity {
  constructor({ x, y, radius }) {
    this.id     = _nextId++;
    this.x      = x;
    this.y      = y;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = radius;
    this.alive  = true;
    // Sort depth for rendering (updated each frame from y position)
    this.z      = 0;
  }

  /** Override in subclasses for per-tick logic. */
  update(/*dt, world*/) {}

  /** Called once when alive transitions to false. */
  onDestroy(/*world*/) {}
}

// Valid FSM states for Actors
export const ActorState = Object.freeze({
  IDLE:    'idle',
  MOVING:  'moving',
  CASTING: 'casting',
  HURT:    'hurt',
  DEAD:    'dead',
});

/**
 * Actor — entity with HP, a team affiliation, and a simple FSM.
 */
export class Actor extends Entity {
  constructor({ x, y, radius, hp, team }) {
    super({ x, y, radius });
    this.hp         = hp;
    this.hpMax      = hp;
    this.team       = team;  // 'player' | 'enemy'
    this.state      = ActorState.IDLE;
    this.stateEnterTick = 0;

    // ── Animation state ──────────────────────────────────────────────
    // animState drives which sprite sheet row/animation is used.
    // Valid values: 'idle' | 'walk' | 'cast' | 'attack' | 'death'
    this.animState = 'idle';

    // dirIndex: 0=S, 1=E, 2=N, 3=W — derived each tick from velocity.
    // Persisted so it doesn't snap to S when entity stops moving.
    this.dirIndex  = 0; // default facing South

    // animEnterTick: world.tick when animState last changed.
    // Used by computeAnimFrame() to count elapsed ticks from state start.
    this.animEnterTick = 0;
  }

  /**
   * Transition to a new FSM state.
   * Records the tick so durations can be computed tick-accurately.
   * Also resets animEnterTick so animation restarts from frame 0.
   *
   * @param {string} newState — one of ActorState
   * @param {Object} world    — world context (provides world.tick)
   */
  transitionTo(newState, world) {
    if (this.state === newState) return;
    this.state          = newState;
    this.stateEnterTick = world ? world.tick : 0;
    this.animEnterTick  = this.stateEnterTick;
  }

  /**
   * Transitions the animation state independently of the FSM state.
   * Useful when animState needs finer control (e.g. 'cast' during MOVING).
   *
   * @param {string} newAnimState — 'idle'|'walk'|'cast'|'attack'|'death'
   * @param {Object} world
   */
  setAnimState(newAnimState, world) {
    if (this.animState === newAnimState) return;
    this.animState     = newAnimState;
    this.animEnterTick = world ? world.tick : 0;
  }

  /**
   * Apply damage to this actor.
   * Returns true if the actor died from this hit.
   *
   * @param {number} amount
   * @param {Object} world
   * @returns {boolean} died
   */
  takeDamage(amount, world) {
    if (this.state === ActorState.DEAD) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.transitionTo(ActorState.DEAD, world);
      this.onDestroy(world);
      return true;
    }
    return false;
  }
}

/**
 * Resets the entity ID counter — call between test runs only.
 */
export function resetEntityIds() {
  _nextId = 1;
}
