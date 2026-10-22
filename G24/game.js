/* =====================================================================
   KALEIDOSCOPE: An Educational RPG
   Debugging JRPG. Data-driven, multi-question insect battles.
   ===================================================================== */

/* ---------- Pixel-art sprites ----------
   ' ' transparent | '#' outline | 'o' mid | 'O' bright | 'x' white eye
   Rows auto-pad, so they need not be equal length.
------------------------------------------------------------------------ */
const OUTLINE = "#081019";

/* The Debugger (player) — a woman in brown leather, 3/4 view turned toward the enemy */
const HERO_MAP = [
  "     #####      ",
  "    #kkkkk#     ",
  "   #kkkkkkk#    ",
  "   #kkkKKkss    ",
  "   #kkkKkssss   ",
  "   #kkkksseeS   ",
  "   #kkkksseen   ",
  "   #kkkkssssn   ",
  "    #kkk#sss    ",
  "    #kk#Sss     ",
  "    #kkccbc     ",
  "    #kccbbc     ",
  "    #cbbaabc    ",
  "   #cbbaaabc    ",
  "   #cbaimiab    ",
  "   #baaammab    ",
  "  #gbaaamaaGb   ",
  "   #baaamaab    ",
  "   #baaamaab    ",
  "   #baaamaab    ",
  "   #pppp#pp     ",
  "   #ppp# #p     ",
  "   #pp#  #p     ",
  "  #oOO#  #oO    ",
  "  #ooo#  #oo    ",
];
const HERO_PAL = {
  " ": null, "#": "#100a08",
  "k": "#2e1c12",  // hair dark
  "K": "#5a3a22",  // hair light
  "s": "#e6b48c",  // skin
  "S": "#c58a63",  // skin shadow
  "e": "#241610",  // eyes
  "n": "#d9a877",  // nose highlight
  "a": "#3a2416",  // leather dark
  "b": "#5c3a22",  // leather mid
  "c": "#8a5a34",  // leather light
  "i": "#c8a06a",  // inner shirt
  "m": "#d9b45a",  // belt / buckle
  "g": "#4a2e1a",  // glove (back arm)
  "G": "#7a5230",  // glove (front hand, reaching)
  "p": "#2a1c12",  // trousers
  "o": "#241610",  // boots
  "O": "#4a3020",  // boot highlight
};
const HERO_SIZE = 5;

/* Three insects. Colors expand beyond blue where it helps readability.
   Order aligns with ENCOUNTERS: [0] MOTH  [1] STAG-BEETLE  [2] APHID(boss) */
const CREATURES = [
  { // MOTH - broad shaded wings, antennae, twin eyes (easy first foe)
    name: "moth",
    size: 8,
    map: [
      "    4         4    ",
      "     3       3     ",
      "     2#12321#2     ",
      "  333 #12321# 333  ",
      " 34443#12321#34443 ",
      "344o43#1epe1#34o443",
      "3444o3#12321#3o4443",
      "34o443#12321#344o43",
      "344443#12321#344443",
      " 34443#12321#34443 ",
      "  333 #12321# 333  ",
      "   33 #12321# 33   ",
      "    3 #12321# 3    ",
      "      #12321#      ",
      "      #12321#      ",
      "      #12221#      ",
      "      #11111#      ",
      "      #11111#      ",
    ],
    pal: { " ": null, "#": "#0a0e18", "1": "#3a3050", "2": "#5a4f80", "3": "#7a6aa0", "4": "#a99cd0", "5": "#d6ccf0", "o": "#4a4066", "e": "#eaf4ff", "p": "#20304a" },
  },
  { // STAG-BEETLE - antler mandibles, glossy shaded brown shell (elite)
    name: "stag-beetle",
    size: 7,
    map: [
      "  5             5  ",
      "  55           55  ",
      "   #5         5#   ",
      "    #5       5#    ",
      "     #5     5#     ",
      "      #5 5 5#      ",
      "       #131#       ",
      "      #13331#      ",
      "     #1e3p3e1#     ",
      "    #133333331#    ",
      "   #1333k3k3331#   ",
      "  1#133k3k3k331#1  ",
      "  1#1334k4k4331#1  ",
      "   #13334k43331#   ",
      "  1#1333k3k3331#1  ",
      "  1#13334343331#1  ",
      "   #13333333331#   ",
      "    #133232331#    ",
      "     #1333331#     ",
      "      #11111#      ",
    ],
    pal: { " ": null, "#": "#0a0f16", "1": "#3a2a18", "2": "#5a3f24", "3": "#7a5636", "4": "#a5794a", "5": "#caa06a", "e": "#eaf4ff", "p": "#101820", "k": "#241a10" },
  },
  { // APHID - shaded pear body, six legs, cornicles, glowing red eyes (final boss)
    name: "aphid",
    size: 7,
    map: [
      "    l             l    ",
      "     l           l     ",
      "      l         l      ",
      "       l       l       ",
      "      #222222222#      ",
      "     #22333333322#     ",
      "    #2233333333322#    ",
      "   #23ep3333333pe32#   ",
      "  #23333333333333332#  ",
      "l #23333444444433332# l",
      "l #23344444444444332# l",
      "l #23444544444544432# l",
      "l #23344444444444332# l",
      "l #23333333333333332# l",
      " #2233333333333333322# ",
      " #2233333333333333322# ",
      "  #22233333233333222#  ",
      "  5#222222222222222#5  ",
      "   #222222222222222#   ",
      "    #2222222222222#    ",
    ],
    pal: { " ": null, "#": "#0a2214", "1": "#1f5a30", "2": "#39813f", "3": "#5fbf6a", "4": "#8fe07a", "5": "#c8f5a0", "e": "#ff5c5c", "p": "#5a0f14", "l": "#2a6a38" },
  },
];

