// Persistent player progress via localStorage.
//
// Stores: XP, completed levels (with best stars), and the chosen
// character skin. XP drives the player's "account level" which is
// separate from the puzzle levels — you gain XP gradually and level up
// when your XP crosses a threshold.

const KEY = "codequest_save_v1";

const DEFAULT = {
  xp: 0,
  completed: {},   // { levelIndex: bestStars }
  skin: "steve",   // chosen character skin id
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, completed: {} };
    const data = JSON.parse(raw);
    return {
      xp: data.xp || 0,
      completed: data.completed || {},
      skin: data.skin || "steve",
    };
  } catch {
    return { ...DEFAULT, completed: {} };
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage might be disabled; game still works for the session.
  }
}

// ---- XP / account level math ----
// Each account level needs a bit more XP than the last (gentle curve).
// Level N requires N * 100 XP to advance to N+1. Cumulative thresholds:
// L1: 0, L2: 100, L3: 300, L4: 600, L5: 1000, ...
export function xpForLevel(level) {
  // total XP needed to REACH this level (level 1 starts at 0)
  let total = 0;
  for (let n = 1; n < level; n++) total += n * 100;
  return total;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

// Returns progress within the current level as {level, into, needed, pct}.
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const needed = next - base;
  return { level, into, needed, pct: Math.round((into / needed) * 100) };
}

// ---- character skins ----
// `mob` tells the renderer which special face/features to draw.
// Steve and Alex are the classic players; the rest are Minecraft mobs.
export const SKINS = {
  steve:    { name: "Steve",    body: "#00acc1", face: "#c68642", mob: "player" },
  alex:     { name: "Alex",     body: "#7cb342", face: "#e8b98a", mob: "player" },
  creeper:  { name: "Creeper",  body: "#4caf50", face: "#5bc85f", mob: "creeper" },
  zombie:   { name: "Zombie",   body: "#00838f", face: "#4a7f43", mob: "zombie" },
  skeleton: { name: "Skeleton", body: "#e0e0e0", face: "#eeeeee", mob: "skeleton" },
  enderman: { name: "Enderman", body: "#1a1a1f", face: "#0d0d10", mob: "enderman" },
};
