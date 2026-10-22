// All game scenes: Title, Tutorial, MicrogameRunner, ReportCard.
import {
  Scene, Input, W, H, clamp, lerp, choice, shuffle, randInt,
  easeOutBack, easeOutCubic, easeInOutCubic, roundRect, pixelPanel, pixelRect, pointInRect, Particles,
} from './engine.js';
import { Button, drawBackground, drawHUD, drawBanner } from './ui.js';
import { SHOPPER_COLORS } from './art.js';
import { drawPixelChar, drawPixelProduct, productKey2, CHAR_KEYS } from './pixelart.js';
import { ptext, pTextWidth } from './font.js';
import { TOPICS } from './microgames.js';
import { LEVELS } from './levels.js';
import { PixelExplosion } from './explosion.js';
import { Sfx, Music } from './audio.js';

// Map an index to a distinct pixel character type (stable per index).
const charFor = (i) => CHAR_KEYS[i % CHAR_KEYS.length];

// simple persistent progress (max level unlocked) in localStorage
const PROGRESS_KEY = 'checkoutRushUnlocked';
export function getUnlocked() {
  const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '1', 10);
  return isNaN(v) ? 1 : v;
}
export function setUnlocked(n) {
  if (n > getUnlocked()) localStorage.setItem(PROGRESS_KEY, String(n));
}

// ============================================================
// TITLE
// ============================================================
export class TitleScene extends Scene {
  enter() {
    this.t = 0;
    this.play = new Button(W / 2 - 150, 430, 300, 72, 'PLAY', { size: 34 });
    this.parts = new Particles();
    this.demo = CHAR_KEYS.slice(0, 4);
  }
  update(dt) {
    this.t += dt;
    this.play.update(dt);
    this.parts.update(dt);
    if (Math.random() < 0.06) this.parts.burst(randInt(0, W), -10, choice(SHOPPER_COLORS), 1, { grav: 120, maxSpeed: 40, minSpeed: 10 });
    if (this.play.clicked() || Input.keysJust.has(' ') || Input.keysJust.has('Enter'))
      this.game.setScene(new LevelSelectScene(this.game));
  }
  draw(ctx) {
    drawBackground(ctx, this.t);
    this.parts.draw(ctx);
    for (let i = 0; i < this.demo.length; i++) {
      const x = 250 + i * 160 + Math.sin(this.t + i) * 4;
      drawPixelChar(ctx, this.demo[i], x, 500, 110, { bob: this.t * 4 + i });
    }
    const bob = Math.round(Math.sin(this.t * 2) * 6);
    ctx.save();
    ctx.translate(W / 2, 150 + bob);
    pixelPanel(ctx, -330, -80, 660, 160, '#2a1e4d', '#ffd15c', 5);
    ptext(ctx, 'CHECKOUT', 0, -34, { scale: 8, color: '#ffd15c', align: 'center', outline: true });
    ptext(ctx, 'RUSH', 0, 24, { scale: 8, color: '#ff9f5c', align: 'center', outline: true });
    ctx.restore();
    ptext(ctx, 'MASTER STACKS + QUEUES AT FULL SPEED', W / 2, 258, { scale: 2, color: '#fff', align: 'center' });
    this.play.draw(ctx);
  }
}

// ============================================================
// LEVEL SELECT (a path of nodes)
// ============================================================
export class LevelSelectScene extends Scene {
  enter() {
    this.t = 0;
    this.unlocked = getUnlocked();
    this.hover = -1;
    Music.setTempo(150); Music.start(); // ambient menu music (audio now unlocked)
    // node positions along a zig-zag path
    this.nodes = LEVELS.map((lv, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 150 + col * 220 + (row % 2 === 1 ? 0 : 0);
      const y = 220 + row * 170;
      return { lv, x, y, r: 46 };
    });
    this.back = new Button(24, 20, 130, 46, 'MENU', { size: 20, color: '#7ec8e3' });
  }
  update(dt) {
    this.t += dt;
    this.back.update(dt);
    if (this.back.clicked()) this.game.setScene(new TitleScene(this.game));
    this.hover = -1;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const d = Math.hypot(Input.x - n.x, Input.y - n.y);
      if (d < n.r) {
        this.hover = i;
        if (Input.justUp && n.lv.id <= this.unlocked) {
          this.game.setScene(new TutorialScene(this.game, n.lv));
        }
      }
    }
  }
  draw(ctx) {
    drawBackground(ctx, this.t);
    ctx.fillStyle = 'rgba(20,13,38,0.65)'; ctx.fillRect(0, 0, W, H);
    ptext(ctx, 'CHOOSE A LEVEL', W / 2, 40, { scale: 4, color: '#ffd15c', align: 'center', shadow: true });

    // connecting path lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 6; ctx.setLineDash([10, 10]);
    ctx.beginPath();
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (i === 0) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x, n.y);
    }
    ctx.stroke(); ctx.setLineDash([]);

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const locked = n.lv.id > this.unlocked;
      const isHover = this.hover === i && !locked;
      const pop = isHover ? 1 + Math.sin(this.t * 8) * 0.05 : 1;
      ctx.save();
      ctx.translate(n.x, n.y); ctx.scale(pop, pop);
      // node circle
      ctx.fillStyle = '#15111f';
      ctx.beginPath(); ctx.arc(0, 0, n.r + 3, 0, 7); ctx.fill();
      ctx.fillStyle = locked ? '#4a4458' : n.lv.color;
      ctx.beginPath(); ctx.arc(0, 0, n.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-n.r * 0.3, -n.r * 0.3, n.r * 0.4, 0, 7); ctx.fill();
      // number or lock
      if (locked) ptext(ctx, '?', 0, 0, { scale: 5, color: '#8a8398', align: 'center', baseline: 'middle' });
      else ptext(ctx, String(n.lv.id), 0, 0, { scale: 5, color: '#15111f', align: 'center', baseline: 'middle' });
      ctx.restore();
      // name label
      const col = locked ? '#8a8398' : '#fff';
      ptext(ctx, n.lv.name, n.x, n.y + n.r + 12, { scale: 2, color: col, align: 'center' });
      ptext(ctx, locked ? 'LOCKED' : n.lv.sub, n.x, n.y + n.r + 30, { scale: 1, color: locked ? '#8a8398' : n.lv.color, align: 'center' });
    }
    this.back.draw(ctx);
  }
}

