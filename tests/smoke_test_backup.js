// Export backup: the web app writes one JSON file holding everything, in the
// format the Godot app imports (app: 'mnemosyne', schema 1, data: {...}).
const { JSDOM } = require('jsdom');
const fs = require('fs');

(async () => {
  const html = fs.readFileSync('index.html', 'utf-8');
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/', pretendToBeVisual: true,
    beforeParse(window) { window.onerror = (msg) => { errors.push(String(msg)); }; window.pdfjsLib = { GlobalWorkerOptions: {} }; } });
  const win = dom.window;
  await new Promise(res => win.document.addEventListener('DOMContentLoaded', () => setTimeout(res, 300)));
  const check = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);
  win.eval(`DB.palaces.push({id:'p1', name:'Home', loci:[{id:'l1', title:'Door', content:{text:'a giant 7'}, image:null}]}); DB.pao.entries['12'] = {person:'Tina', action:'dances', object:'tuba'};`);
  const out = JSON.parse(win.eval('backupJson()'));
  check('backup is tagged as a Mnemosyne backup', out.app === 'mnemosyne' && out.schema === 1 && typeof out.exportedAt === 'number');
  check('backup holds palaces with their memories', out.data.palaces[0].loci[0].content.text === 'a giant 7');
  check('backup holds every section', ['palaces', 'decks', 'history', 'learn', 'majorSystem', 'pao', 'numberSystemPref'].every(k => k in out.data));
  check('backup holds the PAO table', out.data.pao.entries['12'].object === 'tuba');
  let clicked = null;
  win.URL.createObjectURL = () => 'blob:x'; win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () { clicked = this.download; };
  win.document.getElementById('btn-export-backup').click();
  check('the Export backup button downloads a dated file', /^mnemosyne-backup-\d{4}-\d{2}-\d{2}\.json$/.test(clicked || ''));
  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
