// ORBITAL — Ship Deck
// An Among Us-style top-down hub. The player walks a character around the
// station with WASD/arrows and opens a coding mission by approaching a console
// and pressing E (or clicking it). This is purely a navigation layer over the
// existing mission engine — openMission()/game state are untouched.

// Themed rooms (position/size as % of the deck).
const SHIP_ROOMS = [
  { name: "Cargo Bay", x: 5, y: 13, w: 29, h: 35 },
  { name: "Comms Array", x: 37, y: 13, w: 26, h: 35 },
  { name: "Navigation", x: 66, y: 13, w: 29, h: 35 },
  { name: "Engineering", x: 5, y: 54, w: 43, h: 37 },
  { name: "Command & Ops", x: 51, y: 54, w: 44, h: 37 },
];

// Every mission gets a console on the map. x/y are the console center (% of deck).
const SHIP_STATIONS = [
  // Station Systems (intro group)
  { id: "cargo", x: 13, y: 27, icon: "\uD83D\uDCE6", label: "Cargo" },
  { id: "docking", x: 12, y: 66, icon: "\uD83D\uDEF0", label: "Docking" },
  { id: "routes", x: 74, y: 27, icon: "\uD83E\uDDED", label: "Nav" },
  // Operations Program
  { id: "twosum", x: 27, y: 40, icon: "\uD83D\uDD17", label: "Signal Match" },
  { id: "parens", x: 57, y: 40, icon: "\uD83D\uDD10", label: "Airlock" },
  { id: "bsearch", x: 88, y: 40, icon: "\uD83D\uDD2D", label: "Beacon" },
  { id: "window", x: 44, y: 27, icon: "\uD83D\uDCE1", label: "Comms Window" },
  { id: "intervals", x: 26, y: 82, icon: "\uD83D\uDDD3", label: "Schedule" },
  { id: "cables", x: 40, y: 66, icon: "\uD83D\uDD0C", label: "Cables" },
  { id: "tree", x: 72, y: 82, icon: "\uD83C\uDF33", label: "Command Tree" },
  { id: "grid", x: 60, y: 66, icon: "\uD83D\uDDFA", label: "Route Grid" },
  { id: "topk", x: 84, y: 66, icon: "\uD83D\uDCCA", label: "Scanner" },
  { id: "dp", x: 91, y: 84, icon: "\u26A1", label: "Fuel Plan" },
];

// ---------- runtime state ----------
let shipBuilt = false;
let shipActive = false;
let fx = 0.5, fy = 0.5;         // character position as fraction of deck (0..1)
let facing = 1;                  // 1 = right, -1 = left
let moving = false;
let nearId = null;              // station currently in range
const keys = { up: false, down: false, left: false, right: false };
const stationEls = {}; // id -> element

function interactable() {
  const overlay = document.getElementById("tutorialOverlay");
  const overlayOpen = overlay && !overlay.classList.contains("hidden");
  return shipActive && !overlayOpen;
}

// ---------- build the deck ----------
function initShip() {
  if (shipBuilt) { renderStationStatuses(); return; }
  const deck = document.getElementById("deck");
  if (!deck) return;

  let html = "";
  // rooms
  SHIP_ROOMS.forEach((r) => {
    html += `<div class="room" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">` +
      `<span class="room-name">${r.name}</span></div>`;
  });
  // stations
  SHIP_STATIONS.forEach((s) => {
    const m = (typeof MISSIONS !== "undefined") && MISSIONS.find((x) => x.id === s.id);
    const title = m ? m.title : s.id;
    html += `<button class="station" data-id="${s.id}" title="${title}" ` +
      `style="left:${s.x}%;top:${s.y}%">` +
      `<span class="station-ring"></span>` +
      `<span class="station-icon">${s.icon}</span>` +
      `<span class="station-label">${s.label}</span>` +
      `<span class="station-badge"></span>` +
      `<span class="station-led"></span>` +
      `</button>`;
  });
  // character + prompt
  html += `<div id="astro" class="astro"><div class="astro-inner">` +
    `<span class="astro-pack"></span><span class="astro-body"></span>` +
    `<span class="astro-visor"></span><span class="astro-legs"></span></div></div>`;
  html += `<div id="deckPrompt" class="deck-prompt hidden"></div>`;
  deck.innerHTML = html;

  // wire console clicks
  SHIP_STATIONS.forEach((s) => {
    const el = deck.querySelector(`.station[data-id="${s.id}"]`);
    stationEls[s.id] = el;
    el.addEventListener("click", () => enterStation(s.id));
  });

  // controls
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  const toShip = document.getElementById("toShipBtn");
  if (toShip) toShip.onclick = showShipView;
  const deckBtn = document.getElementById("deckBtn");
  if (deckBtn) deckBtn.onclick = showShipView;

  shipBuilt = true;
  shipActive = true;
  renderStationStatuses();
  requestAnimationFrame(loop);
}

