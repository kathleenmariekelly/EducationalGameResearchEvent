// Interactive between-wave quiz in a sky "room".
// - Questions are pre-drawn as a UNIQUE set per quiz (no repeats).
// - No arrow: an instruction is shown centre-screen, SPACE begins.
// - Answer pads live in the sky; walk onto one and dwell to select.
// - Feedback (correct/incorrect + reason) waits for SPACE to continue.
// - Perks are chosen at the END: one pick per correct answer.
import {
  SCREEN_W, SCREEN_H, WORLD_W, QUIZ_PAD_Y, QUIZ_ROOM_TOP, QUIZ_ROOM_BOT, COL, CSS,
} from "./config.js";
import { samplePerks } from "./data/perks.js";

const DWELL = 0.7;
const PAD_W = 210, PAD_H = 90;
const ANSWER_SPACING = 340;
const PERK_SPACING = 430;
const FONT = "Consolas, monospace";

export class Quiz {
  constructor(scene, pool, { stage, total, useCode, boss, learn }) {
    this.scene = scene;
    this.pool = pool;
    this.stage = stage;
    this.boss = boss;
    this.useCode = useCode;
    this.learn = !!learn;   // Learn mode: show a lesson + highlight the answer
    this.total = boss ? 1 : total;

    this.qIndex = 0;
    this.correctCount = 0;
    this.answeredCount = 0;   // questions actually answered (for correct/total)
    this.finished = false;
    this.bigBoostEarned = false;

    this.state = "intro";
    this.pads = [];
    this.originX = WORLD_W / 2;
    this.bossPart = 1;
    this.bossCorrect = 0;
    this.current = null;
    this.lastCorrect = false;
    this.perksRemaining = 0;
    this.questions = [];

    this.uiObjs = [];
    this.room = scene.add.graphics().setScrollFactor(0).setDepth(40);
    this.space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._drawRoomBand();
  }

  begin(playerSprite) {
    const half = ANSWER_SPACING * 2 + PAD_W;
    this.originX = Math.max(half, Math.min(WORLD_W - half, playerSprite.x));
    if (!this.boss) this.questions = this.pool.drawUnique(this.total, this.stage, this.useCode);
    this._showIntro();
  }

  // ---------------------------------------------------------------- helpers
  _text(x, y, str, size, color, opts = {}) {
    const t = this.scene.add.text(x, y, str, {
      fontFamily: FONT, fontSize: `${size}px`, color,
      align: opts.align || "center",
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
      fontStyle: opts.bold ? "bold" : "normal",
    }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5).setScrollFactor(0).setDepth(55);
    this.uiObjs.push(t);
    return t;
  }

  _clearUI() { this.uiObjs.forEach((o) => o.destroy()); this.uiObjs = []; }
  _clearPads() {
    this.pads.forEach((p) => {
      p.rect.destroy(); p.inside.destroy(); p.top.destroy(); p.topBg.destroy(); p.bar.destroy();
    });
    this.pads = [];
  }

  _drawRoomBand() {
    const cam = this.scene.cameras.main;
    const top = QUIZ_ROOM_TOP - cam.scrollY;
    const h = QUIZ_ROOM_BOT - QUIZ_ROOM_TOP;
    this.room.clear();
    this.room.fillStyle(0x1e2240, 0.55).fillRect(0, top, SCREEN_W, h);
    this.room.lineStyle(2, COL.primary, 1);
    this.room.lineBetween(0, top, SCREEN_W, top);
    this.room.lineBetween(0, top + h, SCREEN_W, top + h);
  }

