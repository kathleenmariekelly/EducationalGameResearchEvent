// scenarios.js
//
// Content pool for NAND Forge. Generated at build time (no API calls at
// play time). Each puzzle asks the player to WIRE a circuit whose truth
// table matches `target`, using only the gate types in `palette`, within
// `budget` gates.
//
// Learning objective (capability-level): given a target gate / truth
// table and a restricted set of gates, the player can CONSTRUCT a circuit
// that produces the correct output by reasoning about the decomposition
// structurally — not by trial and error.
//
// Misconceptions targeted:
//  1. Reaching for trial-and-error instead of reasoning about structure.
//  2. Surprise at how many gates a construction actually costs.
//  3. Forgetting a single signal can feed BOTH inputs of a gate
//     (NAND(a,a) = NOT a is the whole first puzzle).
//
// `target` is the output bit for each input combination, ordered by the
// inputs treated as a binary number with the FIRST input as the MSB.
// e.g. inputs ["A","B"] -> rows for AB = 00, 01, 10, 11.

export const TIER1_TYPES = ["NAND"];
export const ALL_TYPES = ["NAND", "NOT", "AND", "OR", "NOR"];

export const SCENARIOS = [
  // ---- Tier 1: NAND-only, EXACT budget (must find the canonical form) ----
  {
    id: "not",
    title: "Build NOT",
    blurb: "One NAND. But a NAND has two inputs and you only have A...",
    inputs: ["A"],
    palette: TIER1_TYPES,
    budget: 1,
    exact: true,
    target: [1, 0], // A=0 -> 1, A=1 -> 0
    minimalCount: 1,
    reveal: "NAND(A, A) = NOT A. Feeding the same signal into both inputs is legal — that's the trick you'll reuse everywhere.",
  },
  {
    id: "and",
    title: "Build AND",
    blurb: "NAND already almost is AND. What's left to undo?",
    inputs: ["A", "B"],
    palette: TIER1_TYPES,
    budget: 2,
    exact: true,
    target: [0, 0, 0, 1],
    minimalCount: 2,
    reveal: "g0 = NAND(A, B) gives you NOT-AND. Then g1 = NAND(g0, g0) inverts it back to AND.",
  },
  {
    id: "or",
    title: "Build OR",
    blurb: "De Morgan: A OR B = NOT( NOT A AND NOT B ). Turn that into NANDs.",
    inputs: ["A", "B"],
    palette: TIER1_TYPES,
    budget: 3,
    exact: true,
    target: [0, 1, 1, 1],
    minimalCount: 3,
    reveal: "g0 = NAND(A, A) = NOT A. g1 = NAND(B, B) = NOT B. g2 = NAND(g0, g1) = OR.",
  },
  {
    id: "nor",
    title: "Build NOR",
    blurb: "You just built OR in 3. NOR is one honest step further.",
    inputs: ["A", "B"],
    palette: TIER1_TYPES,
    budget: 4,
    exact: true,
    target: [1, 0, 0, 0],
    minimalCount: 4,
    reveal: "Build OR (3 gates), then invert with a fourth NAND(out, out).",
  },
  {
    id: "xor",
    title: "Build XOR",
    blurb: "The classic. Four NANDs. A middle gate gets reused twice.",
    inputs: ["A", "B"],
    palette: TIER1_TYPES,
    budget: 4,
    exact: true,
    target: [0, 1, 1, 0],
    minimalCount: 4,
    reveal: "g0 = NAND(A, B). g1 = NAND(A, g0). g2 = NAND(B, g0). g3 = NAND(g1, g2). Notice g0 feeds both g1 and g2.",
  },

  // ---- Tier 2: full palette, MYSTERY truth tables, looser budget ----
  {
    id: "imply",
    title: "Mystery Table #1",
    blurb: "No gate name this time. Read the table and decompose it yourself.",
    inputs: ["A", "B"],
    palette: ALL_TYPES,
    budget: 3,
    exact: false,
    target: [1, 1, 0, 1], // this is A -> B (implication)
    minimalCount: 2,
    reveal: "This is implication A→B = (NOT A) OR B. g0 = NOT(A), g1 = OR(g0, B). Two gates.",
  },
  {
    id: "xnor",
    title: "Mystery Table #2",
    blurb: "Output is 1 only when the inputs agree.",
    inputs: ["A", "B"],
    palette: ALL_TYPES,
    budget: 4,
    exact: false,
    target: [1, 0, 0, 1], // XNOR
    minimalCount: 3,
    reveal: "XNOR = (A AND B) OR (A NOR B). g0 = AND(A,B), g1 = NOR(A,B), g2 = OR(g0,g1).",
  },
  {
    id: "mux",
    title: "Mystery Table #3",
    blurb: "Three inputs. S selects: when S=0 pass A, when S=1 pass B.",
    inputs: ["S", "A", "B"],
    palette: ALL_TYPES,
    budget: 5,
    exact: false,
    target: [0, 0, 1, 1, 0, 1, 0, 1], // out = S ? B : A
    minimalCount: 4,
    reveal: "A 2:1 mux. g0 = NOT(S), g1 = AND(g0, A), g2 = AND(S, B), g3 = OR(g1, g2).",
  },
  {
    id: "majority",
    title: "Mystery Table #4",
    blurb: "Three inputs. Output 1 when at least two of them are 1.",
    inputs: ["A", "B", "C"],
    palette: ALL_TYPES,
    budget: 6,
    exact: false,
    target: [0, 0, 0, 1, 0, 1, 1, 1], // majority
    minimalCount: 5,
    reveal: "Majority = (A AND B) OR (A AND C) OR (B AND C). Three ANDs and two ORs.",
  },
  {
    id: "parity",
    title: "Mystery Table #5",
    blurb: "Three inputs. Output 1 when an ODD number of them are 1.",
    inputs: ["A", "B", "C"],
    palette: ALL_TYPES,
    budget: 9,
    exact: false,
    target: [0, 1, 1, 0, 1, 0, 0, 1], // 3-input parity (A xor B xor C)
    minimalCount: 8,
    reveal: "Chain two XORs: (A XOR B) XOR C. Each XOR is 4 NANDs, so 8 total — a real taste of how cost stacks up.",
  },
];
