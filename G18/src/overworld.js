// overworld.js
//
// The walkable map for Sort Architect: Alchemists' Vale. The player walks
// a little alchemist to cauldron stations (NPCs), each of which is one
// sorting challenge framed as brewing a potion. Walking is just framing —
// the actual learning still happens at the cauldron (the block editor),
// where an inefficient recipe overheats and explodes.

import { ROUNDS } from "./scenarios.js";
import { openBrewing, initEditor } from "./editor.js";

const W = 800, H = 600;
const CENTER = { x: 400, y: 332 };

// Brew colour by difficulty — the liquid tells you how hard the problem is
// (green = gentle ... red = brutal). Turns gold once brewed efficiently.
const DIFF_COLOR = {
  starter: 0xffffff,
  easy: 0x49d17a,
  medium: 0x3fb6d6,
  intermediate: 0xe6c74e,
  hard: 0xe0863d,
  challenge: 0xd8433a,
};

// Harder brews bubble faster, bigger and more violently — a second,
// motion-based cue for difficulty on top of colour.
const DIFF_INTENSITY = {
  starter: 0.0,
  easy: 0.2,
  medium: 0.45,
  intermediate: 0.6,
  hard: 0.8,
  challenge: 1.0,
};

// Difficulty as a 0-5 star rating shown in the potion info bar.
const DIFF_STARS = {
  starter: 0,
  easy: 1,
  medium: 2,
  intermediate: 3,
  hard: 4,
  challenge: 5,
};

class Overworld extends Phaser.Scene {
  constructor() { super("Overworld"); }

  // A proper drawn cauldron (black pot, legs, glowing brew, bubbles).
  // `color` tints the brew to signal difficulty.
  drawCauldron(x, y, color, intensity = 0.3) {
    const c = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 30, 60, 16, 0x000000).setAlpha(0.3);
    const legL = this.add.rectangle(-15, 24, 7, 14, 0x14141a);
    const legR = this.add.rectangle(15, 24, 7, 14, 0x14141a);
    const body = this.add.ellipse(0, 8, 56, 48, 0x2a2a33);
    const bodyShade = this.add.ellipse(-8, 8, 30, 40, 0x35353f).setAlpha(0.6);
    const handleL = this.add.arc(-27, 2, 8, 300, 60, false, 0x1a1a20).setStrokeStyle(4, 0x3a3a44).setClosePath(false);
    const handleR = this.add.arc(27, 2, 8, 120, 240, false, 0x1a1a20).setStrokeStyle(4, 0x3a3a44).setClosePath(false);
    const rim = this.add.ellipse(0, -9, 62, 20, 0x3a3a44);
    const mouth = this.add.ellipse(0, -9, 50, 14, 0x0e0e14);
    const glow = this.add.ellipse(0, -10, 46, 12, color).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    const liquid = this.add.ellipse(0, -10, 44, 11, color);
    c.add([shadow, legL, legR, body, bodyShade, handleL, handleR, rim, mouth, glow, liquid]);

