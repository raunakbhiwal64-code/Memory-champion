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

  // ================= Pillar 3: strict unidirectional recall =================
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Test Villa';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-locus').click();
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));

  // ---- Pillar 2: distinctness nudge on duplicate titles ----
  let rows = doc.querySelectorAll('.locus-row');
  const t0 = rows[0].querySelector('.locus-title');
  t0.value = 'Front Door'; t0.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  const t1 = rows[1].querySelector('.locus-title');
  t1.value = 'front door'; // same, different case
  t1.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  const toastTexts = Array.from(doc.querySelectorAll('#toast-root .toast')).map(e=>e.textContent);
  check('distinctness nudge toast fires on duplicate title', toastTexts.some(t=>t.includes('already used')));

  // study mode still allows Prev
  win.eval("startWalk('study')");
  await new Promise(r=>setTimeout(r,30));
  check('study mode shows Prev button', !!doc.getElementById('wk-prev'));
  doc.getElementById('wk-close').click();

  // recall mode: no Prev button anywhere in the sequence
  win.eval("startWalk('recall')");
  await new Promise(r=>setTimeout(r,30));
  check('recall mode has no Prev button on station 1', !doc.getElementById('wk-prev'));
  check('recall mode shows forward-only label', doc.querySelector('.modal').textContent.includes('forward only'));
  doc.getElementById('wk-next').click();
  await new Promise(r=>setTimeout(r,30));
  check('recall mode has no Prev button on station 2 either', !doc.getElementById('wk-prev'));

  // finish the recall walk to trigger SM-2
  doc.getElementById('wk-next').click();
  await new Promise(r=>setTimeout(r,50));
  check('modal closed after finishing recall', doc.getElementById('modal-root').innerHTML.trim() === '');

  // ================= Pillar 5: spaced repetition (SM-2) =================
  const srs = win.eval('DB.palaces[0].srs');
  check('palace has srs data after a recall walk', srs && typeof srs.dueAt === 'number');
  check('srs.reps is 0 given both items were missed (never revealed = quality<3)', win.eval('DB.palaces[0].srs.reps') === 0);

  win.eval("renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  const palaceCard = doc.querySelector('.palace-card');
  check('palace card shows a review-status pill', /Due for review|Next review/.test(palaceCard.textContent));

  // force srs due date into the past and confirm it surfaces on the dashboard
  win.eval('DB.palaces[0].srs.dueAt = Date.now() - 1000;');
  win.eval("go('dashboard','dashboard'); renderDashboard();");
  await new Promise(r=>setTimeout(r,30));
  check('due palace appears in dashboard "Due for review"', doc.getElementById('dash-due').textContent.includes('Test Villa'));
  const reviewBtn = doc.querySelector('.dash-review-palace');
  check('dashboard has a "Walk it" quick-action for the due palace', !!reviewBtn);
  reviewBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('quick-action opens the recall walk modal directly', !!doc.getElementById('wk-close'));
  doc.getElementById('wk-close').click();

  // ================= 3D explore is parked (archive/3d-explore) =================
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  check('no "Explore in 3D" button on the Palaces view', !doc.getElementById('btn-explore-3d'));
  check('no 3D explore view in the page', !doc.getElementById('view-3d-explore'));
  check('no Sketchfab or YouTube embeds left in the page source', !html.includes('sketchfab.com') && !html.includes('youtube.com/embed'));

  // Lesson 2.2 (empty run) try-action now opens the castle
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const emptyRunLesson = doc.querySelector('details[data-lesson-id="l2-2"]');
  check('empty-run lesson exists', !!emptyRunLesson);
  emptyRunLesson.open = true;
  emptyRunLesson.querySelector('.lesson-try-btn').click();
  await new Promise(r=>setTimeout(r,60));
  check('empty-run lesson Try-it opens the castle', doc.getElementById('castle-root').classList.contains('open'));
  check('empty-run lesson Try-it created the castle palace', win.eval('DB.palaces.some(isCastle)'));
  doc.getElementById('castle-fallback-exit').click();

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
