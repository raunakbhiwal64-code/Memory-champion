import * as THREE from 'three';
import { S } from './state.js';
import { mat, M, surfaceMat } from './materials.js';
import { flame, glowSprite, lightMarker, PROPS, shelfUnit } from './props.js';
import { canvasTexture, rng } from './textures.js';

/* Non-station dressing that gives each room its character, plus the light
   fixtures (registered as light-pool sources). */
const T = CASTLE_TILE;
const R = id => CASTLE_ROOMS.find(r => r.id === id);
const add = (o, x, y, z, ry) => { if (x !== undefined) o.position.set(x, y, z); if (ry) o.rotation.y = ry; S.scene.add(o); shadowsOn(o); return o; };
function shadowsOn(o) { o.traverse(m => { if (m.isMesh && m.material && m.material.blending !== THREE.AdditiveBlending) { m.castShadow = true; m.receiveShadow = true; } }); }
function box(w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); return o; }
function cyl(rt, rb, h, m, x, y, z, seg) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m); o.position.set(x || 0, y || 0, z || 0); return o; }
function registerLights(o, room) {
  o.updateMatrixWorld(true);
  o.traverse(c => { if (c.userData.light) { const p = new THREE.Vector3(); c.getWorldPosition(p); S.lightSources.push(Object.assign({ x: p.x, y: p.y, z: p.z, room }, c.userData.light)); } });
}

