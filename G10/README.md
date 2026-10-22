# Type Racer

An educational game about: **identifying Python variable types and the types that functions/expressions produce**.

## Pitch
A pseudo-3D racer (Mario Kart 64 vibe). The track recedes toward a
horizon with drifting parallax scenery that rotates each race between
three themes — **grass**, **desert**, and a **city** with big lit
buildings streaming past, and ahead sit **boost pads** — one per Python type
(`int`, `float`, `str`, `bool`, `list`) with the type name floating above. A value
scrolls in (e.g. `x = 3.14`); drive over the pad matching its type for a
**speed boost**: each correct pad raises your top speed by 0.5 (from a
2.5 base up to 4.5). A **wrong pad resets your speed to 1.0**, and
**crashing a rival knocks you backward** and lets the CPUs pull ahead.
The race is **distance-based** (progress fills a track %, not a fixed
number of questions), roughly **a minute long** across **3 laps** to the
**finish line**. **Rare boost ramps** ⚡ launch the car into the air in slow motion; an
6-arrow sequence appears on a side panel and you press the arrows in
order (~1.4s each). Nail it and the car lands in a big fire cloud and
tears off much faster (this part is reflex-based, not Python). Rival CPU cars drive on the track
ahead of you — weave around them (a crash slows you down) while still
picking the right type lane. Beat the CPU racers and set your best time. Built for intro CS students: speed becomes a direct measure of how
fast you can classify types.

## Controls
- Move between lanes: **A / D** or **← / →** (wraps around the edges)
- **Hold W / ↑ to accelerate** — speeds you up to catch the CPUs
- **Hold S / ↓ to brake** — slow down to slip around rival cars
- Start / restart: **SPACE** or **ENTER**
- Toggle music: **M**    Toggle sound fx: **N**

A 5-second **how-to-play infographic** shows before each race (press
SPACE to skip it).

## Audio
Music and sound effects are synthesized at runtime with the Web Audio
API — no audio files, no network, nothing to download. Browsers only
allow audio after a user gesture, so sound starts when you press
SPACE/ENTER to begin a race.

## Run locally (pick ONE)

You need a local web server (opening index.html directly won't work
because the game uses JavaScript modules). Any of these work:

**Node.js:**
```
npx serve .
```

**Python 3:**
```
python -m http.server 8000
```
then open http://localhost:8000

**VS Code:** right-click `index.html` -> "Open with Live Server".

## Package for handoff
From the parent folder (needs a bash shell + zip):
```
./scripts/package-local.sh type-racer <session-file-path>
```

## Content
All prompts live in `src/scenarios.js` as a large shuffled data pool
(~60 varied examples across int / float / str / bool / list), covering
variables and many built-ins: `len`, `abs`, `sum`, `max`, `min`,
`int`/`float`/`str`/`list`, `round`, `input`, `print`, `sorted`,
`.upper()`/`.lower()`, `.split()`, `.join()`, `range`, comparisons, and
more. The deck is reshuffled as you play so you rarely see repeats. No
network calls, no API keys — safe as a static site.
