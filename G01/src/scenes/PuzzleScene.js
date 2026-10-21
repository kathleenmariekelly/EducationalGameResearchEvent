// PuzzleScene.js
//
// The teaching core. The problem sits in the background; the player builds
// the recurrence by DRAGGING blocks into three empty slots — the
// subproblems F(i) depends on, how to combine them, and the base case.
// (LHS "F(i) =" and "Base:" are given; the player fills the right-hand
// side.) On submit, the recurrence is EXECUTED bottom-up and animated cell
// by cell. If it diverges from the correct answer the animation stops at
// the offending cell; if it completes correctly, a victory panel shows.
//
// Intrinsic integration: the blocks the player assembles ARE the
// recurrence, and what they watch is their own recurrence running.

import { scenarios, runDP } from "../scenarios.js";

const W = 960;
const H = 640;
const C = {
  panel: 0x262a31, text: "#e8eaed", dim: "#9aa0a8", accent: "#f0b429",
  slot: 0x1a1c20, good: "#2f9e44", bad: "#e03131", base: "#1971c2",
  block: 0x3a4150, blockCombine: 0x5c3b7a, blockPreds: 0x1e4d6b, blockBase: 0x6b4a1e,
};

export default class PuzzleScene extends Phaser.Scene {
  constructor() {
    super("PuzzleScene");
  }

  init(data) {
    this.index = data.index;
    this.npcRef = data.npcRef;
  }

  create() {
    this.s = scenarios[this.index];
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0f12, 0.9);

    // problem statement (the "problem view in the background")
    this.add.rectangle(W / 2, 70, W - 40, 108, C.panel).setStrokeStyle(1, 0x3a4150);
    this.add.text(30, 26, `${this.s.emoji}  ${this.s.npc} needs help:`, {
      fontFamily: "system-ui", fontSize: "16px", color: C.accent, fontStyle: "bold",
    });
    this.add.text(30, 50, this.s.story, {
      fontFamily: "system-ui", fontSize: "14px", color: C.text, wordWrap: { width: W - 60 }, lineSpacing: 3,
    });

    this.buildTemplate();
    this.buildTray();

    this.submitBtn = this.makeButton(W / 2 - 120, 470, 200, 42, "✓ Submit relation", () => this.submit(), 0x2f9e44);
    this.exitBtn = this.makeButton(W / 2 + 120, 470, 160, 42, "Exit", () => this.finish(false), 0x495057);
    this.setSubmitEnabled(false);

    this.status = this.add.text(W / 2, 510, "Drag a block into each empty slot.", {
      fontFamily: "system-ui", fontSize: "15px", color: C.dim,
    }).setOrigin(0.5, 0);

