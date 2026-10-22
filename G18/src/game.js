import { ROUNDS } from "./scenarios.js";
import {
  BLOCK_DEFS,
  PALETTE_ORDER,
  INDEX_OPTS,
  OP_OPTS,
  runProgram,
  maxLoopDepth,
} from "./blocks.js";

// ---- State ------------------------------------------------------------
let roundIndex = 0;
let program = []; // root children
let selectedId = "root"; // container to insert into
let nextId = 1;
const passed = new Set(); // round ids sorted correctly
const efficient = new Set(); // round ids under budget

function newNode(type) {
  const def = BLOCK_DEFS[type];
  const node = { id: "b" + nextId++, type };
  if (def.kind === "container") node.children = [];
  if (def.defaultConfig) node.config = { ...def.defaultConfig };
  return node;
}

function makeSelect(options, value, onChange) {
  const sel = document.createElement("select");
  sel.className = "cfg-select";
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    if (o === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.onchange = (e) => { e.stopPropagation(); onChange(sel.value); tutorialCheck(); };
  sel.onclick = (e) => e.stopPropagation();
  return sel;
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

function findParent(nodes, id, parent = "root") {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) {
      const r = findParent(n.children, id, n.id);
      if (r) return r;
    }
  }
  return null;
}

function subtreeContains(node, id) {
  if (node.id === id) return true;
  if (node.children) return node.children.some((c) => subtreeContains(c, id));
  return false;
}

function removeNode(nodes, id) {
  const i = nodes.findIndex((n) => n.id === id);
  if (i >= 0) {
    nodes.splice(i, 1);
    return true;
  }
  for (const n of nodes) {
    if (n.children && removeNode(n.children, id)) return true;
  }
  return false;
}

// ---- Guided walkthrough ----------------------------------------------
let tutorialActive = false;
let tutorialStep = 0;
let tutorialRanOk = false;

function collect(nodes, type, acc = []) {
  for (const n of nodes) {
    if (n.type === type) acc.push(n);
    if (n.children) collect(n.children, type, acc);
  }
  return acc;
}
function containsType(node, type) {
  if (!node.children) return false;
  return node.children.some((c) => c.type === type || containsType(c, type));
}
function anyInside(nodes, ancestorType, childType) {
  return collect(nodes, ancestorType).some((a) => containsType(a, childType));
}

const TUT_STEPS = [
  {
    text: "We'll build a <b>selection sort</b> together. Start with the outer loop: in the <b>Blocks</b> column, click <b>\"for each i : 0 → n-1\"</b>. It'll appear in the middle panel.",
    check: () => collect(program, "loop_i").length > 0,
  },
  {
    text: "Now we nest. Your i-loop is selected (highlighted). Click <b>\"for each j : i+1 → n-1\"</b> — it drops <i>inside</i> the i-loop. That nesting is what makes it n×n work.",
    check: () => anyInside(program, "loop_i", "loop_j_after_i"),
  },
  {
    text: "With the j-loop selected, add a compare: click <b>\"if a[ ] a[ ]\"</b> so it sits inside the j-loop.",
    check: () => anyInside(program, "loop_j_after_i", "if_cmp"),
  },
  {
    text: "Set the comparison using the dropdowns on that if-block: make it read <b>a[i] &gt; a[j]</b> (left = i, operator = &gt;, right = j).",
    check: () =>
      collect(program, "if_cmp").some(
        (n) => n.config.left === "i" && n.config.op === ">" && n.config.right === "j"
      ),
  },
  {
    text: "Almost there. With the if-block selected, add a <b>\"swap a[ ] , a[ ]\"</b> inside it, and set it to <b>swap a[i], a[j]</b>.",
    check: () =>
      collect(program, "if_cmp").some(
        (ifn) =>
          ifn.children &&
          ifn.children.some(
            (c) => c.type === "swap" && c.config.a === "i" && c.config.b === "j"
          )
      ),
  },
  {
    text: "That's a complete selection sort! Hit <b>\u25b6 Run on this data</b> and watch it sort. The comparison counter shows the cost — that's what the rest of the game is about.",
    check: () => tutorialRanOk,
  },
];

