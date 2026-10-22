// game.js — Heap & Slash core loop.
//
// ONE mechanic: read a VISIBLE memory diagram, choose the correct pointer
// operation / prediction / bug-diagnosis. Correct answers damage the boss,
// raise skill mastery (your skill tree), and grant XP. Bosses reuse the
// skills you leveled up — that's the reinforcement.

import { POOLS, BOSSES, CAMPAIGN, CATEGORIES } from "./scenarios.js";
import { LESSONS } from "./lessons.js";
import { GLOSSARY } from "./glossary.js";

// No time LIMIT — take as long as you need. We track elapsed time and give a
// bonus for answering faster: full bonus at/under SPEED_FAST seconds, fading
// to zero by SPEED_SLOW seconds. Slow answers are never penalized.
const SPEED_FAST = 4;
const SPEED_SLOW = 30;
const BOSS_PHASES = 3; // how many phases each boss fight uses (random subset)
const HINT_PENALTY = 0.5; // using a hint keeps only this fraction of the points

// Fallback hints per concept (used when a scenario has no explicit hint).
const CATEGORY_HINTS = {
  addressof: "The & operator gives a variable's ADDRESS \u2014 that's what a pointer stores.",
  deref: "*p means 'the value that p points to'. On the left of =, it writes there.",
  references: "A reference (int&) is just another NAME for the same variable \u2014 use it directly.",
  heap: "new allocates on the heap and returns an address; every new needs one delete.",
  arithmetic: "Adding N to a pointer moves it N ELEMENTS. Also: arr[i] == *(p + i).",
  dangling: "Using memory after delete (or after its scope ends) is use-after-free.",
  nullptr: "A null pointer points to nothing \u2014 check it before you dereference.",
  doublefree: "Deleting the same block twice is undefined behavior. Null the pointer after delete.",
  smart: "Smart pointers (unique_ptr / shared_ptr) free their memory automatically.",
};
function getHint(s) {
  return s.hint || CATEGORY_HINTS[s.category] || "Look closely at what the memory diagram shows.";
}

// ---------- Player / run state ----------
const state = {
  stageIndex: 0,
  level: 1,
  xp: 0,
  xpNeeded: 30,
  hp: 100,
  maxHp: 100,
  score: 0,
  mastery: {}, // category -> count correct
  // per-encounter
  mode: "title", // title | tutorial | practice | boss | victory | gameover
  queue: [], // scenarios remaining this stage segment
  current: null,
  enemyName: "",
  enemyHp: 0,
  enemyMaxHp: 0,
  enemyGlyph: "",
  enemyColor: "",
  answered: false,
  streak: 0,
  // stopwatch (counts elapsed; faster = bigger bonus, no time limit)
  timerId: null,
  paused: false,
  swAccum: 0,
  swStart: 0,
  swRunning: false,
  hintUsed: false,
  // profile / progress
  profile: null, // active profile name
  lessonsCompleted: {}, // pool key -> true (lesson finished at least once)
  lesson: null,
  stats: { answered: 0, correct: 0, hintsUsed: 0, bestStreak: 0, timeSpent: 0 },
};

function defaultStats() {
  const byCat = {};
  Object.keys(CATEGORIES).forEach((c) => (byCat[c] = { answered: 0, correct: 0 }));
  return { answered: 0, correct: 0, hintsUsed: 0, bestStreak: 0, timeSpent: 0, byCat };
}

Object.keys(CATEGORIES).forEach((c) => (state.mastery[c] = 0));

// ---------- DOM helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

const app = $("#app");

// ======================================================================
// PROFILES & SAVED PROGRESS (localStorage — no backend needed)
// ======================================================================
const PROFILES_KEY = "pp_profiles";
const CURRENT_KEY = "pp_current";

function storageAvailable() {
  try {
    localStorage.setItem("__pp_test", "1");
    localStorage.removeItem("__pp_test");
    return true;
  } catch (e) {
    return false;
  }
}
const HAS_STORAGE = storageAvailable();

function loadProfiles() {
  if (!HAS_STORAGE) return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}");
  } catch (e) {
    return {};
  }
}
function writeProfiles(obj) {
  if (!HAS_STORAGE) return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(obj));
}
function snapshot() {
  return {
    stageIndex: state.stageIndex,
    level: state.level,
    xp: state.xp,
    xpNeeded: state.xpNeeded,
    hp: state.hp,
    maxHp: state.maxHp,
    score: state.score,
    mastery: state.mastery,
    lessonsCompleted: state.lessonsCompleted,
    stats: state.stats,
    updatedAt: Date.now(),
  };
}
function saveProfile() {
  if (!state.profile) return;
  const profs = loadProfiles();
  profs[state.profile] = snapshot();
  writeProfiles(profs);
}
function applySave(save) {
  state.stageIndex = save.stageIndex || 0;
  state.level = save.level || 1;
  state.xp = save.xp || 0;
  state.xpNeeded = save.xpNeeded || 30;
  state.maxHp = save.maxHp || 100;
  state.hp = save.maxHp || 100; // restore to full on load
  state.score = save.score || 0;
  state.mastery = save.mastery || {};
  Object.keys(CATEGORIES).forEach((c) => {
    if (state.mastery[c] == null) state.mastery[c] = 0;
  });
  state.lessonsCompleted = save.lessonsCompleted || {};
  state.stats = Object.assign(defaultStats(), save.stats || {});
  // ensure every current concept exists in the per-category breakdown
  const bc = state.stats.byCat || {};
  Object.keys(CATEGORIES).forEach((c) => {
    if (!bc[c]) bc[c] = { answered: 0, correct: 0 };
  });
  state.stats.byCat = bc;
}
function selectProfile(name) {
  state.profile = name;
  if (HAS_STORAGE) localStorage.setItem(CURRENT_KEY, name);
  const profs = loadProfiles();
  if (profs[name]) applySave(profs[name]);
}
function createProfile(name) {
  name = (name || "").trim().slice(0, 20);
  if (!name) return false;
  const profs = loadProfiles();
  // fresh stats
  state.stageIndex = 0;
  state.level = 1;
  state.xp = 0;
  state.xpNeeded = 30;
  state.maxHp = 100;
  state.hp = 100;
  state.score = 0;
  state.mastery = {};
  Object.keys(CATEGORIES).forEach((c) => (state.mastery[c] = 0));
  state.lessonsCompleted = {};
  state.stats = defaultStats();
  state.profile = name;
  profs[name] = snapshot();
  writeProfiles(profs);
  if (HAS_STORAGE) localStorage.setItem(CURRENT_KEY, name);
  return true;
}
function deleteProfile(name) {
  const profs = loadProfiles();
  delete profs[name];
  writeProfiles(profs);
  if (state.profile === name) {
    state.profile = null;
    if (HAS_STORAGE) localStorage.removeItem(CURRENT_KEY);
  }
}
function resetProgress() {
  state.stageIndex = 0;
  state.level = 1;
  state.xp = 0;
  state.xpNeeded = 30;
  state.maxHp = 100;
  state.hp = 100;
  state.score = 0;
  Object.keys(CATEGORIES).forEach((c) => (state.mastery[c] = 0));
  state.lessonsCompleted = {};
  state.stats = defaultStats();
  saveProfile();
}
function markLessonComplete(key) {
  state.lessonsCompleted[key] = true;
  saveProfile();
}

// ---------- Utility ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function masteryLevel(cat) {
  // 0-2 correct = Novice, 3-5 = Adept, 6+ = Master
  const m = state.mastery[cat] || 0;
  if (m >= 6) return { name: "Master", tier: 3 };
  if (m >= 3) return { name: "Adept", tier: 2 };
  if (m >= 1) return { name: "Apprentice", tier: 1 };
  return { name: "Untrained", tier: 0 };
}

