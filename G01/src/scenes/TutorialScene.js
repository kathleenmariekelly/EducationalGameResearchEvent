// TutorialScene.js — a short, stepped explainer of the ONE mechanic:
// walk -> talk -> drag blocks into three slots -> watch the recurrence run.

const W = 960, H = 640;

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#14161a");
    this.step = 0;
    this.steps = [
      { title: "1 · Explore the town", body:
        "Walk around with the ARROW KEYS or WASD. Townsfolk who need help bob up\nand down with a red \u201c!\u201d bubble. Walk up to one and press SPACE to talk.",
        draw: (s) => s.drawExplore() },
      { title: "2 · Read the problem", body:
        "Each person describes a task in plain words and defines F(i) for you \u2014\nlike \u201cF(i) = the best yield using the first i crops.\u201d Your job is to finish\nthe recurrence: everything to the RIGHT of the equals sign.",
        draw: (s) => s.drawProblem() },
      { title: "3 · Build it from blocks", body:
        "Drag one block into each of the three slots:\n\u2022 which earlier subproblems F(i) depends on\n\u2022 how to combine them (min / max / add, plus any per-step cost)\n\u2022 the base case. Wrong-looking blocks are mixed in \u2014 choose carefully.",
        draw: (s) => s.drawSlots() },
      { title: "4 · Watch it run, then fix it", body:
        "Hit Submit and your recurrence runs bottom-up, filling a grid. Blue = base\ncase, GREEN = matches the right answer. If a cell turns RED, your recurrence\ndiverged there \u2014 it stops and shows what the value should be. Adjust a block\nand try again.",
        draw: (s) => s.drawGrid() },
    ];
    this.render();
  }

  render() {
    if (this.panel) this.panel.destroy();
    this.panel = this.add.container(0, 0);
    const s = this.steps[this.step];

    this.panel.add(this.add.rectangle(W / 2, 60, W - 80, 70, 0x262a31).setStrokeStyle(2, 0xf0b429));
    this.panel.add(this.add.text(W / 2, 60, s.title, {
      fontFamily: "system-ui, sans-serif", fontSize: "26px", color: "#f0b429", fontStyle: "bold",
    }).setOrigin(0.5));

    this.panel.add(this.add.text(W / 2, 150, s.body, {
      fontFamily: "system-ui, sans-serif", fontSize: "17px", color: "#e8eaed", align: "center", lineSpacing: 6,
    }).setOrigin(0.5, 0));

    this.demoObjs = [];
    s.draw(this);
    this.demoObjs.forEach((o) => this.panel.add(o));

    // progress dots
    this.steps.forEach((_, i) => {
      this.panel.add(this.add.circle(W / 2 + (i - (this.steps.length - 1) / 2) * 26, H - 90, 6,
        i === this.step ? 0xf0b429 : 0x495057));
    });

    // nav buttons
    if (this.step > 0) this.btn(W / 2 - 250, H - 45, 150, 42, "\u2190 Back", 0x495057, () => { this.step--; this.render(); });
    this.btn(W / 2 + 250, H - 45, 150, 42, "Skip \u21a9", 0x6c757d, () => this.scene.start("TitleScene"));
    const last = this.step === this.steps.length - 1;
    this.btn(W / 2, H - 45, 220, 46, last ? "\u25b6 Start Game" : "Next \u2192", last ? 0x2f9e44 : 0x3b5bdb,
      () => { if (last) this.scene.start("OverworldScene"); else { this.step++; this.render(); } });
  }

  btn(x, y, w, h, label, fill, onClick) {
    const rect = this.add.rectangle(x, y, w, h, fill).setStrokeStyle(2, 0xffffff, 0.35).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontFamily: "system-ui, sans-serif", fontSize: "17px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    rect.on("pointerover", () => rect.setScale(1.04));
    rect.on("pointerout", () => rect.setScale(1));
    rect.on("pointerdown", onClick);
    this.panel.add(rect); this.panel.add(txt);
  }

  keep(o) { this.demoObjs.push(o); return o; }
  label(x, y, t, color = "#9aa0a8", size = "14px") {
    return this.keep(this.add.text(x, y, t, { fontFamily: "ui-monospace, monospace", fontSize: size, color }).setOrigin(0.5));
  }

  // ---- little illustrations for each step ----
  drawExplore() {
    const cy = 400;
    // player
    this.keep(this.add.rectangle(W / 2 - 60, cy + 6, 20, 22, 0x3b5bdb).setStrokeStyle(2, 0x212529));
    this.keep(this.add.circle(W / 2 - 60, cy - 12, 9, 0xffd8a8).setStrokeStyle(2, 0x212529));
    // npc + bubble
    this.keep(this.add.rectangle(W / 2 + 60, cy + 6, 24, 26, 0xe8590c).setStrokeStyle(2, 0x212529));
    this.keep(this.add.text(W / 2 + 60, cy + 4, "🌾", { fontSize: "16px" }).setOrigin(0.5));
    this.keep(this.add.circle(W / 2 + 60, cy - 26, 12, 0xffffff).setStrokeStyle(2, 0x212529));
    this.label(W / 2 + 60, cy - 26, "!", "#e03131", "18px");
    this.label(W / 2, cy + 50, "walk up  ·  press SPACE");
  }

  drawProblem() {
    this.keep(this.add.rectangle(W / 2, 400, 560, 90, 0x262a31).setStrokeStyle(1, 0x3a4150));
    this.label(W / 2, 380, "\u201cNeighboring crops share roots \u2014 maximize the yield.\u201d", "#e8eaed", "15px");
    this.label(W / 2, 415, "F(i) = ____________________", "#f0b429", "20px");
    this.label(W / 2, 440, "you fill in everything after the  =", "#9aa0a8", "13px");
  }

  drawSlots() {
    const y = 410;
    const slot = (x, w, t) => { this.keep(this.add.rectangle(x, y, w, 34, 0x1a1c20).setStrokeStyle(2, 0xf0b429, 0.7)); this.label(x, y, t, "#6b7280", "12px"); };
    this.label(W / 2 - 250, y - 40, "drag blocks \u2193 into slots", "#9aa0a8", "13px");
    slot(W / 2 - 170, 200, "subproblems");
    slot(W / 2 + 60, 150, "combine");
    slot(W / 2 + 240, 130, "base case");
    // sample blocks
    this.keep(this.add.rectangle(W / 2 - 170, y + 60, 190, 26, 0x1e4d6b).setStrokeStyle(1, 0xffffff, 0.35));
    this.label(W / 2 - 170, y + 60, "F(i-1) and F(i-2)", "#ffffff", "12px");
    this.keep(this.add.rectangle(W / 2 + 70, y + 60, 150, 26, 0x5c3b7a).setStrokeStyle(1, 0xffffff, 0.35));
    this.label(W / 2 + 70, y + 60, "MAX( .. )", "#ffffff", "12px");
    this.keep(this.add.rectangle(W / 2 + 235, y + 60, 120, 26, 0x6b4a1e).setStrokeStyle(1, 0xffffff, 0.35));
    this.label(W / 2 + 235, y + 60, "F(0)=0", "#ffffff", "12px");
  }

  drawGrid() {
    const y = 420, cellW = 66, n = 6;
    const sx = W / 2 - (cellW * n) / 2 + cellW / 2;
    const colors = [0x1971c2, 0x1971c2, 0x2f9e44, 0x2f9e44, 0xe03131, 0x2f343d];
    const vals = ["0", "3", "3", "8", "5", "\u00b7"];
    for (let i = 0; i < n; i++) {
      const cx = sx + i * cellW;
      this.keep(this.add.rectangle(cx, y, cellW - 8, 40, colors[i]).setStrokeStyle(1, 0x454b57));
      this.label(cx, y, vals[i], "#ffffff", "18px");
    }
    this.label(sx + 4 * cellW, y + 34, "want 13", "#ff8787", "12px");
    this.label(W / 2, y + 70, "blue = base   green = correct   red = diverged (stops here)", "#9aa0a8", "13px");
  }
}
