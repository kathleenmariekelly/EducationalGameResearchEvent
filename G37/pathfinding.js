// pathfinding.js — pluggable search algorithms.
// Each returns { path, visitedOrder } so the UI can animate the search.
// Grid: cells with .walkable and .cost (cost>=1). 4-neighbour movement.

export function neighbors(grid, node) {
  const { x, y } = node;
  const out = [];
  const dirs = [ [1,0], [-1,0], [0,1], [0,-1] ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
    const c = grid.cells[ny * grid.w + nx];
    if (!c.walkable) continue;
    out.push({ x: nx, y: ny });
  }
  return out;
}

const key = (n) => n.x + "," + n.y;

function reconstruct(cameFrom, endKey) {
  const path = [];
  let k = endKey;
  while (k !== undefined) {
    const [x, y] = k.split(",").map(Number);
    path.push({ x, y });
    k = cameFrom.get(k);
  }
  return path.reverse();
}

// ---- BFS: shortest in STEPS, ignores cost ----
export function bfs(grid, start, goal) {
  const q = [start];
  const cameFrom = new Map([[key(start), undefined]]);
  const visitedOrder = [];
  while (q.length) {
    const cur = q.shift();
    visitedOrder.push(cur);
    if (cur.x === goal.x && cur.y === goal.y)
      return { path: reconstruct(cameFrom, key(cur)), visitedOrder };
    for (const nb of neighbors(grid, cur)) {
      if (!cameFrom.has(key(nb))) {
        cameFrom.set(key(nb), key(cur));
        q.push(nb);
      }
    }
  }
  return { path: null, visitedOrder };
}

// ---- DFS: dives deep with a stack; finds A path, not the shortest ----
export function dfs(grid, start, goal) {
  const stack = [start];
  const cameFrom = new Map([[key(start), undefined]]);
  const seen = new Set([key(start)]);
  const visitedOrder = [];
  while (stack.length) {
    const cur = stack.pop();
    visitedOrder.push(cur);
    if (cur.x === goal.x && cur.y === goal.y)
      return { path: reconstruct(cameFrom, key(cur)), visitedOrder };
    for (const nb of neighbors(grid, cur)) {
      if (!seen.has(key(nb))) {
        seen.add(key(nb));
        cameFrom.set(key(nb), key(cur));
        stack.push(nb);
      }
    }
  }
  return { path: null, visitedOrder };
}

// ---- Dijkstra: cheapest by tile COST ----
export function dijkstra(grid, start, goal) {
  const dist = new Map([[key(start), 0]]);
  const cameFrom = new Map([[key(start), undefined]]);
  const visitedOrder = [];
  const pq = new MinHeap();
  pq.push(0, start);
  const done = new Set();
  while (pq.size) {
    const cur = pq.pop();
    const ck = key(cur);
    if (done.has(ck)) continue;
    done.add(ck);
    visitedOrder.push(cur);
    if (cur.x === goal.x && cur.y === goal.y)
      return { path: reconstruct(cameFrom, ck), visitedOrder };
    for (const nb of neighbors(grid, cur)) {
      const nk = key(nb);
      const nd = dist.get(ck) + grid.cells[nb.y * grid.w + nb.x].cost;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        cameFrom.set(nk, ck);
        pq.push(nd, nb);
      }
    }
  }
  return { path: null, visitedOrder };
}

// ---- A*: Dijkstra + heuristic. Swap heuristic to teach admissibility. ----
export function astar(grid, start, goal, heuristic = manhattan) {
  const g = new Map([[key(start), 0]]);
  const cameFrom = new Map([[key(start), undefined]]);
  const visitedOrder = [];
  const pq = new MinHeap();
  pq.push(heuristic(start, goal), start);
  const done = new Set();
  while (pq.size) {
    const cur = pq.pop();
    const ck = key(cur);
    if (done.has(ck)) continue;
    done.add(ck);
    visitedOrder.push(cur);
    if (cur.x === goal.x && cur.y === goal.y)
      return { path: reconstruct(cameFrom, ck), visitedOrder };
    for (const nb of neighbors(grid, cur)) {
      const nk = key(nb);
      const ng = g.get(ck) + grid.cells[nb.y * grid.w + nb.x].cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        cameFrom.set(nk, ck);
        pq.push(ng + heuristic(nb, goal), nb);
      }
    }
  }
  return { path: null, visitedOrder };
}

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// A deliberately inadmissible heuristic for the teaching moment:
export const overEstimate = (a, b) => manhattan(a, b) * 3;

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(p, v) {
    this.a.push({ p, v });
    let i = this.a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.a[par].p <= this.a[i].p) break;
      [this.a[par], this.a[i]] = [this.a[i], this.a[par]];
      i = par;
    }
  }
  pop() {
    const top = this.a[0].v;
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < this.a.length && this.a[l].p < this.a[s].p) s = l;
        if (r < this.a.length && this.a[r].p < this.a[s].p) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
}

export const ALGOS = {
  bfs:      { name: "BFS",      fn: bfs,     usesCost: false },
  dfs:      { name: "DFS",      fn: dfs,     usesCost: false },
  dijkstra: { name: "Dijkstra", fn: dijkstra, usesCost: true },
  astar:    { name: "A*",       fn: (g, s, e) => astar(g, s, e, manhattan),   usesCost: true },
  astarBad: { name: "A* (bad h)", fn: (g, s, e) => astar(g, s, e, overEstimate), usesCost: true },
};
