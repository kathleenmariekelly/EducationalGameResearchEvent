import { LEVELS } from "./levels.js";
import { startGame } from "./game.js";
import { loadCustomize, saveCustomize, DEFAULTS, BANNERS, SOLDIERS, ENEMIES } from "./customize.js";
import { ALGOS } from "./pathfinding.js";
import { createQuiz } from "./quiz.js";
import { startBackground } from "./bg.js";
import { getCustomRaw, setCustomRaw, loadCustomQuestions } from "./customquestions.js";
import { QUESTIONS } from "./questions.js";

const screens = {};
document.querySelectorAll(".screen").forEach((s) => (screens[s.id] = s));
let activeGame = null;

function show(id) {
  if (activeGame) { activeGame.stop(); activeGame = null; }
  Object.values(screens).forEach((s) => (s.hidden = true));
  screens[id].hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

// ---------- nav wiring ----------
document.querySelectorAll("[data-go]").forEach((b) =>
  b.addEventListener("click", () => {
    const t = b.dataset.go;
    if (t === "levels") buildLevelSelect();
    if (t === "customize") buildCustomize();
    if (t === "questions") buildQuestions();
    if (t === "flashcards") buildFlashcards();
    show(t);
  })
);

// ---------- title kingdom name ----------
function refreshTitle() {
  const c = loadCustomize();
  document.getElementById("titleKingdom").textContent = c.kingdomName;
  document.getElementById("titleBanner").textContent = c.banner;
}

// ---------- level select ----------
function buildLevelSelect() {
  const wrap = document.getElementById("levelList");
  wrap.innerHTML = "";
  LEVELS.forEach((lv) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-world">${lv.world}</div>
      <h3>${lv.id}. ${lv.name}</h3>
      <p>${lv.blurb}</p>
      <div class="card-meta">${lv.w}×${lv.h} • ${lv.waves} waves • ${lv.lives} lives</div>
      <button class="primary">Defend →</button>`;
    card.querySelector("button").addEventListener("click", () => launchLevel(lv));
    wrap.appendChild(card);
  });
}

// ---------- customize ----------
function petPicker(wrapId, list, current, key, f) {
  const wrap = document.getElementById(wrapId);
  wrap.innerHTML = "";
  list.forEach((p) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "banner" + (p === current ? " on" : "");
    el.textContent = p;
    el.addEventListener("click", () => {
      wrap.querySelectorAll(".banner").forEach((x) => x.classList.remove("on"));
      el.classList.add("on"); f.dataset[key] = p;
    });
    wrap.appendChild(el);
  });
  f.dataset[key] = current;
}
function buildCustomize() {
  const c = loadCustomize();
  const f = document.getElementById("customForm");
  f.kingdomName.value = c.kingdomName;
  f.pathColor.value = c.pathColor;
  petPicker("soldierPick", SOLDIERS, c.soldier, "soldier", f);
  petPicker("enemyPick", ENEMIES, c.enemy, "enemy", f);
  petPicker("bannerPick", BANNERS, c.banner, "banner", f);
}
document.getElementById("customForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  saveCustomize({
    kingdomName: f.kingdomName.value.trim() || DEFAULTS.kingdomName,
    pathColor: f.pathColor.value,
    banner: f.dataset.banner,
    soldier: f.dataset.soldier,
    enemy: f.dataset.enemy,
  });
  refreshTitle();
  show("title");
});

// ---------- my questions ----------
const TOPIC_LABEL = { bfs: "BFS", dfs: "DFS", dijkstra: "Dijkstra", astar: "A*", general: "General" };
function renderQuestionList() {
  const list = getCustomRaw();
  document.getElementById("qCount").textContent = list.length;
  const wrap = document.getElementById("qList");
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<div class="qempty">No custom questions yet. Add one above!</div>`;
    return;
  }
  list.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "qitem";
    const ans = q.type === "mc" ? q.choices[q.answer] : q.answer.join(" / ");
    div.innerHTML = `<div>
        <div class="qmeta">${TOPIC_LABEL[q.algo] || q.algo} • ${q.difficulty} • ${q.type === "mc" ? "multiple choice" : "fill-in"}</div>
        <div class="qtext">${escapeHtml(q.prompt)}</div>
        <div class="qtext" style="opacity:.6">✅ ${escapeHtml(ans)}</div>
      </div>`;
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = () => { const l = getCustomRaw(); l.splice(i, 1); setCustomRaw(l); renderQuestionList(); };
    div.appendChild(del);
    wrap.appendChild(div);
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function buildQuestions() {
  const f = document.getElementById("questionForm");
  const typeSel = document.getElementById("qType");
  const toggleType = () => {
    const mc = typeSel.value === "mc";
    document.getElementById("mcFields").hidden = !mc;
    document.getElementById("fillFields").hidden = mc;
  };
  typeSel.onchange = toggleType;
  toggleType();
  renderQuestionList();
}
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = document.getElementById("qFormMsg");
  const fail = (m) => { msg.textContent = m; msg.className = "qform-msg err"; };

  const prompt = f.prompt.value.trim();
  if (!prompt) return fail("Please enter a question.");
  const type = f.type.value;
  const q = { algo: f.algo.value, difficulty: f.difficulty.value, type, prompt };

  if (type === "mc") {
    const choices = [f.c0.value, f.c1.value, f.c2.value, f.c3.value].map((c) => c.trim()).filter(Boolean);
    if (choices.length < 2) return fail("Add at least 2 choices.");
    const correctIdx = Number(f.correct.value);
    if (!f["c" + correctIdx].value.trim()) return fail("The correct choice can't be empty.");
    // remap answer index to the filtered list position
    const correctText = f["c" + correctIdx].value.trim();
    q.choices = choices;
    q.answer = choices.indexOf(correctText);
  } else {
    const accepted = f.accepted.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!accepted.length) return fail("Add at least one accepted answer.");
    q.answer = accepted;
  }

  const hints = [f.h0.value, f.h1.value, f.h2.value].map((h) => h.trim()).filter(Boolean);
  if (hints.length) q.hints = hints;
  const explain = f.explain.value.trim();
  if (explain) q.explain = explain;
  else q.explain = type === "mc" ? `Correct answer: ${q.choices[q.answer]}` : `Accepted: ${q.answer.join(", ")}`;

  const list = getCustomRaw();
  list.push(q);
  setCustomRaw(list);
  f.reset();
  document.getElementById("mcFields").hidden = false;
  document.getElementById("fillFields").hidden = true;
  msg.textContent = "✅ Question added! It'll show up in " + (TOPIC_LABEL[q.algo] || q.algo) + " levels.";
  msg.className = "qform-msg ok";
  renderQuestionList();
});

