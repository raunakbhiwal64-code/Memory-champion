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

