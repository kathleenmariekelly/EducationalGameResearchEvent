# Discrete Quest — Math Battle Arena

An educational, Prodigy-style RPG that teaches **Discrete Mathematics** for CS
undergrads. You explore a pixel-art open world of biomes, and every attack
requires solving a discrete-math problem to cast a spell.

## How to run

No build step, no server, no dependencies. Just open **`index.html`** in any
modern web browser (double-click it, or drag it into a browser window).

> The pixel UI font (Press Start 2P) loads from Google Fonts on first run and
> then caches; offline it falls back to a monospace font.

## Files

| File             | Purpose                                                        |
|------------------|---------------------------------------------------------------|
| `index.html`     | Game UI, layout, and styling (the page you open to play).     |
| `game.js`        | All game logic: problem generators, battles, overworld, etc.  |
| `questions.html` | 10-question knowledge check (application questions, no answers)|
| `answers.md`     | Answer key + reasoning for `questions.html`.                   |
| `README.md`      | This file.                                                     |
| `session-transcript.md`    | Human-readable transcript of the build session (in the zip). |
| `session-transcript.jsonl` | Full raw transcript of the build session (in the zip).       |

## Gameplay / features

- **Topics taught:** Sets, Combinatorics, Number Theory, Propositional Logic,
  Sequences & Summations — each auto-generates endless problems with worked
  explanations.
- **Spells & type matchups:** 5 elemental spells (🔮 Arcane, 🔥 Fireball, ❄️ Frost,
  ⚡ Volt, 🌿 Bramble). Match a monster's weakness for a critical hit.
- **Open world:** Scrolling camera, minimap, and 6 themed biomes (Meadow,
  Desert, Tundra, Cavern, Swamp, Volcano) with biome-specific monsters and decor.
- **Bosses:** Clearing a biome's regular monsters summons its boss, which drops
  rare crafting materials.
- **Rewards & crafting:** Monsters drop themed items; craft healing potions and
  permanent buffs (including legendary recipes needing boss drops).
- **Quests:** A staged main quest ("Lift the Chaos Curse") plus biome side quests,
  tracked in a Quest Log with rewards.

## Assessment

`questions.html` is a printable/shareable 10-question quiz where each item
requires *applying* a concept (predicting behavior, comparing outcomes, or
spotting an error). Correct answers and reasoning are in `answers.md`.