function beginTutorial() {
  program = [];
  selectedId = "root";
  tutorialActive = true;
  tutorialStep = 0;
  tutorialRanOk = false;
  document.getElementById("tutorial-start").classList.remove("show");
  renderProgram();
  tutorialCheck();
}

function tutorialCheck() {
  if (!tutorialActive) return;
  while (tutorialStep < TUT_STEPS.length && TUT_STEPS[tutorialStep].check()) {
    tutorialStep++;
  }
  if (tutorialStep >= TUT_STEPS.length) {
    completeTutorial();
    return;
  }
  const box = document.getElementById("tutorial-box");
  document.getElementById("tut-step").textContent =
    `Guided walkthrough · step ${tutorialStep + 1} of ${TUT_STEPS.length}`;
  document.getElementById("tut-text").innerHTML = TUT_STEPS[tutorialStep].text;
  box.classList.add("show");
}

function completeTutorial() {
  tutorialActive = false;
  const box = document.getElementById("tutorial-box");
  document.getElementById("tut-step").textContent = "Walkthrough complete ✓";
  document.getElementById("tut-text").innerHTML =
    "Nice — you built and ran a real sorting algorithm! Now try the other rounds. Watch what happens to the cost on <b>already-sorted</b> and <b>reversed</b> data, and see if you can beat each round's budget.";
  setTimeout(() => box.classList.remove("show"), 6000);
}

function endTutorial() {
  tutorialActive = false;
  document.getElementById("tutorial-box").classList.remove("show");
}

// ---- Palette ----------------------------------------------------------
function renderPalette() {
  const el = document.getElementById("palette");
  el.innerHTML = "";
  for (const type of PALETTE_ORDER) {
    const def = BLOCK_DEFS[type];
    const b = document.createElement("button");
    b.className = "palette-block";
    b.style.borderLeftColor = def.color;
    b.innerHTML = `<span class="pb-label">${def.label}</span>` +
      `<span class="pb-kind">${def.kind === "container" ? "holds blocks" : "action"}</span>`;
    b.onclick = () => addBlock(type);
    el.appendChild(b);
  }
}

function addBlock(type) {
  const node = newNode(type);
  if (selectedId === "root") {
    program.push(node);
  } else {
    const target = findNode(program, selectedId);
    if (target && target.children) {
      target.children.push(node);
    } else {
      program.push(node); // fallback
    }
  }
  // Auto-select newly added container so nesting feels natural.
  if (node.children) selectedId = node.id;
  renderProgram();
}

// ---- Program tree -----------------------------------------------------
function renderProgram() {
  const root = document.getElementById("program");
  root.innerHTML = "";
  const rootZone = document.createElement("div");
  rootZone.className = "drop-hint" + (selectedId === "root" ? " active" : "");
  rootZone.textContent = selectedId === "root"
    ? "▶ new blocks go here (top level)"
    : "click here to add at top level";
  rootZone.onclick = () => { selectedId = "root"; renderProgram(); };
  root.appendChild(rootZone);

  if (program.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "Pick blocks from the left to build your sort.";
    root.appendChild(empty);
  }
  renderNodes(program, root, 0);
  tutorialCheck();
}

