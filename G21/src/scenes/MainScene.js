// MainScene.js
//
// GAME: Packet Router
//
// Learning objective (capability-level): the player can route a packet
// through a small network by driving it DOWN the 5-layer TCP/IP stack at the
// source, ACROSS a wire, only as far UP as each intermediate device needs, and
// all the way UP at the destination -- AND can make the routing decision at a
// router's Network layer (which link reaches the destination's network).
//
// Mechanic-concept relationship (intrinsic):
//  * Moving the packet DOWN a device's stack literally ADDS a header chip
//    (encapsulation); moving UP STRIPS one (decapsulation) -- the player
//    watches the packet grow/shrink.
//  * The one real decision is at a ROUTER's Network layer: read which network
//    each outgoing link reaches and forward toward the destination. That is
//    exactly (and only) what layer 3 does. Hosts/switches have no such choice.
//  * Routers/switches are drawn without their upper layers (ghosted), so
//    climbing too high, forwarding before routing, skipping a layer,
//    transmitting from the wrong layer, or forwarding the WRONG way all add
//    latency with a diagnostic message.
//
// Score = accumulated latency (ms). The clock does NOT run while the player
// thinks; time is only added by moves (small) and mistakes (large).

import { LAYERS, DEVICE_MAX, DEVICE_LABEL, SCENARIOS } from "../scenarios.js";

const STEP_MS = 5;
const HOP_MS = 20;
const MISTAKE_MS = 100;

// Main stack (left) geometry
const CELL_W = 168;
const CELL_H = 46;
const STACK_X = 40; // left edge of stack
const STACK_TOP = 120; // y of the top (Application) cell

