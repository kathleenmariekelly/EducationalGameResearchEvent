// forge.js
//
// The "Forge" levels (7 & 8): after tuning weights by intuition for six
// rooms, the CS-student player writes the loot table's ACTUAL code. Two
// slots, each drawing a puzzle at random from a pool so replays differ:
//   Forge I  — fill in a piece of the drop-rate math (FILL_PUZZLES)
//   Forge II — order the lines of a weighted-pick algorithm (PARSONS_PUZZLES)
//
// Both are verified by RUNNING the produced code against a live drop test in
// the browser (a Monte Carlo simulation for Parsons, a direct evaluation for
// Fill) — no API calls, safe to publish as static files. Each puzzle carries
// a hint that the scene surfaces after two failed attempts.

// ---------------------------------------------------------------------------
// FILL puzzles. Each: skeleton lines (with ??? where the option goes), the
// function params (`vars`), a numeric `test` the chosen code must satisfy,
// options (one correct, distractors encode misconceptions), and a hint.
// ---------------------------------------------------------------------------
export const FILL_PUZZLES = [
  {
    id: "fill-product",
    title: "Forge I — The Drop-Rate Formula",
    intro:
      "This is the real function the dungeon uses to compute an item's drop " +
      "rate through the loot tree. One line is missing. Pick the expression " +
      "that makes it correct.",
    vars: ["catShare", "itemShare"],
    skeleton: [
      "function dropRate(catShare, itemShare) {",
      "  // catShare  = this slot's share of all rolls   (e.g. 0.25)",
      "  // itemShare = this item's share within its slot (e.g. 0.20)",
      "  return ???;",
      "}",
    ],
    test: { args: { catShare: 0.25, itemShare: 0.2 }, expected: 0.05 },
    options: [
      { code: "catShare * itemShare", correct: true },
      { code: "catShare + itemShare", correct: false,
        why: "Adding the two levels treats the tree as one flat choice. The rate flows through both picks in sequence, so they multiply." },
      { code: "itemShare", correct: false,
        why: "This ignores the slot level entirely, as if the item's slot were always chosen. That's the flat-table mistake the tree fixes." },
      { code: "(catShare + itemShare) / 2", correct: false,
        why: "Averaging isn't how compound probability works. Two independent picks in a row multiply." },
    ],
    hints: [
      "Think of it as a sequence: first the slot is chosen, then the item within it. Both have to happen.",
      "Two independent events in sequence combine by multiplying. catShare AND itemShare \u2192 catShare * itemShare.",
    ],
  },
  {
    id: "fill-from-weights",
    title: "Forge I — From Weights to a Rate",
    intro:
      "Here the function is handed raw weights, not shares. Fill in the return " +
      "so it computes the item's true drop rate straight from the weights.",
    vars: ["catWeight", "sumCat", "itemWeight", "sumItems"],
    skeleton: [
      "function dropRate(catWeight, sumCat, itemWeight, sumItems) {",
      "  // sumCat   = total of ALL category weights",
      "  // sumItems = total of item weights in THIS category",
      "  return ???;",
      "}",
    ],
    test: { args: { catWeight: 10, sumCat: 40, itemWeight: 5, sumItems: 25 }, expected: 0.05 },
    options: [
      { code: "(catWeight / sumCat) * (itemWeight / sumItems)", correct: true },
      { code: "catWeight / sumCat + itemWeight / sumItems", correct: false,
        why: "Each level is weight/total — a share. But the two shares multiply, they don't add." },
      { code: "itemWeight / sumItems", correct: false,
        why: "That's only the within-slot share. You dropped the category level of the tree." },
      { code: "(catWeight * itemWeight) / (sumCat + sumItems)", correct: false,
        why: "The denominators belong to their own level. You can't pool them into one sum." },
    ],
    hints: [
      "Each level is a share on its own: a weight divided by the total at that level.",
      "Compute both shares, then multiply: (catWeight / sumCat) * (itemWeight / sumItems).",
    ],
  },
  {
    id: "fill-item-share",
    title: "Forge I — Share Within a Slot",
    intro:
      "One item's share of its own slot is the building block of everything " +
      "else. Fill in the return so heavier items take a bigger slice of the slot.",
    vars: ["itemWeight", "sumItems"],
    skeleton: [
      "function itemShare(itemWeight, sumItems) {",
      "  // sumItems = total of all item weights in this slot",
      "  return ???;",
      "}",
    ],
    test: { args: { itemWeight: 5, sumItems: 25 }, expected: 0.2 },
    options: [
      { code: "itemWeight / sumItems", correct: true },
      { code: "itemWeight / 100", correct: false,
        why: "A weight isn't a percentage. Dividing by 100 only works if the weights happen to total 100 — they usually don't." },
      { code: "itemWeight / (sumItems - itemWeight)", correct: false,
        why: "That's odds against the rest, not this item's share of the whole. The denominator should be the full total." },
      { code: "sumItems / itemWeight", correct: false,
        why: "Flipped. A bigger weight should give a bigger share, so the item's weight goes on top." },
    ],
    hints: [
      "A share is 'part out of the whole' \u2014 this item compared to everything in the slot.",
      "Put the item's own weight on top and the slot's total on the bottom: itemWeight / sumItems.",
    ],
  },
];

