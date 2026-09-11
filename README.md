# Mnemosyne

A personal memory-sport training app (method of loci / memory palaces), built for a ~1 year run-up to a memory competition. It's a single self-contained HTML file — no build step, no framework, no backend.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for the full handoff: tech stack, data model, feature inventory, known issues, and reversed decisions.

## Running it

Just open `mnemosyne.html` in a browser. All state is stored in `localStorage` (prefixed `mnemosyne:`), so it works fully standalone — double-click the file, or host it anywhere static.

## Features

- **Learn**: a 6-level, 18-lesson curriculum on memory technique (grounded in Kevin Horsley's *Unlimited Memory*, with confirmed gaps filled from general competitive-memory technique).
- **Palaces**: build memory palaces, add/reorder/delete stations with text and photos, walk them in study mode (editable in place) or recall mode (strict forward-only, self-marked, feeds spaced repetition).
- **Library**: upload a PDF or type text manually, auto-chunk into items, get AI-generated image suggestions, star items to learn, send marked items straight into a palace.
- **Drills**: 5 Memory-League-style timed disciplines — Numbers, Words, Images, Cards, Names & Faces — gated behind relevant lessons.
- **3D Explore**: a small hand-verified catalog of real 3D/360° palace references (Sketchfab + YouTube), one click away from becoming an actual palace.
- **Number Systems**: an editable Major System (100 default number-words) and PAO table (Person-Action-Object), fully overridable.
- **Dashboard & History**: curriculum progress, streaks, spaced-repetition due dates, full session log.

## Testing

11 self-contained smoke test files in `tests/`, using `jsdom` with no test framework dependency — each spins up the app in a simulated DOM and runs hand-rolled assertions (241 checks total, all passing).

```bash
npm install
npm test
```

Or run a single file directly: `node tests/smoke_test2.js` (must be run from the repo root, since tests read `mnemosyne.html` relative to the current directory).

**Known test-coverage gap**: jsdom has no real WebGL/canvas and doesn't execute cross-origin iframe content, so 3D/360° embeds are only verified structurally (correct URL, correct attributes), never confirmed to actually render. Real browser testing (Playwright or similar) is the highest-value testing upgrade still open.
