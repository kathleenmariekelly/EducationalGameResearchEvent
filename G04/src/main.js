import { TIERS } from "./levels.js";
import { compile } from "./interpreter.js";
import * as P from "./progress.js";
import { sfx, toggleMute, isMuted } from "./sound.js";

// ---------- persistent state ----------
let state = P.load();   // { xp, completed:{i:stars}, skin }

const RANKS = ["Beginner", "Novice", "Apprentice", "Coder", "Hacker",
               "Engineer", "Wizard", "Architect", "Legend"];

// ---------- transient game state ----------
let current = 0;          // index into TIERS
let variantIdx = 0;       // which variant of the current tier is active
let animating = false;
let sessionXpGain = 0;     // XP earned this run (shown on game screen)
let collected = new Set(); // gem indices collected this run

// ---------- DOM: screens ----------
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const winScreen = document.getElementById("win-screen");
const editorScreen = document.getElementById("editor-screen");
const winStats = document.getElementById("win-stats");

// ---------- DOM: game ----------
const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");
const codeEl = document.getElementById("code");
const statusEl = document.getElementById("status");
const levelTitleEl = document.getElementById("level-title");
const levelGoalEl = document.getElementById("level-goal");
const levelBadge = document.getElementById("level-badge");
const acctBadge = document.getElementById("acct-badge");
const scoreBadge = document.getElementById("score-badge");
const hintBox = document.getElementById("hint-box");
const hintToggle = document.getElementById("hint-toggle");
const runBtn = document.getElementById("run-btn");
const resetBtn = document.getElementById("reset-btn");
const nextBtn = document.getElementById("next-btn");
const commandsRef = document.getElementById("commands-ref");
const conceptPanel = document.getElementById("concept-panel");
const conceptTitleText = document.getElementById("concept-title-text");
const conceptCollapse = document.getElementById("concept-collapse");
const conceptBody = document.getElementById("concept-body");
const failChoices = document.getElementById("fail-choices");
const retryBtn = document.getElementById("retry-btn");
const reshuffleBtn = document.getElementById("reshuffle-btn");

// ---------- DOM: home ----------
const avatarCanvas = document.getElementById("avatar");
const homeLevel = document.getElementById("home-level");
const homeTitle = document.getElementById("home-title");
const homeXpbar = document.getElementById("home-xpbar");
const homeXptext = document.getElementById("home-xptext");
const skinPicker = document.getElementById("skin-picker");
const levelSelect = document.getElementById("level-select");

let player = null;

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// When set, we're playing a player-built level instead of a built-in tier.
let customLevel = null; // { name, concept, xp, variants:[oneLevel] } or null

// The active tier and the active variant (puzzle) within it.
function tier() { return customLevel || TIERS[current]; }
function level() { return tier().variants[customLevel ? 0 : variantIdx]; }
function skin() { return P.SKINS[state.skin] || P.SKINS.steve; }

// Pick a random variant index for a tier (0 for single-variant tiers).
function randomVariant(t) {
  const n = TIERS[t].variants.length;
  return Math.floor(Math.random() * n);
}

// Combine walls + water + caves into one blocked-tile list (they all stop Steve).
function allBlocked(lv) {
  return [ ...(lv.walls || []), ...(lv.water || []), ...(lv.caves || []) ];
}

// Ensure a level has at least one diamond, placed on a tile that lies on a
// valid path from start to goal so the level stays solvable. Returns a NEW
// gems array (does not mutate the level definition).
function ensureGems(lv) {
  if ((lv.gems || []).length > 0) return lv.gems;
  const path = shortestPath(lv);
  if (!path || path.length < 3) {
    // Fallback: put it on the start tile (always reachable).
    return [ { x: lv.start.x, y: lv.start.y } ];
  }
  // Pick a tile partway along the path (not start, not goal).
  const mid = path[Math.floor(path.length / 2)];
  return [ { x: mid.x, y: mid.y } ];
}

