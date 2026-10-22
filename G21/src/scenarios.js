// scenarios.js
//
// Build-time content pool. Each scenario is a small NETWORK GRAPH the player
// routes a packet across, from `source` to `dest`. Variation lives here so the
// running game never needs an API: different topologies and branch choices
// mean the correct route differs every round and can't be memorized.
//
// The routing DECISION happens at the Network layer of a router: the player
// reads which network each outgoing link reaches and forwards toward the
// destination's network. Only routers make this choice (that's the network
// layer's job); hosts and switches just pass the packet along their one path.
//
// Device types and how far UP the stack they process a packet:
//   host   -> Application (4)  (true endpoints: create/consume data)
//   router -> Network     (2)  (route on network address, then send down)
//   switch -> Link        (1)  (forward within a link, then send down)
//
// Layer indices (bottom = 0):
//   0 Physical | 1 Link | 2 Network | 3 Transport | 4 Application

export const LAYERS = [
  {
    idx: 0,
    name: "Physical",
    short: "PHYSICAL",
    job: "Transmits raw bits (1s and 0s) as signals over the wire/medium.",
    down: "Physical: send the bits out as signals over the wire.",
    up: "Physical: receive raw bits off the wire.",
    color: 0x8b5cf6,
  },
  {
    idx: 1,
    name: "Link",
    short: "LINK",
    job: "Framing + MAC addressing between two directly-connected devices.",
    down: "Link: wrap the packet in a frame with source/dest MAC addresses.",
    up: "Link: strip the frame, confirm it was meant for this device.",
    color: 0x3b82f6,
  },
  {
    idx: 2,
    name: "Network",
    short: "NETWORK",
    job: "Logical (IP) addressing + routing: which link leads to the destination.",
    down: "Network: add the IP header (source + destination network address).",
    up: "Network: read the destination network and choose which link to forward on.",
    color: 0x10b981,
  },
  {
    idx: 3,
    name: "Transport",
    short: "TRANSPORT",
    job: "Segments data, port numbers, reliability (TCP/UDP).",
    down: "Transport: split into segments, add port numbers.",
    up: "Transport: reassemble segments, hand data to the right app port.",
    color: 0xf59e0b,
  },
  {
    idx: 4,
    name: "Application",
    short: "APPLICATION",
    job: "The actual data a program sends/reads (HTTP, DNS, email...).",
    down: "Application: hand the raw message down to be transported.",
    up: "Application: deliver the finished message to the program.",
    color: 0xef4444,
  },
];

export const DEVICE_MAX = { host: 4, router: 2, switch: 1 };
export const DEVICE_LABEL = { host: "HOST", router: "ROUTER", switch: "SWITCH" };

// Each scenario:
//   nodes: { id, type, name, net (hosts only), gx, gy }  -- gx/gy place the
//          node in the overview diagram (grid coords, mapped to pixels).
//   edges: [ [idA, idB], ... ]  -- undirected wires.
//   source, dest: node ids.
export const SCENARIOS = [
  {
    payload: "a chat message",
    source: "H1",
    dest: "H2",
    nodes: [
      { id: "H1", type: "host", name: "Your Laptop", net: "Net A", gx: 0, gy: 1 },
      { id: "H2", type: "host", name: "Friend's PC", net: "Net B", gx: 2, gy: 1 },
    ],
    edges: [["H1", "H2"]],
  },
  {
    payload: "a web request",
    source: "H1",
    dest: "H2",
    nodes: [
      { id: "H1", type: "host", name: "Your Phone", net: "Net A", gx: 0, gy: 1 },
      { id: "R1", type: "router", name: "Home Router", gx: 1, gy: 1 },
      { id: "H2", type: "host", name: "Web Server", net: "Net B", gx: 2, gy: 1 },
    ],
    edges: [["H1", "R1"], ["R1", "H2"]],
  },
  {
    payload: "an email",
    source: "H1",
    dest: "H3",
    nodes: [
      { id: "H1", type: "host", name: "Your Laptop", net: "Net A", gx: 0, gy: 1 },
      { id: "R1", type: "router", name: "Home Router", gx: 1, gy: 1 },
      { id: "H2", type: "host", name: "Printer", net: "Net B", gx: 2, gy: 0 },
      { id: "H3", type: "host", name: "Mail Server", net: "Net C", gx: 2, gy: 2 },
    ],
    edges: [["H1", "R1"], ["R1", "H2"], ["R1", "H3"]],
  },
  {
    payload: "a file upload",
    source: "H1",
    dest: "H2",
    nodes: [
      { id: "H1", type: "host", name: "Desktop PC", net: "Net A", gx: 0, gy: 1 },
      { id: "R1", type: "router", name: "Home Router", gx: 1, gy: 1 },
      { id: "SW1", type: "switch", name: "Office Switch", gx: 2, gy: 0 },
      { id: "H2", type: "host", name: "File Server", net: "Net B", gx: 3, gy: 0 },
      { id: "R2", type: "router", name: "ISP Router", gx: 2, gy: 2 },
      { id: "H3", type: "host", name: "Cloud Backup", net: "Net C", gx: 3, gy: 2 },
    ],
    edges: [
      ["H1", "R1"],
      ["R1", "SW1"],
      ["SW1", "H2"],
      ["R1", "R2"],
      ["R2", "H3"],
    ],
  },
  {
    payload: "a video stream",
    source: "H1",
    dest: "H2",
    nodes: [
      { id: "H1", type: "host", name: "Smart TV", net: "Net A", gx: 0, gy: 1 },
      { id: "R1", type: "router", name: "Home Router", gx: 1, gy: 1 },
      { id: "R2", type: "router", name: "ISP Router N", gx: 2, gy: 0 },
      { id: "R3", type: "router", name: "ISP Router S", gx: 2, gy: 2 },
      { id: "R4", type: "router", name: "Edge Router", gx: 3, gy: 1 },
      { id: "H2", type: "host", name: "Stream Server", net: "Net B", gx: 4, gy: 1 },
    ],
    edges: [
      ["H1", "R1"],
      ["R1", "R2"],
      ["R1", "R3"],
      ["R2", "R4"],
      ["R3", "R4"],
      ["R4", "H2"],
    ],
  },
  {
    payload: "a game packet",
    source: "H1",
    dest: "H3",
    nodes: [
      { id: "H1", type: "host", name: "Console", net: "Net A", gx: 0, gy: 1 },
      { id: "R1", type: "router", name: "Home Router", gx: 1, gy: 1 },
      { id: "SW1", type: "switch", name: "LAN Switch", gx: 2, gy: 0 },
      { id: "H2", type: "host", name: "Roommate PC", net: "Net B", gx: 3, gy: 0 },
      { id: "R2", type: "router", name: "ISP Router", gx: 2, gy: 2 },
      { id: "R3", type: "router", name: "DC Router", gx: 3, gy: 2 },
      { id: "H3", type: "host", name: "Game Server", net: "Net C", gx: 4, gy: 2 },
    ],
    edges: [
      ["H1", "R1"],
      ["R1", "SW1"],
      ["SW1", "H2"],
      ["R1", "R2"],
      ["R2", "R3"],
      ["R3", "H3"],
    ],
  },
];
