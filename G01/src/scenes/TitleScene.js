// TitleScene.js — entry screen.

const W = 960, H = 640;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#14161a");

    // little skyline of the four town buildings as decoration
    const g = this.add.graphics();
    g.fillStyle(0x2b3a2b, 1); g.fillRect(0, 470, W, 170);
    const bld = (x, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, 470 - h, w, h); };
    bld(120, 90, 120, 0x7a5a34); bld(300, 70, 180, 0x868e96);
    bld(520, 110, 90, 0x8d6e63); bld(720, 80, 150, 0x6c757d);

    this.add.text(W / 2, 150, "RECURRENCE TOWN", {
      fontFamily: "system-ui, sans-serif", fontSize: "58px", color: "#f0b429", fontStyle: "bold",
    }).setOrigin(0.5).setShadow(3, 3, "#000000", 6);

    this.add.text(W / 2, 205, "Help the townsfolk by building the right recurrence relation.", {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#e8eaed",
    }).setOrigin(0.5);

    this.emojiRow(W / 2, 260, ["🧗", "🌾", "🪙", "🧱"]);

    this.button(W / 2, 340, 280, 56, "▶  Start Game", "#2f9e44", () => this.scene.start("OverworldScene"));
    this.button(W / 2, 410, 280, 50, "❔  How to Play", "#3b5bdb", () => this.scene.start("TutorialScene"));

    this.add.text(W / 2, H - 24, "A puzzle game about deriving recurrences  ·  CSCI Algorithms", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#9aa0a8",
    }).setOrigin(0.5);
  }

  emojiRow(cx, y, emojis) {
    const gap = 70;
    emojis.forEach((e, i) => {
      const x = cx + (i - (emojis.length - 1) / 2) * gap;
      const t = this.add.text(x, y, e, { fontSize: "34px" }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 8, duration: 500, delay: i * 120, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });
  }

  button(x, y, w, h, label, fill, onClick) {
    const c = Phaser.Display.Color.HexStringToColor(fill).color;
    const rect = this.add.rectangle(x, y, w, h, c).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: "system-ui, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    rect.on("pointerover", () => rect.setScale(1.04));
    rect.on("pointerout", () => rect.setScale(1));
    rect.on("pointerdown", onClick);
  }
}
