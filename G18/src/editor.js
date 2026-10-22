// editor.js
//
// The brewing-station modal for the map version. It's the SAME block
// editor as the plain game, but opened per-NPC and framed as brewing a
// potion. The key intrinsic twist: an INEFFICIENT recipe (over the
// comparison budget) makes the cauldron overheat and explode — so the
// cost isn't just a number, it has a consequence. Correct-but-wasteful
// literally blows up, which is the whole point about O-notation.

import { ROUNDS } from "./scenarios.js";
import {
  BLOCK_DEFS,
  PALETTE_ORDER,
  INDEX_OPTS,
  OP_OPTS,
  runProgram,
  maxLoopDepth,
} from "./blocks.js";

let roundIndex = 0;
let program = [];
let selectedId = "root";
let nextId = 1;
let onComplete = null;
let animTimer = null;

const $ = (id) => document.getElementById(id);
function round() { return ROUNDS[roundIndex]; }

// ---- tree helpers -----------------------------------------------------
function newNode(type) {
  const def = BLOCK_DEFS[type];
  const node = { id: "b" + nextId++, type };
  if (def.kind === "container") node.children = [];
  if (def.defaultConfig) node.config = { ...def.defaultConfig };
  return node;
}
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findNode(n.children, id); if (f) return f; }
  }
  return null;
}
function findParent(nodes, id, parent = "root") {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) { const r = findParent(n.children, id, n.id); if (r) return r; }
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
  if (i >= 0) { nodes.splice(i, 1); return true; }
  for (const n of nodes) if (n.children && removeNode(n.children, id)) return true;
  return false;
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
  sel.onchange = (e) => { e.stopPropagation(); onChange(sel.value); };
  sel.onclick = (e) => e.stopPropagation();
  return sel;
}

// ---- palette / program ------------------------------------------------
function renderPalette() {
  const el = $("b-palette");
  el.innerHTML = "";
  for (const type of PALETTE_ORDER) {
    const def = BLOCK_DEFS[type];
    const b = document.createElement("button");
    b.className = "palette-block";
    b.style.borderLeftColor = def.color;
    b.innerHTML =
      `<span class="pb-label">${def.label}</span>` +
      `<span class="pb-kind">${def.kind === "container" ? "holds blocks" : "action"}</span>`;
    b.onclick = () => addBlock(type);
    el.appendChild(b);
  }
}
function addBlock(type) {
  const node = newNode(type);
  if (selectedId === "root") program.push(node);
  else {
    const t = findNode(program, selectedId);
    if (t && t.children) t.children.push(node); else program.push(node);
  }
  if (node.children) selectedId = node.id;
  renderProgram();
}
function renderProgram() {
  const root = $("b-program");
  root.innerHTML = "";
  const rz = document.createElement("div");
  rz.className = "drop-hint" + (selectedId === "root" ? " active" : "");
  rz.textContent = selectedId === "root" ? "▶ new blocks go here (top level)" : "click here to add at top level";
  rz.onclick = () => { selectedId = "root"; renderProgram(); };
  root.appendChild(rz);
  if (program.length === 0) {
    const e = document.createElement("div");
    e.className = "empty-note";
    e.textContent = "Pick recipe blocks from the left to brew.";
    root.appendChild(e);
  }
  renderNodes(program, root, 0);
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
      const inside = subtreeContains(node, selectedId);
      removeNode(program, node.id);
      if (inside) selectedId = parentId;
      renderProgram();
    };
    row.appendChild(del);
    row.onclick = () => { if (def.kind === "container") { selectedId = node.id; renderProgram(); } };
    parentEl.appendChild(row);
    if (node.children) renderNodes(node.children, parentEl, depth + 1);
  }
}

// ---- data / bars ------------------------------------------------------
function renderBars(data, hiA, hiB) {
  const el = $("b-bars");
  el.innerHTML = "";
  const max = Math.max(...data);
  for (let k = 0; k < data.length; k++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = (data[k] / max) * 100 + "%";
    if (k === hiA || k === hiB) bar.classList.add("hi");
    const cap = document.createElement("span");
    cap.className = "bar-cap"; cap.textContent = data[k];
    bar.appendChild(cap);
    el.appendChild(bar);
  }
}

