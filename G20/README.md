# CodeTris

A Tetris-style educational game where the falling blocks are **code**. To clear
a line you have to stack the pieces so the row forms a **valid line of code** —
so you're reasoning about the code, not just filling rows.

## Concept taught

Primary topic: **conditionals & branching**. The game trains:

- the **anatomy/order** of a conditional — `keyword → variable → comparator → number → action`
- **comparator meaning** — `>` vs `>=`, `<` (exclusive), `==`
- **first-true-wins** ordering and **dead branches** (a broad condition placed
  above a specific one swallows the cases meant for it)

Two more selectable topics reuse the same mechanic:

- **Loops (for / range)** — `for i in range(10):`, with a read-back showing it
  runs 10 times (i = 0…9)
- **Strings: indexing & slicing** — `"hello"[1:3]`, which computes the actual
  result so the exclusive-end rule is visible on every clear

## How to run

No install, no server, no internet needed. Just open **`index.html`** in any
modern web browser (double-click it).

## How to play

1. Pick a topic from the start menu.
2. Blocks fall from the middle. Slide each colored cell into its matching
   role-column and stack pieces so a row reads as a valid line.
3. A full, valid row clears and reads the code back; an invalid full row flashes
   **INCORRECT LINE**. Clear several at once for a combo.

### Controls

| Key | Action |
|-----|--------|
| ← → | move piece |
| ↑ | rotate |
| Z | pick a cell in the current piece |
| X | change that cell's value |
| ↓ | soft drop |
| Space | hard drop |
| C | hold |
| ☰ Topic | change topic |

## Files

- `index.html` — the game (self-contained)
- `questions.html` — 10-question playtester quiz (open in its own tab; no answers shown)
- `answers.md` — answer key for the quiz (kept separate)
- `README.md` — this file
