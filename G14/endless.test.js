// Headless validation of the endless generator across all four objectives.
// Mirrors the generator + refRun + classify logic in index.html.
const UNIT=60;
const distXY=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function connect(nodes,edges,seen,key){
  const parent={}; nodes.forEach(n=>parent[n.id]=n.id);
  const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
  edges.forEach(([a,b])=>{parent[find(a)]=find(b);});
  let guard=0;
  while(guard++<nodes.length+2){
    const comps={}; nodes.forEach(n=>{const r=find(n.id);(comps[r]=comps[r]||[]).push(n);});
    const keys=Object.keys(comps); if(keys.length<=1) break;
    const A=comps[keys[0]]; let pair=null,bd=Infinity;
    for(const na of A) for(let k=1;k<keys.length;k++) for(const nb of comps[keys[k]]){
      const d=distXY(na,nb); if(d<bd){bd=d;pair=[na.id,nb.id];}
    }
    const kk=key(pair[0],pair[1]); if(!seen.has(kk)){seen.add(kk);edges.push(pair);}
    parent[find(pair[0])]=find(pair[1]);
  }
}
function genCandidate(nodeCount,opts={}){
  const X0=90,X1=650,Y0=80,Y1=405;
  const cols=Math.max(3,Math.round(Math.sqrt(nodeCount*1.7))), rows=Math.ceil(nodeCount/cols);
  const cells=[]; for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push({r,c}); shuffle(cells);
  const cw=(X1-X0)/cols, ch=(Y1-Y0)/rows;
  const ids='ABCDEFGHIJKLMN'.split('');
  const nodes=cells.slice(0,nodeCount).map((cell,i)=>({id:ids[i],
    x:Math.round(X0+cell.c*cw+cw*(0.28+0.44*Math.random())),
    y:Math.round(Y0+cell.r*ch+ch*(0.28+0.44*Math.random()))}));
  nodes.sort((a,b)=>a.x-b.x);
  const start=nodes[0].id, goal=nodes[nodes.length-1].id;
  const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const edges=[], seen=new Set(); const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  for(const n of nodes){
    const others=nodes.filter(m=>m.id!==n.id).map(m=>({id:m.id,d:distXY(n,m)})).sort((a,b)=>a.d-b.d);
    const k=2+(Math.random()<0.5?1:0);
    for(let j=0;j<Math.min(k,others.length);j++){ const b=others[j].id;
      if((n.id===start&&b===goal)||(n.id===goal&&b===start))continue;
      const kk=key(n.id,b); if(seen.has(kk))continue; seen.add(kk); edges.push([n.id,b]); }
  }
  connect(nodes,edges,seen,key);
  const congestion=opts.congestion??0.3;
  const E=edges.map(([a,b])=>{ if(opts.uniform) return [a,b,1];
    let w=Math.max(1,Math.round(distXY(byId[a],byId[b])/UNIT));
    if(Math.random()<congestion) w=Math.max(w+1,Math.round(w*(1.6+Math.random()))); return [a,b,w]; });
  return {nodes,edges:E,start,goal,objective:'cost'};
}
function genBushyCandidate(nodeCount){
  const ids='ABCDEFGHIJKLMN'.split('');
  const nodes=[{id:ids[0]}]; const parentOf={}; let idx=1; const q=[0];
  while(idx<nodeCount && q.length){ const p=q.shift(); const r=Math.random(); const b=(r<0.55?2:r<0.9?3:1);
    for(let c=0;c<b && idx<nodeCount;c++){ const ci=idx++; nodes.push({id:ids[ci]}); parentOf[ids[ci]]=nodes[p].id; q.push(ci); } }
  const depth=id=>{let d=0,x=id;while(parentOf[x]!=null){x=parentOf[x];d++;}return d;};
  const byDepth={}; nodes.forEach(n=>{const d=depth(n.id);(byDepth[d]=byDepth[d]||[]).push(n);n._d=d;});
  const maxD=Math.max(...nodes.map(n=>n._d));
  const X0=90,X1=650,Y0=80,Y1=405,dx=(X1-X0)/Math.max(1,maxD);
  Object.keys(byDepth).forEach(d=>{const arr=byDepth[d],gap=(Y1-Y0)/(arr.length+1);
    arr.forEach((n,i)=>{n.x=Math.round(X0+d*dx);n.y=Math.round(Y0+gap*(i+1));});});
  const parents=new Set(Object.values(parentOf));
  const leaves=nodes.filter(n=>!parents.has(n.id));
  const goal=leaves.reduce((a,b)=>b._d>a._d?b:a,leaves[0]).id, start=nodes[0].id;
  const edges=[]; nodes.forEach(n=>{if(parentOf[n.id]!=null)edges.push([parentOf[n.id],n.id,1]);});
  nodes.forEach(n=>delete n._d);
  return {nodes,edges,start,goal,objective:'any'};
}
function buildGraph(L){ const N={}; L.nodes.forEach(n=>N[n.id]={...n,adj:[]});
  L.edges.forEach(([a,b,w])=>{N[a].adj.push({to:b,w});N[b].adj.push({to:a,w});});
  const h={}; for(const id in N) h[id]=L.noHeuristic?0:Math.round(distXY(N[id],N[L.goal])/UNIT); return {N,h}; }
