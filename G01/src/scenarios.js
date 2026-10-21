// scenarios.js
//
// Content pool for Recurrence Town. Each entry is one NPC/problem. The
// player never types free-form math; instead they fill THREE slots, each
// of which is a real decision that maps to a common recurrence-building
// mistake:
//
//   1. preds   — which earlier subproblems position i depends on
//                (the "number / size of subproblems" mistake)
//   2. combine — how to fold those subproblems together, and the per-step
//                cost (the "wrong relation / wrong operator" mistake)
//   3. base    — the base case value(s) and where recursion stops
//                (the "base case" mistake)
//
// The player's chosen pieces are run through ONE generic DP executor
// (runDP) so their *actual* recurrence is computed and shown filling in a
// grid, then compared cell-by-cell to the correct recurrence. Wrong
// choices don't just say "wrong" — the grid visibly diverges from the
// right answer on a specific cell.
//
// All content is static and bundled — nothing here calls any API.

// ---- generic DP executor -------------------------------------------------
// preds:   { fn(i) -> [predecessor indices] }
// combine: { agg(arr) -> number, cost(i, p, input) -> number }
// base:    { init(dp, input) -> void, start: number }
export function runDP(input, preds, combine, base) {
  const n = input.length;
  const dp = new Array(n + 1).fill(null);
  base.init(dp, input);
  for (let i = base.start; i <= n; i++) {
    const ps = preds.fn(i).filter((p) => p >= 0 && p <= n);
    const cands = ps.map((p) => (dp[p] == null ? 0 : dp[p]) + combine.cost(i, p, input));
    dp[i] = combine.agg(cands);
  }
  return dp;
}

// aggregators (safe on empty arrays)
const SUM = (a) => a.reduce((x, y) => x + y, 0);
const MIN = (a) => (a.length ? Math.min(...a) : Infinity);
const MAX = (a) => (a.length ? Math.max(...a) : -Infinity);

// helper cost functions
const zeroCost = () => 0;
const oneCost = () => 1;

