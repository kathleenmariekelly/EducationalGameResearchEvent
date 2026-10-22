// conceptTree.js
//
// The pre-authored concept graph the game traverses to choose puzzles, instead
// of pure randomness. Guarantees topic coverage and lets us steer a player
// toward concepts they have NOT mastered yet.
//
// This file is pure data + selection logic (no Phaser), so it is fully unit-
// testable. See test/logic.test.mjs.
//
// A node is a SKILL (usually "produce gate X", sometimes "produce X while a
// gate is locked in the way"). Edges are prerequisites: a node becomes
// AVAILABLE only once all its prereqs are mastered (hard gating). Mastery =
// MASTERY_THRESHOLD consecutive correct solves of that node.
//
// Persistence/decay/remediation hooks exist (serialize/deserialize, applyDecay,
// remediate) but are intentionally minimal for now — wiring a New Game / Resume
// screen and testing decay is deferred.

import { targetVector } from "./logic.js";
import { TEMPLATES, solveTemplate } from "./scenarios.js";

export const MASTERY_THRESHOLD = 2; // consecutive correct solves to "master"

// Tier roughly = depth / difficulty band (0 easiest). Difficulty modes prefer
// certain tiers, but selection is ultimately driven by the mastery frontier.
export const NODES = [
  // Tier 0 — the basic gates from the slides.
  { id: "and", label: "AND gate",  target: "AND", tier: 0, prereqs: [], blurb: "Output 1 only when BOTH inputs are 1." },
  { id: "or",  label: "OR gate",   target: "OR",  tier: 0, prereqs: [], blurb: "Output 1 when EITHER input is 1." },
  { id: "not", label: "NOT gate",  target: "NOT", tier: 0, prereqs: [], blurb: "Inverts input A." },

  // Tier 1 — derived / special gates.
  { id: "nand", label: "NAND gate", target: "NAND", tier: 1, prereqs: ["and"],       blurb: "NOT-AND: 0 only when both inputs are 1." },
  { id: "nor",  label: "NOR gate",  target: "NOR",  tier: 1, prereqs: ["or"],        blurb: "NOT-OR: 1 only when both inputs are 0." },
  { id: "xor",  label: "XOR gate",  target: "XOR",  tier: 1, prereqs: ["and", "or"], blurb: "Output 1 when the inputs DIFFER." },

  // Tier 2 — XNOR (the toughest single gate).
  { id: "xnor", label: "XNOR gate", target: "XNOR", tier: 2, prereqs: ["xor"], blurb: "Output 1 when the inputs are the SAME." },

  // Tier 3 — DEEP builds: reproduce a gate inside a bigger circuit (4-5 gates).
  // Same target, but you must reason about a longer signal path. `template`
  // selects the wiring skeleton size.
  { id: "xnor_deep", label: "XNOR (4-gate build)", target: "XNOR", tier: 3, prereqs: ["xnor"],                 template: "T4", blurb: "Reproduce XNOR inside a 4-gate circuit — trace the whole path." },
  { id: "xor_deep",  label: "XOR (5-gate build)",  target: "XOR",  tier: 3, prereqs: ["xor", "nand", "nor"],     template: "T5", blurb: "Reproduce XOR inside a 5-gate circuit — trace the whole path." },
];
// NOTE: "build around a locked gate" is a DIFFICULTY SCAFFOLD (applied by the
// scene per difficulty via findLock), not a separate concept node. Easy always
// pre-places an immovable gate; medium sometimes; hard never.

const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));
export function nodeById(id) { return BY_ID[id]; }

// ---- Mastery state --------------------------------------------------------
// Shape: { [nodeId]: { streak, mastered, lastSolvedAt } }
export function createMastery() {
  const m = {};
  for (const n of NODES) m[n.id] = { streak: 0, mastered: false, lastSolvedAt: 0 };
  return m;
}
export function isMastered(mastery, id) { return !!(mastery[id] && mastery[id].mastered); }

export function prereqsMet(mastery, node) {
  return node.prereqs.every((p) => isMastered(mastery, p));
}

