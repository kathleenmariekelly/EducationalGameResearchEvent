// OverworldScene.js
//
// Pokemon-style top-down town. The player walks around looking for NPCs
// who need help (they bob and show a "!" speech bubble). Walking up and
// pressing SPACE starts a dialogue; agreeing to help launches PuzzleScene
// where the actual recurrence-building happens. This scene is the "shell"
// that stitches repeated, varied exposure together — the teaching lives in
// PuzzleScene.

import { scenarios } from "../scenarios.js";

const W = 960;
const H = 640;

export default class OverworldScene extends Phaser.Scene {
  constructor() {
    super("OverworldScene");
  }

  init() {
    if (!this.completed) this.completed = scenarios.map(() => false);
  }

  create() {
    this.drawTown();

    // ----- player (simple little person) -----
    const legL = this.add.rectangle(-5, 16, 6, 10, 0x2b3a67);
    const legR = this.add.rectangle(5, 16, 6, 10, 0x2b3a67);
    const body = this.add.rectangle(0, 4, 20, 22, 0x3b5bdb).setStrokeStyle(2, 0x212529); // shirt
    const armL = this.add.rectangle(-12, 3, 5, 16, 0x3b5bdb).setStrokeStyle(1, 0x212529);
    const armR = this.add.rectangle(12, 3, 5, 16, 0x3b5bdb).setStrokeStyle(1, 0x212529);
    const head = this.add.circle(0, -14, 9, 0xffd8a8).setStrokeStyle(2, 0x212529); // face
    const hair = this.add.rectangle(0, -20, 18, 6, 0x5a3a22); // hair
    const eyeL = this.add.circle(-3, -14, 1.6, 0x212529);
    const eyeR = this.add.circle(3, -14, 1.6, 0x212529);
    this.player = this.add.container(480, 360, [legL, legR, armL, armR, body, hair, head, eyeL, eyeR]);
    this.player.setDepth(50);
    this.physics.add.existing(this.player);
    this.player.body.setSize(24, 40);
    this.player.body.setOffset(-12, -24);
    this.player.body.setCollideWorldBounds(true);

    // ----- NPCs -----
    const spots = [
      { x: 770, y: 500 }, // 0 clocktower climber near tower
      { x: 170, y: 180 }, // 1 farmer near field
      { x: 200, y: 500 }, // 2 toll collector near gate
      { x: 780, y: 190 }, // 3 bricklayer near build site
    ];
    this.npcs = scenarios.map((s, i) => this.makeNPC(s, i, spots[i]));

    // ----- HUD -----
    this.hud = this.add.text(12, 10, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "#00000066", padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100);
    this.hint = this.add.text(W / 2, H - 14, "Arrow keys / WASD to walk  ·  SPACE to talk", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffffff",
      backgroundColor: "#00000055", padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 1).setDepth(100);
    this.updateHUD();

    // ----- input -----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D,SPACE,Y,N");
    this.dialogueOpen = false;

    // resume-from-puzzle hook
    this.events.on("wake", () => { this.dialogueOpen = false; });
  }

