/* ============================================================
   Memory Master — Audio Engine
   ------------------------------------------------------------
   Uses the Web Audio API to SYNTHESIZE all sound in-browser.
   No audio files to download — works offline, loads instantly.
   Two things:
     1) Sound effects: correct, wrong, streak, click, gameover
     2) A gentle looping background music melody
   ============================================================ */

const Sound = (() => {
  let ctx = null;
  let musicOn = true;
  let sfxOn = true;
  let musicNodes = [];
  let musicTimer = null;

  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    // browsers suspend audio until a user gesture
    if(ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // ---- one beep ----
  function tone(freq, start, dur, type = "sine", vol = 0.2){
    const c = ensure();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime + start;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ---- sound effects ----
  const sfx = {
    click(){ if(sfxOn) tone(420, 0, 0.08, "triangle", 0.12); },
    correct(){
      if(!sfxOn) return;
      tone(523, 0, 0.12, "triangle", 0.2);   // C
      tone(659, 0.1, 0.12, "triangle", 0.2); // E
      tone(784, 0.2, 0.2, "triangle", 0.22); // G
    },
    wrong(){
      if(!sfxOn) return;
      tone(200, 0, 0.18, "sawtooth", 0.18);
      tone(150, 0.12, 0.3, "sawtooth", 0.18); // descending "buzz"
    },
    streak(){
      if(!sfxOn) return;
      tone(659, 0, 0.1, "square", 0.15);
      tone(880, 0.09, 0.1, "square", 0.15);
      tone(1175, 0.18, 0.18, "square", 0.16);
    },
    gameover(){
      if(!sfxOn) return;
      tone(392, 0, 0.2, "sawtooth", 0.2);
      tone(311, 0.18, 0.2, "sawtooth", 0.2);
      tone(262, 0.36, 0.5, "sawtooth", 0.2);
    },
    win(){
      if(!sfxOn) return;
      [523,659,784,1046].forEach((f,i) => tone(f, i*0.12, 0.25, "triangle", 0.2));
    }
  };

  // ---- background music: simple looping arpeggio ----
  // ---- Unique "Debug Mode" chiptune loop ----
  // A-minor pentatonic groove: bass + arp lead + soft hi-hat blip.
  // 0 = rest. Frequencies chosen for a modern lo-fi/chiptune study vibe.
  const A=220, C=261.63, D=293.66, E=329.63, G=392, A2=440, C2=523.25, D2=587.33, E2=659.25;
  const LEAD = [
    A2, 0, E2, 0,  C2, E2, D2, 0,   A2, 0, G, 0,   E2, D2, C2, 0,
    A2, 0, E2, C2, D2, 0,  E2, 0,   G, A2, C2, 0,  E2, 0,  D2, C2
  ];
  const BASS = [
    A, A, 0, A,  0, A, 0, 0,   G, G, 0, G,  0, G, 0, 0,
    A, A, 0, A,  0, A, 0, 0,   E, E, 0, E,  0, E, 0, 0
  ];
  let step = 0;
  function playMusicStep(){
    if(!musicOn) return;
    ensure();
    const i = step % LEAD.length;
    const lead = LEAD[i];
    const bass = BASS[i];
    if(lead) tone(lead, 0, 0.22, "square", 0.10);          // bright chiptune lead
    if(bass) tone(bass / 2, 0, 0.28, "triangle", 0.16);    // warm bass
    if(i % 2 === 0) tone(8000, 0, 0.03, "square", 0.03);   // soft hi-hat tick
    step++;
  }
  function startMusic(){
    if(musicTimer) return;
    ensure();
    playMusicStep();                       // play immediately, no delay
    musicTimer = setInterval(playMusicStep, 200);  // ~150 BPM eighth notes
  }
  function stopMusic(){
    clearInterval(musicTimer);
    musicTimer = null;
  }

  return {
    unlock(){ ensure(); },
    sfx,
    setMusic(on){ musicOn = on; on ? startMusic() : stopMusic(); },
    setSfx(on){ sfxOn = on; },
    toggleMusic(){ musicOn = !musicOn; musicOn ? startMusic() : stopMusic(); return musicOn; },
    toggleSfx(){ sfxOn = !sfxOn; return sfxOn; },
    isMusicOn(){ return musicOn; },
    isSfxOn(){ return sfxOn; }
  };
})();