    this.input.on("dragstart", (pointer, obj) => {
      obj.setDepth(1000);
      const t = obj.getData("label"); if (t) t.setDepth(1001);
    });
    this.input.on("drag", (pointer, obj, dx, dy) => {
      obj.x = dx; obj.y = dy;
      const t = obj.getData("label"); if (t) t.setPosition(dx, dy);
    });
    this.input.on("dragend", (pointer, obj) => this.onDrop(obj));
  }

  buildTemplate() {
    this.templateObjs = [];
    const add = (o) => { this.templateObjs.push(o); return o; };
    add(this.add.rectangle(W / 2, 240, W - 40, 200, C.panel).setStrokeStyle(1, 0x3a4150));
    add(this.add.text(30, 152, "General case:", { fontFamily: "system-ui", fontSize: "14px", color: C.dim }));
    add(this.add.text(50, 182, "F(i)  =", { fontFamily: "ui-monospace, monospace", fontSize: "20px", color: C.text }));
    add(this.add.text(50, 232, "using subproblems", { fontFamily: "system-ui", fontSize: "13px", color: C.dim }));
    add(this.add.text(560, 152, "Base case:", { fontFamily: "system-ui", fontSize: "14px", color: C.dim }));

    // three drop slots
    this.slots = {
      combine: this.makeSlot("combine", 300, 190, 320, 40, "how to combine →"),
      preds: this.makeSlot("preds", 340, 240, 320, 40, "which subproblems →"),
      base: this.makeSlot("base", 700, 190, 420, 40, "base case value →"),
    };
  }

  makeSlot(cat, cx, cy, w, h, placeholder) {
    const rect = this.add.rectangle(cx, cy, w, h, C.slot).setStrokeStyle(2, 0xf0b429, 0.7);
    rect.setData("dashed", true);
    const ph = this.add.text(cx, cy, placeholder, {
      fontFamily: "system-ui", fontSize: "13px", color: "#6b7280", fontStyle: "italic",
    }).setOrigin(0.5);
    this.templateObjs.push(rect, ph);
    return { cat, x: cx, y: cy, w, h, rect, ph, occupant: null };
  }

  buildTray() {
    this.trayObjs = [];
    const blocks = [];
    ["preds", "combine", "base"].forEach((cat) => {
      this.s.slots[cat].options.forEach((opt, idx) => {
        blocks.push({ cat, idx, label: opt.label, correct: opt.correct });
      });
    });
    Phaser.Utils.Array.Shuffle(blocks);

    const trayLabel = this.add.text(30, 300, "Building blocks — drag into the slots above:", {
      fontFamily: "system-ui", fontSize: "13px", color: C.dim,
    });
    this.trayObjs.push(trayLabel);

    this.blocks = [];
    let x = 40, y = 330;
    const rowH = 42;
    blocks.forEach((b) => {
      const block = this.makeBlock(b);
      const bw = block.getData("w");
      if (x + bw > W - 40) { x = 40; y += rowH; }
      const cx = x + bw / 2;
      this.moveBlock(block, cx, y);
      block.setData("home", { x: cx, y });
      x += bw + 14;
      this.blocks.push(block);
    });
  }

  makeBlock(b) {
    const catColor = { combine: C.blockCombine, preds: C.blockPreds, base: C.blockBase }[b.cat];
    // measure text first, then draw rect UNDER a fresh label so the label is on top
    const measure = this.add.text(0, 0, b.label, { fontFamily: "ui-monospace, monospace", fontSize: "13px" });
    const w = measure.width + 22;
    measure.destroy();
    const h = 30;
    const rect = this.add.rectangle(0, 0, w, h, catColor).setStrokeStyle(1, 0xffffff, 0.35)
      .setDepth(5).setInteractive({ useHandCursor: true, draggable: true });
    const txt = this.add.text(0, 0, b.label, {
      fontFamily: "ui-monospace, monospace", fontSize: "13px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(6);
    rect.setData("meta", b);
    rect.setData("w", w);
    rect.setData("slot", null);
    rect.setData("label", txt);
    this.trayObjs.push(rect, txt);
    return rect;
  }

  moveBlock(block, x, y) {
    block.setPosition(x, y);
    block.getData("label").setPosition(x, y);
  }

  onDrop(block) {
    const meta = block.getData("meta");
    // find matching-category slot under the block
    const slot = Object.values(this.slots).find((s) =>
      s.cat === meta.cat &&
      Math.abs(block.x - s.x) < s.w / 2 + 10 &&
      Math.abs(block.y - s.y) < s.h / 2 + 20);

    // remove from previous slot if it was in one
    const prev = block.getData("slot");
    if (prev && prev.occupant === block) { prev.occupant = null; prev.ph.setVisible(true); }

    block.setDepth(5); block.getData("label").setDepth(6);
    if (slot) {
      if (slot.occupant && slot.occupant !== block) this.sendHome(slot.occupant);
      slot.occupant = block;
      slot.ph.setVisible(false);
      block.setData("slot", slot);
      this.moveBlock(block, slot.x, slot.y);
      block.setStrokeStyle(2, 0xf0b429); // highlight when placed
    } else {
      block.setData("slot", null);
      block.setStrokeStyle(1, 0xffffff, 0.35);
      this.sendHome(block);
    }
    const filled = Object.values(this.slots).every((s) => s.occupant);
    this.setSubmitEnabled(filled);
    this.status.setColor(C.dim).setText(filled ? "Looks complete — hit Submit to run it." : "Drag a block into each empty slot.");
  }

  sendHome(block) {
    const home = block.getData("home");
    block.setData("slot", null);
    block.setStrokeStyle(1, 0xffffff, 0.35);
    this.tweens.add({ targets: [block, block.getData("label")], x: home.x, y: home.y, duration: 180, ease: "Quad.out" });
  }

  setSubmitEnabled(on) {
    this.submitEnabled = on;
    this.submitBtn.rect.setAlpha(on ? 1 : 0.4);
    this.submitBtn.rect.input && (this.submitBtn.rect.input.enabled = on);
  }

  submit() {
    if (!this.submitEnabled) return;
    const pick = (cat) => {
      const meta = this.slots[cat].occupant.getData("meta");
      return this.s.slots[cat].options[meta.idx];
    };
    const p = pick("preds"), c = pick("combine"), b = pick("base");
    const playerDP = runDP(this.s.input, { fn: p.fn }, { agg: c.agg, cost: c.cost }, { init: b.init, start: b.start });
    const cp = this.s.slots.preds.options.find((o) => o.correct);
    const cc = this.s.slots.combine.options.find((o) => o.correct);
    const cb = this.s.slots.base.options.find((o) => o.correct);
    const correctDP = runDP(this.s.input, { fn: cp.fn }, { agg: cc.agg, cost: cc.cost }, { init: cb.init, start: cb.start });

    this.setBuildUIVisible(false);
    this.animate(playerDP, correctDP, b.start, { p, c, b });
  }

  setBuildUIVisible(v) {
    this.templateObjs.forEach((o) => o.setVisible(v));
    this.trayObjs.forEach((o) => o.setVisible(v));
    this.submitBtn.rect.setVisible(v); this.submitBtn.txt.setVisible(v);
    this.status.setVisible(v);
  }

  fmt(v) {
    if (v == null) return "";
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    return String(v);
  }

  animate(playerDP, correctDP, start, picks) {
    this.animObjs = [];
    this.animTimers = [];
    const keep = (o) => { this.animObjs.push(o); return o; };
    const n = this.s.input.length;
    const cellW = Math.min(72, (W - 160) / (n + 1));
    const sx = (W - cellW * (n + 1)) / 2 + cellW / 2;
    const yRow = 300;

    keep(this.add.text(W / 2, 160, `${this.s.emoji}  Running your recurrence...`, {
      fontFamily: "system-ui", fontSize: "18px", color: C.accent, fontStyle: "bold",
    }).setOrigin(0.5));
    keep(this.add.text(sx - cellW / 2 - 14, 250, `${this.s.axisLabel} i:`, {
      fontFamily: "ui-monospace, monospace", fontSize: "13px", color: C.dim,
    }).setOrigin(1, 0.5));
    keep(this.add.text(sx - cellW / 2 - 14, yRow, "F(i):", {
      fontFamily: "ui-monospace, monospace", fontSize: "13px", color: C.dim,
    }).setOrigin(1, 0.5));

    let firstWrong = -1;
    for (let i = 0; i <= n; i++) if (playerDP[i] !== correctDP[i]) { firstWrong = i; break; }
    const allCorrect = firstWrong === -1;

    for (let i = 0; i <= n; i++) {
      const cx = sx + i * cellW;
      keep(this.add.text(cx, 250, String(i), { fontFamily: "ui-monospace, monospace", fontSize: "13px", color: C.dim }).setOrigin(0.5));
      const cell = keep(this.add.rectangle(cx, yRow, cellW - 6, 36, 0x2f343d).setStrokeStyle(1, 0x454b57));
      const val = keep(this.add.text(cx, yRow, "", { fontFamily: "ui-monospace, monospace", fontSize: "16px", color: C.text }).setOrigin(0.5));
      const isBase = i < start;
      const stop = firstWrong !== -1 && i > firstWrong;
      this.animTimers.push(this.time.delayedCall(i * 300, () => {
        if (!cell.active || !val.active) return; // objects destroyed (exited/retried)
        if (stop) { cell.setFillStyle(0x2f343d); val.setText("·"); return; } // animation stopped
        val.setText(this.fmt(playerDP[i]));
        if (isBase) cell.setFillStyle(Phaser.Display.Color.HexStringToColor(C.base).color);
        else if (playerDP[i] === correctDP[i]) cell.setFillStyle(Phaser.Display.Color.HexStringToColor(C.good).color);
        else {
          cell.setFillStyle(Phaser.Display.Color.HexStringToColor(C.bad).color);
          keep(this.add.text(cx, yRow + 28, `want ${this.fmt(correctDP[i])}`, {
            fontFamily: "ui-monospace, monospace", fontSize: "12px", color: C.bad,
          }).setOrigin(0.5, 0));
        }
      }));
    }

    const stopIdx = allCorrect ? n : firstWrong;
    this.animTimers.push(this.time.delayedCall(stopIdx * 300 + 400, () => {
      if (!this.scene.isActive()) return;
      allCorrect ? this.victory(playerDP[n]) : this.failure(firstWrong, picks);
    }));
  }

  clearAnimTimers() {
    (this.animTimers || []).forEach((t) => t.remove(false));
    this.animTimers = [];
  }

  victory(answer) {
    const done = (this.npcRef ? this.completedCount() : 0) + 1;
    const total = scenarios.length;
    const p = this.add.rectangle(W / 2, 470, 620, 200, 0x0b1a0d, 0.97).setStrokeStyle(3, 0x2f9e44);
    this.animObjs.push(p);
    this.animObjs.push(this.add.text(W / 2, 400, "🎉  Task Complete!", {
      fontFamily: "system-ui", fontSize: "30px", color: "#8ce99a", fontStyle: "bold",
    }).setOrigin(0.5));
    this.animObjs.push(this.add.text(W / 2, 448, `Your recurrence solved it: F(${scenarios[this.index].input.length}) = ${answer}`, {
      fontFamily: "ui-monospace, monospace", fontSize: "16px", color: "#e8eaed",
    }).setOrigin(0.5));
    this.animObjs.push(this.add.text(W / 2, 486, `Tasks completed around town:  ${done} / ${total}`, {
      fontFamily: "system-ui", fontSize: "18px", color: "#f0b429", fontStyle: "bold",
    }).setOrigin(0.5));
    const b = this.makeButton(W / 2, 540, 240, 42, "Return to town  →", () => this.finish(true), 0x2f9e44);
    this.animObjs.push(b.rect, b.txt);
  }

  failure(cell, picks) {
    const wrong = [];
    if (!picks.p.correct) wrong.push("subproblems");
    if (!picks.c.correct) wrong.push("combine step");
    if (!picks.b.correct) wrong.push("base case");
    const p = this.add.rectangle(W / 2, 470, 640, 170, 0x1a0d0d, 0.97).setStrokeStyle(3, 0xe03131);
    this.animObjs.push(p);
    this.animObjs.push(this.add.text(W / 2, 410, "⛔  The recurrence broke down", {
      fontFamily: "system-ui", fontSize: "24px", color: "#ff8787", fontStyle: "bold",
    }).setOrigin(0.5));
    this.animObjs.push(this.add.text(W / 2, 452, `It stopped at cell ${cell}. Re-check your ${wrong.join(" and ")}.`, {
      fontFamily: "system-ui", fontSize: "15px", color: "#e8eaed", wordWrap: { width: 600 }, align: "center",
    }).setOrigin(0.5));
    const again = this.makeButton(W / 2 - 110, 510, 180, 40, "↻ Try again", () => this.retry(), 0x495057);
    const exit = this.makeButton(W / 2 + 110, 510, 160, 40, "Exit", () => this.finish(false), 0x6c757d);
    this.animObjs.push(again.rect, again.txt, exit.rect, exit.txt);
  }

  retry() {
    this.clearAnimTimers();
    (this.animObjs || []).forEach((o) => o.destroy());
    this.animObjs = [];
    this.setBuildUIVisible(true);
    this.exitBtn.rect.setVisible(true); this.exitBtn.txt.setVisible(true);
  }

  completedCount() {
    return this.npcRef ? scenarios.filter((_, i) => this.scene.get("OverworldScene").completed[i]).length : 0;
  }

  finish(success) {
    this.clearAnimTimers();
    const over = this.scene.get("OverworldScene");
    this.scene.stop();
    over.resolvePuzzle(this.index, success);
  }

  makeButton(x, y, w, h, label, onClick, fill = 0x3a4150) {
    const rect = this.add.rectangle(x, y, w, h, fill).setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontFamily: "system-ui", fontSize: "16px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    rect.on("pointerdown", () => onClick());
    rect.on("pointerover", () => rect.setFillStyle(fill + 0x0a0a0a));
    rect.on("pointerout", () => rect.setFillStyle(fill));
    return { rect, txt };
  }
}
