# CIPHERPUNK — Zone 1: The Tunnels

An educational, sci-fi turn-based RPG that teaches **cryptography and ciphers** to CS
students with no prior background. This build is a complete **vertical slice** covering
the first cipher: the **Caesar shift**.

> You're a Flock Corp defector hiding in decommissioned subway tunnels. Flock's AI can
> crack any code a machine makes — but never learned the old *human* ciphers. Your rogue-AI
> mentor **DAEMON** teaches you those forgotten codes so you can slip past the machines.

---

## Learning objectives

By finishing Zone 1 a student can:

1. **Identify** the Caesar cipher and the core vocabulary (plaintext, ciphertext, key).
2. **Evaluate** a Caesar ciphertext to recover its true value (encode *and* decode, including wrap-around).
3. **Recognize** the cipher quickly and reason about it (keyspace, composition, common mistakes).

The design is a **study-cycle-with-a-test**: explore and learn → a battle quizzes you →
failing sends you back to re-study. You can't progress without demonstrating understanding.

---

## Files

| File | Audience | Purpose |
|------|----------|---------|
| `index.html`     | Students | The game. Open in any browser — no install. |
| `questions.html` | Students | 10-question application-based knowledge check (no answers shown). |
| `answers.md`     | **Instructor only** | Answer key with justifications. **Do not distribute to students.** |
| `README.md`      | Everyone | This file. |
| `LICENSE`        | Everyone | Usage terms. |

---

## How to play

1. Double-click **`index.html`** (works in Chrome, Edge, Firefox, Safari).
2. Move with **← ↑ ↓ →** or **WASD**. Interact / advance dialogue with **Space** or **Enter**.
3. Suggested path: talk to **DAEMON (👾)** → read the **graffiti wall (🖋️)** → play with the
   **decoder wheel (🎡)** → drill on the **practice terminal (🖥️)** → decode the **datapad (📟)**
   → crack the **keypad (🔒)** to drop the drone's shield → beat the **drone (🤖)** → open the
   **cache (🎁)** → leave through the **gate (🚪)**.

### The battle (knowledge check)
- Pick an attack — **stronger attacks ask harder Caesar questions** (higher risk, higher reward).
- **☠️ Zero-Day** is an instant-KO gamble: decode a word with **no shift given**, or take a full counter.
- When the drone attacks, **answer its prompt to halve the damage**.
- **Lose** → you're returned to study; DAEMON will **review the exact questions you missed**.
- An **A–Z reference strip** is on screen throughout. Spaces and letter case are ignored in answers.

---

## Using this in a course

- **In class / lab:** have students play `index.html` to completion (~10–15 min), then take
  `questions.html` as an individual check. Grade with `answers.md`.
- The quiz is **application-based** (predict, compare, spot the error) — the correct answers
  can't be guessed without actually understanding the cipher. Correct-letter positions are
  shuffled (C, B, D, A, C, B, D, A, C, B).
- **Everything runs offline** in a browser; nothing is uploaded and no accounts are needed.

---

## Sharing / distribution

Because it's plain HTML, you have easy options:

- **Send the folder:** right-click the `my-game` folder → *Send to → Compressed (zipped) folder*,
  then share the `.zip`. (Remove `answers.md` first if sending to students.)
- **Host it free:** drop `index.html` (and `questions.html`) on any static host — GitHub Pages,
  Netlify, or your LMS — and share the link.

---

## Roadmap (future zones)

Each zone follows the same reusable template (explore → learn → cipher-locked gate → battle →
mastery unlocks hidden lore):

1. ✅ **Zone 1 — Caesar** (this build)
2. Zone 2 — **Atbash** (mirror substitution)
3. Zone 3 — **Morse**
4. Zone 4 — **Binary / ASCII**
5. Zone 5 — **Rail Fence** (transposition)
6. Zone 6 — **Base64**
7. Boss zone — **Vigenère**

---

## Tech notes

- Single-file game: HTML + CSS + vanilla JavaScript, `<canvas>` tile map, no dependencies or build step.
- No external assets — icons are emoji, art is drawn with CSS/canvas.
- Tested to run by opening the file directly (`file://`) — no server required.

*Built as a teaching prototype. Cipher content is historically standard; balance and content are easy to extend.*
