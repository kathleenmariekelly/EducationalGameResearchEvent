/* ============================================================
   Code Master — "Inside the Machine" background
   Falling streams of binary / hex / code symbols on a canvas.
   Subtle, GPU-cheap, sits behind everything.
   ============================================================ */
(function(){
  const canvas = document.getElementById("matrix");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  const GLYPHS = "01{}();<>[]=*&|+-/#01_01".split("");
  const FONT_SIZE = 16;
  let cols, drops;

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / FONT_SIZE);
    drops = new Array(cols).fill(0).map(() => Math.random() * -50);
  }
  window.addEventListener("resize", resize);
  resize();

  function draw(){
    // translucent fade for trailing effect
    ctx.fillStyle = "rgba(6, 10, 20, 0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = FONT_SIZE + "px 'JetBrains Mono', monospace";

    for(let i = 0; i < cols; i++){
      const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;
      // leading glyph brighter, trail dimmer
      ctx.fillStyle = Math.random() > 0.975 ? "rgba(120,255,200,0.85)" : "rgba(30,180,130,0.45)";
      ctx.fillText(ch, x, y);
      if(y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.5 + Math.random() * 0.4;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
