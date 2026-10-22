// MainScene.js
//
// ForkTree — a fork()/exec() execution tracer.
//
// LEARNING OBJECTIVE (capability-level): after playing, a player can trace
// fork/exec code step by step and predict (1) how many processes exist,
// (2) which node is parent vs. child, (3) the return value of fork() in
// each, and (4) what happens to memory across a fork.
//
// MISCONCEPTIONS TARGETED, in priority order:
//   1. Miscounting processes (fork();fork(); -> 4, not 3). The player GROWS
//      the tree by clicking every live process at each fork line, so a
//      miscount shows up as a wrong-shaped tree, not a wrong typed number.
//   2. "Parent and child share memory." A write in one process visibly
//      leaves the other's copy unchanged.
//   3. fork() return value (child PID to parent, 0 to child) — typed in.
//   4. Child restarts / exec creates a process — corrected by exec/exit rounds.
//
// MECHANIC-CONCEPT RELATIONSHIP (intrinsic): the player IS the OS. Clicking
// a process to spawn its child at a fork line literally performs the fork;
// the process count is the tree they built, not a quiz answer.
//
// Streak/title system: correct reasoning climbs a title ladder (flashier
// effects the higher you go). Hints give a smaller reward but never break a
// streak; a wrong answer demotes one rank instead of resetting to zero.

import { SCENARIOS, TITLES } from "../scenarios.js";

const POINTS_PER_RANK = 10; // points per title for the normal ladder
const FINAL_EXTRA = 50; // extra points the very last (endgame) title demands

// Clicked in the code panel AFTER a round ends, to explain each call.
const GLOSSARY = {
  fork: "fork(): make a child process that's a copy of the caller. Returns the child's PID to the parent, 0 to the child.",
  execlp: "execlp(): replace this process's program image with a new one. Same PID; on success it never returns (code after it is gone).",
  exec: "exec family: replace this process's image with a new program. Same PID; does not return on success.",
  wait: "wait(): block until a child exits, then reap it (remove its zombie entry and read its exit status).",
  exit: "exit(): terminate the calling process. It becomes a zombie until its parent reaps it (or init adopts it).",
  printf: "printf(): write to stdout. Runs once in every process that reaches this line.",
  open: "open(): open a file and return a file descriptor — a small int referring to a kernel open-file description (with its own offset).",
  write: "write(fd, buf, n): write n bytes via fd, advancing that open file's (possibly shared) offset.",
  close: "close(): release a file descriptor.",
  perror: "perror(): print a human-readable error message to stderr describing why the last system call (e.g. a failed fork) failed.",
  WEXITSTATUS: "WEXITSTATUS(status): macro that extracts the exit code a child passed to exit(), out of the status value wait() filled in.",
  main: "main(): the program's entry point where execution begins.",
};

