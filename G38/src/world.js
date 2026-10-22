// ============================================================
// Recursion Realm — overworld engine (top-down pixel RPG)
// Story -> tutorial -> multi-biome world -> dark-castle final boss.
// Biomes in order: grassland town -> winter -> forest -> desert -> lava (red castle).
// Battles handled by game.js via startEncounter().
// ============================================================

const TS = 32;              // tile size in px
const PS = 24;              // player hitbox size
const ZOOM = 2;             // camera zoom / narrower field of view
const el = (id) => document.getElementById(id);

// tile codes: 0 ground 1 path 2 obstacle 3 liquid 4 wall 5 door 6 decor 7 gate(interact)
const SOLID = new Set([2, 3, 4, 5, 7]);

// ---------- UI toggling (also called from game.js) ----------
function uiShowApp()   { el("stage").classList.add("hidden");  el("app").classList.remove("hidden"); }
function uiShowWorld() { el("app").classList.add("hidden");    el("stage").classList.remove("hidden"); WORLD.mode = "roam"; }

// ---------- audio helpers ----------
const BIOME_TRACK = { grass:"town", winter:"winter", forest:"forest", desert:"desert", lava:"lava", dark:"castle" };
function currentBiomeTrack() { return (WORLD.map && BIOME_TRACK[WORLD.map.biome]) || "town"; }
function sfx(name) { if (window.Sfx && Sfx[name]) Sfx[name](); }

// ---------- fade transition ----------
function fadeTransition(mid, after) {
  const f = el("fade");
  WORLD.mode = "transition";
  f.classList.add("on");
  setTimeout(() => { if (mid) mid(); }, 230);
  setTimeout(() => { f.classList.remove("on"); WORLD.mode = "roam"; if (after) after(); }, 470);
}

// ---------- biome palettes ----------
const BIOMES = {
  grass:  { ground:"#3b6b35", path:"#c2a86b", ob:"#1f4a24", obTop:"#2f7a34", liquid:"#2f6db0", liqHi:"#5aa0d8", wall:"#7d6b5d", wallTop:"#9a8574", decor:"#f6ad55", kind:"tree" },
  winter: { ground:"#e6eef7", path:"#cdd8e4", ob:"#8fb3d0", obTop:"#dff0ff", liquid:"#6fb7d8", liqHi:"#bfe6f5", wall:"#9fb0c8", wallTop:"#d3ddea", decor:"#ffffff", kind:"snowtree" },
  forest: { ground:"#274a24", path:"#6b5535", ob:"#123d18", obTop:"#1d5a25", liquid:"#2f6db0", liqHi:"#5aa0d8", wall:"#5a4a35", wallTop:"#74604a", decor:"#c2e26b", kind:"tree" },
  desert: { ground:"#d9b56b", path:"#e6cd94", ob:"#b07d3c", obTop:"#2f7a34", liquid:"#38b2ac", liqHi:"#7ee0da", wall:"#b58a4d", wallTop:"#d0a765", decor:"#8a6a30", kind:"cactus" },
  lava:   { ground:"#3a2320", path:"#5a2f22", ob:"#241615", obTop:"#3a211c", liquid:"#ff5a1f", liqHi:"#ffd23f", wall:"#6b2b1c", wallTop:"#8a3a22", decor:"#ff8a3f", kind:"rock" },
  dark:   { ground:"#2a1418", path:"#401a1f", ob:"#14080a", obTop:"#2a1013", liquid:"#ff5a1f", liqHi:"#ffd23f", wall:"#7a1f26", wallTop:"#a52a33", decor:"#ff3355", kind:"pillar" }
};

// ---------- world state ----------
const WORLD = {
  mode: "roam",            // roam | dialog | battle
  mapId: null,
  map: null,               // active map object { biome,w,h,tiles,exits,npcs }
  built: {},               // cache of built maps
  player: { x: 0, y: 0, dir: "up", char: null },
  cam: { x: 0, y: 0 },
  keys: {},
  flags: SAVE.flags,        // rivalBeaten, bossBeaten, ruinsVisited, per-challenger ids... (persisted)
  dialog: null,
  npcs: []
};

// ---------- enemies ----------
const RIVAL_ENEMY = { name:"Rennik the Rival", emoji:"🥷", maxHp:55, power:6, xp:50, taunt:"Show me you actually understand recursion!" };
const DARK_BOSS   = { name:"Your Shadow", emoji:"🌑", maxHp:150, power:15, xp:320, taunt:"I took the shortcut. Why would I lose to the slow way?" };
const CHALLENGERS = {
  winter: { name:"Frost Loopwraith",  emoji:"🧊", maxHp:75,  power:9,  xp:75,  taunt:"You'll freeze before you find the base case!" },
  forest: { name:"Recursion Wisp",    emoji:"🌀", maxHp:95,  power:11, xp:95,  taunt:"Call me... and call me again..." },
  desert: { name:"Mirage Golem",      emoji:"🗿", maxHp:115, power:13, xp:120, taunt:"Your greedy choice is a mirage." },
  lava:   { name:"Magma Overflow",    emoji:"🌋", maxHp:145, power:16, xp:170, taunt:"Overflow the stack and burn!" }
};

// ============================================================
// MAP BUILDERS
// ============================================================
function emptyGrid(w, h) { return Array.from({ length: h }, () => Array(w).fill(0)); }

// generic biome corridor: tree/rock borders, a horizontal path, side exits
function corridor(biome, w, h, py, extras = {}) {
  const m = emptyGrid(w, h);
  for (let x = 0; x < w; x++) { m[0][x] = 2; m[h - 1][x] = 2; }
  for (let y = 0; y < h; y++) { m[y][0] = 2; m[y][w - 1] = 2; }
  for (let x = 1; x < w - 1; x++) m[py][x] = 1;              // main path
  (extras.blocks || []).forEach(([x, y]) => { if (m[y] && m[y][x] === 0) m[y][x] = 2; });
  (extras.decor  || []).forEach(([x, y]) => { if (m[y] && m[y][x] === 0) m[y][x] = 6; });
  (extras.liquid || []).forEach(([x, y]) => { if (m[y] && m[y][x] === 0) m[y][x] = 3; });
  return { biome, w, h, tiles: m, py };
}

