// ORBITAL — game engine
// Handles state, mission rendering, sandboxed code execution,
// correctness testing, empirical complexity measurement, and progression.

const RANKS = [
  { min: 0, name: "Cadet" },
  { min: 200, name: "Ensign" },
  { min: 400, name: "Navigator" },
  { min: 700, name: "Commander" },
  { min: 1000, name: "Station Chief" },
];

const state = {
  credits: 0,
  tools: ["Linear Scan: O(n) baseline"],
  solved: {}, // missionId -> { beatTarget: bool }
  current: null,
  code: {}, // missionId -> code string (persist edits during session)
  hints: {}, // missionId -> number of hints revealed
};

// ---------- persistence ----------
function save() {
  try {
    localStorage.setItem("orbital-save", JSON.stringify(state));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem("orbital-save");
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, data);
  } catch (e) {}
}

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

function toast(msg, kind = "info") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    t.className = "toast hidden";
  }, 3200);
}

function rankFor(credits) {
  let r = RANKS[0].name;
  for (const rk of RANKS) if (credits >= rk.min) r = rk.name;
  return r;
}

function renderHud() {
  $("credits").textContent = state.credits;
  $("rank").textContent = rankFor(state.credits);
  $("toolCount").textContent = state.tools.length;
  const list = $("toolList");
  list.innerHTML = "";
  for (const t of state.tools) {
    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  }
}

function renderMissionList() {
  const wrap = $("missionList");
  wrap.innerHTML = "";
  // Academy Orientation tutorial always sits first, before the missions.
  if (typeof buildTutorialCard === "function") {
    wrap.appendChild(buildTutorialCard());
  }
  let lastGroup = null;
  MISSIONS.forEach((m) => {
    const group = m.group || "Missions";
    if (group !== lastGroup) {
      const hd = document.createElement("div");
      hd.className = "mission-group";
      hd.textContent = group;
      wrap.appendChild(hd);
      lastGroup = group;
    }
    const solved = state.solved[m.id];
    const el = document.createElement("button");
    el.className =
      "mission-card" +
      (state.current === m.id ? " active" : "") +
      (solved ? " solved" : "");
    el.innerHTML =
      `<span class="mc-title">${m.title}</span>` +
      `<span class="mc-tags">${m.tags.join(" · ")}</span>` +
      (solved
        ? `<span class="mc-badge">${solved.beatTarget ? "★ OPTIMIZED" : "✓ SOLVED"}</span>`
        : "");
    el.onclick = () => openMission(m.id);
    wrap.appendChild(el);
  });
  if (typeof renderStationStatuses === "function") renderStationStatuses();
}

function openMission(id) {
  const m = MISSIONS.find((x) => x.id === id);
  state.current = id;
  $("missionTitle").textContent = m.title;
  $("missionBrief").textContent = m.brief;
  $("missionTags").innerHTML = m.tags
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");
  $("fnSignature").textContent = m.signature;
  $("targetBig").textContent = m.targetTime || m.targetBig;
  if (m.targetSpace) {
    $("targetSpace").textContent = m.targetSpace;
    $("targetSpaceWrap").classList.remove("hidden");
  } else {
    $("targetSpaceWrap").classList.add("hidden");
  }
  $("targetBox").classList.remove("hidden");
  $("editorWrap").classList.remove("hidden");
  $("code").value = state.code[id] || m.starter;
  renderMissionExtras(m);
  $("results").innerHTML = "";
  renderMissionList();
  if (typeof showMissionView === "function") showMissionView();
}

// ---------- mission extras: statement, concept, hints, approaches, solution ----------
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Compact, safe display of a test value (input / expected / got).
function fmtVal(v) {
  let s;
  try { s = JSON.stringify(v); } catch (e) { s = String(v); }
  if (s === undefined) s = "undefined";
  if (s.length > 90) s = s.slice(0, 87) + "\u2026";
  return s;
}

// Render a function call like  fnName(arg1, arg2)
function fmtCall(fnName, args) {
  if (!Array.isArray(args)) return fnName + "(…)";
  return fnName + "(" + args.map(fmtVal).join(", ") + ")";
}

function mxSection(title, inner) {
  return `<div class="mx-section"><h3>${esc(title)}</h3>${inner}</div>`;
}

function renderHintItems(m, shown) {
  if (shown === 0) {
    return `<li class="mx-hint-empty">No hints revealed yet — give it a try first! ` +
      `Conceptual hints come before any implementation details.</li>`;
  }
  let s = "";
  for (let i = 0; i < shown; i++) {
    const impl = i === m.hints.length - 1;
    s += `<li class="${impl ? "impl" : ""}">${impl ? "<b>Implementation:</b> " : ""}${esc(m.hints[i])}</li>`;
  }
  return s;
}