// BFS shortest path of tiles from start to goal (ignores gems/facing).
function shortestPath(lv) {
  const B = allBlocked(lv);
  const wall = (x, y) => x < 0 || y < 0 || x >= lv.cols || y >= lv.rows ||
                         B.some((w) => w.x === x && w.y === y);
  const key = (x, y) => x + "," + y;
  const start = { x: lv.start.x, y: lv.start.y };
  const goal = { x: lv.goalTile.x, y: lv.goalTile.y };
  const prev = new Map();
  const seen = new Set([key(start.x, start.y)]);
  const q = [start];
  while (q.length) {
    const c = q.shift();
    if (c.x === goal.x && c.y === goal.y) {
      const path = []; let cur = c;
      while (cur) { path.unshift(cur); cur = prev.get(key(cur.x, cur.y)); }
      return path;
    }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = c.x + dx, ny = c.y + dy;
      if (wall(nx, ny) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), c);
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

// ============================================================
//  SCREEN SWITCHING
// ============================================================
function showHome() {
  gameScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  editorScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  customLevel = null;
  renderHome();
}
function showGame(isCustom = false) {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  winScreen.classList.add("hidden");
  editorScreen.classList.add("hidden");
  if (!isCustom) customLevel = null;
}
function showWin() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  editorScreen.classList.add("hidden");
  winScreen.classList.remove("hidden");
  // summarize stars earned
  let totalStars = 0, done = 0;
  TIERS.forEach((_, i) => { if (state.completed[i] !== undefined) { totalStars += state.completed[i]; done++; } });
  winStats.textContent = `You completed ${done}/${TIERS.length} levels and earned ${totalStars} ⭐ — Account Level ${P.levelFromXp(state.xp)}!`;
}
function showEditor() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  editorScreen.classList.remove("hidden");
  customLevel = null;
  editorInit();
}

// A level is unlocked if it's level 0 OR the previous level is completed.
function isUnlocked(i) {
  return i === 0 || state.completed[i - 1] !== undefined;
}

// Load and play a player-built custom level.
function loadCustom(customTier) {
  customLevel = customTier;
  loadLevel(0, 0);  // current/variantIdx unused while customLevel is set
}

// ============================================================
//  HOME SCREEN RENDERING
// ============================================================
function renderHome() {
  const prog = P.levelProgress(state.xp);
  homeLevel.textContent = `Level ${prog.level}`;
  homeTitle.textContent = RANKS[Math.min(prog.level - 1, RANKS.length - 1)];
  homeXpbar.style.width = prog.pct + "%";
  homeXptext.textContent = `${prog.into} / ${prog.needed} XP  (total ${state.xp})`;

  drawAvatar(avatarCanvas.getContext("2d"), 120, skin());
  renderSkinPicker();
  renderLevelSelect();
}

function renderSkinPicker() {
  skinPicker.innerHTML = "";
  for (const [id, s] of Object.entries(P.SKINS)) {
    const opt = document.createElement("div");
    opt.className = "skin-option" + (id === state.skin ? " selected" : "");
    const c = document.createElement("canvas");
    c.width = 44; c.height = 44;
    drawAvatar(c.getContext("2d"), 44, s);
    const label = document.createElement("div");
    label.className = "skin-name";
    label.textContent = s.name;
    opt.appendChild(c);
    opt.appendChild(label);
    opt.addEventListener("click", () => {
      state.skin = id;
      P.save(state);
      renderHome();
    });
    skinPicker.appendChild(opt);
  }
}