// wrought-iron ring chandelier hanging from the ceiling
function chandelier(radius, candles, dropTo, ceiling) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 8, 40), M.iron()); ring.rotation.x = Math.PI / 2; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, 0.05, 8, 32), M.iron()); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.35; g.add(ring2);
  for (let i = 0; i < candles; i++) {
    const a = i / candles * Math.PI * 2;
    const c = cyl(0.045, 0.05, 0.3, mat(0xf2ead2, { roughness: 0.6 }), Math.cos(a) * radius, 0.18, Math.sin(a) * radius, 8); g.add(c);
    const f = flame(0.7); f.position.set(Math.cos(a) * radius, 0.34, Math.sin(a) * radius); g.add(f);
  }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const ch = cyl(0.015, 0.015, ceiling - dropTo, M.iron(), Math.cos(a) * radius * 0.5, (ceiling - dropTo) / 2, Math.sin(a) * radius * 0.5, 4); g.add(ch); }
  g.add(lightMarker(0, -0.2, 0, 0xffb066, 40 + radius * 15, 14 + radius * 2, 'chandelier'));
  g.children.forEach(c => { if (c.isMesh && c.geometry.type === 'CylinderGeometry' && c.position.y > 0.5) c.userData.keep = true; });
  g.position.y = dropTo;
  g.userData.noMerge = true;
  const kind = radius >= 1.3 ? 'chandelier-big' : 'chandelier-small';
  (S.replaceables[kind] = S.replaceables[kind] || []).push({ group: g, bottom: dropTo - 0.35 });
  return g;
}
// wall sconce with a burning torch
function sconce() {
  const g = new THREE.Group();
  g.add(box(0.18, 0.4, 0.08, M.iron(), 0, 0, -0.02));
  const arm = cyl(0.03, 0.03, 0.45, M.iron(), 0, 0.12, 0.2, 6); arm.rotation.x = 0.9; g.add(arm);
  g.add(cyl(0.09, 0.05, 0.16, M.iron(), 0, 0.3, 0.38, 8));
  const t = cyl(0.04, 0.035, 0.3, M.darkwood(), 0, 0.42, 0.38, 6); g.add(t);
  const f = flame(1.3); f.position.set(0, 0.56, 0.38); g.add(f);
  g.add(lightMarker(0, 0.9, 1.3, 0xff9a48, 7, 8, 'torch'));
  return g;
}
// green-shaded reading lamp
function bankerLamp() {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.12, 0.04, M.brass(), 0, 0.02, 0, 12), cyl(0.015, 0.015, 0.35, M.brass(), 0, 0.2, 0, 6));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.1, 16, 1, true, 0, Math.PI), mat(0x1f6a3a, { roughness: 0.3, side: THREE.DoubleSide, emissive: 0x0a3018 }));
  shade.rotation.z = Math.PI / 2; shade.position.y = 0.38; g.add(shade);
  const glow = glowSprite('rgba(255,220,150,0.9)', 0.6); glow.position.y = 0.33; g.add(glow);
  g.add(lightMarker(0, 0.4, 0.2, 0xffd49a, 6, 5, 'lamp'));
  return g;
}
function lampPost() {
  const g = new THREE.Group();
  g.add(cyl(0.12, 0.18, 0.4, M.iron(), 0, 0.2, 0, 8), cyl(0.06, 0.07, 3.0, M.iron(), 0, 1.7, 0, 8));
  g.add(box(0.36, 0.5, 0.36, mat(0x403020, { emissive: 0xffa850, emissiveIntensity: 1.1, roughness: 0.3 }), 0, 3.4, 0));
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 4), M.iron())); g.children[3].position.y = 3.8; g.children[3].rotation.y = Math.PI / 4;
  g.add(lightMarker(0, 3.3, 0, 0xffc070, 30, 12, 'lantern', true));
  return g;
}
// wrought-iron wall bracket with a lantern; +z points out of the wall
function wallLamp() {
  const g = new THREE.Group();
  g.add(box(0.16, 0.36, 0.05, M.iron(), 0, 0.6, 0.025), box(0.05, 0.05, 0.62, M.iron(), 0, 0.72, 0.33));
  g.add(box(0.22, 0.3, 0.22, mat(0x403020, { emissive: 0xffa850, emissiveIntensity: 1.1, roughness: 0.3 }), 0, 0.42, 0.62));
  g.add(lightMarker(0, 0.3, 0.75, 0xffb868, 9, 8, 'lantern'));
  return g;
}
function bench(len) {
  const g = new THREE.Group();
  g.add(box(len, 0.08, 0.38, M.darkwood(), 0, 0.46, 0));
  for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) g.add(box(0.08, 0.44, 0.32, M.darkwood(), x, 0.22, 0));
  return g;
}
function column(h, rad) {
  const g = new THREE.Group();
  g.add(box(rad * 2.6, 0.3, rad * 2.6, M.stone(), 0, 0.15, 0));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.08, h - 0.7, 20), mat(0xe8e0d0, { roughness: 0.75, tex: 'plaster' })); shaft.position.y = (h - 0.7) / 2 + 0.3; g.add(shaft);
  g.add(box(rad * 2.6, 0.4, rad * 2.6, M.stone(), 0, h - 0.2, 0));
  return g;
}
function crestBanner(seed) {
  // the Keep's own heraldry: a key over an open eye, on midnight blue
  const tex = canvasTexture(128, (g, w, h) => {
    g.fillStyle = '#1c2a52'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4a64a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#d4a64a';
    g.beginPath(); g.ellipse(w / 2, h * 0.36, w * 0.28, h * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1c2a52'; g.beginPath(); g.arc(w / 2, h * 0.36, h * 0.07, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d4a64a'; g.fillRect(w / 2 - 3, h * 0.5, 6, h * 0.36);
    g.beginPath(); g.arc(w / 2, h * 0.52, 10, 0, Math.PI * 2); g.fill();
    g.fillRect(w / 2, h * 0.74, 14, 5); g.fillRect(w / 2, h * 0.81, 10, 5);
  }, 64);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.8, 4, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
  const pos = cloth.geometry.attributes.position, base = pos.array.slice(), ph = (seed || 0) * 1.7;
  S.animated.push(t => { for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.9 + ph + y * 1.5) * 0.03 * (1.4 - y) / 2.8; } pos.needsUpdate = true; });
  const g = new THREE.Group(); g.add(cloth);
  const rod = cyl(0.04, 0.04, 1.6, M.gold(), 0, 1.45, 0.02, 6); rod.rotation.z = Math.PI / 2; g.add(rod);
  return g;
}
// on the inside face of a room wall: side n/s/e/w, along = world coordinate along the wall
function onWall(roomId, side, along, y, obj, inset) {
  const r = R(roomId), x0 = r.x0 * T, z0 = r.z0 * T, x1 = (r.x1 + 1) * T, z1 = (r.z1 + 1) * T, i = inset == null ? 0.05 : inset;
  if (side === 'n') return add(obj, along, y, z0 + i, 0);
  if (side === 's') return add(obj, along, y, z1 - i, Math.PI);
  if (side === 'w') return add(obj, x0 + i, y, along, Math.PI / 2);
  return add(obj, x1 - i, y, along, -Math.PI / 2);
}
function hang(roomId, obj) { registerLights(obj, roomId); return obj; }