function renderMissionExtras(m) {
  const box = $("missionExtras");
  if (!box) return;
  if (!m.statement && !m.concept && !m.hints && !m.approaches && !m.solution) {
    box.innerHTML = "";
    return;
  }
  let h = "";
  if (m.statement) h += mxSection("Problem Statement", `<p class="mx-text">${esc(m.statement)}</p>`);
  if (m.concept) h += mxSection("Concept Briefing", `<p class="mx-text">${esc(m.concept)}</p>`);

  if (m.tests && m.tests.length) {
    let rows = "";
    m.tests.forEach((t, i) => {
      rows += `<div class="tc-row"><span class="tc-n">${i + 1}</span>` +
        `<code>${esc(fmtCall(m.fn, t.args))}</code>` +
        `<span class="tc-arrow">\u2192</span>` +
        `<code class="tc-exp">${esc(fmtVal(t.expected))}</code></div>`;
    });
    h += `<details class="mx-details" open><summary>\uD83E\uDDEA Visible Test Cases (${m.tests.length})</summary>` +
      `<div class="tc-list">${rows}</div>` +
      `<div class="tc-note">Your function is run against these exact inputs. ` +
      `▶ Run Tests to check them, then ⇧ Submit to also measure speed.</div></details>`;
  }

  if (m.hints && m.hints.length) {
    const shown = (state.hints && state.hints[m.id]) || 0;
    const done = shown >= m.hints.length;
    h += `<div class="mx-section"><div class="mx-head"><h3>Hints</h3>` +
      `<button id="hintBtn" class="ghost"${done ? " disabled" : ""}>` +
      `\uD83D\uDCA1 ${done ? "All hints shown" : "Request hint (" + shown + "/" + m.hints.length + ")"}</button></div>` +
      `<ol class="mx-hints" id="hintList">${renderHintItems(m, shown)}</ol></div>`;
  }

  if (m.approaches) {
    h += `<details class="mx-details"><summary>\u2696 Approach Analysis \u2014 brute-force vs optimized</summary>` +
      `<div class="mx-approach brute"><span class="mx-tag brute">BRUTE</span>` +
      `<b>${esc(m.approaches.brute.label)}</b><p>${esc(m.approaches.brute.detail)}</p></div>` +
      `<div class="mx-approach opt"><span class="mx-tag opt">OPTIMAL</span>` +
      `<b>${esc(m.approaches.optimal.label)}</b><p>${esc(m.approaches.optimal.detail)}</p></div>` +
      `</details>`;
  }

  if (m.solution) {
    if (state.solved[m.id]) {
      h += `<details class="mx-details solution"><summary>\u2705 Mission Debrief \u2014 Solution</summary>` +
        `<p class="mx-text">${esc(m.solution)}</p></details>`;
    } else {
      h += `<div class="mx-locked">\uD83D\uDD12 Solution debrief unlocks after you solve this mission.</div>`;
    }
  }

  box.innerHTML = h;
  const hb = $("hintBtn");
  if (hb) hb.onclick = revealHint;
}

function revealHint() {
  const m = MISSIONS.find((x) => x.id === state.current);
  if (!m || !m.hints) return;
  if (!state.hints) state.hints = {};
  const cur = state.hints[m.id] || 0;
  if (cur >= m.hints.length) return;
  state.hints[m.id] = cur + 1;
  save();
  renderMissionExtras(m);
}

function resetCode() {
  if (!state.current) return;
  const m = MISSIONS.find((x) => x.id === state.current);
  $("code").value = m.starter;
  delete state.code[state.current];
  save();
}

// ---------- sandboxed execution ----------
// We wrap user code, capture the named function, and run it.
// Correctness runs on small tests; complexity runs on a scaled input while
// counting array/property accesses via a lightweight Proxy where feasible.

