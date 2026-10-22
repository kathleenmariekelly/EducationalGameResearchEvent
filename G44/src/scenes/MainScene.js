// MainScene.js
//
// ROVER-RELINK — an educational sandbox about ROS2 dataflow.
//
// Learning objective (capability): the player can inspect a ROS2 system with
// real commands, then wire a publisher and a subscriber to a shared TOPIC so
// data flows from a sensor to a display.
//
// Misconception targeted: "node A sends data directly TO node B" (function-call
// thinking). In the interactive graph you can only connect a node to a TOPIC,
// never node-to-node — so the pub/sub broadcast model is the only way to make
// data flow.
//
// Layout:
//   top-left  : VISUAL DISPLAY  (rover; reveals a LiDAR scan once wired)
//   top-right : interactive_rqt (draggable pill-nodes + box-topics)
//   bottom    : TERMINAL        (typed input; only the planned ros2 commands)
//
// The tutorial is delivered as terminal messages. While a message types out,
// input is locked; it unlocks when the message finishes. Everything is static /
// offline — no API calls.

const COL = {
  green: "#6ee787",   // real ros2 command echo / success
  amber: "#f2cc60",   // game-only note / warning
  cyan: "#4ec9b0",    // system / tutorial voice
  white: "#e6edf3",   // typed input
  grey: "#8b949e",    // command output
  dim: "#6e7681",
  red: "#ff6b6b",     // errors
};

const HEX = {
  bg: 0x0d1117,
  term: 0x080b11,
  panel: 0x0f141c,
  border: 0x21262d,
  teal: 0x4ec9b0,
  nodeFill: 0x0f1720,
  topic: 0x4aa3ff,
  topicFill: 0x0e2233,
  white: 0xffffff,
  good: 0x6ee787,
  bad: 0xff6b6b,
};

const PROMPT = "rover@base:~$ ";
const LINEH = 24;
const FAM = '"SF Mono", Consolas, Menlo, monospace';
const TSIZE = "18px";           // terminal text size
const tstyle = (color, size) => ({ fontFamily: FAM, fontSize: size || TSIZE, color });

// terminal geometry (bottom half)
const TERM_TOP = 352;
const TERM_X = 16;
const LINES_TOP = 380;
const INPUT_Y = 664;

// importable catalog.
// Each item declares the message INTERFACES it puts out (outputs) and the
// interfaces it will accept in (inputs) — the ROS2 idea that a publisher and
// subscriber must agree on a message type. A connection A -> B is only allowed
// if one of A's outputs is in B's inputs.
const LASER = "sensor_msgs/LaserScan";
const LOG = "rcl_interfaces/Log";
const TWIST = "geometry_msgs/Twist";

const CATALOG = {
  nodes: {
    lidar_node:      { outputs: [LASER], inputs: [] },
    display_node:    { outputs: [],      inputs: [LASER] },
    teleop_node:     { outputs: [TWIST], inputs: [] },
    base_controller: { outputs: [],      inputs: [TWIST] },
  },
  topics: {
    "/scan":    { outputs: [LASER], inputs: [LASER] },
    "/cmd_vel": { outputs: [TWIST], inputs: [TWIST] },
    "/rosout":  { outputs: [LOG],   inputs: [LOG] },
  },
};

