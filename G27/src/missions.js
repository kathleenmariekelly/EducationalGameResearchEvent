// ORBITAL — Mission definitions
// Each mission is a real DS&A interview pattern reframed as a station operation.
//
// A mission has (same schema as the Operations Program set):
//   id, group, title, tags, brief (story + objective),
//   statement   : the interview-style problem statement,
//   concept     : beginner-friendly explanation of the data structure / algorithm,
//   signature (fn name shown to player), fn, starter (code the player edits),
//   tests: array of {args:[...], expected} used to check correctness,
//   scale: generates a big input to MEASURE empirical complexity,
//   runScaled: drives the function over the scaled input,
//   targetTime / targetSpace : Big-O labels for display,
//   targetBig: legacy time label (kept for the target box),
//   targetOps: max operation-count allowed on the scaled input to earn the bonus,
//   approaches: { brute:{label,detail}, optimal:{label,detail} },
//   hints: [conceptual, ..., implementation],
//   solution: explanation shown after the mission is solved,
//   reward: {credits, unlock} — tool unlocked on beating target.

const MISSIONS = [
  {
    id: "cargo",
    group: "Station Systems",
    title: "Cargo Bay Manifest",
    tags: ["Hash Map", "Search"],
    brief:
      "The cargo bay logs every container by its ID. Command needs to know if a " +
      "specific container is aboard — FAST. Return true if targetId exists in the " +
      "manifest array.\n\n" +
      "A rookie scans every crate one by one. A pro builds an index. " +
      "Beat the target complexity to unlock the Hash Map tool.",
    statement:
      "Given an array `manifest` of numeric container IDs and a value `targetId`, " +
      "return true if targetId is present in the manifest, otherwise false. Command " +
      "runs this membership check constantly, so each lookup must be fast.",
    concept:
      "A HASH SET stores values for average O(1) membership tests. Scanning an array " +
      "is O(n) per lookup, but if you index the manifest into a Set, every 'is this " +
      "container aboard?' question is answered in average O(1) by hashing the ID " +
      "straight to its bucket instead of walking the whole list.",
    signature: "manifestHas(manifest, targetId)",
    starter:
      "// manifest: array of numeric container IDs\n" +
      "// targetId: the ID to find\n" +
      "// Return true if present, else false.\n" +
      "function manifestHas(manifest, targetId) {\n" +
      "  // TODO: your scan here\n" +
      "  for (let i = 0; i < manifest.length; i++) {\n" +
      "    if (manifest[i] === targetId) return true;\n" +
      "  }\n" +
      "  return false;\n" +
      "}",
    fn: "manifestHas",
    tests: [
      { args: [[3, 9, 1, 4], 4], expected: true },
      { args: [[3, 9, 1, 4], 7], expected: false },
      { args: [[], 1], expected: false },
      { args: [[5], 5], expected: true },
    ],
    // Build a scaled input and repeat many lookups so O(n) vs O(1) diverges.
    scale: () => {
      const n = 4000;
      const manifest = [];
      for (let i = 0; i < n; i++) manifest.push(i * 2); // even ids
      const queries = [];
      for (let i = 0; i < 400; i++) queries.push(i * 2 + 1); // all misses = worst case
      return { manifest, queries };
    },
    runScaled: (fn, data, counter) => {
      for (const q of data.queries) fn(data.manifest, q);
    },
    targetTime: "O(1) average lookup",
    targetSpace: "O(n)",
    targetBig: "O(1) lookup",
    // O(n) approach: ~400 * 4000 = 1.6M ops. A prebuilt Set is far fewer.
    targetOps: 200000,
    approaches: {
      brute: {
        label: "Linear scan — O(n) per lookup",
        detail:
          "A single loop compares targetId against every container. One lookup is " +
          "O(n); repeated over many queries the cost multiplies — 400 lookups across " +
          "4,000 crates ≈ 1,600,000 comparisons. A loop over all n elements is the " +
          "textbook O(n) signature.",
      },
      optimal: {
        label: "Hash Set membership — O(1) average, O(n) space",
        detail:
          "Index the manifest into a Set, then test membership with a hash probe " +
          "instead of a scan — average O(1) per lookup. The Set holds up to n IDs, so " +
          "it uses O(n) extra space: a classic space-for-speed trade.",
      },
    },
    hints: [
      "Comparing targetId against every crate repeats work on each query. Which structure answers 'does this value exist?' without scanning?",
      "A Set (or the keys of a Map) gives average O(1) membership tests.",
      "Put the manifest into a Set, then return whether the Set contains targetId.",
      "`return new Set(manifest).has(targetId);` — or build the Set once and reuse it across many lookups.",
    ],
    reward: { credits: 150, unlock: "Hash Map (Set/Map): O(1) average lookups" },
    solution:
      "Index the manifest into a hash Set, then answer each query with a single hash " +
      "lookup: `new Set(manifest).has(targetId)`. Membership becomes average O(1) " +
      "instead of an O(n) scan, at the cost of O(n) space for the Set.",
  },

  {
    id: "docking",
    group: "Station Systems",
    title: "Docking Queue Control",
    tags: ["Priority Queue", "Sorting"],
    brief:
      "Ships request docking clearance. Each has a priority (1 = medical emergency, " +
      "higher = routine). Return an array of ship IDs in the order they should dock: " +
      "lowest priority-number first. Ties keep original arrival order (stable).\n\n" +
      "Input: ships = [{id, priority}, ...]. Output: [id, id, ...].",
    statement:
      "Given `ships`, an array of { id, priority } (lower priority number docks " +
      "sooner), return the ids in docking order: ascending by priority, with ties " +
      "broken by original arrival order (a STABLE ordering).",
    concept:
      "SORTING arranges items by a rule defined in a comparator. Here the rule is " +
      "'smaller priority first'. A PRIORITY QUEUE is the live version of the same " +
      "idea — it always serves the highest-priority item next. A good comparator sort " +
      "runs in O(n log n); to keep ties in arrival order (stability), compare the " +
      "original index as a tiebreaker.",
    signature: "dockingOrder(ships)",
    starter:
      "// ships: [{ id, priority }]  (lower priority number = docks sooner)\n" +
      "// Return array of ids in docking order. Ties keep arrival order.\n" +
      "function dockingOrder(ships) {\n" +
      "  // TODO\n" +
      "  return ships.map(s => s.id);\n" +
      "}",
    fn: "dockingOrder",
    tests: [
      {
        args: [[{ id: "A", priority: 3 }, { id: "B", priority: 1 }, { id: "C", priority: 2 }]],
        expected: ["B", "C", "A"],
      },
      {
        args: [[{ id: "X", priority: 2 }, { id: "Y", priority: 2 }, { id: "Z", priority: 1 }]],
        expected: ["Z", "X", "Y"],
      },
      { args: [[]], expected: [] },
      { args: [[{ id: "solo", priority: 5 }]], expected: ["solo"] },
    ],
    scale: () => {
      const n = 3000;
      const ships = [];
      for (let i = 0; i < n; i++) {
        ships.push({ id: "S" + i, priority: (i * 7919) % 50 });
      }
      return { ships };
    },
    runScaled: (fn, data) => {
      fn(data.ships);
    },
    targetTime: "O(n log n)",
    targetSpace: "O(n)",
    targetBig: "O(n log n)",
    // Bubble/selection sort ~ n^2 = 9M. A proper sort is ~ n log n ≈ 35k comparisons.
    targetOps: 300000,
    approaches: {
      brute: {
        label: "Selection / bubble sort — O(n²) time",
        detail:
          "Repeatedly scanning the remaining ships to find the next-lowest priority " +
          "is a loop inside a loop — about n²/2 comparisons. For 3,000 ships that is " +
          "~9,000,000 operations: the classic O(n²) fingerprint.",
      },
      optimal: {
        label: "Comparator sort — O(n log n) time, O(n) space",
        detail:
          "Sort by priority, breaking ties with the original index to stay stable. " +
          "Comparison sorts do about n·log₂(n) comparisons — ~35,000 for 3,000 ships " +
          "— vastly fewer than n².",
      },
    },
    hints: [
      "You don't need to hand-roll repeated 'find the minimum' scans. What built-in orders a whole array at once, and with how much work?",
      "Array.prototype.sort with a comparator sorts in O(n log n). Your comparator decides the order.",
      "Return a negative/positive number based on priority difference. For ties (equal priority), fall back to the original arrival index so the order stays stable.",
      "`return ships.map((s,i)=>({s,i})).sort((a,b)=>a.s.priority-b.s.priority || a.i-b.i).map(x=>x.s.id);`",
    ],
    reward: { credits: 175, unlock: "Priority Queue / Array.sort: O(n log n) ordering" },
    solution:
      "Pair each ship with its original index, sort by priority ascending using the " +
      "index as a tiebreaker (guaranteeing stable, arrival-order ties), then map back " +
      "to ids. A comparator sort is O(n log n) time and O(n) space — far better than " +
      "repeatedly scanning for the minimum, which is O(n²).",
  },

  {
    id: "routes",
    group: "Station Systems",
    title: "Star Route Navigator",
    tags: ["Graph", "BFS"],
    brief:
      "Stations are connected by jump-gates (unweighted). Find the FEWEST jumps from " +
      "the start station to the goal station.\n\n" +
      "Input: graph (adjacency map { station: [neighbors] }), start, goal.\n" +
      "Return the minimum number of jumps, or -1 if unreachable.\n\n" +
      "Scanning every path explodes exponentially. Breadth-First Search finds the " +
      "shortest path in O(V + E).",
    statement:
      "Given an unweighted `graph` as an adjacency map { station: [neighbors] }, plus " +
      "`start` and `goal` station names, return the minimum number of jumps from " +
      "start to goal, or -1 if goal is unreachable. If start === goal the answer is 0.",
    concept:
      "A GRAPH is nodes (stations) joined by edges (jump-gates). BREADTH-FIRST SEARCH " +
      "(BFS) explores outward level by level using a QUEUE, so the first time it " +
      "reaches the goal it has used the fewest jumps. A VISITED set prevents " +
      "re-processing stations and infinite loops. BFS runs in O(V + E) — every " +
      "station and gate is examined a bounded number of times.",
    signature: "minJumps(graph, start, goal)",
    starter:
      "// graph: { station: [neighborStations] } (undirected edges given both ways)\n" +
      "// Return minimum jumps from start to goal, or -1 if unreachable.\n" +
      "function minJumps(graph, start, goal) {\n" +
      "  // TODO: explore the network\n" +
      "  if (start === goal) return 0;\n" +
      "  return -1;\n" +
      "}",
    fn: "minJumps",
    tests: [
      {
        args: [{ A: ["B", "C"], B: ["A", "D"], C: ["A", "D"], D: ["B", "C", "E"], E: ["D"] }, "A", "E"],
        expected: 3,
      },
      { args: [{ A: ["B"], B: ["A"], C: [] }, "A", "C"], expected: -1 },
      { args: [{ A: ["B"], B: ["A"] }, "A", "A"], expected: 0 },
      { args: [{ A: ["B"], B: ["A", "C"], C: ["B"] }, "A", "C"], expected: 2 },
    ],
    scale: () => {
      // grid-like network of 900 stations
      const size = 30;
      const graph = {};
      const name = (r, c) => "n" + (r * size + c);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const key = name(r, c);
          graph[key] = [];
          if (r > 0) graph[key].push(name(r - 1, c));
          if (r < size - 1) graph[key].push(name(r + 1, c));
          if (c > 0) graph[key].push(name(r, c - 1));
          if (c < size - 1) graph[key].push(name(r, c + 1));
        }
      }
      return { graph, start: name(0, 0), goal: name(size - 1, size - 1) };
    },
    runScaled: (fn, data) => {
      fn(data.graph, data.start, data.goal);
    },
    targetTime: "O(V + E)",
    targetSpace: "O(V)",
    targetBig: "O(V + E)",
    // A correct BFS visits each node/edge a bounded number of times.
    // DFS-all-paths would be astronomically larger.
    targetOps: 100000,
    approaches: {
      brute: {
        label: "Explore every path (DFS) — exponential time",
        detail:
          "Enumerating all possible routes to compare their lengths revisits nodes " +
          "along exponentially many paths. Each branch fans out to several neighbors, " +
          "giving O(bᵈ)-style blow-up — hopeless on any sizable network.",
      },
      optimal: {
        label: "BFS with a visited set — O(V + E) time, O(V) space",
        detail:
          "A queue expands stations in ring order (distance 0, then 1, then 2…), so " +
          "the goal is first reached by a shortest path. Each station is enqueued once " +
          "and each gate inspected once → O(V + E). The queue and visited set are " +
          "O(V) space.",
      },
    },
    hints: [
      "You want the FEWEST jumps. If you explore outward one ring at a time, the first time you touch the goal you've used the minimum — which structure processes items in arrival (FIFO) order?",
      "Use BFS: a queue of stations to visit plus a visited set so you never revisit one.",
      "Enqueue start at distance 0. Pop a station; for each unvisited neighbor, enqueue it at distance+1. Return the distance when you reach goal; return -1 if the queue empties first.",
      "`if(start===goal)return 0;const q=[[start,0]];const seen=new Set([start]);while(q.length){const [n,d]=q.shift();for(const nb of graph[n]||[]){if(nb===goal)return d+1;if(!seen.has(nb)){seen.add(nb);q.push([nb,d+1]);}}}return -1;`",
    ],
    reward: { credits: 250, unlock: "Breadth-First Search: O(V + E) shortest path" },
    solution:
      "Run BFS from start with a queue holding [station, distance] and a visited set. " +
      "Dequeue a station and enqueue each unvisited neighbor with distance+1; the " +
      "first time you reach goal that distance is the fewest jumps. Because each " +
      "station and gate is handled once, it's O(V + E) time and O(V) space — versus " +
      "the exponential cost of enumerating every path.",
  },
];
