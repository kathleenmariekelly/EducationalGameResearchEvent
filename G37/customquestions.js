// customquestions.js — player-authored questions, saved in localStorage.
// Raw shape stored:
//   { algo, difficulty, type:'mc'|'fill', prompt, choices?, answer, hints[], explain }
//   mc  -> answer = index of correct choice
//   fill-> answer = array of accepted strings

const KEY = "kingdomDefense.customQuestions";

const REWARD = {
  easy:   { walls: 2, swamp: 0 },
  medium: { walls: 3, swamp: 1 },
  hard:   { walls: 4, swamp: 2 },
};

export function getCustomRaw() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function setCustomRaw(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// Processed for the quiz engine: adds reward, ensures a hint exists, tags custom.
export function loadCustomQuestions() {
  return getCustomRaw().map((q) => ({
    ...q,
    reward: REWARD[q.difficulty] || REWARD.easy,
    hints: (q.hints && q.hints.length) ? q.hints
      : ["Give it your best guess — then check the answer!"],
    custom: true,
  }));
}