// Shows ONE level's lesson, then launches that level's runner.
export class TutorialScene extends Scene {
  constructor(game, level) {
    super(game);
    this.level = level;
  }
  enter() {
    this.t = 0; this.anim = 0;
    this.L = this.level.lesson;
    this.next = new Button(W / 2 - 150, 508, 300, 62, 'START!', { size: 30 });
    this.back = new Button(24, 20, 130, 46, 'BACK', { size: 20, color: '#7ec8e3' });
  }
  update(dt) {
    this.t += dt; this.anim = Math.min(1, this.anim + dt * 2.2);
    this.next.update(dt); this.back.update(dt);
    if (this.next.clicked() || Input.keysJust.has(' '))
      this.game.setScene(new MicrogameRunner(this.game, this.level));
    if (this.back.clicked()) this.game.setScene(new LevelSelectScene(this.game));
  }
  draw(ctx) {
    drawBackground(ctx, this.t);
    ctx.fillStyle = 'rgba(20,13,38,0.55)'; ctx.fillRect(0, 0, W, H);
    const L = this.L;
    const p = easeOutBack(clamp(this.anim, 0, 1));
    ptext(ctx, 'LEVEL ' + this.level.id, W / 2, 34, { scale: 2, color: '#bfae7d', align: 'center' });
    ctx.save();
    ctx.translate(W / 2, 62);
    ctx.scale(p, p);
    pixelPanel(ctx, -400, 0, 800, 150, '#1a1230', L.color, 5);
    ptext(ctx, L.title, 0, 20, { scale: 4, color: L.color, align: 'center', shadow: true });
    L.lines.forEach((ln, i) =>
      ptext(ctx, ln, 0, 66 + i * 24, { scale: 2, color: '#fff', align: 'center' }));
    ctx.restore();
    this.drawDemo(ctx, L.visual);
    this.next.draw(ctx); this.back.draw(ctx);
  }
  drawDemo(ctx, visual) {
    const cy = 340;
    if (visual === 'queue' || visual === 'ops') {
      for (let i = 0; i < 4; i++)
        drawPixelChar(ctx, charFor(i), 250 + i * 160, cy + 55, 104, { bob: this.t * 3 + i, label: i + 1 });
      ptext(ctx, '<-- SERVED FIRST', 210, cy - 60, { scale: 2, color: '#6be585', align: 'left' });
      ptext(ctx, 'JOINED LAST -->', 750, cy - 60, { scale: 2, color: '#ff9f5c', align: 'right' });
    } else if (visual === 'stack') {
      const bx = W / 2, bh = 48;
      for (let i = 0; i < 4; i++) {
        const y = cy + 70 - i * (bh + 6);
        drawPixelProduct(ctx, productKey2(i), bx, y, bh, { label: i + 1 });
        if (i === 3) ptext(ctx, '<-- GRAB THIS FIRST', bx + 60, y, { scale: 2, color: '#6be585', align: 'left', baseline: 'middle' });
      }
    } else {
      const bx = W / 2, bw = 230, bh = 44;
      const frames = ['MAIN()', 'A()', 'B()', 'C()'];
      for (let i = 0; i < frames.length; i++) {
        const y = cy + 70 - i * (bh + 6);
        ctx.fillStyle = i === frames.length - 1 ? '#ff6b6b' : '#5c9bff';
        roundRect(ctx, bx - bw / 2, y - bh / 2, bw, bh, 8); ctx.fill();
        ctx.strokeStyle = '#15111f'; ctx.lineWidth = 3;
        roundRect(ctx, bx - bw / 2, y - bh / 2, bw, bh, 8); ctx.stroke();
        ptext(ctx, frames[i], bx, y, { scale: 2, color: '#fff', align: 'center', baseline: 'middle' });
        if (i === frames.length - 1) ptext(ctx, '<-- RUNNING NOW', bx + bw / 2 + 14, y, { scale: 2, color: '#6be585', align: 'left', baseline: 'middle' });
      }
    }
  }
}

// ============================================================
// MICROGAME RUNNER — the core loop
// ============================================================

export class MicrogameRunner extends Scene {
  constructor(game, level) {
    super(game);
    this.level = level;
  }
  enter() {
    this.state = {
      score: 0, streak: 0, lives: 3, maxLives: 3,
      round: 0, cleared: 0, speedTier: 0,
      timeLeft: 6, timeMax: 6,
    };
    this.report = {}; // topic -> {correct, total}
    for (const key of Object.values(TOPICS)) this.report[key] = { correct: 0, total: 0 };
    this.parts = new Particles();
    this.explosion = null;
    this.banner = { text: '', t: 0 };
    // phases: checkout | intro | play | feedback | banner | exploding
    this.phase = 'intro';
    this.feedbackT = 0;
    this.wasCorrect = false;
    this.t = 0;
    this._lastHov = null;
    this.endless = this.level.rounds === Infinity;
    // The LINE: one shopper per round to check out. Objective = clear them all.
    this.lineTotal = this.endless ? 8 : this.level.rounds;
    this.lineServed = 0;      // how many have left happily
    this.lineChars = [];
    for (let i = 0; i < this.lineTotal; i++) this.lineChars.push(charFor(randInt(0, 3)));
    this.lastResult = null;   // 'win' | 'fail' for the checkout animation
    this.bossActive = false;
    Music.setTempo(156);
    Music.start();
    // Build the first question but OPEN with the line walking in.
    this.loadNext(true);      // sets this.q and goes to intro...
    this.phase = 'linestart'; // ...but override: show the line arriving first
    this.lineStartT = 0;
    Sfx.zoomOut();
  }
  exit() {
    // keep music playing across menus, but reset tempo
    Music.setTempo(156);
  }

  currentTimeMax() {
    // base from level, shrink as speed tiers rise
    return Math.max(1.4, this.level.startTime - this.state.speedTier * 0.4);
  }

  // Build the next question but DON'T start it — first play a checkout
  // interstitial (zoom out to the shop), then an intro zoom (big text).
  loadNext(skipCheckout = false) {
    this.state.round++;
    this.pendingSpeedup = (this.state.round > 1 && (this.state.round - 1) % 5 === 0);
    if (this.pendingSpeedup) { this.state.speedTier++; Music.setTempo(156 + this.state.speedTier * 10); }
    const factory = choice(this.level.pool);
    this.q = factory();
    this.buildWidgets();
    let tm = this.currentTimeMax();
    if (this.q.kind === 'serve') tm += this.q.order.length * 0.7;
    else if (this.q.kind === 'arrange') tm += 3.0 + this.q.items.length * 0.8; // dragging is slow
    else if (this.q.kind === 'bins') tm += 3.5 + this.q.items.length * 0.9; // sorting takes thought
    else if (this.q.kind === 'memory') tm += 1.5; // reveal is paused; recall is quick
    else if (this.q.kind === 'truefalse') tm += 1.5; // reading a statement takes a beat
    else if (this.q.kind === 'choice') tm += 1.5;
    this.state.timeMax = tm;
    this.state.timeLeft = this.state.timeMax;
    this.answered = false;
    if (skipCheckout) this.startIntro();
    else this.startCheckout();
  }

  startCheckout() {
    this.phase = 'checkout';
    this.checkoutT = 0;
    this.checkoutDur = 1.5;
    this._checkoutDinged = false;
    Sfx.zoomOut();
  }

  startIntro() {
    this.phase = 'intro';
    this.introT = 0;
    Sfx.zoomIn();
  }

  // ---- BOSS ----
  startBossAlert() {
    this.phase = 'bossalert';
    this.bossAlertT = 0;
    Sfx.speedUp();
    this.game.shake(10, 0.4);
  }

