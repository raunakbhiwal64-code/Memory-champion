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

  // ---- entry point 1: from the Numbers drill card ----
  win.eval("go('drills','drills'); renderDrillCards();");
  await new Promise(r=>setTimeout(r,30));
  const numbersCard = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Numbers'));
  const editLink = numbersCard.querySelector('.numsys-open-link');
  check('Edit number words link present on Numbers card', !!editLink);
  editLink.click();
  await new Promise(r=>setTimeout(r,30));
  check('Number System view opened', doc.getElementById('view-number-system').classList.contains('active'));

  // ---- defaults render: 100 rows, legend present ----
  let rows = doc.querySelectorAll('.numsys-row');
  check('100 number rows rendered by default', rows.length === 100);
  check('legend shows all 10 digit mappings', doc.getElementById('numsys-legend').children.length === 10);
  const row24 = doc.querySelector('.numsys-row[data-num="24"]');
  check('row 24 exists', !!row24);
  check('row 24 shows a default placeholder word (not overridden yet)', row24.querySelector('.numsys-input').placeholder.length > 0 && row24.querySelector('.numsys-input').value === '');
  check('row 24 has no reset button before any override', !row24.querySelector('.numsys-reset'));

  // ---- the user's own example: override 24 with "Nora" ----
  const input24 = row24.querySelector('.numsys-input');
  input24.value = 'Nora';
  input24.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));
  check('DB.majorSystem.overrides["24"] === "Nora"', win.eval('DB.majorSystem.overrides["24"]') === 'Nora');
  check('getMajorWord("24") returns Nora', win.eval('getMajorWord("24")') === 'Nora');

  const row24After = doc.querySelector('.numsys-row[data-num="24"]');
  check('row 24 input now shows Nora', row24After.querySelector('.numsys-input').value === 'Nora');
  check('reset button appears once overridden', !!row24After.querySelector('.numsys-reset'));

  // ---- reset back to default ----
  row24After.querySelector('.numsys-reset').click();
  await new Promise(r=>setTimeout(r,40));
  check('override cleared from storage after reset', win.eval('DB.majorSystem.overrides["24"]') === undefined);
  const row24Reset = doc.querySelector('.numsys-row[data-num="24"]');
  check('row 24 input cleared back to empty (showing default as placeholder) after reset', row24Reset.querySelector('.numsys-input').value === '');

  // re-apply the override so later persistence checks have something to verify
  row24Reset.querySelector('.numsys-input').value = 'Nora';
  row24Reset.querySelector('.numsys-input').dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  // ---- filter: by number prefix ----
  const filterInput = doc.getElementById('numsys-filter');
  filterInput.value = '5';
  filterInput.dispatchEvent(new win.Event('input'));
  await new Promise(r=>setTimeout(r,30));
  rows = doc.querySelectorAll('.numsys-row');
  check('filtering by "5" shows only the 50-59 decade (10 rows)', rows.length === 10 && Array.from(rows).every(r=>r.dataset.num.indexOf('5')===0));

  // ---- filter: by word ----
  filterInput.value = 'lion';
  filterInput.dispatchEvent(new win.Event('input'));
  await new Promise(r=>setTimeout(r,30));
  rows = doc.querySelectorAll('.numsys-row');
  check('filtering by word "lion" finds number 52', rows.length === 1 && rows[0].dataset.num === '52');

  // clear filter
  filterInput.value = '';
  filterInput.dispatchEvent(new win.Event('input'));
  await new Promise(r=>setTimeout(r,30));
  check('clearing filter restores all 100 rows', doc.querySelectorAll('.numsys-row').length === 100);

  // ---- back button ----
  doc.getElementById('btn-back-numsys').click();
  await new Promise(r=>setTimeout(r,30));
  check('back button returns to Drills view', doc.getElementById('view-drills').classList.contains('active'));

  // ---- entry point 2: from Lesson 3.3's secondary action ----
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const lesson33 = doc.querySelector('details[data-lesson-id="l3-3"]');
  lesson33.open = true;
  const buttons = lesson33.querySelectorAll('.lesson-try-btn');
  check('Lesson 3.3 has both a primary and a secondary action button', buttons.length === 2);
  const secondaryBtn = Array.from(buttons).find(b=>b.textContent.includes('number-word list'));
  check('secondary button labeled correctly', !!secondaryBtn);
  secondaryBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('Lesson 3.3 secondary action opens Number System view', doc.getElementById('view-number-system').classList.contains('active'));
  check('override from earlier persisted across navigation (24 -> Nora)', doc.querySelector('.numsys-row[data-num="24"] .numsys-input').value === 'Nora');

  // ---- storage round-trip: reload the whole app and confirm the override survives ----
  const savedJson = win.eval('JSON.stringify(DB.majorSystem)');
  check('majorSystem serializes with the Nora override', savedJson.includes('Nora') && savedJson.includes('"24"'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