  _centerCard(lines) {
    // lines: [{str,size,color,bold}] rendered stacked, centred
    const panel = this.scene.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W - 120, 260,
      0x10142a, 0.94).setStrokeStyle(2, COL.primary).setScrollFactor(0).setDepth(54);
    this.uiObjs.push(panel);
    let y = SCREEN_H / 2 - (lines.length - 1) * 26;
    for (const ln of lines) {
      this._text(SCREEN_W / 2, y, ln.str, ln.size, ln.color,
        { wrap: SCREEN_W - 180, bold: ln.bold });
      y += ln.gap ?? 52;
    }
  }

  // ---------------------------------------------------------------- states
  _showIntro() {
    this._clearUI();
    const kind = this.boss ? "BOSS QUIZ" : "QUIZ TIME!";
    this._centerCard([
      { str: kind, size: 36, color: CSS.yellow, bold: true, gap: 60 },
      { str: "Walk UP into the sky room and stand on an answer pad to choose your answer.",
        size: 19, color: CSS.white, gap: 70 },
      { str: "Press SPACE to begin", size: 20, color: CSS.green },
    ]);
    this.state = "intro";
  }

  _loadQuestion() {
    this._clearUI(); this._clearPads();
    if (this.boss) { this._boss = this.pool.getBoss(); this.current = this._boss.part1; }
    else { this.current = this.questions[this.qIndex]; }
    this._beginQuestion();
  }

  // In Learn mode, teach the concept first; in Review mode go straight to it.
  _beginQuestion() {
    this._clearUI(); this._clearPads();
    if (this.learn) this._showLesson();
    else this._presentQuestion();
  }

  _presentQuestion() {
    this._clearUI();
    this._showQuestionUI();
    this._makeAnswerPads();
    this.state = "question";
  }

  _showLesson() {
    const text = this.current.learn || this.current.explanation;
    this._centerCard([
      { str: "LESSON", size: 30, color: CSS.yellow, bold: true, gap: 52 },
      { str: text, size: 18, color: CSS.white, gap: 64 },
      { str: "Press SPACE, then choose the answer that fits the lesson", size: 17, color: CSS.green },
    ]);
    this.state = "lesson";
  }

  _showQuestionUI() {
    const q = this.current;
    const qtext = this._text(SCREEN_W / 2, SCREEN_H - 40, q.q, 20, CSS.white,
      { wrap: SCREEN_W - 100, bold: true, originY: 1 });
    let topY = qtext.y - qtext.height;

    if (q.code) {
      const code = this.scene.add.text(SCREEN_W / 2, topY - 10, q.code, {
        fontFamily: FONT, fontSize: "15px", color: CSS.cyan, align: "left",
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(55);
      this.uiObjs.push(code);
      const box = this.scene.add.rectangle(SCREEN_W / 2, code.y - code.height / 2,
        code.width + 28, code.height + 16, 0x0c1018)
        .setStrokeStyle(1, COL.cyan).setScrollFactor(0).setDepth(54);
      this.uiObjs.push(box);
      topY = code.y - code.height - 10;
    }

    const panelTop = topY - 12;
    const panel = this.scene.add.rectangle(SCREEN_W / 2, (panelTop + SCREEN_H) / 2,
      SCREEN_W, SCREEN_H - panelTop, 0x10142a, 0.92).setScrollFactor(0).setDepth(52);
    const line = this.scene.add.rectangle(SCREEN_W / 2, panelTop, SCREEN_W, 2, COL.primary)
      .setScrollFactor(0).setDepth(53);
    this.uiObjs.push(panel, line);
  }

  _makeAnswerPads() {
    const opts = this.current.options;
    const startX = this.originX - ANSWER_SPACING * (opts.length - 1) / 2;
    opts.forEach((text, i) => {
      this._addPad(startX + i * ANSWER_SPACING, QUIZ_PAD_Y,
        String.fromCharCode(65 + i), text, i, COL.primary);
    });
  }

  _makePerkPads(ps) {
    this._clearPads();
    const choices = samplePerks(ps, 3);
    const startX = this.originX - PERK_SPACING * (choices.length - 1) / 2;
    choices.forEach((perk, i) => {
      this._addPad(startX + i * PERK_SPACING, QUIZ_PAD_Y,
        String.fromCharCode(65 + i), `${perk.name}\n${perk.desc}`, perk, perk.color);
    });
  }

  // insideLabel: shown big inside the pad; topText: full text shown ON TOP of the pad.
  // highlight: Learn-mode marker for the correct pad.
  _addPad(x, y, insideLabel, topText, payload, color, highlight = false) {
    const rect = this.scene.add.rectangle(x, y, PAD_W, PAD_H, color)
      .setStrokeStyle(highlight ? 4 : 2, highlight ? COL.yellow : COL.white).setDepth(45);
    const inside = this.scene.add.text(x, y, highlight ? `${insideLabel} *` : insideLabel, {
      fontFamily: FONT, fontSize: "18px", color: CSS.white, align: "center",
      fontStyle: "bold", wordWrap: { width: PAD_W - 16 },
    }).setOrigin(0.5).setDepth(46);
    const top = this.scene.add.text(x, y - PAD_H / 2 - 12, topText, {
      fontFamily: FONT, fontSize: "15px", color: CSS.yellow, align: "center",
      wordWrap: { width: PAD_W + 100 },
    }).setOrigin(0.5, 1).setDepth(47);
    const topBg = this.scene.add.rectangle(x, top.y - top.height / 2,
      top.width + 16, top.height + 8, 0x10142a, 0.92).setStrokeStyle(1, color).setDepth(46);
    const bar = this.scene.add.rectangle(x - PAD_W / 2, y + PAD_H / 2 - 6, 0, 7, COL.yellow)
      .setOrigin(0, 0.5).setDepth(46);
    this.pads.push({ x, y, payload, color, progress: 0, rect, inside, top, topBg, bar });
  }

  // ---------------------------------------------------------------- update
  update(dt, playerSprite, ps) {
    this._drawRoomBand();
    const spacePressed = Phaser.Input.Keyboard.JustDown(this.space);

    if (this.state === "intro") {
      if (spacePressed) this._loadQuestion();
      return;
    }

    if (this.state === "lesson") {
      if (spacePressed) this._presentQuestion();
      return;
    }

    if (this.state === "question" || this.state === "perkselect") {
      let selected = null;
      for (const pad of this.pads) {
        const on = Math.abs(playerSprite.x - pad.x) <= PAD_W / 2 &&
                   Math.abs(playerSprite.y - pad.y) <= PAD_H / 2;
        if (on) { pad.progress += dt; if (pad.progress >= DWELL) selected = pad; }
        else pad.progress = Math.max(0, pad.progress - dt * 2);
        pad.bar.width = PAD_W * Math.min(1, pad.progress / DWELL);
      }
      if (selected) {
        if (this.state === "question") this._resolveAnswer(selected, ps);
        else this._resolvePerk(selected, ps);
      }
      return;
    }

    if (this.state === "qfeedback") {
      if (spacePressed) this._afterQuestion(ps);
    } else if (this.state === "perkfeedback") {
      if (spacePressed) this._afterPerk(ps);
    }
  }

  _resolveAnswer(pad, ps) {
    const correct = pad.payload === this.current.answer;
    this.lastCorrect = correct;
    this.answeredCount += 1;
    if (correct) this.correctCount += 1;
    const expl = this.current.explanation;
    let msg;
    if (this.boss) {
      if (correct) this.bossCorrect += 1;
      if (this.bossPart === 1) msg = correct ? "Correct! Now the reason why..." : "Wrong - but face part 2!";
      else {
        const both = this.bossCorrect === 2;
        this.bigBoostEarned = both;
        msg = both ? "BOTH RIGHT! Massive boost incoming!" : "The boss resists... no boost.";
      }
    } else {
      msg = correct ? "Correct!" : "Not quite.";
    }
    this._showFeedback(msg, expl, correct ? CSS.green : CSS.red);
    this.state = "qfeedback";
  }

  _resolvePerk(pad, ps) {
    ps.applyPerk(pad.payload);
    this._showFeedback(`Gained: ${pad.payload.name}!`, pad.payload.desc, CSS.green);
    this.state = "perkfeedback";
  }

  _showFeedback(msg, expl, color) {
    this._clearUI(); this._clearPads();
    this._centerCard([
      { str: msg, size: 30, color, bold: true, gap: 64 },
      { str: expl, size: 18, color: CSS.white, gap: 70 },
      { str: "Press SPACE to continue", size: 18, color: CSS.yellow },
    ]);
  }

  _afterQuestion(ps) {
    if (this.boss) {
      if (this.bossPart === 1) {
        this.bossPart = 2;
        this.current = this._boss.part2;
        this._beginQuestion();
      } else {
        if (this.bigBoostEarned) this._applyBigBoost(ps);
        this._end();
      }
      return;
    }
    this.qIndex += 1;
    if (this.qIndex < this.total) {
      this._loadQuestion();
    } else {
      this.perksRemaining = this.correctCount;
      if (this.perksRemaining > 0) this._openPerkSelect(ps);
      else this._end();
    }
  }

  _afterPerk(ps) {
    this.perksRemaining -= 1;
    if (this.perksRemaining > 0) this._openPerkSelect(ps);
    else this._end();
  }

  _openPerkSelect(ps) {
    this._clearUI(); this._clearPads();
    this._text(SCREEN_W / 2, SCREEN_H - 44,
      `Choose a perk!  (${this.perksRemaining} left) - step onto a pad`, 20, CSS.green,
      { bold: true, originY: 1 });
    const panel = this.scene.add.rectangle(SCREEN_W / 2, SCREEN_H - 38, SCREEN_W, 48, 0x10142a, 0.92)
      .setScrollFactor(0).setDepth(52);
    this.uiObjs.push(panel);
    this._makePerkPads(ps);
    this.state = "perkselect";
  }

  _applyBigBoost(ps) {
    ps.maxHp += 60; ps.hp = ps.maxHp;
    ps.damage *= 1.5; ps.fireRate *= 0.7; ps.speed *= 1.1;
    if (!ps.abilities.shield) ps.unlockAbility("shield");
  }

  _end() {
    this._clearUI(); this._clearPads();
    this.room.destroy();
    this.finished = true;
  }
}