function renderNodes(nodes, parentEl, depth) {
  for (const node of nodes) {
    const def = BLOCK_DEFS[node.type];
    const row = document.createElement("div");
    row.className = "block-row";
    row.style.marginLeft = depth * 22 + "px";
    row.style.borderLeftColor = def.color;
    if (node.id === selectedId) row.classList.add("selected");

    const label = document.createElement("span");
    label.className = "block-label";
    if (def.configurable === "compare") {
      label.appendChild(document.createTextNode("if  a["));
      label.appendChild(makeSelect(INDEX_OPTS, node.config.left, (v) => (node.config.left = v)));
      label.appendChild(document.createTextNode("] "));
      label.appendChild(makeSelect(OP_OPTS, node.config.op, (v) => (node.config.op = v)));
      label.appendChild(document.createTextNode(" a["));
      label.appendChild(makeSelect(INDEX_OPTS, node.config.right, (v) => (node.config.right = v)));
      label.appendChild(document.createTextNode("]"));
    } else if (def.configurable === "swap") {
      label.appendChild(document.createTextNode("swap  a["));
      label.appendChild(makeSelect(INDEX_OPTS, node.config.a, (v) => (node.config.a = v)));
      label.appendChild(document.createTextNode("] , a["));
      label.appendChild(makeSelect(INDEX_OPTS, node.config.b, (v) => (node.config.b = v)));
      label.appendChild(document.createTextNode("]"));
    } else {
      label.textContent = def.label;
    }
    row.appendChild(label);

    if (def.kind === "container") {
      const tag = document.createElement("span");
      tag.className = "insert-tag";
      tag.textContent = node.id === selectedId ? "◀ adding inside" : "＋ add inside";
      tag.onclick = (e) => { e.stopPropagation(); selectedId = node.id; renderProgram(); };
      row.appendChild(tag);
    }

    const del = document.createElement("span");
    del.className = "del-btn";
    del.textContent = "✕";
    del.onclick = (e) => {
      e.stopPropagation();
      const parentId = findParent(program, node.id) || "root";
      const selWasInside = subtreeContains(node, selectedId);
      removeNode(program, node.id);
      if (selWasInside) selectedId = parentId;
      renderProgram();
    };
    row.appendChild(del);

    row.onclick = () => {
      if (def.kind === "container") { selectedId = node.id; renderProgram(); }
    };
    parentEl.appendChild(row);

    if (node.children) renderNodes(node.children, parentEl, depth + 1);
  }
}

// ---- Round / data -----------------------------------------------------
function currentRound() { return ROUNDS[roundIndex]; }

function renderRound() {
  const r = currentRound();
  const col = document.querySelector(".data-col");
  if (col) {
    col.classList.remove("round-change");
    void col.offsetWidth; // restart animation
    col.classList.add("round-change");
  }
  document.getElementById("round-title").textContent =
    `Round ${r.id} of ${ROUNDS.length}: ${r.title}`;
  document.getElementById("round-note").textContent = r.note;
  document.getElementById("round-budget").textContent =
    `Goal: sort ascending. "Efficient" badge if under ${r.budget} comparisons.`;
  renderBars(r.data, -1, -1);
  setStats(null);
  document.getElementById("verdict").textContent = "";
  document.getElementById("verdict").className = "verdict";
  updateProgress();
}

function renderBars(data, hiA, hiB) {
  const el = document.getElementById("bars");
  el.innerHTML = "";
  const max = Math.max(...data);
  for (let k = 0; k < data.length; k++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = (data[k] / max) * 100 + "%";
    if (k === hiA || k === hiB) bar.classList.add("hi");
    const cap = document.createElement("span");
    cap.className = "bar-cap";
    cap.textContent = data[k];
    bar.appendChild(cap);
    el.appendChild(bar);
  }
}

function setStats(res) {
  document.getElementById("stat-compares").textContent =
    res ? res.comparisons : "–";
  document.getElementById("stat-swaps").textContent = res ? res.swaps : "–";
}

// ---- Run --------------------------------------------------------------
let animTimer = null;