function damageFor(scenario) {
  // Harder concepts hit harder; skill mastery amplifies damage.
  const base = 8 + scenario.difficulty * 6; // 14 / 20 / 26
  const tier = masteryLevel(scenario.category).tier;
  const streakBonus = Math.min(state.streak, 5) * 2;
  return Math.round(base * (1 + tier * 0.2) + streakBonus);
}

// ---------- Rendering: shared HUD ----------
function renderHUD() {
  const hud = el("div", "hud");

  const left = el("div", "hud-left");
  const topRow = el("div", "hud-toprow");
  topRow.appendChild(el("div", "hud-title", "\u2694\ufe0f Heap & Slash"));
  topRow.appendChild(el("div", "hud-score", `\u2b50 ${state.score}`));
  left.appendChild(topRow);
  const lvl = el("div", "hud-level", `Level ${state.level}`);
  left.appendChild(lvl);

  // XP bar
  const xpWrap = el("div", "bar xp-bar");
  const xpFill = el("div", "bar-fill xp-fill");
  xpFill.style.width = `${Math.min(100, (state.xp / state.xpNeeded) * 100)}%`;
  xpWrap.appendChild(xpFill);
  xpWrap.appendChild(el("span", "bar-label", `XP ${state.xp}/${state.xpNeeded}`));
  left.appendChild(xpWrap);

  // HP bar
  const hpWrap = el("div", "bar hp-bar");
  const hpFill = el("div", "bar-fill hp-fill");
  hpFill.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  hpWrap.appendChild(hpFill);
  hpWrap.appendChild(el("span", "bar-label", `HP ${state.hp}/${state.maxHp}`));
  left.appendChild(hpWrap);

  // Time on current problem (updated live by the stopwatch)
  if (state.mode === "practice" || state.mode === "boss") {
    left.appendChild(el("div", "hud-timer", `\u23f1 Time on problem: ${getElapsed().toFixed(1)}s`));
  }

  hud.appendChild(left);
  hud.appendChild(renderSkillTree());
  return hud;
}

function renderSkillTree() {
  const tree = el("div", "skilltree");
  tree.appendChild(el("div", "skilltree-title", "Skill Mastery"));
  Object.keys(CATEGORIES).forEach((cat) => {
    const ml = masteryLevel(cat);
    const row = el("div", `skill tier-${ml.tier}`);
    row.appendChild(el("span", "skill-name", CATEGORIES[cat]));
    const pips = el("span", "skill-pips");
    for (let i = 1; i <= 3; i++) {
      pips.appendChild(el("span", `pip ${i <= ml.tier ? "on" : ""}`));
    }
    row.appendChild(pips);
    row.title = `${ml.name} (${state.mastery[cat]} correct)`;
    tree.appendChild(row);
  });
  return tree;
}

// ---------- Rendering: memory diagram (the visible model) ----------
function renderMemory(memory, opts) {
  opts = opts || {};
  const wrap = el("div", "memwrap");

  const stackCol = el("div", "mem-col");
  stackCol.appendChild(el("div", "mem-region-title stack-title", "STACK"));
  const heapCol = el("div", "mem-col");
  heapCol.appendChild(el("div", "mem-region-title heap-title", "HEAP"));

  memory.forEach((cell) => {
    const c = el("div", `cell ${cell.kind} ${cell.freed ? "freed" : ""}`);
    c.dataset.cellId = cell.id;
    c.appendChild(el("div", "cell-name", cell.name));
    c.appendChild(el("div", "cell-addr", cell.addr));
    const val = el("div", "cell-val", cell.value);
    c.appendChild(val);
    if (cell.kind === "ptr") c.classList.add("is-ptr");
    if (opts.clickable) {
      c.classList.add("clickable");
      c.onclick = () => opts.onClick(cell.id, c);
    }
    (cell.region === "heap" ? heapCol : stackCol).appendChild(c);
  });

  wrap.appendChild(stackCol);
  wrap.appendChild(heapCol);

  // SVG overlay for pointer arrows (drawn after layout)
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("arrows");
  wrap.appendChild(svg);

  // Defer arrow drawing until the DOM is laid out.
  requestAnimationFrame(() => drawArrows(wrap, svg, memory));
  return wrap;
}

function drawArrows(wrap, svg, memory) {
  const rect = wrap.getBoundingClientRect();
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);
  svg.innerHTML =
    '<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#f0b429"/></marker></defs>';

  memory.forEach((cell) => {
    if (cell.kind !== "ptr" || !cell.pointsTo) return;
    const from = wrap.querySelector(`[data-cell-id="${cell.id}"]`);
    const to = wrap.querySelector(`[data-cell-id="${cell.pointsTo}"]`);
    if (!from || !to) return;
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const x1 = fr.right - rect.left;
    const y1 = fr.top - rect.top + fr.height / 2;
    const x2 = tr.left - rect.left;
    const y2 = tr.top - rect.top + tr.height / 2;
    const midX = Math.max(x1, x2) + 40;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 + 4} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", cell.freed ? "#ef4444" : "#f0b429");
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("stroke-dasharray", cell.freed ? "5,4" : "none");
    path.setAttribute("marker-end", "url(#ah)");
    svg.appendChild(path);
  });
}

// ---------- Screens ----------
function renderTitle() {
  app.innerHTML = "";
  const wrap = el("div", "screen title-screen");
  wrap.appendChild(el("h1", "big-title", "\u2694\ufe0f Heap & Slash"));
  wrap.appendChild(
    el("p", "subtitle", "Learn C++ pointers & memory, then defeat the Corruption Bosses.")
  );
  if (state.profile) renderHomeMenu(wrap);
  else renderProfilePicker(wrap);
  app.appendChild(wrap);
}

function renderProfilePicker(wrap) {
  const card = el("div", "how-card");
  card.appendChild(el("h3", null, "\u{1F464} Choose a Profile"));
  if (!HAS_STORAGE) {
    card.appendChild(
      el("p", "recap", "\u26a0\ufe0f Saving is unavailable here (storage blocked). You can still play, but progress won't persist.")
    );
  }
  const profs = loadProfiles();
  const names = Object.keys(profs).sort((a, b) => (profs[b].updatedAt || 0) - (profs[a].updatedAt || 0));
  if (names.length) {
    card.appendChild(el("div", "recap", "Continue a saved profile:"));
    const list = el("div", "profile-list");
    names.forEach((name) => {
      const s = profs[name];
      const row = el("div", "profile-row");
      const load = el("button", "btn profile-load");
      load.appendChild(el("span", "profile-name", name));
      load.appendChild(
        el("span", "profile-meta", `Stage ${Math.min((s.stageIndex || 0) + 1, CAMPAIGN.length)}/${CAMPAIGN.length} \u2022 Lvl ${s.level || 1} \u2022 \u2b50 ${s.score || 0}`)
      );
      load.onclick = () => {
        selectProfile(name);
        renderTitle();
      };
      row.appendChild(load);
      const del = el("button", "btn tiny danger-outline", "\u{1F5d1}");
      del.title = "Delete profile";
      del.onclick = () => {
        if (confirm(`Delete profile \u201c${name}\u201d? This cannot be undone.`)) {
          deleteProfile(name);
          renderTitle();
        }
      };
      row.appendChild(del);
      list.appendChild(row);
    });
    card.appendChild(list);
  }
  card.appendChild(el("div", "recap", "Or create a new profile:"));
  const row = el("div", "input-row");
  const inp = document.createElement("input");
  inp.className = "code-input";
  inp.type = "text";
  inp.maxLength = 20;
  inp.placeholder = "Enter a name\u2026";
  inp.autocomplete = "off";
  const create = el("button", "btn primary", "Create");
  const doCreate = () => {
    if (createProfile(inp.value)) renderTitle();
  };
  create.onclick = doCreate;
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doCreate();
  });
  row.appendChild(inp);
  row.appendChild(create);
  card.appendChild(row);
  wrap.appendChild(card);
  setTimeout(() => inp.focus(), 50);
}

