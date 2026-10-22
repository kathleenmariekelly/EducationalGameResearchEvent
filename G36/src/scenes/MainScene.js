// MainScene.js
//
// NAND Forge — build a target gate / truth table by wiring gates.
//
// Concept: gate universality & decomposition. The player ADDS gates and,
// for each gate, picks its input signal(s) from the pool of signals that
// exist so far (the circuit inputs A/B/C plus the outputs of earlier
// gates). Picking the same signal for both inputs is a single click, so
// NAND(a,a)=NOT a is a discoverable move, not a special case.
//
// The mechanic IS the concept: the player's clicks literally construct
// the circuit whose truth table is then checked against the target.
// Played across 10 escalating puzzles (5 NAND-only exact-budget, then 5
// mystery-truth-table puzzles with a full palette) for repeated, varied
// exposure to the same decomposition skill.

import { SCENARIOS } from "../scenarios.js";

const ARITY = { NOT: 1, NAND: 2, AND: 2, OR: 2, NOR: 2 };

function gateOp(type, vals) {
  const a = vals[0] ? 1 : 0;
  const b = vals[1] ? 1 : 0;
  switch (type) {
    case "NOT": return a ? 0 : 1;
    case "NAND": return a && b ? 0 : 1;
    case "AND": return a && b ? 1 : 0;
    case "OR": return a || b ? 1 : 0;
    case "NOR": return a || b ? 0 : 1;
    default: return 0;
  }
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.puzzleIndex = 0;
    this.ui = [];
    this.loadPuzzle(0);
  }

  loadPuzzle(i) {
    this.puzzleIndex = i;
    this.scn = SCENARIOS[i];
    this.gates = [];        // {type, ins:[signalId,...]}
    this.outputSel = null;  // signalId chosen as circuit output
    this.message = "";
    this.messageColor = "#9aa0a8";
    this.solved = false;
    this.revealed = false;
    this.showYou = false; // your output column hidden until you press Check
    this.scratch = new Array(1 << this.scn.inputs.length).fill(null); // player notes
    this.selectedGate = null; // which gate's scratch table is open
    this.gateScratch = {};    // gi -> array of null/0/1, player's per-gate prediction
    this.render();
  }

  // ---- circuit model helpers ----

  // signal ids that a gate at position `pos` may draw from: the puzzle
  // inputs plus outputs of gates strictly before it.
  sourcesFor(pos) {
    const src = this.scn.inputs.slice();
    for (let g = 0; g < pos; g++) src.push("g" + g);
    return src;
  }

  // all signals available to be the final output: inputs + every gate out
  outputSources() {
    return this.scn.inputs.concat(this.gates.map((_, g) => "g" + g));
  }

  evalSignal(id, inputVals) {
    if (id in inputVals) return inputVals[id];
    const gi = parseInt(id.slice(1), 10);
    const gate = this.gates[gi];
    const vals = gate.ins.map((s) => this.evalSignal(s, inputVals));
    return gateOp(gate.type, vals);
  }

  // returns {bits:[...], ok:bool} comparing current circuit to target
  computeTable() {
    const n = this.scn.inputs.length;
    const rows = 1 << n;
    const bits = [];
    let ok = this.outputSel !== null;
    for (let r = 0; r < rows; r++) {
      const inputVals = {};
      for (let k = 0; k < n; k++) {
        inputVals[this.scn.inputs[k]] = (r >> (n - 1 - k)) & 1;
      }
      let out = null;
      if (this.outputSel !== null) out = this.evalSignal(this.outputSel, inputVals);
      bits.push(out);
      if (out !== this.scn.target[r]) ok = false;
    }
    return { bits, ok };
  }

  // ---- rendering ----

  clearUI() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
  }

  txt(x, y, s, opts = {}) {
    const t = this.add.text(x, y, s, {
      fontFamily: "monospace",
      fontSize: opts.size || "14px",
      color: opts.color || "#e6e6e6",
      backgroundColor: opts.bg,
      padding: opts.bg ? { x: 6, y: 3 } : undefined,
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    }).setOrigin(opts.originX ?? 0, opts.originY ?? 0);
    if (opts.click) {
      t.setInteractive({ useHandCursor: true });
      t.on("pointerdown", opts.click);
    }
    this.ui.push(t);
    return t;
  }

  render() {
    this.clearUI();
    const s = this.scn;

    // ---- header ----
    this.txt(20, 12, `Puzzle ${this.puzzleIndex + 1}/${SCENARIOS.length}:  ${s.title}`, { size: "20px", color: "#7cf6d0" });
    this.txt(20, 42, s.blurb, { size: "13px", color: "#9aa0a8", wrap: 500 });
    if (s.exact) {
      const budgetColor = this.gates.length > s.budget ? "#ff6b6b" : "#e6e6e6";
      this.txt(20, 84, `Gates used: ${this.gates.length} / ${s.budget}  (must be exact)`, { color: budgetColor });
    } else {
      this.txt(20, 84, `Gates used: ${this.gates.length}  (solve it any way you like — a minimal version exists)`, { color: "#e6e6e6" });
    }

    // ---- target truth table (right column) ----
    this.renderTruthTable();

    // ---- palette buttons ----
    let px = 20;
    const py = 130;
    this.txt(20, py, "Add:", { color: "#9aa0a8" });
    px = 70;
    s.palette.forEach((type) => {
      const b = this.txt(px, py, ` ${type} `, {
        bg: "#2c3140", color: "#7cf6d0",
        click: () => this.addGate(type),
      });
      px += b.width + 10;
    });

    // ---- gate list ----
    let gy = 168;
    this.txt(20, gy, "Your circuit:", { color: "#9aa0a8" });
    gy += 26;
    if (this.gates.length === 0) {
      this.txt(36, gy, "(empty — add a gate above)", { size: "12px", color: "#6b7280" });
      gy += 24;
    }
    this.gates.forEach((gate, gi) => {
      const arity = ARITY[gate.type];
      const selected = this.selectedGate === gi;
      this.txt(36, gy, `g${gi} = ${gate.type}(`, {
        color: selected ? "#1d1f24" : "#e6e6e6",
        bg: selected ? "#7cf6d0" : undefined,
        click: () => { this.selectedGate = selected ? null : gi; this.render(); },
      });
      let cx = 36 + `g${gi} = ${gate.type}(`.length * 8.4 + (selected ? 12 : 0);
      for (let k = 0; k < arity; k++) {
        const chip = this.txt(cx, gy, ` ${gate.ins[k]} `, {
          bg: "#39405a", color: "#ffd479",
          click: () => this.cycleInput(gi, k),
        });
        cx += chip.width + 4;
        if (k < arity - 1) { this.txt(cx, gy, ",", {}); cx += 12; }
      }
      this.txt(cx, gy, ")", {});
      // delete
      this.txt(cx + 20, gy, " x ", {
        bg: "#4a2530", color: "#ff9aa2",
        click: () => this.removeGate(gi),
      });
      gy += 30;
    });

    // ---- output selector ----
    gy += 8;
    this.txt(20, gy, "Circuit output:", { color: "#9aa0a8" });
    const outLabel = this.outputSel === null ? " (none) " : ` ${this.outputSel} `;
    this.txt(150, gy, outLabel, {
      bg: "#2c3140", color: "#7cf6d0",
      click: () => this.cycleOutput(),
    });

    // ---- check + message ----
    gy += 40;
    this.txt(20, gy, " Check ", {
      bg: "#2f6b46", color: "#eafff2", size: "16px",
      click: () => this.check(),
    });
    if (this.solved) {
      this.txt(120, gy, this.revealed ? " Hide solution " : " Reveal minimal ", {
        bg: "#3a3560", color: "#dcd0ff", size: "16px",
        click: () => { this.revealed = !this.revealed; this.render(); },
      });
      this.txt(300, gy, " Next puzzle > ", {
        bg: "#2c3140", color: "#7cf6d0", size: "16px",
        click: () => this.nextPuzzle(),
      });
    }
    if (this.message) {
      this.txt(20, gy + 40, this.message, { color: this.messageColor, wrap: 520 });
    }
    if (this.revealed) {
      this.txt(20, gy + 74, "Minimal (" + s.minimalCount + " gates): " + s.reveal, { color: "#dcd0ff", size: "13px", wrap: 760 });
    }
  }

  renderTruthTable() {
    const s = this.scn;
    const n = s.inputs.length;
    const rows = 1 << n;
    const { bits } = this.computeTable();
    const inX = 560;
    const tgtX = inX + n * 18 + 20;
    const noteX = tgtX + 44;
    const youX = noteX + 56;
    let y = 130;
    this.txt(inX, y - 26, "Truth table", { color: "#9aa0a8" });
    this.txt(inX, y - 8, "'note' = your scratchpad (click to fill, not checked)", { size: "11px", color: "#6b7280" });
    // header
    this.txt(inX, y + 12, s.inputs.join(" "), { size: "13px", color: "#7cf6d0" });
    this.txt(tgtX, y + 12, "tgt", { size: "13px", color: "#7cf6d0" });
    this.txt(noteX, y + 12, "note", { size: "13px", color: "#ffd479" });
    if (this.showYou) {
      const label = this.outputSel === null ? "you" : "out(" + this.outputSel + ")";
      this.txt(youX, y + 12, label, { size: "13px", color: "#dcd0ff" });
    }
    y += 34;
    for (let r = 0; r < rows; r++) {
      const inbits = [];
      for (let k = 0; k < n; k++) inbits.push((r >> (n - 1 - k)) & 1);
      this.txt(inX, y, inbits.join(" "), { size: "13px", color: "#e6e6e6" });
      this.txt(tgtX, y, String(s.target[r]), { size: "13px", color: "#7cf6d0" });
      // scratchpad note cell (click cycles - / 0 / 1)
      const note = this.scratch[r];
      this.txt(noteX, y, ` ${note === null ? "." : note} `, {
        size: "13px", bg: "#332b1a", color: "#ffd479",
        click: () => this.cycleNote(r),
      });
      if (this.showYou) {
        const you = bits[r];
        const match = you === s.target[r];
        const youStr = you === null ? "-" : String(you);
        const color = you === null ? "#6b7280" : match ? "#7cf6d0" : "#ff6b6b";
        this.txt(youX, y, youStr, { size: "13px", color });
      }
      y += 22;
    }

    // per-gate scratch table for the selected gate
    if (this.selectedGate !== null && this.gates[this.selectedGate]) {
      const gi = this.selectedGate;
      y += 18;
      this.txt(inX, y, `Scratch: predict g${gi}'s output`, { size: "13px", color: "#7cf6d0" });
      y += 22;
      this.txt(inX, y, s.inputs.join(" "), { size: "13px", color: "#7cf6d0" });
      this.txt(noteX, y, `g${gi}`, { size: "13px", color: "#ffd479" });
      y += 22;
      if (!this.gateScratch[gi]) this.gateScratch[gi] = new Array(rows).fill(null);
      for (let r = 0; r < rows; r++) {
        const inbits = [];
        for (let k = 0; k < n; k++) inbits.push((r >> (n - 1 - k)) & 1);
        this.txt(inX, y, inbits.join(" "), { size: "13px", color: "#e6e6e6" });
        const gn = this.gateScratch[gi][r];
        this.txt(noteX, y, ` ${gn === null ? "." : gn} `, {
          size: "13px", bg: "#332b1a", color: "#ffd479",
          click: () => this.cycleGateNote(gi, r),
        });
        y += 22;
      }
    }
  }

  cycleGateNote(gi, r) {
    const cur = this.gateScratch[gi][r];
    this.gateScratch[gi][r] = cur === null ? 0 : cur === 0 ? 1 : null;
    this.render();
  }

  cycleNote(r) {
    const cur = this.scratch[r];
    this.scratch[r] = cur === null ? 0 : cur === 0 ? 1 : null;
    this.render();
  }

  // ---- actions ----

  addGate(type) {
    if (this.solved) return;
    const pos = this.gates.length;
    const src = this.sourcesFor(pos);
    const first = src[0];
    const arity = ARITY[type];
    const ins = [];
    for (let k = 0; k < arity; k++) ins.push(first);
    this.gates.push({ type, ins });
    this.message = "";
    this.showYou = false;
    this.render();
  }

  removeGate(gi) {
    if (this.solved) return;
    // remove gate and any later gate/output that referenced it (simplest:
    // drop everything after it too, to keep references valid)
    this.gates = this.gates.slice(0, gi);
    // invalidate output if it pointed at a removed gate
    if (this.outputSel && this.outputSel.startsWith("g")) {
      const idx = parseInt(this.outputSel.slice(1), 10);
      if (idx >= this.gates.length) this.outputSel = null;
    }
    // drop scratch tables + selection for gates that no longer exist
    Object.keys(this.gateScratch).forEach((k) => {
      if (parseInt(k, 10) >= this.gates.length) delete this.gateScratch[k];
    });
    if (this.selectedGate !== null && this.selectedGate >= this.gates.length) this.selectedGate = null;
    this.message = "";
    this.showYou = false;
    this.render();
  }

  cycleInput(gi, k) {
    if (this.solved) return;
    const src = this.sourcesFor(gi);
    const cur = src.indexOf(this.gates[gi].ins[k]);
    this.gates[gi].ins[k] = src[(cur + 1) % src.length];
    this.showYou = false;
    this.render();
  }

  cycleOutput() {
    if (this.solved) return;
    const src = this.outputSources();
    if (src.length === 0) return;
    if (this.outputSel === null) {
      this.outputSel = src[0];
    } else {
      const cur = src.indexOf(this.outputSel);
      this.outputSel = src[(cur + 1) % src.length];
    }
    this.showYou = false;
    this.render();
  }

  check() {
    const s = this.scn;
    this.showYou = true; // reveal your output column now that you've committed
    if (this.outputSel === null) {
      this.message = "Pick a circuit output first.";
      this.messageColor = "#ffd479";
      this.render();
      return;
    }
    if (s.exact && this.gates.length > s.budget) {
      this.message = `Over budget: ${this.gates.length} gates, max ${s.budget}.`;
      this.messageColor = "#ff6b6b";
      this.render();
      return;
    }
    const { ok } = this.computeTable();
    if (!ok) {
      this.message = "Not matching yet — check the red rows in the table.";
      this.messageColor = "#ff6b6b";
      this.render();
      return;
    }
    if (s.exact && this.gates.length !== s.budget) {
      this.message = `Correct output, but this puzzle wants exactly ${s.budget} gates. Find the canonical form.`;
      this.messageColor = "#ffd479";
      this.render();
      return;
    }
    this.solved = true;
    const extra = this.gates.length > s.minimalCount
      ? `  You used ${this.gates.length}; it can be done in ${s.minimalCount}. Try Reveal minimal.`
      : "  That's the minimal construction — nice.";
    this.message = "Solved! " + extra;
    this.messageColor = "#7cf6d0";
    this.render();
  }

  nextPuzzle() {
    const next = (this.puzzleIndex + 1) % SCENARIOS.length;
    if (this.puzzleIndex + 1 >= SCENARIOS.length) {
      this.loadPuzzle(0);
      this.message = "You cycled through all puzzles — back to the start.";
      this.messageColor = "#9aa0a8";
      this.render();
      return;
    }
    this.loadPuzzle(next);
  }
}
