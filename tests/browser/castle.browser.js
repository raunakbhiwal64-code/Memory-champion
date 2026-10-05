// Real-browser test for the 3D castle: WebGL rendering, walking, collisions,
// leaving memories at stations and a full recall walk. jsdom can't run WebGL,
// so this one drives headless Chromium through Playwright.
// Run from the repo root after `npm run build`: node tests/browser/castle.browser.js
// (npm run test:browser does both). It serves dist/ with Vite's preview server.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const { preview } = await import(path.resolve('node_modules/vite/dist/node/index.js'));
  const PORT = 4400 + Math.floor(Math.random() * 400);
  const server = await preview({ root: process.cwd(), configFile: path.resolve('vite.config.mjs'), preview: { port: PORT, strictPort: true, open: false }, logLevel: 'silent' });
  const BASE = `http://localhost:${PORT}/`;
  const shotDir = process.env.SHOT_DIR || path.resolve('tests/browser/screenshots');
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  // Everything the castle needs is bundled; block other network requests (fonts, pdf.js) for speed.
  await page.route('**/*', route => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
  // Low graphics keeps software-rendered WebGL fast enough for the walking checks.
  await page.addInitScript(() => { try { localStorage.setItem('mnemosyne:castleQuality', 'low'); } catch (e) {} });

  let failed = 0;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) failed++; };
  const state = () => page.evaluate(() => castleEngine.debug.state());
  const wait = ms => page.waitForTimeout(ms);
  // hold keys until a condition holds (or time runs out): robust on slow software rendering
  const holdUntil = async (codes, cond, ms) => {
    for (const c of codes) await page.keyboard.down(c);
    const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < ms) { if (await page.evaluate(cond)) { ok = true; break; } await wait(100); }
    for (const c of codes) await page.keyboard.up(c);
    return ok;
  };

  await page.goto(BASE);
  await page.waitForFunction(() => !!window.castleEngine);

  // ---- enter from the Palaces hero card ----
  await page.click('.tab-btn[data-view="palaces"]');
  check('castle hero card shown on Palaces tab', await page.isVisible('#btn-enter-castle-hero'));
  await page.click('#btn-enter-castle-hero');
  await page.waitForFunction(() => castleEngine.debug.state().running, null, { timeout: 120000 });
  await wait(600);
  let st = await state();
  check('castle overlay open and render loop running', st.running && await page.isVisible('#castle-root'));
  check('scene actually draws (WebGL draw calls > 50)', st.drawCalls > 50);
  check('static geometry merged into few draw calls (< 400 at low quality, got ' + st.drawCalls + ')', st.drawCalls < 400);
  check('rooms you cannot see into are culled', await page.evaluate(() => castleEngine.debug.culling().hidden > 50));
  check('castle has real light sources (torches, fires, chandeliers)', st.lights >= 25);
  check('a castle palace with 40 stations was created', await page.evaluate(() => DB.palaces.filter(isCastle).length === 1 && DB.palaces.find(isCastle).loci.length === 40));
  check('player starts in the courtyard', st.room === 'courtyard');
  // the castle is playable at once; real CC0 assets stream in behind it
  await page.waitForFunction(() => castleEngine.debug.state().assets.done, null, { timeout: 300000 });
  check('player starts facing the castle doors, a few steps inside the gate', st.nearby === -1 && Math.abs(st.yaw - Math.PI) < 0.01);
  await page.screenshot({ path: `${shotDir}/01-courtyard.png`, timeout: 240000 });

  // ---- every station circle is reachable on foot from the start ----
  const reach = await page.evaluate(() => {
    const step = 0.25, seen = new Set(), q = [[CASTLE_START.x, CASTLE_START.z]];
    const key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step);
    seen.add(key(...q[0]));
    while (q.length) {
      const [x, z] = q.shift();
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k) || castleEngine.debug.blocked(nx, nz)) continue;
        seen.add(k); q.push([nx, nz]);
      }
    }
    return CASTLE_STATIONS.map(s => { const r = castleRingPos(s); return { n: s.n, ok: !castleEngine.debug.blocked(r.x, r.z) && seen.has(key(r.x, r.z)) }; });
  });
  const unreachable = reach.filter(r => !r.ok).map(r => r.n);
  check('all 40 station circles are reachable by walking' + (unreachable.length ? ' (unreachable: ' + unreachable.join(',') + ')' : ''), unreachable.length === 0);

  // ---- walking with the keyboard moves the player, walls stop them ----
  check('first visit shows the "doors open as you reach them" hint once', await page.evaluate(() => localStorage.getItem('mnemosyne:castleHintSeen') === '1'));
  check('every archway has a closed oak door at the start', await page.evaluate(() => castleEngine.debug.doors().length === CASTLE_DOORS.length && castleEngine.debug.doors().every(d => d.open === 0)));
  await page.evaluate(() => castleEngine.debug.placeAt(CASTLE_START.x, CASTLE_START.z, 0));
  const before = await state();
  await holdUntil(['KeyW'], () => castleEngine.debug.state().nearby === 0, 15000);
  st = await state();

  check('holding W walks forward to the gate and its glowing circle', st.z > before.z + 1 && st.nearby === 0);
  check('the gate itself blocks the way (no walking through props)', st.z < 58.6);
  // face north from the middle of the courtyard and run for the doorway
  await page.evaluate(() => castleEngine.debug.placeAt(34, 50, Math.PI));
  await holdUntil(['KeyW', 'ShiftLeft'], () => castleEngine.debug.state().room === 'entrance' && castleEngine.debug.state().z < 40, 120000);
  st = await state();
  check('player walks through the doorway into the Entrance Hall', st.room === 'entrance');
  check('the entrance doors swung open as the player reached them', await page.evaluate(() => castleEngine.debug.doors()[0].open > 0.9));
  await page.screenshot({ path: `${shotDir}/01b-entrance.png`, timeout: 240000 });
  await page.keyboard.down('KeyD'); await wait(8000); await page.keyboard.up('KeyD');
  st = await state();
  check('walls stop the player (still inside the Entrance Hall)', st.room === 'entrance' && st.x < 44);

  // ---- leave memories at two stations ----
  await page.evaluate(() => castleEngine.debug.teleportTo(4));
  await wait(200);
  st = await state();
  check('teleport lands on station 5 (sundial)', st.nearby === 4);
  await page.keyboard.press('KeyE');
  await wait(150);
  check('pressing E opens the memory panel', await page.isVisible('#castle-panel.open') && await page.isVisible('#cp-text'));
  await page.fill('#cp-text', 'A purple elephant balancing on the sundial, trumpeting the time');
  await page.keyboard.press('KeyW'); // typing must not walk the player
  check('typing in the panel does not move the player', (await state()).nearby === 4);
  await page.click('#cp-save');
  await wait(150);
  check('memory saved to station 5', await page.evaluate(() => DB.palaces.find(isCastle).loci[4].content.text.includes('purple elephant')));
  check('panel closes after saving', !(await page.isVisible('#castle-panel.open')));
  await page.screenshot({ path: `${shotDir}/02-memory-card.png`, timeout: 240000 });

  await page.evaluate(() => castleEngine.debug.teleportTo(11));
  await page.keyboard.press('KeyE');
  await page.fill('#cp-text', 'Seven golden keys hanging from the long table');
  await page.click('#cp-save');
  await page.evaluate(() => castleEngine.debug.teleportTo(26));
  await page.keyboard.press('KeyE');
  await page.fill('#cp-text', 'The cauldron spits out the year 1066');
  await page.click('#cp-save');
  check('three memories stored', await page.evaluate(() => DB.palaces.find(isCastle).loci.filter(isLocusFilled).length === 3));
  check('memories persisted to localStorage', await page.evaluate(() => (localStorage.getItem('mnemosyne:palaces') || '').includes('1066')));
  await page.screenshot({ path: `${shotDir}/03-dungeon.png`, timeout: 240000 });

  // ---- map ----
  await page.waitForFunction(() => castleEngine.debug.doors()[0].open === 0, null, { timeout: 60000 }).catch(() => {});
  check('the entrance doors close again once the player has moved on', await page.evaluate(() => castleEngine.debug.doors()[0].open === 0));
  await page.keyboard.press('KeyM');
  check('M enlarges the map', await page.evaluate(() => document.getElementById('castle-map').classList.contains('big')));
  await page.screenshot({ path: `${shotDir}/04-map.png`, timeout: 240000 });
  await page.keyboard.press('Escape');
  check('Escape shrinks the map again', !(await page.evaluate(() => document.getElementById('castle-map').classList.contains('big'))));

  // ---- recall walk: forward only, in route order ----
  await page.click('#castle-btn-mode');
  st = await state();
  check('recall walk starts with 3 filled stations', st.mode === 'recall' && st.recall.total === 3 && st.recall.pos === 0);
  check('recall walk restarts at the castle gate', st.room === 'courtyard');
  await page.evaluate(() => castleEngine.debug.teleportTo(11));
  await page.keyboard.press('KeyE');
  check('a later station cannot be recalled out of order', !(await page.isVisible('#castle-panel.open')));
  await page.evaluate(() => castleEngine.debug.teleportTo(4));
  await page.keyboard.press('KeyE');
  check('recall panel hides the memory before reveal', await page.isVisible('#cr-reveal') && !(await page.textContent('#castle-panel')).includes('purple elephant'));
  await page.click('#cr-reveal');
  check('reveal shows the memory', (await page.textContent('#castle-panel')).includes('purple elephant'));
  await page.click('#cr-right');
  await page.evaluate(() => castleEngine.debug.teleportTo(11));
  await page.keyboard.press('KeyE'); await page.click('#cr-reveal'); await page.click('#cr-wrong');
  await page.evaluate(() => castleEngine.debug.teleportTo(26));
  await page.keyboard.press('KeyE'); await page.click('#cr-skip');
  await wait(200);
  check('summary shows 1 of 3', (await page.textContent('#castle-panel')).includes('1 of 3'));
  check('recall walk logged to history', await page.evaluate(() => DB.history[0] && DB.history[0].type === 'palace-walk' && DB.history[0].correct === 1 && DB.history[0].total === 3));
  check('spaced-repetition schedule set on the castle palace', await page.evaluate(() => !!DB.palaces.find(isCastle).srs));
  await page.screenshot({ path: `${shotDir}/05-recall-summary.png`, timeout: 240000 });

  // ---- exit back to the app ----
  await page.click('#cf-exit');
  await wait(150);
  check('exit returns to the Palaces list', !(await page.isVisible('#castle-root')) && await page.isVisible('#view-palaces'));
  check('palace card shows 3/40 stations filled', (await page.textContent('#palace-list')).includes('3/40 stations filled'));

  // ---- library items can be sent straight into the castle ----
  await page.evaluate(async () => {
    DB.decks.unshift({ id: 'd1', title: 'Kings', sourceName: null, items: [{ id: 'i1', text: 'Alfred' }, { id: 'i2', text: 'Edgar' }], createdAt: Date.now() });
    await saveDecks(); openDeck('d1');
  });
  await page.click('#btn-deck-assign');
  await page.selectOption('#am-palace', await page.evaluate(() => DB.palaces.find(isCastle).id));
  await page.click('#am-go');
  check('deck items fill the first empty castle stations in route order', await page.evaluate(() => {
    const l = DB.palaces.find(isCastle).loci; return l[0].content.text === 'Alfred' && l[1].content.text === 'Edgar' && l.length === 40;
  }));

  // ---- phone-sized screen ----
  await page.setViewportSize({ width: 390, height: 780 });
  await page.evaluate(() => enterCastle(DB.palaces.find(isCastle).id, 'study'));
  await wait(500);
  check('castle still renders at phone size', (await state()).drawCalls > 50);
  await page.screenshot({ path: `${shotDir}/06-phone.png`, timeout: 120000 });

  // ---- real CC0 assets stream in and replace the procedural stand-ins ----
  await page.waitForFunction(() => castleEngine.debug.state().assets.done, null, { timeout: 300000 });
  const as = (await state()).assets;
  check('all 15 real texture sets loaded', as.textures === 15);
  check('real 3D models placed (40+)', as.models >= 40);
  check('no asset failed to load', as.failed === 0);
  check('draw calls stay reasonable with models loaded (< 900 at low quality)', (await state()).drawCalls < 900);

  // ---- graphics + sound controls ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('#castle-btn-quality');
  check('Graphics button cycles quality (low -> high)', (await state()).quality === 'high' && (await page.textContent('#castle-btn-quality')).includes('High'));
  // High quality is very slow under software rendering, so don't wait for the page to look 'stable'
  await page.click('#castle-btn-sound', { force: true, timeout: 240000 });
  check('Sound button toggles', (await page.textContent('#castle-btn-sound')).includes('off'));
  check('graphics choice is remembered', await page.evaluate(() => localStorage.getItem('mnemosyne:castleQuality')) === 'high');

  // ---- high-quality tour screenshots of each room's character ----
  for (const [name, idx] of [['10-courtyard', 1], ['11-great-hall', 12], ['12-library', 21], ['13-cellar', 26], ['14-observatory', 37]]) {
    await page.evaluate(i => castleEngine.debug.teleportTo(i), idx);
    await wait(Number(process.env.SHOT_WAIT || 6000));
    await page.screenshot({ path: `${shotDir}/${name}.png`, timeout: 240000 });
  }

  check('no JavaScript errors', errors.length === 0);
  errors.forEach(e => console.log(' -', e));
  await browser.close();
  server.httpServer.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll castle browser checks passed');
  process.exit(failed ? 1 : 0);
})();