function renderLevelSelect() {
  levelSelect.innerHTML = "";
  TIERS.forEach((t, i) => {
    const tile = document.createElement("div");
    const unlocked = isUnlocked(i);
    tile.className = "lvl-tile" + (unlocked ? "" : " locked");
    const bestStars = state.completed[i];
    const starStr = bestStars !== undefined
      ? "⭐".repeat(bestStars) + "☆".repeat(3 - bestStars)
      : (unlocked ? "Not played" : "🔒 Locked");
    const variantNote = t.variants.length > 1
      ? `<div class="lvl-variants">${t.variants.length} random puzzles</div>` : "";
    tile.innerHTML =
      `<span class="lvl-num">LEVEL ${i + 1}</span>` +
      `<span class="lvl-xp">+${t.xp} XP</span>` +
      `<div class="lvl-name">${escapeHtml(t.name.replace(/^Level \d+ — /, ""))}</div>` +
      `<div class="lvl-stars">${starStr}</div>` + variantNote;
    if (unlocked) {
      // Load a random variant from this tier.
      tile.addEventListener("click", () => { loadLevel(i, randomVariant(i)); showGame(); });
    }
    levelSelect.appendChild(tile);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Draw a character avatar (used on home + skin picker) using the full
// blocky character renderer so mobs look right everywhere.
function drawAvatar(g, size, s) {
  g.clearRect(0, 0, size, size);
  drawCharacter(g, 0, 0, size, s, "right");
}

// ============================================================
//  GAME: LOAD A LEVEL
// ============================================================
function loadLevel(i, vIdx = 0) {
  current = i;
  variantIdx = vIdx;
  const lv = level();
  // Guarantee every built-in level has at least one diamond to collect,
  // placed on a valid path so it stays solvable. (Custom levels use the
  // player's own diamonds, so we leave those alone.)
  if (!customLevel) lv.gems = ensureGems(lv);
  player = { x: lv.start.x, y: lv.start.y, facing: lv.facing };
  collected = new Set();
  sessionXpGain = 0;
  codeEl.value = lv.starter;
  levelTitleEl.textContent = lv.title;
  levelGoalEl.textContent = lv.goal;
  levelBadge.textContent = customLevel ? "Custom" : `Level ${i + 1}`;
  acctBadge.textContent = `Lv.${P.levelFromXp(state.xp)}`;
  scoreBadge.textContent = `+${sessionXpGain} XP`;
  statusEl.textContent = "";
  statusEl.className = "";
  hintBox.textContent = "💡 " + lv.hint;
  hintBox.classList.add("hidden");
  nextBtn.classList.add("hidden");
  hideFailChoices();
  showConcept(tier());
  updateCommandsRef();
  resizeCanvas();
  draw();
}

// Show the instruction / concept panel for this tier.
function showConcept(t) {
  conceptTitleText.textContent = "📘 " + t.name.replace(/^Level \d+ — /, "How to: ");
  // Preserve line breaks from the concept text.
  conceptBody.innerHTML = escapeHtml(t.concept).replace(/\n/g, "<br>");
  conceptPanel.classList.remove("hidden");
  conceptPanel.classList.remove("collapsed");
  conceptCollapse.textContent = "−";
}

// Failure-choice buttons (retry vs. reshuffle).
function showFailChoices() { failChoices.classList.remove("hidden"); }
function hideFailChoices() { failChoices.classList.add("hidden"); }

function updateCommandsRef() {
  // In custom mode, unlock the full command set.
  const i = customLevel ? 99 : current;
  let cmds = "Commands: <code>moveForward();</code> <code>turnLeft();</code> <code>turnRight();</code>";
  if (i >= 3) cmds += " <code>for (int i=0; i&lt;N; i++) { }</code>";
  if (i >= 5) cmds += " <code>while (pathClear()) { }</code> <code>if (...) { }</code>";
  if (i >= 7) cmds += " <code>jump();</code>";
  if (i >= 8) cmds += " <code>void name() { }</code>";
  commandsRef.innerHTML = cmds;
}

function resizeCanvas() {
  const lv = level();
  const maxPx = 440;
  const cell = Math.floor(maxPx / Math.max(lv.cols, lv.rows));
  canvas.width = cell * lv.cols;
  canvas.height = cell * lv.rows;
  canvas._cell = cell;
}

// ============================================================
//  GAME: DRAWING
// ============================================================
// Draw a soft, subtly-textured tile. Uses a solid base color plus a few
// gentle darker/lighter blocks so it reads as a material without looking
// noisy or grainy.
function speckleTile(x, y, cell, colors, seedStr) {
  // colors[0] is the base fill; the rest are accents used sparingly.
  ctx.fillStyle = colors[0];
  ctx.fillRect(x, y, cell, cell);

  const n = 4; // coarse 4x4 = bigger, smoother blocks
  const p = cell / n;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffff;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) / 0x7fffff; };
  for (let ry = 0; ry < n; ry++) {
    for (let rx = 0; rx < n; rx++) {
      // Only accent ~35% of blocks, and blend them softly over the base.
      if (rnd() < 0.35) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = colors[1 + Math.floor(rnd() * (colors.length - 1))];
        ctx.fillRect(x + rx * p, y + ry * p, Math.ceil(p), Math.ceil(p));
        ctx.globalAlpha = 1;
      }
    }
  }
}

// Draw a pixel-noise texture inside a rectangular region (w x h).
function speckleRect(x, y, w, h, colors, seedStr) {
  const px = Math.max(3, w / 6), py = Math.max(3, h / 5);
  let seed = 7;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffff;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) / 0x7fffff; };
  for (let yy = y; yy < y + h; yy += py) {
    for (let xx = x; xx < x + w; xx += px) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.fillRect(xx, yy, Math.ceil(px), Math.ceil(py));
    }
  }
}

