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

  // ---- set up two decks with items ----
  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'Meditations';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-item').click();
  doc.getElementById('btn-add-item').click();
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  let texts = doc.querySelectorAll('.item-text');
  texts[0].value = 'You have power over your mind, not outside events.';
  texts[0].dispatchEvent(new win.Event('change'));
  texts[1].value = 'Waste no more time arguing about what a good man should be.';
  texts[1].dispatchEvent(new win.Event('change'));
  texts[2].value = 'The impediment to action advances action.';
  texts[2].dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));

  // ---- no marks yet: toggle row shows 0, no filter effect needed ----
  check('mark toggle shows 0 marked initially', doc.getElementById('deck-marked-toggle').textContent.includes('0 marked'));
  check('star icons render unfilled by default', Array.from(doc.querySelectorAll('.item-mark')).every(b=>b.textContent.trim()==='\u2606'));

  // ---- mark item 0 and item 2 (skip item 1) ----
  let rows = doc.querySelectorAll('.deck-item-row');
  rows[0].querySelector('.item-mark').click();
  await new Promise(r=>setTimeout(r,40));
  rows = doc.querySelectorAll('.deck-item-row');
  rows[2].querySelector('.item-mark').click();
  await new Promise(r=>setTimeout(r,40));

  check('toggle now shows 2 marked', doc.getElementById('deck-marked-toggle').textContent.includes('2 marked'));
  const markedItem0 = win.eval('getCurrentDeck().items[0].marked');
  const markedItem1 = win.eval('getCurrentDeck().items[1].marked');
  const markedItem2 = win.eval('getCurrentDeck().items[2].marked');
  check('item 0 marked in storage', markedItem0 === true);
  check('item 1 NOT marked (untouched)', !markedItem1);
  check('item 2 marked in storage', markedItem2 === true);

  // ---- filter to marked-only ----
  doc.getElementById('deck-marked-toggle').click();
  await new Promise(r=>setTimeout(r,30));
  rows = doc.querySelectorAll('.deck-item-row');
  check('marked-only filter shows exactly 2 rows', rows.length === 2);
  doc.getElementById('deck-marked-toggle').click();
  await new Promise(r=>setTimeout(r,30));
  check('unfiltering restores all 3 rows', doc.querySelectorAll('.deck-item-row').length === 3);

  // ---- add a second deck with one marked item, to test cross-deck aggregation ----
  win.eval("go('library','library'); renderDeckList();");
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'Unlimited Memory notes';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  const t2 = doc.querySelector('.item-text');
  t2.value = 'SEE stands for Senses, Exaggeration, Energize.';
  t2.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  doc.querySelector('.item-mark').click();
  await new Promise(r=>setTimeout(r,40));

  // ---- library tab shows cross-deck marked section ----
  win.eval("go('library','library'); renderDeckList();");
  await new Promise(r=>setTimeout(r,30));
  const markedSection = doc.getElementById('library-marked');
  check('cross-deck marked section renders', markedSection.textContent.includes('Marked to learn'));
  check('cross-deck section shows 3 total across 2 decks', markedSection.textContent.includes('3 across 2 deck'));
  check('cross-deck section lists items from both decks', markedSection.textContent.includes('Meditations') && markedSection.textContent.includes('Unlimited Memory notes'));
  check('deck cards show a marked-count badge', Array.from(doc.querySelectorAll('.deck-card')).some(c=>c.textContent.includes('\u2605 2 marked')) && Array.from(doc.querySelectorAll('.deck-card')).some(c=>c.textContent.includes('\u2605 1 marked')));

  // ---- practice all marked items across decks ----
  const practiceBtn = doc.getElementById('btn-practice-marked');
  check('practice-all-marked button present', !!practiceBtn);
  practiceBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('study modal shows all 3 marked items regardless of source deck', doc.querySelector('.modal').textContent.includes('3 ITEMS'));
  check('virtual deck title reads "Marked to learn"', doc.querySelector('.modal h3').textContent.includes('Marked to learn'));
  doc.getElementById('dp-start-recall').click();
  await new Promise(r=>setTimeout(r,20));
  // walk through all 3, mark 2 correct 1 wrong
  for(let i=0;i<3;i++){
    doc.getElementById('dp-reveal').click();
    await new Promise(r=>setTimeout(r,20));
    const btn = i===1 ? doc.getElementById('dp-wrong') : doc.getElementById('dp-correct');
    btn.click();
    await new Promise(r=>setTimeout(r,20));
  }
  check('modal closed after finishing the aggregate practice session', doc.getElementById('modal-root').innerHTML.trim() === '');
  const lastHistoryEntry = win.eval('DB.history[0]');
  check('history logged the aggregate session with correct 2/3 score', lastHistoryEntry.type==='deck-recall' && lastHistoryEntry.label==='Marked to learn' && lastHistoryEntry.correct===2 && lastHistoryEntry.total===3);
  check('no phantom deck was created for the virtual "__marked__" id', !win.eval('DB.decks.find(d=>d.id==="__marked__")'));

  // ---- storage round-trip: marks persist ----
  const savedDecks = win.eval('JSON.stringify(DB.decks)');
  check('marked flags persisted into DB.decks storage', (savedDecks.match(/"marked":true/g)||[]).length === 3);

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