// Tree drawing area.
const TREE_LEFT = 316;
const TREE_RIGHT = 792;
const TREE_TOP = 90;
const LEVEL_H = 86;
const NODE_R = 22;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    // --- soft "spark" texture for celebration particles ---
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture("spark", 16, 16);
    g.destroy();

    // --- persistent progression state ---
    this.rp = 0;
    this.rankIndex = 0;
    this.streak = 0;
    this.bestStreak = 0;

    // --- static chrome (drawn once) ---
    this.drawChrome();

    // --- HTML task panel overlay ---
    this.buildOverlay();

    // --- shuffle the scenario pool for varied play ---
    this.queue = Phaser.Utils.Array.Shuffle(SCENARIOS.slice());
    this.roundIndex = 0;

    this.renderStatus();
    this.startRound();
  }

  // ---------------------------------------------------------------------------
  // Static chrome: panels + labels that never change
  // ---------------------------------------------------------------------------
  drawChrome() {
    const gfx = this.add.graphics();
    // code panel
    gfx.fillStyle(0x1d2027, 1).fillRoundedRect(12, 12, 288, 520, 8);
    // tree panel
    gfx.fillStyle(0x191c22, 1).fillRoundedRect(308, 12, 500, 520, 8);
    // status panel
    gfx.fillStyle(0x1d2027, 1).fillRoundedRect(816, 12, 196, 520, 8);

    this.add.text(24, 22, "SOURCE", labelStyle());
    this.add.text(320, 22, "PROCESS TREE", labelStyle());
    this.add.text(828, 22, "STATUS", labelStyle());

    // Source code is rendered as HTML in the overlay (buildOverlay) so it
    // can be syntax-highlighted and show a highlighted active line.


    // status widgets
    this.titleText = this.add.text(828, 54, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      wordWrap: { width: 172 },
    });
    this.rankBarBg = this.add.graphics();
    this.rankBarFill = this.add.graphics();
    this.streakText = this.add.text(828, 150, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#c7ccd4",
    });
    this.roundText = this.add.text(828, 186, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      color: "#8a8f98",
    });
    this.legendText = this.add.text(828, 250, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#8a8f98",
      lineSpacing: 6,
      wordWrap: { width: 172 },
    });
    this.legendText.setText(
      "LEGEND\n\u25CB number = PID\ngreen fill = parent\ntop = fork() return\nx=.. private memory\n\u2620 zombie (exited)\n\u21BB exec'd image",
    );

    // link + node layers
    this.linkGfx = this.add.graphics();
    this.nodeLayer = this.add.container(0, 0);
  }

  // ---------------------------------------------------------------------------
  // HTML overlay for instructions, typed inputs, buttons
  // ---------------------------------------------------------------------------
  buildOverlay() {
    const parent = this.game.canvas.parentNode;
    parent.style.position = "relative";
    const el = document.createElement("div");
    el.className = "ft-overlay";
    el.innerHTML = `
      <pre class="ft-code" id="ft-code"></pre>
      <div class="ft-gloss" id="ft-gloss"></div>
      <div class="ft-panel">
        <div class="ft-instr" id="ft-instr"></div>
        <div class="ft-fields" id="ft-fields"></div>
        <div class="ft-actions" id="ft-actions"></div>
        <div class="ft-feedback" id="ft-feedback"></div>
      </div>`;
    parent.appendChild(el);
    this.ovl = el;
    this.$code = el.querySelector("#ft-code");
    this.$gloss = el.querySelector("#ft-gloss");
    this.$instr = el.querySelector("#ft-instr");
    // Click a function name (only after a round ends) to see what it does.
    this.$code.addEventListener("click", (e) => {
      if (!this.glossOn) return;
      const t = e.target;
      if (t && t.classList && t.classList.contains("tk-fn")) {
        const key = t.textContent;
        this.$gloss.textContent = GLOSSARY[key] || key + "(): (library call)";
        this.$gloss.style.display = "block";
      }
    });
    this.$fields = el.querySelector("#ft-fields");
    this.$actions = el.querySelector("#ft-actions");
    this.$feedback = el.querySelector("#ft-feedback");
  }

  setInstr(html) {
    this.$instr.innerHTML = html;
  }
  clearFields() {
    this.$fields.innerHTML = "";
    this.$actions.innerHTML = "";
    this.$feedback.innerHTML = "";
  }
  feedback(msg, ok) {
    this.$feedback.innerHTML = msg;
    this.$feedback.style.color = ok ? "#7fd67f" : "#e07f7f";
  }
  addInput(labelHtml, width = 70) {
    const wrap = document.createElement("label");
    wrap.className = "ft-inp";
    wrap.innerHTML = `<span>${labelHtml}</span>`;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.autocomplete = "off";
    inp.style.width = width + "px";
    wrap.appendChild(inp);
    this.$fields.appendChild(wrap);
    return inp;
  }
  addButton(text, cb, kind = "primary") {
    const b = document.createElement("button");
    b.className = "ft-btn ft-" + kind;
    b.textContent = text;
    b.onclick = cb;
    this.$actions.appendChild(b);
    return b;
  }
  addHint(hintText) {
    this.addButton("\uD83D\uDCA1 Hint", () => {
      this.hintUsedThisRound = true;
      this.cellHint = true; // this cell now scores half
      this.feedback("\uD83D\uDCA1 " + hintText, true);
      this.$feedback.style.color = "#e0c060";
    }, "hint");
  }
  // "Reveal answer" escape hatch: fills in the correct answer and moves on,
  // but flags the round as given-up (costs a rank, no finish reward) so
  // that struggling-then-solving is always better than quitting.
  addReveal(cb) {
    this.addButton("Reveal answer", () => {
      this.gaveUp = true;
      this.streak = 0;
      this.renderStatus();
      cb();
    }, "secondary");
  }

  // --- live per-cell scoring -------------------------------------------------
  // Each gradeable sub-answer ("cell") updates score + streak immediately.
  //   clean correct: +1   hint or recovered-from-wrong: +0.5
  //   each wrong attempt: -1 (streak resets)   reveal: 0
  // A title needs POINTS_PER_RANK correct cells to advance.
  resetCell() {
    this.cellHint = false;
    this.cellWrong = false;
  }
  applyScore(delta, streakMode) {
    const prev = this.rankIndex;
    this.rp = Math.max(0, this.rp + delta);
    this.roundEarned += delta;
    if (streakMode === "reset") this.streak = 0;
    else if (streakMode === "inc") {
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    }
    this.rankIndex = this.computeRank(this.rp);
    this.renderStatus();
    if (this.rankIndex > prev) this.celebrateRankUp();
    else if (this.rankIndex < prev) this.demoteFlash();
  }
  // Normal titles are every POINTS_PER_RANK; the very last one demands a big
  // extra leap (FINAL_EXTRA) beyond the second-to-last.
  computeRank(rp) {
    const normalTop = TITLES.length - 2; // last index reachable at the flat rate
    if (rp >= normalTop * POINTS_PER_RANK + FINAL_EXTRA) return TITLES.length - 1;
    return Math.min(normalTop, Math.floor(rp / POINTS_PER_RANK));
  }
  rankBounds(i) {
    const normalTop = TITLES.length - 2;
    if (i >= TITLES.length - 1) return null; // maxed out
    if (i === normalTop)
      return { start: normalTop * POINTS_PER_RANK, next: normalTop * POINTS_PER_RANK + FINAL_EXTRA };
    return { start: i * POINTS_PER_RANK, next: (i + 1) * POINTS_PER_RANK };
  }
  penalize() {
    // Only charge for the FIRST wrong answer on a given cell — don't punish
    // the same mistake over and over while the player keeps trying.
    const firstMiss = !this.cellWrong;
    this.cellWrong = true;
    this.roundHadMistake = true;
    // First slip on a cell stings (-5); repeat tries cost a little (-1) so
    // guessing has some cost without hammering the same mistake. Streak kept.
    const cost = firstMiss ? -5 : -1;
    this.applyScore(cost, "keep");
    this.floatScore(String(cost), "#e07f7f");
    this.cameraNudge();
  }
  // base = difficulty weight of the question (1-4). Hint or a prior slip on
  // this cell halves it (rounded up).
  awardCell(base = 1) {
    const partial = this.cellHint || this.cellWrong;
    const pts = partial ? Math.ceil(base / 2) : base;
    this.applyScore(pts, "inc");
    this.floatScore("+" + pts, partial ? "#e0c060" : "#7fd67f");
    this.resetCell();
  }
  floatScore(text, color) {
    const t = this.add
      .text(905, 118, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: 78,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: "Cubic.out",
      onComplete: () => t.destroy(),
    });
  }
  markInput(inp, ok) {
    inp.classList.remove("ft-ok", "ft-bad");
    inp.classList.add(ok ? "ft-ok" : "ft-bad");
  }
  // After a correct step, wait for the player to press Proceed instead of
  // auto-jumping — gives time to read the result and think.
  awaitProceed(cb) {
    this.$fields.innerHTML = "";
    this.$actions.innerHTML = "";
    this.addButton("Proceed \u25B6", cb, "primary");
  }

  // ---------------------------------------------------------------------------
  // Round lifecycle
  // ---------------------------------------------------------------------------
  startRound() {
    if (this.roundIndex >= this.queue.length) {
      // reshuffle and keep going — endless varied play
      this.queue = Phaser.Utils.Array.Shuffle(SCENARIOS.slice());
      this.roundIndex = 0;
    }
    this.scn = this.queue[this.roundIndex];
    this.hintUsedThisRound = false;
    this.roundHadMistake = false;
    this.gaveUp = false;
    this.roundEarned = 0;
    this.eventIndex = 0;
    this.resetCell();

    // Assign realistic, non-sequential PIDs so a child's PID can't be guessed
    // as parent+1 — the player must actually read it off the node.
    this.pidPool = Phaser.Utils.Array.Shuffle(
      Array.from({ length: 89 }, (_, i) => i + 11),
    );
    this.pidCursor = 0;

    // reset tree with the root (original) process
    this.nodes = new Map();
    this.nodeLayer.removeAll(true);
    this.linkGfx.clear();
    this.makeNode(1, null, this.scn.memInit ?? null);

    this.renderCode(-1);
    this.renderStatus();
    this.layoutTree();
    this.nextEvent();
  }

  renderCode(activeLine) {
    this.glossOn = false;
    if (this.$code) this.$code.classList.remove("gloss-on");
    if (this.$gloss) this.$gloss.style.display = "none";
    const html = this.scn.code
      .map(
        (ln, i) =>
          `<div class="ln${i === activeLine ? " active" : ""}">${
            highlightC(ln) || "&nbsp;"
          }</div>`,
      )
      .join("");
    this.$code.innerHTML = html;
  }

  nextEvent() {
    if (this.eventIndex >= this.scn.events.length) {
      this.phaseFinal();
      return;
    }
    const ev = this.scn.events[this.eventIndex];
    this.renderCode(ev.line);
    if (ev.kind === "fork") this.phaseFork(ev);
    else if (ev.kind === "branch") this.phaseBranch(ev);
    else if (ev.kind === "write") this.phaseMemory(ev);
    else if (ev.kind === "exec") this.phaseExec(ev);
    else if (ev.kind === "exit") this.phaseExit(ev);
    else if (ev.kind === "ask") this.phaseAsk(ev);
    else if (ev.kind === "terminate") this.phaseTerminate(ev);
    else if (ev.kind === "forkfail") this.phaseForkFail(ev);
  }

  // ---- FORK FAIL phase: fork() returns -1, no child created --------------
  phaseForkFail(ev) {
    this.phase = "forkfail";
    this.resetCell();
    this.clearFields();
    const node = this.nodes.get(ev.pid || 1);
    this.setInstr(
      "This <code>fork()</code> FAILED (e.g. the system hit its process limit). " +
        "<b>No child is created.</b> What does <code>fork()</code> return in the calling process?",
    );
    const inp = this.addInput("fork() returns:", 60);
    this.addButton("Check", () => {
      const ok = inp.value.trim() === "-1";
      this.markInput(inp, ok);
      if (!ok) {
        this.feedback(
          "On failure fork() returns -1 (a NEGATIVE value) and sets errno — and no child exists.",
          false,
        );
        this.penalize();
        return;
      }
      node.setRet(-1);
      this.feedback("Right — fork() returns -1 on failure; no child was created.", true);
      this.awardCell(ev.weight || 3);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    });
    this.addHint(
      "A successful fork returns 0 (in the child) or a positive PID (in the parent). What value is left to signal an error?",
    );
    this.addReveal(() => {
      node.setRet(-1);
      this.feedback("fork() returns -1 on failure.", true);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- ASK phase: a direct multiple-choice question about process state ---
  phaseAsk(ev) {
    this.phase = "ask";
    this.resetCell();
    this.clearFields();
    this.setInstr(ev.prompt);
    // All options share styling so the answer isn't given away by color.
    Phaser.Utils.Array.Shuffle(ev.options.map((o, i) => ({ o, i }))).forEach(
      ({ o, i }) => {
        this.addButton(
          o,
          () => {
            if (i === ev.answer) {
              this.feedback("Correct \u2014 " + (ev.explain || ""), true);
              this.awardCell(ev.weight || 2);
              this.eventIndex++;
              this.awaitProceed(() => this.nextEvent());
            } else {
              this.feedback(ev.wrong || "Not quite \u2014 think it through again.", false);
              this.penalize();
            }
          },
          "secondary",
        );
      },
    );
    if (ev.hint) this.addHint(ev.hint);
    this.addReveal(() => {
      this.feedback(
        "Answer: " + ev.options[ev.answer] + " \u2014 " + (ev.explain || ""),
        true,
      );
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- TERMINATE phase: a process just exits (narrative, no question) -----
  phaseTerminate(ev) {
    this.phase = "terminate";
    this.clearFields();
    const node = this.nodes.get(ev.pid);
    node.setZombie();
    this.setInstr(
      `<b>P${node.displayPid}</b> calls <code>exit(0)</code> and terminates. ${ev.note || ""}`,
    );
    this.eventIndex++;
    this.awaitProceed(() => this.nextEvent());
  }

  // ---- FORK phase: click every live process reaching this fork line -------
  phaseFork(ev) {
    this.phase = "forking";
    this.resetCell();
    this.pendingParents = new Set(ev.pairs.map((p) => p.parent));
    this.pairMap = new Map(ev.pairs.map((p) => [p.parent, p.child]));
    this.spawnedThisEvent = [];
    this.clearFields();
    const n = ev.pairs.length;
    this.setInstr(
      `Line highlighted runs <code>fork()</code>. <b>Click every process that is alive and reaches this line</b> to spawn its child. ` +
        `<span class="ft-count">Spawned <b id="ft-sp">0</b> / ${n}</span>`,
    );
    this.addHint(
      this.scn.hint ||
        "Remember: after a fork, BOTH parent and child keep running the same code. A fork on a later line executes in every process alive at that point.",
    );
    this.addReveal(() => {
      for (const ppid of [...this.pendingParents]) {
        const pnode = this.nodes.get(ppid);
        const childPid = this.pairMap.get(ppid);
        const child = this.makeNode(childPid, pnode, pnode.mem);
        pnode.markParent();
        pnode.setRet(child.displayPid);
        child.setRet(0);
        this.layoutTree(child);
      }
      for (const { parent, child } of this.spawnedThisEvent) {
        parent.markParent();
        parent.setRet(child.displayPid);
        child.setRet(0);
      }
      this.pendingParents.clear();
      this.setClickable(new Set(), false);
      this.eventIndex++;
      this.feedback("Revealed \u2014 review the tree, then continue.", true);
      this.awaitProceed(() => this.nextEvent());
    });
    this.setClickable(this.pendingParents, true);
  }

  // ---- BRANCH phase: click the process(es) that enter a conditional ------
  phaseBranch(ev) {
    this.phase = "branch";
    this.resetCell();
    this.branchTarget = new Set(ev.enter);
    this.branchClicked = new Set();
    this.clearFields();
    this.setInstr(
      `Line highlighted is <code>if (${ev.cond})</code>. <b>Click every process that ENTERS this branch</b> \u2014 ` +
        `the ones where <code>fork()</code> returned <b>${ev.desc}</b>. Read each node's <code>fork=</code> value to decide. ` +
        `<span class="ft-count">Entered <b id="ft-sp">0</b> / ${ev.enter.length}</span>`,
    );
    this.addHint(
      "fork() returns 0 in the child and the child's PID (a positive number) in the parent. A test like `== 0` is true ONLY in the child \u2014 check the fork= label on each node.",
    );
    this.addReveal(() => {
      this.branchTarget.forEach((pid) => this.markBranch(this.nodes.get(pid)));
      this.eventIndex++;
      this.feedback("Revealed \u2014 those are the processes entering the branch.", true);
      this.awaitProceed(() => this.nextEvent());
    });
    const liveSet = new Set(this.liveNodes().map((n) => n.pid));
    this.setClickable(liveSet, true);
  }

  markBranch(node) {
    node.circle.setStrokeStyle(3, 0x7fd67f);
    node._special = true;
    this.flashNode(node, 0x7fd67f);
  }

  onNodeClick(node) {
    if (this.phase === "branch") {
      if (this.branchClicked.has(node.pid)) return;
      if (this.branchTarget.has(node.pid)) {
        this.branchClicked.add(node.pid);
        this.markBranch(node);
        const spEl = document.getElementById("ft-sp");
        if (spEl) spEl.textContent = String(this.branchClicked.size);
        if (this.branchClicked.size === this.branchTarget.size) {
          this.setClickable(new Set(), false);
          this.feedback("Correct \u2014 that's where fork() made the condition true.", true);
          this.awardCell(2);
          this.eventIndex++;
          this.awaitProceed(() => this.nextEvent());
        }
      } else {
        this.flashNode(node, 0xe03a5f);
        this.feedback(
          "That process does NOT enter this branch \u2014 check its fork= value. The condition is only true where fork() returned the matching value.",
          false,
        );
        this.penalize();
      }
      return;
    }
    if (this.phase !== "forking") return;
    if (!this.pendingParents.has(node.pid)) {
      // wrong node: either already forked or shouldn't fork here
      this.flashNode(node, 0xe03a5f);
      this.feedback(
        "That process doesn't spawn a child here. Only processes that are alive AND reach this fork() line do.",
        false,
      );
      this.penalize();
      return;
    }
    // valid: spawn child
    this.pendingParents.delete(node.pid);
    const childPid = this.pairMap.get(node.pid);
    const child = this.makeNode(childPid, node, node.mem);
    node.markParent();
    this.spawnedThisEvent.push({ parent: node, child });
    this.flashNode(node, 0x5f8dd6);
    this.layoutTree(child);
    const done = this.pairMap.size - this.pendingParents.size;
    const spEl = document.getElementById("ft-sp");
    if (spEl) spEl.textContent = String(done);
    if (this.pendingParents.size === 0) {
      this.setClickable(new Set(), false);
      this.awardCell(Math.min(4, this.spawnedThisEvent.length + 1));
      this.phaseReturns();
    } else {
      this.setClickable(this.pendingParents, true);
    }
  }

  // ---- RETURN VALUES phase -----------------------------------------------
  phaseReturns() {
    this.phase = "returns";
    this.resetCell();
    this.clearFields();
    this.setInstr(
      "Give each process its <code>fork()</code> return value. <b>Follow the arrows</b> (parent \u2192 child): " +
        "a process with an outgoing arrow is a <b>parent</b> and returns the PID of the child it points to; " +
        "a leaf is a <b>child</b> and returns <b>0</b>. Boxes are shuffled \u2014 read the tree, don't guess.",
    );
    // One box per involved node, PARENT and CHILD mixed and shuffled so the
    // answer can't be pattern-matched from the layout.
    const entries = [];
    for (const { parent, child } of this.spawnedThisEvent) {
      entries.push({ node: parent, expected: String(child.displayPid) });
      entries.push({ node: child, expected: "0" });
    }
    Phaser.Utils.Array.Shuffle(entries);
    const rows = entries.map((e) => ({
      ...e,
      inp: this.addInput(`P${e.node.displayPid} returns:`, 60),
    }));
    this.addButton("Check", () => {
      let ok = true;
      const norm = (v) => v.trim().replace(/^[pP]/, "");
      for (const r of rows) {
        const good = norm(r.inp.value) === r.expected;
        this.markInput(r.inp, good);
        if (!good) ok = false;
      }
      if (!ok) {
        this.feedback(
          "Not quite. Follow the arrows: a parent returns the PID of the child it points to; a leaf child returns 0.",
          false,
        );
        this.penalize();
        return;
      }
      for (const { parent, child } of this.spawnedThisEvent) {
        parent.setRet(child.displayPid);
        child.setRet(0);
      }
      this.feedback("Correct \u2014 parents got their child's PID, children got 0.", true);
      this.awardCell(2);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    });
    this.addHint(
      "fork() returns twice: a positive PID in the parent (so it can wait on the child) and 0 in the child. A green node with an outgoing arrow is a parent \u2014 it returns the PID of the node it points to.",
    );
    this.addReveal(() => {
      for (const r of rows) {
        r.inp.value = r.expected;
        this.markInput(r.inp, true);
      }
      for (const { parent, child } of this.spawnedThisEvent) {
        parent.setRet(child.displayPid);
        child.setRet(0);
      }
      this.eventIndex++;
      this.feedback("Revealed \u2014 a parent returns its child's PID, a child returns 0.", true);
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- MEMORY phase -------------------------------------------------------
  phaseMemory(ev) {
    this.phase = "memory";
    this.resetCell();
    this.clearFields();
    const writer = this.nodes.get(ev.pid);
    const v = this.scn.memVar || "x";
    const live = this.liveNodes();
    this.setInstr(
      `Line highlighted runs <code>${v} = ${ev.value};</code> in <b>P${writer.displayPid}</b> only. ` +
        `Enter the value of <code>${v}</code> in <b>each</b> process afterward.`,
    );
    const correct = new Map();
    const rows = [];
    for (const node of live) {
      correct.set(node.pid, node === writer ? ev.value : node.mem);
      rows.push({ node, inp: this.addInput(`P${node.displayPid}: ${v}=`, 50) });
    }
    this.addButton("Check", () => {
      let ok = true;
      for (const r of rows) {
        const cOk = r.inp.value.trim() === String(correct.get(r.node.pid));
        this.markInput(r.inp, cOk);
        if (!cOk) ok = false;
      }
      if (!ok) {
        this.feedback(
          "Not quite. fork() gave each process its OWN copy of memory \u2014 a write in one does not change the other.",
          false,
        );
        this.penalize();
        return;
      }
      for (const r of rows) {
        r.node.setMem(correct.get(r.node.pid));
      }
      this.feedback("Correct \u2014 separate address spaces, separate copies.", true);
      this.awardCell(3);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    });
    this.addHint(
      "After fork(), parent and child do NOT share variables. Each has a private copy (copy-on-write). Only the process that runs the assignment changes its own value.",
    );
    this.addReveal(() => {
      for (const r of rows) r.node.setMem(correct.get(r.node.pid));
      this.eventIndex++;
      this.feedback("Revealed \u2014 only the writer's copy changed.", true);
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- EXEC phase ---------------------------------------------------------
  phaseExec(ev) {
    this.phase = "exec";
    this.resetCell();
    this.clearFields();
    const node = this.nodes.get(ev.pid);
    this.setInstr(
      `<b>P${node.displayPid}</b> runs <code>execlp("${ev.prog}", "${ev.prog}", NULL)</code>. Does this create a NEW process, or replace P${node.displayPid}'s program?`,
    );
    this.addButton("Creates a new process", () => {
      this.feedback(
        "No \u2014 exec() does NOT fork. It replaces the current process's image with a new program, keeping the same PID.",
        false,
      );
      this.penalize();
    }, "secondary");
    this.addButton(`Replaces P${node.displayPid}'s image`, () => {
      node.setExec(ev.prog);
      this.feedback(
        `Right \u2014 P${node.displayPid} is now running "${ev.prog}"; on success exec never returns, so the code after it never runs.`,
        true,
      );
      this.awardCell(2);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    }, "primary");
    this.addHint(
      "fork() to COPY, exec() to TRANSFORM. exec() overwrites the calling process's memory with a new program \u2014 same PID, no new process, and the code after exec() is gone.",
    );
    this.addReveal(() => {
      node.setExec(ev.prog);
      this.eventIndex++;
      this.feedback("Revealed \u2014 exec replaces the image, keeps the PID.", true);
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- EXIT phase ---------------------------------------------------------
  phaseExit(ev) {
    this.phase = "exit";
    this.resetCell();
    this.clearFields();
    const node = this.nodes.get(ev.pid);
    this.setInstr(
      `<b>P${node.displayPid}</b> calls <code>exit(0)</code> while its parent will <code>wait()</code>. What is P${node.displayPid} until the parent reaps it?`,
    );
    this.addButton("Fully gone immediately", () => {
      this.feedback(
        "Not yet \u2014 an exited child stays as a ZOMBIE (its exit status is kept) until the parent calls wait().",
        false,
      );
      this.penalize();
    }, "secondary");
    this.addButton("A zombie until reaped", () => {
      node.setZombie();
      this.feedback(
        "Correct \u2014 wait() in the parent reaps the zombie and frees its table entry.",
        true,
      );
      this.awardCell(3);
      this.eventIndex++;
      this.awaitProceed(() => this.nextEvent());
    }, "primary");
    this.addHint(
      "exit() ends execution but the process table entry lingers as a zombie holding the exit status, until the parent's wait() collects it.",
    );
    this.addReveal(() => {
      node.setZombie();
      this.eventIndex++;
      this.feedback("Revealed \u2014 an exited child is a zombie until reaped.", true);
      this.awaitProceed(() => this.nextEvent());
    });
  }

  // ---- FINAL count phase --------------------------------------------------
  phaseFinal() {
    this.phase = "final";
    this.resetCell();
    this.renderCode(-1);
    this.clearFields();
    this.setInstr(
      "Trace complete. <b>How many processes exist in total, including the original one?</b> (count every node in the tree)",
    );
    const cnt = this.addInput("total processes (incl. original):", 60);
    let printInp = null;
    if (this.scn.finalPrintQ) {
      printInp = this.addInput(this.scn.finalPrintQ.prompt + " ", 60);
    }
    this.addButton("Submit", () => {
      const cOk = cnt.value.trim() === String(this.scn.finalCount);
      this.markInput(cnt, cOk);
      let ok = cOk;
      if (printInp) {
        const pOk = printInp.value.trim() === String(this.scn.finalPrintQ.answer);
        this.markInput(printInp, pOk);
        if (!pOk) ok = false;
      }
      if (!ok) {
        this.feedback("Check your tree \u2014 count the nodes carefully (include the original process).", false);
        this.penalize();
        return;
      }
      this.feedback("Correct!", true);
      this.awardCell(Math.min(4, this.scn.difficulty));
      this.awaitProceed(() => this.finishRound());
    });
    this.addHint(
      this.scn.finalPrintQ
        ? this.scn.finalPrintQ.hint
        : "The total number of processes equals the number of nodes you grew in the tree, including the original.",
    );
    this.addReveal(() => {
      cnt.value = String(this.scn.finalCount);
      if (printInp) printInp.value = String(this.scn.finalPrintQ.answer);
      this.feedback("Revealed \u2014 review the tree.", true);
      this.awaitProceed(() => this.finishRound());
    });
  }

  // ---- End of round: scoring, explanation, effects ------------------------
  finishRound() {
    this.clearFields();
    // Scoring already happened live, cell by cell. Here we just summarize.
    const e = this.roundEarned;
    const fmt = (n) => (n > 0 ? "+" : "") + (Number.isInteger(n) ? n : n.toFixed(1));
    let banner;
    if (this.gaveUp)
      banner = `<span style="color:#e07f7f">Round done \u2014 you revealed some answers. Net ${fmt(e)} pts. Try a hint first next time (still worth +0.5).</span>`;
    else if (this.roundHadMistake)
      banner = `<span style="color:#e0c060">Round done \u2014 recovered after a slip. Net ${fmt(e)} pts. Wrong steps cost \u22121; finishing still pays.</span>`;
    else if (this.hintUsedThisRound)
      banner = `<span style="color:#e0c060">Round done \u2014 solved with hints (half points each). Net ${fmt(e)} pts.</span>`;
    else
      banner = `<span style="color:#7fd67f">\u2714 Clean round! Every cell full value. Net ${fmt(e)} pts.</span>`;

    this.setInstr(
      `${banner}<div class="ft-explain"><b>${this.scn.title}</b><br>${this.scn.explanation}</div>`,
    );
    this.addButton("Next round \u25B6", () => {
      this.roundIndex++;
      this.startRound();
    });
    this.enableGlossary();
  }

  // Round is over: let the player click any function in the source to learn it.
  enableGlossary() {
    this.glossOn = true;
    if (this.$code) this.$code.classList.add("gloss-on");
    if (this.$gloss) {
      this.$gloss.style.display = "block";
      this.$gloss.textContent =
        "\u2139 Click any function in the code above for a quick definition.";
    }
  }

  // ---------------------------------------------------------------------------
  // Node model + tree layout
  // ---------------------------------------------------------------------------
  makeNode(pid, parent, mem) {
    const depth = parent ? parent.depth + 1 : 0;
    const displayPid = this.pidPool ? this.pidPool[this.pidCursor++] : pid;
    const circle = this.add.circle(0, 0, NODE_R, 0x2b3550).setStrokeStyle(2, 0x5f8dd6);
    circle.setInteractive({ useHandCursor: true });
    const pidText = this.add
      .text(0, 0, String(displayPid), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#eaf0ff",
      })
      .setOrigin(0.5);
    const retText = this.add
      .text(0, -NODE_R - 12, "", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        color: "#e0c060",
      })
      .setOrigin(0.5);
    const memText = this.add
      .text(0, NODE_R + 12, "", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        color: "#7fd6c4",
      })
      .setOrigin(0.5);
    const container = this.add.container(TREE_LEFT, TREE_TOP, [
      circle,
      pidText,
      retText,
      memText,
    ]);
    this.nodeLayer.add(container);

    const node = {
      pid,
      displayPid,
      parent,
      depth,
      mem: mem ?? null,
      alive: true,
      container,
      circle,
      retText,
      memText,
      markParent: () => {
        node._isParent = true;
        if (!node._special) circle.setFillStyle(0x2f4a3a); // parents = green fill
      },
      setRet: (v) => retText.setText(`fork=${v}`),
      setMem: (v) => {
        node.mem = v;
        memText.setText(`${this.scn.memVar || "x"}=${v}`).setColor("#7fd6c4");
      },
      setExec: (prog) => {
        node._special = true;
        circle.setFillStyle(0x4a3a2b).setStrokeStyle(2, 0xe0a13a);
        retText.setText(`\u21BB ${prog}`).setColor("#e0a13a");
      },
      setZombie: () => {
        node.alive = false;
        node._special = true;
        circle.setFillStyle(0x3a2b2b).setStrokeStyle(2, 0x8a8f98);
        pidText.setText("\u2620").setColor("#c7ccd4");
      },
    };
    if (node.mem !== null) node.memText.setText(`${this.scn.memVar || "x"}=${node.mem}`);
    circle.on("pointerdown", () => this.onNodeClick(node));
    this.nodes.set(pid, node);
    return node;
  }

  liveNodes() {
    return [...this.nodes.values()].filter((n) => n.alive);
  }

  setClickable(pids, on) {
    for (const node of this.nodes.values()) {
      const yes = on && pids && pids.has(node.pid);
      this.tweens.killTweensOf(node.circle);
      node.circle.setScale(1);
      if (yes) {
        node.circle.setStrokeStyle(3, 0x7fd67f);
        this.pulse(node.circle);
      } else if (node.alive && !node._special) {
        node.circle.setStrokeStyle(2, 0x5f8dd6);
      }
    }
  }

  layoutTree(focusNode) {
    // group by depth
    const byDepth = new Map();
    let maxDepth = 0;
    for (const n of this.nodes.values()) {
      if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
      byDepth.get(n.depth).push(n);
      maxDepth = Math.max(maxDepth, n.depth);
    }
    const width = TREE_RIGHT - TREE_LEFT;
    for (const [depth, arr] of byDepth) {
      arr.sort((a, b) => a.pid - b.pid);
      arr.forEach((n, i) => {
        const x = TREE_LEFT + (width * (i + 1)) / (arr.length + 1);
        const y = TREE_TOP + depth * Math.min(LEVEL_H, (500 - TREE_TOP) / (maxDepth + 1) + 30);
        this.tweens.add({
          targets: n.container,
          x,
          y,
          duration: 260,
          ease: "Cubic.out",
        });
        n._x = x;
        n._y = y;
      });
    }
    this.time.delayedCall(120, () => this.drawLinks());
    if (focusNode) {
      focusNode.container.setScale(0.1);
      this.tweens.add({
        targets: focusNode.container,
        scale: 1,
        duration: 300,
        ease: "Back.out",
      });
    }
  }

  drawLinks() {
    this.linkGfx.clear();
    this.linkGfx.lineStyle(2, 0x3a4358, 1);
    this.linkGfx.fillStyle(0x5a6580, 1);
    for (const n of this.nodes.values()) {
      if (n.parent && n._x != null && n.parent._x != null) {
        const x1 = n.parent._x,
          y1 = n.parent._y,
          x2 = n._x,
          y2 = n._y;
        this.linkGfx.lineBetween(x1, y1, x2, y2);
        // arrowhead pointing at the child (parent -> child), stopped at rim
        const a = Math.atan2(y2 - y1, x2 - x1);
        const tx = x2 - Math.cos(a) * (NODE_R + 2);
        const ty = y2 - Math.sin(a) * (NODE_R + 2);
        const s = 8;
        this.linkGfx.fillTriangle(
          tx,
          ty,
          tx - Math.cos(a - 0.42) * s,
          ty - Math.sin(a - 0.42) * s,
          tx - Math.cos(a + 0.42) * s,
          ty - Math.sin(a + 0.42) * s,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Status panel + effects
  // ---------------------------------------------------------------------------
  renderStatus() {
    const t = TITLES[this.rankIndex];
    this.titleText.setText(t.name).setColor(t.color);
    // rank progress bar
    const b = this.rankBounds(this.rankIndex);
    const frac = b ? Phaser.Math.Clamp((this.rp - b.start) / (b.next - b.start), 0, 1) : 1;
    this.rankBarBg.clear().fillStyle(0x2b3038, 1).fillRoundedRect(828, 96, 172, 12, 6);
    this.rankBarFill
      .clear()
      .fillStyle(Phaser.Display.Color.HexStringToColor(t.color).color, 1)
      .fillRoundedRect(828, 96, Math.max(6, 172 * frac), 12, 6);
    this.streakText.setText(
      `\uD83D\uDD25 Streak: ${this.streak}   (best ${this.bestStreak})`,
    );
    this.roundText.setText(
      `Round ${this.roundIndex + 1}\nTitle ${this.rankIndex + 1}/${TITLES.length}`,
    );
  }

  celebrateRankUp() {
    const t = TITLES[this.rankIndex];
    const color = Phaser.Display.Color.HexStringToColor(t.color).color;
    const lvl = t.effect;

    // banner text pop in the tree area
    const pop = this.add
      .text(TREE_LEFT + (TREE_RIGHT - TREE_LEFT) / 2, 270, `${t.name}!`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: 26 + lvl * 6 + "px",
        fontStyle: "bold",
        color: t.color,
      })
      .setOrigin(0.5)
      .setScale(0.2);
    this.tweens.add({
      targets: pop,
      scale: 1,
      duration: 420,
      ease: "Back.out",
      yoyo: true,
      hold: 700,
      onComplete: () => pop.destroy(),
    });

    // title text pulse
    this.tweens.add({
      targets: this.titleText,
      scale: { from: 1.4, to: 1 },
      duration: 500,
      ease: "Bounce.out",
    });

    // particles — count/spread scale with effect level
    if (lvl >= 1) {
      const p = this.add.particles(pop.x, 280, "spark", {
        speed: { min: 60, max: 120 + lvl * 90 },
        lifespan: 500 + lvl * 250,
        quantity: 4 + lvl * 6,
        scale: { start: 0.5 + lvl * 0.15, end: 0 },
        tint: color,
        emitting: false,
      });
      p.explode(20 + lvl * 30);
      this.time.delayedCall(1600, () => p.destroy());
    }
    // screen shake for the high tiers
    if (lvl >= 3) this.cameras.main.shake(200 + lvl * 60, 0.0018 * lvl);
    // flash for the very top
    if (lvl >= 5) this.cameras.main.flash(400, 255, 210, 74);
    // rainbow confetti burst for elite titles
    if (lvl >= 6) {
      this.time.delayedCall(180, () => {
        const p2 = this.add.particles(pop.x, 300, "spark", {
          speed: { min: 120, max: 340 },
          lifespan: 1300,
          quantity: 60,
          scale: { start: 1, end: 0 },
          tint: [0xff5f5f, 0x5fff9f, 0x5f9fff, 0xffe65f, 0xff8cf0],
          emitting: false,
        });
        p2.explode(90);
        this.time.delayedCall(1900, () => p2.destroy());
      });
    }
    // legendary: repeated flashes + a title-text wobble
    if (lvl >= 7) {
      this.time.delayedCall(320, () => this.cameras.main.flash(300, 160, 90, 255));
      this.tweens.add({
        targets: this.titleText,
        angle: { from: -5, to: 5 },
        duration: 110,
        yoyo: true,
        repeat: 5,
        onComplete: () => this.titleText.setAngle(0),
      });
    }
    // lvl 8 — the endgame title: waves of confetti + a flash sequence +
    // a long shake + a giant title takeover.
    if (lvl >= 8) {
      for (let k = 0; k < 5; k++) {
        this.time.delayedCall(260 * k, () => {
          const px = TREE_LEFT + Math.random() * (TREE_RIGHT - TREE_LEFT);
          const pw = this.add.particles(px, 110, "spark", {
            speed: { min: 150, max: 460 },
            lifespan: 1700,
            quantity: 80,
            scale: { start: 1.3, end: 0 },
            tint: [0xff5f5f, 0x5fff9f, 0x5f9fff, 0xffe65f, 0xff8cf0, 0xffffff],
            emitting: false,
          });
          pw.explode(110);
          this.time.delayedCall(2200, () => pw.destroy());
        });
      }
      this.time.delayedCall(120, () => this.cameras.main.flash(320, 255, 255, 255));
      this.time.delayedCall(520, () => this.cameras.main.flash(320, 255, 210, 74));
      this.time.delayedCall(920, () => this.cameras.main.flash(320, 160, 90, 255));
      this.cameras.main.shake(1100, 0.006);
      const mega = this.add
        .text(TREE_LEFT + (TREE_RIGHT - TREE_LEFT) / 2, 300, "PID 1", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "96px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setScale(0.3);
      this.tweens.add({
        targets: mega,
        alpha: { from: 1, to: 0 },
        scale: 1.4,
        duration: 2200,
        ease: "Cubic.out",
        onComplete: () => mega.destroy(),
      });
    }
  }

  demoteFlash() {
    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.2, to: 1 },
      duration: 200,
      repeat: 2,
    });
    this.cameras.main.shake(120, 0.003);
  }

  pulse(obj) {
    this.tweens.add({
      targets: obj,
      scale: { from: 1, to: 1.12 },
      duration: 520,
      yoyo: true,
      repeat: -1,
    });
  }
  flashNode(node, color) {
    this.tweens.killTweensOf(node.circle);
    node.circle.setScale(1);
    const orig = node.circle.strokeColor;
    node.circle.setStrokeStyle(4, color);
    this.time.delayedCall(300, () => node.circle.setStrokeStyle(2, orig));
  }
  cameraNudge() {
    this.cameras.main.shake(90, 0.002);
  }
}

// Lightweight C syntax highlighter for the source panel.
function highlightC(line) {
  const esc = line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(int|void|return|if|else|for|pid_t)\b|\b(fork|execlp|exit|wait|printf|perror|open|write|close|WEXITSTATUS|main)\b|\b(\d+)\b/g,
    (m, com, str, kw, fn, num) => {
      if (com) return `<span class="tk-com">${com}</span>`;
      if (str) return `<span class="tk-str">${str}</span>`;
      if (kw) return `<span class="tk-kw">${kw}</span>`;
      if (fn) return `<span class="tk-fn">${fn}</span>`;
      if (num) return `<span class="tk-num">${num}</span>`;
      return m;
    },
  );
}

function labelStyle() {
  return {
    fontFamily: "system-ui, sans-serif",
    fontSize: "12px",
    fontStyle: "bold",
    color: "#6d7480",
  };
}
