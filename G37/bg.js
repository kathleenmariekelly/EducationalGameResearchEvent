// bg.js — soft, muted floating pets/emojis behind the UI.
import { SOLDIERS, ENEMIES, BANNERS } from "./customize.js";

const EMOJIS = [...SOLDIERS, ...ENEMIES, ...BANNERS, "🌿", "❄️", "☠️", "🌲", "⛰️", "🌳", "⛺", "🐾"];

export function startBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // build a gentle drifting field of emojis
  const N = Math.max(14, Math.round((window.innerWidth * window.innerHeight) / 90000));
  const parts = Array.from({ length: N }, () => spawn(true));

  function spawn(anywhere) {
    const size = 26 + Math.random() * 40;
    return {
      emoji: EMOJIS[(Math.random() * EMOJIS.length) | 0],
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + size,
      size,
      vx: (Math.random() - 0.5) * 8,      // px/sec, very slow
      vy: -6 - Math.random() * 10,        // drift upward
      alpha: 0.05 + Math.random() * 0.10, // muted
      rot: (Math.random() - 0.5) * 0.6,
      vr: (Math.random() - 0.5) * 0.2,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: 6 + Math.random() * 10,
    };
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.bobPhase += dt;
      const bx = Math.sin(p.bobPhase) * p.bobAmp;
      // recycle when it floats off the top
      if (p.y < -p.size) parts[i] = spawn(false);
      if (p.x < -p.size) p.x = W + p.size;
      if (p.x > W + p.size) p.x = -p.size;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x + bx, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
