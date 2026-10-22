// scenarios.js
//
// The pool of target functions the player must reproduce, plus a brute-force
// solver that (a) proves each target is achievable in the given cell budget
// and (b) yields a reference solution usable as a hint / "show me one answer".
//
// Variety is generated at BUILD/LOAD time here — the running game just picks
// from this pool. No API calls, nothing to embed, safe to publish statically.

import { GATES, PALETTE, INPUT_ROWS, evalCircuit, targetVector, vectorsEqual } from "./logic.js";

// The functions we ask players to build, described by a reference gate name
// (its truth vector is computed, never typed) plus a teaching blurb.
export const TARGETS = [
  { name: "AND",  blurb: "Output is 1 only when BOTH inputs are 1." },
  { name: "OR",   blurb: "Output is 1 when EITHER input is 1." },
  { name: "NAND", blurb: "NOT-AND: the universal gate. 0 only when both inputs are 1." },
  { name: "NOR",  blurb: "NOT-OR: 1 only when both inputs are 0." },
  { name: "XOR",  blurb: "Output is 1 when the inputs DIFFER." },
];

// Build the list of source ids available to a cell at index i:
// primary inputs plus every earlier cell's output.
function sourcesFor(i) {
  const s = ["A", "B"];
  for (let j = 0; j < i; j++) s.push("c" + j);
  return s;
}

// Brute-force search for a circuit of exactly `nCells` cells whose truth
// vector equals `goal`. Returns the cell array, or null if none exists.
// Search space is small (a handful of cells), so this is fast and exhaustive.
export function solve(goalVector, nCells) {
  const result = { cells: null };

  function recurse(i, cells) {
    if (result.cells) return; // stop at first solution
    if (i === nCells) {
      if (vectorsEqual(goalVector, INPUT_ROWS.map((r) => evalCircuit(cells, r.A, r.B).out))) {
        result.cells = cells.map((c) => ({ ...c }));
      }
      return;
    }
    const srcs = sourcesFor(i);
    for (const gate of PALETTE) {
      for (const in1 of srcs) {
        for (const in2 of srcs) {
          cells.push({ gate, in1, in2 });
          recurse(i + 1, cells);
          cells.pop();
          if (result.cells) return;
        }
      }
    }
  }

  recurse(0, []);
  return result.cells;
}

// A blank starting circuit of nCells (all WIRE from A) for the player to edit.
export function blankCircuit(nCells) {
  const cells = [];
  for (let i = 0; i < nCells; i++) cells.push({ gate: "WIRE", in1: "A", in2: "A" });
  return cells;
}

// ---- Variable-size topology templates -------------------------------------
// Each template is an ordered list of slots; each slot is [in1, in2] source
// ids ("A", "B", or "cK" = output of an earlier slot). The LAST slot is the
// circuit output. The player only chooses each slot's gate TYPE; the wiring is
// fixed and drawn. Slot positions are computed by the scene from these sources
// (by layer), so templates stay pure data.
export const TEMPLATES = {
  T1: [["A", "B"]],                                  // single gate: learn one gate
  T3: [["A", "B"], ["A", "B"], ["c0", "c1"]],
  T4: [["A", "B"], ["A", "B"], ["c0", "c1"], ["c2", "c0"]],
  T5: [["A", "B"], ["A", "B"], ["A", "B"], ["c0", "c1"], ["c3", "c2"]],
};

function cellsFromTemplate(sources, gates) {
  return sources.map((s, i) => ({ gate: gates[i] || "WIRE", in1: s[0], in2: s[1] }));
}

// Brute-force a gate assignment over a template whose truth vector == goal.
// Search space is 8^nSlots (<= 32768 for 5 slots), so this is fast/exhaustive.
// `lock` (optional) = { index, gate } pins one slot. Returns an array of gate
// names (one per slot) or null.
export function solveTemplate(goalVector, sources, lock = null) {
  const n = sources.length;
  const gates = new Array(n);
  const opts = (i) => (lock && lock.index === i ? [lock.gate] : PALETTE);
  let found = null;
  (function rec(i) {
    if (found) return;
    if (i === n) {
      const cells = cellsFromTemplate(sources, gates);
      if (vectorsEqual(goalVector, INPUT_ROWS.map((r) => evalCircuit(cells, r.A, r.B).out))) found = gates.slice();
      return;
    }
    for (const g of opts(i)) { gates[i] = g; rec(i + 1); if (found) return; }
  })(0);
  return found;
}