function fmtTime(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function renderHomeMenu(wrap) {
  const total = CAMPAIGN.length;
  const done = state.stageIndex >= total;
  const completed = Math.min(state.stageIndex, total); // bosses defeated
  const st = state.stats || defaultStats();
  const accuracy = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
  const lessonsDone = CAMPAIGN.filter((c) => state.lessonsCompleted[c.pool]).length;
  const masterTotal = Object.keys(CATEGORIES).reduce(
    (n, c) => n + (masteryLevel(c).tier === 3 ? 1 : 0),
    0
  );

  // Greeting
  const info = el("div", "home-info");
  info.appendChild(el("span", "home-hello", `\u{1F464} ${state.profile}`));
  info.appendChild(
    el("span", "home-stats", done ? "\u{1F3C6} Campaign complete!" : `Next: Stage ${completed + 1} of ${total}`)
  );
  wrap.appendChild(info);

  // Primary actions
  const actions = el("div", "dash-actions");
  const begin = el(
    "button",
    "btn primary",
    done ? "\u{1F504} New Game+" : completed > 0 ? "\u2694\ufe0f Continue Quest" : "\u2694\ufe0f Begin Quest"
  );
  begin.onclick = () => {
    if (done) {
      state.stageIndex = 0;
      saveProfile();
    }
    startStage();
  };
  actions.appendChild(begin);
  const learn = el("button", "btn", "\u{1F4D6} Browse Lessons");
  learn.onclick = renderLessonsMenu;
  actions.appendChild(learn);
  wrap.appendChild(actions);

  // Dashboard grid
  const grid = el("div", "dash-grid");

  // --- Card: Progress ---
  const cP = el("div", "dash-card");
  cP.appendChild(el("h4", null, "\u{1F5FA}\ufe0f Progress"));
  cP.appendChild(bigStat(`${completed}/${total}`, "bosses defeated"));
  cP.appendChild(labeledBar((completed / total) * 100, "campaign", "xp-fill"));
  cP.appendChild(el("div", "dash-sub", `Level ${state.level}`));
  cP.appendChild(
    labeledBar(Math.min(100, (state.xp / state.xpNeeded) * 100), `XP ${state.xp}/${state.xpNeeded}`, "xp-fill")
  );
  const scoreRow = el("div", "dash-inline");
  scoreRow.appendChild(el("span", "dash-chip gold", `\u2b50 ${state.score}`));
  scoreRow.appendChild(el("span", "dash-chip", `\u{1F4DA} ${lessonsDone}/${total} lessons`));
  cP.appendChild(scoreRow);
  grid.appendChild(cP);

  // --- Card: Campaign map ---
  const cM = el("div", "dash-card");
  cM.appendChild(el("h4", null, "\u{1F3F0} Realms"));
  CAMPAIGN.forEach((stage, i) => {
    const boss = BOSSES[stage.boss];
    const lessonOk = !!state.lessonsCompleted[stage.pool];
    let status, cls;
    if (i < state.stageIndex) {
      status = "\u2705";
      cls = "cleared";
    } else if (i === state.stageIndex && !done) {
      status = "\u25b6\ufe0f";
      cls = "current";
    } else {
      status = "\u{1F512}";
      cls = "locked";
    }
    const row = el("div", `camp-row ${cls}`);
    row.appendChild(el("span", "camp-status", status));
    row.appendChild(el("span", "camp-glyph", boss.glyph));
    const txt = el("span", "camp-text");
    txt.appendChild(el("span", "camp-title", stage.title));
    txt.appendChild(el("span", "camp-boss", boss.name));
    row.appendChild(txt);
    row.appendChild(el("span", "camp-lesson", lessonOk ? "\u{1F4D6}\u2713" : "\u{1F4D6}"));
    cM.appendChild(row);
  });
  grid.appendChild(cM);

  // --- Card: Skill mastery ---
  const cS = el("div", "dash-card");
  cS.appendChild(el("h4", null, `\u{1F9E0} Skill Mastery \u2014 ${masterTotal}/${Object.keys(CATEGORIES).length} mastered`));
  cS.appendChild(renderSkillTree());
  grid.appendChild(cS);

  // --- Card: Lifetime stats ---
  const cStats = el("div", "dash-card");
  cStats.appendChild(el("h4", null, "\u{1F4CA} Stats"));
  const statGrid = el("div", "stat-grid");
  statGrid.appendChild(miniStat(`${accuracy}%`, "accuracy"));
  statGrid.appendChild(miniStat(`${st.correct}/${st.answered}`, "correct"));
  statGrid.appendChild(miniStat(`\u{1F525} ${st.bestStreak}`, "best streak"));
  statGrid.appendChild(miniStat(`${st.hintsUsed}`, "hints used"));
  statGrid.appendChild(miniStat(fmtTime(st.timeSpent), "time solving"));
  cStats.appendChild(statGrid);
  grid.appendChild(cStats);

  // --- Card: Concept report (full width) ---
  const cR = el("div", "dash-card concept-report");
  cR.appendChild(el("h4", null, "\u{1F4DD} Concept Report \u2014 accuracy by topic"));
  const anyAnswered = Object.keys(CATEGORIES).some((c) => (st.byCat[c] || {}).answered);
  if (!anyAnswered) {
    cR.appendChild(el("div", "dash-sub", "Play some rounds to see your per-topic accuracy here."));
  }
  Object.keys(CATEGORIES).forEach((c) => {
    const rec = st.byCat[c] || { answered: 0, correct: 0 };
    const pct = rec.answered ? Math.round((rec.correct / rec.answered) * 100) : 0;
    const row = el("div", "cr-row");
    row.appendChild(el("span", "cr-name", CATEGORIES[c]));
    const barWrap = el("div", "bar cr-bar");
    const fill = el("div", "bar-fill");
    fill.style.width = `${pct}%`;
    // color by accuracy: red < 50, amber < 80, green otherwise
    fill.style.background =
      rec.answered === 0
        ? "#333a47"
        : pct >= 80
        ? "linear-gradient(90deg,#34d399,#10b981)"
        : pct >= 50
        ? "linear-gradient(90deg,#f59e0b,#f0b429)"
        : "linear-gradient(90deg,#f87171,#ef4444)";
    barWrap.appendChild(fill);
    row.appendChild(barWrap);
    row.appendChild(
      el("span", "cr-frac", rec.answered ? `${rec.correct}/${rec.answered} \u00b7 ${pct}%` : "\u2014")
    );
    cR.appendChild(row);
  });
  grid.appendChild(cR);

  wrap.appendChild(grid);

  // How to play (collapsible)
  const details = document.createElement("details");
  details.className = "how-details";
  const summary = document.createElement("summary");
  summary.textContent = "\u2139\ufe0f How to play";
  details.appendChild(summary);
  const ul = el("ul");
  [
    "No C++ experience needed \u2014 each stage starts with a hands-on LESSON.",
    "Lessons: click memory cells, step through code line-by-line, type syntax, run real C++.",
    "A boss stays SEALED until you finish its stage's lesson.",
    "Then fight: read the MEMORY DIAGRAM and answer. Faster = bigger bonus, but no time limit.",
    "Stuck? Open the \u{1F4D6} Glossary any time (it pauses the stopwatch), or use a hint for fewer points.",
    "Progress saves automatically to your profile.",
  ].forEach((t) => ul.appendChild(el("li", null, t)));
  details.appendChild(ul);
  wrap.appendChild(details);

  // Secondary actions
  const secondary = el("div", "dash-secondary");
  const reset = el("button", "btn tiny", "Reset progress");
  reset.onclick = () => {
    if (confirm("Reset this profile's progress to the beginning?")) {
      resetProgress();
      renderTitle();
    }
  };
  secondary.appendChild(reset);
  const switchBtn = el("button", "btn tiny", "Switch profile");
  switchBtn.onclick = () => {
    state.profile = null;
    if (HAS_STORAGE) localStorage.removeItem(CURRENT_KEY);
    renderTitle();
  };
  secondary.appendChild(switchBtn);
  wrap.appendChild(secondary);
}

// Small dashboard building blocks
function bigStat(value, label) {
  const d = el("div", "big-stat");
  d.appendChild(el("span", "big-stat-val", value));
  d.appendChild(el("span", "big-stat-label", label));
  return d;
}
function miniStat(value, label) {
  const d = el("div", "mini-stat");
  d.appendChild(el("span", "mini-stat-val", value));
  d.appendChild(el("span", "mini-stat-label", label));
  return d;
}
function labeledBar(pct, label, fillCls) {
  const wrap = el("div", "bar dash-bar");
  const fill = el("div", `bar-fill ${fillCls || "xp-fill"}`);
  fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  wrap.appendChild(fill);
  wrap.appendChild(el("span", "bar-label", label));
  return wrap;
}

// ---------- Lessons menu (free study) ----------
function renderLessonsMenu() {
  app.innerHTML = "";
  const wrap = el("div", "screen title-screen");
  wrap.appendChild(el("h1", "big-title", "\u{1F4D6} Lessons"));
  wrap.appendChild(
    el("p", "subtitle", "Learn each concept hands-on \u2014 no prior C++ knowledge required.")
  );
  const list = el("div", "lesson-list");
  CAMPAIGN.forEach((stage) => {
    const L = LESSONS[stage.pool];
    if (!L) return;
    const cardEl = el("button", "lesson-card");
    cardEl.appendChild(el("div", "lesson-card-title", L.title));
    if (L.blurb) cardEl.appendChild(el("div", "lesson-card-blurb", L.blurb));
    cardEl.onclick = () => playLesson(stage.pool, renderLessonsMenu);
    list.appendChild(cardEl);
  });
  wrap.appendChild(list);
  const back = el("button", "btn", "\u2190 Back");
  back.onclick = renderTitle;
  wrap.appendChild(back);
  app.appendChild(wrap);
}

// ======================================================================
// INTERACTIVE LESSON ENGINE
// Step kinds: info | click | trace | input | run  (no timer, no combat)
// ======================================================================
function playLesson(key, onDone, onExit) {
  const L = LESSONS[key];
  if (!L) {
    onDone();
    return;
  }
  state.mode = "lesson";
  // onDone: ran to the end (marks lesson complete). onExit: bailed early via Skip.
  state.lesson = { key, title: L.title, steps: L.steps, index: 0, onDone, onExit: onExit || onDone };
  renderLessonStep();
}

function lessonAdvance() {
  const les = state.lesson;
  if (les.index < les.steps.length - 1) {
    les.index++;
    renderLessonStep();
  } else {
    // Finished the whole lesson -> mark complete (unlocks the boss).
    if (les.key) markLessonComplete(les.key);
    les.onDone();
  }
}

function lessonNextBtn(enabled, lastLabel) {
  const les = state.lesson;
  const last = les.index >= les.steps.length - 1;
  const b = el("button", "btn primary", last ? lastLabel || "Finish \u2714" : "Next \u2192");
  b.disabled = !enabled;
  b.onclick = lessonAdvance;
  return b;
}

function renderLessonStep() {
  const les = state.lesson;
  const step = les.steps[les.index];
  state.current = step; // resize handler redraws arrows if step has memory
  app.innerHTML = "";
  const wrap = el("div", "screen tutorial-screen");

  const head = el("div", "lesson-head");
  head.appendChild(el("div", "stage-num", "\u{1F4D6} " + les.title));
  const right = el("div", "lesson-head-right");
  const back = el("button", "btn tiny", "\u2039 Back");
  back.onclick = () => {
    if (les.index > 0) {
      les.index--;
      renderLessonStep();
    } else {
      // On the first step, Back leaves the lesson (returns to previous screen).
      les.onExit();
    }
  };
  right.appendChild(back);
  right.appendChild(el("div", "lesson-progress", `Step ${les.index + 1} / ${les.steps.length}`));
  const skip = el("button", "btn tiny", "Skip \u203a");
  skip.onclick = () => les.onExit();
  right.appendChild(skip);
  head.appendChild(right);
  wrap.appendChild(head);

  // progress dots
  const dots = el("div", "lesson-dots");
  les.steps.forEach((_, i) => {
    dots.appendChild(el("span", `ldot ${i <= les.index ? "on" : ""}`));
  });
  wrap.appendChild(dots);

  wrap.appendChild(el("div", "story", "\u{1F4DC} " + step.story));
  if (step.code) {
    const c = el("pre", "code");
    c.textContent = step.code.join("\n");
    wrap.appendChild(c);
  }

  const kind = step.kind || "info";
  if (kind === "click") renderStepClick(wrap, step);
  else if (kind === "input") renderStepInput(wrap, step);
  else if (kind === "trace") renderStepTrace(wrap, step);
  else if (kind === "run") renderStepRun(wrap, step);
  else renderStepInfo(wrap, step);

  app.appendChild(wrap);
}

function renderStepInfo(wrap, step) {
  if (step.memory) wrap.appendChild(renderMemory(step.memory));
  if (step.note) wrap.appendChild(el("div", "fb-explain tut-note", step.note));
  wrap.appendChild(lessonNextBtn(true, "Finish \u2714"));
}

function renderStepClick(wrap, step) {
  wrap.appendChild(el("div", "tut-prompt", "\u{1F449} " + step.prompt));
  const fb = el("div", "tut-fb");
  const next = lessonNextBtn(false);
  let done = false;
  const mem = renderMemory(step.memory, {
    clickable: true,
    onClick: (id, cellEl) => {
      if (done) return;
      if (id === step.target) {
        done = true;
        cellEl.classList.add("cell-correct");
        fb.innerHTML = "";
        fb.appendChild(el("div", "con-ok", "\u2705 " + (step.success || "Correct!")));
        if (step.note) fb.appendChild(el("div", "fb-explain tut-note", step.note));
        next.disabled = false;
      } else {
        cellEl.classList.add("shake");
        setTimeout(() => cellEl.classList.remove("shake"), 400);
        fb.innerHTML = "";
        fb.appendChild(el("div", "con-err", "\u274c Not that one. " + (step.hint || "Try again.")));
      }
    },
  });
  wrap.appendChild(mem);
  wrap.appendChild(fb);
  wrap.appendChild(next);
}

function renderStepInput(wrap, step) {
  if (step.memory) wrap.appendChild(renderMemory(step.memory));
  wrap.appendChild(el("div", "tut-prompt", "\u{1F449} " + step.prompt));
  if (step.hint) wrap.appendChild(el("div", "input-hint", "\u{1F4A1} " + step.hint));
  const fb = el("div", "tut-fb");
  const next = lessonNextBtn(false);
  let done = false;
  const row = el("div", "input-row");
  const inp = document.createElement("input");
  inp.className = "code-input";
  inp.type = "text";
  inp.placeholder = step.placeholder || "type C++ here\u2026";
  inp.autocomplete = "off";
  inp.spellcheck = false;
  const check = () => {
    if (done) return;
    if (matchesAccept(inp.value, step.accept)) {
      done = true;
      inp.disabled = true;
      fb.innerHTML = "";
      fb.appendChild(el("div", "con-ok", "\u2705 " + (step.success || "Correct!")));
      if (step.note) fb.appendChild(el("div", "fb-explain tut-note", step.note));
      next.disabled = false;
    } else {
      fb.innerHTML = "";
      fb.appendChild(el("div", "con-err", "\u274c Not quite. " + (step.hint || "Try again.")));
    }
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") check();
  });
  const submit = el("button", "btn primary", "Check");
  submit.onclick = check;
  row.appendChild(inp);
  row.appendChild(submit);
  wrap.appendChild(row);
  wrap.appendChild(fb);
  wrap.appendChild(next);
  setTimeout(() => inp.focus(), 50);
}

