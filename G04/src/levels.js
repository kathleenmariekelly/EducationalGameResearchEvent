// Level definitions for CodeQuest — TIERED structure.
//
// The game is organized into TIERS (difficulty steps). Tier 1 is the
// intro. Tiers 2+ each contain a POOL of variant puzzles; when you play
// that tier, one variant is chosen at random. If you fail, you can retry
// the same one or reshuffle to a different variant in the pool.
//
// Grid coordinates: {x, y} with (0,0) at TOP-LEFT.
// facing: "up" | "down" | "left" | "right".
// walls: array of {x,y} blocked tiles.
// gems: optional array of {x,y} collectibles you must grab.
// goalTile: the house you must reach.
// par: ideal command count for 3 stars.
// xp: XP awarded (belongs to the tier; copied onto variants below).
//
// Each TIER has:
//   name    - short tier label
//   concept - the "instructions" panel text explaining the C++ idea
//   xp      - XP for finishing any variant in this tier
//   variants- array of puzzle objects (1 for tier 1, 4 for the rest)

export const TIERS = [
  // ============================================================
  // TIER 1 — intro (single variant)
  // ============================================================
  {
    name: "Level 1 — Hello, cout!",
    xp: 40,
    concept:
      "Welcome! In C++, a program is a list of STATEMENTS that run top to " +
      "bottom. Every statement ends with a semicolon ;  Here, moveForward(); " +
      "moves Steve one tile the way he faces. Read the code, then press ▶ Run.",
    variants: [
      {
        title: "Level 1 — Hello, cout!",
        goal: "Press ▶ Run to walk Steve to his house. Read the code first!",
        cols: 5, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 4, y: 2 }, walls: [],
        starter:
`// Each statement ends with a semicolon ;
// moveForward(); moves Steve one tile forward.
moveForward();
moveForward();
moveForward();
moveForward();`,
        hint: "Just press Run! Notice every command ends with a semicolon ;",
        par: 4,
      },
    ],
  },

  // ============================================================
  // TIER 2 — add moveForward() lines yourself (4 variants)
  // ============================================================
  {
    name: "Level 2 — Straight lines",
    xp: 50,
    concept:
      "Now YOU add the steps. Each moveForward(); is one tile. Count the " +
      "empty squares between Steve and the house, and write that many " +
      "moveForward(); lines. Don't forget the semicolon on each line!",
    variants: [
      {
        title: "Level 2 — Walk right",
        goal: "Add moveForward(); lines until Steve reaches the house.",
        cols: 6, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 5, y: 2 }, walls: [],
        starter:
`moveForward();
moveForward();
// Add more moveForward(); lines below to reach the house!
`,
        hint: "The house is 5 tiles to the right. You need 5 moveForward(); lines.",
        par: 5,
      },
      {
        title: "Level 2 — A shorter walk",
        goal: "Steve faces right. Move him to the house.",
        cols: 5, rows: 5, start: { x: 0, y: 1 }, facing: "right",
        goalTile: { x: 4, y: 1 }, walls: [],
        starter:
`// Write one moveForward(); per tile.
`,
        hint: "4 tiles to the right = 4 moveForward(); lines.",
        par: 4,
      },
      {
        title: "Level 2 — Facing down",
        goal: "Steve faces DOWN this time. Move him straight down to the house.",
        cols: 5, rows: 6, start: { x: 2, y: 0 }, facing: "down",
        goalTile: { x: 2, y: 5 }, walls: [],
        starter:
`// Steve already faces down. Just move forward!
moveForward();
`,
        hint: "The house is 5 tiles below. Write 5 moveForward(); lines total.",
        par: 5,
      },
      {
        title: "Level 2 — The long hall",
        goal: "A longer straight path. Move Steve all the way to the house.",
        cols: 7, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 6, y: 2 }, walls: [],
        starter:
`// 6 tiles to go. One moveForward(); per tile.
`,
        hint: "Count carefully: 6 tiles means 6 moveForward(); lines.",
        par: 6,
      },
    ],
  },

  // ============================================================
  // TIER 3 — turning (4 variants)
  // ============================================================
  {
    name: "Level 3 — Turning corners",
    xp: 60,
    concept:
      "Steve can only move the way he FACES. To change direction, turn him " +
      "first: turnRight(); rotates him clockwise (right→down→left→up), and " +
      "turnLeft(); rotates counter-clockwise. Turning does NOT move him — " +
      "you still need moveForward(); after turning.",
    variants: [
      {
        title: "Level 3 — Down and around",
        goal: "Reach the house around the corner using a turn.",
        cols: 5, rows: 5, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 3, y: 3 }, walls: [],
        starter:
`moveForward();
moveForward();
moveForward();
// Steve now faces right at the top. Turn to face DOWN, then move.
// Hint: turnRight() makes a right-facing Steve face down.
`,
        hint: "After 3 moves right, turnRight(); then 3 moveForward(); to go down.",
        par: 7,
      },
      {
        title: "Level 3 — L-shape",
        goal: "Move down, then turn to reach the house on the right.",
        cols: 5, rows: 5, start: { x: 0, y: 0 }, facing: "down",
        goalTile: { x: 3, y: 3 }, walls: [],
        starter:
`// Steve faces DOWN. Move down 3, then turn to face right, then move.
moveForward();
moveForward();
moveForward();
// Now turn LEFT to face right? Try it and see which turn works!
`,
        hint: "Facing down, turnLeft(); makes Steve face right. Then move 3 tiles.",
        par: 7,
      },
      {
        title: "Level 3 — Two turns",
        goal: "A zig-zag: you'll need two separate turns.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 2, y: 4 }, walls: [],
        starter:
`// Move right 2, turn down, move down 4, arrive.
moveForward();
moveForward();
// turn to face down here...
`,
        hint: "2 right, turnRight();, then 4 down.",
        par: 8,
      },
      {
        title: "Level 3 — Go up",
        goal: "The house is ABOVE Steve. Turn to face up, then climb.",
        cols: 5, rows: 5, start: { x: 2, y: 4 }, facing: "right",
        goalTile: { x: 2, y: 0 }, walls: [],
        starter:
`// Steve faces right but the house is straight up.
// Turn to face UP first, then move.
turnLeft();
`,
        hint: "Facing right, turnLeft(); makes Steve face up. Then 4 moveForward();.",
        par: 5,
      },
    ],
  },

  // ============================================================
  // TIER 4 — for loops (4 variants)
  // ============================================================
  {
    name: "Level 4 — for loops",
    xp: 80,
    concept:
      "Typing the same command many times is tedious. A FOR LOOP repeats " +
      "code a set number of times:\n\n" +
      "  for (int i = 0; i < N; i++) {\n    moveForward();\n  }\n\n" +
      "This runs the { } block N times (i counts 0,1,2,... up to N-1). " +
      "Change N to control how many times it repeats.",
    variants: [
      {
        title: "Level 4 — Fill the blank",
        goal: "Replace ___ so the loop runs the right number of times.",
        cols: 7, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 6, y: 2 }, walls: [],
        starter:
`// Make this loop repeat 6 times by filling in the blank.
for (int i = 0; i < ___; i++) {
  moveForward();
}`,
        hint: "The house is 6 tiles away, so replace ___ with 6.",
        par: 6,
      },
      {
        title: "Level 4 — Write the whole loop",
        goal: "Write a for loop that moves Steve 5 tiles to the house.",
        cols: 6, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 5, y: 2 }, walls: [],
        starter:
`// Write a for loop here that runs 5 times.
// Pattern: for (int i = 0; i < 5; i++) { moveForward(); }
`,
        hint: "for (int i = 0; i < 5; i++) { moveForward(); }",
        par: 5,
      },
      {
        title: "Level 4 — Loop then turn",
        goal: "Loop to move down, turn, then loop again to the house.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "down",
        goalTile: { x: 4, y: 5 }, walls: [],
        starter:
`// Loop down 5, turn to face right, loop right 4.
for (int i = 0; i < 5; i++) {
  moveForward();
}
// turn here, then add a second loop
`,
        hint: "After the first loop, turnLeft(); then a for loop that runs 4 times.",
        par: 11,
      },
      {
        title: "Level 4 — Count it out",
        goal: "Figure out how many steps, then write one loop.",
        cols: 8, rows: 5, start: { x: 0, y: 1 }, facing: "right",
        goalTile: { x: 7, y: 1 }, walls: [],
        starter:
`// How many tiles to the house? Put that number in the loop.
for (int i = 0; i < ___; i++) {
  moveForward();
}`,
        hint: "The house is 7 tiles right, so use 7.",
        par: 7,
      },
    ],
  },

  // ============================================================
  // TIER 5 — loops + turns around walls (4 variants)
  // ============================================================
  {
    name: "Level 5 — Rivers, caves & walls",
    xp: 100,
    concept:
      "New hazards! STONE WALLS (gray) block you as before. Now watch out " +
      "for RIVERS (blue water) — Steve can't swim, so route around them. And " +
      "CAVES (dark pits) — falling in ends the run. All three stop Steve if " +
      "he steps on them, so plan a safe path using loops and turns.",
    variants: [
      {
        title: "Level 5 — Cross the river",
        goal: "A river cuts across. Go around it to reach the house.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 5, y: 5 },
        walls: [],
        water: [ {x:3,y:0},{x:3,y:1},{x:3,y:2} ],
        starter:
`// The blue river blocks the top. Go DOWN first, then across.
`,
        hint: "turnRight(); go down past the river (row 3+), turnLeft(); go right, then down to the house.",
        par: 12,
      },
      {
        title: "Level 5 — Mind the cave",
        goal: "A dark cave pit blocks the middle. Steer around it.",
        cols: 6, rows: 6, start: { x: 0, y: 3 }, facing: "right",
        goalTile: { x: 5, y: 3 },
        walls: [],
        caves: [ {x:3,y:3},{x:3,y:2} ],
        starter:
`// Don't fall in the cave! Dip below it, then come back up.
`,
        hint: "Right 2, turnRight(); down 1, turnLeft(); right 2, turnLeft(); up 1, turnRight(); right 1.",
        par: 14,
      },
      {
        title: "Level 5 — River and rocks",
        goal: "Water AND a stone wall. Find the safe lane.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "down",
        goalTile: { x: 5, y: 5 },
        walls: [ {x:3,y:2},{x:3,y:3} ],
        water: [ {x:1,y:2},{x:1,y:3} ],
        starter:
`// A river on the left, rocks in the middle. Weave between them.
`,
        hint: "Go down column 0 to the bottom, then straight across the clear bottom row.",
        par: 14,
      },
      {
        title: "Level 5 — Long detour",
        goal: "A tall wall forces the long way around.",
        cols: 7, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 6, y: 0 },
        walls: [ {x:3,y:0},{x:3,y:1},{x:3,y:2},{x:3,y:3} ],
        starter:
`// The wall reaches down from the top. Go under it.
`,
        hint: "Down to row 4, right past the wall, then back up to the top row.",
        par: 16,
      },
    ],
  },

  // ============================================================
  // TIER 6 — while + conditions (4 variants)
  // ============================================================
  {
    name: "Level 6 — Conditions",
    xp: 110,
    concept:
      "Sometimes you don't know exactly how many steps you need. " +
      "pathClear() is TRUE when the tile ahead is open (not a wall, not off " +
      "the grid). A WHILE loop repeats as long as its condition is true:\n\n" +
      "  while (pathClear()) {\n    moveForward();\n  }\n\n" +
      "This walks forward until Steve hits something — no counting needed!",
    variants: [
      {
        title: "Level 6 — Walk to the wall",
        goal: "Use while(pathClear()) to walk until you reach the edge.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 5, y: 0 }, walls: [ {x:5,y:1} ],
        starter:
`// Move forward until the path is blocked.
while (pathClear()) {
  moveForward();
}`,
        hint: "Just press Run — the while loop stops Steve at the far edge.",
        par: 5,
      },
      {
        title: "Level 6 — Two straight runs",
        goal: "Walk to a wall, turn, then walk again — each run a while loop.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 5, y: 5 }, walls: [],
        starter:
`// First run: go right until the edge.
while (pathClear()) {
  moveForward();
}
// Now turn to face down and add a SECOND while loop.
turnRight();
`,
        hint: "After turnRight();, add another while(pathClear()){ moveForward(); }.",
        par: 6,
      },
      {
        title: "Level 6 — Down the column",
        goal: "Walk down until you can't, then across to the house.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "down",
        goalTile: { x: 5, y: 5 }, walls: [],
        starter:
`// Steve faces down. Fall to the bottom, then turn and cross.
while (pathClear()) {
  moveForward();
}
`,
        hint: "After the first loop, turnLeft(); then another while loop to go right.",
        par: 6,
      },
      {
        title: "Level 6 — Zig-zag with while",
        goal: "Chain while loops and turns to reach the far corner.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 5, y: 5 }, walls: [ {x:5,y:1},{x:4,y:1} ],
        starter:
`// Use while(pathClear()) loops with turns between them.
`,
        hint: "Right to the edge, turnRight(); down to the edge — repeat until home.",
        par: 8,
      },
    ],
  },

  // ============================================================
  // TIER 7 — mazes, solo (4 variants)
  // ============================================================
  {
    name: "Level 7 — Maze graduation",
    xp: 150,
    concept:
      "No starter code this time — you're the coder now! Combine loops, " +
      "turns, and while(pathClear()) to navigate the maze. Strategy: break " +
      "the path into straight legs. For each leg, a while(pathClear()) loop " +
      "walks to the next wall; then turn and start the next leg.",
    variants: [
      {
        title: "Level 7 — Double bend",
        goal: "Weave around two walls to reach the far corner.",
        cols: 7, rows: 7, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 6, y: 6 },
        walls: [
          {x:2,y:0},{x:2,y:1},{x:2,y:2},{x:2,y:3},
          {x:4,y:3},{x:4,y:4},{x:4,y:5},{x:4,y:6}
        ],
        starter: `// No help this time. You've got this!\n`,
        hint: "Go down col 0, right along the bottom, up col 3, across the top, down col 6.",
        par: 20,
      },
      {
        title: "Level 7 — River comb",
        goal: "Comb-shaped barriers of rock and water. Find the gaps.",
        cols: 7, rows: 7, start: { x: 0, y: 6 }, facing: "up",
        goalTile: { x: 6, y: 6 },
        walls: [ {x:2,y:6},{x:2,y:5},{x:2,y:4},{x:2,y:3} ],
        water: [ {x:4,y:6},{x:4,y:5},{x:4,y:4},{x:4,y:3} ],
        starter: `// Reach the house on the bottom-right. Water blocks like walls.\n`,
        hint: "Go up to the top row (clear), then travel right, then drop down the far side.",
        par: 20,
      },
      {
        title: "Level 7 — Spiral-ish",
        goal: "A winding path to the center-right.",
        cols: 7, rows: 7, start: { x: 0, y: 0 }, facing: "down",
        goalTile: { x: 6, y: 3 },
        walls: [
          {x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},
          {x:5,y:2},{x:5,y:3},{x:5,y:4},{x:5,y:5}
        ],
        starter: `// Trace a path carefully around the walls.\n`,
        hint: "Down the left side, across the bottom, up the right — but mind the wall at col 5.",
        par: 22,
      },
      {
        title: "Level 7 — Cave field",
        goal: "Dangerous cave pits are scattered around. Plan a safe path.",
        cols: 7, rows: 7, start: { x: 0, y: 3 }, facing: "right",
        goalTile: { x: 6, y: 3 },
        walls: [ {x:2,y:2} ],
        caves: [ {x:2,y:3},{x:4,y:3},{x:4,y:4} ],
        starter: `// Caves on your row will end the run. Dodge down and around.\n`,
        hint: "Dip to row 4, but the cave at (4,4) means you may need row 5 for part of it.",
        par: 18,
      },
    ],
  },

  // ============================================================
  // TIER 8 — jump + diamonds (4 variants)
  // ============================================================
  {
    name: "Level 8 — Jump & collect",
    xp: 130,
    concept:
      "Two new ideas. DIAMONDS (blue): you must collect ALL of them before " +
      "reaching home. Just walk onto a diamond to grab it. jump(); leaps " +
      "over exactly ONE wall tile directly ahead, landing on the tile " +
      "beyond it. If that landing tile is a wall or off the grid, Steve " +
      "crashes — so only jump when there's a clear tile past the wall.",
    variants: [
      {
        title: "Level 8 — Jump the block",
        goal: "Grab the diamond, jump the wall, reach home.",
        cols: 6, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 5, y: 2 }, walls: [ {x:3,y:2} ], gems: [ {x:2,y:2} ],
        starter:
`// Walk onto the diamond, then jump over the stone block.
moveForward();
moveForward();
jump();
moveForward();`,
        hint: "Move to the diamond (auto-grabbed), jump(); the wall, then step onto the house.",
        par: 4,
      },
      {
        title: "Level 8 — Two diamonds",
        goal: "Collect BOTH diamonds before going home.",
        cols: 7, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 6, y: 2 }, walls: [], gems: [ {x:2,y:2},{x:4,y:2} ],
        starter:
`// No walls here — just walk across, grabbing both diamonds.
`,
        hint: "6 moveForward(); lines (or a loop) walks over both diamonds to the house.",
        par: 6,
      },
      {
        title: "Level 8 — Jump twice",
        goal: "Two walls to leap. Time your jumps.",
        cols: 7, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 6, y: 2 },
        walls: [ {x:2,y:2},{x:4,y:2} ], gems: [],
        starter:
