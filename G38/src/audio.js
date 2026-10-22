// ============================================================
// Recursion Realm — procedural audio (Web Audio API, no files)
// Exposes: AudioSys, Music, Sfx  (all globals)
// Calm biome loops + intense battle/boss loops + chiptune SFX.
// ============================================================
(function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let muted = false, seqId = null, currentTrack = null, pending = null;

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---- track definitions (16-step loops). -1 = rest ----
  const TRACKS = {
    town: {   stepMs:200, wave:"triangle", bassWave:"sine",     leadGain:0.12, bassGain:0.16,
      lead:[72,-1,76,79, 76,-1,74,72, 74,-1,77,81, 79,-1,76,-1],
      bass:[48,-1,55,-1, 53,-1,55,-1, 50,-1,57,-1, 55,-1,55,-1] },
    winter: { stepMs:300, wave:"triangle", bassWave:"sine",     leadGain:0.11, bassGain:0.14,
      lead:[81,-1,-1,84, -1,79,-1,-1, 76,-1,-1,72, -1,74,-1,-1],
      bass:[45,-1,-1,-1, 52,-1,-1,-1, 48,-1,-1,-1, 55,-1,-1,-1] },
    forest: { stepMs:230, wave:"square",   bassWave:"triangle", leadGain:0.08, bassGain:0.15,
      lead:[74,77,-1,81, 79,-1,77,74, 72,74,-1,77, 81,-1,79,-1],
      bass:[50,-1,57,-1, 55,-1,57,-1, 50,-1,55,-1, 57,-1,55,-1] },
    desert: { stepMs:250, wave:"sawtooth", bassWave:"sine",     leadGain:0.07, bassGain:0.16,
      lead:[76,77,80,77, 76,-1,72,-1, 76,80,83,80, 77,76,-1,-1],
      bass:[52,-1,-1,59, -1,-1,52,-1, 52,-1,-1,59, -1,-1,52,-1] },
    lava: {   stepMs:175, wave:"square",   bassWave:"square",   leadGain:0.09, bassGain:0.12,
      lead:[60,63,67,63, 60,63,67,70, 72,70,67,63, 60,-1,58,60],
      bass:[36,36,43,43, 36,36,43,43, 39,39,46,46, 36,36,43,43],
      kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    castle: { stepMs:300, wave:"sawtooth", bassWave:"sine",     leadGain:0.08, bassGain:0.16,
      lead:[69,-1,68,69, -1,65,-1,64, 65,-1,68,69, -1,72,-1,-1],
      bass:[33,-1,-1,-1, 40,-1,-1,-1, 33,-1,-1,-1, 41,-1,-1,-1],
      kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    battle: { stepMs:140, wave:"square",   bassWave:"square",   leadGain:0.10, bassGain:0.12,
      lead:[69,72,74,76, 74,72,69,72, 76,74,72,69, 67,69,72,74],
      bass:[45,45,52,52, 45,45,52,52, 43,43,50,50, 45,45,52,52],
      kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    boss: {   stepMs:115, wave:"sawtooth", bassWave:"square",   leadGain:0.10, bassGain:0.13,
      lead:[60,63,67,71, 72,71,67,63, 60,64,67,72, 74,72,68,63],
      bass:[36,36,36,36, 43,43,43,43, 39,39,39,39, 43,43,44,44],
      kick:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1] }
  };

  // ---- core ----
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();  master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ctx.createGain();   sfxGain.gain.value = 0.9;    sfxGain.connect(master);
    // white-noise buffer for percussion/whooshes
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(freq, dur, wave, g, dest, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = wave; o.frequency.setValueAtTime(freq, t);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(g, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(dest || musicGain);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function sweep(f1, f2, dur, wave, g, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = wave;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(sfxGain); o.start(t); o.stop(t + dur + 0.03);
  }
  function kick() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.16, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(gn); gn.connect(musicGain); o.start(t); o.stop(t + 0.16);
  }
  function noise(dur, g, freq, delay) {
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src;
    if (freq) { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; src.connect(bp); node = bp; }
    node.connect(gn); gn.connect(sfxGain); src.start(t); src.stop(t + dur);
  }

  // ---- sequencer ----
  function startSeq(name) {
    const T = TRACKS[name]; let step = 0;
    const row = () => {
      const i = step % 16;
      if (T.lead[i] >= 0) tone(midiToFreq(T.lead[i]), T.stepMs / 1000 * 0.9, T.wave, T.leadGain, musicGain);
      if (T.bass[i] >= 0) tone(midiToFreq(T.bass[i]), T.stepMs / 1000 * 0.95, T.bassWave, T.bassGain, musicGain);
      if (T.kick && T.kick[i]) kick();
      step++;
    };
    row();
    seqId = setInterval(row, T.stepMs);
  }
  function stopSeq() { if (seqId) { clearInterval(seqId); seqId = null; } }

  // ---- public music API ----
  const Music = {
    play(name) {
      if (!TRACKS[name]) return;
      if (!ctx || ctx.state === "suspended") { pending = name; if (ctx) ctx.resume(); return; }
      if (currentTrack === name && seqId) return;
      stopSeq(); currentTrack = name; startSeq(name);
    },
    stop() { stopSeq(); currentTrack = null; }
  };

  // ---- public SFX API ----
  const SFX = {
    blip()   { if (!ready()) return; tone(880, 0.04, "square", 0.10, sfxGain); },
    select() { if (!ready()) return; tone(560, 0.06, "square", 0.16, sfxGain, 0); tone(820, 0.07, "square", 0.14, sfxGain, 0.05); },
    correct(){ if (!ready()) return; [660,880,1046].forEach((f,i)=>tone(f,0.10,"square",0.16,sfxGain,i*0.08)); },
    wrong()  { if (!ready()) return; tone(233,0.12,"sawtooth",0.18,sfxGain,0); tone(175,0.22,"sawtooth",0.18,sfxGain,0.1); },
    hit()    { if (!ready()) return; noise(0.12,0.16,1200,0); tone(120,0.10,"square",0.16,sfxGain); },
    backfire(){if (!ready()) return; sweep(320,70,0.35,"sawtooth",0.2); noise(0.2,0.15,600,0); },
    victory(){ if (!ready()) return; [523,659,784,1046].forEach((f,i)=>tone(f,0.14,"square",0.16,sfxGain,i*0.11)); },
    defeat() { if (!ready()) return; [392,311,247].forEach((f,i)=>tone(f,0.24,"triangle",0.18,sfxGain,i*0.18)); },
    rankup() { if (!ready()) return; [523,659,784,1046,1318].forEach((f,i)=>tone(f,0.12,"square",0.17,sfxGain,i*0.09)); },
    transition(){if(!ready()) return; sweep(300,1400,0.28,"sine",0.10); noise(0.28,0.10,900,0); }
  };
  function ready() { init(); if (ctx.state === "suspended") ctx.resume(); return !!ctx; }

  // ---- master controls ----
  const AudioSys = {
    init, resume() { if (ctx && ctx.state === "suspended") ctx.resume(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      const btn = document.getElementById("audiobtn");
      if (btn) btn.textContent = muted ? "🔇" : "🔊";
      return muted;
    },
    isMuted() { return muted; }
  };

  // ---- arm audio on first user gesture (autoplay policy) ----
  function arm() {
    init();
    ctx.resume().then(() => {
      if (pending) { const t = pending; pending = null; Music.play(t); }
    });
    document.removeEventListener("keydown", arm);
    document.removeEventListener("pointerdown", arm);
  }
  document.addEventListener("keydown", arm);
  document.addEventListener("pointerdown", arm);
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("audiobtn");
    if (btn) btn.onclick = () => AudioSys.toggleMute();
  });

  window.AudioSys = AudioSys;
  window.Music = Music;
  window.Sfx = SFX;
})();
