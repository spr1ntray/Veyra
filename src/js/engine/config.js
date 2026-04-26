/**
 * engine/config.js — global engine constants
 *
 * Do NOT change DT — fixed-timestep is critical for determinism.
 * All game-balance numbers live in dungeon/ or state.js, not here.
 */

// Isometric Y-compression used for rendering (shared with ai.js for click inversion)
export const ISO_Y = 0.6;

// Fixed simulation timestep in seconds (60 Hz)
export const DT = 1 / 60;

// Tile size in pixels — 32×32 matches sprite sheet native resolution (1:1, no upscale)
export const TILE_SIZE = 32;

// Viewport dimensions — fixed; CSS scale adapts to window size
export const VIEWPORT_W = 1280;
export const VIEWPORT_H = 720;

// Max frame delta clamped to prevent "spiral of death" on tab-switch
export const MAX_FRAME_DELTA = 0.25; // seconds

// Object pool capacities
export const PROJECTILE_POOL_SIZE = 256;
export const PARTICLE_POOL_SIZE   = 512;

// Spatial hash cell size (px) — ~2 tiles; balances bucket count vs bucket size
export const SPATIAL_CELL = 32;

// Debug flag — toggled by pressing F3 in-game
export let DEBUG_OVERLAY = false;
export function toggleDebug() { DEBUG_OVERLAY = !DEBUG_OVERLAY; }