function applyTraceStep(mem, memory, st) {
  if (st.set) {
    const v = mem.querySelector(`[data-cell-id="${st.set.cell}"] .cell-val`);
    if (v) {
      v.textContent = st.set.value;
      const cell = v.closest(".cell");
      cell.classList.add("cell-flash");
      setTimeout(() => cell.classList.remove("cell-flash"), 700);
    }
  }
  if (st.free) {
    const mo = memory.find((m) => m.id === st.free);
    if (mo) mo.freed = true;
    const cell = mem.querySelector(`[data-cell-id="${st.free}"]`);
    if (cell) {
      cell.classList.add("freed", "cell-flash");
      if (!st.set) {
        const v = cell.querySelector(".cell-val");
        if (v) v.textContent = "(freed)";
      }
      setTimeout(() => cell.classList.remove("cell-flash"), 700);
    }
    // any pointer aliasing this block now dangles
    memory.forEach((m) => {
      if (m.kind === "ptr" && m.pointsTo === st.free) m.freed = true;
    });
    drawArrows(mem, mem.querySelector(".arrows"), memory);
  }
  if (st.repoint) {
    const mo = memory.find((m) => m.id === st.repoint.cell);
    if (mo) mo.pointsTo = st.repoint.to;
    drawArrows(mem, mem.querySelector(".arrows"), memory);
  }
  if (st.highlight) {
    mem.querySelectorAll(".cell").forEach((c) =>
      c.classList.toggle("cell-highlight", c.dataset.cellId === st.highlight)
    );
  }
}

