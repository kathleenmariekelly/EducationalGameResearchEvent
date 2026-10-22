// Tiny retro sound engine using the Web Audio API — no audio files needed.
// Sounds are synthesized on the fly, so nothing to download or bundle.
//
// Respects a mute toggle stored in localStorage. Call sfx(name) to play.

let ctx = null;
let muted = localStorage.getItem("codequest_muted") === "1";

function ac() {
  // Lazily create the AudioContext on first user gesture (browser policy).
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { ctx = null; }
  }
  return ctx;
}

// Play a single tone.
function tone(freq, dur, type = "square", vol = 0.15, delay = 0) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// Named sound effects.
export function sfx(name) {
  if (muted) return;
  switch (name) {
    case "step":   tone(220, 0.06, "square", 0.06); break;
    case "turn":   tone(330, 0.05, "triangle", 0.06); break;
    case "jump":   tone(300, 0.12, "sine", 0.12); tone(500, 0.12, "sine", 0.1, 0.06); break;
    case "gem":    tone(880, 0.08, "sine", 0.14); tone(1320, 0.12, "sine", 0.12, 0.07); break;
    case "win":    // little ascending fanfare
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "square", 0.14, i * 0.12));
      break;
    case "fail":   tone(200, 0.18, "sawtooth", 0.14); tone(150, 0.22, "sawtooth", 0.12, 0.12); break;
    case "levelup":
      [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, "triangle", 0.16, i * 0.13));
      break;
    case "click":  tone(440, 0.04, "square", 0.08); break;
    default: break;
  }
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  localStorage.setItem("codequest_muted", muted ? "1" : "0");
  if (!muted) { ac(); sfx("click"); } // resume context on unmute
  return muted;
}
