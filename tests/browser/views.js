// Takes reference screenshots of the castle at a chosen graphics level, for
// judging how it looks (not a pass/fail test). Run after `npm run build`:
//   node tests/browser/views.js [low|medium|high] [outDir]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const quality = process.argv[2] || 'high';
  const shotDir = path.resolve(process.argv[3] || 'tests/browser/screenshots/views');
  const distDir = path.resolve(process.env.DIST_DIR || 'dist');
  fs.mkdirSync(shotDir, { recursive: true });
  const { preview } = await import(path.resolve('node_modules/vite/dist/node/index.js'));
  const PORT = 4800 + Math.floor(Math.random() * 400);
  const server = await preview({ root: process.cwd(), configFile: path.resolve('vite.config.mjs'), build: { outDir: distDir }, preview: { port: PORT, strictPort: true, open: false }, logLevel: 'silent' });
  const BASE = `http://localhost:${PORT}/`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('pageerror', String(e)));
  page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.route('**/*', route => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
  await page.addInitScript(q => { try { localStorage.setItem('mnemosyne:castleQuality', q); localStorage.setItem('mnemosyne:castleHintSeen', '1'); } catch (e) {} }, quality);
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.castleEngine);
  await page.evaluate(() => openOrCreateCastle('study'));
  await page.waitForFunction(() => castleEngine.debug.state().running, null, { timeout: 180000 });
  await page.waitForFunction(() => castleEngine.debug.state().assets.done, null, { timeout: 600000, polling: 2000 });
  // hide the HUD so the picture is just the castle
  await page.addStyleTag({ content: '.castle-hud-top,#castle-help,#castle-map,#castle-prompt,#castle-target,.toast{display:none!important}' });
  const views = (process.env.VIEWS ? process.env.VIEWS.split(',') : null);
  const VIEWS = [
    ['courtyard-facade', 34, 54.4, Math.PI],
    ['courtyard-tree', 34, 50, -Math.PI * 0.7],
    ['courtyard-gate', 34, 49, 0],
    ['entrance-door', 34, 46.5, Math.PI],
    ['entrance-hall', 34, 37, Math.PI],
    ['great-hall', 12, 39, Math.PI],
    ['gallery', 15, 8, -Math.PI / 2],
    ['library', 34, 18, Math.PI],
    ['cellar', 64, 10, -Math.PI / 2],
    ['armoury', 56, 31, Math.PI],
    ['observatory', 60, 53, Math.PI * 0.85]
  ];
  for (const [name, x, z, yaw] of VIEWS) {
    if (views && !views.includes(name)) continue;
    await page.evaluate(([x, z, yaw]) => castleEngine.debug.placeAt(x, z, yaw), [x, z, yaw]);
    // let doors, lights and shadows settle
    await page.waitForTimeout(2500);
    const t0 = Date.now();
    await page.screenshot({ path: `${shotDir}/${name}.png`, timeout: 300000 });
    console.log('shot', name, Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify((await page.evaluate(() => { const s = castleEngine.debug.state(); return { room: s.room, calls: s.drawCalls }; }))));
  }
  await browser.close();
  server.httpServer.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