function renderStepTrace(wrap, step) {
  // clone memory so replays start fresh (trace mutates it)
  const memory = step.memory.map((c) => ({ ...c }));

  const codeBox = el("pre", "code trace-code");
  step.lines.forEach((ln, i) => {
    const l = el("div", "trace-line", ln || "\u00a0");
    l.dataset.line = String(i);
    codeBox.appendChild(l);
  });
  wrap.appendChild(codeBox);

  const mem = renderMemory(memory);
  wrap.appendChild(mem);

  const noteBox = el(
    "div",
    "fb-explain tut-note",
    "Click \u201cStep \u25b6\u201d to run one line at a time and watch memory change."
  );
  wrap.appendChild(noteBox);

  let idx = -1;
  const controls = el("div", "trace-controls");
  const stepBtn = el("button", "btn primary", "Step \u25b6");
  const next = lessonNextBtn(false);
  stepBtn.onclick = () => {
    idx++;
    const st = step.steps[idx];
    codeBox
      .querySelectorAll(".trace-line")
      .forEach((l) => l.classList.toggle("active", Number(l.dataset.line) === st.line));
    applyTraceStep(mem, memory, st);
    noteBox.textContent = st.note || "";
    if (idx >= step.steps.length - 1) {
      stepBtn.disabled = true;
      next.disabled = false;
    }
  };
  controls.appendChild(stepBtn);
  controls.appendChild(next);
  wrap.appendChild(controls);
}

function renderStepRun(wrap, step) {
  wrap.appendChild(el("div", "tut-prompt", "\u{1F449} " + step.prompt));
  wrap.appendChild(
    el("div", "code-goal", "\u{1F3AF} Goal \u2014 make the program print:  " + step.expectedOutput.replace(/\n/g, " \u23ce "))
  );
  if (step.hint) wrap.appendChild(el("div", "input-hint", "\u{1F4A1} " + step.hint));
  const editor = document.createElement("textarea");
  editor.className = "code-editor";
  editor.spellcheck = false;
  editor.value = step.starter;
  editor.rows = Math.min(18, step.starter.split("\n").length + 1);
  const runBtn = el("button", "btn primary run-btn", "\u25b6 Compile & Run");
  const cons = el("pre", "console hidden");
  const fb = el("div", "tut-fb");
  const next = lessonNextBtn(false);
  let done = false;
  runBtn.onclick = () => {
    if (done) return;
    runBtn.disabled = true;
    cons.classList.remove("hidden");
    cons.textContent = "\u23f3 Compiling & running\u2026";
    runCppAsync(editor.value, (res) => {
      if (res.ok && outputsMatch(res.output, step.expectedOutput)) {
        done = true;
        editor.disabled = true;
        cons.innerHTML = "";
        cons.appendChild(el("div", "con-ok", "\u2705 Program output: " + displayOut(res.output)));
        if (step.note) fb.appendChild(el("div", "fb-explain tut-note", step.note));
        next.disabled = false;
      } else {
        runBtn.disabled = false;
        cons.innerHTML = "";
        if (res.error) cons.appendChild(el("div", "con-err", "\u274c " + res.error));
        else {
          cons.appendChild(el("div", "con-err", "Got:  " + displayOut(res.output)));
          cons.appendChild(el("div", "con-exp", "Need: " + displayOut(step.expectedOutput)));
        }
      }
    });
  };
  wrap.appendChild(editor);
  wrap.appendChild(runBtn);
  wrap.appendChild(cons);
  wrap.appendChild(fb);
  wrap.appendChild(next);
}

// ---------- Stage flow ----------
function startStage() {
  const stage = CAMPAIGN[state.stageIndex];
  // Build practice queue (random, no repeats) then mark boss to follow.
  const pool = shuffle(POOLS[stage.pool]).slice(0, stage.practice);
  state.queue = pool;
  state.enemyName = "Corruption Minion";
  state.enemyGlyph = "\u{1F47E}";
  state.enemyColor = "#7dd3fc";
  // Minion HP scales so ~practice count of hits clears it.
  state.enemyMaxHp = 44;
  state.enemyHp = state.enemyMaxHp;
  renderStageIntro(stage);
}

function startPractice() {
  state.mode = "practice";
  nextEncounter();
}

function renderStageIntro(stage) {
  app.innerHTML = "";
  const wrap = el("div", "screen intro-screen");
  wrap.appendChild(el("div", "stage-num", `Stage ${state.stageIndex + 1} of ${CAMPAIGN.length}`));
  wrap.appendChild(el("h2", null, stage.title));
  const lesson = LESSONS[stage.pool];
  wrap.appendChild(
    el(
      "p",
      "subtitle",
      lesson
        ? `New concept: ${lesson.title}. Learn it hands-on, then face the ${BOSSES[stage.boss].name}.`
        : `Face the ${BOSSES[stage.boss].name}.`
    )
  );
  if (lesson) {
    const learn = el("button", "btn primary", "\u{1F4D6} Learn this concept");
    learn.onclick = () => playLesson(stage.pool, startPractice);
    wrap.appendChild(learn);
    const skip = el("button", "btn", "\u2694\ufe0f Skip lesson \u2014 to practice");
    skip.onclick = startPractice;
    wrap.appendChild(skip);
  } else {
    const btn = el("button", "btn primary", "Enter");
    btn.onclick = startPractice;
    wrap.appendChild(btn);
  }
  app.appendChild(wrap);
}

