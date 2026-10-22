// levels.js
//
// Concept: CPU cache behavior — why a small, nearby cache beats far-away
// RAM, and the judgment calls that come with it (what to keep close,
// what to evict, and how access patterns/locality change the answer).
//
// ONE mechanic (a "courier" serves CPU data requests; hits are near/fast,
// misses are a far/slow trip to RAM; the player chooses what to cache and
// what to evict) played across many varied levels. Levels alternate:
//   - LEARN  : turn-based, no pressure, explains every outcome.
//   - CHALLENGE: stall meter + travel time, apply the concept under fire.
// Pure static data — no network, no API calls.

// The cache stores whole LINES. A line covers `lineSize` consecutive
// addresses, so with lineSize > 1, fetching one address drags in its
// neighbors — that's spatial locality, for free, from the same model.
export class Cache {
  constructor(slots, lineSize) {
    this.slots = slots;          // number of lines the cache can hold
    this.lineSize = lineSize;    // addresses per line
    this.lines = [];             // [{ id, base, lastUsed }]
    this.clock = 0;
  }
  lineIdOf(addr) {
    return Math.floor(addr / this.lineSize);
  }
  find(addr) {
    const id = this.lineIdOf(addr);
    return this.lines.find((l) => l.id === id) || null;
  }
  has(addr) {
    return this.find(addr) !== null;
  }
  touch(addr) {
    const l = this.find(addr);
    if (l) {
      l.lastUsed = ++this.clock;
      return true;
    }
    return false;
  }
  isFull() {
    return this.lines.length >= this.slots;
  }
  install(addr) {
    const id = this.lineIdOf(addr);
    const line = { id, base: id * this.lineSize, lastUsed: ++this.clock };
    this.lines.push(line);
    return line;
  }
  evict(lineId) {
    const i = this.lines.findIndex((l) => l.id === lineId);
    if (i >= 0) return this.lines.splice(i, 1)[0];
    return null;
  }
  // Which resident line is the LRU one (for hints / "best play").
  lruLineId() {
    if (this.lines.length === 0) return null;
    let lru = this.lines[0];
    for (const l of this.lines) if (l.lastUsed < lru.lastUsed) lru = l;
    return lru.id;
  }
}