// ---- grassland town (hub) ----
function buildTownMap() {
  const MW = 24, MH = 18;
  const m = emptyGrid(MW, MH);
  const set = (x, y, v) => { if (y >= 0 && y < MH && x >= 0 && x < MW) m[y][x] = v; };
  for (let x = 0; x < MW; x++) { set(x, 0, 2); set(x, MH - 1, 2); }
  for (let y = 0; y < MH; y++) { set(0, y, 2); set(MW - 1, y, 2); }
  for (let y = 12; y <= 14; y++) for (let x = 3; x <= 6; x++) set(x, y, 3);   // pond
  for (let y = 1; y <= 10; y++) set(12, y, 1);                                 // spine to ruins
  for (let x = 4; x <= 22; x++) set(10, x >= 0 ? 10 : 10, 1);                  // (noop guard)
  for (let x = 4; x <= 22; x++) set(x, 10, 1);                                 // main street to east exit
  set(12, 1, 7);                                                               // ruins gate (interact)
  const house = (hx, hy) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) set(hx + dx, hy + dy, 4); set(hx + 1, hy + 1, 5); };
  house(15, 4); house(4, 5); house(18, 12);
  [[8, 6], [9, 12], [16, 8], [6, 3], [20, 6], [14, 13]].forEach(([x, y]) => set(x, y, 6));

  return {
    biome: "grass", w: MW, h: MH, tiles: m, py: 10,
    exits: [{ x: 22, y: 10, to: "winter", sx: 2, sy: 6, dir: "right" }],
    npcs: buildTownNpcs()
  };
}

function buildTownNpcs() {
  return [
    { id:"rival", x:12, y:6, emoji:"🥷", color:"#f56565", name:"Rennik",
      interact() {
        if (!WORLD.flags.rivalBeaten) {
          openDialog([
            "Rennik: So you're the new challenger?",
            "Rennik: Here, brains beat brawn. Attacks only land if you understand the concept behind them.",
            "Rennik: Enough talk — defend yourself!"
          ], startRivalBattle);
        } else {
          openDialog([
            "Rennik: Good work. You really get it.",
            "Rennik: Head EAST when you're ready — the land turns to snow, then forest, desert, and finally molten fire.",
            "Rennik: They say a red castle waits at the end of the lava. And something... familiar... inside."
          ]);
        }
      } },
    { id:"elder", x:16, y:5, emoji:"🧓", color:"#f6ad55", name:"Elder",
      interact() {
        openDialog([
          "Elder: Welcome to Basecase Village.",
          "Elder: The Scroll of Infinite Knowledge was stolen by a dark figure long ago.",
          { choose:"What do you say?", options: [
            { label:"I'll get it back.", reply:["Elder: Brave words. Raise your DP rank across the lands first — the road east only grows harsher."] },
            { label:"Why me?", reply:["Elder: Because you choose to learn the hard, honest way. That is a power the thief never had."] }
          ] }
        ]);
      } },
    { id:"kid", x:5, y:7, emoji:"🧒", color:"#4fd1c5", name:"Kid",
      interact() { openDialog(["Kid: I saw a ghost by the ruins! A shiny knight!", "Kid: But it floated AWAY from me. Ghosts that run away? Spooky!"]); } },
    { id:"farmer", x:18, y:13, emoji:"🧑‍🌾", color:"#48bb78", name:"Farmer",
      interact() { openDialog(["Farmer: Fight the challengers out east to earn XP.", "Farmer: No shame in turning back to grind if a biome's too tough."]); } },
    { id:"sign", x:12, y:9, emoji:"🪧", color:"#9fb0c8", name:"Sign", noAvatarBg:true,
      interact() { openDialog(["Sign:  ↑ Castle Ruins (danger)    → East: Winter, Forest, Desert, Lava"]); } },
    { id:"fountain", x:8, y:11, emoji:"⛲", color:"#4fd1c5", name:"Fountain", noAvatarBg:true,
      interact() { openDialog(["You drink from the fountain. Refreshing.", "(Your resolve is restored.)"]); } },
    monsterNpc("town_m1", 3, 3, SMALL.grass),
    monsterNpc("town_m2", 20, 14, SMALL.grass),
    monsterNpc("town_m3", 6, 15, SMALL.grass),
    friendNpc("cook", 8, 8)
  ];
}

// ---- flavor + challenger NPC helpers ----
function challengerNpc(id, x, y, emoji, name, enemy, introLines) {
  return {
    id, x, y, emoji, color:"#f56565", name,
    interact() {
      if (WORLD.flags[id]) { openDialog([`${name}: You bested me fair and square. Press on!`]); return; }
      openDialog(introLines, () => {
        WORLD.mode = "battle";
        startEncounter(WORLD.player.char, enemy, {
          onWin() { WORLD.flags[id] = true; persist(); openDialog([`You won the duel against ${name}!`]); },
          onLose() { openDialog([`${name}: Not strong enough yet. Rest and challenge me again (press E).`]); }
        });
      });
    }
  };
}
function talkNpc(id, x, y, emoji, color, name, stepsFn) {
  return { id, x, y, emoji, color, name, interact() { openDialog(typeof stepsFn === "function" ? stepsFn() : stepsFn); } };
}

// ---- friends / party recruiting ----
function getPartyPerks() {
  const p = { hp:0, atk:0, xp:0, recoilShield:0, hint:false, members:[] };
  for (const id of (SAVE.party || [])) {
    const f = FRIENDS[id]; if (!f) continue;
    p.members.push(f);
    const k = f.perk || {};
    p.hp += k.hp || 0; p.atk += k.atk || 0; p.xp += k.xp || 0;
    p.recoilShield = Math.min(0.8, p.recoilShield + (k.recoilShield || 0));
    if (k.hint) p.hint = true;
  }
  p.atk = Math.min(0.6, p.atk); p.xp = Math.min(1.0, p.xp);
  return p;
}
function updatePartyBar() {
  const bar = el("partybar"); if (!bar) return;
  if (!SAVE.party || !SAVE.party.length) { bar.textContent = "Party: (empty — befriend NPCs to gain perks!)"; return; }
  bar.innerHTML = "Party: " + SAVE.party.map(id => {
    const f = FRIENDS[id]; return `<span class="party-emo" title="${f.name} — ${f.perk.desc}">${f.emoji}</span>`;
  }).join(" ") + `  <span class="party-count">(${SAVE.party.length}/4)</span>`;
}
function addToParty(f) {
  if (!SAVE.recruited.includes(f.id)) SAVE.recruited.push(f.id);
  if (!SAVE.party.includes(f.id) && SAVE.party.length < 4) SAVE.party.push(f.id);
  persist(); updatePartyBar();
}
function removeFromParty(id) { SAVE.party = SAVE.party.filter(x => x !== id); persist(); updatePartyBar(); }
function markLost(f) { if (!SAVE.lost.includes(f.id)) SAVE.lost.push(f.id); persist(); }

