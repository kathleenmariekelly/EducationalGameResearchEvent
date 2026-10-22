// Temporary test harness. Run with:  node test-interpreter.mjs
// Delete this file when done (it's not part of the game).
import { TIERS } from "./src/levels.js";

// Water and caves block movement just like walls.
function blocked(lv) {
  return [ ...(lv.walls||[]), ...(lv.water||[]), ...(lv.caves||[]) ];
}

// BFS: is the goal reachable at all (accounting for a jump=2 move and gems)?
function solvable(lv) {
  const B = blocked(lv);
  const DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
  const R = { up:"right", right:"down", down:"left", left:"up" };
  const L = { up:"left", left:"down", down:"right", right:"up" };
  const wall=(x,y)=> x<0||y<0||x>=lv.cols||y>=lv.rows || B.some(w=>w.x===x&&w.y===y);
  const totalGems=(lv.gems||[]).length;
  const gemMask=(x,y,mask)=>{ let m=mask; (lv.gems||[]).forEach((g,i)=>{ if(g.x===x&&g.y===y) m|=(1<<i);}); return m; };
  const key=(x,y,f,m)=>`${x},${y},${f},${m}`;
  const seen=new Set();
  const q=[{x:lv.start.x,y:lv.start.y,f:lv.facing,mask:gemMask(lv.start.x,lv.start.y,0)}];
  while(q.length){
    const s=q.shift();
    const k=key(s.x,s.y,s.f,s.mask);
    if(seen.has(k))continue; seen.add(k);
    const gotAll = totalGems===0 || s.mask===(1<<totalGems)-1;
    if(s.x===lv.goalTile.x&&s.y===lv.goalTile.y&&gotAll) return true;
    q.push({x:s.x,y:s.y,f:R[s.f],mask:s.mask});
    q.push({x:s.x,y:s.y,f:L[s.f],mask:s.mask});
    const d=DIRS[s.f];
    const nx=s.x+d.dx, ny=s.y+d.dy;
    if(!wall(nx,ny)) q.push({x:nx,y:ny,f:s.f,mask:gemMask(nx,ny,s.mask)});
    const jx=s.x+d.dx*2, jy=s.y+d.dy*2;
    if(!wall(jx,jy)) q.push({x:jx,y:jy,f:s.f,mask:gemMask(jx,jy,s.mask)});
  }
  return false;
}

let pass=0, fail=0;
function check(label,cond){ if(cond){pass++;}else{fail++;console.log(`  ❌ ${label}`);} }

TIERS.forEach((t, ti) => {
  console.log(`\n=== TIER ${ti+1}: ${t.name}  (${t.variants.length} variant(s))`);
  t.variants.forEach((lv, vi) => {
    check(`T${ti+1}.v${vi+1} "${lv.title}" is solvable`, solvable(lv));
  });
});

console.log(`\n\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
