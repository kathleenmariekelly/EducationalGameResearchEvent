// The three playable characters and their base stats.
import {
  PLAYER_BASE_SPEED, PLAYER_BASE_HP, PLAYER_BASE_DAMAGE, PLAYER_BASE_FIRE_RATE,
} from "../config.js";

export const CHARACTERS = {
  duck: {
    key: "duck", name: "Debug Duck", blurb: "Balanced all-rounder.",
    speed: PLAYER_BASE_SPEED, hp: PLAYER_BASE_HP,
    damage: PLAYER_BASE_DAMAGE, fireRate: PLAYER_BASE_FIRE_RATE,
  },
  penguin: {
    key: "penguin", name: "Linux Penguin", blurb: "Tanky & tough, a bit slower.",
    speed: PLAYER_BASE_SPEED * 0.85, hp: Math.round(PLAYER_BASE_HP * 1.4),
    damage: PLAYER_BASE_DAMAGE, fireRate: PLAYER_BASE_FIRE_RATE * 1.1,
  },
  robot: {
    key: "robot", name: "Compiler-Bot", blurb: "Fast, rapid fire, lower damage.",
    speed: PLAYER_BASE_SPEED * 1.2, hp: Math.round(PLAYER_BASE_HP * 0.85),
    damage: Math.round(PLAYER_BASE_DAMAGE * 0.8), fireRate: PLAYER_BASE_FIRE_RATE * 0.7,
  },
};

export const CHARACTER_ORDER = ["duck", "penguin", "robot"];
