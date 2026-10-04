const { JSDOM } = require('jsdom');
const fs = require('fs');

(async () => {
  const html = fs.readFileSync('mnemosyne.html', 'utf-8');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://example.org/',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.onerror = (msg, src, line, col) => { errors.push(`${msg} (line ${line}:${col})`); };
      window.pdfjsLib = { GlobalWorkerOptions: {} };
    }
  });
  const win = dom.window;
  await new Promise(res => win.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  await new Promise(res => setTimeout(res, 300));
  const doc = win.document;
  const check = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---- layout data is sane ----
  check('40 castle stations across 8 rooms', win.eval('CASTLE_STATIONS.length') === 40 && win.eval('CASTLE_ROOMS.length') === 8);
  check('5 stations in every room', win.eval('CASTLE_ROOMS.every(r=>CASTLE_STATIONS.filter(s=>s.room===r.id).length===5)'));
  check('every station prop has a 3D builder', win.eval('CASTLE_STATIONS.every(s=>typeof s.prop==="string")') && html.includes('PROPS = {'));
  check('every station prop sits inside its own room',
    win.eval(`CASTLE_STATIONS.every(s=>{ const r = CASTLE_ROOMS.find(r=>r.id===s.room); return s.x>=r.x0*CASTLE_TILE && s.x<=(r.x1+1)*CASTLE_TILE && s.z>=r.z0*CASTLE_TILE && s.z<=(r.z1+1)*CASTLE_TILE; })`));
  check('every station circle is on open floor', win.eval('CASTLE_STATIONS.every(s=>{ const p = castleEngine.ringPos(s); return castleEngine.walkable(p.x, p.z); })'));
  check('station titles are all distinct (no two stations blur together)', win.eval('new Set(CASTLE_STATIONS.map(s=>s.title.toLowerCase())).size') === 40);

  // ---- Palaces tab: castle hero card ----
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await wait(30);
  check('castle hero card on the Palaces tab', doc.getElementById('palace-list').textContent.includes('The Castle') && !!doc.getElementById('btn-enter-castle-hero'));
  check('hero offers to build a castle when none exists', doc.getElementById('btn-enter-castle-hero').textContent.includes('Build your castle'));

  // ---- create a castle palace through the New palace modal ----
  doc.getElementById('btn-new-palace').click();
  await wait(20);
  doc.getElementById('np-kind').value = 'castle';
  doc.getElementById('np-name').value = 'Exam castle';
  doc.getElementById('np-create').click();
  await wait(60);
  const castle = () => win.eval('DB.palaces.find(isCastle)');
  check('castle palace created with kind "castle"', !!castle() && castle().name === 'Exam castle');
  check('castle palace has 40 stations, anchored in route order', castle().loci.length === 40 && castle().loci.every((l, i) => l.anchor === 's' + String(i + 1).padStart(2, '0')));
  check('station titles name the object and the room', castle().loci[7].title === 'Grand staircase — Entrance Hall');

  // ---- no WebGL in jsdom: the castle falls back gracefully ----
  check('castle overlay opened', doc.getElementById('castle-root').classList.contains('open'));
  check('fallback message shown when 3D is unavailable', doc.getElementById('castle-fallback').classList.contains('show'));
  doc.getElementById('castle-fallback-list').click();
  await wait(40);
  check('fallback "station list" opens the palace detail', doc.getElementById('view-palace-detail').classList.contains('active') && !doc.getElementById('castle-root').classList.contains('open'));
  check('palace detail lists all 40 castle stations', doc.querySelectorAll('.locus-row').length === 40);
  check('castle stations cannot be reordered or deleted', !doc.querySelector('.locus-up') && !doc.querySelector('.locus-del'));
  check('"+ Add station" hidden for a castle', doc.getElementById('btn-add-locus').style.display === 'none');
  check('"Enter the 3D castle" button shown for a castle', doc.getElementById('btn-enter-castle').style.display !== 'none');

  // ---- an empty castle is not "due for review" ----
  win.eval("go('dashboard','dashboard'); renderDashboard();");
  await wait(20);
  check('empty castle not listed as due for review', !doc.getElementById('dash-due').textContent.includes('Exam castle'));

  // ---- Library -> castle: always fills empty stations in route order ----
  win.eval("go('library','library'); renderDeckList();");
  await wait(20);
  doc.getElementById('btn-new-deck').click();
  await wait(20);
  doc.getElementById('nd-title').value = 'Planets';
  doc.getElementById('nd-create').click();
  await wait(30);
  for (let i = 0; i < 3; i++) doc.getElementById('btn-add-item').click();
  await wait(30);
  const items = doc.querySelectorAll('.item-text');
  ['Mercury', 'Venus', 'Earth'].forEach((t, i) => { items[i].value = t; items[i].dispatchEvent(new win.Event('change')); });
  await wait(30);
  doc.getElementById('btn-deck-assign').click();
  await wait(20);
  check('assign modal labels the castle as a 3D castle', doc.getElementById('am-palace').textContent.includes('3D castle'));
  doc.getElementById('am-mode').value = 'append';
  doc.getElementById('am-go').click();
  await wait(40);
  check('castle keeps exactly 40 stations even in "append" mode', castle().loci.length === 40);
  check('items placed at stations 1-3 in route order', castle().loci.slice(0, 3).map(l => l.content && l.content.text).join(',') === 'Mercury,Venus,Earth');
  check('source deck recorded on the placed items', castle().loci[0].content.source === 'Planets');

  // ---- now it's due, and the 2D recall walk only visits filled stations ----
  win.eval("go('dashboard','dashboard'); renderDashboard();");
  await wait(20);
  check('filled castle appears as due for review', doc.getElementById('dash-due').textContent.includes('Exam castle'));
  win.eval('openPalace(DB.palaces.find(isCastle).id); startWalk("recall");');
  await wait(30);
  check('2D recall walk covers only the 3 filled stations', doc.querySelector('.modal').textContent.includes('STATION 1 OF 3'));
  for (let i = 0; i < 3; i++) {
    doc.getElementById('wk-reveal').click(); await wait(10);
    doc.getElementById(i === 2 ? 'wk-wrong' : 'wk-correct').click(); await wait(20);
  }
  check('walk logged 2/3 to history', win.eval('DB.history[0].type') === 'palace-walk' && win.eval('DB.history[0].correct') === 2 && win.eval('DB.history[0].total') === 3);
  win.eval('startWalk("study")');
  await wait(20);
  check('study walk on a castle has no "+ New station here"', !doc.getElementById('wk-add-station'));
  doc.getElementById('wk-close').click();

  // ---- saved data is repaired on load if stations are missing or out of order ----
  const repaired = win.eval(`(()=>{
    const p = JSON.parse(JSON.stringify(DB.palaces.find(isCastle)));
    p.loci = p.loci.slice(0, 10).reverse();
    const changed = ensureCastleLoci(p);
    return { changed, n: p.loci.length, firstText: p.loci[0].content && p.loci[0].content.text, ordered: p.loci.every((l,i)=>l.anchor===CASTLE_STATIONS[i].id) };
  })()`);
  check('ensureCastleLoci restores all 40 stations in order and keeps content', repaired.changed && repaired.n === 40 && repaired.ordered && repaired.firstText === 'Mercury');

  // ---- persisted ----
  check('castle saved to storage', (win.localStorage.getItem('mnemosyne:palaces') || '').includes('"kind":"castle"'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