/* ---------- Encounters: escalating difficulty ----------
   MOTH (easy, 3) -> STAG-BEETLE (elite, 4) -> APHID (final boss, 5)
----------------------------------------------------------------------- */
const ENCOUNTERS = [
  {
    name: "MOTH",
    tier: "EASY",
    playerDmg: 20,
    questions: [
      {
        lang: "// equality \u2014 assign vs compare",
        code: `function isAdmin(user) {\n  if (user.role = "admin") return true;\n  return false;\n}`,
        question: "Everyone becomes admin. Why?",
        choices: [
          { text: "Use === to compare, not =", correct: true },
          { text: "Return user instead of true", correct: false },
          { text: "Remove the else branch", correct: false },
          { text: "Rename the variable", correct: false },
        ],
        explain: "= assigns (truthy) instead of comparing. Use === to compare.",
      },
      {
        lang: "// equality \u2014 type coercion",
        code: `if (userInput == 0) {\n  reset();\n}`,
        question: `userInput is "" and this wrongly fires. Fix it.`,
        choices: [
          { text: "Use === for strict equality", correct: true },
          { text: "Use != instead", correct: false },
          { text: "Wrap in String()", correct: false },
          { text: "Compare to '0'", correct: false },
        ],
        explain: `== coerces types, so "" == 0 is true. === avoids surprise coercion.`,
      },
      {
        lang: "// null \u2014 guard input",
        code: `function greet(user) {\n  return "Hi, " + user.name;\n}\ngreet(null); // throws`,
        question: "greet(null) crashes. Safest fix?",
        choices: [
          { text: "Guard: if (!user) return 'Hi, guest'", correct: true },
          { text: "user.name.toUpperCase()", correct: false },
          { text: "Wrap the whole app in try", correct: false },
          { text: "Delete the null call", correct: false },
        ],
        explain: "Reading .name off null throws. Guard the input first.",
      },
      {
        lang: "// logic \u2014 nullish default",
        code: `function getPort(cfg) {\n  return cfg.port || 8080;\n}\ngetPort({ port: 0 }); // wanted 0, got 8080`,
        question: "A configured port of 0 is ignored. Fix it.",
        choices: [
          { text: "Use cfg.port ?? 8080", correct: true },
          { text: "Use cfg.port && 8080", correct: false },
          { text: "Return 8080 always", correct: false },
          { text: "Use Number(cfg.port) || 8080", correct: false },
        ],
        explain: "0 is falsy, so || replaces it. ?? only falls back on null/undefined.",
      },
    ],
  },
  {
    name: "STAG-BEETLE",
    tier: "ELITE",
    playerDmg: 28,
    questions: [
      {
        lang: "// loops \u2014 no progress",
        code: `let i = 0;\nwhile (i < 5) {\n  console.log(i);\n}`,
        question: "Freezes forever. Fix the loop.",
        choices: [
          { text: "Add i++ inside the loop", correct: true },
          { text: "Change while to if", correct: false },
          { text: "Set i = 5 before the loop", correct: false },
          { text: "Log after the loop", correct: false },
        ],
        explain: "i never changes, so i < 5 stays true. Increment i to exit.",
      },
      {
        lang: "// loops \u2014 wrong direction",
        code: `for (let i = 10; i > 0; i++) {\n  step();\n}`,
        question: "Never ends. What's wrong?",
        choices: [
          { text: "i++ should be i-- to reach 0", correct: true },
          { text: "Start i at 0", correct: false },
          { text: "Use i >= 0", correct: false },
          { text: "Call step() twice", correct: false },
        ],
        explain: "Counting up while waiting to drop below 0 never terminates. Use i--.",
      },
      {
        lang: "// loops \u2014 recursion base case",
        code: `function count(n) {\n  return n + count(n - 1);\n}`,
        question: "Recurses until the stack overflows. Fix it.",
        choices: [
          { text: "Add: if (n === 0) return 0;", correct: true },
          { text: "Return count(n + 1)", correct: false },
          { text: "Make n global", correct: false },
          { text: "Wrap in a while loop", correct: false },
        ],
        explain: "Recursion needs a base case that stops the calls.",
      },
      {
        lang: "// mutation \u2014 shared array",
        code: `function add(list, item) {\n  list.push(item);\n  return list;\n}\n// same base reused -> results bleed`,
        question: "Results bleed between calls. Fix it.",
        choices: [
          { text: "Copy first: [...list], then push", correct: true },
          { text: "push twice on purpose", correct: false },
          { text: "Rename list to items", correct: false },
          { text: "Return item instead", correct: false },
        ],
        explain: "push mutates the shared array. Copy it ([...list]) first.",
      },
      {
        lang: "// loops \u2014 for...in vs for...of",
        code: `const nums = [10, 20, 30];\nfor (const x in nums) {\n  console.log(x); // logs 0, 1, 2\n}`,
        question: "You wanted the values but got 0, 1, 2. Fix the loop.",
        choices: [
          { text: "Use for (const x of nums)", correct: true },
          { text: "Log x + 1 instead", correct: false },
          { text: "Use while (x in nums)", correct: false },
          { text: "Swap to nums.map(x => x)", correct: false },
        ],
        explain: "for...in iterates keys/indexes. for...of iterates the values.",
      },
    ],
  },
  {
    name: "APHID",
    tier: "FINAL BOSS",
    playerDmg: 35,
    questions: [
      {
        lang: "// arrays \u2014 indexing",
        code: `function lastItem(arr) {\n  return arr[arr.length];\n}`,
        question: "Always returns undefined. Fix it.",
        choices: [
          { text: "arr[arr.length - 1]", correct: true },
          { text: "arr[arr.length + 1]", correct: false },
          { text: "arr[length - 1]", correct: false },
          { text: "arr[0]", correct: false },
        ],
        explain: "Arrays are 0-indexed \u2014 the last index is length - 1.",
      },
      {
        lang: "// arrays \u2014 map return value",
        code: `const doubled = arr.map(n => { n * 2 });\n// doubled is [undefined, undefined, ...]`,
        question: "map produces all undefined. Fix it.",
        choices: [
          { text: "n => n * 2  (remove the braces)", correct: true },
          { text: "n => { n * 2; }", correct: false },
          { text: "arr.forEach(n => n * 2)", correct: false },
          { text: "n => [n * 2]", correct: false },
        ],
        explain: "A { } arrow body needs an explicit return. Drop the braces for implicit return.",
      },
      {
        lang: "// equality \u2014 NaN",
        code: `if (result === NaN) {\n  return "not a number";\n}`,
        question: "This check never triggers. Fix it.",
        choices: [
          { text: "Number.isNaN(result)", correct: true },
          { text: "result == NaN", correct: false },
          { text: "result === 'NaN'", correct: false },
          { text: "!result", correct: false },
        ],
        explain: "NaN is never equal to anything, even itself. Use Number.isNaN().",
      },
      {
        lang: "// scope \u2014 closure in a loop",
        code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n// logs 3, 3, 3`,
        question: "Prints 3 3 3 instead of 0 1 2. Fix it.",
        choices: [
          { text: "Use let i instead of var i", correct: true },
          { text: "Log i - 1", correct: false },
          { text: "Remove the setTimeout", correct: false },
          { text: "Start i at -1", correct: false },
        ],
        explain: "var is function-scoped, so every callback shares one i. let makes a fresh binding per iteration.",
      },
      {
        lang: "// mutation \u2014 splice vs slice",
        code: `const rest = arr.splice(1);\nreturn rest; // but arr itself got mutated!`,
        question: "You wanted a copy, but arr was modified. Fix it.",
        choices: [
          { text: "Use arr.slice(1)", correct: true },
          { text: "Use arr.splice(0)", correct: false },
          { text: "Use arr.split(1)", correct: false },
          { text: "Use arr.slice().splice(1)", correct: false },
        ],
        explain: "splice() mutates the array in place. slice() returns a copy and leaves the original alone.",
      },
      {
        lang: "// arrays \u2014 numeric sort",
        code: `const r = [1, 2, 10].sort();\nconsole.log(r); // [1, 10, 2]`,
        question: "Numbers sort in the wrong order. Fix it.",
        choices: [
          { text: "sort((a, b) => a - b)", correct: true },
          { text: "sort((a, b) => a > b)", correct: false },
          { text: "sort().reverse()", correct: false },
          { text: `sort("asc")`, correct: false },
        ],
        explain: "Default sort compares items as strings. Pass (a, b) => a - b for numeric order.",
      },
      {
        lang: "// mutation \u2014 shallow copy",
        code: `const copy = { ...user };\ncopy.address.city = "NYC";\n// user.address.city changed too!`,
        question: "Editing the copy changed the original. Why?",
        choices: [
          { text: "Spread copies only the top level; nested objects stay shared", correct: true },
          { text: "Spread does not copy anything", correct: false },
          { text: "copy and user must have different keys", correct: false },
          { text: "You must use const on both", correct: false },
        ],
        explain: "{ ...user } is a shallow copy \u2014 nested objects are still shared references.",
      },
    ],
  },
];

