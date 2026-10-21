// CompleteScene.js — shown once every townsperson has been helped.

export default class CompleteScene extends Phaser.Scene {
  constructor() {
    super("CompleteScene");
  }

  init(data) {
    this.total = data.total || 0;
  }

  create() {
    const W = 960, H = 640;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0f12);
    this.add.text(W / 2, 200, "🏆", { fontSize: "80px" }).setOrigin(0.5);
    this.add.text(W / 2, 300, "Recurrence Town is saved!", {
      fontFamily: "system-ui", fontSize: "36px", color: "#f0b429", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(W / 2, 350, `You built ${this.total} / ${this.total} correct recurrences.`, {
      fontFamily: "system-ui", fontSize: "20px", color: "#e8eaed",
    }).setOrigin(0.5);
    this.add.text(W / 2, 400, "Every townsperson got the exact answer their problem needed.", {
      fontFamily: "system-ui", fontSize: "15px", color: "#9aa0a8",
    }).setOrigin(0.5);

    const rect = this.add.rectangle(W / 2, 480, 240, 46, 0x2f9e44).setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 480, "Play again  ↻", { fontFamily: "system-ui", fontSize: "18px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
    rect.on("pointerdown", () => {
      const over = this.scene.get("OverworldScene");
      over.completed = null; // force re-init on next play
      this.scene.stop();
      this.scene.start("TitleScene");
    });
  }
}
