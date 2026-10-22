/* ============================================================
   Code Master — BASKETBALL (2K-lite, controllable)
   ------------------------------------------------------------
   Side-view court. Control YOUR custom baller:
     • A / D or ← →  : run
     • W / ↑         : jump
     • SPACE (hold)  : jump-shot — a power meter fills; release in
                       the GREEN zone for a perfect "GREEN!" make.
   A CPU defender contests your shots. First to 21 wins.
   Questions interrupt only occasionally (you get plenty of play
   time). Correct = 🔥 hot shot + CPU frozen; wrong = CPU +2.
   ============================================================ */

const Basketball = (() => {
  const W = 640, H = 460, GROUND = 396;
  const WIN_SCORE = 21;
  const HOOP = { x: 574, y: 196, r: 22 };
  const GRAV = 0.7;

  let canvas, ctx, level, avatar;
  let running, you, cpu, hot, cpuFrozenUntil;
  let p, ball, defender, shotsSinceQ, mates, defs, passCooldown, stealCd;
  let keys, anim;
  let nextQuestionAt, cpuNextShotAt, qList, qi, onOver, lastQ;
  const QGAP = 30000;   // a question at least every 30s
  let flashMsg, flashColor, flashUntil;

  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();
  const rand = (a,b) => a + Math.random()*(b-a);
  const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; };

  function init(levelObj, overCb, av){
    level = levelObj; onOver = overCb; avatar = av || Avatar.makeDefault();
    canvas = $("bb-canvas"); ctx = canvas.getContext("2d");
    you=0; cpu=0; hot=false; cpuFrozenUntil=0; shotsSinceQ=0; anim=0;
    keys={};
    p = { x:180, y:GROUND, vy:0, vx:0, onGround:true, face:1, shooting:false };
    ball = { held:true, x:0, y:0, vx:0, vy:0, made:false, dribble:0 };
    defender = { x:420, y:GROUND, face:-1 };
    // your two teammates (green team) at wing & block
    mates = [ { x:330, y:GROUND, base:330 }, { x:470, y:GROUND, base:470 } ];
    // extra defender guarding the teammates (red team)
    defs = [ { x:390, y:GROUND }, { x:500, y:GROUND } ];
    passCooldown = 0; stealCd = 90;
    qList = shuffle(levelObj.questions.slice()); qi=0;
    lastQ = now();                                     // no question for the first ~20s
    nextQuestionAt = now() + rand(18000, 26000);
    cpuNextShotAt  = now() + rand(6000, 9000);
    flashMsg=null;
    running=true;
    $("bb-you-score").textContent="0"; $("bb-cpu-score").textContent="0";
    $("bb-pill").textContent = "🏀 Basketball: " + levelObj.title;
    $("bb-hint").classList.remove("hidden");
    hideQ();
    loop();
  }

  function loop(){ if(!running) return; if(!qOpen()) update(); draw(); requestAnimationFrame(loop); }
  function qOpen(){ return !$("bb-q").classList.contains("hidden"); }

  function update(){
    anim += 0.25;
    // ---- horizontal movement ----
    let moving=false;
    if(!p.shooting){
      if(keys.left){ p.x -= 3.2; p.face=-1; moving=true; }
      if(keys.right){ p.x += 3.2; p.face=1; moving=true; }
    }
    p.x = Math.max(40, Math.min(HOOP.x-30, p.x));
    p.moving = moving;

    // ---- jump / gravity ----
    if(keys.up && p.onGround && !p.shooting){ p.vy = -12; p.onGround=false; }
    if(!p.onGround){ p.y += p.vy; p.vy += GRAV; if(p.y >= GROUND){ p.y=GROUND; p.onGround=true; p.vy=0; } }

    // ---- ball ----
    if(ball.held){
      // dribble near front hand while grounded, or held at chest while shooting/jumping
      if(p.shooting || !p.onGround){ ball.x = p.x + p.face*4; ball.y = p.y-70; }
      else { ball.dribble += 0.35; ball.x = p.x + p.face*14; ball.y = (p.y-24) + Math.abs(Math.sin(ball.dribble))*22; }
    } else {
      ball.x += ball.vx; ball.y += ball.vy; ball.vy += 0.4;
      // made shots reliably count once the ball reaches the rim
      if(ball.made && ball.x >= HOOP.x-6){ scoreYou(); ball.attempt=false; resetBall(); }
      else if(ball.y > GROUND || ball.x > W+30 || ball.x < -30){
        const wasAttempt = ball.attempt; ball.attempt=false; resetBall();
        if(wasAttempt){ flash("MISS!","#ef476f"); Sound.sfx.wrong(); askQuestion(); }  // fair: only misses ask a question
      }
    }

    if(passCooldown>0) passCooldown--;
    if(stealCd>0) stealCd--;
    // ---- defender AI (contests the ball handler = you) ----
    const target = p.x + 46;
    defender.x += Math.sign(target - defender.x) * 1.9;
    defender.x = Math.max(120, Math.min(HOOP.x-40, defender.x));
    defender.face = (p.x < defender.x) ? -1 : 1;
    // ---- STEAL: if the defender is on you while you dribble, they can poke it ----
    if(ball.held && !p.shooting && p.onGround && stealCd<=0){
      if(Math.abs(defender.x - p.x) < 40 && Math.random() < 0.025){ steal(); }
    }
    // ---- teammates drift/cut a little (get open) ----
    mates.forEach((m,i)=>{ m.x = m.base + Math.sin(anim*0.4 + i*2)*40; });
    // ---- their defenders track the teammates loosely ----
    defs.forEach((d,i)=>{ const tgt = mates[i].x + (i?-24:24); d.x += Math.sign(tgt-d.x)*1.2; });

    // ---- guaranteed question at least every 30s ----
    if(now() - lastQ >= QGAP && !qOpen()){ askQuestion("⏰ POP QUIZ"); }

    // ---- CPU scoring possessions ----
    if(now() > cpuNextShotAt && now() > cpuFrozenUntil){
      if(Math.random() < 0.5){ cpu += 2; $("bb-cpu-score").textContent = cpu; flash("CPU SCORES","#ef476f"); Sound.sfx.click(); checkWin(); }
      cpuNextShotAt = now() + rand(6500, 10000);
    }

  }

  const DUNK_RANGE = 150;
  // SIMPLE: one tap to shoot. Close = dunk. Otherwise a jump-shot whose
  // odds depend on distance & whether you're contested. No timing meter.
  function startShot(){
    if(ball.held===false || p.shooting || qOpen() || !running) return;
    $("bb-hint").classList.add("hidden");
    if(Math.abs(HOOP.x - p.x) < DUNK_RANGE){ dunk(); return; }
    p.shooting = true;
    if(p.onGround){ p.vy = -11; p.onGround=false; }   // little jump-shot hop
    ball.attempt = true;
    const dist = Math.abs(HOOP.x - p.x);
    let prob = dist < 220 ? 0.58 : dist < 380 ? 0.40 : 0.25;   // harder — you must work for it
    if(Math.abs(defender.x - p.x) < 55) prob *= 0.6;          // contested shots are tough
    const made = hot || Math.random() < prob; hot=false;
    ball.held=false; ball.made=made;
    const frames = 28;
    ball.vx = (HOOP.x - ball.x)/frames;
    const peak = made ? HOOP.y-10 : (Math.random()<0.5?HOOP.y-50:HOOP.y+40);
    ball.vy = (peak - ball.y)/frames - 0.5*0.4*frames;
    Sound.sfx.click();
    setTimeout(()=>{ p.shooting=false; }, 250);
  }
  function dunk(){
    p.shooting = true;
    if(p.onGround){ p.vy = -15; p.onGround=false; }    // big leap to the rim
    ball.held=false; ball.made=true; ball.dunk=true;
    const frames = 16;
    ball.vx = (HOOP.x - ball.x)/frames;
    ball.vy = ((HOOP.y-6) - ball.y)/frames - 0.5*0.4*frames;
    flash("🔥 DUNK! +2","#ffd166");
    Sound.sfx.streak();
    setTimeout(()=>{ p.shooting=false; }, 250);
  }
  function resetBall(){ ball.held=true; }

  function scoreYou(msg){ you+=2; $("bb-you-score").textContent=you; Sound.sfx.correct(); flash(msg||"SWISH! +2","#06d6a0"); shotsSinceQ++; checkWin(); }

  function steal(){
    stealCd = 160;
    flash("🛡️ STOLEN!","#ef476f"); Sound.sfx.wrong();
    askQuestion("🛡️ STOLEN BALL");   // turnover! answer to recover (correct = keep it + hot; wrong = CPU +2)
  }

  // ---- passing: find the most OPEN teammate; open = easy assist bucket ----
  function pass(){
    if(!ball.held || p.shooting || qOpen() || !running || passCooldown>0) return;
    passCooldown = 30;
    // openness = distance from nearest defender to each mate
    let bestMate=null, bestOpen=-1;
    mates.forEach(m=>{
      const nearest = Math.min(...defs.map(d=>Math.abs(d.x-m.x)));
      if(nearest > bestOpen){ bestOpen = nearest; bestMate = m; }
    });
    Sound.sfx.click();
    // How open the teammate is sets the make chance — passes are NOT auto-buckets.
    const prob = bestOpen > 60 ? 0.7 : bestOpen > 40 ? 0.5 : 0.28;
    const made = Math.random() < prob;
    const from = bestMate ? bestMate.x : p.x;
    ball.held=false; ball.made=made; ball.attempt=false;
    const frames=18; ball.x=from; ball.y=p.y-40;
    ball.vx=(HOOP.x-ball.x)/frames;
    ball.vy=((made ? HOOP.y-6 : HOOP.y-55) - ball.y)/frames - 0.5*0.4*frames;
    flash(made ? "🙌 ASSIST! +2" : "Teammate missed!", made ? "#06d6a0" : "#ffd166");
  }
  function checkWin(){
    if(you>=WIN_SCORE || cpu>=WIN_SCORE){
      running=false; Sound.sfx[you>cpu?"win":"gameover"]();
      setTimeout(()=>onOver(you,cpu,you>cpu), 700);
    }
  }

  // ---------- draw ----------
  function flash(m,c){ flashMsg=m; flashColor=c; flashUntil=now()+1000; }
  function draw(){
    // court background
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#123"); g.addColorStop(1,"#0a0f1c");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // floor
    ctx.fillStyle="#7a4a24"; ctx.fillRect(0,GROUND,W,H-GROUND);
    ctx.fillStyle="#8a5528"; for(let x=0;x<W;x+=34) ctx.fillRect(x,GROUND,2,H-GROUND);
    ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(20,GROUND); ctx.lineTo(W-20,GROUND); ctx.stroke();
    // key/paint
    ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.strokeRect(HOOP.x-140,GROUND-2,140,2);
    ctx.beginPath(); ctx.arc(HOOP.x-70,GROUND,46,Math.PI,0); ctx.stroke();

    // hoop pole + backboard
    ctx.fillStyle="#555b6e"; ctx.fillRect(W-14, HOOP.y-30, 8, GROUND-(HOOP.y-30));
    ctx.fillStyle="#eef2f7"; ctx.fillRect(HOOP.x+20, HOOP.y-34, 8, 64);
    ctx.strokeStyle="#ff8c42"; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(HOOP.x-HOOP.r,HOOP.y); ctx.lineTo(HOOP.x+HOOP.r,HOOP.y); ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(HOOP.x+i*8,HOOP.y+2); ctx.lineTo(HOOP.x+i*4,HOOP.y+22); ctx.stroke(); }

    // teammates (green) + their defenders (red)
    mates.forEach(m=> drawTeammate(m.x, m.y, "#06d6a0"));
    defs.forEach(d=> drawTeammate(d.x, d.y, "#ef476f"));
    // defender on the ball (red)
    drawDefender(defender.x, defender.y, defender.face);

    // YOU (custom avatar) with pose
    let pose;
    if(p.shooting || !p.onGround) pose={name:"shoot",phase:anim,face:p.face};
    else if(p.moving) pose={name:"run",phase:anim,face:p.face};
    else pose={name:"idle",phase:anim,face:p.face};
    Avatar.draw(ctx, p.x, p.y, 1.15, avatar, pose);

    // ball
    drawBall(ball.x, ball.y);


    if(hot){ ctx.fillStyle="#ffd166"; ctx.font="bold 15px 'Baloo 2'"; ctx.textAlign="center";
      ctx.fillText("🔥 HOT SHOT ready!", W/2, 26); ctx.textAlign="left"; }
    if(flashMsg && now()<flashUntil){ ctx.fillStyle=flashColor; ctx.font="bold 30px 'Baloo 2'"; ctx.textAlign="center";
      ctx.fillText(flashMsg, W/2, 70); ctx.textAlign="left"; }
  }
  function drawBall(x,y){
    ctx.fillStyle="#ff8c42"; ctx.beginPath(); ctx.arc(x,y,9,0,7); ctx.fill();
    ctx.strokeStyle="#7a3b12"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.arc(x,y,9,0,7); ctx.moveTo(x-9,y); ctx.lineTo(x+9,y); ctx.moveTo(x,y-9); ctx.lineTo(x,y+9); ctx.stroke();
  }
  function drawTeammate(x,y,color){
    ctx.fillStyle=color; roundRect(x-8,y-38,16,28,5); ctx.fill();
    ctx.fillStyle="#c68642"; ctx.beginPath(); ctx.arc(x,y-46,7,0,7); ctx.fill();
    ctx.strokeStyle=color; ctx.lineWidth=5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x-6,y-12); ctx.lineTo(x-6,y); ctx.moveTo(x+6,y-12); ctx.lineTo(x+6,y); ctx.stroke();
  }
  function drawDefender(x,y,face){
    ctx.fillStyle="#33406b"; roundRect(x-9,y-40,18,30,5); ctx.fill();     // body
    ctx.fillStyle="#c68642"; ctx.beginPath(); ctx.arc(x,y-48,8,0,7); ctx.fill(); // head
    ctx.strokeStyle="#33406b"; ctx.lineWidth=5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x-9,y-36); ctx.lineTo(x-9,y-54); ctx.moveTo(x+9,y-36); ctx.lineTo(x+9,y-54); ctx.stroke(); // arms up (contest)
    ctx.strokeStyle="#26325c"; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(x-5,y-12); ctx.lineTo(x-5,y); ctx.moveTo(x+5,y-12); ctx.lineTo(x+5,y); ctx.stroke();
  }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  // ---------- questions ----------
  function askQuestion(reason){
    if(qOpen()) return;
    if(now() - lastQ < QGAP) return;   // enforce 20s+ gap so you get to play
    lastQ = now();
    const q=qList[qi%qList.length]; qi++; shotsSinceQ=0;
    $("bq-topic").textContent=(reason||"🏀 MISSED SHOT")+" • "+level.topic;
    $("bq-text").textContent=q.text;
    const code=$("bq-code"); if(q.code){code.textContent=q.code;code.classList.remove("hidden");}else code.classList.add("hidden");
    $("bq-feedback").classList.add("hidden");
    const ans=$("bq-answers"), typ=$("bq-type"); ans.innerHTML=""; ans.classList.remove("locked");
    if(q.type==="type"){ ans.classList.add("hidden"); typ.classList.remove("hidden");
      const inp=$("bq-input"); inp.value=""; inp.disabled=false; setTimeout(()=>inp.focus(),50); typ._q=q;
    } else {
      typ.classList.add("hidden"); ans.classList.remove("hidden");
      let opts,shapes; if(q.type==="truefalse"){opts=["True","False"];shapes=["✔","✘"];}else{opts=q.options;shapes=["▲","◆","●","■"];}
      opts.forEach((opt,i)=>{ const b=document.createElement("button"); b.className="answer-tile"+(q.type==="truefalse"?" tf":"");
        b.innerHTML=`<span class="shape">${shapes[i]||""}</span> <span>${opt}</span>`; b.onclick=()=>resolveQ(i===ci(q),q,b); ans.appendChild(b); });
    }
    $("bb-q").classList.remove("hidden");
  }
  function ci(q){ return q.type==="truefalse"?(q.answer===true?0:1):q.answer; }
  function submitTyped(){ if(!qOpen())return; const q=$("bq-type")._q; const ok=typedMatches($("bq-input").value,q.answer); $("bq-input").disabled=true; resolveQ(ok,q,null); }
  function resolveQ(correct,q,btn){
    const fb=$("bq-feedback");
    if(q.type!=="type"){ $("bq-answers").classList.add("locked"); $("bq-answers").children[ci(q)].classList.add("correct"); if(!correct&&btn)btn.classList.add("wrong"); }
    fb.classList.remove("hidden");
    if(correct){ Sound.sfx.correct(); hot=true; cpuFrozenUntil=now()+7000;
      fb.innerHTML="✅ Bucket coming! Your next shot is a 🔥 HOT SHOT and the CPU is frozen. "+(q.explain||"");
    } else { Sound.sfx.wrong(); cpu+=2; $("bb-cpu-score").textContent=cpu;
      fb.innerHTML="❌ Turnover! CPU scores (+2). "+(q.explain||""); }
    setTimeout(()=>{ hideQ(); checkWin(); }, correct?1600:2200);
  }
  function hideQ(){ $("bb-q").classList.add("hidden"); }

  // ---------- input ----------
  function keyDir(k){ k=k.toLowerCase();
    if(k==="a"||k==="arrowleft")return"left"; if(k==="d"||k==="arrowright")return"right";
    if(k==="w"||k==="arrowup")return"up"; return null; }
  function onKeyDown(e){
    if(!running||qOpen()) return;
    const t=e.target; if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")) return;
    if(e.repeat) { if(e.key===" ") e.preventDefault(); return; }   // tap, not hold
    const d=keyDir(e.key); if(d){ keys[d]=true; e.preventDefault(); }
    if(e.key===" "){ e.preventDefault(); startShot(); }
    if(e.key.toLowerCase()==="p"){ e.preventDefault(); pass(); }
  }
  function onKeyUp(e){
    if(!running) return;
    const d=keyDir(e.key); if(d) keys[d]=false;
  }
  function wire(){
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    $("bq-submit").onclick=submitTyped;
    $("bq-input").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.stopPropagation(); submitTyped(); }});
    const btn=$("bb-shoot");
    const tap=e=>{e.preventDefault(); startShot();};
    btn.addEventListener("click",tap); btn.addEventListener("touchstart",tap);
    const pb=$("bb-pass"); if(pb){ pb.addEventListener("click",e=>{e.preventDefault();pass();});
      pb.addEventListener("touchstart",e=>{e.preventDefault();pass();}); }
  }
  function stop(){ running=false; }

  return { init, wire, stop };
})();
