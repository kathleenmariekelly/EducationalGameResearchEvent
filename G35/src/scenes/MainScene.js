// MainScene.js
//
// Concept: tokenization as PRIORITY-ORDERED pattern matching.
//
// Learning objective (capability-level): given a raw string, the player can
// assemble and ORDER a set of token rules so the string tokenizes into the
// intended stream, and can predict how changing the order changes the split.
//
// Misconception targeted: "a set of token rules is just a set; order doesn't
// matter." It does — a keyword must be tried before the identifier rule, and
// a longer operator/number must be tried before its own prefix.
//
// Interaction: the player drags rule chips to set priority (top = tried
// first), then presses SUBMIT. Feedback is deliberately NOT live — pressing
// submit plays an animated left-to-right scan that reveals tokens one at a
// time with the current characters highlighted, so the player has to reason
// about ordering before checking, rather than brute-forcing swaps.
//
// Mechanic-concept fit: strip the compiler theme away and the mechanic is
// still "first-match, priority-ordered scanning of a string" — which IS
// tokenizing. Not decorative.

import { SCENARIOS } from "../scenarios.js";
import { loadState, saveState, permutationFor } from "../save.js";

const MONO = "'Courier New', monospace";
// Right panel: the rule stack.
const STACK_X = 620;
const STACK_TOP = 160;
const SLOT_H = 40;
const CHIP_W = 306;
// Left panel: input / goal / output zones, each with its own x,y and a wrap
// boundary so wide token rows never spill into another zone.
const INPUT_X = 26;
const INPUT_Y = 100;
const GOAL_X = 26;
const GOAL_Y = 172;
const OUT_X = 26;
const OUT_Y = 322;
const WRAP_MAX_X = 432;
const LINE_H = 34;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create(data) {
    this.customMode = !!(data && data.custom);
    this.customLevel = this.customMode ? data.custom : null;
    this.round = (data && Number.isInteger(data.level)) ? data.level : 0;
    this.state = loadState();
    this.settings = this.state.settings;
    this.animating = false;
    this.buildStaticUI();
    this.loadRound(this.round);

    this.input.on("drag", (pointer, obj, dragX, dragY) => {
      if (this.animating || obj.getData("kind") !== "chip") return;
      obj.y = Phaser.Math.Clamp(dragY, STACK_TOP - 20, STACK_TOP + this.chips.length * SLOT_H);
      obj.setDepth(100);
    });
    this.input.on("dragend", (pointer, obj) => {
      if (obj.getData("kind") !== "chip") return;
      obj.setDepth(1);
      this.relayoutChips();
    });
  }

  buildStaticUI() {
    // Header.
    this.add.rectangle(400, 0, 800, 60, 0x24283b).setOrigin(0.5, 0);
    this.add.text(16, 14, "TOKENSMITH", { fontFamily: MONO, fontSize: "26px", color: "#ffcd75" });
    this.roundText = this.add.text(784, 22, "", { fontFamily: MONO, fontSize: "13px", color: "#a0a4c0" }).setOrigin(1, 0);

    // Two panels: left = data zones, right = rule stack. Clear separation.
    this.add.rectangle(12, 68, 430, 464, 0x1f2233).setOrigin(0, 0).setStrokeStyle(2, 0x3a3f5c);
    this.add.rectangle(452, 68, 336, 464, 0x1f2233).setOrigin(0, 0).setStrokeStyle(2, 0x3a3f5c);

    // Left panel: INPUT.
    this.add.text(INPUT_X, 78, "INPUT STRING", { fontFamily: MONO, fontSize: "12px", color: "#7a80a0" });
    this.inputChars = [];
    this.caret = this.add.rectangle(INPUT_X, INPUT_Y + 32, 0, 4, 0xffcd75).setOrigin(0, 0).setVisible(false);

    // Left panel: GOAL.
    this.add.text(GOAL_X, 150, "GOAL  (produce exactly these tokens)", { fontFamily: MONO, fontSize: "12px", color: "#7a80a0" });
    this.goalGroup = this.add.container(0, 0);

    // Left panel: OUTPUT.
    this.add.text(OUT_X, 300, "YOUR OUTPUT", { fontFamily: MONO, fontSize: "12px", color: "#7a80a0" });
    this.outputGroup = this.add.container(0, 0);

    // Right panel: rule stack.
    this.add.text(STACK_X, 84, "RULE PRIORITY", { fontFamily: MONO, fontSize: "14px", color: "#ffcd75" }).setOrigin(0.5, 0);
    this.add.text(STACK_X, 104, "\u2195 drag chips \u2014 first match wins", { fontFamily: MONO, fontSize: "11px", color: "#7a80a0" }).setOrigin(0.5, 0);

    // Status + hint span the full width along the bottom, below both panels.
    this.statusText = this.add.text(400, 548, "", { fontFamily: MONO, fontSize: "15px", color: "#a7f070", align: "center" }).setOrigin(0.5);
    this.hintText = this.add
      .text(400, 584, "", { fontFamily: MONO, fontSize: "12px", color: "#7a80a0", align: "center", wordWrap: { width: 760 } })
      .setOrigin(0.5);

    this.submitBtn = this.makeButton(STACK_X, 458, "SUBMIT", 0xa7f070, () => this.onSubmit());
    this.nextBtn = this.makeButton(STACK_X, 458, "NEXT \u25B6", 0xef7d57, () => this.nextRound());
    this.nextBtn.setVisible(false);
    // BACK works even mid-submission: cancel the running animation and leave.
    this.makeButton(STACK_X, 500, "\u25C0 BACK", 0x8b8fb5, () => {
      if (this.pendingEvents) this.pendingEvents.forEach((e) => e.remove(false));
      this.tweens.killAll();
      this.scene.start(this.customMode ? "CustomScene" : "LevelSelectScene");
    });
  }

  makeButton(x, y, label, color, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 140, 44, color).setStrokeStyle(3, 0x11121f);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "18px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    c.setData("bg", bg);
    c.setData("base", color);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(c.getData("base")));
    return c;
  }

  setButtonEnabled(btn, enabled) {
    const bg = btn.getData("bg");
    btn.setAlpha(enabled ? 1 : 0.4);
    if (enabled) bg.setInteractive({ useHandCursor: true });
    else bg.disableInteractive();
  }

  loadRound(i) {
    const sc = this.customMode ? this.customLevel : SCENARIOS[i];
    this.scenario = sc;
    this.solved = false;
    this.animating = false;
    this.nextBtn.setVisible(false);
    this.submitBtn.setVisible(true);
    this.setButtonEnabled(this.submitBtn, true);
    this.statusText.setText("");
    this.roundText.setText(this.customMode ? `CUSTOM: ${sc.name}` : `LEVEL ${i + 1} / ${SCENARIOS.length}`);
    this.statusText.setColor("#a7f070");
    this.hintText.setText("Hint: " + sc.hint);

    // Render input as individual chars so we can highlight the scan.
    this.inputChars.forEach((o) => o.destroy());
    this.inputChars = [];
    let cx = INPUT_X;
    for (const ch of sc.input) {
      const disp = ch === " " ? "\u00B7" : ch; // show spaces as a mid-dot
      const t = this.add.text(cx, INPUT_Y, disp, {
        fontFamily: MONO, fontSize: "30px", color: ch === " " ? "#3a3f5c" : "#ffffff",
      });
      t.setData("baseColor", ch === " " ? "#3a3f5c" : "#ffffff");
      this.inputChars.push(t);
      cx += t.width || 18;
    }
    this.caret.setVisible(false);

    // Goal tokens (rendered dimmed, wrapped within the left panel).
    this.goalGroup.removeAll(true);
    this.renderTokens(this.goalGroup, GOAL_X, GOAL_Y, sc.target.map((t) => ({ type: t.type, value: t.value, color: this.goalColor(sc, t.type), dim: true })));

    // Build draggable chips. On replay, restore the player's last submitted
    // order; otherwise use the scenario's deliberately-wrong default.
    if (this.chips) this.chips.forEach((c) => c.destroy());
    this.chips = [];
    this.chipById = {};
    const byId = Object.fromEntries(sc.rules.map((r) => [r.id, r]));
    const order = (!this.customMode && permutationFor(this.state, i)) || sc.initialOrder;
    order.forEach((id, idx) => {
      const chip = this.makeChip(byId[id], idx);
      this.chips.push(chip);
      this.chipById[id] = chip;
    });

    this.outputGroup.removeAll(true);
    this.outputGroup.add(this.add.text(OUT_X, OUT_Y, "press SUBMIT to run the tokenizer", { fontFamily: MONO, fontSize: "13px", color: "#555a78" }));
  }

  goalColor(sc, type) {
    const r = sc.rules.find((r) => r.label === type);
    return r ? r.color : 0x41a6f6;
  }

  makeChip(rule, slot) {
    const y = STACK_TOP + slot * SLOT_H;
    const c = this.add.container(STACK_X, y);
    c.setData("kind", "chip");
    c.setData("ruleId", rule.id);

    const bg = this.add.rectangle(0, 0, CHIP_W, SLOT_H - 8, rule.color).setStrokeStyle(2, 0x11121f);
    const grip = this.add.text(-CHIP_W / 2 + 10, 0, "\u2261", { fontFamily: MONO, fontSize: "20px", color: "#11121f" }).setOrigin(0, 0.5);
    const badge = this.add.text(-CHIP_W / 2 + 34, 0, String(slot + 1), { fontFamily: MONO, fontSize: "16px", color: "#11121f" }).setOrigin(0, 0.5);
    const label = this.add.text(-CHIP_W / 2 + 58, 0, rule.label, { fontFamily: MONO, fontSize: "16px", color: "#11121f" }).setOrigin(0, 0.5);
    const pat = this.add.text(CHIP_W / 2 - 10, 0, `/${rule.pattern}/`, { fontFamily: MONO, fontSize: "11px", color: "#11121f" }).setOrigin(1, 0.5);

    c.add([bg, grip, badge, label, pat]);
    c.setData("badge", badge);
    c.setData("bg", bg);
    c.setSize(CHIP_W, SLOT_H - 8);
    c.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(c);
    c.on("pointerover", () => { if (!this.animating) bg.setStrokeStyle(3, 0xffffff); });
    c.on("pointerout", () => bg.setStrokeStyle(2, 0x11121f));
    return c;
  }

  relayoutChips() {
    this.chips.sort((a, b) => a.y - b.y);
    this.chips.forEach((c, idx) => {
      this.tweens.add({ targets: c, y: STACK_TOP + idx * SLOT_H, duration: 120, ease: "Quad.out" });
      c.getData("badge").setText(String(idx + 1));
    });
  }

  currentOrder() {
    return [...this.chips].sort((a, b) => a.y - b.y).map((c) => c.getData("ruleId"));
  }

  // Priority-ordered, first-match, left-to-right scan. Records, at each scan
  // position, EVERY rule tried in priority order (not just the winner) so the
  // animation can show the priority list being consulted top-to-bottom.
  tokenizeTrace(input, orderedRules) {
    const steps = [];
    let pos = 0;
    while (pos < input.length) {
      const attempts = [];
      let matchedRule = null;
      let matchLen = 0;
      for (const rule of orderedRules) {
        const re = new RegExp(rule.pattern, "y");
        re.lastIndex = pos;
        const m = re.exec(input);
        const ok = !!m && m[0].length > 0;
        attempts.push({ ruleId: rule.id, matched: ok });
        if (ok) { matchedRule = rule; matchLen = m[0].length; break; }
      }
      if (!matchedRule) return { steps, stuckAt: pos, stuckAttempts: attempts };
      steps.push({
        attempts, start: pos, end: pos + matchLen,
        label: matchedRule.label, value: input.slice(pos, pos + matchLen),
        color: matchedRule.color, skip: !!matchedRule.skip,
      });
      pos += matchLen;
    }
    return { steps, stuckAt: -1 };
  }

  onSubmit() {
    if (this.animating) return;
    this.animating = true;
    this.setButtonEnabled(this.submitBtn, false);
    this.statusText.setText("");
    this.outputGroup.removeAll(true);
    this.inputChars.forEach((t) => t.setColor(t.getData("baseColor")));

    // Persist the submitted order immediately (this IS the "last permutation").
    if (!this.customMode) {
      this.state.lastPermutation[this.round] = this.currentOrder();
      saveState(this.state);
    }

    const byId = Object.fromEntries(this.scenario.rules.map((r) => [r.id, r]));
    const ordered = this.currentOrder().map((id) => byId[id]);
    const trace = this.tokenizeTrace(this.scenario.input, ordered);

    this.outX = OUT_X;
    this.outY = OUT_Y;
    this.runTimeline(this.buildTimeline(trace), trace);
  }

  // Turn a trace into a list of {t, fn} events. The per-attempt delay starts
  // slow (so the priority scan is legible) and speeds up as the run proceeds.
  buildTimeline(trace) {
    const tl = [];
    let t = 0;
    const st = this.settings;
    // Time-based acceleration: pulse rate multiplies by `growth` every
    // `everyMs`, capped at `cap`x. With accel off, it's a constant baseMs.
    const durAt = () => {
      if (!st.accel) return st.baseMs;
      const mult = Math.min(st.cap, Math.pow(st.growth, t / st.everyMs));
      return st.baseMs / mult;
    };
    const attemptSweep = (attempts) => {
      attempts.forEach((a) => {
        const dur = durAt();
        tl.push({ t, fn: () => this.pulseChip(a.ruleId, !a.matched, dur) });
        t += dur;
      });
    };

    for (const s of trace.steps) {
      attemptSweep(s.attempts);
      const L = s.end - s.start;
      const sub = Math.max(55, durAt() * 0.6);
      for (let k = 0; k < L; k++) {
        const idx = s.start + k;
        tl.push({ t: t + k * sub, fn: () => this.revealChar(idx, s) });
      }
      t += L * sub;
      if (!s.skip) { tl.push({ t, fn: () => this.popToken(s) }); t += Math.max(150, durAt() * 0.7); }
      t += 50; // small gap between scan positions
    }

    if (trace.stuckAt >= 0) {
      attemptSweep(trace.stuckAttempts);
      t += 120;
    }
    tl.push({ t: t + 350, fn: () => this.finishReveal(trace) });
    return tl;
  }

  runTimeline(tl) {
    this.pendingEvents = [];
    for (const ev of tl) {
      this.pendingEvents.push(this.time.delayedCall(ev.t, ev.fn));
    }
  }

  // A rule chip pulses (expand then contract) each time it is tried. Failed
  // attempts flash red, the winning attempt flashes white.
  pulseChip(ruleId, failed, dur) {
    const chip = this.chipById[ruleId];
    if (!chip) return;
    const bg = chip.getData("bg");
    this.tweens.add({ targets: chip, scaleX: 1.08, scaleY: 1.2, duration: dur * 0.4, yoyo: true, ease: "Quad.out" });
    bg.setStrokeStyle(3, failed ? 0xef7d57 : 0xffffff);
    this.time.delayedCall(dur * 0.85, () => bg.setStrokeStyle(2, 0x11121f));
  }

  // Reveal one character of the winning match, growing the caret across the
  // token span so multi-character tokens are highlighted char-by-char.
  revealChar(idx, s) {
    const t = this.inputChars[idx];
    if (!t) return;
    const hex = "#" + s.color.toString(16).padStart(6, "0");
    t.setColor(s.skip ? "#555a78" : hex);
    const startX = this.inputChars[s.start] ? this.inputChars[s.start].x : INPUT_X;
    const endX = t.x + (t.width || 18);
    this.caret.setVisible(true);
    this.caret.x = startX;
    this.tweens.add({ targets: this.caret, width: endX - startX, duration: 90, ease: "Quad.out" });
  }

  popToken(s) {
    const text = `${s.label}:${s.value}`;
    const w = text.length * 9 + 18;
    if (this.outX + w > WRAP_MAX_X) { this.outX = OUT_X; this.outY += LINE_H; }
    const y = this.outY;
    const rect = this.add.rectangle(this.outX, y, w, 30, s.color).setOrigin(0, 0).setStrokeStyle(2, 0x11121f);
    const label = this.add.text(this.outX + 9, y + 6, text, { fontFamily: MONO, fontSize: "14px", color: "#11121f" }).setOrigin(0, 0);
    this.outputGroup.add([rect, label]);
    // pop-in animation
    rect.setScale(0.2);
    label.setAlpha(0);
    this.tweens.add({ targets: rect, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: label, alpha: 1, duration: 180, delay: 60 });
    this.outX += w + 8;
  }

  finishReveal(trace) {
    const { steps, stuckAt } = trace;
    const tokens = steps.filter((s) => !s.skip).map((s) => ({ type: s.label, value: s.value }));
    const ok = stuckAt === -1 && this.tokensMatch(tokens, this.scenario.target);
    this.caret.setVisible(false);

    if (stuckAt >= 0) {
      const ch = this.inputChars[stuckAt];
      if (ch) ch.setColor("#ef7d57");
      this.statusText.setColor("#ef7d57");
      this.statusText.setText(`\u2717 STUCK at '${this.scenario.input[stuckAt]}' \u2014 no rule matched it.\nA later rule needed to win earlier.`);
      this.animating = false;
      this.setButtonEnabled(this.submitBtn, true);
      return;
    }

    if (ok) {
      this.solved = true;
      this.animating = false;
      if (!this.customMode) {
        // Mark complete + unlock the next level, and persist.
        this.state.completed[this.round] = true;
        saveState(this.state);
      }
      this.statusText.setColor("#a7f070");
      this.statusText.setText("\u2713 TOKENIZED! matches the goal.");
      this.submitBtn.setVisible(false);
      if (!this.customMode) { this.nextBtn.setVisible(true); this.setButtonEnabled(this.nextBtn, true); }
    } else {
      // find first mismatch to give a targeted nudge
      let k = 0;
      while (k < tokens.length && k < this.scenario.target.length && tokens[k].type === this.scenario.target[k].type && tokens[k].value === this.scenario.target[k].value) k++;
      const want = this.scenario.target[k];
      this.statusText.setColor("#ef7d57");
      this.statusText.setText(
        `\u2717 Not quite. Token #${k + 1} should be ${want ? want.type + ":" + want.value : "(nothing more)"}.\nWhich rule is grabbing those characters too early?`
      );
      this.animating = false;
      this.setButtonEnabled(this.submitBtn, true);
    }
  }

  tokensMatch(a, b) {
    if (a.length !== b.length) return false;
    return a.every((t, i) => t.type === b[i].type && t.value === b[i].value);
  }

  renderTokens(group, x, y, tokens) {
    let cx = x;
    let cy = y;
    if (tokens.length === 0) {
      group.add(this.add.text(x, y, "(none)", { fontFamily: MONO, fontSize: "13px", color: "#555a78" }));
      return;
    }
    tokens.forEach((t) => {
      const text = `${t.type}:${t.value}`;
      const w = text.length * 9 + 18;
      if (cx + w > WRAP_MAX_X) { cx = x; cy += LINE_H; }
      const rect = this.add.rectangle(cx, cy, w, 30, t.color !== undefined ? t.color : 0x41a6f6).setOrigin(0, 0).setStrokeStyle(2, 0x11121f);
      if (t.dim) rect.setAlpha(0.55);
      const label = this.add.text(cx + 9, cy + 6, text, { fontFamily: MONO, fontSize: "14px", color: "#11121f" }).setOrigin(0, 0);
      group.add([rect, label]);
      cx += w + 8;
    });
  }

  nextRound() {
    this.round++;
    if (this.round >= SCENARIOS.length) {
      this.showEnd();
      return;
    }
    this.loadRound(this.round);
  }

  toLevelSelect() {
    this.scene.start("LevelSelectScene");
  }

  showEnd() {
    this.chips.forEach((c) => c.destroy());
    this.chips = [];
    this.goalGroup.removeAll(true);
    this.outputGroup.removeAll(true);
    this.inputChars.forEach((o) => o.destroy());
    this.inputChars = [];
    this.caret.setVisible(false);
    this.hintText.setText("");
    this.roundText.setText("");
    this.statusText.setText("");
    this.submitBtn.setVisible(false);
    this.nextBtn.setVisible(false);

    this.add.rectangle(400, 320, 640, 260, 0x24283b).setStrokeStyle(3, 0xffcd75);
    this.add.text(400, 230, "ALL TOKENIZED \u2713", { fontFamily: MONO, fontSize: "26px", color: "#a7f070" }).setOrigin(0.5);
    this.add
      .text(
        400,
        320,
        "A tokenizer is an ORDERED list of rules, not a set.\nThe first rule that matches at each position wins \u2014\nso keywords beat identifiers and '<=' beats '<'.\n\nYou can build one for any text: logs, configs, your own DSL.",
        { fontFamily: MONO, fontSize: "14px", color: "#c8ccec", align: "center", lineSpacing: 6 }
      )
      .setOrigin(0.5);
    this.makeButton(300, 430, "REPLAY L1", 0xa7f070, () => this.scene.start("MainScene", { level: 0 }));
    this.makeButton(500, 430, "\u25C0 LEVELS", 0x8b8fb5, () => this.toLevelSelect());
  }
}
