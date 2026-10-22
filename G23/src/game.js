"use strict";

// ---------- Setup ----------
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const trayEl = document.getElementById("tray");

const GRID = 60;
const COLS = Math.floor(canvas.width / GRID);
const ROWS = Math.floor(canvas.height / GRID);
const R = 22;

// ---------- Level definitions ----------
// Rooms carry PORTS (a budget of path stubs), not fixed connections.
//   ports.out = one-way paths that can lead OUT of this room
//   ports.two = two-way paths this room can take part in
// The PLAYER decides which rooms those paths connect to.
function mk(id, mark, out, two) {
  return { id, label: id, mark, ports: { out, two } };
}

const LEVELS = [
  { // 1 — 4 rooms: intro to one-way + sink exit
    name: "1 · First Steps (4 rooms)",
    rooms: [
      mk("A", "start", 1, 0),
      mk("B", "item", 1, 1),
      mk("C", "item", 0, 1),
      mk("D", "exit", 0, 0),
    ],
  },
  { // 2 — 5 rooms: mixing one-way and two-way
    name: "2 · Crossroads (5 rooms)",
    rooms: [
      mk("A", "start", 1, 1),
      mk("B", "item", 0, 2),
      mk("C", "item", 0, 1),
      mk("D", "none", 0, 2),
      mk("E", "exit", 0, 1),
    ],
  },
  { // 3 — 6 rooms: a dead-end branch you must visit
    name: "3 · The Detour (6 rooms)",
    rooms: [
      mk("A", "start", 0, 1),
      mk("B", "item", 0, 2),
      mk("C", "item", 0, 2),
      mk("D", "item", 0, 1),
      mk("E", "none", 1, 2),
      mk("F", "exit", 0, 0),
    ],
  },
  { // 4 — 7 rooms: a one-way tail to the exit
    name: "4 · One-Way Tail (7 rooms)",
    rooms: [
      mk("A", "start", 1, 1),
      mk("B", "item", 0, 2),
      mk("C", "item", 1, 1),
      mk("D", "item", 0, 2),
      mk("E", "none", 0, 2),
      mk("F", "none", 1, 1),
      mk("G", "exit", 0, 0),
    ],
  },
  { // 5 — 8 rooms: two one-way traps along the route
    name: "5 · Point of No Return (8 rooms)",
    rooms: [
      mk("A", "start", 0, 1),
      mk("B", "item", 0, 2),
      mk("C", "item", 1, 2),
      mk("D", "item", 0, 2),
      mk("E", "item", 0, 2),
      mk("F", "none", 0, 2),
      mk("G", "none", 1, 1),
      mk("H", "exit", 0, 0),
    ],
  },
  { // 6 — 9 rooms: multiple one-ways + a decoy branch
    name: "6 · Labyrinth (9 rooms)",
    rooms: [
      mk("A", "start", 0, 1),
      mk("B", "item", 0, 2),
      mk("C", "item", 1, 1),
      mk("D", "item", 0, 2),
      mk("E", "item", 1, 1),
      mk("F", "item", 0, 2),
      mk("G", "none", 1, 2),
      mk("H", "none", 0, 1),
      mk("I", "exit", 0, 0),
    ],
  },
];

let currentLevel = 0;
let LEVEL = LEVELS[currentLevel];

// solved levels persisted across sessions
let solved = loadSolved();
function loadSolved() {
  try { return new Set(JSON.parse(localStorage.getItem("ra_solved") || "[]")); }
  catch { return new Set(); }
}
function saveSolved() {
  try { localStorage.setItem("ra_solved", JSON.stringify([...solved])); } catch {}
}

// ---------- State ----------
let placement = {};       // roomId -> {col,row}
let edges = [];           // {a,b,directed}
let selectedRoom = null;  // room picked up from tray (arrange mode)
let linkFrom = null;      // first room chosen while linking

let mode = "arrange";     // arrange | link-oneway | link-twoway | erase-link
let running = false;
let playerRoom = null;
let collected = new Set();

