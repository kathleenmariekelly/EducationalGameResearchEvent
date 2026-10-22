// main.js — SQL Detective
//
// Hidden black-box database. Three tiers, each teaching a distinct SQL skill:
//   Rookie          — WHERE, =, AND, basic comparisons
//   Detective       — BETWEEN, IN / NOT IN, LIKE
//   Chief Inspector — JOIN across two tables + INNER vs LEFT
// The clues in each tier require that tier's construct to solve. Data is
// generated procedurally (no API calls); exactly one suspect is the culprit.

import { tiers } from "./scenarios.js";
import { generatePopulation, generateJoined, satisfies } from "./generate.js";
import { suspectSVG, jailBars, detectiveSVG } from "./characters.js";
import { injectIcons } from "./icons.js";

const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};
const shuffle = (a) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const DIFFICULTY = {
  easy:   { rank: "Rookie",          size: 15, hints: "full",   points: 100,
            teaches: "WHERE · = · AND · comparisons",
            placeholder: "e.g.  hand = 'left'   or   height_cm > 175" },
  medium: { rank: "Detective",       size: 35, hints: "column", points: 200,
            teaches: "BETWEEN · IN / NOT IN · LIKE",
            placeholder: "e.g.  mask_color IN ('red','gold')   or   code_name LIKE 'V%'" },
  hard:   { rank: "Chief Inspector", size: 40, hints: "none",   points: 300,
            teaches: "JOIN two tables · INNER vs LEFT",
            placeholder: "e.g.  location = 'docks'   (filter either joined table)" },
};
const REVEAL_AT = 3;
const CASES_PER_SHIFT = 3;

// ---- column / value helpers ----
function resolveColumn(name, caseData) {
  const n = name.trim().toLowerCase();
  return (
    caseData.columns.find((c) => c.label.toLowerCase() === n) ||
    caseData.columns.find((c) => c.key.toLowerCase() === n) ||
    null
  );
}
const labelForKey = (key, c) => (c.columns.find((x) => x.key === key)?.label ?? key);
const fmt = (v) => (typeof v === "number" ? String(v) : `'${v}'`);

function fragmentText(cond, caseData) {
  const L = labelForKey(cond.column, caseData);
  switch (cond.op) {
    case "BETWEEN": return `${L} BETWEEN ${cond.low} AND ${cond.high}`;
    case "IN": return `${L} ${cond.negate ? "NOT " : ""}IN (${cond.values.map(fmt).join(", ")})`;
    case "LIKE": return `${L} ${cond.negate ? "NOT " : ""}LIKE ${fmt(cond.value)}`;
    default: return `${L} ${cond.op} ${fmt(cond.value)}`;
  }
}
function hintFor(clue, c) { return fragmentText(clue.cond, c); }

// ---- parser ----
function parseScalar(raw, col) {
  const r = raw.trim();
  let value;
  if (/^'.*'$/.test(r) || /^".*"$/.test(r)) value = r.slice(1, -1);
  else if (/^-?\d+(\.\d+)?$/.test(r)) value = Number(r);
  else return { ok: false, error: `Text values need single quotes (e.g. '${r}').` };

  const isNum = col.domain?.type === "int";
  if (isNum && typeof value === "string")
    return { ok: false, error: `Column "${col.label}" holds numbers — drop the quotes.` };
  if (!isNum && typeof value === "number")
    return { ok: false, error: `Column "${col.label}" holds text — wrap the value in quotes.` };
  return { ok: true, value };
}

