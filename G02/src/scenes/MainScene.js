// MainScene.js
//
// Concept: CPU cache behavior — locality (temporal & spatial), the
// latency gap between cache and RAM, capacity limits, and replacement.
//
// ONE mechanic: you are a COURIER serving the CPU's data requests. Data
// in the CACHE (right next to the CPU) is served instantly; a MISS means
// a slow trip to distant RAM. You choose what to keep cached and, when
// the cache is full, which line to EVICT. Levels alternate LEARN
// (turn-based, no pressure) and CHALLENGE (stall meter + score + you can
// FAIL), each varied so one playthrough covers the whole idea.

import { LEVELS, Cache, STALL_MAX, makeRequests, ENDLESS, makeEndlessRequests } from "../levels.js";

const W = 1000;
const H = 720;
const BX = 355;            // board center x (left of the side panel)
const PANEL_X = 715;       // side panel left edge
const PX = PANEL_X + 20;   // panel text left

const COLORS = {
  cpu: 0x3a4a6b,
  cpuStroke: 0x6f86b8,
  cacheEmpty: 0x23262e,
  cacheFull: 0x2e7d5b,
  cacheStroke: 0x4a5060,
  ram: 0x2a2d36,
  ramTarget: 0xb5563f,
  ramStroke: 0x4a5060,
  courier: 0xf0c33c,
  hit: 0x4caf7d,
  miss: 0xd0685a,
  panel: 0x1b1e25,
  text: "#e8eaed",
  dim: "#9aa0a8",
  green: "#7fe0ad",
  red: "#e69a9a",
  gold: "#f0c33c",
};

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.levelObjects = [];
    this.overlayObjects = [];
    this.showMenu();
  }

  // ---------- helpers ----------
  track(obj, overlay = false) {
    (overlay ? this.overlayObjects : this.levelObjects).push(obj);
    return obj;
  }
  clearGroup(overlay = false) {
    const arr = overlay ? this.overlayObjects : this.levelObjects;
    arr.forEach((o) => o.destroy());
    if (overlay) this.overlayObjects = [];
    else this.levelObjects = [];
  }
  button(x, y, w, h, label, cb, opts = {}) {
    const overlay = opts.overlay || false;
    const fill = opts.fill ?? 0x3a4a6b;
    const rect = this.add
      .rectangle(x, y, w, h, fill)
      .setStrokeStyle(2, opts.stroke ?? 0x8aa0d0)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: opts.fontSize ?? "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    rect.on("pointerover", () => rect.setFillStyle(opts.hover ?? 0x4a5d85));
    rect.on("pointerout", () => rect.setFillStyle(fill));
    rect.on("pointerdown", () => cb());
    this.track(rect, overlay);
    this.track(txt, overlay);
    return { rect, txt };
  }
  label(x, y, text, opts = {}) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: opts.mono ? "ui-monospace, monospace" : "system-ui, sans-serif",
        fontSize: opts.fontSize ?? "16px",
        color: opts.color ?? COLORS.text,
        align: opts.align ?? "left",
        fontStyle: opts.bold ? "bold" : "normal",
        wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
        lineSpacing: opts.lineSpacing ?? 0,
      })
      .setOrigin(opts.originX ?? 0, opts.originY ?? 0);
    return this.track(t, opts.overlay || false);
  }

  // ---------- menu ----------
  showMenu() {
    this.isEndless = false;
    this.clearGroup(false);
    this.clearGroup(true);
    this.track(this.add.rectangle(W / 2, H / 2, W, H, 0x12141a), true);

    this.label(W / 2, 96, "CACHE QUEST", {
      fontSize: "56px", bold: true, originX: 0.5, overlay: true,
    });
    this.label(W / 2, 156, "Be the courier. Feed the CPU before it stalls.", {
      fontSize: "21px", color: COLORS.dim, originX: 0.5, overlay: true,
    });

    // What is a hit / miss?
    const boxY = 300;
    this.track(
      this.add.rectangle(W / 2, boxY, 720, 190, COLORS.panel).setStrokeStyle(2, 0x3a4150),
      true
    );
    this.label(W / 2, boxY - 72, "HOW IT WORKS", {
      fontSize: "18px", bold: true, originX: 0.5, color: COLORS.gold, overlay: true,
    });
    this.label(
      W / 2, boxY - 20,
      "The CPU asks for data by its ADDRESS.",
      { fontSize: "18px", color: COLORS.text, originX: 0.5, overlay: true }
    );
    this.label(
      W / 2, boxY + 22,
      "HIT  =  the data is already in the CACHE (next to the CPU) → served instantly.",
      { fontSize: "17px", color: COLORS.green, originX: 0.5, overlay: true }
    );
    this.label(
      W / 2, boxY + 54,
      "MISS =  it isn't cached → make a slow trip to distant RAM to get it.",
      { fontSize: "17px", color: COLORS.red, originX: 0.5, overlay: true }
    );

    this.button(W / 2, 470, 240, 64, "START", () => this.startGame(), {
      overlay: true, fill: 0x2e7d5b, hover: 0x3a9a70, stroke: 0x6fd6a3, fontSize: "26px",
    });
    this.label(W / 2, 542, "8 short levels · alternating Learn & Challenge", {
      fontSize: "15px", color: COLORS.dim, originX: 0.5, overlay: true,
    });
  }

  startGame() {
    this.isEndless = false;
    this.totals = { hits: 0, misses: 0, stalls: 0, served: 0, score: 0, stars: 0 };
    this.levelIndex = 0;
    this.loadLevel();
  }

  startEndless() {
    this.isEndless = true;
    this.totals = { hits: 0, misses: 0, stalls: 0, served: 0, score: 0, stars: 0 };
    this.loadLevel();
  }

  // ---------- level lifecycle ----------
  loadLevel() {
    this.clearGroup(false);
    this.clearGroup(true);
    this.level = this.isEndless ? ENDLESS : LEVELS[this.levelIndex];
    this.requests = this.level.endless ? makeEndlessRequests() : makeRequests(this.level);
    this.cache = new Cache(this.level.cacheSlots, this.level.lineSize);
    this.reqIndex = 0;
    this.meter = 0;
    this.stats = { hits: 0, misses: 0, stalls: 0, served: 0, score: 0 };
    this.state = "intro";
    this.buildUI();
    this.showIntro();
  }

  buildUI() {
    const L = this.level;

    // Header (top-left)
    this.label(24, 16, L.title, { fontSize: "22px", bold: true });
    this.label(24, 42, L.subtitle + "  ·  " + L.concept, {
      fontSize: "13px", color: COLORS.dim,
    });

    // Request ABOVE the CPU, well below the header
    this.reqText = this.label(BX, 98, "", {
      fontSize: "23px", bold: true, originX: 0.5, color: COLORS.gold,
    });

    // CPU box
    this.track(
      this.add.rectangle(BX, 158, 230, 66, COLORS.cpu).setStrokeStyle(3, COLORS.cpuStroke)
    );
    this.track(
      this.add.text(BX, 158, "CPU", {
        fontFamily: "system-ui, sans-serif", fontSize: "26px",
        color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5)
    );

    // Cache heading + slots (close to CPU = short/quick trip)
    const slots = L.cacheSlots;
    this.label(BX, 244, slots > 0 ? "CACHE  (right next to the CPU)" : "NO CACHE", {
      fontSize: "15px", color: COLORS.dim, originX: 0.5,
    });
    this.cacheSlotObjs = [];
    this.cacheLabelObjs = [];
    if (slots > 0) {
      const gap = 26;
      const sw = Math.min(170, Math.floor((660 - (slots - 1) * gap) / slots));
      const totalW = slots * sw + (slots - 1) * gap;
      let x = BX - totalW / 2 + sw / 2;
      for (let i = 0; i < slots; i++) {
        const rect = this.add
          .rectangle(x, 306, sw, 86, COLORS.cacheEmpty)
          .setStrokeStyle(2, COLORS.cacheStroke)
          .setInteractive({ useHandCursor: true });
        rect.on("pointerdown", () => this.onCacheClick(i));
        const txt = this.add
          .text(x, 306, "empty", {
            fontFamily: "ui-monospace, monospace", fontSize: "16px",
            color: "#7f8794", align: "center",
          }).setOrigin(0.5);
        this.track(rect); this.track(txt);
        this.cacheSlotObjs.push(rect);
        this.cacheLabelObjs.push(txt);
        x += sw + gap;
      }
    }

    // RAM (far below = long/slow trip), each cell clickable.
    // Layout auto-sizes and wraps to 2 rows so it NEVER runs off screen,
    // no matter how many addresses a level uses.
    this.label(BX, 486, "RAM  (far away · slow)", {
      fontSize: "15px", color: COLORS.dim, originX: 0.5,
    });
    const maxAddr = Math.max(...this.requests);
    this.ramCount = maxAddr + 1;
    this.ramCellObjs = [];
    const availW = 690, rgap = 6;
    const rows = Math.floor((availW - (this.ramCount - 1) * rgap) / this.ramCount) < 30 ? 2 : 1;
    const perRow = Math.ceil(this.ramCount / rows);
    const cellW = Math.max(20, Math.min(52, Math.floor((availW - (perRow - 1) * rgap) / perRow)));
    const cellH = rows === 2 ? 46 : 62;
    const rowGap = 8;
    const baseY = rows === 2 ? 544 : 560;
    const fs = cellW < 30 ? "11px" : cellW < 36 ? "13px" : "16px";
    for (let a = 0; a < this.ramCount; a++) {
      const row = Math.floor(a / perRow);
      const col = a % perRow;
      const cnt = row < rows - 1 ? perRow : this.ramCount - perRow * (rows - 1);
      const rowW = cnt * cellW + (cnt - 1) * rgap;
      const x = BX - rowW / 2 + cellW / 2 + col * (cellW + rgap);
      const y = baseY + row * (cellH + rowGap);
      const rect = this.add
        .rectangle(x, y, cellW, cellH, COLORS.ram)
        .setStrokeStyle(1, COLORS.ramStroke)
        .setInteractive({ useHandCursor: true });
      rect.on("pointerdown", () => this.onRamClick(a));
      const txt = this.add
        .text(x, y, String(a), {
          fontFamily: "ui-monospace, monospace", fontSize: fs, color: "#c7ccd4",
        }).setOrigin(0.5);
      this.track(rect); this.track(txt);
      this.ramCellObjs.push(rect);
    }

    // Courier (starts just below the CPU, comes from below)
    this.courierHome = { x: BX, y: 200 };
    this.courier = this.add.circle(BX, 200, 13, COLORS.courier).setStrokeStyle(2, 0xffffff);
    this.track(this.courier);
    this.courier.setVisible(false);

    this.buildPanel();

    // progress line
    this.progText = this.label(24, H - 22, "", { fontSize: "14px", color: COLORS.dim });
  }

  buildPanel() {
    const L = this.level;
    const isLearn = L.mode === "learn";
    this.track(
      this.add.rectangle(PANEL_X + 130, H / 2, 260, H - 24, COLORS.panel).setStrokeStyle(2, 0x3a4150)
    );
    this.label(PX, 30, isLearn ? "MODE: LEARN" : "MODE: CHALLENGE", {
      fontSize: "16px", bold: true, color: isLearn ? "#8ab6e6" : "#e69a9a",
    });
    this.label(PX, 54, isLearn ? "take your time · learn why" : "beat the clock · you can fail", {
      fontSize: "12px", color: COLORS.dim,
    });

    // Legend
    this.label(PX, 96, "HIT", { fontSize: "15px", bold: true, color: COLORS.green });
    this.label(PX, 116, "In the cache → instant.", { fontSize: "13px", color: COLORS.dim, wrap: 220 });
    this.label(PX, 148, "MISS", { fontSize: "15px", bold: true, color: COLORS.red });
    this.label(PX, 168, "Not cached → slow RAM trip.", { fontSize: "13px", color: COLORS.dim, wrap: 220 });

    // What to do (context tip)
    this.label(PX, 214, "WHAT TO DO", { fontSize: "14px", bold: true, color: COLORS.gold });
    this.tipText = this.label(PX, 236, "", { fontSize: "14px", color: COLORS.text, wrap: 230, lineSpacing: 3 });

    // Stats
    this.label(PX, 400, "STATS", { fontSize: "14px", bold: true, color: COLORS.gold });
    if (isLearn) {
      this.statLine1 = this.label(PX, 424, "", { fontSize: "15px", color: COLORS.text });
      this.statLine2 = this.label(PX, 448, "", { fontSize: "15px", color: COLORS.text });
    } else {
      this.scoreLine = this.label(PX, 424, "", { fontSize: "20px", bold: true, color: COLORS.gold });
      this.stallLine = this.label(PX, 454, "", { fontSize: "15px", color: COLORS.text });
      // Stall meter
      this.label(PX, 502, "STALL METER", { fontSize: "13px", color: COLORS.dim });
      this.track(this.add.rectangle(PX, 530, 230, 18, 0x2a2d36).setOrigin(0, 0.5).setStrokeStyle(1, 0x555b66));
      this.meterBar = this.add.rectangle(PX + 2, 530, 0, 14, COLORS.miss).setOrigin(0, 0.5);
      this.track(this.meterBar);
    }
  }

  setTip(text) {
    if (this.tipText) this.tipText.setText(text);
  }

  // ---------- overlays ----------
  overlay(titleText, bodyLines, buttons, opts = {}) {
    this.clearGroup(true);
    this.track(this.add.rectangle(W / 2, H / 2, W, H, 0x0a0b0e, 0.85), true);
    const panelH = opts.panelH ?? 420;
    this.track(
      this.add.rectangle(W / 2, H / 2, 720, panelH, COLORS.panel).setStrokeStyle(2, 0x3a4150),
      true
    );
    this.label(W / 2, H / 2 - panelH / 2 + 44, titleText, {
      fontSize: "28px", bold: true, originX: 0.5, originY: 0.5,
      color: opts.titleColor ?? COLORS.text, overlay: true,
    });
    this.label(W / 2, H / 2 - 20, bodyLines.join("\n"), {
      fontSize: "18px", color: COLORS.text, originX: 0.5, originY: 0.5,
      align: "center", lineSpacing: 9, wrap: 640, overlay: true,
    });
    const n = buttons.length;
    const bw = 240, bgap = 30;
    let bx = W / 2 - ((n * bw + (n - 1) * bgap) / 2) + bw / 2;
    for (const b of buttons) {
      this.button(bx, H / 2 + panelH / 2 - 46, bw, 54, b.label, b.cb, {
        overlay: true, fill: b.fill ?? 0x2e7d5b, hover: b.hover ?? 0x3a9a70,
        stroke: b.stroke ?? 0x6fd6a3, fontSize: "21px",
      });
      bx += bw + bgap;
    }
  }

  showIntro() {
    const L = this.level;
    this.overlay(L.title, L.intro, [{
      label: "BEGIN", cb: () => { this.clearGroup(true); this.beginPlay(); },
    }]);
  }

  beginPlay() {
    this.state = "idle";
    this.nextRequest();
  }

  // ---------- request flow ----------
  nextRequest() {
    if (this.reqIndex >= this.requests.length) {
      this.levelComplete();
      return;
    }
    this.state = "idle";
    this.curAddr = this.requests[this.reqIndex];
    // Always start the courier back at the CPU for a fresh request.
    this.courier.setVisible(false);
    this.courier.setPosition(this.courierHome.x, this.courierHome.y);
    this.render();

    // Context tip (no per-action spam; short and situational)
    if (this.level.cacheSlots === 0) {
      this.setTip("No cache yet. Click the requested address in RAM to fetch it.");
    } else {
      this.setTip(
        "Click the cache slot that holds it (HIT), or fetch it from RAM (MISS)."
      );
    }
  }

  render() {
    // request text
    this.reqText.setText(`CPU wants address  [ ${this.curAddr} ]`);

    // cache slots
    const hitLineId = this.cache.lineIdOf(this.curAddr);
    for (let i = 0; i < this.cacheSlotObjs.length; i++) {
      const line = this.cache.lines[i];
      const rect = this.cacheSlotObjs[i];
      const txt = this.cacheLabelObjs[i];
      if (line) {
        const addrs = [];
        for (let k = 0; k < this.cache.lineSize; k++) addrs.push(line.base + k);
        rect.setFillStyle(COLORS.cacheFull);
        txt.setColor("#eafff4");
        txt.setText(this.cache.lineSize > 1
          ? "line " + line.id + "\n[" + addrs.join(",") + "]"
          : "addr " + line.base);
      } else {
        rect.setFillStyle(COLORS.cacheEmpty);
        txt.setColor("#7f8794");
        txt.setText("empty");
      }
      // learn-mode hit hint
      const isHint = this.level.mode === "learn" && line && line.id === hitLineId;
      rect.setStrokeStyle(isHint ? 4 : 2, isHint ? 0x7fe0ad : COLORS.cacheStroke);
    }

    // In LEARN mode we highlight the requested address (and its line) as a
    // teaching aid. In CHALLENGE/Endless, cells stay uniform so the player
    // must actually FIND the address the CPU asked for.
    if (this.level.mode === "learn") {
      const base = hitLineId * this.level.lineSize;
      for (let a = 0; a < this.ramCellObjs.length; a++) {
        const inLine = a >= base && a < base + this.level.lineSize;
        this.ramCellObjs[a].setFillStyle(
          a === this.curAddr ? COLORS.ramTarget : inLine ? 0x4a3f36 : COLORS.ram
        );
      }
    } else {
      for (let a = 0; a < this.ramCellObjs.length; a++) {
        this.ramCellObjs[a].setFillStyle(COLORS.ram);
      }
    }

    // panel stats
    if (this.level.mode === "learn") {
      if (this.statLine1) this.statLine1.setText("Hits:   " + this.stats.hits);
      if (this.statLine2) this.statLine2.setText("Misses: " + this.stats.misses);
    } else {
      if (this.scoreLine) this.scoreLine.setText("Score: " + this.stats.score);
      if (this.stallLine)
        this.stallLine.setText(`Stalls: ${this.stats.stalls} / ${this.level.stall.allowed}`);
    }
    this.progText.setText(`Request ${Math.min(this.reqIndex + 1, this.requests.length)} / ${this.requests.length}`);
  }

  // ---------- courier movement ----------
  moveCourier(points, cb) {
    // Note: does NOT reset position — it continues from wherever the
    // courier currently is, so multi-leg trips travel instead of teleport.
    this.courier.setVisible(true);
    let i = 0;
    const step = () => {
      if (i >= points.length) { cb && cb(); return; }
      const p = points[i++];
      this.tweens.add({
        targets: this.courier, x: p.x, y: p.y, duration: p.d,
        ease: "Sine.inOut", onComplete: step,
      });
    };
    step();
  }
  slotPos(i) { const r = this.cacheSlotObjs[i]; return { x: r.x, y: r.y }; }
  ramPos(a) { const r = this.ramCellObjs[a]; return { x: r.x, y: r.y }; }

  // ---------- interactions ----------
  onCacheClick(i) {
    if (this.state === "evict") { this.onEvictChoice(i); return; }
    if (this.state !== "idle") return;
    const line = this.cache.lines[i];
    if (line && line.id === this.cache.lineIdOf(this.curAddr)) {
      this.state = "anim";
      const p = this.slotPos(i);
      this.moveCourier([{ ...p, d: 200 }, { ...this.courierHome, d: 160 }], () => {
        this.courier.setVisible(false);
        this.cache.touch(this.curAddr);
        this.flash(this.cacheSlotObjs[i], COLORS.hit);
        this.serveComplete(true);
      });
    } else {
      this.flash(this.cacheSlotObjs[i], COLORS.miss);
      if (this.level.mode === "learn")
        this.setTip("That slot doesn't hold address " + this.curAddr + ". Try another, or fetch from RAM.");
      else this.wrongClickPenalty();
    }
  }

  wrongClickPenalty() {
    // Small sting for clicking the wrong data in a challenge.
    this.meter = Math.min(STALL_MAX - 1, this.meter + 6);
    this.stats.score = Math.max(0, this.stats.score - 5);
    this.totals.score = Math.max(0, this.totals.score - 5);
    this.floatText("-5", "#ff6b6b");
    this.render();
  }

  onRamClick(a) {
    if (this.state !== "idle") return;
    if (a !== this.curAddr) {
      this.flash(this.ramCellObjs[a], COLORS.miss);
      if (this.level.mode === "learn")
        this.setTip("The CPU asked for " + this.curAddr + ", not " + a + ". Find address " + this.curAddr + ".");
      else this.wrongClickPenalty();
      return;
    }
    this.state = "anim";
    const L = this.level;
    const ram = this.ramPos(this.curAddr);
    const home = this.courierHome;
    const wasteful = L.cacheSlots > 0 && this.cache.has(this.curAddr);

    if (L.cacheSlots === 0 || wasteful) {
      // No cache, or already cached (a needless trip): go and come back.
      this.moveCourier([{ ...ram, d: 560 }, { ...home, d: 560 }], () => {
        this.courier.setVisible(false);
        if (wasteful) this.cache.touch(this.curAddr);
        this.serveComplete(false, wasteful);
      });
    } else if (!this.cache.isFull()) {
      // Free slot: RAM -> deliver into the slot -> back to CPU.
      const empty = this.cache.lines.length;
      const p = this.slotPos(empty);
      this.moveCourier(
        [{ ...ram, d: 560 }, { ...p, d: 420 }, { ...home, d: 150 }],
        () => {
          this.courier.setVisible(false);
          this.cache.install(this.curAddr);
          this.flash(this.cacheSlotObjs[empty], COLORS.courier);
          this.render();
          this.serveComplete(false);
        }
      );
    } else {
      // Full: RAM -> back to CPU holding the data -> player picks a victim.
      this.moveCourier([{ ...ram, d: 560 }, { ...home, d: 560 }], () => {
        this.state = "evict";
        this.setTip(
          "Cache is FULL. Click a line to EVICT — drop the one you'll need LEAST soon. (No time pressure here.)"
        );
        this.cacheSlotObjs.forEach((r) => this.pulse(r));
      });
    }
  }

  onEvictChoice(i) {
    const line = this.cache.lines[i];
    if (!line) return;
    this.stopPulse();
    this.state = "anim";
    const p = this.slotPos(i);
    this.moveCourier([{ ...p, d: 320 }, { ...this.courierHome, d: 150 }], () => {
      this.courier.setVisible(false);
      this.cache.evict(line.id);
      this.cache.install(this.curAddr);
      this.flash(this.cacheSlotObjs[i], COLORS.courier);
      this.render();
      this.serveComplete(false);
    });
  }

  serveComplete(hit, wasted = false) {
    this.stats.served++;
    this.totals.served++;
    if (hit) { this.stats.hits++; this.totals.hits++; }
    else { this.stats.misses++; this.totals.misses++; }

    if (this.level.mode === "challenge") {
      let pts;
      if (wasted) pts = 5;
      else if (hit) pts = Math.max(30, 120 - Math.floor(this.meter * 0.5));
      else pts = Math.max(20, 55 - Math.floor(this.meter * 0.2));
      this.stats.score += pts;
      this.totals.score += pts;
      this.floatText("+" + pts, COLORS.green);
      // HITS drain the meter a lot; MISSES only a little -> a run of misses
      // builds real pressure, so keeping hot data cached is what saves you.
      this.meter = Math.max(0, this.meter - (hit ? 45 : 18));
    } else {
      this.floatText(wasted ? "WASTED TRIP" : hit ? "HIT" : "MISS",
        wasted ? "#d9a15a" : hit ? COLORS.green : COLORS.red);
    }

    this.reqIndex++;
    this.render();
    this.state = "cooldown";
    this.time.delayedCall(this.level.mode === "learn" ? 360 : 240, () => {
      if (this.state === "cooldown") this.nextRequest();
    });
  }

  // ---------- challenge pressure ----------
  update(time, delta) {
    if (!this.level || this.level.mode !== "challenge") return;
    // Meter fills while a request is unserved — but NOT during the eviction
    // choice, so picking a victim is a calm decision, not a reflex test.
    if (!["idle", "anim"].includes(this.state)) return;
    let fill = this.level.stall.fillPerSec;
    if (this.level.endless) fill = Math.min(44, fill + Math.floor(this.reqIndex / 6) * 2);
    this.meter += (fill * delta) / 1000;
    if (this.meter >= STALL_MAX) { this.onStall(); return; }
    if (this.meterBar) {
      const frac = Math.min(this.meter / STALL_MAX, 1);
      this.meterBar.width = 226 * frac;
      this.meterBar.setFillStyle(frac > 0.75 ? 0xe04a3a : frac > 0.5 ? 0xd98a3a : COLORS.miss);
    }
  }

  onStall() {
    this.tweens.killTweensOf(this.courier);
    this.courier.setVisible(false);
    this.courier.setPosition(this.courierHome.x, this.courierHome.y);
    this.stopPulse();
    this.stats.stalls++;
    this.totals.stalls++;
    this.stats.score = Math.max(0, this.stats.score - 30);
    this.totals.score = Math.max(0, this.totals.score - 30);
    this.floatText("STALL  -30", "#ff6b6b");
    this.flashScreen();
    this.meter = 35;
    // force-serve current request as a miss
    if (this.level.cacheSlots > 0 && !this.cache.has(this.curAddr)) {
      if (this.cache.isFull()) this.cache.evict(this.cache.lruLineId());
      this.cache.install(this.curAddr);
    }
    this.stats.misses++; this.totals.misses++;
    this.stats.served++; this.totals.served++;
    this.reqIndex++;
    this.render();

    if (this.stats.stalls > this.level.stall.allowed) {
      this.state = "over";
      this.time.delayedCall(500, () => this.failLevel());
      return;
    }
    this.state = "cooldown";
    this.time.delayedCall(360, () => { if (this.state === "cooldown") this.nextRequest(); });
  }

  // ---------- effects ----------
  flash(rect, color) {
    const orig = rect.fillColor;
    rect.setFillStyle(color);
    this.time.delayedCall(220, () => { if (rect.active) rect.setFillStyle(orig); });
  }
  pulse(rect) {
    rect._pulse = this.tweens.add({
      targets: rect, scaleX: 1.06, scaleY: 1.06, duration: 380, yoyo: true, repeat: -1,
    });
  }
  stopPulse() {
    this.cacheSlotObjs.forEach((r) => {
      if (r._pulse) { r._pulse.stop(); r._pulse = null; r.setScale(1); }
    });
  }
  floatText(text, color) {
    const t = this.add.text(BX, 132, text, {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", color, fontStyle: "bold",
    }).setOrigin(0.5);
    this.track(t);
    this.tweens.add({ targets: t, y: 104, alpha: 0, duration: 750, onComplete: () => t.destroy() });
  }
  flashScreen() {
    const f = this.add.rectangle(W / 2, H / 2, W, H, 0xff3b3b, 0.25);
    this.track(f);
    this.tweens.add({ targets: f, alpha: 0, duration: 420, onComplete: () => f.destroy() });
  }

  // ---------- end states ----------
  failLevel() {
    const scoreLine = this.level.endless ? `Final score: ${this.stats.score}` : "";
    this.overlay(
      this.level.endless ? "RUN OVER" : "LEVEL FAILED",
      [
        `The CPU stalled ${this.stats.stalls} times — too many. It couldn't keep up.`,
        scoreLine,
        "",
        "Tip: serve HITS fast (they barely move the meter) and spend your",
        "RAM trips wisely. Keep the hottest data cached.",
      ],
      [
        { label: "RETRY", cb: () => { this.clearGroup(true); this.loadLevel(); },
          fill: 0x7a5230, hover: 0x966636, stroke: 0xd0a060 },
        { label: "MENU", cb: () => this.showMenu(),
          fill: 0x3a4a6b, hover: 0x4a5d85, stroke: 0x8aa0d0 },
      ],
      { panelH: 380, titleColor: "#ff6b6b" }
    );
  }

  // Best-case score for THIS level's request stream (meter near zero),
  // used to scale the 1-3 star rating fairly to each randomized level.
  computePar() {
    const c = new Cache(this.level.cacheSlots, this.level.lineSize);
    let h = 0, m = 0;
    for (const a of this.requests) {
      if (this.level.cacheSlots > 0 && c.has(a)) { c.touch(a); h++; }
      else { m++; if (this.level.cacheSlots > 0) { if (c.isFull()) c.evict(c.lruLineId()); c.install(a); } }
    }
    return h * 120 + m * 55;
  }

  levelComplete() {
    this.state = "over";
    if (this.level.endless) {
      this.overlay("YOU SURVIVED!  \u2605\u2605\u2605", [
        `Score: ${this.stats.score}`,
        `Served ${this.stats.served} requests · ${this.stats.stalls} stalls`,
        "",
        "You outran the rising speed all the way to the end.",
        "Try again to beat your score.",
      ], [
        { label: "RETRY", cb: () => { this.clearGroup(true); this.loadLevel(); },
          fill: 0x7a5230, hover: 0x966636, stroke: 0xd0a060 },
        { label: "MENU", cb: () => this.showMenu(),
          fill: 0x3a4a6b, hover: 0x4a5d85, stroke: 0x8aa0d0 },
      ], { panelH: 360, titleColor: COLORS.gold });
      return;
    }
    const s = this.stats;
    const total = s.hits + s.misses;
    const hitRate = total > 0 ? Math.round((s.hits / total) * 100) : 0;
    const lines = [];
    lines.push(`Hits: ${s.hits}    Misses: ${s.misses}    Hit rate: ${hitRate}%`);

    let titleStars = "";
    if (this.level.mode === "challenge") {
      const par = this.computePar();
      const ratio = par > 0 ? s.score / par : 0;
      const stars = ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : 1;
      this.totals.stars = (this.totals.stars || 0) + stars;
      titleStars = "   " + "\u2605".repeat(stars) + "\u2606".repeat(3 - stars);
      lines.push(`Score: ${s.score}    Stalls: ${s.stalls}`);
      lines.push("");
      if (this.level.cacheSlots === 0) {
        lines.push(
          "With no cache, every request is a slow RAM trip, so stalls are " +
          "unavoidable. That's exactly the problem a cache solves — coming up next."
        );
      } else {
        lines.push(
          "Tip: every HIT drains the stall meter fast; misses barely do. Keep " +
          "hot data cached and serve hits quickly to keep the meter down."
        );
      }
    }
    lines.push("");
    if (this.level.teach && this.level.teach.summary) lines.push(this.level.teach.summary);

    const isLast = this.levelIndex >= LEVELS.length - 1;
    this.overlay("Level Complete" + titleStars, lines, [{
      label: isLast ? "SEE RESULTS" : "NEXT LEVEL ▶",
      cb: () => {
        this.clearGroup(true);
        if (isLast) this.showGameEnd();
        else { this.levelIndex++; this.loadLevel(); }
      },
    }], { panelH: this.level.mode === "challenge" ? 500 : 430,
         titleColor: this.level.mode === "challenge" ? COLORS.gold : COLORS.text });
  }

  showGameEnd() {
    this.clearGroup(false);
    this.clearGroup(true);
    const s = this.totals;
    const total = s.hits + s.misses;
    const hitRate = total > 0 ? Math.round((s.hits / total) * 100) : 0;
    this.track(this.add.rectangle(W / 2, H / 2, W, H, 0x12141a), true);
    this.label(W / 2, 110, "COURIER REPORT", {
      fontSize: "44px", bold: true, originX: 0.5, overlay: true,
    });
    this.label(W / 2, 320, [
      `Total hits: ${s.hits}     Total misses: ${s.misses}`,
      `Overall hit rate: ${hitRate}%`,
      `CPU stalls: ${s.stalls}     Total score: ${s.score}`,
      `Stars earned: ${s.stars || 0} / 12`,
      "",
      "You've served the CPU across every kind of access pattern:",
      "temporal reuse, capacity limits, replacement choices, and",
      "spatial locality with cache lines. That's how real caches",
      "make programs fast — by keeping the right data close.",
    ].join("\n"), {
      fontSize: "18px", color: COLORS.text, originX: 0.5, originY: 0.5,
      align: "center", lineSpacing: 9, overlay: true,
    });
    this.label(W / 2, 500, "ENDLESS MODE UNLOCKED", {
      fontSize: "16px", bold: true, originX: 0.5, color: COLORS.gold, overlay: true,
    });
    this.button(W / 2 - 145, 560, 260, 56, "ENDLESS MODE", () => this.startEndless(), {
      overlay: true, fill: 0x7a5230, hover: 0x966636, stroke: 0xd0a060, fontSize: "20px",
    });
    this.button(W / 2 + 145, 560, 260, 56, "MAIN MENU", () => this.showMenu(), {
      overlay: true, fill: 0x2e7d5b, hover: 0x3a9a70, stroke: 0x6fd6a3, fontSize: "20px",
    });
  }
}