    // Difficulty-driven bubbling: more bubbles, bigger, faster when harder.
    const count = 2 + Math.round(intensity * 4);      // 2 .. 6 bubbles
    const dur = 1500 - intensity * 950;               // faster when harder
    const bubR = 1.8 + intensity * 2.6;               // bigger when harder
    for (let k = 0; k < count; k++) {
      const sx = Phaser.Math.Between(-17, 17);
      const sy = Phaser.Math.Between(-13, -7);
      const b = this.add.circle(sx, sy, bubR * Phaser.Math.FloatBetween(0.7, 1.2), 0xffffff).setAlpha(0);
      c.add(b);
      this.tweens.add({
        targets: b, y: sy - 12 - intensity * 6, alpha: { from: 0.55 + intensity * 0.35, to: 0 },
        x: sx + Phaser.Math.Between(-6, 6), scale: { from: 0.6, to: 1.2 },
        duration: dur, delay: Phaser.Math.Between(0, dur), repeat: -1, ease: "Sine.easeOut",
      });
    }
    // The surface roils faster and harder with difficulty.
    this.tweens.add({
      targets: [liquid, glow],
      scaleX: 1.02 + intensity * 0.04, scaleY: 0.96 - intensity * 0.06,
      duration: 900 - intensity * 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    // Volatile brews (hard+) spit the odd ember.
    if (intensity >= 0.75) {
      this.time.addEvent({
        delay: 1400, loop: true, callback: () => {
          const e = this.add.circle(x + Phaser.Math.Between(-14, 14), y - 12, 2, 0xffcf7a)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: e, y: e.y - 26, alpha: { from: 1, to: 0 },
            duration: 700, ease: "Quad.easeOut", onComplete: () => e.destroy(),
          });
        },
      });
    }
    return { container: c, liquid, glow };
  }

  // A smoother wizard: rounded robe, arms, a pointed hat and a glowing staff.
  // Built facing RIGHT; the scene mirrors it via scaleX for left movement.
  drawWizard(x, y) {
    const c = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 22, 30, 9, 0x000000).setAlpha(0.35);
    // staff (behind body, on the right)
    const staff = this.add.rectangle(14, 6, 3.5, 32, 0x6b4a2a).setAngle(16);
    const orbGlow = this.add.circle(19, -12, 11, 0x38e0ff).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    const orb = this.add.circle(19, -12, 5.5, 0x9bf0ff);
    // rounded robe (bell shape from stacked ellipses, no rocket cone)
    const hem = this.add.ellipse(0, 18, 30, 14, 0x4a2178);
    const robe = this.add.ellipse(0, 8, 28, 30, 0x5b2a86);
    const robeTrim = this.add.ellipse(0, 19, 26, 8, 0x7a3db0);
    const armL = this.add.ellipse(-12, 6, 8, 16, 0x5b2a86).setAngle(12);
    const armR = this.add.ellipse(12, 6, 8, 16, 0x5b2a86).setAngle(-12);
    const collar = this.add.ellipse(0, -6, 20, 9, 0x7a3db0);
    // head
    const head = this.add.circle(0, -13, 8.5, 0xf1c9a0);
    const eyeL = this.add.circle(-3, -13, 1.5, 0x201018);
    const eyeR = this.add.circle(3, -13, 1.5, 0x201018);
    // taller pointed wizard hat, symmetric and seated on the head
    const brim = this.add.ellipse(0, -20, 26, 8, 0x3a1a5e);
    const cone = this.add.triangle(0, -35, 0, 28, 22, 28, 11, 0, 0x4a2178);
    const hatTip = this.add.circle(0, -49, 2.5, 0xffd561);
    const hatStar1 = this.add.star(0, -28, 5, 1.6, 3.4, 0xffd561).setAlpha(0.95);
    const hatStar2 = this.add.star(3, -40, 5, 1.2, 2.6, 0xfff2b0).setAlpha(0.9);
    c.add([shadow, staff, orbGlow, orb, hem, robe, robeTrim, armL, armR, collar, head, eyeL, eyeR, brim, cone, hatStar1, hatStar2, hatTip]);
    this.tweens.add({ targets: orbGlow, scale: { from: 0.85, to: 1.25 }, alpha: { from: 0.35, to: 0.6 }, duration: 850, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return c;
  }

  create() {
    this.paused = false;
    this.completed = new Set();

    // Grass ground with subtle texture (little outline tufts).
    this.add.rectangle(W / 2, H / 2, W, H, 0x2f4a34);
    // Little outline grass wisps: three thin blades per tuft, slightly darker.
    const grass = this.add.graphics();
    grass.lineStyle(1.6, 0x1e331f, 0.55);
    const placed = [];
    const MIN_GAP = 58; // keep tufts from overlapping
    let tries = 0;
    while (placed.length < 42 && tries < 1200) {
      tries++;
      const x = Phaser.Math.Between(8, W - 8);
      const y = Phaser.Math.Between(82, H - 6);
      if (placed.some((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) < MIN_GAP)) continue;
      placed.push({ x, y });
      const h = Phaser.Math.Between(9, 15);
      const s = h / 12;
      grass.beginPath();
      grass.moveTo(x - 5 * s, y); grass.lineTo(x - 7 * s, y - h + 2);
      grass.moveTo(x, y);         grass.lineTo(x + Phaser.Math.Between(-2, 2), y - h);
      grass.moveTo(x + 5 * s, y); grass.lineTo(x + 7 * s, y - h + 2);
      grass.strokePath();
    }
    this.add.text(W / 2, 24, "The Algorithmic Alchemist", {
      fontFamily: "Georgia, serif", fontSize: "26px", color: "#ffe9a8",
    }).setOrigin(0.5);
    this.add.text(W / 2, 52, "Walk to a cauldron and press E to brew. Brew efficiently — inefficient recipes explode!", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#cfe3d0",
    }).setOrigin(0.5);

    // Stations / NPCs.
    // Stations arranged in a ring around the player's spawn.
    this.stations = [];
    const rx = 285, ry = 200;
    ROUNDS.forEach((r, i) => {
      const ang = Phaser.Math.DegToRad(-90 + i * (360 / ROUNDS.length));
      const x = CENTER.x + rx * Math.cos(ang);
      const y = CENTER.y + ry * Math.sin(ang);
      const color = DIFF_COLOR[r.difficulty] || 0x49d17a;
      const intensity = DIFF_INTENSITY[r.difficulty] ?? 0.3;
      const cauldron = this.drawCauldron(x, y, color, intensity);
      const name = this.add.text(x, y + 48, `${r.potion}`, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#ffe9a8",
        backgroundColor: "#00000066", padding: { x: 6, y: 2 },
      }).setOrigin(0.5);
      const check = this.add.text(x + 28, y - 26, "★", {
        fontSize: "22px", color: "#ffd561",
      }).setOrigin(0.5).setVisible(false);
      this.stations.push({ x, y, idx: i, round: r, liquid: cauldron.liquid, glow: cauldron.glow, name, check });
    });

    // Difficulty legend (top-left panel, clear of the cauldron names).
    const legItems = [
      ["Starter", DIFF_COLOR.starter],
      ["Easy", DIFF_COLOR.easy],
      ["Medium", DIFF_COLOR.medium],
      ["Intermediate", DIFF_COLOR.intermediate],
      ["Hard", DIFF_COLOR.hard],
      ["Challenge", DIFF_COLOR.challenge],
    ];
    const lx = 12, ly = 70, lw = 120, lh = 32 + legItems.length * 20;
    const lg = this.add.graphics();
    lg.fillStyle(0x0d130f, 0.85);
    lg.fillRoundedRect(lx, ly, lw, lh, 10);
    lg.lineStyle(2, 0x49d17a, 0.55);
    lg.strokeRoundedRect(lx, ly, lw, lh, 10);
    this.add.text(lx + 12, ly + 9, "Difficulty", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#ffe9a8", fontStyle: "bold",
    }).setOrigin(0, 0);
    lg.lineStyle(1.5, 0x49d17a, 0.55);
    lg.beginPath();
    lg.moveTo(lx + 10, ly + 26);
    lg.lineTo(lx + lw - 10, ly + 26);
    lg.strokePath();
    legItems.forEach(([label, col], k) => {
      const ry = ly + 32 + k * 20;
      this.add.circle(lx + 18, ry + 7, 6, col).setStrokeStyle(1, 0x00000055);
      this.add.text(lx + 32, ry, label, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#cfe3d0",
      }).setOrigin(0, 0);
    });

    // Player (spawns at the centre of the ring).
    this.player = this.drawWizard(CENTER.x, CENTER.y);
    this.facing = 1;

    // Potion info shows in the DOM bar below the map; track what's shown.
    this.lastInfo = undefined;
    this.setInfoBar(null);

    // Victory banner (hidden).
    this.victory = this.add.text(W / 2, H / 2, "", {
      fontFamily: "Georgia, serif", fontSize: "22px", color: "#8ff0b6",
      backgroundColor: "#0c1a10ee", padding: { x: 24, y: 18 }, align: "center",
      wordWrap: { width: 560 },
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // Input.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,E");

    this.activeStation = null;
    window.__onBrewClose = () => { this.paused = false; this.lastInfo = undefined; };
  }

  setInfoBar(s) {
    const bar = document.getElementById("info-bar");
    const pill = document.getElementById("ib-diff");
    if (!s) {
      bar.className = "info-bar";
      document.getElementById("ib-title").textContent = "Wander the vale";
      document.getElementById("ib-desc").textContent =
        "Walk up to a cauldron to read its potion, then press E to brew.";
      pill.style.display = "none";
      document.getElementById("ib-stars").textContent = "";
      document.getElementById("ib-key").textContent = "";
      return;
    }
    const r = s.round;
    const done = this.completed.has(r.id);
    document.getElementById("ib-title").textContent = `\uD83E\uDDEA ${r.potion}`;
    document.getElementById("ib-desc").textContent = `${r.brewer}: \u201C${r.tease}\u201D`;
    const col = DIFF_COLOR[r.difficulty] || 0x49d17a;
    pill.style.display = "inline-block";
    pill.textContent = r.difficulty;
    pill.style.background = "#" + col.toString(16).padStart(6, "0");
    pill.style.color = col > 0xbbbbbb ? "#241d16" : "#08120b";
    const n = DIFF_STARS[r.difficulty] ?? 0;
    document.getElementById("ib-stars").textContent =
      "\u2605".repeat(n) + "\u2606".repeat(5 - n);
    document.getElementById("ib-key").innerHTML =
      `<kbd>E</kbd> ${done ? "brew again" : "brew this potion"}`;
    bar.className = "info-bar active";
  }

  update(_, delta) {
    if (this.paused) {
      if (this.lastInfo !== null) { this.setInfoBar(null); this.lastInfo = null; }
      return;
    }
    const speed = 0.22 * delta;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    const nx = Phaser.Math.Clamp(this.player.x + dx * speed, 16, W - 16);
    const ny = Phaser.Math.Clamp(this.player.y + dy * speed, 70, H - 30);
    this.player.setPosition(nx, ny);
    // Flip to face the direction of horizontal movement.
    if (dx < 0 && this.facing !== -1) { this.facing = -1; this.player.setScale(-1, 1); }
    else if (dx > 0 && this.facing !== 1) { this.facing = 1; this.player.setScale(1, 1); }

    // Nearest station in range.
    let near = null, best = 70;
    for (const s of this.stations) {
      const d = Phaser.Math.Distance.Between(nx, ny, s.x, s.y);
      if (d < best) { best = d; near = s; }
    }
    this.activeStation = near;
    const id = near ? near.round.id : null;
    if (id !== this.lastInfo) { this.setInfoBar(near); this.lastInfo = id; }

    if (near && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.paused = true;
      openBrewing(near.idx, (roundId) => this.markComplete(roundId));
    }
  }

  markComplete(roundId) {
    this.completed.add(roundId);
    const s = this.stations.find((st) => st.round.id === roundId);
    if (s) {
      s.check.setVisible(true);
      s.liquid.setFillStyle(0xffd561);
      s.glow.setFillStyle(0xffd561);
    }
    if (this.completed.size === ROUNDS.length) {
      this.victory.setText(
        "🏆 Master Alchemist!\n\nYou brewed every potion efficiently — each recipe a clean, low-cost sort. " +
        "You just felt why O(n²) overheats and why an early-exit stays cool."
      ).setVisible(true);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: W, height: H,
  parent: "game-container",
  backgroundColor: "#14161b",
  scene: [Overworld],
};

initEditor();
new Phaser.Game(config);
