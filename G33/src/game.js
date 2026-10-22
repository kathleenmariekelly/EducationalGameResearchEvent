// ===============================================================
//  GAME ENGINE
//  Depends on TIERS + CONTENT from data/content.js (loaded first)
// ===============================================================

const SAVE_KEY = "codequest.save.v1";
const QUIZ_LEN = 20;

// ---------- Persistence ----------
function defaultSave() {
  return {
    xp: 0,
    gems: 0,
    streak: 0,
    lastPlayed: null,        // ISO date string (day granularity)
    dailyClaimed: null,      // date string of last daily reward
    // per-topic: { tierCleared: "noob"|"average"|"pro"|null, attempts, best }
    topics: {},
    // spaced repetition queue: { "trackId/topicId/qIndex": {due, ease} }
    srs: {},
    // cosmetics / shop
    theme: "focus",
    ownedThemes: ["focus"],
    customAccent: null,
    customUnlocked: false,
    // pet
    petPets: 0,   // how many times Bolt has been petted
    // resumable quiz session (null when none in progress)
    session: null,
  };
}
function load() {
  try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return defaultSave(); }
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
let state = load();

// ---------- Date helpers ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ---------- Streak + daily on launch ----------
function handleDaily() {
  const t = todayStr();
  if (state.lastPlayed) {
    const gap = daysBetween(state.lastPlayed, t);
    if (gap === 1) state.streak += 1;
    else if (gap > 1) state.streak = 1; // missed a day -> reset to today
  } else {
    state.streak = 1;
  }
  state.lastPlayed = t;
  save();
}

function claimDaily() {
  const t = todayStr();
  if (state.dailyClaimed === t) return false;
  state.dailyClaimed = t;
  const reward = 10 + state.streak * 2;
  state.gems += reward;
  save();
  return reward;
}

// ---------- Topic helpers ----------
function findTopic(trackId, topicId) {
  const track = CONTENT.tracks.find(t => t.id === trackId);
  return { track, topic: track.topics.find(tp => tp.id === topicId) };
}
function topicState(trackId, topicId) {
  const key = trackId + "/" + topicId;
  if (!state.topics[key]) state.topics[key] = { tierCleared: null, attempts: 0, best: 0 };
  return state.topics[key];
}
function tierIndex(id) { return TIERS.findIndex(t => t.id === id); }

// ---------- Track unlocking (C++ -> Discrete -> DSA) ----------
function isTrackMastered(trackId) {
  const track = CONTENT.tracks.find(t => t.id === trackId);
  // mastered = at least one topic reached the top tier ("pro")
  return track.topics.some(tp => {
    const ts = state.topics[trackId + "/" + tp.id];
    return ts && ts.tierCleared === "pro";
  });
}
function trackUnlocked(track) {
  if (!track.unlock) return true;
  if (track.unlock.need === "master") return isTrackMastered(track.unlock.track);
  // fallback: any topic cleared
  const prev = CONTENT.tracks.find(t => t.id === track.unlock.track);
  return prev.topics.some(tp => (state.topics[prev.id + "/" + tp.id]||{}).tierCleared);
}

// ---------- Tier progress (for the progress bar) ----------
// Returns 0..1 how far the learner is toward the NEXT tier for a topic.
function tierProgress(trackId, topicId) {
  const ts = topicState(trackId, topicId);
  const clearedIdx = ts.tierCleared ? tierIndex(ts.tierCleared) : -1;
  const nt = nextTier(ts.tierCleared);
  if (!nt) return 1; // mastered
  // progress = best score on the next tier's target, capped, plus cleared credit
  const base = (clearedIdx + 1) / TIERS.length;
  const within = Math.min(ts.best, nt.passPct) / nt.passPct / TIERS.length;
  return Math.min(1, base + within);
}

// ---------- Themes ----------
function applyTheme() {
  const theme = CONTENT.themes.find(t => t.id === state.theme) || CONTENT.themes[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (state.customAccent) root.style.setProperty("--accent", state.customAccent);
}
function buyTheme(themeId) {
  const theme = CONTENT.themes.find(t => t.id === themeId);
  if (!theme || state.ownedThemes.includes(themeId)) return false;
  if (state.gems < theme.cost) return false;
  state.gems -= theme.cost;
  state.ownedThemes.push(themeId);
  save();
  return true;
}
function buyCustomAccent() {
  if (state.customUnlocked) return true;
  if (state.gems < CUSTOM_ACCENT_COST) return false;
  state.gems -= CUSTOM_ACCENT_COST;
  state.customUnlocked = true;
  save();
  return true;
}

// ---------- Pet: Bolt's life stage from XP ----------
function petStage() {
  let stage = PET_STAGES[0];
  for (const s of PET_STAGES) if (state.xp >= s.minXP) stage = s;
  return stage;
}
function petNextStage() {
  const i = PET_STAGES.indexOf(petStage());
  return PET_STAGES[i + 1] || null;
}
// 0..1 progress toward next stage
function petProgress() {
  const cur = petStage(), nxt = petNextStage();
  if (!nxt) return 1;
  return Math.min(1, (state.xp - cur.minXP) / (nxt.minXP - cur.minXP));
}
function nextTier(clearedId) {
  if (!clearedId) return TIERS[0];
  const i = tierIndex(clearedId);
  return TIERS[i + 1] || null; // null = mastered
}

// ---------- Spaced repetition ----------
// Very light SM-2-ish: correct pushes due date out, wrong resets to tomorrow.
function srsKey(trackId, topicId, qi) { return `${trackId}/${topicId}/${qi}`; }
function reviewCard(key, correct) {
  const card = state.srs[key] || { ease: 1, due: todayStr() };
  if (correct) {
    card.ease = Math.min(card.ease * 2, 32);
  } else {
    card.ease = 1;
  }
  const due = new Date();
  due.setDate(due.getDate() + card.ease);
  card.due = due.toISOString().slice(0, 10);
  state.srs[key] = card;
}
function dueCount() {
  const t = todayStr();
  return Object.values(state.srs).filter(c => c.due <= t).length;
}

// ---------- Question selection ----------
// Prioritise due (spaced-repetition) questions, then fill randomly.
function pickQuestions(track, topic) {
  const total = topic.questions.length;
  const t = todayStr();
  const withMeta = topic.questions.map((q, i) => ({
    q, i,
    due: (state.srs[srsKey(track.id, topic.id, i)]?.due || "0000") <= t,
  }));
  const dueFirst = withMeta.filter(x => x.due);
  const rest = withMeta.filter(x => !x.due);
  shuffle(dueFirst); shuffle(rest);
  const chosen = [...dueFirst, ...rest].slice(0, Math.min(QUIZ_LEN, total));
  shuffle(chosen);
  return chosen;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
