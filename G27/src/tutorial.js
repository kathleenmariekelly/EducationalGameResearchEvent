// ORBITAL — Academy Orientation (tutorial)
// A self-contained, beginner-friendly first level that teaches algorithm &
// data-structure fundamentals using the station theme, then guides the player
// into the Cargo Bay Manifest mission. This file does NOT modify the mission
// engine — it only adds an overlay + a mission-list card + a revisit button.

const TUTORIAL_STEPS = [
  // 1 — What is an algorithm
  {
    title: "Welcome aboard, Cadet",
    html:
      `<p>You're now on the deck of <b>ORBITAL Station</b>. Every task here — finding a ` +
      `crate, docking a ship, routing a shuttle — is solved by an <b>algorithm</b>.</p>` +
      `<div class="tut-card"><span class="tut-key">ALGORITHM</span>` +
      `A step-by-step recipe for getting a job done.</div>` +
      `<p>Example — <b>finding cargo</b>. To locate container <code>#4471</code> in the bay, ` +
      `a simple algorithm is:</p>` +
      `<ol class="tut-steps"><li>Look at the first crate.</li>` +
      `<li>Is it #4471? If yes, stop — found it.</li>` +
      `<li>If no, move to the next crate and repeat.</li></ol>` +
      `<p class="tut-note">That's it. An algorithm is just clear, repeatable steps a ` +
      `computer (or a station officer) can follow.</p>`,
  },

  // 2 — What is a data structure
  {
    title: "How the station stores things",
    html:
      `<p>An algorithm needs its data organized. That organization is a ` +
      `<b>data structure</b>.</p>` +
      `<div class="tut-card"><span class="tut-key">DATA STRUCTURE</span>` +
      `A way of organizing information so algorithms can use it efficiently.</div>` +
      `<p>The same crates can be stored in different ways, and the storage choice ` +
      `changes how fast your algorithm runs:</p>` +
      `<ul class="tut-list">` +
      `<li>A plain <b>shelf list</b> (an array) — quick to add to, slow to search.</li>` +
      `<li>A <b>labeled index</b> (a hash map) — near-instant lookup by ID.</li></ul>` +
      `<p class="tut-note">Pick the right structure and a slow job becomes a fast one. ` +
      `That's the core skill ORBITAL trains.</p>`,
  },

  // 3 — Station toolkit part 1 + knowledge check
  {
    title: "Your data-structure toolkit — Part 1",
    html:
      `<div class="tut-grid">` +
      `<div class="tut-tool"><b>Array</b><span>An ordered list of slots.</span>` +
      `<em>Cargo manifest: crate 0, 1, 2, 3…</em></div>` +
      `<div class="tut-tool"><b>Stack</b><span>Last in, first out (LIFO).</span>` +
      `<em>Stacked supply crates — take the top one first.</em></div>` +
      `<div class="tut-tool"><b>Queue</b><span>First in, first out (FIFO).</span>` +
      `<em>Ships waiting to dock — first to arrive docks first.</em></div>` +
      `<div class="tut-tool"><b>Hash Map</b><span>Key → value, instant lookup.</span>` +
      `<em>Container ID → shelf location.</em></div>` +
      `</div>`,
    check: {
      question:
        "Ships line up for docking clearance. The first ship to arrive should be " +
        "served first. Which structure fits best?",
      options: ["Stack (last in, first out)", "Queue (first in, first out)", "Hash Map"],
      answer: 1,
      explain:
        "A queue is first-in, first-out — exactly how an orderly docking line works. " +
        "You'll use this idea in Docking Queue Control.",
    },
  },

  // 4 — Station toolkit part 2 + knowledge check
  {
    title: "Your data-structure toolkit — Part 2",
    html:
      `<div class="tut-grid">` +
      `<div class="tut-tool"><b>Searching</b><span>Finding an item in data.</span>` +
      `<em>Locating a crate in the bay.</em></div>` +
      `<div class="tut-tool"><b>Sorting</b><span>Ordering items by a rule.</span>` +
      `<em>Ordering ships by docking priority.</em></div>` +
      `<div class="tut-tool"><b>Priority Queue</b><span>Highest-priority item served first.</span>` +
      `<em>Emergency requests jump ahead of routine ones.</em></div>` +
      `<div class="tut-tool"><b>Graph</b><span>Nodes joined by connections.</span>` +
      `<em>Stations linked by jump-gates.</em></div>` +
      `</div>` +
      `<p class="tut-note">A <b>graph</b> is just dots (stations) connected by lines ` +
      `(routes). Navigating between stations is a graph problem.</p>`,
    check: {
      question:
        "A medical emergency request must be handled before routine ones, even if it " +
        "arrived later. Which idea handles this?",
      options: ["Plain queue", "Priority queue", "Stack"],
      answer: 1,
      explain:
        "A priority queue always serves the most urgent item first — perfect for " +
        "emergency requests. You'll meet this in Docking Queue Control.",
    },
  },

  // 5 — Big O intro
  {
    title: "Measuring effort: Big O notation",
    html:
      `<p>Two algorithms can both be <b>correct</b> but one can be far faster. ` +
      `<b>Big O notation</b> describes how the work grows as the data gets bigger.</p>` +
      `<div class="tut-card"><span class="tut-key">BIG O</span>` +
      `A shorthand for how an algorithm's work scales as the input (n) grows.</div>` +
      `<p>Imagine the cargo bay grows from 10 crates to 10,000 crates:</p>` +
      `<ul class="tut-list">` +
      `<li>Checking every crate one-by-one gets slower <b>in proportion</b> to the count.</li>` +
      `<li>Looking it up in an index stays <b>about the same speed</b> no matter the count.</li>` +
      `</ul>` +
      `<p class="tut-note">Big O ignores exact numbers and focuses on the ` +
      `<b>shape</b> of the growth — that's what matters at scale.</p>`,
  },

  // 6 — Reading complexity labels + knowledge check
  {
    title: "Reading complexity labels",
    html:
      `<p>Here are the labels you'll see on ORBITAL missions, slowest-growing at the top:</p>` +
      `<table class="tut-table"><thead><tr><th>Label</th><th>Meaning</th><th>Station example</th></tr></thead>` +
      `<tbody>` +
      `<tr><td><code>O(1)</code></td><td>Constant — same effort regardless of size</td><td>Look up a crate by ID in an index</td></tr>` +
      `<tr><td><code>O(log n)</code></td><td>Grows very slowly; halves the search each step</td><td>Binary search in a sorted manifest</td></tr>` +
      `<tr><td><code>O(n)</code></td><td>Linear — effort grows with the count</td><td>Scan every crate once</td></tr>` +
      `<tr><td><code>O(n log n)</code></td><td>A bit more than linear</td><td>Sorting all docking ships efficiently</td></tr>` +
      `<tr><td><code>O(n²)</code></td><td>Grows fast — every item vs every other item</td><td>Comparing every ship to every other ship</td></tr>` +
      `</tbody></table>` +
      `<p class="tut-note">Lower on this list = more work as data grows. ` +
      `<code>O(1)</code> is the dream; <code>O(n²)</code> is a warning sign.</p>`,
    check: {
      question: "Which of these does the LEAST extra work as the data gets very large?",
      options: ["O(n²)", "O(n)", "O(1)"],
      answer: 2,
      explain:
        "O(1) is 'constant time' — it takes about the same effort whether you have " +
        "10 crates or 10 million. That's why a hash-map lookup is so powerful.",
    },
  },

  // 7 — Correctness vs efficiency + knowledge check
  {
    title: "Correctness vs. efficiency",
    html:
      `<p>Two different things decide how good a solution is:</p>` +
      `<div class="tut-grid">` +
      `<div class="tut-tool"><b>Correctness</b><span>Does it give the right answer?</span>` +
      `<em>Did you actually find the right crate?</em></div>` +
      `<div class="tut-tool"><b>Efficiency</b><span>How much work did it take?</span>` +
      `<em>Did you check all 10,000 crates, or jump straight to it?</em></div>` +
      `</div>` +
      `<p>In ORBITAL you'll <b>▶ Run Tests</b> to check correctness first. Then ` +
      `<b>⇧ Submit</b> measures efficiency against a target complexity.</p>` +
      `<p class="tut-note">A correct-but-slow answer still solves the mission — but you ` +
      `earn bonus credits and unlock tools by making it efficient too.</p>`,
    check: {
      question:
        "Your code returns the right crate, but scans all 10,000 crates every time. " +
        "How would you describe it?",
      options: [
        "Incorrect",
        "Correct but not yet efficient",
        "Both correct and efficient",
      ],
      answer: 1,
      explain:
        "It's correct (right answer) but not efficient (does far more work than needed). " +
        "Switching to a hash-map index would make it efficient too.",
    },
  },

  // 8 — How ORBITAL missions work
  {
    title: "How ORBITAL missions work",
    html:
      `<p>Each mission shows a <b>TARGET COMPLEXITY</b> — the efficiency Command expects ` +
      `you to reach. This target represents the <b>desired algorithmic efficiency</b> ` +
      `for that job.</p>` +
      `<ul class="tut-list">` +
      `<li><b>▶ Run Tests</b> — checks your solution is <i>correct</i>.</li>` +
      `<li><b>⇧ Submit</b> — runs your code on a large input and measures the actual ` +
      `work done, comparing it to the target.</li>` +
      `<li>Beat the target → earn <b>bonus credits</b>, unlock a <b>new tool</b>, ` +
      `and climb the ranks.</li></ul>` +
      `<p class="tut-note">The target isn't busywork — it's the Big O the pros aim for. ` +
      `Reaching it is how you prove you chose the right data structure.</p>`,
  },

  // 9 — Mission map / connections
  {
    title: "Your mission map",
    html:
      `<p>Here's what each station operation teaches, and the efficiency to aim for:</p>` +
      `<div class="tut-missionmap">` +
      `<div class="tut-mrow"><b>Cargo Bay Manifest</b>` +
      `<span>Searching &amp; hash maps — turn an <code>O(n)</code> scan into an ` +
      `average <code>O(1)</code> lookup.</span></div>` +
      `<div class="tut-mrow"><b>Docking Queue Control</b>` +
      `<span>Sorting &amp; priority queues — order the ships in <code>O(n log n)</code>.</span></div>` +
      `<div class="tut-mrow"><b>Star Route Navigator</b>` +
      `<span>Graphs &amp; breadth-first search — find shortest routes in <code>O(V + E)</code>.</span></div>` +
      `</div>` +
      `<p class="tut-note">Start with Cargo Bay Manifest. You've got everything you need.</p>`,
  },

  // 10 — Ready
  {
    title: "Orientation complete",
    final: true,
    html:
      `<p>Nice work, Cadet. You now know:</p>` +
      `<ul class="tut-list">` +
      `<li>What an <b>algorithm</b> and a <b>data structure</b> are.</li>` +
      `<li>How arrays, stacks, queues, hash maps, sorting, searching, and graphs ` +
      `serve the station.</li>` +
      `<li>What <b>Big O</b> means and how to read <code>O(1)</code>, <code>O(log n)</code>, ` +
      `<code>O(n)</code>, <code>O(n log n)</code>, and <code>O(n²)</code>.</li>` +
      `<li>The difference between <b>correctness</b> and <b>efficiency</b>.</li></ul>` +
      `<p class="tut-note">You can revisit this orientation any time with the ` +
      `<b>📘 Orientation</b> button up top. Ready for your first assignment?</p>`,
  },
];

