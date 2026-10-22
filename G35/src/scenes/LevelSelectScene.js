// LevelSelectScene.js
//
// Shows all levels with lock/complete state, lets the player (re)play any
// unlocked level, and manages the JSON save file (export / import / reset).
// Reads progress from save.js; MainScene writes it after each submit.

import { SCENARIOS } from "../scenarios.js";
import { loadState, isUnlocked, resetState, exportToFile, importFromFile, TOTAL_LEVELS } from "../save.js";

const MONO = "'Courier New', monospace";
const COLS = 4;
const CELL_W = 172;
const CELL_H = 104;
const GRID_X = 22;
const GAP_X = 10;
const GAP_Y = 14;
// Scrollable viewport for the grid (the campaign now has more levels than
// fit on one screen).
const VIEW = { x: 16, y: 110, w: 748, h: 340 };
const BAR_X = 760;
const BAR_W = 8;

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    this.state = loadState();
    this.cameras.main.setBackgroundColor("#1a1c2c");

    this.add.text(400, 40, "SELECT LEVEL", { fontFamily: MONO, fontSize: "36px", color: "#ffcd75" }).setOrigin(0.5);
    const done = this.state.completed.filter(Boolean).length;
    this.add
      .text(400, 84, `${done} / ${TOTAL_LEVELS} levels complete`, { fontFamily: MONO, fontSize: "14px", color: "#a0a4c0" })
      .setOrigin(0.5);

    // Grid lives in a container clipped to VIEW by a geometry mask, and is
    // scrolled by moving the container. Content taller than VIEW scrolls.
    this.grid = this.add.container(0, VIEW.y);
    const maskG = this.make.graphics();
    maskG.fillStyle(0xffffff).fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    this.grid.setMask(maskG.createGeometryMask());

    this.scroll = 0;
    const rows = Math.ceil(TOTAL_LEVELS / COLS);
    this.contentH = rows * (CELL_H + GAP_Y) - GAP_Y;
    this.maxScroll = Math.max(0, this.contentH - VIEW.h);
    this.drawGrid();
    this.buildScrollbar();

    this.input.on("wheel", (p, objs, dx, dy) => this.setScroll(this.scroll + dy * 0.4));
    this.input.on("drag", (p, obj, dragX, dragY) => {
      if (obj !== this.thumb) return;
      const travel = VIEW.h - this.thumbH;
      const ty = Phaser.Math.Clamp(dragY, VIEW.y, VIEW.y + travel);
      this.setScroll(travel > 0 ? ((ty - VIEW.y) / travel) * this.maxScroll : 0);
    });

    this.msg = this.add.text(400, 462, "", { fontFamily: MONO, fontSize: "13px", color: "#a7f070" }).setOrigin(0.5);

    // Row 1: save-file controls + intro.
    this.makeButton(120, 498, "SAVE FILE", 0x41a6f6, () => {
      exportToFile(this.state);
      this.flash("saved tokensmith_save.json");
    });
    this.makeButton(285, 498, "LOAD FILE", 0x41a6f6, async () => {
      try {
        this.state = await importFromFile();
        this.drawGrid();
        this.flash("save loaded");
      } catch {
        this.flash("load cancelled / invalid file", true);
      }
    });
    this.makeButton(450, 498, "RESET", 0xef7d57, () => {
      this.state = resetState();
      this.drawGrid();
      this.flash("progress reset");
    });
    this.makeButton(670, 498, "\u25C0 INTRO", 0x8b8fb5, () => this.scene.start("MenuScene"));

    // Row 2: settings + custom maker.
    this.makeButton(285, 546, "SETTINGS", 0xffcd75, () => this.scene.start("SettingsScene"));
    this.makeButton(450, 546, "CUSTOM MAKER", 0xa7f070, () => this.scene.start("CustomScene"));
  }

  buildScrollbar() {
    if (this.maxScroll <= 0) return; // everything fits; no bar needed
    this.add.rectangle(BAR_X, VIEW.y, BAR_W, VIEW.h, 0x24283b).setOrigin(0, 0).setStrokeStyle(1, 0x3a3f5c);
    this.thumbH = Math.max(36, VIEW.h * (VIEW.h / this.contentH));
    this.thumb = this.add.rectangle(BAR_X, VIEW.y, BAR_W, this.thumbH, 0x8b8fb5).setOrigin(0, 0).setStrokeStyle(1, 0x11121f);
    this.thumb.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(this.thumb);
  }

  setScroll(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.grid.y = VIEW.y - this.scroll;
    if (this.thumb) {
      const travel = VIEW.h - this.thumbH;
      this.thumb.y = VIEW.y + (this.maxScroll > 0 ? (this.scroll / this.maxScroll) * travel : 0);
    }
  }

  drawGrid() {
    this.grid.removeAll(true);
    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = GRID_X + col * (CELL_W + GAP_X);
      const y = row * (CELL_H + GAP_Y); // relative to the scrolling container
      this.drawCell(i, x, y);
    }
  }

  drawCell(i, x, y) {
    const unlocked = isUnlocked(this.state, i);
    const completed = this.state.completed[i];
    const sc = SCENARIOS[i];

    const bg = this.add
      .rectangle(x, y, CELL_W, CELL_H, unlocked ? 0x24283b : 0x191b28)
      .setOrigin(0, 0)
      .setStrokeStyle(2, completed ? 0xa7f070 : unlocked ? 0xffcd75 : 0x3a3f5c);
    this.grid.add(bg);

    this.grid.add(
      this.add.text(x + 12, y + 10, `LEVEL ${i + 1}`, {
        fontFamily: MONO, fontSize: "15px", color: unlocked ? "#ffffff" : "#555a78",
      })
    );

    if (unlocked) {
      this.grid.add(
        this.add.text(x + 12, y + 40, this.preview(sc.input), {
          fontFamily: MONO, fontSize: "14px", color: "#9aa0c0",
        })
      );
      this.grid.add(
        this.add.text(x + 12, y + 72, completed ? "\u2713 complete \u2014 replay" : "play", {
          fontFamily: MONO, fontSize: "12px", color: completed ? "#a7f070" : "#7a80a0",
        })
      );
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => bg.setFillStyle(0x2f3450));
      bg.on("pointerout", () => bg.setFillStyle(0x24283b));
      // Ignore clicks on cells scrolled outside the visible viewport.
      bg.on("pointerup", (pointer) => {
        if (pointer.y < VIEW.y || pointer.y > VIEW.y + VIEW.h) return;
        this.scene.start("MainScene", { level: i });
      });
    } else {
      this.grid.add(
        this.add.text(x + CELL_W / 2, y + 58, "\uD83D\uDD12 LOCKED", {
          fontFamily: MONO, fontSize: "13px", color: "#555a78",
        }).setOrigin(0.5)
      );
    }
  }

  preview(s) {
    return s.length > 16 ? s.slice(0, 15) + "\u2026" : s;
  }

  flash(text, bad) {
    this.msg.setColor(bad ? "#ef7d57" : "#a7f070");
    this.msg.setText(text);
  }

  makeButton(x, y, label, color, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 150, 40, color).setStrokeStyle(3, 0x11121f);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "14px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(color));
    return c;
  }
}
