/* ============================================================
   Memory Master — Game Logic
   ============================================================ */

// ---------- Start / login helpers ----------
function beginPlay(asGuest){
  Sound.unlock();
  if(Sound.isMusicOn()) Sound.setMusic(true);
  if(asGuest){
    useGuest();
  } else {
    const name = $("player-name").value.trim();
    if(!name){ $("player-hint").textContent = "Type a username to save your progress — or use Play as Guest."; $("player-name").focus(); return; }
    useProfile(name);
  }
  showCreator();
}

// ---------- Character creator ----------
function showCreator(){
  // seed indices from current avatar
  creatorIndices = {};
  Avatar.OPTIONS.forEach(o => creatorIndices[o.key] = avatar[o.key] || 0);
  buildCreatorUI();
  drawAvatarPreview();
  show("creator");
}
function buildCreatorUI(){
  const wrap = $("creator-options");
  wrap.innerHTML = "";
  Avatar.OPTIONS.forEach(o => {
    const row = document.createElement("div");
    row.className = "creator-row";
    const swatch = o.kind === "color"
      ? `<span class="cr-swatch" id="cr-val-${o.key}"></span>`
      : `<span class="cr-name" id="cr-val-${o.key}"></span>`;
    row.innerHTML = `<span class="cr-label">${o.label}</span>
      <div class="cr-picker">
        <button class="cr-arrow" data-k="${o.key}" data-d="-1">◀</button>
        ${swatch}
        <button class="cr-arrow" data-k="${o.key}" data-d="1">▶</button>
      </div>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll(".cr-arrow").forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k, d = parseInt(b.dataset.d);
      const o = Avatar.OPTIONS.find(x => x.key === k);
      creatorIndices[k] = (creatorIndices[k] + d + o.values.length) % o.values.length;
      avatar[k] = creatorIndices[k];
      Sound.sfx.click();
      refreshCreatorValues(); drawAvatarPreview();
    };
  });
  refreshCreatorValues();
}
function refreshCreatorValues(){
  Avatar.OPTIONS.forEach(o => {
    const el = $("cr-val-" + o.key);
    const v = o.values[creatorIndices[o.key]];
    if(o.kind === "color"){ el.style.background = v; }
    else { el.textContent = String(v).charAt(0).toUpperCase() + String(v).slice(1); }
  });
}
function drawAvatarPreview(){
  const cv = $("avatar-canvas"), c = cv.getContext("2d");
  c.clearRect(0,0,cv.width,cv.height);
  // floor shadow
  c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(cv.width/2, 258, 46, 10, 0, 0, 7); c.fill();
  Avatar.draw(c, cv.width/2, 258, 2.2, avatar, {name:"idle", phase:0, face:1});
}

function showLanguageSelect(){
  const grid = $("lang-grid");
  grid.innerHTML = "";
  LANGUAGES.forEach(lang => {
    const b = document.createElement("button");
    b.className = "lang-card" + (lang.id === "scramble" ? " scramble" : "");
    b.innerHTML = `<div class="lang-icon">${lang.icon}</div>
                   <div class="lang-name">${lang.name}</div>
                   <div class="lang-blurb">${lang.blurb}</div>`;
    b.onclick = () => { Sound.sfx.click(); selectLanguage(lang.id); showModeSelect(); };
    grid.appendChild(b);
  });
  show("lang");
}

function renderProfileList(){
  const wrap = $("profile-list");
  if(!wrap) return;
  const names = Object.keys(store.profiles);
  if(names.length === 0){ wrap.innerHTML = ""; return; }
  wrap.innerHTML = `<p class="profile-list-title">Returning player? Tap your name:</p>`;
  names.forEach(n => {
    const chip = document.createElement("button");
    chip.className = "profile-chip";
    const totalStars = Object.keys(store.profiles[n].best).length;
    chip.innerHTML = `👤 ${n} <span class="pc-stars">⭐${totalStars}</span> <span class="pc-del" title="Delete">✕</span>`;
    chip.querySelector(".pc-del").onclick = (e) => {
      e.stopPropagation();
      if(confirm(`Delete profile "${n}" and its saved scores?`)){ deleteProfile(n); renderProfileList(); }
    };
    chip.onclick = () => { $("player-name").value = n; beginPlay(false); };
    wrap.appendChild(chip);
  });
}

// ---------- Config ----------
let TIME_PER_Q = 20;          // seconds per question (scales down per level)
let BASE_POINTS = 100;        // points for a correct answer (scales up per level)
const SPEED_BONUS = 100;      // max extra points for answering fast

// Difficulty ramp: higher levels = less time, more points.
function applyDifficulty(levelIndex){
  TIME_PER_Q = Math.max(8, 22 - levelIndex * 3);   // 22,19,16,13,10,8...
  BASE_POINTS = 100 + levelIndex * 50;             // 100,150,200,250...
}
const START_LIVES = 3;
const RAM_PER_WRONG = 22;     // % RAM added on a wrong/leaky answer
const RAM_PER_RIGHT = 12;     // % RAM freed on a correct answer

// ---------- Persistence (safe: local only, no personal data) ----------
// A username is just a LOCAL SAVE SLOT (no password = not security, by design).
// Multiple named profiles can live on one computer (e.g. a school lab).
const STORE_KEY = "memoryMasterStore";
let store = loadStore();               // { profiles:{name:{best:{}}}, lastUser }
let profile = { name: "", guest: true, best: {} }; // the ACTIVE player

function loadStore(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  } catch(e){}
  return { profiles: {}, lastUser: "" };
}
function persistStore(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e){}
}
function useProfile(username){
  const clean = username.trim().slice(0, 16);
  if(!store.profiles[clean]) store.profiles[clean] = { best: {}, passed: {} };
  profile = { name: clean, guest: false, best: store.profiles[clean].best, passed: store.profiles[clean].passed || {}, avatar: store.profiles[clean].avatar };
  avatar = profile.avatar ? Object.assign(Avatar.makeDefault(), profile.avatar) : Avatar.makeDefault();
  store.lastUser = clean;
  persistStore();
}
function useGuest(){ profile = { name: "Guest", guest: true, best: {} }; avatar = Avatar.makeDefault(); }
function saveAvatar(){
  if(profile.guest) return;
  profile.avatar = avatar;
  if(store.profiles[profile.name]) store.profiles[profile.name].avatar = avatar;
  persistStore();
}
function deleteProfile(username){
  delete store.profiles[username];
  if(store.lastUser === username) store.lastUser = "";
  persistStore();
}
function bestKey(levelIndex){ return (CURRENT_LANG || "?") + ":" + levelIndex; }

// ---- Certificate progress ----
function markLevelPassed(levelIndex, acc){
  if(profile.guest) return;                 // guests don't earn certs
  profile.passed = profile.passed || {};
  const key = bestKey(levelIndex);
  if(!profile.passed[key] || acc > profile.passed[key]) profile.passed[key] = acc;
  store.profiles[profile.name].passed = profile.passed;
  persistStore();
}
function isLanguageComplete(){
  if(CURRENT_LANG === "scramble") return false;
  const passed = profile.passed || {};
  return LEVELS.every((_, i) => passed[bestKey(i)] !== undefined);
}
function recordResult(levelIndex, score, acc){
  const key = bestKey(levelIndex);
  const prev = profile.best[key];
  if(!prev || score > prev.score){
    profile.best[key] = { score, acc };
    if(!profile.guest){
      store.profiles[profile.name].best = profile.best;
      persistStore();
    }
  }
}

// ---------- State ----------
let state = {};

// Fisher-Yates shuffle (returns a new shuffled copy)
function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// A per-language "deck": deals questions from the WHOLE language pool with no
// repeats until the deck is exhausted, so every play is genuinely different.
let _deck = [], _deckKey = null;
function drawQuestions(n){
  const key = CURRENT_LANG;
  if(_deckKey !== key){ _deck = []; _deckKey = key; }
  if(_deck.length < n){
    const pool = [];
    LEVELS.forEach(lv => lv.questions.forEach(q => pool.push(q)));
    _deck = _deck.concat(shuffled(pool));
  }
  return _deck.splice(0, Math.min(n, _deck.length));
}
// Build a fresh "play level" (keeps title/topic, fresh random questions).
function makePlayLevel(levelIndex, n){
  const lv = LEVELS[levelIndex];
  return { id: lv.id, title: lv.title, topic: lv.topic, questions: drawQuestions(n) };
}

function newState(levelIndex){
  return {
    levelIndex,
    level: LEVELS[levelIndex],
    questions: shuffled(LEVELS[levelIndex].questions),   // fresh random order every play
    qIndex: 0,
    score: 0,
    lives: START_LIVES,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    ram: 30,               // starting RAM usage %
    answered: false,
    timeLeft: TIME_PER_Q,
    timer: null
  };
}

// ---------- Element helpers ----------
const $ = (id) => document.getElementById(id);
const screens = {
  start: $("screen-start"),
  creator: $("screen-creator"),
  lang: $("screen-lang"),
  howto: $("screen-howto"),
  mode: $("screen-mode"),
  basketball: $("screen-basketball"),
  pacman: $("screen-pacman"),
  gta: $("screen-gta"),
  quiz: $("screen-quiz"),
  results: $("screen-results"),
  cert: $("screen-cert")
};

let avatar = null;            // player's custom character
let chosenMode = "classic";   // "classic" | "basketball" | "pacman" | "gta"
let creatorIndices = {};      // current option index per attribute
let lastBballLevel = 0;
let zenMode = false;          // no timer, no lives

function showModeSelect(){
  const l = LANGUAGES.find(x => x.id === CURRENT_LANG);
  $("mode-name").textContent = profile.name + (l ? " — " + l.icon + " " + l.name : "");
  buildLevelButtons();
  show("mode");
}
let lastGtaLevel = 0;
function startGTA(levelIndex){
  lastGtaLevel = levelIndex;
  Sound.unlock();
  show("gta");
  const gtaGoal = 200 + levelIndex * 200;   // $200, $400, $600 ... per level
  GTA.init(makePlayLevel(levelIndex, 14), (cash, done, total, caught) => {
    recordResult("gta" + levelIndex, cash, caught ? 0 : 100);
    if(!caught) markLevelPassed(levelIndex, 100);
    show("results");
    $("results-title").textContent = caught ? "🚔 Busted!" : "👑 Goal Reached!";
    $("rank-badge").textContent = caught ? "🚓 Caught by the Cops" : "🚔 Getaway Legend";
    $("res-score").textContent = "$" + cash;
    $("res-acc").textContent = done + "/" + total;
    $("res-streak").textContent = "—";
    $("results-msg").textContent = caught
      ? "The cops caught you! Grab cash and dodge traffic — 3 crashes brings the cops. Reach the cash goal to win."
      : "You hit the cash goal and made a clean getaway! Try a harder level or another language.";
    $("btn-next-level").classList.toggle("hidden", caught || levelIndex >= LEVELS.length - 1);
    $("btn-claim-cert").classList.toggle("hidden", !isLanguageComplete());
  }, avatar, gtaGoal);
}

// ---------- How to Play (instructions before every mode) ----------
const INSTRUCTIONS = {
  classic: {
    emoji:"🧠", title:"Classic Quiz",
    goal:"Answer coding questions before the timer runs out. Keep the RAM healthy and don't lose all 3 lives!",
    controls:[["Click","Pick an answer tile / True or False"],["Type + Enter","For fill-in-the-blank questions"]],
    tip:"Answer fast and build streaks for bonus points. Read the explanation after each question — that's the test-prep gold!"
  },
  basketball: {
    emoji:"🏀", title:"Basketball (vs CPU)",
    goal:"First to 21 wins. Score by shooting or dunking — pass to open teammates for easy buckets!",
    controls:[["A / D or ← →","Run"],["W / ↑","Jump"],["SPACE","Shoot (just tap!) — closer = easier"],["SPACE near hoop","DUNK it!"],["P","Pass to an open teammate (assist)"]],
    tip:"Shooting is a simple tap — drive closer for a better shot or dunk. Miss and you answer a question; make it and you skip questions!"
  },
  pacman: {
    emoji:"👻", title:"Code-Man",
    goal:"Eat every dot in the maze without getting caught by the bug-ghosts. Clear the board to win!",
    controls:[["Arrow keys / WASD","Move through the maze"],["❓ pellets","Trigger a question"]],
    tip:"Answer a ❓ pellet correctly to scare the ghosts blue — then chomp them for +200 each! You have 3 lives."
  },
  gta: {
    emoji:"🚔", title:"Cops & Robbers — First-Person Driving",
    goal:"Reach the CASH GOAL to clear the level! Grab 💵 cash pickups and 💰 jobs as you cruise the city in first person.",
    controls:[["W / ↑","Accelerate"],["S / ↓","Brake"],["A / D","Steer"],["Move mouse","Look around"]],
    tip:"Drive INTO a gold 💰 job marker to start a question (+$250) — finish 5 jobs to clear the level. Grab 💵 green cash for bonus $. Crash 3 times and the cops chase you!"
  }
};
let pendingStart = null;
function showHowTo(mode, levelIndex){
  const info = INSTRUCTIONS[mode] || INSTRUCTIONS.classic;
  $("howto-emoji").textContent = info.emoji;
  $("howto-title").textContent = "How to Play — " + info.title;
  $("howto-goal").textContent = info.goal;
  $("howto-controls").innerHTML = info.controls.map(c =>
    `<div class="howto-row"><span class="howto-key">${c[0]}</span><span class="howto-desc">${c[1]}</span></div>`).join("");
  $("howto-tip").innerHTML = "💡 " + info.tip;
  pendingStart = () => {
    if(mode === "basketball") startBasketball(levelIndex);
    else if(mode === "pacman") startPac(levelIndex);
    else if(mode === "gta") startGTA(levelIndex);
    else startLevel(levelIndex);
  };
  show("howto");
}

let lastPacLevel = 0;
function startPac(levelIndex){
  lastPacLevel = levelIndex;
  Sound.unlock();
  show("pacman");
  PacMan.init(makePlayLevel(levelIndex, 14), (finalScore, won) => {
    recordResult("pac" + levelIndex, finalScore, won ? 100 : 0);
    if(won) markLevelPassed(levelIndex, 100);
    show("results");
    $("results-title").textContent = won ? "🏆 Maze Cleared!" : "👻 Game Over";
    $("rank-badge").textContent = won ? "🟡 Code-Man Champion" : "👻 Caught by a Bug";
    $("res-score").textContent = finalScore;
    $("res-acc").textContent = "—";
    $("res-streak").textContent = "—";
    $("results-msg").textContent = won
      ? "You chomped every dot and answered your way to victory!"
      : "The bug-ghosts got you! Grab ❓ pellets and answer correctly to scare them off.";
    $("btn-next-level").classList.toggle("hidden", !(won && levelIndex < LEVELS.length - 1));
    $("btn-claim-cert").classList.toggle("hidden", !isLanguageComplete());
  });
}

function startBasketball(levelIndex){
  chosenMode = "basketball";
  lastBballLevel = levelIndex;
  Sound.unlock();
  show("basketball");
  Basketball.init(makePlayLevel(levelIndex, 14), (you, cpu, won) => {
    recordResult("bball" + levelIndex, you, won ? 100 : 0);
    if(won) markLevelPassed(levelIndex, 100);
    show("results");
    $("results-title").textContent = won ? "🏆 You Win!" : "😔 CPU Wins";
    $("rank-badge").textContent = won ? "🏀 Court King" : "💪 Keep Practicing";
    $("res-score").textContent = you + " - " + cpu;
    $("res-acc").textContent = "—";
    $("res-streak").textContent = "—";
    $("results-msg").textContent = won
      ? "You beat the CPU! Answering questions correctly gave you hot shots and froze your opponent."
      : "So close! Nail the timing on the green zone and answer questions right to gain the edge.";
    $("btn-next-level").classList.toggle("hidden", !(won && levelIndex < LEVELS.length - 1));
    $("btn-claim-cert").classList.toggle("hidden", !isLanguageComplete());
  }, avatar);
}
function show(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ---------- Answer normalization for typed questions ----------
function normalize(str){
  return String(str)
    .toLowerCase()
    .replace(/[\u2018\u2019\u2032]/g, "'")   // curly/prime single quotes -> '
    .replace(/[\u201C\u201D]/g, '"')        // curly double quotes -> "
    .replace(/\s+/g, "")                     // remove ALL whitespace (spacing never matters)
    .replace(/;+$/, "");                     // trailing semicolons optional
}
function typedMatches(input, answer){
  const accepted = Array.isArray(answer) ? answer : [answer];
  const inN = normalize(input);
  return accepted.some(a => normalize(a) === inN);
}

// ============================================================
//  START SCREEN
// ============================================================
function buildLevelButtons(){
  const wrap = $("level-buttons");
  wrap.innerHTML = "";
  LEVELS.forEach((lvl, i) => {
    const b = document.createElement("button");
    b.className = "level-chip";
    const best = profile.best[bestKey(i)];
    const star = best ? `<span class="lc-star">⭐ ${best.score}</span>` : "";
    if(best) b.classList.add("done");
    b.innerHTML = `<span class="lc-num">Level ${lvl.id}</span> ${lvl.title} ${star}
                   <span class="lc-topic">${lvl.topic}</span>`;
    b.onclick = () => { Sound.sfx.click(); showHowTo(chosenMode, i); };
    wrap.appendChild(b);
  });
}

// ============================================================
//  GAME FLOW
// ============================================================
function startLevel(levelIndex){
  applyDifficulty(levelIndex);
  state = newState(levelIndex);
  state.questions = drawQuestions(6);   // fresh, non-repeating questions each play
  if(zenMode) state.lives = Infinity;
  document.getElementById("screen-quiz").classList.toggle("zen", zenMode);
  show("quiz");
  renderHud();
  loadQuestion();
}

function renderHud(){
  $("level-pill").textContent = "Level " + state.level.id + ": " + state.level.title;
  $("score").textContent = state.score;
  $("hearts").innerHTML = zenMode ? "∞" : ("❤️".repeat(state.lives) + "🖤".repeat(START_LIVES - state.lives));
  $("ram-fill").style.width = Math.max(0, Math.min(100, state.ram)) + "%";
  const total = state.questions.length;
  $("q-count").textContent = (state.qIndex + 1) + " / " + total;
  $("progress-fill").style.width = (state.qIndex / total * 100) + "%";
}

function loadQuestion(){
  state.answered = false;
  const q = state.questions[state.qIndex];
  renderHud();

  // topic + text
  $("q-topic").textContent = state.level.topic;
  $("q-text").textContent = q.text;

  // code block
  const codeEl = $("q-code");
  if(q.code){ codeEl.textContent = q.code; codeEl.classList.remove("hidden"); }
  else { codeEl.classList.add("hidden"); }

  // streak badge
  const sb = $("streak-badge");
  if(state.streak >= 2){ sb.classList.remove("hidden"); sb.textContent = "🔥 Streak x" + state.streak; }
  else { sb.classList.add("hidden"); }

  // build answer UI
  const answersEl = $("answers");
  const typeEl = $("type-answer");
  answersEl.innerHTML = "";
  answersEl.classList.remove("locked");

  if(q.type === "type"){
    answersEl.classList.add("hidden");
    typeEl.classList.remove("hidden");
    const input = $("type-input");
    input.value = "";
    input.disabled = false;
    setTimeout(() => input.focus(), 50);
  } else {
    typeEl.classList.add("hidden");
    answersEl.classList.remove("hidden");

    let options, shapes;
    if(q.type === "truefalse"){
      options = ["True", "False"];
      shapes = ["✔", "✘"];
    } else {
      options = q.options;
      shapes = ["▲", "◆", "●", "■"];
    }
    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "answer-tile" + (q.type === "truefalse" ? " tf" : "");
      btn.innerHTML = `<span class="shape">${shapes[i] || ""}</span> <span>${opt}</span>`;
      btn.onclick = () => chooseAnswer(i, btn);
      answersEl.appendChild(btn);
    });
  }

  startTimer();
}

// ---------- Timer ----------
function startTimer(){
  clearInterval(state.timer);
  state.timeLeft = TIME_PER_Q;
  if(zenMode){ $("timer-fill").style.width = "100%"; return; }  // no countdown in Zen
  const fill = $("timer-fill");
  fill.classList.remove("low");
  fill.style.width = "100%";

  const start = Date.now();
  state.timer = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    state.timeLeft = Math.max(0, TIME_PER_Q - elapsed);
    const pct = (state.timeLeft / TIME_PER_Q) * 100;
    fill.style.width = pct + "%";
    if(pct < 30) fill.classList.add("low");
    if(state.timeLeft <= 0){
      clearInterval(state.timer);
      timeUp();
    }
  }, 100);
}

function timeUp(){
  if(state.answered) return;
  handleResult(false, 0, "⏰ Time's up!", null);
}

// ============================================================
//  ANSWER HANDLING
// ============================================================
function chooseAnswer(index, btn){
  if(state.answered) return;
  const q = state.questions[state.qIndex];
  let correctIndex;
  if(q.type === "truefalse") correctIndex = q.answer === true ? 0 : 1;
  else correctIndex = q.answer;

  const isCorrect = index === correctIndex;
  isCorrect ? Sound.sfx.correct() : Sound.sfx.wrong();

  // visual marking
  $("answers").classList.add("locked");
  const tiles = $("answers").children;
  tiles[correctIndex].classList.add("correct");
  if(!isCorrect) btn.classList.add("wrong");

  finishQuestion(isCorrect, q);
}

function submitTyped(){
  if(state.answered) return;
  const q = state.questions[state.qIndex];
  const input = $("type-input");
  const isCorrect = typedMatches(input.value, q.answer);
  isCorrect ? Sound.sfx.correct() : Sound.sfx.wrong();
  input.disabled = true;
  finishQuestion(isCorrect, q);
}

function finishQuestion(isCorrect, q){
  clearInterval(state.timer);
  state.answered = true;

  let points = 0;
  if(isCorrect){
    const speedFrac = state.timeLeft / TIME_PER_Q;
    points = BASE_POINTS + Math.round(SPEED_BONUS * speedFrac);
    state.streak++;
    if(state.streak >= 2) points = Math.round(points * (1 + (state.streak - 1) * 0.1));
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correctCount++;
    state.score += points;
    state.ram = Math.max(0, state.ram - RAM_PER_RIGHT);
    if(state.streak >= 3) Sound.sfx.streak();
  } else {
    state.streak = 0;
    if(!zenMode) state.lives--;
    state.ram = Math.min(100, state.ram + RAM_PER_WRONG);
  }

  const title = isCorrect ? pickPraise() : "Not quite!";
  handleResult(isCorrect, points, title, q.explain);
}

function pickPraise(){
  const p = ["Correct!", "Nice!", "You got it!", "Clean memory!", "No leaks here!"];
  return p[Math.floor(Math.random() * p.length)];
}

function handleResult(isCorrect, points, title, explain){
  renderHud();
  // show feedback overlay
  const fb = $("feedback");
  const card = $("feedback-card");
  card.classList.toggle("bad", !isCorrect);
  $("feedback-icon").textContent = isCorrect ? "✅" : "❌";
  $("feedback-title").textContent = title;
  $("feedback-points").textContent = isCorrect ? "+" + points + " pts" : (zenMode ? "💡 Learn & retry" : (state.lives <= 0 ? "" : "-1 ❤️"));
  const ex = $("feedback-explain");
  if(explain){ ex.innerHTML = explain; ex.classList.remove("hidden"); }
  else ex.classList.add("hidden");

  // decide next-button label
  const btnNext = $("btn-next");
  const lastQ = state.qIndex >= state.questions.length - 1;
  const dead = state.lives <= 0;
  btnNext.textContent = (dead || lastQ) ? "See Results →" : "Next →";

  fb.classList.remove("hidden");
}

function nextStep(){
  $("feedback").classList.add("hidden");
  if(state.lives <= 0 || state.qIndex >= state.questions.length - 1){
    endLevel();
  } else {
    state.qIndex++;
    loadQuestion();
  }
}

// ============================================================
//  RESULTS
// ============================================================
function endLevel(){
  clearInterval(state.timer);
  show("results");
  const total = state.questions.length;
  const acc = Math.round(state.correctCount / total * 100);
  const dead = state.lives <= 0;

  $("results-title").textContent = dead ? "Out of Lives!" : "Level Complete!";
  $("res-score").textContent = state.score;
  $("res-acc").textContent = acc + "%";
  $("res-streak").textContent = state.bestStreak;

  dead ? Sound.sfx.gameover() : Sound.sfx.win();
  recordResult(state.levelIndex, state.score, acc);
  if(!dead && acc >= 70) markLevelPassed(state.levelIndex, acc);

  const rank = getRank(acc, dead);
  $("rank-badge").textContent = rank.badge;
  $("results-msg").textContent = rank.msg;

  // next-level button only if there IS a next level and player survived
  const hasNext = state.levelIndex < LEVELS.length - 1;
  $("btn-next-level").classList.toggle("hidden", !(hasNext && !dead));

  // certificate: offer when the whole language is complete
  $("btn-claim-cert").classList.toggle("hidden", !isLanguageComplete());
}

// ---- Certificate rendering ----
function showCertificate(){
  const lang = LANGUAGES.find(l => l.id === CURRENT_LANG);
  $("cert-name").textContent = profile.name;
  $("cert-title").textContent = "Certified " + (lang ? lang.name : "Code") + " Pro";
  $("cert-date").textContent = new Date().toLocaleDateString(undefined, {year:"numeric", month:"long", day:"numeric"});
  Sound.sfx.win();
  show("cert");
}

function getRank(acc, dead){
  if(dead) return {badge:"💀 RAM Overflow", msg:"Your RAM filled up! Review the concepts and try again — every new needs a delete."};
  if(acc === 100) return {badge:"🏆 Memory Master", msg:"Flawless! Zero leaks, zero crashes. You've got manual memory management down cold."};
  if(acc >= 80) return {badge:"🥇 Memory Pro", msg:"Great work! Just a small leak or two — review the explanations and you'll be perfect."};
  if(acc >= 60) return {badge:"🥈 Memory Apprentice", msg:"Solid progress! Revisit the ones you missed to lock in the concepts."};
  return {badge:"🧑‍🎓 Memory Trainee", msg:"Good start! Replay this level and read each explanation — you'll improve fast."};
}

// ============================================================
//  EVENT WIRING
// ============================================================
$("btn-play").onclick = () => beginPlay(false);
$("btn-guest").onclick = () => beginPlay(true);
$("btn-quit").onclick = () => { clearInterval(state.timer); showModeSelect(); };

// mode select
$("mode-classic").onclick = () => { Sound.sfx.click(); chosenMode = "classic"; pickMode("mode-classic"); };
$("mode-basketball").onclick = () => { Sound.sfx.click(); chosenMode = "basketball"; pickMode("mode-basketball"); };
$("mode-pacman").onclick  = () => { Sound.sfx.click(); chosenMode = "pacman";  pickMode("mode-pacman"); };
$("mode-gta").onclick     = () => { Sound.sfx.click(); chosenMode = "gta";     pickMode("mode-gta"); };
function pickMode(id){ ["mode-classic","mode-basketball","mode-pacman","mode-gta"].forEach(m => $(m).classList.toggle("picked", m === id)); }
$("zen-check").onchange = (e) => { zenMode = e.target.checked; Sound.sfx.click(); };

// certificate buttons
$("btn-claim-cert").onclick = showCertificate;
$("btn-print-cert").onclick = () => window.print();
$("btn-cert-home").onclick = () => showModeSelect();
// brightness / photosensitivity warning
$("warning-ok").onclick = () => { $("brightness-warning").style.display = "none"; Sound.unlock(); };

// how-to-play buttons
$("howto-start").onclick = () => { Sound.sfx.click(); if(pendingStart) pendingStart(); };
$("howto-back").onclick = () => { Sound.sfx.click(); showModeSelect(); };

// character creator
$("creator-done").onclick = () => { saveAvatar(); Sound.sfx.click(); showLanguageSelect(); };
$("creator-random").onclick = () => {
  Avatar.OPTIONS.forEach(o => { avatar[o.key] = (Math.random()*o.values.length)|0; });
  Sound.sfx.click(); showCreator();
};
$("btn-mode-lang").onclick = () => showLanguageSelect();
$("btn-lang-home").onclick = () => { renderProfileList(); show("start"); };
$("bb-quit").onclick = () => { Basketball.stop(); showModeSelect(); };
$("pac-quit").onclick = () => { PacMan.stop(); showModeSelect(); };
$("gta-quit").onclick = () => { GTA.stop(); showModeSelect(); };
Basketball.wire();
PacMan.wire();
GTA.wire();

// audio toggle buttons
$("btn-music").onclick = () => { const on = Sound.toggleMusic(); $("btn-music").classList.toggle("off", !on); };
$("btn-sfx").onclick   = () => { const on = Sound.toggleSfx();   $("btn-sfx").classList.toggle("off", !on); Sound.sfx.click(); };
$("btn-next").onclick = nextStep;
$("btn-submit").onclick = submitTyped;
$("type-input").addEventListener("keydown", e => { if(e.key === "Enter") submitTyped(); });

$("btn-retry").onclick = () => {
  if(chosenMode === "basketball") startBasketball(lastBballLevel);
  else if(chosenMode === "pacman") startPac(lastPacLevel);
  else if(chosenMode === "gta") startGTA(lastGtaLevel);
  else startLevel(state.levelIndex);
};
$("btn-next-level").onclick = () => {
  if(chosenMode === "basketball") startBasketball(lastBballLevel + 1);
  else if(chosenMode === "pacman") startPac(lastPacLevel + 1);
  else if(chosenMode === "gta") startGTA(lastGtaLevel + 1);
  else startLevel(state.levelIndex + 1);
};
$("btn-home").onclick = () => showModeSelect();

// keyboard: Enter advances feedback
document.addEventListener("keydown", e => {
  if(e.key === "Enter" && !$("feedback").classList.contains("hidden")) nextStep();
});

// prefill last-used name + show returning-player list
if(store.lastUser) $("player-name").value = store.lastUser;
renderProfileList();

// init
buildLevelButtons();
show("start");
