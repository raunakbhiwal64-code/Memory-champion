import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { S, FACE_YAW } from './state.js';
import { materialsUsingTexture } from './materials.js';
import { texSet } from './textures.js';

/* Streams the real CC0 textures and models (public/assets, built by
   scripts/fetch-assets.mjs) into a castle that is already playable with its
   procedural stand-ins. The room you're in loads first; anything that fails
   (offline, old browser) simply keeps the procedural version. */

const BASE = 'assets/';
const status = { textures: 0, models: 0, failed: 0, queued: 0, done: false };
export function assetStatus() { return status; }

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loadTex = url => new Promise((res, rej) => texLoader.load(url, res, undefined, rej));
const gltfCache = new Map();
function loadGLTF(id) {
  if (!gltfCache.has(id)) gltfCache.set(id, new Promise((res, rej) => gltfLoader.load(`${BASE}models/${id}.glb`, g => res(g.scene), undefined, rej)));
  return gltfCache.get(id).then(scene => scene.clone(true));
}

async function swapTexture(key, info) {
  const [map, normalMap, roughnessMap] = await Promise.all(['color', 'normal', 'rough'].map(n => loadTex(`${BASE}textures/${key}/${n}.webp`)));
  const procScale = texSet(key).scale;
  // surfaces use world-space UVs divided by the procedural scale; rescale to the real texture's size
  const rep = procScale / info.scale;
  for (const t of [map, normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; }
  map.colorSpace = THREE.SRGBColorSpace;
  for (const m of materialsUsingTexture(key)) {
    m.map = map; m.normalMap = normalMap; m.roughnessMap = roughnessMap;
    m.roughness = 1; m.normalScale.set(1, 1);
    if (!m.userData.keepTint) m.color.set(m.userData.realTint || 0xffffff);
    m.needsUpdate = true;
  }
  status.textures++;
}

/* ---------- where each model goes ---------- */
// Station props replaced by a real model. hide: 'all' | number of leading children to hide | {from:n} to hide children from n on.
const STATION_MODELS = {
  gate:      { id: 'large_iron_gate', fit: { width: 4.1 }, pos: [0, 0, -0.42], hide: { from: 3 } },
  clock:     { id: 'vintage_grandfather_clock_01', fit: { height: 2.7 }, pos: [0, 0, -0.05] },
  throne:    { id: 'WoodenChair_01', fit: { height: 3.3 }, pos: [0, 0.32, -0.5], hide: { from: 2 } },
  mirror:    { id: 'ornate_mirror_01', fit: { height: 2.5 }, pos: [0, 3.0, -0.2] },
  vase:      { id: 'antique_ceramic_vase_01', fit: { height: 1.15 }, pos: [0, 0.9, 0], hide: { from: 1 } },
  bust:      { id: 'marble_bust_01', fit: { height: 0.85 }, pos: [0, 1.3, 0], hide: { from: 2 } },
  bookshelf: { id: 'wooden_bookshelf_worn', fit: { height: 3.6 }, pos: [0, 0, -0.1] },
  armchair:  { id: 'ArmChair_01', fit: { height: 1.25 }, pos: [0, 0, 0], hide: 9 },
  barrels:   { id: 'wooden_barrels_01', fit: { width: 2.6 }, pos: [0, 0, 0] },
  shield:    { id: 'kite_shield', fit: { height: 1.7 }, pos: [0, 3.0, -0.2], extra: [
               { id: 'antique_estoc', fit: { height: 1.9 }, pos: [-0.15, 2.9, -0.28], rot: [0, 0, 0.75] },
               { id: 'antique_estoc', fit: { height: 1.9 }, pos: [0.15, 2.9, -0.28], rot: [0, 0, -0.75] }] },
  chest:     { id: 'treasure_chest', fit: { width: 1.3 }, pos: [0, 0, 0], hide: { except: 'light' } },
  cannon:    { id: 'cannon_01', fit: { length: 2.4 }, pos: [0, 0, -0.2], rot: [0, Math.PI, 0] },
  trophies:  { id: 'vintage_cabinet_01', fit: { height: 2.6 }, pos: [0, 0, -0.1] },
  desk:      { add: true, id: 'vintage_oil_lamp', fit: { height: 0.6 }, pos: [-0.62, 0.9, -0.25], extra: [
               { id: 'book_encyclopedia_set_01', fit: { width: 0.6 }, pos: [0.1, 0.9, -0.33] }] },
  scales:    { add: true, id: 'chemistry_set', fit: { width: 1.0 }, pos: [-0.3, 0.96, -0.2] },
  well:      { add: true, id: 'wooden_bucket_01', fit: { height: 0.5 }, pos: [0.7, 0.95, 0.35] },
  longtable: { add: true, id: 'brass_goblets', fit: { width: 0.45 }, pos: [-1.5, 0.92, 0.1], extra: [
               { id: 'jug_01', fit: { height: 0.32 }, pos: [1.2, 0.92, 0] }, { id: 'brass_goblets', fit: { width: 0.45 }, pos: [2.4, 0.92, -0.1], rot: [0, 2, 0] }] }
};
export const REPLACED_PROPS = new Set(Object.keys(STATION_MODELS).filter(k => !STATION_MODELS[k].add));
// Free-standing dressing: [room, model, x, z, y, yaw, fit]
const DECOR_MODELS = [
  ['courtyard', 'wine_barrel_01', 42.6, 47.6, 0, 0.4, { height: 1.1 }],
  ['courtyard', 'wooden_lantern_01', 41.7, 46.6, 0.92, 0, { height: 0.55 }],
  ['courtyard', 'wine_barrel_01', 25.2, 44.9, 0, 1.2, { height: 1.1 }],
  // planting: a hedge along the east wall, ferns in the corners and by the walls
  ['courtyard', 'shrub_02', 43.1, 52, 0, Math.PI / 2, { length: 4.6 }, [[43.1, 50, 0.7], [43.1, 52, 0.7], [43.1, 54, 0.7]]],
  ['courtyard', 'fern_02', 24.9, 49.6, 0, 0.3, { length: 2.6 }],
  ['courtyard', 'fern_02', 28.6, 58.6, 0, 2.1, { length: 2.4 }],
  ['courtyard', 'fern_02', 38.2, 58.7, 0, -1.2, { length: 2.2 }],
  ['courtyard', 'fern_02', 27.6, 44.95, 0, 1.0, { length: 2.0 }],
  ['entrance', 'gothic_statue', 41.6, 41.2, 0, -2.4, { height: 1.9 }],
  ['entrance', 'GothicCabinet_01', 31, 28.7, 0, 0, { height: 2.6 }],
  ['hall', 'GothicCabinet_01', 21.1, 25, 0, -Math.PI / 2, { height: 2.6 }],
  ['hall', 'lion_head', 2.7, 26, 4.6, Math.PI / 2, { height: 0.75 }],
  ['hall', 'brass_goblets', 7, 27.5, 0.92, 0.5, { width: 0.45 }],
  ['hall', 'jug_01', 18, 30, 0.92, 2, { height: 0.32 }],
  ['gallery', 'GothicCommode_01', 2.7, 11.2, 0, Math.PI / 2, { height: 1.3 }],
  ['gallery', 'spinning_wheel_01', 20.8, 12.6, 0, -2.4, { height: 1.2 }],
  ['library', 'horse_statue_01', 38.5, 12, 0.9, -1, { height: 0.32 }],
  ['dungeon', 'painted_wooden_shelves', 46.5, 13.5, 0, Math.PI / 2, { height: 1.9 }],
  ['dungeon', 'wine_barrel_01', 64.9, 9.4, 0, 0.3, { height: 1.1 }],
  ['armoury', 'ornate_medieval_mace', 46.15, 27.8, 2.1, Math.PI / 2, { height: 0.9 }],
  ['armoury', 'ornate_war_hammer', 46.15, 28.8, 2.1, Math.PI / 2, { height: 1.0 }],
  ['armoury', 'wooden_axe', 46.15, 29.7, 2.1, Math.PI / 2, { height: 0.9 }],
  ['armoury', 'wooden_crate_02', 49.2, 21, 0, 0.2, { length: 1.4 }],
  ['tower', 'gothic_statue', 47.6, 50.2, 0, Math.PI / 2, { height: 1.7 }]
];

function fitScale(obj, fit) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  if (fit.height) return fit.height / size.y;
  if (fit.width) return fit.width / Math.max(size.x, 0.001);
  if (fit.length) return fit.length / Math.max(size.x, size.z, 0.001);
  return 1;
}
async function instance(id, fit, opts) {
  const obj = await loadGLTF(id);
  obj.scale.setScalar(fitScale(obj, fit || {}));
  // only sizeable objects cast shadows; table-top props would cost more than they add
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const casts = Math.max(size.x, size.y, size.z) > 1.0;
  obj.traverse(o => { if (o.isMesh) { o.castShadow = casts; o.receiveShadow = true; } });
  if (opts && opts.rot) obj.rotation.set(...opts.rot);
  // lamp glass glows warm, as if lit from inside
  obj.traverse(o => { if (o.isMesh && /glass/i.test(o.material.name) && !o.material.userData.lit) {
    o.material.color.set(0xffc888); o.material.emissive = new THREE.Color(0xffa24a); o.material.emissiveIntensity = 1.3; o.material.userData.lit = true; o.castShadow = false;
  } });
  return obj;
}
async function warm(obj) {
  try { if (S.renderer.compileAsync) await S.renderer.compileAsync(obj, S.camera, S.scene); } catch (e) { /* render will compile it */ }
  obj.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) S.renderer.initTexture(m[k]); });
}
async function placeStationModel(s, spec) {
  const host = S.propGroups[s.id]; if (!host) return;
  const parts = [{ id: spec.id, fit: spec.fit, pos: spec.pos, rot: spec.rot }, ...(spec.extra || [])];
  const objs = await Promise.all(parts.map(p => instance(p.id, p.fit, p)));
  for (const o of objs) await warm(o);
  objs.forEach((o, i) => { o.position.set(...parts[i].pos); host.add(o); });
  if (!spec.add) {
    const kids = host.children.filter(c => !objs.includes(c));
    kids.forEach((c, i) => {
      let hide = true;
      if (typeof spec.hide === 'number') hide = i < spec.hide;
      else if (spec.hide && spec.hide.from != null) hide = i >= spec.hide.from;
      if (spec.hide && spec.hide.except === 'light' && c.userData.light) hide = false;
      if (c.userData.light) hide = false;
      if (hide) c.visible = false;
    });
  }
  S.renderer.shadowMap.needsUpdate = true;
  status.models++;
}
async function placeDecorModel([, id, x, z, y, yaw, fit, colliders]) {
  const o = await instance(id, fit);
  await warm(o);
  o.position.set(x, y, z); o.rotation.y = yaw;
  // centre models whose origin sits at one end (planting rows, clumps)
  o.updateMatrixWorld(true);
  if (fit && fit.length) { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); o.position.x += x - c.x; o.position.z += z - c.z; }
  S.scene.add(o);
  for (const [cx, cz, r] of colliders || []) S.colliders.push({ x: cx, z: cz, r });
  status.models++;
}
async function swapReplaceables(kind, id, fit) {
  for (const r of S.replaceables[kind] || []) {
    const o = await instance(id, fit);
    await warm(o);
    o.position.set(r.group.position.x, 0, r.group.position.z);
    o.rotation.y = r.group.rotation.y;
    o.updateMatrixWorld(true);
    o.position.y = r.bottom - new THREE.Box3().setFromObject(o).min.y;
    if (r.group.isMesh) { r.group.visible = false; r.group.userData.noCull = true; }
    else r.group.children.forEach(c => { if (!c.userData.light && !c.userData.keep) c.visible = false; });
    S.scene.add(o);
    status.models++;
  }
}