/* ---------- State ---------- */
const state = { index: 0, youHpMax: 100, youHp: 100, bugHp: 100, locked: false, potions: 3, queue: [], total: 0, skills: 2, skillActive: false, skillStreak: 0, guards: 2, guardActive: false };
const POTION_HEAL = 50;
const POTION_START = 3;
const SKILL_START = 3;
const GUARD_START = 3;

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const screens = { title: $("title"), battle: $("battle"), end: $("end") };
function show(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ---------- Dynamic abandoned background ---------- */
function buildRuins() {
  const ruins = $("ruins");
  ruins.innerHTML = "";
  const W = ruins.clientWidth || 850;
  let x = -10;
  while (x < W) {
    const w = 32 + Math.random() * 66;
    const h = 45 + Math.random() * 120;
    const b = document.createElement("div");
    b.className = "building";
    b.style.left = x + "px";
    b.style.width = w + "px";
    b.style.height = h + "px";
    // some buildings have jagged / broken tops
    if (Math.random() < 0.55) {
      b.style.clipPath =
        "polygon(0 14%,18% 0,34% 12%,52% 3%,70% 14%,86% 5%,100% 16%,100% 100%,0 100%)";
    }
    // scatter flickering windows
    const cols = Math.max(1, Math.floor(w / 12));
    const rows = Math.max(1, Math.floor(h / 16));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.28) {
          const win = document.createElement("div");
          win.className = "window" + (Math.random() < 0.4 ? " blue" : "");
          win.style.left = 5 + c * 12 + "px";
          win.style.top = 12 + r * 16 + "px";
          win.style.animationDelay = (Math.random() * 5).toFixed(2) + "s";
          b.appendChild(win);
        }
      }
    }
    ruins.appendChild(b);
    x += w + 4 + Math.random() * 22;
  }
}