// ---------- input ----------
function onKeyDown(e) {
  if (e.key === "Escape") {
    const mv = document.getElementById("missionView");
    if (mv && !mv.classList.contains("hidden")) showShipView();
    return;
  }
  if (!interactable()) return;
  switch (e.key) {
    case "ArrowUp": case "w": case "W": keys.up = true; e.preventDefault(); break;
    case "ArrowDown": case "s": case "S": keys.down = true; e.preventDefault(); break;
    case "ArrowLeft": case "a": case "A": keys.left = true; e.preventDefault(); break;
    case "ArrowRight": case "d": case "D": keys.right = true; e.preventDefault(); break;
    case "e": case "E": case "Enter":
      if (nearId) enterStation(nearId);
      break;
  }
}
function onKeyUp(e) {
  switch (e.key) {
    case "ArrowUp": case "w": case "W": keys.up = false; break;
    case "ArrowDown": case "s": case "S": keys.down = false; break;
    case "ArrowLeft": case "a": case "A": keys.left = false; break;
    case "ArrowRight": case "d": case "D": keys.right = false; break;
  }
}

// ---------- main loop ----------
function loop() {
  if (interactable()) {
    const deck = document.getElementById("deck");
    if (deck) {
      const W = deck.clientWidth, H = deck.clientHeight;
      let dx = 0, dy = 0;
      if (keys.left) dx -= 1;
      if (keys.right) dx += 1;
      if (keys.up) dy -= 1;
      if (keys.down) dy += 1;

      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        const speed = 4.4; // px per frame
        fx += (dx / len * speed) / W;
        fy += (dy / len * speed) / H;
        moving = true;
        if (dx < 0) facing = -1; else if (dx > 0) facing = 1;
      } else {
        moving = false;
      }

      // clamp inside the hull
      const padX = 26 / W, padY = 30 / H;
      fx = Math.min(1 - padX, Math.max(padX, fx));
      fy = Math.min(1 - padY, Math.max(padY, fy));

      updateChar();
      updateProximity(W, H);
    }
  }
  requestAnimationFrame(loop);
}

function updateChar() {
  const a = document.getElementById("astro");
  if (!a) return;
  a.style.left = fx * 100 + "%";
  a.style.top = fy * 100 + "%";
  const inner = a.firstElementChild;
  if (inner) inner.style.transform = `scaleX(${facing})`;
  a.classList.toggle("walking", moving);
}

function updateProximity(W, H) {
  const cxPx = fx * W, cyPx = fy * H;
  let best = null, bestDist = Infinity;
  SHIP_STATIONS.forEach((s) => {
    const sx = (s.x / 100) * W, sy = (s.y / 100) * H;
    const d = Math.hypot(sx - cxPx, sy - cyPx);
    if (d < bestDist) { bestDist = d; best = s; }
  });

  const THRESH = 74;
  const inRange = best && bestDist < THRESH;
  const newNear = inRange ? best.id : null;

  if (newNear !== nearId) {
    if (nearId && stationEls[nearId]) stationEls[nearId].classList.remove("near");
    nearId = newNear;
    if (nearId && stationEls[nearId]) stationEls[nearId].classList.add("near");
  }

  const prompt = document.getElementById("deckPrompt");
  if (!prompt) return;
  if (inRange) {
    const m = (typeof MISSIONS !== "undefined") && MISSIONS.find((x) => x.id === best.id);
    const solved = (typeof state === "object") && state.solved[best.id];
    const status = solved ? (solved.beatTarget ? " \u2605 optimized" : " \u2713 solved") : "";
    prompt.innerHTML = `<b>${m ? m.title : best.id}</b>${status} \u2014 press <kbd>E</kbd> or click to access`;
    prompt.classList.remove("hidden");
  } else {
    prompt.classList.add("hidden");
  }
}

// ---------- console status ----------
function renderStationStatuses() {
  if (typeof state !== "object") return;
  SHIP_STATIONS.forEach((s) => {
    const el = stationEls[s.id];
    if (!el) return;
    const solved = state.solved[s.id];
    el.classList.toggle("solved", !!solved);
    el.classList.toggle("optimized", !!(solved && solved.beatTarget));
    el.classList.toggle("offline", !solved);
    const badge = el.querySelector(".station-badge");
    if (badge) badge.textContent = solved ? (solved.beatTarget ? "\u2605" : "\u2713") : "";
  });
  renderShipStatus();
}

