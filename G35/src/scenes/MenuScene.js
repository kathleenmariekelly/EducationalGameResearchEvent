// MenuScene.js
//
// Start menu + a short character-led intro that frames the concept BEFORE
// play: what a tokenizer is, and what the player's job is (order the rules).
// Kept text-light on purpose — the real teaching happens in the mechanic;
// this just gives the player a mental model to hang it on.

const MONO = "'Courier New', monospace";

const DIALOG = [
  "Hi! I'm LEX, a lexer-bot. Computers can't read raw text like 'if x <= 10' — it's just characters to them.",
  "My job is TOKENIZING: chopping that text into meaningful pieces called tokens. 'if' is a keyword, 'x' is an identifier, '<=' is an operator...",
  "I do it with a list of RULES, each a little pattern. I scan left to right, and at every spot I use the FIRST rule that matches.",
  "Here's the catch: the ORDER of the rules matters. If I check the identifier rule before the 'if' keyword, 'if' gets eaten as a name. Oops.",
  "Your job: drag my rules into the right priority order so each string tokenizes correctly. Ready?",
];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1c2c");
    this.page = 0;

    this.add
      .text(400, 70, "TOKENSMITH", { fontFamily: MONO, fontSize: "48px", color: "#ffcd75" })
      .setOrigin(0.5);
    this.add
      .text(400, 118, "a lexer puzzle about rule order", { fontFamily: MONO, fontSize: "14px", color: "#a0a4c0" })
      .setOrigin(0.5);

    this.drawBot(150, 330);

    // Speech bubble.
    this.add.rectangle(470, 330, 470, 220, 0x24283b).setStrokeStyle(3, 0xffcd75);
    this.bubbleText = this.add.text(255, 240, "", {
      fontFamily: MONO,
      fontSize: "15px",
      color: "#e8eaf6",
      wordWrap: { width: 420 },
      lineSpacing: 6,
    });

    this.prompt = this.add
      .text(470, 425, "click to continue \u25B6", { fontFamily: MONO, fontSize: "12px", color: "#7a80a0" })
      .setOrigin(0.5);

    this.startBtn = this.makeButton(400, 500, "START \u25B6", () => this.scene.start("LevelSelectScene"));
    this.startBtn.setVisible(false);

    this.showPage();
    this.input.on("pointerdown", () => this.advance());
  }

  drawBot(x, y) {
    // A tiny pixel robot built from rectangles (no image assets needed).
    const g = this.add.container(x, y);
    const body = this.add.rectangle(0, 20, 90, 80, 0x41a6f6).setStrokeStyle(3, 0x11121f);
    const head = this.add.rectangle(0, -45, 70, 60, 0x73c7ff).setStrokeStyle(3, 0x11121f);
    const eyeL = this.add.rectangle(-16, -50, 14, 14, 0x11121f);
    const eyeR = this.add.rectangle(16, -50, 14, 14, 0x11121f);
    const mouth = this.add.rectangle(0, -28, 30, 6, 0x11121f);
    const antenna = this.add.rectangle(0, -85, 4, 20, 0x11121f);
    const bulb = this.add.rectangle(0, -95, 12, 12, 0xef7d57).setStrokeStyle(2, 0x11121f);
    const chip = this.add.text(0, 25, "LEX", { fontFamily: MONO, fontSize: "16px", color: "#11121f" }).setOrigin(0.5);
    g.add([antenna, bulb, body, head, eyeL, eyeR, mouth, chip]);
    // Idle blink.
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        eyeL.setScale(1, 0.1);
        eyeR.setScale(1, 0.1);
        this.time.delayedCall(120, () => {
          eyeL.setScale(1, 1);
          eyeR.setScale(1, 1);
        });
      },
    });
    return g;
  }

  makeButton(x, y, label, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 160, 46, 0xa7f070).setStrokeStyle(3, 0x11121f);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "20px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(0xa7f070));
    return c;
  }

  showPage() {
    this.bubbleText.setText(DIALOG[this.page]);
    const last = this.page === DIALOG.length - 1;
    this.prompt.setVisible(!last);
    this.startBtn.setVisible(last);
  }

  advance() {
    if (this.page < DIALOG.length - 1) {
      this.page++;
      this.showPage();
    }
  }
}
