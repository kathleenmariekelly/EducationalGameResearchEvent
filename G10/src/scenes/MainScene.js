// MainScene.js
//
// Type Racer (Python edition) — a pseudo-3D lane-racing game.
//
// Concept: quickly identifying Python variable types and the types that
// expressions/functions PRODUCE (int / float / str / bool).
//
// The track is drawn in pseudo-3D: it recedes toward a horizon like
// Mario Kart 64. Ahead on the road sit BOOST PADS side by side, one per
// type, each with its type name floating above it. A value scrolls in
// (e.g. `x = 3.14`); the player positions the car over the pad matching
// that value's type before reaching it.
//   - Correct pad  -> speed boost (reward)
//   - Wrong / miss -> slowdown (penalty) + a short explanation
// The mechanic IS the concept: you only go fast by classifying types
// fast. Race is 2 LAPS; crossing the FINISH LINE ends it. Beat the CPUs
// and set your best time.
//
// Content is a varied data pool (src/scenarios.js) cycled at runtime;
// no API calls, no keys — safe as a static site.

import { LANE_TYPES, LANE_STYLE, SCENARIOS, shuffled } from "../scenarios.js";
import { AudioEngine } from "../audio.js";

const W = 800;
const H = 600;

// Stylistic fonts (loaded in index.html). Arcade title, bold display,
// and a clean coding font for the actual code prompts.
const FONT_TITLE = '"Press Start 2P", monospace';
const FONT_DISPLAY = '"Russo One", system-ui, sans-serif';
const FONT_CODE = '"Fira Code", monospace';
const LANE_COUNT = LANE_TYPES.length;

// ---- pseudo-3D projection settings ----
const HORIZON_Y = 210;          // where the road vanishes
const ROAD_W_FAR = 90;          // road half-width at horizon
const ROAD_W_NEAR = 380;        // road half-width at bottom of screen
const PLAYER_SCREEN_Y = 540;    // car sits here on screen

// A "gate" (row of boost pads) travels from depth=far to depth=near.
// depth 1.0 = at horizon, depth 0.0 = at player. We move it toward 0.
const GATE_START_DEPTH = 1.0;
const JUDGE_DEPTH = 0.06;       // scored when it reaches near the car

// Progress is now LINEAR: you cover distance based on your speed every
// frame, rather than counting a fixed number of questions. Gates keep
// cycling until you cross the finish line at RACE_DISTANCE.
const RACE_DISTANCE = 800;      // total "track units" to the finish (~1 min)
const TOTAL_LAPS = 3;

// Project a point at (roadX in -1..1 across road, depth 0..1) to screen.
function project(roadX, depth) {
  // depth 1 -> horizon (small), depth 0 -> near (big)
  const t = 1 - depth;                       // 0 at horizon, 1 near
  const y = HORIZON_Y + (PLAYER_SCREEN_Y - HORIZON_Y) * t;
  const halfW = ROAD_W_FAR + (ROAD_W_NEAR - ROAD_W_FAR) * t;
  const x = W / 2 + roadX * halfW;
  const scale = halfW / ROAD_W_NEAR;         // 0..1 size factor
  return { x, y, scale, halfW };
}