// ---- run / brew -------------------------------------------------------
function run() {
  clearInterval(animTimer);
  const r = round();
  const verdict = $("b-verdict");
  let res;
  try {
    res = runProgram(program, r.data);
  } catch (err) {
    verdict.textContent = "💥 " + err.message;
    verdict.className = "verdict bad";
    explode("The recipe ran wild!");
    renderBars(r.data, -1, -1);
    return;
  }
  const trace = res.trace;
  let step = 0;
  const speed = trace.length > 400 ? 4 : trace.length > 120 ? 18 : 45;
  let lc = 0, ls = 0;
  if (trace.length === 0) { renderBars(res.result, -1, -1); finish(res); return; }
  animTimer = setInterval(() => {
    const ev = trace[step];
    renderBars(ev.arr, ev.a, ev.b);
    if (ev.kind === "compare") lc++; else ls++;
    $("b-compares").textContent = lc;
    $("b-swaps").textContent = ls;
    step++;
    if (step >= trace.length) {
      clearInterval(animTimer);
      renderBars(res.result, -1, -1);
      finish(res);
    }
  }, speed);
}

function finish(res) {
  const r = round();
  $("b-compares").textContent = res.comparisons;
  $("b-swaps").textContent = res.swaps;
  const verdict = $("b-verdict");

  // Overheat takes priority: too many stirs blows up even if it also
  // failed to sort.
  if (res.comparisons > r.budget) {
    const extra = res.sorted
      ? "Correct isn't enough — find a cheaper recipe."
      : "And it didn't even finish sorting — rethink the recipe.";
    verdict.innerHTML =
      `💥 You stirred <b>${res.comparisons}</b> times (limit ${r.budget}). ` +
      `The cauldron overheated and boiled over! ${extra}`;
    verdict.className = "verdict ok";
    explode("Too many stirs — BOOM!");
    return;
  }
  if (!res.sorted) {
    verdict.innerHTML =
      "🌫 Unstable brew — the ingredients aren't in order. A single pass or the wrong nesting won't finish this potion.";
    verdict.className = "verdict bad";
    fizzle();
    return;
  }
  // Perfect brew
  verdict.innerHTML =
    `✨ Perfect potion! Sorted in just <b>${res.comparisons}</b> stirs (under ${r.budget}). ${r.brewer} is delighted.`;
  verdict.className = "verdict great";
  sparkle();
  if (onComplete) onComplete(r.id);
}

function explode(msg) {
  const fx = $("b-fx");
  fx.textContent = "💥";
  fx.className = "brew-fx boom";
  const box = $("brew-modal").querySelector(".brew-box");
  box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
  const surface = document.querySelector(".caul-surface");
  if (surface) {
    surface.classList.remove("boiling");
    void surface.offsetWidth;
    surface.classList.add("boiling");
    setTimeout(() => surface.classList.remove("boiling"), 2400);
  }
  showFxLabel(msg, "#ff8a5c");
}
function fizzle() {
  // Murky, sputtering brew feedback — does NOT cover the bars, so the
  // player can still read where the sort ended up.
  const surface = document.querySelector(".caul-surface");
  if (surface) {
    surface.classList.remove("murky");
    void surface.offsetWidth;
    surface.classList.add("murky");
    setTimeout(() => surface.classList.remove("murky"), 2200);
  }
  const art = document.querySelector(".cauldron-art");
  if (art) {
    for (let k = 0; k < 4; k++) {
      const p = document.createElement("div");
      p.className = "smoke-puff";
      p.style.left = 200 + Math.random() * 70 + "px";
      p.style.top = 56 + Math.random() * 12 + "px";
      p.style.animationDelay = k * 0.12 + "s";
      art.appendChild(p);
      setTimeout(() => p.remove(), 1600 + k * 120);
    }
  }
  showFxLabel("Unstable brew — not sorted", "#cfcaa2");
}

function sparkle() {
  const fx = $("b-fx");
  fx.textContent = "✨";
  fx.className = "brew-fx pop";
  showFxLabel("Perfect brew!", "#8ff0b6");
}
function showFxLabel(msg, color) {
  const l = $("b-fx-label");
  l.textContent = msg;
  l.style.color = color;
  l.classList.remove("show"); void l.offsetWidth; l.classList.add("show");
  setTimeout(() => l.classList.remove("show"), 2200);
}