function nextEncounter() {
  if (state.queue.length > 0) {
    state.current = state.queue.shift();
    renderBattle();
  } else if (state.mode === "practice") {
    // Boss is SEALED until this stage's lesson has been completed once.
    const stage = CAMPAIGN[state.stageIndex];
    if (LESSONS[stage.pool] && !state.lessonsCompleted[stage.pool]) {
      renderBossGate(stage);
    } else {
      startBoss();
    }
  } else if (state.mode === "boss") {
    // Boss defeated.
    stageCleared();
  }
}

function renderBossGate(stage) {
  clearTimer();
  const boss = BOSSES[stage.boss];
  app.innerHTML = "";
  const wrap = el("div", "screen intro-screen");
  wrap.appendChild(el("div", "boss-glyph-big", "\u{1F512}"));
  wrap.appendChild(el("h2", "boss-name", `${boss.name} is sealed`));
  wrap.appendChild(
    el(
      "p",
      "subtitle",
      `You must complete the lesson \u201c${LESSONS[stage.pool].title}\u201d before you can challenge this boss.`
    )
  );
  const learn = el("button", "btn primary", "\u{1F4D6} Complete the lesson to unlock");
  // Finishing unlocks & starts the boss; skipping returns to the sealed gate.
  learn.onclick = () => playLesson(stage.pool, startBoss, () => renderBossGate(stage));
  wrap.appendChild(learn);
  app.appendChild(wrap);
}

function startBoss() {
  const stage = CAMPAIGN[state.stageIndex];
  const boss = BOSSES[stage.boss];
  state.mode = "boss";
  state.enemyName = boss.name;
  state.enemyGlyph = boss.glyph;
  state.enemyColor = boss.color;
  state.enemyMaxHp = boss.hp;
  state.enemyHp = boss.hp;
  // Random subset of phases so each fight varies between playthroughs.
  state.queue = shuffle(boss.phases).slice(0, Math.min(BOSS_PHASES, boss.phases.length));
  // Boss intro screen
  app.innerHTML = "";
  const wrap = el("div", "screen intro-screen boss-intro");
  wrap.appendChild(el("div", "boss-glyph-big", boss.glyph));
  wrap.appendChild(el("h2", "boss-name", boss.name));
  wrap.appendChild(el("p", "subtitle", boss.intro));
  const btn = el("button", "btn danger", "Fight!");
  btn.onclick = nextEncounter;
  wrap.appendChild(btn);
  app.appendChild(wrap);
}

function renderBattle() {
  const s = state.current;
  state.answered = false;
  state.hintUsed = false;
  app.innerHTML = "";

  app.appendChild(renderHUD());

  const arena = el("div", "arena");

  // Enemy panel
  const enemy = el("div", "enemy");
  const glyph = el("div", "enemy-glyph", state.enemyGlyph);
  glyph.style.color = state.enemyColor;
  enemy.appendChild(glyph);
  enemy.appendChild(el("div", "enemy-name", state.enemyName));
  const ehpWrap = el("div", "bar enemy-hp");
  const ehpFill = el("div", "bar-fill enemy-fill");
  ehpFill.style.width = `${(state.enemyHp / state.enemyMaxHp) * 100}%`;
  ehpWrap.appendChild(ehpFill);
  ehpWrap.appendChild(el("span", "bar-label", `${state.enemyHp}/${state.enemyMaxHp}`));
  enemy.appendChild(ehpWrap);
  arena.appendChild(enemy);

  // Puzzle panel
  const puzzle = el("div", "puzzle");
  puzzle.appendChild(el("div", "story", "\u{1F4DC} " + s.story));

  // Code scroll (skipped for editable "code" challenges)
  if (s.code) {
    const code = el("pre", "code");
    code.textContent = s.code.join("\n");
    puzzle.appendChild(code);
  }

  // Memory diagram (optional)
  if (s.memory) puzzle.appendChild(renderMemory(s.memory));

  // Elapsed stopwatch (counts UP; no limit — faster answers earn bigger bonuses)
  const sw = el("div", "stopwatch");
  sw.appendChild(el("span", "sw-label", "\u23f1 0.0s"));
  sw.appendChild(el("span", "sw-bonus", ""));
  puzzle.appendChild(sw);

  // Question
  puzzle.appendChild(el("div", "question", s.question));

  // Answer input: real C++ editor, free-text expression, or multiple choice.
  if (s.type === "code") {
    const wrapC = el("div", "code-answer");
    if (s.prompt) wrapC.appendChild(el("div", "code-prompt", s.prompt));
    wrapC.appendChild(
      el("div", "code-goal", "\u{1F3AF} Goal \u2014 make the program print:  " + s.expectedOutput.replace(/\n/g, " \u23ce "))
    );
    const editor = document.createElement("textarea");
    editor.className = "code-editor";
    editor.spellcheck = false;
    editor.value = s.starter;
    editor.rows = Math.min(18, s.starter.split("\n").length + 1);
    wrapC.appendChild(editor);
    const runBtn = el("button", "btn primary run-btn", "\u25b6 Compile & Run");
    runBtn.onclick = runCodeAttempt;
    wrapC.appendChild(runBtn);
    wrapC.appendChild(el("pre", "console hidden"));
    puzzle.appendChild(wrapC);
  } else if (s.type === "input") {
    const form = el("div", "input-answer");
    const row = el("div", "input-row");
    const inp = document.createElement("input");
    inp.className = "code-input";
    inp.type = "text";
    inp.placeholder = s.placeholder || "type C++ here\u2026";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") resolveInput(inp.value);
    });
    const submit = el("button", "btn primary", "Cast \u2694\ufe0f");
    submit.onclick = () => resolveInput(inp.value);
    row.appendChild(inp);
    row.appendChild(submit);
    form.appendChild(row);
    puzzle.appendChild(form);
    setTimeout(() => inp.focus(), 50);
  } else {
    const choices = el("div", "choices");
    s.choices.forEach((choice, i) => {
      const b = el("button", "btn choice", choice);
      b.onclick = () => resolveAnswer(i);
      choices.appendChild(b);
    });
    puzzle.appendChild(choices);
  }

  // Hint (optional — costs points)
  const hintWrap = el("div", "hint-wrap");
  const hintBtn = el(
    "button",
    "btn tiny hint-btn",
    `\u{1F4A1} Show hint (\u2212${Math.round((1 - HINT_PENALTY) * 100)}% points)`
  );
  const hintText = el("div", "hint-text hidden");
  hintBtn.onclick = () => {
    if (state.answered) return;
    state.hintUsed = true;
    hintText.textContent = "\u{1F4A1} " + getHint(s);
    hintText.classList.remove("hidden");
    hintBtn.disabled = true;
  };
  hintWrap.appendChild(hintBtn);
  hintWrap.appendChild(hintText);
  puzzle.appendChild(hintWrap);

  // Feedback slot
  puzzle.appendChild(el("div", "feedback hidden"));

  arena.appendChild(puzzle);
  app.appendChild(arena);

  startTimer();
}

