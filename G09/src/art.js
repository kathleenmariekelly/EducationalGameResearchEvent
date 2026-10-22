// Programmatically generated animated sprites (no art assets required).
// Each maker draws N frames into textures named `${key}${i}` and registers a
// looping animation `${key}_anim`. Mirrors the pygame `art.py` shapes.
import { COL } from "./config.js";

function bob(i, frames, amp) {
  return Math.round(Math.sin((i / frames) * Math.PI * 2) * amp);
}

// Draw one frame with a Graphics object, then bake to a texture.
function bake(scene, key, size, drawFn) {
  const g = scene.add.graphics();
  drawFn(g, size);
  g.generateTexture(key, size, size);
  g.destroy();
}

function registerAnim(scene, key, frameCount, rate = 8) {
  const frames = [];
  for (let i = 0; i < frameCount; i++) frames.push({ key: `${key}${i}` });
  if (!scene.anims.exists(`${key}_anim`)) {
    scene.anims.create({ key: `${key}_anim`, frames, frameRate: rate, repeat: -1 });
  }
}

// ---------------------------------------------------------------- players ----
function makeDuck(scene, size = 48, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `duck${i}`, size, (g) => {
      const b = bob(i, frames, 2), cx = size / 2, by = size / 2 + b;
      g.fillStyle(COL.yellow, 1);
      g.fillEllipse(cx, by + 5, 32, 26);            // body
      g.fillCircle(cx + 8, by - 10, 11);            // head
      g.fillStyle(COL.orange, 1);
      g.fillTriangle(cx + 18, by - 12, cx + 28, by - 9, cx + 18, by - 6); // beak
      g.fillStyle(COL.black, 1);
      g.fillCircle(cx + 11, by - 13, 2);            // eye
      g.lineStyle(2, COL.cyan, 1);
      g.strokeCircle(cx - 16, by + 8, 6);           // magnifier glass
      g.lineStyle(2, COL.dim, 1);
      g.lineBetween(cx - 20, by + 12, cx - 26, by + 18); // handle
    });
  }
  registerAnim(scene, "duck", frames);
}

function makePenguin(scene, size = 48, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `penguin${i}`, size, (g) => {
      const b = bob(i, frames, 2), cx = size / 2, by = size / 2 + b;
      g.fillStyle(0x141414, 1);
      g.fillEllipse(cx, by + 3, 26, 34);            // body
      g.fillStyle(COL.white, 1);
      g.fillEllipse(cx, by + 6, 18, 24);            // belly
      g.fillStyle(0x141414, 1);
      g.fillCircle(cx, by - 16, 10);                // head
      g.fillStyle(COL.white, 1);
      g.fillCircle(cx - 3, by - 17, 3);
      g.fillCircle(cx + 3, by - 17, 3);
      g.fillStyle(COL.black, 1);
      g.fillCircle(cx - 3, by - 17, 1);
      g.fillCircle(cx + 3, by - 17, 1);
      g.fillStyle(COL.orange, 1);
      g.fillTriangle(cx - 3, by - 12, cx + 3, by - 12, cx, by - 8); // beak
      const fw = i % 2 === 0 ? 2 : -2;
      g.fillEllipse(cx - 6, by + 20, 8, 5);
      g.fillEllipse(cx + 6 + fw, by + 20, 8, 5);
    });
  }
  registerAnim(scene, "penguin", frames);
}

function makeRobot(scene, size = 48, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `robot${i}`, size, (g) => {
      const b = bob(i, frames, 2), cx = size / 2, by = size / 2 + b;
      g.fillStyle(0x64748b, 1);
      g.fillRoundedRect(cx - 12, by - 6, 24, 24, 5);  // body
      g.fillStyle(0x94a3b8, 1);
      g.fillRoundedRect(cx - 10, by - 22, 20, 16, 4); // head
      g.lineStyle(2, COL.dim, 1);
      g.lineBetween(cx, by - 22, cx, by - 28);        // antenna
      g.fillStyle(COL.red, 1);
      g.fillCircle(cx, by - 29, 2);
      const eye = i !== 2 ? COL.cyan : COL.dim;
      g.fillStyle(eye, 1);
      g.fillCircle(cx - 5, by - 14, 3);
      g.fillCircle(cx + 5, by - 14, 3);
      g.fillStyle(COL.green, 1);
      g.fillCircle(cx, by + 4, 3);
    });
  }
  registerAnim(scene, "robot", frames);
}

