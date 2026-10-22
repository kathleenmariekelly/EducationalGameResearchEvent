// Core engine: game loop, input, scene stack, tween & particle helpers.

export const W = 960;
export const H = 600;

// ---------- Math / easing ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------- Input ----------
export const Input = {
  x: 0, y: 0,
  down: false,
  justDown: false,
  justUp: false,
  keys: new Set(),
  keysJust: new Set(),
  _resetFrame() { this.justDown = false; this.justUp = false; this.keysJust.clear(); },
};

// ---------- Particles ----------
export class Particles {
  constructor() { this.list = []; }
  burst(x, y, color, n = 14, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(opts.minSpeed ?? 80, opts.maxSpeed ?? 320);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ?? 0),
        life: rand(0.4, 0.9),
        maxLife: 0.9,
        size: rand(3, 8),
        color,
        grav: opts.grav ?? 500,
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Scene base ----------
export class Scene {
  constructor(game) { this.game = game; }
  enter() {}
  exit() {}
  update(dt) {}
  draw(ctx) {}
}

// ---------- Game ----------
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = null;
    this.nextScene = null;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.flashT = 0;
    this.flashColor = '#fff';
    this.time = 0;
    this._bindInput();
  }

  shake(mag = 10, t = 0.3) { this.shakeMag = mag; this.shakeT = t; }
  flash(color = '#ffffff', t = 0.15) { this.flashColor = color; this.flashT = t; }

  setScene(scene) { this.nextScene = scene; }

  _bindInput() {
    const c = this.canvas;
    const toLocal = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      Input.x = ((t.clientX - r.left) / r.width) * W;
      Input.y = ((t.clientY - r.top) / r.height) * H;
    };
    const start = (e) => { toLocal(e); Input.down = true; Input.justDown = true; e.preventDefault(); };
    const move = (e) => { toLocal(e); };
    const end = (e) => { Input.down = false; Input.justUp = true; if (e.cancelable) e.preventDefault(); };
    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', (e) => { move(e); e.preventDefault(); }, { passive: false });
    c.addEventListener('touchend', end, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!Input.keys.has(e.key)) Input.keysJust.add(e.key);
      Input.keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => Input.keys.delete(e.key));
  }

  start(scene) {
    this.scene = scene;
    scene.enter();
    let last = performance.now();
    const loop = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);
      this.time += dt;
      this._update(dt);
      this._draw();
      Input._resetFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _update(dt) {
    if (this.nextScene) {
      if (this.scene) this.scene.exit();
      this.scene = this.nextScene;
      this.nextScene = null;
      this.scene.enter();
    }
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.scene) this.scene.update(dt);
  }

  _draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT / 0.3);
      ctx.translate(rand(-m, m), rand(-m, m));
    }
    if (this.scene) this.scene.draw(ctx);
    ctx.restore();
    if (this.flashT > 0) {
      ctx.globalAlpha = clamp(this.flashT / 0.15, 0, 1) * 0.6;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- Drawing helpers ----------
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Blocky pixel-style panel: flat fill + chunky notched-corner border, NO
// anti-aliased curves. b = border thickness in px (blocky).
export function pixelPanel(ctx, x, y, w, h, fill, border, b = 4) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const n = b; // corner notch size
  // border color base rectangle (with notched corners for a pixel look)
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(x + n, y, w - 2 * n, h);
    ctx.fillRect(x, y + n, w, h - 2 * n);
  }
  // inner fill (also notched)
  ctx.fillStyle = fill;
  ctx.fillRect(x + n + b, y + b, w - 2 * (n + b), h - 2 * b);
  ctx.fillRect(x + b, y + n + b, w - 2 * b, h - 2 * (n + b));
}

// pixel-blocky filled rect (rounded look via notched corners), single color.
export function pixelRect(ctx, x, y, w, h, fill, n = 3) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + n, y, w - 2 * n, h);
  ctx.fillRect(x, y + n, w, h - 2 * n);
}

export function text(ctx, str, x, y, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || 'bold'} ${opts.size || 20}px ${opts.font || "'Trebuchet MS', sans-serif"}`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  if (opts.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(str, x + (opts.shadowX ?? 2), y + (opts.shadowY ?? 3));
  }
  ctx.fillStyle = opts.color || '#fff';
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
