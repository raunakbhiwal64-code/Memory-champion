import * as THREE from 'three';
import { S } from './state.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './materials.js';
import { metreUVs } from './architecture.js';

/* Oak double doors in every archway. They swing open, away from you, as you
   walk up, and close again once you've moved on, so there's nothing to press. */
const T = CASTLE_TILE, DOOR_H = CASTLE_DOOR_H;
const OPEN_R = 6, CLOSE_R = 7.5, MAX_ANGLE = 1.62;
const doors = [];
let lastT = null;

// one leaf: the half of the arch opening on one side of the centre line,
// shifted so the hinge sits at the pivot's origin
function leafGeometry(hw, side) {
  const spring = DOOR_H - Math.min(hw, DOOR_H * 0.45), ry = DOOR_H - spring;
  const gap = 0.025, s = new THREE.Shape();
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI / 2 + (i / 16) * Math.PI / 2; // top of the arch down to the jamb
    pts.push([Math.cos(a) * hw, spring + Math.sin(a) * ry]);
  }
  // build the left half, then mirror for the right
  const P = pts.map(([x, y]) => [side < 0 ? x : -x, y]);
  const meet = side < 0 ? -gap : gap;
  s.moveTo(meet, 0); s.lineTo(meet, DOOR_H - 0.02);
  for (const [x, y] of P) s.lineTo(Math.abs(x) < gap ? meet : x, y - 0.02);
  s.lineTo(side < 0 ? -hw + 0.02 : hw - 0.02, 0); s.lineTo(meet, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 16 });
  geo.translate(side < 0 ? hw : -hw, 0, -0.055);
  metreUVs(geo, 'beam');
  return { geo, spring, ry };
}

// width of the leaf at height y (it narrows under the arch)
function leafWidthAt(hw, spring, ry, y) {
  if (y <= spring) return hw;
  const k = (y - spring) / ry;
  return hw * Math.sqrt(Math.max(0, 1 - k * k));
}

// weathered oak: the streamed dark-wood texture, tinted browner and less red
let woodMat = null;
function doorWood() {
  if (!woodMat) { woodMat = mat(0x8a6a50, { roughness: 0.75, tex: 'beam' }); woodMat.userData.realTint = 0x9a8878; }
  return woodMat;
}
function buildLeaf(hw, side, iron) {
  const pivot = new THREE.Group();
  const { geo, spring, ry } = leafGeometry(hw, side);
  const wood = new THREE.Mesh(geo, doorWood());
  wood.castShadow = wood.receiveShadow = true;
  pivot.add(wood);
  const dir = side < 0 ? 1 : -1; // leaf extends +x from a left hinge, -x from a right one
  // all the ironwork is baked into one mesh per leaf, so a door costs two draw calls
  const parts = [];
  const put = (g, x, y, z, rx) => { if (rx) g.rotateX(rx); g.translate(x, y, z); parts.push(g.index ? g.toNonIndexed() : g); };
  // three wrought-iron strap hinges on both faces, with studs along them
  for (const y of [0.55, 1.9, Math.min(3.2, spring + ry * 0.45)]) {
    const len = leafWidthAt(hw, spring, ry, y + 0.05) - 0.12;
    if (len < 0.4) continue;
    for (const face of [-1, 1]) {
      put(new THREE.BoxGeometry(len, 0.075, 0.018), dir * (0.05 + len / 2), y, face * 0.072);
      for (let x = 0.2; x < len - 0.05; x += 0.32)
        put(new THREE.SphereGeometry(0.022, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), dir * (0.05 + x), y, face * 0.081, face * Math.PI / 2);
    }
  }
  // ring pulls near the meeting stile
  for (const face of [-1, 1]) {
    put(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), dir * (hw - 0.28), 1.15, face * 0.072, Math.PI / 2);
    put(new THREE.TorusGeometry(0.1, 0.014, 8, 24), dir * (hw - 0.28), 1.06, face * 0.095);
  }
  const ironwork = new THREE.Mesh(mergeGeometries(parts, false), iron);
  parts.forEach(g => g.dispose());
  ironwork.castShadow = true;
  pivot.add(ironwork);
  pivot.position.x = side * hw;
  return pivot;
}

export function buildDoors() {
  const iron = mat(0x2a2724, { metalness: 0.85, roughness: 0.55 });
  CASTLE_DOORS.forEach((d, i) => {
    const alongX = d.x1 - d.x0 >= d.z1 - d.z0 && d.z0 === d.z1;
    const w = alongX ? (d.x1 - d.x0 + 1) * T : (d.z1 - d.z0 + 1) * T;
    const cx = (d.x0 + d.x1 + 1) / 2 * T, cz = (d.z0 + d.z1 + 1) / 2 * T;
    const root = new THREE.Group();
    root.position.set(cx, 0, cz);
    root.rotation.y = alongX ? 0 : Math.PI / 2;
    root.userData.noMerge = true;
    const hw = w / 2 - 0.04;
    const left = buildLeaf(hw, -1, iron), right = buildLeaf(hw, 1, iron);
    root.add(left, right);
    S.scene.add(root);
    doors.push({ i, root, left, right, cx, cz, theta: root.rotation.y, open: 0, swing: 1, wantOpen: false });
  });
  S.animated.push(updateDoors);
}

function updateDoors(t) {
  // real elapsed time, not the capped animation step, so a slow device never
  // lets you outrun a door that is still opening
  const dt = lastT === null ? 0 : Math.min(0.5, Math.max(0, t - lastT));
  lastT = t;
  const P = S.player;
  let moved = false;
  for (const d of doors) {
    const dx = P.x - d.cx, dz = P.z - d.cz, dist = Math.hypot(dx, dz);
    if (dist < OPEN_R) d.wantOpen = true;
    else if (dist > CLOSE_R) d.wantOpen = false;
    // pick the swing direction while the door is shut: always away from you
    if (d.open < 0.02) {
      const lz = dx * Math.sin(d.theta) + dz * Math.cos(d.theta);
      d.swing = lz >= 0 ? 1 : -1;
    }
    const target = d.wantOpen ? 1 : 0;
    if (d.open !== target) {
      const speed = d.wantOpen ? 2.2 : 0.8;
      d.open = target > d.open ? Math.min(1, d.open + dt * speed) : Math.max(0, d.open - dt * speed);
      const e = d.open * d.open * (3 - 2 * d.open);
      d.left.rotation.y = d.swing * e * MAX_ANGLE;
      d.right.rotation.y = -d.swing * e * MAX_ANGLE;
      moved = true;
    }
  }
  if (moved && S.renderer) S.renderer.shadowMap.needsUpdate = true;
}

export function doorStates() { return doors.map(d => ({ i: d.i, open: d.open, x: d.cx, z: d.cz })); }
