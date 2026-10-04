# Mnemosyne

A personal memory-sport training app (method of loci / memory palaces), built for a ~1 year run-up to a memory competition. It's a single self-contained HTML file — no build step, no framework, no backend.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for the full handoff: tech stack, data model, feature inventory, known issues, and reversed decisions.

## Running it

Just open `mnemosyne.html` in a browser. All state is stored in `localStorage` (prefixed `mnemosyne:`), so it works fully standalone — double-click the file, or host it anywhere static. The 3D castle loads Three.js from cdnjs, so it needs an internet connection the first time.

## Features

- **The Castle (3D palace)**: walk a robed explorer (third person) through a generated castle — Courtyard, Entrance Hall, Great Hall, Portrait Gallery, Library, Potions Dungeon, Armoury, Astronomy Tower. 40 numbered stations, each a distinct object (iron gate, cauldron, telescope…), along one fixed route. Press **E** at a glowing circle to leave a memory (text and/or a picture); it floats there as a parchment card. **Start recall walk** sends you back to the gate to walk the route forward-only, revealing and self-marking each memory; the score feeds the same history and spaced-repetition schedule as any palace. Library decks can be sent straight into the castle. Controls: WASD/arrows, Shift to run, drag to look, scroll to zoom, M for the map (click a station on the big map to jump there while studying). On phones: on-screen joystick + Use button.
- **Learn**: a 6-level, 18-lesson curriculum on memory technique (grounded in Kevin Horsley's *Unlimited Memory*, with confirmed gaps filled from general competitive-memory technique).
- **Palaces**: build memory palaces, add/reorder/delete stations with text and photos, walk them in study mode (editable in place) or recall mode (strict forward-only, self-marked, feeds spaced repetition).
- **Library**: upload a PDF or type text manually, auto-chunk into items, get AI-generated image suggestions, star items to learn, send marked items straight into a palace.
- **Drills**: 5 Memory-League-style timed disciplines — Numbers, Words, Images, Cards, Names & Faces — gated behind relevant lessons.
- **3D Explore**: a small hand-verified catalog of real 3D/360° palace references (Sketchfab + YouTube), one click away from becoming an actual palace.
- **Number Systems**: an editable Major System (100 default number-words) and PAO table (Person-Action-Object), fully overridable.
- **Dashboard & History**: curriculum progress, streaks, spaced-repetition due dates, full session log.

## Testing

12 self-contained smoke test files in `tests/`, using `jsdom` with no test framework dependency — each spins up the app in a simulated DOM and runs hand-rolled assertions (270 checks total).

```bash
npm install
npm test
```

Or run a single file directly: `node tests/smoke_test2.js` (must be run from the repo root, since tests read `mnemosyne.html` relative to the current directory).

The castle needs real WebGL, so it also has a real-browser test (headless Chromium via Playwright, 33 checks: rendering, walking, collisions, every station reachable, saving memories, a full recall walk, phone size). It serves Three.js from `node_modules`, so no network is needed:

```bash
npx playwright install chromium   # once
npm run test:browser              # screenshots land in tests/browser/screenshots/
```

**Known test-coverage gap**: the Sketchfab/YouTube embeds in 3D Explore are still only verified structurally (correct URL, correct attributes), never confirmed to actually render.
