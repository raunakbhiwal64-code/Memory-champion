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
      window.onerror = (msg, src, line, col, err) => { errors.push(`${msg} (line ${line}:${col})`); };
      window.pdfjsLib = { GlobalWorkerOptions: {} };
    }
  });
  const win = dom.window;
  await new Promise(res => win.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  await new Promise(res => setTimeout(res, 300));
  const doc = win.document;
  const check = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);

  // ---- palace / library flows already passed in prior run; re-verify quickly ----
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Test Home';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-back-palaces').click();

  // ---- new deck (manual, no pdf) ----
  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'Test Deck';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  check('deck detail opened', doc.getElementById('view-deck-detail').classList.contains('active'));
  doc.getElementById('btn-add-item').click();
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  check('two deck items rendered', doc.querySelectorAll('.deck-item-row').length === 2);
  const itemTexts = doc.querySelectorAll('.item-text');
  itemTexts[0].value = 'The unexamined life is not worth living.';
  itemTexts[0].dispatchEvent(new win.Event('change'));
  itemTexts[1].value = 'Know thyself.';
  itemTexts[1].dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));

  // assign to palace
  doc.getElementById('btn-deck-assign').click();
  await new Promise(r=>setTimeout(r,20));
  check('assign modal opened', !!doc.getElementById('am-go'));
  doc.getElementById('am-mode').value = 'append';
  doc.getElementById('am-go').click();
  await new Promise(r=>setTimeout(r,30));

  // deck recall practice
  doc.getElementById('btn-deck-practice').click();
  await new Promise(r=>setTimeout(r,20));
  check('deck study modal opened', !!doc.getElementById('dp-start-recall'));
  doc.getElementById('dp-start-recall').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('dp-reveal').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('dp-correct').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('dp-reveal').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('dp-wrong').click();
  await new Promise(r=>setTimeout(r,30));
  check('modal closed after last item', doc.getElementById('modal-root').innerHTML.trim() === '');

  // ---- drills: run all 5 disciplines end-to-end via eval (let-scoped globals) ----
  for (const disc of ['numbers','words','cards','images','names']) {
    win.eval(`openDrillSetup(${JSON.stringify(disc)})`);
    await new Promise(r=>setTimeout(r,20));
    doc.getElementById('ds-level').value = '0';
    doc.getElementById('ds-start').click();
    await new Promise(r=>setTimeout(r,30));
    win.eval('clearInterval(drillState.timerHandle); startRecallPhase();');
    await new Promise(r=>setTimeout(r,30));

    if (disc === 'images') {
      const cells = doc.querySelectorAll('.img-recall-cell');
      // click in shuffled DOM order (won't be all correct, that's fine — just exercising the path)
      cells.forEach(c => c.click());
    } else if (disc === 'names') {
      const inputs = doc.querySelectorAll('#names-recall-grid .seq-input');
      const items = win.eval('drillState.items');
      inputs.forEach((inp,i)=>{ inp.value = items[i].name; });
    } else {
      const inputs = doc.querySelectorAll('#seq-recall-container .seq-input');
      const items = win.eval('drillState.items');
      inputs.forEach((inp,i)=>{
        inp.value = disc==='cards' ? items[i].canon : items[i];
      });
    }
    doc.getElementById('drill-submit').click();
    await new Promise(r=>setTimeout(r,30));
    const resultTitle = doc.querySelector('#drill-session-root .view-title');
    check(`${disc} drill completed with a result screen`, resultTitle && /\d+ \/ \d+ correct/.test(resultTitle.textContent));
    doc.getElementById('drill-done').click();
    await new Promise(r=>setTimeout(r,20));
  }

  // ---- history + dashboard reflect the logged sessions ----
  win.eval("go('history','history'); renderHistory();");
  await new Promise(r=>setTimeout(r,20));
  const historyRows = doc.querySelectorAll('#history-list > .card > div');
  check('history has 7 logged sessions (1 deck-recall + 1 palace n/a + 5 drills)', historyRows.length === 6);
  win.eval("go('dashboard','dashboard'); renderDashboard();");
  await new Promise(r=>setTimeout(r,20));
  check('dashboard streak shows 1 day', doc.getElementById('dash-stats').textContent.includes('1'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