// ---------- ship status panel (gamified progress) ----------
function renderShipStatus() {
  const box = document.getElementById("shipStatus");
  if (!box || typeof MISSIONS === "undefined" || typeof state !== "object") return;

  const total = MISSIONS.length;
  let online = 0, optimized = 0;
  MISSIONS.forEach((m) => {
    const s = state.solved[m.id];
    if (s) online++;
    if (s && s.beatTarget) optimized++;
  });
  const powerPct = Math.round((online / total) * 100);
  const effPct = Math.round((optimized / total) * 100);

  // next objective
  let objective;
  const firstOffline = MISSIONS.find((m) => !state.solved[m.id]);
  if (firstOffline) {
    objective = `Repair <b>${firstOffline.title}</b> \u2014 bring this system online.`;
  } else {
    const firstUnopt = MISSIONS.find(
      (m) => !(state.solved[m.id] && state.solved[m.id].beatTarget)
    );
    objective = firstUnopt
      ? `All systems online! Tune <b>${firstUnopt.title}</b> to peak efficiency.`
      : `All systems at peak efficiency \u2014 the ORBITAL is fully operational! \uD83D\uDE80`;
  }

  // systems checklist, grouped
  let rows = "";
  let lastGroup = null;
  MISSIONS.forEach((m) => {
    const g = m.group || "Systems";
    if (g !== lastGroup) { rows += `<div class="sys-group">${g}</div>`; lastGroup = g; }
    const s = state.solved[m.id];
    const status = s ? (s.beatTarget ? "optimized" : "online") : "offline";
    const tag = status === "optimized" ? "\u2605 PEAK"
      : status === "online" ? "\u2713 ONLINE" : "\u25CB OFFLINE";
    rows += `<button class="sys-row ${status}" data-id="${m.id}">` +
      `<span class="sys-led"></span>` +
      `<span class="sys-name">${m.title}</span>` +
      `<span class="sys-state">${tag}</span></button>`;
  });

  const allOnline = online === total;
  const allPeak = optimized === total;

  // unlocked tech / tools earned by optimizing systems
  const tools = (state.tools || []);
  const toolsHtml = tools
    .map((t) => `<li class="tech-item">${t}</li>`)
    .join("");

  box.innerHTML =
    `<div class="ss-head">SHIP STATUS</div>` +
    `<div class="ss-power ${allOnline ? "full" : ""}">` +
      `<div class="ss-power-num">${powerPct}<span>%</span></div>` +
      `<div class="ss-power-label">${allPeak ? "FULLY OPERATIONAL" : allOnline ? "ALL SYSTEMS ONLINE" : "SHIP POWER"}</div>` +
    `</div>` +
    `<div class="ss-metric"><span>Systems online</span><b>${online} / ${total}</b></div>` +
    `<div class="ss-bar"><div class="ss-bar-fill power" style="width:${powerPct}%"></div></div>` +
    `<div class="ss-metric"><span>Peak efficiency</span><b>${optimized} / ${total}</b></div>` +
    `<div class="ss-bar"><div class="ss-bar-fill eff" style="width:${effPct}%"></div></div>` +
    `<div class="ss-objective"><span class="ss-obj-label">OBJECTIVE</span><span>${objective}</span></div>` +
    `<div class="ss-list">${rows}</div>` +
    `<div class="ss-tech">` +
      `<div class="ss-tech-head">TECH UNLOCKED <span>${tools.length}</span></div>` +
      `<ul class="tech-list">${toolsHtml}</ul>` +
    `</div>`;

  box.querySelectorAll(".sys-row").forEach((btn) => {
    btn.onclick = () => enterStation(btn.dataset.id);
  });
}

// ---------- view switching ----------
function enterStation(id) {
  if (typeof openMission === "function") openMission(id); // openMission calls showMissionView()
}

function showShipView() {
  const sv = document.getElementById("shipView");
  const mv = document.getElementById("missionView");
  if (sv) sv.classList.remove("hidden");
  if (mv) mv.classList.add("hidden");
  shipActive = true;
  // release any held keys so the character doesn't drift
  keys.up = keys.down = keys.left = keys.right = false;
  renderStationStatuses();
}

function showMissionView() {
  const sv = document.getElementById("shipView");
  const mv = document.getElementById("missionView");
  if (sv) sv.classList.add("hidden");
  if (mv) mv.classList.remove("hidden");
  shipActive = false;
}
