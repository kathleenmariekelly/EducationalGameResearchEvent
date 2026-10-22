import { ALGOS } from "./pathfinding.js";

// startGame(mountEl, level, customize, callbacks) -> returns { stop }
export function startGame(canvas, hudEl, level, customize, cb = {}) {
  const W = level.w, H = level.h;
  const TILE = Math.min(38, Math.floor(720 / W));
  const ctx = canvas.getContext("2d");
  canvas.width = W * TILE;
  canvas.height = H * TILE;

  // offscreen terrain layer — only redrawn when the map changes (perf)
  const terrainLayer = document.createElement("canvas");
  terrainLayer.width = canvas.width;
  terrainLayer.height = canvas.height;
  const tctx = terrainLayer.getContext("2d");
  let terrainDirty = true;

  // ---- build grid from terrain ----
  const grid = {
    w: W, h: H,
    cells: Array.from({ length: W * H }, () => ({ walkable: true, cost: 1 })),
  };
  const cell = (x, y) => grid.cells[y * W + x];
  function loadTerrain() {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = level.terrain[y][x];
        const c = cell(x, y);
        c.walkable = ch !== "#";
        c.cost = 1;                          // fields no longer reroute; only soldiers do
        c.swamp = ch === "~";               // pre-placed mud = on-path slow field
        c.fixed = ch === "#" || ch === "~"; // terrain can't be edited/refunded
        c.gas = false; c.frost = false;
      }
    }
    terrainDirty = true;
  }
  loadTerrain();

  const start = { x: 0, y: (H / 2) | 0 };
  const goal  = { x: W - 1, y: (H / 2) | 0 };

  // ---- state ----
  let algoKey = level.algo;
  let paintMode = "wall";
  let enemies = [];
  let result = { path: null, visitedOrder: [] };
  let searchAnim = 0;        // revealed frontier count (auto-animated)
  let lives = level.lives, wave = 0, killed = 0, escaped = 0;
  let resources = { walls: level.startWalls ?? 3, swamp: level.startSwamp ?? 0, gas: 0, frost: 0 };
  let unlocked = { swamp: (level.startSwamp ?? 0) > 0, gas: false, frost: false }; // advanced defense gates
  let clock = 0; // for cute bobbing animation
  let spawning = false, spawnTimer = 0, toSpawn = 0;
  let running = true;
  let won = false, lost = false;
  let prepTimer = level.prepTime ?? 30;  // build time before the first wave
  const betweenWaves = 30;               // breather between waves

  function recompute() {
    result = ALGOS[algoKey].fn(grid, start, goal);
    searchAnim = 0; // restart the search visualization
  }

  // enemies react to map changes: re-path each one from where it is now,
  // WITHOUT snapping — keep the tile it's walking away from at the front so
  // it finishes its current step smoothly, then follows the new route.
  function repathEnemies() {
    for (const e of enemies) {
      const behind = e.path[e.i];                              // tile it left
      const ahead  = e.path[Math.min(e.i + 1, e.path.length - 1)]; // tile it's entering
      if (behind === ahead) continue;                         // already at goal
      const r = ALGOS[algoKey].fn(grid, ahead, goal);         // r.path[0] === ahead
      if (r.path && r.path.length >= 1) {
        e.path = [behind, ...r.path];                         // [behind, ahead, ...]
        e.i = 0;                                              // keep e.t: smooth
      }
    }
  }

  // ---- combat tuning ----
  const SOLDIER_RANGE = 2.4;   // tiles a soldier can hit
  const FIRE_INTERVAL = 0.7;   // seconds between shots
  const DAMAGE = 1;            // damage per shot
  const GAS_DPS = 1.6;         // poison damage per second on a gas tile
  const FROST_MULT = 0.4;      // enemies move at 40% speed on frost
  const SWAMP_MULT = 0.5;      // enemies wade through mud at 50% speed
  let zaps = [];               // brief attack lines {fx,fy,tx,ty,life}

  // ---- enemy ----
  class Enemy {
    constructor(path, waveNum) {
      this.path = path; this.i = 0; this.t = 0;
      this.speed = 1.3;                       // slow, steady march
      this.phase = Math.random() * Math.PI * 2; // smooth per-enemy hop
      this.maxHp = 3 + waveNum;               // tougher each wave
      this.hp = this.maxHp;
    }
    pos() {
      const a = this.path[this.i];
      const b = this.path[Math.min(this.i + 1, this.path.length - 1)];
      return { x: a.x + (b.x - a.x) * this.t, y: a.y + (b.y - a.y) * this.t };
    }
    update(dt) {
      if (this.i >= this.path.length - 1) { this.dead = true; escaped++; lives--; return; }
      const here = this.path[this.i];
      const hc = cell(here.x, here.y);
      let slow = 1;                                     // on-path fields slow enemies
      if (hc.frost) slow *= FROST_MULT;                // ice
      if (hc.swamp) slow *= SWAMP_MULT;                // mud
      this.t += (this.speed * slow) * dt;
      while (this.t >= 1 && this.i < this.path.length - 1) { this.t -= 1; this.i++; }
    }
  }

  // ---- waves ----
  function startWave() {
    if (won || lost) return;
    recompute();
    if (!result.path) { flash("Path is blocked — clear a route first!"); return; }
    if (spawning) return;
    if (wave >= level.waves) return;
    wave++;
    toSpawn = 4 + wave * 3;
    spawnTimer = 0;
    spawning = true;
  }
  function maybeSpawn(dt) {
    if (!spawning) return;
    spawnTimer -= dt;
    if (spawnTimer <= 0 && toSpawn > 0) {
      const r = ALGOS[algoKey].fn(grid, start, goal); // react to current map
      if (r.path) enemies.push(new Enemy(r.path, wave));
      toSpawn--; spawnTimer = 0.55;
    }
    if (toSpawn === 0 && enemies.length === 0) {
      spawning = false;
      if (wave >= level.waves && lives > 0) { won = true; cb.onWin && cb.onWin({ lives }); }
    }
  }

  // ---- soldiers attack: player-placed defenders shoot nearby enemies ----
  function soldierAttacks(dt) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cell(x, y);
      if (c.walkable || c.fixed) continue;   // only your cute soldiers attack
      c.cooldown = (c.cooldown ?? 0) - dt;
      if (c.cooldown > 0) continue;
      let target = null, best = Infinity;
      for (const e of enemies) {
        if (e.dead) continue;
        const p = e.pos();
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= SOLDIER_RANGE && d < best) { best = d; target = e; }
      }
      if (target) {
        target.hp -= DAMAGE;
        c.cooldown = FIRE_INTERVAL;
        const tp = target.pos();
        zaps.push({ fx: x + 0.5, fy: y + 0.5, tx: tp.x + 0.5, ty: tp.y + 0.5, life: 0.14 });
        if (target.hp <= 0) { target.dead = true; killed++; }
      }
    }
  }

  // ---- gas fields poison any enemy standing on them ----
  function fieldEffects(dt) {
    for (const e of enemies) {
      if (e.dead) continue;
      const p = e.pos();
      const c = cell(Math.round(p.x), Math.round(p.y));
      if (c && c.gas) {
        e.hp -= GAS_DPS * dt;
        if (e.hp <= 0) { e.dead = true; killed++; }
      }
    }
  }

  // ---- flash message ----
  let flashMsg = "", flashT = 0;
  function flash(m) { flashMsg = m; flashT = 2; }

  // ---- input ----
  let painting = false;
  function paintAt(mx, my) {
    if (won || lost) return;
    const x = (mx / TILE) | 0, y = (my / TILE) | 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if ((x === start.x && y === start.y) || (x === goal.x && y === goal.y)) return;
    const c = cell(x, y);
    if (c.fixed) { flash("That's fixed terrain — build around it."); return; }
    if (paintMode === "wall") {
      if (!c.walkable) return; // already a wall
      if (resources.walls <= 0) { flash("Out of soldiers! Solve a question to recruit more."); return; }
      c.walkable = false; c.cooldown = 0; resources.walls--;
    }
    if (paintMode === "swamp") {
      if (!unlocked.swamp) { flash("🔒 Swamp locked — answer a MEDIUM or HARD question to unlock it!"); return; }
      if (!c.walkable || c.swamp || c.gas || c.frost) return; // tile busy
      if (resources.swamp <= 0) { flash("No swamp charges! Answer a Dijkstra/A* question."); return; }
      c.swamp = true; resources.swamp--;
    }
    if (paintMode === "gas") {
      if (!unlocked.gas) { flash("🔒 Gas locked — answer a HARD question to unlock it!"); return; }
      if (!c.walkable || c.gas || c.frost || c.swamp) return; // tile busy
      if (resources.gas <= 0) { flash("No gas charges! Answer a HARD question."); return; }
      c.gas = true; resources.gas--;
    }
    if (paintMode === "frost") {
      if (!unlocked.frost) { flash("🔒 Frost locked — answer a MEDIUM or HARD question to unlock it!"); return; }
      if (!c.walkable || c.frost || c.gas || c.swamp) return; // tile busy
      if (resources.frost <= 0) { flash("No frost charges! Answer a MEDIUM or HARD question."); return; }
      c.frost = true; resources.frost--;
    }
    if (paintMode === "erase") {
      if (!c.walkable) resources.walls++;       // refund player-placed soldier
      else if (c.swamp) resources.swamp++;      // refund swamp
      else if (c.gas) resources.gas++;          // refund gas
      else if (c.frost) resources.frost++;      // refund frost
      c.walkable = true; c.cost = 1; c.swamp = false; c.gas = false; c.frost = false;
    }
    terrainDirty = true;
    recompute();
    repathEnemies();
  }
  const onDown = (e) => { painting = true; const r = canvas.getBoundingClientRect(); paintAt(e.clientX - r.left, e.clientY - r.top); };
  const onUp = () => (painting = false);
  const onMove = (e) => { if (!painting) return; const r = canvas.getBoundingClientRect(); paintAt(e.clientX - r.left, e.clientY - r.top); };
  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("mousemove", onMove);

  // ---- render ----
  function redrawTerrain() {
    tctx.clearRect(0, 0, terrainLayer.width, terrainLayer.height);
    tctx.textAlign = "center"; tctx.textBaseline = "middle";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cell(x, y);
      let col = (x + y) % 2 ? "#1f3320" : "#233a24"; // grassy field
      if (!c.walkable) col = c.fixed ? "#4b4f5c" : "#2b3a4d";
      else if (c.swamp) col = "#3a2f18";    // muddy swamp
      else if (c.gas) col = "#2f3a1c";      // toxic ground
      else if (c.frost) col = "#26384a";    // icy ground
      tctx.fillStyle = col;
      tctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (!c.walkable && !c.fixed) {           // player-placed defender
        tctx.font = `${TILE * 0.62}px serif`;
        tctx.fillText(customize.soldier, cx, cy);
      } else if (!c.walkable && c.fixed) {     // natural obstacle: tree / mountain / bush
        const nature = ["🌲", "⛰️", "🌳"];
        tctx.font = `${TILE * 0.58}px serif`;
        tctx.fillText(nature[(x * 3 + y * 7) % nature.length], cx, cy);
      } else if (c.gas) {                       // poison cloud
        tctx.font = `${TILE * 0.55}px serif`;
        tctx.fillText("☠️", cx, cy);
      } else if (c.frost) {                     // ice patch
        tctx.font = `${TILE * 0.55}px serif`;
        tctx.fillText("❄️", cx, cy);
      } else if (c.swamp) {                     // swamp / mud
        tctx.font = `${TILE * 0.5}px serif`;
        tctx.fillText("🌿", cx, cy);
      }
    }
    terrainDirty = false;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (terrainDirty) redrawTerrain();
    ctx.drawImage(terrainLayer, 0, 0);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    const vis = result.visitedOrder;
    const shown = Math.min(searchAnim | 0, vis.length);
    for (let i = 0; i < shown; i++) {
      const v = vis[i];
      const a = 0.12 + 0.30 * (1 - i / Math.max(vis.length, 1));
      ctx.fillStyle = `rgba(90,160,255,${a})`;
      ctx.fillRect(v.x * TILE, v.y * TILE, TILE - 1, TILE - 1);
    }

    if (result.path) {
      ctx.strokeStyle = customize.pathColor; ctx.lineWidth = 4;
      ctx.beginPath();
      result.path.forEach((p, i) => {
        const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
        i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy);
      });
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,70,70,0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = `${TILE * 0.6}px serif`;
    ctx.fillText("⛺", start.x * TILE + TILE / 2, start.y * TILE + TILE / 2);
    ctx.font = `${TILE * 0.6}px serif`;
    ctx.fillText(customize.banner, goal.x * TILE + TILE / 2, goal.y * TILE + TILE / 2);
    // tower / keep health bar
    {
      const gx = goal.x * TILE + TILE / 2, gy = goal.y * TILE;
      const bw = TILE * 0.9, bh = 5, bx = gx - bw / 2, by = gy - 8;
      const frac = Math.max(0, lives / level.lives);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#facc15" : "#f87171";
      ctx.fillRect(bx, by, bw * frac, bh);
    }

    // attack zaps
    for (const z of zaps) {
      ctx.strokeStyle = `rgba(255,240,120,${Math.min(1, z.life / 0.14)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(z.fx * TILE, z.fy * TILE);
      ctx.lineTo(z.tx * TILE, z.ty * TILE);
      ctx.stroke();
    }

    for (const e of enemies) {
      const p = e.pos();
      const bob = Math.sin(clock * 6 + e.phase) * TILE * 0.09; // smooth cute hop
      const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2 + bob;
      // health bar above the enemy
      const bw = TILE * 0.7, bh = 4, bx = cx - bw / 2, by = cy - TILE * 0.46;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#facc15" : "#f87171";
      ctx.fillRect(bx, by, bw * frac, bh);
      // the cute invader
      ctx.font = `${TILE * 0.7}px serif`;
      ctx.fillText(customize.enemy, cx, cy);
    }

    if (won || lost) {
      ctx.fillStyle = "rgba(10,12,18,0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = won ? "#4ade80" : "#f87171";
      ctx.font = "bold 34px system-ui"; ctx.textAlign = "center";
      ctx.fillText(won ? "Kingdom Defended!" : "The Keep Has Fallen", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#e6e8ee"; ctx.font = "16px system-ui";
      ctx.fillText(won ? `Survivors: ${lives} lives` : `Enemies breached: ${escaped}`, canvas.width / 2, canvas.height / 2 + 24);
    }

    if (flashT > 0) {
      ctx.fillStyle = `rgba(255,210,74,${Math.min(flashT, 1)})`;
      ctx.font = "bold 16px system-ui"; ctx.textAlign = "center";
      ctx.fillText(flashMsg, canvas.width / 2, 22);
    }

    const nextIn = (!spawning && wave < level.waves && !won && !lost)
      ? `  •  ⏳ Next wave in ${Math.max(0, Math.ceil(prepTimer))}s` : "";
    hudEl.textContent =
      `${customize.kingdomName}  •  Wave ${wave}/${level.waves}  •  🏰 ${Math.max(lives,0)}/${level.lives} HP  •  ` +
      `${customize.soldier} ${resources.walls}  🌿 ${resources.swamp}${unlocked.swamp ? "" : "🔒"}  ☠️ ${resources.gas}${unlocked.gas ? "" : "🔒"}  ❄️ ${resources.frost}${unlocked.frost ? "" : "🔒"}  •  💀 ${killed}${nextIn}  •  ` +
      `Path: ${result.path ? result.path.length - 1 : "BLOCKED"}  •  Visited: ${vis.length}`;
  }
  function dot(t, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, TILE * 0.34, 0, 7);
    ctx.fill();
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    searchAnim += dt * 220;
    if (flashT > 0) flashT -= dt;
    if (!won && !lost) {
      // enemies march automatically: auto-start the next wave after a countdown
      if (!spawning && wave < level.waves && enemies.length === 0) {
        prepTimer -= dt;
        if (prepTimer <= 0) { startWave(); prepTimer = betweenWaves; }
      }
      maybeSpawn(dt);
      for (const e of enemies) e.update(dt);
      soldierAttacks(dt);
      fieldEffects(dt);
      enemies = enemies.filter((e) => !e.dead);
      zaps.forEach((z) => (z.life -= dt));
      zaps = zaps.filter((z) => z.life > 0);
      if (lives <= 0) { lost = true; enemies = []; cb.onLose && cb.onLose({ escaped }); }
    }
    draw();
    requestAnimationFrame(frame);
  }

  recompute();
  requestAnimationFrame(frame);

  // ---- external control API ----
  return {
    stop() {
      running = false;
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mousemove", onMove);
    },
    sendWave: startWave,
    setPaint: (m) => (paintMode = m),
    setAlgo: (k) => { algoKey = k; recompute(); repathEnemies(); },
    getAlgo: () => algoKey,
    reset() {
      loadTerrain(); enemies = []; lives = level.lives; wave = 0;
      escaped = 0; killed = 0; spawning = false; won = false; lost = false;
      resources = { walls: level.startWalls ?? 3, swamp: level.startSwamp ?? 0, gas: 0, frost: 0 };
      unlocked = { swamp: (level.startSwamp ?? 0) > 0, gas: false, frost: false };
      prepTimer = level.prepTime ?? 30;
      zaps = [];
      recompute();
    },
    addResources({ walls = 0, swamp = 0, gas = 0, frost = 0 }) {
      resources.walls += walls; resources.swamp += swamp;
      resources.gas += gas; resources.frost += frost;
    },
    unlockSwamp() { if (!unlocked.swamp) { unlocked.swamp = true; flash("🌿 Swamp defense UNLOCKED!"); } },
    unlockGas() { if (!unlocked.gas) { unlocked.gas = true; flash("☠️ Gas defense UNLOCKED!"); } },
    unlockFrost() { if (!unlocked.frost) { unlocked.frost = true; flash("❄️ Frost defense UNLOCKED!"); } },
    getResources: () => ({ ...resources }),
  };
}
