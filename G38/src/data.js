// ============================================================
// Recursion Realm — game data
// Characters, enemies, and the tiered CS question bank.
// ============================================================

// --- Battle types / playable characters -------------------------------------
// Each character has: id, name, type, emoji, maxHp, and a list of attacks.
// Attacks have a `tier` (0 = basic/free, 1..3 = powered/needs a question),
// a `power` (damage), a `recoil` (self-damage on backfire), and a `topic`
// that selects which question pool to draw from.
const CHARACTERS = [
  {
    id: "recursion_mage",
    name: "Ada the Recursion Mage",
    type: "Recursion",
    emoji: "🧙‍♀️",
    color: "#a78bfa",
    maxHp: 90,
    blurb: "Fragile but hits hard. Her spells fold in on themselves.",
    attacks: [
      { name: "Base Case Bolt",   tier: 0, power: 8,  recoil: 0,  topic: null,          desc: "A reliable free jab." },
      { name: "Recursive Flame",  tier: 1, power: 22, recoil: 6,  topic: "recurrence",  desc: "Needs a recurrence answered." },
      { name: "Fibonacci Fury",   tier: 2, power: 34, recoil: 10, topic: "recurrence",  desc: "Big damage. Big backfire." },
      { name: "Master Theorem",   tier: 3, power: 50, recoil: 16, topic: "recurrence",  desc: "Ultimate. Only for high ranks." }
    ]
  },
  {
    id: "dp_tactician",
    name: "Bell the DP Tactician",
    type: "Dynamic",
    emoji: "🛡️",
    color: "#4fd1c5",
    maxHp: 120,
    blurb: "Tanky and methodical. Rewards knowing your subproblem state.",
    attacks: [
      { name: "Memo Jab",         tier: 0, power: 7,  recoil: 0,  topic: null,     desc: "A cached free hit." },
      { name: "State Strike",     tier: 1, power: 20, recoil: 4,  topic: "state",  desc: "Identify the subproblem inputs." },
      { name: "Table Sweep",      tier: 2, power: 32, recoil: 8,  topic: "state",  desc: "Fill the table, deal damage." },
      { name: "Optimal Overload", tier: 3, power: 46, recoil: 14, topic: "state",  desc: "Ultimate control move." }
    ]
  },
  {
    id: "greedy_rogue",
    name: "Cole the Greedy Rogue",
    type: "Greedy",
    emoji: "🗡️",
    color: "#f6ad55",
    maxHp: 100,
    blurb: "High risk, high reward. Punished for lazy greedy thinking.",
    attacks: [
      { name: "Quick Slash",      tier: 0, power: 9,  recoil: 0,  topic: null,      desc: "Fast free strike." },
      { name: "Greedy Gambit",    tier: 1, power: 24, recoil: 8,  topic: "greedy",  desc: "Spot the greedy trap." },
      { name: "Base Case Blade",  tier: 2, power: 33, recoil: 11, topic: "base",    desc: "Nail the base case." },
      { name: "Exchange Argument",tier: 3, power: 48, recoil: 16, topic: "greedy",  desc: "Ultimate finisher." }
    ]
  }
];

// --- Enemies (fought in order; scale up) ------------------------------------
const ENEMIES = [
  { name: "Loopling",        emoji: "🐛", maxHp: 45,  power: 6,  xp: 40,  taunt: "I just loop forever!" },
  { name: "Stack Overflow",  emoji: "👾", maxHp: 70,  power: 9,  xp: 60,  taunt: "No base case? You crash!" },
  { name: "Exponential Ogre",emoji: "👹", maxHp: 100, power: 12, xp: 90,  taunt: "2^n hits incoming!" },
  { name: "The NP Dragon",   emoji: "🐉", maxHp: 150, power: 16, xp: 140, taunt: "Solve me... if you can." }
];