// Overview panel (right) geometry
const OV_X = 430;
const OV_Y = 120;
const OV_W = 520;
const OV_H = 250;
const NODE_W = 104;
const NODE_H = 52;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.order = Phaser.Utils.Array.Shuffle([...Array(SCENARIOS.length).keys()]);
    this.roundIdx = 0;
    this.totalScore = 0;
    this.roundsWon = 0;
    this.mistakes = 0;
    this.checkpointsCorrect = 0;

    this.hudText = this.add.text(20, 12, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#e8eaed",
    });
    this.goalText = this.add.text(20, 38, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#9be7c4",
      wordWrap: { width: 940 },
    });
    this.msgText = this.add.text(20, 470, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "17px",
      color: "#ffd479",
      wordWrap: { width: 940 },
    });

    this.buildLegend();
    this.startRound();
  }

  buildLegend() {
    const y0 = 560;
    this.add.text(20, y0 - 26, "Layer jobs (top = Application, bottom = Physical):", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#c3c9d1",
    });
    LAYERS.slice()
      .reverse()
      .forEach((L, i) => {
        const y = y0 + i * 26;
        this.add.text(20, y, "\u25A0", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          color: "#" + L.color.toString(16).padStart(6, "0"),
        });
        this.add.text(40, y, `${L.name}: ${L.job}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#c3c9d1",
        });
      });
  }

  // ---------------------------------------------------------------- round ---
  startRound() {
    if (this.roundLayer) this.roundLayer.destroy(true);
    this.packet = null;
    this.roundLayer = this.add.container(0, 0);

    const sc = SCENARIOS[this.order[this.roundIdx]];
    this.sc = sc;
    this.byId = {};
    sc.nodes.forEach((n) => (this.byId[n.id] = n));

    // adjacency
    this.adj = {};
    sc.nodes.forEach((n) => (this.adj[n.id] = []));
    sc.edges.forEach(([a, b]) => {
      this.adj[a].push(b);
      this.adj[b].push(a);
    });

    // BFS distance from destination (for routing correctness + par)
    this.distFromDest = this.bfsDist(sc.dest);

    // state
    this.cur = { node: sc.source, layer: 4 };
    this.reachedMax = {};
    sc.nodes.forEach((n) => (this.reachedMax[n.id] = false));
    this.reachedMax[sc.source] = true; // source starts at App (its max)
    // header origins: which device added each currently-attached header.
    // App/Transport/Network are end-to-end (stamped at source, untouched by
    // routers); Link is hop-by-hop (rewritten at every device that forwards).
    this.hdr = { transport: null, network: null, link: null };
    this.appOrigin = this.byId[sc.source].name;
    this.roundScore = 0;
    this.done = false;

    this.optimal = this.computeOptimal();
    this.par = this.optimal + 40;

    this.computeOverviewLayout();
    this.drawOverview();
    this.refreshStack();
    this.updateHud();

    const destNode = this.byId[sc.dest];
    this.goalText.setText(
      `Round ${this.roundIdx + 1}/${SCENARIOS.length}:  Deliver ${sc.payload} to "${destNode.name}" (${destNode.net}).`
    );
    this.setMsg(
      "Encapsulate: move the packet DOWN to Physical (watch the headers stack up), then send it across a wire.",
      "#9be7c4"
    );
  }

  bfsDist(from) {
    const dist = { [from]: 0 };
    const q = [from];
    while (q.length) {
      const u = q.shift();
      this.adj[u].forEach((v) => {
        if (dist[v] === undefined) {
          dist[v] = dist[u] + 1;
          q.push(v);
        }
      });
    }
    return dist;
  }

  // hosts reachable from `start` without going back through `blocked`
  reachableNets(start, blocked) {
    const seen = { [blocked]: true, [start]: true };
    const nets = new Set();
    const q = [start];
    while (q.length) {
      const u = q.shift();
      const node = this.byId[u];
      if (node.type === "host" && node.net) nets.add(node.net);
      this.adj[u].forEach((v) => {
        if (!seen[v]) {
          seen[v] = true;
          q.push(v);
        }
      });
    }
    return [...nets];
  }

  computeOptimal() {
    // shortest node path source->dest
    const prev = {};
    const q = [this.sc.source];
    const seen = { [this.sc.source]: true };
    while (q.length) {
      const u = q.shift();
      if (u === this.sc.dest) break;
      this.adj[u].forEach((v) => {
        if (!seen[v]) {
          seen[v] = true;
          prev[v] = u;
          q.push(v);
        }
      });
    }
    const path = [this.sc.dest];
    while (path[0] !== this.sc.source) path.unshift(prev[path[0]]);
    this.pathIds = path; // node ids on the delivered route (for the checkpoint)

    let steps = 0;
    path.forEach((id, i) => {
      const max = DEVICE_MAX[this.byId[id].type];
      if (i === 0 || i === path.length - 1) steps += max; // descend / final ascend
      else steps += 2 * max; // up to max, back down
    });
    return steps * STEP_MS + (path.length - 1) * HOP_MS;
  }

  // ------------------------------------------------------------- overview ---
  computeOverviewLayout() {
    const xs = this.sc.nodes.map((n) => n.gx);
    const ys = this.sc.nodes.map((n) => n.gy);
    const minx = Math.min(...xs),
      maxx = Math.max(...xs);
    const miny = Math.min(...ys),
      maxy = Math.max(...ys);
    const spanx = Math.max(1, maxx - minx);
    const spany = Math.max(1, maxy - miny);
    this.nodePos = {};
    this.sc.nodes.forEach((n) => {
      const px = OV_X + 60 + ((n.gx - minx) / spanx) * (OV_W - 120);
      const py = OV_Y + 40 + ((n.gy - miny) / spany) * (OV_H - 90);
      this.nodePos[n.id] = { x: px, y: py };
    });
  }

  drawOverview() {
    this.add
      .rectangle(OV_X + OV_W / 2, OV_Y + OV_H / 2, OV_W, OV_H)
      .setStrokeStyle(1, 0x2c313a)
      .setFillStyle(0x191c21, 0.5);
    const title = this.add.text(OV_X + 8, OV_Y + 6, "NETWORK", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#6b7280",
    });
    this.roundLayer.add(title);

    // edges
    this.sc.edges.forEach(([a, b]) => {
      const pa = this.nodePos[a];
      const pb = this.nodePos[b];
      const line = this.add.line(0, 0, pa.x, pa.y, pb.x, pb.y, 0x556070);
      line.setLineWidth(3).setOrigin(0, 0);
      this.roundLayer.add(line);
    });

    // node boxes
    this.nodeRefs = {};
    this.sc.nodes.forEach((n) => {
      const p = this.nodePos[n.id];
      const box = this.add
        .rectangle(p.x, p.y, NODE_W, NODE_H, 0x22262d)
        .setStrokeStyle(2, 0x3a4049)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => this.onNodeClick(n.id));
      const badge = this.add
        .text(p.x, p.y - 12, DEVICE_LABEL[n.type], {
          fontFamily: "system-ui, sans-serif",
          fontSize: "10px",
          color: "#9aa0a8",
        })
        .setOrigin(0.5);
      const name = this.add
        .text(p.x, p.y + 4, n.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e8eaed",
        })
        .setOrigin(0.5);
      const net = this.add
        .text(p.x, p.y + 18, n.net || "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: "#9be7c4",
        })
        .setOrigin(0.5);
      [box, badge, name, net].forEach((o) => this.roundLayer.add(o));

      // link label (which nets are reachable that way) -- shown when routing
      const label = this.add
        .text(p.x, p.y + NODE_H / 2 + 8, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: "#ffd479",
          align: "center",
        })
        .setOrigin(0.5, 0);
      this.roundLayer.add(label);

      this.nodeRefs[n.id] = { box, label };
    });
    this.refreshOverview();
  }

  refreshOverview() {
    const routingNow =
      this.byId[this.cur.node].type === "router" &&
      this.cur.layer === DEVICE_MAX["router"];
    this.sc.nodes.forEach((n) => {
      const ref = this.nodeRefs[n.id];
      let stroke = 0x3a4049;
      if (n.id === this.cur.node) stroke = 0xffffff;
      else if (n.id === this.sc.dest) stroke = 0x10b981;
      ref.box.setStrokeStyle(n.id === this.cur.node ? 3 : 2, stroke);

      // neighbor link labels: show reachable nets when a router is deciding
      const isNeighbor = this.adj[this.cur.node].includes(n.id);
      if (routingNow && isNeighbor) {
        const nets = this.reachableNets(n.id, this.cur.node);
        ref.label.setText("reaches: " + (nets.join(", ") || "(no host)"));
      } else {
        ref.label.setText("");
      }
    });
  }

  // ----------------------------------------------------------- main stack ---
  refreshStack() {
    if (this.stackLayer) this.stackLayer.destroy(true);
    this.stackLayer = this.add.container(0, 0);
    this.roundLayer.add(this.stackLayer);

    const node = this.byId[this.cur.node];
    const max = DEVICE_MAX[node.type];

    // heading
    const head = this.add.text(STACK_X, STACK_TOP - 30, `At: ${node.name}  [${DEVICE_LABEL[node.type]}]`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#e8eaed",
    });
    this.stackLayer.add(head);

    // NOTE: every layer is drawn identically -- we intentionally do NOT grey
    // out the layers a device lacks. The player must KNOW that a router tops
    // out at Network / a switch at Link, and gets penalized for climbing too
    // high, rather than being shown the answer visually. (`max` is still used
    // by onLayerClick to decide the penalty.)
    void max;
    for (let L = 4; L >= 0; L--) {
      const y = STACK_TOP + (4 - L) * CELL_H;
      const info = LAYERS[L];
      const rect = this.add
        .rectangle(STACK_X + CELL_W / 2, y + CELL_H / 2, CELL_W, CELL_H - 4)
        .setStrokeStyle(2, L === this.cur.layer ? 0xffffff : 0x2c313a);
      rect.setFillStyle(info.color, 0.22);
      rect.setInteractive({ useHandCursor: true });
      rect.on("pointerdown", () => this.onLayerClick(L));
      const label = this.add
        .text(STACK_X + 12, y + CELL_H / 2, info.short, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#e8eaed",
        })
        .setOrigin(0, 0.5);
      this.stackLayer.add(rect);
      this.stackLayer.add(label);
    }

    // packet token on the current layer
    const py = STACK_TOP + (4 - this.cur.layer) * CELL_H + CELL_H / 2;
    this.packet = this.add.circle(STACK_X + CELL_W - 22, py, 11, 0xffffff);
    this.packet.setStrokeStyle(3, 0x1d1f24);
    this.stackLayer.add(this.packet);

    this.drawHeaderChips();
  }

  // headers attached are a pure function of current layer:
  // header for layer d (Transport/Network/Link) is on iff cur.layer <= d
  drawHeaderChips() {
    const chipX = STACK_X + CELL_W + 16;
    const title = this.add.text(chipX, STACK_TOP - 30, "PACKET CONTENTS", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      color: "#9aa0a8",
    });
    this.stackLayer.add(title);

    // outermost (Link) first, down to the App data payload at the core
    const rows = [];
    if (this.hdr.link)
      rows.push({ text: `Link header \u2190 ${this.hdr.link}`, color: LAYERS[1].color });
    if (this.hdr.network)
      rows.push({ text: `Network header \u2190 ${this.hdr.network}`, color: LAYERS[2].color });
    if (this.hdr.transport)
      rows.push({ text: `Transport header \u2190 ${this.hdr.transport}`, color: LAYERS[3].color });
    rows.push({ text: `App data \u2190 ${this.appOrigin}`, color: LAYERS[4].color });

    let y = STACK_TOP;
    rows.forEach((r) => {
      const w = 198;
      const rect = this.add
        .rectangle(chipX + w / 2, y + 16, w, 26, r.color, 0.35)
        .setStrokeStyle(1, r.color);
      const t = this.add
        .text(chipX + 10, y + 16, r.text, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e8eaed",
        })
        .setOrigin(0, 0.5);
      this.stackLayer.add(rect);
      this.stackLayer.add(t);
      y += 30;
    });

    if (this.cur.layer === 0) {
      const onwire = this.add.text(chipX, y + 6, "\u2192 on the wire as raw bits", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#8b5cf6",
      });
      this.stackLayer.add(onwire);
    }
  }

  // -------------------------------------------------------------- actions ---
  onLayerClick(layer) {
    if (this.done) return;
    const node = this.byId[this.cur.node];
    const max = DEVICE_MAX[node.type];
    if (layer === this.cur.layer) return;

    if (Math.abs(layer - this.cur.layer) !== 1) {
      this.penalize("You can't skip layers -- a packet is processed one layer at a time.");
      return;
    }
    if (layer > max) {
      this.penalize(
        `A ${DEVICE_LABEL[node.type]} has no ${LAYERS[layer].name} layer -- it only processes up to ${LAYERS[max].name}, so it never reads the ${LAYERS[layer].name} data.`
      );
      return;
    }
    const goingUp = layer > this.cur.layer;
    if (layer === max) this.reachedMax[this.cur.node] = true;
    this.adjustHeaders(layer, goingUp);

    if (this.cur.node === this.sc.dest && layer === 4) {
      this.applyMove(layer, STEP_MS);
      this.finishRound();
      return;
    }
    this.applyMove(layer, STEP_MS, goingUp ? LAYERS[layer].up : LAYERS[layer].down);
  }

  // Update header origins as the packet moves one layer.
  // Going DOWN to layer L attaches L's header (stamped by the current node).
  // Going UP to layer L strips the header of layer L-1.
  adjustHeaders(layer, goingUp) {
    const here = this.byId[this.cur.node].name;
    if (goingUp) {
      const d = layer - 1;
      if (d === 1) this.hdr.link = null;
      if (d === 2) this.hdr.network = null;
      if (d === 3) this.hdr.transport = null;
    } else {
      if (layer === 3) this.hdr.transport = here;
      if (layer === 2) this.hdr.network = here;
      if (layer === 1) this.hdr.link = here;
    }
  }

  onNodeClick(id) {
    if (this.done) return;
    if (id === this.cur.node) return;

    if (!this.adj[this.cur.node].includes(id)) {
      this.penalize("Those devices aren't directly connected -- you can only send to a neighbor on the wire.");
      return;
    }
    if (this.cur.layer !== 0) {
      this.penalize("Devices talk as raw bits. Go DOWN to Physical before transmitting across the wire.");
      return;
    }
    if (!this.reachedMax[this.cur.node]) {
      const type = this.byId[this.cur.node].type;
      const maxName = LAYERS[DEVICE_MAX[type]].name;
      this.penalize(
        `This ${DEVICE_LABEL[type]} must climb up to its ${maxName} layer to process the packet before forwarding, then come back down.`
      );
      return;
    }
    // routing correctness: does this link make progress toward the destination?
    if (this.distFromDest[id] >= this.distFromDest[this.cur.node]) {
      const nets = this.reachableNets(id, this.cur.node);
      this.penalize(
        `Wrong link. That way only reaches ${nets.join(", ") || "a dead end"} -- you need ${this.byId[this.sc.dest].net}. Read the "reaches:" labels at the Network layer.`
      );
      return;
    }
    // valid hop
    this.reachedMax[id] = false;
    this.cur = { node: id, layer: 0 };
    this.roundScore += HOP_MS;
    this.setMsg(
      `Forwarded to "${this.byId[id].name}" as raw bits. Climb up only as far as this device needs.`,
      "#9be7c4"
    );
    this.refreshStack();
    this.refreshOverview();
    this.updateHud();
  }

  applyMove(layer, cost, msg) {
    this.cur = { ...this.cur, layer };
    this.roundScore += cost;
    if (msg) this.setMsg(msg, "#9be7c4");
    this.refreshStack();
    this.refreshOverview();
    this.updateHud();
  }

  penalize(msg) {
    this.roundScore += MISTAKE_MS;
    this.mistakes += 1;
    this.setMsg(`\u26A0 +${MISTAKE_MS}ms  ${msg}`, "#ff8a8a");
    this.updateHud();
    if (this.packet) {
      this.tweens.add({ targets: this.packet, scale: { from: 1.5, to: 1 }, duration: 250 });
    }
  }

  finishRound() {
    this.done = true;
    this.totalScore += this.roundScore;
    this.roundWon = this.roundScore <= this.par;
    if (this.roundWon) this.roundsWon += 1;
    this.verdict = this.roundWon
      ? `\u2714 Delivered under par! (${this.roundScore}ms \u2264 ${this.par}ms par)`
      : `Delivered, but slow: ${this.roundScore}ms (par ${this.par}ms). Fewer wrong moves = lower latency.`;
    this.setMsg("Delivered! One question before you move on \u2193", "#9be7c4");
    this.updateHud();
    this.showCheckpoint();
  }

  // --- "why" checkpoint: one question drawn from the round just played ---
  shuffledChoice(options, correctValue, explain, q) {
    const opts = Phaser.Utils.Array.Shuffle([...options]);
    return { q, options: opts, correctIdx: opts.indexOf(correctValue), explain };
  }

  buildCheckpoint() {
    const L = ["Application", "Transport", "Network", "Link", "Physical"];
    const H = ["App data", "Transport header", "Network header", "Link header"];
    const dest = this.byId[this.sc.dest];
    const routers = this.pathIds.filter((id) => this.byId[id].type === "router");
    const switches = this.pathIds.filter((id) => this.byId[id].type === "switch");
    const hops = this.pathIds.length - 1;
    const cands = [];

    if (routers.length) {
      const r = this.byId[Phaser.Utils.Array.GetRandom(routers)];
      cands.push(
        this.shuffledChoice(
          L.slice(0, 4),
          "Network",
          `Routers work at the Network layer (layer 3): they read the destination address to pick a route, and never open the Transport or Application data.`,
          `"${r.name}" is a ROUTER. How far UP its stack did it process this packet?`
        )
      );
    }
    if (switches.length) {
      const s = this.byId[Phaser.Utils.Array.GetRandom(switches)];
      cands.push(
        this.shuffledChoice(
          L.slice(0, 4),
          "Link",
          `A switch forwards using MAC addresses at the Link layer. It never looks at IP (Network) or anything above.`,
          `"${s.name}" is a SWITCH. How far UP its stack did it process this packet?`
        )
      );
    }
    if (hops >= 2) {
      cands.push(
        this.shuffledChoice(
          H,
          "Link header",
          `The Link (frame) header is hop-by-hop: every device strips the old frame and writes a new one for the next hop. The Transport/Network/App headers are end-to-end \u2014 set once at the source and untouched by routers.`,
          `Which part of the packet was rewritten at EVERY hop along the way?`
        )
      );
    }
    cands.push(
      this.shuffledChoice(
        L.slice(0, 4),
        "Application",
        `Only the true endpoints climb all the way to the Application layer, where the actual data is delivered to the program.`,
        `The destination "${dest.name}" read the packet UP to which layer?`
      )
    );
    cands.push(
      this.shuffledChoice(
        H,
        "Link header",
        `Going DOWN the stack, each layer wraps the one above it. The Link layer adds the outermost frame last, just before the bits go on the wire.`,
        `Going DOWN at the source, which header is added LAST (outermost), just before the bits hit the wire?`
      )
    );
    return Phaser.Utils.Array.GetRandom(cands);
  }

  showCheckpoint() {
    const cp = this.buildCheckpoint();
    this.cpLayer = this.add.container(0, 0).setDepth(300);
    const cx = 490;
    this.cpLayer.add(
      this.add
        .rectangle(cx, 380, 760, 400, 0x11141a, 0.97)
        .setStrokeStyle(2, 0x3a4049)
    );
    this.cpLayer.add(
      this.add
        .text(cx, 205, this.verdict, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: this.roundWon ? "#9be7c4" : "#ffd479",
          align: "center",
          wordWrap: { width: 700 },
        })
        .setOrigin(0.5)
    );
    this.cpLayer.add(
      this.add
        .text(cx, 228, "CHECKPOINT", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#9aa0a8",
        })
        .setOrigin(0.5)
    );
    this.cpLayer.add(
      this.add
        .text(cx, 250, cp.q, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "19px",
          color: "#e8eaed",
          align: "center",
          wordWrap: { width: 700 },
        })
        .setOrigin(0.5)
    );

    const letters = ["A", "B", "C", "D"];
    this.cpButtons = [];
    cp.options.forEach((opt, i) => {
      const y = 320 + i * 46;
      const btn = this.add
        .text(cx, y, `${letters[i]}.  ${opt}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "17px",
          color: "#e8eaed",
          backgroundColor: "#22262d",
          padding: { x: 14, y: 8 },
          fixedWidth: 420,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.onCheckpointAnswer(i, cp));
      this.cpLayer.add(btn);
      this.cpButtons.push(btn);
    });
  }

  onCheckpointAnswer(chosen, cp) {
    if (this.cpAnswered) return;
    this.cpAnswered = true;
    const correct = chosen === cp.correctIdx;
    if (correct) this.checkpointsCorrect += 1;
    this.cpButtons.forEach((b, i) => {
      b.disableInteractive();
      if (i === cp.correctIdx) b.setBackgroundColor("#1f6f4a");
      else if (i === chosen) b.setBackgroundColor("#7a2b2b");
    });
    const cx = 490;
    this.cpLayer.add(
      this.add
        .text(cx, 512, (correct ? "\u2714 Correct.  " : "\u2717 Not quite.  ") + cp.explain, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: correct ? "#9be7c4" : "#ffd479",
          align: "center",
          wordWrap: { width: 700 },
        })
        .setOrigin(0.5, 0)
    );

    const label = this.roundIdx + 1 >= SCENARIOS.length ? "[ See results ]" : "[ Next round \u2192 ]";
    const cont = this.add
      .text(cx, 590, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#1d1f24",
        backgroundColor: "#9be7c4",
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cont.on("pointerdown", () => {
      this.cpLayer.destroy(true);
      this.cpLayer = null;
      this.cpAnswered = false;
      this.roundIdx += 1;
      if (this.roundIdx >= SCENARIOS.length) this.endGame();
      else this.startRound();
    });
    this.cpLayer.add(cont);
  }

  endGame() {
    if (this.roundLayer) this.roundLayer.destroy(true);
    this.packet = null;
    this.goalText.setText("");
    this.setMsg("", "#fff");
    const cx = 490;
    this.add
      .text(cx, 220, "All packets delivered!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        290,
        `Rounds under par: ${this.roundsWon}/${SCENARIOS.length}\n` +
          `Checkpoints correct: ${this.checkpointsCorrect}/${SCENARIOS.length}\n` +
          `Total latency: ${this.totalScore}ms\n` +
          `Total mistakes: ${this.mistakes}`,
        { fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#9be7c4", align: "center" }
      )
      .setOrigin(0.5);
    const btn = this.add
      .text(cx, 380, "[ Play again ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#1d1f24",
        backgroundColor: "#9be7c4",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => this.scene.restart());
  }

  updateHud() {
    this.hudText.setText(
      `Latency this round: ${this.roundScore}ms   |   Par: ${this.par}ms   |   Total: ${this.totalScore}ms   |   Mistakes: ${this.mistakes}`
    );
  }

  setMsg(text, color) {
    this.msgText.setColor(color || "#ffd479");
    this.msgText.setText(text);
  }
}
