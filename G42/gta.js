/* ============================================================
   Code Master — GTA (first-person driving, non-violent)
   ------------------------------------------------------------
   A pseudo-3D (OutRun-style) first-person driver. You sit in the
   car: hands on the steering wheel, a dashboard & speedo. Drive
   the city, steer through curves, LOOK AROUND with the mouse, and
   pull up to 💰 job markers — press E to take a job (a question)
   for cash. Finish all jobs to run the city. No weapons, no
   violence, just driving.
   ============================================================ */

const GTA = (() => {
  const W = 640, H = 480;
  const SEG = 200, ROAD = 2000, CAMH = 1000;
  const CAMD = 1 / Math.tan((100/2) * Math.PI/180);   // field of view depth
  const DRAW = 150;                                    // segments drawn
  const N = 700;                                       // total segments
  const TRACK = N * SEG;
  const MAXSPD = 260, ACCEL = 4.5, BRAKE = 8, DECEL = 3, OFFMAX = 90;

  let canvas, ctx, level, avatar, skinHex;
  let segments, missions, running, keys, cars, bustCd, pickups, jobs, qpoolJobs, qJobI;
  let position, playerX, speed, wheelAngle, lookX, lookY;
  let cash, done, total, active, onWin, goal, crashCount, lastQ;
  const QGAP = 20000;   // at least 20s between questions — give the player time to drive
  function nextJobQ(){ return qpoolJobs[(qJobI++) % qpoolJobs.length]; }
  function respawnJob(j){ j.z = position + 2600 + Math.random()*2200; j.x = [-0.55,0,0.55][Math.random()*3|0]; j.q = nextJobQ(); }

  const $ = (id) => document.getElementById(id);

  // ---------- track ----------
  const LIGHT = { road:"#4b4b57", grass:"#2b7a46", rumble:"#e6e6ec", lane:"#ffd766" };
  const DARK  = { road:"#43434f", grass:"#256b3c", rumble:"#b23636", lane:null };

  function buildTrack(){
    segments = [];
    let curve = 0, stretch = 0;
    for(let i=0;i<N;i++){
      if(stretch <= 0){ stretch = 20 + (Math.random()*60|0); curve = (Math.random()*7-3.5); if(Math.random()<0.4) curve=0; }
      stretch--;
      const seg = { index:i, z:i*SEG, curve, sprites:[], cross:false };
      // City blocks with OPEN intersections between them (less cluttered, feels like routes)
      const inBlock = (i % 30) < 16;
      if(inBlock && i%6===0){
        seg.sprites.push(makeBuilding(-1));
        seg.sprites.push(makeBuilding(1));
      }
      if(!inBlock && (i % 30) === 23) seg.cross = true;   // a cross-street / side road
      if(i%22===7) seg.sprites.push({ off:(Math.random()<.5?-1:1)*1.4, kind:"tree", size:1.0 });
      if(i%26===13) seg.sprites.push({ off:(Math.random()<.5?-1:1)*1.2, kind:"lamp", size:1.2 });
      segments.push(seg);
    }
    missions = [];   // jobs now spawn ahead dynamically (set up in init)
  }
  function makeBuilding(side){
    const themes = [["#3a4a6b","#ffe08a"],["#5b3a56","#ffd1e8"],["#2f5a52","#b8ffe8"],["#4a3f2a","#ffcf8a"]];
    const t = themes[Math.random()*themes.length|0];
    return { off: side*(1.45 + Math.random()*0.9), kind:"building", size:1.6+Math.random()*1.8, wall:t[0], win:t[1] };
  }

  function init(levelObj, winCb, av, cashGoal){
    level = levelObj; onWin = winCb; avatar = av || Avatar.makeDefault();
    goal = cashGoal || 200; crashCount = 0;
    skinHex = (Avatar.SKINS && Avatar.SKINS[avatar.skin]) || "#c68642";
    canvas = $("gta-canvas"); ctx = canvas.getContext("2d");
    buildTrack();
    position = 0; playerX = 0; speed = 0; wheelAngle = 0; lookX = 0; lookY = 0;
    cash = 0; done = 0; active = null; bustCd = 0;
    const lanes = [-0.55, 0, 0.55];
    // JOBS: finish 5 to clear the level; they keep spawning ahead so questions never dry up.
    total = 5;
    qpoolJobs = level.questions.slice();
    for(let i=qpoolJobs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [qpoolJobs[i],qpoolJobs[j]]=[qpoolJobs[j],qpoolJobs[i]]; }
    qJobI = 0; lastQ = Date.now();               // ~20s of free driving before the first question
    jobs = [];
    for(let i=0;i<4;i++){ jobs.push({ z: 1500 + i*1300, x: lanes[i%3], q: nextJobQ() }); }
    // A LITTLE traffic, spaced far apart (cops come after 3 crashes).
    cars = [];
    for(let i=0;i<3;i++){
      cars.push({ z: 2800 + i*3200 + Math.random()*1200,
                  x: lanes[Math.random()*lanes.length|0],
                  cop: false, spd: 18 + Math.random()*22 });
    }
    // A few CASH pickups, well spaced.
    pickups = [];
    for(let i=0;i<7;i++){
      pickups.push({ z: 1000 + i*1600 + Math.random()*400,
                     x: lanes[Math.random()*lanes.length|0], amt:50, taken:false });
    }
    keys = {}; running = true;
    $("gta-cash").textContent = "$0";
    $("gta-pill").textContent = "🚔 Cops & Robbers: " + levelObj.title;
    $("gta-wanted").textContent = "💼 0 / " + total + " jobs";
    $("gta-hint").classList.remove("hidden");
    hideQ();
    loop();
  }

  function loop(){ if(!running) return; if(!qOpen()) update(); draw(); requestAnimationFrame(loop); }
  function qOpen(){ return !$("gta-q").classList.contains("hidden"); }

  // ---------- update ----------
  function update(){
    const base = Math.floor(position/SEG) % N;
    const seg = segments[base];
    const spd = speed/MAXSPD;

    // accelerate / brake
    if(keys.up) speed += ACCEL;
    else if(keys.down) speed -= BRAKE;
    else speed -= DECEL;
    // steering
    let steer = 0;
    if(keys.left)  steer = -1;
    if(keys.right) steer =  1;
    playerX += steer * 0.020 * (0.4 + spd);
    // centrifugal push on curves (very gentle, so it won't fling you off the road)
    playerX -= seg.curve * spd * 0.003;
    // keep the car firmly ON the road (well inside the edges)
    playerX = Math.max(-0.6, Math.min(0.6, playerX));
    speed = Math.max(0, Math.min(MAXSPD, speed));
    position = (position + speed) % TRACK; if(position < 0) position += TRACK;

    // steering wheel smoothing
    const targetAngle = steer * 0.7 - seg.curve*spd*0.05;
    wheelAngle += (targetAngle - wheelAngle) * 0.15;

    // ---- traffic cruising the road; collect cash pickups ----
    if(bustCd>0) bustCd--;
    const lanes = [-0.55, 0, 0.55];
    cars.forEach(c=>{
      c.z += c.spd;
      let rel = c.z - position;
      if(rel < -500 || rel > 12000){ c.z = position + 6000 + Math.random()*5000; c.x = lanes[Math.random()*lanes.length|0]; }
      if(rel > 0 && rel < 230 && Math.abs(c.x - playerX) < 0.42 && bustCd<=0){ bump(); }
    });
    pickups.forEach(pk=>{
      const rel = pk.z - position;
      if(rel < -300 || rel > 9000){ pk.z = position + 3000 + Math.random()*3000; pk.x = lanes[Math.random()*lanes.length|0]; return; }
      if(rel > 0 && rel < 150 && Math.abs(pk.x - playerX) < 0.38 && bustCd<=0){
        cash += pk.amt; $("gta-cash").textContent = "$"+cash; Sound.sfx.click(); gflash("+$"+pk.amt);
        pk.z = position + 3000 + Math.random()*3000; pk.x = lanes[Math.random()*lanes.length|0];
      }
    });
    // ---- jobs keep spawning ahead; AUTO-START when you drive into one ----
    active = null;
    jobs.forEach(j=>{
      const rel = j.z - position;
      if(rel < -250 || rel > 9000){ respawnJob(j); return; }
      if(!active && rel > 0 && rel < 700 && Math.abs(j.x - playerX) < 0.45) active = j;   // for the prompt
      // drive into the marker -> the job question opens (but only every 20s+)
      if(!qOpen() && rel > 0 && rel < 150 && Math.abs(j.x - playerX) < 0.45 && bustCd<=0 && Date.now()-lastQ >= QGAP){ openJob(j); }
    });
    const prompt = $("gta-prompt");
    const cooling = Date.now()-lastQ < QGAP;
    if(active && !qOpen()){ prompt.classList.remove("hidden");
      $("gta-prompt-text").innerHTML = cooling ? "Next job in "+Math.ceil((QGAP-(Date.now()-lastQ))/1000)+"s — keep driving!" : "Drive into the 💰 to take the job!"; }
    else prompt.classList.add("hidden");
    $("gta-wanted").textContent = "💼 "+done+" / "+total+" jobs  •  💥 "+crashCount+"/3";
  }

  // ---------- projection ----------
  function project(camX, camZ, worldZ){
    let dz = worldZ - camZ; if(dz < 1) dz = 1;
    const scale = CAMD/dz;
    return {
      x: W/2 + scale*(-camX)*(W/2) + lookX,
      y: H/2 + scale*CAMH*(H/2) + lookY,
      w: scale*ROAD*(W/2),
      scale
    };
  }

  function poly(x1,y1,x2,y2,x3,y3,x4,y4,col){
    ctx.fillStyle=col; ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4); ctx.closePath(); ctx.fill();
  }

  // ---------- draw ----------
  function draw(){
    // sky
    const sky = ctx.createLinearGradient(0,0,0,H*0.6);
    sky.addColorStop(0,"#1a2350"); sky.addColorStop(1,"#5a6ea8");
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    // distant skyline silhouette
    ctx.fillStyle="rgba(20,28,60,.7)";
    for(let i=0;i<16;i++){ const bx=(i*44 + (position*0.02)%44) - 44; ctx.fillRect(bx, H*0.30 - (i%4)*14, 34, (i%4)*14+40); }
    // ground base
    ctx.fillStyle="#1f5e35"; ctx.fillRect(0, H/2 + lookY, W, H);

    const base = Math.floor(position/SEG) % N;
    const percent = (position % SEG)/SEG;
    let x = 0, dx = -(segments[base].curve * percent);
    let maxy = H;
    const visible = [];

    for(let n=0;n<DRAW;n++){
      const idx = (base+n) % N;
      const seg = segments[idx];
      const looped = base+n >= N;
      const camZ = position - (looped ? TRACK : 0);
      const p1 = project(playerX*ROAD - x,        camZ, seg.z);
      const p2 = project(playerX*ROAD - x - dx,    camZ, seg.z + SEG);
      x += dx; dx += seg.curve;

      if(p1.y <= p2.y || p2.y >= maxy){ continue; }  // behind camera or occluded
      const col = (Math.floor(idx/3) % 2) ? DARK : LIGHT;

      // grass band
      poly(0,p1.y, W,p1.y, W,p2.y, 0,p2.y, col.grass);
      // cross-street: a full-width asphalt band = intersection / side road
      if(seg.cross) poly(0,p1.y, W,p1.y, W,p2.y, 0,p2.y, "#20242e");
      // road
      poly(p1.x-p1.w,p1.y, p1.x+p1.w,p1.y, p2.x+p2.w,p2.y, p2.x-p2.w,p2.y, col.road);
      // rumble strips
      const r1=p1.w*0.14, r2=p2.w*0.14;
      poly(p1.x-p1.w-r1,p1.y, p1.x-p1.w,p1.y, p2.x-p2.w,p2.y, p2.x-p2.w-r2,p2.y, col.rumble);
      poly(p1.x+p1.w+r1,p1.y, p1.x+p1.w,p1.y, p2.x+p2.w,p2.y, p2.x+p2.w+r2,p2.y, col.rumble);
      // lane line
      if(col.lane){ const l1=p1.w*0.04, l2=p2.w*0.04; poly(p1.x-l1,p1.y, p1.x+l1,p1.y, p2.x+l2,p2.y, p2.x-l2,p2.y, col.lane); }

      visible.push({ seg, p1 });
      maxy = p2.y;
    }

    // sprites: far -> near
    for(let i=visible.length-1;i>=0;i--){
      const { seg, p1 } = visible[i];
      for(const sp of seg.sprites) drawSprite(sp, p1);
    }

    // cash pickups + traffic (far -> near)
    pickups.forEach(pk=>{ const rel=pk.z-position; if(rel<1||rel>DRAW*SEG) return;
      const scale=CAMD/rel; const sx=W/2+scale*((pk.x-playerX)*ROAD)*(W/2)+lookX;
      const sy=H/2+scale*CAMH*(H/2)+lookY; const w=scale*ROAD*(W/2);
      const s=Math.max(6,w*0.5), cy=sy-s*0.6-Math.sin(Date.now()/220)*s*0.1;
      ctx.fillStyle="#06d6a0"; ctx.beginPath(); ctx.ellipse(sx,cy,s*0.34,s*0.34,0,0,7); ctx.fill();
      ctx.fillStyle="#08402e"; ctx.font=`bold ${s*0.5}px 'Baloo 2'`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("$", sx, cy); ctx.textAlign="left"; ctx.textBaseline="alphabetic"; });
    // JOB markers (gold, pulsing) — press E when close
    jobs.forEach(j=>{ const rel=j.z-position; if(rel<1||rel>DRAW*SEG) return;
      const scale=CAMD/rel; const sx=W/2+scale*((j.x-playerX)*ROAD)*(W/2)+lookX;
      const sy=H/2+scale*CAMH*(H/2)+lookY; const w=scale*ROAD*(W/2);
      const s=Math.max(8,w*0.62), cy=sy-s*0.6-Math.sin(Date.now()/240)*s*0.12;
      const g=ctx.createRadialGradient(sx,cy,2,sx,cy,s*0.6);
      g.addColorStop(0,"rgba(255,209,102,.6)"); g.addColorStop(1,"rgba(255,209,102,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,cy,s*0.6,0,7); ctx.fill();
      ctx.fillStyle="#ffd166"; ctx.beginPath(); ctx.ellipse(sx,cy,s*0.34,s*0.4,0,0,7); ctx.fill();
      ctx.fillStyle="#7a5c00"; ctx.font=`bold ${s*0.5}px 'Baloo 2'`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("$", sx, cy); ctx.textAlign="left"; ctx.textBaseline="alphabetic"; });
    const drawn = cars.map(c=>({c, rel:c.z-position})).filter(o=>o.rel>1 && o.rel<DRAW*SEG).sort((a,b)=>b.rel-a.rel);
    drawn.forEach(({c,rel})=>{
      const scale=CAMD/rel;
      const sx=W/2 + scale*((c.x-playerX)*ROAD)*(W/2) + lookX;
      const sy=H/2 + scale*CAMH*(H/2) + lookY;
      const w=scale*ROAD*(W/2);
      drawCarSprite(sx, sy, Math.max(6,w*0.45), c.cop);
    });

    // brief red tint right after a crash
    if(bustCd>0 && Math.floor(bustCd/6)%2===0){ ctx.fillStyle="rgba(239,71,111,.14)"; ctx.fillRect(0,0,W,H); }

    drawCockpit();

    // job banked flash handled by feedback; wanted text
    $("gta-wanted").textContent = "💼 " + done + " / " + total + " jobs";
  }

  function drawCarSprite(sx, by, w, cop){
    const h = w*0.82;
    ctx.fillStyle="rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(sx, by, w*0.6, h*0.14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = cop ? "#eef2f7" : "#2e6fd6";
    roundRect(sx-w*0.5, by-h, w, h, w*0.16); ctx.fill();
    ctx.fillStyle="#0d1426"; roundRect(sx-w*0.4, by-h*0.92, w*0.8, h*0.42, w*0.1); ctx.fill();   // rear window
    ctx.fillStyle="#ff3b3b"; ctx.fillRect(sx-w*0.46, by-h*0.28, w*0.16, h*0.14); ctx.fillRect(sx+w*0.30, by-h*0.28, w*0.16, h*0.14); // taillights
    if(cop){ const on=Math.floor(Date.now()/200)%2===0;
      ctx.fillStyle=on?"#ff3b3b":"#3b6bff"; ctx.fillRect(sx-w*0.22, by-h-h*0.14, w*0.2, h*0.12);
      ctx.fillStyle=on?"#3b6bff":"#ff3b3b"; ctx.fillRect(sx+w*0.02, by-h-h*0.14, w*0.2, h*0.12); }
  }
  function caught(){ if(!running || qOpen()) return; crashCount=0; bustCd=120; speed*=0.4;
    gflash("🚓 COPS CHASING! Answer to escape!"); Sound.sfx.wrong(); openChallenge(); }   // 3 hits -> always a question
  function bump(){ bustCd=70; speed*=0.35; crashCount++;
    if(crashCount>=3){ caught(); }                       // 3 crashes -> the cops come after you
    else { gflash("💥 CRASH! ("+crashCount+"/3)"); Sound.sfx.wrong(); } }
  function checkGoal(){ if(running && done>=total){ win(); } }
  function gflash(msg){ const f=$("gta-flash"); if(!f) return; f.textContent=msg; f.classList.remove("hidden"); setTimeout(()=>f.classList.add("hidden"), 900); }

  function drawSprite(sp, p1){
    if(p1.w < 1) return;
    const unit = p1.w;                    // px per road-half-width at this depth
    const sx = p1.x + sp.off * unit;
    const bottom = p1.y;
    const s = sp.size * unit;
    if(sx < -200 || sx > W+200) return;
    if(sp.kind === "building"){
      const bw = s*0.9, bh = s*2.4;
      ctx.fillStyle = sp.wall; ctx.fillRect(sx-bw/2, bottom-bh, bw, bh);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(sx-bw/2, bottom-bh, bw, bh*0.12); // roof
      // windows
      const cols = Math.max(2, bw/10|0), rows = Math.max(3, bh/12|0);
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        ctx.fillStyle = ((r+c)%3===0) ? sp.win : "rgba(15,20,40,.6)";
        ctx.fillRect(sx-bw/2+4+c*(bw-8)/cols, bottom-bh+6+r*(bh-10)/rows, (bw-8)/cols-2, (bh-10)/rows-2);
      }
    } else if(sp.kind === "tree"){
      ctx.fillStyle="#5a3a1c"; ctx.fillRect(sx-s*0.06, bottom-s*0.5, s*0.12, s*0.5);
      ctx.fillStyle="#2e8b4f"; ctx.beginPath(); ctx.arc(sx, bottom-s*0.6, s*0.35, 0, 7); ctx.fill();
    } else if(sp.kind === "lamp"){
      ctx.fillStyle="#333"; ctx.fillRect(sx-s*0.03, bottom-s*0.7, s*0.06, s*0.7);
      ctx.fillStyle="#ffe08a"; ctx.beginPath(); ctx.arc(sx, bottom-s*0.7, s*0.09, 0, 7); ctx.fill();
    } else if(sp.kind === "coin"){
      const cy = bottom - s*0.6 - Math.sin(Date.now()/250)*s*0.08;
      const rx = Math.abs(Math.cos(Date.now()/300))*s*0.32 + 2;
      const g = ctx.createRadialGradient(sx,cy,2,sx,cy,s*0.5);
      g.addColorStop(0,"rgba(255,209,102,.7)"); g.addColorStop(1,"rgba(255,209,102,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,cy,s*0.5,0,7); ctx.fill();
      ctx.fillStyle="#ffd166"; ctx.beginPath(); ctx.ellipse(sx,cy,rx,s*0.34,0,0,7); ctx.fill();
      ctx.fillStyle="#8a6a10"; ctx.font=`bold ${s*0.4}px 'Baloo 2'`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("$", sx, cy); ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    }
  }

  // ---------- first-person cockpit ----------
  function drawCockpit(){
    // dashboard
    ctx.fillStyle="#0e1016";
    ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(0,H*0.76);
    ctx.quadraticCurveTo(W/2, H*0.60, W, H*0.76); ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#232838"; ctx.lineWidth=3; ctx.stroke();
    // radio / vents flavor
    ctx.fillStyle="#171b26"; ctx.fillRect(W*0.32, H*0.84, W*0.36, 26);
    ctx.fillStyle="#06d6a0"; ctx.font="10px 'JetBrains Mono'"; ctx.fillText("♫ WCFM 101.1", W*0.34, H*0.84+16);
    // speedo
    ctx.fillStyle="#ffd166"; ctx.font="bold 20px 'JetBrains Mono'"; ctx.textAlign="right";
    ctx.fillText(Math.round(speed/MAXSPD*140) + " MPH", W-22, H-16); ctx.textAlign="left";

    // steering wheel
    const cx=W/2, cy=H+72, R=150;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(wheelAngle);
    ctx.strokeStyle="#0c0e13"; ctx.lineWidth=28; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.stroke();
    ctx.strokeStyle="#2b3040"; ctx.lineWidth=20; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.stroke();
    ctx.strokeStyle="#20242f"; ctx.lineWidth=16;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-R); ctx.moveTo(0,0); ctx.lineTo(-R*0.86,R*0.5); ctx.moveTo(0,0); ctx.lineTo(R*0.86,R*0.5); ctx.stroke();
    ctx.fillStyle="#333a4d"; ctx.beginPath(); ctx.arc(0,0,26,0,7); ctx.fill();
    ctx.fillStyle="#ffd166"; ctx.font="bold 13px 'Baloo 2'"; ctx.textAlign="center"; ctx.fillText("GTA",0,4); ctx.textAlign="left";
    // hands gripping the rim (rotate with wheel)
    drawHand(-Math.PI*0.72, R); drawHand(-Math.PI*0.28, R);
    ctx.restore();
  }
  function drawHand(ang, R){
    const hx=Math.cos(ang)*R, hy=Math.sin(ang)*R;
    ctx.save(); ctx.translate(hx,hy); ctx.rotate(ang+Math.PI/2);
    // sleeve
    ctx.fillStyle="#2a2f3d"; roundRect(-12,4,24,16,5); ctx.fill();
    // palm
    ctx.fillStyle=skinHex; roundRect(-13,-12,26,20,7); ctx.fill();
    // fingers over rim
    ctx.fillStyle=shade(skinHex,-22);
    for(let i=-2;i<=2;i++) roundRect(i*5-2,-14,4,9,2), ctx.fill();
    ctx.restore();
  }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function shade(hex,amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
    r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
    return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }

  // ---------- questions (jobs + cop-escape challenges) ----------
  let curQ = null, qKind = null, curMission = null;
  function interact(){ if(qOpen()||!active) return; if(Date.now()-lastQ < QGAP) return; openJob(active); }

  function buildQuestionUI(q, topicLabel){
    lastQ = Date.now();          // reset the 20s question timer
    curQ = q;
    $("gta-hint").classList.add("hidden");
    $("gq-topic").textContent = topicLabel;
    $("gq-text").textContent = q.text;
    const code=$("gq-code"); if(q.code){code.textContent=q.code;code.classList.remove("hidden");}else code.classList.add("hidden");
    $("gq-feedback").classList.add("hidden");
    const ans=$("gq-answers"), typ=$("gq-type"); ans.innerHTML=""; ans.classList.remove("locked");
    if(q.type==="type"){ ans.classList.add("hidden"); typ.classList.remove("hidden");
      const inp=$("gq-input"); inp.value=""; inp.disabled=false; setTimeout(()=>inp.focus(),50); typ._q=q;
    } else {
      typ.classList.add("hidden"); ans.classList.remove("hidden");
      let opts,shapes; if(q.type==="truefalse"){opts=["True","False"];shapes=["✔","✘"];}else{opts=q.options;shapes=["▲","◆","●","■"];}
      opts.forEach((opt,i)=>{ const b=document.createElement("button"); b.className="answer-tile"+(q.type==="truefalse"?" tf":"");
        b.innerHTML=`<span class="shape">${shapes[i]||""}</span> <span>${opt}</span>`; b.onclick=()=>resolve(i===ci(q),b); ans.appendChild(b); });
    }
    $("gta-q").classList.remove("hidden"); $("gta-prompt").classList.add("hidden");
  }
  function openJob(m){ qKind="job"; curMission=m; buildQuestionUI(m.q, "📋 JOB • "+level.topic); }
  function openChallenge(){ qKind="escape"; curMission=null;
    const q = level.questions[Math.random()*level.questions.length|0];
    buildQuestionUI(q, "🚨 COP CHASE — answer to escape!"); }
  function ci(q){ return q.type==="truefalse"?(q.answer===true?0:1):q.answer; }
  function submitTyped(){ if(!qOpen())return; const ok=typedMatches($("gq-input").value, curQ.answer); $("gq-input").disabled=true; resolve(ok,null); }
  function resolve(correct, btn){
    const fb=$("gq-feedback");
    if(curQ.type!=="type"){ $("gq-answers").classList.add("locked"); $("gq-answers").children[ci(curQ)].classList.add("correct"); if(!correct&&btn)btn.classList.add("wrong"); }
    fb.classList.remove("hidden");
    if(qKind==="escape"){
      if(correct){ Sound.sfx.correct(); done++; cash+=100; $("gta-cash").textContent="$"+cash;
        fb.innerHTML="✅ Clean getaway! (+$100, job "+Math.min(done,total)+"/"+total+") "+(curQ.explain||"");
        setTimeout(()=>{ hideQ(); escapeCops(); checkGoal(); }, 1400); }
      else { Sound.sfx.gameover(); fb.innerHTML="❌ The cops got you! "+(curQ.explain||""); setTimeout(()=>{ hideQ(); gameOver(); }, 1900); }
      return;
    }
    // job
    if(correct){
      Sound.sfx.correct(); done++; cash+=250; $("gta-cash").textContent="$"+cash;
      respawnJob(curMission);   // send this job's marker back out ahead with a new question
      fb.innerHTML="✅ Job "+done+"/"+total+" done! +$250. "+(curQ.explain||"");
      if(done>=total) fb.innerHTML+="<br><b>All 5 jobs done — clean getaway! 👑</b>";
      setTimeout(()=>{ hideQ(); checkGoal(); }, 1500);
    } else {
      Sound.sfx.wrong();
      fb.innerHTML="❌ Job failed. "+(curQ.explain||"")+"<br><i>Loop back and try again.</i>";
      setTimeout(hideQ, 2300);
    }
  }
  function hideQ(){ $("gta-q").classList.add("hidden"); }
  function escapeCops(){ bustCd=180; crashCount=0; gflash("💨 ESCAPED!"); speed = MAXSPD*0.6; }
  function gameOver(){ running=false; onWin(cash, done, total, true); }
  function win(){ running=false; Sound.sfx.win(); onWin(cash, done, total, false); }

  // ---------- input ----------
  function keyDir(k){ k=k.toLowerCase();
    if(k==="w"||k==="arrowup")return"up"; if(k==="s"||k==="arrowdown")return"down";
    if(k==="a"||k==="arrowleft")return"left"; if(k==="d"||k==="arrowright")return"right"; return null; }
  function onKeyDown(e){
    if(!running) return;
    const t=e.target; if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")) return;
    const d=keyDir(e.key); if(d){ keys[d]=true; e.preventDefault(); }
    if((e.key.toLowerCase()==="e"||e.key===" ") && !qOpen()){ e.preventDefault(); interact(); }
  }
  function onKeyUp(e){ const d=keyDir(e.key); if(d) keys[d]=false; }
  function onMouse(e){
    const r=canvas.getBoundingClientRect();
    lookX = ((e.clientX-r.left)/r.width - 0.5) * 150;
    lookY = ((e.clientY-r.top)/r.height - 0.5) * 70;
    lookX=Math.max(-150,Math.min(150,lookX)); lookY=Math.max(-70,Math.min(70,lookY));
  }
  function wire(){
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    canvas = $("gta-canvas");
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mouseleave", ()=>{ lookX=0; lookY=0; });
    $("gq-submit").onclick=submitTyped;
    $("gq-input").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.stopPropagation(); submitTyped(); }});
    document.querySelectorAll("#gta-dpad button").forEach(b=>{
      const dir=b.dataset.dir;
      const set=(v)=>{ if(dir==="act"){ if(v) interact(); } else if(dir==="up"||dir==="down"||dir==="left"||dir==="right") keys[dir]=v; };
      b.addEventListener("touchstart",e=>{e.preventDefault();set(true);});
      b.addEventListener("touchend",e=>{e.preventDefault();set(false);});
      b.addEventListener("mousedown",()=>set(true));
      b.addEventListener("mouseup",()=>set(false));
      b.addEventListener("mouseleave",()=>{ if(dir!=="act") keys[dir]=false; });
    });
  }
  function stop(){ running=false; }

  return { init, wire, stop };
})();
