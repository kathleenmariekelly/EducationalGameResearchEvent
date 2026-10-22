import { SCREEN_W, SCREEN_H, CSS } from "../config.js";

export default class TitleScene extends Phaser.Scene {
  constructor() { super("TitleScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0c0e16");
    const cx = SCREEN_W / 2;
    this.add.text(cx, 180, "OS QUEST: SURVIVOR", {
      fontFamily: "Consolas, monospace", fontSize: "44px", color: CSS.primary, fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(cx, 250, "Learn Operating Systems. Survive the swarm.", {
      fontFamily: "Consolas, monospace", fontSize: "20px", color: CSS.white,
    }).setOrigin(0.5);
    const prompt = this.add.text(cx, 360, "Press any key / click to start", {
      fontFamily: "Consolas, monospace", fontSize: "22px", color: CSS.yellow,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.add.text(cx, 430, "A study game for the OS course", {
      fontFamily: "Consolas, monospace", fontSize: "15px", color: CSS.dim,
    }).setOrigin(0.5);

    this.input.keyboard.once("keydown", () => this.scene.start("ModeScene"));
    this.input.once("pointerdown", () => this.scene.start("ModeScene"));
  }
}