function run() {
  clearInterval(animTimer);
  const r = currentRound();
  const verdict = document.getElementById("verdict");
  let res;
  try {
    res = runProgram(program, r.data);
  } catch (err) {
    verdict.textContent = "⚠ " + err.message;
    verdict.className = "verdict bad";
    renderBars(r.data, -1, -1);
    return;
  }

  // Animate the trace, then show final verdict.
  const trace = res.trace;
  let step = 0;
  const speed = trace.length > 400 ? 4 : trace.length > 120 ? 18 : 45;
  let liveCompares = 0, liveSwaps = 0;

  if (trace.length === 0) {
    renderBars(res.result, -1, -1);
    finish(res);
    return;
  }

  animTimer = setInterval(() => {
    const ev = trace[step];
    renderBars(ev.arr, ev.a, ev.b);
    if (ev.kind === "compare") liveCompares++; else liveSwaps++;
    document.getElementById("stat-compares").textContent = liveCompares;
    document.getElementById("stat-swaps").textContent = liveSwaps;
    step++;
    if (step >= trace.length) {
      clearInterval(animTimer);
      renderBars(res.result, -1, -1);
      finish(res);
    }
  }, speed);
}

function finish(res) {
  const r = currentRound();
  setStats(res);
  const verdict = document.getElementById("verdict");
  if (!res.sorted) {
    verdict.innerHTML =
      "✗ Not sorted. Your construction ran, but the list isn't in order — " +
      "one pass or the wrong nesting won't fully sort this data.";
    verdict.className = "verdict bad";
    return;
  }
  passed.add(r.id);
  tutorialRanOk = true;
  tutorialCheck();
  const wasEfficient = efficient.has(r.id);
  let msg = "✓ Sorted correctly! ";
  if (res.comparisons <= r.budget) {
    efficient.add(r.id);
    msg += `And under budget (${res.comparisons} ≤ ${r.budget} comparisons) — efficient.`;
    verdict.className = "verdict great";
    if (!wasEfficient) celebrate(res.comparisons, r.budget);
  } else {
    msg += `But it cost ${res.comparisons} comparisons (budget ${r.budget}). ` +
      "Correct isn't the same as efficient — can you cut the wasted work?";
    verdict.className = "verdict ok";
  }
  verdict.textContent = msg;
  updateProgress();
  maybeShowSummary();
}

function celebrate(cmp, budget) {
  const el = document.getElementById("badge-toast");
  el.querySelector(".badge-sub").textContent =
    `Efficient sort — ${cmp} comparisons, under the ${budget} budget.`;
  el.classList.remove("show");
  void el.offsetWidth; // restart animation
  el.classList.add("show");
  clearTimeout(celebrate._t);
  celebrate._t = setTimeout(() => el.classList.remove("show"), 3200);
}

// ---- Navigation / progress -------------------------------------------
function updateProgress() {
  const el = document.getElementById("progress");
  el.innerHTML = "";
  ROUNDS.forEach((r, idx) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    if (efficient.has(r.id)) dot.classList.add("star");
    else if (passed.has(r.id)) dot.classList.add("done");
    if (r.id === currentRound().id) dot.classList.add("current");
    dot.textContent = efficient.has(r.id) ? "★" : r.id;
    dot.title = `Go to round ${r.id}`;
    dot.onclick = () => {
      clearInterval(animTimer);
      roundIndex = idx;
      renderRound();
    };
    el.appendChild(dot);
  });
}

function nextRound() {
  clearInterval(animTimer);
  if (roundIndex < ROUNDS.length - 1) {
    roundIndex++;
    renderRound();
  }
}
function prevRound() {
  clearInterval(animTimer);
  if (roundIndex > 0) {
    roundIndex--;
    renderRound();
  }
}

function maybeShowSummary() {
  if (passed.size === ROUNDS.length) {
    document.getElementById("summary").classList.add("show");
  }
}

