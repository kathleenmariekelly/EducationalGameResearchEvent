// save.js
//
// Persistent progress for TokenSmith. The save is a plain JSON object:
//
//   {
//     version: 1,
//     completed:       [bool, ...]      // one per level
//     lastPermutation: [ [ruleId,...] | null, ... ]  // last order the player
//                                                      // submitted for a level
//   }
//
// It is auto-saved to localStorage after every submit, and can also be
// exported to / imported from a .json file the player picks in the level
// select menu — so progress can be moved between machines or handed in.
//
// Unlock rule: level 0 is always unlocked; level i unlocks once level i-1 is
// completed. Completed levels can be replayed freely.

import { SCENARIOS } from "./scenarios.js";

const KEY = "tokensmith_save_v1";
const CUSTOM_KEY = "tokensmith_custom_v1";
export const TOTAL_LEVELS = SCENARIOS.length;

// Animation settings. `accel` speeds the priority-scan pulse up over time:
// the pulse rate multiplies by `growth` every `everyMs`, capped at `cap`x.
// With accel off, the pulse runs at a constant `baseMs` per rule tried.
export function defaultSettings() {
  return { accel: true, baseMs: 300, growth: 1.5, everyMs: 8000, cap: 4 };
}

export function defaultState() {
  return {
    version: 1,
    completed: Array(TOTAL_LEVELS).fill(false),
    lastPermutation: Array(TOTAL_LEVELS).fill(null),
    settings: defaultSettings(),
  };
}

function normalize(s) {
  const d = defaultState();
  if (!s || typeof s !== "object") return d;
  const out = defaultState();
  if (Array.isArray(s.completed)) {
    for (let i = 0; i < TOTAL_LEVELS; i++) out.completed[i] = !!s.completed[i];
  }
  if (Array.isArray(s.lastPermutation)) {
    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const p = s.lastPermutation[i];
      out.lastPermutation[i] = Array.isArray(p) ? p.slice() : null;
    }
  }
  if (s.settings && typeof s.settings === "object") {
    out.settings = { ...defaultSettings(), ...s.settings };
  }
  return out;
}

export function loadState() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return defaultState();
  }
}

export function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable; in-memory state still works this session */
  }
}

export function resetState() {
  const d = defaultState();
  saveState(d);
  return d;
}

export function isUnlocked(state, i) {
  if (i <= 0) return true;
  return !!state.completed[i - 1];
}

// A saved permutation is only usable if it's a permutation of exactly this
// level's rule ids — otherwise fall back to the scenario's default order.
export function permutationFor(state, i) {
  const perm = state.lastPermutation[i];
  if (!Array.isArray(perm)) return null;
  const want = new Set(SCENARIOS[i].rules.map((r) => r.id));
  if (perm.length !== want.size) return null;
  for (const id of perm) if (!want.has(id)) return null;
  return perm.slice();
}

export function exportToFile(state) {
  downloadJson(state, "tokensmith_save.json");
}

// Opens a file picker and resolves with the imported (normalized) state.
export function importFromFile() {
  return pickJsonFile((data) => {
    const state = normalize(data);
    saveState(state);
    return state;
  });
}

// ---- Custom levels: a SEPARATE store and file from main progress. ----

export function loadCustomLevels() {
  try {
    const arr = JSON.parse(localStorage.getItem(CUSTOM_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCustomLevels(list) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function exportCustomToFile(list) {
  downloadJson(list, "tokensmith_custom_levels.json");
}

export function importCustomFromFile() {
  return pickJsonFile((data) => {
    const list = Array.isArray(data) ? data : [];
    saveCustomLevels(list);
    return list;
  });
}

// ---- shared file helpers ----

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pickJsonFile(transform) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return reject(new Error("no file"));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(transform(JSON.parse(String(reader.result))));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