// ---------- Lookups ----------
function room(id) { return LEVEL.rooms.find(r => r.id === id); }
function isPlaced(id) { return Object.prototype.hasOwnProperty.call(placement, id); }
function cellCenter(col, row) { return { x: col * GRID + GRID / 2, y: row * GRID + GRID / 2 }; }
function pxToCell(px, py) { return { col: Math.floor(px / GRID), row: Math.floor(py / GRID) }; }
function occupied(col, row) {
  return Object.entries(placement).find(([, p]) => p.col === col && p.row === row)?.[0] || null;
}
function roomAtPixel(px, py) {
  for (const [id, p] of Object.entries(placement)) {
    const c = cellCenter(p.col, p.row);
    if (Math.hypot(px - c.x, py - c.y) <= R + 4) return id;
  }
  return null;
}

// ---------- Port accounting ----------
function outUsed(id) { return edges.filter(e => e.directed && e.a === id).length; }
function twoUsed(id) { return edges.filter(e => !e.directed && (e.a === id || e.b === id)).length; }
function outLeft(id) { return room(id).ports.out - outUsed(id); }
function twoLeft(id) { return room(id).ports.two - twoUsed(id); }

function edgeExists(a, b) {
  return edges.some(e =>
    (e.a === a && e.b === b) || (e.a === b && e.b === a)
  );
}
function edgeAtPixel(px, py) {
  // find an edge whose segment is near the click
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!isPlaced(e.a) || !isPlaced(e.b)) continue;
    const a = cellCenter(placement[e.a].col, placement[e.a].row);
    const b = cellCenter(placement[e.b].col, placement[e.b].row);
    if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= 7) return i;
  }
  return -1;
}
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ---------- Graph queries ----------
function neighbors(id) {
  const out = [];
  for (const e of edges) {
    if (e.a === id) out.push(e.b);
    else if (e.b === id && !e.directed) out.push(e.a);
  }
  return out;
}
function itemRooms() { return LEVEL.rooms.filter(r => r.mark === "item"); }
function startRoom() { return LEVEL.rooms.find(r => r.mark === "start"); }
function exitRoom() { return LEVEL.rooms.find(r => r.mark === "exit"); }

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (cls ? " " + cls : "");
}
function markColor(mark) {
  if (mark === "start") return "#37d67a";
  if (mark === "exit") return "#ff6b6b";
  if (mark === "item") return "#ffd166";
  return "#3a4270";
}
function markLabel(mark) {
  if (mark === "start") return "Start";
  if (mark === "exit") return "Exit";
  if (mark === "item") return "Item";
  return "Room";
}

// ---------- Tray UI ----------
function portsHTML(id) {
  const r = room(id);
  const oLeft = outLeft(id), tLeft = twoLeft(id);
  const bits = [];
  if (r.ports.out > 0) bits.push(`<b>&rarr;</b> one-way out: ${oLeft}/${r.ports.out} left`);
  if (r.ports.two > 0) bits.push(`<b>&mdash;</b> two-way: ${tLeft}/${r.ports.two} left`);
  if (!bits.length) bits.push("no paths of its own");
  return bits.join("<br>");
}

function renderTray() {
  trayEl.innerHTML = "";
  for (const r of LEVEL.rooms) {
    const chip = document.createElement("div");
    chip.className = "chip";
    if (isPlaced(r.id)) chip.classList.add("placed");
    if (selectedRoom === r.id) chip.classList.add("selected");
    chip.innerHTML = `
      <div class="chip-head">
        <span class="dot" style="background:${markColor(r.mark)}"></span>
        ${r.label} &middot; ${markLabel(r.mark)}
      </div>
      <div class="ports">${portsHTML(r.id)}</div>
    `;
    if (!isPlaced(r.id) && !running && mode === "arrange") {
      chip.addEventListener("click", () => {
        selectedRoom = selectedRoom === r.id ? null : r.id;
        renderTray(); draw();
      });
    }
    trayEl.appendChild(chip);
  }
}

