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
      // deliberately NOT stubbing window.storage: this simulates the app
      // opened completely standalone, outside the Claude artifact runtime.
    }
  });
  const win = dom.window;
  await new Promise(res => win.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  await new Promise(res => setTimeout(res, 300));
  const doc = win.document;
  const check = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);

  check('window.storage is genuinely absent in this simulated standalone run', typeof win.storage === 'undefined');
  check('hasNativeStorage() correctly reports false', win.eval('hasNativeStorage()') === false);

  // ---- create real data through the normal UI, no shortcuts ----
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'Standalone Test Palace';
  doc.getElementById('np-desc').value = 'Created with no window.storage available';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,40));
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));
  const titleInput = doc.querySelector('.locus-title');
  titleInput.value = 'Front door';
  titleInput.dispatchEvent(new win.Event('change'));
  const contentArea = doc.querySelector('.locus-content');
  contentArea.value = 'A giant key made of glass, humming softly';
  contentArea.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,40));

  // ---- confirm it actually landed in real localStorage, not just in-memory ----
  const rawStored = win.localStorage.getItem('mnemosyne:palaces');
  check('data written to real localStorage under the mnemosyne: prefix', !!rawStored && rawStored.includes('Standalone Test Palace'));
  check('no "Could not save" toast fired (the fallback actually worked, not just failed silently)', !doc.getElementById('toast-root').textContent.includes('Could not save'));

  // ---- the real test: simulate a full page reload by creating a FRESH dom
  //      against the SAME localStorage, and confirm everything comes back ----
  const dom2 = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://example.org/',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.onerror = (msg, src, line, col) => { errors.push(`reload: ${msg} (line ${line}:${col})`); };
      window.pdfjsLib = { GlobalWorkerOptions: {} };
      // carry the exact localStorage contents over, simulating the same browser profile reopening the file
      for(let i=0;i<win.localStorage.length;i++){
        const k = win.localStorage.key(i);
        window.localStorage.setItem(k, win.localStorage.getItem(k));
      }
    }
  });
  const win2 = dom2.window;
  await new Promise(res => win2.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  await new Promise(res => setTimeout(res, 300));
  const doc2 = win2.document;

  check('after a simulated reload, the palace still exists', win2.eval('DB.palaces.length') === 1);
  check('palace name survived the reload', win2.eval('DB.palaces[0].name') === 'Standalone Test Palace');
  check('station content survived the reload', win2.eval('DB.palaces[0].loci[0].content.text').includes('glass, humming softly'));

  win2.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  check('UI correctly reflects the reloaded data too, not just DB state', doc2.querySelector('.palace-card').textContent.includes('Standalone Test Palace'));

  // ---- separately: confirm native window.storage is still PREFERRED when present ----
  // (this matters so behavior inside Claude.ai itself is completely unchanged)
  const dom3 = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://example.org/',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.pdfjsLib = { GlobalWorkerOptions: {} };
      const fakeStore = {};
      window.storage = {
        get: async (key) => (key in fakeStore) ? { key, value: fakeStore[key], shared:false } : null,
        set: async (key, value, shared) => { fakeStore[key] = value; return { key, value, shared }; },
      };
      window.__fakeStore = fakeStore;
    }
  });
  const win3 = dom3.window;
  await new Promise(res => win3.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  await new Promise(res => setTimeout(res, 300));
  const doc3 = win3.document;
  check('hasNativeStorage() reports true when window.storage is present', win3.eval('hasNativeStorage()') === true);

  doc3.getElementById('btn-new-palace').click();
  doc3.getElementById('np-name').value = 'Native Storage Palace';
  doc3.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,40));

  check('data went into the native window.storage fake, not localStorage', win3.eval('window.__fakeStore.palaces').includes('Native Storage Palace'));
  check('localStorage was NOT used when native storage is available', win3.localStorage.getItem('mnemosyne:palaces') === null);

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
