# Code Master 🎮

A fun, arcade-style **CS test-prep game**. Answer real coding questions across
**C++, C, Java, Python, JavaScript, and SQL** — woven into four playable game modes.
Built as static HTML/CSS/JS: no install, no build step, no backend.

## ▶️ How to run

Just open **`index.html`** in any modern browser (Chrome, Edge, Firefox, Safari).

> Tip: audio only starts after the first click (a browser rule) — the warning
> screen's "Continue" button handles that.

## 🌐 How to publish (free)

It's all static files, so any static host works:

- **GitHub Pages** — push this folder to a repo, then Settings → Pages → deploy from `main`.
- **Netlify / Vercel** — drag-and-drop the folder onto their dashboard.
- **itch.io** — zip the folder and upload as an HTML5 game.

No server or database required.

## 🕹️ Game modes

| Mode | What you do |
|------|-------------|
| 🧠 **Classic Quiz** | Timed Kahoot-style questions; 3 lives, streak bonuses. |
| 🏀 **Basketball** | 1-on-1 vs CPU to 21. Shoot, dunk, pass. A question at least every 30s. |
| 👻 **Code-Man** | Pac-Man maze: eat dots, dodge bug-ghosts, ❓ pellets = questions. |
| 🚔 **Cops & Robbers** | First-person driving: do jobs & grab cash; 3 crashes → cop-chase question. |

Plus a **Character Creator**, **Zen Mode** (no timer/lives), **difficulty ramp**,
**per-language certificates**, and **local save slots** (username only — no
passwords, no personal data).

## 📚 Content

- **156 questions** across 6 languages (5–6 levels each), every answer with an
  explanation for real test-prep value.
- **Scramble** mode mixes all languages together.
- Questions are dealt from a shuffled per-language deck, so **each play is different**.

## 🔒 Privacy / safety

- No accounts, emails, or passwords. A "username" is just a **local save slot**
  stored in your browser (`localStorage`). Clearing site data removes it.
- Saves live only in that one browser — there is no server.

## 🗂️ Project structure

```
index.html      # markup + all screens
style.css       # visual theme ("Inside the Machine")
questions.js    # the question bank (edit here to add questions)
game.js         # core flow: menus, quiz, scoring, saves, wiring
avatar.js       # customizable character + creator
basketball.js   # Basketball mode
pacman.js       # Code-Man mode
gta.js          # Cops & Robbers (first-person driver)
audio.js        # synthesized music + sound effects
matrix.js       # animated background
```

## ✏️ Adding questions

Open `questions.js` and add to any language's levels. Question types:

```js
{ type:"mc",        text:"...", options:["a","b","c","d"], answer:0, explain:"..." }
{ type:"truefalse", text:"...", answer:true, explain:"..." }
{ type:"type",      text:"...", answer:["accepted","also ok"], explain:"..." }
```

Answer matching ignores spacing, capitalization, and quote style, and any
`type` question can accept multiple correct forms via an array.

## ⚠️ Note

Contains flashing lights and motion — a brightness/photosensitivity warning is
shown before play.
