// MainScene.js
//
// Pointer Hunt — an arcade "aim & act" game about pointers.
//
// Concept / learning objective:
//   After playing, a player can look at a pointer expression and predict
//   whether it changes the POINTER (where it aims) or the POINTED-AT VALUE
//   (what's stored where it aims) — and knows what a dangling pointer is.
//
// Mechanic-concept relationship (intrinsic):
//   The crosshair IS the pointer. A glowing beam runs from the ptr HUD to
//   whatever enemy it currently aims at.
//     ptr = &X   (redirect) -> CLICK enemy X       -> the beam moves
//     *ptr = N   (deref)    -> press digit key N    -> the aimed box changes
//     free(ptr)             -> press SPACE          -> aimed target dies
//   Doing the wrong TYPE of action (moving the pointer when asked to change
//   a value, or vice versa) BACKFIRES visibly. Dereferencing a freed/
//   dangling pointer SEGFAULTS. Correct answers score points and the pace
//   speeds up as the score climbs.

import {
  makeEnemies,
  makeCommandQueue,
  commandText,
} from "../scenarios.js";

const W = 800;
const H = 600;

// Where each pointer's beam is emitted from (the satellite dishes).
const BEAM_ORIGIN = { x: 60, y: H - 58 }; // ptr  (bottom-left)
const BEAM_ORIGIN2 = { x: W - 60, y: H - 58 }; // ptr2 (bottom-right)
const P2_THRESHOLD = 100; // score at which ptr2 unlocks
const PTR_COLOR = 0x4cc9f0; // ptr beam (cyan)
const PTR2_COLOR = 0xff7ad9; // ptr2 beam (magenta)