function parseCondition(input, caseData) {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Type a condition first." };

  let m;
  // BETWEEN
  if ((m = raw.match(/^([A-Za-z_]\w*)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i))) {
    const col = resolveColumn(m[1], caseData);
    if (!col) return unknownCol(m[1], caseData);
    const lo = parseScalar(m[2], col), hi = parseScalar(m[3], col);
    if (!lo.ok) return lo;
    if (!hi.ok) return hi;
    return { ok: true, cond: { column: col.key, op: "BETWEEN", low: lo.value, high: hi.value } };
  }
  // IN / NOT IN
  if ((m = raw.match(/^([A-Za-z_]\w*)\s+(NOT\s+)?IN\s*\((.+)\)\s*$/i))) {
    const col = resolveColumn(m[1], caseData);
    if (!col) return unknownCol(m[1], caseData);
    const parts = m[3].split(",");
    const values = [];
    for (const p of parts) {
      const s = parseScalar(p, col);
      if (!s.ok) return s;
      values.push(s.value);
    }
    return { ok: true, cond: { column: col.key, op: "IN", values, negate: !!m[2] } };
  }
  // LIKE / NOT LIKE
  if ((m = raw.match(/^([A-Za-z_]\w*)\s+(NOT\s+)?LIKE\s+(.+?)$/i))) {
    const col = resolveColumn(m[1], caseData);
    if (!col) return unknownCol(m[1], caseData);
    const s = m[3].trim();
    if (!/^'.*'$/.test(s) && !/^".*"$/.test(s))
      return { ok: false, error: "LIKE needs a quoted pattern, e.g. LIKE 'V%'." };
    return { ok: true, cond: { column: col.key, op: "LIKE", value: s.slice(1, -1), negate: !!m[2] } };
  }
  // comparison
  if ((m = raw.match(/^([A-Za-z_]\w*)\s*(!=|>=|<=|=|>|<)\s*(.+?)$/))) {
    const col = resolveColumn(m[1], caseData);
    if (!col) return unknownCol(m[1], caseData);
    const s = parseScalar(m[3], col);
    if (!s.ok) return s;
    return { ok: true, cond: { column: col.key, op: m[2], value: s.value } };
  }

  if (!/[=<>!]/.test(raw) && !/\b(between|in|like)\b/i.test(raw))
    return { ok: false, error: "No operator found. Use =, >, <, BETWEEN, IN, or LIKE." };
  return { ok: false, error: "Couldn't read that. Check the form:  column operator value." };
}
function unknownCol(name, caseData) {
  const cols = caseData.columns.map((c) => c.label).join(", ");
  return { ok: false, error: `There's no column called "${name}". Columns: ${cols}.` };
}

// ---- query engine ----
function rowMatches(row, terms) {
  if (terms.length === 0) return true;
  let result = satisfies(row[terms[0].cond.column], terms[0].cond);
  for (let i = 1; i < terms.length; i++) {
    const ok = satisfies(row[terms[i].cond.column], terms[i].cond);
    result = terms[i].connector === "OR" ? result || ok : result && ok;
  }
  return result;
}
function buildSQL(c, terms, joinType) {
  let base;
  if (c.isJoin) {
    base = `SELECT *\nFROM ${c.tableA}\n${joinType} JOIN ${c.tableB} ON ${c.joinOn}`;
  } else {
    base = `SELECT * FROM ${c.table}`;
  }
  if (terms.length === 0) return base + ";";
  const parts = terms.map((t, i) => (i === 0 ? fragmentText(t.cond, c) : `${t.connector} ${fragmentText(t.cond, c)}`));
  return `${base}\nWHERE ${parts.join("\n      ")};`;
}

// ---- state ----
const state = {
  difficulty: null, order: [], pos: 0, template: null,
  population: [], culpritId: null, terms: [], solved: false,
  score: 0, hintsUsedThisCase: 0, wrongArrestsThisCase: 0, joinType: "INNER",
  gridSig: null, avatarEls: {},
};

function goToMenu() {
  $("#game-screen").classList.add("hidden");
  $("#summary-screen").classList.add("hidden");
  $("#start-screen").classList.remove("hidden");
}
const activeRows = () =>
  state.template.isJoin && state.joinType === "INNER"
    ? state.population.filter((r) => r.matched)
    : state.population;

// ---- flow ----
function startShift(diff) {
  state.difficulty = diff;
  state.score = 0;
  const pool = tiers[diff].cases;
  state.order = shuffle(pool.map((_, i) => i)).slice(0, Math.min(CASES_PER_SHIFT, pool.length));
  state.pos = 0;
  $("#start-screen").classList.add("hidden");
  $("#summary-screen").classList.add("hidden");
  $("#game-screen").classList.remove("hidden");
  $("#rank-badge").textContent = `${DIFFICULTY[diff].rank} · ${DIFFICULTY[diff].teaches}`;
  loadCase();
}

