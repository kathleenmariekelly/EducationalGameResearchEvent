// Crunchy GBA-style sound effects, synthesized with WebAudio (no asset files).
// Uses square/pulse waves, short envelopes, and bit-crushy detune for that
// chiptune feel. First call resumes the audio context (needs a user gesture).

let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// A single chiptune blip.
function blip(freq, dur, type = 'square', vol = 0.5, slideTo = null, delay = 0) {
  if (!enabled) return;
  ensure();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Noise burst (for explosions / thuds).
function noise(dur, vol = 0.5, filterFreq = 1200, delay = 0) {
  if (!enabled) return;
  ensure();
  const t0 = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur);
}

export const Sfx = {
  unlock() { ensure(); },
  setEnabled(v) { enabled = v; },
  // UI / interactions (softer triangle tones = less harsh)
  click() { blip(620, 0.06, 'triangle', 0.4, 500); },
  hover() { blip(760, 0.03, 'triangle', 0.12); },
  pick() { blip(500, 0.05, 'triangle', 0.32, 660); },
  correct() {
    blip(784, 0.1, 'triangle', 0.45);
    blip(1047, 0.14, 'triangle', 0.45, null, 0.09);
  },
  wrong() {
    blip(200, 0.2, 'sawtooth', 0.35, 110);
    noise(0.14, 0.2, 700, 0.02);
  },
  // grumpy "customer leaves" sound: descending buzz
  angry() {
    blip(300, 0.16, 'sawtooth', 0.32, 160);
    blip(200, 0.2, 'sawtooth', 0.3, 90, 0.08);
  },
  pop() { blip(820, 0.05, 'triangle', 0.28, 1200); },
  serveDone() {
    [660, 880, 1180].forEach((f, i) => blip(f, 0.1, 'triangle', 0.4, null, i * 0.06));
  },
  // transitions
  zoomIn() { blip(320, 0.16, 'triangle', 0.3, 820); },
  zoomOut() { blip(660, 0.14, 'triangle', 0.28, 320); },
  // CASH REGISTER: a bright bitcrushed "ka-CHING" bell + drawer clunk
  checkout() { registerDing(); },
  // WarioWare-style rising "faster!" alert: an accelerating siren sweep
  // that ramps up in pitch, capped by a couple of urgent stabs.
  speedUp() {
    if (!enabled) return; ensure();
    const t0 = ctx.currentTime;
    // rising siren sweep
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(280, t0);
    o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.75);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.05);
    g.gain.setValueAtTime(0.3, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.92);
    // accelerating ticks underneath
    for (let i = 0; i < 6; i++) blip(600 + i * 60, 0.05, 'square', 0.22, null, 0.08 + i * (0.11 - i * 0.008));
    // two urgent stabs at the top
    blip(1046, 0.12, 'triangle', 0.4, null, 0.8);
    blip(1318, 0.16, 'triangle', 0.45, null, 0.95);
  },
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, 'triangle', 0.45, null, i * 0.1));
  },
  // bomb
  fuse() { blip(120, 0.04, 'sawtooth', 0.12); },
  explode() { bigExplosion(); },
};

// --- A recognizable cash-register "ka-ching": a metallic bell (stacked
//     inharmonic partials) with a short bitcrush + a low drawer thunk. ---
function registerDing() {
  if (!enabled) return; ensure();
  const t0 = ctx.currentTime;
  // drawer thunk
  const th = ctx.createOscillator(); const tg = ctx.createGain();
  th.type = 'square'; th.frequency.setValueAtTime(180, t0); th.frequency.exponentialRampToValueAtTime(70, t0 + 0.08);
  tg.gain.setValueAtTime(0.25, t0); tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  th.connect(tg); tg.connect(master); th.start(t0); th.stop(t0 + 0.12);
  // bell: two quick strikes of stacked partials (that classic register ring)
  const bell = (delay, base, vol) => {
    const partials = [1, 2.01, 2.99, 4.2]; // slightly inharmonic = metallic
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t0 + delay);
    bg.gain.exponentialRampToValueAtTime(vol, t0 + delay + 0.005);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.4);
    // bitcrush-ish: a waveshaper for grit
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
    ws.curve = curve;
    bg.connect(ws); ws.connect(master);
    for (const pm of partials) {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = base * pm;
      o.connect(bg); o.start(t0 + delay); o.stop(t0 + delay + 0.42);
    }
  };
  bell(0.02, 1180, 0.3);
  bell(0.1, 1560, 0.28); // the "ching" up-ring
}

// --- A punchy explosion: sub boom + layered noise + debris crackle. ---
function bigExplosion() {
  if (!enabled) return; ensure();
  const t0 = ctx.currentTime;
  // sub boom
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(35, t0 + 0.4);
  g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.52);
  // body blast (filtered noise, bright -> dark)
  const n = Math.floor(ctx.sampleRate * 0.7);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
  filt.frequency.setValueAtTime(3500, t0); filt.frequency.exponentialRampToValueAtTime(300, t0 + 0.6);
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.8, t0); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
  src.connect(filt); filt.connect(ng); ng.connect(master); src.start(t0); src.stop(t0 + 0.7);
  // debris crackle
  noise(0.25, 0.4, 5000, 0.05);
}

// ------------------------------------------------------------------
// Background music: a small looping chiptune. Bass + lead scheduled
// ahead of time. tempo can be nudged up when the game speeds up.
// ------------------------------------------------------------------
let music = { playing: false, timer: null, step: 0, bpm: 92, gain: null };

// note frequencies (a few octaves)
const NF = {
  G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 784.0, A5: 880.0, 0: 0,
};

