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

  // ---- open 3D explore, land on default (Hall of Mirrors) ----
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-explore-3d').click();
  await new Promise(r=>setTimeout(r,30));
  check('3D explore view active', doc.getElementById('view-3d-explore').classList.contains('active'));

  const buildBtn = doc.getElementById('btn-build-palace');
  check('Build a palace here button present', !!buildBtn);
  check('button says "Build a palace here" (no palace linked yet)', buildBtn.textContent.includes('Build a palace here'));
  check('DB.palaces is empty before building', win.eval('DB.palaces.length') === 0);

  // ---- build a palace from Hall of Mirrors ----
  buildBtn.click();
  await new Promise(r=>setTimeout(r,40));
  check('navigated to Palace Detail after building', doc.getElementById('view-palace-detail').classList.contains('active'));
  check('new palace named after the 3D place', doc.getElementById('pd-title').textContent.includes('Hall of Mirrors'));
  check('palace.basedOn records the catalog id', win.eval('DB.palaces[0].basedOn.catalogId') === 'glaces');
  check('palace.loci starts empty (no prefilled stations)', win.eval('DB.palaces[0].loci.length') === 0);

  const backLink = doc.querySelector('.pd-view-3d');
  check('palace detail shows a "View in 3D" link back to the source', !!backLink && backLink.textContent.includes('Hall of Mirrors'));

  // ---- add a station with content, exactly like any other palace ----
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));
  const titleInput = doc.querySelector('.locus-title');
  titleInput.value = 'Third mirror arch from the entrance';
  titleInput.dispatchEvent(new win.Event('change'));
  const contentArea = doc.querySelector('.locus-content');
  contentArea.value = 'A giant chandelier made of ice, dripping onto the parquet floor';
  contentArea.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));
  check('station content saved into the linked palace, same as any palace', win.eval('DB.palaces[0].loci[0].content.text').includes('chandelier'));

  // ---- palace list shows the 3D-reference pill ----
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  check('palace card shows a "3D reference" pill', doc.querySelector('.palace-card').textContent.includes('3D reference: Hall of Mirrors'));

  // ---- back link navigates to 3D view with the correct room selected ----
  win.eval("openPalace(DB.palaces[0].id);");
  await new Promise(r=>setTimeout(r,30));
  doc.querySelector('.pd-view-3d').click();
  await new Promise(r=>setTimeout(r,30));
  check('back-link navigation opens 3D view', doc.getElementById('view-3d-explore').classList.contains('active'));
  check('back-link selects the correct room (Hall of Mirrors)', win.eval('current3DRoom') === 'glaces');
  const iframe = doc.querySelector('#room-embed-wrap iframe');
  check('iframe shows the correct verified uid on return', !!iframe && iframe.src.includes('d06415253af04077a82e056282173b65'));

  // ---- revisiting the same 3D place offers "Open your palace here" instead of "Build" ----
  const rebuildBtn = doc.getElementById('btn-build-palace');
  check('button now offers to open the existing palace, not build a duplicate', rebuildBtn.textContent.includes('Open your palace here') && rebuildBtn.textContent.includes('1 station'));
  rebuildBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('clicking it opens the SAME palace rather than creating a new one', win.eval('DB.palaces.length') === 1 && doc.getElementById('view-palace-detail').classList.contains('active'));

  // ---- a normal palace (not based on a 3D place) shows no basedOn UI ----
  win.eval("go('palaces','palaces');");
  doc.getElementById('btn-new-palace').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('np-name').value = 'My own childhood home';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,40));
  check('a manually-created palace shows no "View in 3D" link', doc.getElementById('pd-basedon').innerHTML.trim() === '');
  win.eval("renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  const cards = Array.from(doc.querySelectorAll('.palace-card'));
  const manualCard = cards.find(c=>c.textContent.includes('childhood home'));
  check('manually-created palace card has no 3D-reference pill', !manualCard.textContent.includes('3D reference'));

  // ---- storage round-trip ----
  const savedPalaces = win.eval('JSON.stringify(DB.palaces)');
  check('basedOn metadata persisted to storage', savedPalaces.includes('"catalogId":"glaces"'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
