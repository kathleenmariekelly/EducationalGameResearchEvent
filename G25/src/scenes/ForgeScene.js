// ForgeScene.js
//
// Levels 7 & 8: the player writes the loot table's real code. Two puzzles,
// each verified by RUNNING the produced code against a live drop test:
//   - Forge I  (fill): choose the correct drop-rate formula.
//   - Forge II (parsons): order the lines of the weighted-pick algorithm.
//
// Solving each awards score; wrong attempts cost a little, so understanding
// (not guessing) is rewarded. Reaching here already means the player cleared
// all six tuning rooms.

import {
  FILL_PUZZLES, PARSONS_PUZZLES, verifyFill, verifyParsons, shuffled, pick,
} from "../forge.js";

const FORGE_COUNT = 2; // slot 0 = fill, slot 1 = parsons

export default class ForgeScene extends Phaser.Scene {
  constructor() {
    super("ForgeScene");
  }

  init(data) {
    this.state = data; // { player, npc, hp, maxHp, score, puzzleIndex }
    this.attempts = 0;
  }

  create() {
    // Draw a random puzzle from the matching pool so each run differs.
    if (this.state.puzzleIndex === 0) {
      this.puzzle = pick(FILL_PUZZLES);
      this.renderFill();
    } else {
      this.puzzle = pick(PARSONS_PUZZLES);
      this.renderParsons();
    }
  }

  header(bodyHtml) {
    const { width } = this.scale;
    const html = `
      <div class="panel forge-panel">
        <div class="forge-top">
          <div class="room-title">${this.puzzle.title}
            <span class="room-count">Level ${this.state.puzzleIndex + 7} / 8</span>
          </div>
          <div class="forge-sub">${this.state.npc} needs the loot engine forged before the next expedition.</div>
        </div>
        <p class="forge-intro">${this.puzzle.intro}</p>
        ${bodyHtml}
        <div id="forgeResult" class="result hidden"></div>
      </div>`;
    this.dom = this.add.dom(width / 2, 16).createFromHTML(html).setOrigin(0.5, 0);
  }