function draw(px = player.x, py = player.y, facing = player.facing) {
  const lv = level();
  const cell = canvas._cell;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Terrain lookups for special tiles
  const isWater = (x, y) => (lv.water || []).some((w) => w.x === x && w.y === y);
  const isCave  = (x, y) => (lv.caves || []).some((c) => c.x === x && c.y === y);

  // Base ground with soft texture
  for (let y = 0; y < lv.rows; y++) {
    for (let x = 0; x < lv.cols; x++) {
      const bx = x * cell, by = y * cell;
      if (isWater(x, y)) {
        speckleTile(bx, by, cell, ["#1e88e5", "#42a5f5", "#1565c0"], `w${x},${y}`);
        // ripple lines
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + cell * 0.2, by + cell * 0.4);
        ctx.lineTo(bx + cell * 0.45, by + cell * 0.4);
        ctx.moveTo(bx + cell * 0.55, by + cell * 0.65);
        ctx.lineTo(bx + cell * 0.8, by + cell * 0.65);
        ctx.stroke();
      } else if (isCave(x, y)) {
        speckleTile(bx, by, cell, ["#17171c", "#232329", "#0f0f13"], `c${x},${y}`);
        // dark pit with a lighter rocky rim
        ctx.strokeStyle = "rgba(120,120,130,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 3, by + 3, cell - 6, cell - 6);
        ctx.fillStyle = "#050507";
        ctx.beginPath();
        ctx.ellipse(bx + cell / 2, by + cell / 2, cell * 0.28, cell * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        speckleTile(bx, by, cell, ["#4e8a34", "#5fa348", "#3f7029"], `g${x},${y}`);
      }
    }
  }

  // Visible grid lines over the terrain
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= lv.cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= lv.rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(canvas.width, y * cell + 0.5);
    ctx.stroke();
  }

  // Stone walls: cobblestone-style textured block, slightly raised
  for (const w of lv.walls) {
    const bx = w.x * cell, by = w.y * cell;
    speckleTile(bx, by, cell, ["#5a5a5f", "#6b6b70", "#787880", "#4c4c50"], `s${w.x},${w.y}`);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, cell - 2, cell - 2);
    // top highlight for a 3D block feel
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(bx + 2, by + 2, cell - 4, 4);
  }

  // Diamonds not yet collected
  (lv.gems || []).forEach((gm, idx) => {
    if (collected.has(idx)) return;
    drawGem(gm.x * cell, gm.y * cell, cell);
  });

  drawHouse(lv.goalTile.x * cell, lv.goalTile.y * cell, cell);
  drawSteve(px * cell, py * cell, cell, facing);
}

function drawGem(x, y, cell) {
  const cx = x + cell / 2, cy = y + cell / 2, r = cell * 0.24;
  // sparkle glow
  ctx.fillStyle = "rgba(64,196,255,0.25)";
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill();
  // diamond gem
  ctx.fillStyle = "#40c4ff";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  // facet highlights
  ctx.fillStyle = "#b3e5fc";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - r * 0.5, cy - r * 0.1);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e1f5fe";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.stroke();
}

function drawHouse(x, y, cell) {
  const pad = cell * 0.1;
  // grass shadow under house
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + pad, y + cell * 0.85, cell - 2 * pad, cell * 0.1);
  // wooden body (plank texture)
  speckleRect(x + pad, y + cell * 0.42, cell - 2 * pad, cell * 0.48,
          ["#8d6e63", "#a1887f", "#795548", "#6d4c41"], `h${x},${y}`);
  // roof
  ctx.fillStyle = "#b71c1c";
  ctx.beginPath();
  ctx.moveTo(x + pad * 0.4, y + cell * 0.44);
  ctx.lineTo(x + cell / 2, y + pad * 0.6);
  ctx.lineTo(x + cell - pad * 0.4, y + cell * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.moveTo(x + cell / 2, y + pad * 0.6);
  ctx.lineTo(x + cell - pad * 0.4, y + cell * 0.44);
  ctx.lineTo(x + cell / 2, y + cell * 0.44);
  ctx.closePath();
  ctx.fill();
  // door
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(x + cell * 0.42, y + cell * 0.58, cell * 0.16, cell * 0.27);
  ctx.fillStyle = "#ffd54f";
  ctx.fillRect(x + cell * 0.53, y + cell * 0.7, cell * 0.03, cell * 0.04);
}

function drawSteve(x, y, cell, facing) {
  drawCharacter(ctx, x, y, cell, skin(), facing);
}