// ---------- flashcards ----------
let fcDeck = [], fcIndex = 0;
function fcAllQuestions() { return [...QUESTIONS, ...loadCustomQuestions()]; }
function fcAnswerText(q) { return q.type === "mc" ? q.choices[q.answer] : q.answer.join(" / "); }
function renderFlashcard() {
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  const front = document.getElementById("fcFront");
  const back = document.getElementById("fcBack");
  document.getElementById("fcCounter").textContent = fcDeck.length ? `${fcIndex + 1} / ${fcDeck.length}` : "0 / 0";
  if (!fcDeck.length) {
    front.innerHTML = `<div class="fc-q">No cards for this topic yet.</div>`;
    back.innerHTML = "";
    return;
  }
  const q = fcDeck[fcIndex];
  const label = (TOPIC_LABEL[q.algo] || q.algo);
  const choices = q.type === "mc"
    ? `<div class="fc-choices">${q.choices.map((c) => "• " + escapeHtml(c)).join("<br>")}</div>` : "";
  front.innerHTML =
    `<div class="fc-tag">${label} • ${q.difficulty}${q.custom ? " • yours" : ""}</div>` +
    `<div class="fc-q">${escapeHtml(q.prompt)}</div>${choices}` +
    `<div class="fc-fliphint">click to flip ↺</div>`;
  back.innerHTML =
    `<div class="fc-tag">Answer</div>` +
    `<div class="fc-a">${escapeHtml(fcAnswerText(q))}</div>` +
    (q.explain ? `<div class="fc-exp">${escapeHtml(q.explain)}</div>` : "") +
    `<div class="fc-fliphint">click to flip ↺</div>`;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function fcRebuild() {
  const topic = document.getElementById("fcTopic").value;
  const all = fcAllQuestions();
  fcDeck = topic === "all" ? all : all.filter((q) => q.algo === topic);
  fcIndex = 0;
  renderFlashcard();
}
let fcWired = false;
function buildFlashcards() {
  fcRebuild();
  if (fcWired) return;
  fcWired = true;
  document.getElementById("flashcard").onclick = () =>
    document.getElementById("flashcard").classList.toggle("flipped");
  document.getElementById("fcTopic").onchange = fcRebuild;
  document.getElementById("fcShuffle").onclick = () => { shuffle(fcDeck); fcIndex = 0; renderFlashcard(); };
  document.getElementById("fcPrev").onclick = () => {
    if (!fcDeck.length) return;
    fcIndex = (fcIndex - 1 + fcDeck.length) % fcDeck.length; renderFlashcard();
  };
  document.getElementById("fcNext").onclick = () => {
    if (!fcDeck.length) return;
    fcIndex = (fcIndex + 1) % fcDeck.length; renderFlashcard();
  };
}

// ---------- launch a level ----------
function launchLevel(level) {
  show("play");
  const customize = loadCustomize();
  document.getElementById("playTitle").textContent = `${level.name} — ${level.world}`;

  // algorithm dropdown (locked or free)
  const sel = document.getElementById("playAlgo");
  sel.innerHTML = "";
  const opts = level.lockAlgo
    ? [[level.algo, ALGOS[level.algo].name]]
    : Object.entries(ALGOS).map(([k, v]) => [k, v.name]);
  opts.forEach(([k, name]) => {
    const o = document.createElement("option");
    o.value = k; o.textContent = name; if (k === level.algo) o.selected = true;
    sel.appendChild(o);
  });
  sel.disabled = level.lockAlgo;

  const canvas = document.getElementById("gameCanvas");
  const hud = document.getElementById("playHud");
  activeGame = startGame(canvas, hud, level, customize, {
    onWin: () => showResults(true, level, quiz),
    onLose: () => showResults(false, level, quiz),
  });

  // quiz: correct answers fund your defenses; medium/hard unlock swamp
  const quiz = createQuiz(
    { algos: level.quizAlgos ?? [level.algo, "general"], startTier: level.startTier ?? 0 },
    ({ walls, swamp, difficulty }) => {
    activeGame.addResources({ walls, swamp });
    if (difficulty === "medium" || difficulty === "hard") {
      activeGame.unlockSwamp();
      activeGame.unlockFrost();
      activeGame.addResources({ frost: 1 });        // medium+ grants frost
    }
    if (difficulty === "hard") {
      activeGame.unlockGas();
      activeGame.addResources({ gas: 2 });          // hard grants gas
    }
  });
  document.getElementById("btnQuiz").onclick = () => quiz.open();

  // wire controls to this game instance
  sel.onchange = () => activeGame.setAlgo(sel.value);
  const paintBtns = document.querySelectorAll("#play [data-paint]");
  paintBtns.forEach((b) => (b.onclick = () => {
    activeGame.setPaint(b.dataset.paint);
    paintBtns.forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  }));
  paintBtns.forEach((x) => x.classList.remove("on"));
  document.querySelector('#play [data-paint="wall"]').classList.add("on");

  document.getElementById("btnWave").onclick = () => activeGame.sendWave();
  document.getElementById("btnReset").onclick = () => activeGame.reset();
}

// ---------- results screen ----------
function showResults(won, level, quiz) {
  const s = quiz.getStats();
  const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
  document.getElementById("resultsBanner").textContent = won ? "🏆" : "💥";
  document.getElementById("resultsTitle").textContent = won ? "Kingdom Defended!" : "The Keep Has Fallen";
  document.getElementById("resultsSub").textContent = won
    ? "Your cute army held the line. Here's how your studying went:"
    : "The invaders broke through — but every question you tried made you sharper. Try again!";

  const diff = s.byDiff;
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat"><div class="big">${s.correct}</div><div class="lbl">Correct answers</div></div>
    <div class="stat"><div class="big">${acc}%</div><div class="lbl">Accuracy</div></div>
    <div class="stat"><div class="big">${s.hints}</div><div class="lbl">Hints used</div></div>
    <div class="stat"><div class="big">${s.attempts}</div><div class="lbl">Total attempts</div></div>`;

  const tags = document.getElementById("conceptTags");
  tags.innerHTML =
    `<div class="diff-row"><span>🟢 Easy: ${diff.easy.c}</span><span>🟡 Medium: ${diff.medium.c}</span><span>🔴 Hard: ${diff.hard.c}</span></div>` +
    (s.concepts.length
      ? `<div style="width:100%;text-align:center;margin-top:4px;opacity:.7;font-size:12px">Concepts practiced:</div>` +
        s.concepts.map((c) => `<span class="tag">${c}</span>`).join("")
      : `<div style="opacity:.6;font-size:13px">No questions answered this level — try the 🧠 Earn Defenses button next time!</div>`);

  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[idx + 1];
  const nextBtn = document.getElementById("btnNext");
  nextBtn.style.display = won && next ? "" : "none";
  nextBtn.onclick = () => launchLevel(next);
  document.getElementById("btnRetry").onclick = () => launchLevel(level);
  show("results");
}

document.getElementById("btnExit").addEventListener("click", () => show("title"));

// ---------- boot ----------
startBackground();
refreshTitle();
show("title");