function acceptFriend(f) {
  if (SAVE.party.length < 4) {
    addToParty(f);
    openDialog([`${f.name} joined your party!`, `Perk active: ${f.perk.desc}`]);
  } else {
    const opts = SAVE.party.map(id => ({
      label: `Bench ${FRIENDS[id].name} (${FRIENDS[id].perk.desc})`,
      then: () => { const old = FRIENDS[id]; removeFromParty(id); addToParty(f); openDialog([`${old.name} steps aside. ${f.name} joins!`, "(Benched friends can rejoin later — they are NOT lost.)"]); }
    }));
    opts.push({ label: "Cancel (keep current party)", then: () => openDialog([`${f.name}: I'll wait here if you change your mind.`]) });
    openDialog([{ choose: `Your party is full (4). Swap someone out for ${f.name}?`, options: opts }]);
  }
}
function declineFriend(f) {
  markLost(f);
  openDialog([`${f.name}: I see... good luck out there.`, "(You declined. They will NOT join you now — this choice is permanent.)"]);
}
function resolveRecruit(f, score) {
  if (score >= f.threshold) {
    openDialog([
      `${f.name}: You truly understand me. I'd be honored to join you!`,
      { choose: `Invite ${f.name}? Perk: ${f.perk.desc}  (Party ${SAVE.party.length}/4)`, options: [
        { label: `Yes — welcome, ${f.name}!`, then: () => acceptFriend(f) },
        { label: "No thanks. (permanent)",   then: () => declineFriend(f) }
      ] }
    ]);
  } else {
    markLost(f);
    openDialog([`${f.name}: ...Honestly, I don't think we click.`, "(You failed to earn their trust. They will not join you — permanently.)"]);
  }
}
function friendNpc(id, x, y) {
  const f = FRIENDS[id];
  return {
    id: "friend_" + id, x, y, emoji: f.emoji, color: f.color, name: f.name,
    interact() {
      if (SAVE.lost.includes(f.id)) { openDialog([`${f.name}: You turned me away before. That door is closed now.`]); return; }
      if (SAVE.party.includes(f.id)) { openDialog([`${f.name}: Glad to fight beside you! (Perk: ${f.perk.desc})`]); return; }
      if (SAVE.recruited.includes(f.id)) {  // benched
        openDialog([`${f.name}: Ready to rejoin whenever you need me.`,
          { choose: `Add ${f.name} back to the party? (${SAVE.party.length}/4)`, options: [
            { label: "Yes",   then: () => acceptFriend(f) },
            { label: "Later", then: () => {} }
          ] }]);
        return;
      }
      const tag = f.rarity === "rare" ? "  ✨RARE✨" : "";
      openDialog([`You meet ${f.name}.${tag}`].concat(f.convo), (score) => resolveRecruit(f, score));
    }
  };
}

// ---- small, repeatable wandering monsters (grinding fodder) ----
const SMALL = {
  grass:  { name:"Loopling",    emoji:"\uD83D\uDC1B", maxHp:35,  power:5,  xp:30 },
  winter: { name:"Snowbit",     emoji:"\u2744\uFE0F", maxHp:50,  power:7,  xp:45 },
  forest: { name:"Bracket Bat", emoji:"\uD83E\uDD87", maxHp:65,  power:9,  xp:60 },
  desert: { name:"Sand Slime",  emoji:"\uD83D\uDFE1", maxHp:85,  power:11, xp:80 },
  lava:   { name:"Ember Imp",   emoji:"\uD83D\uDD25", maxHp:110, power:14, xp:110 }
};
function monsterNpc(id, x, y, enemy) {
  return {
    id, x, y, emoji: enemy.emoji, color: "#f6ad55", name: enemy.name,
    monster: true, wander: true, homeX: x, homeY: y, range: 2,
    rate: 40 + Math.floor(Math.random() * 50), t: 0,
    interact() {
      openDialog([`A wild ${enemy.name} blocks your way!`], () => {
        WORLD.mode = "battle";
        startEncounter(WORLD.player.char, enemy, {
          onWin()  { openDialog([`You defeated the ${enemy.name}! (It respawns for more practice.)`]); },
          onLose() { openDialog([`The ${enemy.name} bested you. Heal up and try again (press E).`]); }
        });
      });
    }
  };
}
function updateMonsters() {
  const m = WORLD.map;
  const pcx = Math.floor((WORLD.player.x + PS / 2) / TS), pcy = Math.floor((WORLD.player.y + PS / 2) / TS);
  for (const n of WORLD.npcs) {
    if (!n.wander) continue;
    if (++n.t < n.rate) continue;
    n.t = 0; n.rate = 40 + Math.floor(Math.random() * 50);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
    const nx = n.x + dx, ny = n.y + dy;
    if (Math.abs(nx - n.homeX) > n.range || Math.abs(ny - n.homeY) > n.range) continue;
    if (nx <= 0 || ny <= 0 || nx >= m.w - 1 || ny >= m.h - 1) continue;
    if (SOLID.has(m.tiles[ny][nx])) continue;
    if (nx === pcx && ny === pcy) continue;
    if (WORLD.npcs.some(o => o !== n && o.x === nx && o.y === ny)) continue;
    if ((m.exits || []).some(e => e.x === nx && e.y === ny)) continue;
    n.x = nx; n.y = ny;
  }
}