// Draw a blocky character. Body is shared; the head/face changes by mob type.
// Works for both the game grid and the home/avatar canvases (pass any ctx).
function drawCharacter(g, x, y, cell, s, facing = "right") {
  const u = cell / 16;
  const ox = x, oy = y;
  const px = (a, b, w, h, color) => { g.fillStyle = color; g.fillRect(ox + a * u, oy + b * u, w * u, h * u); };
  const dark = shade(s.body, -0.25);
  const mob = s.mob || "player";

  // shadow
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(ox + 3 * u, oy + 14.5 * u, 10 * u, 1.5 * u);

  // legs, arms, torso (shared body)
  px(5, 12, 2.5, 3.5, dark);
  px(8.5, 12, 2.5, 3.5, dark);
  px(3, 6.5, 2, 5, s.body);
  px(11, 6.5, 2, 5, s.body);
  px(5, 6.5, 6, 6, s.body);
  // head base
  px(4.5, 1.5, 7, 5.5, s.face);

  // eye positions shift slightly toward travel direction
  let dx = 0;
  if (facing === "left") dx = -0.7; else if (facing === "right") dx = 0.7;

  if (mob === "creeper") {
    // dappled skin + classic creeper face
    px(5, 2, 1.2, 1.2, shade(s.face, -0.3));
    px(9.5, 4.5, 1.2, 1.2, shade(s.face, -0.3));
    px(6 + dx, 3, 1.6, 1.6, "#0a0a0a");   // left eye
    px(8.5 + dx, 3, 1.6, 1.6, "#0a0a0a"); // right eye
    px(7.2, 4.2, 1.6, 2.2, "#0a0a0a");    // nose/mouth vertical
    px(6.4, 5.4, 0.8, 1.0, "#0a0a0a");
    px(8.8, 5.4, 0.8, 1.0, "#0a0a0a");
  } else if (mob === "zombie") {
    px(6 + dx, 3.2, 1.3, 1.1, "#0b0b0b");
    px(8.7 + dx, 3.2, 1.3, 1.1, "#0b0b0b");
    px(6.5, 5.2, 3, 0.7, "#123312"); // grim mouth
  } else if (mob === "skeleton") {
    // dark eye sockets + rib/teeth hints
    px(6 + dx, 3, 1.4, 1.6, "#2a2a2a");
    px(8.6 + dx, 3, 1.4, 1.6, "#2a2a2a");
    px(6.5, 5.3, 3, 0.9, "#9e9e9e");
    px(7.0, 5.3, 0.4, 0.9, "#5a5a5a");
    px(8.0, 5.3, 0.4, 0.9, "#5a5a5a");
  } else if (mob === "enderman") {
    // slim tall look: darker body already; glowing purple eyes
    px(5.5 + dx, 3.4, 2, 0.9, "#c37bff");
    px(8.5 + dx, 3.4, 2, 0.9, "#c37bff");
    // faint glow
    g.fillStyle = "rgba(195,123,255,0.25)";
    g.fillRect(ox + 5 * u, oy + 3.1 * u, 6 * u, 1.6 * u);
  } else {
    // player (Steve / Alex): hair + friendly eyes + mouth
    const hair = "#3b2415";
    px(4.5, 1.5, 7, 1.6, hair);
    px(4.5, 1.5, 1.4, 3.5, hair);
    px(10.1, 1.5, 1.4, 3.5, hair);
    px(6 + dx, 3.4, 1.2, 1.2, "#ffffff");
    px(9 + dx, 3.4, 1.2, 1.2, "#ffffff");
    px(6.4 + dx, 3.7, 0.6, 0.7, "#3555c8");
    px(9.4 + dx, 3.7, 0.6, 0.7, "#3555c8");
    px(6.5, 5.2, 3, 0.6, shade(s.face, -0.35));
  }
}

// Lighten/darken a hex color by amt (-1..1).
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + r * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + g * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + b * amt)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ============================================================
//  GAME: RUN CODE
// ============================================================
function runCode() {
  if (animating) return;
  const lv = level();
  player = { x: lv.start.x, y: lv.start.y, facing: lv.facing };
  collected = new Set();
  draw();

  // Water and caves block movement just like walls, so merge them for
  // collision + pathClear() purposes.
  const blocked = allBlocked(lv);
  const world = { cols: lv.cols, rows: lv.rows, walls: blocked, start: lv.start, facing: lv.facing };
  const { actions, error } = compile(codeEl.value, world);

  if (error && actions.length === 0) {
    setStatus("⚠ " + error, "fail");
    return;
  }
  animateActions(actions, error);
}

function animateActions(actions, compileError) {
  animating = true;
  runBtn.disabled = true;
  setStatus("Running…", "run");
  const lv = level();
  const RIGHT_OF = { up: "right", right: "down", down: "left", left: "up" };
  const LEFT_OF = { up: "left", left: "down", down: "right", right: "up" };

  let i = 0, crashed = false;

  function collectHere() {
    (lv.gems || []).forEach((gm, idx) => {
      if (!collected.has(idx) && gm.x === player.x && gm.y === player.y) { collected.add(idx); sfx("gem"); }
    });
  }

  function step() {
    if (i >= actions.length || crashed) { finish(actions.length, crashed, compileError); return; }
    const act = actions[i++];
    if (act === "left" || act === "right") { player.facing = (act === "left" ? LEFT_OF : RIGHT_OF)[player.facing]; sfx("turn"); }
    else if (act === "move" || act === "jump") {
      const d = DIRS[player.facing];
      const dist = act === "jump" ? 2 : 1;
      const nx = player.x + d.dx * dist;
      const ny = player.y + d.dy * dist;
      const offGrid = nx < 0 || ny < 0 || nx >= lv.cols || ny >= lv.rows;
      const intoWall = (lv.walls || []).some((w) => w.x === nx && w.y === ny);
      const intoWater = (lv.water || []).some((w) => w.x === nx && w.y === ny);
      const intoCave = (lv.caves || []).some((c) => c.x === nx && c.y === ny);
      if (offGrid || intoWall || intoWater || intoCave) {
        crashed = true; draw(); sfx("fail");
        let msg = "💥 Steve bumped into a wall! Adjust your code.";
        if (intoWater) msg = "🌊 Splash! Steve can't swim across the river. Go around it!";
        else if (intoCave) msg = "🕳️ Steve fell into a cave! Avoid the dark tiles.";
        else if (act === "jump") msg = "💥 Bad jump! Steve landed on a wall or off the grid.";
        setStatus(msg, "fail");
        setTimeout(() => { finishFail(); onFailure(); }, 400);
        return;
      }
      sfx(act === "jump" ? "jump" : "step");
      player.x = nx; player.y = ny;
      collectHere();
    }
    draw();
    setTimeout(step, 300);
  }
  step();
}