  loadBoss() {
    this.bossActive = true;
    // a big multi-step serve: clear a LONG structure (6 items), extra time.
    const bigQueue = Math.random() < 0.5;
    const n = 6;
    const NM = ['Ana', 'Bo', 'Cy', 'Dee', 'Eli', 'Fin', 'Gus', 'Hana'];
    if (bigQueue) {
      const people = shuffle(NM).slice(0, n);
      const entities = people.map((nm, i) => ({ id: i, label: nm, type: 'person' }));
      this.q = { kind: 'serve', topic: TOPICS.QUEUE_FIFO, structure: 'queue',
        prompt: 'BOSS RUSH! SERVE THE WHOLE LINE FRONT-TO-BACK',
        entities, order: entities.map((e) => e.id),
        explain: 'A huge FIFO rush — serve the front each time until the line is empty.' };
    } else {
      const entities = [];
      for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey2(randInt(0, 7)), type: 'product' });
      this.q = { kind: 'serve', topic: TOPICS.STACK_FILO, structure: 'stack',
        prompt: 'BOSS RUSH! CLEAR THE HUGE PILE TOP-TO-BOTTOM',
        entities, order: entities.map((e) => e.id).reverse(),
        explain: 'A towering FILO pile — always take the TOP, all the way down.' };
    }
    this.buildWidgets();
    this.state.timeMax = 9 + n * 0.9; // EXTRA generous time for the boss
    this.state.timeLeft = this.state.timeMax;
    this.startIntro();
  }

  buildWidgets() {
    this.buttons = [];
    this.slots = null; this.tokens = null; this.dragging = null;
    this.entities = null; this.servedCount = 0; this.wrongFlash = 0;
    this.bins = null; this.memChoices = null; this.memT = 0; this.choiceBtns = null;
    if (this.q.kind === 'tap' || this.q.kind === 'serve') {
      this.buildEntities();
    } else if (this.q.kind === 'bins') {
      this.buildBins();
    } else if (this.q.kind === 'memory') {
      this.buildMemory();
    } else if (this.q.kind === 'truefalse') {
      const bw = 220, bh = 130, gap = 90;
      this.choiceBtns = [
        new Button(W / 2 - bw - gap / 2, 340, bw, bh, 'TRUE', { size: 40, color: '#6be585', textColor: '#12283a' }),
        new Button(W / 2 + gap / 2, 340, bw, bh, 'FALSE', { size: 40, color: '#ff6b6b', textColor: '#12283a' }),
      ];
    } else if (this.q.kind === 'choice') {
      const bw = 260, bh = 130, gap = 70;
      this.choiceBtns = this.q.labels.map((lb, i) =>
        new Button(W / 2 - bw - gap / 2 + i * (bw + gap), 340, bw, bh, lb,
          { size: 36, color: i === 0 ? '#ffd15c' : '#4ecdc4', textColor: '#12283a' }));
    } else {
      // arrange: tokens shuffled at top, target slots at bottom
      const n = this.q.items.length;
      const sw = 150, sh = 128, gap = 24; // taller cards so label never covers face
      const totalW = n * sw + (n - 1) * gap;
      const sx = W / 2 - totalW / 2;
      this.slots = [];
      for (let i = 0; i < n; i++)
        this.slots.push({ x: sx + i * (sw + gap), y: H - 172, w: sw, h: sh, token: null });
      // tokens start in a shuffled tray
      const order = shuffle(this.q.items.map((_, i) => i));
      this.tokens = order.map((itemIdx, i) => ({
        itemIdx,
        label: this.q.items[itemIdx].label,
        color: SHOPPER_COLORS[itemIdx % SHOPPER_COLORS.length],
        char: charFor(itemIdx),
        x: sx + i * (sw + gap) + sw / 2,
        y: 268,
        home: { x: sx + i * (sw + gap) + sw / 2, y: 268 },
        w: sw, h: sh, slot: null,
      }));
    }
  }

  buildEntities() {
    const defs = this.q.entities;
    const n = defs.length;
    this.entities = [];
    if (this.q.structure === 'queue') {
      // fill the width; big characters
      const gap = Math.min(200, (W - 160) / n);
      const startX = W / 2 - (n - 1) * gap / 2;
      const feetY = 500;
      const size = 150;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * gap;
        this.entities.push({
          ...defs[i], cx, feetY, size, removed: false, pop: 0,
          hit: { x: cx - size * 0.32, y: feetY - size, w: size * 0.64, h: size + 20 },
          char: charFor(i),
        });
      }
    } else if (this.q.structure === 'queueframe') {
      // horizontal row of labeled frame cells (print queue, brackets)
      const cw = Math.min(180, (W - 120) / n) - 12;
      const gap = cw + 24;
      const startX = W / 2 - (n - 1) * gap / 2;
      const cy = 360, ch = 90;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * gap;
        this.entities.push({
          ...defs[i], cx, cy, w: cw, h: ch, removed: false, pop: 0, horiz: true,
          hit: { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch },
        });
      }
    } else { // stack (products or frames), bottom->top = index 0..n-1
      const cx = W / 2, baseY = 560;
      // size cells to fill vertical space (play area ~180..580)
      const avail = 360;
      const cellH = Math.min(78, (avail - (n - 1) * 8) / n);
      const isProduct = defs[0] && defs[0].type === 'product';
      const cw = isProduct ? cellH * 1.15 : 300;
      for (let i = 0; i < n; i++) {
        const cy = baseY - i * (cellH + 8) - cellH / 2;
        this.entities.push({
          ...defs[i], cx, cy, w: cw, h: cellH, removed: false, pop: 0,
          hit: { x: cx - cw / 2, y: cy - cellH / 2, w: cw, h: cellH },
        });
      }
    }
  }

  buildBins() {
    // two labeled bins at the bottom; draggable item cards in a tray up top
    const bw = 300, bh = 150, bgap = 80;
    const bx0 = W / 2 - bw - bgap / 2;
    this.bins = [
      { x: bx0, y: H - 180, w: bw, h: bh, label: this.q.binLabels[0], id: 0 },
      { x: bx0 + bw + bgap, y: H - 180, w: bw, h: bh, label: this.q.binLabels[1], id: 1 },
    ];
    const items = this.q.items;
    const n = items.length;
    const tw = 150, gap = 20;
    const totalW = n * tw + (n - 1) * gap;
    const sx = W / 2 - totalW / 2;
    const order = shuffle(items.map((_, i) => i));
    this.tokens = order.map((idx, i) => ({
      idx, label: items[idx].label, bin: items[idx].bin,
      color: SHOPPER_COLORS[idx % SHOPPER_COLORS.length],
      x: sx + i * (tw + gap) + tw / 2, y: 250,
      home: { x: sx + i * (tw + gap) + tw / 2, y: 250 },
      w: tw, h: 70, placedBin: null, correct: false,
    }));
  }

  buildMemory() {
    // phase within the play: 'show' the pile, then hide and offer choices
    this.memT = 0;
    this.memShown = true;
    // build choice buttons
    const cs = this.q.choices;
    const n = cs.length;
    const bw = 150, bh = 66, gap = 20;
    const totalW = n * bw + (n - 1) * gap;
    const sx = W / 2 - totalW / 2;
    this.memChoices = cs.map((c, i) => new Button(sx + i * (bw + gap), H - 150, bw, bh, c.label,
      { size: 26, color: '#7ec8e3', textColor: '#12283a' }));
  }

  showBanner(str, color, secs) {
    this.banner = { text: str, t: secs, max: secs, color };
    this.phase = 'banner';
  }

  loseLife() {
    this.state.lives--;
    this.state.streak = 0;
    this.game.shake(14, 0.35);
    this.game.flash('#ff4d6d', 0.2);
  }

  recordResult(correct, timedOut = false) {
    const r = this.report[this.q.topic];
    if (r) { r.total++; if (correct) r.correct++; }
    this.wasCorrect = correct;
    this.lastResult = correct ? 'win' : 'fail';
    if (correct) {
      this.state.streak++;
      this.state.cleared++;
      const bonus = Math.round(this.state.timeLeft * 20);
      this.state.score += 100 + bonus + this.state.streak * 10;
      // FLASHY: rainbow confetti explosion + big flash + shake
      const conf = ['#ff6b6b', '#ffd15c', '#6be585', '#5c9bff', '#f78fb3', '#ffffff'];
      for (const c of conf) this.parts.burst(Input.x, Input.y, c, 16, { up: 140, maxSpeed: 420 });
      this.parts.burst(W / 2, H / 2, choice(conf), 24, { up: 60, maxSpeed: 300 });
      this.game.flash(choice(conf), 0.16);
      this.game.shake(8 + Math.min(this.state.streak, 8), 0.25);
      Sfx.correct();
    } else {
      this.loseLife();
      Sfx.wrong();
    }
    if (!correct) {
      // EVERY miss makes the bomb blow up, WarioWare-style.
      // If lives remain we still show the explanation afterward; otherwise game over.
      this.startExplosion(this.state.lives <= 0 ? 'gameover' : 'feedback');
      return;
    }
    this.phase = 'feedback';
    this.feedbackT = 1.7;
  }

  startExplosion(after = 'gameover') {
    // explode from the bomb position (top-left HUD)
    Sfx.explode();
    this.explosion = new PixelExplosion(56, 62);
    this.phase = 'exploding';
    this.explodeT = 0;
    this.afterExplode = after;
    // bigger shake if it's fatal
    this.game.shake(after === 'gameover' ? 28 : 16, after === 'gameover' ? 0.6 : 0.35);
    this.game.flash('#ffffff', 0.3);
  }

  // ---- update ----
  update(dt) {
    this.t += dt;
    this.parts.update(dt);

    // Level opener: the whole line walks in, THEN the first question begins.
    if (this.phase === 'linestart') {
      this.lineStartT += dt;
      if (this.lineStartT >= 2.2 || Input.justUp) this.startIntro();
      return;
    }

    // Boss alert: dramatic warning, then the boss appears.
    if (this.phase === 'bossalert') {
      this.bossAlertT += dt;
      if (this.bossAlertT >= 2.4) this.loadBoss();
      return;
    }

    // WarioWare interstitial: zoom out to the shop. The FRONT shopper either
    // gets checked out (win) or storms off angry (fail); then the line shrinks.
    if (this.phase === 'checkout') {
      this.checkoutT += dt;
      // the "moment": register ding + coins on win, angry buzz on fail
      if (this.checkoutT > this.checkoutDur * 0.45 && !this._checkoutDinged) {
        this._checkoutDinged = true;
        if (this.lastResult === 'win') {
          Sfx.checkout();
          this.parts.burst(W / 2 + 40, 400, '#ffd15c', 18, { up: 80 });
        } else {
          Sfx.angry();
          this.parts.burst(W / 2 - 60, 360, '#ff6b6b', 12, { up: 30 });
        }
      }
      if (this.checkoutT >= this.checkoutDur) {
        // NOW the person is fully gone: on a win, the line shrinks by one.
        if (this.lastResult === 'win') this.lineServed++;
        if (this.pendingSpeedup) {
          // enter a dedicated SPEEDUP phase (drawn over the shop, NOT the question)
          this.pendingSpeedup = false;
          this.phase = 'speedup';
          this.speedupT = 0;
          Sfx.speedUp();
        } else this.startIntro();
      }
      return;
    }

    // Speed-up alert: rising WarioWare fanfare over the shop, then next question.
    if (this.phase === 'speedup') {
      this.speedupT += dt;
      if (this.speedupT >= 1.8) this.startIntro();
      return;
    }

    // Zoom-in intro: big question text shrinks; then play begins
    if (this.phase === 'intro') {
      this.introT = Math.min(1, (this.introT || 0) + dt * 1.3);
      if (this.introT >= 1) this.phase = 'play';
      return;
    }

    if (this.phase === 'banner') {
      this.banner.t -= dt;
      if (this.banner.t <= 0) { if (this._afterBanner === 'intro') { this._afterBanner = null; this.startIntro(); } else this.phase = 'play'; }
      return;
    }

    if (this.phase === 'exploding') {
      this.explodeT += dt;
      if (this.explosion) this.explosion.update(dt);
      const dur = this.afterExplode === 'gameover' ? 1.4 : 0.7;
      if (this.explodeT > dur) {
        if (this.afterExplode === 'gameover') {
          this.game.setScene(new GameOverScene(this.game, this.state, this.report, this.level));
        } else {
          // resume to show the explanation, then continue
          this.phase = 'feedback';
          this.feedbackT = 1.7;
        }
      }
      return;
    }

    if (this.phase === 'feedback') {
      this.feedbackT -= dt;
      // allow skipping feedback with click/space
      if (Input.justUp || Input.keysJust.has(' ')) this.feedbackT = Math.min(this.feedbackT, 0.05);
      if (this.feedbackT <= 0) {
        if (this.state.lives <= 0) {
          this.game.setScene(new GameOverScene(this.game, this.state, this.report, this.level));
        } else if (this.bossActive) {
          // beat the boss -> level complete
          setUnlocked(this.level.id + 1);
          Sfx.levelClear();
          this.game.setScene(new ReportScene(this.game, this.state, this.report, this.level, true));
        } else if (!this.endless && this.state.cleared >= this.level.rounds) {
          // all normal customers served -> BOSS TIME
          this.startBossAlert();
        } else this.loadNext();
      }
      return;
    }

    // PLAY phase — timer runs (paused during a memory reveal)
    const memRevealing = this.q.kind === 'memory' && this.memShown;
    if (!memRevealing) {
      this.state.timeLeft -= dt;
      if (this.state.timeLeft <= 0) {
        this.state.timeLeft = 0;
        this.recordResult(false, true);
        return;
      }
    }

    if (this.wrongFlash > 0) this.wrongFlash -= dt;
    for (const e of (this.entities || [])) if (e.pop > 0) e.pop = Math.max(0, e.pop - dt * 2);
    if (this.q.kind === 'arrange') this.updateArrange(dt);
    else if (this.q.kind === 'bins') this.updateBins(dt);
    else if (this.q.kind === 'memory') this.updateMemory(dt);
    else if (this.q.kind === 'truefalse' || this.q.kind === 'choice') this.updateChoice(dt);
    else this.updateTapServe(dt);
  }

  updateChoice(dt) {
    for (const b of this.choiceBtns) b.update(dt);
    for (let i = 0; i < this.choiceBtns.length; i++) {
      if (this.choiceBtns[i].clicked()) {
        let correct;
        if (this.q.kind === 'truefalse') correct = (i === 0) === this.q.answer;
        else correct = i === this.q.correctId;
        this.choiceBtns[i].popColor = correct ? '#6be585' : '#ff4d6d';
        this.choiceBtns[i].pop = 1;
        for (const b of this.choiceBtns) b.enabled = false;
        this.recordResult(correct);
        return;
      }
    }
  }

  updateBins(dt) {
    // pick up a token
    if (Input.justDown && !this.dragging) {
      for (let i = this.tokens.length - 1; i >= 0; i--) {
        const tk = this.tokens[i];
        if (tk.placedBin != null && tk.correct) continue; // locked in
        if (pointInRect(Input.x, Input.y, tk.x - tk.w / 2, tk.y - tk.h / 2, tk.w, tk.h)) {
          this.dragging = tk; tk.placedBin = null; Sfx.pick(); break;
        }
      }
    }
    if (this.dragging) {
      this.dragging.x = lerp(this.dragging.x, Input.x, 0.5);
      this.dragging.y = lerp(this.dragging.y, Input.y, 0.5);
      if (Input.justUp) {
        let dropped = null;
        for (const b of this.bins)
          if (pointInRect(Input.x, Input.y, b.x, b.y, b.w, b.h)) dropped = b;
        if (dropped) {
          const ok = dropped.id === this.dragging.bin;
          this.dragging.placedBin = dropped.id;
          this.dragging.correct = ok;
          if (ok) { Sfx.pop(); this.parts.burst(Input.x, Input.y, '#6be585', 8, { up: 60 }); }
          else { Sfx.wrong(); this.wrongFlash = 0.5; this.dragging.x = this.dragging.home.x; this.dragging.y = this.dragging.home.y; this.dragging.placedBin = null; }
        } else { this.dragging.x = this.dragging.home.x; this.dragging.y = this.dragging.home.y; }
        this.dragging = null;
        // all placed correctly?
        if (this.tokens.every((t) => t.correct)) this.recordResult(true);
      }
    }
    for (const tk of this.tokens) {
      if (tk === this.dragging) continue;
      if (tk.placedBin != null && tk.correct) {
        const b = this.bins[tk.placedBin];
        const members = this.tokens.filter((x) => x.correct && x.placedBin === tk.placedBin);
        const mi = members.indexOf(tk);
        const tx = b.x + 20 + (mi % 2) * (b.w / 2);
        const ty = b.y + 40 + Math.floor(mi / 2) * 46;
        tk.x = lerp(tk.x, tx, 0.3); tk.y = lerp(tk.y, ty, 0.3);
      } else {
        tk.x = lerp(tk.x, tk.home.x, 0.3); tk.y = lerp(tk.y, tk.home.y, 0.3);
      }
    }
  }

  updateMemory(dt) {
    this.memT += dt;
    if (this.memShown) {
      // reveal for ~1.4s (shrinks with speed tier), then hide
      if (this.memT > Math.max(0.9, 1.6 - this.state.speedTier * 0.15)) { this.memShown = false; Sfx.zoomOut(); }
      return;
    }
    for (const b of this.memChoices) b.update(dt);
    for (let i = 0; i < this.memChoices.length; i++) {
      if (this.memChoices[i].clicked()) {
        const ok = i === this.q.correctId;
        this.memChoices[i].popColor = ok ? '#6be585' : '#ff4d6d'; this.memChoices[i].pop = 1;
        for (const b of this.memChoices) b.enabled = false;
        this.recordResult(ok);
        return;
      }
    }
  }

  entityAt(px, py) {
    // topmost first: for stacks that's highest index; iterate reversed
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.removed) continue;
      const h = e.hit;
      if (pointInRect(px, py, h.x, h.y, h.w, h.h)) return e;
    }
    return null;
  }

  updateTapServe() {
    if (!Input.justUp) return;
    const e = this.entityAt(Input.x, Input.y);
    if (!e) return;
    if (this.q.kind === 'tap') {
      const correct = e.id === this.q.correctId;
      e.pop = 1;
      this.recordResult(correct);
      return;
    }
    // SERVE: must click in the required order
    const expectedId = this.q.order[this.servedCount];
    if (e.id === expectedId) {
      e.removed = true; e.pop = 1;
      this.servedCount++;
      this.parts.burst(Input.x, Input.y, '#6be585', 12, { up: 80 });
      if (this.servedCount >= this.q.order.length) { Sfx.serveDone(); this.recordResult(true); }
      else Sfx.pop();
    } else {
      this.wrongFlash = 0.4;
      this.game.shake(8, 0.2);
      this.recordResult(false);
    }
  }


  updateArrange(dt) {
    // pick up token
    if (Input.justDown && !this.dragging) {
      for (let i = this.tokens.length - 1; i >= 0; i--) {
        const tk = this.tokens[i];
        if (pointInRect(Input.x, Input.y, tk.x - tk.w / 2, tk.y - tk.h / 2, tk.w, tk.h)) {
          this.dragging = tk;
          // free its slot
          if (tk.slot != null) { this.slots[tk.slot].token = null; tk.slot = null; }
          break;
        }
      }
    }
    if (this.dragging) {
      this.dragging.x = lerp(this.dragging.x, Input.x, 0.5);
      this.dragging.y = lerp(this.dragging.y, Input.y, 0.5);
      if (Input.justUp) {
        // drop into nearest empty slot if over one
        let placed = false;
        for (let s = 0; s < this.slots.length; s++) {
          const sl = this.slots[s];
          if (!sl.token && pointInRect(Input.x, Input.y, sl.x, sl.y, sl.w, sl.h)) {
            sl.token = this.dragging; this.dragging.slot = s;
            this.dragging.x = sl.x + sl.w / 2; this.dragging.y = sl.y + sl.h / 2;
            placed = true; break;
          }
        }
        if (!placed) { this.dragging.x = this.dragging.home.x; this.dragging.y = this.dragging.home.y; }
        this.dragging = null;
        this.checkArrangeComplete();
      }
    }
    // ease non-dragged tokens home / to slot
    for (const tk of this.tokens) {
      if (tk === this.dragging) continue;
      const target = tk.slot != null
        ? { x: this.slots[tk.slot].x + this.slots[tk.slot].w / 2, y: this.slots[tk.slot].y + this.slots[tk.slot].h / 2 }
        : tk.home;
      tk.x = lerp(tk.x, target.x, 0.25);
      tk.y = lerp(tk.y, target.y, 0.25);
    }
  }

  checkArrangeComplete() {
    if (this.slots.some((s) => !s.token)) return; // not full yet
    // compare filled order to correctOrder
    const placedOrder = this.slots.map((s) => s.token.itemIdx);
    const correct = placedOrder.every((v, i) => v === this.q.correctOrder[i]);
    this.recordResult(correct);
  }

  // ---- draw ----
  draw(ctx) {
    drawBackground(ctx, this.t);

    if (this.phase === 'linestart') {
      this.drawLineStart(ctx);
      this.parts.draw(ctx);
      drawHUD(ctx, this.state, this.t);
      return;
    }

    if (this.phase === 'bossalert') {
      this.drawBossAlert(ctx);
      return;
    }

    if (this.phase === 'checkout' || this.phase === 'speedup') {
      this.drawCheckout(ctx);
      this.parts.draw(ctx);
      drawHUD(ctx, this.state, this.t);
      if (this.phase === 'speedup') {
        drawBanner(ctx, 'SPEEDING UP!', clamp(this.speedupT / 1.8, 0, 1), '#ff9f5c', this.t);
      }
      return;
    }

    // The gameplay is scaled up during the 'intro' zoom for a WarioWare feel.
    const introP = this.phase === 'intro' ? this.introT : 1; // 0..1
    const gameScale = this.phase === 'intro' ? lerp(1.4, 1.0, introP) : 1;
    ctx.save();
    ctx.translate(W / 2, H / 2 + 40);
    ctx.scale(gameScale, gameScale);
    ctx.translate(-W / 2, -(H / 2 + 40));
    if (this.q.kind === 'arrange') this.drawArrange(ctx);
    else if (this.q.kind === 'bins') this.drawBins(ctx);
    else if (this.q.kind === 'memory') this.drawMemory(ctx);
    else if (this.q.kind === 'truefalse' || this.q.kind === 'choice') this.drawChoice(ctx);
    else this.drawEntities(ctx);
    ctx.restore();

    this.parts.draw(ctx);

    // prompt: BIG + centered during intro, small banner during play
    this.drawPrompt(ctx);

    drawHUD(ctx, this.state, this.t);

    if (this.phase === 'exploding' && this.explosion) {
      // white-out then explosion over darkening screen
      ctx.fillStyle = `rgba(20,13,38,${Math.min(0.7, this.explodeT)})`;
      ctx.fillRect(0, 0, W, H);
      this.explosion.draw(ctx);
    }
    if (this.phase === 'banner') drawBanner(ctx, this.banner.text, 1 - this.banner.t / this.banner.max, this.banner.color, this.t);
    if (this.phase === 'feedback') this.drawFeedback(ctx);
  }

  // Big question text during intro; compact top banner during play.
  drawPrompt(ctx) {
    const rainbow = ['#ff6b6b', '#ffd15c', '#6be585', '#5c9bff', '#f78fb3'];
    const rainCol = rainbow[Math.floor(this.t * 8) % rainbow.length];
    if (this.phase === 'intro') {
      // p: 0..1. Hold big for the first ~35%, then smoothly zoom to the top.
      const raw = this.introT;
      const zoom = raw < 0.35 ? 0 : easeInOutCubic((raw - 0.35) / 0.65);
      // dim overlay fades as it settles
      ctx.fillStyle = `rgba(20,13,38,${0.55 * (1 - zoom)})`;
      ctx.fillRect(0, 0, W, H);
      // draw the prompt on an offscreen-sized card at scale 2, then SCALE the
      // whole thing with a canvas transform so it shrinks perfectly smoothly
      // (no integer snapping).
      const bigScale = 4.0, smallScale = 2.4; // shorter prompts => bigger, punchier
      const s = lerp(bigScale, smallScale, zoom) / smallScale; // transform factor
      const cx = W / 2;
      const cy = lerp(H / 2 - 20, 108, zoom);
      const pulse = 1 + Math.sin(this.t * 12) * 0.03 * (1 - zoom);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s * pulse, s * pulse);
      // card sized for the small (final) layout; the transform makes it big early
      const cardW = W - 90;
      ctx.shadowColor = rainCol; ctx.shadowBlur = 20 * (1 - zoom) + 6;
      pixelPanel(ctx, -cardW / 2, -34, cardW, 68, '#1a1230', rainCol, 4);
      ctx.shadowBlur = 0;
      this.wrapPixel(ctx, this.q.prompt, 0, 0, cardW - 36, 22, '#ffffff', smallScale, true);
      ctx.restore();
    } else {
      // compact banner at top (pixel panel)
      pixelPanel(ctx, 40, 80, W - 80, 56, '#1a1230', rainCol, 4);
      this.wrapPixel(ctx, this.q.prompt, W / 2, 108, W - 120, 20, '#ffffff', 2, true);
      ptext(ctx, this.q.topic, 52, 150, { scale: 1, color: '#7ec8e3', align: 'left' });
      if (this.bossActive) ptext(ctx, 'BOSS!', W - 52, 150, { scale: 2, color: '#ff5c5c', align: 'right', outline: true });
      else if (!this.endless) ptext(ctx, this.state.cleared + '/' + this.level.rounds, W - 52, 150, { scale: 1, color: '#bfae7d', align: 'right' });
      else ptext(ctx, 'SURVIVAL R' + this.state.round, W - 52, 150, { scale: 1, color: '#f78fb3', align: 'right' });
    }
  }

  // BOSS ALERT: flashing red warning + a big scowling boss shopper stomps in.
  drawBossAlert(ctx) {
    const p = clamp(this.bossAlertT / 2.4, 0, 1);
    // flashing red overlay
    const flash = Math.sin(this.bossAlertT * 12) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(180,20,30,${0.25 + flash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
    // warning stripes top & bottom
    ctx.fillStyle = '#ffd15c';
    for (let x = -40; x < W; x += 60) {
      ctx.save(); ctx.translate(x + (this.t * 30 % 60), 0);
      ctx.fillStyle = flash > 0.5 ? '#ffd15c' : '#15111f';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.lineTo(10, 24); ctx.lineTo(-20, 24); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(30, H); ctx.lineTo(10, H - 24); ctx.lineTo(-20, H - 24); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // big boss shopper stomps up from the right
    const bx = lerp(W + 160, W / 2, easeOutCubic(clamp(p * 1.4, 0, 1)));
    const bob = Math.abs(Math.sin(this.t * 8)) * 10;
    drawPixelChar(ctx, 'jimmy', bx, 470 - bob, 300, {});
    ptext(ctx, 'GRR', bx, 150, { scale: 5, color: '#ff5c5c', align: 'center', outline: true });
    // banner
    const bs = 1 + Math.sin(this.bossAlertT * 18) * 0.06;
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(bs, bs);
    pixelPanel(ctx, -300, -44, 600, 88, '#7a1e2e', '#ff5c5c', 5);
    ptext(ctx, 'BOSS INCOMING!', 0, 0, { scale: 6, color: '#fff', align: 'center', baseline: 'middle', outline: true, outlineColor: '#7a1e2e' });
    ctx.restore();
  }

  // Level opener: the whole line of shoppers strolls in from the right.
  drawLineStart(ctx) {
    const p = clamp(this.lineStartT / 2.2, 0, 1);
    const counterY = 452, frontSlot = W / 2 - 60, gap = 118, size = 132;
    // register + clerk (static)
    pixelPanel(ctx, W / 2 + 80, counterY - 74, 104, 80, '#2b2440', '#15111f', 4);
    ctx.fillStyle = '#6be585'; ctx.fillRect(W / 2 + 92, counterY - 62, 78, 30);
    drawPixelChar(ctx, 'penny', W / 2 + 248, counterY + 4, 150, { bob: this.t * 3 });
    // shoppers slide in from off-screen right to their spots (eased)
    const ease = easeOutCubic(p);
    const show = Math.min(this.lineTotal, 7);
    for (let k = show - 1; k >= 0; k--) {
      const targetX = frontSlot - k * gap;
      const x = lerp(W + 120 + k * gap, targetX, ease);
      drawPixelChar(ctx, this.lineChars[k], x, counterY + 12, size, { bob: this.t * 4 + k });
    }
    // big title
    ptext(ctx, this.level.name, W / 2, 210, { scale: 5, color: this.level.color, align: 'center', outline: true });
    ptext(ctx, this.lineTotal + ' CUSTOMERS TO SERVE!', W / 2, 262, { scale: 2, color: '#ffffff', align: 'center', outline: true });
    if (p > 0.6) ptext(ctx, 'GET READY...', W / 2, 300, { scale: 2, color: '#ffd15c', align: 'center', outline: true });
  }

  // Interstitial: ONE continuous line. The front shopper (index lineServed)
  // moves out; on a win everyone behind shuffles forward one slot.
  drawCheckout(ctx) {
    const p = clamp(this.checkoutT / this.checkoutDur, 0, 1);
    const win = this.lastResult === 'win';
    const counterY = 452;
    const registerX = W / 2 + 120;
    const frontSlot = W / 2 - 60;   // where the front-of-line stands
    const gap = 118;                // spacing between people
    const size = 132;

    // ---- counter / register / clerk ----
    pixelPanel(ctx, registerX - 40, counterY - 10, W - (registerX - 40) - 40, 72, '#c9a24a', '#a9822f', 4);
    ctx.fillStyle = '#a9822f';
    ctx.fillRect(registerX - 40, counterY + 48, W - (registerX - 40) - 40, 14);
    pixelPanel(ctx, registerX, counterY - 74, 104, 80, '#2b2440', '#15111f', 4);
    ctx.fillStyle = win ? '#6be585' : '#7ec8e3';
    ctx.fillRect(registerX + 12, counterY - 62, 78, 30);
    ptext(ctx, '$' + this.state.score, registerX + 51, counterY - 47, { scale: 2, color: '#15111f', align: 'center', baseline: 'middle' });
    drawPixelChar(ctx, 'penny', registerX + 168, counterY + 4, 150, { bob: this.t * 3 });

    // how many people are still waiting (front person is index lineServed)
    const remaining = this.lineTotal - this.lineServed;

    // On a win, the whole line slides forward by one slot as the front leaves.
    const shift = win ? p * gap : 0;

    // draw from back to front so the front person is on top
    for (let k = Math.min(remaining, 7) - 1; k >= 0; k--) {
      const idx = this.lineServed + k;
      const ch = this.lineChars[idx] || 'greg';
      let x = frontSlot - k * gap + shift;
      let bounce = 0;

      if (k === 0) {
        // the FRONT person: this round's customer, being served / leaving
        if (this.checkoutT < this.checkoutDur * 0.45) {
          x = frontSlot; // standing at the register area
        } else {
          const q = (p - 0.45) / 0.55;
          if (win) { x = lerp(frontSlot, W + 100, q); bounce = Math.sin(this.t * 12) * 3; }
          else { x = lerp(frontSlot, -120, q); bounce = Math.sin(this.t * 22) * 5; }
        }
        // their item on the belt while being scanned
        if (win && this.checkoutT > this.checkoutDur * 0.3 && this.checkoutT < this.checkoutDur * 0.6)
          drawPixelProduct(ctx, productKey2(this.state.round), x + 66, counterY + 30, 38, {});
        drawPixelChar(ctx, ch, x, counterY + 12 + bounce, size, { bob: this.t * 6 });
        // emote once the outcome plays
        if (this.checkoutT > this.checkoutDur * 0.45) {
          if (win) ptext(ctx, ':D', x, counterY - 150, { scale: 4, color: '#6be585', align: 'center', baseline: 'middle', shadow: true });
          else ptext(ctx, 'GRR', x, counterY - 150, { scale: 4, color: '#ff5c5c', align: 'center', baseline: 'middle', shadow: true });
        }
      } else {
        // waiting shoppers, same size, shuffling forward on a win
        if (x < -40 || x > W + 40) continue;
        drawPixelChar(ctx, ch, x, counterY + 12, size, { bob: this.t * 3 + k });
      }
    }

    // caption + objective progress (people left AFTER this checkout)
    const afterRemaining = remaining - (win ? 1 : 0);
    ptext(ctx, win ? 'CHECKED OUT!' : 'CUSTOMER LEFT!', W / 2, 250, { scale: 3, color: '#ffffff', align: 'center', outline: true, outlineColor: win ? '#1e6b3a' : '#7a1e2e' });
    ptext(ctx, Math.max(0, afterRemaining) + ' STILL IN LINE', W / 2, 292, { scale: 2, color: '#ffffff', align: 'center', outline: true });
  }

  wrapPixel(ctx, str, cx, cy, maxW, lh, color, scale, outline = false) {
    const words = String(str).split(' ');
    const lines = []; let cur = '';
    const wpx = (s) => pTextWidth(s, scale);
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (wpx(test) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const startY = cy - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => ptext(ctx, ln, cx, startY + i * lh, { scale, color, align: 'center', baseline: 'middle', outline }));
  }

  drawEntities(ctx) {
    const isServe = this.q.kind === 'serve';
    const hov = this.phase === 'play' ? this.entityAt(Input.x, Input.y) : null;
    // hover sound edge
    if (hov && hov !== this._lastHov) { Sfx.hover(); }
    this._lastHov = hov;

    // Structural orientation labels: tell WHICH end is which (front/back,
    // top/bottom) so the layout is never confusing. These don't reveal the
    // answer — the player must still know the FIFO/FILO rule.
    const live = this.entities.filter((e) => !e.removed);
    if (live.length) {
      if (this.q.structure === 'queue') {
        const first = live[0], last = live[live.length - 1];
        const ly = first.feetY + 20;
        ptext(ctx, 'FRONT', first.cx, ly, { scale: 2, color: '#6be585', align: 'center', outline: true });
        if (last !== first) ptext(ctx, 'BACK', last.cx, ly, { scale: 2, color: '#ff9f5c', align: 'center', outline: true });
        // arrow along the line
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      } else if (this.q.structure === 'queueframe') {
        const first = this.entities[0], last = this.entities[this.entities.length - 1];
        const ly = first.cy + first.h / 2 + 20;
        ptext(ctx, 'FIRST IN', first.cx, ly, { scale: 2, color: '#6be585', align: 'center', outline: true });
        ptext(ctx, 'LAST IN', last.cx, ly, { scale: 2, color: '#ff9f5c', align: 'center', outline: true });
      } else { // vertical stack: TOP marker up high, BOTTOM low
        const top = live[live.length - 1], bottom = live[0];
        const rightX = top.cx + top.w / 2 + 16;
        ptext(ctx, 'TOP', rightX, top.cy, { scale: 2, color: '#6be585', align: 'left', baseline: 'middle', outline: true });
        if (bottom !== top) ptext(ctx, 'BOTTOM', rightX, bottom.cy, { scale: 2, color: '#ff9f5c', align: 'left', baseline: 'middle', outline: true });
      }
    }

    for (const e of this.entities) {
      if (e.removed) continue;
      const scale = 1 + e.pop * 0.18;
      const isHov = e === hov;
      if (e.type === 'person') {
        if (isHov) { ctx.fillStyle = 'rgba(255,209,92,0.30)'; ctx.beginPath(); ctx.ellipse(e.cx, e.feetY - e.size * 0.45, e.size * 0.4, e.size * 0.55, 0, 0, 7); ctx.fill(); }
        drawPixelChar(ctx, e.char, e.cx, e.feetY - (isHov ? 8 : 0), e.size * scale, { bob: this.t * 3 + e.id });
        if (e.label) {
          const lw = pTextWidth(e.label, 2) + 12;
          ctx.fillStyle = 'rgba(20,13,38,0.85)';
          ctx.fillRect(e.cx - lw / 2, e.feetY - e.size - 26, lw, 22);
          ptext(ctx, e.label, e.cx, e.feetY - e.size - 15, { scale: 2, color: '#ffffff', align: 'center', baseline: 'middle', outline: true });
        }
      } else if (e.type === 'product') {
        if (isHov) { ctx.fillStyle = '#ffd15c'; ctx.fillRect(e.cx - e.w / 2 - 6, e.cy - e.h / 2 - 6, e.w + 12, e.h + 12); }
        drawPixelProduct(ctx, e.kind, e.cx, e.cy, e.h * scale, {});
      } else { // frame / stack cell (pixel panel)
        const isTop = !e.horiz && e === [...this.entities].reverse().find((x) => !x.removed);
        pixelPanel(ctx, e.cx - e.w / 2, e.cy - e.h / 2, e.w, e.h, isTop ? '#ff6b6b' : '#5c9bff', isHov ? '#ffd15c' : '#15111f', 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(e.cx - e.w / 2 + 8, e.cy - e.h / 2 + 6, e.w - 16, Math.round(e.h * 0.3));
        ptext(ctx, e.label, e.cx, e.cy, { scale: Math.max(2, Math.round(e.h / 22)), color: '#ffffff', align: 'center', baseline: 'middle', outline: true });
      }
    }
    if (isServe) {
      const remaining = this.entities.filter((e) => !e.removed).length;
      ptext(ctx, remaining + ' LEFT', W / 2, 168, { scale: 2, color: '#ffd15c', align: 'center', outline: true });
    }
    if (this.wrongFlash > 0) {
      ctx.globalAlpha = this.wrongFlash;
      ptext(ctx, 'WRONG! FOLLOW THE RULE', W / 2, 172, { scale: 2, color: '#ff8fa3', align: 'center', outline: true });
      ctx.globalAlpha = 1;
    }
  }

  drawBins(ctx) {
    // the two bins
    for (const b of this.bins) {
      pixelPanel(ctx, b.x, b.y, b.w, b.h, 'rgba(40,30,70,0.6)', b.id === 0 ? '#ffd15c' : '#4ecdc4', 4);
      ptext(ctx, b.label, b.x + b.w / 2, b.y - 16, { scale: 3, color: b.id === 0 ? '#ffd15c' : '#4ecdc4', align: 'center', outline: true });
    }
    ptext(ctx, 'DRAG EACH INTO A BIN', W / 2, 168, { scale: 2, color: '#ffffff', align: 'center', outline: true });
    // tokens (dragged one last)
    const ordered = this.tokens.filter((t) => t !== this.dragging);
    if (this.dragging) ordered.push(this.dragging);
    for (const tk of ordered) {
      const c = tk.correct ? '#6be585' : tk.color;
      pixelPanel(ctx, tk.x - tk.w / 2, tk.y - tk.h / 2, tk.w, tk.h, '#2a2340', c, 4);
      ptext(ctx, tk.label, tk.x, tk.y, { scale: 2, color: '#ffffff', align: 'center', baseline: 'middle', outline: true });
    }
    if (this.wrongFlash > 0) {
      ctx.globalAlpha = this.wrongFlash;
      ptext(ctx, 'WRONG BIN!', W / 2, 198, { scale: 2, color: '#ff8fa3', align: 'center', outline: true });
      ctx.globalAlpha = 1;
    }
  }

  drawChoice(ctx) {
    for (const b of this.choiceBtns) b.draw(ctx);
  }

  drawMemory(ctx) {
    const cx = W / 2, baseY = 470, cellH = 56, cw = 260;
    if (this.memShown) {
      // reveal the pile (stack of frames) or line (people)
      const items = this.q.revealItems;
      const isPeople = items[0] && items[0].type === 'person';
      if (isPeople) {
        const gap = Math.min(180, (W - 160) / items.length);
        const sx = W / 2 - (items.length - 1) * gap / 2;
        for (let i = 0; i < items.length; i++) {
          drawPixelChar(ctx, charFor(i), sx + i * gap, 470, 130, { bob: this.t * 3 + i });
          ptext(ctx, items[i].label, sx + i * gap, 320, { scale: 2, color: '#fff', align: 'center', outline: true });
        }
        ptext(ctx, 'FRONT', sx, 500, { scale: 2, color: '#6be585', align: 'center', outline: true });
        ptext(ctx, 'BACK', sx + (items.length - 1) * gap, 500, { scale: 2, color: '#ff9f5c', align: 'center', outline: true });
      } else {
        for (let i = 0; i < items.length; i++) {
          const y = baseY - i * (cellH + 8) - cellH / 2;
          pixelPanel(ctx, cx - cw / 2, y - cellH / 2, cw, cellH, i === items.length - 1 ? '#ff6b6b' : '#5c9bff', '#15111f', 4);
          ptext(ctx, items[i].label, cx, y, { scale: 3, color: '#fff', align: 'center', baseline: 'middle', outline: true });
        }
        const topY = baseY - (items.length - 1) * (cellH + 8) - cellH / 2;
        ptext(ctx, 'TOP', cx + cw / 2 + 16, topY, { scale: 2, color: '#6be585', align: 'left', baseline: 'middle', outline: true });
        ptext(ctx, 'BOTTOM', cx + cw / 2 + 16, baseY - cellH / 2, { scale: 2, color: '#ff9f5c', align: 'left', baseline: 'middle', outline: true });
      }
      ptext(ctx, 'REMEMBER THIS!', W / 2, 210, { scale: 3, color: '#ffd15c', align: 'center', outline: true });
    } else {
      // hidden: show a big ? and the choices
      ptext(ctx, '?', W / 2, 350, { scale: 12, color: '#5c9bff', align: 'center', baseline: 'middle', outline: true });
      for (const b of this.memChoices) b.draw(ctx);
    }
  }

  drawArrange(ctx) {
    // slot label
    ptext(ctx, this.q.slotLabel || 'ORDER', W / 2, this.slots[0].y - 30, { scale: 2, color: '#ffffff', align: 'center', outline: true });
    // slots
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      pixelPanel(ctx, s.x, s.y, s.w, s.h, 'rgba(40,30,70,0.6)', 'rgba(255,255,255,0.5)', 3);
      ptext(ctx, '#' + (i + 1), s.x + s.w / 2, s.y - 12, { scale: 2, color: '#ffffff', align: 'center', outline: true });
    }
    // tokens (dragged last for z-order)
    const ordered = this.tokens.filter((t) => t !== this.dragging);
    if (this.dragging) ordered.push(this.dragging);
    for (const tk of ordered) {
      const lift = tk === this.dragging ? 6 : 0;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(tk.x - tk.w / 2 + 3, tk.y - tk.h / 2 + 6 + lift, tk.w, tk.h);
      pixelPanel(ctx, tk.x - tk.w / 2, tk.y - tk.h / 2 - lift, tk.w, tk.h,
        tk === this.dragging ? '#4a3a1a' : '#2a2340', tk.color, 4);
      ctx.restore();
      // label lives in a top band; sprite sits BELOW it so faces are clear
      const top = tk.y - tk.h / 2 - lift;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(tk.x - tk.w / 2 + 6, top + 6, tk.w - 12, 24);
      ptext(ctx, tk.label, tk.x, top + 18, { scale: 2, color: '#ffffff', align: 'center', baseline: 'middle', outline: true });
      drawPixelChar(ctx, tk.char, tk.x, tk.y + tk.h * 0.44 - lift, tk.h * 0.72, {});
    }
    ptext(ctx, 'DRAG INTO THE SLOTS', W / 2, 168, { scale: 2, color: '#ffffff', align: 'center', outline: true });
  }

  drawFeedback(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, W, H);
    const good = this.wasCorrect;
    const p = easeOutBack(clamp((1.7 - this.feedbackT) * 3, 0, 1));
    // --- verdict banner (top) ---
    ctx.save();
    ctx.translate(W / 2, 150);
    ctx.scale(p, p);
    pixelPanel(ctx, -300, -56, 600, 112, good ? '#1e6b3a' : '#7a1e2e', good ? '#6be585' : '#ff4d6d', 5);
    ptext(ctx, good ? 'CORRECT!' : 'MISSED!', 0, 0, { scale: 6, color: '#fff', align: 'center', baseline: 'middle', outline: true, outlineColor: good ? '#1e6b3a' : '#7a1e2e' });
    ctx.restore();
    // --- explanation panel (its own box, plenty of room, below the verdict) ---
    const words = String(this.q.explain).split(' ');
    const lineList = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (pTextWidth(test, 2) > 640 && cur) { lineList.push(cur); cur = w; } else cur = test;
    }
    if (cur) lineList.push(cur);
    const lh = 30;
    const panelTop = 250;
    const panelH = lineList.length * lh + 44;
    pixelPanel(ctx, W / 2 - 350, panelTop, 700, panelH, '#1a1230', '#ffd15c', 4);
    lineList.forEach((ln, i) =>
      ptext(ctx, ln, W / 2, panelTop + 26 + i * lh, { scale: 2, color: '#ffffff', align: 'center', baseline: 'middle', outline: true }));
    ptext(ctx, 'CLICK OR SPACE TO CONTINUE', W / 2, panelTop + panelH + 26, { scale: 1, color: '#ffffff', align: 'center', outline: true });
  }
}

