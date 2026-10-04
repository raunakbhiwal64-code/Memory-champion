const { JSDOM } = require('jsdom');
const fs = require('fs');

(async () => {
  const html = fs.readFileSync('index.html', 'utf-8');
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

  // ---- brand new palace, zero stations, exactly like "Build a palace here" produces ----
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Empty Villa';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  check('palace starts with zero stations', win.eval('DB.palaces[0].loci.length') === 0);

  // ---- Walk (recall) should still refuse on zero stations ----
  win.eval("startWalk('recall')");
  await new Promise(r=>setTimeout(r,30));
  check('recall walk still refuses to start with zero stations', doc.getElementById('modal-root').innerHTML.trim() === '');

  // ---- Walk (study) should now start even with zero stations ----
  win.eval("startWalk('study')");
  await new Promise(r=>setTimeout(r,30));
  check('study walk opens even with zero stations', doc.getElementById('modal-root').innerHTML.trim() !== '');
  check('shows the "no stations yet" prompt', doc.querySelector('.modal').textContent.includes('No stations yet'));
  const addFirstBtn = doc.getElementById('wk-add-first');
  check('"+ Add first station" button present', !!addFirstBtn);

  addFirstBtn.click();
  await new Promise(r=>setTimeout(r,40));
  check('first station created in storage', win.eval('DB.palaces[0].loci.length') === 1);
  check('walk now shows station editing UI, not the empty prompt', !!doc.getElementById('wk-title-input'));
  check('walk landed on station 1 of 1', doc.querySelector('.modal').textContent.includes('STATION 1 OF 1'));

  // ---- fill station 1, then add a NEW station mid-walk (the actual feature requested) ----
  let titleInput = doc.getElementById('wk-title-input');
  titleInput.value = 'Entrance';
  titleInput.dispatchEvent(new win.Event('change'));
  let contentInput = doc.getElementById('wk-content-input');
  contentInput.value = 'A talking doormat that shouts your name';
  contentInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  const addStationBtn = doc.getElementById('wk-add-station');
  check('"+ New station here" button present in study mode', !!addStationBtn);
  addStationBtn.click();
  await new Promise(r=>setTimeout(r,40));

  check('a second station now exists in storage', win.eval('DB.palaces[0].loci.length') === 2);
  check('station 1 content was preserved when adding station 2 (not overwritten)', win.eval('DB.palaces[0].loci[0].content.text').includes('talking doormat'));
  check('walk automatically advanced into the brand-new station 2', doc.querySelector('.modal').textContent.includes('STATION 2 OF 2'));
  check('new station starts empty (no leaked content from station 1)', doc.getElementById('wk-title-input').value === '' && doc.getElementById('wk-content-input').value === '');

  // ---- fill station 2 with genuinely different content ----
  titleInput = doc.getElementById('wk-title-input');
  titleInput.value = 'Hallway';
  titleInput.dispatchEvent(new win.Event('change'));
  contentInput = doc.getElementById('wk-content-input');
  contentInput.value = 'A grandfather clock ticking backwards';
  contentInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  // ---- add a THIRD station inserted between 1 and 2, confirming insertion position (not just append) ----
  doc.getElementById('wk-prev').click(); // back to station 1
  await new Promise(r=>setTimeout(r,40));
  check('back at station 1', doc.querySelector('.modal').textContent.includes('STATION 1 OF 2'));
  doc.getElementById('wk-add-station').click();
  await new Promise(r=>setTimeout(r,40));
  check('now 3 stations total', win.eval('DB.palaces[0].loci.length') === 3);
  check('new station was inserted right after station 1, not appended at the very end', doc.querySelector('.modal').textContent.includes('STATION 2 OF 3'));

  // ---- confirm all three ended up in genuinely different places (distinct content, distinct loci) ----
  win.eval("openPalace(DB.palaces[0].id);");
  await new Promise(r=>setTimeout(r,30));
  const rows = doc.querySelectorAll('.locus-row');
  check('3 distinct stations visible in Palace Detail', rows.length === 3);
  const titles = Array.from(rows).map(r=>r.querySelector('.locus-title').value);
  check('station order preserved: Entrance, (new blank), Hallway', titles[0]==='Entrance' && titles[2]==='Hallway' && titles[1]==='');
  const savedJson = win.eval('JSON.stringify(DB.palaces)');
  check('doormat and grandfather clock content both persisted, in separate stations', savedJson.includes('talking doormat') && savedJson.includes('grandfather clock'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
