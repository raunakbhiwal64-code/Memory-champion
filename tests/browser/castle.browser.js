// Real-browser test for the 3D castle: WebGL rendering, walking, collisions,
// leaving memories at stations and a full recall walk. jsdom can't run WebGL,
// so this one drives headless Chromium through Playwright.
// Run from the repo root: node tests/browser/castle.browser.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
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
  // Serve Three.js locally so the test doesn't depend on the CDN; drop other network requests.
  const threeFile = require.resolve('three/build/three.min.js');
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('three.js/r128/three.min.js')) return route.fulfill({ path: threeFile, contentType: 'application/javascript' });
    if (url.startsWith('file:')) return route.continue();
    return route.abort();
  });

  let failed = 0;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) failed++; };
  const state = () => page.evaluate(() => castleEngine.debug.state());
  const wait = ms => page.waitForTimeout(ms);

  await page.goto('file://' + path.resolve('mnemosyne.html'));
  await page.waitForFunction(() => typeof castleEngine !== 'undefined' && typeof THREE !== 'undefined');

  // ---- enter from the Palaces hero card ----
  await page.click('.tab-btn[data-view="palaces"]');
  check('castle hero card shown on Palaces tab', await page.isVisible('#btn-enter-castle-hero'));
  await page.click('#btn-enter-castle-hero');
  await page.waitForFunction(() => castleEngine.debug.state().running);
  await wait(600);
  let st = await state();
  check('castle overlay open and render loop running', st.running && await page.isVisible('#castle-root'));
  check('scene actually draws (WebGL draw calls > 50)', st.drawCalls > 50);
  check('a castle palace with 40 stations was created', await page.evaluate(() => DB.palaces.filter(isCastle).length === 1 && DB.palaces.find(isCastle).loci.length === 40));
  check('player starts in the courtyard', st.room === 'courtyard');
  check('player starts facing the gate, a few steps from station 1', st.nearby === -1 && Math.abs(st.yaw) < 0.01);
  await page.screenshot({ path: `${shotDir}/01-courtyard.png` });

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
    return CASTLE_STATIONS.map(s => { const r = castleEngine.ringPos(s); return { n: s.n, ok: !castleEngine.debug.blocked(r.x, r.z) && seen.has(key(r.x, r.z)) }; });
  });
  const unreachable = reach.filter(r => !r.ok).map(r => r.n);
  check('all 40 station circles are reachable by walking' + (unreachable.length ? ' (unreachable: ' + unreachable.join(',') + ')' : ''), unreachable.length === 0);

  // ---- walking with the keyboard moves the player, walls stop them ----
  const before = await state();
  await page.keyboard.down('KeyW'); await wait(1500); await page.keyboard.up('KeyW');
  st = await state();
  check('holding W walks forward to the gate and its glowing circle', st.z > before.z + 1.5 && st.nearby === 0);
  check('the gate itself blocks the way (no walking through props)', st.z < 58.6);
  // face north from the middle of the courtyard and run for the doorway
  await page.evaluate(() => castleEngine.debug.placeAt(34, 50, Math.PI));
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft'); await wait(2500); await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  st = await state();
  check('player walks through the doorway into the Entrance Hall', st.room === 'entrance');
  await page.screenshot({ path: `${shotDir}/01b-entrance.png` });
  await page.keyboard.down('KeyD'); await wait(4000); await page.keyboard.up('KeyD');
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
  await page.screenshot({ path: `${shotDir}/02-memory-card.png` });

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
  await page.screenshot({ path: `${shotDir}/03-dungeon.png` });

  // ---- map ----
  await page.keyboard.press('KeyM');
  check('M enlarges the map', await page.evaluate(() => document.getElementById('castle-map').classList.contains('big')));
  await page.screenshot({ path: `${shotDir}/04-map.png` });
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
  await page.screenshot({ path: `${shotDir}/05-recall-summary.png` });

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
  await page.screenshot({ path: `${shotDir}/06-phone.png` });

  check('no JavaScript errors', errors.length === 0);
  errors.forEach(e => console.log(' -', e));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll castle browser checks passed');
  process.exit(failed ? 1 : 0);
})();