// ---- Big-O closer -----------------------------------------------------
function showBigO() {
  const r = currentRound();
  let res;
  try { res = runProgram(program, r.data); } catch { res = null; }
  const n = r.data.length;
  const depth = maxLoopDepth(program);
  const measured = res ? res.comparisons : null;
  const orderName = { 0: "O(1)", 1: "O(n)", 2: "O(n²)", 3: "O(n³)" }[depth] || `O(n^${depth})`;
  const predict = { 0: 1, 1: n, 2: Math.round((n * n) / 2), 3: Math.round((n ** 3) / 6) }[depth] || n ** depth;

  const box = document.getElementById("bigo-body");
  box.innerHTML = `
    <p class="bo-intro">Big-O answers one question: <i>as the input <b>n</b> grows, how fast does the
    work grow?</i> Here's how to read it off the algorithm you just built — the same 4 steps work on any code.</p>

    <div class="bo-step"><span class="bo-n">1</span><div>
      <b>Find the loops that run over the data.</b> Every "for each" block, and
      "repeat until no swaps", runs up to <b>n</b> times. A block in no loop runs
      once — that's constant, O(1).
    </div></div>

    <div class="bo-step"><span class="bo-n">2</span><div>
      <b>Count how deeply they're nested.</b> Nesting <i>multiplies</i>: a loop inside a
      loop runs n × n times. In your current program the deepest nesting is
      <b>${depth} loop${depth === 1 ? "" : "s"}</b> deep.
    </div></div>

    <div class="bo-step"><span class="bo-n">3</span><div>
      <b>Turn depth into a formula.</b> ${depth} nested loop${depth === 1 ? "" : "s"} over n
      ⇒ about <b>n${depth <= 1 ? "" : "<sup>" + depth + "</sup>"}</b> operations${depth >= 2 ? ` (here, roughly ${predict} for n = ${n})` : ""}.
    </div></div>

    <div class="bo-step"><span class="bo-n">4</span><div>
      <b>Drop constants and smaller terms.</b> We ignore n²/2 vs 2n² — only the
      shape of growth matters. So n²/2, 3n²+n, and 100n² are all just <b>O(n²)</b>.
      Your program's shape: <b class="bo-verdict">${orderName}</b>.
    </div></div>

    <div class="bo-check">
      ${measured === null
        ? "Build a runnable sort and reopen this to compare the prediction against the real count."
        : `<b>Reality check:</b> your sort actually made <b>${measured}</b> comparisons on this round (n = ${n}). Compare that to the ${orderName} prediction${depth >= 2 ? ` of ~${predict}` : ""}. ` +
           (depth >= 2
             ? "An early-exit (repeat-until-no-swaps) can beat this on easy data — worst case O(n²), best case as low as O(n). Big-O usually names the worst case."
             : "A single pass is cheap — but check it actually finished sorting on the hard rounds!")}
    </div>

    <p class="bo-rule">Rule of thumb: <b>0 loops → O(1) · 1 loop → O(n) · 2 nested → O(n²) · 3 nested → O(n³)</b>.
    Double n and O(n²) work roughly quadruples — that's why the big rounds hurt.</p>
  `;
  document.getElementById("bigo").classList.add("show");
}

// ---- Reference panel --------------------------------------------------
function toggleRef() {
  document.getElementById("reference").classList.toggle("show");
}

// ---- Wire up ----------------------------------------------------------
export function initGame() {
  renderPalette();
  renderProgram();
  renderRound();
  document.getElementById("tutorial-start").classList.add("show");
  document.getElementById("btn-tut-start").onclick = beginTutorial;
  document.getElementById("btn-tut-skip").onclick = () =>
    document.getElementById("tutorial-start").classList.remove("show");
  document.getElementById("btn-tut-quit").onclick = endTutorial;
  document.getElementById("btn-run").onclick = run;
  document.getElementById("btn-clear").onclick = () => {
    program = []; selectedId = "root"; renderProgram();
  };
  document.getElementById("btn-next").onclick = nextRound;
  document.getElementById("btn-prev").onclick = prevRound;
  document.getElementById("btn-ref").onclick = toggleRef;
  document.getElementById("btn-ref-close").onclick = toggleRef;
  document.getElementById("btn-bigo").onclick = showBigO;
  document.getElementById("btn-bigo-close").onclick = () =>
    document.getElementById("bigo").classList.remove("show");
  document.getElementById("btn-summary-bigo").onclick = () => {
    document.getElementById("summary").classList.remove("show");
    showBigO();
  };
}
