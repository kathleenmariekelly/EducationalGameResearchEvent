// customize.js — kingdom customization, persisted in localStorage.

const KEY = "kingdomDefense.customize";

export const DEFAULTS = {
  kingdomName: "Aetheria",
  pathColor: "#ffd24a",
  crownColor: "#f87171", // the goal / your keep
  banner: "🏰",
  soldier: "🐰", // your defense pet
  enemy: "😾",   // the invaders
};

export const BANNERS = ["🏰", "🛡️", "⚔️", "👑", "🌸", "🦅", "🌟", "🏡"];
// cute soldiers to defend the kingdom
export const SOLDIERS = ["🐰", "🐱", "🐶", "🐹", "🐼", "🦊", "🐥", "🐧"];
// evil invader options
export const ENEMIES = ["😾", "🙈", "👿", "🦨", "🐍", "🦝", "🦠", "💀"];

export function loadCustomize() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCustomize(c) {
  localStorage.setItem(KEY, JSON.stringify(c));
}
