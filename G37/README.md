# 🏰 Kingdom Defense

A **pathfinding tower-defense game that teaches algorithms**. Cute pet soldiers defend
your keep from marching invaders — but your defenses come from **answering algorithm
questions**. The more concepts you master, the stronger your kingdom.

Built as a study tool: watch BFS, DFS, Dijkstra, and A\* search the map in real time,
then apply what you see to survive.

---

## ▶ How to run

You need [Node.js](https://nodejs.org) installed (any recent version).

**Windows (easiest):** double-click **`start.bat`** — it launches the server and opens
your browser.

**Any OS (terminal):**
```bash
node server.js
```
Then open **http://localhost:8099** in your browser.

> The game uses JavaScript ES modules, so it must be served over `http://`
> (opening `index.html` directly as a file will not work).

---

## 🎮 How to play

1. **Pick your pets** in *Customize Kingdom* (soldiers, invaders, banner, path color).
2. **Start a level.** Invaders march from the ⛺ camp toward your 🏰 keep.
3. You start with almost no defenses — press **🧠 Earn Defenses** to answer a question.
   Correct answers give you soldiers and unlock advanced defenses.
4. **Place defenses** to block, slow, poison, and shoot the invaders:
   - **🐾 Soldier** — the only blocker: enemies path *around* it (reshaping the route),
     and it shoots nearby enemies.
   - **🌿 Swamp** — on-path mud; slows enemies to 50% (unlock: medium/hard question).
   - **❄️ Frost** — on-path ice; slows enemies to 40% so soldiers get more shots
     (unlock: medium/hard question).
   - **☠️ Gas** — on-path poison; damage over time (unlock: hard question).
5. **Survive all the waves** without your keep's HP hitting zero.

Harder questions unlock stronger defenses and pay out more — so learning literally
powers your kingdom.

---

## 🧠 The learning design

- **One algorithm per world**, each breaking the previous one's assumptions:
  - **BFS** — fewest steps; floods the map evenly.
  - **DFS** — dives deep and backtracks; finds *a* path, not the shortest.
  - **Dijkstra** — cost-aware shortest path.
  - **A\*** — heuristic-guided; a *bad heuristic* option shows what inadmissibility does.
- **Watch it think:** the faint blue "search frontier" shows every cell the algorithm
  explored; the gold line is the path it chose. The HUD shows **Path** length and
  **Visited** count so you can compare algorithms.
- **Questions escalate** easy → hard within a level, and harder levels start harder.
- **Hints scaffold instead of rescue:** progressive hints end in a fill-in-the-blank
  nudge, and after all hints the answer is revealed (so a timed player is never stuck).
  Using hints never fails you — learning always pays out.

---

## ✨ Study tools

- **✍️ My Questions** — write your own multiple-choice or free-response questions.
  They're saved locally and appear both **in matching levels** and **in flashcards**.
  Free-response answers are case-insensitive and accept multiple phrasings.
- **🃏 Flashcards** — flip through every question (built-in + yours) to study,
  filterable by topic, with shuffle and prev/next.
- **Results screen** after each level: accuracy, hints used, and concepts practiced.

---

## 📁 Project structure

| File | Purpose |
|------|---------|
| `index.html` | All screens (title, level select, customize, questions, flashcards, tutorial, play, results) + styles |
| `main.js` | Screen router and UI wiring |
| `game.js` | Game engine: grid, enemies, defenses, combat, rendering |
| `pathfinding.js` | BFS, DFS, Dijkstra, A\* (+ bad heuristic), min-heap |
| `levels.js` | The 5 levels (terrain, algorithm, waves, question pools) |
| `questions.js` | Built-in question bank (60+ questions) |
| `quiz.js` | The quiz modal (hints, answer reveal, rewards, stats) |
| `customquestions.js` | Load/save player-authored questions (localStorage) |
| `customize.js` | Kingdom customization (localStorage) |
| `bg.js` | Muted floating-emoji title background |
| `server.js` | Tiny static file server |
| `start.bat` | Windows one-click launcher |
| `questions.html` | Standalone 10-question concept check (no answers shown) |
| `answers.md` | Answer key for `questions.html` |

---

## 🗺️ Extending it

- **Add a level:** append to `LEVELS` in `levels.js` (set `terrain`, `algo`, `waves`,
  `quizAlgos`, `startTier`).
- **Add questions:** append to `QUESTIONS` in `questions.js`, or just use the in-game
  **My Questions** page.
- **Add an algorithm:** implement it in `pathfinding.js` and register it in `ALGOS`.

The engine is designed to be reused for later worlds (e.g. a Sorting Factory or graph
puzzles) with the same map + search visualization.

---

Made with 🐰 and a love of algorithms.