// ============================================================
// REPORT CARD  (shared by level-clear and game-over)
// ============================================================
export class ReportScene extends Scene {
  constructor(game, state, report, level, cleared = false) {
    super(game);
    this.state = state; this.report = report; this.level = level; this.cleared = cleared;
  }
  enter() {
    this.t = 0; this.anim = 0;
    const hasNext = this.cleared && LEVELS.some((l) => l.id === this.level.id + 1);
    this.primary = new Button(W / 2 - 270, 528, 250, 58,
      hasNext ? 'NEXT LEVEL' : 'RETRY', { size: 26 });
    this.hasNext = hasNext;
    this.menu = new Button(W / 2 + 20, 528, 250, 58, 'LEVEL MAP', { size: 26, color: '#7ec8e3' });
    // weakest topic
    let worst = null, worstPct = 2;
    this.rows = [];
    for (const [name, r] of Object.entries(this.report)) {
      if (r.total === 0) continue;
      const pct = r.correct / r.total;
      this.rows.push({ name, r, pct });
      if (pct < worstPct) { worstPct = pct; worst = name; }
    }
    this.worst = worst; this.worstPct = worstPct;
  }
  update(dt) {
    this.t += dt; this.anim = Math.min(1, this.anim + dt * 1.5);
    this.primary.update(dt); this.menu.update(dt);
    if (this.primary.clicked()) {
      if (this.hasNext) this.game.setScene(new TutorialScene(this.game, LEVELS.find((l) => l.id === this.level.id + 1)));
      else this.game.setScene(new TutorialScene(this.game, this.level));
    }
    if (this.menu.clicked()) this.game.setScene(new LevelSelectScene(this.game));
  }
  draw(ctx) {
    drawBackground(ctx, this.t);
    ctx.fillStyle = 'rgba(20,13,38,0.92)'; ctx.fillRect(0, 0, W, H);
    const p = easeOutBack(clamp(this.anim, 0, 1));
    ctx.save(); ctx.translate(W / 2, 56); ctx.scale(p, p);
    ptext(ctx, this.cleared ? 'LEVEL CLEAR!' : 'GAME OVER', 0, 0, { scale: 6, color: this.cleared ? '#6be585' : '#ff6b6b', align: 'center', baseline: 'middle', shadow: true });
    ctx.restore();
    ptext(ctx, 'SCORE ' + this.state.score + '   ROUNDS ' + (this.state.round - (this.cleared ? 0 : 1)),
      W / 2, 108, { scale: 2, color: '#fff', align: 'center' });

    const bx = W / 2 - 320, by = 156, bw = 640, rowH = 56;
    this.rows.forEach((row, i) => {
      const y = by + i * rowH;
      const pa = clamp((this.anim - i * 0.12) * 2, 0, 1);
      ptext(ctx, row.name, bx, y - 6, { scale: 2, color: '#fff', align: 'left' });
      const pct = Math.round(row.pct * 100);
      const col = row.pct >= 0.8 ? '#6be585' : row.pct >= 0.5 ? '#ffd15c' : '#ff6b6b';
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, bx, y + 8, bw, 18, 9); ctx.fill();
      ctx.fillStyle = col;
      roundRect(ctx, bx, y + 8, Math.max(6, bw * row.pct * pa), 18, 9); ctx.fill();
      ptext(ctx, pct + '% ' + row.r.correct + '/' + row.r.total, bx + bw + 8, y + 17, { scale: 1, color: col, align: 'left', baseline: 'middle' });
      const label = row.pct >= 0.8 ? 'MASTERED' : row.pct >= 0.5 ? 'GETTING THERE' : 'NEEDS WORK';
      ptext(ctx, label, bx + bw - 6, y - 6, { scale: 1, color: col, align: 'right' });
    });