// ---- biome maps ----
function buildWinter() {
  const map = corridor("winter", 22, 13, 6, {
    blocks: [[5,3],[6,3],[15,9],[16,9],[9,10],[18,4]],
    decor:  [[4,8],[10,4],[17,8],[7,9]],
    liquid: [[3,10],[3,9]]
  });
  map.exits = [
    { x:1,  y:6, to:"town",   sx:21, sy:10, dir:"left" },
    { x:20, y:6, to:"forest", sx:2,  sy:6,  dir:"right" }
  ];
  // NOTE: backward spawns land a couple tiles INSIDE (not on the destination's
  // own exit tile) so returning players don't instantly bounce back.
  map.npcs = [
    talkNpc("winter_traveler", 7, 7, "🧝", "#bfe6f5", "Traveler", () => ([
      "Traveler: Brrr! The cold bites harder the further east you go.",
      { choose:"Reply?", options:[
        { label:"Any advice?", reply:["Traveler: Nail your BASE CASES here. Skip them and your recursion freezes solid — like me almost did."] },
        { label:"I'll manage.", reply:["Traveler: Confidence! Just don't overflow the stack out there."] }
      ] }
    ])),
    challengerNpc("winter_ch", 13, 5, "🧊", "Frost Duelist", CHALLENGERS.winter, [
      "Frost Duelist: None pass the snowfields without a duel.",
      "Frost Duelist: Freeze... or be frozen!"
    ]),
    monsterNpc("winter_m1", 5, 8, SMALL.winter),
    monsterNpc("winter_m2", 17, 7, SMALL.winter),
    monsterNpc("winter_m3", 10, 4, SMALL.winter),
    friendNpc("bard", 6, 4)
  ];
  return map;
}

function buildForest() {
  const map = corridor("forest", 22, 13, 6, {
    blocks: [[4,4],[5,4],[6,4],[14,8],[15,8],[16,8],[9,9],[10,3],[17,9]],
    decor:  [[7,8],[12,4],[18,7],[3,7]],
  });
  map.exits = [
    { x:1,  y:6, to:"winter", sx:18, sy:6, dir:"left" },
    { x:20, y:6, to:"desert", sx:2,  sy:6, dir:"right" }
  ];
  map.npcs = [
    talkNpc("forest_hermit", 7, 7, "🧙‍♂️", "#c2e26b", "Hermit", () => ([
      "Hermit: The deep wood is a maze of subproblems.",
      "Hermit: Remember: identify what INPUT defines each subproblem, and the path reveals itself."
    ])),
    challengerNpc("forest_ch", 14, 5, "🌀", "Wisp Warden", CHALLENGERS.forest, [
      "Wisp Warden: I split, and split, and split again...",
      "Wisp Warden: Can your recurrence keep up?"
    ]),
    monsterNpc("forest_m1", 5, 8, SMALL.forest),
    monsterNpc("forest_m2", 16, 7, SMALL.forest),
    monsterNpc("forest_m3", 10, 4, SMALL.forest),
    friendNpc("strategist", 12, 8)
  ];
  return map;
}

function buildDesert() {
  const map = corridor("desert", 22, 13, 6, {
    blocks: [[5,4],[15,9],[9,3],[12,9],[17,4]],
    decor:  [[6,8],[11,4],[16,8]],
    liquid: [[3,8],[4,8],[3,9],[4,9]]   // oasis
  });
  map.exits = [
    { x:1,  y:6, to:"forest", sx:18, sy:6, dir:"left" },
    { x:20, y:6, to:"lava",   sx:2,  sy:6, dir:"right" }
  ];
  map.npcs = [
    talkNpc("desert_nomad", 6, 5, "🧕", "#e6cd94", "Nomad", () => ([
      "Nomad: Water is precious. So is not being greedy.",
      { choose:"Reply?", options:[
        { label:"Greedy is fast, though.", reply:["Nomad: Fast and WRONG. The dunes are littered with those who grabbed the nearest oasis and missed the river beyond."] },
        { label:"Understood.", reply:["Nomad: Then you may just survive the fire ahead."] }
      ] }
    ])),
    challengerNpc("desert_ch", 12, 5, "🗿", "Golem Sentinel", CHALLENGERS.desert, [
      "Golem Sentinel: The mirage promises an easy answer.",
      "Golem Sentinel: Prove you can see the true optimum!"
    ]),
    monsterNpc("desert_m1", 7, 8, SMALL.desert),
    monsterNpc("desert_m2", 16, 7, SMALL.desert),
    friendNpc("optimist", 10, 4)
  ];
  return map;
}

function buildLava() {
  const map = corridor("lava", 22, 13, 6, {
    blocks: [[5,3],[6,9],[14,3],[15,9],[10,9]],
    decor:  [[8,4],[16,8]],
    liquid: [[3,8],[3,9],[4,9],[18,3],[18,4],[19,3]]
  });
  map.exits = [
    { x:1,  y:6, to:"desert",    sx:18, sy:6, dir:"left" },
    { x:20, y:6, to:"redcastle", sx:2,  sy:9, dir:"right" }
  ];
  map.npcs = [
    talkNpc("lava_ghost", 7, 7, "👻", "#ff8a3f", "Lost Soul", () => ([
      "Lost Soul: Beyond the lava... a castle of red stone.",
      "Lost Soul: The thief dwells within. It wears a face I dare not describe.",
      "Lost Soul: Turn back and grow stronger if your rank is low. It shows no mercy."
    ])),
    challengerNpc("lava_ch", 14, 5, "🌋", "Magma Brute", CHALLENGERS.lava, [
      "Magma Brute: The last gate before the castle is ME.",
      "Magma Brute: Overflow... or be overflowed!"
    ]),
    monsterNpc("lava_m1", 7, 8, SMALL.lava),
    monsterNpc("lava_m2", 16, 7, SMALL.lava),
    friendNpc("guardian", 10, 4)
  ];
  return map;
}