function buildParticles() {
  const p = $("particles");
  p.innerHTML = "";
  const W = p.clientWidth || 850;
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = document.createElement("div");
    a.className = "ash";
    const size = 1 + Math.random() * 2.5;
    a.style.width = size + "px";
    a.style.height = size + "px";
    a.style.left = Math.random() * W + "px";
    a.style.bottom = Math.random() * 40 + "px";
    a.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
    a.style.animationDuration = (6 + Math.random() * 8).toFixed(1) + "s";
    a.style.animationDelay = (Math.random() * 8).toFixed(1) + "s";
    p.appendChild(a);
  }
}

function initArena() {
  buildRuins();
  buildParticles();
}

/* ---------- Sprite rendering (auto-pads rows) ---------- */
function renderPixel(el, map, palette, pxSize) {
  const cols = Math.max(...map.map((r) => r.length));
  el.style.gridTemplateColumns = `repeat(${cols}, ${pxSize}px)`;
  el.style.gridTemplateRows = `repeat(${map.length}, ${pxSize}px)`;
  el.innerHTML = "";
  for (const row of map) {
    for (const ch of row.padEnd(cols, " ")) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const color = palette[ch];
      if (color) cell.style.background = color;
      el.appendChild(cell);
    }
  }
}

/* ---------- HUD ---------- */
function setBar(fill, text, cur, max) {
  fill.style.width = Math.max(0, (cur / max) * 100) + "%";
  text.textContent = `${Math.max(0, Math.round(cur))}/${max}`;
}
function refreshHud() {
  setBar($("youHp"), $("youHpText"), state.youHp, state.youHpMax);
  setBar($("bugHp"), $("bugHpText"), state.bugHp, 100);
  if ($("potionBtn")) updatePotionBtn();
  updateSkillBtn();
  updateGuardBtn();
}