// Order rooms by how far along the route they are from where the player is.
function roomOrder() {
  const ids = CASTLE_ROOMS.map(r => r.id), cur = S.currentRoom ? ids.indexOf(S.currentRoom.id) : 0;
  return ids.map((id, i) => ({ id, d: Math.min(Math.abs(i - cur), ids.length - Math.abs(i - cur)) })).sort((a, b) => a.d - b.d).map(x => x.id);
}

export async function streamAssets() {
  let manifest;
  try { const r = await fetch(`${BASE}manifest.json`); if (!r.ok) throw new Error(r.status); manifest = await r.json(); }
  catch (e) { status.failed++; status.done = true; return; }
  // textures first: they change every surface at once
  await Promise.all(Object.entries(manifest.textures).map(([k, info]) => swapTexture(k, info).catch(() => { status.failed++; })));
  // then models, nearest room first, three at a time
  const jobs = [];
  for (const s of CASTLE_STATIONS) if (STATION_MODELS[s.prop]) jobs.push({ room: s.room, run: () => placeStationModel(s, STATION_MODELS[s.prop]) });
  for (const d of DECOR_MODELS) jobs.push({ room: d[0], run: () => placeDecorModel(d) });
  jobs.push({ room: 'hall', run: () => swapReplaceables('chandelier-big', 'Chandelier_03', { height: 2.3 }) });
  jobs.push({ room: 'library', run: () => swapReplaceables('chandelier-small', 'lantern_chandelier_01', { height: 1.6 }) });
  jobs.push({ room: 'courtyard', run: () => swapReplaceables('crate', 'wooden_crate_01', { width: 1.0 }) });
  jobs.push({ room: 'courtyard', run: () => swapReplaceables('lamppost', 'street_lamp_01', { height: 3.9 }) });
  jobs.push({ room: 'courtyard', run: () => swapReplaceables('walllamp', 'street_lamp_02', { height: 1.7 }) });
  status.queued = jobs.length;
  const next = () => { if (!jobs.length) return null; const order = roomOrder(); jobs.sort((a, b) => order.indexOf(a.room) - order.indexOf(b.room)); return jobs.shift(); };
  const worker = async () => { for (let j = next(); j; j = next()) { try { await j.run(); } catch (e) { status.failed++; } } };
  await Promise.all([worker(), worker(), worker()]);
  status.done = true;
}
