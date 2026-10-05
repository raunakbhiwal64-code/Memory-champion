# Parked: "Explore in 3D" (real-world palace tours)

This feature was taken out of the app in favour of the 3D castle. The code is kept here so it can come back later. Nothing in this folder is built, served or tested.

## What it was

The Palaces tab had an **Explore in 3D** button. It opened a small, hand-checked catalogue of free embeds of real places:

- Versailles (Hall of Mirrors, Royal Chapel, King's Chamber): Sketchfab museum scans
- Gateway of India and Mysore Palace: Sketchfab
- Taj Mahal, Amer Fort and City Palace Jaipur: YouTube 360° videos

You could filter the catalogue by region and orbit the model. **Build a palace here** then created a normal palace tagged with `basedOn: { catalogId, name, place }`. That palace showed a "3D reference" pill in the list and a "View in 3D" link on its detail page. Lesson 2.2 ("The empty run") had a Try-it button that opened this view.

## Files

| File | Was in | Contents |
|---|---|---|
| `explore.js` | `index.html` (classic script, just before the castle section) | `PALACE_CATALOG`, `render3DExplore`, `buildPalaceFromPlace`, `open3DExplore`, `wire3DExploreButtons`, `embedKindLabel` |
| `explore-view.html` | `index.html`, after `#view-palaces` | the `#view-3d-explore` section |
| `smoke_test_3dlink.js` | `tests/` | the full jsdom test for the build-a-palace flow and the `basedOn` links |
| `smoke_test_pillars_3d_section.js` | `tests/smoke_test_pillars.js` | the 3D explore checks (tabs, region filters, embeds, lesson 2.2) |

## Restoring it

1. Paste `explore-view.html` back into `index.html` after the `#view-palaces` section.
2. Paste `explore.js` back into the classic script, and call `wire3DExploreButtons()` in the startup block next to `wirePalaceDetailButtons()`.
3. Add the button back to the Palaces header: `<button class="btn btn-ghost" id="btn-explore-3d">Explore in 3D</button>`.
4. Optional extras:
   - In `renderPalaceList`, add the `basedOn` pill.
   - In `#view-palace-detail`, add a `<div id="pd-basedon">` and fill it in `openPalace`.
   - Give `runTryAction` a `'goto-3d'` case that calls `open3DExplore()`.
5. Move the tests back into `tests/`, or merge the pillars section back in.

The fastest route is git: commit `1625112` is the last version with the feature wired in, so `git show 1625112:index.html` shows exactly where everything went.

Palaces saved while the feature existed keep their `basedOn` field. The app ignores it now, and it is harmless.