/* ---------- Effects ---------- */
function floatDamage(targetSel, amount, hurt, crit) {
  const label = (crit ? "x3  -" : "-") + amount;
  floatText(targetSel, label, crit ? "crit" : hurt ? "hurt" : "");
}
function floatText(targetSel, label, cls) {
  const arena = $("arena");
  const rect = arena.getBoundingClientRect();
  const tgt = document.querySelector(targetSel).getBoundingClientRect();
  const num = document.createElement("div");
  num.className = "dmgnum" + (cls ? " " + cls : "");
  num.textContent = label;
  num.style.left = tgt.left - rect.left + 12 + "px";
  num.style.top = tgt.top - rect.top + "px";
  arena.appendChild(num);
  setTimeout(() => num.remove(), 900);
}
function flash(dmg) {
  const f = $("flash");
  f.className = "flash" + (dmg ? " dmg" : "");
  void f.offsetWidth;
  f.classList.add("go");
}
function anim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* ---------- Typewriter ---------- */
let typeTimer = null;
function typeText(el, str) {
  clearInterval(typeTimer);
  el.textContent = "";
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent += str[i++];
    if (i >= str.length) clearInterval(typeTimer);
  }, 12);
}

/* ---------- Flow ---------- */
function usePotion() {
  if (state.potions <= 0 || state.youHp >= state.youHpMax) return;
  state.potions--;
  const before = state.youHp;
  state.youHp = Math.min(state.youHpMax, state.youHp + POTION_HEAL);
  floatText(".hero .pixel", "+" + (state.youHp - before), "heal");
  anim($("heroSprite"), "recoil");
  refreshHud();
  updatePotionBtn();
}

function updatePotionBtn() {
  const btn = $("potionBtn");
  btn.textContent = `> POTION (${state.potions})`;
  btn.disabled = state.potions <= 0 || state.youHp >= state.youHpMax;
}

function useSkill() {
  if (state.locked || state.skillActive || state.skills <= 0) return;
  state.skills--;
  state.skillActive = true;
  state.skillStreak = 0;
  const fb = $("feedback");
  fb.className = "feedback";
  fb.textContent = "OVERFLOW ARMED \u2014 solve TWO in a row for a x3 strike!";
  updateSkillBtn();
}

function updateSkillBtn() {
  const btn = $("skillBtn");
  if (!btn) return;
  if (state.skillActive) {
    btn.textContent = `> OVERFLOW ${state.skillStreak}/2`;
    btn.classList.add("armed");
  } else {
    btn.textContent = `> OVERFLOW x3 (${state.skills})`;
    btn.classList.remove("armed");
  }
  btn.disabled = state.locked || state.skillActive || state.skills <= 0;
}