// Record a solve attempt. Correct advances the streak (mastering at threshold);
// wrong resets the streak (light remediation — a run of wrongs is handled by
// remediate()).
export function recordResult(mastery, id, correct, now = Date.now()) {
  const s = mastery[id] || (mastery[id] = { streak: 0, mastered: false, lastSolvedAt: 0 });
  if (correct) {
    s.streak += 1;
    s.lastSolvedAt = now;
    if (s.streak >= MASTERY_THRESHOLD) s.mastered = true;
  } else {
    s.streak = 0;
  }
  return s;
}

// ---- Traversal ------------------------------------------------------------
// Nodes that are unlocked (prereqs mastered) and not yet mastered.
export function frontier(mastery) {
  return NODES.filter((n) => !isMastered(mastery, n.id) && prereqsMet(mastery, n));
}

// Pick the next node to play. difficulty biases which tier we prefer:
//   easy -> lowest available tier, medium -> middle, hard -> highest.
// Falls back gracefully: if the frontier is empty (everything mastered), it
// returns a mastered node for review (spaced practice).
export function pickNode(mastery, difficulty = "easy", avoidId = null) {
  let pool = frontier(mastery);
  if (pool.length === 0) {
    // Everything available is mastered -> review the least-recently solved.
    pool = NODES.filter((n) => prereqsMet(mastery, n));
    pool.sort((a, b) => (mastery[a.id].lastSolvedAt || 0) - (mastery[b.id].lastSolvedAt || 0));
    return pool.find((n) => n.id !== avoidId) || pool[0];
  }
  // Bias by tier according to difficulty.
  const tiers = pool.map((n) => n.tier);
  const lo = Math.min(...tiers), hi = Math.max(...tiers);
  const wantTier = difficulty === "hard" ? hi : difficulty === "medium" ? Math.round((lo + hi) / 2) : lo;
  let banded = pool.filter((n) => n.tier === wantTier);
  if (banded.length === 0) banded = pool;
  const notAvoided = banded.filter((n) => n.id !== avoidId);
  const choose = (notAvoided.length ? notAvoided : banded);
  return choose[Math.floor(Math.random() * choose.length)];
}

// ---- Build a playable round from a node -----------------------------------
// Returns an object compatible with MainScene's round shape. The node's
// `template` (default T3) selects the wiring skeleton / slot count; the scene
// applies any difficulty lock separately.
export function buildRoundFromNode(node, templateId = null) {
  const sources = TEMPLATES[templateId || node.template || "T3"];
  const goal = targetVector(node.target);
  const solution = solveTemplate(goal, sources); // proven gate assignment
  return {
    nodeId: node.id,
    name: node.target,
    label: node.label,
    blurb: node.blurb,
    goal,
    template: sources,
    nCells: sources.length,
    fixedSolution: solution,
    lockIndex: null,
    lockGate: null,
  };
}

// ---- Persistence / decay / remediation hooks (deferred, not yet tested) ---
export function serialize(mastery) { return JSON.stringify(mastery); }
export function deserialize(str) {
  try { const m = { ...createMastery(), ...JSON.parse(str) }; return m; } catch { return createMastery(); }
}
// On Resume after a long gap, bump the player back a level or two (not to the
// start): demote the most advanced mastered nodes for review. `now`/`gapMs`
// TBD when the resume screen is built.
export function applyDecay(mastery, levels = 1) {
  const mastered = NODES.filter((n) => isMastered(mastery, n.id)).sort((a, b) => b.tier - a.tier);
  for (const n of mastered.slice(0, levels)) { mastery[n.id].mastered = false; mastery[n.id].streak = 0; }
  return mastery;
}
// On a run of wrong answers, drop back to the start of that concept's branch.
export function remediate(mastery, nodeId) {
  const node = nodeById(nodeId);
  if (!node) return mastery;
  mastery[nodeId].mastered = false; mastery[nodeId].streak = 0;
  for (const p of node.prereqs) { if (mastery[p]) { mastery[p].mastered = false; mastery[p].streak = 0; } }
  return mastery;
}