function finishFail() { animating = false; runBtn.disabled = false; }

function finish(commandCount, crashed, compileError) {
  animating = false;
  runBtn.disabled = false;
  if (crashed) return;

  const lv = level();
  const reached = player.x === lv.goalTile.x && player.y === lv.goalTile.y;
  const allGems = (lv.gems || []).length === 0 || collected.size === (lv.gems || []).length;

  if (!reached || !allGems) {
    let msg = "🚶 Steve stopped, but that's not home yet. Keep coding!";
    if (reached && !allGems) msg = "💎 You reached home but missed a diamond! Grab them all.";
    else if (compileError) msg = "⚠ " + compileError + " (fix and run again)";
    setStatus(msg, "fail");
    onFailure();
    return;
  }

  hideFailChoices();
  sfx("win");

  // Custom levels: celebrate but don't award XP or advance tiers.
  if (customLevel) {
    setStatus(`🏠 You solved your own level! (${commandCount} commands) 🎉`, "win");
    nextBtn.classList.remove("hidden");
    nextBtn.textContent = "🛠️ Back to Builder";
    return;
  }

  // ----- stars by efficiency -----
  let stars = 3;
  if (commandCount > lv.par) stars = commandCount > lv.par * 1.5 ? 1 : 2;

  // ----- XP: base tier XP scaled a bit by stars -----
  const xpGain = Math.round(tier().xp * (0.6 + 0.2 * stars)); // 3★=1.2x, 2★=1.0x, 1★=0.8x
  awardXp(xpGain, stars);

  const starStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  setStatus(`🏠 Home! ${starStr}  +${xpGain} XP  (${commandCount} commands)`, "win");
  scoreBadge.textContent = `+${sessionXpGain} XP`;

  nextBtn.classList.remove("hidden");
  nextBtn.textContent = current < TIERS.length - 1 ? "Next Level →" : "🎉 Finish Game!";
}

// Add XP, record best stars, save, and show a level-up toast if crossed.
function awardXp(amount, stars) {
  const before = P.levelFromXp(state.xp);
  state.xp += amount;
  sessionXpGain += amount;

  const prev = state.completed[current];
  if (prev === undefined || stars > prev) state.completed[current] = stars;

  P.save(state);
  acctBadge.textContent = `Lv.${P.levelFromXp(state.xp)}`;

  const after = P.levelFromXp(state.xp);
  if (after > before) showLevelUp(after);
}

function showLevelUp(newLevel) {
  sfx("levelup");
  const toast = document.getElementById("levelup-toast");
  const detail = document.getElementById("levelup-detail");
  const rank = RANKS[Math.min(newLevel - 1, RANKS.length - 1)];
  detail.textContent = `You reached Level ${newLevel} — ${rank}!`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind ? "status-" + kind : "";
}

// ============================================================
//  LEVEL EDITOR
// ============================================================
const editorCanvas = document.getElementById("editor-grid");
const edCtx = editorCanvas.getContext("2d");
const editorStatus = document.getElementById("editor-status");
const gridWInput = document.getElementById("grid-w");
const gridHInput = document.getElementById("grid-h");
const startFacingSel = document.getElementById("start-facing");

let edCols = 6, edRows = 6, edCell = 60, edTool = "wall";
let edGrid = null; // 2D array of tile type: null|"wall"|"water"|"cave"|"gem"
let edStart = null, edHouse = null; // {x,y} or null

function editorInit() {
  if (!edGrid) { edCols = 6; edRows = 6; makeGrid(); }
  editorStatus.textContent = "";
  drawEditor();
}

function makeGrid() {
  edGrid = [];
  for (let y = 0; y < edRows; y++) edGrid.push(new Array(edCols).fill(null));
  edStart = null; edHouse = null;
  edCell = Math.floor(420 / Math.max(edCols, edRows));
  editorCanvas.width = edCell * edCols;
  editorCanvas.height = edCell * edRows;
}