// Addresses used by the levels. Keeping them small keeps RAM readable.
export const LEVELS = [
  {
    id: "intro",
    mode: "learn",
    concept: "Latency: memory is far away",
    title: "Level 1 — The Long Haul",
    subtitle: "Why the CPU waits",
    cacheSlots: 0,
    lineSize: 1,
    requests: [12, 5, 20, 5, 12, 20],
    intro: [
      "You're the COURIER inside a computer.",
      "The CPU needs data to keep working — but the data lives in RAM,",
      "all the way across the chip. Every request means a long trip.",
      "While you're gone, the CPU can do nothing but WAIT (a 'stall').",
    ],
    teach: {
      miss:
        "Long trip to RAM. With no cache, EVERY request costs this — even " +
        "for data you just fetched a moment ago.",
      summary:
        "With no cache, the CPU stalls on every access. Real programs would " +
        "crawl. Next: a way to keep hot data close.",
    },
  },
  {
    id: "nocache-challenge",
    mode: "challenge",
    concept: "Feel the stall",
    title: "Level 2 — Rush Hour",
    subtitle: "Survive with no cache",
    cacheSlots: 0,
    lineSize: 1,
    requests: [3, 9, 14, 3, 21, 9, 14, 3, 5, 18, 9, 14],
    stall: { fillPerSec: 16, allowed: 6 },
    intro: [
      "Same job — but now the CPU won't wait politely.",
      "The STALL METER climbs while a request is unserved.",
      "Fill it and the CPU stalls. Serve requests fast to keep it down.",
    ],
    teach: {
      summary:
        "Painful, right? Notice you keep re-fetching 3, 9, 14 — the same " +
        "data, over and over. What if you could keep those nearby?",
    },
  },
  {
    id: "cache-learn",
    mode: "learn",
    concept: "Temporal locality: reused data kept close",
    title: "Level 3 — The Cache",
    subtitle: "Keep hot data close",
    cacheSlots: 3,
    lineSize: 1,
    requests: [7, 2, 5, 7, 2, 5, 7, 2, 5, 7, 2, 5],
    intro: [
      "New tool: a CACHE — a tiny storage right next to the CPU.",
      "Data you fetch from RAM can be kept here for instant reuse.",
      "The catch: it's small. But watch what repetition does...",
    ],
    teach: {
      miss:
        "Not in cache — long RAM trip. On the way back, we keep a copy in " +
        "the cache.",
      hit:
        "HIT! It was already in the cache — served instantly, no RAM trip. " +
        "This is the whole point.",
      summary:
        "Temporal locality: data used recently tends to be used again soon. " +
        "Keeping it close turns repeat requests into instant hits.",
    },
  },
  {
    id: "cache-challenge",
    mode: "challenge",
    concept: "Apply temporal locality",
    title: "Level 4 — Hot Loop",
    subtitle: "Let the cache carry you",
    cacheSlots: 3,
    lineSize: 1,
    requests: [4, 8, 1, 4, 8, 1, 4, 8, 1, 4, 8, 1, 4, 8, 1, 4, 8, 1],
    stall: { fillPerSec: 15, allowed: 5 },
    intro: [
      "A tight loop keeps asking for the same three values.",
      "Fetch each once, keep it cached, then ride the hits.",
      "The meter's back — but hits are nearly free.",
    ],
    teach: {
      summary:
        "Once the working set is cached, the meter barely moves. That's why " +
        "loops over small data are fast.",
    },
  },
  {
    id: "evict-learn",
    mode: "learn",
    concept: "Capacity & replacement: you must evict",
    title: "Level 5 — Full House",
    subtitle: "Something's gotta go",
    cacheSlots: 3,
    lineSize: 1,
    requests: [1, 2, 3, 4, 2, 3, 4, 1, 2, 3, 4, 1],
    intro: [
      "The cache holds 3 lines, but this program touches 4 different ones.",
      "When it's full and you fetch a new line, YOU choose what to evict.",
      "Choose badly and you'll re-fetch it moments later.",
    ],
    teach: {
      miss:
        "Miss — long trip. If the cache is full, you'll pick a victim to " +
        "make room.",
      hit: "HIT — still resident. Good keep.",
      evictHint:
        "Tip: evict the line you're LEAST likely to need soon. Kicking out " +
        "something about to be reused just causes another miss.",
      summary:
        "Capacity forces choices. A good replacement policy (like evicting " +
        "the Least-Recently-Used line) keeps the useful data and drops the " +
        "stale. Bad evictions = self-inflicted misses.",
    },
  },
  {
    id: "evict-challenge",
    mode: "challenge",
    concept: "Apply replacement policy",
    title: "Level 6 — Eviction Rush",
    subtitle: "Choose victims under fire",
    cacheSlots: 3,
    lineSize: 1,
    requests: [1, 2, 3, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2],
    stall: { fillPerSec: 16, allowed: 6 },
    intro: [
      "Working set is bigger than the cache, and the meter is ticking.",
      "Every eviction is a bet. Notice which line is 'hot' (asked most).",
      "Evict wisely — a wrong pick means another slow RAM trip soon.",
    ],
    teach: {
      summary:
        "Under pressure, replacement choices decide your hit rate. Keeping " +
        "the hottest data resident is what real caches try to do.",
    },
  },
  {
    id: "spatial-learn",
    mode: "learn",
    concept: "Spatial locality: fetching brings neighbors",
    title: "Level 7 — Good Neighbors",
    subtitle: "One trip, four values",
    cacheSlots: 2,
    lineSize: 4,
    requests: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    intro: [
      "Data doesn't travel one byte at a time. A cache LINE here holds 4",
      "consecutive addresses. Fetch address 0 and you also get 1, 2, 3 —",
      "for free, in the same trip. Watch a sequential scan fly.",
    ],
    teach: {
      miss:
        "Miss — but the whole LINE comes back: this address AND its 3 " +
        "neighbors are now cached.",
      hit:
        "HIT — a neighbor you already hauled in on the last trip. Free.",
      summary:
        "Spatial locality: data near what you just used tends to be used " +
        "next. Fetching whole lines makes sequential access mostly hits.",
    },
  },
  {
    id: "spatial-challenge",
    mode: "challenge",
    concept: "Apply spatial locality",
    title: "Level 8 — Streaming",
    subtitle: "Ride the lines",
    cacheSlots: 2,
    lineSize: 4,
    requests: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    stall: { fillPerSec: 20, allowed: 5 },
    intro: [
      "A big sequential stream. One RAM trip pays for four accesses.",
      "Fetch a line, cash in its neighbors as hits, repeat.",
      "Keep the meter down by trusting the neighbors.",
    ],
    teach: {
      summary:
        "Sequential/streaming access is cache-friendly because each miss " +
        "pre-loads several upcoming hits. Access ORDER is everything.",
    },
  },
];

// ---- Randomized request generators ----
// Each playthrough gets a fresh request stream that still exercises the
// same concept, so the pattern isn't trivially memorizable but the lesson
// stays intact. Falls back to the authored `requests` array if unknown.
function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickDistinct(n, lo, hi) {
  const pool = [];
  for (let v = lo; v <= hi; v++) pool.push(v);
  return shuffle(pool).slice(0, n);
}