  // ---- Forge I: fill in the blank ----------------------------------------
  renderFill() {
    const p = this.puzzle;
    this.opts = shuffled(p.options);
    const codeHtml = p.skeleton
      .map((line) =>
        line.includes("???")
          ? `<div class="code-line">${line.replace("???", '<span class="blank" id="blankSlot">&nbsp;&nbsp;?&nbsp;&nbsp;</span>')}</div>`
          : `<div class="code-line">${this.escape(line)}</div>`
      )
      .join("");
    const optHtml = this.opts
      .map(
        (o, i) =>
          `<button class="opt-btn" data-opt="${i}"><code>${this.escape(o.code)}</code></button>`
      )
      .join("");

    this.header(`
      <pre class="code-block">${codeHtml}</pre>
      <div class="opt-list">${optHtml}</div>
    `);

    this.dom.node.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const opt = this.opts[parseInt(btn.dataset.opt, 10)];
        this.dom.getChildByID("blankSlot").textContent = opt.code;
        this.attempts++;
        const res = verifyFill(this.puzzle, opt.code);
        this.showResult(res, { why: opt.why, chosenCode: opt.code });
      });
    });
  }

  // ---- Forge II: Parsons (order the lines) -------------------------------
  renderParsons() {
    const p = this.puzzle;
    this.order = shuffled(p.lines.map((_, i) => i)); // indices into p.lines
    // Guard against accidentally starting already-correct.
    if (this.order.every((v, i) => v === i)) this.order.reverse();

    this.header(`
      <pre class="code-block fixed"><div class="code-line">${this.escape(p.header)}</div></pre>
      <div id="lineList" class="line-list"></div>
      <pre class="code-block fixed"><div class="code-line">${this.escape(p.footer)}</div></pre>
      <button id="runBtn">Run against drop tests &raquo;</button>
    `);

    this.renderLines();
    this.dom.getChildByID("runBtn").addEventListener("click", () => {
      this.attempts++;
      const ordered = this.order.map((idx) => this.puzzle.lines[idx]);
      const res = verifyParsons(this.puzzle, ordered);
      this.showResult(res, { ordered });
    });
  }

  renderLines() {
    const list = this.dom.getChildByID("lineList");
    list.innerHTML = this.order
      .map(
        (idx, pos) => `
        <div class="line-tile">
          <span class="line-code"><code>${this.escape(this.puzzle.lines[idx])}</code></span>
          <span class="line-moves">
            <button class="mv" data-dir="-1" data-pos="${pos}" ${pos === 0 ? "disabled" : ""}>&uarr;</button>
            <button class="mv" data-dir="1" data-pos="${pos}" ${pos === this.order.length - 1 ? "disabled" : ""}>&darr;</button>
          </span>
        </div>`
      )
      .join("");
    list.querySelectorAll(".mv").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pos = parseInt(btn.dataset.pos, 10);
        const dir = parseInt(btn.dataset.dir, 10);
        const swap = pos + dir;
        [this.order[pos], this.order[swap]] = [this.order[swap], this.order[pos]];
        this.renderLines();
      });
    });
  }

  // ---- shared result handling --------------------------------------------
  showResult(res, extra = {}) {
    const el = this.dom.getChildByID("forgeResult");
    if (!res.pass) {
      // 4th failed attempt: reveal the answer, highlight the mistake, end run.
      if (this.attempts >= 4) {
        this.revealAndEnd(res, extra);
        return;
      }
      // Attempts 2 and 3 surface escalating hints (hints[0], then hints[0..1]).
      const hints = this.puzzle.hints || [];
      const shown = hints.slice(0, Math.max(0, this.attempts - 1));
      const hintHtml = shown.length
        ? `<div class="hint-box"><b>Hint${shown.length > 1 ? "s" : ""}:</b><ul>${shown.map((h) => `<li>${h}</li>`).join("")}</ul></div>`
        : "";
      el.className = "result";
      el.innerHTML = `
        <div class="res-title dead">Not yet. (Attempt ${this.attempts} of 4)</div>
        <div>${res.detail}</div>
        ${extra.why ? `<div class="feedback"><li>${extra.why}</li></div>` : ""}
        ${hintHtml}
        <div class="retry-note">${shown.length ? "Use the hint and try again." : "Adjust and try again."}</div>`;
      return;
    }
    // Passed: award score (base minus a little per extra attempt), advance.
    const base = 150;
    const gained = Math.max(60, base - (this.attempts - 1) * 30);
    const newScore = this.state.score + gained;
    const last = this.state.puzzleIndex === FORGE_COUNT - 1;

    el.className = "result";
    el.innerHTML = `
      <div class="res-title">Forged! +${gained} score (${this.attempts} attempt${this.attempts > 1 ? "s" : ""}).</div>
      <div>${res.detail}</div>
      <button id="fwdBtn">${last ? "Finish the run &raquo;" : "Next: Forge II &raquo;"}</button>`;

    this.dom.getChildByID("fwdBtn").addEventListener("click", () => {
      if (last) {
        this.scene.start("ScoreScene", {
          ...this.state, score: newScore, survived: true, roomsCleared: 6, forged: true,
        });
      } else {
        this.scene.start("ForgeScene", {
          ...this.state, score: newScore, puzzleIndex: this.state.puzzleIndex + 1,
        });
      }
    });
  }

  // 4th miss: show the correct answer, mark what they got wrong, end the run.
  revealAndEnd(res, extra) {
    const el = this.dom.getChildByID("forgeResult");
    let answerHtml = "";
    let wrongHtml = "";

    if (this.puzzle.type === "fill" || this.puzzle.options) {
      const correct = this.puzzle.options.find((o) => o.correct).code;
      answerHtml = `<pre class="code-block"><div class="code-line">return <span class="ans-correct">${this.escape(correct)}</span>;</div></pre>`;
      if (extra.chosenCode) {
        wrongHtml = `<div>Your last pick, <code class="ans-wrong">${this.escape(extra.chosenCode)}</code>, was wrong${extra.why ? ` \u2014 ${extra.why}` : "."}</div>`;
      }
    } else {
      // Parsons: show the correct ordering.
      const correctLines = [this.puzzle.header, ...this.puzzle.lines, this.puzzle.footer]
        .map((l) => `<div class="code-line ans-correct">${this.escape(l)}</div>`)
        .join("");
      answerHtml = `<pre class="code-block">${correctLines}</pre>`;
      wrongHtml = `<div>Your final order didn't roll proportionally: ${res.detail}</div>`;
    }

    el.className = "result";
    el.innerHTML = `
      <div class="res-title dead">Out of attempts \u2014 the loot engine beat ${this.state.npc}.</div>
      ${wrongHtml}
      <div class="answer-label">The correct answer:</div>
      ${answerHtml}
      <button id="endBtn">See the scoreboard &raquo;</button>`;

    this.dom.getChildByID("endBtn").addEventListener("click", () => {
      this.scene.start("ScoreScene", {
        ...this.state,
        survived: true,       // they cleared the six dungeon rooms
        roomsCleared: 6,
        forged: false,        // but did not forge the engine
        forgeFailed: true,
      });
    });
  }

  escape(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
