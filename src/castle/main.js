import * as THREE from 'three';
import { S } from './state.js';
import { initRenderer, initLighting, initComposer, applyQuality, usesComposer, updateLights, resizeComposer } from './lights.js';
import { buildArchitecture } from './architecture.js';
import { buildDecor } from './decor.js';
import { buildHero, animateHero } from './hero.js';
import { movePlayer, updateCamera, wireInput, blocked, placeAt } from './player.js';
import * as UI from './ui.js';
import { mergeStatic } from './merge.js';
import { buildAtmosphere, startAudio, updateAudio, footstep, setMuted, isMuted, suspendAudio } from './atmosphere.js';

/* The Keep of Mnemosyne: 3D engine entry point. Registers window.castleEngine,
   which the app (index.html) calls through enterCastle(). */
const $ = id => document.getElementById(id);
const QUALITY_KEY = 'mnemosyne:castleQuality', SOUND_KEY = 'mnemosyne:castleSound';
const FOG = {
  courtyard: [0x0d1222, 0.012], entrance: [0x120e0a, 0.012], hall: [0x140d08, 0.010], gallery: [0x120e0a, 0.014],
  library: [0x120d08, 0.012], dungeon: [0x06140b, 0.034], armoury: [0x160a05, 0.016], tower: [0x0a0f22, 0.008]
};
let built = false, raf = 0, fps = 0, autoQuality = true, slowTime = 0, fogColor = new THREE.Color(0x0d1222);

function store(key, val) { try { if (val == null) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } return null; }

