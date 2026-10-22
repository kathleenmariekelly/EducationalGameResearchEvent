// ============================================================
// Recursion Realm — battle engine
// ============================================================
const app = document.getElementById("app");
const statusBar = document.getElementById("progress");

const G = {
  char: null,        // chosen character (a deep copy)
  hp: 0,
  xp: 0,
  enemyIndex: 0,
  enemy: null,
  enemyHp: 0,
  busy: false,       // locks input during animations/questions
  encounter: null    // when set, we're in a one-off world battle {onWin,onLose}
};

// ---------- persistence (localStorage) ----------
// XP is META-progression: it accumulates across every run, so rank and
// unlocked attacks survive game overs and browser sessions.
const SAVE_KEY = "recursionRealm.save.v1";
const DEFAULT_SAVE = { xp: 0, lastCharId: null, stats: { correct: 0, wrong: 0, wins: 0, clears: 0 }, party: [], recruited: [], lost: [], flags: {} };
let SAVE = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw);
    // merge so new fields added later don't break old saves
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) },
      party: parsed.party || [],
      recruited: parsed.recruited || [],
      lost: parsed.lost || [],
      flags: parsed.flags || {}
    };
  } catch (e) {
    return structuredClone(DEFAULT_SAVE);
  }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ }
}
function resetSave() {
  SAVE = structuredClone(DEFAULT_SAVE);
  persist();
  renderTitle();
}
function recordAnswer(correct) {
  if (correct) SAVE.stats.correct++; else SAVE.stats.wrong++;
  persist();
}