// ---------- tutorial state ----------
const tut = {
  step: 0,
  // answered[stepIndex] = chosen option index (or undefined)
  answered: {},
};

function tutBuildDots() {
  return TUTORIAL_STEPS.map(
    (_, i) => `<span class="tut-dot${i === tut.step ? " on" : ""}"></span>`
  ).join("");
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tut.step];
  const body = document.getElementById("tutBody");

  let html = `<h2 class="tut-h">${step.title}</h2>${step.html}`;

  if (step.check) {
    const chosen = tut.answered[tut.step];
    html += `<div class="tut-check"><div class="tut-q">🧠 Knowledge check</div>` +
      `<p class="tut-question">${step.check.question}</p><div class="tut-opts">`;
    step.check.options.forEach((opt, i) => {
      let cls = "tut-opt";
      if (chosen !== undefined) {
        if (i === step.check.answer) cls += " correct";
        else if (i === chosen) cls += " wrong";
      }
      html += `<button class="${cls}" data-opt="${i}">${opt}</button>`;
    });
    html += `</div>`;
    if (chosen !== undefined) {
      const right = chosen === step.check.answer;
      html += `<div class="tut-feedback ${right ? "ok" : "no"}">` +
        `${right ? "✓ Correct. " : "✗ Not quite. "}${step.check.explain}</div>`;
    }
    html += `</div>`;
  }

  body.innerHTML = html;
  body.scrollTop = 0;

  // wire knowledge-check options
  if (step.check) {
    body.querySelectorAll(".tut-opt").forEach((btn) => {
      btn.onclick = () => {
        tut.answered[tut.step] = parseInt(btn.dataset.opt, 10);
        renderTutorialStep();
      };
    });
  }

  // progress + nav
  document.getElementById("tutBar").style.width =
    ((tut.step + 1) / TUTORIAL_STEPS.length) * 100 + "%";
  document.getElementById("tutDots").innerHTML = tutBuildDots();
  document.getElementById("tutBack").disabled = tut.step === 0;

  const next = document.getElementById("tutNext");
  next.textContent = step.final ? "Enter Cargo Bay Manifest →" : "Next →";
  next.className = step.final ? "success" : "primary";
}