// ---- big-O + reference ------------------------------------------------
function showBigO() {
  const r = round();
  let res = null;
  try { res = runProgram(program, r.data); } catch { res = null; }
  const n = r.data.length;
  const depth = maxLoopDepth(program);
  const measured = res ? res.comparisons : null;
  const orderName = { 0: "O(1)", 1: "O(n)", 2: "O(n²)", 3: "O(n³)" }[depth] || `O(n^${depth})`;
  const predict = { 0: 1, 1: n, 2: Math.round((n * n) / 2), 3: Math.round((n ** 3) / 6) }[depth] || n ** depth;
  $("b-bigo-body").innerHTML = `
    <p class="bo-intro">Big-O answers: <i>as the batch of ingredients <b>n</b> grows, how fast does the stirring grow?</i></p>
    <div class="bo-step"><span class="bo-n">1</span><div><b>Find the loops.</b> Each "for each" and "repeat until no swaps" runs up to <b>n</b> times; a block in no loop runs once (O(1)).</div></div>
    <div class="bo-step"><span class="bo-n">2</span><div><b>Count the nesting.</b> Nesting multiplies. Your deepest nesting here is <b>${depth} loop${depth === 1 ? "" : "s"}</b>.</div></div>
    <div class="bo-step"><span class="bo-n">3</span><div><b>Depth → formula.</b> ${depth} nested loop${depth === 1 ? "" : "s"} ⇒ about <b>n${depth <= 1 ? "" : "<sup>" + depth + "</sup>"}</b> stirs${depth >= 2 ? ` (~${predict} for n = ${n})` : ""}.</div></div>
    <div class="bo-step"><span class="bo-n">4</span><div><b>Drop constants.</b> n²/2, 3n²+n, 100n² are all just <b>O(n²)</b>. Your recipe's shape: <b class="bo-verdict">${orderName}</b>.</div></div>
    <div class="bo-check">${measured === null
      ? "Brew a runnable recipe and reopen this to compare prediction vs reality."
      : `<b>Reality check:</b> your recipe made <b>${measured}</b> stirs on this batch (n = ${n}). Compare to the ${orderName} estimate${depth >= 2 ? ` of ~${predict}` : ""}. ${depth >= 2 ? "An early-exit can drop the best case to O(n) — but Big-O usually names the worst case, and that's what overheats the cauldron." : "Cheap — but make sure it actually finished sorting!"}`}</div>
    <p class="bo-rule">Rule of thumb: <b>0 loops → O(1) · 1 → O(n) · 2 nested → O(n²) · 3 → O(n³)</b>.</p>`;
  $("brew-bigo").classList.add("show");
}

// ---- open / close -----------------------------------------------------
export function openBrewing(idx, cb) {
  roundIndex = idx;
  onComplete = cb;
  program = [];
  selectedId = "root";
  const r = round();
  $("b-potion-title").textContent = `🧪 ${r.potion}`;
  $("b-brewer").textContent = `${r.brewer} needs you to sort the ingredients into ascending order.`;
  $("b-note").textContent = r.note;
  $("b-budget").textContent = `Stir budget: keep it under ${r.budget} comparisons, or the cauldron overheats.`;
  $("b-compares").textContent = "–";
  $("b-swaps").textContent = "–";
  $("b-verdict").textContent = "";
  $("b-verdict").className = "verdict";
  $("b-fx").className = "brew-fx";
  renderPalette();
  renderProgram();
  renderBars(r.data, -1, -1);
  $("brew-modal").classList.add("show");
}
function closeBrewing() {
  clearInterval(animTimer);
  $("brew-modal").classList.remove("show");
  if (window.__onBrewClose) window.__onBrewClose();
}

export function initEditor() {
  $("b-run").onclick = run;
  $("b-clear").onclick = () => { program = []; selectedId = "root"; renderProgram(); };
  $("b-close").onclick = closeBrewing;
  $("b-ref").onclick = () => $("brew-ref").classList.toggle("show");
  $("b-ref-close").onclick = () => $("brew-ref").classList.remove("show");
  $("b-bigo").onclick = showBigO;
  $("b-bigo-close").onclick = () => $("brew-bigo").classList.remove("show");
}
