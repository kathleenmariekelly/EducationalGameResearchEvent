// City delivery levels. Coords are canvas pixels; edge weights default to
// round(distance/60) unless a 3rd value overrides it (traffic/construction).
const LEVELS = [
  {
    id: 1,
    title: "Level 1 — First Delivery",
    brief: "Welcome to the depot! Route the robot to the customer as CHEAPLY as possible. Every road has a length; fewer turns doesn't mean cheaper.",
    start: "A", goal: "F",
    best: ["dijkstra"],
    why: "Roads have different lengths and there's no useful sense of direction to exploit yet, so expand by cheapest-cost-so-far: that's Dijkstra.",
    nodes: [
      {id:"A", x:90,  y:260, name:"Depot"},
      {id:"B", x:250, y:120},
      {id:"C", x:250, y:260},
      {id:"D", x:250, y:400},
      {id:"E", x:460, y:180},
      {id:"F", x:620, y:260, name:"Customer"},
    ],
    edges: [
      ["A","B"],["A","C"],["A","D"],
      ["B","E"],["C","E"],["D","F"],
      ["E","F"],["C","F",9],
    ],
  },
  {
    id: 2,
    title: "Level 2 — Rush Hour",
    brief: "Big part of town, deadline looming. There's a maze of cheap side-streets to the west, but the customer is due east. Get the cheapest route while wasting as little time thinking (expanding intersections) as possible.",
    start: "A", goal: "J",
    best: ["astar"],
    why: "The customer lies in a known direction and straight-line distance never overestimates real road cost, so A* follows that hint east and skips the cheap western side-streets that Dijkstra wastefully explores — while still finding the optimal route. Greedy also heads east but ignores the congested N–P road and picks a costlier path.",
    nodes: [
      {id:"A",  x:220, y:270, name:"Depot"},
      {id:"L1", x:70,  y:150},
      {id:"L2", x:70,  y:270},
      {id:"L3", x:70,  y:390},
      {id:"M",  x:360, y:270},
      {id:"N",  x:480, y:180},
      {id:"O",  x:480, y:360},
      {id:"P",  x:600, y:270},
      {id:"J",  x:660, y:270, name:"Customer"},
    ],
    edges: [
      ["A","L2",1],["L2","L1"],["L2","L3"],
      ["A","M"],
      ["M","N"],["M","O"],
      ["N","P",5],["O","P"],
      ["P","J"],
    ],
  },
  {
    id: 3,
    title: "Level 3 — The Shortcut Trap",
    brief: "A road (C) points straight at the customer and looks like an obvious shortcut. But it's a congested dead-run. Pick an algorithm that WON'T get fooled by looks.",
    start: "A", goal: "G",
    best: ["astar","dijkstra"],
    why: "Greedy Best-First only trusts the crow-flies hint and dives down the congested shortcut. Dijkstra and A* also weigh the real road cost, so they don't take the bait — and stay optimal.",
    nodes: [
      {id:"A", x:90,  y:260, name:"Depot"},
      {id:"B", x:250, y:120},
      {id:"C", x:340, y:260},
      {id:"D", x:250, y:400},
      {id:"E", x:470, y:120},
      {id:"F", x:470, y:400},
      {id:"G", x:620, y:260, name:"Customer"},
    ],
    edges: [
      ["A","B"],["A","C",2],["A","D"],
      ["C","G",11],        // the "shortcut": short crow-flies h, brutal road cost
      ["B","E"],["D","F"],
      ["E","G"],["F","G"],
    ],
  },
  {
    id: 4,
    title: "Level 4 — Grid Lockdown",
    brief: "Uniform downtown grid — every block is exactly the same length. And a city-wide outage just knocked out GPS, so you have NO distance-to-customer estimate. Reach the customer in the fewest blocks.",
    start: "A", goal: "I", noHeuristic: true,
    best: ["bfs"],
    why: "With equal-length blocks the cheapest route is simply the one crossing the fewest intersections — exactly what BFS finds, using nothing but a simple queue. Dijkstra reaches the same answer but pays for a priority queue it doesn't need, and with GPS down the heuristic algorithms have no direction to aim at.",
    nodes: [
      {id:"A", x:120, y:110, name:"Depot"}, {id:"B", x:360, y:110}, {id:"C", x:600, y:110},
      {id:"D", x:120, y:270},              {id:"E", x:360, y:270}, {id:"F", x:600, y:270},
      {id:"G", x:120, y:430},              {id:"H", x:360, y:430}, {id:"I", x:600, y:430, name:"Customer"},
    ],
    edges: [
      ["A","B",1],["B","C",1],["D","E",1],["E","F",1],["G","H",1],["H","I",1],
      ["A","D",1],["D","G",1],["B","E",1],["E","H",1],["C","F",1],["F","I",1],
    ],
  },
  {
    id: 5,
    title: "Level 5 — Fragile Cargo",
    brief: "This package is fragile: every stop at an intersection risks damaging it. Forget distance — deliver it while crossing the FEWEST intersections possible.",
    start: "S", goal: "T", objective: "hops",
    best: ["bfs"],
    why: "The objective here is fewest stops, not shortest distance — so you expand by number of roads crossed, which is exactly BFS. Dijkstra chases the cheapest DISTANCE and happily adds extra stops to shave off meters, which is the worst thing for fragile cargo.",
    nodes: [
      {id:"S", x:90,  y:270, name:"Depot"},
      {id:"P", x:360, y:110},
      {id:"Q", x:250, y:430}, {id:"R", x:430, y:430}, {id:"U", x:560, y:430},
      {id:"T", x:640, y:270, name:"Customer"},
    ],
    edges: [
      ["S","P",8],["P","T",8],
      ["S","Q",2],["Q","R",2],["R","U",2],["U","T",2],
    ],
  },
  {
    id: 6,
    title: "Level 6 — Warehouse Crawler",
    brief: "A cramped warehouse robot with almost no memory has to reach the pickup point. It CAN'T hold a big map in mind — and you don't care how long the route is, only that it gets there. Watch out for dead-end aisles.",
    start: "A", goal: "P", objective: "any",
    best: ["dfs"],
    why: "When any route will do and memory is the constraint, DFS is ideal: it commits to one aisle and dives, remembering only the branch it's on (and backtracking out of dead ends). BFS and Dijkstra would work too, but they hold a wide frontier of aisles in memory — which this robot doesn't have.",
    nodes: [
      {id:"A", x:90,  y:270, name:"Dock"},
      {id:"B", x:240, y:140}, {id:"C", x:240, y:400},
      {id:"X", x:390, y:240},
      {id:"D", x:400, y:140}, {id:"E", x:400, y:400},
      {id:"F", x:560, y:140}, {id:"G", x:560, y:400},
      {id:"P", x:680, y:270, name:"Pickup"},
    ],
    edges: [
      ["A","B"],["A","C"],
      ["B","X"],            // dead-end spur
      ["B","D"],["C","E"],
      ["D","E"],            // cross aisle
      ["D","F"],["E","G"],
      ["F","P"],["G","P"],
    ],
  },
  {
    id: 7,
    title: "Level 7 — Sprawling Suburb",
    brief: "A wide suburb with lots of cul-de-sacs branching off the depot. Same low-memory robot, same rule: just reach the customer at the end of one street — route length doesn't matter.",
    start: "A", goal: "P", objective: "any",
    best: ["dfs"],
    why: "BFS fans out into every cul-de-sac at once, holding a huge frontier in memory. DFS commits to one street to its end, backing out only if it's a dead end — keeping memory tiny. With any route acceptable, that memory saving is the whole point.",
    nodes: [
      {id:"A",  x:110, y:270, name:"Depot"},
      {id:"C1", x:110, y:110}, {id:"C2", x:260, y:70},
      {id:"D1", x:270, y:180}, {id:"D2", x:410, y:120},
      {id:"E1", x:270, y:360}, {id:"E2", x:410, y:420},
      {id:"F1", x:110, y:430}, {id:"F2", x:250, y:470},
      {id:"G1", x:430, y:270}, {id:"G2", x:560, y:200}, {id:"P", x:680, y:270, name:"Customer"},
    ],
    edges: [
      ["A","C1"],["C1","C2"],       // cul-de-sac
      ["A","D1"],["D1","D2"],       // cul-de-sac
      ["A","E1"],["E1","E2"],       // cul-de-sac
      ["A","F1"],["F1","F2"],       // cul-de-sac
      ["A","G1"],["G1","G2"],["G2","P"],  // the street that reaches the customer
    ],
  },
];
if (typeof module !== "undefined") module.exports = LEVELS;
