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

  // ---- set up a palace and a deck with 3 items, 2 of them marked ----
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Study Hall';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  win.eval("go('library','library'); renderDeckList();");
  await new Promise(r=>setTimeout(r,30));

  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'Stoic Quotes';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-item').click();
  doc.getElementById('btn-add-item').click();
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  let texts = doc.querySelectorAll('.item-text');
  texts[0].value = 'Quote A: on discipline'; texts[0].dispatchEvent(new win.Event('change'));
  texts[1].value = 'Quote B: on anger';       texts[1].dispatchEvent(new win.Event('change'));
  texts[2].value = 'Quote C: on death';       texts[2].dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  let markBtns = doc.querySelectorAll('.item-mark');
  markBtns[0].click(); // mark A
  await new Promise(r=>setTimeout(r,30));
  markBtns = doc.querySelectorAll('.item-mark');
  markBtns[2].click(); // mark C, leave B unmarked
  await new Promise(r=>setTimeout(r,30));

  // ================= TEST 1: per-deck assign modal, "only marked" checkbox =================
  doc.getElementById('btn-deck-assign').click();
  await new Promise(r=>setTimeout(r,20));
  const markedCheckbox = doc.getElementById('am-marked-only');
  check('marked-only checkbox appears when the deck has marked items', !!markedCheckbox);
  check('checkbox label shows correct count (2 of 3)', doc.querySelector('.modal').textContent.includes('2 of 3'));
  check('count note initially shows all 3 (checkbox unchecked)', doc.getElementById('am-count-note').textContent.includes('3 item'));

  markedCheckbox.checked = true;
  markedCheckbox.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,20));
  check('count note updates to 2 once checkbox is checked', doc.getElementById('am-count-note').textContent.includes('2 item'));

  doc.getElementById('am-mode').value = 'append';
  doc.getElementById('am-go').click();
  await new Promise(r=>setTimeout(r,40));

  const palace1 = win.eval('DB.palaces[0]');
  check('exactly 2 stations created (only the marked ones, not all 3)', palace1.loci.length === 2);
  const placedTexts = palace1.loci.map(l=>l.content.text);
  check('Quote A (marked) made it in', placedTexts.includes('Quote A: on discipline'));
  check('Quote C (marked) made it in', placedTexts.includes('Quote C: on death'));
  check('Quote B (NOT marked) correctly excluded', !placedTexts.includes('Quote B: on anger'));
  check('each marked item landed in its own distinct station', new Set(placedTexts).size === 2);

  // ================= TEST 2: cross-deck "Marked to learn" -> Send to palace =================
  // add a second deck with one more marked item, to prove cross-deck aggregation works here too
  win.eval("go('library','library'); renderDeckList();");
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'Second Book';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  const t2 = doc.querySelector('.item-text');
  t2.value = 'A line from a different book entirely';
  t2.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  doc.querySelector('.item-mark').click();
  await new Promise(r=>setTimeout(r,30));

  win.eval("go('library','library'); renderDeckList();");
  await new Promise(r=>setTimeout(r,30));
  const sendMarkedBtn = doc.getElementById('btn-send-marked');
  check('"Send to palace" button present on the cross-deck marked section', !!sendMarkedBtn);
  sendMarkedBtn.click();
  await new Promise(r=>setTimeout(r,20));
  check('assign-marked modal opened', !!doc.getElementById('amm-go'));
  check('modal mentions all 3 marked items across both decks', doc.querySelector('.modal').textContent.includes('3 marked item'));
  doc.getElementById('amm-mode').value = 'append';
  doc.getElementById('amm-go').click();
  await new Promise(r=>setTimeout(r,40));

  const palace1After = win.eval('DB.palaces[0]');
  check('palace now has 5 stations total (2 from before + 3 newly sent)', palace1After.loci.length === 5);
  const allTexts = palace1After.loci.map(l=>l.content.text);
  check('cross-deck item made it in, alongside the earlier per-deck ones', allTexts.includes('A line from a different book entirely'));
  const sources = palace1After.loci.map(l=>l.content.source);
  check('source attribution correctly reflects the ORIGINAL deck each item came from', sources.includes('Stoic Quotes') && sources.includes('Second Book'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
