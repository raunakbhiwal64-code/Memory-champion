# Mnemosyne — Project Handoff

A personal memory-sport training app (method of loci / memory palaces), built for a ~1 year run-up to a memory competition. Currently one self-contained HTML file, developed conversationally in Claude chat. This doc exists so a fresh Claude Code session doesn't have to reverse-engineer any of the above.

## What it is, in one paragraph

Mnemosyne teaches memory technique (curriculum mostly grounded in Kevin Horsley's *Unlimited Memory*, with general competitive-memory technique filling confirmed gaps), lets the user build and walk memory palaces with real content stored per station, extracts and helps memorize passages from uploaded PDFs, runs Memory-League-style timed drills across five disciplines, and includes editable number-encoding systems (Major System, PAO). A small catalog of real, hand-verified 3D/360 palace references (Sketchfab + YouTube embeds) is available as optional inspiration and can be turned into an actual palace with one click.

## Tech stack & hard constraints

- **Single HTML file**, `mnemosyne.html` — all CSS and JS inline, no build step, no framework.
- **Persistence**: `storageGet`/`storageSet` prefer `window.storage` (the Claude Artifacts runtime API) when present, and fall back to `localStorage` (prefixed `mnemosyne:`) otherwise — resolved, see "Persistence: resolved" below. The app is self-contained wherever it's opened.
- **Two external CDN scripts**: `pdf.js` (via cdnjs) for PDF text extraction in the Library, and Three.js r128 (via cdnjs, classic UMD build, global `THREE`) for the 3D castle. A-Frame was tried for 360° photo viewing and deliberately removed (see "Reversed decisions" below).
- **One live external API call**: the Library's "Suggest images (AI)" feature calls `https://api.anthropic.com/v1/messages` (model `claude-sonnet-4-6`) directly from the browser, no API key in the code. This works because the Claude Artifacts runtime injects auth for that specific endpoint. **Also won't work outside that runtime** without the developer supplying their own key/proxy.
- **3D/media catalog** (`PALACE_CATALOG` in the code): a hand-picked list of *real, individually verified* Sketchfab and YouTube embed IDs. There is no generic "pull any palace" API — that was evaluated and doesn't exist. Every entry was checked by hand; nothing is guessed.

## Data model

Everything lives under one `DB` object, each top-level key persisted to its own storage key:

- **`DB.palaces`**: `[{ id, name, description, loci: [{ id, title, content: {text, source} | null, image: dataURL | null }], createdAt, srs: {ef, interval, reps, dueAt, lastAt}, basedOn: {catalogId, name, place} | undefined }]`
  `srs` is SM-2 spaced-repetition state, written after a recall walk. `basedOn` links a palace to a `PALACE_CATALOG` entry if it was created via "Build a palace here."
  Castle palaces add `kind: 'castle'`, and each locus carries `anchor: 's01'..'s40'` tying it to a fixed station in `CASTLE_STATIONS`. `ensureCastleLoci` runs on load to keep a castle at exactly 40 loci in route order (content preserved), so stations can't be added, removed or reordered.
- **`DB.decks`**: `[{ id, title, sourceName, items: [{ id, text, marked: bool, suggestions: [string,string,string] | undefined }], createdAt, srs }]` — decks come from PDF extraction or manual entry; `marked` is the "want to learn this" flag; `suggestions` are AI-generated SEE-principle image ideas.
- **`DB.history`**: append-only log, capped at 500, `{ id, ts, type: 'drill' | 'palace-walk' | 'deck-recall', ...}`.
- **`DB.learn`**: `{ completed: [lessonId, ...] }` — curriculum progress; also gates which drills are unlocked.
- **`DB.majorSystem`**: `{ overrides: { '00'..'99': word } }` — user overrides on top of an independently-authored default word list (see below).
- **`DB.pao`**: `{ entries: { '00'..'99': {person, action, object} } }` — intentionally empty by default, no pre-filled examples.
- **`DB.numberSystemPref`**: `'major' | 'pao'` — which tab was last deliberately chosen (only updates on a direct tab click, not on link navigation from a lesson/drill).

## Feature inventory

- **Learn** (tab 1): 6 levels, 18 lessons, mark-as-learned checkboxes, "gap" flags on lessons that are general competitive-memory technique rather than confirmed from Horsley's book, "Try it" buttons that deep-link into the relevant tool.
- **Dashboard**: curriculum progress, palace/library/streak stats, a "Due for review" panel (SM-2-driven) with one-click jump into the recall session.
- **The Castle (3D palace)**: a generated castle rendered with Three.js, all geometry from primitives and canvas textures (no model files, no embeds). The layout is data in the main script: `CASTLE_ROOMS` (8 rooms as tile rectangles), `CASTLE_DOORS` and `CASTLE_STATIONS` (40 stations in route order, each with a distinct prop). The engine is a second inline `<script>` (`castleEngine`): instanced walls and floors, one warm point light per room, torches, a third-person robed character with a walk cycle, WASD/arrow/drag/wheel controls plus a touch joystick, grid + circle collision, a camera that never clips through walls, floating parchment memory cards, a parchment map (M; click a station on the big map to jump there while studying), and an E-to-interact memory panel (text + picture). Recall walk restarts at the gate and is forward-only through filled stations; it reuses `finishWalk()` so history and SM-2 are identical to the 2D walk. Library "Send to palace" always fills empty castle stations in route order. Without WebGL or Three.js it shows a fallback that opens the 2D station list.
- **Palaces**: build named palaces, add/reorder/delete stations, each station holds text + optional photo (client-side compressed to ~15-40KB JPEG before storage). Walk (study) is now **editable in place** — typing a title/content while walking saves immediately, and a "+ New station here" button lets you keep creating new stations as you move through a space, inserting right after your current position. Walk (recall) is strictly forward-only (no backtracking), self-marked, and feeds the SM-2 scheduler.
- **Library**: upload a PDF (or type manually), auto-chunked into items (sentence/line/paragraph), each item can get 3 AI-generated SEE-style image suggestions, can be starred "marked to learn," and a cross-deck "Marked to learn" panel aggregates every starred item across every deck with a combined practice session and a combined "Send to palace" action. Per-deck "Send to palace" also has a "only marked items" filter.
- **Drills**: 5 Memory-League-style disciplines (Numbers, Words, Images, Cards, Names & Faces), memorize-then-recall, 10 difficulty levels each, gated behind relevant curriculum lessons (with an "I already know this" override).
- **3D Explore**: the verified catalog, filterable by India/International, each entry tagged by embed kind (3D model / 360° photo / 360° video) and honestly labeled by source quality. "Build a palace here" creates a real, empty palace linked back to that catalog entry; revisiting offers to reopen it rather than duplicate.
- **Number Systems**: Major System (100 defaults, independently authored — not copied from any published table — fully overridable) and PAO (100% empty by default, three fields per number, live preview), sharing one screen with a remembered-preference tab toggle.
- **History**: full session log.

## Persistence: resolved

Storage now works standalone, no dependency on the Claude Artifacts runtime. `storageGet`/`storageSet` (in `mnemosyne.html`) prefer `window.storage` when present — so behavior inside claude.ai is unchanged — and fall back to `localStorage` (prefixed `mnemosyne:`) otherwise, so the file persists itself wherever it's opened: double-clicked locally, hosted anywhere, no backend. Every existing call site's error handling is untouched; these two helpers throw exactly like `window.storage.get/set` already could, so the same try/catch + toast logic just works against either backend. Verified with a real reload simulation (fresh DOM, same localStorage) and a check that native storage is still chosen over localStorage when both are available (`smoke_test_localpersist.js`).

The one thing this does *not* solve: the AI "Suggest images" feature's direct call to `https://api.anthropic.com/v1/messages` is still Claude-Artifacts-specific (no key in the code, relies on the runtime injecting auth). That's a separate decision — bring your own key/proxy, or accept that one feature is Claude.ai-only — not yet made.

## Testing

12 jsdom files in `tests/` (`smoke_test*.js`; the original `smoke_test.js` was superseded by `smoke_test2.js` and isn't in the repo). Each is self-contained: spins up `jsdom`, loads `mnemosyne.html` with `runScripts:'dangerously'`, stubs `pdfjsLib`, and runs hand-rolled `check(label, condition)` assertions — no test framework dependency. Run with `node tests/smoke_test_X.js`. 270 checks total, all passing. `smoke_test_castle.js` covers the castle's data layer and no-WebGL fallback.

The castle also has a **real-browser test**, `tests/browser/castle.browser.js` (Playwright + headless Chromium with SwiftShader WebGL, `npm run test:browser`). It checks 33 things: WebGL draw calls, walking and collisions, a flood fill proving all 40 station circles are reachable on foot, saving memories, the map, a full recall walk logged to history/SM-2, Library → castle placement, and phone viewport. It serves Three.js from `node_modules`, so it needs no network.

**Important caveat for whoever picks this up**: jsdom has no real WebGL/canvas and doesn't execute cross-origin iframe content, so the Sketchfab/YouTube embeds are only ever verified *structurally* (correct URL, correct attributes, correct DOM wiring) — never confirmed to actually render. That gap is exactly how the Mysore Palace embed bug shipped undetected (see below). Playwright now covers the castle; the third-party embeds in 3D Explore are still only structurally verified.

## Known issues / open items

- **Mysore Palace's Sketchfab embed doesn't render** for real users, confirmed by direct report. Root cause unconfirmed — Sketchfab is a JS-rendered SPA the fetch tool can't inspect, and jsdom can't execute it either. Mitigated: that entry no longer attempts to embed, shows a direct "Open on Sketchfab" link instead. A general fallback link was also added under every embed as a permanent escape hatch, not just for this entry.
- No verified 3D/360 source was found for Jaipur's City Palace or Amber Fort beyond two YouTube videos whose spherical metadata is unverified (titled as 360°/VR, not independently confirmed to render as drag-to-look).
- WebXR (real headset immersion) is unreliable inside Claude's chat iframe — nested-iframe permission policy likely blocks it. It may work better if `mnemosyne.html` is opened as a standalone file outside claude.ai, but this hasn't been tested in a real browser.
- `window.storage` / `localStorage` fallback is resolved (see above). The direct Anthropic API fetch for AI image suggestions is still Claude-Artifacts-specific and unresolved.

## Reversed decisions (context for why the code looks the way it does)

- **A-Frame + Wikimedia 360° photos was built, then removed.** It worked in principle (verified CORS support, verified licensing on one Taj Mahal photo) but needed a 150KB+ library, custom scene markup, and error-fallback handling, for content that was genuinely hard to source — only one clean example was ever found after real effort. YouTube 360° embedding covers the same need with a plain iframe and much easier sourcing. If 360° photo viewing comes up again, know that the harder path was already tried.

## Two ideas raised for next steps, not yet built

1. **[BUILT — see "The Castle" above]** **A procedurally-generated "generic" 3D palace**, built from simple primitives (Three.js boxes/arches/columns — no external model dependency), as a more robust and more appropriate alternative to real-world embeds for younger users: no fragile third-party embeds that can silently break (as Mysore did), no real-world licensing/attribution surface, no third-party branding, comments, or unrelated content anywhere near a child's screen. This is a genuinely different, more reliable engineering approach than anything currently in the 3D Explore catalog, and is a good first real feature to build in Claude Code, with proper browser testing from the start.
2. **Storing AI-generated artwork (e.g. from Google Gemini) on a palace station already works today, no new code needed** — generate the image externally, save it to the device, then use the existing "+ Add photo" button on any station (it compresses and stores client-side exactly like a real photo would). Worth confirming this is understood before treating it as a gap.

## Picking this up in Claude Code

1. Open a new project folder; add `mnemosyne.html`, this file, and the `tests/` directory.
2. `node tests/smoke_test2.js` (and the others) to confirm the baseline still passes before changing anything.
3. Persistence is resolved (see above) — the remaining open decision is the AI image-suggestion feature's direct API call, which is still Claude-Artifacts-only.