// ---- the red dark castle (final area) ----
function buildRedCastle() {
  const w = 22, h = 16;
  const m = emptyGrid(w, h);
  for (let x = 0; x < w; x++) { m[0][x] = 4; m[h - 1][x] = 4; }
  for (let y = 0; y < h; y++) { m[0 + y] && (m[y][0] = 4, m[y][w - 1] = 4); }
  // entrance corridor from left at y=9
  for (let x = 1; x <= 11; x++) m[9][x] = 1;
  for (let y = 4; y <= 9; y++) m[y][11] = 1;   // up to the throne dais
  // throne dais row
  for (let x = 8; x <= 14; x++) m[4][x] = 1;
  // pillars
  [[4,6],[7,6],[15,6],[18,6],[4,12],[7,12],[15,12],[18,12],[9,7],[13,7]].forEach(([x,y]) => { if (m[y]) m[y][x] = 2; });
  // lava braziers
  [[2,2],[19,2],[2,13],[19,13]].forEach(([x,y]) => { if (m[y]) m[y][x] = 3; });

  return {
    biome: "dark", w, h, tiles: m, py: 9,
    exits: [{ x: 1, y: 9, to: "lava", sx: 18, sy: 6, dir: "left" }],
    npcs: [
      { id:"captive", x:5, y:9, emoji:"🧑‍🎓", color:"#4fd1c5", name:"Captive Scholar",
        interact() { openDialog(["Captive Scholar: You came! The thief hoards the Scroll on the dais above.","Captive Scholar: It has power... but no understanding. Remember that."]); } },
      { id:"boss", x:11, y:3, emoji:"🌑", color:"#ff3355", name:"Your Shadow",
        interact() {
          if (WORLD.flags.bossBeaten) { openDialog(["The dais is empty now. Only quiet, and the recovered Scroll.","🏆 You have completed Recursion Realm."]); return; }
          openDialog([
            "A figure in red-black robes turns. Its face is yours — older, colder.",
            "Shadow: You made it. I almost hoped you wouldn't.",
            { choose:"How do you respond?", options:[
              { label:"Who are you?", reply:["Shadow: I'm you — the version who stopped doing the work.","Shadow: I took the Scroll of Infinite Knowledge. Why struggle when you can just HAVE the answers?"] },
              { label:"Return the Scroll!", reply:["Shadow: Mine now. You still think effort matters. How quaint."] }
            ] },
            "Shadow: Let me show you the power you threw away!",
            { choose:"Your reply?", options:[
              { label:"You never understood it.", reply:["Shadow: ...We'll see."] },
              { label:"Bring it.", reply:["Shadow: Confident. Let's fix that."] }
            ] }
          ], startBossBattle);
        } }
    ]
  };
}

// ---- the beginning town's Castle Ruins (must be visited before heading east) ----
function buildRuins() {
  const w = 16, h = 14;
  const m = emptyGrid(w, h);
  for (let x = 0; x < w; x++) { m[0][x] = 4; m[h - 1][x] = 4; }
  for (let y = 0; y < h; y++) { m[y][0] = 4; m[y][w - 1] = 4; }
  // entrance corridor running up the centre from the bottom door
  for (let y = 1; y <= h - 2; y++) m[y][8] = 1;
  for (let x = 3; x <= 12; x++) m[6][x] = 1;   // cross-hall
  // crumbled pillars / rubble
  [[4,3],[11,3],[4,9],[11,9],[6,4],[10,4],[6,8],[10,8]].forEach(([x,y]) => { if (m[y]) m[y][x] = 2; });
  // cold braziers
  [[2,2],[13,2],[2,11],[13,11]].forEach(([x,y]) => { if (m[y]) m[y][x] = 3; });
  m[13][8] = 5;   // decorative door in the bottom wall (exit tile below is walkable path)

  return {
    biome: "dark", w, h, tiles: m, py: 6,
    exits: [{ x: 8, y: 12, to: "town", sx: 12, sy: 2, dir: "down" }],
    npcs: [
      { id:"ruins_ghost", x:8, y:3, emoji:"\uD83D\uDC7B", color:"#9fb0c8", name:"Ruins Ghost",
        interact() { openDialog([
          "Ruins Ghost: You entered the ruins. Good. The road east tests only those who first face what lies here.",
          "Ruins Ghost: The thief who took the Scroll once walked these very halls. Learn from the ruin he left behind.",
          "Ruins Ghost: Now go — the eastern path will open to you."
        ]); } }
    ]
  };
}

const MAPS = {
  town: buildTownMap, winter: buildWinter, forest: buildForest,
  desert: buildDesert, lava: buildLava, redcastle: buildRedCastle, ruins: buildRuins
};

// ============================================================
// STORY + TUTORIAL (DOM cards in #app)
// ============================================================
const PROLOGUE = [
  { t:"Prologue", b:"In the realm of algorithms, power is not brute force — it is <em>understanding</em>." },
  { t:"Prologue", b:"Those who master <strong>recursion</strong> and <strong>dynamic programming</strong> can bend any problem to their will." },
  { t:"Prologue", b:"A dark figure stole the <strong>Scroll of Infinite Knowledge</strong> and vanished east — past snow, forest, desert, and fire, to a <strong>castle of red stone</strong>." },
  { t:"Prologue", b:"You arrive at <strong>Basecase Village</strong> to begin the long road that leads there." }
];
const TUTORIAL = [
  { t:"How to play · Move", b:"Use <strong>WASD</strong> or the <strong>Arrow keys</strong> to walk." },
  { t:"How to play · Interact", b:"Face an NPC or object and press <strong>E</strong> / <strong>Space</strong> to talk. Some NPCs let you <strong>choose a reply</strong> (click it or press 1/2/3)." },
  { t:"How to play · Battle", b:"Powered attacks require answering a CS question. Correct = big damage. Wrong = it <em>backfires</em> on you!" },
  { t:"The goal", b:"Travel east through the biomes, beat challengers to raise your <strong>rank</strong>, and confront the thief in the red castle." }
];

function cardSequence(kind, list, onDone) {
  uiShowApp();
  let i = 0;
  const show = () => {
    if (i >= list.length) return onDone();
    const p = list[i++];
    el("app").innerHTML = `
      <div class="card center">
        <span class="stage-label">${kind}</span>
        <h2>${p.t}</h2>
        <p class="prompt" style="font-size:1.05rem;line-height:1.6">${p.b}</p>
        <button class="primary" id="seq-next">${i >= list.length ? "Continue ▸" : "Next ▸"}</button>
      </div>`;
    el("seq-next").onclick = show;
  };
  show();
}

