// MainScene.js
//
// !!! AI VISUAL LIMITATION -- READ THIS !!!
// The AI assistant CANNOT see the rendered game. Layout, spacing, overlaps,
// colors, drag-and-drop feel, and animations are all written BLIND and are not
// verified by any automated test. Automated tests here only prove the circuit
// LOGIC is correct (see test/logic.test.mjs). Anything visual/interactive must
// be checked by a human: run `npx serve .`, play it, and if something looks or
// feels wrong, save a screenshot into the project so the AI can read the image
// and fix it. Treat all positioning/visual code below as unverified.
//
// Concept: Reproduce a target logic function by composing gates, then reason
// about the resulting truth table. (CSCI 341: Boolean logic / truth tables.)
//
// Board: two gate slots fed by inputs A and B, feeding a third slot, whose
// output drives the result. The player DRAGS gate shapes from the left bank
// into the slots; wires carry live signal color for the probed (A,B) input;
// the truth table updates as the circuit changes. Difficulty fades the live
// YOU column (easy full / medium partial / hard hidden until commit, with a
// hand-fill-your-own-table penalty on a wrong commit).

import { PALETTE, INPUT_ROWS, truthVector, evalCircuit, rowMatches, vectorsEqual } from "../logic.js";
import { fixedCircuit, findLock } from "../scenarios.js";
import { NODES, createMastery, isMastered, pickNode, buildRoundFromNode, recordResult } from "../conceptTree.js";
import { drawGate } from "../gateShapes.js";

const MAX_TRIES = 4;

const COL = {
  bg: 0x161a20, panel: 0x20262f, panel2: 0x2a3340, slot: 0x1b222b,
  ink: "#e8edf2", dim: "#8b97a6", gold: "#ffcf5c", good: "#5fd08a",
  bad: "#ff6b6b", accent: "#5cc8ff", wireOff: 0x46515f, wireOn: 0x5fd08a,
};
const F = "system-ui, sans-serif";

export default class MainScene extends Phaser.Scene {
  constructor() { super("MainScene"); }

  create() {
    this.difficulty = null;
    this.tries = MAX_TRIES;
    this.solved = 0;
    this.mastery = createMastery();     // concept-tree progress (New Game)
    this.slots = [null, null, null];   // gate type per slot, or null
    this.lockedIndex = null;           // slot index that is pre-placed & immovable
    this.probe = { A: 0, B: 0 };       // which input row we're lighting up
    this.penalty = null;
    this.revealAll = false;
    this.drag = null;                  // { type, ghost }

    // Scene-level drag handlers (added once).
    this.input.on("pointermove", (p) => {
      if (this.drag && this.drag.ghost) this.drag.ghost.setPosition(p.x - this.drag.w / 2, p.y - this.drag.h / 2);
    });
    this.input.on("pointerup", (p) => this.onDrop(p));

    // DEV/PREVIEW shortcut: keys 3/4/5 load a 3/4/5-gate board immediately so
    // the variable-size boards can be inspected without grinding the tree.
    this.input.keyboard.on("keydown-THREE", () => this.difficulty && this.previewTemplate(3));
    this.input.keyboard.on("keydown-FOUR", () => this.difficulty && this.previewTemplate(4));
    this.input.keyboard.on("keydown-FIVE", () => this.difficulty && this.previewTemplate(5));

    this.showTitle();
  }