function loadCase() {
  const cfg = DIFFICULTY[state.difficulty];
  state.template = tiers[state.difficulty].cases[state.order[state.pos]];
  const gen = state.template.isJoin ? generateJoined : generatePopulation;
  const pop = gen(state.template, cfg.size);
  state.population = pop.rows;
  state.culpritId = pop.culpritId;
  state.terms = [];
  state.solved = false;
  state.joinType = "INNER";
  state.hintsUsedThisCase = 0;
  state.wrongArrestsThisCase = 0;
  $("#verdict").textContent = "";
  $("#verdict").className = "verdict";
  $("#syntax-error").classList.add("hidden");
  $("#cond-input").value = "";
  $("#cond-input").placeholder = cfg.placeholder;
  $("#next-btn").classList.add("hidden");
  render();
}

function nextCase() {
  state.pos += 1;
  if (state.pos >= state.order.length) return endShift();
  loadCase();
}
function endShift() {
  $("#game-screen").classList.add("hidden");
  $("#summary-screen").classList.remove("hidden");
  const rank = DIFFICULTY[state.difficulty].rank;
  $("#summary-text").textContent =
    `You closed ${state.order.length} cases as ${rank} and banked ${state.score} points. The database never stood a chance.`;
}

// ---- render ----
function render() {
  const c = state.template;
  const cfg = DIFFICULTY[state.difficulty];
  $("#score-badge").textContent = `Score: ${state.score}`;
  $("#case-progress").textContent = `Case ${state.pos + 1} of ${state.order.length}`;
  $("#case-title").textContent = c.title;
  $("#case-scenario").textContent = c.scenario;
  $("#clues-hint").textContent =
    cfg.hints === "none"
      ? "No hints at this rank — read the clue, read the schema, write the SQL."
      : "Read each clue and translate it into a SQL condition. Stuck? Use a hint.";
  renderClues();
  renderSchema();
  renderJoinControls();
  renderBuilder();
  $("#sql-view").textContent = buildSQL(c, state.terms, state.joinType);
  renderResults();
}

function renderClues() {
  const c = state.template;
  const hintMode = DIFFICULTY[state.difficulty].hints;
  const list = $("#clue-list");
  list.innerHTML = "";
  c.clues.forEach((clue, i) => {
    const card = el("div", "clue");
    card.appendChild(el("span", "clue__num", `#${i + 1}`));
    card.appendChild(el("span", "clue__text", clue.text));
    if (hintMode !== "none") {
      const hintBtn = el("button", "clue__hint", "hint");
      const hint = el("code", "clue__answer hidden");
      const colLabel = labelForKey(clue.cond.column, c);
      let level = 0;
      hintBtn.addEventListener("click", () => {
        level += 1;
        state.hintsUsedThisCase += 1;
        if (level === 1) {
          hint.textContent = `Look at the "${colLabel}" column…`;
          hint.classList.remove("hidden");
          hintBtn.textContent = hintMode === "column" ? "hint" : "more";
          if (hintMode === "column") hintBtn.disabled = true;
        } else {
          hint.textContent = hintFor(clue, c);
          hintBtn.disabled = true;
        }
      });
      card.appendChild(hintBtn);
      card.appendChild(hint);
    }
    list.appendChild(card);
  });
}

function renderSchema() {
  const c = state.template;
  const wrap = $("#schema-view");
  wrap.innerHTML = "";
  const total = state.population.length;

  const block = (tableName, cols, note) => {
    const b = el("div", "schema-block");
    b.appendChild(el("div", "schema-head", `${tableName} ${note}`));
    cols.forEach((col) => {
      const row = el("div", "schema-row");
      row.appendChild(el("code", "schema-col", col.label));
      const type = col.type === "name" ? "text" : col.domain.type === "int" ? "number" : "text";
      row.appendChild(el("span", "schema-type", type));
      b.appendChild(row);
    });
    return b;
  };

  if (c.isJoin) {
    wrap.appendChild(block(c.tableA, c.columns.filter((x) => x.src === "A"), `( ${total} rows, hidden )`));
    wrap.appendChild(block(c.tableB, c.columns.filter((x) => x.src === "B"), `( related records, hidden )`));
    wrap.appendChild(el("p", "hint", `Joined on  ${c.joinOn}`));
  } else {
    wrap.appendChild(block(c.table, c.columns, `( ${total} rows, hidden )`));
  }
}

