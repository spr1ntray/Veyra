/**
 * engine/pools.js — Generic object pool
 *
 * Pre-allocates a fixed number of slots. Objects are "checked out" by
 * marking alive=true and "returned" by marking alive=false.
 * This avoids GC pressure in the hot update loop.
 *
 * Usage:
 *   const pool = new ObjectPool(256, () => ({ alive: false, x: 0, y: 0 }));
 *   const obj  = pool.spawn();   // grab a free slot
 *   obj.alive  = false;          // "free" it — pool reuses the slot
 */
export class ObjectPool {
  /**
   * @param {number} size — fixed capacity
   * @param {() => Object} factory — creates a blank object for each slot
   */
  constructor(size, factory) {
    this._items = new Array(size);
    for (let i = 0; i < size; i++) {
      this._items[i] = factory();
      this._items[i].alive = false;
    }
    this._size = size;
    // Next-search cursor — avoids O(n) scan from index 0 every spawn
    this._cursor = 0;
  }

  /**
   * Returns a free slot (alive=false) and marks it alive=true.
   * Returns null if pool is exhausted.
   *
   * @returns {Object|null}
   */
  spawn() {
    const n = this._size;
    for (let i = 0; i < n; i++) {
      const idx = (this._cursor + i) % n;
      if (!this._items[idx].alive) {
        this._cursor = (idx + 1) % n;
        this._items[idx].alive = true;
        return this._items[idx];
      }
    }
    // Pool exhausted — caller should increase PROJECTILE_POOL_SIZE
    return null;
  }

  /**
   * Calls fn(item) for every alive item.
   * @param {(item: Object) => void} fn
   */
  forEach(fn) {
    for (let i = 0; i < this._size; i++) {
      if (this._items[i].alive) fn(this._items[i]);
    }
  }

  /**
   * Returns all alive items as a new array.
   * Avoid calling in hot path — allocates.
   */
  getAlive() {
    const out = [];
    for (let i = 0; i < this._size; i++) {
      if (this._items[i].alive) out.push(this._items[i]);
    }
    return out;
  }
}