// lane index -> roadX center in -1..1 (evenly spread, with margins)
function laneRoadX(i) {
  const usable = 1.5; // spread pads across most of the road width
  return (-usable / 2) + usable * ((i + 0.5) / LANE_COUNT);
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.state = "title";
    this.bestTime = this.loadBest();
    this.audio = new AudioEngine();
    this.bgPhase = 0; // drives the "rotating around the course" drift

    this.buildBackground();
    this.buildRoadGraphics();
    this.buildPads();
    this.buildRivals();
    this.buildCar();
    this.buildHUD();
    this.buildInput();
    this.buildTitle();
    this.buildInfographic();
    this.buildRamp();
    this.buildQTE();

    // pace = fraction of the race completed per second. Tuned so the
    // CPUs are genuinely challenging — you must classify well AND keep
    // the throttle down to beat them.
    // CPUs of varying difficulty: CPU-B (~48s) and CPU-A (~54s) are the
    // real challenge; CPU-C (~78s) is a much weaker back-marker.
    this.opponents = [
      { name: "CPU-A", color: 0x4f9dff, progress: 0, pace: 1 / 54 },
      { name: "CPU-B", color: 0xffb14f, progress: 0, pace: 1 / 48 },
      { name: "CPU-C", color: 0x9aa0a8, progress: 0, pace: 1 / 78 },
    ];
  }

  // ---------- BUILD / BACKGROUNDS ----------
  // Four rotating scenery themes. Each defines sky/ground/sun colors and
  // a builder that fills `this.bgProps` with parallax shapes. Every prop
  // is stored with two copies (a, b) spaced W apart so it tiles as it
  // scrolls left, plus a `speed` (parallax depth) and `yBase`.
  buildBackground() {
    this.THEMES = ["grass", "desert", "city"];
    this.themeIndex = 0;
    // startRace advances the theme; seed it so the FIRST race is grass.
    this.firstRace = true;

    // Static sky + ground rectangles we recolor per theme.
    // Depth order (back -> front): sky, sun, scenery props, ground.
    // The sun sits IN the sky behind mountains/buildings; the ground
    // draws over the base of props so they look rooted at the horizon.
    this.sky = this.add.rectangle(W / 2, HORIZON_Y / 2, W, HORIZON_Y, 0x6fb7ff).setDepth(-4);
    this.sun = this.add.circle(W / 2, HORIZON_Y - 30, 34, 0xffe27a).setAlpha(0.9).setDepth(-3);
    this.ground = this.add.rectangle(W / 2, (HORIZON_Y + H) / 2, W, H - HORIZON_Y, 0x2f7d2f).setDepth(-1);

    this.bgProps = [];      // active parallax props for the current theme
    this.applyTheme(0);
  }

  // Add one parallax prop type: `make(x)` builds the shape at x. We make
  // two copies so they tile seamlessly.
  addProp(make, baseX, speed) {
    const a = make(baseX);
    const b = make(baseX + W);
    a.setDepth(-2); b.setDepth(-2);
    this.bgProps.push({ a, b, speed });
  }

  clearThemeProps() {
    for (const p of this.bgProps) { p.a.destroy(); p.b.destroy(); }
    this.bgProps = [];
  }

  applyTheme(i) {
    this.themeIndex = ((i % this.THEMES.length) + this.THEMES.length) % this.THEMES.length;
    const theme = this.THEMES[this.themeIndex];
    this.clearThemeProps();

    if (theme === "grass") {
      this.sky.setFillStyle(0x6fb7ff);
      this.ground.setFillStyle(0x2f7d2f);
      this.sun.setVisible(true).setFillStyle(0xffe27a);
      // rolling green hills
      this.addProp((x) => this.add.ellipse(x, HORIZON_Y, 420, 120, 0x2f7a2f), 180, 0.25);
      this.addProp((x) => this.add.ellipse(x, HORIZON_Y, 500, 150, 0x3f8f3f), 520, 0.45);
      this.addProp((x) => this.add.ellipse(x, HORIZON_Y, 300, 100, 0x4aa64a), 340, 0.7);
      // occasional trees
      this.addProp((x) => this.treeProp(x, 0.9), 120, 0.9);
      this.addProp((x) => this.treeProp(x, 1.0), 620, 0.95);
    } else if (theme === "desert") {
      this.sky.setFillStyle(0xf4c07a);
      this.ground.setFillStyle(0xd9a05b);
      this.sun.setVisible(true).setFillStyle(0xfff3c4);
      // sand dunes + cacti
      this.addProp((x) => this.add.ellipse(x, HORIZON_Y + 6, 460, 120, 0xcf9a55), 200, 0.25);
      this.addProp((x) => this.add.ellipse(x, HORIZON_Y + 4, 520, 140, 0xc08f4c), 560, 0.4);
      this.addProp((x) => this.cactusProp(x), 140, 0.85);
      this.addProp((x) => this.cactusProp(x), 640, 0.95);
      this.addProp((x) => this.mesaProp(x), 380, 0.55);
    } else if (theme === "city") {
      this.sky.setFillStyle(0x2a3550);
      this.ground.setFillStyle(0x33373f);
      this.sun.setVisible(false);   // night-ish skyline, no sun
      // far skyline + big passing buildings
      this.addProp((x) => this.skylineProp(x, 0x3a445e), 200, 0.2);
      this.addProp((x) => this.skylineProp(x, 0x2f3850), 560, 0.3);
      this.addProp((x) => this.buildingProp(x, 150, 0x4a5578), 120, 0.75);
      this.addProp((x) => this.buildingProp(x, 200, 0x545f82), 420, 0.9);
      this.addProp((x) => this.buildingProp(x, 170, 0x505b7a), 700, 1.05);
    }
  }

  // ---- prop factories (each returns a single game object) ----
  treeProp(x, s) {
    const c = this.add.container(x, HORIZON_Y);
    c.add(this.add.rectangle(0, 2, 8 * s, 26 * s, 0x6b4a2a));
    c.add(this.add.circle(0, -16 * s, 18 * s, 0x2f7a2f));
    return c;
  }
  cactusProp(x) {
    const c = this.add.container(x, HORIZON_Y);
    c.add(this.add.rectangle(0, -18, 12, 46, 0x3f7a3a));
    c.add(this.add.rectangle(-12, -22, 10, 8, 0x3f7a3a));
    c.add(this.add.rectangle(-12, -30, 8, 18, 0x3f7a3a));
    c.add(this.add.rectangle(12, -14, 10, 8, 0x3f7a3a));
    c.add(this.add.rectangle(12, -22, 8, 16, 0x3f7a3a));
    return c;
  }
  mesaProp(x) {
    const c = this.add.container(x, HORIZON_Y);
    c.add(this.add.rectangle(0, -30, 120, 60, 0xb5713a));
    c.add(this.add.rectangle(0, -60, 140, 12, 0xa5652f));
    return c;
  }
  skylineProp(x, color) {
    // a strip of small distant buildings
    const c = this.add.container(x, HORIZON_Y);
    let bx = -180;
    while (bx < 180) {
      const bh = 40 + Math.random() * 90;
      const bw = 24 + Math.random() * 26;
      c.add(this.add.rectangle(bx, -bh / 2, bw, bh, color));
      bx += bw + 6;
    }
    return c;
  }
  buildingProp(x, h, color) {
    // a big foreground building with lit windows
    const w = 90;
    const c = this.add.container(x, HORIZON_Y);
    c.add(this.add.rectangle(0, -h / 2, w, h, color));
    for (let wy = -h + 14; wy < -12; wy += 22) {
      for (let wx = -w / 2 + 12; wx < w / 2 - 6; wx += 20) {
        if (Math.random() < 0.6) {
          c.add(this.add.rectangle(wx, wy, 10, 12, 0xffe27a).setAlpha(0.9));
        }
      }
    }
    return c;
  }

  // Drift the background sideways to simulate turning around the course,
  // and scroll all parallax props left so scenery streams past.
  drawBackground(dt) {
    this.bgPhase += dt * (1.1 + this.speed * 0.7);
    const curve = Math.sin(this.bgPhase * 0.9); // -1..1 sway
    if (this.sun.visible) this.sun.x = W / 2 + curve * 150;

    for (const p of this.bgProps) {
      // Sideways drift (from the sway) + steady leftward scroll. Props
      // stay glued to the horizon on the y-axis so ground scenery like
      // mountains never bobs up and down — it just streams past as the
      // course turns.
      const dx = p.speed * dt * 26 + (-curve * 40 * p.speed) * dt;
      p.a.x -= dx; p.b.x -= dx;
      if (p.a.x < -W) p.a.x += 2 * W;
      if (p.b.x < -W) p.b.x += 2 * W;
      p.a.y = HORIZON_Y;
      p.b.y = HORIZON_Y;
    }
  }

  buildRoadGraphics() {
    // We redraw the road every frame with a Graphics object so the
    // stripes can scroll and give a sense of speed.
    this.roadGfx = this.add.graphics();
    this.roadScroll = 0;
  }

  drawRoad() {
    const g = this.roadGfx;
    g.clear();

    // Road as a filled trapezoid.
    const top = project(0, 1.0);
    const bot = project(0, 0.0);
    g.fillStyle(0x3a3f47, 1);
    g.beginPath();
    g.moveTo(W / 2 - top.halfW, top.y);
    g.lineTo(W / 2 + top.halfW, top.y);
    g.lineTo(W / 2 + bot.halfW, bot.y);
    g.lineTo(W / 2 - bot.halfW, bot.y);
    g.closePath();
    g.fillPath();

    // Edge lines.
    g.lineStyle(4, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(W / 2 - top.halfW, top.y); g.lineTo(W / 2 - bot.halfW, bot.y);
    g.moveTo(W / 2 + top.halfW, top.y); g.lineTo(W / 2 + bot.halfW, bot.y);
    g.strokePath();

    // Horizontal dashes crossing the road to convey motion/depth.
    const dashCount = 12;
    for (let k = 0; k < dashCount; k++) {
      // depth of this dash, animated by roadScroll
      let d = ((k / dashCount) + this.roadScroll) % 1;
      const p = project(0, d);
      const shade = (Math.floor((d + this.roadScroll) * dashCount) % 2 === 0)
        ? 0x454b54 : 0x33383f;
      const half = p.halfW;
      g.fillStyle(shade, 0.5);
      const bandH = Math.max(2, 26 * (1 - d));
      g.fillRect(W / 2 - half, p.y - bandH / 2, half * 2, bandH);
    }
  }

  buildPads() {
    // A gate is one row of pads (all types) plus a floating prompt.
    // padSprites[i] are Graphics-free simple rectangles we reposition.
    this.padRects = [];
    this.padLabels = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      const st = LANE_STYLE[LANE_TYPES[i]];
      const r = this.add.rectangle(0, 0, 10, 10, st.color).setDepth(6).setVisible(false);
      const lbl = this.add.text(0, 0, st.label, {
        fontFamily: FONT_DISPLAY, fontSize: "20px", color: "#111318",
      }).setOrigin(0.5).setDepth(7).setVisible(false);
      this.padRects.push(r);
      this.padLabels.push(lbl);
    }

    // The prompt sign that floats above the gate.
    this.promptBg = this.add.rectangle(W / 2, 0, 380, 56, 0x111318)
      .setStrokeStyle(3, 0xf2d33c).setDepth(8).setVisible(false);
    this.promptText = this.add.text(W / 2, 0, "", {
      fontFamily: FONT_CODE, fontStyle: "700", fontSize: "24px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(9).setVisible(false);
    this.promptHint = this.add.text(W / 2, 0, "", {
      fontFamily: FONT_DISPLAY, fontSize: "12px", color: "#9aa0a8",
    }).setOrigin(0.5).setDepth(9).setVisible(false);
  }

  buildCar() {
    this.carLane = 0;          // discrete target lane
    this.carX = laneRoadX(0);  // smoothed roadX position (-1..1)
    this.wrapped = false;
    this.car = this.add.container(project(this.carX, 0).x, PLAYER_SCREEN_Y).setDepth(12);

    const parts = [];
    const add = (obj) => { parts.push(obj); return obj; };

    // --- rear wheels (drawn first so they sit behind the body) ---
    add(this.rectRounded(-34, 20, 16, 26, 0x0e0e12, 4));
    add(this.rectRounded(34, 20, 16, 26, 0x0e0e12, 4));
    add(this.add.rectangle(-34, 20, 16, 6, 0x3a3a44)); // hub stripe
    add(this.add.rectangle(34, 20, 16, 6, 0x3a3a44));

    // --- rear spoiler ---
    add(this.rectRounded(0, 30, 66, 8, 0x9b1f1f, 3));
    add(this.add.rectangle(-26, 26, 6, 12, 0x6f1515));
    add(this.add.rectangle(26, 26, 6, 12, 0x6f1515));

    // --- main body (layered for shading) ---
    add(this.rectRounded(0, 2, 58, 70, 0xc0342b, 12));   // dark base
    add(this.rectRounded(0, 0, 52, 66, 0xff4f4f, 11));   // main red
    add(this.rectRounded(-14, 0, 8, 60, 0xff8a8a, 4).setAlpha(0.5)); // left highlight

    // --- front wheels ---
    add(this.rectRounded(-34, -16, 15, 24, 0x0e0e12, 4));
    add(this.rectRounded(34, -16, 15, 24, 0x0e0e12, 4));

    // --- cockpit / windshield ---
    add(this.rectRounded(0, -6, 34, 22, 0x0b1622, 8));   // glass frame
    add(this.rectRounded(0, -8, 28, 15, 0x4fb0ff, 6).setAlpha(0.85)); // glass
    // helmet / driver
    add(this.add.circle(0, -4, 8, 0xffe27a));
    add(this.add.rectangle(0, -6, 14, 4, 0x222222).setAlpha(0.7)); // visor

    // --- racing stripe down the middle ---
    add(this.add.rectangle(0, -2, 6, 60, 0xffffff).setAlpha(0.85));
    add(this.add.rectangle(0, -20, 10, 6, 0x1b1d22)); // number plate bg
    add(this.add.text(0, -20, "1", {
      fontFamily: FONT_DISPLAY, fontSize: "11px", color: "#1b1d22",
    }).setOrigin(0.5));

    // --- headlights (front) ---
    add(this.add.circle(-16, -30, 4, 0xfff2b0));
    add(this.add.circle(16, -30, 4, 0xfff2b0));
    // front bumper
    add(this.rectRounded(0, -32, 44, 8, 0x8a1414, 3));

    // --- taillights (rear) ---
    add(this.add.rectangle(-18, 34, 8, 4, 0xffd23c));
    add(this.add.rectangle(18, 34, 8, 4, 0xffd23c));

    // exhaust flame (shown while accelerating), added behind the car
    this.flame = this.add.triangle(0, 42, -10, 0, 10, 0, 0, 22, 0xffa521)
      .setDepth(11).setVisible(false);
    this.flameInner = this.add.triangle(0, 40, -5, 0, 5, 0, 0, 14, 0xfff2a0)
      .setDepth(11).setVisible(false);

    this.car.add(parts);
    this.car.setScale(0.9);
  }

  // Helper: rounded rectangle via Graphics, returned as a game object we
  // can add to the car container.
  rectRounded(x, y, w, h, color, radius) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.setPosition(x, y);
    return g;
  }

  // Build a small pool of RIVAL cars (visual obstacles). They are NOT
  // tied to type calculations — they just drive on the track ahead and
  // you must weave around them while still choosing the right lane.
  buildRivals() {
    this.RIVAL_COLORS = [0x4f9dff, 0xffb14f, 0x8bd44f, 0xd44fd4, 0xff6f91, 0x9b8bff];
    this.rivals = [];
    for (let i = 0; i < 6; i++) {
      const color = this.RIVAL_COLORS[i % this.RIVAL_COLORS.length];
      const c = this.add.container(W / 2, HORIZON_Y).setDepth(10).setVisible(false);
      const dark = ((color & 0xfefefe) >> 1); // darker shade for base
      c.add([
        this.rectRoundedAt(0, 18, 14, 22, 0x101015, 4),   // rear wheels
        this.rectRoundedAt(0, 2, 50, 60, dark, 10),        // base
        this.rectRoundedAt(0, 0, 44, 56, color, 9),        // body
        this.rectRoundedAt(0, -14, 15, 20, 0x101015, 4),   // front wheels
        this.rectRoundedAt(0, 24, 44, 6, dark, 3),         // spoiler
        this.rectRoundedAt(0, -4, 24, 13, 0x0b1622, 6),    // windshield
        this.add.rectangle(-14, 30, 6, 4, 0xff5555),       // taillights
        this.add.rectangle(14, 30, 6, 4, 0xff5555),
      ]);
      this.rivals.push({
        obj: c, lane: 0, depth: 1.0, active: false, speed: 0, hit: false,
      });
    }
    this.rivalSpawnTimer = 0;
    this.hitCooldown = 0;
  }

  // Same as rectRounded but positioned relative to a rival container.
  rectRoundedAt(x, y, w, h, color, radius) {
    return this.rectRounded(x, y, w, h, color, radius);
  }

  buildHUD() {
    const HUD = 20;

    // Top-left panel: speed + time.
    this.add.rectangle(10, 10, 210, 58, 0x0b0d12, 0.55)
      .setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.15).setDepth(HUD);
    this.speedText = this.add.text(22, 20, "", {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#ffe27a",
    }).setDepth(HUD + 1);
    this.timeText = this.add.text(22, 42, "", {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#ffffff",
    }).setDepth(HUD + 1);

    // Top-right panel: lap + track %.
    this.add.rectangle(W - 10, 10, 158, 58, 0x0b0d12, 0.55)
      .setOrigin(1, 0).setStrokeStyle(1, 0xffffff, 0.15).setDepth(HUD);
    this.lapText = this.add.text(W - 22, 20, "", {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#8bd44f",
    }).setOrigin(1, 0).setDepth(HUD + 1);
    this.padCountText = this.add.text(W - 22, 42, "", {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#ffffff",
    }).setOrigin(1, 0).setDepth(HUD + 1);

    // Center feedback (boost / slow / crash / lap).
    this.feedbackText = this.add.text(W / 2, 150, "", {
      fontFamily: FONT_CODE, fontStyle: "700", fontSize: "18px",
      color: "#ffffff", align: "center",
    }).setOrigin(0.5).setDepth(HUD + 1);

    // Bottom race-progress bar: player vs CPUs, with START / FINISH ends.
    this.barX0 = 96; this.barX1 = W - 60; this.barY = H - 22;
    this.add.text(this.barX0 - 8, this.barY, "START", {
      fontFamily: FONT_DISPLAY, fontSize: "11px", color: "#9aa0a8",
    }).setOrigin(1, 0.5).setDepth(HUD);
    this.add.text(this.barX1 + 8, this.barY, "\uD83C\uDFC1", {
      fontSize: "16px",
    }).setOrigin(0, 0.5).setDepth(HUD);
    this.add.rectangle((this.barX0 + this.barX1) / 2, this.barY, this.barX1 - this.barX0, 6, 0x0b0d12, 0.7)
      .setStrokeStyle(1, 0xffffff, 0.2).setDepth(HUD - 1);
    this.playerMarker = this.add.triangle(this.barX0, this.barY, 0, -7, 0, 7, 11, 0, 0xff4f4f).setDepth(HUD + 2);
    this.oppMarkers = null; // built after opponents exist (create order)
  }

  buildInput() {
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER,R,M,N");
  }

  buildTitle() {
    this.titleGroup = this.add.container(0, 0).setDepth(30);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0.72);
    const t = this.add.text(W / 2, 130, "TYPE\nRACER", {
      fontFamily: FONT_TITLE, fontSize: "40px", color: "#f2d33c", align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);
    t.setStroke("#a3391f", 6);
    t.setShadow(4, 4, "#00000088", 2, true, true);
    const sub = this.add.text(W / 2, 235,
      "PYTHON EDITION",
      { fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#e6e8ea" }).setOrigin(0.5);
    const rules = this.add.text(W / 2, 300,
      "Drive onto the boost pad for the value's TYPE.\n" +
      "Steer A / D \u2022 HOLD W to go \u2022 S to brake\n" +
      "Dodge rival cars \u2022 " + TOTAL_LAPS + " laps to the finish\n" +
      "Types:  int  float  str  bool  list",
      { fontFamily: FONT_DISPLAY, fontSize: "14px", color: "#c7ccd2", align: "center", lineSpacing: 6 }
    ).setOrigin(0.5);
    this.bestLine = this.add.text(W / 2, 400, this.bestLabel(), {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#8bd44f",
    }).setOrigin(0.5);
    const start = this.add.text(W / 2, 450, "Press SPACE / ENTER to race", {
      fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#ffffff",
    }).setOrigin(0.5);
    const audioHint = this.add.text(W / 2, 490, "M: music   N: sound fx", {
      fontFamily: FONT_DISPLAY, fontSize: "12px", color: "#8f959c",
    }).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.titleGroup.add([dim, t, sub, rules, this.bestLine, start, audioHint]);
  }

  // A "how to play" infographic shown for 5 seconds before each race.
  buildInfographic() {
    const g = this.info = this.add.container(0, 0).setDepth(40).setVisible(false);
    g.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b0d12).setAlpha(0.94));

    g.add(this.add.text(W / 2, 46, "HOW TO PLAY", {
      fontFamily: FONT_TITLE, fontSize: "22px", color: "#f2d33c",
    }).setOrigin(0.5));

    // ---- CONTROLS column ----
    const cx = 210;
    g.add(this.add.text(cx, 100, "CONTROLS", {
      fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#4fb0ff",
    }).setOrigin(0.5));
    const controls = [
      ["A / \u2190", "steer left  (wraps around)"],
      ["D / \u2192", "steer right (wraps around)"],
      ["W / \u2191", "HOLD to accelerate \u26a1"],
      ["S / \u2193", "HOLD to BRAKE \u2014 dodge cars"],
      ["M / N", "music / sound fx"],
    ];
    controls.forEach(([k, desc], i) => {
      const y = 136 + i * 36;
      const key = this.add.text(cx - 150, y, k, {
        fontFamily: FONT_CODE, fontStyle: "700", fontSize: "16px",
        color: "#111318", backgroundColor: "#f2d33c", padding: { x: 8, y: 5 },
      }).setOrigin(0, 0.5);
      const d = this.add.text(cx - 80, y, desc, {
        fontFamily: FONT_DISPLAY, fontSize: "14px", color: "#dfe3e8",
      }).setOrigin(0, 0.5);
      g.add([key, d]);
    });

    // ---- GOAL / RULES column ----
    const gx = 560;
    g.add(this.add.text(gx, 100, "THE GOAL", {
      fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#8bd44f",
    }).setOrigin(0.5));
    const rules = [
      "Read the code on the billboard.",
      "Steer onto the boost pad for the",
      "TYPE it is / produces:",
      "",
      "RIGHT pad \u2192 top speed +0.5 (up to 4.5)",
      "WRONG pad \u2192 speed RESET to 1.0!",
      "CRASH a car \u2192 knocked BACKWARD!",
      "",
      "Dodge rival cars \u2014 brake (S) to slip",
      "behind them. Hold W to catch the CPUs.",
      "",
      "RARE boost ramps \u26a1 launch you into",
      "the air \u2014 press the arrow combo shown",
      "on the side for a MEGA fire boost!",
      "",
      TOTAL_LAPS + " laps to the finish!",
    ];
    rules.forEach((line, i) => {
      g.add(this.add.text(gx - 150, 140 + i * 22, line, {
        fontFamily: FONT_DISPLAY, fontSize: "14px", color: "#dfe3e8",
      }).setOrigin(0, 0.5));
    });

    // ---- type legend (colored chips) ----
    g.add(this.add.text(W / 2, 400, "THE LANES", {
      fontFamily: FONT_DISPLAY, fontSize: "16px", color: "#ffb14f",
    }).setOrigin(0.5));
    const chipW = 120, gap = 14;
    const totalW = LANE_TYPES.length * chipW + (LANE_TYPES.length - 1) * gap;
    let x0 = W / 2 - totalW / 2;
    LANE_TYPES.forEach((t) => {
      const st = LANE_STYLE[t];
      const cxi = x0 + chipW / 2;
      g.add(this.add.rectangle(cxi, 434, chipW, 34, st.color));
      g.add(this.add.text(cxi, 434, st.label, {
        fontFamily: FONT_DISPLAY, fontSize: "16px", color: "#111318",
      }).setOrigin(0.5));
      x0 += chipW + gap;
    });

    // ---- countdown text ----
    this.infoCountText = this.add.text(W / 2, 520, "", {
      fontFamily: FONT_TITLE, fontSize: "26px", color: "#ffffff",
    }).setOrigin(0.5);
    g.add(this.infoCountText);
    const skip = this.add.text(W / 2, 566, "(press SPACE to skip)", {
      fontFamily: FONT_DISPLAY, fontSize: "12px", color: "#8f959c",
    }).setOrigin(0.5);
    g.add(skip);
  }

  showInfographic() {
    this.state = "intro";
    this.introTime = 5.0;
    this.titleGroup.setVisible(false);
    this.info.setVisible(true);
    this.infoCountText.setText("Starting in 5...");
  }

  // ---------- RARE RAMP + QUICK-TIME EVENT ----------
  buildRamp() {
    // A glowing boost ramp that approaches like a gate. Rare.
    this.ramp = { active: false, depth: 1.0 };
    this.rampObj = this.add.container(W / 2, HORIZON_Y).setDepth(9).setVisible(false);
    const base = this.rectRounded(0, 0, 150, 46, 0x2a2f38, 8);
    const glow = this.rectRounded(0, 0, 150, 46, 0x00e0ff, 10).setAlpha(0.25);
    // chevrons pointing up = speed ramp
    const chevs = [];
    for (let i = 0; i < 3; i++) {
      chevs.push(this.add.triangle(-30 + i * 30, 2, -12, 10, 12, 10, 0, -10, 0xffe27a));
    }
    const lbl = this.add.text(0, -34, "BOOST RAMP!", {
      fontFamily: FONT_DISPLAY, fontSize: "15px", color: "#00e0ff",
    }).setOrigin(0.5);
    this.rampObj.add([glow, base, ...chevs, lbl]);
    this.rampCooldown = 0;
  }

  buildQTE() {
    // SIDE panel (right edge) for the quick-time button sequence, so the
    // car flying through the air stays fully visible on the left.
    const PW = 230, PX = W - PW / 2 - 12;
    this.qte = this.add.container(0, 0).setDepth(45).setVisible(false);
    this.qtePanel = this.add.rectangle(PX, H / 2, PW, 500, 0x080b10, 0.9)
      .setStrokeStyle(2, 0x00e0ff, 0.8);
    this.qte.add(this.qtePanel);
    this.qtePanelX = PX;

    this.qte.add(this.add.text(PX, H / 2 - 225, "\u26a1 BOOST RAMP", {
      fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#00e0ff",
    }).setOrigin(0.5));
    this.qte.add(this.add.text(PX, H / 2 - 200, "press in order:", {
      fontFamily: FONT_DISPLAY, fontSize: "13px", color: "#c7ccd2",
    }).setOrigin(0.5));

    // Vertical stack of arrow slots (6), built/reset at runtime.
    this.qteArrowSlots = [];
    this.qteArrowBaseY = H / 2 - 165;
    this.qteArrowGap = 44;

    // timer bar (below the 6 slots)
    this.qteBarBg = this.add.rectangle(PX, H / 2 + 190, PW - 44, 14, 0x2a2f38)
      .setStrokeStyle(1, 0xffffff, 0.2);
    this.qteBar = this.add.rectangle(PX - (PW - 44) / 2, H / 2 + 190, PW - 44, 14, 0x00e0ff)
      .setOrigin(0, 0.5);
    this.qteBarW = PW - 44;
    this.qte.add([this.qteBarBg, this.qteBar]);
    this.qteStatus = this.add.text(PX, H / 2 + 222, "", {
      fontFamily: FONT_DISPLAY, fontSize: "16px", color: "#ffffff", align: "center",
      wordWrap: { width: PW - 30 },
    }).setOrigin(0.5);
    this.qte.add(this.qteStatus);

    // Fire cloud (shown on success, behind the car).
    this.fireCloud = this.add.container(0, 0).setDepth(11).setVisible(false);
    for (let i = 0; i < 7; i++) {
      const puff = this.add.circle(0, 0, 18, i % 2 ? 0xff7a1a : 0xffd23c).setAlpha(0.9);
      this.fireCloud.add(puff);
    }
  }

  // Returns true if a rare boost ramp was spawned for this slot.
  trySpawnRamp() {
    if (this.ramp.active || this.rampCooldown > 0) return false;
    if (Math.random() < 0.14) {   // ~14% per gate recycle, gated by cooldown
      this.ramp.active = true;
      this.ramp.depth = 1.0;
      this.rampObj.setVisible(true);
      this.rampCooldown = 16;     // seconds before another can appear
      this.audio.ramp();
      return true;
    }
    return false;
  }

  updateRamp(dt) {
    if (this.rampCooldown > 0) this.rampCooldown -= dt;
    if (!this.ramp.active) return;
    this.ramp.depth -= this.gateSpeed * this.speed * dt;
    const p = project(0, Math.max(0, this.ramp.depth));
    const s = Math.max(0.4, p.scale + 0.15);
    this.rampObj.setPosition(p.x, p.y).setScale(s);
    // Hitting the ramp triggers the QTE.
    if (this.ramp.depth <= JUDGE_DEPTH) {
      this.ramp.active = false;
      this.rampObj.setVisible(false);
      this.startQTE();
    }
  }

  // After a ramp slot finishes (QTE done), continue with the next gate.
  // On a successful launch we hold the gate back for a moment so you get
  // to feel the mega-boost tearing down an open road first.
  resumeAfterRamp(delay = 0) {
    this.padIndex++;
    this.resetGateAlpha();
    if (delay > 0) {
      this.currentPrompt = null;      // no gate yet
      this.setGateVisible(false);
      this.gateSpawnDelay = delay;    // seconds until next gate appears
    } else {
      this.spawnGate();
    }
  }

  startQTE() {
    this.state = "qte";
    this.audio.stopMusic();
    this.audio.ramp();

    // random sequence of 6 arrows — more inputs = more of a skill test.
    const arrows = ["LEFT", "UP", "RIGHT", "DOWN"];
    const glyph = { LEFT: "\u2190", UP: "\u2191", RIGHT: "\u2192", DOWN: "\u2193" };
    const n = 6;
    this.qteSeq = [];
    for (let i = 0; i < n; i++) this.qteSeq.push(arrows[Phaser.Math.Between(0, 3)]);
    this.qteGlyph = glyph;
    this.qtePos = 0;

    // ~1.4s per input — generous but tighter than before.
    this.qteTimeMax = n * 1.4;
    this.qteTime = this.qteTimeMax;

    // Build the vertical arrow slots in the side panel.
    this.qteArrowSlots.forEach((s) => { s.box.destroy(); s.txt.destroy(); });
    this.qteArrowSlots = [];
    this.qteSeq.forEach((a, i) => {
      const y = this.qteArrowBaseY + i * this.qteArrowGap;
      const box = this.add.rectangle(this.qtePanelX, y, 52, 36, 0x1a1f27)
        .setStrokeStyle(2, 0x555b63).setDepth(46);
      const txt = this.add.text(this.qtePanelX, y, glyph[a], {
        fontFamily: FONT_TITLE, fontSize: "20px", color: "#ffffff",
      }).setOrigin(0.5).setDepth(47);
      this.qte.add([box, txt]);
      this.qteArrowSlots.push({ box, txt });
    });

    this.qteStatus.setColor("#e6e8ea").setText("GO!");
    this.qte.setVisible(true);
    this.renderQTE();

    // Launch the car into the air in SLOW MOTION.
    this.startFlight();
  }

  startFlight() {
    this.flight = { t: 0, dur: 5.5, landed: false, boosted: false };
    this.timeScale = 0.6;         // less-extreme slow-mo (was 0.35)
    this.carBaseScale = 0.9;
    // hide the normal exhaust flame during flight
    this.flame.setVisible(false);
    this.flameInner.setVisible(false);
  }

  renderQTE() {
    this.qteArrowSlots.forEach((slot, i) => {
      if (i < this.qtePos) {
        slot.box.setFillStyle(0x2f6b2f).setStrokeStyle(2, 0x8bd44f);
        slot.txt.setColor("#8bd44f");
      } else if (i === this.qtePos) {
        slot.box.setFillStyle(0x123a4a).setStrokeStyle(3, 0x00e0ff);
        slot.txt.setColor("#00e0ff").setScale(1.25);
      } else {
        slot.box.setFillStyle(0x1a1f27).setStrokeStyle(2, 0x555b63);
        slot.txt.setColor("#ffffff").setScale(1);
      }
    });
  }

  updateQTE(dt) {
    // The car flight is stretched out in SLOW MOTION for drama...
    this.updateFlight(dt * (this.timeScale || 1));

    // ...but the input timer drains in real time so it stays a fair,
    // generous window (2s per arrow) rather than dragging on forever.
    this.qteTime -= dt;
    this.qteBar.scaleX = Math.max(0, this.qteTime / this.qteTimeMax);

    if (this.qteTime <= 0 && !this.flight.done) { this.endQTE(false); return; }
    if (this.flight.done) return; // already resolving

    const want = this.qteSeq[this.qtePos];
    const pressed = this.firstArrowPressed();
    if (pressed) {
      if (pressed === want) {
        this.qtePos++;
        this.audio.qteHit();
        // little pop on the completed slot
        const done = this.qteArrowSlots[this.qtePos - 1];
        if (done) this.tweens.add({ targets: done.txt, scale: 1.4, duration: 120, yoyo: true });
        this.renderQTE();
        if (this.qtePos >= this.qteSeq.length) { this.endQTE(true); return; }
      } else {
        this.audio.qteFail();
        this.endQTE(false);
      }
    }
  }

  updateFlight(sdt) {
    if (!this.flight || this.flight.done) return;
    this.flight.t += sdt;
    const prog = Math.min(1, this.flight.t / this.flight.dur);
    // parabolic arc: rise then fall
    const arc = Math.sin(prog * Math.PI);          // 0..1..0
    const liftY = PLAYER_SCREEN_Y - 210 * arc;     // up to 210px into the air
    this.car.y = liftY;
    this.car.setScale(this.carBaseScale + 0.55 * arc);  // bigger = closer/airborne
    this.car.setRotation(-0.25 * arc);             // nose up while flying
  }

  firstArrowPressed() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.LEFT) ||
        Phaser.Input.Keyboard.JustDown(this.keys.A)) return "LEFT";
    if (Phaser.Input.Keyboard.JustDown(this.keys.RIGHT) ||
        Phaser.Input.Keyboard.JustDown(this.keys.D)) return "RIGHT";
    if (Phaser.Input.Keyboard.JustDown(this.keys.UP) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W)) return "UP";
    if (Phaser.Input.Keyboard.JustDown(this.keys.DOWN) ||
        Phaser.Input.Keyboard.JustDown(this.keys.S)) return "DOWN";
    return null;
  }

  endQTE(win) {
    if (this.flight.done) return;   // guard against double-trigger
    this.flight.done = true;
    this.timeScale = 1;             // exit slow-motion

    if (win) {
      this.audio.qteWin();
      this.qteStatus.setColor("#8bd44f").setText("PERFECT!\nMEGA BOOST!");
      // BIG, clearly-faster speed gain: lift the cap and slam near it.
      this.maxSpeed = 6.5;                 // raised ceiling so you really fly
      this.speed = 6.5;
      this.megaBoostTime = 3.5;            // seconds of the raised ceiling
      this.showFeedback("\uD83D\uDD25 MEGA BOOST!  +SPEED \uD83D\uDD25", 0xffa521);
      this.cameras.main.flash(200, 255, 180, 60);
      this.landCar(true);                  // land with a fire cloud
    } else {
      this.audio.qteFail();
      this.qteStatus.setColor("#ff6b6b").setText("Missed it!");
      this.showFeedback("missed the ramp combo", 0xff6b6b);
      this.landCar(false);
    }
  }

  landCar(win) {
    // Animate the car dropping back onto the road, then resume the race.
    const dropDur = win ? 420 : 520;
    this.tweens.add({
      targets: this.car,
      y: PLAYER_SCREEN_Y,
      duration: dropDur,
      ease: "Cubic.easeIn",
      onUpdate: () => {
        // scale/rotation ease back to normal alongside the drop
        const k = (PLAYER_SCREEN_Y - this.car.y) / 210;
        this.car.setScale(this.carBaseScale + Math.max(0, 0.55 * k));
        this.car.setRotation(-0.25 * Math.max(0, k));
      },
      onComplete: () => {
        this.car.setScale(this.carBaseScale).setRotation(0);
        this.car.y = PLAYER_SCREEN_Y;
        if (win) this.spawnFireCloud();
        // brief beat so the landing/fire reads, then back to racing.
        this.time.delayedCall(win ? 500 : 250, () => {
          this.qte.setVisible(false);
          this.state = "racing";
          this.audio.startMusic();
          // On a win, hold the next gate back ~2.6s so you feel the boost
          // rip down an open stretch of road before the next question.
          this.resumeAfterRamp(win ? 2.6 : 0);
        });
      },
    });
  }

  spawnFireCloud() {
    // A big billowing fire cloud bursts out behind the car on landing.
    const cx = this.car.x;
    const cy = PLAYER_SCREEN_Y + 40;
    this.fireCloud.setVisible(true).setPosition(cx, cy);
    const puffs = this.fireCloud.list;
    puffs.forEach((puff, i) => {
      const ang = Math.PI + (i / puffs.length) * Math.PI; // spread downward/back
      const dist = 20 + Math.random() * 40;
      puff.setPosition(0, 0).setScale(0.4).setAlpha(1)
        .setFillStyle(i % 2 ? 0xff5a1a : 0xffd23c);
      this.tweens.add({
        targets: puff,
        x: Math.cos(ang) * dist * (Math.random() < 0.5 ? -1 : 1),
        y: 20 + Math.random() * 50,
        scale: 1.6 + Math.random(),
        alpha: 0,
        duration: 650 + Math.random() * 250,
        ease: "Quad.easeOut",
      });
    });
    this.time.delayedCall(950, () => this.fireCloud.setVisible(false));
    this.cameras.main.shake(220, 0.006);
  }

  // ---------- RACE FLOW ----------
  startRace() {
    this.state = "racing";
    this.audio.unlock();     // must happen from a key press (it did)
    this.audio.start();
    this.audio.startMusic();

    // Pick the scenery theme. First race is RANDOM; after that we rotate
    // to the next theme so you cycle through all of them across races.
    if (this.firstRace) {
      this.firstRace = false;
      this.applyTheme(Phaser.Math.Between(0, this.THEMES.length - 1));
    } else {
      this.applyTheme((this.themeIndex + 1) % this.THEMES.length);
    }
    this.pendingThemeName = this.THEMES[this.themeIndex].toUpperCase();
    this.titleGroup.setVisible(false);
    this.feedbackText.setText("");
    this.resultText?.destroy();

    // SLOWER pacing than before, so values are easy to read.
    this.speed = 1.0;          // affects gate approach + stripe scroll
    this.minSpeed = 0.5;
    this.maxSpeed = 4.5;       // absolute ceiling (mega-boost uses 6.5)
    this.gateSpeed = 0.18;     // depth units/sec the gate approaches (slow!)

    // Earned top-speed system: base 2.5, +0.5 per correct answer up to
    // 4.5. A wrong gate resets speed to 1.0 and the cap back to 2.5.
    this.BOOST_CAP_BASE = 2.5;
    this.BOOST_CAP_MAX = 4.5;
    this.boostCap = this.BOOST_CAP_BASE;
    this.streak = 0;

    this.elapsed = 0;
    this.padIndex = 0;
    this.correctCount = 0;
    this.padsSeen = 0;
    this.distance = 0;         // linear track progress (0..RACE_DISTANCE)
    this.playerProgress = 0;   // fraction 0..1 of the race completed
    this.lap = 1;
    this.opponents.forEach((o) => (o.progress = 0));

    if (!this.oppMarkers) {
      this.oppMarkers = this.opponents.map((o) =>
        this.add.circle(this.barX0, this.barY, 5, o.color).setDepth(21).setStrokeStyle(1, 0x000000, 0.5));
    }

    // reset rivals
    this.rivals.forEach((r) => { r.active = false; r.obj.setVisible(false); });
    this.rivalSpawnTimer = 2.0;   // first rival after a short delay
    this.hitCooldown = 0;

    // reset ramp / QTE (no ramp for the first few seconds)
    this.ramp.active = false;
    this.rampObj.setVisible(false);
    this.rampCooldown = 8;
    this.qte.setVisible(false);
    this.megaBoostTime = 0;
    this.gateSpawnDelay = 0;
    this.timeScale = 1;
    this.flight = { done: true };
    this.fireCloud.setVisible(false);
    this.car.setScale(0.9).setRotation(0);
    this.car.y = PLAYER_SCREEN_Y;

    this.deck = shuffled(SCENARIOS);
    this.spawnGate();

    // Announce the scenery theme for this race.
    this.showFeedback(`\uD83C\uDFC1 ${this.pendingThemeName} TRACK`, 0x00e0ff);
  }

  spawnGate() {
    // Endless gates — reshuffle the deck whenever we run through it, so
    // prompts keep coming until the finish line is crossed.
    if (this.padIndex >= this.deck.length) {
      this.deck = shuffled(SCENARIOS);
      this.padIndex = 0;
    }
    const s = this.deck[this.padIndex];
    this.currentPrompt = s;
    this.gateDepth = GATE_START_DEPTH;
    this.scored = false;
    this.gatePassTimer = 0;
    this.resetGateAlpha();

    // Make sure no rival (including ones already close) is parked in the
    // new correct lane — relocate any that are, so the lane is reachable.
    if (this.rivals) {
      const correctLane = LANE_TYPES.indexOf(s.answer);
      for (const r of this.rivals) {
        if (r.active && !r.hit && r.lane === correctLane) {
          r.lane = this.pickClearLane(correctLane, -1);
        }
      }
    }

    this.promptText.setText(s.prompt);
    this.promptHint.setText(s.hint || (s.kind === "func" ? "type it produces" : "its type"));
    this.setGateVisible(true);
  }

  setGateVisible(v) {
    this.padRects.forEach((r) => r.setVisible(v));
    this.padLabels.forEach((l) => l.setVisible(v));
    this.promptBg.setVisible(v);
    this.promptText.setVisible(v);
    this.promptHint.setVisible(v);
  }

  scoreGate() {
    const s = this.currentPrompt;
    const chosen = LANE_TYPES[this.carLane];
    const correct = chosen === s.answer;
    if (correct) {
      this.correctCount++;
      this.streak++;
      // Each correct answer raises your earned top speed by 0.5, from a
      // base of 2.5 up to a max of 4.5.
      this.boostCap = Math.min(this.BOOST_CAP_MAX, this.boostCap + 0.5);
      this.speed = Math.min(this.boostCap, this.speed + 1.4);
      this.audio.boost();
      this.showFeedback(
        `BOOST!   ${s.prompt}  \u2192  ${s.answer}   (top ${this.boostCap.toFixed(1)}x)`,
        0x8bd44f);
    } else {
      // Wrong gate: hard reset — speed drops to 1.0 and your earned top
      // speed resets back to the 2.5 base. Streaks matter now.
      this.streak = 0;
      this.speed = 1.0;
      this.boostCap = this.BOOST_CAP_BASE;
      this.audio.wrong();
      this.showFeedback(
        `WRONG!   ${s.prompt}  is  ${s.answer}, not ${chosen}\nspeed reset \u2014 ${s.why}`, 0xff6b6b);
    }
    this.padsSeen++;
    this.scored = true;
  }

  showFeedback(msg, color) {
    this.feedbackText.setColor("#" + color.toString(16).padStart(6, "0"));
    this.feedbackText.setText(msg);
    this.feedbackText.setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({ targets: this.feedbackText, alpha: 0, delay: 1400, duration: 700 });
  }

  finishRace() {
    this.state = "finished";
    this.audio.stopMusic();
    this.audio.finish();
    this.setGateVisible(false);
    const beatCPU = this.opponents.every((o) => o.progress < 1);
    let newBest = false;
    if (this.bestTime == null || this.elapsed < this.bestTime) {
      this.bestTime = this.elapsed;
      this.saveBest(this.elapsed);
      newBest = true;
    }
    this.titleGroup.setVisible(true);
    this.bestLine.setText(this.bestLabel());

    const place = beatCPU ? "1st place! You beat the CPUs." : "The CPUs edged you out.";
    const bestMsg = newBest ? "\n*** NEW BEST TIME ***" : "";
    this.resultText?.destroy();
    this.resultText = this.add.text(W / 2, 90,
      `\uD83C\uDFC1 FINISH \uD83C\uDFC1\n${place}\nTime: ${this.elapsed.toFixed(1)}s   Correct: ${this.correctCount}/${this.padsSeen}${bestMsg}`,
      { fontFamily: FONT_DISPLAY, fontSize: "18px", color: "#ffffff", align: "center", lineSpacing: 6 }
    ).setOrigin(0.5).setDepth(31);
  }

  // ---------- UPDATE ----------
  update(time, delta) {
    const dt = delta / 1000;

    // Audio toggles work at any time.
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      this.audio.unlock();
      const on = this.audio.toggleMusic();
      this.showFeedback(on ? "music on" : "music off", 0xf2d33c);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.N)) {
      this.audio.unlock();
      const on = this.audio.toggleSfx();
      this.showFeedback(on ? "sound fx on" : "sound fx off", 0xf2d33c);
    }

    if (this.state === "title" || this.state === "finished") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        this.resultText?.destroy();
        this.audio.unlock();
        this.showInfographic();
      }
      // keep the world alive behind the menu
      this.speed = this.speed ?? 0.8;
      this.drawBackground(dt);
      this.drawRoad();
      return;
    }

    if (this.state === "qte") {
      // World is frozen during the quick-time event; keep bg gently alive.
      this.drawBackground(dt * 0.2);
      this.drawRoad();
      this.updateQTE(dt);
      return;
    }

    if (this.state === "intro") {
      this.introTime -= dt;
      const secs = Math.max(0, Math.ceil(this.introTime));
      this.infoCountText.setText(`Starting in ${secs}...`);
      // let the world animate behind (dim) infographic
      this.speed = this.speed ?? 0.8;
      this.drawBackground(dt);
      this.drawRoad();
      if (this.introTime <= 0 ||
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        this.info.setVisible(false);
        this.startRace();
      }
      return;
    }

    this.elapsed += dt;

    // Mega-boost window from a successful ramp QTE: keep the higher speed
    // ceiling for a few seconds, then ease it back to normal.
    if (this.megaBoostTime > 0) {
      this.megaBoostTime -= dt;
      if (this.megaBoostTime <= 0) this.maxSpeed = 4.5;
    }

    this.handleThrottle(dt);

    // LINEAR progress: cover distance proportional to current speed.
    this.distance += this.speed * 6 * dt;
    this.playerProgress = Math.min(1, this.distance / RACE_DISTANCE);

    // Lap announcements based on distance fraction.
    const lapFrac = this.playerProgress * TOTAL_LAPS;
    const newLap = Math.min(TOTAL_LAPS, Math.floor(lapFrac) + 1);
    if (newLap > this.lap && this.playerProgress < 1) {
      this.lap = newLap;
      this.audio.lap();
      this.showFeedback(`\u2500\u2500 LAP ${this.lap} \u2500\u2500`, 0xf2d33c);
    }

    // Pending gate after a mega-boost launch: count down, then spawn.
    if (this.gateSpawnDelay > 0) {
      this.gateSpawnDelay -= dt;
      if (this.gateSpawnDelay <= 0) this.spawnGate();
    }

    this.roadScroll = (this.roadScroll + dt * this.speed * 0.5) % 1;
    this.drawBackground(dt);
    this.drawRoad();
    this.handleSteering();
    this.moveCar();
    this.updateGate(dt);
    this.updateRamp(dt);
    this.updateRivals(dt);
    this.updateOpponents(dt);
    this.updateHUD();

    if (this.distance >= RACE_DISTANCE) this.finishRace();
  }

  handleThrottle(dt) {
    // Hold W / Up to accelerate, S / Down to brake. Your top speed is
    // your EARNED boostCap (raised by correct answers) — except during a
    // ramp mega-boost, when the higher maxSpeed ceiling applies.
    const gas = this.keys.W.isDown || this.keys.UP.isDown;
    const brake = this.keys.S.isDown || this.keys.DOWN.isDown;
    const cruise = 1.0;
    const cap = this.megaBoostTime > 0 ? this.maxSpeed : this.boostCap;
    this.braking = false;
    if (brake) {
      this.speed = Math.max(this.minSpeed, this.speed - 3.0 * dt);
      this.braking = true;
      this.throttleOn = false;
    } else if (gas) {
      this.speed = Math.min(cap, this.speed + 3.2 * dt);
      this.throttleOn = true;
    } else {
      if (this.speed > cruise) this.speed = Math.max(cruise, this.speed - 1.0 * dt);
      this.throttleOn = false;
    }
  }

  handleSteering() {
    const left = Phaser.Input.Keyboard.JustDown(this.keys.A) ||
                 Phaser.Input.Keyboard.JustDown(this.keys.LEFT);
    const right = Phaser.Input.Keyboard.JustDown(this.keys.D) ||
                  Phaser.Input.Keyboard.JustDown(this.keys.RIGHT);
    // Wrap around: steering past the left edge jumps to the far right,
    // and vice versa.
    if (left) {
      this.wrapped = this.carLane === 0;
      this.carLane = (this.carLane - 1 + LANE_COUNT) % LANE_COUNT;
      this.audio.steer();
    }
    if (right) {
      this.wrapped = this.carLane === LANE_COUNT - 1;
      this.carLane = (this.carLane + 1) % LANE_COUNT;
      this.audio.steer();
    }
  }

  moveCar() {
    const targetX = laneRoadX(this.carLane);
    if (this.wrapped) {
      // Teleported to the other side of the road — snap instantly so the
      // car doesn't slide across every lane in between.
      this.carX = targetX;
      this.wrapped = false;
    } else {
      this.carX += (targetX - this.carX) * 0.2;
    }
    const p = project(this.carX, 0);
    this.car.x = p.x;
    // slight tilt when steering
    const diff = targetX - this.carX;
    this.car.setRotation(diff * 0.4);

    // exhaust flame follows the car and flickers while accelerating
    const show = !!this.throttleOn;
    this.flame.setVisible(show);
    this.flameInner.setVisible(show);
    if (show) {
      const flick = 0.8 + Math.random() * 0.5;
      this.flame.setPosition(this.car.x, PLAYER_SCREEN_Y + 40).setScale(1, flick);
      this.flameInner.setPosition(this.car.x, PLAYER_SCREEN_Y + 38).setScale(1, flick * 0.9);
    }
  }

  updateGate(dt) {
    if (!this.currentPrompt) return;
    this.gateDepth -= this.gateSpeed * this.speed * dt;

    // position each pad in the gate at current depth
    for (let i = 0; i < LANE_COUNT; i++) {
      const rx = laneRoadX(i);
      const p = project(rx, Math.max(0, this.gateDepth));
      const padW = 92 * p.scale + 14;
      const padH = 44 * p.scale + 8;
      const r = this.padRects[i];
      r.setPosition(p.x, p.y);
      r.setSize(padW, padH);
      // highlight the pad the car is currently over
      const over = i === this.carLane;
      r.setAlpha(over ? 1 : 0.8);
      r.setStrokeStyle(over ? 4 : 0, 0xffffff);

      const lbl = this.padLabels[i];
      lbl.setPosition(p.x, p.y - padH * 0.15);
      lbl.setScale(Math.max(0.5, p.scale + 0.25));
    }

    // floating prompt sign above the gate
    const centerP = project(0, Math.max(0, this.gateDepth));
    const signY = centerP.y - 70 * centerP.scale - 40;
    const s = Math.max(0.55, centerP.scale + 0.2);
    this.promptBg.setPosition(W / 2, signY).setScale(s);
    this.promptText.setPosition(W / 2, signY - 6 * s).setScale(s);
    this.promptHint.setPosition(W / 2, signY + 18 * s).setScale(s);

    // score once it's close to the car
    if (!this.scored && this.gateDepth <= JUDGE_DEPTH) {
      this.scoreGate();
    }
    // Once scored, clear the pads off the track quickly so the road is
    // free for reading/dodging rivals — they vanish shortly after the
    // decision instead of sliding all the way past the car.
    if (this.scored) {
      this.gatePassTimer = (this.gatePassTimer || 0) + dt;
      const fade = Math.max(0, 1 - this.gatePassTimer / 0.18);
      this.padRects.forEach((r) => r.setAlpha(fade * (r === this.padRects[this.carLane] ? 1 : 0.8)));
      this.padLabels.forEach((l) => l.setAlpha(fade));
      this.promptBg.setAlpha(fade);
      this.promptText.setAlpha(fade);
      this.promptHint.setAlpha(fade);
      if (this.gatePassTimer >= 0.18) {
        this.gatePassTimer = 0;
        this.padIndex++;
        this.resetGateAlpha();
        // Rarely, the next slot is a BOOST RAMP instead of a type gate.
        if (this.trySpawnRamp()) {
          this.currentPrompt = null;   // no gate this slot
          this.setGateVisible(false);
        } else {
          this.spawnGate();
        }
      }
    }
  }

  resetGateAlpha() {
    this.padRects.forEach((r) => r.setAlpha(1));
    this.padLabels.forEach((l) => l.setAlpha(1));
    this.promptBg.setAlpha(1);
    this.promptText.setAlpha(1);
    this.promptHint.setAlpha(1);
  }

  updateRivals(dt) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    // Spawn a new rival every so often (a bit more often at high speed).
    this.rivalSpawnTimer -= dt;
    if (this.rivalSpawnTimer <= 0) {
      this.spawnRival();
      this.rivalSpawnTimer = Phaser.Math.FloatBetween(1.4, 2.4);
    }

    for (const r of this.rivals) {
      if (!r.active) continue;

      // Rivals crawl forward slowly; the player's speed makes them
      // approach (you're faster, so you catch and pass them).
      r.depth -= (this.speed * 0.16 - r.speed) * dt;

      // The active gate advances while a rival is in flight, so keep
      // checking: if this rival is sitting in the CURRENT correct lane,
      // move it out while it's still far away. This guarantees the right
      // lane is always reachable without a crash.
      const correctLane = this.currentPrompt
        ? LANE_TYPES.indexOf(this.currentPrompt.answer) : -1;
      if (!r.hit && r.depth > 0.12 && r.lane === correctLane) {
        r.lane = this.pickClearLane(correctLane, r.lane);
      }

      const rx = laneRoadX(r.lane);
      const p = project(rx, Math.max(0, r.depth));
      r.obj.setPosition(p.x, p.y);
      r.obj.setScale(Math.max(0.15, p.scale * 1.05));

      // Collision: rival reaches the player's zone in the same lane.
      if (!r.hit && r.depth <= 0.09 && r.depth > -0.05 &&
          r.lane === this.carLane && this.hitCooldown <= 0) {
        r.hit = true;
        this.hitCooldown = 1.0;
        this.crash();
      }

      // Passed the player — retire immediately once its hitbox is gone,
      // so it doesn't linger on screen after it can no longer be hit.
      if (r.depth <= -0.05) {
        r.active = false;
        r.obj.setVisible(false);
      }
    }
  }

  spawnRival() {
    const r = this.rivals.find((x) => !x.active);
    if (!r) return;
    r.active = true;
    r.hit = false;
    r.depth = 1.0;
    r.speed = Phaser.Math.FloatBetween(0.02, 0.06); // slight own crawl
    // Never block the CORRECT lane for the current gate — the player must
    // always be able to reach the right type without an unavoidable crash.
    const correctLane = this.currentPrompt
      ? LANE_TYPES.indexOf(this.currentPrompt.answer)
      : -1;
    r.lane = this.pickClearLane(correctLane, -1);
    r.obj.setVisible(true);
  }

  // Pick a random lane that is NOT the correct lane (and, if possible,
  // not `avoidLane` either — used to actually change a rival's lane).
  pickClearLane(correctLane, avoidLane) {
    const allowed = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      if (i !== correctLane && i !== avoidLane) allowed.push(i);
    }
    // Fallback: if everything got excluded, at least avoid the correct lane.
    if (allowed.length === 0) {
      for (let i = 0; i < LANE_COUNT; i++) if (i !== correctLane) allowed.push(i);
    }
    return allowed[Phaser.Math.Between(0, allowed.length - 1)];
  }

  bumpShake() {
    this.cameras.main.shake(180, 0.008);
  }

  // A crash is now genuinely costly: you're knocked BACKWARD on the
  // track, dropped to a crawl, and every CPU gets a progress bump — so
  // you can't just plow through traffic and keep speeding.
  crash() {
    // knock progress backwards (about 4% of the whole race per hit)
    const setback = RACE_DISTANCE * 0.04;
    this.distance = Math.max(0, this.distance - setback);
    this.playerProgress = Math.min(1, this.distance / RACE_DISTANCE);

    // slam speed down to a crawl
    this.speed = this.minSpeed;

    // hand the CPUs some free ground
    this.opponents.forEach((o) => { o.progress = Math.min(1, o.progress + 0.03); });

    this.audio.bump();
    this.audio.wrong();
    this.showFeedback("\uD83D\uDCA5 CRASH!  knocked back \u2014 CPUs pull ahead!", 0xff6b6b);
    this.cameras.main.shake(300, 0.014);
    this.cameras.main.flash(180, 120, 0, 0);
  }

  updateOpponents(dt) {
    for (const o of this.opponents) o.progress += o.pace * dt;
  }

  updateHUD() {
    const gas = this.braking ? " BRAKE" : (this.throttleOn ? " GAS" : "");
    const capNow = this.megaBoostTime > 0 ? this.maxSpeed : this.boostCap;
    this.speedText.setText(`\u26a1 ${this.speed.toFixed(1)}x / ${capNow.toFixed(1)}${gas}`);
    this.timeText.setText(`\u23f1 ${this.elapsed.toFixed(1)}s   \u2b50 x${this.streak}`);
    this.speedText.setColor(this.braking ? "#ff8a8a" : "#ffe27a");
    this.lapText.setText(`LAP ${Math.min(this.lap, TOTAL_LAPS)} / ${TOTAL_LAPS}`);
    this.padCountText.setText(`${Math.round(this.playerProgress * 100)}% \u2192 \uD83C\uDFC1`);

    const span = this.barX1 - this.barX0;
    this.playerMarker.x = this.barX0 + span * Math.min(1, this.playerProgress);
    this.opponents.forEach((o, idx) => {
      this.oppMarkers[idx].x = this.barX0 + span * Math.min(1, o.progress);
    });
  }

  // ---------- BEST TIME ----------
  loadBest() {
    // Storage key includes race length so old (shorter-race) records don't
    // carry over and look unbeatable after the race gets longer.
    try { const v = localStorage.getItem(`typeRacerBestPy_${RACE_DISTANCE}`); return v == null ? null : parseFloat(v); }
    catch { return null; }
  }
  saveBest(t) { try { localStorage.setItem(`typeRacerBestPy_${RACE_DISTANCE}`, String(t)); } catch {} }
  bestLabel() { return this.bestTime == null ? "Best time: --" : `Best time: ${this.bestTime.toFixed(1)}s`; }
}