function useGuard() {
  if (state.locked || state.guards <= 0) return;
  state.guards--;
  // giving up your turn breaks any armed overflow
  state.skillActive = false;
  state.skillStreak = 0;

  // the enemy immediately attacks, but GUARD halves the incoming hit
  const raw = Math.max(5, state.playerDmg + randInt(-4, 4));
  const dmg = Math.max(3, Math.round(raw / 2));
  state.youHp -= dmg;

  anim($("bugSprite"), "lunge");
  setTimeout(() => {
    anim($("heroSprite"), "recoil");
    anim($("arena"), "shake");
    floatDamage(".hero .pixel", dmg, true);
    flash(true);
  }, 120);

  // swap the current question for a different one
  if (state.queue.length > 1) state.queue.push(state.queue.shift());

  refreshHud();
  if (state.youHp <= 0) { setTimeout(() => endGame(false), 800); return; }

  showQuestion();
  const fb = $("feedback");
  fb.className = "feedback";
  fb.textContent = `GUARD! You brace and swap targets \u2014 the bug hits for only -${dmg}.`;
}

function updateGuardBtn() {
  const btn = $("guardBtn");
  if (!btn) return;
  btn.textContent = `> GUARD (${state.guards})`;
  btn.disabled = state.locked || state.guards <= 0;
}

function startGame() {
  state.index = 0;
  state.youHp = state.youHpMax;
  state.potions = POTION_START;
  state.skills = SKILL_START;
  state.skillActive = false;
  state.skillStreak = 0;
  state.guards = GUARD_START;
  state.guardActive = false;
  renderPixel($("heroSprite"), HERO_MAP, HERO_PAL, HERO_SIZE);
  show("battle");
  initArena();
  loadEncounter();
}

function loadEncounter() {
  const e = ENCOUNTERS[state.index];
  const creature = CREATURES[state.index % CREATURES.length];
  state.bugHp = 100;
  state.playerDmg = e.playerDmg;
  state.total = e.questions.length;
  state.skillActive = false;
  state.skillStreak = 0;
  state.guardActive = false;
  // queue of remaining (not-yet-solved) questions; missed ones recycle to the back
  state.queue = shuffle([...e.questions]);

  const bug = $("bugSprite");
  bug.style.opacity = "1";
  bug.classList.add("float");
  bug.classList.remove("die");
  renderPixel(bug, creature.map, creature.pal, creature.size);

  $("bugName").textContent = e.name;
  refreshHud();
  showQuestion();
}

function showQuestion() {
  const e = ENCOUNTERS[state.index];
  const q = state.queue[0];
  state.locked = false;

  $("codeLang").textContent = q.lang;
  $("codeBox").textContent = q.code;
  $("questionText").textContent = q.question;
  $("encounterLabel").textContent = e.tier;
  $("nextBtn").style.display = "none";
  $("feedback").className = "feedback";
  $("feedback").textContent = state.skillActive
    ? `OVERFLOW ACTIVE (${state.skillStreak}/2) \u2014 keep the streak!`
    : "Scan the code. Pick the fix.";
  updateSkillBtn();
  updateGuardBtn();

  const box = $("choices");
  box.innerHTML = "";
  shuffle([...q.choices]).forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = c.text;
    btn.onclick = () => answer(c);
    box.appendChild(btn);
  });
}