function compile(code, fnName) {
  // Return the user's function or throw.
  const factory = new Function(code + `\nreturn typeof ${fnName} === 'function' ? ${fnName} : null;`);
  const fn = factory();
  if (!fn) throw new Error(`Function ${fnName} not found.`);
  return fn;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function runTests(m, fn) {
  const results = [];
  for (const t of m.tests) {
    let pass = false, got, err = null;
    try {
      // clone args so user mutation doesn't corrupt expected
      const args = JSON.parse(JSON.stringify(t.args));
      got = fn(...args);
      pass = deepEqual(got, t.expected);
    } catch (e) {
      err = e.message;
    }
    results.push({ args: t.args, expected: t.expected, got, pass, err });
  }
  return results;
}

// Measure empirical work using a global op counter that the harness increments
// by instrumenting the scaled input access. Simpler & robust: we time-bound via
// a counting Proxy on arrays/objects used in the scaled run.
// A safety ceiling stops runaway O(n^2)/exponential code from freezing the tab.
const OP_CAP = 4000000;
function measureOps(m, fn) {
  let ops = 0;
  const bump = () => { if (++ops > OP_CAP) throw { __cap: true }; };

  const wrap = (obj) => {
    if (Array.isArray(obj)) {
      return new Proxy(obj, {
        get(target, prop, r) {
          if (typeof prop === "string" && /^\d+$/.test(prop)) bump();
          const v = Reflect.get(target, prop, r);
          return typeof v === "function" ? v.bind(target) : v;
        },
      });
    }
    if (obj && typeof obj === "object") {
      return new Proxy(obj, {
        get(target, prop, r) {
          if (prop !== "length" && typeof prop !== "symbol") bump();
          return Reflect.get(target, prop, r);
        },
      });
    }
    return obj;
  };

  const raw = m.scale();
  // Deep-wrap the top-level structures the mission uses.
  const data = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (Array.isArray(v)) {
      data[k] = wrap(v.map((item) =>
        item && typeof item === "object" ? wrap(item) : item
      ));
    } else if (v && typeof v === "object") {
      const inner = {};
      for (const kk of Object.keys(v)) inner[kk] = wrap(v[kk]);
      data[k] = wrap(inner);
    } else {
      data[k] = v;
    }
  }

  m.runScaled(fn, data);
  return ops;
}

function render(results, opsInfo) {
  const box = $("results");
  const passCount = results.filter((r) => r.pass).length;
  const allPass = passCount === results.length;

  let html = `<div class="res-summary ${allPass ? "ok" : "bad"}">` +
    `${passCount}/${results.length} tests passing</div>`;

  const cur = MISSIONS.find((x) => x.id === state.current);
  const fnName = cur ? cur.fn : "fn";

  html += '<div class="test-grid">';
  results.forEach((r, i) => {
    const hasArgs = Array.isArray(r.args);
    const gotStr = r.err ? "ERROR: " + r.err : fmtVal(r.got);
    html += `<div class="test-row ${r.pass ? "pass" : "fail"}">` +
      `<div class="test-head"><span class="dot"></span>` +
      `<span class="test-name">Test ${i + 1}</span>` +
      `<span class="test-verdict">${r.pass ? "✓ PASS" : "✗ FAIL"}</span></div>` +
      `<div class="test-io">` +
      (hasArgs
        ? `<div><span class="io-label">input</span> <code>${esc(fmtCall(fnName, r.args))}</code></div>`
        : "") +
      `<div><span class="io-label">expected</span> <code>${esc(fmtVal(r.expected))}</code></div>` +
      `<div><span class="io-label">got</span> <code class="${r.pass ? "got-ok" : "got-bad"}">${esc(gotStr)}</code></div>` +
      `</div></div>`;
  });
  html += "</div>";

  if (!opsInfo) {
    html += `<div class="feedback-note ${allPass ? "ok" : "bad"}">` +
      (allPass
        ? "✓ All tests pass. Hit ⇧ Submit to measure your Big O and earn rewards."
        : "✗ Some tests failed. Compare expected vs got above, then fix correctness before optimizing.") +
      `</div>`;
  } else {
    html += complexityFeedback(opsInfo);
  }

  box.innerHTML = html;
}

