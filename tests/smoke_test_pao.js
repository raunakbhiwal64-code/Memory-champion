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

  // ---- default state: Major System is the default tab ----
  win.eval("go('drills','drills'); renderDrillCards();");
  await new Promise(r=>setTimeout(r,30));
  check('DB.numberSystemPref defaults to major', win.eval('DB.numberSystemPref') === 'major');

  // ---- entry point: Cards drill card -> PAO tab directly ----
  const cardsCard = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Cards'));
  const paoLink = cardsCard.querySelector('.numsys-open-link[data-tab="pao"]');
  check('Edit PAO table link present on Cards card', !!paoLink);
  check('no such link on Words/Images cards', !Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Words')).querySelector('.numsys-open-link'));
  paoLink.click();
  await new Promise(r=>setTimeout(r,30));
  check('Number System view opened', doc.getElementById('view-number-system').classList.contains('active'));
  check('PAO tab is active after entry via Cards card', win.eval('currentNumSysTab') === 'pao');
  // navigating via a link is a one-off peek, not a deliberate choice — the remembered
  // preference should only change when the user clicks the in-page tab toggle itself
  check('remembered preference is untouched by link navigation (still major)', win.eval('DB.numberSystemPref') === 'major');

  // ---- PAO grid: empty by default, no pre-filled content anywhere ----
  let rows = doc.querySelectorAll('.pao-row');
  check('100 PAO rows rendered', rows.length === 100);
  const row24 = doc.querySelector('.pao-row[data-num="24"]');
  const inputs24 = row24.querySelectorAll('.pao-input');
  check('row 24 has 3 inputs (person/action/object)', inputs24.length === 3);
  check('all 3 inputs start completely empty (no defaults)', Array.from(inputs24).every(i=>i.value===''));
  check('no "built" badge before any fields are filled', !row24.querySelector('.pill-gold'));
  check('progress shows 0/100 fully built initially', doc.getElementById('numsys-progress').textContent.includes('0/100'));

  // ---- fill in one field at a time, verify partial state ----
  const personInput = row24.querySelector('.pao-input[data-field="person"]');
  personInput.value = 'Arnold';
  personInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));
  check('partial entry saved to DB.pao.entries', win.eval('DB.pao.entries["24"].person') === 'Arnold');
  let row24b = doc.querySelector('.pao-row[data-num="24"]');
  check('preview shows partial content', row24b.textContent.includes('Arnold'));
  check('not marked "built" with only 1 of 3 fields filled', !row24b.querySelector('.pill-gold'));

  const actionInput = row24b.querySelector('.pao-input[data-field="action"]');
  actionInput.value = 'lifts';
  actionInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));
  const objectInput = doc.querySelector('.pao-row[data-num="24"] .pao-input[data-field="object"]');
  objectInput.value = 'a dumbbell';
  objectInput.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  const row24c = doc.querySelector('.pao-row[data-num="24"]');
  check('all 3 fields persisted', win.eval('JSON.stringify(DB.pao.entries["24"])').includes('lifts') && win.eval('JSON.stringify(DB.pao.entries["24"])').includes('dumbbell'));
  check('marked "built" once all 3 fields are filled', !!row24c.querySelector('.pill-gold'));
  check('preview combines all three in order', row24c.textContent.includes('Arnold lifts a dumbbell'));
  check('progress now shows 1/100 fully built', doc.getElementById('numsys-progress').textContent.includes('1/100'));

  // ---- filtering across person/action/object text ----
  const filterInput = doc.getElementById('numsys-filter');
  filterInput.value = 'dumbbell';
  filterInput.dispatchEvent(new win.Event('input'));
  await new Promise(r=>setTimeout(r,30));
  rows = doc.querySelectorAll('.pao-row');
  check('filtering by object text finds row 24 only', rows.length === 1 && rows[0].dataset.num === '24');
  filterInput.value = '';
  filterInput.dispatchEvent(new win.Event('input'));
  await new Promise(r=>setTimeout(r,30));

  // ---- switch to Major System tab and back: PAO state survives ----
  doc.querySelector('.numsys-tab-btn[data-tab="major"]').click();
  await new Promise(r=>setTimeout(r,30));
  check('switched to Major System tab', doc.querySelectorAll('.numsys-row').length === 100 && doc.querySelectorAll('.pao-row').length === 0);
  check('legend visible again on Major System tab', doc.getElementById('numsys-legend-card').style.display !== 'none');
  doc.querySelector('.numsys-tab-btn[data-tab="pao"]').click();
  await new Promise(r=>setTimeout(r,30));
  check('legend hidden on PAO tab', doc.getElementById('numsys-legend-card').style.display === 'none');
  const row24d = doc.querySelector('.pao-row[data-num="24"]');
  check('PAO entry for 24 survived the tab switch', row24d.querySelector('.pao-input[data-field="person"]').value === 'Arnold');

  // ---- entry point: Lesson 4.1 secondary action ----
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const lesson41 = doc.querySelector('details[data-lesson-id="l4-1"]');
  lesson41.open = true;
  const btns41 = lesson41.querySelectorAll('.lesson-try-btn');
  check('Lesson 4.1 has both primary and secondary action buttons', btns41.length === 2);
  const paoBtn = Array.from(btns41).find(b=>b.textContent.includes('PAO table'));
  check('secondary button labeled "Build your PAO table"', !!paoBtn);
  const prefBeforeLinkClick = win.eval('DB.numberSystemPref');
  paoBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('Lesson 4.1 secondary action opens PAO tab directly', doc.getElementById('view-number-system').classList.contains('active') && win.eval('currentNumSysTab') === 'pao');
  check('link navigation never changes whatever the preference already was', win.eval('DB.numberSystemPref') === prefBeforeLinkClick);

  // ---- now perform a deliberate tab click and confirm THAT does update the remembered preference ----
  doc.querySelector('.numsys-tab-btn[data-tab="major"]').click();
  await new Promise(r=>setTimeout(r,30));
  check('deliberate tab click updates the remembered preference', win.eval('DB.numberSystemPref') === 'major');
  doc.querySelector('.numsys-tab-btn[data-tab="pao"]').click();
  await new Promise(r=>setTimeout(r,30));
  check('switching back updates it again', win.eval('DB.numberSystemPref') === 'pao');

  // ---- storage round-trip ----
  const savedPao = win.eval('JSON.stringify(DB.pao)');
  check('DB.pao serializes with the Arnold/lifts/dumbbell entry', savedPao.includes('Arnold') && savedPao.includes('lifts') && savedPao.includes('dumbbell'));
  const savedPref = win.eval('DB.numberSystemPref');
  check('preference remembers pao as last-used tab', savedPref === 'pao');

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