// visual-display / rover world center
const RCX = 270;
const RCY = 190;
// display viewport (clip region) and the world the rover roams
const VIEW = { x1: 14, y1: 34, x2: 526, y2: 346 };
const WORLD = { minX: -400, maxX: 400, minY: -260, maxY: 260 };
const CHARGER = { wx: 300, wy: -170, size: 44 };
// solid obstacles in the world (world coords)
const OBSTACLES = [
  { x: 120, y: -40, w: 70, h: 50 },
  { x: -230, y: 90, w: 80, h: 40 },
];

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.lines = [];            // committed scrollback; each line = [{t,c}]
    this.inputStr = "";
    this.locked = true;
    this.cursorOn = true;
    this.lineObjs = [];
    this.inputObjs = [];

    this.graphOpen = false;
    this.items = {};            // id -> item
    this.connections = [];      // [{a,b}] undirected, node<->topic
    this.selectedId = null;
    this.tutorialStep = 0;
    this.grabbed = null;
    this.rover = { worldX: 0, worldY: 0, angle: 0 };
    this.driveHintShown = false;
    this.scanPoints = this.computeScanPoints();
    this.worldObjects = this.buildWorldObjects();
    // solid things the rover can't drive through (obstacles + charger box)
    this.solidRects = OBSTACLES.concat([{
      x: CHARGER.wx - CHARGER.size / 2, y: CHARGER.wy - CHARGER.size / 2,
      w: CHARGER.size, h: CHARGER.size,
    }]);

    this.drawChrome();
    this.drawDisplayPanel();
    this.drawGraphPanel();

    // keyboard
    this.input.keyboard.addCapture("BACKSPACE,SPACE,SLASH,UP,DOWN,LEFT,RIGHT");
    this.input.keyboard.on("keydown", (e) => this.onKey(e));
    // arrow keys for driving the rover (WASD would collide with terminal typing)
    this.keys = this.input.keyboard.addKeys({ aup: "UP", adown: "DOWN", aleft: "LEFT", aright: "RIGHT" });

    // manual drag/click handling for graph items (more forgiving than
    // Phaser's built-in draggable, which made connecting finicky)
    this.input.on("pointermove", (pointer) => {
      if (!this.grabbed) return;
      const it = this.grabbed;
      it.container.x = Phaser.Math.Clamp(pointer.x + this.grabOffset.x, 545 + it.w / 2, 1075 - it.w / 2);
      it.container.y = Phaser.Math.Clamp(pointer.y + this.grabOffset.y, 34 + it.h / 2, TERM_TOP - it.h / 2 - 6);
      if (Math.hypot(pointer.x - this.grabStart.x, pointer.y - this.grabStart.y) > 5) it.moved = true;
      this.redrawConnections();
    });
    this.input.on("pointerup", () => {
      if (!this.grabbed) return;
      const it = this.grabbed;
      this.grabbed = null;
      if (!it.moved) this.onItemClick(it);
    });

    // cursor blink
    this.time.addEvent({ delay: 500, loop: true, callback: () => {
      this.cursorOn = !this.cursorOn; this.renderInput();
    }});

    this.renderTerminal();
    this.runTutorial(0);
  }

  // -------------------------------------------------------------- chrome
  drawChrome() {
    // terminal background
    this.add.rectangle(540, (TERM_TOP + 700) / 2, 1080, 700 - TERM_TOP, HEX.term).setOrigin(0.5);
    this.add.rectangle(540, TERM_TOP, 1080, 1, HEX.border).setOrigin(0.5);
    this.add.text(TERM_X, TERM_TOP + 6, "TERMINAL", tstyle(COL.cyan, "13px"));
    this.add.text(TERM_X + 90, TERM_TOP + 6, "type commands · Enter to run", tstyle(COL.dim, "13px"));
    // divider between top panels
    this.add.rectangle(540, TERM_TOP / 2, 1, TERM_TOP, HEX.border).setOrigin(0.5);
  }

  drawDisplayPanel() {
    this.add.text(16, 12, "VISUAL DISPLAY", tstyle(COL.cyan, "13px"));
    this.add.rectangle((VIEW.x1 + VIEW.x2) / 2, (VIEW.y1 + VIEW.y2) / 2,
      VIEW.x2 - VIEW.x1, VIEW.y2 - VIEW.y1).setStrokeStyle(1, HEX.border);
    this.displayGfx = this.add.graphics();
    this.displayText = this.add.text(270, 300, "no sensor data", tstyle(COL.dim, "16px")).setOrigin(0.5);
    this.updateDisplay();
    // slow radar sweep flourish (only meaningful once revealed)
    this.sweepAngle = 0;
  }

  drawGraphPanel() {
    this.add.text(556, 12, "interactive_rqt", tstyle(COL.cyan, "13px"));
    this.add.text(556 + 120, 12, "(game tool — drag items, click to wire)", tstyle(COL.dim, "13px"));
    this.graphPlaceholder = this.add.text(810, 175, "run  rqt_graph  to open", tstyle(COL.dim, "16px")).setOrigin(0.5);
    this.graphGfx = this.add.graphics(); // connection lines (below items)
  }

  // -------------------------------------------------------------- keyboard
  onKey(e) {
    if (this.locked) return;
    const k = e.key;
    if (k === "Enter") {
      const cmd = this.inputStr;
      this.inputStr = "";
      this.renderInput();
      this.submit(cmd);
    } else if (k === "Backspace") {
      this.inputStr = this.inputStr.slice(0, -1);
      this.renderInput();
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.inputStr.length < 80) this.inputStr += k;
      this.renderInput();
    }
  }

  // -------------------------------------------------------------- commands
  submit(raw) {
    const cmd = raw.trim().replace(/\s+/g, " ");
    // echo
    this.pushLine([{ t: PROMPT, c: COL.green }, { t: raw, c: COL.white }]);
    if (cmd === "") return;

    if (cmd === "ros2 node list") return this.cmdNodeList();
    if (cmd.startsWith("ros2 node info ")) return this.cmdNodeInfo(cmd.slice(15).trim());
    if (cmd === "ros2 topic list") return this.cmdTopicList();
    if (cmd.startsWith("ros2 topic info ")) return this.cmdTopicInfo(cmd.slice(16).trim());
    if (cmd === "rqt_graph") return this.cmdRqtGraph();
    if (cmd === "close" || cmd.startsWith("close ")) return this.cmdClose(cmd);
    if (cmd.startsWith("import ")) return this.cmdImport(cmd.slice(7).trim());
    if (cmd.startsWith("remove ")) return this.cmdRemove(cmd.slice(7).trim());
    if (cmd === "clear") { this.lines = []; return this.renderTerminal(); }
    if (cmd === "help") return this.cmdHelp();

    this.log("command not found: " + cmd, COL.red);
    this.log("type  help  to see available commands.", COL.dim);
  }

  cmdHelp() {
    this.log("available commands:", COL.grey);
    this.log("  ros2 node list   list nodes         (real ros2)", COL.grey);
    this.log("  ros2 node info <n>   node inputs/outputs  (real ros2)", COL.grey);
    this.log("  ros2 topic list  list topics        (real ros2)", COL.grey);
    this.log("  ros2 topic info <t>  topic message type   (real ros2)", COL.grey);
    this.log("  rqt_graph        open the graph      (real tool*)", COL.grey);
    this.log("  import <name>    add to graph        (GAME-ONLY)", COL.grey);
    this.log("  remove <name>    take off graph      (GAME-ONLY)", COL.grey);
    this.log("  close --save     close graph, keep links   (GAME-ONLY)", COL.grey);
    this.log("  close --discard  close graph, drop links   (GAME-ONLY)", COL.grey);
    this.log("  clear / help", COL.grey);
    this.log("  * real rqt_graph only shows the graph; here you edit it.", COL.dim);
    this.checkTutorial("help");
  }

  cmdNodeList() {
    Object.keys(CATALOG.nodes).forEach((n) => this.log("  " + n, COL.grey));
    this.checkTutorial("node_list");
  }

  cmdTopicList() {
    Object.keys(CATALOG.topics).forEach((t) => {
      this.log("  " + t + "   [" + CATALOG.topics[t].inputs.join(", ") + "]", COL.grey);
    });
    this.checkTutorial("topic_list");
  }

  cmdNodeInfo(name) {
    if (!Object.prototype.hasOwnProperty.call(CATALOG.nodes, name)) {
      if (Object.prototype.hasOwnProperty.call(CATALOG.topics, name)) {
        this.log(name + " is a topic \u2014 try  ros2 topic info " + name, COL.red);
      } else {
        this.log("unknown node: " + name, COL.red);
      }
      return;
    }
    const def = CATALOG.nodes[name];
    this.log(name, COL.grey);
    this.log("  Subscribers (inputs):", COL.grey);
    if (def.inputs.length) def.inputs.forEach((i) => this.log("    " + i, COL.grey));
    else this.log("    <none>", COL.grey);
    this.log("  Publishers (outputs):", COL.grey);
    if (def.outputs.length) def.outputs.forEach((o) => this.log("    " + o, COL.grey));
    else this.log("    <none>", COL.grey);
    this.checkTutorial("nodeinfo:" + name);
  }

  cmdTopicInfo(name) {
    if (!Object.prototype.hasOwnProperty.call(CATALOG.topics, name)) {
      if (Object.prototype.hasOwnProperty.call(CATALOG.nodes, name)) {
        this.log(name + " is a node \u2014 try  ros2 node info " + name, COL.red);
      } else {
        this.log("unknown topic: " + name, COL.red);
      }
      return;
    }
    const def = CATALOG.topics[name];
    const pubCount = this.connections.filter((c) => c.to === name).length;
    const subCount = this.connections.filter((c) => c.from === name).length;
    this.log("Type: " + def.inputs[0], COL.grey);
    this.log("Publisher count: " + pubCount, COL.grey);
    this.log("Subscription count: " + subCount, COL.grey);
    this.checkTutorial("topicinfo:" + name);
  }

  cmdRqtGraph() {
    if (this.graphOpen) { this.log("interactive_rqt is already open (top-right).", COL.grey); return; }
    this.graphOpen = true;
    this.graphPlaceholder.setText("empty — use  import <name>");
    this.log("opening interactive_rqt … (top-right)", COL.grey);
    this.checkTutorial("rqt");
  }

  cmdImport(name) {
    if (!this.graphOpen) { this.log("open the graph first:  rqt_graph", COL.red); return; }
    if (!name) { this.log("usage: import <node-or-topic>", COL.red); return; }
    const isNode = Object.prototype.hasOwnProperty.call(CATALOG.nodes, name);
    const isTopic = Object.prototype.hasOwnProperty.call(CATALOG.topics, name);
    if (!isNode && !isTopic) { this.log("unknown node/topic: " + name, COL.red); return; }
    if (this.items[name]) {
      this.log(name + " is already on the graph.", COL.amber);
      this.checkTutorial("import:" + name); // don't soft-lock the tutorial
      return;
    }
    if (name === "/rosout") {
      this.log("/rosout is just logging — you won't need it for this task.", COL.amber);
      return;
    }
    this.addGraphItem(name, isNode ? "node" : "topic");
    this.log("imported " + name + " onto the graph.", COL.grey);
    this.graphPlaceholder.setVisible(false);
    this.checkTutorial("import:" + name);
  }

  cmdClose(cmd) {
    if (!this.graphOpen) { this.log("rqt_graph isn't open.", COL.red); return; }
    const arg = cmd.replace(/^close\s*/, "").trim();
    let save;
    if (arg === "--save" || arg === "save") save = true;
    else if (arg === "--discard" || arg === "discard") save = false;
    else { this.log("usage: close --save | close --discard", COL.red); return; }

    // clear the on-canvas items either way
    Object.values(this.items).forEach((it) => it.container.destroy());
    this.items = {};
    this.selectedId = null;
    if (!save) this.connections = []; // discard: undo all wiring
    this.graphOpen = false;
    this.redrawConnections();
    this.updateDisplay();
    this.graphPlaceholder.setText("run  rqt_graph  to open").setVisible(true);
    if (save) {
      this.log("rqt_graph closed \u2014 workspace cleared, links saved (graph still running).", COL.grey);
      this.checkTutorial("close_save");
    } else {
      this.log("rqt_graph closed \u2014 all connections discarded.", COL.grey);
    }
  }

  cmdRemove(name) {
    if (!name) { this.log("usage: remove <node-or-topic>", COL.red); return; }
    const item = this.items[name];
    if (!item) { this.log(name + " isn't on the graph.", COL.red); return; }
    // drop any connections touching it
    this.connections = this.connections.filter((c) => c.from !== name && c.to !== name);
    if (this.selectedId === name) this.selectedId = null;
    item.container.destroy();
    delete this.items[name];
    this.redrawConnections();
    this.updateDisplay();
    this.log("removed " + name + " from the graph.", COL.grey);
    if (Object.keys(this.items).length === 0) {
      this.graphPlaceholder.setText("empty \u2014 use  import <name>").setVisible(true);
    }
  }

  // ------------------------------------------------------------- graph items
  addGraphItem(name, type) {
    const count = Object.keys(this.items).length;
    // stagger initial placement inside the graph panel
    const x = 640 + (count % 2) * 190;
    const y = 70 + Math.floor(count) * 70;

    const def = type === "node" ? CATALOG.nodes[name] : CATALOG.topics[name];
    const w = type === "node" ? 138 : 118;
    const h = type === "node" ? 34 : 30;
    const container = this.add.container(x, y);

    let shape;
    if (type === "node") {
      shape = this.add.graphics();
      this.drawNodeShape(shape, w, h, false);
    } else {
      shape = this.add.rectangle(0, 0, w, h, HEX.topicFill).setStrokeStyle(2, HEX.topic);
    }
    const label = this.add.text(0, 0, name,
      tstyle(type === "node" ? COL.cyan : "#8ec7ff", "14px")
    ).setOrigin(0.5);
    container.add([shape, label]);
    // pad the hit area a little so items are easy to grab
    const pad = 8;
    container.setSize(w + pad, h + pad);
    container.setInteractive(new Phaser.Geom.Rectangle(-(w + pad) / 2, -(h + pad) / 2, w + pad, h + pad), Phaser.Geom.Rectangle.Contains);

    const item = { id: name, type, container, shape, w, h, moved: false,
      inputs: def.inputs, outputs: def.outputs };

    container.on("pointerdown", (pointer) => {
      this.grabbed = item;
      item.moved = false;
      this.grabOffset = { x: container.x - pointer.x, y: container.y - pointer.y };
      this.grabStart = { x: pointer.x, y: pointer.y };
    });

    this.items[name] = item;
    this.redrawConnections();
  }

  drawNodeShape(g, w, h, selected) {
    g.clear();
    g.lineStyle(selected ? 3 : 2, selected ? HEX.white : HEX.teal, 1);
    g.fillStyle(HEX.nodeFill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }

  setItemSelected(item, sel) {
    if (item.type === "node") this.drawNodeShape(item.shape, item.w, item.h, sel);
    else item.shape.setStrokeStyle(sel ? 3 : 2, sel ? HEX.white : HEX.topic);
  }

  onItemClick(item) {
    if (this.selectedId === null) {
      this.selectedId = item.id;
      this.setItemSelected(item, true);
      return;
    }
    if (this.selectedId === item.id) {
      this.setItemSelected(item, false);
      this.selectedId = null;
      return;
    }
    const a = this.items[this.selectedId];
    const b = item;
    this.setItemSelected(a, false);
    this.selectedId = null;
    this.tryConnect(a, b);
  }

  // a = first clicked (source, supplies output); b = second (dest, receives input)
  tryConnect(a, b) {
    if (a.type === b.type) {
      const msg = a.type === "node"
        ? "nodes don't connect to each other — wire them through a topic."
        : "topics don't connect to topics.";
      this.log(msg, COL.red);
      return;
    }
    // toggle off if this exact directional link already exists
    const idx = this.connections.findIndex((c) => c.from === a.id && c.to === b.id);
    if (idx >= 0) {
      this.connections.splice(idx, 1);
      this.log("disconnected " + a.id + " \u2192 " + b.id, COL.grey);
      this.redrawConnections();
      this.updateDisplay();
      return;
    }
    // interface compatibility check (directional)
    const matched = a.outputs.filter((x) => b.inputs.includes(x));
    if (a.outputs.length === 0) {
      this.log(a.id + " has no outputs — click the SOURCE (publisher) first.", COL.red);
      return;
    }
    if (matched.length === 0) {
      this.log("interface mismatch: " + a.id + " sends [" + a.outputs.join(", ") + "]", COL.red);
      this.log("  but " + b.id + " accepts [" + (b.inputs.join(", ") || "nothing") + "]", COL.red);
      return;
    }
    this.connections.push({ from: a.id, to: b.id, type: matched[0] });
    this.log(a.id + " \u2192 " + b.id + "  [" + matched[0] + "]", COL.green);
    this.redrawConnections();
    this.updateDisplay();
    this.checkTutorial("connect");
  }

  hasConnDir(from, to) {
    return this.connections.some((c) => c.from === from && c.to === to);
  }

  redrawConnections() {
    const g = this.graphGfx;
    g.clear();
    this.connections.forEach((c) => {
      const ia = this.items[c.from], ib = this.items[c.to];
      if (!ia || !ib) return;
      const x1 = ia.container.x, y1 = ia.container.y;
      const x2 = ib.container.x, y2 = ib.container.y;
      g.lineStyle(2.5, HEX.good, 1);
      g.lineBetween(x1, y1, x2, y2);
      // direction arrow at the midpoint
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const px = -uy, py = ux;
      const tipX = mx + ux * 9, tipY = my + uy * 9;
      g.fillStyle(HEX.good, 1);
      g.fillTriangle(
        tipX, tipY,
        mx - ux * 5 + px * 6, my - uy * 5 + py * 6,
        mx - ux * 5 - px * 6, my - uy * 5 - py * 6
      );
    });
  }

  // ------------------------------------------------------------- display
  // reveal depends on the SAVED wiring, not on what's currently on the canvas,
  // so a 'close --save' keeps the display alive with the workspace emptied.
  isRevealed() {
    return this.hasConnDir("lidar_node", "/scan") && this.hasConnDir("/scan", "display_node");
  }

  rectSegs(x, y, w, h) {
    const s = [];
    const add = (x1, y1, x2, y2) => s.push({ x1, y1, x2, y2, len: Math.hypot(x2 - x1, y2 - y1) });
    add(x, y, x + w, y);
    add(x + w, y, x + w, y + h);
    add(x + w, y + h, x, y + h);
    add(x, y + h, x, y);
    return s;
  }

  sampleSegs(segs) {
    const pts = [];
    segs.forEach((seg) => {
      const steps = Math.max(2, Math.floor(seg.len / 9));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({ x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t });
      }
    });
    return pts;
  }

  // room walls + obstacles, in WORLD coordinates (rover roams inside)
  computeScanPoints() {
    let segs = this.rectSegs(WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY);
    OBSTACLES.forEach((o) => { segs = segs.concat(this.rectSegs(o.x, o.y, o.w, o.h)); });
    return this.sampleSegs(segs);
  }

  // is the rover (a small box) overlapping any solid rect at world (x,y)?
  collides(x, y) {
    const r = 11;
    return this.solidRects.some(
      (o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h
    );
  }

  // interactable structures: white by default is for plain scenery; these get
  // colored red (not operational) or green (operational)
  buildWorldObjects() {
    const half = CHARGER.size / 2;
    const pts = this.sampleSegs(this.rectSegs(CHARGER.wx - half, CHARGER.wy - half, CHARGER.size, CHARGER.size));
    return [{ id: "charger", operational: () => this.isChargerOperational(), points: pts }];
  }

  isChargerOperational() {
    return false; // wired up in a later step
  }

  // world point -> screen (rover stays centered; world scrolls under it)
  plotPoint(g, wx, wy) {
    const sx = RCX + (wx - this.rover.worldX);
    const sy = RCY + (wy - this.rover.worldY);
    if (sx < VIEW.x1 || sx > VIEW.x2 || sy < VIEW.y1 || sy > VIEW.y2) return;
    g.fillCircle(sx, sy, 1.6);
  }

  updateDisplay() {
    const g = this.displayGfx;
    g.clear();

    if (this.isRevealed()) {
      this.displayText.setVisible(false);
      // plain scenery = white
      g.fillStyle(HEX.white, 1);
      this.scanPoints.forEach((p) => this.plotPoint(g, p.x, p.y));
      // interactables = green (operational) / red (not)
      this.worldObjects.forEach((o) => {
        g.fillStyle(o.operational() ? HEX.good : HEX.bad, 1);
        o.points.forEach((p) => this.plotPoint(g, p.x, p.y));
      });
      // faint scan rays radiating from the (centered) rover
      g.lineStyle(1, HEX.teal, 0.10);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        g.lineBetween(RCX, RCY, RCX + Math.cos(a) * 240, RCY + Math.sin(a) * 150);
      }
      this.scanReady = true;
    } else {
      this.displayText.setText("no sensor data").setColor(COL.dim).setVisible(true);
      this.scanReady = false;
    }
    this.drawRover(g, RCX, RCY, this.rover.angle);
  }

  drawRover(g, cx, cy, angle = 0) {
    const s = 20;
    g.fillStyle(HEX.nodeFill, 1);
    g.lineStyle(2, HEX.good, 1);
    g.fillRect(cx - s / 2, cy - s / 2, s, s);
    g.strokeRect(cx - s / 2, cy - s / 2, s, s);
    // heading tick points the way the rover is driving
    g.lineBetween(cx, cy, cx + Math.cos(angle) * (s / 2 + 5), cy + Math.sin(angle) * (s / 2 + 5));
  }

  canDrive() {
    return this.hasConnDir("teleop_node", "/cmd_vel") && this.hasConnDir("/cmd_vel", "base_controller");
  }



  // ------------------------------------------------------------- tutorial
  runTutorial(step) {
    this.tutorialStep = step;
    const S = this.tutorialScript()[step];
    if (!S) return;
    this.printLines(S.lines);
  }

  checkTutorial(action) {
    const S = this.tutorialScript()[this.tutorialStep];
    if (!S || !S.done) return;
    if (S.done(action)) {
      this.runTutorial(this.tutorialStep + 1);
    }
  }

  tutorialScript() {
    const cy = COL.cyan, dm = COL.dim, am = COL.amber, gr = COL.green;
    return [
      { // 0 — help first
        lines: [
          ["[ ROVER-RELINK :: ROS2 SANDBOX ]", cy],
          ["The rover is online but its nodes aren't sharing data.", cy],
          ["", dm],
          ["This is a terminal. See what commands you have:", cy],
          ["  help", gr],
        ],
        done: (a) => a === "help",
      },
      { // 1
        lines: [
          ["Good — that's your toolkit.", cy],
          ["Every running program is a NODE. List the ones running:", cy],
          ["  ros2 node list", gr],
        ],
        done: (a) => a === "node_list",
      },
      { // 2
        lines: [
          ["Those are your nodes.", cy],
          ["Nodes share data over named channels: TOPICS. List them:", cy],
          ["  ros2 topic list", gr],
        ],
        done: (a) => a === "topic_list",
      },
      { // 3
        lines: [
          ["/scan is the LiDAR's output topic.", cy],
          ["rqt_graph shows the graph of nodes and topics.", cy],
          ["NOTE: the real rqt_graph only DISPLAYS the graph —", am],
          ["you can't edit it there. This game's version can.", am],
          ["Open it:", cy],
          ["  rqt_graph", gr],
        ],
        done: (a) => a === "rqt",
      },
      { // 4 — import (mention remove)
        lines: [
          ["That panel (top-right) is your interactive graph.", cy],
          ["'import' is GAME-ONLY (not real ROS2); it drops an", am],
          ["item on the canvas. 'remove <name>' takes one off.", am],
          ["Import the LiDAR node:", cy],
          ["  import lidar_node", gr],
        ],
        done: (a) => a === "import:lidar_node",
      },
      { // 5
        lines: [
          ["Nice — drag it around. Now import the topic it uses:", cy],
          ["  import /scan", gr],
        ],
        done: (a) => a === "import:/scan",
      },
      { // 6
        lines: [
          ["And the node that will show the scan:", cy],
          ["  import display_node", gr],
        ],
        done: (a) => a === "import:display_node",
      },
      { // 7 — connect
        lines: [
          ["Key idea: nodes NEVER connect directly to each other.", cy],
          ["A node PUBLISHES to a topic; others SUBSCRIBE to it.", cy],
          ["Click one item, then another, to wire them.", cy],
          ["Connect  lidar_node → /scan , then  /scan → display_node", gr],
        ],
        done: () => this.isRevealed(),
      },
      { // 8 — save & close
        lines: [
          ["◆ Link established. display_node subscribes to /scan.", gr],
          ["Watch the display: the LiDAR is streaming its scan.", gr],
          ["Nobody requested it — LiDAR publishes, display listens.", cy],
          ["", dm],
          ["Let's clear the canvas but KEEP this work. 'close --save'", am],
          ["is GAME-ONLY; it empties the workspace, links stay live.", am],
          ["  close --save", gr],
        ],
        done: (a) => a === "close_save",
      },
      { // 9 — movement: intro + inspect first node
        lines: [
          ["Let's build the movement controller. You'll need three", cy],
          ["components:", cy],
          ["  teleop_node      publishes your key presses", cy],
          ["  /cmd_vel         the topic they travel on", cy],
          ["  base_controller  drives the wheels", cy],
          ["First, see how a node works:", cy],
          ["  ros2 node info teleop_node", gr],
        ],
        done: (a) => a === "nodeinfo:teleop_node",
      },
      { // 10 — explain node info, inspect second node
        lines: [
          ["Read that output top-down:", cy],
          ["  Subscribers (inputs)  = messages it RECEIVES", cy],
          ["  Publishers (outputs)  = messages it SENDS", cy],
          ["So teleop_node SENDS geometry_msgs/Twist.", cy],
          ["Now inspect the other node the same way:", cy],
          ["  ros2 node info base_controller", gr],
        ],
        done: (a) => a === "nodeinfo:base_controller",
      },
      { // 11 — inspect the topic
        lines: [
          ["base_controller SUBSCRIBES to Twist — it receives.", cy],
          ["A topic carries ONE message type. Inspect it:", cy],
          ["  ros2 topic info /cmd_vel", gr],
          ["'Type:' is the interface the topic carries;", cy],
          ["the counts show how many pubs/subs are attached.", cy],
        ],
        done: (a) => a === "topicinfo:/cmd_vel",
      },
      { // 12 — wire it (open-ended)
        lines: [
          ["You now know each node's inputs/outputs and the", cy],
          ["topic's type. A link works when an output type meets", cy],
          ["a matching input type. Import all three and wire:", cy],
          ["  teleop_node → /cmd_vel → base_controller", gr],
        ],
        done: () => this.canDrive(),
      },
      { // 13 — done
        lines: [
          ["◆ base_controller is live — drive with the ARROW keys!", gr],
          ["Publishing to /cmd_vel is how you command the robot.", cy],
          ["Sandbox is open — explore freely.", cy],
        ],
        done: null,
      },
    ];
  }

  // ------------------------------------------------------- terminal printing
  printLines(segsArr) {
    this.locked = true;
    this._typeQueue = segsArr.slice();
    this.typeNext();
  }

  typeNext() {
    if (!this._typeQueue || this._typeQueue.length === 0) {
      this.locked = false;
      this.renderInput();
      return;
    }
    const [text, color] = this._typeQueue.shift();
    if (text === "") { this.pushLine([{ t: "", c: color }]); this.time.delayedCall(60, () => this.typeNext()); return; }
    const line = [{ t: "", c: color }];
    this.lines.push(line);
    let ci = 0;
    this.time.addEvent({
      delay: 9,
      repeat: text.length - 1,
      callback: () => {
        ci++;
        line[0].t = text.slice(0, ci);
        this.renderTerminal();
        if (ci >= text.length) this.time.delayedCall(110, () => this.typeNext());
      },
    });
  }

  log(text, color) { this.pushLine([{ t: text, c: color || COL.grey }]); }

  pushLine(segs) {
    this.lines.push(segs);
    this.renderTerminal();
  }

  maxLines() {
    return Math.floor((INPUT_Y - 6 - LINES_TOP) / LINEH);
  }

  renderTerminal() {
    this.lineObjs.forEach((o) => o.destroy());
    this.lineObjs = [];
    const visible = this.lines.slice(-this.maxLines());
    let y = LINES_TOP;
    visible.forEach((segs) => {
      let x = TERM_X;
      segs.forEach((s) => {
        const t = this.add.text(x, y, s.t, tstyle(s.c));
        this.lineObjs.push(t);
        x += t.width; // advance by real rendered width
      });
      y += LINEH;
    });
    this.renderInput();
  }

  renderInput() {
    this.inputObjs.forEach((o) => o.destroy());
    this.inputObjs = [];
    if (this.locked) {
      const t = this.add.text(TERM_X, INPUT_Y, PROMPT + "▍ (reading…)", tstyle(COL.dim));
      this.inputObjs.push(t);
      return;
    }
    const p = this.add.text(TERM_X, INPUT_Y, PROMPT, tstyle(COL.green));
    const inp = this.add.text(TERM_X + p.width, INPUT_Y, this.inputStr, tstyle(COL.white));
    this.inputObjs.push(p, inp);
    if (this.cursorOn) {
      const cur = this.add.text(TERM_X + p.width + inp.width, INPUT_Y, "\u2588", tstyle(COL.white));
      this.inputObjs.push(cur);
    }
  }

  update() {
    if (!this.canDrive()) return;
    if (!this.driveHintShown) {
      this.driveHintShown = true;
      this.log("base_controller is live \u2014 drive the rover with the ARROW keys.", COL.green);
    }
    const k = this.keys;
    let dx = 0, dy = 0;
    const sp = 2.2;
    if (k.aleft.isDown) dx -= sp;
    if (k.aright.isDown) dx += sp;
    if (k.aup.isDown) dy -= sp;
    if (k.adown.isDown) dy += sp;
    if (dx === 0 && dy === 0) return;
    const m = 16;
    // move each axis independently, blocking into walls (clamp) and solids (collision)
    const nx = Phaser.Math.Clamp(this.rover.worldX + dx, WORLD.minX + m, WORLD.maxX - m);
    if (!this.collides(nx, this.rover.worldY)) this.rover.worldX = nx;
    const ny = Phaser.Math.Clamp(this.rover.worldY + dy, WORLD.minY + m, WORLD.maxY - m);
    if (!this.collides(this.rover.worldX, ny)) this.rover.worldY = ny;
    this.rover.angle = Math.atan2(dy, dx);
    this.updateDisplay();
  }
}
