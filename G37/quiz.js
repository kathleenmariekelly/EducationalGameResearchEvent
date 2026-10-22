// quiz.js — the question modal. Answering earns defenses; hints scaffold learning.
import { QUESTIONS, pickQuestion } from "./questions.js";
import { loadCustomQuestions } from "./customquestions.js";

const DIFF_ORDER = ["easy", "medium", "hard"];

// config: { algos: [...pools], startTier: 0|1|2 }  (or a plain algo string)
export function createQuiz(config, onReward) {
  const algos = Array.isArray(config?.algos) ? config.algos
              : typeof config === "string" ? [config, "general"]
              : [config?.algo ?? "general", "general"];
  const startTier = Math.min(config?.startTier ?? 0, DIFF_ORDER.length - 1);
  const pool = [...QUESTIONS, ...loadCustomQuestions()]; // built-in + player-authored
  const el = {
    modal: document.getElementById("quizModal"),
    tag: document.getElementById("quizTag"),
    prompt: document.getElementById("quizPrompt"),
    body: document.getElementById("quizBody"),
    hintArea: document.getElementById("quizHintArea"),
    hintBtn: document.getElementById("quizHintBtn"),
    submit: document.getElementById("quizSubmit"),
    feedback: document.getElementById("quizFeedback"),
    close: document.getElementById("quizClose"),
  };

  const used = new Set();     // question objects already answered
  let diffIndex = startTier;   // harder levels start at a higher difficulty
  let current = null;
  let hintsUsed = 0;
  let selected = null;    // for MC
  let answered = false;

  // study stats for the results screen
  const stats = {
    attempts: 0, correct: 0, wrong: 0, hints: 0,
    byDiff: { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } },
    concepts: new Set(),
  };

  function open() {
    answered = false; hintsUsed = 0; selected = null;
    current = pickQuestion(pool, algos, DIFF_ORDER[diffIndex], used);
    render();
    el.modal.hidden = false;
  }
  function closeModal() { el.modal.hidden = true; }

  function render() {
    const q = current;
    el.tag.textContent = `${q.algo.toUpperCase()} • ${q.difficulty} • reward: ${q.reward.walls}🧱 ${q.reward.swamp}🌿`;
    el.prompt.textContent = q.prompt;
    el.feedback.textContent = "";
    el.feedback.className = "";
    el.hintArea.innerHTML = "";
    el.hintBtn.disabled = false;
    el.hintBtn.textContent = `💡 Hint (${q.hints.length} available)`;
    el.submit.disabled = false;
    el.submit.textContent = "Submit";
    el.body.innerHTML = "";

    if (q.type === "mc") {
      q.choices.forEach((c, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "choice"; b.textContent = c;
        b.onclick = () => {
          if (answered) return;
          selected = i;
          el.body.querySelectorAll(".choice").forEach((x) => x.classList.remove("sel"));
          b.classList.add("sel");
        };
        el.body.appendChild(b);
      });
    } else {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "quizInput"; inp.placeholder = "Type your answer…";
      inp.autocomplete = "off";
      inp.onkeydown = (e) => { if (e.key === "Enter") submit(); };
      el.body.appendChild(inp);
      setTimeout(() => inp.focus(), 30);
    }
  }

  function answerText(q) {
    return q.type === "mc" ? q.choices[q.answer] : q.answer[0];
  }
  function showHint() {
    const q = current;
    if (hintsUsed >= q.hints.length) return;
    const p = document.createElement("p");
    p.className = "hint-line";
    p.textContent = `Hint ${hintsUsed + 1}: ${q.hints[hintsUsed]}`;
    el.hintArea.appendChild(p);
    hintsUsed++;
    if (hintsUsed >= q.hints.length) {
      el.hintBtn.disabled = true;
      el.hintBtn.textContent = "No more hints";
      // out of hints — reveal the answer so a timed player isn't stuck
      const ans = document.createElement("p");
      ans.className = "hint-line answer-line";
      ans.innerHTML = `✅ Answer: <strong>${answerText(q)}</strong> — select/type it to lock it in.`;
      el.hintArea.appendChild(ans);
      if (q.type === "mc") {
        el.body.querySelectorAll(".choice").forEach((b, i) => {
          if (i === q.answer) b.classList.add("reveal");
        });
      } else {
        const inp = document.getElementById("quizInput");
        if (inp) inp.placeholder = `Answer: ${answerText(q)}`;
      }
    } else {
      el.hintBtn.textContent = `💡 Hint (${q.hints.length - hintsUsed} left)`;
    }
  }

  function isCorrect(q) {
    if (q.type === "mc") return selected === q.answer;
    const val = (document.getElementById("quizInput")?.value || "")
      .trim().toLowerCase();
    return q.answer.some((a) => a.toLowerCase() === val);
  }

  function submit() {
    const q = current;
    if (answered) { closeModal(); return; }
    if (q.type === "mc" && selected === null) {
      el.feedback.textContent = "Pick an answer first.";
      el.feedback.className = "warn";
      return;
    }
    stats.attempts++;
    if (isCorrect(q)) {
      answered = true;
      stats.correct++;
      stats.hints += hintsUsed;
      stats.byDiff[q.difficulty].c++;
      stats.byDiff[q.difficulty].t++;
      stats.concepts.add(q.algo.toUpperCase());
      // hints reduce the wall bonus slightly, but learning always pays out (min 1)
      const walls = Math.max(1, q.reward.walls - hintsUsed);
      const swamp = q.reward.swamp;
      used.add(q);
      if (diffIndex < DIFF_ORDER.length - 1) diffIndex++; // escalate difficulty
      onReward({ walls, swamp, difficulty: q.difficulty });
      el.feedback.innerHTML =
        `✅ Correct! +${walls}🧱 ${swamp}🌿 defenses` +
        (hintsUsed ? ` <span class="dim">(used ${hintsUsed} hint${hintsUsed > 1 ? "s" : ""} — that's fine, you learned it!)</span>` : "") +
        `<br><span class="explain">${q.explain}</span>`;
      el.feedback.className = "good";
      el.submit.textContent = "Continue";
      el.hintBtn.disabled = true;
      el.body.querySelectorAll(".choice").forEach((x, i) => {
        x.disabled = true;
        if (i === q.answer) x.classList.add("correct");
      });
    } else {
      stats.wrong++;
      el.feedback.innerHTML =
        `❌ Not quite — try again. <span class="dim">Stuck? Use a hint; it won't fail you.</span>`;
      el.feedback.className = "warn";
    }
  }

  el.hintBtn.onclick = showHint;
  el.submit.onclick = submit;
  el.close.onclick = closeModal;
  el.modal.onclick = (e) => { if (e.target === el.modal) closeModal(); };

  return {
    open,
    getStats: () => ({
      attempts: stats.attempts,
      correct: stats.correct,
      wrong: stats.wrong,
      hints: stats.hints,
      byDiff: stats.byDiff,
      concepts: [...stats.concepts],
    }),
    destroy() { el.modal.hidden = true; },
  };
}
