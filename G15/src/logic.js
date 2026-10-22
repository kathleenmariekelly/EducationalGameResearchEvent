// logic.js
//
// Pure, UI-free circuit logic. EVERYTHING about correctness lives here so it
// can be unit-tested independently of Phaser. Gate outputs and target truth
// tables are COMPUTED from first principles, never hand-typed, so a typo can't
// silently teach the wrong thing.
//
// Circuit model (prototype scope):
//   - Two primary inputs: A, B.
//   - A short list of "cells". Each cell = { gate, in1, in2 }.
//   - in1/in2 are SOURCE ids: "A", "B", or "c0","c1",... (output of an
//     earlier cell). Cells may only reference earlier cells, so evaluation is
//     a simple left-to-right pass (no cycles possible).
//   - The circuit's output is the last cell's output.
//
// This is expressive enough to build every 2-input boolean function
// (AND, OR, XOR, NAND, NOR, XNOR, etc.) while staying simple to reason about.

// --- Gates -----------------------------------------------------------------
// Each gate is a pure function of two bits (0/1). 1-input gates ignore b.
export const GATES = {
  AND:  (a, b) => (a & b) & 1,
  OR:   (a, b) => (a | b) & 1,
  XOR:  (a, b) => (a ^ b) & 1,
  NAND: (a, b) => (~(a & b)) & 1,
  NOR:  (a, b) => (~(a | b)) & 1,
  XNOR: (a, b) => (~(a ^ b)) & 1,
  NOT:  (a, _b) => (~a) & 1, // 1-input: inverts in1
  WIRE: (a, _b) => a & 1,    // 1-input: passes in1 through
};

// Gates offered in the builder palette. Matches the CSCI 341 slides: NOT, AND,
// OR, XOR are the four basic gates; NAND/NOR/XNOR appear in the gate diagrams
// too (XNOR is shown in a figure, not body text). WIRE = a plain conductor
// (the TTL "connect output to input" idea).
export const PALETTE = ["WIRE", "NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR"];

// Number of input-combination rows for 2 inputs.
export const INPUT_ROWS = [
  { A: 0, B: 0 },
  { A: 0, B: 1 },
  { A: 1, B: 0 },
  { A: 1, B: 1 },
];

// --- Evaluation ------------------------------------------------------------
// Resolve a source id to a bit value, given A, B and already-computed cells.
function resolveSource(id, A, B, cellVals) {
  if (id === "A") return A & 1;
  if (id === "B") return B & 1;
  if (id && id[0] === "c") {
    const idx = parseInt(id.slice(1), 10);
    return cellVals[idx] & 1;
  }
  return 0;
}

// Evaluate one circuit for a single (A,B) input. Returns { cellVals, out }.
export function evalCircuit(cells, A, B) {
  const cellVals = [];
  for (let i = 0; i < cells.length; i++) {
    const { gate, in1, in2 } = cells[i];
    const a = resolveSource(in1, A, B, cellVals);
    const b = resolveSource(in2, A, B, cellVals);
    const fn = GATES[gate] || GATES.WIRE;
    cellVals[i] = fn(a, b);
  }
  const out = cellVals.length ? cellVals[cellVals.length - 1] : 0;
  return { cellVals, out };
}

// The 4-bit output vector of a circuit over INPUT_ROWS, e.g. [0,1,1,0] for XOR.
export function truthVector(cells) {
  return INPUT_ROWS.map((r) => evalCircuit(cells, r.A, r.B).out);
}

// A target function's output vector, computed from a reference gate — so the
// "goal" column is guaranteed correct by construction.
export function targetVector(gateName) {
  const fn = GATES[gateName];
  return INPUT_ROWS.map((r) => fn(r.A, r.B));
}

// Compare two 4-bit vectors; returns array of booleans (true = row matches).
export function rowMatches(vecA, vecB) {
  return vecA.map((v, i) => v === vecB[i]);
}

export function vectorsEqual(vecA, vecB) {
  return rowMatches(vecA, vecB).every(Boolean);
}
