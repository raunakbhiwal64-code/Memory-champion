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

  // ================= 3D explore panel =================
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-explore-3d').click();
  await new Promise(r=>setTimeout(r,30));
  check('3D explore view active', doc.getElementById('view-3d-explore').classList.contains('active'));
  let roomTabs = doc.querySelectorAll('.room-tab-btn');
  check('8 room tabs rendered by default (all regions)', roomTabs.length === 8);
  let iframe = doc.querySelector('#room-embed-wrap iframe');
  check('iframe defaults to Hall of Mirrors (verified uid)', iframe.src.includes('d06415253af04077a82e056282173b65'));
  check('iframe requests xr-spatial-tracking permission', iframe.getAttribute('allow').includes('xr-spatial-tracking'));
  check('credit line renders for the default room', doc.getElementById('room-credit').textContent.includes('Ch\u00e2teau de Versailles'));
  check('a working sketchfab embed also gets a fallback "open on Sketchfab" link alongside its iframe', doc.querySelector('#room-embed-wrap iframe') && doc.querySelector('#room-embed-wrap a') && doc.querySelector('#room-embed-wrap a').textContent.includes('Open on Sketchfab'));

  // region filter: India (now 5 entries: gateway, mysore, taj, amer fort, city palace)
  doc.querySelector('.region-tab-btn[data-region="india"]').click();
  await new Promise(r=>setTimeout(r,30));
  roomTabs = doc.querySelectorAll('.room-tab-btn');
  check('India filter shows exactly 5 entries', roomTabs.length === 5);
  check('India filter includes Mysore Palace', Array.from(roomTabs).some(b=>b.textContent.includes('Mysore')));
  check('India filter includes Gateway of India', Array.from(roomTabs).some(b=>b.textContent.includes('Gateway of India')));
  check('India filter includes Taj Mahal', Array.from(roomTabs).some(b=>b.textContent.includes('Taj Mahal')));
  check('India filter includes Amer Fort', Array.from(roomTabs).some(b=>b.textContent.includes('Amer Fort')));
  check('India filter includes City Palace', Array.from(roomTabs).some(b=>b.textContent.includes('City Palace')));

  Array.from(roomTabs).find(b=>b.textContent.includes('Mysore')).click();
  await new Promise(r=>setTimeout(r,30));
  check('Mysore renders no iframe (confirmed broken embed, link-only now)', !doc.querySelector('#room-embed-wrap iframe'));
  const mysoreLink = doc.querySelector('#room-embed-wrap a');
  check('Mysore shows a direct "Open on Sketchfab" link instead', !!mysoreLink && mysoreLink.href.includes('sketchfab.com/3d-models/mysore-palace') && mysoreLink.textContent.includes('Open on Sketchfab'));
  check('Mysore credit explains the embed is unreliable, confirmed by a real report', doc.getElementById('room-credit').textContent.toLowerCase().includes("doesn't reliably display"));

  // youtube360 kind: Amer Fort
  Array.from(doc.querySelectorAll('.room-tab-btn')).find(b=>b.textContent.includes('Amer Fort')).click();
  await new Promise(r=>setTimeout(r,30));
  iframe = doc.querySelector('#room-embed-wrap iframe');
  check('Amer Fort embeds the correct YouTube video id', !!iframe && iframe.src.includes('youtube.com/embed/wEkhDyLApXo'));
  check('Amer Fort credit flags the spherical-metadata caveat honestly', doc.getElementById('room-credit').textContent.includes("haven't independently confirmed"));

  // youtube360 kind: City Palace Jaipur
  Array.from(doc.querySelectorAll('.room-tab-btn')).find(b=>b.textContent.includes('City Palace')).click();
  await new Promise(r=>setTimeout(r,30));
  iframe = doc.querySelector('#room-embed-wrap iframe');
  check('City Palace Jaipur embeds the correct YouTube video id', !!iframe && iframe.src.includes('youtube.com/embed/Fh-7UE81Bgk'));

  // Taj Mahal: now youtube360 (consolidated off A-Frame, the easier option to integrate)
  Array.from(doc.querySelectorAll('.room-tab-btn')).find(b=>b.textContent.includes('Taj Mahal')).click();
  await new Promise(r=>setTimeout(r,30));
  iframe = doc.querySelector('#room-embed-wrap iframe');
  check('Taj Mahal embeds the correct YouTube video id', !!iframe && iframe.src.includes('youtube.com/embed/Zt-E7i3cSHg'));
  check('Taj Mahal credit is honestly labeled as not a palace', doc.getElementById('room-credit').textContent.includes('not a palace'));
  check('no A-Frame elements exist anywhere in the DOM', doc.querySelectorAll('a-scene, a-sky, a-assets, a-camera').length === 0);
  check('no aframe script tag remains in the page source', !html.includes('aframe.min.js'));

  // region filter: International
  doc.querySelector('.region-tab-btn[data-region="international"]').click();
  await new Promise(r=>setTimeout(r,30));
  roomTabs = doc.querySelectorAll('.room-tab-btn');
  check('International filter shows exactly 3 entries', roomTabs.length === 3);
  Array.from(roomTabs).find(b=>b.textContent.includes('Royal Chapel')).click();
  await new Promise(r=>setTimeout(r,30));
  iframe = doc.querySelector('#room-embed-wrap iframe');
  check('switching tabs swaps to the Royal Chapel verified uid', iframe.src.includes('0a4b8a6048b8407a8c89b5afdbadc35b'));

  doc.getElementById('btn-back-3d').click();
  await new Promise(r=>setTimeout(r,30));
  check('back button returns to Palaces view', doc.getElementById('view-palaces').classList.contains('active'));

  // Lesson 2.2 (empty run) try-action opens the 3D view
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const emptyRunLesson = doc.querySelector('details[data-lesson-id="l2-2"]');
  check('empty-run lesson exists', !!emptyRunLesson);
  emptyRunLesson.open = true;
  emptyRunLesson.querySelector('.lesson-try-btn').click();
  await new Promise(r=>setTimeout(r,30));
  check('empty-run lesson Try-it opens the 3D view', doc.getElementById('view-3d-explore').classList.contains('active'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
