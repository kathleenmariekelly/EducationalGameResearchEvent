// MainScene.js
//
// FUNCTION FACTORY
//
// Learning objective (capability-level): after playing, the player can
// recognize that a function is a VALUE that can be stored and handed off,
// and that the receiver — not the caller — decides when to invoke it.
//
// Misconception targeted: "a function is only something you call." Here the
// player never calls a tool. They hand a tool (a function value, see
// scenarios.js `TOOLS[*].fn`) to an employee (a receiver), press Run, and
// the employee calls it once per item. Different function handed out =>
// different behavior from the same conveyor => "function as value" made
// physical. Order of employees => function composition.
//
// Mechanic is intrinsic: strip away the factory theme and you still have
// "select functions and pass them to receivers that apply them in sequence."

import { SCENARIOS, TOOLS, describe } from "../scenarios.js";

// NOTE: canvas is 800x680 (see main.js).

const COLORS = {
  gray: 0x8a9098,
  red: 0xd6403b,
  blue: 0x3b6fd6,
  purple: 0x9a3bd6,
};

const STATION_Y = 300;
const BELT_LEFT = 70;
const BELT_RIGHT = 740;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.roundIndex = 0;
    this.buildRound();
  }

  // ---- Round lifecycle --------------------------------------------------
  buildRound() {
    this.children.removeAll();
    this.selectedTool = null;
    this.running = false;
    this.toolButtons = [];
    this.slotZones = [];

    const s = SCENARIOS[this.roundIndex];
    this.scenario = s;
    this.assignments = new Array(s.stations).fill(null);

    // Header
    this.add.text(400, 22, "FUNCTION FACTORY", {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff",
    }).setOrigin(0.5, 0);
    this.add.text(400, 50, s.title, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#9aa0a8",
    }).setOrigin(0.5, 0);

    // What arrives on the belt this round.
    this.add.text(400, 72,
      "Raw material arriving on the belt: " + describe(s.raw),
      { fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#8fd0ff" }
    ).setOrigin(0.5);

    // Client order card (top-left)
    this.drawOrderCard(s);

    // Little preview of the raw item sitting at the belt entrance.
    this.drawItem({ ...s.raw }, BELT_LEFT - 30, STATION_Y + 6, 0.65);
    this.add.text(BELT_LEFT - 30, STATION_Y + 40, "raw", {
      fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#6b7178",
    }).setOrigin(0.5);

    // Conveyor belt line
    this.add.rectangle((BELT_LEFT + BELT_RIGHT) / 2, STATION_Y + 46, BELT_RIGHT - BELT_LEFT + 40, 10, 0x3a3f47);

    // Employee stations
    this.stationX = [];
    const gap = (BELT_RIGHT - 40 - BELT_LEFT) / s.stations;
    for (let i = 0; i < s.stations; i++) {
      const x = BELT_LEFT + gap * i + gap / 2;
      this.stationX.push(x);
      this.drawStation(i, x);
    }
    this.outputX = BELT_RIGHT + 10;

    // Tool tray
    this.drawTray(s);

    // Instruction line
    this.instr = this.add.text(400, 526,
      "Each tool is a set of instructions (a function) \u2014 not a machine. Hand it to an employee; they follow it, you never do.",
      { fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#c7ccd2" }
    ).setOrigin(0.5);

    // Run button
    this.runBtn = this.makeButton(400, 616, "\u25B6  RUN THE BELT", 0x2e7d32, () => this.runBelt());

    // Result text (hidden until run)
    this.resultText = this.add.text(400, 562, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "15px", color: "#ffd54f",
      align: "center", wordWrap: { width: 720 },
    }).setOrigin(0.5);
  }

  drawOrderCard(s) {
    const x = 130, y = 120;
    this.add.rectangle(x, y, 200, 150, 0x272b31).setStrokeStyle(2, 0x4a5058);
    this.add.text(x, y - 62, "CLIENT ORDER", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffd54f",
    }).setOrigin(0.5);
    this.drawItem(s.target, x, y - 5, 1.0);
    this.add.text(x, y + 55, "Wants: " + describe(s.target), {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#c7ccd2",
      align: "center", wordWrap: { width: 185 },
    }).setOrigin(0.5);
  }

  drawStation(i, x) {
    // Employee body
    this.add.circle(x, STATION_Y - 40, 16, 0xf0c27b); // head
    this.add.rectangle(x, STATION_Y - 8, 34, 34, 0x5b7fb0).setStrokeStyle(2, 0x2b3c55); // body
    this.add.text(x, STATION_Y - 66, "Employee " + (i + 1), {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#9aa0a8",
    }).setOrigin(0.5);

    // Tool slot
    const slot = this.add.rectangle(x, STATION_Y + 78, 96, 30, 0x1a1c20)
      .setStrokeStyle(2, 0x4a5058).setInteractive({ useHandCursor: true });
    const label = this.add.text(x, STATION_Y + 78, "(no instructions)", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#6b7178",
    }).setOrigin(0.5);
    slot.on("pointerdown", () => this.onSlotClick(i));
    this.slotZones.push({ slot, label });
  }

  drawTray(s) {
    const startX = 70, y = 440, gap = 110;
    this.add.text(70, 410, "TOOLBOX \u2014 each tool is a written instruction (a function), not a gadget:", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#9aa0a8",
    }).setOrigin(0, 0.5);
    s.tools.forEach((id, idx) => {
      const t = TOOLS[id];
      const bx = startX + (idx % 4) * gap;
      const by = y + Math.floor(idx / 4) * 38;
      const rect = this.add.rectangle(bx, by, 98, 30, 0x33383f)
        .setStrokeStyle(2, 0x5a616a).setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx, by, "\u2261 " + t.label, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#ffffff",
      }).setOrigin(0.5);
      rect.on("pointerdown", () => this.selectTool(id, rect));
      rect.on("pointerover", () => { if (this.selectedToolId !== id) this.showHint("Instructions \u2014 " + t.hint); });
      rect.on("pointerout", () => this.showHint(""));
      this.toolButtons.push({ id, rect, txt });
    });
    this.hintText = this.add.text(70, 506, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#8fd0ff",
    }).setOrigin(0, 0.5);
  }

  showHint(msg) {
    if (this.hintText) this.hintText.setText(msg);
  }

  selectTool(id, rect) {
    if (this.running) return;
    this.selectedTool = TOOLS[id];
    this.selectedToolId = id;
    this.toolButtons.forEach((b) =>
      b.rect.setStrokeStyle(2, b.id === id ? 0xffd54f : 0x5a616a)
    );
    this.instr.setText(TOOLS[id].label + " is a set of instructions. Click an employee to hand it over \u2014 they'll follow it, not you.");
  }

  onSlotClick(i) {
    if (this.running) return;
    if (this.selectedTool) {
      this.assignments[i] = this.selectedToolId;
      this.slotZones[i].label.setText("follows: " + this.selectedTool.label);
      this.slotZones[i].label.setColor("#ffffff");
    } else if (this.assignments[i]) {
      // Click an assigned slot with nothing selected -> clear it.
      this.assignments[i] = null;
      this.slotZones[i].label.setText("(no instructions)");
      this.slotZones[i].label.setColor("#6b7178");
    } else {
      this.instr.setText("Pick a tool from the toolbox first, then click an employee.");
    }
  }

  // ---- Running the belt -------------------------------------------------
  runBelt() {
    if (this.running) return;
    this.running = true;
    this.resultText.setText("");
    this.showHint("");
    this.instr.setText("The belt is running \u2014 each employee is just FOLLOWING the instructions you handed them, on every item.");

    // Send a small batch so players see the same function reused per item.
    this.sendItem(0, 3);
  }

  sendItem(itemNum, total) {
    const s = this.scenario;
    let state = { ...s.raw };
    const container = this.drawItem(state, BELT_LEFT - 20, STATION_Y + 6, 0.8);

    const stops = [...this.stationX, this.outputX];
    let step = 0;

    const next = () => {
      if (step >= this.stationX.length) {
        // Move to output bin, then finish this item.
        this.tweens.add({
          targets: container, x: this.outputX, duration: 500, ease: "Sine.easeInOut",
          onComplete: () => {
            container.destroy();
            if (itemNum + 1 < total) {
              this.sendItem(itemNum + 1, total);
            } else {
              this.finishRun(state);
            }
          },
        });
        return;
      }
      const i = step;
      this.tweens.add({
        targets: container, x: this.stationX[i], duration: 450, ease: "Sine.easeInOut",
        onComplete: () => {
          const toolId = this.assignments[i];
          if (toolId) {
            // The RECEIVER calls the function value it was handed.
            state = TOOLS[toolId].fn(state);
            this.flashStation(this.stationX[i]);
            this.redrawItem(container, state, 0.8);
          }
          step++;
          next();
        },
      });
    };
    next();
  }

  flashStation(x) {
    const ring = this.add.circle(x, STATION_Y - 8, 26).setStrokeStyle(3, 0xffd54f);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.6, duration: 400, onComplete: () => ring.destroy() });
  }

  finishRun(finalState) {
    const s = this.scenario;
    const ok = this.matches(finalState, s.target);
    if (ok) {
      this.resultText.setColor("#9be29b");
      this.resultText.setText("\u2714 Order filled!  " + s.lesson);
      this.runBtn.disableInteractive();
      this.runBtn.setFillStyle(0x3a3f47);
      const last = this.roundIndex >= SCENARIOS.length - 1;
      this.nextBtn = this.makeButton(400, 652,
        last ? "\u2714 You finished all orders — replay?" : "NEXT ORDER \u25B6",
        0x1565c0,
        () => { this.roundIndex = last ? 0 : this.roundIndex + 1; this.buildRound(); });
    } else {
      this.resultText.setColor("#ff8a80");
      this.resultText.setText(
        "\u2718 Client rejected it. You produced " + describe(finalState) +
        ".\nWhich functions did each employee call, and in what order? Reassign and run again.");
      this.running = false;
    }
  }

  matches(a, b) {
    if (a.wrapped !== b.wrapped) return false;
    // If wrapped, underlying attributes still must match what was sealed in.
    return a.shape === b.shape && a.color === b.color && a.finish === b.finish;
  }

  // ---- Item rendering ---------------------------------------------------
  drawItem(state, x, y, scale) {
    const c = this.add.container(x, y);
    c.setData("gfx", this.add.graphics());
    c.add(c.getData("gfx"));
    this.paintItem(c, state, scale);
    return c;
  }

  redrawItem(container, state, scale) {
    this.paintItem(container, state, scale);
  }

  paintItem(container, state, scale) {
    const g = container.getData("gfx");
    g.clear();
    const r = 22 * scale;

    if (state.wrapped) {
      // Sealed box with ribbon.
      g.fillStyle(0xb07a3c, 1);
      g.fillRect(-r, -r, r * 2, r * 2);
      g.lineStyle(4 * scale, 0xe0c068, 1);
      g.strokeRect(-r, -r, r * 2, r * 2);
      g.lineBetween(0, -r, 0, r);
      g.lineBetween(-r, 0, r, 0);
      return;
    }

    const fill = COLORS[state.color] ?? 0x8a9098;
    g.fillStyle(fill, 1);
    if (state.shape === "circle") {
      g.fillCircle(0, 0, r);
    } else if (state.shape === "square") {
      g.fillRect(-r, -r, r * 2, r * 2);
    } else if (state.shape === "star") {
      g.fillPoints(this.starPoints(r, r * 0.45), true);
    }

    if (state.finish === "polished") {
      g.lineStyle(3 * scale, 0xffffff, 0.9);
      if (state.shape === "circle") g.strokeCircle(0, 0, r);
      else if (state.shape === "square") g.strokeRect(-r, -r, r * 2, r * 2);
      else g.strokePoints(this.starPoints(r, r * 0.45), true);
      // shine
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(-r * 0.35, -r * 0.35, r * 0.15);
    }
  }

  starPoints(outer, inner) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rad = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? outer : inner;
      pts.push(new Phaser.Geom.Point(Math.cos(rad) * rr, Math.sin(rad) * rr));
    }
    return pts;
  }

  // ---- UI helper --------------------------------------------------------
  makeButton(x, y, label, color, onClick) {
    const w = Math.max(160, label.length * 9 + 30);
    const rect = this.add.rectangle(x, y, w, 34, color)
      .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffffff",
    }).setOrigin(0.5);
    rect.on("pointerdown", onClick);
    rect.setData("txt", txt);
    return rect;
  }
}