// ------------------------------------------------------------------
// ELEVATOR / GROCERY-STORE MUZAK (lounge synth). Smooth jazzy 7th chords
// over a lazy walking bass, a soft vibraphone melody, and brush percussion.
// Deliberately cheesy "on-hold / supermarket" vibe. ~92 BPM.
// ------------------------------------------------------------------
// Progression: Cmaj7 - Am7 - Dm7 - G7  (classic ii-V lounge turnaround)
// vibraphone melody (16 steps per... we use 32 steps, 2 bars shown, loops 4 bars)
const LEAD = [
  'E5', 0,  'G5', 0,  0,  'C5', 0,  0,   'C5', 0,  'E5', 0,  0,  'A4', 0,  0,
  'F5', 0,  'A5', 0,  0,  'D5', 0,  0,   'D5', 0,  'B4', 0,  'G4', 0,  0,  0,
];
// lazy walking bass (one per beat-ish)
const BASS = [
  'C3', 0,  0,  0,  'G2', 0,  0,  0,   'A2', 0,  0,  0,  'E3', 0,  0,  0,
  'D3', 0,  0,  0,  'A2', 0,  0,  0,   'G2', 0,  0,  0,  'B2', 0,  'D3', 0,
];
// sustained jazzy chords (root position 7ths), one per bar (8 steps)
const CHORD = [
  ['C4','E4','G4','B4'], null, null, null, null, null, null, null,  // Cmaj7
  ['A3','C4','E4','G4'], null, null, null, null, null, null, null,  // Am7
  ['D4','F4','A4','C5'], null, null, null, null, null, null, null,  // Dm7
  ['G3','B3','D4','F4'], null, null, null, null, null, null, null,  // G7
];

// a warm, rounded voice: layered detuned oscillators + gentle vibrato,
// soft attack + long decay. Reads as a mellow lounge instrument.
function voice(freq, dur, type, vol, dest, warm = true) {
  if (!freq) return;
  const t0 = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  g.gain.setValueAtTime(vol, t0 + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(dest);
  const detunes = warm ? [-6, 6] : [0];
  for (const d of detunes) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = d;
    // subtle vibrato for the melody
    if (warm) {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 5; lg.gain.value = 4;
      lfo.connect(lg); lg.connect(osc.detune);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    osc.connect(g);
    osc.start(t0); osc.stop(t0 + dur + 0.06);
  }
}

// soft brush "tss" percussion
function brush(vol) {
  if (!music.gain) return;
  const t0 = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  src.connect(filt); filt.connect(g); g.connect(music.gain);
  src.start(t0); src.stop(t0 + 0.06);
}

// ---- optional real audio file (drop an mp3/ogg in assets/audio/) ----
let musicEl = null;
function tryFileMusic() {
  if (musicEl) { if (enabled) musicEl.play().catch(() => {}); return true; }
  if (typeof Audio === 'undefined') return false;
  const el = new Audio();
  const candidates = ['assets/audio/music.mp3', 'assets/audio/music.ogg'];
  el.loop = true; el.volume = 0.35;
  el.src = candidates[0];
  let ok = false;
  el.addEventListener('canplaythrough', () => { ok = true; musicEl = el; if (enabled) el.play().catch(() => {}); }, { once: true });
  el.addEventListener('error', () => {
    if (el.src.endsWith('music.mp3')) el.src = candidates[1];
    else musicEl = 'none'; // no file present; use synth fallback
  });
  el.load();
  // give it a beat to decide; return false so synth starts immediately,
  // and if the file loads it will take over (we stop synth in that handler)
  el.addEventListener('canplaythrough', () => { synthStop(); }, { once: true });
  return false;
}

function synthStop() {
  music.playing = false;
  if (music.timer) clearTimeout(music.timer);
  if (music.gain) { try { music.gain.disconnect(); } catch (e) {} music.gain = null; }
}

export const Music = {
  start() {
    if (!enabled) return;
    // prefer a real file if one is provided; otherwise run the muzak synth
    if (musicEl && musicEl !== 'none') { musicEl.play().catch(() => {}); return; }
    if (musicEl !== 'none') tryFileMusic();
    if (music.playing) return;
    ensure();
    music.gain = ctx.createGain();
    music.gain.gain.value = 0.28;
    // gentle low-pass = soft "in-store speaker" warmth
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
    music.gain.connect(lp); lp.connect(master);
    music.playing = true;
    music.step = 0;
    const tick = () => {
      if (!music.playing) return;
      const beat = 60 / music.bpm / 2;
      const s = music.step % 32;
      // warm vibraphone melody (detuned + vibrato, long ring)
      if (LEAD[s]) voice(NF[LEAD[s]], beat * 3.2, 'triangle', 0.28, music.gain, true);
      // soft upright bass (no vibrato, steady)
      if (BASS[s]) voice(NF[BASS[s]], beat * 2.8, 'triangle', 0.42, music.gain, false);
      // held jazzy 7th chord pad (soft, stable)
      if (CHORD[s]) for (const note of CHORD[s]) voice(NF[note], beat * 8.0, 'sine', 0.08, music.gain, false);
      // brush swish on the offbeats
      if (s % 4 === 2) brush(0.06);
      music.step++;
      music.timer = setTimeout(tick, beat * 1000);
    };
    tick();
  },
  stop() {
    if (musicEl && musicEl !== 'none') { try { musicEl.pause(); } catch (e) {} }
    synthStop();
  },
  // tempo no longer ramps hard for lounge music; keep it lazy & steady
  setTempo() { music.bpm = 92; },
  isPlaying() { return music.playing || (musicEl && musicEl !== 'none' && !musicEl.paused); },
};
