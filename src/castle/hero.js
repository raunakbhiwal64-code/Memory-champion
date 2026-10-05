import * as THREE from 'three';
import { S } from './state.js';
import { mat, M } from './materials.js';
import { glowSprite } from './props.js';
import { setLanternPos } from './lights.js';

/* The Keeper: a hooded figure in a long travelling cloak, carrying a lantern. */
let H = null;
function lathe(points, m, seg) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg || 28), m);
}
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
// Heavy cloth hangs in folds, deeper towards the hem, and the hem isn't level.
// UVs are rescaled to roughly metres so the woven texture keeps its size.
function drape(mesh, folds, depth, hemY) {
  const g = mesh.geometry, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 0.01) continue;
    const a = Math.atan2(x, z), f = Math.max(0, Math.min(1, (1.45 - y) / 1.1));
    const k = 1 + depth * f * Math.sin(folds * a + 1.7 * Math.sin(3 * a)) + 0.025 * f * Math.sin(23 * a);
    p.setXYZ(i, x * k, y < hemY ? y + 0.03 * Math.sin(5 * a + 1) : y, z * k);
  }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.6);
  g.computeVertexNormals();
  return mesh;
}
function softShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export function buildHero() {
  const cloak = mat(0x5a5e66, { roughness: 0.95, tex: 'wool' }), cloakIn = mat(0x6a3030, { roughness: 0.95, side: THREE.BackSide, tex: 'wool' });
  // keep the dye when the real cloth texture streams in
  cloak.userData.keepTint = cloakIn.userData.keepTint = true;
  const leather = mat(0x4a3020, { roughness: 0.7 }), skin = mat(0xd9a882, { roughness: 0.65 });
  const root = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; root.add(shadow);

  const leg = () => { const g = new THREE.Group(); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.55, 10), mat(0x2a2420, { roughness: 0.9 })); l.position.y = -0.27; g.add(l); const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.27), leather); boot.position.set(0, -0.55, 0.05); g.add(boot); return g; };
  const legL = leg(), legR = leg(); legL.position.set(-0.11, 0.6, 0); legR.position.set(0.11, 0.6, 0); root.add(legL, legR);

  const body = new THREE.Group(); root.add(body);
  // flowing cloak: a lathed bell shape, slightly open at the front
  const robe = drape(lathe([[0.52, 0.22], [0.5, 0.26], [0.45, 0.4], [0.42, 0.55], [0.37, 0.75], [0.33, 0.9], [0.29, 1.1], [0.27, 1.25], [0.26, 1.5], [0.2, 1.68], [0.001, 1.72]], cloak, 72), 9, 0.07, 0.3);
  body.add(robe);
  const lining = drape(lathe([[0.49, 0.24], [0.44, 0.4], [0.41, 0.55], [0.36, 0.75], [0.32, 0.9], [0.25, 1.5]], cloakIn, 72), 9, 0.07, 0.3); lining.scale.set(0.97, 1, 0.97); body.add(lining);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 6, 28), leather); belt.rotation.x = Math.PI / 2; belt.position.y = 1.12; body.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.03), M.brass()); buckle.position.set(0, 1.12, 0.29); body.add(buckle);
  // head in the shadow of a deep hood
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), skin); head.position.set(0, 1.86, 0.03); body.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.235, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), cloak);
  hood.position.set(0, 1.85, -0.02); hood.rotation.x = -0.55; hood.scale.set(1, 1.15, 1.08); body.add(hood);
  const hoodTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), cloak); hoodTip.position.set(0, 1.98, -0.24); hoodTip.rotation.x = -2.2; body.add(hoodTip);
  const mantle = lathe([[0.3, 1.42], [0.36, 1.45], [0.3, 1.6], [0.17, 1.72]], cloak, 28); body.add(mantle);
  // satchel on a strap
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.1), leather); bag.position.set(-0.32, 1.0, 0.1); bag.rotation.z = 0.15; body.add(bag);

  const arm = () => { const g = new THREE.Group(); const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.6, 10), cloak); sleeve.position.y = -0.3; g.add(sleeve); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin); hand.position.y = -0.64; g.add(hand); return g; };
  const armL = arm(), armR = arm(); armL.position.set(-0.3, 1.58, 0); armR.position.set(0.3, 1.58, 0); root.add(armL, armR);

  // the lantern, hanging from the right hand
  const lanternG = new THREE.Group();
  lanternG.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI), M.iron()));
  const cage = new THREE.Group();
  cage.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 6), M.iron()), 0, -0.09, 0));
  cage.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 6, 1, true), mat(0xffe2a0, { emissive: 0xffb050, emissiveIntensity: 3, transparent: true, opacity: 0.8 })), 0, -0.23, 0));
  cage.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 6), M.iron()), 0, -0.345, 0));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cage.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.012), M.iron()), Math.cos(a) * 0.078, -0.23, Math.sin(a) * 0.078)); }
  const glow = glowSprite('rgba(255,200,120,0.9)', 0.9); glow.position.y = -0.23; cage.add(glow);
  lanternG.add(cage); lanternG.position.set(0, -0.7, 0.04);
  armR.add(lanternG);

  root.traverse(o => { if (o.isMesh && o !== shadow) o.castShadow = true; });
  root.userData.noMerge = true; root.userData.noCull = true;
  S.scene.add(root);
  H = { root, body, legL, legR, armL, armR, lanternG, glow, tmp: new THREE.Vector3() };
}

export function animateHero(dt, t) {
  const P = S.player, moving = P.speed > 0.2;
  P.walkPhase += dt * (moving ? P.speed * 2.6 : 0);
  const k = Math.min(1, P.speed / 3), swing = moving ? Math.sin(P.walkPhase) * k : 0;
  H.legL.rotation.x = swing * 0.7; H.legR.rotation.x = -swing * 0.7;
  H.armL.rotation.x = -swing * 0.5;
  H.armR.rotation.x = swing * 0.25 - 0.25 + (S.nearbyStation >= 0 ? -0.5 : 0);
  H.lanternG.rotation.x = -H.armR.rotation.x + Math.sin(t * 2.2) * 0.05 + swing * 0.15;
  H.body.position.y = moving ? Math.abs(Math.sin(P.walkPhase)) * 0.045 : Math.sin(t * 1.4) * 0.01;
  H.body.rotation.z = moving ? Math.sin(P.walkPhase) * 0.025 : 0;
  H.root.position.set(P.x, 0, P.z);
  H.root.rotation.y = P.yaw;
  H.root.updateMatrixWorld(true);
  H.glow.getWorldPosition(H.tmp);
  setLanternPos(H.tmp.x, H.tmp.y, H.tmp.z);
}
export function setHeroVisible(v) { if (H) H.root.visible = v; }