function refRun(L,kind){ const {N,h}=buildGraph(L);
  const g={[L.start]:0},hops={[L.start]:0},from={},ds={[L.start]:0};
  const disc=new Set([L.start]),exp=new Set(),order=[]; let maxFront=1;
  const pr=id=>kind==='bfs'?hops[id]:kind==='dfs'?-ds[id]:kind==='dijkstra'?g[id]:kind==='greedy'?h[id]:g[id]+h[id];
  while(true){ const f=[...disc].filter(x=>!exp.has(x)); if(!f.length)break; maxFront=Math.max(maxFront,f.length);
    let b=f[0]; for(const x of f) if(pr(x)<pr(b)) b=x; exp.add(b); order.push(b); if(b===L.goal)break;
    for(const {to,w} of N[b].adj){ if(exp.has(to))continue;
      if(!disc.has(to)){disc.add(to);ds[to]=order.length;from[to]=b;g[to]=g[b]+(kind==='bfs'?1:w);hops[to]=hops[b]+1;}
      else if(kind==='dijkstra'||kind==='astar'){const ng=g[b]+w;if(ng<g[to]){g[to]=ng;from[to]=b;}} } }
  const path=[]; if(exp.has(L.goal)){let k=L.goal;while(k!==undefined){path.push(k);k=from[k];}path.reverse();}
  let cost=0; for(let i=1;i<path.length;i++)cost+=N[path[i-1]].adj.find(a=>a.to===path[i]).w;
  return {cost,found:exp.has(L.goal),expanded:order.length,maxFront,path}; }

function classify(objective,R,cand){
  if(objective==='hops'){ const bfsH=R.bfs.path.length-1,djH=R.dijkstra.path.length-1;
    return {best:['bfs'],contrast:R.bfs.found&&djH>bfsH}; }
  if(objective==='any') return {best:['dfs'],contrast:R.dfs.maxFront<=R.bfs.maxFront-2};
  if(cand.noHeuristic){ const opt=R.dijkstra.cost; return {best:['bfs'],contrast:R.dfs.found&&R.dfs.cost>opt}; }
  const opt=R.dijkstra.cost, g=['dijkstra','astar'], minExp=Math.min(...g.map(k=>R[k].expanded));
  const best=g.filter(k=>R[k].expanded===minExp);
  const astarPrunes=R.astar.expanded<=R.dijkstra.expanded-Math.max(2,Math.ceil(0.25*R.dijkstra.expanded));
  const greedyTrap=R.greedy.found&&R.greedy.cost>opt;
  return {best,contrast:astarPrunes||greedyTrap};
}
const OBJ=['cost','hops','noHeuristic','any'];
function gen(num){ const nc=Math.min(6+(num-1),14); const objective=OBJ[(num-1)%4]; let fb=null;
  for(let a=0;a<400;a++){ let c;
    if(objective==='any') c=genBushyCandidate(nc);
    else if(objective==='hops') c=genCandidate(nc,{congestion:0.5});
    else if(objective==='noHeuristic'){ c=genCandidate(nc,{uniform:true}); c.noHeuristic=true; }
    else c=genCandidate(nc,{congestion:0.35});
    const R={}; for(const k of ['bfs','dfs','dijkstra','greedy','astar']) R[k]=refRun(c,k);
    if(!R.dijkstra.found) continue; const spec=classify(objective,R,c);
    if(!fb) fb={objective,contrast:false,attempts:a+1,found:R.dijkstra.found,best:spec.best};
    if(spec.contrast) return {objective,contrast:true,attempts:a+1,found:true,best:spec.best,nc}; }
  return {...fb,nc,attempts:400}; }

const stats={};
for(let num=1; num<=16; num++){
  const o=OBJ[(num-1)%4]; stats[o]=stats[o]||{c:0,t:0,att:0,max:0,disc:0};
  for(let s=0;s<50;s++){ const g_=gen(num); const st=stats[o];
    st.t++; if(g_.contrast)st.c++; if(!g_.found)st.disc++; st.att+=g_.attempts; st.max=Math.max(st.max,g_.attempts); }
}
for(const o of OBJ){ const s=stats[o];
  console.log(`${o.padEnd(12)} contrast ${s.c}/${s.t} (${(100*s.c/s.t).toFixed(0)}%)  avgAttempts ${(s.att/s.t).toFixed(1)}  maxAttempts ${s.max}  disconnected ${s.disc}`);
}
