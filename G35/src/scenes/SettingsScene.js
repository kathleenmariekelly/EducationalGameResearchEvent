// SettingsScene.js
//
// Controls the priority-scan animation speed. Either:
//   - accel: pulse rate multiplies by `growth` every `everyMs`, capped at `cap`x
//   - constant: fixed `baseMs` per rule tried
// Settings live in the main save file (state.settings), so they persist and
// travel with an exported save.

import { loadState, saveState } from "../save.js";

const MONO = "'Courier New', monospace";

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create() {
    this.state = loadState();
    this.s = this.state.settings;
    this.cameras.main.setBackgroundColor("#1a1c2c");

    this.add.text(400, 44, "SETTINGS", { fontFamily: MONO, fontSize: "36px", color: "#ffcd75" }).setOrigin(0.5);
    this.add
      .text(400, 88, "animation speed of the priority scan", { fontFamily: MONO, fontSize: "13px", color: "#a0a4c0" })
      .setOrigin(0.5);

    this.rows = [];
    this.buildRows();

    this.makeButton(300, 520, "\u25C0 LEVELS", 0x8b8fb5, () => this.persistAndGo("LevelSelectScene"));
    this.makeButton(500, 520, "DEFAULTS", 0xef7d57, () => {
      this.s = { accel: true, baseMs: 300, growth: 1.5, everyMs: 8000, cap: 4 };
      this.state.settings = this.s;
      this.redraw();
    });
  }

  persistAndGo(scene) {
    this.state.settings = this.s;
    saveState(this.state);
    this.scene.start(scene);
  }

  buildRows() {
    this.rowGroup = this.add.container(0, 0);
    this.redraw();
  }

  redraw() {
    this.rowGroup.removeAll(true);
    const accel = this.s.accel;

    this.settingRow(160, "Mode", accel ? "ACCELERATE" : "CONSTANT", () => {
      this.s.accel = !this.s.accel;
      this.redraw();
    });

    this.settingRow(
      215,
      "Base speed (ms per rule)",
      `${this.s.baseMs} ms`,
      () => { this.s.baseMs = this.cycle(this.s.baseMs, [500, 400, 300, 200, 120]); this.redraw(); }
    );

    if (accel) {
      this.settingRow(
        270,
        "Growth (x faster each step)",
        `${this.s.growth}x`,
        () => { this.s.growth = this.cycle(this.s.growth, [1.25, 1.5, 2, 3]); this.redraw(); }
      );
      this.settingRow(
        325,
        "Step interval",
        `${(this.s.everyMs / 1000).toFixed(0)} s`,
        () => { this.s.everyMs = this.cycle(this.s.everyMs, [4000, 6000, 8000, 12000]); this.redraw(); }
      );
      this.settingRow(
        380,
        "Speed cap",
        `${this.s.cap}x`,
        () => { this.s.cap = this.cycle(this.s.cap, [2, 3, 4, 6, 8]); this.redraw(); }
      );
      this.rowGroup.add(
        this.add.text(400, 430, `\u2192 tops out at ${(this.s.baseMs / this.s.cap).toFixed(0)} ms per rule`, {
          fontFamily: MONO, fontSize: "12px", color: "#7a80a0",
        }).setOrigin(0.5)
      );
    } else {
      this.rowGroup.add(
        this.add.text(400, 300, `constant ${this.s.baseMs} ms per rule tried`, {
          fontFamily: MONO, fontSize: "13px", color: "#7a80a0",
        }).setOrigin(0.5)
      );
    }
  }

  cycle(value, options) {
    const i = options.indexOf(value);
    return options[(i + 1) % options.length];
  }

  settingRow(y, label, valueText, onClick) {
    this.rowGroup.add(this.add.text(150, y, label, { fontFamily: MONO, fontSize: "15px", color: "#e8eaf6" }).setOrigin(0, 0.5));
    const c = this.add.container(600, y);
    const bg = this.add.rectangle(0, 0, 190, 36, 0x41a6f6).setStrokeStyle(2, 0x11121f);
    const t = this.add.text(0, 0, valueText, { fontFamily: MONO, fontSize: "15px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(0x41a6f6));
    this.rowGroup.add(c);
  }

  makeButton(x, y, label, color, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 160, 42, color).setStrokeStyle(3, 0x11121f);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "16px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(color));
    return c;
  }
}
