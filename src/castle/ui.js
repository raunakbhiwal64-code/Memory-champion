import * as THREE from 'three';
import { S, INTERACT_R } from './state.js';
import { PROP_META, placeProp } from './props.js';
import { canvasTexture, glowTexture } from './textures.js';
import { M } from './materials.js';
import { placeAt } from './player.js';

/* Station markers, floating memory cards, HUD, parchment map, the memory
   panel and the recall walk. App helpers (DB, updateLocus, finishWalk,
   escapeHtml, toast...) come from the classic script in index.html. */
const T = CASTLE_TILE;
const handlers = { exit: () => {} };
export function setExitHandler(fn) { handlers.exit = fn; }
  /* ---------- station markers & floating memory cards ---------- */
  function palace(){ return DB.palaces.find(p=>p.id===S.palaceId); }
  function wrapLines(g, text, maxW, maxLines){
    const words = String(text).split(/\s+/), lines = [];
    let line = '';
    for(const w of words){
      const test = line ? line + ' ' + w : w;
      if(g.measureText(test).width > maxW && line){ lines.push(line); line = w; } else line = test;
      if(lines.length === maxLines) break;
    }
    if(lines.length < maxLines && line) lines.push(line);
    if(lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines-1] = lines[maxLines-1].replace(/\s*\S*$/, '') + '…';
    return lines;
  }
  function badgeTexture(n){
    return canvasTexture(128, (g,s)=>{
      g.fillStyle = 'rgba(20,18,14,.85)'; g.beginPath(); g.arc(s/2, s/2, s/2-6, 0, Math.PI*2); g.fill();
      g.strokeStyle = '#cda13a'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#f3e7c4'; g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), s/2, s/2 + 3);
    });
  }
  function cardTexture(s, l, onReady){
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (img)=>{
      g.clearRect(0,0,512,256);
      g.fillStyle = '#efe3c2'; g.fillRect(4,4,504,248);
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 6; g.strokeRect(6,6,500,244);
      let x0 = 26;
      if(img){ const h = 200, w = Math.min(200, img.width*h/img.height); g.drawImage(img, 22, 28, w, h); x0 = 34 + w; }
      g.fillStyle = '#7a5a20'; g.font = '600 20px Georgia, serif';
      g.fillText(`${s.n} · ${s.title}`.slice(0, 40), x0, 44);
      g.fillStyle = '#2a2014'; g.font = '30px Georgia, serif';
      const text = (l.content && l.content.text) || (img ? '' : '');
      wrapLines(g, text, 512 - x0 - 24, 5).forEach((ln, i)=>g.fillText(ln, x0, 92 + i*36));
      tex.needsUpdate = true;
      if(onReady) onReady();
    };
    if(l.image){ const img = new Image(); img.onload = ()=>draw(img); img.onerror = ()=>draw(null); img.src = l.image; draw(null); }
    else draw(null);
    return tex;
  }
  const orbTex = ()=>glowTexture('rgba(255,210,110,1)');
  // One atlas of 40 engraved brass floor medallions (8 x 5 cells), so every
  // medallion shares a material and merges into a single draw call.
  const ATLAS_COLS = 8, ATLAS_ROWS = 5, CELL = 128;
  let atlasMat = null;
  function medallionMaterial(){
    if(atlasMat) return atlasMat;
    const tex = canvasTexture(ATLAS_ROWS*CELL, (g)=>{
      for(let n=1; n<=40; n++){
        const col = (n-1) % ATLAS_COLS, row = Math.floor((n-1) / ATLAS_COLS), cx = col*CELL + CELL/2, cy = row*CELL + CELL/2, R = CELL/2;
        const gr = g.createRadialGradient(cx - R*0.3, cy - R*0.3, R*0.1, cx, cy, R);
        gr.addColorStop(0, '#e0c58a'); gr.addColorStop(0.7, '#b8944f'); gr.addColorStop(1, '#7d6232');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI*2); g.fill();
        // engraved rings, compass ticks and the number, worn by footsteps
        g.strokeStyle = 'rgba(60,40,15,.75)'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(cx, cy, R*0.9, 0, Math.PI*2); g.stroke();
        g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R*0.62, 0, Math.PI*2); g.stroke();
        for(let k=0; k<16; k++){ const a = k/16*Math.PI*2, r0 = R*(k%4 ? 0.8 : 0.72); g.beginPath(); g.moveTo(cx + Math.cos(a)*r0, cy + Math.sin(a)*r0); g.lineTo(cx + Math.cos(a)*R*0.88, cy + Math.sin(a)*R*0.88); g.stroke(); }
        g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255,235,190,.45)'; g.fillText(String(n), cx + 1.5, cy + 3.5);
        g.fillStyle = 'rgba(45,28,8,.9)'; g.fillText(String(n), cx, cy + 2);
        const wear = g.createRadialGradient(cx, cy, 0, cx, cy, R*0.7);
        wear.addColorStop(0, 'rgba(255,240,200,.18)'); wear.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = wear; g.beginPath(); g.arc(cx, cy, R*0.7, 0, Math.PI*2); g.fill();
      }
    }, ATLAS_COLS*CELL);
    atlasMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.9, roughness: 0.42, color: 0xffffff });
    return atlasMat;
  }
  function medallion(s, rp){
    const geo = new THREE.CircleGeometry(0.5, 40);
    const uv = geo.attributes.uv, col = (s.n-1) % ATLAS_COLS, row = Math.floor((s.n-1) / ATLAS_COLS);
    for(let i=0; i<uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / ATLAS_COLS, 1 - (row + 1 - uv.getY(i)) / ATLAS_ROWS);
    geo.rotateX(-Math.PI/2);
    // the number reads upright as you step onto it, facing the station's object
    geo.rotateY(Math.atan2(-(s.x - rp.x), -(s.z - rp.z)));
    const top = new THREE.Mesh(geo, medallionMaterial());
    top.position.set(rp.x, 0.018, rp.z); top.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.53, 0.018, 40, 1, true), M.brass());
    rim.position.set(rp.x, 0.009, rp.z);
    return [top, rim];
  }
  function buildStations(){
    CASTLE_STATIONS.forEach((s, i)=>{
      placeProp(s, s.room);
      const meta = PROP_META[s.prop] || {};
      const rp = castleRingPos(s);
      // a brass medallion set into the floor, with a thin inlay that glows only when it matters
      S.scene.add(...medallion(s, rp));
      const ringMat = new THREE.MeshBasicMaterial({ color:0xe8c27a, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.57, 48), ringMat);
      ring.rotation.x = -Math.PI/2; ring.position.set(rp.x, 0.022, rp.z);
      ring.userData.noMerge = true;
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(s.n), transparent:true, depthWrite:false, toneMapped:false, opacity:0 }));
      badge.scale.set(0.4, 0.4, 1); badge.position.set(s.x, meta.h || 3, s.z);
      const card = new THREE.Sprite(new THREE.SpriteMaterial({ transparent:true, depthWrite:false, toneMapped:false, color:0xdcd6c8 }));
      card.scale.set(2.2, 1.1, 1); card.position.set(s.x, (meta.h || 3) + 0.9, s.z); card.visible = false;
      const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: orbTex(), blending:THREE.AdditiveBlending, transparent:true, depthWrite:false, opacity:0.7 }));
      orb.scale.set(0.5, 0.5, 1); orb.position.set(s.x, (meta.h || 3) + 0.6, s.z); orb.visible = false;
      S.scene.add(ring, badge, card, orb);
      S.stationViews[i] = { s, rp, ring, ringMat, badge, card, orb, cardKey:null, base:0 };
    });
  }
  function recallTargetIdx(){ return S.recall && S.recall.pos < S.recall.order.length ? S.recall.order[S.recall.pos] : -1; }
  function refreshStation(i){
    const sv = S.stationViews[i], p = palace(); if(!sv || !p) return;
    const l = p.loci[i], filled = isLocusFilled(l);
    let color = filled ? 0xe0b25a : 0x9fc3e0, opacity = filled ? 0.3 : 0, showCard = false, showOrb = false;
    if(S.mode === 'recall'){
      const rpos = S.recall ? S.recall.order.indexOf(i) : -1;
      const done = rpos >= 0 && rpos < S.recall.pos;
      if(i === recallTargetIdx()){ color = 0xfff1c0; opacity = 0.8; showOrb = true; }
      else if(done){ color = S.recall.marks[rpos] ? 0x82b98d : 0xd3766a; opacity = 0.55; showCard = true; }
      else if(filled){ color = 0xe0b25a; opacity = 0.25; }
      else { opacity = 0; }
      if(S.panelStation === i && S.recall && S.recall.revealed) { showCard = true; showOrb = false; }
    } else {
      showCard = filled;
    }
    sv.ringMat.color.setHex(color); sv.base = opacity;
    sv.card.visible = showCard; sv.orb.visible = showOrb && !showCard;
    if(showCard){
      const key = ((l.content && l.content.text) || '') + '|' + (l.image ? l.image.length : 0);
      if(sv.cardKey !== key){
        if(sv.card.material.map) sv.card.material.map.dispose();
        sv.card.material.map = cardTexture(sv.s, l); sv.card.material.needsUpdate = true; sv.cardKey = key;
      }
    }
  }
  function refreshAllStations(){ S.stationViews.forEach((_, i)=>refreshStation(i)); }
  const fade = (d, near, far)=>Math.max(0, Math.min(1, (far - d) / (far - near)));
  function animateStations(t){
    const target = recallTargetIdx(), next = S.mode === 'recall' ? -1 : nextEmptyIdx();
    S.stationViews.forEach((sv, i)=>{
      const d = Math.hypot(S.player.x - sv.s.x, S.player.z - sv.s.z);
      sv.orb.position.y = (PROP_META[sv.s.prop].h || 3) + 0.6 + Math.sin(t*2 + i)*0.05;
      // the inlay brightens as you arrive, and breathes on the station you're heading for
      let o = sv.base;
      if(i === S.nearbyStation) o = Math.max(o, 0.75 + Math.sin(t*4)*0.1);
      else if(i === target || i === next) o = Math.max(o, (0.35 + Math.sin(t*2.5)*0.12) * fade(d, 6, 22));
      sv.ringMat.opacity = o;
      // numbers and memory cards appear as you approach rather than floating everywhere
      sv.badge.material.opacity = fade(d, 3.5, 7.5) * 0.9;
      sv.badge.visible = sv.badge.material.opacity > 0.01;
      sv.card.material.opacity = fade(d, 9, 16);
    });
  }

  /* ---------- proximity & HUD ---------- */
  let lastRoom = null, mapTick = 0, mapBig = false;
  function updateNearby(){
    let best = -1, bestD = INTERACT_R;
    S.stationViews.forEach((sv, i)=>{ const d = Math.hypot(S.player.x - sv.rp.x, S.player.z - sv.rp.z); if(d < bestD){ bestD = d; best = i; } });
    S.nearbyStation = best;
  }
  function nextEmptyIdx(){
    const p = palace(); if(!p) return -1;
    return p.loci.findIndex(l=>!isLocusFilled(l));
  }
  const $ = id=>document.getElementById(id);
  function hud(){
    const p = palace(); if(!p) return;
    const room = castleRoomAt(S.player.x, S.player.z); if(room) lastRoom = room;
    $('castle-room-label').textContent = lastRoom ? lastRoom.name : '';
    const filledCount = p.loci.filter(isLocusFilled).length;
    let targetIdx = -1, label = '', text = '';
    if(S.mode === 'recall'){
      targetIdx = recallTargetIdx();
      $('castle-mode-label').textContent = `RECALL WALK · ${Math.min(S.recall.pos+1, S.recall.order.length)} OF ${S.recall.order.length}`;
      label = 'WALK TO'; text = targetIdx >= 0 ? `${CASTLE_STATIONS[targetIdx].n} · ${CASTLE_STATIONS[targetIdx].title}` : 'Walk complete';
    } else {
      targetIdx = nextEmptyIdx();
      $('castle-mode-label').textContent = `${p.name.toUpperCase()} · ${filledCount}/${p.loci.length} MEMORIES`;
      label = 'NEXT EMPTY STATION'; text = targetIdx >= 0 ? `${CASTLE_STATIONS[targetIdx].n} · ${CASTLE_STATIONS[targetIdx].title} (${castleRoomName(CASTLE_STATIONS[targetIdx].room)})` : 'Every station holds a memory';
    }
    $('castle-target-label').textContent = label; $('castle-target-text').textContent = text;
    const arrow = $('castle-arrow');
    if(targetIdx >= 0){
      const rp = S.stationViews[targetIdx].rp, dx = rp.x - S.player.x, dz = rp.z - S.player.z;
      const fx = -Math.sin(S.cam.yaw), fz = -Math.cos(S.cam.yaw), rx = -fz, rz = fx;
      arrow.style.transform = `rotate(${Math.atan2(dx*rx + dz*rz, dx*fx + dz*fz)}rad)`; arrow.style.opacity = 1;
    } else arrow.style.opacity = 0;
    const prompt = $('castle-prompt');
    if(S.nearbyStation >= 0 && S.panelStation === -1){
      const s = CASTLE_STATIONS[S.nearbyStation], filled = isLocusFilled(p.loci[S.nearbyStation]);
      let html;
      if(S.mode === 'recall'){
        if(S.nearbyStation === targetIdx) html = `<kbd>E</kbd> Recall station ${s.n} · ${escapeHtml(s.title)}`;
        else if(targetIdx >= 0) html = `Not this one yet — the route goes to station ${CASTLE_STATIONS[targetIdx].n} next`;
        else html = `${escapeHtml(s.title)}`;
      } else html = `<kbd>E</kbd> ${filled ? 'See or change the memory at' : 'Leave a memory at'} ${s.n} · ${escapeHtml(s.title)}`;
      prompt.innerHTML = html; prompt.classList.add('show');
    } else prompt.classList.remove('show');
    $('castle-btn-mode').textContent = S.mode === 'recall' ? 'End recall walk' : 'Start recall walk';
    if(++mapTick % 4 === 0 || mapBig) drawMap();
  }

  /* ---------- the map ---------- */
  function mapGeom(c){ const SZ = c.width, sc = SZ / (Math.max(CASTLE_GRID_W, CASTLE_GRID_H)*T); return { SZ, sc, oy: (SZ - CASTLE_GRID_H*T*sc)/2 }; }
  function drawMap(){
    const c = $('castle-map'), g = c.getContext('2d'), { SZ, sc, oy } = mapGeom(c), p = palace();
    g.fillStyle = '#d9c9a3'; g.fillRect(0,0,SZ,SZ);
    g.fillStyle = '#efe2bf';
    for(let z=0; z<CASTLE_GRID_H; z++) for(let x=0; x<CASTLE_GRID_W; x++) if(castleCellAt(x,z)!==-1) g.fillRect(x*T*sc, oy + z*T*sc, T*sc+0.6, T*sc+0.6);
    g.strokeStyle = '#6a4a1a'; g.lineWidth = 1.4;
    for(let z=0; z<CASTLE_GRID_H; z++) for(let x=0; x<CASTLE_GRID_W; x++){
      if(castleCellAt(x,z)===-1) continue;
      const px = x*T*sc, py = oy + z*T*sc, w = T*sc;
      g.beginPath();
      if(castleCellAt(x,z-1)===-1){ g.moveTo(px,py); g.lineTo(px+w,py); }
      if(castleCellAt(x,z+1)===-1){ g.moveTo(px,py+w); g.lineTo(px+w,py+w); }
      if(castleCellAt(x-1,z)===-1){ g.moveTo(px,py); g.lineTo(px,py+w); }
      if(castleCellAt(x+1,z)===-1){ g.moveTo(px+w,py); g.lineTo(px+w,py+w); }
      g.stroke();
    }
    g.fillStyle = 'rgba(90,60,20,.55)'; g.font = `italic ${Math.round(SZ/30)}px Georgia, serif`; g.textAlign = 'center';
    CASTLE_ROOMS.forEach(r=>g.fillText(r.name, (r.x0 + r.x1 + 1)/2*T*sc, oy + (r.z0 + 0.9)*T*sc));
    const target = S.mode === 'recall' ? recallTargetIdx() : nextEmptyIdx();
    const dotR = Math.max(4, SZ/48);
    g.font = `bold ${Math.round(dotR*1.1)}px sans-serif`; g.textBaseline = 'middle';
    S.stationViews.forEach((sv, i)=>{
      const l = p.loci[i], filled = isLocusFilled(l), x = sv.rp.x*sc, y = oy + sv.rp.z*sc;
      let fill = filled ? '#cda13a' : '#fbf6e8';
      if(S.mode === 'recall'){ const rpos = S.recall.order.indexOf(i); if(rpos >= 0 && rpos < S.recall.pos) fill = S.recall.marks[rpos] ? '#82b98d' : '#d3766a'; else if(!filled) fill = 'rgba(251,246,232,.4)'; }
      g.beginPath(); g.arc(x, y, dotR, 0, Math.PI*2); g.fillStyle = fill; g.fill();
      g.strokeStyle = i === target ? '#1d5fa0' : '#6a4a1a'; g.lineWidth = i === target ? 3 : 1; g.stroke();
      if(mapBig || dotR > 5){ g.fillStyle = '#2a1a08'; g.fillText(String(sv.s.n), x, y+0.5); }
    });
    g.save(); g.translate(S.player.x*sc, oy + S.player.z*sc); g.rotate(-S.player.yaw + Math.PI);
    g.fillStyle = '#b02a2a'; g.beginPath(); const a = Math.max(5, SZ/40); g.moveTo(0, -a*1.3); g.lineTo(a*0.8, a); g.lineTo(-a*0.8, a); g.closePath(); g.fill();
    g.restore();
  }
  function toggleMap(){
    mapBig = !mapBig;
    const c = $('castle-map');
    c.classList.toggle('big', mapBig);
    c.width = c.height = mapBig ? 760 : 380;
    drawMap();
  }
  function onMapClick(e){
    if(!mapBig){ toggleMap(); return; }
    const c = $('castle-map'), r = c.getBoundingClientRect(), { sc, oy } = mapGeom(c);
    const mx = (e.clientX - r.left) * c.width / r.width, my = (e.clientY - r.top) * c.height / r.height;
    if(S.mode === 'study'){
      const hit = S.stationViews.findIndex(sv=>Math.hypot(sv.rp.x*sc - mx, oy + sv.rp.z*sc - my) < Math.max(10, c.width/40));
      if(hit >= 0){ teleportTo(hit); toggleMap(); return; }
    }
    toggleMap();
  }
  function teleportTo(i){
    const sv = S.stationViews[i];
    S.player.x = sv.rp.x; S.player.z = sv.rp.z; S.player.speed = 0;
    S.player.yaw = Math.atan2(sv.s.x - sv.rp.x, sv.s.z - sv.rp.z);
    S.cam.yaw = S.player.yaw + Math.PI; S.cam.pitch = 0.3;
    updateNearby();
  }

  /* ---------- the memory panel ---------- */
  function openPanel(i, html){
    S.panelStation = i;
    const el = $('castle-panel'); el.innerHTML = html; el.classList.add('open');
    for(const k in S.keys) S.keys[k] = false;
    refreshStation(i);
  }
  function closePanel(){
    const i = S.panelStation;
    S.panelStation = -1;
    $('castle-panel').classList.remove('open'); $('castle-panel').innerHTML = '';
    if(i >= 0) refreshStation(i);
  }
  function panelHead(s, extra){
    return `<div class="mono" style="font-size:10.5px; color:var(--ink-mute); letter-spacing:.08em;">${extra} · ${escapeHtml(castleRoomName(s.room).toUpperCase())}</div>
      <h3 style="margin-top:6px; font-size:21px;">${s.n}. ${escapeHtml(s.title)}</h3>`;
  }
  function openStudyPanel(i){
    const p = palace(), l = p.loci[i], s = CASTLE_STATIONS[i];
    openPanel(i, `
      ${panelHead(s, `STATION ${s.n} OF ${CASTLE_STATIONS.length}`)}
      <p style="color:var(--ink-mute); font-size:12.5px; margin:8px 0 12px;">Make it vivid: picture what you're remembering doing something loud, huge or ridiculous right here at the ${escapeHtml(s.title.toLowerCase())}.</p>
      ${l.image ? `<img src="${l.image}" class="cp-thumb" style="width:100%; max-height:200px; object-fit:cover; border-radius:3px; border:1px solid var(--line); margin-bottom:10px;">` : ''}
      <textarea id="cp-text" rows="4" placeholder="What are you leaving here? A word, a fact, a quote, a name…">${escapeHtml((l.content && l.content.text) || '')}</textarea>
      ${l.content && l.content.source ? `<div class="pill pill-gold" style="margin-top:8px;">from ${escapeHtml(l.content.source)}</div>` : ''}
      <div class="btn-row" style="margin-top:10px; align-items:center;">
        <label class="btn btn-sm btn-ghost" style="cursor:pointer;">${l.image ? 'Replace picture' : '+ Add a picture'}
          <input type="file" accept="image/*" id="cp-photo" style="position:absolute; width:1px; height:1px; opacity:0; overflow:hidden;"></label>
        ${l.image ? `<button class="btn btn-sm btn-danger" id="cp-photo-remove">Remove picture</button>` : ''}
        <span id="cp-status" style="font-size:11px; color:var(--ink-mute);"></span>
      </div>
      <div class="modal-close-row">
        ${isLocusFilled(l) ? `<button class="btn btn-ghost btn-sm" id="cp-clear" style="margin-right:auto;">Empty this station</button>` : ''}
        <button class="btn btn-ghost btn-sm" id="cp-close">Close</button>
        <button class="btn btn-primary btn-sm" id="cp-save">Save memory</button>
      </div>`);
    const ta = $('cp-text');
    setTimeout(()=>{ if(ta && S.panelStation === i) ta.focus(); }, 30);
    const commit = async ()=>{
      const val = ta.value.trim(), cur = p.loci[i];
      const old = (cur.content && cur.content.text) || '';
      if(val === old) return;
      await updateLocus(cur.id, { content: val ? { text: val, source: (cur.content && cur.content.source) || null } : null });
      refreshStation(i);
    };
    ta.addEventListener('change', commit);
    $('cp-save').onclick = async ()=>{ await commit(); closePanel(); toast(`Saved at station ${s.n} — ${s.title}`); };
    $('cp-close').onclick = async ()=>{ await commit(); closePanel(); };
    const clr = $('cp-clear');
    if(clr) clr.onclick = async ()=>{ await updateLocus(l.id, { content:null, image:null }); closePanel(); };
    $('cp-photo').addEventListener('change', async e=>{
      const file = e.target.files[0]; if(!file) return;
      $('cp-status').textContent = 'Processing picture…';
      try{ await commit(); await updateLocus(l.id, { image: await compressImageFile(file) }); openStudyPanel(i); }
      catch(err){ $('cp-status').textContent = 'Could not use that picture — ' + err.message; }
    });
    const rm = $('cp-photo-remove');
    if(rm) rm.onclick = async ()=>{ await commit(); await updateLocus(l.id, { image:null }); openStudyPanel(i); };
  }

  /* ---------- recall walk ---------- */
  function startRecall(){
    const p = palace();
    const order = p.loci.map((l,i)=>isLocusFilled(l) ? i : -1).filter(i=>i>=0);
    if(order.length === 0){ toast('Leave a memory at a station first, then walk the route to recall it'); return false; }
    closePanel();
    S.recall = { order, pos:0, marks:[], revealed:false };
    S.mode = 'recall';
    teleportStart(0); // face the iron gate, station 1
    refreshAllStations();
    return true;
  }
  function stopRecall(silent){
    if(S.recall && S.recall.pos > 0 && S.recall.pos < S.recall.order.length && !silent) toast('Recall walk ended early — nothing was logged');
    S.recall = null; S.mode = 'study';
    closePanel(); refreshAllStations();
  }
  function openRecallPanel(i){
    const p = palace(), l = p.loci[i], s = CASTLE_STATIONS[i];
    const head = panelHead(s, `RECALL ${S.recall.pos+1} OF ${S.recall.order.length}`);
    if(!S.recall.revealed){
      openPanel(i, `${head}
        <p style="color:var(--ink-dim); font-size:13.5px; margin-top:12px;">What did you leave here? Picture the scene at the ${escapeHtml(s.title.toLowerCase())}, say it out loud, then reveal.</p>
        <div class="modal-close-row">
          <button class="btn btn-ghost btn-sm" id="cr-skip" style="margin-right:auto;">I can't remember</button>
          <button class="btn btn-ghost btn-sm" id="cr-later">Not yet</button>
          <button class="btn btn-primary btn-sm" id="cr-reveal">Reveal</button>
        </div>`);
      $('cr-reveal').onclick = ()=>{ S.recall.revealed = true; openRecallPanel(i); };
      $('cr-later').onclick = closePanel;
      $('cr-skip').onclick = ()=>markRecall(false);
    } else {
      openPanel(i, `${head}
        <div style="margin-top:14px; border:1px solid var(--line); border-radius:3px; padding:14px; background:var(--surface-2);">
          ${l.image ? `<img src="${l.image}" style="width:100%; max-height:200px; object-fit:cover; border-radius:3px; margin-bottom:10px;">` : ''}
          <div style="font-size:14px;">${escapeHtml((l.content && l.content.text) || '')}</div>
        </div>
        <div class="modal-close-row">
          <button class="btn btn-sm" style="border-color:var(--red); color:var(--red);" id="cr-wrong">Missed it</button>
          <button class="btn btn-sm" style="border-color:var(--green); color:var(--green);" id="cr-right">Got it right</button>
        </div>`);
      $('cr-right').onclick = ()=>markRecall(true);
      $('cr-wrong').onclick = ()=>markRecall(false);
    }
  }
  async function markRecall(ok){
    S.recall.marks[S.recall.pos] = ok;
    S.recall.pos++; S.recall.revealed = false;
    closePanel(); refreshAllStations();
    if(S.recall.pos >= S.recall.order.length) await finishRecall();
  }
  async function finishRecall(){
    const p = palace();
    const correct = S.recall.marks.filter(Boolean).length, total = S.recall.order.length;
    // reuse the 2D walk's logging + SM-2 scheduling so both routes stay identical
    walkState = { mode:'recall', palace: Object.assign({}, p, { loci: S.recall.order.map(i=>p.loci[i]) }), marks: S.recall.marks.slice() };
    await finishWalk();
    const missed = S.recall.order.filter((_, k)=>!S.recall.marks[k]).map(i=>CASTLE_STATIONS[i]);
    const srs = srsStatus(p.srs);
    openPanel(-2, `
      <div class="mono" style="font-size:10.5px; color:var(--ink-mute); letter-spacing:.08em;">RECALL WALK COMPLETE</div>
      <h3 style="margin-top:6px; font-size:24px;">${correct} of ${total} remembered</h3>
      <p style="color:var(--ink-dim); font-size:13px; margin-top:8px;">${srs.text}. Logged in your history.</p>
      ${missed.length ? `<p style="font-size:12.5px; color:var(--ink-mute); margin-top:10px;">Worth rebuilding with a stronger image: ${missed.map(s=>`${s.n} · ${escapeHtml(s.title)}`).join(', ')}</p>` : ''}
      <div class="modal-close-row">
        <button class="btn btn-ghost btn-sm" id="cf-exit">Exit castle</button>
        <button class="btn btn-sm" id="cf-study">Keep exploring</button>
        <button class="btn btn-gold btn-sm" id="cf-again">Walk it again</button>
      </div>`);
    $('cf-exit').onclick = ()=>{ S.recall = null; handlers.exit(); };
    $('cf-study').onclick = ()=>stopRecall(true);
    $('cf-again').onclick = ()=>{ closePanel(); startRecall(); };
  }
  function interact(){
    if(S.nearbyStation < 0) return;
    if(S.mode === 'recall'){
      if(S.nearbyStation === recallTargetIdx()) openRecallPanel(S.nearbyStation);
      return;
    }
    openStudyPanel(S.nearbyStation);
  }
  function teleportStart(yaw){ placeAt(CASTLE_START.x, CASTLE_START.z, yaw === undefined ? CASTLE_START.yaw : yaw); updateNearby(); }


export { buildStations, refreshStation, refreshAllStations, animateStations, updateNearby, hud, drawMap, toggleMap, onMapClick,
  teleportTo, interact, closePanel, openStudyPanel, startRecall, stopRecall, teleportStart, palace };
export function isMapBig() { return mapBig; }
