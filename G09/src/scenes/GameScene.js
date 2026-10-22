import {
  SCREEN_W, SCREEN_H, WORLD_W, WORLD_H, FLOOR_Y, PLAY_FLOOR_TOP, PLAY_FLOOR_BOT,
  COL, CSS, PLAYER_ATTACK_SPEED, ENEMY_BASE_HP, ENEMY_BASE_SPEED, ENEMY_TOUCH_DAMAGE,
  NUM_STAGES, CODE_FROM_STAGE,
} from "../config.js";
import { PlayerState } from "../player.js";
import { QuestionPool } from "../data/questions.js";
import { Quiz } from "../quiz.js";

const STAGE_ENEMY_TYPES = {
  1: ["bug"],
  2: ["bug", "greenbug"],
  3: ["bug", "greenbug", "shooter"],
  4: ["bug", "greenbug", "shooter", "tank"],
  5: ["bug", "greenbug", "shooter", "tank"],
};
const FONT = "Consolas, monospace";
let ENEMY_ID = 1;

export default class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  init(data) { this.charKey = data.charKey || "duck"; }

  create() {
    this.ps = new PlayerState(this.charKey);
    this.pool = new QuestionPool();
    this.learnMode = this.registry.get("mode") === "learn";
    this.stage = 1;
    this.mode = "wave";
    this.state = "combat";
    this.score = 0;
    this.correctTotal = 0;
    this.questionsAsked = 0;
    this.fireTimer = 0;
    this.spawnDelay = 0;
    this.quiz = null;
    this.quizPurpose = null;
    this.drones = [];
    this._pending = [];   // objects to destroy AFTER the physics step (crash-safe)

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this._setCombatBounds();
    this._drawBackground();

    // player sprite
    this.player = this.physics.add.sprite(
      WORLD_W / 2, (PLAY_FLOOR_TOP + PLAY_FLOOR_BOT) / 2, `${this.charKey}0`);
    this.player.play(`${this.charKey}_anim`);
    this.player.setCollideWorldBounds(true).setDepth(20);
    this.player.body.setSize(28, 36);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // groups
    this.enemies = this.physics.add.group();
    this.pbullets = this.physics.add.group();
    this.ebullets = this.physics.add.group();

    this.physics.add.overlap(this.pbullets, this.enemies, this._onBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this._onTouch, null, this);
    // NOTE: register the sprite (player) FIRST so Phaser calls back as
    // (player, bullet) — registering the group first silently swaps the args.
    this.physics.add.overlap(this.player, this.ebullets, this._onEnemyBullet, null, this);

    // per-frame world FX (enemy hp bars, shield ring)
    this.fx = this.add.graphics().setDepth(25);

    // input
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.keyboard.on("keydown-E", () => this._useAbility("shield"));
    this.input.keyboard.on("keydown-Q", () => this._useAbility("parry"));

    this._buildHUD();
    this._spawnStage();
  }

  // -------------------------------------------------------------- bounds/bg
  _setCombatBounds() {
    this.physics.world.setBounds(0, PLAY_FLOOR_TOP, WORLD_W, PLAY_FLOOR_BOT - PLAY_FLOOR_TOP);
  }
  _setQuizBounds() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  _drawBackground() {
    const g = this.add.graphics().setDepth(-10);
    // sky gradient bands
    for (let y = 0; y < FLOOR_Y; y += 6) {
      const t = y / FLOOR_Y;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COL.skyTop),
        Phaser.Display.Color.ValueToColor(COL.skyBot), 100, Math.floor(t * 100));
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, y, WORLD_W, 6);
    }
    // floor
    g.fillStyle(COL.floorTop, 1).fillRect(0, FLOOR_Y, WORLD_W, WORLD_H - FLOOR_Y);
    g.lineStyle(3, COL.primary, 1).lineBetween(0, FLOOR_Y, WORLD_W, FLOOR_Y);
    g.lineStyle(1, COL.floorBot, 1);
    for (let gx = 0; gx < WORLD_W; gx += 80) g.lineBetween(gx, FLOOR_Y, gx, WORLD_H);
  }

  // --------------------------------------------------------------- HUD
  _buildHUD() {
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(70);
    const mk = (x, y, size, color, origin = 0) =>
      this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color })
        .setScrollFactor(0).setDepth(71).setOrigin(origin, 0);
    this.hpText = mk(28, 22, 16, CSS.white);
    this.infoText = mk(20, 50, 22, CSS.white);
    this.scoreText = mk(20, 80, 16, CSS.dim);
    this.enemyText = mk(150, 80, 16, CSS.dim);
    this.correctText = this.add.text(SCREEN_W - 20, 22, "", {
      fontFamily: FONT, fontSize: "22px", color: CSS.green,
    }).setScrollFactor(0).setDepth(71).setOrigin(1, 0);
    this.abilityText = mk(SCREEN_W - 200, 58, 13, CSS.white);
    this.hintText = mk(20, SCREEN_H - 24, 13, CSS.dim);
  }

  _updateHUD() {
    const p = this.ps;
    this.hud.clear();
    // correct counter as a fraction: correct / questions answered
    const corr = this.correctTotal + (this.quiz ? this.quiz.correctCount : 0);
    const asked = this.questionsAsked + (this.quiz ? this.quiz.answeredCount : 0);
    this.correctText.setText(`Correct  ${corr}/${asked}`);

    for (const o of [this.hpText, this.infoText, this.scoreText, this.enemyText, this.abilityText, this.hintText])
      o.setVisible(true);

    // HP bar
    this.hud.fillStyle(0x282828, 1).fillRoundedRect(20, 20, 260, 22, 6);
    const ratio = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    const col = ratio > 0.4 ? COL.green : ratio > 0.2 ? COL.yellow : COL.red;
    this.hud.fillStyle(col, 1).fillRoundedRect(20, 20, 260 * ratio, 22, 6);
    this.hpText.setText(`HP ${Math.max(0, Math.round(p.hp))}/${Math.round(p.maxHp)}`);

    this.infoText.setText(this.mode === "boss"
      ? `STAGE ${this.stage} - BOSS FIGHT`
      : `STAGE ${this.stage}/${NUM_STAGES}`);
    this.scoreText.setText(`Score ${this.score}`);
    this.enemyText.setText(`Enemies ${this.enemies.countActive(true)}`);

    // ability boxes (only unlocked)
    const unlocked = [["shield", "E"], ["parry", "Q"]].filter(([n]) => p.abilities[n]);
    let x = SCREEN_W - 20 - unlocked.length * 90;
    let hint = "WASD/Arrows move  -  auto-attack";
    unlocked.forEach(([name, key]) => {
      const ab = p.abilities[name];
      const ready = ab.timer <= 0;
      this.hud.fillStyle(ready ? COL.primary : 0x323240, 1).fillRoundedRect(x, 52, 80, 40, 6);
      this.hud.lineStyle(2, COL.white, 1).strokeRoundedRect(x, 52, 80, 40, 6);
      x += 90;
      hint += `  -  ${key} ${name}`;
    });
    // ability label text (single combined, simplest)
    this.abilityText.setText(unlocked.map(([n, k], i) =>
      `[${k}] ${p.abilities[n].timer <= 0 ? "READY" : p.abilities[n].timer.toFixed(1) + "s"}`).join("   "));
    this.abilityText.setX(SCREEN_W - 20 - unlocked.length * 90 + 6);
    this.hintText.setText(hint);
  }

  // --------------------------------------------------------------- stage
  _spawnStage() {
    const types = STAGE_ENEMY_TYPES[this.stage];
    const count = Math.min(10, 4 + this.stage * 2);   // cap at 10 mobs per stage
    for (let i = 0; i < count; i++) {
      const etype = Phaser.Utils.Array.GetRandom(types);
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = Phaser.Math.Clamp(
        this.player.x + side * (SCREEN_W / 2 + Phaser.Math.Between(60, 300)), 40, WORLD_W - 40);
      const y = Phaser.Math.Between(PLAY_FLOOR_TOP + 6, PLAY_FLOOR_BOT - 6);
      // difficulty scales per stage
      this._makeEnemy(etype, x, y, 1.3 + (this.stage - 1) * 0.35);
    }
    this._announce(`STAGE ${this.stage} / ${NUM_STAGES}`, CSS.yellow);
  }

  // Transient centred banner so stage/wave changes are clearly visible.
  _announce(text, color) {
    if (this._banner) this._banner.destroy();
    this._banner = this.add.text(SCREEN_W / 2, 135, text, {
      fontFamily: FONT, fontSize: "30px", color: color || CSS.yellow, fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(72);
    this.tweens.add({
      targets: this._banner, alpha: 0, y: 105, duration: 1300, delay: 500,
      onComplete: () => { if (this._banner) { this._banner.destroy(); this._banner = null; } },
    });
  }

  _spawnBoss() {
    this._announce("BOSS FIGHT!", CSS.red);
    this._makeEnemy("boss", this.player.x, PLAY_FLOOR_TOP + 120, 1);
    for (let i = 0; i < 6; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = Phaser.Math.Clamp(this.player.x + side * 500, 40, WORLD_W - 40);
      this._makeEnemy("shooter", x, Phaser.Math.Between(PLAY_FLOOR_TOP + 6, PLAY_FLOOR_BOT - 6), 1);
    }
  }

  _makeEnemy(etype, x, y, scale) {
    const e = this.enemies.create(x, y, `${etype}0`);
    e.play(`${etype}_anim`);
    e.setCollideWorldBounds(true).setDepth(15);
    let hp, spd, dmg, rad;
    if (etype === "boss") { hp = ENEMY_BASE_HP * 60; spd = ENEMY_BASE_SPEED * 0.5; dmg = ENEMY_TOUCH_DAMAGE * 2; rad = 55; }
    else if (etype === "tank") { hp = ENEMY_BASE_HP * 4; spd = ENEMY_BASE_SPEED * 0.6; dmg = ENEMY_TOUCH_DAMAGE * 1.5; rad = 26; }
    else if (etype === "shooter") { hp = ENEMY_BASE_HP * 1.5; spd = ENEMY_BASE_SPEED * 0.9; dmg = ENEMY_TOUCH_DAMAGE; rad = 20; }
    else { hp = ENEMY_BASE_HP; spd = ENEMY_BASE_SPEED; dmg = ENEMY_TOUCH_DAMAGE; rad = 18; }
    e.ed = {
      id: ENEMY_ID++, etype, hp: hp * scale, maxHp: hp * scale,
      speed: spd * (1 + (this.stage - 1) * 0.10), touchDamage: dmg * scale,
      radius: rad, stunT: 0, shootT: Phaser.Math.FloatBetween(1, 2.5),
    };
    e.body.setCircle(rad, e.width / 2 - rad, e.height / 2 - rad);
    return e;
  }

  _stageCleared() {
    if (this.mode === "boss") this._startQuiz(1, false, true, "boss");
    else if (this.stage < NUM_STAGES) this._startQuiz(5, this.stage >= CODE_FROM_STAGE, false, "stage");
    else this._startQuiz(7, true, false, "final_test");
  }

  _startQuiz(num, useCode, boss, purpose) {
    this._setQuizBounds();
    this.quizPurpose = purpose;
    this.quiz = new Quiz(this, this.pool, {
      stage: this.stage, total: num, useCode, boss, learn: this.learnMode,
    });
    this.quiz.begin(this.player);
    this.state = "quiz";
  }

  _endQuiz() {
    this.correctTotal += this.quiz.correctCount;
    this.questionsAsked += this.quiz.answeredCount;
    const purpose = this.quizPurpose;
    this.quiz = null;
    this._setCombatBounds();
    this.player.setVelocity(0, 0);
    this.player.y = (PLAY_FLOOR_TOP + PLAY_FLOOR_BOT) / 2;
    if (purpose === "stage") {
      this.stage += 1; this.mode = "wave"; this.spawnDelay = 1.0;
      this.state = "combat";
    } else if (purpose === "final_test") {
      this.mode = "boss"; this._spawnBoss(); this.state = "combat";
    } else if (purpose === "boss") {
      this._showEnd("YOU BEAT THE KERNEL PANIC!", CSS.green);
    }
  }

  // --------------------------------------------------------------- combat
  _movePlayer() {
    const k = this.keys, sp = this.ps.speed;
    let vx = 0, vy = 0;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;
    const len = Math.hypot(vx, vy);
    if (len > 0) { vx = (vx / len) * sp; vy = (vy / len) * sp; }
    this.player.setVelocity(vx, vy);
  }

  _nearestEnemy() {
    let best = null, bd = this.ps.range;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  _fireAt(target) {
    const p = this.ps;
    const ang0 = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const n = p.projectiles;
    let angles;
    if (n === 1 && !p.spread) angles = [0];
    else {
      const step = (p.spread ? 30 : 14) * Math.PI / 180;
      const start = -step * (n - 1) / 2;
      angles = Array.from({ length: n }, (_, i) => start + step * i);
    }
    for (const a of angles) {
      const ang = ang0 + a;
      const b = this.pbullets.create(this.player.x, this.player.y, "pbullet").setDepth(18);
      b.setVelocity(Math.cos(ang) * PLAYER_ATTACK_SPEED, Math.sin(ang) * PLAYER_ATTACK_SPEED);
      let dmg = p.damage;
      if (Math.random() < p.crit) dmg *= 2;
      b.bd = { damage: dmg, pierce: p.pierce, hit: new Set() };
    }
  }

  // Deferred, crash-safe removal: mark dead + disable body now, destroy later.
  _killBullet(b) {
    if (!b || b._dead) return;
    b._dead = true;
    b.setActive(false).setVisible(false);
    if (b.body) b.body.enable = false;
    this._pending.push(b);
  }

  _killEnemy(e) {
    if (!e || e._dead) return;
    e._dead = true;
    this.score += 10;
    e.setActive(false).setVisible(false);
    if (e.body) e.body.enable = false;
    this._pending.push(e);
  }

  _onBulletHit(bullet, enemy) {
    if (bullet._dead || enemy._dead || !bullet.active || !enemy.active) return;
    if (bullet.bd.hit.has(enemy.ed.id)) return;
    bullet.bd.hit.add(enemy.ed.id);
    enemy.ed.hp -= bullet.bd.damage;
    this.ps.healFromDamage(bullet.bd.damage);
    if (bullet.bd.hit.size > bullet.bd.pierce) this._killBullet(bullet);
    if (enemy.ed.hp <= 0) this._killEnemy(enemy);
  }

  _onTouch(player, enemy) {
    if (this.state !== "combat" || enemy._dead) return;
    this.ps.takeDamage(enemy.ed.touchDamage * this._dt);
  }

  _onEnemyBullet(player, bullet) {
    // defensive: identify whichever argument is actually the bullet
    if (!bullet || !bullet.bd) { const t = bullet; bullet = player; player = t; }
    if (this.state !== "combat" || !bullet || bullet._dead || !bullet.bd) return;
    this.ps.takeDamage(bullet.bd.damage);
    this._killBullet(bullet);
  }

  _useAbility(name) {
    if (this.state !== "combat") return;
    if (!this.ps.triggerAbility(name)) return;
    if (name === "parry") {
      this.enemies.getChildren().forEach((e) => {
        if (e.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 120) {
          e.ed.stunT = Math.max(e.ed.stunT, 1.2);
          e.ed.hp -= this.ps.damage * 2;
          if (e.ed.hp <= 0) this._killEnemy(e);
        }
      });
    }
  }

  _updateEnemies(dt) {
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      e.ed.stunT = Math.max(0, e.ed.stunT - dt);
      if (e.ed.stunT > 0) { e.setVelocity(0, 0); return; }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      let spd = e.ed.speed;
      if (this.ps.slowAura && dist < 160) spd *= (1 - this.ps.slowAura);
      this.physics.moveToObject(e, this.player, spd);
      if (e.ed.etype === "shooter") {
        e.ed.shootT -= dt;
        if (e.ed.shootT <= 0 && dist < 500) {
          e.ed.shootT = Phaser.Math.FloatBetween(1.8, 3);
          const ang = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          const b = this.ebullets.create(e.x, e.y, "ebullet").setDepth(17);
          b.setVelocity(Math.cos(ang) * 240, Math.sin(ang) * 240);
          // keep projectile hits meaningful but never a one-shot
          b.bd = { damage: Math.min(18, e.ed.touchDamage) };
        }
      }
    });
  }

  _updateDrones(dt) {
    while (this.drones.length < this.ps.drones) {
      const s = this.add.sprite(this.player.x, this.player.y, "drone").setDepth(19);
      this.drones.push({ sprite: s, angle: this.drones.length * 2, cd: 0 });
    }
    for (const d of this.drones) {
      d.angle += dt * 3; d.cd = Math.max(0, d.cd - dt);
      d.sprite.x = this.player.x + Math.cos(d.angle) * 60;
      d.sprite.y = this.player.y + Math.sin(d.angle) * 60;
      if (d.cd === 0) {
        this.enemies.getChildren().forEach((e) => {
          if (e.active && Phaser.Math.Distance.Between(d.sprite.x, d.sprite.y, e.x, e.y) < 24) {
            e.ed.hp -= this.ps.damage; d.cd = 0.3;
            if (e.ed.hp <= 0) this._killEnemy(e);
          }
        });
      }
    }
  }

  _cleanupBullets() {
    this.pbullets.getChildren().forEach((b) => {
      if (b.active && (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H)) b.destroy();
    });
    this.ebullets.getChildren().forEach((b) => {
      if (b.active && (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H)) b.destroy();
    });
  }

  _drawFX() {
    this.fx.clear();
    // enemy hp bars
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.ed.hp >= e.ed.maxHp) return;
      const w = e.width;
      const ratio = Phaser.Math.Clamp(e.ed.hp / e.ed.maxHp, 0, 1);
      const bx = e.x - w / 2, by = e.y - e.height / 2 - 8;
      this.fx.fillStyle(0x3c3c3c, 1).fillRect(bx, by, w, 4);
      this.fx.fillStyle(COL.green, 1).fillRect(bx, by, w * ratio, 4);
    });
    // shield ring + hurt flash
    if (this.ps.shielded) {
      this.fx.lineStyle(3, COL.cyan, 1).strokeCircle(this.player.x, this.player.y, 32);
    }
    this.player.setTint(this.ps.hurtFlash > 0 ? 0xff6060 : 0xffffff);
  }

  // --------------------------------------------------------------- end
  _showEnd(text, color) {
    this.state = "over";
    this.player.setVelocity(0, 0);
    const cam = this.cameras.main;
    const ov = this.add.rectangle(cam.midPoint.x, cam.midPoint.y, WORLD_W, WORLD_H, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(80);
    ov.setPosition(SCREEN_W / 2, SCREEN_H / 2);
    const t = (y, s, str, c) => this.add.text(SCREEN_W / 2, y, str, {
      fontFamily: FONT, fontSize: `${s}px`, color: c, align: "center",
      wordWrap: { width: SCREEN_W - 80 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(81);
    t(220, 40, text, color);
    t(290, 22, `Final Score: ${this.score}`, CSS.white);
    t(330, 20, `Stage ${this.stage}/${NUM_STAGES}   Correct ${this.correctTotal}/${this.questionsAsked}`, CSS.dim);
    t(410, 22, "Press ENTER to play again", CSS.yellow);
    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("ModeScene"));
  }

  // --------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this._dt = dt;

    // destroy anything queued during the physics step (crash-safe)
    if (this._pending.length) { this._pending.forEach((o) => o.destroy()); this._pending = []; }

    if (this.state === "combat") {
      this._movePlayer();
      this.ps.updateTimers(dt);
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        const t = this._nearestEnemy();
        if (t) { this._fireAt(t); this.fireTimer = this.ps.fireRate; }
      }
      this._updateEnemies(dt);
      this._updateDrones(dt);
      this._cleanupBullets();

      if (this.spawnDelay > 0) {
        this.spawnDelay -= dt;
        if (this.spawnDelay <= 0 && this.enemies.countActive(true) === 0) this._spawnStage();
      }
      if (this.ps.hp <= 0) { this._showEnd("GAME OVER", CSS.red); }
      else if (this.enemies.countActive(true) === 0 && this.spawnDelay <= 0) this._stageCleared();

      this._drawFX();
    } else if (this.state === "quiz") {
      this._movePlayer();
      this.ps.updateTimers(dt);
      this._updateDrones(dt);
      this.quiz.update(dt, this.player, this.ps);
      this._drawFX();
      if (this.quiz.finished) this._endQuiz();
    }

    this._updateHUD();
  }
}
