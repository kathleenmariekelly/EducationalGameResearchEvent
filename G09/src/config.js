// Global constants for OS Quest: Survivor (Phaser port).
// Speeds are in pixels/second (Phaser uses per-second velocities).

export const SCREEN_W = 960;
export const SCREEN_H = 600;

export const WORLD_W = 1920;
export const WORLD_H = 1200;

export const FLOOR_Y = 600;                 // top edge of the floor band
export const PLAY_FLOOR_TOP = FLOOR_Y + 24; // combat confinement (top)
export const PLAY_FLOOR_BOT = WORLD_H - 40; // combat confinement (bottom)

// Quiz "room" in the sky.
export const QUIZ_PAD_Y = FLOOR_Y - 250;
export const QUIZ_ROOM_TOP = QUIZ_PAD_Y - 120;
export const QUIZ_ROOM_BOT = FLOOR_Y;

// Colors (hex ints for Phaser, plus css strings for text).
export const COL = {
  black: 0x0c0e16,
  white: 0xecf0f5,
  dim: 0x94a3b8,
  skyTop: 0x0f172a,
  skyBot: 0x1e1b4b,
  floorTop: 0x334155,
  floorBot: 0x1e293b,
  primary: 0x6366f1,
  primaryDk: 0x4f46e5,
  green: 0x22c55e,
  red: 0xef4444,
  yellow: 0xfacc15,
  cyan: 0x22d3ee,
  orange: 0xf97316,
  purple: 0xa855f7,
};

export const CSS = {
  white: "#ecf0f5",
  dim: "#94a3b8",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#facc15",
  cyan: "#22d3ee",
  primary: "#6366f1",
};

// Player defaults (px/s where relevant).
export const PLAYER_BASE_SPEED = 216;      // 3.6 px/frame * 60
export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_DAMAGE = 10;
export const PLAYER_BASE_FIRE_RATE = 0.55; // seconds between attacks
export const PLAYER_BASE_RANGE = 320;
export const PLAYER_ATTACK_SPEED = 480;    // 8 px/frame * 60

// Enemy tuning.
export const ENEMY_BASE_HP = 20;
export const ENEMY_BASE_SPEED = 78;        // 1.3 px/frame * 60
export const ENEMY_TOUCH_DAMAGE = 8;       // per second while touching

// Stage / wave structure.
export const NUM_STAGES = 5;
export const WAVES_PER_STAGE = 3;
export const CODE_FROM_STAGE = 3;
