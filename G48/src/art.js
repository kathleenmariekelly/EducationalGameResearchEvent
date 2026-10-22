// Procedural sprite art. Everything is drawn with canvas so the game looks
// polished with zero image assets. You can later swap any of these for PNGs.
import { roundRect, text } from './engine.js';

export const SHOPPER_COLORS = [
  '#ff6b6b', '#4ecdc4', '#ffd15c', '#a06cd5', '#5c9bff',
  '#ff9f5c', '#6be585', '#f78fb3', '#7ed6df', '#e77f67',
];

// A little shopper character (body, head, simple face). Drawn centered at (x, y)
// where y is the FEET line. size scales the whole thing.
export function drawShopper(ctx, x, y, size, color, opts = {}) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  const bob = opts.bob ? Math.sin(opts.bob) * 2 : 0;
  ctx.translate(0, bob);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 2, s * 0.5, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = '#3a3550';
  roundRect(ctx, -s * 0.28, -s * 0.45, s * 0.2, s * 0.5, s * 0.08); ctx.fill();
  roundRect(ctx, s * 0.08, -s * 0.45, s * 0.2, s * 0.5, s * 0.08); ctx.fill();

  // body
  ctx.fillStyle = color;
  roundRect(ctx, -s * 0.4, -s * 1.15, s * 0.8, s * 0.8, s * 0.22); ctx.fill();
  // body highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, -s * 0.32, -s * 1.08, s * 0.28, s * 0.5, s * 0.14); ctx.fill();

  // head
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath();
  ctx.arc(0, -s * 1.35, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = opts.hair || '#553c2e';
  ctx.beginPath();
  ctx.arc(0, -s * 1.42, s * 0.31, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();

  // face
  ctx.fillStyle = '#2a2233';
  const eyeY = -s * 1.35;
  ctx.beginPath(); ctx.arc(-s * 0.1, eyeY, s * 0.045, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.1, eyeY, s * 0.045, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a2233';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.arc(0, -s * 1.28, s * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // optional number badge
  if (opts.label != null) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * 0.32, -s * 1.05, s * 0.22, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2233'; ctx.lineWidth = s * 0.04; ctx.stroke();
    text(ctx, String(opts.label), s * 0.32, -s * 1.05, { size: s * 0.3, color: '#2a2233' });
  }
  ctx.restore();
}

const PRODUCT_ICONS = {
  milk: '#f4f7ff', juice: '#ff8f3c', can: '#c0392b', box: '#d9a441',
  apple: '#e74c3c', bread: '#c98a3c', soda: '#2980b9', chips: '#f1c40f',
};
const PRODUCT_KEYS = Object.keys(PRODUCT_ICONS);
export function productKey(i) { return PRODUCT_KEYS[i % PRODUCT_KEYS.length]; }

// A grocery product "box/carton". Drawn as a rounded rect with a label.
export function drawProduct(ctx, x, y, w, h, kind, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  const wob = opts.wob || 0;
  ctx.rotate(wob);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 6, w, h, 10); ctx.fill();
  // body
  const col = PRODUCT_ICONS[kind] || '#bbb';
  ctx.fillStyle = col;
  roundRect(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
  // top gloss
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, -w / 2 + 6, -h / 2 + 6, w - 12, h * 0.28, 6); ctx.fill();
  // label band
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, -w / 2 + 6, -h * 0.05, w - 12, h * 0.34, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h / 2, w, h, 10); ctx.stroke();
  if (opts.label != null) {
    text(ctx, String(opts.label), 0, h * 0.12, { size: h * 0.3, color: '#fff', shadow: true });
  }
  ctx.restore();
}

// Heart (life). filled or empty.
export function drawHeart(ctx, x, y, s, filled, pulse = 0) {
  ctx.save();
  ctx.translate(x, y);
  const sc = 1 + Math.sin(pulse) * 0.06;
  ctx.scale(sc, sc);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(0, 0, -s, 0, -s, -s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.9, 0, -s * 0.9, 0, -s * 0.4);
  ctx.bezierCurveTo(0, -s * 0.9, s, -s * 0.9, s, -s * 0.4);
  ctx.bezierCurveTo(s, 0, 0, 0, 0, s * 0.3);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ff4d6d'; ctx.fill();
    ctx.strokeStyle = '#c9184a'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

// Clock icon with sweeping hand indicating remaining fraction (1..0).
export function drawClock(ctx, x, y, r, frac) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a2233'; ctx.lineWidth = r * 0.12; ctx.stroke();
  // remaining arc
  const col = frac > 0.5 ? '#6be585' : frac > 0.25 ? '#ffd15c' : '#ff4d6d';
  ctx.strokeStyle = col;
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
