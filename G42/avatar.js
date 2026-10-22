/* ============================================================
   Code Master — Character / Baller Avatar system
   ------------------------------------------------------------
   Shared, customizable 2D character used in the Character
   Creator and drawn (animated) in the Basketball game.
   ============================================================ */

const Avatar = (() => {
  const SKINS      = ["#f7d7b5","#eec39a","#d8a373","#b57a4a","#8d5524","#5a3316"];
  const HAIR       = ["none","short","buzz","afro","long","mohawk","ponytail"];
  const HAIRCOLOR  = ["#1c1c1c","#3a2416","#7a4a1e","#c9973f","#e6c86a","#c0392b","#2e5cff","#ff5ea8","#e9edf7"];
  const HATS       = ["none","cap","beanie","headband"];
  const EARRINGS   = ["none","studs","hoops"];
  const SHOES      = ["#ffffff","#111318","#ff3b3b","#2e5cff","#06d6a0","#ffd166","#9b5de5"];
  const JERSEY     = ["#ef476f","#118ab2","#ffd166","#06d6a0","#9b5de5","#e9edf7","#ff7b00"];

  const OPTIONS = [
    { key:"skin",      label:"Skin Tone",  values:SKINS,     kind:"color" },
    { key:"hair",      label:"Hair",       values:HAIR,      kind:"name"  },
    { key:"hairColor", label:"Hair Color", values:HAIRCOLOR, kind:"color" },
    { key:"hat",       label:"Hat",        values:HATS,      kind:"name"  },
    { key:"earrings",  label:"Earrings",   values:EARRINGS,  kind:"name"  },
    { key:"shoes",     label:"Shoes",      values:SHOES,     kind:"color" },
    { key:"jersey",    label:"Jersey",     values:JERSEY,    kind:"color" }
  ];

  function makeDefault(){
    return { skin:1, hair:1, hairColor:0, hat:0, earrings:0, shoes:0, jersey:3 };
  }

  // pose: { name:'idle'|'run'|'jump'|'shoot', phase:number, face:1|-1 }
  function draw(ctx, cx, feetY, s, av, pose){
    pose = pose || {name:"idle", phase:0, face:1};
    const face = pose.face || 1;
    const skin = SKINS[av.skin], jersey = JERSEY[av.jersey], shoe = SHOES[av.shoes], hairC = HAIRCOLOR[av.hairColor];
    const headCY = feetY - 52*s, headR = 9*s;
    const shoulderY = feetY - 40*s, hipY = feetY - 22*s, bodyW = 18*s;

    // ---- legs / feet ----
    let lDX = 0, rDX = 0, lLift = 0, rLift = 0;
    if(pose.name === "run"){ const p = pose.phase; lDX = Math.sin(p)*6*s; rDX = -lDX; lLift = Math.max(0,Math.sin(p))*5*s; rLift = Math.max(0,-Math.sin(p))*5*s; }
    else if(pose.name === "jump" || pose.name === "shoot"){ lDX = -3*s; rDX = 3*s; lLift = 4*s; rLift = 6*s; }
    const footY = feetY;
    drawLeg(cx-5*s+lDX, hipY, footY-lLift, s, skin, shoe);
    drawLeg(cx+5*s+rDX, hipY, footY-rLift, s, skin, shoe);
    // shorts
    ctx.fillStyle = shade(jersey,-40); roundRect(ctx, cx-bodyW/2, hipY-6*s, bodyW, 12*s, 4*s); ctx.fill();

    // ---- torso (jersey) ----
    ctx.fillStyle = jersey; roundRect(ctx, cx-bodyW/2, shoulderY, bodyW, hipY-shoulderY+3*s, 5*s); ctx.fill();
    // jersey number stripe
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `${9*s}px 'Baloo 2'`; ctx.textAlign="center";
    ctx.fillText("23", cx, shoulderY + 13*s); ctx.textAlign="left";

    // ---- arms ----
    const shL = cx - bodyW/2, shR = cx + bodyW/2;
    let handL, handR;
    if(pose.name === "shoot"){ handL = {x:cx-3*s, y:headCY-16*s}; handR = {x:cx+5*s, y:headCY-18*s}; }
    else if(pose.name === "jump"){ handL = {x:shL-6*s, y:shoulderY-8*s}; handR = {x:shR+6*s, y:shoulderY-8*s}; }
    else if(pose.name === "run"){ const p=pose.phase; handL={x:shL-4*s, y:hipY-2*s+Math.sin(p)*5*s}; handR={x:shR+4*s, y:hipY-2*s-Math.sin(p)*5*s}; }
    else { // idle / dribble
      handL = {x:shL-3*s, y:hipY+2*s};
      handR = {x:cx + face*12*s, y:hipY+6*s};  // dribbling hand out front
    }
    drawArm(ctx, shL, shoulderY+2*s, handL.x, handL.y, s, jersey, skin);
    drawArm(ctx, shR, shoulderY+2*s, handR.x, handR.y, s, jersey, skin);

    // ---- hair (BEHIND head so it never covers the face) ----
    drawHair(ctx, cx, headCY, headR, s, HAIR[av.hair], hairC);

    // ---- head ----
    ctx.fillStyle = skin;
    ctx.fillRect(cx-3*s, headCY+headR-2*s, 6*s, 6*s);              // neck (under head)
    ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, 7); ctx.fill(); // face circle on top of hair
    // face (eyes) facing dir
    ctx.fillStyle = "#20140c";
    ctx.beginPath(); ctx.arc(cx+face*2*s-1*s, headCY-1*s, 1.3*s, 0, 7); ctx.arc(cx+face*2*s+3*s, headCY-1*s, 1.3*s, 0, 7); ctx.fill();

    // ---- earrings ----
    if(EARRINGS[av.earrings] !== "none"){
      ctx.fillStyle = "#ffd166";
      const ey = headCY + headR - 2*s;
      if(EARRINGS[av.earrings] === "studs"){ dot(ctx, cx-headR+1*s, ey, 1.6*s); dot(ctx, cx+headR-1*s, ey, 1.6*s); }
      else { ring(ctx, cx-headR+1*s, ey+1*s, 2.4*s); ring(ctx, cx+headR-1*s, ey+1*s, 2.4*s); }
    }

    // ---- hat (sits high on the crown, above the eyes) ----
    drawHat(ctx, cx, headCY, headR, s, HATS[av.hat], face);
  }

  function drawLeg(x, topY, footY, s, skin, shoe){
    ctx0().fillStyle = skin;
    roundRect(ctx0(), x-3*s, topY, 6*s, footY-topY, 3*s); ctx0().fill();
    // shoe
    ctx0().fillStyle = shoe; roundRect(ctx0(), x-5*s, footY-4*s, 12*s, 6*s, 3*s); ctx0().fill();
    ctx0().fillStyle = "rgba(255,255,255,.5)"; ctx0().fillRect(x-5*s, footY-1*s, 12*s, 1.5*s);
  }
  function drawArm(ctx, x0,y0,x1,y1,s,sleeve,skin){
    ctx.strokeStyle = sleeve; ctx.lineWidth = 5*s; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo((x0+x1)/2,(y0+y1)/2); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 4*s;
    ctx.beginPath(); ctx.moveTo((x0+x1)/2,(y0+y1)/2); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x1,y1,2.6*s,0,7); ctx.fill();
  }
  // Hair is drawn BEHIND the head. The head circle is then painted on
  // top, so hair forms a crown/halo/sides but never covers the face.
  function drawHair(ctx, cx, cy, r, s, style, col){
    ctx.fillStyle = col;
    if(style==="none") return;
    if(style==="buzz"){ ctx.beginPath(); ctx.arc(cx,cy,r+1.5*s,0,7); ctx.fill(); }
    else if(style==="short"){ ctx.beginPath(); ctx.arc(cx,cy,r+2.5*s,0,7); ctx.fill(); }
    else if(style==="afro"){ ctx.beginPath(); ctx.arc(cx,cy-2*s,r+6*s,0,7); ctx.fill(); }
    else if(style==="long"){ ctx.beginPath(); ctx.arc(cx,cy,r+3*s,0,7); ctx.fill();
      ctx.fillRect(cx-r-3*s,cy,4*s,22*s); ctx.fillRect(cx+r-1*s,cy,4*s,22*s); }
    else if(style==="mohawk"){ ctx.fillRect(cx-2.5*s,cy-r-7*s,5*s,r+7*s); ctx.beginPath(); ctx.arc(cx,cy,r+1*s,0,7); ctx.fill(); }
    else if(style==="ponytail"){ ctx.beginPath(); ctx.arc(cx,cy,r+2.5*s,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-r-2*s,cy+3*s,4*s,0,7); ctx.fill(); ctx.fillRect(cx-r-4*s,cy+3*s,4*s,14*s); }
  }
  function drawHat(ctx, cx, cy, r, s, hat, face){
    if(hat==="none") return;
    if(hat==="cap"){ ctx.fillStyle="#111318";
      ctx.beginPath(); ctx.arc(cx,cy-3*s,r+1.5*s,Math.PI,0); ctx.fill();     // crown above forehead
      ctx.fillRect(cx+ (face>0?0:-11*s) , cy-5*s, 11*s, 3*s); }             // brim
    else if(hat==="beanie"){ ctx.fillStyle="#ef476f";
      ctx.beginPath(); ctx.arc(cx,cy-3*s,r+2*s,Math.PI,0); ctx.fill(); ctx.fillRect(cx-r-2*s,cy-4*s,(r+2*s)*2,3*s); }
    else if(hat==="headband"){ ctx.fillStyle="#ffd166"; ctx.fillRect(cx-r-1*s, cy-5*s, (r+1*s)*2, 3*s); }
  }

  // helpers
  let _ctx=null;
  function ctx0(){ return _ctx; }
  function draw2(ctx, ...a){ _ctx=ctx; draw(ctx, ...a); }
  function shade(hex,amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
    r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
    return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function dot(ctx,x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  function ring(ctx,x,y,r){ ctx.lineWidth=1.4; ctx.strokeStyle="#ffd166"; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); }

  return { OPTIONS, makeDefault, draw:draw2, SKINS, JERSEY };
})();