// ---------- Drawing ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawEdges();
  drawRooms();
}
function drawGrid() {
  ctx.strokeStyle = "#232a4d"; ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*GRID,0); ctx.lineTo(c*GRID,ROWS*GRID); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*GRID); ctx.lineTo(COLS*GRID,r*GRID); ctx.stroke(); }
}
function drawEdges() {
  ctx.lineWidth = 3;
  for (const e of edges) {
    if (!isPlaced(e.a) || !isPlaced(e.b)) continue;
    const a = cellCenter(placement[e.a].col, placement[e.a].row);
    const b = cellCenter(placement[e.b].col, placement[e.b].row);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ax = a.x + Math.cos(ang)*R, ay = a.y + Math.sin(ang)*R;
    const bx = b.x - Math.cos(ang)*R, by = b.y - Math.sin(ang)*R;
    ctx.strokeStyle = "#7f89b8";
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    if (e.directed) drawArrowhead(bx, by, ang);
  }
}
function drawArrowhead(x, y, ang) {
  const size = 11;
  ctx.fillStyle = "#aeb6e6";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size*Math.cos(ang-0.4), y - size*Math.sin(ang-0.4));
  ctx.lineTo(x - size*Math.cos(ang+0.4), y - size*Math.sin(ang+0.4));
  ctx.closePath(); ctx.fill();
}
function drawRooms() {
  for (const [id, p] of Object.entries(placement)) {
    const r = room(id);
    const c = cellCenter(p.col, p.row);

    if (linkFrom === id) {
      ctx.beginPath(); ctx.arc(c.x, c.y, R+6, 0, Math.PI*2);
      ctx.strokeStyle = "#5b8cff"; ctx.lineWidth = 3; ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI*2);
    ctx.fillStyle = markColor(r.mark); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#0e1330"; ctx.stroke();

    ctx.fillStyle = "#0e1330";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let label = r.label;
    if (r.mark === "item") label = collected.has(id) ? "\u2713" : r.label + "\u2605";
    ctx.fillText(label, c.x, c.y);

    // remaining ports beneath the room (build phase only)
    if (!running) {
      const bits = [];
      if (r.ports.out > 0) bits.push(`\u2192${outLeft(id)}`);
      if (r.ports.two > 0) bits.push(`\u2014${twoLeft(id)}`);
      if (bits.length) {
        ctx.fillStyle = "#9aa3c7";
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText(bits.join("  "), c.x, c.y + R + 12);
      }
    }

    if (running && playerRoom === id) {
      ctx.beginPath(); ctx.arc(c.x, c.y, R-8, 0, Math.PI*2);
      ctx.fillStyle = "rgba(91,140,255,0.9)"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

// ---------- Interaction ----------
canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const px = ev.clientX - rect.left;
  const py = ev.clientY - rect.top;

  if (running) { handleRunClick(px, py); return; }

  if (mode === "arrange") return handleArrange(px, py);
  if (mode === "link-oneway") return handleLink(px, py, true);
  if (mode === "link-twoway") return handleLink(px, py, false);
  if (mode === "erase-link") return handleEraseLink(px, py);
});

function handleArrange(px, py) {
  const hitId = roomAtPixel(px, py);
  if (hitId && !selectedRoom) {           // pick a placed room back up
    delete placement[hitId];
    selectedRoom = hitId;
    renderTray(); draw();
    return;
  }
  if (selectedRoom) {                     // place the picked room
    const { col, row } = pxToCell(px, py);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
    if (occupied(col, row)) { setStatus("That cell is taken — pick another spot."); return; }
    placement[selectedRoom] = { col, row };
    selectedRoom = null;
    renderTray(); draw(); setStatus("");
  }
}

function handleLink(px, py, directed) {
  const hitId = roomAtPixel(px, py);
  if (!hitId) { linkFrom = null; draw(); return; }

  if (linkFrom === null) { linkFrom = hitId; draw(); return; }
  if (linkFrom === hitId) { linkFrom = null; draw(); return; } // deselect

  const a = linkFrom, b = hitId;
  linkFrom = null;

  if (edgeExists(a, b)) { setStatus("Those rooms are already linked.", "lose"); draw(); return; }

  if (directed) {
    if (outLeft(a) <= 0) {
      setStatus(`Room ${room(a).label} has no one-way (\u2192) paths left.`, "lose"); draw(); return;
    }
    edges.push({ a, b, directed: true });
    setStatus(`Linked ${room(a).label} \u2192 ${room(b).label} (one-way).`);
  } else {
    if (twoLeft(a) <= 0 || twoLeft(b) <= 0) {
      setStatus(`A two-way link needs a free \u2014 port on BOTH rooms.`, "lose"); draw(); return;
    }
    edges.push({ a, b, directed: false });
    setStatus(`Linked ${room(a).label} \u2014 ${room(b).label} (two-way).`);
  }
  renderTray(); draw();
}

function handleEraseLink(px, py) {
  const idx = edgeAtPixel(px, py);
  if (idx >= 0) {
    const e = edges[idx];
    edges.splice(idx, 1);
    setStatus(`Removed link ${room(e.a).label}${e.directed ? " \u2192 " : " \u2014 "}${room(e.b).label}. Ports refunded.`);
    renderTray(); draw();
  }
}

// ---------- Run phase ----------
function startRun() {
  const s = startRoom(), e = exitRoom();
  const unplaced = LEVEL.rooms.filter(r => !isPlaced(r.id));
  if (unplaced.length) {
    setStatus(`Place all rooms first. Still in tray: ${unplaced.map(r => r.label).join(", ")}`, "lose");
    return;
  }
  running = true;
  selectedRoom = null; linkFrom = null;
  playerRoom = s.id;
  collected = new Set();
  canvas.style.cursor = "pointer";
  renderTray(); updateRunStatus(); draw();
}

function handleRunClick(px, py) {
  const hitId = roomAtPixel(px, py);
  if (!hitId) return;
  if (!neighbors(playerRoom).includes(hitId)) {
    setStatus("No passage that way from your current room (mind the one-way arrows!).", "lose");
    return;
  }
  playerRoom = hitId;
  const r = room(playerRoom);
  if (r.mark === "item") collected.add(playerRoom);

  if (r.mark === "exit") {
    const need = itemRooms().length;
    if (collected.size >= need) {
      setStatus(`Solved! Reached the Exit with all ${need} item(s). \u{1F389}`, "win");
      running = false; canvas.style.cursor = "crosshair";
      solved.add(currentLevel); saveSolved();
      renderLevels();
      draw();
      showWinModal();
      return;
    }
    setStatus(`Exit is locked \u{1F512} — collect all items first (${collected.size}/${need}).`, "lose");
  } else {
    updateRunStatus();
  }
  draw();
}

function updateRunStatus() {
  const need = itemRooms().length;
  const legal = neighbors(playerRoom);
  const lockNote = collected.size >= need
    ? "All items collected — Exit is unlocked \u{1F513}."
    : "Exit locked until all items are collected.";
  const moves = legal.length
    ? legal.map(id => room(id).label).join(", ")
    : "(nowhere — a one-way link may have stranded you! Reset and rethink your links.)";
  setStatus(`Items ${collected.size}/${need}. ${lockNote}\nAt room ${room(playerRoom).label}. You can move to: ${moves}`);
}

function resetRun() {
  running = false; playerRoom = null; collected = new Set();
  canvas.style.cursor = "crosshair";
  renderTray(); setStatus(""); draw();
}

// ---------- Auto-check (solvability analysis) ----------
// Directed reachability from a node using current edges.
function reachableSet(startId) {
  const seen = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const n = stack.pop();
    for (const m of neighbors(n)) if (!seen.has(m)) { seen.add(m); stack.push(m); }
  }
  return seen;
}