export const scenarios = [
  // ---------------------------------------------------------------- STAIRS
  {
    id: "clocktower",
    npc: "Tessa the Tower Climber",
    emoji: "🧗",
    axisLabel: "step",
    input: [1, 1, 1, 1, 1], // only length matters (5 steps); dp = # of ways
    story:
      "Tessa is climbing the clock tower's 5 steps. She can go up 1 step or " +
      "2 steps at a time. She wants to know how many DISTINCT ways there " +
      "are to reach the top. Define F(i) = number of ways to reach step i.",
    slots: {
      preds: {
        label: "Which earlier steps does F(i) build on?",
        options: [
          { label: "F(i-1)  only", correct: false, fn: (i) => [i - 1] },
          { label: "F(i-1) and F(i-2)", correct: true, fn: (i) => [i - 1, i - 2] },
          { label: "F(i-1), F(i-2), F(i-3)", correct: false, fn: (i) => [i - 1, i - 2, i - 3] },
          { label: "F(i-2)  only", correct: false, fn: (i) => [i - 2] },
        ],
      },
      combine: {
        label: "How do you combine them?",
        options: [
          { label: "ADD them together", correct: true, agg: SUM, cost: zeroCost },
          { label: "take the MIN, then + 1", correct: false, agg: MIN, cost: oneCost },
          { label: "take the MAX, then + 1", correct: false, agg: MAX, cost: oneCost },
        ],
      },
      base: {
        label: "What is the base case?",
        options: [
          {
            label: "F(0) = 1   (one way to stand at the bottom)",
            correct: true,
            init: (dp) => { dp[0] = 1; },
            start: 1,
          },
          {
            label: "F(0) = 0",
            correct: false,
            init: (dp) => { dp[0] = 0; },
            start: 1,
          },
          {
            label: "F(0) = 1, F(1) = 2",
            correct: false,
            init: (dp) => { dp[0] = 1; dp[1] = 2; },
            start: 2,
          },
        ],
      },
    },
  },

  // ---------------------------------------------------------------- FARMER
  {
    id: "farmer",
    npc: "Jethro the Farmer",
    emoji: "🌾",
    axisLabel: "crop",
    input: [3, 2, 5, 10, 7], // crop yields
    story:
      "Jethro's crops grow in a row with yields 3, 2, 5, 10, 7. Neighboring " +
      "crops share roots, so he canNOT harvest two adjacent crops. He wants " +
      "the MAXIMUM total yield. Define F(i) = best yield using the first i " +
      "crops (yield of crop i is v_i).",
    slots: {
      preds: {
        label: "Which earlier crops does F(i) build on?",
        options: [
          { label: "F(i-1)  only", correct: false, fn: (i) => [i - 1] },
          { label: "F(i-1) and F(i-2)", correct: true, fn: (i) => [i - 1, i - 2] },
          { label: "F(i-2) and F(i-3)", correct: false, fn: (i) => [i - 2, i - 3] },
        ],
      },
      combine: {
        label: "How do you combine them? (skip crop i vs. take crop i)",
        options: [
          {
            label: "MAX( F(i-1),  F(i-2) + v_i )",
            correct: true,
            agg: MAX,
            cost: (i, p, input) => (p === i - 2 ? input[i - 1] : 0),
          },
          {
            label: "MIN( F(i-1),  F(i-2) + v_i )",
            correct: false,
            agg: MIN,
            cost: (i, p, input) => (p === i - 2 ? input[i - 1] : 0),
          },
          {
            label: "F(i-1) + F(i-2) + v_i   (add everything)",
            correct: false,
            agg: SUM,
            cost: (i, p, input) => (p === i - 2 ? input[i - 1] : 0),
          },
        ],
      },
      base: {
        label: "What is the base case?",
        options: [
          {
            label: "F(0) = 0,  F(1) = v_1",
            correct: true,
            init: (dp, input) => { dp[0] = 0; dp[1] = input[0]; },
            start: 2,
          },
          {
            label: "F(0) = 0,  F(1) = 0",
            correct: false,
            init: (dp) => { dp[0] = 0; dp[1] = 0; },
            start: 2,
          },
          {
            label: "F(0) = v_1",
            correct: false,
            init: (dp, input) => { dp[0] = input[0]; },
            start: 1,
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------ TOLL / COINS
  {
    id: "toll",
    npc: "Cora the Toll Collector",
    emoji: "🪙",
    axisLabel: "amount",
    input: [0, 0, 0, 0, 0, 0], // length 6 = target amount; values unused
    story:
      "Cora must give exactly 6 cents in change using coins worth {1, 3, 4}. " +
      "She wants the FEWEST coins. Define F(i) = fewest coins to make amount i.",
    slots: {
      preds: {
        label: "Which earlier amounts does F(i) build on?",
        options: [
          { label: "F(i-1), F(i-3), F(i-4)   (one per coin)", correct: true, fn: (i) => [i - 1, i - 3, i - 4] },
          { label: "F(i-1)  only", correct: false, fn: (i) => [i - 1] },
          { label: "F(i-1), F(i-2), F(i-3)", correct: false, fn: (i) => [i - 1, i - 2, i - 3] },
        ],
      },
      combine: {
        label: "How do you combine them?",
        options: [
          { label: "take the MIN, then + 1 coin", correct: true, agg: MIN, cost: oneCost },
          { label: "take the MAX, then + 1 coin", correct: false, agg: MAX, cost: oneCost },
          { label: "ADD them together", correct: false, agg: SUM, cost: zeroCost },
        ],
      },
      base: {
        label: "What is the base case?",
        options: [
          { label: "F(0) = 0   (no coins needed for 0)", correct: true, init: (dp) => { dp[0] = 0; }, start: 1 },
          { label: "F(0) = 1", correct: false, init: (dp) => { dp[0] = 1; }, start: 1 },
          { label: "F(0) = 0, F(1) = 0", correct: false, init: (dp) => { dp[0] = 0; dp[1] = 0; }, start: 2 },
        ],
      },
    },
  },

  // ------------------------------------------------------------- BRICKLAYER
  {
    id: "bricklayer",
    npc: "Bruno the Bricklayer",
    emoji: "🧱",
    axisLabel: "height",
    input: [0, 0, 0, 0, 0], // length 5 = wall height; values unused
    story:
      "Bruno builds a wall of height 5 using bricks of height {1, 2, 3}. He " +
      "wants the number of DISTINCT ways to build it (order matters). " +
      "Define F(i) = number of ways to reach height i.",
    slots: {
      preds: {
        label: "Which earlier heights does F(i) build on?",
        options: [
          { label: "F(i-1), F(i-2), F(i-3)   (one per brick)", correct: true, fn: (i) => [i - 1, i - 2, i - 3] },
          { label: "F(i-1), F(i-2)", correct: false, fn: (i) => [i - 1, i - 2] },
          { label: "F(i-1)  only", correct: false, fn: (i) => [i - 1] },
        ],
      },
      combine: {
        label: "How do you combine them?",
        options: [
          { label: "ADD them together", correct: true, agg: SUM, cost: zeroCost },
          { label: "take the MIN, then + 1", correct: false, agg: MIN, cost: oneCost },
          { label: "take the MAX, then + 1", correct: false, agg: MAX, cost: oneCost },
        ],
      },
      base: {
        label: "What is the base case?",
        options: [
          { label: "F(0) = 1   (one way: empty wall)", correct: true, init: (dp) => { dp[0] = 1; }, start: 1 },
          { label: "F(0) = 0", correct: false, init: (dp) => { dp[0] = 0; }, start: 1 },
          { label: "F(0) = 3   (three brick sizes)", correct: false, init: (dp) => { dp[0] = 3; }, start: 1 },
        ],
      },
    },
  },
];