function renderJoinControls() {
  const wrap = $("#join-controls");
  if (!state.template.isJoin) { wrap.classList.add("hidden"); wrap.innerHTML = ""; return; }
  wrap.classList.remove("hidden");
  wrap.innerHTML = "";
  wrap.appendChild(el("span", "join-label", "JOIN type:"));
  ["INNER", "LEFT"].forEach((jt) => {
    const b = el("button", "join-opt" + (state.joinType === jt ? " join-opt--on" : ""), jt);
    b.addEventListener("click", () => { state.joinType = jt; render(); });
    wrap.appendChild(b);
  });
  const note = state.joinType === "INNER"
    ? "INNER keeps only suspects with a matching record."
    : "LEFT keeps every suspect — even those never seen (their record columns are NULL).";
  wrap.appendChild(el("span", "join-note", note));
}

function renderBuilder() {
  const wrap = $("#where-terms");
  wrap.innerHTML = "";
  if (state.terms.length === 0) {
    wrap.appendChild(el("p", "empty", "No conditions yet — type one below to interrogate the database."));
    return;
  }
  state.terms.forEach((t, i) => {
    if (i > 0) {
      const conn = el("button", "connector connector--" + t.connector, t.connector);
      conn.title = "Click to toggle AND / OR";
      conn.addEventListener("click", () => toggleConnector(i));
      wrap.appendChild(conn);
    }
    const chip = el("div", "term");
    chip.appendChild(el("span", "term__txt", fragmentText(t.cond, state.template)));
    const x = el("button", "term__x", "✕");
    x.addEventListener("click", () => removeTerm(i));
    chip.appendChild(x);
    wrap.appendChild(chip);
  });
}