  // ---- Title -------------------------------------------------------------
  showTitle() {
    this.clearAll();
    this.add.rectangle(500, 320, 1000, 640, COL.bg).setDepth(-1);
    this.add.text(500, 74, "LEGALLY DISTINCT", { fontFamily: F, fontSize: "20px", color: COL.dim, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(500, 108, "TREASURE CIRCUIT STORM", { fontFamily: F, fontSize: "42px", color: COL.gold, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(500, 150, "Drag gates onto the wired slots so YOUR truth table matches the GOAL.", { fontFamily: F, fontSize: "16px", color: COL.dim }).setOrigin(0.5);

    const modes = [
      ["EASY", "easy", "Whole YOUR-column updates live. Probe A/B to watch wires light up."],
      ["MEDIUM", "medium", "Only some rows update live -- you infer the rest before committing."],
      ["HARD", "hard", "Table hidden until commit. Wrong? Hand-trace your own truth table."],
    ];
    modes.forEach(([label, key, desc], i) => {
      const y = 230 + i * 96;
      const box = this.add.rectangle(500, y, 620, 78, COL.panel).setStrokeStyle(2, COL.panel2).setInteractive({ useHandCursor: true });
      this.add.text(220, y - 15, label, { fontFamily: F, fontSize: "24px", color: COL.accent, fontStyle: "bold" });
      this.add.text(220, y + 16, desc, { fontFamily: F, fontSize: "13px", color: COL.dim });
      box.on("pointerover", () => box.setStrokeStyle(2, COL.accent));
      box.on("pointerout", () => box.setStrokeStyle(2, COL.panel2));
      box.on("pointerdown", () => this.startGame(key));
    });
  }

  startGame(difficulty) {
    this.difficulty = difficulty;
    this.tries = MAX_TRIES;
    this.solved = 0;
    this.mastery = createMastery(); // New Game; Resume (persisted) is a later step
    this.nextRound();
  }

  // ---- Rounds ------------------------------------------------------------
  nextRound(avoidRepeat = false) {
    // The concept tree chooses the next puzzle: an unmastered node whose
    // prereqs are met, biased toward this difficulty's tier band.
    const prevId = avoidRepeat && this.round ? this.round.nodeId : null;
    const node = pickNode(this.mastery, this.difficulty, prevId);

    // Circuit COMPLEXITY is set by difficulty (not the concept):
    //   easy   -> 1 gate  : place the gate that matches the truth table.
    //   medium -> 3 gates : a helper gate is locked in; build around it.
    //   hard   -> 3-5 gate composition (deep nodes bring bigger templates).
    const templateId = this.difficulty === "easy" ? "T1"
      : this.difficulty === "medium" ? "T3"
      : (node.template || "T3");
    this.round = buildRoundFromNode(node, templateId);

    // Medium always pre-places an immovable helper gate to build around.
    const wantLock = this.difficulty === "medium" && this.round.nCells === 3;
    if (wantLock) {
      const lock = findLock(this.round.goal);
      if (lock) { this.round.lockIndex = lock.index; this.round.lockGate = lock.gate; }
    }

    this.slots = new Array(this.round.nCells).fill(null);
    this.lockedIndex = this.round.lockIndex;
    if (this.lockedIndex != null) this.slots[this.lockedIndex] = this.round.lockGate;
    this.probe = { A: 0, B: 0 };
    this.penalty = null;
    this.revealAll = false;
    this.message = this.difficulty === "easy"
      ? "Drag the ONE gate whose YOU column matches the GOAL column."
      : this.lockedIndex != null
        ? `A ${this.round.lockGate} is locked in place — build the other slots around it.`
        : `Build the ${this.round.nCells}-gate circuit so YOU matches GOAL.`;
    this.render();
  }

  // DEV: preview a board of a given size with a random solvable target.
  previewTemplate(size) {
    const tid = size === 5 ? "T5" : size === 4 ? "T4" : "T3";
    const targets = ["AND", "OR", "XOR", "XNOR", "NAND", "NOR"];
    const name = targets[Math.floor(Math.random() * targets.length)];
    const node = { id: "preview_" + tid, label: name, target: name, tier: 0, prereqs: [], template: tid,
                   blurb: `Preview: build ${name} in a ${size}-gate circuit.` };
    this.round = buildRoundFromNode(node);
    this.slots = new Array(this.round.nCells).fill(null);
    this.lockedIndex = null; this.probe = { A: 0, B: 0 };
    this.penalty = null; this.revealAll = false;
    this.message = `Preview: ${size}-gate board (dev shortcut — press 3/4/5).`;
    this.render();
  }

  // ---- Circuit helpers ---------------------------------------------------
  allFilled() { return this.slots.every((s) => s); }
  currentCircuit() {
    return this.round.template.map((s, i) => ({ gate: this.slots[i] || "WIRE", in1: s[0], in2: s[1] }));
  }
  youVector() { return this.allFilled() ? truthVector(this.currentCircuit()) : null; }

  liveRows() {
    if (this.difficulty === "easy") return [0, 1, 2, 3];
    if (this.difficulty === "medium") return [0, 3];
    return [];
  }

  // ---- Drag & drop -------------------------------------------------------
  startDrag(type, pointer) {
    if (this.penalty) return;
    const w = 96, h = 56;
    const ghost = drawGate(this, type, w, h, { fill: COL.panel2, stroke: 0x5cc8ff });
    ghost.setAlpha(0.85).setDepth(1000).setPosition(pointer.x - w / 2, pointer.y - h / 2);
    this.drag = { type, ghost, w, h };
  }
  onDrop(pointer) {
    if (!this.drag) return;
    const hit = this.slotBounds.find((s) => pointer.x >= s.x && pointer.x <= s.x + s.w && pointer.y >= s.y && pointer.y <= s.y + s.h);
    if (hit && hit.index === this.lockedIndex) {
      this.message = "That slot is locked — build around it.";
    } else if (hit) {
      this.slots[hit.index] = this.drag.type;
      this.message = this.allFilled() ? "All slots filled -- probe A/B or COMMIT." : "Keep filling the slots.";
    }
    this.drag.ghost.destroy();
    this.drag = null;
    this.render();
  }
  clearSlot(i) {
    if (this.penalty || i === this.lockedIndex) return;
    this.slots[i] = null;
    this.message = "Slot cleared.";
    this.render();
  }

  // ---- Commit / penalty --------------------------------------------------
  commit() {
    if (this.penalty) return;
    if (!this.allFilled()) { this.message = "Fill all three slots first."; this.render(); return; }
    const you = this.youVector();
    if (vectorsEqual(you, this.round.goal)) {
      this.solved++;
      recordResult(this.mastery, this.round.nodeId, true);
      this.revealAll = true;
      const nowMastered = isMastered(this.mastery, this.round.nodeId);
      this.message = "SOLVED! You built " + this.round.name + "." + (nowMastered ? "  ⭐ Concept mastered!" : "  (solve once more to master it.)");
      this.render();
      this.time.delayedCall(1200, () => { this.tries = MAX_TRIES; this.nextRound(true); });
      return;
    }
    // Wrong commit resets this concept's mastery streak.
    recordResult(this.mastery, this.round.nodeId, false);
    if (this.difficulty === "hard") {
      this.penalty = { actual: you, guesses: [null, null, null, null], revealTruth: false };
      this.message = "Wrong. Trace YOUR circuit: click each YOUR cell to fill 0/1.";
    } else {
      this.revealAll = true;
      this.message = "Not a match. Compare YOUR vs GOAL, fix the red rows, try again.";
    }
    this.render();
  }
  penaltyCell(row) {
    const g = this.penalty.guesses[row];
    this.penalty.guesses[row] = g === null ? 0 : g === 0 ? 1 : null;
    this.render();
  }
  penaltySubmit() {
    const p = this.penalty;
    if (p.guesses.some((g) => g === null)) { this.message = "Fill every YOUR cell first."; this.render(); return; }
    const correct = p.guesses.every((g, i) => g === p.actual[i]);
    if (!correct) { p.revealTruth = true; this.message = "Some traces were off -- the true YOUR column is shown. Study it."; this.render(); return; }
    this.tries -= 1;
    if (this.tries <= 0) {
      this.message = "Knocked down the mountain! Reset and climb back up.";
      this.render();
      this.time.delayedCall(1500, () => { this.tries = MAX_TRIES; this.nextRound(true); });
    } else {
      this.message = "Good trace. New target -- " + this.tries + " tries left.";
      this.render();
      this.time.delayedCall(1100, () => this.nextRound(true));
    }
  }

  // ---- Render ------------------------------------------------------------
  clearAll() { this.children.removeAll(); }

  render() {
    this.clearAll();
    this.add.rectangle(500, 320, 1000, 640, COL.bg).setDepth(-1);

    // Header
    this.add.text(24, 18, "LEGALLY DISTINCT TREASURE CIRCUIT STORM", { fontFamily: F, fontSize: "16px", color: COL.gold, fontStyle: "bold" });
    const masteredCount = NODES.filter((n) => isMastered(this.mastery, n.id)).length;
    this.add.text(24, 44, `Mode ${this.difficulty.toUpperCase()}   Solved ${this.solved}   Tries ${this.tries}   Concepts ${masteredCount}/${NODES.length}`, { fontFamily: F, fontSize: "13px", color: COL.dim });
    const menu = this.add.text(976, 22, "\u2039 menu", { fontFamily: F, fontSize: "14px", color: COL.dim }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => this.showTitle());

    // Target
    this.add.text(24, 72, "GOAL: build " + this.round.name, { fontFamily: F, fontSize: "18px", color: COL.gold, fontStyle: "bold" });
    this.add.text(24, 96, this.round.blurb, { fontFamily: F, fontSize: "12px", color: COL.dim });

    this.renderBank();
    this.renderBoard();
    this.renderTable();
    this.renderControls();

    if (this.message)
      this.add.text(500, 616, this.message, { fontFamily: F, fontSize: "14px", color: COL.ink, align: "center", wordWrap: { width: 960 } }).setOrigin(0.5);
  }

  renderBank() {
    const x = 20, y0 = 130, w = 120, h = 44, gap = 10;
    this.add.text(x, y0 - 22, "GATE BANK  (drag \u2192)", { fontFamily: F, fontSize: "12px", color: COL.dim });
    PALETTE.forEach((type, i) => {
      const y = y0 + i * (h + gap);
      const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, COL.panel).setStrokeStyle(2, COL.panel2).setInteractive({ useHandCursor: true });
      const gate = drawGate(this, type, w - 18, h - 12, { fill: COL.panel2, stroke: 0x5cc8ff });
      gate.setPosition(x + 9, y + 6);
      bg.on("pointerdown", (p) => this.startDrag(type, p));
    });
  }

  renderBoard() {
    const sources = this.round.template;
    const n = sources.length;
    const gw = 100, gh = 58;
    const inputX = 198, aY = 250, bY = 402;
    const colX0 = 300, colGap = 132, yTop = 182, yBot = 452;

    // Layer of each slot (0 = fed only by primary inputs). Templates reference
    // only earlier slots, so a single forward pass suffices.
    const layer = new Array(n);
    const srcLayer = (id) => (id === "A" || id === "B" ? 0 : layer[parseInt(id.slice(1), 10)] + 1);
    for (let i = 0; i < n; i++) layer[i] = Math.max(srcLayer(sources[i][0]), srcLayer(sources[i][1]));
    const maxLayer = Math.max(...layer);

    // Position each slot: x by layer, y spread within its layer column.
    const byLayer = {};
    layer.forEach((L, i) => { (byLayer[L] = byLayer[L] || []).push(i); });
    const pos = new Array(n);
    for (let L = 0; L <= maxLayer; L++) {
      const idxs = byLayer[L] || [];
      idxs.forEach((i, k) => {
        const cy = idxs.length === 1 ? (yTop + yBot) / 2 : yTop + (yBot - yTop) * (k / (idxs.length - 1));
        pos[i] = { cx: colX0 + L * colGap, cy };
      });
    }
    const outX = colX0 + maxLayer * colGap + gw / 2 + 48;
    const outY = pos[n - 1].cy;

    const inTop = (p) => ({ x: p.cx - gw / 2, y: p.cy - gh * 0.24 });
    const inBot = (p) => ({ x: p.cx - gw / 2, y: p.cy + gh * 0.24 });
    const outPin = (p) => ({ x: p.cx + gw / 2, y: p.cy });

    // Live signal values for wire coloring (WIRE fallback for empty slots).
    const vals = evalCircuit(this.currentCircuit(), this.probe.A, this.probe.B).cellVals;
    const wireColor = (v) => (v === 1 ? COL.wireOn : COL.wireOff);

    const g = this.add.graphics();
    // Route with an elbow in a per-input vertical channel just left of the
    // target pin (chan 0/1 separates a slot's two inputs so they don't overlap).
    const wire = (x1, y1, x2, y2, v, chan = 0) => {
      g.lineStyle(4, wireColor(v), 1);
      let mx = x2 - 20 - 12 * chan;
      if (mx <= x1 + 8) mx = x1 + (x2 - x1) * 0.5;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(mx, y1); g.lineTo(mx, y2); g.lineTo(x2, y2); g.strokePath();
    };
    // Resolve a source id to a screen point + live value.
    const srcPointVal = (id) => {
      if (id === "A") return { x: inputX, y: aY, v: this.probe.A };
      if (id === "B") return { x: inputX, y: bY, v: this.probe.B };
      const k = parseInt(id.slice(1), 10);
      return { x: outPin(pos[k]).x, y: outPin(pos[k]).y, v: vals[k] };
    };

    // Wires first (under gates). in1 -> top pin, in2 -> bottom pin.
    for (let i = 0; i < n; i++) {
      const s1 = srcPointVal(sources[i][0]);
      const s2 = srcPointVal(sources[i][1]);
      wire(s1.x, s1.y, inTop(pos[i]).x, inTop(pos[i]).y, s1.v, 0);
      wire(s2.x, s2.y, inBot(pos[i]).x, inBot(pos[i]).y, s2.v, 1);
    }
    // Output wire
    wire(outPin(pos[n - 1]).x, outPin(pos[n - 1]).y, outX, outY, vals[n - 1]);

    // Input pins A, B (clickable probe toggles).
    [["A", aY, this.probe.A], ["B", bY, this.probe.B]].forEach(([lbl, y, v]) => {
      g.fillStyle(wireColor(v), 1); g.fillCircle(inputX, y, 9);
      this.add.text(inputX - 28, y - 11, lbl, { fontFamily: F, fontSize: "18px", color: COL.gold, fontStyle: "bold" });
      this.add.text(inputX, y, String(v), { fontFamily: F, fontSize: "13px", color: "#161a20", fontStyle: "bold" }).setOrigin(0.5);
      const hit = this.add.circle(inputX, y, 15, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => { this.probe[lbl] = this.probe[lbl] ? 0 : 1; this.render(); });
    });

    // Output pin
    g.fillStyle(wireColor(vals[n - 1]), 1); g.fillCircle(outX, outY, 10);
    this.add.text(outX + 14, outY - 10, "OUT", { fontFamily: F, fontSize: "15px", color: COL.gold, fontStyle: "bold" });

    // Slots (drop targets) + gate shapes.
    this.slotBounds = [];
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      this.slotBounds.push({ index: i, x: p.cx - gw / 2, y: p.cy - gh / 2, w: gw, h: gh });
      const empty = !this.slots[i];
      const locked = i === this.lockedIndex;
      const rect = this.add.rectangle(p.cx, p.cy, gw, gh, COL.slot)
        .setStrokeStyle(2, empty ? COL.wireOff : locked ? COL.gold : 0x5cc8ff)
        .setInteractive({ useHandCursor: true });
      if (empty) {
        this.add.text(p.cx, p.cy, "drop", { fontFamily: F, fontSize: "12px", color: COL.dim }).setOrigin(0.5);
      } else {
        const gate = drawGate(this, this.slots[i], gw - 16, gh - 16, { fill: COL.panel2, stroke: locked ? 0xffcf5c : 0x5cc8ff });
        gate.setPosition(p.cx - (gw - 16) / 2, p.cy - (gh - 16) / 2);
        if (locked) this.add.text(p.cx, p.cy - gh / 2 - 9, "🔒", { fontFamily: F, fontSize: "12px", color: COL.gold }).setOrigin(0.5);
        else rect.on("pointerdown", () => this.clearSlot(i));
      }
    }

    this.add.text(198, 472, "Click A/B pins to flip inputs and watch wires light up. Click a placed gate to remove it.",
      { fontFamily: F, fontSize: "11px", color: COL.dim, wordWrap: { width: 470 } });
  }

  renderTable() {
    const x0 = 720, y0 = 130, rowH = 66, cw = 66;
    const cols = ["A", "B", "GOAL", "YOU"];
    cols.forEach((c, ci) => {
      const cx = x0 + ci * cw + cw / 2;
      const color = c === "GOAL" ? COL.gold : c === "YOU" ? COL.accent : COL.ink;
      this.add.text(cx, y0, c, { fontFamily: F, fontSize: "16px", color, fontStyle: "bold" }).setOrigin(0.5);
    });

    const you = this.youVector();
    const live = this.liveRows();
    const goal = this.round.goal;
    const matches = you ? rowMatches(you, goal) : [false, false, false, false];
    const revealTruth = this.penalty && this.penalty.revealTruth;
    const showYou = (r) => this.revealAll || revealTruth || live.includes(r);

    INPUT_ROWS.forEach((r, ri) => {
      const y = y0 + 34 + ri * rowH;
      const probed = this.probe.A === r.A && this.probe.B === r.B;
      if (probed) this.add.rectangle(x0 + 2 * cw, y, 4 * cw - 6, rowH - 10, 0x2a334066);
      if (this.revealAll || revealTruth) this.add.rectangle(x0 + 3.5 * cw, y, cw - 8, rowH - 12, matches[ri] ? 0x1f3a2a : 0x3a2222);

      this.add.text(x0 + 0 * cw + cw / 2, y, String(r.A), { fontFamily: F, fontSize: "20px", color: COL.dim }).setOrigin(0.5);
      this.add.text(x0 + 1 * cw + cw / 2, y, String(r.B), { fontFamily: F, fontSize: "20px", color: COL.dim }).setOrigin(0.5);
      this.add.text(x0 + 2 * cw + cw / 2, y, String(goal[ri]), { fontFamily: F, fontSize: "22px", color: COL.gold }).setOrigin(0.5);

      const yx = x0 + 3 * cw + cw / 2;
      if (this.penalty && !revealTruth) {
        const gss = this.penalty.guesses[ri];
        const label = gss === null ? "?" : String(gss);
        const cell = this.add.rectangle(yx, y, 40, 40, COL.panel2).setStrokeStyle(2, COL.accent).setInteractive({ useHandCursor: true });
        this.add.text(yx, y, label, { fontFamily: F, fontSize: "22px", color: gss === null ? COL.dim : COL.accent }).setOrigin(0.5);
        cell.on("pointerdown", () => this.penaltyCell(ri));
      } else if (!you) {
        this.add.text(yx, y, "\u2013", { fontFamily: F, fontSize: "22px", color: COL.wireOff }).setOrigin(0.5);
      } else if (showYou(ri)) {
        const c = (this.revealAll || revealTruth) ? (matches[ri] ? COL.good : COL.bad) : COL.accent;
        this.add.text(yx, y, String(you[ri]), { fontFamily: F, fontSize: "22px", color: c }).setOrigin(0.5);
      } else {
        this.add.text(yx, y, "?", { fontFamily: F, fontSize: "22px", color: COL.wireOff }).setOrigin(0.5);
      }
    });
  }

  renderControls() {
    if (this.penalty && !this.penalty.revealTruth) {
      this.button(500, 540, "SUBMIT YOUR TABLE", COL.accent, () => this.penaltySubmit());
    } else if (this.penalty && this.penalty.revealTruth) {
      this.button(500, 540, "CONTINUE", "#ffcf5c", () => { if (this.tries <= 0) this.tries = MAX_TRIES; this.nextRound(true); });
    } else {
      this.button(410, 540, "COMMIT", COL.good, () => this.commit());
      this.button(590, 540, "CLEAR ALL", COL.dim, () => {
        this.slots = new Array(this.round.nCells).fill(null);
        if (this.lockedIndex != null) this.slots[this.lockedIndex] = this.round.lockGate;
        this.revealAll = false; this.message = "Board cleared."; this.render();
      });
    }
  }

  // ---- UI utils ----------------------------------------------------------
  button(x, y, label, color, cb) {
    const w = Math.max(150, label.length * 11 + 40);
    const box = this.add.rectangle(x, y, w, 44, COL.panel).setStrokeStyle(2, toInt(color)).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: F, fontSize: "15px", color: color, fontStyle: "bold" }).setOrigin(0.5);
    box.on("pointerover", () => box.setFillStyle(COL.panel2));
    box.on("pointerout", () => box.setFillStyle(COL.panel));
    box.on("pointerdown", cb);
    return box;
  }
}

function toInt(s) { return typeof s === "number" ? s : parseInt(String(s).replace("#", ""), 16); }
