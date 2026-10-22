// ORBITAL — Operations Program mission set (10 core interview patterns)
// These are appended to the existing MISSIONS array so the original three
// "Station Systems" missions are preserved untouched.
//
// Extended mission schema (all optional fields degrade gracefully in the engine):
//   statement    : the interview-style problem statement
//   concept      : beginner-friendly explanation of the data structure / algorithm
//   targetTime   : Big-O time label (string)   e.g. "O(n)"
//   targetSpace  : Big-O space label (string)  e.g. "O(1)"
//   approaches   : { brute:{label,detail}, optimal:{label,detail} }
//   hints        : [ "conceptual hint", ..., "implementation hint" ]
//   solution     : explanation shown after the mission is solved
// (plus every field the original missions already use)

// Tag the original missions as the intro group (additive only).
if (typeof MISSIONS !== "undefined") {
  MISSIONS.forEach((m) => {
    if (!m.group) m.group = "Station Systems";
  });
}

const OPS_MISSIONS = [
  // ------------------------------------------------------------------ 1
  {
    id: "twosum",
    group: "Operations Program",
    title: "Two-Container Signal Match",
    tags: ["Hash Map", "Arrays"],
    brief:
      "Two cargo containers each broadcast a signal value. Comms needs the two " +
      "containers whose signals ADD UP to a required handshake frequency.\n\n" +
      "OBJECTIVE: Return the indices of the two signals that sum to the target.",
    statement:
      "Given an array of integers `signals` and an integer `target`, return the " +
      "indices [i, j] (with i < j) of the two entries that add up to target. If no " +
      "pair exists, return []. Assume at most one valid pair.",
    concept:
      "A HASH MAP stores key → value pairs with average O(1) insert and lookup. " +
      "The trick here is the COMPLEMENT: for each value v, the number you still need " +
      "is (target - v). Instead of searching the whole array for that complement, " +
      "you remember every value you've already seen in a hash map and check it " +
      "instantly.",
    signature: "twoSum(signals, target)",
    fn: "twoSum",
    starter:
      "// signals: number[], target: number\n" +
      "// Return [i, j] with i < j so signals[i] + signals[j] === target, else [].\n" +
      "// Starter is CORRECT but O(n^2) — it checks every pair. Make it O(n).\n" +
      "function twoSum(signals, target) {\n" +
      "  for (let i = 0; i < signals.length; i++) {\n" +
      "    for (let j = i + 1; j < signals.length; j++) {\n" +
      "      if (signals[i] + signals[j] === target) return [i, j];\n" +
      "    }\n" +
      "  }\n" +
      "  return [];\n" +
      "}",
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 2, 3], 7], expected: [] },
      { args: [[], 5], expected: [] },
    ],
    scale: () => {
      const n = 2000;
      const signals = [];
      for (let i = 0; i < n; i++) signals.push(i * 2); // all even
      return { signals, target: 3 }; // odd target => no pair => worst case
    },
    runScaled: (fn, data) => {
      fn(data.signals, data.target);
    },
    targetTime: "O(n)",
    targetSpace: "O(n)",
    targetBig: "O(n) time",
    targetOps: 50000,
    approaches: {
      brute: {
        label: "Nested loops — O(n²) time, O(1) space",
        detail:
          "Two nested loops compare every pair of signals. For n signals that is " +
          "about n²/2 comparisons — 2,000 signals ≈ 2,000,000 checks. The outer " +
          "loop runs n times and, for each, the inner loop runs up to n times: " +
          "loop-inside-a-loop is the classic O(n²) fingerprint.",
      },
      optimal: {
        label: "Hash-map complement — O(n) time, O(n) space",
        detail:
          "One pass. For each value v, check if (target - v) is already in the map " +
          "in O(1); if not, store v → its index. A single loop with constant-time " +
          "lookups is O(n) time; the map holding up to n entries is O(n) space.",
      },
    },
    hints: [
      "For each signal you need one specific partner: target - signal. Can you look that partner up instantly instead of scanning for it?",
      "A Map/object lets you check 'have I already seen the number I need?' in O(1).",
      "Loop once. Before storing signals[i], check if the map already contains (target - signals[i]); if so you found the pair.",
      "Implementation: `const seen = new Map(); for (let i...) { const need = target - signals[i]; if (seen.has(need)) return [seen.get(need), i]; seen.set(signals[i], i); } return [];`",
    ],
    reward: { credits: 150, unlock: "Complement Hashing: O(1) average pair lookup" },
    solution:
      "Walk the array once. Keep a Map of value → index for everything seen so far. " +
      "At index i, the partner you need is (target - signals[i]); if it's in the map, " +
      "return [storedIndex, i]. Otherwise record signals[i]. One loop + O(1) lookups " +
      "= O(n) time, O(n) space — versus the O(n²) all-pairs scan.",
  },

  // ------------------------------------------------------------------ 2
  {
    id: "parens",
    group: "Operations Program",
    title: "Airlock Symbol Validation",
    tags: ["Stack", "LIFO"],
    brief:
      "Airlock seals are encoded as a sequence of bracket symbols: ( ) [ ] { }. " +
      "A seal is safe only if every opener is closed by the correct type in the " +
      "right order.\n\n" +
      "OBJECTIVE: Return true if the symbol sequence is validly balanced.",
    statement:
      "Given an array `symbols` containing the characters '(', ')', '[', ']', " +
      "'{', '}', return true if every open bracket is closed by a matching bracket " +
      "in the correct order, and false otherwise. An empty sequence is valid.",
    concept:
      "A STACK is a last-in-first-out (LIFO) pile — you can only add or remove from " +
      "the top. Brackets nest like plates: the most recently opened bracket must be " +
      "the first one closed. Push each opener; when you hit a closer, it must match " +
      "the opener on top of the stack.",
    signature: "validateSeal(symbols)",
    fn: "validateSeal",
    starter:
      "// symbols: array of '(' ')' '[' ']' '{' '}'\n" +
      "// Return true if validly balanced. Starter is CORRECT but O(n^2):\n" +
      "// it repeatedly removes an adjacent matching pair until none remain.\n" +
      "// Rewrite it with a STACK for a single O(n) pass.\n" +
      "function validateSeal(symbols) {\n" +
      "  let changed = true;\n" +
      "  while (changed) {\n" +
      "    changed = false;\n" +
      "    for (let i = 0; i < symbols.length - 1; i++) {\n" +
      "      const a = symbols[i], b = symbols[i + 1];\n" +
      "      if ((a === '(' && b === ')') ||\n" +
      "          (a === '[' && b === ']') ||\n" +
      "          (a === '{' && b === '}')) {\n" +
      "        symbols.splice(i, 2);\n" +
      "        changed = true;\n" +
      "        break;\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "  return symbols.length === 0;\n" +
      "}",
    tests: [
      { args: [["(", ")"]], expected: true },
      { args: [["(", ")", "[", "]", "{", "}"]], expected: true },
      { args: [["(", "[", ")", "]"]], expected: false },
      { args: [["(", "]"]], expected: false },
      { args: [[]], expected: true },
      { args: [["("]], expected: false },
    ],
    scale: () => {
      // Deeply nested valid seal: ((((...))))  -> worst case for the repeated-removal brute.
      const n = 1000;
      const symbols = [];
      for (let i = 0; i < n; i++) symbols.push("(");
      for (let i = 0; i < n; i++) symbols.push(")");
      return { symbols };
    },
    runScaled: (fn, data) => {
      fn(data.symbols);
    },
    targetTime: "O(n)",
    targetSpace: "O(n)",
    targetBig: "O(n) time",
    targetOps: 60000,
    approaches: {
      brute: {
        label: "Repeated pair removal — O(n²) time",
        detail:
          "Scanning for an innermost '()' and splicing it out, over and over, " +
          "re-reads the sequence on every removal. With n/2 removals each costing " +
          "up to O(n), that's O(n²). The outer while-loop wrapping an inner scan is " +
          "the tell-tale sign.",
      },
      optimal: {
        label: "Single stack pass — O(n) time, O(n) space",
        detail:
          "One loop. Push every opener; on a closer, pop and check it matches. " +
          "Each symbol is touched once → O(n) time. The stack may hold up to n " +
          "openers → O(n) space.",
      },
    },
    hints: [
      "The most recently opened bracket must be the first to close. Which data structure gives you 'most recent first'?",
      "Use a stack: push opening brackets onto it as you read them.",
      "When you see a closing bracket, the top of the stack must be its matching opener — otherwise it's invalid. At the end the stack must be empty.",
      "Implementation: `const st=[]; const pairs={')':'(',']':'[','}':'{'}; for (const c of symbols){ if(c==='('||c==='['||c==='{') st.push(c); else if (st.pop() !== pairs[c]) return false; } return st.length===0;`",
    ],
    reward: { credits: 160, unlock: "Stack (LIFO): O(n) balanced-sequence checks" },
    solution:
      "Iterate once with a stack. Push '(', '[', '{'. On ')', ']', '}', pop the " +
      "stack — it must equal the matching opener, else return false. A non-empty " +
      "stack at the end means unclosed openers. Each symbol is processed once: " +
      "O(n) time, O(n) space.",
  },

  // ------------------------------------------------------------------ 3
  {
    id: "bsearch",
    group: "Operations Program",
    title: "Beacon Frequency Search",
    tags: ["Binary Search", "Divide & Conquer"],
    brief:
      "The navigation beacons broadcast on frequencies stored in SORTED ascending " +
      "order. Command pings for a specific frequency thousands of times per second.\n\n" +
      "OBJECTIVE: Return the index of a target frequency in the sorted array, or -1.",
    statement:
      "Given a sorted (ascending) array `freqs` and a value `target`, return the " +
      "index of target, or -1 if it is not present.",
    concept:
      "BINARY SEARCH is divide-and-conquer: because the data is sorted, you can " +
      "check the middle element and instantly discard HALF the array. Repeatedly " +
      "halving n items takes about log₂(n) steps — 1,000,000 items in ~20 checks.",
    signature: "findBeacon(freqs, target)",
    fn: "findBeacon",
    starter:
      "// freqs: sorted ascending number[], target: number\n" +
      "// Return index of target or -1. Starter is CORRECT but O(n) linear scan.\n" +
      "// The array is SORTED — exploit that to reach O(log n).\n" +
      "function findBeacon(freqs, target) {\n" +
      "  for (let i = 0; i < freqs.length; i++) {\n" +
      "    if (freqs[i] === target) return i;\n" +
      "  }\n" +
      "  return -1;\n" +
      "}",
    tests: [
      { args: [[1, 3, 5, 7, 9], 7], expected: 3 },
      { args: [[1, 3, 5, 7, 9], 4], expected: -1 },
      { args: [[], 1], expected: -1 },
      { args: [[5], 5], expected: 0 },
      { args: [[2, 4, 6, 8, 10, 12], 2], expected: 0 },
      { args: [[2, 4, 6, 8, 10, 12], 12], expected: 5 },
    ],
    scale: () => {
      const n = 100000;
      const freqs = [];
      for (let i = 0; i < n; i++) freqs.push(i * 2);
      const queries = [];
      for (let i = 0; i < 200; i++) queries.push(i * 2 + 1); // misses => worst case
      return { freqs, queries };
    },
    runScaled: (fn, data) => {
      for (const q of data.queries) fn(data.freqs, q);
    },
    targetTime: "O(log n)",
    targetSpace: "O(1)",
    targetBig: "O(log n) time",
    targetOps: 20000,
    approaches: {
      brute: {
        label: "Linear scan — O(n) time",
        detail:
          "Checking elements one by one ignores the sorted order. Each query walks " +
          "up to n elements; 200 queries over 100,000 items ≈ 20,000,000 reads. A " +
          "single loop over all n elements is textbook O(n).",
      },
      optimal: {
        label: "Binary search — O(log n) time, O(1) space",
        detail:
          "Each step compares the middle element and throws away half the range. " +
          "log₂(100,000) ≈ 17 steps per query. A few pointers → O(1) extra space.",
      },
    },
    hints: [
      "The array is sorted. If you look at the middle value, what does comparing it to the target tell you about which half to keep?",
      "Maintain lo and hi pointers. Compare freqs[mid] to target and discard the half that can't contain it.",
      "If freqs[mid] < target, search the right half (lo = mid+1); if greater, search the left (hi = mid-1); if equal, return mid.",
      "Implementation: `let lo=0, hi=freqs.length-1; while(lo<=hi){ const mid=(lo+hi)>>1; if(freqs[mid]===target) return mid; if(freqs[mid]<target) lo=mid+1; else hi=mid-1; } return -1;`",
    ],
    reward: { credits: 170, unlock: "Binary Search: O(log n) lookups in sorted data" },
    solution:
      "Keep a lo/hi window over the array. Each iteration examine the midpoint: if " +
      "it equals target you're done; if it's smaller, the answer must be to the " +
      "right (lo = mid+1); if larger, to the left (hi = mid-1). Halving the search " +
      "space each step gives O(log n) time and O(1) space.",
  },

  // ------------------------------------------------------------------ 4
  {
    id: "window",
    group: "Operations Program",
    title: "Long-Range Communication Window",
    tags: ["Sliding Window", "Two Pointers"],
    brief:
      "A deep-space transmitter sends a stream of signal tokens. The longest burst " +
      "you can send cleanly is the longest run with NO repeated token.\n\n" +
      "OBJECTIVE: Return the length of the longest contiguous run of unique tokens.",
    statement:
      "Given an array `samples` of tokens, return the length of the longest " +
      "contiguous subarray that contains no repeated token.",
    concept:
      "The SLIDING WINDOW uses TWO POINTERS (left, right) that define a window over " +
      "the array. Expand right to grow the window; when a duplicate appears, move " +
      "left forward to shrink until the window is valid again. Each pointer only " +
      "ever moves forward, so the whole scan is O(n).",
    signature: "longestClearWindow(samples)",
    fn: "longestClearWindow",
    starter:
      "// samples: array of tokens (e.g. strings)\n" +
      "// Return length of the longest run with all-unique tokens.\n" +
      "// Starter is CORRECT but O(n^2): it restarts a scan from every index.\n" +
      "function longestClearWindow(samples) {\n" +
      "  let best = 0;\n" +
      "  for (let i = 0; i < samples.length; i++) {\n" +
      "    const seen = new Set();\n" +
      "    for (let j = i; j < samples.length; j++) {\n" +
      "      if (seen.has(samples[j])) break;\n" +
      "      seen.add(samples[j]);\n" +
      "      best = Math.max(best, j - i + 1);\n" +
      "    }\n" +
      "  }\n" +
      "  return best;\n" +
      "}",
    tests: [
      { args: [["a", "b", "c", "a", "b", "b"]], expected: 3 },
      { args: [["b", "b", "b", "b"]], expected: 1 },
      { args: [[]], expected: 0 },
      { args: [["p", "w", "w", "k", "e", "w"]], expected: 3 },
      { args: [["a", "b", "c", "d"]], expected: 4 },
    ],
    scale: () => {
      const n = 2000;
      const samples = [];
      for (let i = 0; i < n; i++) samples.push("t" + i); // all unique => brute worst case
      return { samples };
    },
    runScaled: (fn, data) => {
      fn(data.samples);
    },
    targetTime: "O(n)",
    targetSpace: "O(k)",
    targetBig: "O(n) time",
    targetOps: 80000,
    approaches: {
      brute: {
        label: "Every start index rescanned — O(n²) time",
        detail:
          "Starting a fresh scan from each index re-reads much of the array again " +
          "and again. With all-unique data the inner loop runs the full length each " +
          "time → about n²/2 reads. Outer loop × inner loop = O(n²).",
      },
      optimal: {
        label: "Sliding window — O(n) time, O(k) space",
        detail:
          "left and right pointers sweep across once. Every element is added when " +
          "right passes it and removed when left passes it — each index visited at " +
          "most twice → O(n). The 'seen' set holds at most k distinct tokens → O(k).",
      },
    },
    hints: [
      "Instead of restarting from every index, can you keep a window and only slide its edges forward?",
      "Track the current window with left/right pointers and a Set of tokens inside it.",
      "Move right to include samples[right]. If that token is already in the window, move left forward (removing tokens) until the duplicate is gone. Record the best window size each step.",
      "Implementation: `let left=0,best=0; const seen=new Set(); for(let right=0;right<samples.length;right++){ while(seen.has(samples[right])){ seen.delete(samples[left]); left++; } seen.add(samples[right]); best=Math.max(best,right-left+1);} return best;`",
    ],
    reward: { credits: 200, unlock: "Sliding Window: O(n) contiguous-range scanning" },
    solution:
      "Use two pointers forming a window. Advance right through the array, adding " +
      "each token to a Set. If a token is already present, advance left (deleting " +
      "tokens) until the window is duplicate-free, then continue. Track the maximum " +
      "window width. Each pointer moves forward at most n times → O(n) time, and the " +
      "Set holds at most k distinct tokens → O(k) space.",
  },

  // ------------------------------------------------------------------ 5
  {
    id: "intervals",
    group: "Operations Program",
    title: "Docking Schedule Conflicts",
    tags: ["Sorting", "Intervals"],
    brief:
      "Docking bay reservations arrive as time windows [start, end]. Overlapping " +
      "windows must be fused into single continuous bookings.\n\n" +
      "OBJECTIVE: Merge all overlapping intervals and return them sorted by start.",
    statement:
      "Given an array `intervals` of [start, end] pairs, merge every set of " +
      "overlapping intervals and return the resulting non-overlapping intervals " +
      "sorted by start. Intervals that merely touch (e.g. [1,4] and [4,5]) merge.",
    concept:
      "The key insight: if you SORT the intervals by start time, any interval that " +
      "overlaps another must be adjacent in that order. Then a single left-to-right " +
      "pass either extends the current merged interval or starts a new one. Sorting " +
      "costs O(n log n); the pass is O(n).",
    signature: "mergeWindows(intervals)",
    fn: "mergeWindows",
    starter:
      "// intervals: [start, end][]\n" +
      "// Return merged, non-overlapping intervals sorted by start.\n" +
      "// Starter is CORRECT but O(n^2): it rescans for any overlapping pair.\n" +
      "function mergeWindows(intervals) {\n" +
      "  let merged = true;\n" +
      "  while (merged) {\n" +
      "    merged = false;\n" +
      "    for (let i = 0; i < intervals.length; i++) {\n" +
      "      for (let j = i + 1; j < intervals.length; j++) {\n" +
      "        if (intervals[i][0] <= intervals[j][1] &&\n" +
      "            intervals[j][0] <= intervals[i][1]) {\n" +
      "          intervals[i] = [Math.min(intervals[i][0], intervals[j][0]),\n" +
      "                          Math.max(intervals[i][1], intervals[j][1])];\n" +
      "          intervals.splice(j, 1);\n" +
      "          merged = true;\n" +
      "          j--;\n" +
      "        }\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "  intervals.sort((a, b) => a[0] - b[0]);\n" +
      "  return intervals;\n" +
      "}",
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[]], expected: [] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
      { args: [[[5, 6], [1, 2], [3, 4]]], expected: [[1, 2], [3, 4], [5, 6]] },
    ],
    scale: () => {
      const n = 2000;
      const intervals = [];
      // Non-overlapping windows: the naive pairwise scan has no early merges,
      // so it performs a full O(n^2) comparison sweep (worst case for the brute).
      for (let i = 0; i < n; i++) intervals.push([i * 3, i * 3 + 1]);
      return { intervals };
    },
    runScaled: (fn, data) => {
      fn(data.intervals);
    },
    targetTime: "O(n log n)",
    targetSpace: "O(n)",
    targetBig: "O(n log n) time",
    targetOps: 130000,
    approaches: {
      brute: {
        label: "Repeated pairwise merging — O(n²) time or worse",
        detail:
          "Searching the whole list for any overlapping pair, merging, and " +
          "restarting re-examines pairs over and over. The nested i/j loops inside a " +
          "while-loop give O(n²) (or worse with the restarts).",
      },
      optimal: {
        label: "Sort then sweep — O(n log n) time, O(n) space",
        detail:
          "Sorting by start is O(n log n) and dominates. One linear pass then merges " +
          "or appends each interval in O(n). Because overlaps are adjacent after " +
          "sorting, no rescanning is needed.",
      },
    },
    hints: [
      "If two windows overlap, what has to be true about their start times? Would ordering the intervals make overlaps easier to spot?",
      "Sort the intervals by start time first. Then overlapping intervals are always next to each other.",
      "Walk the sorted list keeping a 'current' interval. If the next start is ≤ current end, extend current's end; otherwise push current and start a new one.",
      "Implementation: `intervals.sort((a,b)=>a[0]-b[0]); const out=[]; for(const iv of intervals){ const last=out[out.length-1]; if(last && iv[0]<=last[1]) last[1]=Math.max(last[1],iv[1]); else out.push(iv.slice()); } return out;`",
    ],
    reward: { credits: 210, unlock: "Sort-and-Sweep: O(n log n) interval merging" },
    solution:
      "Sort intervals by start. Iterate once, keeping the last merged interval: if " +
      "the current interval starts at or before the last one's end, extend the end; " +
      "otherwise append it as a new block. Sorting is O(n log n) (the dominant cost), " +
      "the sweep is O(n), and the output uses O(n) space.",
  },

  // ------------------------------------------------------------------ 6
  {
    id: "cables",
    group: "Operations Program",
    title: "Repair Cable Network",
    tags: ["Linked List", "Pointers"],
    brief:
      "Power cables are wired as a chain: each junction points to the next. After a " +
      "fault, Engineering needs the junction values reported in REVERSE order.\n\n" +
      "OBJECTIVE: Traverse the linked chain and return its values reversed.",
    statement:
      "A linked list is given as a `head` index plus a `nodes` array where each " +
      "node is { val, next } and `next` is the index of the following node (or -1 " +
      "for the end). Return an array of the node values in REVERSED list order.",
    concept:
      "A LINKED LIST stores each element in a node that POINTS to the next node, so " +
      "you follow pointers rather than jump by index. Traversing the whole chain " +
      "once is O(n). You can reverse it by collecting values in order and flipping " +
      "them, or by rewiring pointers in place for O(1) extra space.",
    signature: "reverseCables(head, nodes)",
    fn: "reverseCables",
    starter:
      "// head: index of first node (or -1). nodes: [{ val, next }] (next = index or -1)\n" +
      "// Return array of values in reversed list order.\n" +
      "// Starter is CORRECT but O(n^2): it re-walks the chain for every position.\n" +
      "function reverseCables(head, nodes) {\n" +
      "  let len = 0, c = head;\n" +
      "  while (c !== -1) { len++; c = nodes[c].next; }\n" +
      "  const res = [];\n" +
      "  for (let k = len - 1; k >= 0; k--) {\n" +
      "    let cur = head;\n" +
      "    for (let s = 0; s < k; s++) cur = nodes[cur].next;\n" +
      "    res.push(nodes[cur].val);\n" +
      "  }\n" +
      "  return res;\n" +
      "}",
    tests: [
      { args: [0, [{ val: 1, next: 1 }, { val: 2, next: 2 }, { val: 3, next: -1 }]], expected: [3, 2, 1] },
      { args: [0, [{ val: 9, next: -1 }]], expected: [9] },
      { args: [2, [{ val: 3, next: -1 }, { val: 2, next: 0 }, { val: 1, next: 1 }]], expected: [3, 2, 1] },
      { args: [-1, []], expected: [] },
      { args: [1, [{ val: 5, next: -1 }, { val: 4, next: 0 }]], expected: [5, 4] },
    ],
    scale: () => {
      const n = 2000;
      const nodes = [];
      for (let i = 0; i < n; i++) nodes.push({ val: i, next: i === n - 1 ? -1 : i + 1 });
      return { head: 0, nodes };
    },
    runScaled: (fn, data) => {
      fn(data.head, data.nodes);
    },
    targetTime: "O(n)",
    targetSpace: "O(n)",
    targetBig: "O(n) time",
    targetOps: 80000,
    approaches: {
      brute: {
        label: "Re-walk for each position — O(n²) time",
        detail:
          "Because you can't index a linked list directly, walking from the head to " +
          "reach position k costs k steps. Doing that for every k is 0+1+…+n ≈ n²/2 " +
          "pointer hops. The inner walk inside the outer loop makes it O(n²).",
      },
      optimal: {
        label: "Single traversal — O(n) time, O(1) extra space",
        detail:
          "Follow next pointers once. Either collect values then reverse the array " +
          "(O(n) space), or reverse the pointers as you go using three variables " +
          "(prev, cur, next) for O(1) extra space. Either way the chain is walked " +
          "exactly once → O(n) time.",
      },
    },
    hints: [
      "You never need to restart from the head. What if you visited each junction exactly once and remembered the values?",
      "Follow next pointers from head to the end, pushing each value into an array as you go.",
      "Then reverse that array (or build it by unshifting / prepending). For O(1) extra space, flip the .next pointers in place with prev/cur/next variables.",
      "Implementation: `const out=[]; let cur=head; while(cur!==-1){ out.push(nodes[cur].val); cur=nodes[cur].next; } out.reverse(); return out;`",
    ],
    reward: { credits: 210, unlock: "Pointer Traversal: O(n) single-pass linked-list ops" },
    solution:
      "Follow the next pointers from head to tail exactly once, collecting each val. " +
      "Reverse the collected array (or prepend as you go) to produce reversed order. " +
      "That's O(n) time. Reversing the pointers in place with prev/cur/next avoids " +
      "the extra array for O(1) extra space — the classic linked-list reversal.",
  },

  // ------------------------------------------------------------------ 7
  {
    id: "tree",
    group: "Operations Program",
    title: "Station Command Tree",
    tags: ["Tree", "Recursion", "DFS"],
    brief:
      "The station's chain of command is a binary tree of officers. Given two " +
      "officers, Command needs the lowest-ranking common superior of both.\n\n" +
      "OBJECTIVE: Find the Lowest Common Ancestor (LCA) of two node values.",
    statement:
      "A binary tree is given as a `nodes` array where each node is " +
      "{ val, left, right } (left/right are child indices or -1), plus a `root` " +
      "index. Given two distinct values p and q that exist in the tree, return the " +
      "value of their lowest common ancestor — the deepest node that has both in its " +
      "subtree.",
    concept:
      "A TREE is nodes connected as a hierarchy; each node has children. RECURSION " +
      "with DEPTH-FIRST SEARCH (DFS) naturally explores a tree: solve a node using " +
      "the answers from its left and right subtrees. The elegant LCA trick: a node " +
      "is the LCA if p and q are found on DIFFERENT sides beneath it (or the node " +
      "itself is p or q).",
    signature: "findCommander(nodes, root, p, q)",
    fn: "findCommander",
    starter:
      "// nodes: [{ val, left, right }] (child = index or -1). root: index. p,q: values.\n" +
      "// Return the value of the lowest common ancestor of p and q.\n" +
      "// Starter is CORRECT but O(n^2): it re-searches each node's subtree.\n" +
      "function findCommander(nodes, root, p, q) {\n" +
      "  function inSubtree(idx, val) {\n" +
      "    if (idx === -1) return false;\n" +
      "    if (nodes[idx].val === val) return true;\n" +
      "    return inSubtree(nodes[idx].left, val) || inSubtree(nodes[idx].right, val);\n" +
      "  }\n" +
      "  let best = -1, bestDepth = -1;\n" +
      "  function walk(idx, depth) {\n" +
      "    if (idx === -1) return;\n" +
      "    if (inSubtree(idx, p) && inSubtree(idx, q)) {\n" +
      "      if (depth > bestDepth) { bestDepth = depth; best = nodes[idx].val; }\n" +
      "    }\n" +
      "    walk(nodes[idx].left, depth + 1);\n" +
      "    walk(nodes[idx].right, depth + 1);\n" +
      "  }\n" +
      "  walk(root, 0);\n" +
      "  return best;\n" +
      "}",
    tests: [
      // Tree: 0:3(1,2) 1:5(3,4) 2:1(5,6) 3:6 4:2(7,8) 5:0 6:8 7:7 8:4
      {
        args: [
          [
            { val: 3, left: 1, right: 2 }, { val: 5, left: 3, right: 4 },
            { val: 1, left: 5, right: 6 }, { val: 6, left: -1, right: -1 },
            { val: 2, left: 7, right: 8 }, { val: 0, left: -1, right: -1 },
            { val: 8, left: -1, right: -1 }, { val: 7, left: -1, right: -1 },
            { val: 4, left: -1, right: -1 },
          ], 0, 5, 1,
        ],
        expected: 3,
      },
      {
        args: [
          [
            { val: 3, left: 1, right: 2 }, { val: 5, left: 3, right: 4 },
            { val: 1, left: 5, right: 6 }, { val: 6, left: -1, right: -1 },
            { val: 2, left: 7, right: 8 }, { val: 0, left: -1, right: -1 },
            { val: 8, left: -1, right: -1 }, { val: 7, left: -1, right: -1 },
            { val: 4, left: -1, right: -1 },
          ], 0, 6, 4,
        ],
        expected: 5,
      },
      {
        args: [
          [
            { val: 3, left: 1, right: 2 }, { val: 5, left: 3, right: 4 },
            { val: 1, left: 5, right: 6 }, { val: 6, left: -1, right: -1 },
            { val: 2, left: 7, right: 8 }, { val: 0, left: -1, right: -1 },
            { val: 8, left: -1, right: -1 }, { val: 7, left: -1, right: -1 },
            { val: 4, left: -1, right: -1 },
          ], 0, 7, 8,
        ],
        expected: 3,
      },
      {
        args: [
          [
            { val: 3, left: 1, right: 2 }, { val: 5, left: 3, right: 4 },
            { val: 1, left: 5, right: 6 }, { val: 6, left: -1, right: -1 },
            { val: 2, left: 7, right: 8 }, { val: 0, left: -1, right: -1 },
            { val: 8, left: -1, right: -1 }, { val: 7, left: -1, right: -1 },
            { val: 4, left: -1, right: -1 },
          ], 0, 5, 4,
        ],
        expected: 5,
      },
      { args: [[{ val: 1, left: -1, right: -1 }], 0, 1, 1], expected: 1 },
    ],
    scale: () => {
      const n = 2000;
      const nodes = [];
      for (let i = 0; i < n; i++) {
        const left = 2 * i + 1, right = 2 * i + 2;
        nodes.push({ val: i, left: left < n ? left : -1, right: right < n ? right : -1 });
      }
      return { nodes, root: 0, p: n - 1, q: n - 2 };
    },
    runScaled: (fn, data) => {
      fn(data.nodes, data.root, data.p, data.q);
    },
    targetTime: "O(n)",
    targetSpace: "O(h)",
    targetBig: "O(n) time",
    targetOps: 130000,
    approaches: {
      brute: {
        label: "Re-scan every subtree — O(n²) time",
        detail:
          "Testing 'does this node's subtree contain both p and q?' is itself an " +
          "O(n) search, and doing it for every node is O(n²). A per-node search " +
          "nested inside a full-tree walk is the O(n²) fingerprint.",
      },
      optimal: {
        label: "Single DFS — O(n) time, O(h) space",
        detail:
          "One recursive post-order pass. Each node reports whether p or q was " +
          "found below it; the first node that finds them on both sides is the LCA. " +
          "Every node is visited once → O(n) time; the recursion stack is at most " +
          "the tree height h → O(h) space.",
      },
    },
    hints: [
      "You don't need to test every node independently. Can one traversal report back what each subtree contains?",
      "Recurse depth-first. Ask each child subtree: 'did you find p or q?'",
      "If p and q are found in different children of a node (or the node itself is p or q), that node is the LCA.",
      "Implementation: `function dfs(i){ if(i===-1) return null; const n=nodes[i]; if(n.val===p||n.val===q) return n.val; const L=dfs(n.left), R=dfs(n.right); if(L!==null&&R!==null) return n.val; return L!==null?L:R; } return dfs(root);`",
    ],
    reward: { credits: 240, unlock: "Recursive DFS: O(n) tree traversal & LCA" },
    solution:
      "Do a single depth-first recursion. A node returns a found-value if it or a " +
      "descendant is p or q. When a node gets a non-null result from BOTH its left " +
      "and right recursion, it is the lowest common ancestor. Because each node is " +
      "visited exactly once it's O(n) time, using O(h) stack space for the recursion " +
      "(h = tree height).",
  },

  // ------------------------------------------------------------------ 8
  {
    id: "grid",
    group: "Operations Program",
    title: "Emergency Route Network",
    tags: ["Graph", "BFS", "Queue"],
    brief:
      "An emergency drone must cross a station deck grid from the top-left cell to " +
      "the bottom-right, moving up/down/left/right through open cells (0) and " +
      "avoiding walls (1).\n\n" +
      "OBJECTIVE: Return the fewest moves to reach the exit, or -1 if impossible.",
    statement:
      "Given a 2D `grid` of 0 (open) and 1 (wall), return the minimum number of " +
      "4-directional moves from cell (0,0) to the bottom-right cell. Return -1 if no " +
      "path exists. A 1×1 open grid needs 0 moves. Start and goal are open.",
    concept:
      "A grid is a GRAPH: each open cell is a node connected to its open neighbours. " +
      "BREADTH-FIRST SEARCH (BFS) explores level by level using a QUEUE, so the " +
      "first time it reaches the goal it has used the fewest moves. A VISITED set " +
      "stops you from re-expanding cells. BFS runs in O(V + E) — here O(rows×cols).",
    signature: "emergencyRoute(grid)",
    fn: "emergencyRoute",
    starter:
      "// grid: number[][] of 0 (open) / 1 (wall)\n" +
      "// Return fewest 4-directional moves from (0,0) to bottom-right, or -1.\n" +
      "// Starter is CORRECT but uses exhaustive backtracking DFS (exponential!).\n" +
      "// Replace it with BFS + a visited set for O(rows*cols).\n" +
      "function emergencyRoute(grid) {\n" +
      "  const R = grid.length, C = grid[0] ? grid[0].length : 0;\n" +
      "  if (R === 0 || C === 0) return -1;\n" +
      "  let best = Infinity;\n" +
      "  const seen = new Set();\n" +
      "  function dfs(r, c, dist) {\n" +
      "    if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] === 1) return;\n" +
      "    const key = r + ',' + c;\n" +
      "    if (seen.has(key)) return;\n" +
      "    if (r === R - 1 && c === C - 1) { best = Math.min(best, dist); return; }\n" +
      "    seen.add(key);\n" +
      "    dfs(r + 1, c, dist + 1); dfs(r - 1, c, dist + 1);\n" +
      "    dfs(r, c + 1, dist + 1); dfs(r, c - 1, dist + 1);\n" +
      "    seen.delete(key);\n" +
      "  }\n" +
      "  dfs(0, 0, 0);\n" +
      "  return best === Infinity ? -1 : best;\n" +
      "}",
    tests: [
      { args: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], expected: 4 },
      { args: [[[0, 1], [1, 0]]], expected: -1 },
      { args: [[[0]]], expected: 0 },
      { args: [[[0, 0], [0, 0]]], expected: 2 },
      { args: [[[0, 0, 0, 0]]], expected: 3 },
    ],
    scale: () => {
      const size = 25;
      const grid = [];
      for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) row.push(0); // fully open => brute explodes
        grid.push(row);
      }
      return { grid };
    },
    runScaled: (fn, data) => {
      fn(data.grid);
    },
    targetTime: "O(V + E)",
    targetSpace: "O(V)",
    targetBig: "O(V + E) time",
    targetOps: 40000,
    approaches: {
      brute: {
        label: "Backtracking DFS over all paths — exponential time",
        detail:
          "Exploring every possible route and keeping the shortest revisits cells " +
          "along exponentially many paths. On an open grid the number of paths blows " +
          "up astronomically — the recursion 'branches' 4 ways at each step, the " +
          "signature of exponential O(4^depth) work.",
      },
      optimal: {
        label: "BFS with visited set — O(V + E) time, O(V) space",
        detail:
          "A queue expands cells in ring order, so the goal is first reached by a " +
          "shortest path. Each cell is enqueued once (visited set) and its ≤4 edges " +
          "checked once → O(V + E). The queue/visited set are O(V) space.",
      },
    },
    hints: [
      "You want the FEWEST moves. If you explore outward one ring at a time, the first time you touch the exit you've used the fewest moves — which structure processes items in arrival order?",
      "Use BFS with a queue of cells plus a visited set so you never process a cell twice.",
      "Start by enqueuing (0,0) at distance 0. Pop a cell, and for each open, unvisited neighbour enqueue it at distance+1. Return the distance when you pop the goal.",
      "Implementation: `const q=[[0,0,0]]; const seen=new Set(['0,0']); while(q.length){ const [r,c,d]=q.shift(); if(r===R-1&&c===C-1) return d; for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nr=r+dr,nc=c+dc,k=nr+','+nc; if(nr>=0&&nc>=0&&nr<R&&nc<C&&grid[nr][nc]===0&&!seen.has(k)){ seen.add(k); q.push([nr,nc,d+1]); } } } return -1;`",
    ],
    reward: { credits: 260, unlock: "Grid BFS: O(V+E) shortest-path on grids" },
    solution:
      "Treat each open cell as a graph node. BFS from (0,0) with a queue and a " +
      "visited set: dequeue a cell, and enqueue each open, unvisited neighbour with " +
      "distance+1. Because BFS expands in order of distance, the first time you " +
      "dequeue the goal you have the minimum number of moves. Each cell and edge is " +
      "handled once → O(V+E) time, O(V) space.",
  },

  // ------------------------------------------------------------------ 9
  {
    id: "topk",
    group: "Operations Program",
    title: "Priority Cargo Scanner",
    tags: ["Heap", "Hash Map"],
    brief:
      "The cargo scanner logs every requested item ID. Logistics wants the K " +
      "most-requested items to pre-stage them near the airlock.\n\n" +
      "OBJECTIVE: Return the K most frequent item IDs, most frequent first.",
    statement:
      "Given an array `items` of integer IDs and an integer k, return the k most " +
      "frequent IDs. Order the result by frequency descending; break ties by " +
      "smaller ID first.",
    concept:
      "First build a FREQUENCY MAP (a hash map of item → count) in one O(n) pass. " +
      "To pick the top k you can sort all unique items — O(u log u) — or, better for " +
      "small k, keep a HEAP (priority queue) of size k, which gives O(u log k). A " +
      "heap always lets you pop the current smallest in O(log k), so you keep only " +
      "the k best.",
    signature: "topRequests(items, k)",
    fn: "topRequests",
    starter:
      "// items: number[], k: number\n" +
      "// Return the k most frequent IDs (freq desc, ties by smaller ID).\n" +
      "// Starter is CORRECT but O(n^2): it recounts each unique item by rescanning.\n" +
      "function topRequests(items, k) {\n" +
      "  const uniq = [];\n" +
      "  for (let i = 0; i < items.length; i++) {\n" +
      "    if (uniq.indexOf(items[i]) === -1) uniq.push(items[i]);\n" +
      "  }\n" +
      "  const counted = uniq.map((u) => {\n" +
      "    let c = 0;\n" +
      "    for (let i = 0; i < items.length; i++) if (items[i] === u) c++;\n" +
      "    return { u, c };\n" +
      "  });\n" +
      "  counted.sort((a, b) => b.c - a.c || a.u - b.u);\n" +
      "  return counted.slice(0, k).map((x) => x.u);\n" +
      "}",
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { args: [[4, 4, 5, 5, 6], 2], expected: [4, 5] },
      { args: [[7], 1], expected: [7] },
      { args: [[1, 2, 3, 4], 2], expected: [1, 2] },
      { args: [[], 0], expected: [] },
      { args: [[9, 9, 8, 8, 8, 7], 1], expected: [8] },
    ],
    scale: () => {
      const n = 3000;
      const items = [];
      for (let i = 0; i < n; i++) items.push(i % 500); // 500 unique => brute O(n*u)
      return { items, k: 10 };
    },
    runScaled: (fn, data) => {
      fn(data.items, data.k);
    },
    targetTime: "O(n log k)",
    targetSpace: "O(n)",
    targetBig: "O(n log k) time",
    targetOps: 80000,
    approaches: {
      brute: {
        label: "Rescan to count each item — O(n·u) time",
        detail:
          "Using indexOf to find uniques and rescanning the whole array to count " +
          "each one re-reads the data many times. With u unique items that's O(n·u), " +
          "which is O(n²) when many items are distinct — a scan nested inside a scan.",
      },
      optimal: {
        label: "Frequency map + heap — O(n log k) time, O(n) space",
        detail:
          "One O(n) pass builds item→count in a hash map. A size-k min-heap keeps " +
          "only the k most frequent, each push/pop costing O(log k) → O(u log k). " +
          "Sorting all uniques instead is O(u log u); both crush the O(n²) rescan.",
      },
    },
    hints: [
      "Recounting an item by scanning the whole array is wasteful. Can you count every item in ONE pass?",
      "Build a hash map (or Map) of item → frequency as you walk the array once.",
      "Then take the k entries with the highest counts. Sorting the unique entries works (O(u log u)); a size-k heap is even better for small k (O(u log k)).",
      "Implementation: `const f=new Map(); for(const x of items) f.set(x,(f.get(x)||0)+1); return [...f.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,k).map(e=>e[0]);`",
    ],
    reward: { credits: 260, unlock: "Heap / Priority Queue: O(n log k) top-K selection" },
    solution:
      "Count frequencies in a single O(n) pass with a hash map. To select the top k, " +
      "either sort the unique (item,count) pairs by count desc / id asc — O(u log u) " +
      "— or maintain a min-heap of size k (O(u log k)), which is preferable when k is " +
      "much smaller than the number of unique items. Space is O(n) for the map.",
  },

  // ------------------------------------------------------------------ 10
  {
    id: "dp",
    group: "Operations Program",
    title: "Limited-Fuel Planning",
    tags: ["Dynamic Programming"],
    brief:
      "Fuel reserves sit in a row of depots. Tapping two ADJACENT depots at once " +
      "triggers a pressure cascade — forbidden. Plan which depots to tap to extract " +
      "the maximum total fuel.\n\n" +
      "OBJECTIVE: Return the maximum total from non-adjacent depots.",
    statement:
      "Given an array `cells` of non-negative fuel amounts, choose a subset with no " +
      "two adjacent elements that maximises the sum. Return that maximum sum. " +
      "(This is the classic 'House Robber' problem.)",
    concept:
      "DYNAMIC PROGRAMMING solves a big problem from overlapping SUBPROBLEMS. At " +
      "each depot you make one decision: SKIP it (keep the best up to the previous " +
      "depot) or TAKE it (its fuel plus the best up to two depots back). Naive " +
      "recursion recomputes the same subproblems exponentially; MEMOIZATION or a " +
      "TABULATION loop computes each subproblem once, turning O(2ⁿ) into O(n).",
    signature: "maxFuel(cells)",
    fn: "maxFuel",
    starter:
      "// cells: non-negative number[]\n" +
      "// Return the max sum choosing no two adjacent cells.\n" +
      "// Starter is CORRECT but O(2^n): it re-explores overlapping subproblems.\n" +
      "// Add memoization, or use an O(n) tabulation loop.\n" +
      "function maxFuel(cells) {\n" +
      "  function best(i) {\n" +
      "    if (i >= cells.length) return 0;\n" +
      "    return Math.max(best(i + 1), cells[i] + best(i + 2));\n" +
      "  }\n" +
      "  return best(0);\n" +
      "}",
    tests: [
      { args: [[2, 7, 9, 3, 1]], expected: 12 },
      { args: [[1, 2, 3, 1]], expected: 4 },
      { args: [[]], expected: 0 },
      { args: [[5]], expected: 5 },
      { args: [[2, 1, 1, 2]], expected: 4 },
      { args: [[0, 0, 0]], expected: 0 },
    ],
    scale: () => {
      const n = 40; // 2^40 blows up the naive recursion; O(n) stays tiny
      const cells = [];
      for (let i = 0; i < n; i++) cells.push((i * 37) % 13);
      return { cells };
    },
    runScaled: (fn, data) => {
      fn(data.cells);
    },
    targetTime: "O(n)",
    targetSpace: "O(1)",
    targetBig: "O(n) time",
    targetOps: 2000,
    approaches: {
      brute: {
        label: "Plain recursion — O(2ⁿ) time",
        detail:
          "Each call branches into two (skip vs take), and the same indices are " +
          "recomputed again and again. That doubling per element is exponential: " +
          "O(2ⁿ). 40 depots → ~10¹² calls without memoization.",
      },
      optimal: {
        label: "DP tabulation — O(n) time, O(1) space",
        detail:
          "Sweep left to right tracking two rolling values: the best including the " +
          "previous depot and the best excluding it. Each depot is decided once → " +
          "O(n) time, and only two variables are needed → O(1) space. Memoizing the " +
          "recursion instead gives O(n) time / O(n) space.",
      },
    },
    hints: [
      "The naive recursion keeps re-solving 'best from index i'. How many DISTINCT values of i are there? Could you compute each just once?",
      "This is overlapping subproblems — the hallmark of dynamic programming. Store each best(i) the first time you compute it (memoization).",
      "Or go bottom-up: track two numbers as you scan — the best if you skip the current depot, and the best if you consider taking it.",
      "Implementation (O(1) space): `let take=0, skip=0; for(const v of cells){ const newTake=skip+v; skip=Math.max(skip,take); take=newTake; } return Math.max(take,skip);`",
    ],
    reward: { credits: 300, unlock: "Dynamic Programming: exponential → O(n) via subproblems" },
    solution:
      "Each depot has two choices: skip (carry forward the best so far) or take (its " +
      "fuel plus the best from two depots back). Sweep once keeping two rolling " +
      "totals — `take` (best ending with a decision at the current depot) and `skip` " +
      "(best if the current is skipped). This computes every subproblem exactly once: " +
      "O(n) time and O(1) space, collapsing the exponential recursion.",
  },
];

// Append the Operations Program to the mission roster.
if (typeof MISSIONS !== "undefined") {
  OPS_MISSIONS.forEach((m) => MISSIONS.push(m));
}
