/* ============================================================
   Code Master — CODE-MAN (Pac-Man style mode)
   ------------------------------------------------------------
   Chomp dots in a lattice maze, avoid "bug-ghosts", and eat
   ❓ pellets to trigger a question. Correct answers scare the
   ghosts (frightened mode) so you can eat them for big points.
   Eat every dot to win. Lose all lives = game over.
   ============================================================ */

const PacMan = (() => {
  const TILE = 30;
  const COLS = 21, ROWS = 15;      // 630 x 450
  const SPEED = 2;                 // divides TILE (30) evenly -> clean grid snapping
  const GHOST_SPEED = 2;
  const FRIGHT_TIME = 6000;        // ms ghosts stay edible
  let frame = 0;

  let canvas, ctx, level;
  let grid;                        // 2D: '#','.', 'o'(question), ' '
  let player, ghosts, running, keys, wantDir;
  let score, lives, dotsLeft, frightUntil, onOver, questionOpen, qList, qi, lastQ;

  const $ = (id) => document.getElementById(id);

  // ---- build a fully-connected lattice maze ----
  function buildMaze(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      const row = [];
      for(let c=0;c<COLS;c++){
        if(r===0||c===0||r===ROWS-1||c===COLS-1) row.push("#");
        else if(r%2===0 && c%2===0) row.push("#");   // pillars -> lattice
        else row.push(".");
      }
      grid.push(row);
    }
    // carve player + ghost home (clear dots there)
    // choose question pellet tiles
    const floors = [];
    for(let r=1;r<ROWS-1;r++) for(let c=1;c<COLS-1;c++) if(grid[r][c]===".") floors.push({r,c});
    // shuffle
    for(let i=floors.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[floors[i],floors[j]]=[floors[j],floors[i]];}
    const qCount = Math.min(8, qList.length, floors.length);
    for(let i=0;i<qCount;i++){ const f=floors[i]; grid[f.r][f.c]="o"; }
    // count dots
    dotsLeft = 0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(grid[r][c]==="."||grid[r][c]==="o") dotsLeft++;
  }

  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function tileOpen(c,r){ return grid[r] && grid[r][c] !== "#"; }
  function px(c){ return c*TILE; } function py(r){ return r*TILE; }
  function centered(v){ return (v % TILE) === 0; }

  function init(levelObj, overCb){
    level = levelObj; onOver = overCb;
    canvas = $("pac-canvas"); ctx = canvas.getContext("2d");
    score = 0; lives = 3; frightUntil = 0; questionOpen = false; lastQ = Date.now();
    qList = shuffle(levelObj.questions.slice()); qi = 0;   // random order every play
    buildMaze();
    $("pac-score").textContent = "0";
    $("pac-lives").textContent = "❤️❤️❤️";
    $("pac-pill").textContent = "👻 Code-Man: " + levelObj.title;
    $("pac-hint").classList.remove("hidden");
    resetActors();
    // recount dots AFTER player/ghost tiles are cleared
    dotsLeft = 0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(grid[r][c]==="." || grid[r][c]==="o") dotsLeft++;
    keys = {}; wantDir = null; running = true;
    loop();
  }

  function resetActors(){
    player = { c:1, r:1, x:px(1), y:py(1), dir:null, mouth:0 };
    grid[1][1] = " ";
    ghosts = [
      { x:px(COLS-2), y:py(1),      dir:"left",  color:"#ef476f", homeC:COLS-2, homeR:1 },
      { x:px(1),      y:py(ROWS-2), dir:"up",    color:"#9b5de5", homeC:1,      homeR:ROWS-2 },
      { x:px(COLS-2), y:py(ROWS-2), dir:"up",    color:"#118ab2", homeC:COLS-2, homeR:ROWS-2 }
    ];
    // dots removed at ghost homes count fix
  }

  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };

  function loop(){
    if(!running) return;
    frame++;
    if(!questionOpen) step();
    draw();
    requestAnimationFrame(loop);
  }

  function canMove(x,y,dir){
    const d = DIRS[dir];
    // where the leading edge would be, in tile terms
    const nx = x + d.x*SPEED, ny = y + d.y*SPEED;
    const c = Math.round(nx/TILE), r = Math.round(ny/TILE);
    // only allow turning/continuing if aligned to grid on the perpendicular axis
    if(d.x!==0 && (ny % TILE)!==0) return false;
    if(d.y!==0 && (nx % TILE)!==0) return false;
    const tc = d.x>0 ? Math.ceil(nx/TILE) : Math.floor(nx/TILE);
    const tr = d.y>0 ? Math.ceil(ny/TILE) : Math.floor(ny/TILE);
    return tileOpen(tc, tr);
  }

  function step(){
    // player turn buffering
    if(wantDir && canMove(player.x, player.y, wantDir)) player.dir = wantDir;
    if(player.dir && canMove(player.x, player.y, player.dir)){
      const d = DIRS[player.dir];
      player.x += d.x*SPEED; player.y += d.y*SPEED;
      player.mouth = (player.mouth+0.25)%2;
    }
    // eat
    if(centered(player.x) && centered(player.y)){
      const c = player.x/TILE, r = player.y/TILE;
      const cell = grid[r][c];
      if(cell==="."){ grid[r][c]=" "; score+=10; dotsLeft--; $("pac-score").textContent=score; Sound.sfx.click(); }
      else if(cell==="o"){ grid[r][c]=" "; dotsLeft--; score+=10; $("pac-score").textContent=score;
        if(Date.now() - lastQ >= 20000){ lastQ = Date.now(); askQuestion(); } }   // 20s+ gap between questions
      if(dotsLeft<=0){ return win(); }
    }
    // ghosts
    const frightened = Date.now() < frightUntil;
    ghosts.forEach(g => moveGhost(g, frightened));
    // collisions
    ghosts.forEach(g => {
      if(Math.hypot(g.x-player.x, g.y-player.y) < TILE*0.6){
        if(frightened){ // eat ghost
          score += 200; $("pac-score").textContent=score; Sound.sfx.streak();
          g.x=px(g.homeC); g.y=py(g.homeR); g.dir="up";
        } else {
          loseLife();
        }
      }
    });
  }

  function moveGhost(g, frightened){
    // frightened ghosts move at half rate (skip alternate frames -> keeps grid aligned)
    if(frightened && (frame % 2 === 0)) return;
    // at tile center, choose a direction toward (or away from) the player
    if(g.x % TILE === 0 && g.y % TILE === 0){
      const c = g.x/TILE, r = g.y/TILE;
      const rev = {up:"down",down:"up",left:"right",right:"left"};
      const opts = [];
      for(const dir in DIRS){
        const d = DIRS[dir];
        if(tileOpen(c+d.x, r+d.y) && dir !== rev[g.dir]) opts.push(dir);
      }
      if(opts.length===0) opts.push(rev[g.dir]);   // dead end: turn around
      let best=opts[0], bestVal=Infinity;
      opts.forEach(dir=>{
        const d=DIRS[dir];
        const dt=Math.hypot((c+d.x)*TILE-player.x,(r+d.y)*TILE-player.y);
        const val = frightened ? -dt : dt;
        if(val<bestVal){ bestVal=val; best=dir; }
      });
      if(Math.random()<0.2 && opts.length>1) best = opts[Math.floor(Math.random()*opts.length)];
      g.dir = best;
    }
    const d = DIRS[g.dir];
    g.x += d.x*GHOST_SPEED; g.y += d.y*GHOST_SPEED;
  }

  function loseLife(){
    lives--;
    $("pac-lives").textContent = "❤️".repeat(Math.max(0,lives));
    Sound.sfx.wrong();
    if(lives<=0){ return gameOver(false); }
    resetActors();
  }

  // ---------- drawing ----------
  function draw(){
    ctx.fillStyle = "#060a14"; ctx.fillRect(0,0,canvas.width,canvas.height);
    const frightened = Date.now() < frightUntil;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const cell=grid[r][c], x=c*TILE, y=r*TILE;
      if(cell==="#"){
        ctx.fillStyle="#1b2a52";
        ctx.fillRect(x+3,y+3,TILE-6,TILE-6);
        ctx.strokeStyle="rgba(6,214,160,.25)"; ctx.lineWidth=1;
        ctx.strokeRect(x+3,y+3,TILE-6,TILE-6);
      } else if(cell==="."){
        ctx.fillStyle="#ffd166"; ctx.beginPath();
        ctx.arc(x+TILE/2,y+TILE/2,3,0,7); ctx.fill();
      } else if(cell==="o"){
        ctx.fillStyle="#06d6a0"; ctx.font="20px serif"; ctx.textAlign="center";
        ctx.fillText("❓", x+TILE/2, y+TILE-7); ctx.textAlign="left";
      }
    }
    // player (chomping circle)
    ctx.fillStyle="#ffd94a";
    const cx=player.x+TILE/2, cy=player.y+TILE/2, rad=TILE/2-3;
    const open = 0.25 + 0.2*Math.abs(1-player.mouth);
    let a0=open, a1=2*Math.PI-open;
    const base = {right:0, down:Math.PI/2, left:Math.PI, up:-Math.PI/2}[player.dir||"right"];
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,rad,base+a0,base+a1); ctx.closePath(); ctx.fill();
    // ghosts
    ghosts.forEach(g=>{
      ctx.fillStyle = frightened ? "#3b6bd6" : g.color;
      const gx=g.x+TILE/2, gy=g.y+TILE/2, gr=TILE/2-3;
      ctx.beginPath(); ctx.arc(gx,gy-2,gr,Math.PI,0); ctx.lineTo(gx+gr,gy+gr);
      ctx.lineTo(gx+gr/2,gy+gr-3); ctx.lineTo(gx,gy+gr);
      ctx.lineTo(gx-gr/2,gy+gr-3); ctx.lineTo(gx-gr,gy+gr); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.arc(gx-4,gy-2,3,0,7); ctx.arc(gx+4,gy-2,3,0,7); ctx.fill();
      ctx.fillStyle="#111";
      ctx.beginPath(); ctx.arc(gx-3,gy-2,1.5,0,7); ctx.arc(gx+5,gy-2,1.5,0,7); ctx.fill();
    });
  }

  // ---------- questions ----------
  function askQuestion(){
    if(questionOpen) return;
    questionOpen = true;
    $("pac-hint").classList.add("hidden");
    const q = qList[qi % qList.length]; qi++;
    $("pq-topic").textContent = level.topic;
    $("pq-text").textContent = q.text;
    const code=$("pq-code");
    if(q.code){ code.textContent=q.code; code.classList.remove("hidden"); } else code.classList.add("hidden");
    $("pq-feedback").classList.add("hidden");
    const ans=$("pq-answers"), typ=$("pq-type");
    ans.innerHTML=""; ans.classList.remove("locked");
    if(q.type==="type"){
      ans.classList.add("hidden"); typ.classList.remove("hidden");
      const inp=$("pq-input"); inp.value=""; inp.disabled=false; setTimeout(()=>inp.focus(),50);
      typ._q = q;
    } else {
      typ.classList.add("hidden"); ans.classList.remove("hidden");
      let opts,shapes;
      if(q.type==="truefalse"){ opts=["True","False"]; shapes=["✔","✘"]; }
      else { opts=q.options; shapes=["▲","◆","●","■"]; }
      opts.forEach((opt,i)=>{
        const b=document.createElement("button");
        b.className="answer-tile"+(q.type==="truefalse"?" tf":"");
        b.innerHTML=`<span class="shape">${shapes[i]||""}</span> <span>${opt}</span>`;
        b.onclick=()=>resolveQ(i===correctIndex(q), q, b);
        ans.appendChild(b);
      });
    }
    $("pac-q").classList.remove("hidden");
  }
  function correctIndex(q){ return q.type==="truefalse" ? (q.answer===true?0:1) : q.answer; }
  function submitTyped(){
    if(!questionOpen) return;
    const q = $("pq-type")._q;
    const ok = typedMatches($("pq-input").value, q.answer);
    $("pq-input").disabled=true; resolveQ(ok, q, null);
  }
  function resolveQ(correct, q, btn){
    const fb=$("pq-feedback");
    if(q.type!=="type"){
      $("pq-answers").classList.add("locked");
      $("pq-answers").children[correctIndex(q)].classList.add("correct");
      if(!correct && btn) btn.classList.add("wrong");
    }
    fb.classList.remove("hidden");
    if(correct){
      Sound.sfx.correct();
      score+=100; $("pac-score").textContent=score;
      frightUntil = Date.now()+FRIGHT_TIME;
      fb.innerHTML = "✅ +100! Ghosts are scared \u2014 chomp them! " + (q.explain||"");
    } else {
      Sound.sfx.wrong();
      fb.innerHTML = "❌ " + (q.explain||"Keep going!");
    }
    setTimeout(()=>{ $("pac-q").classList.add("hidden"); questionOpen=false; }, correct?1500:2300);
  }

  function win(){ running=false; Sound.sfx.win(); gameOver(true); }
  function gameOver(won){
    running=false;
    onOver(score, won);
  }

  // ---------- input ----------
  function keyToDir(k){
    k=k.toLowerCase();
    if(k==="w"||k==="arrowup")return"up";
    if(k==="s"||k==="arrowdown")return"down";
    if(k==="a"||k==="arrowleft")return"left";
    if(k==="d"||k==="arrowright")return"right";
    return null;
  }
  function onKeyDown(e){
    if(!running) return;
    // don't hijack keys while the player is typing an answer
    const t = e.target;
    if(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    const d=keyToDir(e.key);
    if(d){ wantDir=d; e.preventDefault(); }
  }
  function wire(){
    document.addEventListener("keydown", onKeyDown);
    $("pq-submit").onclick = submitTyped;
    $("pq-input").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.stopPropagation(); submitTyped(); }});
    document.querySelectorAll("#pac-dpad button").forEach(b=>{
      const dir=b.dataset.dir;
      const set=()=>{ wantDir=dir; };
      b.addEventListener("touchstart", e=>{ e.preventDefault(); set(); });
      b.addEventListener("mousedown", set);
    });
  }
  function stop(){ running=false; }

  return { init, wire, stop };
})();