    const ay = by + this.rows.length * rowH + 16;
    ctx.fillStyle = 'rgba(255,209,92,0.12)';
    roundRect(ctx, bx, ay, bw, 58, 12); ctx.fill();
    ctx.strokeStyle = '#ffd15c'; ctx.lineWidth = 3;
    roundRect(ctx, bx, ay, bw, 58, 12); ctx.stroke();
    let advice;
    if (this.rows.length === 0) advice = 'PLAY A ROUND TO SEE YOUR BREAKDOWN';
    else if (this.worstPct >= 0.8) advice = this.cleared ? 'PERFECT! ON TO THE NEXT CHALLENGE' : 'GREAT ACCURACY! JUST KEEP PACE';
    else advice = 'WORK ON: ' + this.worst;
    this.wrapP(ctx, advice, W / 2, ay + 29, bw - 24, '#fff', 2);
    this.primary.draw(ctx); this.menu.draw(ctx);
  }
  wrapP(ctx, str, cx, cy, maxW, color, scale) {
    const words = String(str).split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (pTextWidth(test, scale) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const sy = cy - (lines.length - 1) * (9 * scale) / 2;
    lines.forEach((ln, i) => ptext(ctx, ln, cx, sy + i * 9 * scale, { scale, color, align: 'center', baseline: 'middle' }));
  }
}

// ============================================================
// GAME OVER (after the bomb explodes) -> shows report
// ============================================================
export class GameOverScene extends Scene {
  constructor(game, state, report, level) {
    super(game);
    this.state = state; this.report = report; this.level = level;
  }
  enter() {
    this.t = 0;
    this.explosion = new PixelExplosion(W / 2, H / 2);
    this.game.shake(20, 0.5);
  }
  update(dt) {
    this.t += dt;
    this.explosion.update(dt);
    if (this.t > 1.3 || Input.justUp)
      this.game.setScene(new ReportScene(this.game, this.state, this.report, this.level, false));
  }
  draw(ctx) {
    ctx.fillStyle = '#140d26'; ctx.fillRect(0, 0, W, H);
    const a = clamp(this.t / 0.4, 0, 1);
    ptext(ctx, 'BOOM!', W / 2, H / 2, { scale: Math.round(6 + a * 6), color: '#ff6b6b', align: 'center', baseline: 'middle', shadow: true });
    this.explosion.draw(ctx);
  }
}
