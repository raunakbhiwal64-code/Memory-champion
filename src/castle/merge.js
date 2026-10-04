import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { S } from './state.js';

/* Collapse every static mesh into one mesh per material. Thousands of books,
   balusters and stones become a few hundred draw calls. Anything an animation
   touches (found by stepping every animation once and diffing transforms and
   vertex buffers) is left alone, along with anything marked noMerge. */
export function mergeStatic() {
  const scene = S.scene;
  const snap = new Map();
  const record = () => scene.traverse(o => {
    const g = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    snap.set(o, [o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y, o.rotation.z, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0, g ? g.version : 0].join(','));
  });
  record();
  const before = new Map(snap);
  for (const t of [0.37, 1.91]) for (const f of S.animated) f(t, 0.05);
  snap.clear(); record();
  const dynamic = new Set();
  scene.traverse(o => { if (before.get(o) !== snap.get(o) || o.userData.noMerge) dynamic.add(o); });
  const isDynamic = o => { for (let p = o; p; p = p.parent) if (dynamic.has(p)) return true; return false; };

  const groups = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || isDynamic(o)) return;
    const geo = o.geometry;
    if (!geo.attributes.normal || !geo.attributes.uv) return;
    const key = o.material.uuid + '|' + (geo.index ? 'i' : 'n') + '|' + o.castShadow + o.receiveShadow + '|' + Object.keys(geo.attributes).sort().join(',');
    if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, items: [] });
    groups.get(key).items.push(o);
  });
  let removed = 0, created = 0;
  for (const g of groups.values()) {
    if (g.items.length < 2) continue;
    const geos = g.items.map(o => {
      const c = o.geometry.clone();
      for (const name of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(name)) c.deleteAttribute(name);
      c.applyMatrix4(o.matrixWorld);
      return c;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach(c => c.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, g.material);
    mesh.castShadow = g.cast; mesh.receiveShadow = g.receive;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh); created++;
    for (const o of g.items) { o.parent.remove(o); removed++; }
  }
  return { removed, created };
}
