// gateShapes.js
//
// !!! AI VISUAL LIMITATION -- READ THIS !!!
// The AI assistant CANNOT see the rendered canvas. All shape geometry in this
// file is written blind (computed math, never visually verified). Whether these
// actually LOOK like gates must be confirmed by a human running the game and
// screenshotting it. If a shape looks wrong, save a screenshot into the project
// and the AI can read the image file to debug it. Do not assume any visual here
// is correct just because the tests pass -- tests only cover LOGIC, not looks.
//
// Draws IEEE-style distinctive-shape logic gate symbols with Phaser Graphics,
// so the player learns to RECOGNIZE gate shapes (an exam skill), not just read
// text labels. Each gate is drawn inside a normalized box of width w, height h
// with the origin at the container's local (0,0).
//
// drawGate(scene, type, w, h, opts) -> Phaser.GameObjects.Container
//   opts.fill   : body fill color (int)
//   opts.stroke : outline color (int)
//   opts.lineW  : outline width
// Input pins sit at the LEFT edge, output pin at the RIGHT edge, so callers can
// attach wires at container-local (0, h*0.3)/(0, h*0.7) and (w, h/2).

// Sample points along a quadratic bezier p0->(ctrl)->p1.
function qbez(p0, c, p1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    });
  }
  return pts;
}
// Sample a right-facing semicircle (for AND/NAND front), top->bottom.
function semicircle(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n; // -90deg -> +90deg
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function outlineFor(type, w, h) {
  const N = 16;
  switch (type) {
    case "AND":
    case "NAND": {
      const flat = w * 0.5;
      const pts = [{ x: 0, y: 0 }, { x: flat, y: 0 }];
      semicircle(flat, h / 2, h / 2, N).forEach((p) => pts.push(p));
      pts.push({ x: flat, y: h }, { x: 0, y: h });
      return pts;
    }
    case "OR":
    case "NOR":
    case "XOR":
    case "XNOR": {
      const tip = { x: w, y: h / 2 };
      const top = qbez({ x: 0, y: 0 }, { x: w * 0.55, y: 0 }, tip, N);
      const bot = qbez(tip, { x: w * 0.55, y: h }, { x: 0, y: h }, N);
      const back = qbez({ x: 0, y: h }, { x: w * 0.22, y: h / 2 }, { x: 0, y: 0 }, N);
      return [...top, ...bot.slice(1), ...back.slice(1)];
    }
    case "NOT": {
      return [{ x: 0, y: 0 }, { x: w * 0.82, y: h / 2 }, { x: 0, y: h }];
    }
    case "WIRE":
    default:
      return null; // drawn as a straight conductor
  }
}

export function drawGate(scene, type, w, h, opts = {}) {
  const fill = opts.fill ?? 0x2a3340;
  const stroke = opts.stroke ?? 0x5cc8ff;
  const lineW = opts.lineW ?? 3;
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  c.add(g);

  if (type === "WIRE") {
    g.lineStyle(lineW, stroke, 1);
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.strokePath();
  } else {
    const outline = outlineFor(type, w, h);
    g.fillStyle(fill, 1);
    g.lineStyle(lineW, stroke, 1);
    g.beginPath();
    g.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) g.lineTo(outline[i].x, outline[i].y);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // XOR/XNOR: extra concave line behind the back curve.
    if (type === "XOR" || type === "XNOR") {
      const back2 = qbez({ x: -w * 0.1, y: h }, { x: w * 0.12, y: h / 2 }, { x: -w * 0.1, y: 0 }, 16);
      g.lineStyle(lineW, stroke, 1);
      g.beginPath();
      g.moveTo(back2[0].x, back2[0].y);
      for (let i = 1; i < back2.length; i++) g.lineTo(back2[i].x, back2[i].y);
      g.strokePath();
    }
    // Inversion bubble for NAND/NOR/XNOR/NOT.
    if (type === "NAND" || type === "NOR" || type === "XNOR" || type === "NOT") {
      const bx = type === "NAND" ? w * 0.5 + h / 2 : type === "NOT" ? w * 0.82 : w;
      const r = Math.min(6, h * 0.12);
      const bub = scene.add.graphics();
      bub.fillStyle(fill, 1); bub.lineStyle(lineW, stroke, 1);
      bub.fillCircle(bx + r, h / 2, r); bub.strokeCircle(bx + r, h / 2, r);
      c.add(bub);
    }
  }

  // Label
  const label = scene.add.text(w * 0.42, h / 2, type, {
    fontFamily: "system-ui, sans-serif", fontSize: Math.max(9, Math.round(h * 0.22)) + "px",
    color: "#e8edf2", fontStyle: "bold",
  }).setOrigin(0.5);
  c.add(label);

  c.gateType = type;
  c.gateW = w; c.gateH = h;
  return c;
}
