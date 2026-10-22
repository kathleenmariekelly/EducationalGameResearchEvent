// Shared UI: HUD, buttons, background.
import { roundRect, pixelPanel, pixelRect, pointInRect, Input, clamp, W, H } from './engine.js';
import { drawHeart } from './art.js';
import { drawBombTimer } from './pixelart.js';
import { ptext } from './font.js';
import { Sfx } from './audio.js';

export class Button {
  constructor(x, y, w, h, label, opts = {}) {
    Object.assign(this, { x, y, w, h, label });
    this.color = opts.color || '#ffd15c';
    this.textColor = opts.textColor || '#2a2233';
    this.size = opts.size || 24;
    this.hover = false;
    this.press = 0;
    this.enabled = true;
    this.pop = 0; // 0..1 highlight (correct=green, wrong=red)
    this.popColor = null;
  }
  contains(px, py) { return pointInRect(px, py, this.x, this.y, this.w, this.h); }
  update(dt) {
    this.hover = this.enabled && this.contains(Input.x, Input.y);
    this.press = clamp(this.press + (this.hover && Input.down ? 8 : -8) * dt, 0, 1);
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 1.5);
  }
  clicked() {
    const c = this.enabled && this.hover && Input.justUp;
    if (c) Sfx.click();
    return c;
  }
  draw(ctx) {
    const yoff = Math.round(this.press * 4);
    const c = this.popColor || this.color;
    // pixel drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    pixelRect(ctx, this.x, this.y + 6, this.w, this.h, 'rgba(0,0,0,0.35)', 4);
    // pixel body + chunky border
    const border = this.hover && this.enabled ? '#ffffff' : '#15111f';
    pixelPanel(ctx, this.x, this.y + yoff, this.w, this.h, this.enabled ? c : '#6b6480', border, 4);
    // pixel gloss band (top)
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(this.x + 8, this.y + yoff + 7, this.w - 16, Math.round(this.h * 0.32));
    const sc = Math.max(1, Math.round(this.size / 7));
    ptext(ctx, this.label, this.x + this.w / 2, this.y + this.h / 2 + yoff,
      { scale: sc, color: this.textColor, align: 'center', baseline: 'middle', outline: true });
  }
}

// deterministic pseudo-random so shelves don't flicker frame to frame
function hashColor(i) {
  const cols = ['#ff6b6b', '#4ecdc4', '#ffd15c', '#a06cd5', '#5c9bff',
    '#ff9f5c', '#6be585', '#f78fb3', '#7ed6df', '#e77f67', '#ffffff'];
  return cols[(i * 2654435761 >>> 0) % cols.length];
}

