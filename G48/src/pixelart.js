// Pixel-art system. Characters are authored as small grids of color keys and
// baked to offscreen canvases once, then drawn crisply at any scale.
// This gives real pixel-art sprites with several DISTINCT character types.

// --- palette shared by sprites. '.' = transparent ---
const PAL = {
  '.': null,
  K: '#2b2440', // outline / dark
  S: '#ffcfa3', // skin light
  s: '#e8a87c', // skin shade
  W: '#ffffff',
  E: '#2b2440', // eyes
  R: '#ff5c5c', // red
  r: '#c9384a',
  B: '#5c9bff', // blue
  b: '#3f6fd1',
  G: '#6be585', // green
  g: '#3fae5e',
  Y: '#ffd15c', // yellow
  y: '#d9a441',
  P: '#b06cd5', // purple
  p: '#824fa3',
  O: '#ff9f5c', // orange
  o: '#e07b34',
  T: '#7ed6df', // teal
  t: '#4fb0ba',
  N: '#8a5a3c', // brown hair
  n: '#5e3b25',
  H: '#3a3550', // dark pants / hair black
  Z: '#c0c0d0', // grey (old / metal)
  F: '#ffe0b3', // blonde hair
  D: '#e8e8f0', // white/apron
};

// Mario/platformer-style sprites: NORMAL proportions (cap/hair, round head,
// simple 2px eyes, torso, arms, legs, shoes). 16 wide x 24 tall.
// Legend: K=outline S=skin s=skinshade W=white E=eye .=empty + color letters.

export const CHAR_DEFS = {
  // GREG: red cap + red shirt, blue overalls (classic plumber vibe).
  greg: [
    '................',
    '....KKKKKK......',
    '...KRRRRRRK.....',
    '..KRRRRRRRRK....',
    '..KKKKKKKKKK....',
    '..KSSSSSSSSK....',
    '..KSEESEESSK....',
    '..KSSSSSSSSK....',
    '..KSsSNNSsSK....',
    '...KSSNNSSK.....',
    '....KKKKKK......',
    '...KRRRRRRK.....',
    '..KRRRRRRRRK....',
    '.KSRRBBBBRRSK...',
    '.KSRRBBBBRRSK...',
    '.KSKBBBBBBKSK...',
    '..KBBBBBBBBK....',
    '..KBBKKKKBBK....',
    '..KBBK..KBBK....',
    '..KHHK..KHHK....',
    '..KHHK..KHHK....',
    '.KKKKK..KKKKK...',
    '.KNNNK..KNNNK...',
    '.KKKKK..KKKKK...',
  ],
  // MONA: orange hair with a side ponytail, teal shirt, blue jeans.
  mona: [
    '................',
    '....KKKKKK......',
    '...KOOOOOOK.....',
    '..KOOOOOOOOK....',
    '..KOKKKKKKOK....',
    '..KKSSSSSSKKK...',
    '..KSEESEESKOK...',
    '..KSSSSSSSKOK...',
    '..KSsSWWSsSK.K..',
    '...KSSSSSSK.....',
    '....KKKKKK......',
    '...KTTTTTTK.....',
    '..KTTTTTTTTK....',
    '.KSTTTTTTTTSK...',
    '.KSTTTTTTTTSK...',
    '..KTTTTTTTTK....',
    '..KTTKKKKTTK....',
    '..KBBK..KBBK....',
    '..KBBK..KBBK....',
    '..KHHK..KHHK....',
    '.KKKKK..KKKKK...',
    '.KNNNK..KNNNK...',
    '.KKKKK..KKKKK...',
    '................',
  ],
  // JIMMY: buff, sunglasses, green tank, dark pants.
  jimmy: [
    '................',
    '...KKKKKKKK.....',
    '..KHHHHHHHHK....',
    '..KSSSSSSSSK....',
    '..KKKKKKKKKK....',
    '..KEEEEEEEEK....',
    '..KSSSSSSSSK....',
    '..KSsSSSSsSK....',
    '..KSSWWWWSSK....',
    '...KKSSSSKK.....',
    '..KKGGGGGGKK...',
    '.KSSGGGGGGSSK..',
    '.KSSGGGGGGSSK..',
    '.KSKGGGGGGKSK..',
    '..KGGGGGGGGK...',
    '..KGGKKKKGGK...',
    '..KHHK..KHHK...',
    '..KHHK..KHHK...',
    '..KHHK..KHHK...',
    '.KKKKK..KKKKK..',
    '.KNNNK..KNNNK..',
    '.KKKKK..KKKKK..',
    '................',
    '................',
  ],
  // PENNY: purple pigtails, yellow coat, dark pants.
  penny: [
    '................',
    '.KK.KKKK.KK.....',
    'KPPKPPPPKPPK....',
    'KPPKKKKKKPPK....',
    '.KKSSSSSSKK....',
    '..KSEESEESK....',
    '..KSSSSSSSK....',
    '..KSsSWWSsK....',
    '...KSSSSSK.....',
    '....KKKKK......',
    '...KYYYYYK.....',
    '..KYYYYYYYK....',
    '.KSYYYYYYYSK...',
    '.KSYYYYYYYSK...',
    '..KYYYYYYYK....',
    '..KYYKKKYYK....',
    '..KHHK.KHHK....',
    '..KHHK.KHHK....',
    '..KHHK.KHHK....',
    '.KKKKK.KKKKK...',
    '.KNNNK.KNNNK...',
    '.KKKKK.KKKKK...',
    '................',
    '................',
  ],
};
export const CHAR_KEYS = Object.keys(CHAR_DEFS);