// Draw the editor grid using the same visual helpers as the game.
function drawEditor() {
  const cell = edCell;
  edCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
  // swap the module-level ctx target temporarily is messy; instead draw inline
  for (let y = 0; y < edRows; y++) {
    for (let x = 0; x < edCols; x++) {
      const t = edGrid[y][x];
      let base = "#4e8a34";
      if (t === "water") base = "#1e88e5";
      else if (t === "cave") base = "#17171c";
      else if (t === "wall") base = "#6b6b70";
      edCtx.fillStyle = base;
      edCtx.fillRect(x * cell, y * cell, cell, cell);
      if (t === "cave") {
        edCtx.fillStyle = "#050507";
        edCtx.beginPath();
        edCtx.ellipse(x*cell+cell/2, y*cell+cell/2, cell*0.28, cell*0.22, 0, 0, Math.PI*2);
        edCtx.fill();
      }
      if (t === "gem") {
        edCtx.fillStyle = "#40c4ff";
        const cx=x*cell+cell/2, cy=y*cell+cell/2, r=cell*0.22;
        edCtx.beginPath();
        edCtx.moveTo(cx,cy-r); edCtx.lineTo(cx+r,cy); edCtx.lineTo(cx,cy+r); edCtx.lineTo(cx-r,cy);
        edCtx.closePath(); edCtx.fill();
      }
    }
  }
  // grid lines
  edCtx.strokeStyle = "rgba(0,0,0,0.25)";
  edCtx.lineWidth = 1;
  for (let x = 0; x <= edCols; x++) { edCtx.beginPath(); edCtx.moveTo(x*cell+0.5,0); edCtx.lineTo(x*cell+0.5,editorCanvas.height); edCtx.stroke(); }
  for (let y = 0; y <= edRows; y++) { edCtx.beginPath(); edCtx.moveTo(0,y*cell+0.5); edCtx.lineTo(editorCanvas.width,y*cell+0.5); edCtx.stroke(); }
  // start marker
  if (edStart) { edCtx.font = `${cell*0.6}px serif`; edCtx.textAlign="center"; edCtx.textBaseline="middle";
    edCtx.fillText("🧍", edStart.x*cell+cell/2, edStart.y*cell+cell/2); }
  // house marker
  if (edHouse) { edCtx.font = `${cell*0.6}px serif`; edCtx.textAlign="center"; edCtx.textBaseline="middle";
    edCtx.fillText("🏠", edHouse.x*cell+cell/2, edHouse.y*cell+cell/2); }
}

function editorClick(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / edCell);
  const y = Math.floor((e.clientY - rect.top) / edCell);
  if (x < 0 || y < 0 || x >= edCols || y >= edRows) return;

  const clearMarkersAt = (cx, cy) => {
    if (edStart && edStart.x === cx && edStart.y === cy) edStart = null;
    if (edHouse && edHouse.x === cx && edHouse.y === cy) edHouse = null;
  };

  if (edTool === "erase") {
    edGrid[y][x] = null; clearMarkersAt(x, y);
  } else if (edTool === "start") {
    edGrid[y][x] = null; edStart = { x, y };
    if (edHouse && edHouse.x === x && edHouse.y === y) edHouse = null;
  } else if (edTool === "house") {
    edGrid[y][x] = null; edHouse = { x, y };
    if (edStart && edStart.x === x && edStart.y === y) edStart = null;
  } else {
    // wall/water/cave/gem — can't overlap start/house
    clearMarkersAt(x, y);
    edGrid[y][x] = (edGrid[y][x] === edTool) ? null : edTool;
  }
  drawEditor();
}

// Turn the editor state into a playable custom level and start it.
function playCustom() {
  if (!edStart) { editorStatus.textContent = "⚠ Place a Start (🧍) tile first."; editorStatus.className="status-fail"; return; }
  if (!edHouse) { editorStatus.textContent = "⚠ Place a House (🏠) tile first."; editorStatus.className="status-fail"; return; }

  const walls = [], water = [], caves = [], gems = [];
  for (let y = 0; y < edRows; y++) for (let x = 0; x < edCols; x++) {
    const t = edGrid[y][x];
    if (t === "wall") walls.push({x,y});
    else if (t === "water") water.push({x,y});
    else if (t === "cave") caves.push({x,y});
    else if (t === "gem") gems.push({x,y});
  }

  const lv = {
    title: "Your Custom Level",
    goal: "Solve the level you built! Guide Steve home" + (gems.length ? " and grab all diamonds." : "."),
    cols: edCols, rows: edRows,
    start: { x: edStart.x, y: edStart.y }, facing: startFacingSel.value,
    goalTile: { x: edHouse.x, y: edHouse.y },
    walls, water, caves, gems,
    starter: "// Write code to solve YOUR level!\n// moveForward(); turnLeft(); turnRight();\n// for/while loops and jump() work too.\n",
    hint: "You built this — think through the path you designed!",
    par: 999,
  };

  const customTier = {
    name: "Custom — Your Level",
    xp: 0,
    concept: "This is YOUR level! Use everything you learned — moveForward(), " +
             "turns, for/while loops, jump(), and functions — to solve it. " +
             "No XP here, just bragging rights. Press Back to Builder to edit it.",
    variants: [lv],
  };

  editorStatus.textContent = "";
  showGame(true);
  loadCustom(customTier);
}

