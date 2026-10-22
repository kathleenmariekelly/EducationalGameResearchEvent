# CodeQuest: Steve's Journey Home

An educational browser game that teaches C++ by having the player write
real C++-flavored code to guide a Minecraft-style character (Steve) home
across a grid.

## How to play

Serve the folder and open it in a browser:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Write code in the editor, press **▶ Run**, and watch Steve execute your
commands step by step. Reach the house to earn stars and points.

## Home screen

The game opens on a home screen with:
- **Your Coder** card: account level, rank title, and an XP progress bar.
- **Customize**: pick from 6 character skins (saved automatically).
- **Levels**: a level-select grid showing locked/unlocked levels and
  your best star rating on each. Levels unlock as you finish the prior one.
- **Reset all progress**: wipe saved data.

## Learning progression (assistance fades)

- **Level 1** — Read working code, press Run. Learn statements & `;`.
- **Level 2** — Add `moveForward();` lines yourself.
- **Level 3** — Turning with `turnLeft()` / `turnRight()`.
- **Level 4** — Fill in a `for` loop blank.
- **Level 5** — Write your own loops + turns around a wall.
- **Level 6** — Conditions with `while (pathClear())`.
- **Level 7** — Empty editor, full maze. Solo graduation.
- **Level 8** — Collect diamonds and `jump()` over walls.
- **Level 9** — Define and call a function: `void goHome() { ... }`.

## XP, levels, and scoring

- Solving a level awards up to 3 stars based on how few commands you
  used vs. the level's "par".
- Each level grants **XP** (scaled slightly by stars). XP accumulates
  across sessions (saved in the browser) and fills your account-level bar.
- Account levels use a gentle curve (Level N needs N*100 XP to advance),
  so you don't jump straight from Level 1 to 2 — progress is gradual.
- Crossing a threshold shows a **LEVEL UP!** celebration and a new rank
  title (Beginner → Novice → Apprentice → Coder → ...).

Progress persists via `localStorage`, so closing the tab keeps your XP,
completed levels, and chosen skin.

## Commands available to the player

```cpp
moveForward();
turnLeft();
turnRight();
jump();                       // leap over one wall tile ahead
for (int i = 0; i < N; i++) { ... }
while (pathClear()) { ... }
if (pathClear()) { ... }
void name() { ... }           // define a function
name();                       // call your function
```

## Project structure

- `index.html` — entry point (required name for packaging).
- `style.css` — styling.
- `src/main.js` — game engine: home screen, rendering, animation, XP, levels.
- `src/levels.js` — level definitions (grid, walls, gems, goal, starter, XP).
- `src/interpreter.js` — safe (no `eval`) C++-command interpreter.
- `src/progress.js` — XP/level math, skins, and localStorage save/load.

## Notes for extending

Add new levels by appending objects to `LEVELS` in `src/levels.js`.
To add new commands (e.g. `jump()`), extend `parseStatement()` in
`src/interpreter.js` and the animation switch in `main.js`.