// --- Rank thresholds (cumulative XP) ----------------------------------------
// Reaching a rank unlocks powered attacks up to that rank's `maxTier`.
const RANKS = [
  { name: "Novice",     xp: 0,   maxTier: 1 },
  { name: "Apprentice", xp: 80,  maxTier: 1 },
  { name: "Adept",      xp: 180, maxTier: 2 },
  { name: "Expert",     xp: 320, maxTier: 2 },
  { name: "Master",     xp: 500, maxTier: 3 }
];

// --- Question bank, keyed by topic and tiered by difficulty ------------------
// Difficulty roughly matches attack tier (1..3). The engine picks a question
// whose difficulty <= the attack's tier (and prefers the highest available).
const QUESTIONS = {
  recurrence: [
    {
      difficulty: 1,
      q: "Climbing stairs (1 or 2 at a time). Ways to climb n steps: which recurrence counts them?",
      options: ["W(n) = W(n-1)", "W(n) = W(n-1) + W(n-2)", "W(n) = 2·W(n-1)"],
      answer: 1,
      why: "First move is 1 step (leaves n-1) OR 2 steps (leaves n-2); add the disjoint cases."
    },
    {
      difficulty: 1,
      q: "For Fibonacci F(n)=F(n-1)+F(n-2), which are valid base cases?",
      options: ["F(0)=0, F(1)=1", "F(0)=1 only", "F(1)=2"],
      answer: 0,
      why: "Two base cases are needed because the recurrence reaches back two steps."
    },
    {
      difficulty: 2,
      q: "Weighted interval scheduling: p(i) = last job ending before job i starts. OPT(i) = ?",
      options: [
        "OPT(i) = OPT(i-1)",
        "OPT(i) = max( OPT(i-1), v[i] + OPT(p(i)) )",
        "OPT(i) = v[i] + OPT(i-1)"
      ],
      answer: 1,
      why: "Skip job i → OPT(i-1); or take it → v[i] + OPT(p(i)). Take the max."
    },
    {
      difficulty: 3,
      q: "0/1 Knapsack, items 1..i, capacity c. Correct recurrence when w[i] ≤ c?",
      options: [
        "K(i,c) = K(i-1,c)",
        "K(i,c) = v[i] + K(i-1,c)",
        "K(i,c) = max( K(i-1,c),  v[i] + K(i-1, c-w[i]) )"
      ],
      answer: 2,
      why: "Skip item i, or take it (if it fits) and free up capacity c-w[i]. Max of both."
    },
    {
      difficulty: 1,
      q: "Number of ways T(n) to tile a 2×n board with 2×1 dominoes. Which recurrence?",
      options: ["T(n) = T(n-1)", "T(n) = T(n-1) + T(n-2)", "T(n) = 2·T(n-2)"],
      answer: 1,
      why: "Place a vertical domino (leaves n-1) or two horizontals (leaves n-2); add the cases."
    },
    {
      difficulty: 2,
      q: "Rod cutting: max revenue R(n) with prices p[1..n]. Which recurrence?",
      options: [
        "R(n) = p[n] + R(n-1)",
        "R(n) = max over 1≤i≤n of ( p[i] + R(n-i) )",
        "R(n) = max( R(n-1), R(n-2) )"
      ],
      answer: 1,
      why: "Choose a first piece of length i (earn p[i]), then solve R(n-i); maximize over i."
    },
    {
      difficulty: 2,
      q: "House robber: values a[1..i], can't rob two adjacent houses. M(i) = ?",
      options: [
        "M(i) = M(i-1) + a[i]",
        "M(i) = max( M(i-1), a[i] + M(i-2) )",
        "M(i) = max( a[i], M(i-1) )"
      ],
      answer: 1,
      why: "Skip house i → M(i-1); rob it → a[i] + M(i-2) (must skip the neighbor). Max."
    },
    {
      difficulty: 3,
      q: "Edit distance D(i,j). When A[i] ≠ B[j], D(i,j) = ?",
      options: [
        "D(i-1, j-1)",
        "1 + min( D(i-1,j), D(i,j-1), D(i-1,j-1) )",
        "min( D(i-1,j), D(i,j-1) )"
      ],
      answer: 1,
      why: "Delete, insert, or substitute — each costs 1 plus the smaller subproblem."
    },
    {
      difficulty: 3,
      q: "Unbounded knapsack (unlimited copies of each item), capacity c. U(c) = ?",
      options: [
        "U(c) = max over items i with w[i]≤c of ( v[i] + U(c - w[i]) )",
        "U(c) = max over i of ( v[i] + U(c - 1) )",
        "U(c) = U(c-1) + U(c-2)"
      ],
      answer: 0,
      why: "Take one copy of some fitting item i, then solve U(c - w[i]); items remain reusable."
    },
    {
      difficulty: 1,
      q: "Stairs with W(0)=1, W(1)=1 and W(n)=W(n-1)+W(n-2). What is W(5)?",
      options: ["5", "8", "13"],
      answer: 1,
      why: "Sequence 1,1,2,3,5,8 → W(5)=8."
    },
    {
      difficulty: 1,
      q: "Count binary strings of length n with no two consecutive 1s. B(n) = ?",
      options: ["B(n) = B(n-1)", "B(n) = B(n-1) + B(n-2)", "B(n) = 2·B(n-1)"],
      answer: 1,
      why: "End in 0 → B(n-1); end in 1 (prev must be 0) → B(n-2). Add."
    },
    {
      difficulty: 1,
      q: "Grid paths from top-left to bottom-right moving only right/down. P(i,j) = ?",
      options: ["P(i,j) = P(i-1,j) + P(i,j-1)", "P(i,j) = P(i-1,j-1)", "P(i,j) = 2·P(i-1,j)"],
      answer: 0,
      why: "You arrive at (i,j) from above or from the left; add the two counts."
    },
    {
      difficulty: 2,
      q: "Minimum path sum in a grid g, moving right/down. S(i,j) = ?",
      options: ["S(i,j) = g[i][j] + min( S(i-1,j), S(i,j-1) )", "S(i,j) = min( S(i-1,j), S(i,j-1) )", "S(i,j) = g[i][j] + S(i-1,j-1)"],
      answer: 0,
      why: "Cost of this cell plus the cheaper of the two ways to reach it."
    },
    {
      difficulty: 2,
      q: "Number of WAYS to make amount a from coin TYPES (order irrelevant). Which avoids double-counting?",
      options: ["W(a) = sum over coins c of W(a-c)", "W(i,a) = W(i-1,a) + W(i, a-coin[i])", "W(a) = 1 + min over c of W(a-c)"],
      answer: 1,
      why: "Iterating over coin TYPES i stops the same multiset being counted in different orders."
    },
    {
      difficulty: 2,
      q: "Longest increasing subsequence ENDING at index i. L(i) = ?",
      options: ["L(i) = 1 + max{ L(j) : j<i and a[j]<a[i] } (else 1)", "L(i) = L(i-1) + 1", "L(i) = max( L(i-1), a[i] )"],
      answer: 0,
      why: "Extend the best compatible earlier run; if none exists, it's just a[i]."
    },
    {
      difficulty: 2,
      q: "Decode ways (1→A ... 26→Z). For prefix length i, D(i) = ?",
      options: ["D(i) = D(i-1) [if s[i]≠'0'] + D(i-2) [if s[i-1..i] in 10..26]", "D(i) = D(i-1) + D(i-2) always", "D(i) = D(i-1)"],
      answer: 0,
      why: "Decode one digit (if nonzero) and/or two digits (if 10–26); add the valid options."
    },
    {
      difficulty: 3,
      q: "Subset-sum feasibility with the first i items reaching target t. S(i,t) = ?",
      options: ["S(i,t) = S(i-1,t) OR S(i-1, t-a[i])", "S(i,t) = S(i-1,t) AND S(i-1, t-a[i])", "S(i,t) = S(i-1, t-a[i])"],
      answer: 0,
      why: "Skip item i, or use it (needs t-a[i] reachable). Either path suffices."
    },
    {
      difficulty: 3,
      q: "Matrix-chain multiplication minimum cost for the product i..j. M(i,j) = ?",
      options: ["M(i,j) = min over i≤k<j of ( M(i,k) + M(k+1,j) + p[i-1]·p[k]·p[j] )", "M(i,j) = M(i,j-1) + M(i+1,j)", "M(i,j) = min( M(i+1,j), M(i,j-1) )"],
      answer: 0,
      why: "Try every split k; add the two sub-costs plus the final multiply's cost."
    },
    {
      difficulty: 3,
      q: "Longest common subsequence, when A[i] == B[j]. L(i,j) = ?",
      options: ["L(i,j) = 1 + L(i-1, j-1)", "L(i,j) = max( L(i-1,j), L(i,j-1) )", "L(i,j) = L(i-1, j-1)"],
      answer: 0,
      why: "Matching characters extend the diagonal subproblem by one."
    },
    {
      difficulty: 3,
      q: "Longest palindromic subsequence of s, when s[i] == s[j] (i<j). P(i,j) = ?",
      options: ["P(i,j) = 2 + P(i+1, j-1)", "P(i,j) = 1 + P(i+1, j-1)", "P(i,j) = max( P(i+1,j), P(i,j-1) )"],
      answer: 0,
      why: "Both ends match, adding 2 around the inner subproblem."
    }
  ],

  state: [
    {
      difficulty: 1,
      q: "Climbing n stairs. What is the minimal subproblem input (the 'state')?",
      options: ["Two step indices (i, j)", "A single integer: steps remaining n", "The whole set of moves"],
      answer: 1,
      why: "One number — steps left — fully describes the subproblem."
    },
    {
      difficulty: 2,
      q: "Weighted interval scheduling. Best subproblem state (jobs sorted by finish)?",
      options: ["OPT(i): best over prefix 1..i", "OPT(t): best at clock time t", "OPT(S): best over subset S"],
      answer: 0,
      why: "Sorting by finish time lets a single prefix index i capture the state; subsets are exponential."
    },
    {
      difficulty: 3,
      q: "0/1 Knapsack. Which state has enough information to recurse?",
      options: ["K(i): prefix only", "K(c): capacity only", "K(i, c): prefix AND remaining capacity"],
      answer: 2,
      why: "Each item decision depends on remaining room, so capacity must be part of the state."
    },
    {
      difficulty: 1,
      q: "Tiling a 2×n board with dominoes. What is the minimal subproblem state?",
      options: ["The set of placed dominoes", "A single integer: columns left to fill", "The last two dominoes placed"],
      answer: 1,
      why: "Only the remaining width matters for counting the rest."
    },
    {
      difficulty: 1,
      q: "A frog jumps 1 or 2 pads toward pad n. What is the state?",
      options: ["The full jump history", "The current pad index", "Current and previous pad together"],
      answer: 1,
      why: "Where you stand now fully determines the remaining subproblem."
    },
    {
      difficulty: 2,
      q: "House robber along a street. Best subproblem state?",
      options: ["Index i of the last house considered", "The total robbed so far", "The set of robbed houses"],
      answer: 0,
      why: "A prefix index captures it; a running total can't decide future adjacency choices."
    },
    {
      difficulty: 2,
      q: "Rod cutting. What single input defines a subproblem?",
      options: ["The list of cuts made so far", "The remaining rod length", "The highest price seen"],
      answer: 1,
      why: "Future revenue depends only on how much rod is left."
    },
    {
      difficulty: 3,
      q: "Edit distance between strings A and B. What is the state?",
      options: ["A single index i", "Prefix lengths (i, j) of both strings", "The set of edits applied"],
      answer: 1,
      why: "You must track how far you've consumed BOTH strings → two indices."
    },
    {
      difficulty: 3,
      q: "Longest common subsequence of A and B. What is the state?",
      options: ["(i, j): prefixes of A and B", "i: prefix of A only", "The characters matched so far"],
      answer: 0,
      why: "Progress through both strings is required, so two indices."
    },
    {
      difficulty: 1,
      q: "Counting length-n binary strings with no two consecutive 1s. Minimal state?",
      options: ["The whole string built so far", "The number of positions left to fill", "Every string seen so far"],
      answer: 1,
      why: "The count depends only on how many positions remain."
    },
    {
      difficulty: 1,
      q: "Counting grid paths (right/down only). What is the state?",
      options: ["The current cell (row, col)", "Only the current row", "The full path taken so far"],
      answer: 0,
      why: "Where you are determines how many ways remain to the goal."
    },
    {
      difficulty: 2,
      q: "LIS defined as L(i) = longest increasing subsequence ending at i. What does i represent?",
      options: ["The last element INCLUDED in the subsequence", "The current length", "The maximum value so far"],
      answer: 0,
      why: "Anchoring on the last included element lets you extend from compatible predecessors."
    },
    {
      difficulty: 2,
      q: "Coin change (fewest coins). What single value defines a subproblem?",
      options: ["The remaining amount", "The number of coin types used", "The largest coin taken"],
      answer: 0,
      why: "Only the amount still to make matters."
    },
    {
      difficulty: 2,
      q: "Decode-ways for a digit string. What is the state?",
      options: ["The prefix length i processed so far", "The number of letters decoded", "The last digit only"],
      answer: 0,
      why: "A single index into the string captures the remaining subproblem."
    },
    {
      difficulty: 3,
      q: "Matrix-chain multiplication. What is the subproblem state?",
      options: ["The subchain (i, j)", "Just the count of matrices", "The largest dimension"],
      answer: 0,
      why: "Cost depends on which contiguous range of matrices you multiply."
    },
    {
      difficulty: 3,
      q: "Subset sum. What is the state?",
      options: ["(i, t): items considered and target remaining", "Just the target t", "The chosen subset"],
      answer: 0,
      why: "You need both how many items you've decided on and the remaining target."
    },
    {
      difficulty: 3,
      q: "Longest palindromic subsequence. What is the state?",
      options: ["(i, j): the substring bounds", "A single index i", "The characters matched"],
      answer: 0,
      why: "The subproblem is a substring, defined by its two endpoints."
    }
  ],

  base: [
    {
      difficulty: 1,
      q: "Climbing stairs, W(n) = ways to climb n steps. Correct base case for the empty climb?",
      options: ["W(0) = 0", "W(0) = 1", "W(0) = n"],
      answer: 1,
      why: "There is exactly one way to climb zero steps: do nothing (the empty sequence)."
    },
    {
      difficulty: 2,
      q: "Weighted interval scheduling, OPT(i) over first i jobs. Base case?",
      options: ["OPT(0) = 0", "OPT(0) = v[0]", "OPT(1) = ∞"],
      answer: 0,
      why: "With no jobs available, the best achievable value is 0."
    },
    {
      difficulty: 2,
      q: "0/1 Knapsack K(i, c). Which is a correct base case?",
      options: ["K(0, c) = 0 for all c", "K(0, c) = C", "K(i, 0) = v[i]"],
      answer: 0,
      why: "No items to pick (i = 0) means value 0, no matter the capacity."
    },
    {
      difficulty: 2,
      q: "Coin change: fewest coins M(n) to make amount n. Correct base case?",
      options: ["M(0) = 0", "M(0) = 1", "M(1) = 0"],
      answer: 0,
      why: "Making amount 0 needs zero coins."
    },
    {
      difficulty: 2,
      q: "Edit distance D(i, 0) = ?  (the second string is empty)",
      options: ["0", "i", "1"],
      answer: 1,
      why: "Delete all i characters of the first string → i edits."
    },
    {
      difficulty: 2,
      q: "Longest common subsequence L(0, j) = ?  (the first string is empty)",
      options: ["0", "j", "1"],
      answer: 0,
      why: "An empty string shares no subsequence → length 0."
    },
    {
      difficulty: 1,
      q: "Grid path counts P(i,j). Base along the top row and left column?",
      options: ["P(0,j)=1 and P(i,0)=1 (one way along an edge)", "0", "i + j"],
      answer: 0,
      why: "There's exactly one straight-line way to reach any edge cell."
    },
    {
      difficulty: 2,
      q: "Coin change WAYS: W(0) (make amount 0) = ?",
      options: ["1 (the empty selection)", "0", "number of coin types"],
      answer: 0,
      why: "There is exactly one way to make zero: choose no coins."
    },
    {
      difficulty: 2,
      q: "LIS: base value of L(i) for the subsequence made of just element i?",
      options: ["0", "1", "i"],
      answer: 1,
      why: "A single element is an increasing subsequence of length 1."
    },
    {
      difficulty: 2,
      q: "Decode-ways: D(0) for the empty prefix = ?",
      options: ["1", "0", "undefined"],
      answer: 0,
      why: "The empty string has exactly one (trivial) decoding."
    },
    {
      difficulty: 2,
      q: "Subset sum S(i, 0) (target 0) = ?",
      options: ["true (the empty subset works)", "false", "depends on i"],
      answer: 0,
      why: "Zero is always reachable by choosing nothing."
    },
    {
      difficulty: 3,
      q: "Matrix chain M(i, i) for a single matrix = ?",
      options: ["0", "1", "the matrix's cost"],
      answer: 0,
      why: "A single matrix needs no multiplication, so cost 0."
    },
    {
      difficulty: 3,
      q: "Longest palindromic subsequence P(i, i) (single character) = ?",
      options: ["1", "0", "2"],
      answer: 0,
      why: "One character is a palindrome of length 1."
    }
  ],

  greedy: [
    {
      difficulty: 1,
      q: "Counting the number of ways to do something. Is a single greedy choice enough?",
      options: ["Yes, always take the biggest option", "No — counting requires summing over choices (a recurrence)"],
      answer: 1,
      why: "Greedy finds one path; counting needs every path, so you sum subproblems."
    },
    {
      difficulty: 2,
      q: "Weighted interval scheduling. Does 'always take the highest-value job next' give the optimum?",
      options: ["Yes", "No — one big job can block two better ones together"],
      answer: 1,
      why: "Value-10 job overlapping two value-7 jobs (=14) breaks greedy-by-value."
    },
    {
      difficulty: 3,
      q: "0/1 Knapsack. Is best value-to-weight ratio greedy optimal?",
      options: [
        "Yes, always",
        "No — that's optimal for FRACTIONAL knapsack, not 0/1",
        "Yes, if capacity is large"
      ],
      answer: 1,
      why: "Indivisible items break ratio-greedy; the 0/1 version needs DP over capacity."
    },
    {
      difficulty: 1,
      q: "Which task needs DP rather than a single greedy pass?",
      options: ["Finding ANY one path up the stairs", "COUNTING all distinct ways up the stairs", "Reporting the largest step size"],
      answer: 1,
      why: "Counting sums over subproblems; the other tasks are trivial or greedy."
    },
    {
      difficulty: 1,
      q: "Coins {1,3,4}, make 6. Is greedy (take the largest coin first) optimal?",
      options: ["Yes: 4+1+1 = 3 coins", "No: 3+3 = 2 coins beats greedy's 3", "Yes, greedy is always optimal for coins"],
      answer: 1,
      why: "Greedy uses 4+1+1 (3 coins); the optimum is 3+3 (2 coins)."
    },
    {
      difficulty: 3,
      q: "0/1 Knapsack: is 'take the highest-VALUE item first' optimal?",
      options: ["Yes", "No — it can crowd out a better-fitting combination", "Only if all weights are equal"],
      answer: 1,
      why: "A heavy high-value item can block two items that together are worth more."
    },
    {
      difficulty: 3,
      q: "Rod cutting: is 'make the single highest-price cut first' optimal?",
      options: ["Yes", "No — the best result may use several smaller cuts", "Yes if the rod is long enough"],
      answer: 1,
      why: "Revenue depends on the whole partition; greedy on one cut misses better splits."
    },
    {
      difficulty: 1,
      q: "Which of these genuinely needs DP rather than a greedy pass?",
      options: ["Reporting the grid's dimensions", "Counting all right/down paths through a grid", "Printing the first cell"],
      answer: 1,
      why: "Counting paths sums over subproblems; the others are trivial lookups."
    },
    {
      difficulty: 1,
      q: "Fewest coins using US coins {1,5,10,25}. Is greedy (largest first) optimal here?",
      options: ["Yes — this coin system is canonical, so greedy works", "No, greedy never works for coins", "Only for amounts under 10"],
      answer: 0,
      why: "Greedy is optimal for canonical systems like {1,5,10,25}, though not for arbitrary sets."
    },
    {
      difficulty: 2,
      q: "Longest increasing subsequence: does greedily extending with the next larger element give the longest?",
      options: ["Yes", "No — you sometimes must skip elements to build a longer run"],
      answer: 1,
      why: "A locally tempting element can block a longer subsequence later."
    },
    {
      difficulty: 2,
      q: "Minimum path sum in a grid: is 'always move toward the smaller neighbor' optimal?",
      options: ["Yes", "No — a locally cheaper step can lead to a worse overall path"],
      answer: 1,
      why: "Only comparing full subproblem sums (DP) guarantees the minimum."
    },
    {
      difficulty: 3,
      q: "Subset sum: does greedily adding the largest number that still fits always reach the target?",
      options: ["Yes", "No — it can overshoot or strand the target when another combo would work"],
      answer: 1,
      why: "Hitting an exact target needs search over subsets, not a single greedy pass."
    },
    {
      difficulty: 3,
      q: "Matrix chain: is multiplying the two smallest matrices first always optimal?",
      options: ["Yes", "No — the best order depends on all the dimensions, requiring DP"],
      answer: 1,
      why: "Parenthesization cost is global; local size heuristics can be suboptimal."
    }
  ]
};