// ---------------------------------------------------------------- enemies ----
function makeBug(scene, key, color, size = 40, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `${key}${i}`, size, (g) => {
      const cx = size / 2, cy = size / 2;
      const lw = i % 2 === 0 ? 2 : -2;
      g.lineStyle(2, 0x1e1e1e, 1);
      for (const dx of [-10, 0, 10]) {
        g.lineBetween(cx + dx / 2, cy, cx + dx, cy + 12 + lw);
        g.lineBetween(cx + dx / 2, cy, cx + dx, cy - 12 - lw);
      }
      g.fillStyle(color, 1);
      g.fillEllipse(cx, cy, 24, 18);
      g.fillStyle(0x141414, 1);
      g.fillCircle(cx + 6, cy - 6, 3);
      g.fillStyle(COL.white, 1);
      g.fillCircle(cx - 3, cy - 2, 2);
      g.fillCircle(cx + 3, cy - 2, 2);
    });
  }
  registerAnim(scene, key, frames);
}

function makeShooter(scene, size = 44, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `shooter${i}`, size, (g) => {
      const cx = size / 2, cy = size / 2, pulse = 2 + (i % 2) * 2;
      g.fillStyle(COL.purple, 1);
      g.fillCircle(cx, cy, 13);
      g.lineStyle(2, 0x1e0a28, 1);
      g.strokeCircle(cx, cy, 13);
      g.lineStyle(2, COL.cyan, 1);
      g.strokeCircle(cx, cy, 5 + pulse);
      g.fillStyle(COL.white, 1);
      g.fillCircle(cx, cy, 3);
    });
  }
  registerAnim(scene, "shooter", frames);
}

function makeTank(scene, size = 52, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `tank${i}`, size, (g) => {
      const cx = size / 2, cy = size / 2, w = bob(i, frames, 2);
      g.fillStyle(COL.orange, 1);
      g.fillCircle(cx, cy + w, 18);
      g.lineStyle(3, 0x78320a, 1);
      g.strokeCircle(cx, cy + w, 18);
      g.fillStyle(COL.yellow, 1);
      g.fillCircle(cx - 6, cy - 4 + w, 3);
      g.fillCircle(cx + 6, cy - 4 + w, 3);
    });
  }
  registerAnim(scene, "tank", frames);
}

function makeBoss(scene, size = 128, frames = 4) {
  for (let i = 0; i < frames; i++) {
    bake(scene, `boss${i}`, size, (g) => {
      const cx = size / 2, cy = size / 2, w = bob(i, frames, 3);
      g.fillStyle(0x280a14, 1);
      g.fillCircle(cx, cy + w, 46);
      g.lineStyle(4, COL.red, 1);
      g.strokeCircle(cx, cy + w, 46);
      g.fillStyle(COL.yellow, 1);
      g.fillTriangle(cx - 24, cy - 12 + w, cx - 6, cy - 4 + w, cx - 24, cy + w);
      g.fillTriangle(cx + 24, cy - 12 + w, cx + 6, cy - 4 + w, cx + 24, cy + w);
      g.lineStyle(4, COL.red, 1);
      for (let a = 0; a < 360; a += 45) {
        const r = (a + i * 6) * Math.PI / 180;
        g.lineBetween(cx + Math.cos(r) * 46, cy + w + Math.sin(r) * 46,
                      cx + Math.cos(r) * 58, cy + w + Math.sin(r) * 58);
      }
    });
  }
  registerAnim(scene, "boss", frames, 6);
}

// Bullet textures (simple circles).
function makeBullet(scene, key, color, r = 6) {
  bake(scene, key, (r + 2) * 2, (g) => {
    g.fillStyle(color, 1);
    g.fillCircle(r + 2, r + 2, r);
    g.fillStyle(COL.white, 1);
    g.fillCircle(r + 2, r + 2, Math.max(2, r - 3));
  });
}

export function generateAllTextures(scene) {
  makeDuck(scene);
  makePenguin(scene);
  makeRobot(scene);
  makeBug(scene, "bug", COL.red);
  makeBug(scene, "greenbug", COL.green);
  makeShooter(scene);
  makeTank(scene);
  makeBoss(scene);
  makeBullet(scene, "pbullet", COL.cyan);
  makeBullet(scene, "ebullet", COL.purple);
  makeBullet(scene, "drone", COL.cyan, 8);
}