// ---------- Free-text answer checking ----------
function normalizeCode(str) {
  return String(str).toLowerCase().replace(/\s+/g, "").replace(/;+$/, "");
}
function matchesAccept(value, accept) {
  const v = normalizeCode(value);
  return (accept || []).some((a) => normalizeCode(a) === v);
}
// ---------- Real C++ execution (JSCPP in a sandboxed Web Worker) ----------
// A watchdog terminates runaway code (e.g. infinite loops) so the tab
// never freezes. No network / no API calls — pure client-side interpreter.
function runCppAsync(code, cb) {
  let done = false;
  let worker = null;
  let wd = null;
  const finish = (res) => {
    if (done) return;
    done = true;
    clearTimeout(wd);
    if (worker) worker.terminate();
    cb(res);
  };
  try {
    worker = new Worker("src/cpp-worker.js");
  } catch (e) {
    cb({ ok: false, output: "", error: "Could not start C++ runner: " + e.message });
    return;
  }
  wd = setTimeout(
    () => finish({ ok: false, output: "", error: "Execution timed out (possible infinite loop)." }),
    3000
  );
  worker.onmessage = (e) => finish(e.data);
  worker.onerror = (e) => finish({ ok: false, output: "", error: e.message || "Runtime error." });
  worker.postMessage({ code });
}

function outputsMatch(a, b) {
  const norm = (s) =>
    String(s).replace(/\r/g, "").split("\n").map((x) => x.replace(/\s+$/, "")).join("\n").trim();
  return norm(a) === norm(b);
}
const displayOut = (s) => JSON.stringify(String(s));

function runCodeAttempt() {
  if (state.answered) return;
  const editor = $(".code-editor");
  const runBtn = $(".run-btn");
  const cons = $(".console");
  runBtn.disabled = true;
  cons.classList.remove("hidden");
  cons.textContent = "\u23f3 Compiling & running\u2026";
  runCppAsync(editor.value, (res) => {
    if (state.answered) return;
    const s = state.current;
    if (res.ok && outputsMatch(res.output, s.expectedOutput)) {
      cons.innerHTML = "";
      cons.appendChild(el("div", "con-ok", "\u2705 Program output: " + displayOut(res.output)));
      finishAnswer(true, false);
    } else {
      runBtn.disabled = false;
      cons.innerHTML = "";
      if (res.error) {
        cons.appendChild(el("div", "con-err", "\u274c " + res.error));
      } else {
        cons.appendChild(el("div", "con-err", "Got:  " + displayOut(res.output)));
        cons.appendChild(el("div", "con-exp", "Need: " + displayOut(s.expectedOutput)));
      }
      cons.appendChild(el("div", "con-hint", "Fix it and Run again \u2014 take all the time you need."));
    }
  });
}

// ---------- Stopwatch (counts elapsed; no time limit) ----------
const nowSec = () => performance.now() / 1000;

function getElapsed() {
  return state.swAccum + (state.swRunning ? nowSec() - state.swStart : 0);
}

// Speed bonus: 1.0 (full) at/under SPEED_FAST, fading to 0 by SPEED_SLOW.
// Never negative — slow answers simply earn no bonus, no penalty.
function speedFactor(elapsed) {
  if (elapsed <= SPEED_FAST) return 1;
  if (elapsed >= SPEED_SLOW) return 0;
  return 1 - (elapsed - SPEED_FAST) / (SPEED_SLOW - SPEED_FAST);
}

function startTimer() {
  clearTimer();
  state.swAccum = 0;
  state.swStart = nowSec();
  state.swRunning = true;
  updateTimerUI();
  state.timerId = setInterval(updateTimerUI, 100);
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.swRunning = false;
}

function pauseTimer() {
  if (state.swRunning) {
    state.swAccum += nowSec() - state.swStart;
    state.swRunning = false;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.paused = true;
  }
}
function resumeTimer() {
  if (state.paused) {
    state.paused = false;
    if (!state.answered && (state.mode === "practice" || state.mode === "boss")) {
      state.swStart = nowSec();
      state.swRunning = true;
      state.timerId = setInterval(updateTimerUI, 100);
    }
  }
}

// ---------- Glossary / reference card (openable any time) ----------
function openGlossary() {
  if (document.getElementById("glossary-modal")) return;
  pauseTimer(); // fair: no time pressure while reading the reference
  const overlay = el("div", "modal-overlay");
  overlay.id = "glossary-modal";
  overlay.onclick = (e) => {
    if (e.target === overlay) closeGlossary();
  };
  const card = el("div", "modal-card");
  const head = el("div", "modal-head");
  head.appendChild(el("h2", "modal-title", "\u{1F4D6} Glossary & Syntax"));
  const x = el("button", "btn tiny", "\u2715 Close");
  x.onclick = closeGlossary;
  head.appendChild(x);
  card.appendChild(head);
  if (state.paused && (state.mode === "practice" || state.mode === "boss")) {
    card.appendChild(el("div", "modal-note", "\u23f8 Timer paused while this is open."));
  }
  const list = el("div", "gloss-list");
  GLOSSARY.forEach((g) => {
    const item = el("div", "gloss-item");
    item.appendChild(el("div", "gloss-term", g.term));
    item.appendChild(el("div", "gloss-def", g.def));
    if (g.syntax) {
      const s = el("pre", "gloss-syntax");
      s.textContent = g.syntax;
      item.appendChild(s);
    }
    list.appendChild(item);
  });
  card.appendChild(list);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
function closeGlossary() {
  const m = document.getElementById("glossary-modal");
  if (m) m.remove();
  resumeTimer();
}

function updateTimerUI() {
  const e = getElapsed();
  const label = $(".sw-label");
  if (label) label.textContent = `\u23f1 ${e.toFixed(1)}s`;
  const chip = $(".sw-bonus");
  if (chip) {
    const f = speedFactor(e);
    chip.textContent = f > 0 ? `\u26a1 speed bonus +${Math.round(f * 50)}%` : "no speed bonus";
    chip.classList.toggle("dim", f <= 0);
  }
  const hudT = $(".hud-timer");
  if (hudT) hudT.textContent = `\u23f1 Time on problem: ${e.toFixed(1)}s`;
}

function resolveAnswer(i) {
  if (state.answered) return;
  const s = state.current;
  const timedOut = i === -1;
  const correct = !timedOut && i === s.answer;
  // Lock choices, mark right/wrong.
  const choicesWrap = $(".choices");
  if (choicesWrap) {
    Array.from(choicesWrap.children).forEach((c, idx) => {
      c.disabled = true;
      if (idx === s.answer) c.classList.add("correct");
      if (idx === i && !correct) c.classList.add("wrong");
    });
  }
  finishAnswer(correct, timedOut);
}

function resolveInput(value) {
  if (state.answered) return;
  const s = state.current;
  const timedOut = value === null;
  const correct = !timedOut && matchesAccept(value, s.accept);
  const inp = $(".code-input");
  if (inp) inp.disabled = true;
  finishAnswer(correct, timedOut);
}

function finishAnswer(correct, timedOut) {
  state.answered = true;
  const elapsed = getElapsed();
  clearTimer();
  const s = state.current;
  const timeFrac = speedFactor(elapsed); // 0..1 speed bonus, based on how fast you answered

  // Record lifetime stats for the dashboard.
  state.stats.answered++;
  state.stats.timeSpent += elapsed;
  if (state.hintUsed) state.stats.hintsUsed++;
  if (correct) state.stats.correct++;
  const cat = s.category;
  if (!state.stats.byCat[cat]) state.stats.byCat[cat] = { answered: 0, correct: 0 };
  state.stats.byCat[cat].answered++;
  if (correct) state.stats.byCat[cat].correct++;

  // Disable any answer widgets still active.
  document
    .querySelectorAll(".code-editor, .run-btn, .code-input")
    .forEach((e) => (e.disabled = true));

  const fb = $(".feedback");
  fb.classList.remove("hidden");
  fb.innerHTML = "";

  if (correct) {
    state.streak++;
    if (state.streak > state.stats.bestStreak) state.stats.bestStreak = state.streak;
    state.mastery[s.category] = (state.mastery[s.category] || 0) + 1;
    // Speed boosts damage up to +50%.
    const dmg = Math.round(damageFor(s) * (1 + timeFrac * 0.5));
    state.enemyHp = Math.max(0, state.enemyHp - dmg);
    // Score: difficulty base + speed bonus, amplified by streak.
    let pts = Math.round(
      (100 * s.difficulty + 120 * timeFrac) * (1 + Math.min(state.streak - 1, 5) * 0.1)
    );
    let hintNote = "";
    if (state.hintUsed) {
      pts = Math.round(pts * HINT_PENALTY);
      hintNote = `  \u{1F4A1} hint \u2212${Math.round((1 - HINT_PENALTY) * 100)}%`;
    }
    state.score += pts;
    gainXp(10 + s.difficulty * 4);
    flashEnemy(true, dmg);
    const speedNote = timeFrac > 0 ? `  \u26a1 +${Math.round(timeFrac * 50)}% speed` : "";
    fb.appendChild(
      el(
        "div",
        "fb-result hit",
        `\u2694\ufe0f Correct in ${elapsed.toFixed(1)}s! You deal ${dmg} damage.  +${pts} pts` +
          speedNote +
          hintNote +
          (state.streak > 1 ? `  \u{1F525} Streak x${state.streak}` : "")
      )
    );
  } else {
    state.streak = 0;
    const dmg = 12 + s.difficulty * 4;
    state.hp = Math.max(0, state.hp - dmg);
    flashEnemy(false, dmg);
    fb.appendChild(
      el("div", "fb-result miss", `\u{1F480} Not quite. The corruption hits you for ${dmg}.`)
    );
  }

  fb.appendChild(el("div", "fb-explain", s.explain));

  // Update HUD bars live.
  refreshBars();

  const cont = el("button", "btn primary", "Continue");
  cont.onclick = afterAnswer;
  fb.appendChild(cont);
}

function afterAnswer() {
  saveProfile(); // persist XP / level / mastery / score after every answer
  if (state.hp <= 0) {
    renderGameOver();
    return;
  }
  if (state.enemyHp <= 0) {
    // Enemy defeated — clear rest of this segment's queue.
    state.queue = [];
    nextEncounter();
    return;
  }
  nextEncounter();
}

function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= state.xpNeeded) {
    state.xp -= state.xpNeeded;
    state.level++;
    state.xpNeeded = Math.round(state.xpNeeded * 1.4);
    state.maxHp += 15;
    state.hp = state.maxHp; // level up heals fully
  }
}