function answer(choice) {
  if (state.locked) return;
  state.locked = true;

  const e = ENCOUNTERS[state.index];
  const q = state.queue[0];
  const total = state.total;
  const fb = $("feedback");
  [...$("choices").children].forEach((b) => (b.disabled = true));

  if (choice.correct) {
    // solved: remove from queue; enemy dies once queue empty OR HP hits 0
    state.queue.shift();
    const queueEmpty = state.queue.length === 0;
    const base = 100 / total;

    // OVERFLOW combo: 2 correct in a row -> the second lands a x3 strike
    let isBurst = false;
    if (state.skillActive) {
      state.skillStreak++;
      if (state.skillStreak >= 2) isBurst = true;
    }

    // variable damage; burst triples the base, normal blows never kill early
    let dmg;
    if (isBurst) {
      dmg = Math.max(9, Math.round(base * 3 + randInt(-4, 4)));
      state.bugHp = Math.max(0, state.bugHp - dmg);
      state.skillActive = false;
      state.skillStreak = 0;
    } else if (queueEmpty) {
      dmg = state.bugHp; // finishing blow
    } else {
      dmg = Math.round(base + randInt(-6, 6));
      dmg = Math.min(dmg, state.bugHp - 5);
      dmg = Math.max(6, dmg);
      state.bugHp = Math.max(0, state.bugHp - dmg);
    }

    const isKill = queueEmpty || state.bugHp <= 0;
    if (isKill) state.bugHp = 0;

    anim($("heroSprite"), "lunge");
    setTimeout(() => {
      anim($("bugSprite"), "recoil");
      floatDamage(".bug .pixel", dmg, false, isBurst);
      flash(false);
    }, 180);
    if (isKill) {
      setTimeout(() => {
        const bug = $("bugSprite");
        bug.classList.remove("float");
        bug.classList.add("die");
      }, 520);
    }

    fb.className = "feedback good";
    const lead = isKill
      ? "BUG PURGED. "
      : isBurst
      ? "OVERFLOW STRIKE x3! "
      : state.skillActive
      ? "OVERFLOW 1/2 \u2014 one more! "
      : "HIT! ";
    typeText(fb, lead + q.explain);

    const nb = $("nextBtn");
    nb.style.display = "block";
    if (isKill) {
      nb.textContent =
        state.index + 1 < ENCOUNTERS.length ? "> NEXT ENEMY" : "> RESTORE THE WORLD";
      nb.onclick = advance;
    } else {
      nb.textContent = "> NEXT STRIKE";
      nb.onclick = showQuestion;
    }
  } else {
    // overflow (if armed) breaks on a wrong answer
    const wasFocus = state.skillActive;
    state.skillActive = false;
    state.skillStreak = 0;
    // variable damage to the player too (jittered around the enemy's base)
    const dmg = Math.max(5, state.playerDmg + randInt(-4, 4));
    state.youHp -= dmg;
    anim($("bugSprite"), "lunge");
    setTimeout(() => {
      anim($("heroSprite"), "recoil");
      anim($("arena"), "shake");
      floatDamage(".hero .pixel", dmg, true);
      flash(true);
    }, 180);

    fb.className = "feedback bad";
    typeText(fb, (wasFocus ? "OVERFLOW BROKEN! " : "") + `BUG BITES BACK (-${dmg}). ` + q.explain);
    [...$("choices").children].forEach((b) => {
      const m = q.choices.find((c) => c.text === b.textContent);
      if (m && m.correct) { b.style.borderColor = "var(--blue)"; b.style.color = "var(--blue-bright)"; }
    });

    if (state.youHp <= 0) { refreshHud(); setTimeout(() => endGame(false), 800); return; }

    // don't re-ask immediately: send the missed question to the back of the queue
    if (state.queue.length > 1) state.queue.push(state.queue.shift());

    const nb = $("nextBtn");
    nb.style.display = "block";
    nb.textContent = "> CONTINUE";
    nb.onclick = showQuestion;
  }

  refreshHud();
}

function advance() {
  state.index++;
  if (state.index >= ENCOUNTERS.length) endGame(true);
  else loadEncounter();
}

function endGame(win) {
  show("end");
  if (win) {
    $("endTitle").textContent = "WORLD RESTORED";
    $("endTitle").style.color = "var(--blue-bright)";
    $("endLore").innerHTML =
      "The last bug dissolves into clean, compiling light.<br>" +
      "The dead machines hum back to life.<br><br>" +
      "<span style='color:var(--muted)'>You debugged the world itself.</span>";
  } else {
    $("endTitle").textContent = "STACK OVERFLOW";
    $("endTitle").style.color = "var(--danger)";
    $("endLore").innerHTML =
      "The bugs overwhelmed you.<br><br>" +
      "<span style='color:var(--muted)'>Read the error. Reason. Try again.</span>";
  }
}

/* ---------- utils ---------- */
function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

$("startBtn").onclick = startGame;
$("restartBtn").onclick = startGame;
$("potionBtn").onclick = usePotion;
$("skillBtn").onclick = useSkill;
$("guardBtn").onclick = useGuard;
$("infoBtn").onclick = () => $("infoModal").classList.add("open");
$("infoClose").onclick = () => $("infoModal").classList.remove("open");
$("infoModal").onclick = (ev) => { if (ev.target === $("infoModal")) $("infoModal").classList.remove("open"); };