function build() {
  if (built) return true;
  try { initRenderer($('castle-canvas-wrap')); } catch (e) { return false; }
  S.renderer.info.autoReset = false;
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060c);
  S.scene.fog = new THREE.FogExp2(0x0d1222, 0.012);
  S.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 800);
  S.clock = new THREE.Timer();
  initLighting();
  buildArchitecture();
  buildDecor();
  UI.buildStations();
  buildHero();
  buildAtmosphere();
  S.mergeInfo = mergeStatic();
  initComposer();
  const saved = store(QUALITY_KEY);
  autoQuality = !saved;
  applyQuality(saved || (window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'));
  setMuted(store(SOUND_KEY) === 'off');
  wireInput(S.renderer.domElement, {
    closePanel: UI.closePanel, interact: UI.interact, toggleMap: UI.toggleMap, userGesture: startAudio,
    escape: () => { if (UI.isMapBig()) UI.toggleMap(); }
  });
  $('castle-map').addEventListener('click', UI.onMapClick);
  window.addEventListener('resize', resize);
  UI.setExitHandler(exit);
  wireChrome();
  built = true;
  return true;
}

function resize() {
  if (!built) return;
  const wrap = $('castle-canvas-wrap');
  const w = wrap.clientWidth || window.innerWidth, h = wrap.clientHeight || window.innerHeight;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
  resizeComposer(w, h);
}

function updateFog(dt) {
  const r = S.currentRoom, f = FOG[r ? r.id : 'courtyard'] || FOG.courtyard;
  const k = Math.min(1, dt * 1.5);
  fogColor.lerp(new THREE.Color(f[0]), k);
  S.scene.fog.color.copy(fogColor);
  S.scene.fog.density += (f[1] - S.scene.fog.density) * k;
}

// Drop the graphics level if the device can't keep up (only when the user hasn't chosen one).
function autoTune(dt) {
  if (!autoQuality || S.quality === 'low') return;
  slowTime = dt > 1 / 24 ? slowTime + dt : Math.max(0, slowTime - dt * 0.5);
  if (slowTime > 4) {
    slowTime = 0;
    applyQuality(S.quality === 'high' ? 'medium' : 'low'); resize();
    toast(`Graphics set to ${S.quality} to keep the castle smooth — change it with the Graphics button`);
    updateChromeLabels();
  }
}

function frame() {
  if (!S.running) return;
  raf = requestAnimationFrame(frame);
  S.clock.update();
  const raw = S.clock.getDelta(), dt = Math.min(0.5, raw), t = S.clock.getElapsed(), sdt = Math.min(0.05, dt);
  fps += ((raw > 0 ? 1 / raw : 60) - fps) * 0.1;
  S.renderer.info.reset();
  // slow devices get several small movement steps per frame rather than slow walking
  for (let left = dt; left > 1e-4; left -= 0.05) movePlayer(Math.min(0.05, left));
  S.currentRoom = castleRoomAt(S.player.x, S.player.z) || S.currentRoom;
  UI.updateNearby();
  animateHero(sdt, t);
  updateCamera(dt);
  for (const f of S.animated) f(t, sdt);
  UI.animateStations(t);
  UI.hud();
  updateLights(t, dt);
  updateFog(dt);
  updateAudio(t, dt, S.currentRoom);
  footstep(S.player.walkPhase, S.player.speed, S.currentRoom);
  if (usesComposer()) S.composer.render(dt); else S.renderer.render(S.scene, S.camera);
  autoTune(dt);
}

function showLoading(on) { $('castle-loading').classList.toggle('show', on); }

function enter(id, startMode) {
  const p = DB.palaces.find(x => x.id === id);
  if (!p || !isCastle(p)) return;
  if (ensureCastleLoci(p)) savePalaces();
  S.palaceId = id; currentPalaceId = id;
  $('castle-root').classList.add('open'); document.body.style.overflow = 'hidden';
  $('castle-fallback').classList.remove('show');
  startAudio();
  const go = () => {
    if (!build()) {
      showLoading(false);
      $('castle-fallback').classList.add('show');
      $('castle-fallback-msg').textContent = "This browser couldn't start WebGL, which the castle needs to draw in 3D. You can still use every station from the list.";
      return;
    }
    showLoading(false);
    S.recall = null; S.mode = 'study';
    if (UI.isMapBig()) UI.toggleMap();
    UI.teleportStart(); UI.closePanel(); UI.refreshAllStations(); resize();
    if (startMode === 'recall') UI.startRecall();
    S.running = true; S.clock.update(); cancelAnimationFrame(raf); frame();
    S.renderer.domElement.focus();
    updateChromeLabels();
  };
  if (built) go();
  else { showLoading(true); requestAnimationFrame(() => setTimeout(go, 30)); }
}

function exit() {
  S.running = false; cancelAnimationFrame(raf);
  if (S.recall) UI.stopRecall();
  UI.closePanel();
  for (const k in S.keys) S.keys[k] = false;
  suspendAudio();
  showLoading(false);
  $('castle-root').classList.remove('open'); $('castle-fallback').classList.remove('show');
  document.body.style.overflow = '';
  go('palaces', 'palaces'); renderPalaceList(); renderDashboard();
}

function updateChromeLabels() {
  $('castle-btn-quality').textContent = 'Graphics: ' + S.quality[0].toUpperCase() + S.quality.slice(1);
  $('castle-btn-sound').textContent = isMuted() ? 'Sound off' : 'Sound on';
}
let chromeWired = false;
function wireChrome() {
  if (chromeWired) return; chromeWired = true;
  $('castle-btn-exit').addEventListener('click', exit);
  $('castle-btn-mode').addEventListener('click', () => { if (S.mode === 'recall') UI.stopRecall(); else UI.startRecall(); });
  $('castle-btn-quality').addEventListener('click', () => {
    const next = { high: 'medium', medium: 'low', low: 'high' }[S.quality];
    applyQuality(next); resize(); autoQuality = false; store(QUALITY_KEY, next); updateChromeLabels();
  });
  $('castle-btn-sound').addEventListener('click', () => {
    setMuted(!isMuted()); store(SOUND_KEY, isMuted() ? 'off' : 'on'); startAudio(); updateChromeLabels();
  });
}

window.castleEngine = {
  enter, exit,
  currentPalaceId: () => S.palaceId,
  debug: {
    state: () => ({
      x: S.player.x, z: S.player.z, yaw: S.player.yaw, mode: S.mode, nearby: S.nearbyStation, panel: S.panelStation,
      running: S.running, built, quality: S.quality, room: (castleRoomAt(S.player.x, S.player.z) || {}).id || null, fps: Math.round(fps),
      recall: S.recall ? { pos: S.recall.pos, total: S.recall.order.length, marks: S.recall.marks.slice() } : null,
      drawCalls: S.renderer ? S.renderer.info.render.calls : 0, triangles: S.renderer ? S.renderer.info.render.triangles : 0,
      lights: S.lightSources.length, merged: S.mergeInfo
    }),
    teleportTo: UI.teleportTo, interact: UI.interact, keys: S.keys, blocked, cam: S.cam,
    placeAt: (x, z, yaw) => { placeAt(x, z, yaw); UI.updateNearby(); },
    scene: () => S.scene,
    setQuality: q => { applyQuality(q); resize(); autoQuality = false; updateChromeLabels(); }
  }
};