// Stocked supermarket backdrop, ALL PIXEL BLOCKS (no gradients/curves/lines).
export function drawBackground(ctx, t) {
  ctx.imageSmoothingEnabled = false;
  const wallH = Math.round(H * 0.62);
  // wall as flat horizontal pixel bands (fake gradient, no smoothing)
  const bands = ['#7cc9e6', '#8fd3ea', '#a3ddef', '#b8e6f3', '#cfeaf3'];
  const bh0 = Math.ceil(wallH / bands.length);
  for (let i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, i * bh0, W, bh0); }

  // hanging aisle sign (blocky)
  ctx.fillStyle = '#9aa6b2'; ctx.fillRect(W / 2 - 88, 0, 6, 12); ctx.fillRect(W / 2 + 82, 0, 6, 12);
  pixelPanel(ctx, W / 2 - 150, 8, 300, 40, '#2a6df0', '#15111f', 4);

  // shelving units with rows of colorful pixel "products"
  const shelfXs = [40, 340, 640];
  const shelfW = 280, shelfTop = 72, rows = 3, rowH = 48;
  for (let s = 0; s < shelfXs.length; s++) {
    const sx = shelfXs[s];
    pixelPanel(ctx, sx, shelfTop, shelfW, rows * rowH + 12, '#d9c39a', '#a9822f', 4);
    for (let r = 0; r < rows; r++) {
      const ry = shelfTop + 8 + r * rowH;
      ctx.fillStyle = '#b98f4a';
      ctx.fillRect(sx + 4, ry + rowH - 12, shelfW - 8, 6);
      const n = 8;
      for (let k = 0; k < n; k++) {
        const bx = Math.round(sx + 10 + k * ((shelfW - 20) / n));
        const bw = Math.round((shelfW - 20) / n - 4);
        const bh = 24 + ((s + r + k) % 3) * 6;
        ctx.fillStyle = hashColor(s * 97 + r * 13 + k);
        ctx.fillRect(bx, ry + rowH - 16 - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(bx + 2, ry + rowH - 16 - bh + 2, bw - 4, 4);
        // dark base line = pixel shading, not a stroke
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(bx, ry + rowH - 16 - 4, bw, 4);
      }
    }
  }

  // floor: flat bands (checker feel via blocks, no perspective lines)
  const floorBands = ['#efe6d8', '#e7dcc9', '#efe6d8', '#e7dcc9'];
  const fH = Math.ceil((H - wallH) / floorBands.length);
  for (let i = 0; i < floorBands.length; i++) { ctx.fillStyle = floorBands[i]; ctx.fillRect(0, wallH + i * fH, W, fH); }
  ctx.fillStyle = '#e0c68f'; ctx.fillRect(0, wallH, W, 8); // trim
  // blocky checker tiles on the floor
  const tile = 48;
  for (let ty = 0; wallH + 12 + ty * tile < H; ty++) {
    for (let tx = 0; tx * tile < W; tx++) {
      if ((tx + ty) % 2 === 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(tx * tile, wallH + 12 + ty * tile, tile, tile);
    }
  }

  // ===== FLASHY overlay: sweeping disco spotlights + drifting sparkles =====
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beams = ['#ff6b6b', '#ffd15c', '#5c9bff', '#6be585'];
  for (let b = 0; b < 4; b++) {
    const cx = W / 2 + Math.sin(t * 0.7 + b * 1.9) * W * 0.42;
    const grd = ctx.createRadialGradient(cx, 0, 0, cx, 0, 260);
    const col = beams[b];
    grd.addColorStop(0, col + '55');
    grd.addColorStop(1, col + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(cx, -20);
    ctx.lineTo(cx - 150, wallH);
    ctx.lineTo(cx + 150, wallH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // twinkling sparkles
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const sx = (i * 137.5 % W);
    const sy = ((i * 89.3) % wallH);
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3);
    const sz = 2 + tw * 3;
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - sz / 2, sy - 1, sz, 2);
    ctx.fillRect(sx - 1, sy - sz / 2, 2, sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Top HUD: score, bomb timer, lives, streak. Returns spark [x,y] for FX.
export function drawHUD(ctx, state, t) {
  // top strip (leaves the top-left corner open for the bomb + fuse)
  pixelPanel(ctx, 120, 12, W - 132, 52, '#1a1230', '#15111f', 4);

  // bomb-with-fuse timer (Monkey Ball style), fully visible top-left
  const frac = clamp(state.timeLeft / state.timeMax, 0, 1);
  const spark = drawBombTimer(ctx, 52, 58, frac, t);

  // score (center of strip)
  ptext(ctx, 'SCORE', W / 2, 24, { scale: 2, color: '#bfae7d', align: 'center' });
  ptext(ctx, String(state.score), W / 2, 46, { scale: 3, color: '#ffd15c', align: 'center', outline: true });

  // streak (left of strip)
  if (state.streak > 1) {
    ptext(ctx, 'X' + state.streak, 150, 30, { scale: 3, color: '#6be585', align: 'left', outline: true });
  }

  // lives (hearts, right side)
  for (let i = 0; i < state.maxLives; i++) {
    const filled = i < state.lives;
    const pulse = filled && i === state.lives - 1 ? t * 6 : 0;
    drawHeart(ctx, W - 40 - i * 38, 38, 14, filled, pulse);
  }
  return spark;
}

// Big transient banner (e.g. "SPEEDING UP!"). anim 0..1.
export function drawBanner(ctx, str, anim, color = '#ffd15c', t = 0) {
  const y = H / 2;
  const pop = anim < 0.2 ? anim / 0.2 : 1;
  const alpha = anim < 0.15 ? anim / 0.15 : anim > 0.9 ? (1 - anim) / 0.1 : 1;
  // urgent pulse + shake for the alert feel
  const pulse = 1 + Math.sin(t * 22) * 0.05;
  const shakeX = Math.sin(t * 40) * 4;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(W / 2 + shakeX, y);
  ctx.scale(pop * pulse, pop * pulse);
  pixelPanel(ctx, -350, -54, 700, 108, '#140d26', color, 5);
  ptext(ctx, str, 0, 0, { scale: 6, color: '#fff', align: 'center', baseline: 'middle', outline: true, outlineColor: color });
  ctx.restore();
}
