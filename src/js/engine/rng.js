/**
 * engine/rng.js — Seeded pseudo-random number generator
 *
 * Uses mulberry32 — a fast, high-quality 32-bit generator.
 * ALL random decisions in engine + dungeon code MUST use world.rng(),
 * never Math.random(). This guarantees reproducible simulation.
 *
 * Ref: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */

/**
 * Creates a mulberry32 PRNG bound to the given seed.
 * Returns a function that yields a float in [0, 1).
 *
 * @param {number} seed — uint32 seed value
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let s = seed >>> 0; // coerce to uint32
  return function rng() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple integer hash — combines two values into a uint32.
 * Used to derive per-run seeds from runId + tick.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} uint32
 */
export function hashTwo(a, b) {
  let h = (a ^ (b << 16)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
