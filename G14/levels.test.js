// Verify each level's lesson holds before building UI on top of it.
const UNIT = 60;
const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function buildGraph(L){
  const N = {}; L.nodes.forEach(n=>N[n.id]={...n, adj:[]});
  L.edges.forEach(([a,b,w])=>{
    const ww = w ?? Math.round(dist(N[a],N[b])/UNIT);
    N[a].adj.push({to:b,w:ww}); N[b].adj.push({to:a,w:ww});
  });
  const h = {}; for(const id in N) h[id]=L.noHeuristic?0:Math.round(dist(N[id],N[L.goal])/UNIT);
  return {N,h};
}

function run(L, kind){
  const {N,h}=buildGraph(L);
  const g={[L.start]:0}, hops={[L.start]:0}, from={}, discStep={[L.start]:0};
  const discovered=new Set([L.start]), expanded=new Set();
  const order=[]; let maxFront=1;
  const pr=id=>{
    if(kind==='bfs') return hops[id];
    if(kind==='dfs') return -discStep[id];
    if(kind==='dijkstra') return g[id];
    if(kind==='greedy') return h[id];
    return g[id]+h[id]; // astar
  };
  while(true){
    const front=[...discovered].filter(x=>!expanded.has(x));
    if(!front.length) break;
    maxFront=Math.max(maxFront,front.length);
    let best=front[0]; for(const x of front) if(pr(x)<pr(best)) best=x;
    expanded.add(best); order.push(best);
    if(best===L.goal) break;
    for(const {to,w} of N[best].adj){
      if(expanded.has(to)) continue;
      if(!discovered.has(to)){ discovered.add(to); discStep[to]=order.length; from[to]=best; g[to]=g[best]+(kind==='bfs'?1:w); hops[to]=hops[best]+1; }
      else if(kind==='dijkstra'||kind==='astar'){ const ng=g[best]+w; if(ng<g[to]){g[to]=ng;from[to]=best;hops[to]=hops[best]+1;} }
    }
  }
  const path=[]; let k=L.goal; if(expanded.has(L.goal)){ while(k!==undefined){path.push(k);k=from[k];} path.reverse(); }
  let cost=0; for(let i=1;i<path.length;i++){ const e=N[path[i-1]].adj.find(a=>a.to===path[i]); cost+=e.w; }
  return {order,path,cost,expanded:order.length,found:expanded.has(L.goal),maxFront};
}

const metric=(L,r)=> !r.found?Infinity : L.objective==='any'?0 : L.objective==='hops'?r.path.length-1 : r.cost;
const LEVELS = require('./levels.data.js');
for(const L of LEVELS){
  const tags=[L.best.join('/')]; if(L.noHeuristic)tags.push('GPS off'); if(L.objective)tags.push('obj='+L.objective);
  console.log('\n=== '+L.title+'  ('+tags.join(', ')+') ===');
  const optM = L.objective==='any'?0 : L.objective==='hops' ? metric(L,run(L,'bfs')) : run(L,'dijkstra').cost;
  for(const k of ['bfs','dfs','dijkstra','greedy','astar']){
    const r=run(L,k); const m=metric(L,r);
    const opt = r.found && m===optM;
    console.log(`${k.padEnd(9)} expand=${String(r.expanded).padStart(2)} cost=${String(r.cost).padStart(3)} stops=${r.found?r.path.length-1:'-'} peakMem=${r.maxFront} ${opt?'OPTIMAL':'worse  '} path=${r.path.join('>')}`);
  }
}
