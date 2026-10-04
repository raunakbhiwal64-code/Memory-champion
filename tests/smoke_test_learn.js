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

  // ---- Learn tab is the default active view ----
  check('Learn view active on load', doc.getElementById('view-learn').classList.contains('active'));
  check('Learn tab highlighted in sidebar', doc.querySelector('.tab-btn[data-view="learn"]').classList.contains('active'));

  const detailsEls = doc.querySelectorAll('#learn-levels details.lesson-card');
  check('18 lessons rendered', detailsEls.length === 18);
  check('6 level headers rendered', doc.querySelectorAll('#learn-levels h3').length === 6);
  check('no lessons marked learned initially', doc.querySelectorAll('#learn-levels .pill-gold').length === 0);

  // ---- Drills all locked initially ----
  win.eval("go('drills','drills'); renderDrillCards();");
  await new Promise(r=>setTimeout(r,30));
  const drillCards = doc.querySelectorAll('#drill-cards .card');
  check('5 drill cards rendered', drillCards.length === 5);
  const lockedCount = Array.from(drillCards).filter(c => !c.querySelector('.btn-primary[data-discipline]')).length;
  check('all 5 drills locked before any lesson learned', lockedCount === 5);
  check('no bare Start buttons while locked', doc.querySelectorAll('#drill-cards .btn-primary[data-discipline]').length === 0);

  // ---- mark the SEE lesson (l1-2) as learned ----
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const seeDetails = doc.querySelector('details[data-lesson-id="l1-2"]');
  check('SEE lesson card found', !!seeDetails);
  seeDetails.querySelector('.lesson-complete-btn').click();
  await new Promise(r=>setTimeout(r,40));
  check('SEE lesson now shows learned pill', seeDetails.querySelector('.pill-gold') !== null || doc.querySelector('details[data-lesson-id="l1-2"] .pill-gold') !== null);
  check('DB.learn.completed contains l1-2', win.eval('DB.learn.completed.includes("l1-2")'));

  // ---- words/images should unlock (only need l1-2); numbers/cards/names still locked ----
  win.eval("go('drills','drills'); renderDrillCards();");
  await new Promise(r=>setTimeout(r,30));
  const wordsCard = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Words'));
  const numbersCard = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Numbers'));
  check('Words unlocked after learning SEE', !!wordsCard.querySelector('.btn-primary[data-discipline="words"]'));
  check('Numbers still locked (needs l3-3 too)', numbersCard.textContent.includes('first') && !numbersCard.querySelector('.btn-primary[data-discipline="numbers"]'));

  // ---- "I already know this" skip unlocks Numbers and records both prereq lessons ----
  numbersCard.querySelector('.drill-skip-lock').click();
  await new Promise(r=>setTimeout(r,40));
  check('l3-3 recorded as completed via skip', win.eval('DB.learn.completed.includes("l3-3")'));
  const numbersCard2 = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Numbers'));
  check('Numbers now shows Start button', !!numbersCard2.querySelector('.btn-primary[data-discipline="numbers"]'));

  // ---- "Go learn it" jumps to Learn tab and opens the right lesson ----
  const namesCard = Array.from(doc.querySelectorAll('#drill-cards .card')).find(c=>c.textContent.includes('Names'));
  namesCard.querySelector('.drill-goto-lesson').click();
  await new Promise(r=>setTimeout(r,120));
  check('navigated to Learn view', doc.getElementById('view-learn').classList.contains('active'));
  const namesLesson = doc.querySelector('details[data-lesson-id="l5-2"]');
  check('Names & Faces lesson auto-expanded', namesLesson.hasAttribute('open'));

  // ---- tryAction navigation: palace lesson's "Try it" jumps to Palaces ----
  win.eval("go('learn','learn'); renderLearn();");
  await new Promise(r=>setTimeout(r,30));
  const palaceLesson = doc.querySelector('details[data-lesson-id="l2-1"]');
  palaceLesson.open = true;
  const tryBtn = palaceLesson.querySelector('.lesson-try-btn');
  check('palace lesson has a Try it button', !!tryBtn);
  tryBtn.click();
  await new Promise(r=>setTimeout(r,30));
  check('Try it navigated to Palaces view', doc.getElementById('view-palaces').classList.contains('active'));

  // ---- Dashboard shows curriculum progress ----
  win.eval("go('dashboard','dashboard'); renderDashboard();");
  await new Promise(r=>setTimeout(r,30));
  check('dashboard shows curriculum stat 2/18', doc.getElementById('dash-stats').textContent.includes('2/18'));

  // ---- Palace/Library learn-tip banners appear before relevant lesson is learned ----
  win.eval("go('palaces','palaces'); renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  check('palace learn-tip banner shown (l2-1 not learned)', doc.getElementById('palace-learn-tip').textContent.includes('Read:'));
  win.eval('toggleLessonComplete("l2-1")');
  await new Promise(r=>setTimeout(r,40));
  win.eval("renderPalaceList();");
  await new Promise(r=>setTimeout(r,30));
  check('palace learn-tip banner disappears once l2-1 learned', doc.getElementById('palace-learn-tip').innerHTML.trim() === '');

  // ---- AI "Suggest an image" wiring on a deck item, with fetch mocked ----
  win.fetch = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type:'text', text: JSON.stringify([
        'A giant clock melts over the doorstep while it hisses like bacon.',
        'A second option: the doorstep grows teeth and chews on a pocket watch.',
        'A third: church bells made of wax drip down the doorframe.'
      ]) }] })
    };
  };
  doc.getElementById('btn-new-deck').click();
  await new Promise(r=>setTimeout(r,20));
  doc.getElementById('nd-title').value = 'AI Test Deck';
  doc.getElementById('nd-create').click();
  await new Promise(r=>setTimeout(r,30));
  doc.getElementById('btn-add-item').click();
  await new Promise(r=>setTimeout(r,30));
  const itemText = doc.querySelector('.item-text');
  itemText.value = 'The unexamined life is not worth living.';
  itemText.dispatchEvent(new win.Event('change'));
  await new Promise(r=>setTimeout(r,30));
  const suggestBtn = doc.querySelector('.item-suggest');
  check('suggest button present', !!suggestBtn);
  suggestBtn.click();
  await new Promise(r=>setTimeout(r,60));
  const suggestionPills = doc.querySelectorAll('.item-suggestion-pill');
  check('all 3 AI suggestions rendered into the item', suggestionPills.length === 3 && suggestionPills[0].textContent.includes('clock melts'));
  check('item.suggestions persisted to DB.decks', win.eval('DB.decks[0].items[0].suggestions[0]').includes('clock melts'));

  // ---- error path: fetch rejects ----
  win.fetch = async () => { throw new Error('network down'); };
  const regenBtn = doc.querySelector('.item-suggest');
  regenBtn.click();
  await new Promise(r=>setTimeout(r,60));
  check('error path shows original button label restored', regenBtn.textContent.includes('Regenerate'));

  console.log('\nJS runtime errors captured:', errors.length);
  errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
