/* ---- 3D exploration: hand-verified, real, embeddable content only.
   No live "pull anything" API exists for this, so this is a small
   curated catalog, honestly labeled by source quality, that can grow
   over time as more verified entries are found.
   kind: 'sketchfab' (interactive 3D model) or 'youtube360' (360 video,
   embedded as a plain iframe \u2014 no extra library, easiest to keep adding to). ---- */
const PALACE_CATALOG = [
  { id:'glaces', kind:'sketchfab', name:'Hall of Mirrors', place:'Palace of Versailles, France', region:'international', type:'palace',
    tier:'Official museum scan', uid:'d06415253af04077a82e056282173b65',
    credit:'Ch\u00e2teau de Versailles, via Sketchfab, in partnership with Google Arts & Culture', creditUrl:'https://en.chateauversailles.fr/discover/resources/versailles-3d' },
  { id:'chapelle', kind:'sketchfab', name:'Royal Chapel', place:'Palace of Versailles, France', region:'international', type:'palace',
    tier:'Official museum scan', uid:'0a4b8a6048b8407a8c89b5afdbadc35b',
    credit:'Ch\u00e2teau de Versailles, via Sketchfab, in partnership with Google Arts & Culture', creditUrl:'https://en.chateauversailles.fr/discover/resources/versailles-3d' },
  { id:'chambreroi', kind:'sketchfab', name:"King's Chamber", place:'Palace of Versailles, France', region:'international', type:'palace',
    tier:'Official museum scan', uid:'b76e627e5b44494491840a4d7fb41d3b',
    credit:'Ch\u00e2teau de Versailles, via Sketchfab, in partnership with Google Arts & Culture', creditUrl:'https://en.chateauversailles.fr/discover/resources/versailles-3d' },
  { id:'gatewayindia', kind:'sketchfab', name:'Gateway of India', place:'Mumbai, India', region:'india', type:'monument',
    tier:'Professional heritage scan', uid:'38a652e9f3bf49039026ef65ef61ac92',
    credit:"CyArk (heritage-preservation nonprofit), via Sketchfab \u2014 LiDAR + photogrammetry. It's a monument, not a palace, but the best-quality free Indian scan I could verify", creditUrl:'https://sketchfab.com/CyArk' },
  { id:'mysore', kind:'sketchfab', name:'Mysore Palace', place:'Mysuru, Karnataka, India', region:'india', type:'palace',
    tier:'Community scan \u2014 unreliable embed', uid:'0439ee6964c94a10bf9767088469bb94', linkOnly:true,
    credit:"Built by a Sketchfab user (ryangarnett) from 4 photographs and satellite imagery. It doesn't reliably display in the embedded viewer here \u2014 confirmed by a real report, not a guess \u2014 so this opens directly on Sketchfab instead of trying to embed it", creditUrl:'https://sketchfab.com/3d-models/mysore-palace-0439ee6964c94a10bf9767088469bb94' },
  { id:'tajmahal', kind:'youtube360', name:'Taj Mahal', place:'Agra, India', region:'india', type:'monument',
    tier:'Community 360\u00b0 video tour', videoId:'Zt-E7i3cSHg',
    credit:"A YouTube creator's 360\u00b0 walkthrough, titled and uploaded as spherical video. It's a mausoleum, not a palace, but too iconic to leave out. I haven't independently confirmed the spherical metadata renders correctly in every browser \u2014 if drag-to-look doesn't kick in, open it directly on YouTube", creditUrl:'https://www.youtube.com/watch?v=Zt-E7i3cSHg' },
  { id:'amerfort', kind:'youtube360', name:'Amer Fort (Amber Palace)', place:'Jaipur, Rajasthan, India', region:'india', type:'palace',
    tier:'Community 360\u00b0 video tour', videoId:'wEkhDyLApXo',
    credit:"A YouTube creator's 360\u00b0 walkthrough, titled and uploaded as spherical video. I haven't independently confirmed the spherical metadata renders correctly in every browser \u2014 if drag-to-look doesn't kick in, open it directly on YouTube", creditUrl:'https://www.youtube.com/watch?v=wEkhDyLApXo' },
  { id:'citypalacejaipur', kind:'youtube360', name:'City Palace', place:'Jaipur, Rajasthan, India', region:'india', type:'palace',
    tier:'Community 360\u00b0 video tour', videoId:'Fh-7UE81Bgk',
    credit:"A YouTube creator's 360\u00b0 VR tour, titled and uploaded as spherical video. Same caveat as Amer Fort \u2014 open on YouTube directly if it plays flat instead of draggable", creditUrl:'https://www.youtube.com/watch?v=Fh-7UE81Bgk' }
];
let current3DRegion = 'all';
let current3DRoom = PALACE_CATALOG[0].id;
function embedKindLabel(kind){
  if(kind==='sketchfab') return '3D model';
  if(kind==='youtube360') return '360\u00b0 video';
  return kind;
}
function render3DExplore(){
  const regionRoot = document.getElementById('region-tabs');
  const regions = [['all','All'],['india','India'],['international','International']];
  regionRoot.innerHTML = regions.map(([key,label])=>`<button class="btn btn-sm ${current3DRegion===key?'btn-gold':'btn-ghost'} region-tab-btn" data-region="${key}">${label}</button>`).join('');
  regionRoot.querySelectorAll('.region-tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      current3DRegion = btn.dataset.region;
      const visible = PALACE_CATALOG.filter(r=>current3DRegion==='all' || r.region===current3DRegion);
      if(!visible.find(r=>r.id===current3DRoom) && visible.length) current3DRoom = visible[0].id;
      render3DExplore();
    });
  });

  const visible = PALACE_CATALOG.filter(r=>current3DRegion==='all' || r.region===current3DRegion);
  const tabsRoot = document.getElementById('room-tabs');
  tabsRoot.innerHTML = visible.map(r=>`<button class="btn btn-sm ${r.id===current3DRoom?'btn-primary':'btn-ghost'} room-tab-btn" data-room="${r.id}">${escapeHtml(r.name)} <span class="mono" style="opacity:.6; font-size:9.5px;">${embedKindLabel(r.kind)}</span></button>`).join('');
  tabsRoot.querySelectorAll('.room-tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ current3DRoom = btn.dataset.room; render3DExplore(); });
  });

  const room = PALACE_CATALOG.find(r=>r.id===current3DRoom) || visible[0];
  const wrap = document.getElementById('room-embed-wrap');
  const creditRoot = document.getElementById('room-credit');
  if(!room){
    wrap.innerHTML = `<div style="padding:40px; text-align:center; color:var(--ink-mute);">Nothing in this filter yet.</div>`;
    creditRoot.innerHTML = '';
    return;
  }

  if(room.kind==='sketchfab' && !room.linkOnly){
    wrap.innerHTML = `<iframe title="${escapeHtml(room.name)}" style="width:100%; height:60vh; display:block; border:0;" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen src="https://sketchfab.com/models/${room.uid}/embed"></iframe>
      <div style="padding:8px 12px; border-top:1px solid var(--line); background:var(--surface-2);"><a href="${room.creditUrl}" target="_blank" rel="noopener" style="font-size:11.5px; color:var(--blue);">Not showing correctly? Open on Sketchfab instead \u2192</a></div>`;
  } else if(room.kind==='youtube360'){
    wrap.innerHTML = `<iframe title="${escapeHtml(room.name)}" style="width:100%; height:60vh; display:block; border:0;" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen src="https://www.youtube.com/embed/${room.videoId}"></iframe>
      <div style="padding:8px 12px; border-top:1px solid var(--line); background:var(--surface-2);"><a href="${room.creditUrl}" target="_blank" rel="noopener" style="font-size:11.5px; color:var(--blue);">Not showing correctly? Open on YouTube instead \u2192</a></div>`;
  } else if(room.linkOnly){
    wrap.innerHTML = `<div style="padding:50px 24px; text-align:center;">
      <p style="color:var(--ink-dim); font-size:13.5px; margin-bottom:16px;">This one doesn't reliably display in the built-in viewer.</p>
      <a class="btn btn-primary btn-sm" href="${room.creditUrl}" target="_blank" rel="noopener" style="text-decoration:none;">Open on Sketchfab \u2192</a>
    </div>`;
  }
  creditRoot.innerHTML = `<strong>${escapeHtml(room.name)}</strong>, ${escapeHtml(room.place)} \u2014 <span class="pill ${room.tier.indexOf('Official')===0?'pill-gold':'pill-blue'}" style="margin:0 6px;">${escapeHtml(room.tier)}</span><span class="pill" style="margin-right:6px;">${embedKindLabel(room.kind)}</span><br>${escapeHtml(room.credit)}. <a href="${room.creditUrl}" target="_blank" rel="noopener">Source \u2192</a>`;

  const existingPalace = DB.palaces.find(p=>p.basedOn && p.basedOn.catalogId===room.id);
  const buildRoot = document.getElementById('room-build-palace');
  buildRoot.innerHTML = existingPalace
    ? `<button class="btn btn-gold btn-sm" id="btn-build-palace">Open your palace here \u2014 ${existingPalace.loci.length} station${existingPalace.loci.length===1?'':'s'} so far</button>`
    : `<button class="btn btn-gold btn-sm" id="btn-build-palace">Build a palace here</button>`;
  document.getElementById('btn-build-palace').addEventListener('click', buildPalaceFromPlace);
}
async function buildPalaceFromPlace(){
  const room = PALACE_CATALOG.find(r=>r.id===current3DRoom);
  if(!room) return;
  const existing = DB.palaces.find(p=>p.basedOn && p.basedOn.catalogId===room.id);
  if(existing){ openPalace(existing.id); return; }
  const p = {id:uid(), name:`${room.name}, ${room.place}`, description:'Based on the 3D reference in this app\u2019s catalog.', loci:[], createdAt:Date.now(), basedOn:{catalogId:room.id, name:room.name, place:room.place}};
  DB.palaces.unshift(p);
  await savePalaces();
  toast('Palace created \u2014 walk it first, then add stations for what you actually saw');
  openPalace(p.id);
}
function open3DExplore(){
  go('3d-explore', null);
  render3DExplore();
}
function wire3DExploreButtons(){
  document.getElementById('btn-explore-3d').addEventListener('click', open3DExplore);
  document.getElementById('btn-back-3d').addEventListener('click', ()=>{ go('palaces','palaces'); renderPalaceList(); });
}