// Can we walk from start, collect every item (revisits allowed), and end at exit?
// State-space BFS over (node, collectedMask).
function canSolve() {
  const start = startRoom().id, exit = exitRoom().id;
  const items = itemRooms().map(r => r.id);
  const bit = {};
  items.forEach((id, i) => (bit[id] = 1 << i));
  const full = (1 << items.length) - 1;

  const maskOf = (id, m) => (bit[id] !== undefined ? m | bit[id] : m);
  const startMask = maskOf(start, 0);
  const key = (n, m) => n + "|" + m;

  const seen = new Set([key(start, startMask)]);
  const queue = [[start, startMask]];
  while (queue.length) {
    const [n, m] = queue.shift();
    if (n === exit && m === full) return true;
    for (const nb of neighbors(n)) {
      const nm = maskOf(nb, m);
      const k = key(nb, nm);
      if (!seen.has(k)) { seen.add(k); queue.push([nb, nm]); }
    }
  }
  return false;
}

function autoCheck() {
  const unplaced = LEVEL.rooms.filter(r => !isPlaced(r.id));
  if (unplaced.length) {
    setStatus(`Place all rooms first. Still in tray: ${unplaced.map(r => r.label).join(", ")}`, "lose");
    return;
  }
  const start = startRoom(), exit = exitRoom();
  const items = itemRooms();
  const reach = reachableSet(start.id);

  const problems = [];
  for (const it of items) {
    if (!reach.has(it.id)) problems.push(`Item ${it.label} can't be reached from Start at all.`);
  }
  if (!reach.has(exit.id)) problems.push(`The Exit can't be reached from Start at all.`);

  if (problems.length) {
    setStatus("Not solvable yet:\n\u2022 " + problems.join("\n\u2022 ") +
      "\nHint: add or redirect links so these rooms are reachable.", "lose");
    return;
  }

  if (canSolve()) {
    setStatus("\u2705 Solvable! There's a route that grabs every item and ends at the Exit. Hit Run to prove it.", "win");
  } else {
    setStatus("\u26a0\ufe0f Every item and the Exit is reachable on its own, but no single route collects " +
      "everything AND still reaches the Exit \u2014 a one-way passage is trapping you (once you cross it you " +
      "can't get back). Try turning a one-way link into two-way, or changing which rooms it connects.", "lose");
  }
}

