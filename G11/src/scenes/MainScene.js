// MainScene.js
//
// Concept: exploring a Linux filesystem tree with `ls` and `cd`.
//
// Learning objective (capability-level): after playing, a player who
// started knowing nothing can, given an unfamiliar directory tree, use
// `ls` to reveal a directory's contents, read the result as a level of a
// hierarchy, and use `cd <name>` / `cd ..` to navigate to a target
// location — plus recognize when `ls -a` is needed (hidden entries) and
// what a "permission denied" on `ls` means (missing read on a directory).
//
// Mechanic-concept relationship (intrinsic): the ONLY way to act is the
// command line. The map is a *visualization of filesystem state*, not an
// input method. `ls` literally reveals the room; `cd` literally moves you
// through the tree. Removing the "dungeon" theme leaves a real filesystem
// navigator — the mechanic *is* the concept.
//
// Repetition with variation: 7 levels (see src/scenarios.js) escalate from
// a single cd, through dead ends / backtracking, to hidden dirs (ls -a)
// and a read-denied directory. Same mechanic, varied instances.

import { LEVELS, GOAL } from "../scenarios.js";

const MAP_TOP = 96;
const MAP_H = 250;
const LOG_TOP = MAP_TOP + MAP_H + 8; // ~354

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.levelIndex = 0;
    this.log = [];
    this.won = false;

    // --- static header/log text objects ---
    this.titleText = this.add.text(16, 12, "", {
      fontFamily: "Courier New, monospace", fontSize: "18px", color: "#ffd479",
    });
    this.pwdText = this.add.text(16, 40, "", {
      fontFamily: "Courier New, monospace", fontSize: "15px", color: "#5ec27e",
    });
    this.goalText = this.add.text(16, 62, "", {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#9aa0a8",
    });

    // map + log containers
    this.mapLayer = this.add.container(0, 0);
    this.add.rectangle(450, LOG_TOP - 6, 900, 2, 0x2a2d34).setOrigin(0.5, 0);
    this.logText = this.add.text(16, LOG_TOP, "", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#d0d0d0",
      lineSpacing: 3, wordWrap: { width: 868 },
    });

    // --- wire the HTML command input ---
    this.input.keyboard.enabled = false; // let the DOM input own the keyboard
    const form = document.getElementById("cmd-form");
    this.cmdInput = document.getElementById("cmd-input");
    this.history = [];
    this.histPos = 0;
    this.submitHandler = (e) => {
      e.preventDefault();
      const raw = this.cmdInput.value;
      this.cmdInput.value = "";
      if (raw.trim() !== "") {
        this.history.push(raw);
        this.histPos = this.history.length;
      }
      this.runCommand(raw);
    };
    form.addEventListener("submit", this.submitHandler);
    // up/down command history
    this.keyHandler = (e) => {
      if (e.key === "ArrowUp") {
        if (this.histPos > 0) { this.histPos--; this.cmdInput.value = this.history[this.histPos] || ""; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (this.histPos < this.history.length) { this.histPos++; this.cmdInput.value = this.history[this.histPos] || ""; }
        e.preventDefault();
      }
    };
    this.cmdInput.addEventListener("keydown", this.keyHandler);
    this.cmdInput.focus();
    this.events.once("shutdown", () => {
      form.removeEventListener("submit", this.submitHandler);
      this.cmdInput.removeEventListener("keydown", this.keyHandler);
    });

    this.loadLevel(0);
  }

  // ---------------------------------------------------------------------

  loadLevel(i) {
    const lvl = LEVELS[i];
    this.levelIndex = i;
    this.level = lvl;
    this.root = lvl.tree;
    this.path = [this.root]; // stack of nodes from root to current
    this.revealed = false; // has `ls` been run in current dir?
    this.revealedAll = false; // was it `ls -a`?
    this.won = false;
    this.log = [];
    this.print(`== ${lvl.title} ==`, "#ffd479");
    this.print(lvl.hint, "#9aa0a8");
    this.render();
  }

  cur() {
    return this.path[this.path.length - 1];
  }

  pwd() {
    if (this.path.length === 1) return "/";
    return "/" + this.path.slice(1).map((n) => n.name).join("/");
  }

  print(line, color) {
    // color is applied to the whole current buffer via a simple scheme:
    // we keep plain text lines; coloring is approximated by the log color.
    this.log.push(line);
    // keep last ~11 lines visible
    if (this.log.length > 11) this.log = this.log.slice(this.log.length - 11);
  }

  // ---------------------------------------------------------------------

  runCommand(raw) {
    const line = raw.trim();
    this.print(`$ ${line}`, "#5ec27e");
    if (line === "") { this.render(); return; }

    if (this.won && !/^(next|help|man|warp)/.test(line)) {
      this.print("Level complete! Type `next` for the next level.", "#ffd479");
      this.render();
      return;
    }

    const parts = line.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case "ls": this.cmdLs(args); break;
      case "cat": this.cmdCat(args); break;
      case "cd": this.cmdCd(args); break;
      case "pwd": this.print(this.pwd()); break;
      case "clear": this.log = []; break;
      case "help":
      case "man": this.cmdHelp(); break;
      case "next": this.cmdNext(); break;
      case "restart": this.loadLevel(this.levelIndex); return;
      // hidden dev shortcut (not listed in help): warp N -> jump to level N
      case "warp": {
        const n = parseInt(args[0], 10);
        if (!Number.isInteger(n) || n < 1 || n > LEVELS.length) {
          this.print(`warp: level out of range (1-${LEVELS.length})`, "#e06c6c");
        } else {
          this.loadLevel(n - 1);
          return;
        }
        break;
      }
      default:
        this.print(`${cmd}: command not found. Try \`help\`.`, "#e06c6c");
    }
    this.render();
  }

  cmdHelp() {
    this.print("commands:");
    this.print("  ls        list what's in the current room");
    this.print("  ls -a     also show hidden entries (names starting with .)");
    this.print("  cat FILE  read a file's contents (often holds a clue)");
    this.print("  cd NAME   enter a room (directory)");
    this.print("  cd ..     go back up one level");
    this.print("  cd /      jump back to the root");
    this.print("  pwd       show where you are");
    this.print("  next      advance after winning   |   restart  reset level");
    this.print(`goal: cd into the ${GOAL}.`);
  }

  cmdLs(args) {
    const all = args.includes("-a");
    const node = this.cur();
    if (!node.read) {
      this.print("ls: cannot open directory: Permission denied", "#e06c6c");
      this.print("(you lack read (r) on this dir — but you can still cd through it)", "#9aa0a8");
      return;
    }
    this.revealed = true;
    if (all) this.revealedAll = true;

    const dirs = node.dirs.filter((d) => all || !d.hidden);
    const files = node.files.filter((f) => all || !f.startsWith("."));
    const entries = [
      ...dirs.map((d) => d.name + "/"),
      ...files,
    ];
    if (entries.length === 0) {
      this.print("(empty)");
    } else {
      this.print(entries.join("   "));
    }
    if (!all && (node.dirs.some((d) => d.hidden) || node.files.some((f) => f.startsWith(".")))) {
      // don't tell them outright, but nothing here — hint handled by level text
    }
  }

  cmdCat(args) {
    if (args.length === 0) { this.print("cat: usage: cat FILE"); return; }
    const name = args[0];
    const node = this.cur();
    if (!node.files.includes(name)) {
      this.print(`cat: ${name}: No such file`, "#e06c6c");
      return;
    }
    const text = (this.level.contents && this.level.contents[name]) ||
      "(the file is blank)";
    text.split("\n").forEach((l) => this.print("  " + l, "#d9c48a"));
  }

  cmdCd(args) {
    if (args.length === 0) { this.print("cd: usage: cd DIR"); return; }
    const target = args[0];

    if (target === "/") {
      this.path = [this.root];
      this.afterMove();
      return;
    }
    if (target === "..") {
      if (this.path.length === 1) { this.print("cd: already at root /"); return; }
      this.path.pop();
      this.afterMove();
      return;
    }
    // support a simple relative multi-part path a/b/c
    const segs = target.split("/").filter((s) => s.length > 0);
    let node = this.cur();
    const newPath = [...this.path];
    for (const seg of segs) {
      if (seg === "..") {
        if (newPath.length > 1) newPath.pop();
        node = newPath[newPath.length - 1];
        continue;
      }
      const child = node.dirs.find((d) => d.name === seg);
      if (!child) {
        this.print(`cd: ${seg}: No such directory`, "#e06c6c");
        return;
      }
      if (!child.exec) {
        this.print(`cd: ${seg}: Permission denied`, "#e06c6c");
        return;
      }
      newPath.push(child);
      node = child;
    }
    this.path = newPath;
    this.afterMove();
  }

  afterMove() {
    this.revealed = false;
    this.revealedAll = false;
    this.print(`moved to ${this.pwd()}`, "#8ab4f8");
    if (this.cur().name === GOAL) {
      this.won = true;
      this.revealed = true;
      this.print("", "#fff");
      this.print("*** You found the treasure_room! ***", "#ffd479");
      if (this.levelIndex < LEVELS.length - 1) {
        this.print("Type `next` to descend to the next level.", "#ffd479");
      } else {
        this.print("You cleared every level. You can navigate a filesystem!", "#ffd479");
      }
    }
  }

  cmdNext() {
    if (!this.won) { this.print("Finish this level first — reach the treasure_room."); return; }
    if (this.levelIndex < LEVELS.length - 1) {
      this.loadLevel(this.levelIndex + 1);
    } else {
      this.print("That was the last level. Type `restart` to replay it.");
    }
  }

  // ---------------------------------------------------------------------

  render() {
    this.titleText.setText(`terminal-dungeon   [level ${this.levelIndex + 1}/${LEVELS.length}]`);
    this.pwdText.setText(`you are here:  ${this.pwd()}`);
    this.goalText.setText(this.level.goal);
    this.logText.setText(this.log.join("\n"));
    this.drawMap();
  }

  drawMap() {
    this.mapLayer.removeAll(true);
    const node = this.cur();

    // room frame
    const frame = this.add.rectangle(450, MAP_TOP + MAP_H / 2, 860, MAP_H - 10, 0x1a1c21)
      .setStrokeStyle(2, 0x33373f);
    this.mapLayer.add(frame);

    if (this.won) {
      this.mapLayer.add(this.add.text(450, MAP_TOP + MAP_H / 2, "★  TREASURE ROOM  ★", {
        fontFamily: "Courier New, monospace", fontSize: "28px", color: "#ffd479",
      }).setOrigin(0.5));
      return;
    }

    // permission-blind room
    if (!node.read) {
      this.mapLayer.add(this.add.text(450, MAP_TOP + 40,
        "This room is too dark to see (no read permission).", {
        fontFamily: "Courier New, monospace", fontSize: "15px", color: "#9aa0a8",
      }).setOrigin(0.5));
    }

    if (!this.revealed) {
      this.mapLayer.add(this.add.text(450, MAP_TOP + MAP_H / 2,
        node.read ? "It's dark. Type  ls  to look around." : "Try walking deeper: cd into the next room.", {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#7f8894",
      }).setOrigin(0.5));
      // still draw the player
      this.drawPlayer();
      return;
    }

    // draw revealed entries as tiles
    const dirs = node.dirs.filter((d) => this.revealedAll || !d.hidden);
    const files = node.files.filter((f) => this.revealedAll || !f.startsWith("."));
    const tiles = [
      ...dirs.map((d) => ({ label: d.name, kind: "dir", locked: !d.exec })),
      ...files.map((f) => ({ label: f, kind: "file" })),
    ];

    const startX = 110;
    const gap = 130;
    const perRow = 6;
    const rowY = [MAP_TOP + 70, MAP_TOP + 165];
    tiles.forEach((t, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      const x = startX + col * gap;
      const y = rowY[row] || rowY[0];
      const isDir = t.kind === "dir";
      const color = isDir ? (t.locked ? 0x5a4a2a : 0x2f5d3a) : 0x30343c;
      const box = this.add.rectangle(x, y, 112, 64, color).setStrokeStyle(2, isDir ? 0x5ec27e : 0x565b63);
      const icon = isDir ? (t.locked ? "🔒" : "📁") : "📄";
      this.mapLayer.add(box);
      this.mapLayer.add(this.add.text(x, y - 14, icon, { fontSize: "20px" }).setOrigin(0.5));
      this.mapLayer.add(this.add.text(x, y + 14, t.label + (isDir ? "/" : ""), {
        fontFamily: "Courier New, monospace", fontSize: "12px",
        color: isDir ? "#bfe6c9" : "#c7cbd1",
      }).setOrigin(0.5));
    });

    if (tiles.length === 0) {
      this.mapLayer.add(this.add.text(450, MAP_TOP + 70, "(this room is empty — cd .. to go back)", {
        fontFamily: "Courier New, monospace", fontSize: "15px", color: "#9aa0a8",
      }).setOrigin(0.5));
    }

    this.drawPlayer();
  }

  drawPlayer() {
    const px = 450, py = MAP_TOP + MAP_H - 34;
    this.mapLayer.add(this.add.circle(px, py, 12, 0x8ab4f8));
    this.mapLayer.add(this.add.text(px, py, "@", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#0c0d10", fontStyle: "bold",
    }).setOrigin(0.5));
  }
}
