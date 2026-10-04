# Mnemosyne

A memory-sport training app built around the method of loci (memory palaces). Its centrepiece is **The Keep of Mnemosyne**, a walkable 3D castle you use as your own memory palace. It also has a curriculum, a library, timed drills and number systems.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for the full handoff: data model, feature inventory, known issues, and reversed decisions.

## Running it

```bash
npm install
npm run dev        # local dev server with hot reload
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

`dist/` is a static site, so you can host it anywhere: GitHub Pages, Netlify, Vercel, or any web server. All paths are relative, so it also works from a sub-folder. All user data stays in the browser (`localStorage`, prefixed `mnemosyne:`), with no backend.

The app has to be served over HTTP. Double-clicking `index.html` won't work, because browsers don't load ES modules from `file://`.

## The Keep of Mnemosyne (3D palace)

You play a hooded keeper carrying a lantern, seen from behind (third person). There are 40 numbered stations, each a distinct object, along one fixed route through eight rooms. Each room is built to be memorable through its own scale, materials, light, sound and centrepiece:

| Room | Character |
|---|---|
| Moonlit Courtyard | rain on wet cobbles, lamp posts, ivy, a well, turrets against the stars |
| Entrance Hall | marble floor, columns, grand staircase, great iron chandelier |
| Great Hall | hammerbeam roof, rose window, long tables, roaring fireplace with embers |
| Portrait Gallery | plaster barrel vault, parquet, portraits under picture lights, a ticking clock |
| Library | two-storey stacks with a balcony walkway, coffered ceiling, reading lamps |
| Alchemist's Cellar | low stone vault, rubble walls, green cauldron glow, mist and dripping water |
| Armoury & Forge | brick walls, glowing forge with sparks, anvil, weapon racks |
| Observatory | open dome to the night sky, star-map floor, brass instruments, wind |

How it works:

- Press **E** at a glowing circle to leave a memory: text, a picture, or both. It floats there as a parchment card.
- **Start recall walk** takes you back to the gate. You then walk the route forward-only, revealing and self-marking each memory. The score feeds History and the spaced-repetition schedule, the same as any palace.
- Library decks can be sent straight into the castle; they fill empty stations in route order.
- **Controls:** WASD or arrows to walk, Shift to run, drag to look, scroll to zoom, **M** for the map. While studying, click a station on the big map to jump to it. On phones there's an on-screen joystick and a Use button.
- **Graphics** has three levels: High (soft shadows, ambient occlusion, bloom), Medium and Low. It drops a level automatically on slow devices. **Sound** turns the ambient soundscape on or off. The soundscape is synthesised in the browser, so there are no audio files.

Everything is generated in code: surface textures (colour, detail and roughness maps for stone, wood, marble and cobbles), architecture, props, lighting and sound. Only Three.js (MIT) is used, with no downloaded models or textures. That keeps the asset licensing clean for a commercial product. The structure is ready for CC0 models and textures (Poly Haven, ambientCG) to replace the hand-built props room by room.

## Other features

- **Learn:** a 6-level, 18-lesson curriculum on memory technique. It's grounded in Kevin Horsley's *Unlimited Memory*; gaps it doesn't cover are filled from general competitive-memory technique and flagged as such.
- **Palaces:** besides the castle, you can build palaces from places you know. You add, reorder and delete stations, with text and photos. Each palace has a study walk and a forward-only recall walk.
- **Library:** upload a PDF or type text, auto-chunk it into items, get AI image suggestions, and star items to learn.
- **Drills:** five Memory-League-style timed disciplines (Numbers, Words, Images, Cards, Names & Faces).
- **Number systems:** an editable Major System and a PAO table.
- **Dashboard & History:** curriculum progress, streaks, spaced-repetition due dates and a full session log.

## Project layout

```
index.html            the app shell, styles and app logic (classic script)
src/castle/           the 3D engine (ES modules, bundled by Vite)
  main.js             entry: build, frame loop, enter/exit, quality, window.castleEngine
  architecture.js     walls, floors, vaults, roofs, windows, turrets, sky
  props.js            the 40 station objects
  decor.js            room dressing and light fixtures
  lights.js           light pool, shadows, post-processing, quality presets
  textures.js         procedural PBR texture sets
  hero.js player.js   the keeper; movement, collision, camera, input
  ui.js               HUD, map, memory panel, recall walk
  atmosphere.js       rain/dust/embers/mist particles and synthesised sound
  merge.js            merges static geometry to keep draw calls low
tests/                jsdom smoke tests (app logic, castle data layer)
tests/browser/        Playwright test driving the real WebGL castle
```

The castle layout itself (`CASTLE_ROOMS`, `CASTLE_STATIONS`, the grid helpers) lives in `index.html`. That way the data layer, the 2D fallback and the jsdom tests all work without WebGL.

## Testing

```bash
npm test               # 13 jsdom smoke-test files, 271 checks, no browser needed
npm run test:browser   # builds, then drives the real 3D castle in headless Chromium (39 checks)
```

The browser test needs a Chromium for Playwright (`npx playwright install chromium`, or set `CHROMIUM_PATH`). It checks:

- rendering and draw-call budget
- walking and collisions
- a flood fill proving all 40 stations are reachable on foot
- saving memories, the map, and a full recall walk logged to history and spaced repetition
- Library → castle placement, phone size, and the Graphics and Sound controls

Screenshots of each room land in `tests/browser/screenshots/`.

**Known coverage gap:** the Sketchfab/YouTube embeds in 3D Explore are still only verified structurally, not confirmed to render.