function tutNext() {
  const step = TUTORIAL_STEPS[tut.step];
  if (step.final) {
    finishTutorial();
    return;
  }
  if (tut.step < TUTORIAL_STEPS.length - 1) {
    tut.step++;
    // mark done once the player reaches the final step
    if (TUTORIAL_STEPS[tut.step].final) markTutorialDone();
    renderTutorialStep();
  }
}

function tutBack() {
  if (tut.step > 0) {
    tut.step--;
    renderTutorialStep();
  }
}

function markTutorialDone() {
  if (typeof state === "object") {
    state.tutorialDone = true;
    if (typeof save === "function") save();
    if (typeof renderMissionList === "function") renderMissionList();
  }
}

function openTutorial(startStep) {
  tut.step = typeof startStep === "number" ? startStep : 0;
  renderTutorialStep();
  document.getElementById("tutorialOverlay").classList.remove("hidden");
}

function closeTutorial() {
  document.getElementById("tutorialOverlay").classList.add("hidden");
}

function finishTutorial() {
  markTutorialDone();
  closeTutorial();
  if (typeof openMission === "function") openMission("cargo");
  if (typeof toast === "function") {
    toast("Orientation complete — welcome to Cargo Bay Manifest, Cadet!", "unlock");
  }
}

// Build the tutorial card shown at the top of the mission list.
// Called from game.js renderMissionList().
function buildTutorialCard() {
  const done = typeof state === "object" && state.tutorialDone;
  const el = document.createElement("button");
  el.className = "mission-card tut-card-btn" + (done ? " solved" : "");
  el.innerHTML =
    `<span class="mc-title">📘 Academy Orientation</span>` +
    `<span class="mc-tags">Tutorial · Algorithm Fundamentals</span>` +
    (done ? `<span class="mc-badge">✓ REVIEWED</span>` : `<span class="mc-badge new">START HERE</span>`);
  el.onclick = () => openTutorial(0);
  return el;
}

// wire the topbar revisit button + overlay controls (DOM is ready: script at end of body)
(function wireTutorial() {
  const btn = document.getElementById("openTutorialBtn");
  if (btn) btn.onclick = () => openTutorial(0);
  const nextBtn = document.getElementById("tutNext");
  const backBtn = document.getElementById("tutBack");
  const closeBtn = document.getElementById("tutClose");
  if (nextBtn) nextBtn.onclick = tutNext;
  if (backBtn) backBtn.onclick = tutBack;
  if (closeBtn) closeBtn.onclick = closeTutorial;
  // click backdrop to close
  const overlay = document.getElementById("tutorialOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeTutorial();
    });
  }
})();