// Normalize a grid: pad every row (with '.') to the max row width so small
// hand-authoring miscounts don't break alignment.
function normalize(grid) {
  const w = Math.max(...grid.map((r) => r.length));
  return grid.map((r) => r.padEnd(w, '.'));
}

// --- bake sprites to offscreen canvases ---
const _cache = {};
function bake(key) {
  if (_cache[key]) return _cache[key];
  const grid = normalize(CHAR_DEFS[key]);
  const h = grid.length, w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = PAL[grid[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  _cache[key] = { canvas: c, w, h };
  return _cache[key];
}

// Draw a pixel-art character. x,y = FEET center. size = pixel scale height target.
export function drawPixelChar(ctx, key, x, y, targetH, opts = {}) {
  const spr = bake(key);
  const scale = targetH / spr.h;
  const dw = spr.w * scale, dh = spr.h * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const bob = opts.bob ? Math.round(Math.sin(opts.bob) * 2) : 0;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, dw * 0.34, dh * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  const px = Math.round(x - dw / 2);
  const py = Math.round(y - dh + bob);
  ctx.drawImage(spr.canvas, px, py, dw, dh);
  // optional number badge
  if (opts.label != null) {
    const bx = px + dw * 0.82, by = py + dh * 0.42, br = dh * 0.16;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b2440'; ctx.lineWidth = Math.max(2, br * 0.25); ctx.stroke();
    ctx.fillStyle = '#2b2440';
    ctx.font = `bold ${Math.round(br * 1.3)}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(opts.label), bx, by + 1);
  }
  ctx.restore();
}

// ---- Pixel-art grocery products (also distinct types) ----
const P2 = {
  '.': null, K: '#2b2440', W: '#ffffff', R: '#e74c3c', r: '#b93222',
  O: '#ff8f3c', o: '#d96e1e', Y: '#f1c40f', y: '#caa20b', B: '#2980b9',
  b: '#1f5f8f', G: '#6be585', g: '#3fae5e', N: '#c98a3c', n: '#9c6a2c',
  M: '#f4f7ff', C: '#c0392b', Z: '#c0c0d0',
};
const PRODUCT_DEFS = {
  milk: ['.WWWW.', '.MMMM.', 'MMMMMM', 'MBBBBM', 'MMMMMM', 'MMMMMM', 'MMMMMM', 'KKKKKK'],
  soda: ['.RRRR.', 'RWWWWR', 'RWRRWR', 'RWWWWR', 'RRRRRR', 'RRRRRR', 'RRRRRR', 'KKKKKK'],
  can:  ['ZZZZZZ', 'ZCCCCZ', 'ZCWWCZ', 'ZCCCCZ', 'ZCCCCZ', 'ZCCCCZ', 'ZZZZZZ', 'KKKKKK'],
  box:  ['NNNNNN', 'NnnnnN', 'NnWWnN', 'NnWWnN', 'NnnnnN', 'NNNNNN', 'NNNNNN', 'KKKKKK'],
  chips:['YYYYYY', 'YyyyyY', 'YyWWyY', 'YWWWWY', 'YyyyyY', 'YYYYYY', 'YYYYYY', 'KKKKKK'],
  juice:['.OOOO.', 'OOOOOO', 'OoWWoO', 'OWWWWO', 'OOOOOO', 'OOOOOO', 'OOOOOO', 'KKKKKK'],
  apple:['..GG..', '.GRRG.', 'GRRRRG', 'RRRRRR', 'RRRRRR', 'RrrrrR', '.RRRR.', '..KK..'],
  bread:['.NNNN.', 'NNNNNN', 'NnnnnN', 'NnWWnN', 'NnnnnN', 'NNNNNN', 'NNNNNN', 'KKKKKK'],
};
export const PRODUCT_KEYS2 = Object.keys(PRODUCT_DEFS);
export function productKey2(i) { return PRODUCT_KEYS2[i % PRODUCT_KEYS2.length]; }

const _pcache = {};
function bakeProduct(key) {
  if (_pcache[key]) return _pcache[key];
  const grid = PRODUCT_DEFS[key];
  const h = grid.length, w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = P2[grid[y][x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  _pcache[key] = { canvas: c, w, h };
  return _pcache[key];
}

// Draw pixel product centered at x,y with target height th.
export function drawPixelProduct(ctx, key, x, y, th, opts = {}) {
  const spr = bakeProduct(key);
  const scale = th / spr.h;
  const dw = spr.w * scale, dh = spr.h * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(Math.round(x - dw / 2 + 2), Math.round(y + dh / 2 - 2), dw, 3);
  ctx.drawImage(spr.canvas, Math.round(x - dw / 2), Math.round(y - dh / 2), dw, dh);
  if (opts.label != null) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(th * 0.32)}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 3;
    ctx.strokeText(String(opts.label), x, y);
    ctx.fillText(String(opts.label), x, y);
  }
  ctx.restore();
}

// ---- BOMB timer, Monkey Ball style ----
// A big round cartoon bomb sits at (x,y). A curly fuse rises from its cap and
// the burning spark travels DOWN the fuse toward the bomb as time runs out.
// frac = 1 (full) .. 0 (boom). Returns the spark's screen position (for FX).
export function drawBombTimer(ctx, x, y, frac, t) {
  frac = Math.max(0, Math.min(1, frac));
  const R = 26;
  // panic effects when low on time
  const panic = frac < 0.3 ? (0.3 - frac) / 0.3 : 0;
  const shakeX = panic ? Math.sin(t * 45) * panic * 5 : 0;
  const shakeY = panic ? Math.cos(t * 38) * panic * 4 : 0;
  const pulse = 1 + panic * Math.abs(Math.sin(t * 18)) * 0.12;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x + shakeX, y + shakeY);

  // --- fuse path: curls UP then to the RIGHT so it stays on-screen when the
  // bomb is parked in the top-left corner. ---
  const capX = 2, capY = -R - 2;
  const fusePt = (u) => {
    // rise a little, then sweep right in an arc
    const px = capX + u * 46 + Math.sin(u * Math.PI) * 6;
    const py = capY - Math.sin(u * Math.PI * 0.75) * 20 - u * 4;
    return [px, py];
  };
  // draw fuse: burnt (below spark) dark, unburnt (above spark) rope.
  // spark travels from tip (frac=1 -> u=1) down to cap (frac=0 -> u=0).
  const sparkU = frac;
  ctx.lineCap = 'round';
  // unburnt rope (u from sparkU..1)
  ctx.strokeStyle = '#e0b56a'; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    if (u < sparkU) continue;
    const [fx, fy] = fusePt(u);
    if (u === sparkU || i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
  }
  ctx.stroke();
  // burnt rope (u from 0..sparkU)
  ctx.strokeStyle = '#3a3550'; ctx.lineWidth = 5;
  ctx.beginPath();
  let began = false;
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    if (u > sparkU) break;
    const [fx, fy] = fusePt(u);
    if (!began) { ctx.moveTo(fx, fy); began = true; } else ctx.lineTo(fx, fy);
  }
  ctx.stroke();

  // --- bomb body (big round, thick outline) ---
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#15111f';
  ctx.beginPath(); ctx.arc(0, 0, R + 3, 0, 7); ctx.fill(); // outline ring
  ctx.fillStyle = '#2b2440';
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  // big glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.beginPath(); ctx.arc(-R * 0.34, -R * 0.34, R * 0.42, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(-R * 0.4, -R * 0.4, R * 0.14, 0, 7); ctx.fill();
  ctx.scale(1 / pulse, 1 / pulse);

  // cap (where fuse meets bomb)
  ctx.fillStyle = '#8a7d5a';
  ctx.fillRect(-7, capY - 2, 14, 10);
  ctx.fillStyle = '#6a5f42';
  ctx.fillRect(-7, capY + 4, 14, 4);

  // --- PIXEL FLAME at current fuse position ---
  const [spx, spy] = fusePt(sparkU);
  ctx.imageSmoothingEnabled = false;
  const px = 3; // pixel size for the flame blocks
  const big = 1 + panic * 0.6; // grows when time is low
  // flame body: rows of blocks from base(red) up to tip(white), widths vary
  // animate by shifting a flicker phase per row
  const flame = [
    { c: '#ff5c2e', w: 4, dy: 0 },   // base red
    { c: '#ff8f3c', w: 4, dy: 1 },   // orange
    { c: '#ffc24a', w: 3, dy: 2 },   // amber
    { c: '#ffe27a', w: 3, dy: 3 },   // yellow
    { c: '#ffffff', w: 2, dy: 4 },   // white core
  ];
  for (let r = 0; r < flame.length; r++) {
    const f = flame[r];
    const flick = Math.sin(t * 24 + r * 1.7) + Math.sin(t * 41 + r) * 0.5;
    const w = Math.max(1, Math.round((f.w * big) + (r < 2 ? flick * 0.6 : 0)));
    const sway = Math.round(Math.sin(t * 18 + r * 2.2) * (r + 1) * 0.6);
    const bx = Math.round(spx - (w * px) / 2 + sway);
    const by = Math.round(spy - (f.dy * px) * big - flick * 1.5);
    ctx.fillStyle = f.c;
    ctx.fillRect(bx, by, w * px, px);
  }
  // rising ember pixels
  for (let k = 0; k < 4; k++) {
    const life = (t * 3 + k * 0.37) % 1;
    const ex = Math.round(spx + Math.sin(t * 6 + k * 2) * 8);
    const ey = Math.round(spy - 6 - life * (18 + panic * 12));
    ctx.globalAlpha = 1 - life;
    ctx.fillStyle = k % 2 ? '#ffd15c' : '#ff8f3c';
    ctx.fillRect(ex, ey, px, px);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  return [x + shakeX + spx, y + shakeY + spy];
}
