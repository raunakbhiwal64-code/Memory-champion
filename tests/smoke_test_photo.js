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

  // create palace + station
  doc.getElementById('btn-new-palace').click();
  doc.getElementById('np-name').value = 'My House';
  doc.getElementById('np-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-locus').click();
  await new Promise(r=>setTimeout(r,30));

  // photo UI present, no image yet
  let row = doc.querySelector('.locus-row');
  check('add-photo label present before any photo', row.querySelector('.locus-photo-label').textContent.includes('Add photo'));
  check('hidden file input present with camera capture', row.querySelector('.locus-photo-input').getAttribute('capture') === 'environment');
  check('no remove button before a photo exists', !row.querySelector('.locus-photo-remove'));
  check('no thumbnail before a photo exists', !row.querySelector('.locus-thumb'));

  // simulate what compressImageFile would hand back (a small real base64 JPEG) and push it through
  // the same storage path a real browser's canvas.toDataURL would use.
  const fakeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=';
  win.eval(`updateLocus(${JSON.stringify(row.dataset.id)}, {image: ${JSON.stringify(fakeDataUrl)}}).then(()=>renderLociList())`);
  await new Promise(r=>setTimeout(r,60));

  row = doc.querySelector('.locus-row');
  check('thumbnail renders after image set', !!row.querySelector('.locus-thumb'));
  check('thumbnail src matches stored data url', row.querySelector('.locus-thumb').getAttribute('src') === fakeDataUrl);
  check('label switches to Retake/replace', row.querySelector('.locus-photo-label').textContent.includes('Retake'));
  check('remove button appears once photo exists', !!row.querySelector('.locus-photo-remove'));

  // remove button clears the image
  row.querySelector('.locus-photo-remove').click();
  await new Promise(r=>setTimeout(r,60));
  row = doc.querySelector('.locus-row');
  check('thumbnail gone after remove', !row.querySelector('.locus-thumb'));

  // re-add the image, then check it round-trips through the actual storage save/load path
  win.eval(`updateLocus(${JSON.stringify(row.dataset.id)}, {image: ${JSON.stringify(fakeDataUrl)}}).then(()=>renderLociList())`);
  await new Promise(r=>setTimeout(r,60));
  const storedJson = win.eval('JSON.stringify(DB.palaces)');
  check('image persisted into in-memory DB.palaces', storedJson.includes(fakeDataUrl));

  // dashboard "stations filled" count should treat an image-only station as filled
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  const palaceCardText = doc.querySelector('.palace-card').textContent;
  check('palace card shows 1/1 stations filled from photo alone', palaceCardText.includes('1/1 stations filled'));

  // walk (study) mode shows the image
  win.eval("startWalk('study')");
  await new Promise(r=>setTimeout(r,30));
  const modalImg = doc.querySelector('.modal img');
  check('study walk renders the station photo', !!modalImg && modalImg.getAttribute('src') === fakeDataUrl);
  doc.getElementById('wk-close').click();

  // walk (recall) mode hides the image until revealed, then shows it
  win.eval("startWalk('recall')");
  await new Promise(r=>setTimeout(r,30));
  check('recall walk hides photo before reveal', !doc.querySelector('.modal img'));
  doc.getElementById('wk-reveal').click();
  await new Promise(r=>setTimeout(r,30));
  const revealedImg = doc.querySelector('.modal img');
  check('recall walk shows photo after reveal', !!revealedImg && revealedImg.getAttribute('src') === fakeDataUrl);

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