// ---------- helpers ----------
function rankFor(xp) {
  let r = RANKS[0];
  for (const rk of RANKS) if (xp >= rk.xp) r = rk;
  return r;
}
function nextRank(xp) {
  return RANKS.find(rk => rk.xp > xp) || null;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const _recentQ = {}; // key -> [recently served questions] so we cycle before repeating
function pickQuestion(topic, tier) {
  const pool = QUESTIONS[topic] || [];
  // prefer hardest question at or below the attack's tier
  const eligible = pool.filter(q => q.difficulty <= tier);
  const chosen = eligible.length ? eligible : pool;
  const maxDiff = Math.max(...chosen.map(q => q.difficulty));
  const top = chosen.filter(q => q.difficulty === maxDiff);

  const key = topic + ":" + maxDiff;
  let recent = _recentQ[key] || [];
  // candidates that weren't served recently; if all exhausted, reset the cycle
  let candidates = top.filter(q => !recent.includes(q));
  if (candidates.length === 0) { recent = []; candidates = top; }
  const q = candidates[Math.floor(Math.random() * candidates.length)];

  recent.push(q);
  // remember up to (poolSize - 1) so every other question appears before a repeat
  while (recent.length > Math.max(1, top.length - 1)) recent.shift();
  _recentQ[key] = recent;
  return q;
}

// ---------- screens ----------
function renderTitle() {
  statusBar.textContent = "";
  const rank = rankFor(SAVE.xp);
  const s = SAVE.stats;
  const answered = s.correct + s.wrong;
  const acc = answered ? Math.round((s.correct / answered) * 100) : 0;
  const hasProgress = SAVE.xp > 0 || answered > 0;

  const savedCharBtn = SAVE.lastCharId
    ? `<button class="primary" onclick="continueWithSaved()">Continue as ${charById(SAVE.lastCharId).emoji} ${charById(SAVE.lastCharId).type} ▸</button>`
    : "";

  app.innerHTML = `
    <div class="card center">
      <h2>Recursion Realm</h2>
      <p class="prompt">Power your attacks by mastering recursion &amp; dynamic programming.
      Your rank and XP are saved between sessions.</p>
      ${hasProgress ? `<div class="save-panel">
        <div>Rank <strong>${rank.name}</strong> · <strong>${SAVE.xp}</strong> XP</div>
        <div class="save-sub">Lifetime: ${s.correct}/${answered} correct (${acc}%) · ${s.wins} wins · ${s.clears} realm clears</div>
      </div>` : ""}
      <div class="title-actions">
        ${savedCharBtn}
        <button class="primary" onclick="renderSelect()">${SAVE.lastCharId ? "Change fighter" : "Choose your fighter"} ▸</button>
      </div>
      ${hasProgress ? `<button class="ghost" onclick="confirmReset()">Reset progress</button>` : ""}
    </div>`;
}

function charById(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }
function continueWithSaved() { startGame(CHARACTERS.indexOf(charById(SAVE.lastCharId))); }
function confirmReset() {
  if (confirm("Erase all saved rank, XP and stats? This cannot be undone.")) resetSave();
}

function renderSelect() {
  statusBar.textContent = "";
  app.innerHTML = `<div class="card">
      <span class="stage-label">Character Select</span>
      <h2>Pick your battle type</h2>
      <div class="char-grid" id="chars"></div>
    </div>`;
  const grid = document.getElementById("chars");
  CHARACTERS.forEach((c, i) => {
    const el = document.createElement("button");
    el.className = "char-card";
    el.style.borderColor = c.color;
    el.innerHTML = `
      <div class="char-emoji">${c.emoji}</div>
      <div class="char-name" style="color:${c.color}">${c.name}</div>
      <div class="char-type">${c.type} type · ❤️ ${c.maxHp}</div>
      <div class="char-blurb">${c.blurb}</div>`;
    el.onclick = () => startGame(i);
    grid.appendChild(el);
  });
}

function startGame(charIndex) {
  const src = CHARACTERS[charIndex];
  G.char = JSON.parse(JSON.stringify(src));
  G.hp = src.maxHp;
  G.xp = SAVE.xp;            // carry persisted rank/XP into the run
  G.enemyIndex = 0;
  SAVE.lastCharId = src.id;
  persist();
  loadEnemy();
}

function loadEnemy() {
  const e = ENEMIES[G.enemyIndex];
  G.enemy = e;
  G.enemyHp = e.maxHp;
  renderBattle(`A wild ${e.name} appears! "${e.taunt}"`);
}

function renderStatus() {
  const rank = rankFor(G.xp);
  const nxt = nextRank(G.xp);
  const toNext = nxt ? `${nxt.xp - G.xp} XP to ${nxt.name}` : "MAX RANK";
  const where = G.encounter
    ? `Battle: ${G.enemy ? G.enemy.name : ""}`
    : `Enemy ${G.enemyIndex + 1}/${ENEMIES.length}`;
  statusBar.innerHTML =
    `Rank: <strong>${rank.name}</strong> · XP ${G.xp} (${toNext}) · ${where}`;
}

// ---------- party perks ----------
function pk() { return G.perks || { hp:0, atk:0, xp:0, recoilShield:0, hint:false }; }
function effAtk(power) { return Math.round(power * (1 + pk().atk)); }
function effRecoil(recoil) { return Math.round(recoil * (1 - pk().recoilShield)); }

// ---------- one-off encounter (called from the overworld) ----------
function startEncounter(charDef, enemyDef, callbacks) {
  G.perks = (typeof getPartyPerks === "function") ? getPartyPerks() : { hp:0, atk:0, xp:0, recoilShield:0, hint:false };
  G.char = JSON.parse(JSON.stringify(charDef));
  G.char.maxHp += G.perks.hp;
  G.hp = G.char.maxHp;
  G.xp = SAVE.xp;
  G.encounter = callbacks || {};
  G.enemy = enemyDef;
  G.enemyHp = enemyDef.maxHp;
  G.busy = false;
  if (typeof uiShowApp === "function") uiShowApp();
  if (window.Music) Music.play(/Shadow/.test(enemyDef.name) ? "boss" : "battle");
  renderBattle(`${enemyDef.name} challenges you! "${enemyDef.taunt || ""}"`);
}
function finishEncounter(result) {
  const cb = G.encounter || {};
  G.encounter = null;
  if (typeof uiShowWorld === "function") uiShowWorld();
  if (window.Music && typeof currentBiomeTrack === "function") Music.play(currentBiomeTrack());
  if (result === "win") { if (cb.onWin) cb.onWin(); }
  else { if (cb.onLose) cb.onLose(); }
}

function hpBar(cur, max, color) {
  const pct = clamp(Math.round((cur / max) * 100), 0, 100);
  const c = pct < 25 ? "var(--bad)" : (color || "var(--good)");
  return `<div class="hp"><span style="width:${pct}%;background:${c}"></span></div>
          <div class="hp-num">${Math.max(0, cur)} / ${max}</div>`;
}

function renderBattle(logMsg) {
  renderStatus();
  const c = G.char, e = G.enemy;
  const rank = rankFor(G.xp);

  app.innerHTML = `
    <div class="card">
      <div class="arena">
        <div class="fighter">
          <div class="fighter-top">${e.emoji}</div>
          <div class="fighter-name">${e.name}</div>
          ${hpBar(G.enemyHp, e.maxHp, "var(--bad)")}
        </div>
        <div class="vs">⚔️</div>
        <div class="fighter">
          <div class="fighter-top">${c.emoji}</div>
          <div class="fighter-name" style="color:${c.color}">${c.name}</div>
          ${hpBar(G.hp, c.maxHp, "var(--good)")}
        </div>
      </div>
      <div class="battle-log" id="log">${logMsg || "Choose your move."}</div>
      <div class="moves" id="moves"></div>
    </div>`;

  const moves = document.getElementById("moves");
  c.attacks.forEach(atk => {
    const locked = atk.tier > rank.maxTier;
    const btn = document.createElement("button");
    btn.className = "move" + (locked ? " locked" : "");
    btn.disabled = locked || G.busy;
    const tierLabel = atk.tier === 0 ? "BASIC" : "★".repeat(atk.tier);
    btn.innerHTML = `
      <div class="move-name">${atk.name} <span class="tier">${tierLabel}</span></div>
      <div class="move-meta">💥 ${atk.power}${atk.tier > 0 ? ` · ⚠️ ${atk.recoil} recoil` : ""}</div>
      <div class="move-desc">${locked ? "🔒 Rank up to unlock" : atk.desc}</div>`;
    if (!locked) btn.onclick = () => { if (window.Sfx) Sfx.select(); useAttack(atk); };
    moves.appendChild(btn);
  });
}

function log(msg) {
  const el = document.getElementById("log");
  if (el) el.innerHTML = msg;
}

// ---------- combat flow ----------
function useAttack(atk) {
  if (G.busy) return;
  if (atk.tier === 0) {
    const d = effAtk(atk.power);
    dealDamage(d, `${G.char.name} used ${atk.name}! 💥 ${d} damage.`);
    return;
  }
  // Powered attack -> must answer a question first.
  askQuestion(atk);
}

function askQuestion(atk) {
  G.busy = true;
  const rank = rankFor(G.xp);
  const q = pickQuestion(atk.topic, atk.tier);
  const optionsHtml = q.options.map((o, i) =>
    `<button class="option" data-i="${i}">${o}</button>`).join("");

  app.innerHTML = `
    <div class="card">
      <span class="stage-label">Casting: ${atk.name} ${"★".repeat(atk.tier)}</span>
      <h2>Answer to unleash the attack!</h2>
      <div class="problem-statement">${q.q}</div>
      <div class="options" id="opts">${optionsHtml}</div>
      <div class="feedback" id="fb"></div>
      <div class="actions">
        ${pk().hint ? `<button class="ghost" id="hintbtn">💡 Hint (remove one wrong)</button>` : ""}
        <button class="primary" id="resolve" style="display:none">Continue ▸</button>
      </div>
    </div>`;

  const opts = [...document.querySelectorAll("#opts .option")];

  // Rare-friend perk: hint removes one wrong answer
  const hintBtn = document.getElementById("hintbtn");
  if (hintBtn) hintBtn.onclick = () => {
    const wrong = opts.filter((b, i) => i !== q.answer && !b.disabled);
    if (wrong.length) {
      const w = wrong[Math.floor(Math.random() * wrong.length)];
      w.disabled = true; w.style.opacity = "0.4"; w.style.textDecoration = "line-through";
    }
    hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
    if (window.Sfx) Sfx.select();
  };
  opts.forEach(btn => {
    btn.onclick = () => {
      const choice = +btn.dataset.i;
      opts.forEach(b => { b.disabled = true; });
      const correct = choice === q.answer;
      opts[q.answer].classList.add("correct");
      if (!correct) btn.classList.add("wrong");
      if (window.Sfx) (correct ? Sfx.correct() : Sfx.wrong());

      const fb = document.getElementById("fb");
      fb.className = "feedback show " + (correct ? "good" : "bad");
      fb.innerHTML = (correct ? "✅ Correct! " : "❌ Wrong — ") + q.why;

      const resolve = document.getElementById("resolve");
      resolve.style.display = "inline-block";
      resolve.textContent = correct ? "Strike! ▸" : "Take the hit ▸";
      resolve.onclick = () => {
        G.busy = false;
        recordAnswer(correct);
        if (correct) {
          const d = effAtk(atk.power);
          dealDamage(d, `✨ ${atk.name} lands! 💥 ${d} damage.`);
        } else {
          // Backfire: no damage to enemy, recoil to self (reduced by shield perk).
          if (window.Sfx) Sfx.backfire();
          const rec = effRecoil(atk.recoil);
          G.hp = clamp(G.hp - rec, 0, G.char.maxHp);
          renderBattle(`💢 ${atk.name} backfired! You take ${rec} recoil damage.`);
          if (G.hp <= 0) return renderGameOver();
          setTimeout(enemyTurn, 700);
        }
      };
    };
  });
}

function dealDamage(dmg, msg) {
  G.busy = true;
  if (window.Sfx) Sfx.hit();
  G.enemyHp = clamp(G.enemyHp - dmg, 0, G.enemy.maxHp);
  renderBattle(msg);
  if (G.enemyHp <= 0) {
    setTimeout(winBattle, 700);
  } else {
    setTimeout(enemyTurn, 700);
  }
}

function enemyTurn() {
  const dmg = G.enemy.power + Math.floor(Math.random() * 4);
  if (window.Sfx) Sfx.hit();
  G.hp = clamp(G.hp - dmg, 0, G.char.maxHp);
  G.busy = false;
  renderBattle(`${G.enemy.name} strikes back for ${dmg} damage!`);
  if (G.hp <= 0) renderGameOver();
}

function winBattle() {
  const before = rankFor(G.xp).name;
  const gained = Math.round(G.enemy.xp * (1 + pk().xp));
  G.xp += gained;
  const after = rankFor(G.xp).name;
  const rankedUp = before !== after;

  // persist XP + stats
  SAVE.xp = G.xp;
  SAVE.stats.wins++;

  // One-off world encounter: show a small victory card, then hand control back.
  if (G.encounter) {
    let m = `🎉 You defeated ${G.enemy.name}! +${gained} XP${pk().xp ? " (boosted!)" : ""}.`;
    if (rankedUp) m += `<br/><strong>⬆️ RANK UP → ${after}!</strong> New attacks unlocked.`;
    persist();
    if (window.Sfx) { Sfx.victory(); if (rankedUp) setTimeout(() => Sfx.rankup(), 500); }
    app.innerHTML = `<div class="card center"><h2>Victory!</h2>
      <div class="battle-log">${m}</div>
      <button class="primary" id="enc-cont">Continue ▸</button></div>`;
    document.getElementById("enc-cont").onclick = () => finishEncounter("win");
    renderStatus();
    return;
  }

  let msg = `🎉 You defeated ${G.enemy.name}! +${G.enemy.xp} XP.`;
  if (rankedUp) msg += `<br/><strong>⬆️ RANK UP → ${after}!</strong> New attacks may be unlocked.`;

  G.enemyIndex++;
  const done = G.enemyIndex >= ENEMIES.length;
  if (done) SAVE.stats.clears++;
  persist();

  app.innerHTML = `
    <div class="card center">
      <h2>${done ? "🏆 Realm Cleared!" : "Victory!"}</h2>
      <div class="battle-log">${msg}</div>
      ${done
        ? `<p class="prompt">You conquered every enemy as a <strong>${after}</strong>. Well fought!</p>
           <button class="primary" onclick="renderTitle()">Play again ↺</button>`
        : `<button class="primary" onclick="continueAfterWin()">Next battle ▸</button>`}
    </div>`;
  renderStatus();
}

function continueAfterWin() {
  // Heal a bit between fights so runs are winnable but not trivial.
  G.hp = clamp(G.hp + Math.round(G.char.maxHp * 0.35), 0, G.char.maxHp);
  loadEnemy();
}

function renderGameOver() {
  G.busy = false;
  if (window.Sfx) Sfx.defeat();

  // One-off world encounter: keep XP, hand control back to the overworld.
  if (G.encounter) {
    app.innerHTML = `<div class="card center"><h2>💀 Defeated</h2>
      <div class="battle-log">${G.char.name} was bested by ${G.enemy.name}.
        You keep rank <strong>${rankFor(G.xp).name}</strong> (${G.xp} XP). Train and try again!</div>
      <button class="primary" id="enc-cont">Continue ▸</button></div>`;
    document.getElementById("enc-cont").onclick = () => finishEncounter("lose");
    renderStatus();
    return;
  }

  app.innerHTML = `
    <div class="card center">
      <h2>💀 Defeated</h2>
      <div class="battle-log">${G.char.name} fell to ${G.enemy.name}.
        Reached rank <strong>${rankFor(G.xp).name}</strong> with ${G.xp} XP.</div>
      <p class="prompt">Tip: powered attacks hurt on a wrong answer — nail the recurrence to avoid recoil!</p>
      <button class="primary" onclick="renderTitle()">Try again ↺</button>
    </div>`;
  renderStatus();
}

// boot is handled by world.js (startStory)