function startStory() {
  uiShowApp();
  if (window.Music) Music.play("town");
  const answered = SAVE.stats.correct + SAVE.stats.wrong;
  if (SAVE.xp > 0 || answered > 0) {
    el("app").innerHTML = `
      <div class="card center">
        <h2>Recursion Realm</h2>
        <div class="save-panel"><div>Rank <strong>${rankFor(SAVE.xp).name}</strong> · ${SAVE.xp} XP</div></div>
        <div class="title-actions">
          <button class="primary" id="skip">Enter the world ▸</button>
          <button class="ghost" id="replay">Replay intro</button>
        </div>
      </div>`;
    el("skip").onclick = fighterSelect;
    el("replay").onclick = () => cardSequence("Story", PROLOGUE, fighterSelect);
  } else {
    cardSequence("Story", PROLOGUE, fighterSelect);
  }
}

function fighterSelect() {
  uiShowApp();
  el("app").innerHTML = `<div class="card">
      <span class="stage-label">Choose your hero</span>
      <h2>Pick your battle type</h2>
      <div class="char-grid" id="chars"></div>
    </div>`;
  const grid = el("chars");
  CHARACTERS.forEach((c) => {
    const b = document.createElement("button");
    b.className = "char-card"; b.style.borderColor = c.color;
    b.innerHTML = `<div class="char-emoji">${c.emoji}</div>
      <div class="char-name" style="color:${c.color}">${c.name}</div>
      <div class="char-type">${c.type} type · ❤️ ${c.maxHp}</div>
      <div class="char-blurb">${c.blurb}</div>`;
    b.onclick = () => { WORLD.player.char = c; SAVE.lastCharId = c.id; persist(); cardSequence("Tutorial", TUTORIAL, enterWorld); };
    grid.appendChild(b);
  });
}

// ============================================================
// WORLD CONTROL
// ============================================================
let RAF = null;
function enterWorld() {
  changeMap("town", 12, 8, "up");
  uiShowWorld();
  el("dialogue").classList.add("hidden");
  // fade in from black
  const f = el("fade"); f.classList.add("on"); requestAnimationFrame(() => f.classList.remove("on"));
  updatePartyBar();
  if (!RAF) loop();
  if (!WORLD.flags.rivalBeaten) {
    openDialog([
      "A masked fighter blocks the path...",
      "Rennik: Halt! Nobody heads east without proving themselves.",
      "Rennik: Let's see if your recursion is real. Battle me!"
    ], startRivalBattle);
  }
}

function changeMap(id, sx, sy, dir) {
  if (!WORLD.built[id]) WORLD.built[id] = MAPS[id]();
  WORLD.mapId = id;
  WORLD.map = WORLD.built[id];
  WORLD.npcs = WORLD.map.npcs;
  WORLD.player.x = sx * TS;
  WORLD.player.y = sy * TS;
  if (dir) WORLD.player.dir = dir;
  WORLD.mode = "roam";
  // snap camera to the new position immediately (avoids a 1-frame jump)
  clampCamera();
  if (window.Music) Music.play(currentBiomeTrack());
}

function startRivalBattle() {
  WORLD.mode = "battle";
  startEncounter(WORLD.player.char, RIVAL_ENEMY, {
    onWin() {
      WORLD.flags.rivalBeaten = true;
      persist();
      openDialog([
        "Rennik: Ha! You actually get it. Respect.",
        "Rennik: The road east is yours. Grow strong before the red castle."
      ]);
    },
    onLose() { openDialog(["Rennik: Not yet. Study the recurrence and find me again (press E)."]); }
  });
}

function startBossBattle() {
  WORLD.mode = "battle";
  startEncounter(WORLD.player.char, DARK_BOSS, {
    onWin() {
      WORLD.flags.bossBeaten = true;
      SAVE.stats.clears = (SAVE.stats.clears || 0) + 1; persist();  // flags live on SAVE, so this persists bossBeaten too
      openDialog([
        "The Shadow staggers. The Scroll's glow flickers and dies.",
        "Shadow: Impossible... I held the Scroll of Infinite Knowledge!",
        "You: You had the words. I understood them. That's the difference.",
        "Shadow: ...You never needed it at all.",
        "The shadow fades. You return the Scroll to the castle. The realm is safe.",
        "🏆 THE END — thank you for playing Recursion Realm!"
      ]);
    },
    onLose() {
      openDialog([
        "Shadow: Not strong enough. Retreat and grow — if you can.",
        "(You flee to the lava fields. Raise your rank and return.)"
      ], () => { sfx("transition"); fadeTransition(() => changeMap("lava", 19, 6, "left")); });
    }
  });
}

// ============================================================
// DIALOGUE (supports plain lines AND {choose, options:[{label,reply}]})
// ============================================================
function isChoice(s) { return s && typeof s === "object" && Array.isArray(s.options); }

function openDialog(steps, onEnd) {
  WORLD.mode = "dialog";
  WORLD.dialog = { steps: steps.slice(), i: 0, onEnd, score: 0, pendingThen: null };
  renderDialog();
}
function renderDialog() {
  const d = WORLD.dialog, s = d.steps[d.i], box = el("dialogue");
  box.classList.remove("hidden");
  if (isChoice(s)) {
    const opts = s.options.map((o, i) => `<button class="dlg-choice" data-i="${i}">${i + 1}. ${o.label}</button>`).join("");
    box.innerHTML = `<div class="dlg-text">${s.choose || ""}</div><div class="dlg-choices">${opts}</div>`;
    [...box.querySelectorAll(".dlg-choice")].forEach(b => b.onclick = () => chooseOption(+b.dataset.i));
  } else {
    const text = typeof s === "string" ? s : s.say;
    const last = d.i >= d.steps.length - 1;
    box.innerHTML = `<div class="dlg-text">${text}</div><div class="dlg-prompt">${last ? "▸ close" : "▸ next"} (E)</div>`;
  }
}
function chooseOption(idx) {
  sfx("select");
  const d = WORLD.dialog, s = d.steps[d.i], o = s.options[idx];
  d.score += (o.score || 0);                       // accumulate affinity
  if (o.then) d.pendingThen = o.then;              // deferred action (accept/decline/swap)
  const reply = o.reply;
  const lines = Array.isArray(reply) ? reply : (reply ? [reply] : []);
  d.steps.splice(d.i, 1, ...lines);               // replace the choice with its reply lines
  if (d.i >= d.steps.length) endDialog(d); else renderDialog();
}
function advanceDialog() {
  const d = WORLD.dialog; if (!d) return;
  if (isChoice(d.steps[d.i])) return;             // must pick a choice
  sfx("blip");
  d.i++;
  if (d.i >= d.steps.length) endDialog(d); else renderDialog();
}
function endDialog(d) {
  el("dialogue").classList.add("hidden");
  WORLD.dialog = null; WORLD.mode = "roam";
  const then = d.pendingThen, oe = d.onEnd, sc = d.score || 0;
  if (then) then(sc);
  if (oe) oe(sc);
}

