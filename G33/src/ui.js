// ===============================================================
//  UI CONTROLLER (v2)  — interactive lecture + rich quiz
//  Depends on content.js + game.js
// ===============================================================

const $ = sel => document.querySelector(sel);
function escapeHTML(s){ return s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }


const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

// ADHD-friendly: dim background tint during learning/testing (pet stays visible)
function focusMode(on) {
  document.body.classList.toggle("focus-mode", on);
  document.body.classList.remove("home"); // showHome re-adds after calling this
}

// Tetris-style stacked block progress bar
function blockBar(frac, count) {
  count = count || 10;
  const filled = Math.round(frac * count);
  let h = '<div class="blockbar">';
  for (let i = 0; i < count; i++) h += `<span class="blk blk-c${i % 6} ${i < filled ? "on" : ""}"></span>`;
  return h + "</div>";
}

// ---- top bar stats ----
function renderStats() {
  $("#stat-xp").textContent = state.xp;
  $("#stat-gems").textContent = state.gems;
  $("#stat-streak").textContent = state.streak;
  $("#stat-due").textContent = dueCount();
  renderPet();
}

// ---- Bolt's FACE close-up (for the circular camera) ----
function robotFaceSVG(id) {
  const cans = id === "teen" || id === "adult";
  const star = id === "adult";
  return `<svg viewBox="0 0 100 100" class="robot robot-face">
    <line x1="50" y1="14" x2="50" y2="4" stroke="var(--accent)" stroke-width="3"/>
    <circle cx="50" cy="3" r="3" fill="var(--warn)"/>
    ${cans ? `<rect x="12" y="38" width="9" height="22" rx="4" fill="var(--good)"/><rect x="79" y="38" width="9" height="22" rx="4" fill="var(--good)"/>` : ""}
    <rect x="18" y="14" width="64" height="66" rx="20" fill="var(--accent)"/>
    <rect x="27" y="28" width="46" height="38" rx="12" fill="var(--bg)"/>
    <circle cx="42" cy="45" r="7" fill="#fff"/>
    <circle cx="58" cy="45" r="7" fill="#fff"/>
    <g class="pupils">
      <circle class="pupil" cx="42" cy="45" r="3.6" fill="var(--accent)"/>
      <circle class="pupil" cx="58" cy="45" r="3.6" fill="var(--accent)"/>
    </g>
    <g class="happy-eyes">
      <path d="M36 47 Q42 40 48 47" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M52 47 Q58 40 64 47" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <path class="mouth" d="M42 58 Q50 63 58 58" stroke="var(--accent)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${star ? `<text x="50" y="25" text-anchor="middle" font-size="11">⭐</text>` : ""}
  </svg>`;
}