// Procedural chiptune loops (MIDI note numbers; null = rest). Kept as data
// so the game ships as static files with no audio assets to license/bundle.
const MENU_TRACK = [
  { mel: 69, bass: 45 }, { mel: null, bass: null }, { mel: 72, bass: null }, { mel: null, bass: null },
  { mel: 76, bass: 52 }, { mel: null, bass: null }, { mel: 74, bass: null }, { mel: 72, bass: null },
  { mel: 74, bass: 50 }, { mel: null, bass: null }, { mel: 72, bass: null }, { mel: null, bass: null },
  { mel: 69, bass: 48 }, { mel: null, bass: null }, { mel: null, bass: null }, { mel: null, bass: null },
];
const GAME_TRACK = [
  { mel: 69, bass: 45 }, { mel: 72, bass: null }, { mel: 76, bass: 45 }, { mel: 72, bass: null },
  { mel: 74, bass: 41 }, { mel: 77, bass: null }, { mel: 74, bass: 41 }, { mel: 72, bass: null },
  { mel: 69, bass: 43 }, { mel: 72, bass: null }, { mel: 76, bass: 43 }, { mel: 79, bass: null },
  { mel: 76, bass: 40 }, { mel: 72, bass: null }, { mel: 69, bass: 40 }, { mel: 67, bass: null },
];

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.started = false;
    this.gameOver = false;
    this.audioUnlocked = false;

    // Persistent space backdrop + emitter satellite (drawn behind everything).
    this.buildSpace();
    this.buildSatellite();

    // Title / instructions overlay first.
    this.buildStartScreen();

    // Right-click aims ptr2 — suppress the browser context menu on it.
    this.input.mouse.disableContextMenu();

    // Input handlers (registered once; guarded by this.started).
    this.input.keyboard.on("keydown", (e) => this.onKey(e));
    this.input.on("gameobjectdown", (pointer, obj) =>
      this.onEnemyClick(pointer, obj)
    );
    this.input.on("pointerdown", (p, over) => {
      if (!this.started && !this.gameOver) this.onStartGesture();
    });
  }

  // ---------- start / restart ----------

  buildStartScreen() {
    this.startLayer = this.add.container(0, 0);
    const dim = this.add.rectangle(0, 0, W, H, 0x11131a, 0.92).setOrigin(0);
    const title = this.add
      .text(W / 2, 150, "POINTER HUNT", {
        fontFamily: "Consolas, monospace",
        fontSize: "48px",
        color: "#4cc9f0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const rules = this.add
      .text(
        W / 2,
        300,
        [
          "A command appears top-left. Obey it fast:",
          "",
          "  ptr = &x      CLICK enemy x    (move the pointer)",
          "  *ptr = N      press digit N    (WRITE the value it points at)",
          "  int e = *ptr  type ptr's value (READ through the pointer)",
          "  ptr = NULL    press N          (clear the pointer)",
          "  free(ptr)     press SPACE      (kill the pointed-at target)",
          "",
          "Wrong TYPE of action backfires. Dereferencing a",
          "freed/NULL pointer SEGFAULTS. It gets faster. 3 lives.",
          "",
          `Score ${P2_THRESHOLD}+ unlocks ptr2 — a 2nd pointer on RIGHT-click.`,
        ].join("\n"),
        {
          fontFamily: "Consolas, monospace",
          fontSize: "17px",
          color: "#e6e6e6",
          align: "left",
          lineSpacing: 4,
        }
      )
      .setOrigin(0.5);
    this.startPrompt = this.add
      .text(W / 2, 500, "click / press a key to ENTER  (turns on sound)", {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: "#ffd166",
      })
      .setOrigin(0.5);
    this.startLayer.add([dim, title, rules, this.startPrompt]);
  }

  // First gesture unlocks audio + starts the menu theme; the next one
  // actually launches the game (browsers block audio until interaction).
  onStartGesture() {
    if (!this.audioUnlocked) {
      this.initAudio();
      this.audioUnlocked = true;
      this.playMenuMusic();
      if (this.startPrompt)
        this.startPrompt.setText("click / press SPACE to LAUNCH");
      return;
    }
    this.startGame();
  }

  startGame() {
    this.started = true;
    this.gameOver = false;
    this.score = 0;
    this.lives = 3;
    this.streak = 0;
    this.p2Unlocked = false;
    if (this.satellite2) {
      this.satellite2.destroy();
      this.satellite2 = null;
    }
    this.initAudio();
    this.stopMusic();
    this.playGameMusic();
    if (this.startLayer) this.startLayer.destroy();
    if (this.overLayer) this.overLayer.destroy();
    this.setupRound();
    this.buildHud();
    this.nextCommand();
  }

  // ---------- scenery ----------

  buildSpace() {
    // Faint nebula blooms.
    this.add.ellipse(230, 180, 420, 320, 0x3a2a5a, 0.18);
    this.add.ellipse(620, 430, 460, 340, 0x143a4a, 0.18);

    // Starfield.
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() < 0.85 ? 1 : 1.8;
      const star = this.add.circle(x, y, r, 0xffffff, 0.3 + Math.random() * 0.6);
      if (Math.random() < 0.3) {
        this.tweens.add({
          targets: star,
          alpha: 0.15,
          duration: 800 + Math.random() * 1600,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  buildSatellite2() {
    if (this.satellite2) return;
    const c = this.add.container(BEAM_ORIGIN2.x, BEAM_ORIGIN2.y + 10);
    const panelL = this.add
      .rectangle(-34, 0, 26, 34, 0x7a2a6a)
      .setStrokeStyle(1, 0xff7ad9, 0.8);
    const panelR = this.add
      .rectangle(34, 0, 26, 34, 0x7a2a6a)
      .setStrokeStyle(1, 0xff7ad9, 0.8);
    const body = this.add
      .rectangle(0, 0, 24, 30, 0xc8ccd4)
      .setStrokeStyle(2, 0xffffff, 0.5);
    const dish = this.add.ellipse(-6, -20, 26, 14, 0xe6e6e6);
    dish.rotation = 0.5;
    const feed = this.add.circle(-10, -26, 2.5, 0xff7ad9);
    c.add([panelL, panelR, body, dish, feed]);
    this.satellite2 = c;
  }

  buildSatellite() {
    const c = this.add.container(BEAM_ORIGIN.x, BEAM_ORIGIN.y + 10);
    // Solar panels.
    const panelL = this.add
      .rectangle(-34, 0, 26, 34, 0x2a4a8a)
      .setStrokeStyle(1, 0x6aa0ff, 0.8);
    const panelR = this.add
      .rectangle(34, 0, 26, 34, 0x2a4a8a)
      .setStrokeStyle(1, 0x6aa0ff, 0.8);
    // Body.
    const body = this.add
      .rectangle(0, 0, 24, 30, 0xc8ccd4)
      .setStrokeStyle(2, 0xffffff, 0.5);
    // Dish, tilted up toward the field.
    const dish = this.add.ellipse(6, -20, 26, 14, 0xe6e6e6);
    dish.rotation = -0.5;
    const feed = this.add.circle(10, -26, 2.5, 0x4cc9f0);
    c.add([panelL, panelR, body, dish, feed]);
    this.satellite = c;
  }

  // ---------- round / board ----------

  setupRound() {
    if (this.enemySprites) this.enemySprites.forEach((e) => e.destroy());
    if (this.eSprite) {
      this.eSprite.destroy();
      this.eSprite = null;
    }
    this.enemies = makeEnemies(4);
    this.queue = makeCommandQueue(this.enemies, 14, {
      usePtr2: this.p2Unlocked,
    });
    this.queueIndex = 0;
    // Two pointer states: index 0 = ptr, index 1 = ptr2.
    this.ptrStates = [
      { pointsAt: 0, dangling: false, isNull: false },
      {
        pointsAt: this.p2Unlocked ? 1 : null,
        dangling: false,
        isNull: false,
      },
    ];

    if (this.beam) this.beam.destroy();
    this.beam = this.add.graphics();

    this.enemySprites = this.enemies.map((en, i) =>
      this.buildEnemy(en, i)
    );
    this.drawBeam();
  }

  buildEnemy(en, i) {
    const c = this.add.container(en.x, en.y);

    // --- UFO ---
    // Glow under the saucer.
    const glow = this.add.ellipse(0, 10, 78, 22, en.color, 0.25);
    // Saucer body.
    const saucer = this.add
      .ellipse(0, 8, 80, 28, en.color)
      .setStrokeStyle(2, 0xffffff, 0.4);
    // Running lights along the rim.
    const lights = [-26, -13, 0, 13, 26].map((dx) =>
      this.add.circle(dx, 12, 2.4, 0xffffff, 0.9)
    );
    // Glass dome.
    const dome = this.add
      .ellipse(0, -6, 50, 42, 0xbfeaff, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.6);
    const shine = this.add.ellipse(-11, -14, 10, 14, 0xffffff, 0.55);
    // Letter etched on the dome glass.
    const name = this.add
      .text(0, -6, en.letter, {
        fontFamily: "Consolas, monospace",
        fontSize: "26px",
        color: "#0b2030",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    // Invisible circular hit area for clicking the whole craft.
    const body = this.add.circle(0, 0, 42, 0xffffff, 0.001);
    body.setInteractive({ useHandCursor: true });
    body.enemyIndex = i;

    // The "box" above the head = the address, showing the stored value.
    const box = this.add
      .rectangle(0, -62, 74, 40, 0x11131a)
      .setStrokeStyle(2, 0xffffff, 0.8);
    const addr = this.add
      .text(0, -76, `&${en.letter}`, {
        fontFamily: "Consolas, monospace",
        fontSize: "12px",
        color: "#9aa0a8",
      })
      .setOrigin(0.5);
    const val = this.add
      .text(0, -58, `${en.value}`, {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: "#06d6a0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    c.add([box, addr, val, glow, saucer, ...lights, dome, shine, name, body]);
    c.body = body;
    c.valText = val;
    c.boxRect = box;
    c.addrText = addr;
    return c;
  }

  buildHud() {
    if (this.hud) this.hud.destroy();
    this.hud = this.add.container(0, 0);

    this.cmdBg = this.add
      .rectangle(20, 20, 320, 70, 0x000000, 0.55)
      .setOrigin(0)
      .setStrokeStyle(2, 0x4cc9f0, 0.8);
    this.cmdText = this.add.text(36, 30, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    this.scoreText = this.add
      .text(W - 20, 24, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: "#ffd166",
      })
      .setOrigin(1, 0);
    this.comboText = this.add
      .text(W - 20, 80, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "18px",
        color: "#06d6a0",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    // Key legend so inputs (especially N for NULL) are never a mystery.
    this.legend = this.add
      .text(
        W - 14,
        H - 66,
        [
          "L-click UFO  ptr = &x",
          this.p2Unlocked ? "R-click UFO  ptr2 = &x" : "",
          "digit 0-9    deref = / int e",
          "N  ptr=NULL     SPACE  free",
        ]
          .filter(Boolean)
          .join("\n"),
        {
          fontFamily: "Consolas, monospace",
          fontSize: "13px",
          color: "#7f8894",
          align: "right",
          lineSpacing: 3,
        }
      )
      .setOrigin(1, 1);
    this.livesText = this.add
      .text(W - 20, 52, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: "#ef476f",
      })
      .setOrigin(1, 0);

    this.ptrLabel = this.add.text(112, H - 30, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "16px",
      color: "#9aa0a8",
    });
    this.ptr2Label = this.add
      .text(W / 2, H - 20, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: "#ff7ad9",
      })
      .setOrigin(0.5, 1);
    this.aliasBadge = this.add
      .text(0, 0, "◆ alias: ptr & ptr2 share this", {
        fontFamily: "Consolas, monospace",
        fontSize: "13px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.toast = this.add
      .text(W / 2, H - 90, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);

    // Timer bar (shrinks; represents time pressure that ramps with score).
    this.timerBarBg = this.add
      .rectangle(20, 100, 320, 8, 0x333333)
      .setOrigin(0);
    this.timerBar = this.add
      .rectangle(20, 100, 320, 8, 0x06d6a0)
      .setOrigin(0);

    this.hud.add([
      this.cmdBg,
      this.cmdText,
      this.scoreText,
      this.comboText,
      this.legend,
      this.livesText,
      this.ptrLabel,
      this.ptr2Label,
      this.aliasBadge,
      this.toast,
      this.timerBarBg,
      this.timerBar,
    ]);
    this.updateHud();
  }

  ptrStatus(p) {
    const s = this.st(p);
    const nm = this.ptrName(p);
    if (s.isNull) return { txt: `${nm} -> NULL`, col: "#ffd166" };
    if (s.dangling || s.pointsAt == null)
      return { txt: `${nm} -> DANGLING`, col: "#ef476f" };
    return { txt: `${nm} -> &${this.enemies[s.pointsAt].letter}`, col: "#9aa0a8" };
  }

  updateHud() {
    this.scoreText.setText(`score ${this.score}`);
    this.livesText.setText(`lives ${"<3 ".repeat(this.lives).trim() || "-"}`);
    const s1 = this.ptrStatus(1);
    this.ptrLabel.setText(s1.txt);
    this.ptrLabel.setColor(s1.col);
    if (this.ptr2Label) {
      if (this.p2Unlocked) {
        const s2 = this.ptrStatus(2);
        this.ptr2Label.setText(s2.txt);
        this.ptr2Label.setColor(this.aliasedTarget() != null ? "#ffd166" : s2.col);
      } else {
        this.ptr2Label.setText("");
      }
    }
    if (this.comboText) {
      this.comboText.setText(this.streak > 1 ? `combo x${this.multiplier()}` : "");
    }
  }

  // ---------- command flow ----------

  // ---- pointer-state helpers (p is 1 for ptr, 2 for ptr2) ----
  st(p) {
    return this.ptrStates[p - 1];
  }
  ptrName(p) {
    return p === 2 ? "ptr2" : "ptr";
  }
  beamOrigin(p) {
    return p === 2 ? BEAM_ORIGIN2 : BEAM_ORIGIN;
  }
  beamColorFor(p) {
    return p === 2 ? PTR2_COLOR : PTR_COLOR;
  }
  ptrIsLive(p) {
    const s = this.st(p);
    return (
      !s.dangling &&
      !s.isNull &&
      s.pointsAt != null &&
      this.enemies[s.pointsAt] &&
      !this.enemies[s.pointsAt].freed
    );
  }
  // True when ptr and ptr2 are both live and aimed at the same object.
  aliasedTarget() {
    if (!this.p2Unlocked) return null;
    if (this.ptrIsLive(1) && this.ptrIsLive(2) &&
        this.st(1).pointsAt === this.st(2).pointsAt) {
      return this.st(1).pointsAt;
    }
    return null;
  }

  firstLiveEnemy() {
    const i = this.enemies.findIndex((e) => !e.freed);
    return i === -1 ? null : i;
  }

  timeLimitMs() {
    // Starts generous, ramps down with score, floors at 2.2s.
    return Math.max(2200, 5000 - this.score * 70);
  }

  nextCommand() {
    if (this.gameOver) return;
    if (this.eSprite) {
      this.eSprite.destroy();
      this.eSprite = null;
    }
    if (this.queueIndex >= this.queue.length) {
      this.setupRound(); // fresh board + fresh varied queue, keep playing
      this.buildHud();
    }
    this.current = this.queue[this.queueIndex];

    // Fairness guard: never ASK for a dereference (read or write) when the
    // pointer isn't live, and never ask to redirect at a freed target.
    // Swap in a "reassign the pointer first" redirect instead.
    const p = this.current.p || 1;
    const needsLive =
      this.current.type === "deref" ||
      this.current.type === "readInto" ||
      this.current.type === "free";
    const badRedirect =
      this.current.type === "redirect" &&
      this.enemies[this.current.targetIndex].freed;
    if ((needsLive && !this.ptrIsLive(p)) || badRedirect) {
      const live = this.firstLiveEnemy();
      if (live == null) {
        this.setupRound();
        this.buildHud();
        this.current = this.queue[this.queueIndex];
      } else {
        this.current = { type: "redirect", targetIndex: live, p };
      }
    }

    if (this.current.type === "readInto") this.spawnE();
    this.cmdText.setText(commandText(this.current, this.enemies));
    this.awaiting = true;
    this.updateHud();
    this.startTimer();
  }

  startTimer() {
    if (this.timerEvent) this.timerEvent.remove();
    this.remaining = this.timeLimitMs();
    this.limit = this.remaining;
    this.timerEvent = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.awaiting) return;
        this.remaining -= 50;
        const frac = Phaser.Math.Clamp(this.remaining / this.limit, 0, 1);
        this.timerBar.width = 320 * frac;
        this.timerBar.fillColor =
          frac > 0.5 ? 0x06d6a0 : frac > 0.25 ? 0xffd166 : 0xef476f;
        if (this.remaining <= 0) this.timeout();
      },
    });
  }

  timeout() {
    this.awaiting = false;
    this.loseLife("too slow — the command scrolled past");
    this.advance();
  }

  advance() {
    this.queueIndex++;
    this.time.delayedCall(650, () => this.nextCommand());
  }

  // ---------- player actions ----------

  onEnemyClick(pointer, obj) {
    if (!this.started || !this.awaiting || obj.enemyIndex == null) return;
    // Left-click aims ptr, right-click aims ptr2 (once unlocked).
    const right = pointer.rightButtonDown && pointer.rightButtonDown();
    const ptr = right ? 2 : 1;
    if (ptr === 2 && !this.p2Unlocked) return;
    this.resolveAction({ kind: "redirect", targetIndex: obj.enemyIndex, ptr });
  }

  onKey(e) {
    if (!this.started && !this.gameOver) {
      this.onStartGesture();
      return;
    }
    if (this.gameOver && (e.key === "Enter" || e.key === " ")) {
      this.startGame();
      return;
    }
    if (!this.started || !this.awaiting) return;

    if (e.key === " ") {
      e.preventDefault();
      this.resolveAction({ kind: "free" });
    } else if (e.key === "n" || e.key === "N") {
      // N = set the pointer to NULL.
      this.resolveAction({ kind: "null" });
    } else if (/^[0-9]$/.test(e.key)) {
      // A digit = a DEREF action (change the value AT the pointer).
      this.resolveAction({ kind: "deref", value: parseInt(e.key, 10) });
    }
  }

  // Compare the action the player took against what the command required.
  resolveAction(action) {
    this.awaiting = false;
    const cmd = this.current;
    const p = cmd.p || 1;
    const nm = this.ptrName(p);
    const s = this.st(p);

    if (cmd.type === "redirect") {
      if (action.kind !== "redirect") {
        return this.backfireWrongType(
          "`" + nm + " = &" + this.enemies[cmd.targetIndex].letter +
            "` moves the POINTER. You acted on a value instead."
        );
      }
      if (action.ptr !== p) {
        return this.miss(
          "Wrong pointer — `" + nm + " = &" +
            this.enemies[cmd.targetIndex].letter + "` needs the " +
            (p === 2 ? "RIGHT" : "LEFT") + "-click satellite."
        );
      }
      if (action.targetIndex !== cmd.targetIndex) {
        return this.miss(
          "Right idea (move " + nm + ") but wrong target — aim at &" +
            this.enemies[cmd.targetIndex].letter + "."
        );
      }
      s.pointsAt = cmd.targetIndex;
      s.dangling = false;
      s.isNull = false;
      this.drawBeam();
      const t = this.enemies[cmd.targetIndex];
      this.ringPop(t.x, t.y, this.beamColorFor(p));
      const alias = this.aliasedTarget() === cmd.targetIndex;
      return this.succeed(
        alias
          ? nm + " redirected — now ALIASES the other pointer!"
          : nm + " redirected"
      );
    }

    if (cmd.type === "deref") {
      if (action.kind === "redirect")
        return this.backfireWrongType(
          "`*" + nm + " = " + cmd.value + "` changes the VALUE where " + nm +
            " points — it doesn't move the pointer."
        );
      if (action.kind === "free")
        return this.backfireWrongType(
          "`*" + nm + " = " + cmd.value + "` writes a value; it doesn't free anything."
        );
      if (action.kind === "null")
        return this.backfireWrongType(
          "N sets a pointer to NULL — `*" + nm + " = " + cmd.value +
            "` writes a VALUE instead."
        );
      if (!this.ptrIsLive(p)) return this.segfault();
      if (action.value !== cmd.value)
        return this.miss("Wrong number — command wanted " + cmd.value + ".");
      const en = this.enemies[s.pointsAt];
      en.value = cmd.value;
      this.enemySprites[s.pointsAt].valText.setText(`${cmd.value}`);
      this.flashBox(s.pointsAt, 0x06d6a0);
      this.ringPop(en.x, en.y, 0x06d6a0);
      const aliased = this.aliasedTarget() === s.pointsAt;
      return this.succeed(
        aliased
          ? "wrote through " + nm + " — the other pointer sees " + cmd.value + " too!"
          : "value written through " + nm
      );
    }

    if (cmd.type === "readInto") {
      if (action.kind === "redirect")
        return this.backfireWrongType(
          "`int e = *" + nm + "` READS the value at " + nm +
            " into e — it doesn't move the pointer."
        );
      if (action.kind === "free")
        return this.backfireWrongType(
          "`int e = *" + nm + "` reads a value; it doesn't free anything."
        );
      if (action.kind === "null")
        return this.backfireWrongType(
          "N nulls the pointer — `int e = *" + nm + "` READS the value it points at."
        );
      if (!this.ptrIsLive(p)) return this.segfault();
      const cur = this.enemies[s.pointsAt].value;
      if (action.value !== cur)
        return this.miss(
          "e gets the value stored AT *" + nm + ", which is " + cur +
            " — read the box " + nm + " aims at."
        );
      if (this.eSprite) {
        this.eSprite.valText.setText(`${cur}`);
        this.eSprite.valText.setColor("#06d6a0");
        this.ringPop(400, 130, 0xffd166);
      }
      this.flashBox(s.pointsAt, 0xffd166);
      this.ringPop(this.enemies[s.pointsAt].x, this.enemies[s.pointsAt].y, 0xffd166);
      return this.succeed(`copied *${nm} (${cur}) into e`);
    }

    if (cmd.type === "null") {
      if (action.kind !== "null")
        return this.backfireWrongType(
          "`" + nm + " = NULL` clears the pointer — press N, don't move, write, or free."
        );
      s.isNull = true;
      s.dangling = false;
      this.drawBeam();
      const o = this.beamOrigin(p);
      this.ringPop(o.x + (p === 2 ? -70 : 70), o.y - 50, 0xffd166);
      return this.succeed(nm + " set to NULL");
    }

    if (cmd.type === "free") {
      if (action.kind !== "free")
        return this.backfireWrongType(
          "`free(" + nm + ")` releases the target — press SPACE, don't move, write, or null."
        );
      if (s.pointsAt != null) {
        const spr = this.enemySprites[s.pointsAt];
        spr.valText.setText("free");
        spr.valText.setColor("#ef476f");
        spr.boxRect.setStrokeStyle(2, 0xef476f, 1);
        this.enemies[s.pointsAt].freed = true;
        this.enemies[s.pointsAt].value = null; // memory is gone
        this.ringPop(spr.x, spr.y, 0xef476f);
      }
      s.dangling = true;
      this.drawBeam();
      return this.succeed("target freed — " + nm + " now dangles!");
    }
  }

  // ---------- outcomes ----------

  multiplier() {
    return Math.min(5, 1 + Math.floor(this.streak / 3));
  }

  succeed(msg) {
    this.streak++;
    const gained = this.multiplier();
    this.score += gained;
    this.blip();
    const tag = gained > 1 ? `  +${gained} (x${gained})` : "";
    this.showToast(msg + tag, "#06d6a0");
    if (!this.p2Unlocked && this.score >= P2_THRESHOLD) this.unlockPtr2();
    this.updateHud();
    this.advance();
  }

  unlockPtr2() {
    this.p2Unlocked = true;
    this.buildSatellite2();
    const live = this.firstLiveEnemy();
    this.ptrStates[1] = {
      pointsAt: live == null ? 0 : live,
      dangling: false,
      isNull: false,
    };
    // Rebuild the queue so ptr2 commands start appearing immediately.
    this.queue = makeCommandQueue(this.enemies, 14, { usePtr2: true });
    this.queueIndex = -1; // advance() will step this to 0
    if (this.legend)
      this.legend.setText(
        [
          "L-click UFO  ptr = &x",
          "R-click UFO  ptr2 = &x",
          "digit 0-9    deref = / int e",
          "N  ptr=NULL     SPACE  free",
        ].join("\n")
      );
    this.showToast(
      "ptr2 ONLINE — RIGHT-CLICK a UFO to aim the 2nd pointer!",
      "#ff7ad9"
    );
    this.drawBeam();
  }

  miss(msg) {
    this.loseLife(msg);
    this.advance();
  }

  backfireWrongType(msg) {
    this.cameras.main.shake(220, 0.01);
    this.cameras.main.flash(180, 120, 20, 40);
    this.loseLife("BACKFIRE — " + msg);
    this.advance();
  }

  segfault() {
    this.cameras.main.shake(320, 0.02);
    this.cameras.main.flash(260, 200, 0, 0);
    this.loseLife(
      "SEGFAULT — you dereferenced a NULL/dangling pointer. Reassign it (ptr = &x) before using *ptr."
    );
    this.advance();
  }

  loseLife(msg) {
    this.lives--;
    this.streak = 0;
    this.crunch();
    this.showToast(msg, "#ef476f");
    this.updateHud();
    if (this.lives <= 0) this.endGame();
  }

  showToast(msg, color) {
    this.toast.setText(msg);
    this.toast.setColor(color);
    this.tweens.add({
      targets: this.toast,
      alpha: { from: 1, to: 0.15 },
      duration: 1400,
    });
  }

  endGame() {
    this.gameOver = true;
    this.started = false;
    if (this.timerEvent) this.timerEvent.remove();
    if (this.eSprite) {
      this.eSprite.destroy();
      this.eSprite = null;
    }
    this.stopMusic();
    this.playGameOverJingle();
    // After the jingle, drift back into the menu theme (unless the player
    // has already relaunched).
    this.time.delayedCall(1400, () => {
      if (this.gameOver) this.playMenuMusic();
    });
    this.overLayer = this.add.container(0, 0);
    const dim = this.add.rectangle(0, 0, W, H, 0x11131a, 0.9).setOrigin(0);
    const t = this.add
      .text(W / 2, 240, "GAME OVER", {
        fontFamily: "Consolas, monospace",
        fontSize: "44px",
        color: "#ef476f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const s = this.add
      .text(W / 2, 310, `final score: ${this.score}`, {
        fontFamily: "Consolas, monospace",
        fontSize: "24px",
        color: "#ffd166",
      })
      .setOrigin(0.5);
    const r = this.add
      .text(W / 2, 380, "press ENTER to play again", {
        fontFamily: "Consolas, monospace",
        fontSize: "18px",
        color: "#e6e6e6",
      })
      .setOrigin(0.5);
    this.overLayer.add([dim, t, s, r]);
  }

  spawnE() {
    if (this.eSprite) this.eSprite.destroy();
    const c = this.add.container(400, 130);
    const box = this.add
      .rectangle(0, 0, 96, 46, 0x11131a)
      .setStrokeStyle(2, 0xffd166, 1);
    const label = this.add
      .text(0, -14, "int e", {
        fontFamily: "Consolas, monospace",
        fontSize: "13px",
        color: "#9aa0a8",
      })
      .setOrigin(0.5);
    const val = this.add
      .text(0, 7, "?", {
        fontFamily: "Consolas, monospace",
        fontSize: "22px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    c.add([box, label, val]);
    c.valText = val;
    this.eSprite = c;
  }

  update(time, delta) {
    if (!this.started || this.gameOver || !this.enemies) return;
    const dt = delta / 1000;
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      const spr = this.enemySprites[i];
      if (en.vx == null) continue;
      en.x += en.vx * dt;
      en.y += en.vy * dt;
      if (en.x < 80 || en.x > 720) {
        en.vx *= -1;
        en.x = Phaser.Math.Clamp(en.x, 80, 720);
      }
      if (en.y < 175 || en.y > 555) {
        en.vy *= -1;
        en.y = Phaser.Math.Clamp(en.y, 175, 555);
      }
      spr.x = en.x;
      spr.y = en.y;
    }
    this.drawBeam(); // beam follows the moving target
  }

  // ---------- audio + juice ----------

  initAudio() {
    try {
      if (!this.actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.actx = new AC();
      }
      if (this.actx.state === "suspended") this.actx.resume();
    } catch (e) {
      this.actx = null;
    }
  }

  noteFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  playTrack(steps, stepMs, opts) {
    this.stopMusic();
    if (!this.actx) return;
    this.musicSteps = steps;
    this.musicStep = 0;
    const o = opts || {};
    const play = () => {
      const s = this.musicSteps[this.musicStep % this.musicSteps.length];
      const dur = (stepMs / 1000) * 0.9;
      if (s.mel != null)
        this.tone(this.noteFreq(s.mel), dur, o.melType || "triangle", 0.05);
      if (s.bass != null)
        this.tone(
          this.noteFreq(s.bass - 12),
          Math.min(dur * 1.6, 0.35),
          o.bassType || "square",
          0.05
        );
      this.musicStep++;
    };
    play();
    this.musicEvent = this.time.addEvent({
      delay: stepMs,
      loop: true,
      callback: play,
    });
  }

  stopMusic() {
    if (this.musicEvent) {
      this.musicEvent.remove();
      this.musicEvent = null;
    }
  }

  playMenuMusic() {
    this.playTrack(MENU_TRACK, 300, { melType: "triangle", bassType: "sine" });
  }

  playGameMusic() {
    this.playTrack(GAME_TRACK, 150, { melType: "square", bassType: "sawtooth" });
  }

  playGameOverJingle() {
    if (!this.actx) return;
    const seq = [72, 71, 69, 65, 62, 60, 57];
    seq.forEach((m, i) =>
      this.time.delayedCall(i * 170, () =>
        this.tone(this.noteFreq(m), 0.3, "triangle", 0.09)
      )
    );
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.actx) return;
    const t0 = this.actx.currentTime;
    const o = this.actx.createOscillator();
    const g = this.actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.actx.destination);
    o.start(t0);
    o.stop(t0 + dur);
  }

  blip() {
    // Rising zap on a correct action; pitch climbs with the combo.
    const base = 620 + Math.min(this.streak, 8) * 40;
    this.tone(base, 0.12, "square", 0.1, base * 2.2);
  }

  crunch() {
    // Descending crunch on any failure.
    this.tone(180, 0.28, "sawtooth", 0.16, 50);
  }

  ringPop(x, y, color = 0x06d6a0) {
    const ring = this.add.circle(x, y, 12, color, 0);
    ring.setStrokeStyle(3, color, 1);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
  }

  // ---------- visuals ----------

  drawBeam() {
    this.beam.clear();
    this.drawOneBeam(1);
    if (this.p2Unlocked) this.drawOneBeam(2);
    this.updateAlias();
  }

  drawOneBeam(p) {
    const s = this.st(p);
    const o = this.beamOrigin(p);
    const dir = p === 2 ? -1 : 1; // right satellite fizzles leftward
    const color = this.beamColorFor(p);
    if (s.isNull) {
      this.beam.lineStyle(3, 0x9aa0a8, 0.4);
      this.beam.beginPath();
      this.beam.moveTo(o.x, o.y);
      this.beam.lineTo(o.x + dir * 70, o.y - 50);
      this.beam.strokePath();
      this.beam.lineStyle(2, 0xffd166, 0.9);
      this.beam.strokeCircle(o.x + dir * 78, o.y - 56, 7);
      return;
    }
    if (s.dangling || s.pointsAt == null) {
      this.beam.lineStyle(3, 0xef476f, 0.5);
      this.beam.beginPath();
      this.beam.moveTo(o.x, o.y);
      this.beam.lineTo(o.x + dir * 90, o.y - 60);
      this.beam.strokePath();
      return;
    }
    const en = this.enemies[s.pointsAt];
    this.beam.lineStyle(3, color, 0.7);
    this.beam.beginPath();
    this.beam.moveTo(o.x, o.y);
    this.beam.lineTo(en.x, en.y);
    this.beam.strokePath();
    this.beam.fillStyle(color, 0.9);
    this.beam.fillCircle(en.x, en.y, 6);
  }

  updateAlias() {
    const idx = this.aliasedTarget();
    if (idx != null && this.enemies[idx]) {
      const en = this.enemies[idx];
      this.beam.lineStyle(3, 0xffd166, 0.9);
      this.beam.strokeCircle(en.x, en.y, 46);
      this.beam.lineStyle(2, 0xffd166, 0.5);
      this.beam.strokeCircle(en.x, en.y, 54);
      if (this.aliasBadge)
        this.aliasBadge.setVisible(true).setPosition(en.x, en.y - 96);
    } else if (this.aliasBadge) {
      this.aliasBadge.setVisible(false);
    }
  }

  flashBox(i, color) {
    const spr = this.enemySprites[i];
    spr.boxRect.setStrokeStyle(3, color, 1);
    this.time.delayedCall(300, () =>
      spr.boxRect.setStrokeStyle(2, 0xffffff, 0.8)
    );
  }
}