// ============================================================
// INPUT
// ============================================================
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  WORLD.keys[k] = true;

  if (WORLD.mode === "dialog") {
    const s = WORLD.dialog && WORLD.dialog.steps[WORLD.dialog.i];
    if (isChoice(s) && ["1","2","3","4"].includes(k)) {
      const idx = +k - 1; if (idx < s.options.length) chooseOption(idx);
      return;
    }
    if (k === "e" || k === " " || k === "enter") advanceDialog();
    return;
  }
  if (WORLD.mode === "roam" && (k === "e" || k === " ")) interact();
});
document.addEventListener("keyup", (e) => { WORLD.keys[e.key.toLowerCase()] = false; });

function interact() {
  const p = WORLD.player, m = WORLD.map;
  const cx = Math.floor((p.x + PS / 2) / TS), cy = Math.floor((p.y + PS / 2) / TS);
  let fx = cx, fy = cy;
  if (p.dir === "up") fy--; else if (p.dir === "down") fy++;
  else if (p.dir === "left") fx--; else if (p.dir === "right") fx++;

  const npc = WORLD.npcs.find(n => n.x === fx && n.y === fy);
  if (npc) { npc.interact(); return; }

  const t = m.tiles[fy] && m.tiles[fy][fx];
  if (t === 7) {
    openDialog([
      "The old Castle Ruins gate creaks open. Cold air pours out.",
      "Ghostly clanking echoes within. You steel yourself and step inside..."
    ], () => {
      WORLD.flags.ruinsVisited = true; persist();
      sfx("transition");
      fadeTransition(() => changeMap("ruins", 8, 9, "up"));
    });
  } else if (t === 5) {
    openDialog(["The door is locked. Nobody's home."]);
  }
}

// ============================================================
// MOVEMENT + COLLISION + TRANSITIONS
// ============================================================
function isSolidAt(px, py) {
  const m = WORLD.map;
  const pts = [[px, py], [px + PS - 1, py], [px, py + PS - 1], [px + PS - 1, py + PS - 1]];
  for (const [x, y] of pts) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    if (SOLID.has(m.tiles[ty][tx])) return true;
  }
  const cx = Math.floor((px + PS / 2) / TS), cy = Math.floor((py + PS / 2) / TS);
  if (WORLD.npcs.some(n => n.x === cx && n.y === cy)) return true;
  return false;
}

function update() {
  if (WORLD.mode !== "roam") return;
  const p = WORLD.player, k = WORLD.keys, m = WORLD.map, spd = 2.4;
  let dx = 0, dy = 0;
  if (k["arrowup"] || k["w"]) { dy = -spd; p.dir = "up"; }
  else if (k["arrowdown"] || k["s"]) { dy = spd; p.dir = "down"; }
  else if (k["arrowleft"] || k["a"]) { dx = -spd; p.dir = "left"; }
  else if (k["arrowright"] || k["d"]) { dx = spd; p.dir = "right"; }
  if (dx && !isSolidAt(p.x + dx, p.y)) p.x += dx;
  if (dy && !isSolidAt(p.x, p.y + dy)) p.y += dy;

  // map transitions (step onto an exit tile)
  updateMonsters();

  const cx = Math.floor((p.x + PS / 2) / TS), cy = Math.floor((p.y + PS / 2) / TS);
  const ex = (m.exits || []).find(e => e.x === cx && e.y === cy);
  if (ex) {
    // Gate: must visit the Castle Ruins (↑) before the road east opens.
    if (WORLD.mapId === "town" && ex.to === "winter" && !WORLD.flags.ruinsVisited) {
      p.x = (ex.x - 1) * TS;   // nudge back off the exit tile so we don't re-trigger
      openDialog([
        "You feel unready to leave the village.",
        "You must first explore the Castle Ruins to the NORTH (↑) before the road east will let you pass."
      ]);
      return;
    }
    sfx("transition");
    fadeTransition(() => changeMap(ex.to, ex.sx, ex.sy, ex.dir));
    return;
  }

  clampCamera();
}

// centre the camera on the player, respecting zoom and map bounds
function clampCamera() {
  const cv = el("game"), m = WORLD.map, p = WORLD.player;
  const vw = cv.width / ZOOM, vh = cv.height / ZOOM;
  WORLD.cam.x = Math.max(0, Math.min(p.x + PS / 2 - vw / 2, m.w * TS - vw));
  WORLD.cam.y = Math.max(0, Math.min(p.y + PS / 2 - vh / 2, m.h * TS - vh));
}

// ============================================================
// RENDER (chunky pixel style, biome-aware)
// ============================================================
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function drawObstacle(ctx, sx, sy, pal) {
  if (pal.kind === "tree" || pal.kind === "snowtree") {
    px(ctx, sx + 13, sy + 18, 6, 12, "#5a3a1e");
    px(ctx, sx + 5, sy + 4, 22, 18, pal.ob);
    px(ctx, sx + 9, sy + 2, 14, 12, pal.obTop);
    if (pal.kind === "snowtree") { px(ctx, sx + 9, sy + 2, 14, 4, "#ffffff"); px(ctx, sx + 6, sy + 8, 6, 3, "#eef6ff"); }
  } else if (pal.kind === "cactus") {
    px(ctx, sx + 13, sy + 8, 6, 22, pal.obTop);
    px(ctx, sx + 7, sy + 14, 6, 4, pal.obTop); px(ctx, sx + 7, sy + 14, 4, 10, pal.obTop);
    px(ctx, sx + 19, sy + 12, 6, 4, pal.obTop); px(ctx, sx + 21, sy + 12, 4, 10, pal.obTop);
  } else if (pal.kind === "pillar") {
    px(ctx, sx + 8, sy + 2, 16, 28, pal.ob);
    px(ctx, sx + 8, sy + 2, 16, 5, pal.obTop);
    px(ctx, sx + 8, sy + 26, 16, 4, pal.obTop);
  } else { // rock
    px(ctx, sx + 6, sy + 12, 20, 16, pal.ob);
    px(ctx, sx + 9, sy + 8, 14, 10, pal.obTop);
  }
}