// ============================================================
// FRIENDS — recruitable party members
// Recruit by scoring enough affinity in their conversation.
// perk fields: hp (+maxHP), atk (+dmg %), xp (+xp %), recoilShield (0..1), hint (bool, rare)
// threshold = affinity points needed for them to offer to join.
// ============================================================
const FRIENDS = {
  cook: {
    id:"cook", name:"Remy the Cook", emoji:"🧑‍🍳", color:"#f6ad55", rarity:"common",
    perk:{ hp:25, desc:"+25 max HP (hearty meals)" }, threshold:3,
    convo:[
      "Remy: A traveler! You look hungry. Tell me — what IS cooking, really?",
      { choose:"Your answer:", options:[
        { label:"A recipe is just a step-by-step algorithm.", score:2, reply:["Remy: YES! A kindred spirit. Precise steps, perfect results!"] },
        { label:"Cooking wastes time I could spend coding.", score:-2, reply:["Remy: ...ouch. There's more to life than a keyboard."] },
        { label:"I just microwave stuff.", score:0, reply:["Remy: We have work to do, then."] }
      ]},
      "Remy: What makes a dish truly great?",
      { choose:"Pick one:", options:[
        { label:"Balance — like balancing the terms of a recurrence.", score:2, reply:["Remy: Beautifully said! You understand harmony."] },
        { label:"Just dump every ingredient in.", score:-1, reply:["Remy: A greedy approach... rarely optimal, friend."] }
      ]}
    ]
  },
  bard: {
    id:"bard", name:"Aria the Bard", emoji:"🎵", color:"#bfe6f5", rarity:"rare",
    perk:{ hint:true, desc:"RARE: battle hints — remove one wrong answer" }, threshold:4,
    convo:[
      "Aria: A song is like a good hint — it points you toward the truth without giving it away.",
      { choose:"Reply:", options:[
        { label:"A great teammate encourages, not carries.", score:2, reply:["Aria: Exactly. I lift others up."] },
        { label:"I work alone. Always.", score:-2, reply:["Aria: A lonely melody... and a losing one."] }
      ]},
      "Aria: If a friend is stuck on a hard problem, what do you do?",
      { choose:"Pick one:", options:[
        { label:"Give a nudge that narrows their options.", score:2, reply:["Aria: A perfect hint! That's my gift too."] },
        { label:"Tell them the answer outright.", score:0, reply:["Aria: Hmm. That robs them of the learning."] },
        { label:"Let them fail — it builds character.", score:-1, reply:["Aria: Sometimes. But kindness matters."] }
      ]},
      "Aria: Would you value a hint when the question is hardest?",
      { choose:"Pick one:", options:[
        { label:"Absolutely — a small edge can change everything.", score:2, reply:["Aria: Then my music is for you."] },
        { label:"Never. Hints are for the weak.", score:-2, reply:["Aria: Pride before the fall..."] }
      ]}
    ]
  },
  strategist: {
    id:"strategist", name:"Grove the Strategist", emoji:"🧠", color:"#c2e26b", rarity:"common",
    perk:{ atk:0.15, desc:"+15% attack damage (sharp planning)" }, threshold:3,
    convo:[
      "Grove: The forest is a maze of subproblems. How do you conquer a maze?",
      { choose:"Reply:", options:[
        { label:"Break it into subproblems and reuse solutions.", score:2, reply:["Grove: Dynamic programming! We think alike."] },
        { label:"Charge straight ahead and hope.", score:-2, reply:["Grove: ...that's how travelers get lost forever."] }
      ]},
      "Grove: Greedy or optimal?",
      { choose:"Pick one:", options:[
        { label:"Optimal — plan for the whole problem.", score:2, reply:["Grove: A strategist's heart."] },
        { label:"Greedy — fast and good enough.", score:-1, reply:["Grove: Fast, yes. Correct? Not always."] }
      ]}
    ]
  },
  optimist: {
    id:"optimist", name:"Sunny the Optimist", emoji:"☀️", color:"#e6cd94", rarity:"common",
    perk:{ xp:0.25, desc:"+25% XP gained (good vibes)" }, threshold:2,
    convo:[
      "Sunny: The desert's harsh, but every failure is a lesson! Don't you think?",
      { choose:"Reply:", options:[
        { label:"Every wrong answer teaches me something.", score:2, reply:["Sunny: THAT'S the spirit! Growth mindset!"] },
        { label:"Failure just means I'm bad at this.", score:-2, reply:["Sunny: Aw, don't say that! You're learning!"] }
      ]},
      "Sunny: Will you keep training even when it's hard?",
      { choose:"Pick one:", options:[
        { label:"Always — rank comes from persistence.", score:2, reply:["Sunny: I knew I liked you!"] },
        { label:"Only if it's easy.", score:-1, reply:["Sunny: Hmm, we'll work on that."] }
      ]}
    ]
  },
  guardian: {
    id:"guardian", name:"Cinder the Guardian", emoji:"🛡️", color:"#ff8a3f", rarity:"rare",
    perk:{ recoilShield:0.5, desc:"RARE: halves backfire recoil damage" }, threshold:3,
    convo:[
      "Cinder: Fear of a wrong answer paralyzes many. What do you do with fear?",
      { choose:"Reply:", options:[
        { label:"Face it — a wrong answer is survivable.", score:2, reply:["Cinder: Courage. I can shield someone like you."] },
        { label:"Avoid every risk entirely.", score:-2, reply:["Cinder: Then you'll never grow, and I can't help you."] }
      ]},
      "Cinder: When an attack backfires on you, what then?",
      { choose:"Pick one:", options:[
        { label:"Take the hit, learn, strike again.", score:2, reply:["Cinder: A warrior's resolve."] },
        { label:"Panic and give up.", score:-1, reply:["Cinder: Steady yourself, friend."] }
      ]}
    ]
  }
};