// Called whenever a run fails (crash, wrong spot, missed gems).
// On tiers with more than one variant, offer retry vs. reshuffle.
function onFailure() {
  if (tier().variants.length > 1) showFailChoices();
}

// Pick a different variant than the current one, if possible.
function reshuffleVariant() {
  const n = tier().variants.length;
  if (n <= 1) { loadLevel(current, variantIdx); return; }
  let v = variantIdx;
  while (v === variantIdx) v = Math.floor(Math.random() * n);
  loadLevel(current, v);
}

// ============================================================
//  EVENTS
// ============================================================
runBtn.addEventListener("click", runCode);
resetBtn.addEventListener("click", () => {
  if (animating) return;
  if (customLevel) loadCustom(customLevel); else loadLevel(current, variantIdx);
});
nextBtn.addEventListener("click", () => {
  if (animating) return;
  if (customLevel) { showEditor(); return; }
  if (current < TIERS.length - 1) { loadLevel(current + 1, randomVariant(current + 1)); }
  else { showWin(); }
});
// Failure choices: retry the same variant, or shuffle to a different one.
retryBtn.addEventListener("click", () => {
  if (animating) return;
  if (customLevel) loadCustom(customLevel); else loadLevel(current, variantIdx);
});
reshuffleBtn.addEventListener("click", () => { if (!animating) reshuffleVariant(); });

// Completion screen buttons
document.getElementById("win-editor-btn").addEventListener("click", showEditor);
document.getElementById("win-menu-btn").addEventListener("click", showHome);

// Home: open the level builder anytime
document.getElementById("open-editor-btn").addEventListener("click", showEditor);

// Editor: tool selection, canvas clicks, sizing, play, clear, menu
document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    edTool = btn.dataset.tool;
  });
});
editorCanvas.addEventListener("click", editorClick);
document.getElementById("resize-grid").addEventListener("click", () => {
  edCols = Math.max(3, Math.min(10, parseInt(gridWInput.value) || 6));
  edRows = Math.max(3, Math.min(10, parseInt(gridHInput.value) || 6));
  gridWInput.value = edCols; gridHInput.value = edRows;
  makeGrid();
  drawEditor();
});
document.getElementById("play-custom-btn").addEventListener("click", playCustom);
document.getElementById("clear-grid-btn").addEventListener("click", () => { makeGrid(); drawEditor(); });
document.getElementById("editor-home-btn").addEventListener("click", showHome);
hintToggle.addEventListener("click", () => hintBox.classList.toggle("hidden"));
document.getElementById("home-btn").addEventListener("click", () => { if (!animating) showHome(); });

// Collapsible concept/instructions panel
conceptCollapse.addEventListener("click", () => {
  conceptPanel.classList.toggle("collapsed");
  conceptCollapse.textContent = conceptPanel.classList.contains("collapsed") ? "+" : "−";
});

// Sound mute toggle
const muteBtn = document.getElementById("mute-btn");
muteBtn.textContent = isMuted() ? "🔇" : "🔊";
muteBtn.addEventListener("click", () => {
  const m = toggleMute();
  muteBtn.textContent = m ? "🔇" : "🔊";
});
document.getElementById("reset-progress").addEventListener("click", () => {
  if (confirm("Erase all XP, levels, and character choice?")) {
    localStorage.removeItem("codequest_save_v1");
    state = P.load();
    renderHome();
  }
});

codeEl.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const s = codeEl.selectionStart, en = codeEl.selectionEnd;
    codeEl.value = codeEl.value.slice(0, s) + "  " + codeEl.value.slice(en);
    codeEl.selectionStart = codeEl.selectionEnd = s + 2;
  }
});

// Intro tutorial popup — shown once, then remembered.
const introOverlay = document.getElementById("intro-overlay");
document.getElementById("intro-start-btn").addEventListener("click", () => {
  introOverlay.classList.add("hidden");
  localStorage.setItem("codequest_seen_intro", "1");
  sfx("click");
});

// ============================================================
//  BOOT
// ============================================================
if (localStorage.getItem("codequest_seen_intro") !== "1") {
  introOverlay.classList.remove("hidden");
}
showHome();
