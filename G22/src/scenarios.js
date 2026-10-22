// scenarios.js
//
// Build-time content pool for Pointer Hunt. Nothing here calls an API —
// the game generates varied rounds procedurally at load/runtime from
// these building blocks, so every playthrough differs while the file
// stays a safe static asset.
//
// Learning objective: after playing, a player can look at a pointer
// expression and predict whether it changes the POINTER (where it aims)
// or the POINTED-AT VALUE (what's in the box it aims at) — and knows what
// a dangling pointer is.
//
// The three command TYPES map to three distinct player actions:
//   redirect  ->  ptr = &X    ->  CLICK enemy X        (moves the pointer)
//   deref     ->  *ptr = N     ->  press digit key N    (acts THROUGH ptr)
//   free      ->  free(ptr)    ->  press SPACE          (invalidates target)
//
// Confusing redirect vs. deref is the core misconception; doing deref
// while dangling is a use-after-free. Both produce a visible backfire.

export const LETTERS = ["a", "b", "c", "d"];

// A palette so enemies are visually distinct (color != meaning, just aids
// telling targets apart at speed).
export const ENEMY_COLORS = [0xef476f, 0xffd166, 0x06d6a0, 0x4cc9f0];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build the set of enemies for a round: each has a letter, a starting
// value, a color, and a random-ish screen position.
export function makeEnemies(count = 4) {
  const positions = shuffle([
    { x: 200, y: 220 },
    { x: 600, y: 220 },
    { x: 200, y: 420 },
    { x: 600, y: 420 },
    { x: 400, y: 320 },
  ]).slice(0, count);

  return LETTERS.slice(0, count).map((letter, i) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = randInt(35, 75); // px/sec — gentle drift, not chaos
    return {
      letter,
      value: randInt(0, 9),
      color: ENEMY_COLORS[i % ENEMY_COLORS.length],
      freed: false,
      x: positions[i].x,
      y: positions[i].y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

// Generate a queue of commands for a round. We deliberately weave in the
// three types, and occasionally place a `free(ptr)` right before a deref
// so the player meets a dangling pointer and learns to reassign first.
export function makeCommandQueue(enemies, length = 12, opts = {}) {
  const two = !!opts.usePtr2; // include a second pointer, ptr2
  const queue = [];
  const n = enemies.length;
  // Per-pointer bookkeeping: where it aims, and whether it's dead (NULL/freed).
  const state = [
    { at: randInt(0, n - 1), dead: false },
    { at: randInt(0, n - 1), dead: false },
  ];

  const otherThan = (idx) => {
    let j = randInt(0, n - 1);
    while (j === idx) j = randInt(0, n - 1);
    return j;
  };

  while (queue.length < length) {
    // Any dead pointer must be reassigned before it can be used again.
    const deadIdx = two
      ? state.findIndex((s) => s.dead)
      : state[0].dead
      ? 0
      : -1;
    if (deadIdx !== -1) {
      const target = randInt(0, n - 1);
      queue.push({ type: "redirect", targetIndex: target, p: deadIdx + 1 });
      state[deadIdx].at = target;
      state[deadIdx].dead = false;
      continue;
    }

    const p = two && Math.random() < 0.45 ? 2 : 1;
    const s = state[p - 1];
    const other = state[p === 1 ? 1 : 0];
    const roll = Math.random();

    if (roll < 0.3) {
      // redirect — sometimes deliberately onto the OTHER pointer's target to
      // create an aliasing moment (both pointers on one object).
      const alias = two && !other.dead && Math.random() < 0.35;
      const target = alias ? other.at : otherThan(s.at);
      queue.push({ type: "redirect", targetIndex: target, p });
      s.at = target;
    } else if (roll < 0.56) {
      queue.push({ type: "deref", value: randInt(0, 9), p }); // WRITE
    } else if (roll < 0.8) {
      queue.push({ type: "readInto", p }); // READ into e
    } else if (roll < 0.9 && p === 1) {
      queue.push({ type: "null", p }); // NULL (ptr only)
      s.dead = true;
    } else if (p === 1) {
      queue.push({ type: "free", p }); // free (ptr only)
      s.dead = true;
    } else {
      queue.push({ type: "deref", value: randInt(0, 9), p });
    }
  }
  return queue;
}

// Human-readable label + the "what should I do" hint for a command.
export function commandText(cmd, enemies) {
  const nm = cmd.p === 2 ? "ptr2" : "ptr";
  switch (cmd.type) {
    case "redirect":
      return `${nm} = &${enemies[cmd.targetIndex].letter}`;
    case "deref":
      return `*${nm} = ${cmd.value}`;
    case "readInto":
      return `int e = *${nm}`;
    case "null":
      return `${nm} = NULL`;
    case "free":
      return `free(${nm})`;
    default:
      return "?";
  }
}