function renderResults() {
  const c = state.template;
  const base = activeRows();
  const total = base.length;
  const matches = base.filter((r) => rowMatches(r, state.terms));
  const radar = $("#radar");
  const reveal = $("#reveal");
  reveal.innerHTML = "";

  syncGrid(base);
  updateGrid(base, matches);

  if (state.terms.length === 0) {
    radar.className = "radar";
    radar.textContent = c.isJoin
      ? `${total} rows after the ${state.joinType} join. Add conditions to narrow them.`
      : `${total} suspects in the sealed database. Start querying to narrow them down.`;
  } else {
    const n = matches.length;
    radar.className = "radar" + (n === 1 ? " radar--one" : n === 0 ? " radar--zero" : "");
    radar.textContent =
      n === 0
        ? `0 match. No one fits — loosen or rethink a condition.`
        : `${n} suspect${n === 1 ? "" : "s"} match your query  (of ${total}).`;
  }

  if (state.terms.length > 0 && matches.length > 0 && matches.length <= REVEAL_AT) {
    reveal.appendChild(el("div", "reveal-head", matches.length === 1 ? "Person of interest" : "Persons of interest"));
    const table = el("table", "data-table");
    const thead = el("thead"), hr = el("tr");
    c.columns.forEach((col) => hr.appendChild(el("th", null, col.label)));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el("tbody");
    matches.forEach((r) => {
      const tr = el("tr");
      c.columns.forEach((col) => {
        const v = r[col.key];
        tr.appendChild(el("td", v === null ? "cell-null" : null, v === null ? "NULL" : String(v)));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    reveal.appendChild(table);
  } else if (state.terms.length > 0 && matches.length > REVEAL_AT) {
    reveal.appendChild(el("p", "reveal-locked",
      `🔒 Too many to see faces. Narrow to ${REVEAL_AT} or fewer to reveal the persons of interest.`));
  }

  $("#arrest-btn").disabled = matches.length !== 1 || state.solved;
}

// ---- animated suspect crowd (anonymous — reveals no data) ----
function syncGrid(base) {
  const grid = $("#suspect-grid");
  const sig = `${state.template.id}:${state.joinType}:${base.length}`;
  if (state.gridSig === sig) return;
  state.gridSig = sig;
  grid.innerHTML = "";
  state.avatarEls = {};
  base.forEach((r, i) => {
    const a = el("div", "avatar mug");
    a.innerHTML = `<div class="mug__pic">${suspectSVG(r.id)}</div><div class="mug__plate">???</div><div class="stamp"></div>`;
    a.style.transitionDelay = `${(i % 16) * 14}ms`;
    grid.appendChild(a);
    state.avatarEls[r.id] = a;
  });
}
function updateGrid(base, matches) {
  const filtering = state.terms.length > 0;
  const matchIds = new Set(matches.map((r) => r.id));
  base.forEach((r) => {
    const a = state.avatarEls[r.id];
    if (!a) return;
    const out = filtering && !matchIds.has(r.id);
    a.classList.toggle("avatar--out", out);
    a.classList.toggle("avatar--in", filtering && matchIds.has(r.id) && matches.length <= REVEAL_AT);
    const stamp = a.querySelector(".stamp");
    if (!state.solved) {
      a.classList.remove("avatar--jailed");
      if (a.querySelector(".bars")) a.querySelector(".mug__pic").innerHTML = suspectSVG(r.id);
      if (stamp) stamp.textContent = out ? "CLEARED" : "";
    }
  });
}

// ---- interactions ----
function addCondition() {
  if (state.solved) return;
  const input = $("#cond-input");
  const errBox = $("#syntax-error");
  const result = parseCondition(input.value, state.template);
  if (!result.ok) {
    errBox.textContent = "⚠ " + result.error;
    errBox.classList.remove("hidden");
    input.classList.add("input--error");
    return;
  }
  errBox.classList.add("hidden");
  input.classList.remove("input--error");
  state.terms.push({ cond: result.cond, connector: state.terms.length === 0 ? null : $("#connector-select").value });
  input.value = "";
  render();
  input.focus();
}
function removeTerm(i) {
  if (state.solved) return;
  state.terms.splice(i, 1);
  if (state.terms.length) state.terms[0].connector = null;
  render();
}
function toggleConnector(i) {
  if (state.solved) return;
  state.terms[i].connector = state.terms[i].connector === "AND" ? "OR" : "AND";
  render();
}

function makeArrest() {
  const matches = activeRows().filter((r) => rowMatches(r, state.terms));
  if (matches.length !== 1) return;
  const suspect = matches[0];
  const v = $("#verdict");
  if (suspect.id === state.culpritId) {
    state.solved = true;
    const cfg = DIFFICULTY[state.difficulty];
    const earned = Math.max(20, cfg.points - state.hintsUsedThisCase * 15 - state.wrongArrestsThisCase * 40);
    state.score += earned;
    v.className = "verdict verdict--win";
    v.textContent = `✅ Case closed! ${suspect.name} was the culprit. +${earned} points.`;
    const jailed = state.avatarEls[suspect.id];
    if (jailed) {
      jailed.classList.add("avatar--jailed");
      jailed.classList.remove("avatar--out");
      jailed.querySelector(".mug__pic").innerHTML = suspectSVG(suspect.id) + jailBars();
      const s = jailed.querySelector(".stamp");
      if (s) s.textContent = "GUILTY";
    }
    $("#arrest-btn").disabled = true;
    $("#next-btn").classList.remove("hidden");
    if (state.pos === state.order.length - 1) $("#next-btn").textContent = "Finish shift ▶";
    $("#score-badge").textContent = `Score: ${state.score}`;
  } else {
    state.wrongArrestsThisCase += 1;
    v.className = "verdict verdict--lose";
    v.textContent = `❌ ${suspect.name} had an alibi. Your SQL ran fine — the reasoning was off. Re-check your conditions.`;
  }
}

// ---- boot ----
$("#mascot").innerHTML = detectiveSVG();
injectIcons();
document.querySelectorAll(".diff[data-diff]").forEach((btn) =>
  btn.addEventListener("click", () => startShift(btn.dataset.diff))
);
$("#replay-btn").addEventListener("click", () => {
  $("#summary-screen").classList.add("hidden");
  $("#start-screen").classList.remove("hidden");
});
$("#add-btn").addEventListener("click", addCondition);
$("#cond-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addCondition(); });
$("#arrest-btn").addEventListener("click", makeArrest);
$("#next-btn").addEventListener("click", nextCase);
$("#menu-btn").addEventListener("click", goToMenu);