// ---- PET: Bolt the robot (cute SVG that grows by stage) ----
function robotSVG(id) {
  const arms = id !== "baby";
  const cans = id === "teen" || id === "adult";
  const star = id === "adult";
  return `<svg viewBox="0 0 120 122" class="robot">
    <line x1="60" y1="24" x2="60" y2="11" stroke="var(--accent)" stroke-width="3"/>
    <circle cx="60" cy="9" r="4" fill="var(--warn)"/>
    ${arms ? `<rect x="22" y="70" width="12" height="26" rx="6" fill="var(--accent)"/><rect x="86" y="70" width="12" height="26" rx="6" fill="var(--accent)"/>` : ""}
    <rect x="34" y="24" width="52" height="42" rx="12" fill="var(--accent)"/>
    ${cans ? `<rect x="26" y="38" width="9" height="18" rx="4" fill="var(--good)"/><rect x="85" y="38" width="9" height="18" rx="4" fill="var(--good)"/>` : ""}
    <rect x="44" y="34" width="32" height="20" rx="6" fill="var(--bg)"/>
    <circle cx="53" cy="44" r="5" fill="#fff"/>
    <circle cx="67" cy="44" r="5" fill="#fff"/>
    <g class="pupils">
      <circle class="pupil" cx="53" cy="44" r="2.6" fill="var(--accent)"/>
      <circle class="pupil" cx="67" cy="44" r="2.6" fill="var(--accent)"/>
    </g>
    <g class="happy-eyes">
      <path d="M49 45 Q53 40 57 45" stroke="var(--accent)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M63 45 Q67 40 71 45" stroke="var(--accent)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    </g>
    <rect x="40" y="68" width="40" height="36" rx="8" fill="var(--accent)"/>
    <rect x="48" y="76" width="24" height="20" rx="5" fill="var(--bg)"/>
    ${star ? `<text x="60" y="92" text-anchor="middle" font-size="15">⭐</text>` : `<circle cx="60" cy="86" r="4" fill="var(--warn)"/>`}
    <rect x="46" y="104" width="10" height="12" rx="3" fill="var(--accent)"/>
    <rect x="64" y="104" width="10" height="12" rx="3" fill="var(--accent)"/>
  </svg>`;
}
function renderPet() {
  const stage = petStage();
  const body = $("#pet-body");
  body.innerHTML = robotFaceSVG(stage.id);  // circular camera shows the FACE
  $("#pet-name").innerHTML = stage.name + (stage.badge ? " " + stage.badge : "");
  $("#pet-fill").style.width = Math.round(petProgress() * 100) + "%";
  const nxt = petNextStage();
  $("#pet-hint").textContent = nxt
    ? `${nxt.minXP - state.xp} XP \u2192 ${nxt.name}`
    : "fully grown \u2b50 tap me!";
}
const HAPPY = ["\ud83d\ude04", "\u2b50", "\ud83e\udd29", "\u2728", "\ud83d\udc96", "\ud83d\ude0a"];
function petBolt() {
  const body = $("#pet-body");
  const svg = body.querySelector(".robot");
  if (svg) { svg.classList.remove("wiggle"); void svg.offsetWidth; svg.classList.add("wiggle"); }
  // floating star/heart burst
  const layer = $("#pet-stars");
  for (let k = 0; k < 4; k++) {
    const s = el("span", "float-emoji", HAPPY[Math.floor(Math.random() * HAPPY.length)]);
    s.style.left = (30 + Math.random() * 40) + "%";
    s.style.animationDelay = (k * 60) + "ms";
    layer.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
  boltSmile(1000);
  // small love reward: every 10 pets gives a gem
  state.petPets++;
  if (state.petPets % 10 === 0) { state.gems++; renderStats(); toast("Bolt loves you! +1 \ud83d\udc8e"); }
  save();
}

// ---- Bolt reactions: smile with eyes / give courage ----
function boltSmile(ms) {
  const svg = $("#pet-body") && $("#pet-body").querySelector(".robot");
  if (!svg) return;
  svg.classList.add("happy");
  setTimeout(() => svg.classList.remove("happy"), ms || 900);
}
function boltBurst() {
  const layer = $("#pet-stars"); if (!layer) return;
  for (let k = 0; k < 4; k++) {
    const s = el("span", "float-emoji", HAPPY[Math.floor(Math.random() * HAPPY.length)]);
    s.style.left = (30 + Math.random() * 40) + "%";
    s.style.animationDelay = (k * 60) + "ms";
    layer.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}
function boltBubble(msg) {
  const pet = $("#pet"); if (!pet) return;
  let b = $("#bolt-bubble");
  if (!b) { b = el("div"); b.id = "bolt-bubble"; b.className = "bolt-bubble"; pet.appendChild(b); }
  b.textContent = msg;
  b.classList.add("show");
  clearTimeout(boltBubble._t);
  boltBubble._t = setTimeout(() => b.classList.remove("show"), 2600);
}
function boltReact(good) {
  if (good) { boltSmile(900); boltBurst(); }
  else { boltBubble(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]); }
}

// ---- global: Bolt's eyes + body follow the mouse ----
document.addEventListener("mousemove", (e) => {
  document.querySelectorAll(".bolt-track").forEach(wrap => {
    const svg = wrap.querySelector(".robot"); if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
    svg.style.setProperty("--tilt", `${dx * 8}deg`);
    svg.style.setProperty("--tx", `${dx * 4}px`);
    svg.style.setProperty("--ty", `${dy * 3}px`);
    const p = svg.querySelector(".pupils");
    if (p) p.setAttribute("transform", `translate(${dx * 2.6}, ${dy * 2})`);
  });
});

// ---- cute mentor avatar: emoji in a circle ----
function avatarHTML(mentor, talking) {
  return `<div class="avatar-circle ${talking ? "talking" : ""}">${mentor.icon}</div>`;
}

// ---- HOME: tracks + daily ----
function showHome() {
  focusMode(false);
  document.body.classList.add("home");
  const screen = $("#screen");
  screen.innerHTML = "";

  // Circular "camera" showing Bolt's interactive face (follows the mouse)
  const hero = el("div", "bolt-hero bolt-track");
  hero.innerHTML = `<div class="bolt-cam"><span class="cam-live"></span>${robotFaceSVG(petStage().id)}</div>
                    <div class="bolt-say">Hi, I'm <b>${petStage().name}</b>! Move your mouse — I'm watching 👀</div>`;
  hero.querySelector(".bolt-cam").onclick = () => { boltSmile(900); boltBurst(); };
  screen.appendChild(hero);

  // 💾 Resume an in-progress quiz
  if (state.session) {
    const s = state.session;
    const res = el("div", "reward resume-cta");
    res.innerHTML = `💾 <b>Resume your quiz</b> — ${s.mentor || "🧩"} ${s.topicName || ""}: question ${s.idx + 1}/${s.qorder.length}, ❤️ ${s.lives} left${s.lightning ? " • ⚡" : ""}.`;
    const rb = el("button", "btn", "▶ Resume");
    rb.style.marginTop = "10px";
    rb.onclick = () => startQuiz(s.trackId, s.topicId, s.tierId, { resume: s });
    const disc = el("button", "btn ghost small", "Discard");
    disc.style.margin = "10px 0 0 8px";
    disc.onclick = () => { state.session = null; save(); showHome(); toast("Session discarded"); };
    res.appendChild(el("div")); res.appendChild(rb); res.appendChild(disc);
    screen.appendChild(res);
  }

  // 📢 Announcement banner (Tetris-styled)
  const ann = el("div", "announce");
  ann.innerHTML =
    `<div class="tetro"><span class="blk blk-c0"></span><span class="blk blk-c1"></span><span class="blk blk-c2"></span><span class="blk blk-c3"></span></div>
     <div><b>📢 NEW!</b> Meet <b>Bolt</b> 🤖 — your learning robot. Stack up correct answers to power him up and watch him grow. <b>Build your knowledge block by block!</b></div>`;
  screen.appendChild(ann);

  screen.appendChild(el("h1", null, "🗺️ Your journey"));
  screen.appendChild(el("p", "subtle",
    "Travel the path: clear each stop to unlock the next. Clear a mentor's 4 stages, then stack blocks in the timed quiz."));

  const canClaim = state.dailyClaimed !== todayStr();
  const daily = el("div", "reward");
  daily.innerHTML = canClaim
    ? `🎁 <b>Daily reward ready!</b> Streak ${state.streak} 🔥 — claim your gems.`
    : `✅ Daily reward claimed. Come back tomorrow to grow your ${state.streak}🔥 streak!`;
  if (canClaim) {
    const b = el("button", "btn small", "Claim");
    b.style.marginTop = "10px";
    b.onclick = () => { const r = claimDaily(); if (r) { renderStats(); showHome(); toast(`+${r} 💎 gems!`); } };
    daily.appendChild(el("div")); daily.appendChild(b);
  }
  screen.appendChild(daily);

  // ---- MAP / JOURNEY of nodes ----
  const map = el("div", "map");
  map.appendChild(el("div", "map-node start", `<div class="node-dot">🚀</div><div class="node-label">Start</div>`));
  CONTENT.tracks.forEach((track, i) => {
    const unlocked = trackUnlocked(track);
    const mastered = isTrackMastered(track.id);
    map.appendChild(el("div", "map-link" + (unlocked ? " lit" : "")));
    const status = mastered ? "🏆 Mastered" : unlocked ? "Ready to play" : "🔒 Locked";
    const node = el("div", `map-node ${i % 2 ? "right" : "left"} ${unlocked ? "open" : "locked"}${mastered ? " done" : ""}`,
      `<div class="node-dot">${unlocked ? track.topics[0].mentor.icon : "🔒"}</div>
       <div class="node-card"><b>${"①②③"[i] || (i + 1)} ${track.name}</b>
         <div class="node-sub">${track.syllabus.length} units • ${status}</div></div>`);
    if (unlocked) node.onclick = () => showTrack(track.id);
    map.appendChild(node);
  });
  map.appendChild(el("div", "map-link"));
  map.appendChild(el("div", "map-node finish", `<div class="node-dot">🏆</div><div class="node-label">Master</div>`));
  screen.appendChild(map);
}

// ---- TRACK: topics ----
function showTrack(trackId) {
  focusMode(false);
  const track = CONTENT.tracks.find(t => t.id === trackId);
  const screen = $("#screen"); screen.innerHTML = "";
  screen.appendChild(backBtn(showHome));
  screen.appendChild(el("h1", null, track.name));
  screen.appendChild(el("p", "subtle", "Break the big topic into bite-size, buildable blocks."));

  // full syllabus (collapsible)
  const syl = el("details", "syllabus");
  syl.innerHTML = `<summary>🧱 All units in this build (${track.syllabus.length}) — what you'll master</summary>` +
    `<ol>${track.syllabus.map(u => `<li>${u}</li>`).join("")}</ol>`;
  screen.appendChild(syl);

  const grid = el("div", "grid");
  track.topics.forEach(topic => {
    const ts = topicState(track.id, topic.id);
    const playable = topic.questions.length > 0;
    let badge;
    if (!playable) badge = `<span class="badge locked">Coming soon</span>`;
    else if (!ts.tierCleared) badge = `<span class="badge">Not started</span>`;
    else {
      const nt = nextTier(ts.tierCleared);
      badge = nt
        ? `<span class="badge done">${TIERS[tierIndex(ts.tierCleared)].icon} cleared → next: ${nt.icon} ${nt.label}</span>`
        : `<span class="badge done">🏆 Mastered</span>`;
    }
    const tile = el("div", "tile",
      `${avatarHTML(topic.mentor, false)}
       <div class="name">${topic.name}</div>
       <div class="meta">Mentor: ${topic.mentor.name}</div>${badge}`);
    if (playable) tile.onclick = () => showTiers(track.id, topic.id);
    else tile.style.opacity = .6;
    grid.appendChild(tile);
  });
  screen.appendChild(grid);
}

// ---- TIER PICKER ----
function showTiers(trackId, topicId) {
  focusMode(false);
  const { topic } = findTopic(trackId, topicId);
  const ts = topicState(trackId, topicId);
  const screen = $("#screen"); screen.innerHTML = "";
  screen.appendChild(backBtn(() => showTrack(trackId)));
  screen.appendChild(el("h1", null, topic.name));
  screen.appendChild(el("p", "subtle", "Pick a difficulty. Pass mark is 80%; higher tiers give fewer hints and less time."));

  // progress bar to next tier
  const prog = tierProgress(trackId, topicId);
  const nt = nextTier(ts.tierCleared);
  const pbar = el("div", "tierprog");
  pbar.innerHTML =
    `<div class="tp-label">${ts.tierCleared ? TIERS[tierIndex(ts.tierCleared)].icon + " " + TIERS[tierIndex(ts.tierCleared)].label + " cleared" : "Not started"} → ${nt ? nt.icon + " " + nt.label : "🏆 Mastered"}</div>
     ${blockBar(prog, 12)}
     <div class="tp-pct">${Math.round(prog*100)}% built toward ${nt ? "next tier" : "mastery"} • best score ${ts.best}%</div>`;
  screen.appendChild(pbar);

  const wrap = el("div", "tiers");
  TIERS.forEach((tier, i) => {
    const cleared = ts.tierCleared && tierIndex(ts.tierCleared) >= i;
    const unlocked = i === 0 || (ts.tierCleared && tierIndex(ts.tierCleared) >= i - 1);
    const card = el("div", "tier",
      `<div class="icon">${tier.icon}</div>
       <div class="t-name">${tier.label}</div>
       <div class="t-meta">Pass ≥ ${tier.passPct}%<br>${tier.hints} hints total<br>${tier.seconds}s / question
         ${cleared ? "<br>✅ cleared" : unlocked ? "" : "<br>🔒 locked"}</div>`);
    if (unlocked) card.onclick = () => showMentor(trackId, topicId, tier.id);
    else card.style.opacity = .5;
    wrap.appendChild(card);
  });
  screen.appendChild(wrap);

  // ⚡ Lightning round: half time, 2× XP, 10 rapid questions (skips lecture)
  const lr = el("div", "reward lightning-cta");
  lr.innerHTML = `⚡ <b>Lightning round</b> — 10 rapid questions, ½ the time, <b>2× XP</b>. For when you're feeling sharp!`;
  const lb = el("button", "btn small", "⚡ Play Lightning");
  lb.style.marginTop = "10px";
  lb.onclick = () => startQuiz(trackId, topicId, ts.tierCleared || "noob", { lightning: true });
  lr.appendChild(el("div")); lr.appendChild(lb);
  screen.appendChild(lr);
}

// ---- INTERACTIVE LECTURE (Learning Pyramid) ----
function showMentor(trackId, topicId, tierId) {
  focusMode(true);
  const { topic } = findTopic(trackId, topicId);
  let step = 0;
  const screen = $("#screen");

  function render() {
    const c = topic.lecture[step];
    screen.innerHTML = "";
    screen.appendChild(backBtn(() => showTiers(trackId, topicId)));

    // mentor speech (avatar 'talks' while text appears)
    const m = el("div", "mentor");
    m.innerHTML =
      `${avatarHTML(topic.mentor, true)}
       <div class="speech">
         <span class="stage-chip stage-${c.stage}">${stageLabel(c.stage)}</span>
         <div class="chunk-title">${c.title}</div>
         <div class="chunk-body">${c.body}</div>
       </div>`;
    screen.appendChild(m);
    // stop the talking bob shortly after (feels like it finished a sentence)
    setTimeout(() => { const a = m.querySelector(".avatar-circle"); if (a) a.classList.remove("talking"); }, 2600);

    // stage-specific interactions
    const speech = m.querySelector(".speech");
    if (c.svg) mountDiagram(speech, c);
    if (c.practice) mountPractice(speech, c.practice);
    if (c.teachback) mountTeachback(speech, c.teachback);
    if (c.takeaway) speech.appendChild(el("div", "chunk-key", "🔑 " + c.takeaway));

    // pyramid rail
    const rail = el("div", "pyramid");
    topic.lecture.forEach((s, i) => {
      const st = el("div", "py-step" + (i === step ? " active" : i < step ? " done" : ""),
        `${i < step ? "✓ " : ""}${s.stage}`);
      st.onclick = () => { step = i; render(); };
      rail.appendChild(st);
    });
    screen.appendChild(rail);

    // nav
    const row = el("div", "row");
    if (step > 0) { const p = el("button", "btn ghost", "◀ Back"); p.onclick = () => { step--; render(); }; row.appendChild(p); }
    const leave = el("button", "btn ghost small", "🚪 Not ready — save & exit");
    leave.onclick = () => { save(); showTiers(trackId, topicId); toast("Progress saved 👍"); };
    row.appendChild(leave);
    row.appendChild(el("div", "spacer"));
    if (step < topic.lecture.length - 1) {
      const n = el("button", "btn", "Next ▶"); n.onclick = () => { step++; render(); }; row.appendChild(n);
    } else {
      const go = el("button", "btn", "I'm ready — start quiz 🚀");
      go.onclick = () => startQuiz(trackId, topicId, tierId);
      row.appendChild(go);
    }
    screen.appendChild(row);
  }
  render();
}

function stageLabel(s) {
  return ({ Learn: "① Learn", See: "② See", Do: "③ Do", Teach: "④ Teach" })[s] || s;
}

// clickable array diagram (the "See" step)
function mountDiagram(parent, c) {
  const holder = el("div"); holder.innerHTML = c.svg; parent.appendChild(holder);
  const note = holder.querySelector("#svg-note");
  holder.querySelectorAll(".cell").forEach(cell => {
    cell.addEventListener("click", () => {
      const i = cell.getAttribute("data-i");
      if (note) note.textContent = `arr[${i}]  →  base + ${i} × size  →  one step  →  O(1) ✅`;
      holder.querySelectorAll(".cell rect").forEach(r => r.setAttribute("stroke", "#33366b"));
      cell.querySelector("rect").setAttribute("stroke", "#2ec4b6");
    });
  });
}

// predict-then-reveal mini exercises (the "Do" step)
function mountPractice(parent, items) {
  items.forEach(it => {
    const box = el("div", "practice-item");
    box.appendChild(el("div", "practice-q", it.q));
    const opts = el("div", "practice-opts");
    it.options.forEach((o, oi) => {
      const b = el("button", "p-opt", o);
      b.onclick = () => {
        if (box.querySelector(".p-why")) return;
        [...opts.children].forEach(x => x.disabled = true);
        b.classList.add(oi === it.correct ? "correct" : "wrong");
        if (oi !== it.correct) opts.children[it.correct].classList.add("correct");
        box.appendChild(el("div", "p-why", (oi === it.correct ? "✅ " : "💡 ") + it.why));
      };
      opts.appendChild(b);
    });
    box.appendChild(opts);
    parent.appendChild(box);
  });
}

// teach-back box (the "Teach" step)
function mountTeachback(parent, tb) {
  const ta = el("textarea", "teach-area");
  ta.placeholder = "Type your explanation here… (this is the highest-retention step!)";
  parent.appendChild(ta);
  const reveal = el("button", "btn ghost small", "Compare with a model answer");
  reveal.style.marginTop = "10px";
  reveal.onclick = () => {
    if (parent.querySelector(".model-answer")) return;
    parent.appendChild(el("div", "model-answer", "💬 <b>Model answer:</b> " + tb.model));
  };
  parent.appendChild(reveal);
}

// ---- QUIZ LOOP (Tetris well + lives + power-ups + varied types + lightning) ----
function startQuiz(trackId, topicId, tierId, opts) {
  opts = opts || {};
  focusMode(true);
  const { track, topic } = findTopic(trackId, topicId);
  const tier = TIERS[tierIndex(tierId)];
  const resume = opts.resume || null;
  const lightning = resume ? resume.lightning : !!opts.lightning;

  let questions;
  if (resume) questions = resume.qorder.map(i => ({ q: topic.questions[i], i }));
  else { questions = pickQuestions(track, topic); if (lightning) questions = questions.slice(0, Math.min(10, questions.length)); }
  const baseTime = lightning ? Math.ceil(tier.seconds / 2) : tier.seconds;
  const xpMult = lightning ? 2 : 1;

  let idx = 0, correctCount = 0, hintsLeft = tier.hints, timer = null;
  let lives = LIVES, bonusXP = 0, doubleNext = false, linesCleared = 0;
  const screen = $("#screen");

  // ---- Tetris well state ----
  const COLS = 6, ROWS = 9;
  const TCOL = ["#00c2d1", "#f5c518", "#a35cff", "#3ddc84", "#ff5d73", "#ff9f1c"];
  let colH = new Array(COLS).fill(0), cells = [];

  // restore a saved session
  if (resume) {
    idx = resume.idx; correctCount = resume.correctCount; hintsLeft = resume.hintsLeft;
    lives = resume.lives; bonusXP = resume.bonusXP; linesCleared = resume.linesCleared;
    colH = resume.colH.slice(); cells = resume.cells.map(c => ({ ...c, isNew: false }));
  }

  function saveSession() {
    state.session = {
      trackId, topicId, tierId, lightning,
      qorder: questions.map(x => x.i),
      idx, correctCount, hintsLeft, lives, bonusXP, linesCleared,
      colH: colH.slice(), cells: cells.map(c => ({ c: c.c, r: c.r, color: c.color })),
      topicName: topic.name, mentor: topic.mentor.icon,
    };
    save();
  }
  function dropPiece(count, garbage) {
    const color = garbage ? "#5b6478" : TCOL[Math.floor(Math.random() * TCOL.length)];
    let start = count >= COLS ? 0 : Math.floor(Math.random() * (COLS - count + 1));
    if (count === 1) start = Math.floor(Math.random() * COLS);
    for (let k = 0; k < count; k++) {
      const c = (start + k) % COLS;
      if (colH[c] < ROWS) { cells.push({ c, r: colH[c], color, isNew: true }); colH[c]++; }
    }
    const floor = Math.min(...colH);
    if (floor > 0) {
      cells = cells.filter(x => x.r >= floor).map(x => ({ ...x, r: x.r - floor, isNew: false }));
      colH = colH.map(h => h - floor);
      linesCleared += floor;
      const bonus = floor * 5;
      state.gems += bonus; renderStats();
      toast(`\ud83e\uddf1 ${floor} line${floor > 1 ? "s" : ""} cleared! +${bonus}\ud83d\udc8e`);
    }
  }
  function wellHTML() {
    const cw = 22, gap = 2;
    let blocks = "";
    cells.forEach(x => {
      blocks += `<div class="well-blk${x.isNew ? " pop" : ""}" style="left:${x.c * (cw + gap)}px;bottom:${x.r * (cw + gap)}px;width:${cw}px;height:${cw}px;background:${x.color}"></div>`;
    });
    return `<div class="well-title">\ud83e\uddf1 Build well</div>
      <div class="well" style="width:${COLS * (cw + gap)}px;height:${ROWS * (cw + gap)}px">${blocks}</div>
      <div class="well-info">Lines: <b>${linesCleared}</b></div>`;
  }

  function heartsHTML() {
    let h = "";
    for (let i = 0; i < LIVES; i++) h += `<span class="heart ${i < lives ? "" : "lost"}">\u2764\ufe0f</span>`;
    return h;
  }

  function endQuiz(fainted) {
    focusMode(false);
    if (timer) clearInterval(timer);
    state.session = null; // finished — clear any resume point
    const pct = Math.round((correctCount / questions.length) * 100);
    const passed = !fainted && pct >= tier.passPct;
    const ts = topicState(trackId, topicId);
    ts.attempts++; ts.best = Math.max(ts.best, pct);
    if (passed && (!ts.tierCleared || tierIndex(tierId) > tierIndex(ts.tierCleared))) ts.tierCleared = tierId;
    const xpGain = (correctCount * XP_PER_CORRECT) * xpMult + bonusXP + (passed ? tier.passPct : 0);
    state.xp += xpGain; if (passed) state.gems += 15;
    save(); renderStats();

    screen.innerHTML = "";
    screen.appendChild(el("div", "result-big", fainted ? "\ud83e\udd76" : passed ? "\ud83c\udf89" : "\ud83d\udcaa"));
    screen.appendChild(el("h1", null, fainted ? "Bolt fainted!" : passed ? "Level cleared!" : "Almost there!"));
    screen.appendChild(el("p", "result-line",
      `${correctCount}/${questions.length} correct \u2014 ${pct}% (needed ${tier.passPct}%) \u2022 \ud83e\uddf1 ${linesCleared} lines`));
    const reward = el("div", "reward");
    reward.innerHTML = passed
      ? `+${xpGain} XP &nbsp; +15 \ud83d\udc8e ${nextTier(tierId) ? `<br>Unlocked next tier: ${nextTier(tierId).icon} ${nextTier(tierId).label}` : "<br>\ud83c\udfc6 Topic mastered!"}`
      : `+${xpGain} XP. ${fainted ? "Out of energy \u2014 regroup and try again!" : "Missed questions added to your review deck \ud83d\udd01"}`;
    screen.appendChild(reward);
    const row = el("div", "row");
    const retry = el("button", "btn", "Try again"); retry.onclick = () => showMentor(trackId, topicId, tierId);
    const home = el("button", "btn ghost", "Back to topics"); home.onclick = () => showTrack(trackId);
    row.appendChild(retry); row.appendChild(el("div", "spacer")); row.appendChild(home);
    screen.appendChild(row);
  }

  function renderQ() {
    if (idx >= questions.length) return endQuiz(false);
    const { q, i: qi } = questions[idx];
    const isOrder = q.type === "order";
    let answered = false, timeLeft = baseTime, hintLevel = 0;

    screen.innerHTML = "";
    const layout = el("div", "quiz-layout");
    const main = el("div", "quiz-main");
    const side = el("div", "quiz-side");
    side.innerHTML = wellHTML();
    layout.appendChild(main); layout.appendChild(side); screen.appendChild(layout);

    const head = el("div", "quiz-head");
    head.innerHTML =
      `<span>Q${idx + 1}/${questions.length}${lightning ? " \u26a1" : ""}</span>
       <span class="hearts">${heartsHTML()}</span>
       <div class="qbar"><div style="width:${(idx / questions.length) * 100}%"></div></div>
       <span class="timer" id="timer">${timeLeft}s</span>`;
    main.appendChild(head);

    if (q.svg) { const d = el("div"); d.innerHTML = q.svg; main.appendChild(d); }
    if (q.code) { const c = el("pre", "codecard"); c.innerHTML = `<span class="code-tag">code</span>` + escapeHTML(q.code); main.appendChild(c); }
    main.appendChild(el("div", "question", q.q));

    // ---- power-up bar ----
    const pu = el("div", "powerbar");
    POWERUPS.forEach(p => {
      if ((p.id === "fifty") && isOrder) return; // 50/50 not for ordering
      const b = el("button", "powerup", `${p.icon}<small>${p.name}</small><em>\ud83d\udc8e${p.cost}</em>`);
      b.onclick = () => usePower(p, b);
      pu.appendChild(b);
    });
    main.appendChild(pu);

    // ---- answer area ----
    const ans = el("div", "answers");
    let orderPick = [];
    if (isOrder) {
      const shuffled = shuffle(q.order.slice());
      const tray = el("div", "order-tray"); tray.innerHTML = `<span class="tray-hint">your order \u2192</span>`;
      const pool = el("div", "order-pool");
      shuffled.forEach(item => {
        const b = el("button", "answer answer-c2 order-item", item);
        b.onclick = () => {
          if (answered) return;
          b.disabled = true; b.style.opacity = .35;
          orderPick.push(item);
          const chip = el("span", "tray-chip", `${orderPick.length}. ${item}`);
          tray.appendChild(chip);
          if (orderPick.length === q.order.length)
            reveal(orderPick.join("|") === q.order.join("|") ? "ORDER_OK" : "ORDER_NO");
        };
        pool.appendChild(b);
      });
      main.appendChild(tray); main.appendChild(pool);
    } else {
      q.a.forEach((text, ai) => {
        const b = el("button", `answer answer-c${ai % 4}`, text);
        b.style.animationDelay = (ai * 80) + "ms";
        b.onclick = () => reveal(ai);
        ans.appendChild(b);
      });
      main.appendChild(ans);
    }

    // ---- hints + exit ----
    const row = el("div", "row");
    const quit = el("button", "btn ghost small", "\ud83d\udeaa Save & exit");
    quit.onclick = () => { if (timer) clearInterval(timer); saveSession(); showHome(); toast("Saved \u2014 tap Resume to continue \ud83d\udcbe"); };
    const hintBtn = el("button", "btn ghost", `\ud83d\udca1 Hint (${hintsLeft} left)`);
    const totalHints = (q.hints || []).length;
    hintBtn.disabled = hintsLeft <= 0 || totalHints === 0;
    hintBtn.onclick = () => {
      if (answered || hintsLeft <= 0 || hintLevel >= totalHints) return;
      let box = $("#hint");
      if (!box) { box = el("div", "hintbox"); box.id = "hint"; main.appendChild(box); }
      box.appendChild(el("div", "hint-step", `<b>Hint ${hintLevel + 1}:</b> ${q.hints[hintLevel]}`));
      hintLevel++; hintsLeft--;
      hintBtn.textContent = `\ud83d\udca1 Hint (${hintsLeft} left)`;
      if (hintsLeft <= 0 || hintLevel >= totalHints) hintBtn.disabled = true;
    };
    row.appendChild(hintBtn); row.appendChild(el("div", "spacer")); row.appendChild(quit);
    main.appendChild(row);

    const tEl = () => $("#timer");
    timer = setInterval(() => {
      timeLeft--;
      if (tEl()) { tEl().textContent = timeLeft + "s";
        tEl().className = "timer" + (timeLeft <= 5 ? " danger" : timeLeft <= 10 ? " warn" : ""); }
      if (timeLeft <= 0) { clearInterval(timer); if (!answered) reveal(-1); }
    }, 1000);

    function usePower(p, btn) {
      if (answered) return;
      if (state.gems < p.cost) { toast("Need \ud83d\udc8e " + p.cost); return; }
      state.gems -= p.cost; renderStats(); save();
      btn.disabled = true; btn.style.opacity = .4;
      if (p.id === "freeze") { timeLeft += 10; if (tEl()) tEl().textContent = timeLeft + "s"; toast("\u2744\ufe0f +10s"); }
      else if (p.id === "fifty") {
        const wrong = [...ans.children].map((b, i) => i).filter(i => i !== q.correct);
        shuffle(wrong).slice(0, 2).forEach(i => { ans.children[i].disabled = true; ans.children[i].style.opacity = .3; });
        toast("\u2702\ufe0f Two wrong removed");
      }
      else if (p.id === "skip") { toast("\u23ed\ufe0f Skipped"); answered = true; if (timer) clearInterval(timer); idx++; renderQ(); }
      else if (p.id === "double") { doubleNext = true; toast("\u2728 2\u00d7 XP armed for this one"); }
    }

    function reveal(chosen) {
      if (answered) return;
      answered = true; if (timer) clearInterval(timer);
      const correct = chosen === q.correct || chosen === "ORDER_OK";
      const timeUp = chosen === -1;
      if (correct) { correctCount++; if (doubleNext) { bonusXP += XP_PER_CORRECT; } }
      else { lives--; }
      doubleNext = false;
      boltReact(correct);
      dropPiece(correct ? 4 : 1, !correct);       // Tetris: correct=piece, wrong=garbage
      side.innerHTML = wellHTML();
      reviewCard(srsKey(trackId, topicId, qi), correct); save();

      if (!isOrder) {
        [...ans.children].forEach((btn, ai) => {
          btn.disabled = true;
          if (ai === q.correct) btn.classList.add("correct");
          else if (ai === chosen) btn.classList.add("wrong");
        });
      } else {
        main.querySelectorAll(".order-item").forEach(b => b.disabled = true);
      }
      hintBtn.disabled = true;
      const stale = $("#hint"); if (stale) stale.remove();

      main.appendChild(el("div", "explain",
        `${correct ? "\u2705 Correct! " : timeUp ? "\u23f0 Time's up. " : "\u274c Not quite. "}<b>Why:</b> ${q.explain}`));

      let nx;
      if (q.deeper) {
        const more = el("button", "btn ghost small", "\ud83e\udd14 I still don't get it");
        more.style.marginTop = "10px";
        more.onclick = () => { if ($("#deeper")) return; const d = el("div", "deeper", "\ud83e\udde9 <b>Simpler take:</b> " + q.deeper); d.id = "deeper"; main.insertBefore(d, nx); };
        main.appendChild(more);
      }

      if (lives <= 0) {
        nx = el("button", "btn", "See results");
        nx.onclick = () => endQuiz(true);
      } else {
        nx = el("button", "btn", idx === questions.length - 1 ? "See results" : "Next \u25b6");
        nx.onclick = () => { idx++; renderQ(); };
      }
      nx.style.marginTop = "14px";
      main.appendChild(nx);
    }
  }
  renderQ();
}

// ---- helpers ----
function backBtn(fn) {
  const b = el("button", "btn ghost", "◀ Back");
  b.style.marginBottom = "14px"; b.onclick = fn; return b;
}
let toastTimer;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = el("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#23264a;" +
    "border:1px solid #7c5cff;color:#eef0ff;padding:12px 20px;border-radius:12px;font-weight:700;z-index:99;";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2200);
}

