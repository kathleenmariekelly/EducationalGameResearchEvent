// Chunky pixel explosion: expanding rings of square "pixels" + shockwave.
import { rand, randInt } from './engine.js';

export class PixelExplosion {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.t = 0;
    this.done = false;
    this.chunks = [];
    this.ring = 0;
    const colors = ['#ffffff', '#ffe27a', '#ff9f3c', '#ff5c5c', '#c9384a'];
    const n = 90;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 620);
      this.chunks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(40, 160),
        size: randInt(6, 16),
        color: colors[randInt(0, colors.length - 1)],
        life: rand(0.5, 1.2),
        maxLife: 1.2,
        grav: rand(500, 900),
      });
    }
    // smoke puffs
    this.smoke = [];
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(20, 160);
      this.smoke.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: randInt(14, 34), life: rand(0.6, 1.4), maxLife: 1.4 });
    }
  }
  update(dt) {
    this.t += dt;
    this.ring += dt;
    for (const c of this.chunks) {
      c.vy += c.grav * dt;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.life -= dt;
    }
    for (const s of this.smoke) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.94; s.vy *= 0.94;
      s.r += dt * 30; s.life -= dt;
    }
    this.chunks = this.chunks.filter((c) => c.life > 0);
    this.smoke = this.smoke.filter((s) => s.life > 0);
    if (this.t > 1.6) this.done = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // shockwave ring
    const rr = this.ring * 640;
    if (this.ring < 0.5) {
      ctx.globalAlpha = 1 - this.ring / 0.5;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 10 * (1 - this.ring / 0.5) + 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, rr, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // smoke (behind chunks)
    for (const s of this.smoke) {
      ctx.globalAlpha = (s.life / s.maxLife) * 0.4;
      ctx.fillStyle = '#3a3550';
      const q = 6; // quantize to look pixelated
      const px = Math.round(s.x / q) * q, py = Math.round(s.y / q) * q;
      ctx.fillRect(px - s.r, py - s.r, s.r * 2, s.r * 2);
    }
    ctx.globalAlpha = 1;
    // chunky pixels
    for (const c of this.chunks) {
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life / c.maxLife));
      ctx.fillStyle = c.color;
      const px = Math.round(c.x / 2) * 2, py = Math.round(c.y / 2) * 2;
      ctx.fillRect(px - c.size / 2, py - c.size / 2, c.size, c.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