// ---- Fixed visual topology (what the drag-and-drop UI uses) ---------------
// Two gates fed by (A,B), feeding a third gate. The player only chooses the
// three gate TYPES; the wiring is fixed and drawn on screen.
//   c0 = g0(A, B)
//   c1 = g1(A, B)
//   out = g2(c0, c1)
// A null gate means the slot is still empty.
export function fixedCircuit(g0, g1, g2) {
  return [
    { gate: g0 || "WIRE", in1: "A",  in2: "B"  },
    { gate: g1 || "WIRE", in1: "A",  in2: "B"  },
    { gate: g2 || "WIRE", in1: "c0", in2: "c1" },
  ];
}

// Search the fixed topology for a (g0,g1,g2) triple matching the goal vector.
// Only a few hundred combos, so this is instant and exhaustive.
// `lock` (optional) = { index: 0|1|2, gate: "AND" } constrains one slot to a
// pre-placed gate, so we can guarantee a puzzle is still solvable AROUND a
// gate the player is forced to build around.
export function solveFixed(goalVector, lock = null) {
  const opts = (slot) => (lock && lock.index === slot ? [lock.gate] : PALETTE);
  for (const g0 of opts(0))
    for (const g1 of opts(1))
      for (const g2 of opts(2)) {
        const cells = fixedCircuit(g0, g1, g2);
        if (vectorsEqual(goalVector, INPUT_ROWS.map((r) => evalCircuit(cells, r.A, r.B).out)))
          return { g0, g1, g2 };
      }
  return null;
}

// Find a difficulty scaffold: a (slot, gate) to pre-place immovably such that
// the given target is STILL solvable around it. Returns {index, gate, solution}
// or null if no such lock exists. Used by easy/medium to force the player to
// build around a fixed gate.
export function findLock(goalVector) {
  const slots = [0, 1, 2].sort(() => Math.random() - 0.5);
  const gates = PALETTE.filter((g) => g !== "WIRE").sort(() => Math.random() - 0.5);
  for (const index of slots)
    for (const gate of gates) {
      const solution = solveFixed(goalVector, { index, gate });
      if (solution) return { index, gate, solution };
    }
  return null;
}

// Build an EASY round: pick a slot + gate to pre-place (immovable), then choose
// a target that is still solvable while that slot is locked. Guarantees the
// player must build AROUND the locked gate. Returns a round plus {lockIndex,
// lockGate}. `avoidName` skips repeating the previous target.
export function makeLockedRound(avoidName = null) {
  // Prefer locking a "real" gate (not WIRE) so it meaningfully constrains.
  const lockPool = PALETTE.filter((g) => g !== "WIRE");
  const targetOrder = shuffled(TARGETS).filter((t) => t.name !== avoidName);
  // Try random lock placements until we find a solvable target.
  for (let attempt = 0; attempt < 40; attempt++) {
    const lockIndex = Math.floor(Math.random() * 3);
    const lockGate = lockPool[Math.floor(Math.random() * lockPool.length)];
    for (const t of targetOrder) {
      const goal = targetVector(t.name);
      const sol = solveFixed(goal, { index: lockIndex, gate: lockGate });
      if (sol) {
        return { name: t.name, blurb: t.blurb, goal, nCells: 3,
                 fixedSolution: sol, lockIndex, lockGate };
      }
    }
  }
  // Fallback: unlocked round (should be rare/never).
  return { ...makeRound(targetOrder[0] || TARGETS[0], 3), lockIndex: null, lockGate: null };
}

// Produce a playable round: pick a target, attach its computed goal vector and
// a proven reference solution. nCells is the cell budget for this round.
export function makeRound(target, nCells) {
  const goal = targetVector(target.name);
  const solution = solve(goal, nCells);
  const fixedSolution = solveFixed(goal); // proven fixed-topology answer
  return {
    name: target.name,
    blurb: target.blurb,
    goal,
    nCells,
    solution,      // general-topology hint
    fixedSolution, // {g0,g1,g2} for the drag-and-drop board
  };
}

// Shuffle helper (Fisher-Yates) for round order variety.
export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
