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

  // ---- build a palace with 2 empty stations ----
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Walk Test Villa';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-locus').click();
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));

  // ---- start Walk (study) on a palace with zero content anywhere ----
  win.eval("startWalk('study')");
  await new Promise(r=>setTimeout(r,30));
  check('study walk shows an editable title input', !!doc.getElementById('wk-title-input'));
  check('study walk shows an editable content textarea', !!doc.getElementById('wk-content-input'));
  check('recall-only marking buttons are absent in study mode', !doc.getElementById('wk-reveal'));

  // ---- THE BUG: type content directly into the walk, without ever touching Palace Detail ----
  const titleInput = doc.getElementById('wk-title-input');
  titleInput.value = 'Front gate';
  titleInput.dispatchEvent(new win.Event('change'));
  const contentInput = doc.getElementById('wk-content-input');
  contentInput.value = 'A brass lion knocker that roars when touched';
  contentInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  check('title typed during the walk actually saved to the palace', win.eval('DB.palaces[0].loci[0].title') === 'Front gate');
  check('content typed during the walk actually saved to the palace', win.eval('DB.palaces[0].loci[0].content.text').includes('brass lion knocker'));

  // ---- move to station 2 without blurring first (Next button click covers the save) ----
  const titleInput2setup = doc.getElementById('wk-title-input');
  titleInput2setup.value = 'Front gate, updated once more';
  titleInput2setup.dispatchEvent(new win.Event('change'));
  doc.getElementById('wk-next').click();
  await new Promise(r=>setTimeout(r,40));
  check('edit right before clicking Next was captured too', win.eval('DB.palaces[0].loci[0].title') === 'Front gate, updated once more');
  check('walk advanced to station 2', win.eval('walkState.idx') === 1);

  // fill station 2 as well, then go back to station 1 to confirm it persisted across navigation
  const titleInput2 = doc.getElementById('wk-title-input');
  titleInput2.value = 'Hallway mirror';
  titleInput2.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));
  doc.getElementById('wk-prev').click();
  await new Promise(r=>setTimeout(r,40));
  check('station 1 content still shows correctly after navigating away and back', doc.getElementById('wk-content-input').value.includes('brass lion knocker'));

  // ---- close the walk and verify in Palace Detail (outside the walk) that everything is there ----
  doc.getElementById('wk-close').click();
  await new Promise(r=>setTimeout(r,40));
  check('modal closes cleanly', doc.getElementById('modal-root').innerHTML.trim() === '');
  win.eval("openPalace(DB.palaces[0].id);");
  await new Promise(r=>setTimeout(r,30));
  const rows = doc.querySelectorAll('.locus-row');
  check('Palace Detail reflects station 1 title from the walk', rows[0].querySelector('.locus-title').value === 'Front gate, updated once more');
  check('Palace Detail reflects station 2 title from the walk', rows[1].querySelector('.locus-title').value === 'Hallway mirror');

  // ---- storage round-trip ----
  const saved = win.eval('JSON.stringify(DB.palaces)');
  check('all walk-time edits persisted to storage', saved.includes('brass lion knocker') && saved.includes('Hallway mirror'));

  // ---- regression: closing a walk and immediately starting a new one must not wipe the new modal (the race this fix addresses) ----
  win.eval("startWalk('study')");
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('wk-close').click();
  win.eval("startWalk('recall')"); // fired synchronously right after close, no await in between
  await new Promise(r=>setTimeout(r,50));
  check('rapid close-then-reopen does not leave the modal empty (no race-condition wipe)', doc.getElementById('modal-root').innerHTML.trim() !== '');
  check('the reopened modal is indeed the recall walk, not leftover state', !!doc.getElementById('wk-reveal'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
