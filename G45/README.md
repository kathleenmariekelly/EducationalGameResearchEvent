# 🐒 The Monkey's Pointer Challenge

An educational browser game that teaches **C++ pointers** through a marooned-on-an-island
story. A monkey holds your belongings hostage and quizzes you on what he's "pointing at."
Answer correctly to earn points and mystery bags; reach **100 points** to win.

Designed for students who have *seen* pointers before but struggle to apply them.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The game. Open in any browser — no install needed. |
| `questions.html` | Self-grading 10-question post-game quiz (application-based). |
| `answers.md` | Plain-text answer key with justifications. |
| `README.md` | This file. |

## How to play

1. Open **`index.html`** in a web browser (double-click it, or serve the folder).
2. Read the lore, click **"I accept the challenge."**
3. For each question, read the C++ code + memory diagram and pick the correct answer.
   - ✅ Correct → points (easy 1 / medium 2 / hard 3) + pick a mystery bag.
   - Need help? Use **hints**: hint 1 free, hint 2 = −1 pt, hint 3 = −2 pts.
   - ❌ Wrong → 0 points + a **debuff** of 3 easy questions (hints disabled).
     Miss one and the debuff resets; clear all 3 to resume earning items.
4. Reach **100 points** to win back your belongings.

## Concepts covered

Address-of (`&`) · dereference (`*`) · writing through a pointer · references vs copies ·
pass-by-value vs pass-by-reference · pointer arithmetic · arrays & pointers ·
double pointers (`**`) · null pointers · dangling pointers · `const int*`.

## The quiz

Open **`questions.html`**, answer all 10, and click **"Grade my quiz"** for an instant
score with per-question explanations. Every question tests *application* (predict behavior,
compare outcomes, spot a bug) rather than recall. Instructor key is in `answers.md`.

## Running with a local server (optional)

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/index.html
```