// ---------- Level switching ----------
function loadLevel(idx) {
  currentLevel = idx;
  LEVEL = LEVELS[idx];
  placement = {}; edges = []; selectedRoom = null; linkFrom = null;
  running = false; playerRoom = null; collected = new Set();
  mode = "arrange";
  document.querySelectorAll(".tool[data-mode]").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === "arrange"));
  canvas.style.cursor = "crosshair";
  hideModal();
  renderLevels(); renderTray(); draw();
  setStatus("Arrange all rooms, then use the Link tools to connect their paths. Collect all items before reaching the Exit.", "info");
}

function renderLevels() {
  const ul = document.getElementById("levels");
  ul.innerHTML = "";
  LEVELS.forEach((lv, i) => {
    const li = document.createElement("li");
    if (i === currentLevel) li.classList.add("current");
    if (solved.has(i)) li.classList.add("solved");
    li.innerHTML = `<span>${lv.name}</span>` +
      `<span class="badge">${solved.has(i) ? "\u2713" : (i + 1)}</span>`;
    li.addEventListener("click", () => loadLevel(i));
    ul.appendChild(li);
  });
  const prog = document.getElementById("progress");
  prog.textContent = `${solved.size} / ${LEVELS.length} levels solved`;
}

// ---------- Win modal ----------
function showWinModal() {
  const modal = document.getElementById("modal");
  const text = document.getElementById("modal-text");
  const nextBtn = document.getElementById("modal-next");
  const isLast = currentLevel >= LEVELS.length - 1;
  const allDone = solved.size >= LEVELS.length;

  if (allDone) {
    text.textContent = `You solved ${LEVEL.name.replace(/^\d+ \u00b7 /, "")} \u2014 and every level is complete! You've mastered directed & undirected graph navigation.`;
  } else {
    text.textContent = `You solved ${LEVEL.name.replace(/^\d+ \u00b7 /, "")}. Ready for the next challenge?`;
  }

  nextBtn.style.display = isLast ? "none" : "";
  modal.classList.remove("hidden");
}

function hideModal() {
  document.getElementById("modal").classList.add("hidden");
}

document.getElementById("modal-next").addEventListener("click", () => {
  hideModal();
  if (currentLevel < LEVELS.length - 1) loadLevel(currentLevel + 1);
});
document.getElementById("modal-exit").addEventListener("click", hideModal);

// ---------- Toolbar ----------
document.querySelectorAll(".tool[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    selectedRoom = null; linkFrom = null;
    renderTray(); draw();
    if (mode === "arrange") setStatus("Arrange: click a tray room, then a grid cell. Click a placed room to pick it up.");
    else if (mode === "link-oneway") setStatus("Link one-way: click the SOURCE room, then the TARGET room.");
    else if (mode === "link-twoway") setStatus("Link two-way: click the two rooms to connect.");
    else if (mode === "erase-link") setStatus("Erase link: click on a passage line to remove it.");
  });
});

document.getElementById("check-btn").addEventListener("click", autoCheck);
document.getElementById("run-btn").addEventListener("click", startRun);
document.getElementById("reset-btn").addEventListener("click", resetRun);
document.getElementById("replace-btn").addEventListener("click", () => {
  placement = {}; edges = []; selectedRoom = null; linkFrom = null;
  resetRun();
});

// ---------- Init ----------
renderLevels();
renderTray();
setStatus("Arrange all rooms, then use the Link tools to connect their paths. Collect all items before reaching the Exit.");
draw();