export function buildDecor() {
  /* Moonlit Courtyard: lamp posts, ivy, crates, a cart */
  [[30, 45.6], [38, 45.6], [26, 57.6], [41.5, 58]].forEach(([x, z]) => {
    // kept apart from the static merge so the real lamp model can replace it
    const lamp = hang('courtyard', add(lampPost(), x, 0, z)); lamp.userData.noMerge = true; S.colliders.push({ x, z, r: 0.25 });
    (S.replaceables.lamppost = S.replaceables.lamppost || []).push({ group: lamp, bottom: 0 });
  });
  // lanterns flanking the great door, and one on each side wall
  for (const [side, along] of [['n', 30.3], ['n', 37.7], ['e', 50.5], ['w', 52]]) {
    const lamp = hang('courtyard', onWall('courtyard', side, along, 2.6, wallLamp(), 0.02)); lamp.userData.noMerge = true;
    (S.replaceables.walllamp = S.replaceables.walllamp || []).push({ group: lamp, bottom: 2.2 });
  }
  // ivy: thousands of small pointed leaves, darker and denser near the root,
  // each a slightly different green
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.05); leafShape.quadraticCurveTo(0.075, -0.02, 0.06, 0.03); leafShape.lineTo(0.02, 0.025); leafShape.lineTo(0, 0.075);
  leafShape.lineTo(-0.02, 0.025); leafShape.lineTo(-0.06, 0.03); leafShape.quadraticCurveTo(-0.075, -0.02, 0, -0.05);
  const ivyMat = mat(0xffffff, { roughness: 0.55, side: THREE.DoubleSide });
  const r = rng(12), leaves = 3200, ivy = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 3), ivyMat, leaves), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const patches = [[24.05, 47, 'w'], [24.05, 55, 'w'], [29, 59.95, 's'], [43.95, 56, 'e']];
  for (let i = 0; i < leaves; i++) {
    const [a, b, side] = patches[i % patches.length], up = Math.pow(r(), 0.85) * 5.8;
    const spread = 1.2 + 2.4 * Math.sqrt(up / 5.8) * (1.15 - up / 7);
    const off = (r() - 0.5) * spread + Math.sin(up * 1.7 + a) * 0.35;
    const x = side === 's' ? a + off : a + (side === 'w' ? 0.03 : -0.03) * (1 + r() * 2), z = side === 's' ? b - 0.03 * (1 + r() * 2) : b + off;
    e.set((r() - 0.5) * 0.9, (side === 's' ? 0 : Math.PI / 2) + (r() - 0.5) * 0.6, (r() - 0.5) * 1.2); q.setFromEuler(e);
    const sc = 0.8 + r() * 0.9; m4.compose(new THREE.Vector3(x, 0.15 + up, z), q, new THREE.Vector3(sc, sc, sc)); ivy.setMatrixAt(i, m4);
    col.setHSL(0.27 + r() * 0.06, 0.35 + r() * 0.2, 0.09 + r() * 0.08 + (up < 1 ? -0.03 : 0)); ivy.setColorAt(i, col);
  }
  ivy.receiveShadow = true; S.scene.add(ivy);
  for (const [x, z] of [[42.6, 45.4], [42.6, 46.6], [41.5, 45.4]]) { const c = add(box(1, 1, 1, M.wood(), x, 0.5, z)); c.userData.noMerge = true; (S.replaceables.crate = S.replaceables.crate || []).push({ group: c, bottom: 0 }); S.colliders.push({ x, z, r: 0.6 }); }

  /* Entrance Hall: columns, runner, great chandelier, crest banners, sconces */
  for (const x of [28, 40]) for (const z of [33, 39]) { add(column(R('entrance').h - 0.2, 0.42), x, 0, z); S.colliders.push({ x, z, r: 0.6 }); }
  add(box(3.2, 0.02, 11, mat(0x7a1a22, { roughness: 0.95 }), 34, 0.012, 36.5));
  hang('entrance', add(chandelier(1.6, 14, 6.2, 10), 34, 6.2, 35.5));
  onWall('entrance', 'w', 31, 5.6, crestBanner(1), 0.08); onWall('entrance', 'e', 35, 5.2, crestBanner(2), 0.08);
  hang('entrance', onWall('entrance', 'n', 28, 3.2, sconce())); hang('entrance', onWall('entrance', 'n', 40, 3.2, sconce()));

  /* Great Hall: two more long tables, benches, three chandeliers, banners, dais */
  [[7, 30], [18, 28.5]].forEach(([x, z]) => { const t = PROPS.longtable(); add(t, x, 0, z, Math.PI / 2); for (const dz of [-2.6, 0, 2.6]) S.colliders.push({ x, z: z + dz, r: 1.3 }); });
  for (const z of [22, 29, 36]) hang('hall', add(chandelier(1.3, 12, 7.2, 11), 12, 7.2, z));
  onWall('hall', 'e', 21, 5.5, crestBanner(3), 0.08); onWall('hall', 'e', 31, 5.5, crestBanner(4), 0.08); onWall('hall', 'w', 35, 5.5, crestBanner(5), 0.08);
  add(box(14, 0.12, 4.4, M.stone(), 12, 0.06, 18.4));
  add(box(14.2, 0.02, 4.6, mat(0x5a1018, { roughness: 0.95 }), 12, 0.13, 18.4));
  hang('hall', onWall('hall', 'e', 40, 3.4, sconce())); hang('hall', onWall('hall', 'w', 23, 3.4, sconce()));

  /* Portrait Gallery: runner, extra portraits with picture lights, benches */
  add(box(17, 0.02, 2.2, mat(0x6a1520, { roughness: 0.95 }), 12, 0.012, 8));
  const portraitColors = [['#3a2a1a', '#a0703a'], ['#1a2a3a', '#c8b090'], ['#2a1a2a', '#9a5a6a'], ['#2a3a2a', '#8a9a6a']];
  [[11, 's'], [19, 's']].forEach(([x, side], i) => {
    const [bg, fig] = portraitColors[i];
    const tex = canvasTexture(128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fig; g.beginPath(); g.ellipse(w / 2, h * 0.38, w * 0.16, h * 0.14, 0, 0, Math.PI * 2); g.fill(); g.fillRect(w * 0.3, h * 0.52, w * 0.4, h * 0.48); }, 100);
    const p = new THREE.Group();
    p.add(box(1.25, 1.6, 0.08, M.gold(), 0, 0, 0));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); pic.position.z = 0.05; p.add(pic);
    const light = box(0.6, 0.06, 0.12, M.brass(), 0, 0.95, 0.18); p.add(light);
    const lg = glowSprite('rgba(255,220,160,0.7)', 0.8); lg.position.set(0, 0.8, 0.25); p.add(lg);
    onWall('gallery', side, x, 2.7, p, 0.08);
  });
  hang('gallery', onWall('gallery', 's', 15.5, 3.4, sconce()));
  hang('gallery', add(chandelier(0.9, 8, 4.0, 6), 12, 4.0, 8));
  for (const x of [6, 19]) { add(bench(1.6), x, 0, 10.6); S.colliders.push({ x, z: 10.6, r: 0.7 }); }

  /* Library: two-storey stacks, a balcony walkway with railings, lamps, ladder */
  const lib = R('library'), lx0 = lib.x0 * T, lx1 = (lib.x1 + 1) * T, lz0 = lib.z0 * T, lz1 = (lib.z1 + 1) * T, bal = 5.2;
  [28, 31.2, 34.4].forEach((x, i) => { const s = shelfUnit(2.4, 4, 6, 90 + i); add(s, x, 0, lz0 + 0.35); S.colliders.push({ x: x - 0.8, z: lz0 + 0.6, r: 0.55 }, { x: x + 0.8, z: lz0 + 0.6, r: 0.55 }); });
  for (let x = lx0 + 1.4; x < lx1 - 1; x += 2.5) { const s = shelfUnit(2.4, 3.6, 5, 200 + x | 0); add(s, x, bal + 0.1, lz0 + 0.35); }
  for (let z = lz0 + 3; z < lz1 - 2; z += 2.5) { const s = shelfUnit(2.4, 3.6, 5, 300 + z | 0); add(s, lx1 - 0.35, bal + 0.1, z, -Math.PI / 2); add(shelfUnit(2.4, 3.6, 5, 400 + z | 0), lx0 + 0.35, bal + 0.1, z, Math.PI / 2); }
  // balcony along north, east and west walls
  const deck = mat(0x6a4426, { roughness: 0.7, tex: 'oak' });
  add(box(lx1 - lx0, 0.25, 1.8, deck, (lx0 + lx1) / 2, bal, lz0 + 0.9));
  add(box(1.8, 0.25, lz1 - lz0 - 1.8, deck, lx0 + 0.9, bal, (lz0 + lz1) / 2 + 0.9));
  add(box(1.8, 0.25, lz1 - lz0 - 1.8, deck, lx1 - 0.9, bal, (lz0 + lz1) / 2 + 0.9));
  const rail = M.darkwood();
  add(box(lx1 - lx0 - 3.6, 0.08, 0.08, rail, (lx0 + lx1) / 2, bal + 1.0, lz0 + 1.8));
  add(box(0.08, 0.08, lz1 - lz0 - 1.8, rail, lx0 + 1.8, bal + 1.0, (lz0 + lz1) / 2 + 0.9));
  add(box(0.08, 0.08, lz1 - lz0 - 1.8, rail, lx1 - 1.8, bal + 1.0, (lz0 + lz1) / 2 + 0.9));
  for (let x = lx0 + 1.8; x <= lx1 - 1.8; x += 0.6) add(cyl(0.025, 0.025, 1.0, rail, x, bal + 0.5, lz0 + 1.8, 6));
  for (let z = lz0 + 1.8; z <= lz1 - 0.2; z += 0.6) { add(cyl(0.025, 0.025, 1.0, rail, lx0 + 1.8, bal + 0.5, z, 6)); add(cyl(0.025, 0.025, 1.0, rail, lx1 - 1.8, bal + 0.5, z, 6)); }
  for (const [x, z] of [[lx0 + 1.8, lz0 + 1.8], [lx1 - 1.8, lz0 + 1.8], [lx0 + 1.8, 12], [lx1 - 1.8, 12]]) { add(box(0.3, bal, 0.3, rail, x, bal / 2, z)); S.colliders.push({ x, z, r: 0.3 }); }
  const ladder = new THREE.Group(); for (const sx of [-0.25, 0.25]) ladder.add(box(0.06, 5.2, 0.06, M.wood(), sx, 2.6, 0)); for (let k = 0; k < 12; k++) ladder.add(box(0.5, 0.04, 0.04, M.wood(), 0, 0.3 + k * 0.42, 0));
  ladder.rotation.x = -0.18; add(ladder, 33, 0, 4.3); S.colliders.push({ x: 33, z: 4.1, r: 0.35 });
  hang('library', add(chandelier(1.4, 12, 7.6, 10), 34, 7.6, 14));
  [[30, 18.6], [38.5, 12]].forEach(([x, z], i) => { const t = new THREE.Group(); t.add(box(1.4, 0.08, 0.8, M.wood(), 0, 0.82, 0)); for (const sx of [-0.6, 0.6]) for (const sz of [-0.3, 0.3]) t.add(box(0.07, 0.8, 0.07, M.darkwood(), sx, 0.4, sz)); if (i) { add(t, x, 0, z); S.colliders.push({ x, z, r: 0.8 }); const l = bankerLamp(); hang('library', add(l, x + 0.4, 0.86, z)); } });

  /* Alchemist's Cellar: hanging herbs, candles, shelves, chains, green haze */
  [[52, 12], [60, 6], [58, 15]].forEach(([x, z]) => { for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), M.iron()); l.position.set(x, 4.2 - i * 0.17, z); l.rotation.y = (i % 2) ? Math.PI / 2 : 0; S.scene.add(l); } });
  for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), mat(0x4a6a2a, { roughness: 0.95 })); h.position.set(48 + i * 1.4, 3.6, 3.2); h.rotation.x = Math.PI; S.scene.add(h); }
  for (const [x, z] of [[54, 3], [62, 9], [50, 9.5]]) { const c = new THREE.Group(); c.add(cyl(0.06, 0.07, 0.35, mat(0xeee6cc), 0, 0.18, 0, 8)); const f = flame(0.8); f.position.y = 0.4; c.add(f); c.add(lightMarker(0, 0.6, 0, 0xffa050, 5, 4, 'candle')); hang('dungeon', add(c, x, 0.95, z)); add(box(0.7, 0.95, 0.7, M.darkwood(), x, 0.47, z)); S.colliders.push({ x, z, r: 0.5 }); }

  /* Armoury & Forge: forge hearth with glowing coals, anvil, shields on the walls */
  const forge = new THREE.Group();
  forge.add(box(2.6, 1.0, 1.8, surfaceMat('brick'), 0, 0.5, 0), box(2.2, 0.1, 1.4, M.glow(0xff5a1a, 3), 0, 1.02, 0));
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.5, 2.2, 4, 1, true), mat(0x2a2624, { roughness: 0.8, side: THREE.DoubleSide })); hood.rotation.y = Math.PI / 4; hood.position.y = 3.3; forge.add(hood);
  forge.add(cyl(0.45, 0.45, 2.6, surfaceMat('brick'), 0, 5.6, 0, 8));
  const coals = glowSprite('rgba(255,110,30,1)', 3.4); coals.position.y = 1.3; forge.add(coals);
  forge.add(lightMarker(0, 1.6, 0.6, 0xff6a24, 70, 14, 'fire', true));
  hang('armoury', add(forge, 63.5, 0, 34)); S.colliders.push({ x: 63.5, z: 34, r: 1.3 });
  const anvil = new THREE.Group(); anvil.add(cyl(0.3, 0.38, 0.6, M.darkwood(), 0, 0.3, 0, 10), box(0.9, 0.25, 0.32, M.iron(), 0, 0.72, 0), box(0.4, 0.2, 0.25, M.iron(), 0, 0.52, 0));
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), M.iron()); horn.rotation.z = Math.PI / 2; horn.position.set(0.62, 0.72, 0); anvil.add(horn);
  add(anvil, 58.5, 0, 29); S.colliders.push({ x: 58.5, z: 29, r: 0.6 });
  for (const z of [27, 35.5]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), mat(z === 27 ? 0x2a4a8a : 0x8a7a2a, { roughness: 0.5, metalness: 0.3 })); sh.rotation.z = Math.PI / 2; onWall('armoury', 'w', z, 3.6, sh, 0.1); }
  hang('armoury', onWall('armoury', 'n', 52, 3.2, sconce())); hang('armoury', onWall('armoury', 'n', 60, 3.2, sconce()));

  /* Observatory: brazier and moonlight, lanterns on the piers */
  const brazier = new THREE.Group(); brazier.add(cyl(0.5, 0.25, 0.4, M.iron(), 0, 1.0, 0, 12)); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const leg = cyl(0.03, 0.03, 1.0, M.iron(), Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3, 6); leg.rotation.z = Math.cos(a) * 0.3; brazier.add(leg); }
  for (let i = 0; i < 3; i++) { const f = flame(2); f.position.set((i - 1) * 0.15, 1.15, 0); brazier.add(f); }
  brazier.add(lightMarker(0, 1.6, 0, 0xff9a50, 40, 12, 'fire', true));
  hang('tower', add(brazier, 56, 0, 46)); S.colliders.push({ x: 56, z: 46, r: 0.6 });

  /* Sconces in every room on free wall spans (skipping doorways) */
  for (const room of CASTLE_ROOMS) {
    if (room.ceiling === 'sky') continue;
    const midX = Math.floor((room.x0 + room.x1) / 2), midZ = Math.floor((room.z0 + room.z1) / 2);
    const spots = [[midX, room.z0 - 1, 'n'], [midX, room.z1 + 1, 's'], [room.x0 - 1, midZ, 'w'], [room.x1 + 1, midZ, 'e']];
    for (const [tx, tz, side] of spots) {
      if (castleCellAt(tx, tz) !== -1) continue;
      if (['hall', 'entrance', 'gallery', 'armoury', 'library'].includes(room.id)) continue; // dressed above
      const along = (side === 'n' || side === 's') ? tx * T + T / 2 : tz * T + T / 2;
      hang(room.id, onWall(room.id, side, along, 3.0, sconce()));
    }
  }
}
