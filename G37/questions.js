// questions.js — the study bank. Answering these earns your defenses.
// Each question:
//   algo:       which world it belongs to (bfs/dfs/dijkstra/astar/general)
//   difficulty: 'easy' | 'medium' | 'hard'  (harder = better reward)
//   type:       'mc' (multiple choice) | 'fill' (typed answer)
//   prompt:     the question
//   choices:    [..] for mc
//   answer:     correct choice index (mc) OR array of accepted strings (fill)
//   hints:      progressive nudges — later ones scaffold more, last is often
//               a fill-in-the-blank so learners still produce the answer
//   explain:    shown after answering, reinforces the concept
//   reward:     { walls, swamp } defenses granted on a correct answer

export const QUESTIONS = [
  // ---------------- BFS ----------------
  {
    algo: "bfs", difficulty: "easy", type: "mc",
    prompt: "BFS explores a graph using which data structure to decide what to visit next?",
    choices: ["A stack", "A queue", "A priority queue", "A hash map"],
    answer: 1,
    hints: [
      "Think about the ORDER BFS visits nodes: level by level, nearest first.",
      "First discovered = first explored. What structure is First-In-First-Out?",
      "It's a q _ _ _ _ (FIFO).",
    ],
    explain: "BFS uses a FIFO queue, so it fans out level by level and finds the fewest-edges path in an unweighted graph.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "bfs", difficulty: "easy", type: "mc",
    prompt: "On an unweighted grid, the path BFS returns is guaranteed to be...",
    choices: ["The cheapest by tile cost", "The fewest steps", "A random valid path", "The longest path"],
    answer: 1,
    hints: [
      "BFS doesn't know about tile costs at all.",
      "It counts EDGES/steps, treating every move as equal.",
      "Fewest ______ (a synonym for moves).",
    ],
    explain: "Because every edge has weight 1 to BFS, the first time it reaches the goal it has used the fewest steps.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "bfs", difficulty: "medium", type: "fill",
    prompt: "In BFS, before you add a neighbor to the queue you should mark it as ______ so it isn't processed twice. (one word)",
    answer: ["visited", "discovered", "seen"],
    hints: [
      "What happens if you enqueue the same node from two different neighbors?",
      "You track which nodes you've already reached to avoid repeats.",
      "The flag is usually called 'v _ _ _ _ _ _'.",
    ],
    explain: "Marking nodes visited when enqueued (not when dequeued) prevents duplicates and keeps BFS O(V+E).",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "bfs", difficulty: "hard", type: "mc",
    prompt: "For a graph with V vertices and E edges, the time complexity of BFS is:",
    choices: ["O(V log V)", "O(V + E)", "O(V²)", "O(E log V)"],
    answer: 1,
    hints: [
      "Each vertex is enqueued/dequeued at most once.",
      "Each edge is examined a constant number of times.",
      "Add the vertex work and the edge work: O(V _ E).",
    ],
    explain: "Every vertex is processed once and every edge scanned once, giving O(V + E) for adjacency-list BFS.",
    reward: { walls: 4, swamp: 2 },
  },

  // ---------------- DFS ----------------
  {
    algo: "dfs", difficulty: "easy", type: "mc",
    prompt: "DFS explores as far as possible before backtracking. It naturally uses a...",
    choices: ["Queue", "Stack (or recursion)", "Priority queue", "Sorted array"],
    answer: 1,
    hints: [
      "DFS dives deep, then comes back. That's Last-In-First-Out behavior.",
      "Recursion uses the call stack under the hood.",
      "A s _ _ _ _ (LIFO).",
    ],
    explain: "DFS uses a stack (explicit or the recursion call stack), so it goes deep before wide.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "dfs", difficulty: "medium", type: "mc",
    prompt: "Does DFS always find the shortest path in an unweighted graph?",
    choices: ["Yes, always", "No — it may find a longer path first", "Only on trees", "Only if the graph is cyclic"],
    answer: 1,
    hints: [
      "DFS commits to one branch deeply before trying others.",
      "It returns the first path it stumbles into, not the shortest.",
      "The answer is 'No — it may find a ______ path first.'",
    ],
    explain: "DFS finds A path, not necessarily the shortest. BFS is the one that guarantees fewest steps unweighted.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dfs", difficulty: "hard", type: "fill",
    prompt: "A DFS traversal can be used to detect ______ in a directed graph (hint: back edges reveal them). (one word)",
    answer: ["cycles", "cycle", "a cycle"],
    hints: [
      "During DFS, what does it mean to reach a node currently on the recursion stack?",
      "A 'back edge' to an ancestor signals repetition in the path.",
      "It detects c _ _ _ _ _.",
    ],
    explain: "If DFS finds an edge to a node still on the recursion stack (a back edge), the graph has a cycle.",
    reward: { walls: 4, swamp: 2 },
  },

  // ---------------- Dijkstra ----------------
  {
    algo: "dijkstra", difficulty: "easy", type: "mc",
    prompt: "Dijkstra's algorithm improves on BFS by taking into account each edge's...",
    choices: ["Color", "Weight/cost", "Direction only", "Name"],
    answer: 1,
    hints: [
      "Why would an enemy avoid the swamp tiles in this game?",
      "Some moves cost more than others.",
      "Edge w _ _ _ _ _ (cost).",
    ],
    explain: "Dijkstra picks the lowest total-cost node next, so it routes around expensive terrain like swamp.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "dijkstra", difficulty: "medium", type: "fill",
    prompt: "Dijkstra always expands the unvisited node with the ______ known distance next. (one word: smallest/largest)",
    answer: ["smallest", "minimum", "least", "lowest"],
    hints: [
      "It's greedy — it commits to the cheapest option it can prove.",
      "You pull from a min-priority-queue.",
      "The ______ (opposite of largest) tentative distance.",
    ],
    explain: "By always finalizing the closest unfinished node, Dijkstra guarantees each node's shortest distance when popped.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "dijkstra", difficulty: "hard", type: "mc",
    prompt: "Standard Dijkstra can give WRONG results when a graph contains...",
    choices: ["Many nodes", "Negative edge weights", "Cycles", "High-cost edges"],
    answer: 1,
    hints: [
      "Dijkstra assumes once a node is finalized, no cheaper route exists.",
      "What kind of edge could later LOWER an already-finalized distance?",
      "N _ _ _ _ _ _ _ edge weights.",
    ],
    explain: "Negative weights break Dijkstra's 'finalized is final' assumption. Use Bellman-Ford for negative edges.",
    reward: { walls: 4, swamp: 3 },
  },

  // ---------------- A* ----------------
  {
    algo: "astar", difficulty: "easy", type: "mc",
    prompt: "A* ranks nodes by f(n) = g(n) + h(n). What is g(n)?",
    choices: ["The guess of remaining cost", "The cost from start to n so far", "A random weight", "The number of neighbors"],
    answer: 1,
    hints: [
      "g and h split the score into 'known' and 'estimated'.",
      "g is the part you've actually paid already.",
      "Cost from ______ to n (the beginning).",
    ],
    explain: "g(n) is the real cost from the start; h(n) estimates the remaining cost to the goal.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "astar", difficulty: "medium", type: "fill",
    prompt: "An A* heuristic is 'admissible' if it never ______ the true remaining cost. (one word)",
    answer: ["overestimates", "overestimate", "exceeds"],
    hints: [
      "Admissible = optimistic. It can guess low, but not high.",
      "If it guesses too HIGH, A* may miss the best path.",
      "It never over _ _ _ _ _ _ _ _ _ the true cost.",
    ],
    explain: "An admissible heuristic never overestimates, which is what guarantees A* returns the optimal path.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "astar", difficulty: "hard", type: "mc",
    prompt: "If A*'s heuristic h(n) is always 0, A* behaves exactly like...",
    choices: ["DFS", "Dijkstra's algorithm", "Greedy best-first", "Binary search"],
    answer: 1,
    hints: [
      "With h=0, f(n) = g(n). Only real cost matters.",
      "Which algorithm ranks purely by cost-so-far?",
      "It becomes D _ _ _ _ _ _ _.",
    ],
    explain: "With h(n)=0, f(n)=g(n), so A* reduces to Dijkstra — it loses the goal-directed speedup but stays optimal.",
    reward: { walls: 4, swamp: 3 },
  },

  // ---------------- general ----------------
  {
    algo: "general", difficulty: "easy", type: "mc",
    prompt: "A graph edge with a 'weight' represents...",
    choices: ["How pretty it is", "The cost/distance to travel it", "Its id number", "Nothing"],
    answer: 1,
    hints: ["Think about roads vs swamp in this game.", "It's how expensive the move is.", "The c _ _ _ to travel."],
    explain: "Edge weights model travel cost/distance — the basis for Dijkstra and A*.",
    reward: { walls: 2, swamp: 0 },
  },

  // ================= MORE BFS =================
  {
    algo: "bfs", difficulty: "easy", type: "fill",
    prompt: "BFS explores the graph one ______ at a time, visiting all nodes at distance k before distance k+1. (one word)",
    answer: ["level", "layer", "level at a time"],
    hints: ["Picture ripples spreading out from a stone in water.", "All the closest nodes first, then the next ring.", "Level or l _ _ _ _."],
    explain: "BFS proceeds level by level (a.k.a. breadth-first), which is why it finds fewest-edge paths.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "bfs", difficulty: "medium", type: "mc",
    prompt: "You need the shortest path in an UNWEIGHTED graph. Which is the simplest correct choice?",
    choices: ["DFS", "BFS", "Dijkstra with all weights 1", "Both BFS and Dijkstra work, BFS is simpler"],
    answer: 3,
    hints: ["More than one option can be technically correct.", "Dijkstra with weight-1 edges equals BFS, but heavier.", "Pick the 'both work, BFS is simpler' option."],
    explain: "On unweighted graphs BFS is optimal and simplest; Dijkstra would also work but adds a needless priority queue.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "bfs", difficulty: "hard", type: "fill",
    prompt: "BFS finds shortest paths from a single ______ node to all others (unweighted). (one word for the origin)",
    answer: ["source", "start", "root"],
    hints: ["Where does the search begin?", "It's the single origin of the traversal.", "The s _ _ _ _ _ node."],
    explain: "BFS is a single-source shortest path algorithm for unweighted graphs.",
    reward: { walls: 4, swamp: 2 },
  },

  // ================= MORE DFS =================
  {
    algo: "dfs", difficulty: "easy", type: "fill",
    prompt: "DFS goes as ______ as possible down one branch before backtracking. (one word)",
    answer: ["deep", "far", "deeply"],
    hints: ["The D in DFS.", "It dives down, not wide.", "As d _ _ _ as possible."],
    explain: "Depth-First Search dives deep along each branch, then backtracks when it hits a dead end.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "dfs", difficulty: "medium", type: "mc",
    prompt: "Which task is DFS especially well-suited for?",
    choices: ["Finding the shortest unweighted path", "Topological sorting of a DAG", "Nearest-neighbor search", "Load balancing"],
    answer: 1,
    hints: ["Think about ordering tasks with dependencies.", "DFS finish-times give you an ordering.", "Topological s _ _ _ _ _ _."],
    explain: "DFS post-order (finish times) gives a topological sort of a Directed Acyclic Graph.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dfs", difficulty: "hard", type: "mc",
    prompt: "A recursive DFS on a very deep graph risks which runtime error?",
    choices: ["Divide by zero", "Stack overflow", "Null pointer", "Index out of bounds"],
    answer: 1,
    hints: ["Recursion uses the call stack.", "Too many nested calls exhaust it.", "Stack o _ _ _ _ _ _ _."],
    explain: "Deep recursion can exhaust the call stack; an explicit stack (iterative DFS) avoids this.",
    reward: { walls: 4, swamp: 2 },
  },

  // ================= MORE DIJKSTRA =================
  {
    algo: "dijkstra", difficulty: "easy", type: "fill",
    prompt: "Dijkstra typically uses a ______ queue to always grab the cheapest node next. (one word before 'queue')",
    answer: ["priority", "min", "min-priority"],
    hints: ["It's not a plain FIFO queue.", "It orders items by cost.", "A p _ _ _ _ _ _ _ queue."],
    explain: "A (min-)priority queue lets Dijkstra efficiently pull the lowest-distance unvisited node.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dijkstra", difficulty: "medium", type: "mc",
    prompt: "With a binary-heap priority queue, Dijkstra's time complexity is:",
    choices: ["O(V + E)", "O((V + E) log V)", "O(V²)", "O(E²)"],
    answer: 1,
    hints: ["Each edge can trigger a heap operation.", "Heap push/pop cost log V.", "O((V + E) l _ _ V)."],
    explain: "Binary-heap Dijkstra is O((V+E) log V); with a Fibonacci heap it drops to O(E + V log V).",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "dijkstra", difficulty: "hard", type: "fill",
    prompt: "For graphs with negative edge weights, use ______-Ford instead of Dijkstra. (name)",
    answer: ["bellman", "bellman-ford", "bellmanford"],
    hints: ["It's a two-word algorithm name, hyphenated.", "It relaxes all edges V-1 times.", "B _ _ _ _ _ _-Ford."],
    explain: "Bellman-Ford handles negative weights and detects negative cycles, unlike Dijkstra.",
    reward: { walls: 4, swamp: 3 },
  },

  // ================= MORE A* =================
  {
    algo: "astar", difficulty: "easy", type: "fill",
    prompt: "In f(n) = g(n) + h(n), the letter h stands for the ______. (one word)",
    answer: ["heuristic", "heuristics"],
    hints: ["It's the estimate of remaining cost.", "A 'best guess' function.", "The h _ _ _ _ _ _ _ _."],
    explain: "h(n) is the heuristic: an estimate of the cost from n to the goal.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "astar", difficulty: "medium", type: "mc",
    prompt: "On a 4-directional grid (no diagonals), a good admissible heuristic is:",
    choices: ["Euclidean distance", "Manhattan distance", "Always 100", "Random values"],
    answer: 1,
    hints: ["You can only move up/down/left/right.", "Sum of horizontal + vertical steps.", "M _ _ _ _ _ _ _ _ distance."],
    explain: "Manhattan distance matches 4-way movement and never overestimates, so it's admissible.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "astar", difficulty: "hard", type: "mc",
    prompt: "A heuristic is 'consistent' (monotonic) if for every edge u→v: h(u) ≤ ...",
    choices: ["h(v)", "cost(u,v) + h(v)", "g(v)", "0"],
    answer: 1,
    hints: ["Consistency relates a node's estimate to its neighbor's.", "It's like a triangle inequality.", "h(u) ≤ c _ _ _(u,v) + h(v)."],
    explain: "Consistency means h(u) ≤ cost(u,v) + h(v). Consistent heuristics are always admissible.",
    reward: { walls: 4, swamp: 3 },
  },

  // ================= MORE GENERAL =================
  {
    algo: "general", difficulty: "easy", type: "mc",
    prompt: "A 'directed' edge means you can travel...",
    choices: ["Both ways freely", "Only one way (u to v)", "Never", "Only diagonally"],
    answer: 1,
    hints: ["Think one-way streets.", "The arrow points one direction.", "Only o _ _ way."],
    explain: "A directed edge u→v permits travel from u to v only, unlike undirected edges.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "general", difficulty: "medium", type: "fill",
    prompt: "A graph with no cycles and a single direction of flow is called a D.A.G. — a Directed ______ Graph. (one word)",
    answer: ["acyclic", "a-cyclic"],
    hints: ["The 'A' in DAG.", "It means 'without cycles'.", "A _ _ _ _ _ _."],
    explain: "A DAG is a Directed Acyclic Graph — no cycles — which enables topological ordering.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "general", difficulty: "hard", type: "mc",
    prompt: "Storing a sparse graph (few edges) most memory-efficiently uses:",
    choices: ["Adjacency matrix", "Adjacency list", "A single integer", "A 2D grid always"],
    answer: 1,
    hints: ["A matrix wastes space on missing edges.", "Store only edges that exist.", "Adjacency l _ _ _."],
    explain: "Adjacency lists use O(V+E) space, far better than an O(V²) matrix for sparse graphs.",
    reward: { walls: 4, swamp: 2 },
  },

  // ================= EXTRA BATCH =================
  {
    algo: "bfs", difficulty: "medium", type: "mc",
    prompt: "You dequeue a node in BFS. When is its shortest distance from the source finalized?",
    choices: ["Never", "The moment it's first discovered/enqueued", "Only at the end", "After visiting all nodes"],
    answer: 1,
    hints: ["BFS reaches nodes in increasing distance order.", "First time you see it IS the shortest way there.", "When it's first d _ _ _ _ _ _ _ _ _."],
    explain: "In unweighted BFS, the first discovery of a node is along a shortest path, so its distance is fixed then.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "bfs", difficulty: "hard", type: "mc",
    prompt: "'0-1 BFS' (edges of weight 0 or 1) uses which structure for O(V+E) shortest paths?",
    choices: ["A max-heap", "A deque (double-ended queue)", "A plain stack", "A hash set"],
    answer: 1,
    hints: ["You push weight-0 edges to the front, weight-1 to the back.", "Needs adding at both ends.", "A d _ _ _ _."],
    explain: "0-1 BFS uses a deque: push 0-weight moves to the front, 1-weight to the back — O(V+E).",
    reward: { walls: 4, swamp: 2 },
  },
  {
    algo: "dfs", difficulty: "easy", type: "mc",
    prompt: "Which traversal is most naturally written with recursion?",
    choices: ["BFS", "DFS", "Dijkstra", "A*"],
    answer: 1,
    hints: ["Recursion uses the call stack.", "Which search is stack-based?", "D _ _."],
    explain: "DFS maps directly onto recursion because both use a stack (the call stack).",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "dfs", difficulty: "medium", type: "fill",
    prompt: "When DFS finishes exploring a node and returns to its parent, we call that ______. (one word)",
    answer: ["backtracking", "backtrack", "backtracking."],
    hints: ["Going back the way you came when a branch dead-ends.", "Back + track.", "B _ _ _ tracking."],
    explain: "Backtracking is DFS returning to a previous node to explore other branches.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dfs", difficulty: "hard", type: "mc",
    prompt: "Kosaraju's and Tarjan's algorithms use DFS to find a graph's...",
    choices: ["Shortest paths", "Strongly connected components", "Minimum spanning tree", "Bipartite matching"],
    answer: 1,
    hints: ["They analyze reachability in directed graphs.", "Groups where every node reaches every other.", "Strongly c _ _ _ _ _ _ _ _ components."],
    explain: "Both algorithms use DFS to compute strongly connected components (SCCs) of a directed graph.",
    reward: { walls: 4, swamp: 2 },
  },
  {
    algo: "dijkstra", difficulty: "easy", type: "mc",
    prompt: "Dijkstra's algorithm requires all edge weights to be...",
    choices: ["Integers only", "Non-negative", "Prime numbers", "Equal"],
    answer: 1,
    hints: ["It breaks when a route can get cheaper later.", "No negatives allowed.", "Non-n _ _ _ _ _ _ _."],
    explain: "Dijkstra needs non-negative weights so a finalized node's distance can never improve later.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "dijkstra", difficulty: "medium", type: "mc",
    prompt: "The core repeated operation in Dijkstra that updates a neighbor's tentative distance is called:",
    choices: ["Hashing", "Relaxation", "Pivoting", "Recursion"],
    answer: 1,
    hints: ["It's the 'if new path is shorter, update' step.", "Same term Bellman-Ford uses.", "R _ _ _ _ _ _ _ _ _."],
    explain: "Relaxation checks if going through the current node gives a shorter path to a neighbor, and updates if so.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "astar", difficulty: "easy", type: "mc",
    prompt: "A* is best described as a combination of:",
    choices: ["BFS and DFS", "Dijkstra (cost) and Greedy Best-First (heuristic)", "Sorting and searching", "Two stacks"],
    answer: 1,
    hints: ["f(n) = g(n) + h(n) blends two ideas.", "Real cost so far plus an estimate ahead.", "Dijkstra + G _ _ _ _ _ best-first."],
    explain: "A* blends Dijkstra's exact cost g(n) with a greedy heuristic h(n) to guide the search toward the goal.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "astar", difficulty: "medium", type: "mc",
    prompt: "Making A*'s heuristic much LARGER than the true cost tends to make it...",
    choices: ["Slower but still optimal", "Faster but possibly non-optimal", "Always crash", "Identical to BFS"],
    answer: 1,
    hints: ["Overestimating breaks the optimality guarantee.", "It rushes toward the goal, maybe missing the best path.", "Faster but possibly non-o _ _ _ _ _ _."],
    explain: "An inflated (inadmissible) heuristic speeds A* up but can return a suboptimal path — the game's 'bad heuristic'.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "general", difficulty: "easy", type: "fill",
    prompt: "The two fundamental parts of a graph are vertices (nodes) and ______. (one word)",
    answer: ["edges", "edge", "links"],
    hints: ["They connect the nodes.", "The lines between dots.", "E _ _ _ _."],
    explain: "A graph is a set of vertices connected by edges.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "general", difficulty: "medium", type: "mc",
    prompt: "BFS and DFS both run in O(V+E) time. Their key difference is the...",
    choices: ["Programming language", "Order they visit nodes (queue vs stack)", "Memory address", "Number of edges"],
    answer: 1,
    hints: ["Same complexity, different exploration shape.", "One is FIFO, the other LIFO.", "The o _ _ _ _ they visit nodes."],
    explain: "BFS (queue) explores broad/level-order; DFS (stack) explores deep-first. Same O(V+E), different order.",
    reward: { walls: 3, swamp: 1 },
  },

  // ================= BATCH 3 =================
  {
    algo: "bfs", difficulty: "easy", type: "mc",
    prompt: "When you add a node to the BFS queue, you take it out again from the...",
    choices: ["Same end (front)", "Opposite end (front, FIFO)", "Middle", "Random spot"],
    answer: 1,
    hints: ["Queues are First-In-First-Out.", "Add at the back, remove from the front.", "The opposite end — F _ _ O."],
    explain: "A queue removes from the front and adds at the back (FIFO), giving BFS its level-order behavior.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "bfs", difficulty: "medium", type: "fill",
    prompt: "To reconstruct the BFS path, each node stores a pointer to its ______ node. (one word)",
    answer: ["parent", "predecessor", "previous"],
    hints: ["How did you first reach this node?", "You trace back through these to build the path.", "Its p _ _ _ _ _."],
    explain: "Storing each node's parent (predecessor) lets you walk backward from the goal to rebuild the path.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "bfs", difficulty: "hard", type: "mc",
    prompt: "Which real-world feature is a classic BFS use case?",
    choices: ["Spell check", "'Degrees of separation' in a social network", "Sorting numbers", "Encrypting data"],
    answer: 1,
    hints: ["Think shortest number of hops between people.", "Fewest connections = fewest edges.", "Degrees of s _ _ _ _ _ _ _ _ _."],
    explain: "BFS finds fewest-hop paths, perfect for shortest 'degrees of separation' between users.",
    reward: { walls: 4, swamp: 2 },
  },
  {
    algo: "dfs", difficulty: "easy", type: "mc",
    prompt: "After DFS reaches a dead end, what does it do?",
    choices: ["Stops completely", "Backtracks to the last node with unexplored neighbors", "Restarts from the goal", "Jumps to a random node"],
    answer: 1,
    hints: ["It doesn't give up.", "It returns to try other branches.", "It b _ _ _ tracks."],
    explain: "DFS backtracks to the most recent node that still has unvisited neighbors and continues from there.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "dfs", difficulty: "medium", type: "mc",
    prompt: "Which is a common use of DFS?",
    choices: ["Finding shortest paths", "Solving mazes / exhaustive exploration", "Balancing load", "Compressing files"],
    answer: 1,
    hints: ["It explores every branch fully.", "Great for 'try every route' puzzles.", "Solving m _ _ _ _."],
    explain: "DFS is ideal for exhaustive exploration like maze solving, where you probe each path to its end.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dfs", difficulty: "hard", type: "fill",
    prompt: "DFS visiting a node's children before the node itself is called ______-order traversal. (one word)",
    answer: ["post", "postorder", "post-order"],
    hints: ["Opposite of pre-order.", "You process the node AFTER its subtrees.", "P _ _ _-order."],
    explain: "Post-order visits children first, then the node — used in topological sort and expression trees.",
    reward: { walls: 4, swamp: 2 },
  },
  {
    algo: "dijkstra", difficulty: "easy", type: "fill",
    prompt: "At the start of Dijkstra, every node's distance is set to ______ except the source (0). (one word)",
    answer: ["infinity", "infinite", "inf"],
    hints: ["We haven't found any path yet, so assume the worst.", "An unreachably large value.", "In _ _ _ _ _ _."],
    explain: "All distances start at infinity (unknown) and the source at 0; relaxation lowers them over time.",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "dijkstra", difficulty: "medium", type: "mc",
    prompt: "Once Dijkstra removes a node from the priority queue and finalizes it, its shortest distance is...",
    choices: ["Still changeable", "Permanent (never improves again)", "Reset to zero", "Doubled"],
    answer: 1,
    hints: ["This only holds with non-negative weights.", "Finalized means done.", "P _ _ _ _ _ _ _ _."],
    explain: "With non-negative weights, a finalized node's distance can never get shorter later — that's Dijkstra's guarantee.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "dijkstra", difficulty: "hard", type: "mc",
    prompt: "To find shortest paths between ALL pairs of nodes, a common alternative is:",
    choices: ["Floyd-Warshall", "Quicksort", "Binary search", "Huffman coding"],
    answer: 0,
    hints: ["It's a dynamic-programming, all-pairs method.", "Hyphenated name, two people.", "F _ _ _ _-Warshall."],
    explain: "Floyd-Warshall computes shortest paths between all pairs in O(V³), handy for dense graphs.",
    reward: { walls: 4, swamp: 3 },
  },
  {
    algo: "astar", difficulty: "easy", type: "mc",
    prompt: "A* expands the node with the smallest value of...",
    choices: ["g(n) only", "h(n) only", "f(n) = g(n) + h(n)", "a random number"],
    answer: 2,
    hints: ["It balances cost-so-far and estimate-to-go.", "Add the two parts.", "f(n) = g(n) _ h(n)."],
    explain: "A* always expands the frontier node with the lowest f(n) = g(n) + h(n).",
    reward: { walls: 2, swamp: 1 },
  },
  {
    algo: "astar", difficulty: "medium", type: "fill",
    prompt: "Pure Greedy Best-First search uses only h(n) and ignores g(n), so it is fast but not ______. (one word)",
    answer: ["optimal", "admissible", "correct"],
    hints: ["It rushes to the goal ignoring real cost.", "It may not find the best path.", "Not o _ _ _ _ _ _."],
    explain: "Greedy best-first uses only the heuristic, so it's quick but not guaranteed optimal, unlike A*.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "astar", difficulty: "hard", type: "mc",
    prompt: "For 8-directional movement (diagonals allowed), which heuristic is admissible?",
    choices: ["Manhattan distance", "Chebyshev/diagonal distance", "Always 0 only", "Number of nodes"],
    answer: 1,
    hints: ["Manhattan overestimates when diagonals are allowed.", "You need one that accounts for diagonal moves.", "C _ _ _ _ _ _ _ v distance."],
    explain: "With diagonal moves, Chebyshev (diagonal) distance stays admissible; Manhattan would overestimate.",
    reward: { walls: 4, swamp: 3 },
  },
  {
    algo: "general", difficulty: "easy", type: "mc",
    prompt: "In graph terms, the tiles/cells on this map act as...",
    choices: ["Edges", "Vertices (nodes)", "Weights", "Heuristics"],
    answer: 1,
    hints: ["Each cell is a spot you can be.", "The connections between them are the edges.", "V _ _ _ _ _ _ _."],
    explain: "Grid cells are vertices; moves to adjacent cells are edges — that's how pathfinding sees the map.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "general", difficulty: "medium", type: "fill",
    prompt: "A path that starts and ends at the same vertex is called a ______. (one word)",
    answer: ["cycle", "loop", "circuit"],
    hints: ["It loops back on itself.", "DFS back edges reveal these.", "A c _ _ _ _."],
    explain: "A cycle is a path returning to its start; detecting cycles matters in scheduling and dependency graphs.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "general", difficulty: "hard", type: "mc",
    prompt: "A 'connected component' of an undirected graph is...",
    choices: ["A single edge", "A maximal set of mutually reachable vertices", "The heaviest edge", "The shortest path"],
    answer: 1,
    hints: ["Think islands of nodes all reachable from each other.", "'Maximal' = as big as possible.", "Mutually r _ _ _ _ _ _ _ _ vertices."],
    explain: "A connected component is a maximal group where every vertex can reach every other; BFS/DFS find them.",
    reward: { walls: 4, swamp: 2 },
  },

  // ================= BATCH 4 =================
  {
    algo: "bfs", difficulty: "medium", type: "mc",
    prompt: "How much extra memory does BFS need in the worst case?",
    choices: ["O(1)", "O(V) — the queue can hold many nodes", "O(log V)", "None"],
    answer: 1,
    hints: ["The queue can grow large on wide graphs.", "Proportional to number of vertices.", "O( _ )."],
    explain: "BFS may hold O(V) nodes in its queue at once, so its space use can be large on wide graphs.",
    reward: { walls: 3, swamp: 1 },
  },
  {
    algo: "dfs", difficulty: "easy", type: "fill",
    prompt: "Iterative DFS replaces recursion with an explicit ______. (one word)",
    answer: ["stack", "stack."],
    hints: ["Same structure recursion uses under the hood.", "LIFO.", "A s _ _ _ _."],
    explain: "Iterative DFS uses an explicit stack to mimic the call stack, avoiding deep recursion limits.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "dijkstra", difficulty: "medium", type: "fill",
    prompt: "Dijkstra is a greedy algorithm because it always commits to the ______ option available. (one word)",
    answer: ["cheapest", "closest", "nearest", "smallest"],
    hints: ["Greedy = take the best-looking choice now.", "Lowest tentative distance.", "The c _ _ _ _ _ _ _."],
    explain: "Dijkstra greedily finalizes the closest unvisited node each step — provably correct with non-negative weights.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "astar", difficulty: "medium", type: "mc",
    prompt: "If two heuristics are both admissible, the one giving LARGER estimates will usually make A*...",
    choices: ["Slower", "Explore fewer nodes (more efficient)", "Find worse paths", "Crash"],
    answer: 1,
    hints: ["Closer-to-true estimates guide the search better.", "Bigger (still admissible) = more informed.", "Explore f _ _ _ _ nodes."],
    explain: "A more informed (larger but still admissible) heuristic 'dominates', letting A* expand fewer nodes.",
    reward: { walls: 3, swamp: 2 },
  },
  {
    algo: "general", difficulty: "easy", type: "mc",
    prompt: "A tree is a special kind of graph that is connected and has...",
    choices: ["Many cycles", "No cycles", "No vertices", "Only one edge"],
    answer: 1,
    hints: ["Trees never loop back on themselves.", "Acyclic + connected.", "N _ cycles."],
    explain: "A tree is a connected, acyclic graph with exactly V-1 edges for V vertices.",
    reward: { walls: 2, swamp: 0 },
  },
  {
    algo: "general", difficulty: "medium", type: "mc",
    prompt: "Which algorithm would you pick for shortest path on a weighted graph with only positive weights?",
    choices: ["BFS", "DFS", "Dijkstra", "Random walk"],
    answer: 2,
    hints: ["Weights rule out plain BFS.", "Positive weights are Dijkstra's specialty.", "D _ _ _ _ _ _ _."],
    explain: "Dijkstra is the go-to for shortest paths with non-negative weights; BFS only works unweighted.",
    reward: { walls: 3, swamp: 1 },
  },
];

// Pick a random unused question from a given pool at a difficulty.
// `pool` is the full question list (built-in + custom); `used` is a Set of
// question objects already answered. Falls back gracefully.
export function pickQuestion(pool, algos, difficulty, used) {
  const list = Array.isArray(algos) ? algos : [algos];
  const inPool = (q) => list.includes(q.algo);
  const unusedAtDiff = pool.filter((q) => inPool(q) && q.difficulty === difficulty && !used.has(q));
  const anyAtDiff = pool.filter((q) => inPool(q) && q.difficulty === difficulty);
  const anyInPool = pool.filter((q) => inPool(q) && !used.has(q));
  const src = unusedAtDiff.length ? unusedAtDiff
            : anyAtDiff.length ? anyAtDiff
            : anyInPool.length ? anyInPool
            : pool.filter(inPool);
  return src[Math.floor(Math.random() * src.length)];
}