// ---- boot ----
// ---- SHOP (spend gems on theme perks) ----
function showShop() {
  focusMode(false);
  const screen = $("#screen"); screen.innerHTML = "";
  screen.appendChild(backBtn(showHome));
  screen.appendChild(el("h1", null, "🛍️ Theme Shop"));
  screen.appendChild(el("p", "subtle", `You have 💎 ${state.gems} gems. The default "Focus" palette uses calm blue-green tones — research links cool colours to concentration and lower eye strain.`));

  const grid = el("div", "grid");
  CONTENT.themes.forEach(theme => {
    const owned = state.ownedThemes.includes(theme.id);
    const active = state.theme === theme.id;
    const tile = el("div", "tile");
    tile.innerHTML =
      `<div class="swatch" style="background:${theme.swatch}"></div>
       <div class="name">${theme.name}</div>
       <div class="meta">${owned ? (active ? "✅ Active" : "Owned") : "💎 " + theme.cost + " gems"}</div>`;
    tile.onclick = () => {
      if (active) return;
      if (owned) { state.theme = theme.id; save(); applyTheme(); showShop(); toast(theme.name + " applied!"); }
      else if (buyTheme(theme.id)) { state.theme = theme.id; save(); applyTheme(); renderStats(); showShop(); toast("Unlocked " + theme.name + "!"); }
      else toast("Not enough gems 💎");
    };
    grid.appendChild(tile);
  });
  screen.appendChild(grid);

  // custom accent picker (must be unlocked for 500 gems)
  const custom = el("div", "reward");
  if (!state.customUnlocked) {
    custom.innerHTML = `🎨 <b>Custom accent</b> — unlock a colour picker to tint the whole UI to ANY colour. Recolors the CodeQuest logo & Shop too.`;
    const buy = el("button", "btn small", `Unlock • 💎 ${CUSTOM_ACCENT_COST}`);
    buy.style.marginTop = "10px";
    buy.onclick = () => {
      if (buyCustomAccent()) { renderStats(); showShop(); toast("Custom accent unlocked! 🎨"); }
      else toast("Need 💎 " + CUSTOM_ACCENT_COST + " gems");
    };
    custom.appendChild(el("div")); custom.appendChild(buy);
  } else {
    custom.innerHTML = `🎨 <b>Custom accent</b> — pick any colour; the whole UI (logo, shop, buttons) follows.`;
    const pick = el("input"); pick.type = "color"; pick.value = state.customAccent || "#2ec4b6";
    pick.style.cssText = "margin:10px 8px 0;width:56px;height:36px;border:none;background:none;cursor:pointer;";
    pick.oninput = () => { state.customAccent = pick.value; save(); applyTheme(); };
    const reset = el("button", "btn ghost small", "Reset");
    reset.onclick = () => { state.customAccent = null; save(); applyTheme(); showShop(); };
    custom.appendChild(el("div")); custom.appendChild(pick); custom.appendChild(reset);
  }
  screen.appendChild(custom);
}

// ---- boot ----
applyTheme();
document.getElementById("shop-btn").onclick = showShop;
document.getElementById("pet").onclick = petBolt;
handleDaily(); renderStats(); showHome();