// Educational complexity feedback: explains WHY, not just "too slow".
function complexityFeedback(info) {
  const m = info.mission;
  const beat = !info.capped && info.ops <= m.targetOps;
  const near = !beat && !info.capped && info.ops <= m.targetOps * 6;
  const cls = beat ? "ok" : "warn";
  const opsLabel = info.capped
    ? "aborted at " + OP_CAP.toLocaleString() + "+ ops"
    : info.ops.toLocaleString() + " ops";

  let verdict, why;
  if (beat) {
    verdict = "OPTIMAL — you reached " + (m.targetTime || m.targetBig) + ".";
    why = m.approaches ? "Why it's efficient: " + m.approaches.optimal.detail : "";
  } else if (near) {
    verdict = "CORRECT, but above target — doing more work than needed.";
    why = "Your solution touches the data more than the optimal approach. " +
      (m.approaches ? "This resembles the brute-force profile: " + m.approaches.brute.detail : "");
  } else {
    verdict = info.capped
      ? "CORRECT, but it exploded past the work limit — a polynomial or exponential blow-up."
      : "CORRECT, but far slower than the target complexity.";
    why = (m.approaches ? m.approaches.brute.detail + " " : "") +
      (m.approaches ? "Aim for: " + m.approaches.optimal.label + "." : "");
  }

  const spaceLine = m.targetSpace
    ? `<div><span class="label">TARGET SPACE</span> ${esc(m.targetSpace)}</div>` : "";

  return `<div class="ops-box ${cls}">` +
    `<div class="ops-verdict">${esc(verdict)}</div>` +
    `<div><span class="label">MEASURED WORK (scaled input)</span> <b>${esc(opsLabel)}</b></div>` +
    `<div><span class="label">TARGET TIME</span> ${esc(m.targetTime || m.targetBig)} ` +
    `(≤ ${m.targetOps.toLocaleString()} ops)</div>` +
    spaceLine +
    (why ? `<div class="ops-why">${esc(why)}</div>` : "") +
    `</div>`;
}

// ---------- actions ----------
function doRun() {
  const m = MISSIONS.find((x) => x.id === state.current);
  if (!m) return;
  state.code[m.id] = $("code").value;
  save();
  let fn;
  try {
    fn = compile($("code").value, m.fn);
  } catch (e) {
    render([{ pass: false, expected: "compiles", got: e.message, err: e.message }]);
    return;
  }
  const results = runTests(m, fn);
  render(results);
}

function doSubmit() {
  const m = MISSIONS.find((x) => x.id === state.current);
  if (!m) return;
  state.code[m.id] = $("code").value;
  save();

  let fn;
  try {
    fn = compile($("code").value, m.fn);
  } catch (e) {
    render([{ pass: false, expected: "compiles", got: e.message, err: e.message }]);
    return;
  }
  const results = runTests(m, fn);
  const allPass = results.every((r) => r.pass);

  if (!allPass) {
    render(results);
    toast("Solution failed tests — fix correctness before submitting.", "bad");
    return;
  }

  let ops, capped = false;
  try {
    ops = measureOps(m, fn);
  } catch (e) {
    if (e && e.__cap) { ops = OP_CAP; capped = true; } // runaway complexity
    else { ops = m.targetOps * 100; } // crashed on scaled input
  }
  const beatTarget = !capped && ops <= m.targetOps;

  render(results, { ops, mission: m, capped });

  const already = state.solved[m.id];
  const firstBeat = beatTarget && (!already || !already.beatTarget);
  const firstSolve = !already;

  let earned = 0;
  const msgs = [];

  if (firstSolve) {
    earned += 50;
    msgs.push("+50 first solve");
  }
  if (firstBeat) {
    earned += m.reward.credits;
    msgs.push(`+${m.reward.credits} optimized`);
    if (!state.tools.includes(m.reward.unlock)) {
      state.tools.push(m.reward.unlock);
      toast("🔓 TOOL UNLOCKED: " + m.reward.unlock, "unlock");
    }
  }

  state.credits += earned;
  state.solved[m.id] = { beatTarget: beatTarget || (already && already.beatTarget) };
  save();
  renderHud();
  renderMissionList();
  renderMissionExtras(m); // reveal solution debrief now that it's solved

  if (earned > 0) {
    toast(`Mission cleared! ${msgs.join("  ")}`, "unlock");
  } else if (beatTarget) {
    toast("Already optimized — nice consistency, Commander.", "info");
  } else {
    toast("Solved! But you can still beat the target complexity for bonus + tool.", "info");
  }
}

// ---------- starfield ----------
function makeStars() {
  const box = $("stars");
  let html = "";
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const s = Math.random() * 2 + 1;
    const d = Math.random() * 4 + 2;
    html += `<span style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-duration:${d}s"></span>`;
  }
  box.innerHTML = html;
}

// ---------- init ----------
function init() {
  load();
  makeStars();
  renderHud();
  renderMissionList();
  // Build the explorable ship deck (home view).
  if (typeof initShip === "function") initShip();
  // First-time cadets start with Academy Orientation automatically.
  if (!state.tutorialDone && typeof openTutorial === "function") {
    openTutorial(0);
  }
  $("runBtn").onclick = doRun;
  $("submitBtn").onclick = doSubmit;
  $("resetBtn").onclick = resetCode;
  // Tab support in the editor
  $("code").addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });
}

init();