  drawTown() {
    // grass base already the bg color; add path + zones with simple geometry
    const g = this.add.graphics();
    // dirt paths (cross)
    g.fillStyle(0xcbb287, 1);
    g.fillRect(430, 0, 100, H);
    g.fillRect(0, 300, W, 90);
    // farm field (top-left) — rows of crops
    g.fillStyle(0x7a5a34, 1); g.fillRect(60, 90, 260, 150);
    g.fillStyle(0x4b8b3b, 1);
    for (let r = 0; r < 4; r++) g.fillRect(75, 105 + r * 33, 230, 14);
    // build site (top-right) — brick stack
    g.fillStyle(0x8d6e63, 1); g.fillRect(650, 90, 250, 150);
    g.fillStyle(0xbf5a36, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.fillRect(665 + c * 38, 110 + r * 30, 34, 24);
    // gate (bottom-left)
    g.fillStyle(0x6c757d, 1); g.fillRect(70, 430, 240, 150);
    g.fillStyle(0x343a40, 1); g.fillRect(160, 470, 60, 110);
    // tower (bottom-right)
    g.fillStyle(0x868e96, 1); g.fillRect(700, 420, 150, 170);
    g.fillStyle(0x495057, 1);
    for (let r = 0; r < 5; r++) g.fillRect(760, 440 + r * 28, 30, 18);
    // labels
    const lab = (x, y, t) => this.add.text(x, y, t, { fontFamily: "system-ui", fontSize: "13px", color: "#ffffffcc", fontStyle: "bold" });
    lab(60, 70, "🌾 Farm"); lab(650, 70, "🧱 Build Site");
    lab(70, 410, "🪙 Toll Gate"); lab(700, 400, "🧗 Clock Tower");
  }

  makeNPC(scenario, index, spot) {
    const body = this.add.rectangle(spot.x, spot.y, 26, 30, Phaser.Display.Color.HexStringToColor(
      ["#e8590c", "#d6336c", "#f0b429", "#1c7ed6"][index]).color).setStrokeStyle(2, 0x212529);
    const emoji = this.add.text(spot.x, spot.y - 2, scenario.emoji, { fontSize: "16px" }).setOrigin(0.5);
    // "!" bubble
    const bubbleBg = this.add.circle(spot.x, spot.y - 30, 12, 0xffffff).setStrokeStyle(2, 0x212529);
    const bubble = this.add.text(spot.x, spot.y - 30, "!", {
      fontFamily: "system-ui", fontSize: "18px", color: "#e03131", fontStyle: "bold",
    }).setOrigin(0.5);
    const bubbleGrp = [bubbleBg, bubble];

    // bob animation (jumping look)
    this.tweens.add({ targets: [body, emoji], y: `-=6`, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tweens.add({ targets: bubbleGrp, y: `-=8`, duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    return { scenario, index, x: spot.x, y: spot.y, body, emoji, bubbleGrp, done: false };
  }

  updateHUD() {
    const done = this.completed.filter(Boolean).length;
    this.hud.setText(`Tasks helped: ${done} / ${scenarios.length}`);
  }

  update() {
    if (this.dialogueOpen) return;
    const b = this.player.body;
    const speed = 200;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;
    b.setVelocity(vx, vy);

    // nearest incomplete NPC in range
    const near = this.npcs.find((n) => !n.done &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) < 60);
    if (near && (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE))) {
      this.openDialogue(near);
    }
  }

  openDialogue(npc) {
    this.dialogueOpen = true;
    this.player.body.setVelocity(0, 0);
    const s = npc.scenario;
    const panel = this.add.container(0, 0).setDepth(200);
    const box = this.add.rectangle(W / 2, H - 110, W - 60, 180, 0x1d1f24, 0.96).setStrokeStyle(2, 0xf0b429);
    const name = this.add.text(60, H - 190, `${s.emoji}  ${s.npc}`, {
      fontFamily: "system-ui", fontSize: "18px", color: "#f0b429", fontStyle: "bold",
    });
    const text = this.add.text(60, H - 162, s.story + "\n\nWill you help me?", {
      fontFamily: "system-ui", fontSize: "15px", color: "#e8eaed", wordWrap: { width: W - 120 }, lineSpacing: 3,
    });
    const prompt = this.add.text(W / 2, H - 34, "[ Y ] Yes, I'll help    [ N ] Not yet", {
      fontFamily: "system-ui", fontSize: "16px", color: "#8ce99a", fontStyle: "bold",
    }).setOrigin(0.5);
    panel.add([box, name, text, prompt]);

    const cleanup = () => {
      this.input.keyboard.off("keydown-Y", onYes);
      this.input.keyboard.off("keydown-N", onNo);
      panel.destroy();
    };
    const onYes = () => {
      cleanup();
      this.scene.launch("PuzzleScene", { index: npc.index, npcRef: npc });
      this.scene.pause();
    };
    const onNo = () => { cleanup(); this.dialogueOpen = false; };
    this.input.keyboard.once("keydown-Y", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  // called by PuzzleScene when it finishes
  resolvePuzzle(index, success) {
    this.scene.resume();
    this.dialogueOpen = false;
    if (!success) return;

    const npc = this.npcs[index];
    npc.done = true;
    this.completed[index] = true;
    npc.bubbleGrp.forEach((o) => o.destroy());
    npc.body.setFillStyle(0x2f9e44);
    this.updateHUD();

    // thank-you toast
    const toast = this.add.text(W / 2, 80, `${npc.scenario.emoji} "Thank you so much!"`, {
      fontFamily: "system-ui", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "#2f9e44", padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: toast, alpha: 0, delay: 1600, duration: 600, onComplete: () => toast.destroy() });

    if (this.completed.every(Boolean)) {
      this.time.delayedCall(1200, () => this.scene.start("CompleteScene", { total: scenarios.length }));
    }
  }
}
