import { SCREEN_W, CSS, COL } from "../config.js";
import { CHARACTERS, CHARACTER_ORDER } from "../data/characters.js";

export default class SelectScene extends Phaser.Scene {
  constructor() { super("SelectScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0c0e16");
    this.add.text(SCREEN_W / 2, 60, "CHOOSE YOUR CHARACTER", {
      fontFamily: "Consolas, monospace", fontSize: "34px", color: CSS.white, fontStyle: "bold",
    }).setOrigin(0.5);

    CHARACTER_ORDER.forEach((key, i) => {
      const base = CHARACTERS[key];
      const cx = SCREEN_W / 2 + (i - 1) * 300;
      const cy = 260;

      const card = this.add.rectangle(cx, cy + 40, 250, 320, 0x1e2234).setStrokeStyle(2, COL.primary);
      card.setInteractive({ useHandCursor: true });

      const spr = this.add.sprite(cx, cy - 40, `${key}0`).setScale(2);
      spr.play(`${key}_anim`);

      this.add.text(cx, cy + 40, base.name, {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: CSS.white,
      }).setOrigin(0.5);
      this.add.text(cx, cy + 70, base.blurb, {
        fontFamily: "Consolas, monospace", fontSize: "14px", color: CSS.dim,
        wordWrap: { width: 220 }, align: "center",
      }).setOrigin(0.5);
      this.add.text(cx, cy + 118,
        `HP ${base.hp}   SPD ${(base.speed / 60).toFixed(1)}\nDMG ${base.damage}   RATE ${base.fireRate.toFixed(2)}s`, {
        fontFamily: "Consolas, monospace", fontSize: "13px", color: CSS.cyan, align: "center",
      }).setOrigin(0.5);
      this.add.text(cx, cy + 168, `[${i + 1}]`, {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: CSS.yellow,
      }).setOrigin(0.5);

      card.on("pointerover", () => card.setFillStyle(0x2a3050));
      card.on("pointerout", () => card.setFillStyle(0x1e2234));
      card.on("pointerdown", () => this.choose(key));
    });

    this.add.text(SCREEN_W / 2, 520, "Press 1, 2 or 3 (or click a card)", {
      fontFamily: "Consolas, monospace", fontSize: "16px", color: CSS.white,
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-ONE", () => this.choose("duck"));
    this.input.keyboard.on("keydown-TWO", () => this.choose("penguin"));
    this.input.keyboard.on("keydown-THREE", () => this.choose("robot"));
  }

  choose(key) {
    this.scene.start("GameScene", { charKey: key });
  }
}