function draw() {
  const cv = el("game"), ctx = cv.getContext("2d");
  const cw = cv.width, ch = cv.height, cam = WORLD.cam, m = WORLD.map, pal = BIOMES[m.biome];
  const vw = cw / ZOOM, vh = ch / ZOOM;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);   // zoom in / narrower FOV

  const x0 = Math.floor(cam.x / TS), y0 = Math.floor(cam.y / TS);
  const x1 = Math.ceil((cam.x + vw) / TS), y1 = Math.ceil((cam.y + vh) / TS);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
      const t = m.tiles[ty][tx], sx = tx * TS - cam.x, sy = ty * TS - cam.y;
      px(ctx, sx, sy, TS, TS, t === 3 ? pal.liquid : pal.ground);
      if (t === 1) px(ctx, sx, sy, TS, TS, pal.path);
      if (t === 6) { px(ctx, sx + 12, sy + 12, 8, 8, pal.decor); px(ctx, sx + 14, sy + 14, 4, 4, "#ffffff"); }
      if (t === 2) drawObstacle(ctx, sx, sy, pal);
      if (t === 3) { px(ctx, sx + 5, sy + 8, 10, 3, pal.liqHi); px(ctx, sx + 18, sy + 20, 8, 3, pal.liqHi); }
      if (t === 4) { px(ctx, sx, sy, TS, TS, pal.wall); px(ctx, sx, sy, TS, 6, pal.wallTop); }
      if (t === 5) { px(ctx, sx, sy, TS, TS, pal.wall); px(ctx, sx + 8, sy + 6, 16, 26, "#4a3527"); }
      if (t === 7) { px(ctx, sx, sy, TS, TS, "#5a5560"); px(ctx, sx + 6, sy + 4, 20, 28, "#2b2833"); px(ctx, sx + 12, sy + 10, 8, 22, "#14121a"); }
    }
  }

  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const n of WORLD.npcs) {
    const cx = n.x * TS - cam.x + TS / 2, cy = n.y * TS - cam.y + TS / 2;
    if (n.monster || n.item) {
      // creatures & objects stay as emoji on a high-contrast token
      drawToken(ctx, cx, cy, 13, n.color || "#e6ecf5");
      ctx.font = "24px serif"; ctx.fillText(n.emoji, cx, cy + 1);
    } else {
      // people are drawn as little pixel humans
      drawPerson(ctx, cx, cy, personPalette(n), n.dir || "down", n.accessory);
    }
  }

  const p = WORLD.player, cx = p.x - cam.x + PS / 2, cy = p.y - cam.y + PS / 2;
  drawPerson(ctx, cx, cy, playerPalette(p), p.dir || "down");

  ctx.setTransform(1, 0, 0, 1, 0, 0);   // restore for any non-zoomed drawing
}

// A high-contrast "token" disc behind a sprite so it pops off the terrain.
function drawToken(ctx, cx, cy, r, ring) {
  ctx.beginPath(); ctx.ellipse(cx, cy + r - 1, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14,18,26,0.82)"; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = ring; ctx.stroke();
}

// ---- pixel person sprites ----
const SKINS = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524"];
const HAIRS = ["#2a1a0f", "#4a2f1a", "#111111", "#6b4423", "#8a5a2b", "#d9c27a", "#b23a3a"];
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function personPalette(n) {
  if (n.id === "boss" || /Shadow/.test(n.name || "")) return { shirt:"#3a2140", skin:"#6b6470", hair:"#14121a", pants:"#241528" };
  const h = hashStr(n.id || n.name || "x");
  return { shirt: n.color || "#4fd1c5", skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 3) % HAIRS.length], pants: "#2a2f3a" };
}
function playerPalette(p) {
  const c = p.char || {}; const h = hashStr(c.id || "hero");
  return { shirt: c.color || "#4fd1c5", skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 3) % HAIRS.length], pants: "#2a2f3a" };
}
function drawPerson(ctx, cxf, cyf, o, dir) {
  const x = Math.round(cxf), y = Math.round(cyf);
  const skin = o.skin, shirt = o.shirt, hair = o.hair, pants = o.pants;
  const R = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
  // shadow
  ctx.beginPath(); ctx.ellipse(x, y + 13, 9, 3.2, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fill();
  // legs + shoes
  R(-5, 7, 3, 6, pants); R(2, 7, 3, 6, pants);
  R(-5, 12, 3, 2, "#20242c"); R(2, 12, 3, 2, "#20242c");
  // torso + arms
  R(-6, -2, 12, 10, shirt);
  R(-8, -1, 2, 8, skin); R(6, -1, 2, 8, skin);
  // head
  R(-5, -12, 10, 10, skin);
  // hair (more coverage when facing away)
  if (dir === "up") { R(-5, -12, 10, 8, hair); }
  else { R(-5, -12, 10, 4, hair); R(-5, -12, 2, 7, hair); R(3, -12, 2, 7, hair); }
  // eyes (not when facing away)
  if (dir !== "up") {
    ctx.fillStyle = "#20242c";
    if (dir === "left") { ctx.fillRect(x - 3, y - 7, 2, 2); }
    else if (dir === "right") { ctx.fillRect(x + 1, y - 7, 2, 2); }
    else { ctx.fillRect(x - 3, y - 7, 2, 2); ctx.fillRect(x + 1, y - 7, 2, 2); }
  }
}

function loop() { update(); draw(); RAF = requestAnimationFrame(loop); }

// boot
startStory();