`// Two blocks in the way. Jump each one.
moveForward();
jump();
// ...keep going: another move, another jump, then finish.
`,
        hint: "move, jump, move, jump, move — landing tiles are all clear.",
        par: 5,
      },
      {
        title: "Level 8 — Diamond detour",
        goal: "Grab a diamond that's off the direct path.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 5, y: 0 }, walls: [], gems: [ {x:2,y:2} ],
        starter:
`// The diamond is below your path. Detour down to grab it,
// then come back up and continue to the house.
`,
        hint: "Right 2, down 2 (grab diamond), up 2, right 3 to the house.",
        par: 12,
      },
    ],
  },

  // ============================================================
  // TIER 9 — functions (4 variants)
  // ============================================================
  {
    name: "Level 9 — Functions",
    xp: 160,
    concept:
      "A FUNCTION gives a name to a group of steps so you can reuse them. " +
      "Define it once:\n\n  void goHome() {\n    moveForward();\n    moveForward();\n  }\n\n" +
      "Then CALL it by writing its name:  goHome();  Each call runs all the " +
      "steps inside. Define the function first, then call it below.",
    variants: [
      {
        title: "Level 9 — Call the function",
        goal: "The function is written. Make sure it's called, then Run.",
        cols: 6, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 5, y: 2 }, walls: [],
        starter:
`// A function bundles steps under a name.
void goHome() {
  for (int i = 0; i < 5; i++) {
    moveForward();
  }
}

// Call it here:
goHome();`,
        hint: "Everything's ready — just press Run. goHome(); runs all 5 steps.",
        par: 5,
      },
      {
        title: "Level 9 — Write the body",
        goal: "Fill in the function so calling it walks Steve home.",
        cols: 6, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 5, y: 2 }, walls: [],
        starter:
`void goHome() {
  // Add the moves here (5 tiles right).

}

goHome();`,
        hint: "Inside the braces: for (int i = 0; i < 5; i++) { moveForward(); }",
        par: 5,
      },
      {
        title: "Level 9 — Call it twice",
        goal: "Define a short move, then call it more than once.",
        cols: 7, rows: 5, start: { x: 0, y: 2 }, facing: "right",
        goalTile: { x: 6, y: 2 }, walls: [],
        starter:
`// This function moves 3 tiles. Call it twice to go 6!
void hop() {
  moveForward();
  moveForward();
  moveForward();
}

hop();
// add one more call:
`,
        hint: "Add a second hop(); line so Steve moves 3 + 3 = 6 tiles.",
        par: 6,
      },
      {
        title: "Level 9 — Function with a turn",
        goal: "Write a function that turns and moves, then call it.",
        cols: 6, rows: 6, start: { x: 0, y: 0 }, facing: "right",
        goalTile: { x: 4, y: 4 }, walls: [],
        starter:
`// Define goHome() to reach the house at (4,4),
// then call it. You choose the moves inside!
void goHome() {

}

goHome();`,
        hint: "Inside: move right 4, turnRight();, move down 4. Then goHome(); runs it.",
        par: 10,
      },
    ],
  },
];

// Backwards-compatible flat list (one representative variant per tier).
// Not used by the game once tiers are wired in, but handy for tests.
export const LEVELS = TIERS.map((t) => ({ ...t.variants[0], xp: t.xp }));
