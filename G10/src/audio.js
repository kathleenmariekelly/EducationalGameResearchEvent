// audio.js
//
// Self-contained sound using the Web Audio API — no audio files, no
// network, nothing to load. Safe for a static site. All tones are
// synthesized at runtime.
//
// Browsers block audio until a user gesture, so call unlock() from a
// key/click handler before playing anything (we do this on race start).

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  // ---- one-shot beep ----
  tone(freq, dur = 0.12, type = "square", gain = 0.25, whenOffset = 0) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + whenOffset;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ---- named SFX ----
  boost() {
    // rising arpeggio
    this.tone(523, 0.09, "square", 0.28, 0);
    this.tone(659, 0.09, "square", 0.28, 0.07);
    this.tone(880, 0.14, "square", 0.30, 0.14);
  }
  wrong() {
    // low descending buzz
    this.tone(220, 0.14, "sawtooth", 0.28, 0);
    this.tone(160, 0.20, "sawtooth", 0.26, 0.10);
  }
  steer() {
    this.tone(440, 0.05, "triangle", 0.12, 0);
  }
  bump() {
    // dull thud + a little rattle
    this.tone(90, 0.16, "sawtooth", 0.30, 0);
    this.tone(70, 0.20, "square", 0.22, 0.03);
  }
  qteHit() {
    // crisp confirming blip for each correct QTE input
    this.tone(880, 0.06, "square", 0.25, 0);
    this.tone(1175, 0.06, "square", 0.22, 0.05);
  }
  qteFail() {
    this.tone(200, 0.18, "sawtooth", 0.28, 0);
  }
  qteWin() {
    // big rising fanfare
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone(f, 0.12, "square", 0.30, i * 0.08));
  }
  ramp() {
    // whoosh cue when a ramp appears
    this.tone(300, 0.10, "sine", 0.2, 0);
    this.tone(600, 0.14, "sine", 0.2, 0.08);
  }
  lap() {
    this.tone(659, 0.10, "square", 0.28, 0);
    this.tone(784, 0.10, "square", 0.28, 0.09);
    this.tone(988, 0.16, "square", 0.30, 0.18);
  }
  finish() {
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.16, "square", 0.30, i * 0.13));
  }
  start() {
    this.tone(392, 0.12, "square", 0.28, 0);
    this.tone(523, 0.18, "square", 0.30, 0.13);
  }

  // ---- looping background music (simple bass + arpeggio) ----
  startMusic() {
    if (!this.ctx || !this.musicOn || this.musicTimer) return;
    // A cheerful loop in A minor-ish pentatonic; two voices.
    const bass = [110, 110, 146.83, 110, 130.81, 130.81, 98, 110];
    const lead = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 493.88, 440];
    const stepDur = 0.28; // seconds per step
    this.musicStep = 0;
    const tick = () => {
      if (!this.musicOn || !this.ctx) return;
      const i = this.musicStep % bass.length;
      // bass
      this._musicVoice(bass[i], stepDur * 0.9, "triangle", 0.10);
      // lead every step, quieter
      this._musicVoice(lead[i], stepDur * 0.6, "square", 0.06);
      this.musicStep++;
    };
    tick();
    this.musicTimer = setInterval(tick, stepDur * 1000);
  }

  _musicVoice(freq, dur, type, gain) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic(); else this.stopMusic();
    return this.musicOn;
  }
  toggleSfx() { this.sfxOn = !this.sfxOn; return this.sfxOn; }
}