// ---------------------------------------------------------------------------
// PARSONS puzzles. Each defines a function named rollItem(items) that does a
// weighted random pick. Body lines are presented scrambled; the player orders
// them. Verified by simulating many rolls against known weights.
// ---------------------------------------------------------------------------
export const PARSONS_PUZZLES = [
  {
    id: "parsons-subtract",
    title: "Forge II — The Weighted Roll",
    intro:
      "This function does one weighted random pick from a list of " +
      "{ name, weight } items by subtracting weights from a roll. Order the " +
      "body lines so a heavier weight really is picked more often.",
    header: "function rollItem(items) {",
    footer: "}",
    lines: [
      "  const total = items.reduce((s, i) => s + i.weight, 0);",
      "  let roll = Math.random() * total;",
      "  for (const item of items) {",
      "    roll -= item.weight;",
      "    if (roll < 0) return item;",
      "  }",
    ],
    hints: [
      "Set up before you loop: you need the total of all weights, then a random roll in [0, total).",
      "Inside the loop, subtract the current item's weight from the roll; the first time it drops below zero, return that item.",
    ],
  },
  {
    id: "parsons-cumulative",
    title: "Forge II — Cumulative Weights",
    intro:
      "Same goal, different technique: build up a running total and return " +
      "the first item whose cumulative weight passes the roll. Put the lines " +
      "in order.",
    header: "function rollItem(items) {",
    footer: "}",
    lines: [
      "  const total = items.reduce((s, i) => s + i.weight, 0);",
      "  const roll = Math.random() * total;",
      "  let cumulative = 0;",
      "  for (const item of items) {",
      "    cumulative += item.weight;",
      "    if (roll < cumulative) return item;",
      "  }",
    ],
    hints: [
      "Get the total and one random roll first, and start a running 'cumulative' at 0 before the loop.",
      "Inside the loop, add the item's weight to cumulative, then return the item the first time cumulative exceeds the roll.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Verification.
// ---------------------------------------------------------------------------

// Fill: build the chosen expression into the function and check it hits the
// puzzle's expected numeric result.
export function verifyFill(puzzle, chosenCode) {
  const { vars, test } = puzzle;
  const args = vars.map((v) => test.args[v]);
  let predicted;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...vars, `return (${chosenCode});`);
    predicted = fn(...args);
  } catch (e) {
    return { pass: false, detail: `That doesn't run: ${e.message}` };
  }
  const pass = Math.abs(predicted - test.expected) < 1e-9;
  const argStr = vars.map((v) => `${v}=${test.args[v]}`).join(", ");
  return {
    pass,
    detail: pass
      ? `Correct: with ${argStr}, your formula returns ${test.expected} — exactly the true rate.`
      : `With ${argStr}, your formula returns ${round(predicted)}, but the true rate is ${test.expected}.`,
  };
}

function round(n) {
  return typeof n === "number" && isFinite(n) ? Math.round(n * 1000) / 1000 : String(n);
}

// Parsons: assemble the ordered lines into rollItem and simulate.
export function verifyParsons(puzzle, orderedLines) {
  const source = [puzzle.header, ...orderedLines, puzzle.footer].join("\n");
  let rollItem;
  try {
    // eslint-disable-next-line no-new-func
    rollItem = new Function(`${source}\nreturn rollItem;`)();
  } catch (e) {
    return { pass: false, detail: `That doesn't parse: ${e.message}` };
  }

  const items = [
    { name: "Junk", weight: 8 }, // expect ~80%
    { name: "Rare", weight: 1 }, // expect ~10%
    { name: "Epic", weight: 1 }, // expect ~10%
  ];
  const N = 8000;
  const counts = { Junk: 0, Rare: 0, Epic: 0 };
  let bad = 0;
  try {
    for (let i = 0; i < N; i++) {
      const picked = rollItem(items);
      if (!picked || !(picked.name in counts)) { bad++; continue; }
      counts[picked.name]++;
    }
  } catch (e) {
    return { pass: false, detail: `It threw while rolling: ${e.message}` };
  }
  if (bad > N * 0.02) {
    return { pass: false, detail: "The function often returned nothing — the roll never resolves to an item. Check the order." };
  }
  const pct = (n) => (n / N) * 100;
  const junk = pct(counts.Junk);
  const ok = Math.abs(junk - 80) < 6 && Math.abs(pct(counts.Rare) - 10) < 6;
  return {
    pass: ok,
    detail: ok
      ? `Ran ${N.toLocaleString()} rolls: Junk ${junk.toFixed(1)}%, Rare ${pct(counts.Rare).toFixed(1)}%, Epic ${pct(counts.Epic).toFixed(1)}% — matches the weights 8:1:1.`
      : `Ran ${N.toLocaleString()} rolls: Junk ${junk.toFixed(1)}%, Rare ${pct(counts.Rare).toFixed(1)}%, Epic ${pct(counts.Epic).toFixed(1)}%. That doesn't match the 8:1:1 weights — the order isn't picking proportionally yet.`,
  };
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
