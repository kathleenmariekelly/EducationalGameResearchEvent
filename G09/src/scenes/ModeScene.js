import { SCREEN_W, CSS, COL } from "../config.js";

export default class ModeScene extends Phaser.Scene {
  constructor() { super("ModeScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0c0e16");
    this.add.text(SCREEN_W / 2, 70, "CHOOSE A MODE", {
      fontFamily: "Consolas, monospace", fontSize: "36px", color: CSS.white, fontStyle: "bold",
    }).setOrigin(0.5);

    const modes = [
      {
        key: "learn", title: "LEARN", color: COL.green, css: CSS.green,
        blurb: "New to the material? Each question starts with a short LESSON explaining the concept, and the correct answer pad is highlighted to guide you.",
        tag: "[1]",
      },
      {
        key: "review", title: "REVIEW", color: COL.primary, css: CSS.primary,
        blurb: "Already studied? Test yourself with no hints - just the questions. Great for reinforcing what you know before an exam.",
        tag: "[2]",
      },
    ];

    modes.forEach((m, i) => {
      const cx = SCREEN_W / 2 + (i === 0 ? -220 : 220);
      const cy = 300;
      const card = this.add.rectangle(cx, cy, 380, 300, 0x1e2234)
        .setStrokeStyle(2, m.color).setInteractive({ useHandCursor: true });
      this.add.text(cx, cy - 110, m.title, {
        fontFamily: "Consolas, monospace", fontSize: "30px", color: m.css, fontStyle: "bold",
      }).setOrigin(0.5);
      this.add.text(cx, cy + 10, m.blurb, {
        fontFamily: "Consolas, monospace", fontSize: "16px", color: CSS.white,
        align: "center", wordWrap: { width: 330 },
      }).setOrigin(0.5);
      this.add.text(cx, cy + 120, m.tag, {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: CSS.yellow,
      }).setOrigin(0.5);
      card.on("pointerover", () => card.setFillStyle(0x2a3050));
      card.on("pointerout", () => card.setFillStyle(0x1e2234));
      card.on("pointerdown", () => this.choose(m.key));
    });

    this.add.text(SCREEN_W / 2, 500, "Press 1 for Learn, 2 for Review (or click a card)", {
      fontFamily: "Consolas, monospace", fontSize: "16px", color: CSS.dim,
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-ONE", () => this.choose("learn"));
    this.input.keyboard.on("keydown-TWO", () => this.choose("review"));
  }

  choose(mode) {
    this.registry.set("mode", mode);
    this.scene.start("SelectScene");
  }
}