function refreshBars() {
  // Re-render HUD in place (simplest reliable approach).
  const oldHud = $(".hud");
  if (oldHud) oldHud.replaceWith(renderHUD());
  const ef = $(".enemy-fill");
  if (ef) {
    ef.style.width = `${(state.enemyHp / state.enemyMaxHp) * 100}%`;
    const lbl = ef.parentElement.querySelector(".bar-label");
    if (lbl) lbl.textContent = `${state.enemyHp}/${state.enemyMaxHp}`;
  }
}

function flashEnemy(hit, dmg) {
  const enemy = $(".enemy");
  if (!enemy) return;
  enemy.classList.add(hit ? "shake" : "pulse");
  const float = el("div", `float-dmg ${hit ? "dmg" : "heal"}`, (hit ? "-" : "+") + dmg);
  enemy.appendChild(float);
  setTimeout(() => enemy.classList.remove("shake", "pulse"), 400);
  setTimeout(() => float.remove(), 900);
}

function stageCleared() {
  state.stageIndex++;
  saveProfile(); // persist stage progress
  if (state.stageIndex >= CAMPAIGN.length) {
    renderVictory();
  } else {
    app.innerHTML = "";
    const wrap = el("div", "screen intro-screen");
    wrap.appendChild(el("div", "stage-num", "\u2728 Boss Defeated!"));
    wrap.appendChild(el("h2", null, `${BOSSES[CAMPAIGN[state.stageIndex - 1].boss].name} vanquished.`));
    wrap.appendChild(el("p", "subtitle", `You are Level ${state.level}. The next realm awaits.`));
    wrap.appendChild(renderSkillTree());
    const btn = el("button", "btn primary", "Onward");
    btn.onclick = startStage;
    wrap.appendChild(btn);
    app.appendChild(wrap);
  }
}

function renderVictory() {
  app.innerHTML = "";
  const wrap = el("div", "screen title-screen");
  wrap.appendChild(el("h1", "big-title", "\u{1F3C6} Realm Restored!"));
  wrap.appendChild(
    el("p", "subtitle", `You defeated all ${CAMPAIGN.length} Corruption Bosses at Level ${state.level}.`)
  );
  wrap.appendChild(el("div", "final-score", `\u2b50 Final Score: ${state.score}`));
  const card = el("div", "how-card");
  card.appendChild(el("h3", null, "You mastered:"));
  card.appendChild(renderSkillTree());
  card.appendChild(
    el("p", "recap", "Pointers store addresses (&). Dereference (*) follows them. `new` allocates on the heap and must be paired with `delete`. Guard against nullptr, dangling pointers, leaks, and double frees.")
  );
  wrap.appendChild(card);
  const btn = el("button", "btn primary", "Play Again");
  btn.onclick = () => location.reload();
  wrap.appendChild(btn);
  app.appendChild(wrap);
}

function renderGameOver() {
  app.innerHTML = "";
  const wrap = el("div", "screen title-screen");
  wrap.appendChild(el("h1", "big-title", "\u{1F480} Corrupted..."));
  wrap.appendChild(el("p", "subtitle", "Your HP hit zero. But every mage learns from a fall."));
  const btn = el("button", "btn primary", "Retry Stage");
  btn.onclick = () => {
    state.hp = state.maxHp;
    startStage();
  };
  wrap.appendChild(btn);
  const btn2 = el("button", "btn", "Restart Quest");
  btn2.onclick = () => location.reload();
  wrap.appendChild(btn2);
  app.appendChild(wrap);
}

// Redraw arrows on resize so they stay attached to cells.
window.addEventListener("resize", () => {
  const wrap = document.querySelector(".memwrap");
  const svg = wrap && wrap.querySelector(".arrows");
  if (wrap && svg && state.current && state.current.memory)
    drawArrows(wrap, svg, state.current.memory);
});

// Esc closes the glossary.
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGlossary();
});

// Persistent floating Glossary button (available on every screen).
function mountGlossaryButton() {
  const fab = el("button", "glossary-fab", "\u{1F4D6} Glossary");
  fab.title = "Open the glossary / reference card (pauses the stopwatch in battle)";
  fab.onclick = openGlossary;
  document.body.appendChild(fab);
}

// Persistent floating "Back to Menu" button.
function goToMenu() {
  const inPlay =
    state.mode === "practice" || state.mode === "boss" || state.mode === "lesson";
  if (
    inPlay &&
    !confirm(
      "Return to the main menu? Your progress is saved, but this fight/lesson won't resume where you left off."
    )
  )
    return;
  closeGlossary();
  clearTimer();
  state.answered = true; // cancel any pending answer/run callbacks
  renderTitle();
}
function mountMenuButton() {
  const fab = el("button", "menu-fab", "\u{1F3E0} Menu");
  fab.title = "Return to the main menu (progress is saved)";
  fab.onclick = goToMenu;
  document.body.appendChild(fab);
}

// Boot: restore the last active profile (if any), then show the title.
function boot() {
  if (HAS_STORAGE) {
    const current = localStorage.getItem(CURRENT_KEY);
    const profs = loadProfiles();
    if (current && profs[current]) selectProfile(current);
  }
  mountGlossaryButton();
  mountMenuButton();
  renderTitle();
}

boot();