export function makeRequests(level) {
  const { id, cacheSlots, lineSize } = level;
  const count = level.requests.length;
  switch (id) {
    case "intro": {
      // A few addresses with some reuse, so "even repeats cost a trip" lands.
      // Keep the range small so RAM stays readable on screen.
      const ws = pickDistinct(3, 1, 12);
      return [ws[0], ws[1], ws[2], ws[1], ws[0], ws[2]];
    }
    case "nocache-challenge": {
      const ws = pickDistinct(4, 1, 14);
      const r = [];
      for (let i = 0; i < count; i++) r.push(ws[randInt(0, ws.length - 1)]);
      return r;
    }
    case "cache-learn":
    case "cache-challenge": {
      // Working set fits in the cache -> lots of reuse -> lots of hits.
      const ws = pickDistinct(cacheSlots, 1, 9);
      const r = shuffle(ws); // introduce each once first
      while (r.length < count) r.push(ws[randInt(0, ws.length - 1)]);
      return r;
    }
    case "evict-learn":
    case "evict-challenge": {
      // "Hot line" pattern: one address (ws[0]) is reused every other step,
      // while cold lines cycle through and force evictions. Evicting the hot
      // line is heavily punished (an immediate miss), so the choice of victim
      // genuinely matters -> teaches "keep the hot data, drop the cold."
      const ws = pickDistinct(cacheSlots + 1, 1, 9); // 4 lines for a 3-slot cache
      const hot = ws[0];
      const colds = ws.slice(1);
      const seq = colds.slice(0, cacheSlots - 1); // partial fill with colds
      seq.unshift(hot); // [hot, cold, cold] fills the cache
      let ci = cacheSlots - 1; // start the cycle on the cold NOT in the fill
      while (seq.length < count) {
        seq.push(hot);
        if (seq.length < count) seq.push(colds[ci++ % colds.length]);
      }
      return seq.slice(0, count);
    }
    case "spatial-learn": {
      // Sequential scan from a random line start -> spatial-locality hits.
      const base = randInt(0, 1) * lineSize;
      const r = [];
      for (let i = 0; i < count; i++) r.push(base + i);
      return r;
    }
    case "spatial-challenge": {
      // Two sequential streams in different regions, interleaved a line at
      // a time. With only 2 line-slots the streams compete, so WHICH line
      // you evict actually matters -> not autopilot.
      const baseA = 0;
      const baseB = 3 * lineSize; // a separate region
      const r = [];
      let ia = 0, ib = 0, turn = 0;
      while (r.length < count) {
        const base = turn % 2 === 0 ? baseA : baseB;
        const off = turn % 2 === 0 ? ia : ib;
        for (let k = 0; k < lineSize && r.length < count; k++) r.push(base + off + k);
        if (turn % 2 === 0) ia += lineSize; else ib += lineSize;
        turn++;
      }
      return r;
    }
    default:
      return level.requests.slice();
  }
}

// ---- Endless mode ----
// Unlocked after the 8 story levels. Speed ramps up over time and the
// access patterns mix everything the player learned (hot loops, scans,
// capacity thrash). Meant to be replayed for a high score.
export const ENDLESS = {
  id: "endless",
  mode: "challenge",
  endless: true,
  title: "Endless Mode",
  subtitle: "Everything at once · speed keeps rising",
  concept: "put it all together",
  cacheSlots: 3,
  lineSize: 2,
  requests: [0, 1, 2, 3], // placeholder; real stream from makeEndlessRequests()
  stall: { fillPerSec: 15, allowed: 3 },
  intro: [
    "Training complete. This run never stops speeding up.",
    "Cache: 3 lines, each holding 2 addresses. Patterns mix together:",
    "hot loops, sequential scans, and capacity thrash.",
    "3 stalls ends the run — then retry to beat your score.",
  ],
  teach: { summary: "" },
};

export function makeEndlessRequests() {
  const out = [];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  for (let ch = 0; ch < 30; ch++) {
    const kind = rnd(0, 2);
    if (kind === 0) {
      // hot loop (temporal reuse)
      const ws = [rnd(0, 3), rnd(4, 7), rnd(8, 11)];
      for (let i = 0; i < 6; i++) out.push(ws[rnd(0, 2)]);
    } else if (kind === 1) {
      // sequential scan (spatial locality)
      const base = rnd(0, 4) * 2;
      for (let i = 0; i < 6; i++) out.push(base + i);
    } else {
      // capacity thrash (working set > cache)
      const ws = [0, 2, 5, 8, 11];
      for (let i = 0; i < 6; i++) out.push(ws[i % 5]);
    }
  }
  return out;
}

export const STALL_MAX = 100;
