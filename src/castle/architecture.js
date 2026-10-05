import * as THREE from 'three';
import { S } from './state.js';
import { surfaceMat, mat, M } from './materials.js';
import { canvasTexture, glowTexture, rng, texSet } from './textures.js';

const T = CASTLE_TILE;
const DOOR_H = CASTLE_DOOR_H;

/* Collects quads per material with world-space UVs, then emits one mesh per
   material, so the whole building is a handful of draw calls. */
class Builder {
  constructor() { this.parts = {}; }
  part(name) {
    if (!this.parts[name]) this.parts[name] = { pos: [], nor: [], uv: [], idx: [], mat: null };
    return this.parts[name];
  }
  // p: 4 corners [x,y,z] counter-clockwise seen from the front; uv: 4 [u,v]
  quad(name, material, p, n, uv) {
    const g = this.part(name); g.mat = material;
    const base = g.pos.length / 3;
    for (let i = 0; i < 4; i++) { g.pos.push(...p[i]); g.nor.push(...n); g.uv.push(...uv[i]); }
    g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  tri(name, material, p, n, uv) {
    const g = this.part(name); g.mat = material;
    const base = g.pos.length / 3;
    for (let i = 0; i < 3; i++) { g.pos.push(...p[i]); g.nor.push(...n); g.uv.push(...uv[i]); }
    g.idx.push(base, base + 1, base + 2);
  }
  build(scene, shadows) {
    for (const name in this.parts) {
      const g = this.parts[name];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setIndex(g.idx);
      const mesh = new THREE.Mesh(geo, g.mat);
      mesh.receiveShadow = true; mesh.castShadow = !!shadows;
      scene.add(mesh);
    }
  }
}

// vertical wall quad along an edge, facing direction (nx, nz)
function wallQuad(b, name, m, x0, z0, x1, z1, y0, y1, nx, nz) {
  const s = m.userData.scale || 3;
  const along0 = (nx !== 0 ? z0 : x0) / s, along1 = (nx !== 0 ? z1 : x1) / s;
  b.quad(name, m, [[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]], [nx, 0, nz],
    [[along0, y0 / s], [along1, y0 / s], [along1, y1 / s], [along0, y1 / s]]);
}
function floorQuad(b, name, m, x0, z0, x1, z1, y, down) {
  const s = m.userData.scale || 3;
  const uv = [[x0 / s, z1 / s], [x1 / s, z1 / s], [x1 / s, z0 / s], [x0 / s, z0 / s]];
  if (!down) b.quad(name, m, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], uv);
  else b.quad(name, m, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, -1, 0], uv);
}

/* A band standing proud of a wall: a plinth at its foot or a cornice under the
   ceiling. Front, top and underside faces, plus end caps where it stops. */
function wallBand(b, name, m, ex0, ez0, ex1, ez1, nx, nz, y0, y1, depth) {
  const ox = nx * depth, oz = nz * depth, s = m.userData.scale || 3;
  wallQuad(b, name, m, ex0 + ox, ez0 + oz, ex1 + ox, ez1 + oz, y0, y1, nx, nz);
  // top face, seen from above
  const topP = [[ex0 + ox, y1, ez0 + oz], [ex1 + ox, y1, ez1 + oz], [ex1, y1, ez1], [ex0, y1, ez0]];
  const huv = p => [p[0] / s, p[2] / s];
  b.quad(name, m, topP, [0, 1, 0], topP.map(huv));
  if (y0 > 0.01) {
    const botP = [[ex0, y0, ez0], [ex1, y0, ez1], [ex1 + ox, y0, ez1 + oz], [ex0 + ox, y0, ez0 + oz]];
    b.quad(name, m, botP, [0, -1, 0], botP.map(huv));
  }
  // end caps
  const ax = Math.sign(ex1 - ex0), az = Math.sign(ez1 - ez0);
  const cap = (x, z, dx, dz) => {
    const p = [[x, y0, z], [x + ox, y0, z + oz], [x + ox, y1, z + oz], [x, y1, z]];
    // ABCD winds towards (-oz, ox); flip it when the cap faces the other way
    if (ox * dz - oz * dx < 0) p.reverse();
    b.quad(name, m, p, [dx, 0, dz], [[0, y0 / s], [depth / s, y0 / s], [depth / s, y1 / s], [0, y1 / s]]);
  };
  cap(ex0, ez0, -ax, -az); cap(ex1, ez1, ax, az);
}
const PLINTH = { plaster: 'beam', panel: 'beam' };

// geometry with UVs in metres -> UVs in texture tiles, like the walls
export function metreUVs(geo, texName) {
  const k = 1 / (texSet(texName).scale || 1), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  return geo;
}
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
export function roomOfCell(tx, tz) { const c = castleCellAt(tx, tz); return c >= 0 ? CASTLE_ROOMS[c] : null; }
function roomAxis(r) { const lx = (r.x1 - r.x0 + 1) * T, lz = (r.z1 - r.z0 + 1) * T; return { lx, lz, longX: lx >= lz }; }
function vaultSpring(r) { const { lx, lz, longX } = roomAxis(r); const w = longX ? lz : lx; return r.h - Math.min(w / 2 * 0.55, r.h * 0.45); }

// how tall the wall is on a given edge of a room
function wallTop(r, dir) {
  if (r.ceiling === 'vault') {
    const { longX } = roomAxis(r);
    const longEdge = longX ? (dir === 'n' || dir === 's') : (dir === 'e' || dir === 'w');
    return longEdge ? vaultSpring(r) : r.h;
  }
  return r.h;
}

// a stepped moulding: a deep top course over a narrower one
function buildCornice(b, room, ex0, ez0, ex1, ez1, nx, nz, top) {
  const m = surfaceMat(room.wall === 'panel' || room.wall === 'plaster' ? 'beam' : 'ashlar');
  wallBand(b, 'cornice_' + m.uuid, m, ex0, ez0, ex1, ez1, nx, nz, top - 0.32, top - 0.02, 0.2);
  wallBand(b, 'cornice_' + m.uuid, m, ex0, ez0, ex1, ez1, nx, nz, top - 0.52, top - 0.32, 0.1);
}

export function buildArchitecture() {
  const b = new Builder();
  const DIRS = [['n', 0, -1], ['s', 0, 1], ['w', -1, 0], ['e', 1, 0]];
  const doorMat = surfaceMat('ashlar'), thresholdMat = surfaceMat('flag');

  for (let tz = 0; tz < CASTLE_GRID_H; tz++) for (let tx = 0; tx < CASTLE_GRID_W; tx++) {
    const c = castleCellAt(tx, tz); if (c === -1) continue;
    const room = c >= 0 ? CASTLE_ROOMS[c] : null;
    const x0 = tx * T, z0 = tz * T, x1 = x0 + T, z1 = z0 + T;
    floorQuad(b, 'floor_' + (room ? room.floor : 'door'), room ? surfaceMat(room.floor) : thresholdMat, x0, z0, x1, z1, 0);
    if (!room) floorQuad(b, 'doorceil', doorMat, x0, z0, x1, z1, DOOR_H, true);
    for (const [dir, dx, dz] of DIRS) {
      const nc = castleCellAt(tx + dx, tz + dz);
      // edge line + inward normal
      let ex0, ez0, ex1, ez1; const nx = -dx, nz = -dz;
      if (dir === 'n') { ex0 = x0; ez0 = z0; ex1 = x1; ez1 = z0; }
      if (dir === 's') { ex0 = x1; ez0 = z1; ex1 = x0; ez1 = z1; }
      if (dir === 'w') { ex0 = x0; ez0 = z1; ex1 = x0; ez1 = z0; }
      if (dir === 'e') { ex0 = x1; ez0 = z0; ex1 = x1; ez1 = z1; }
      if (nc === -1) {
        const top = room ? wallTop(room, dir) : DOOR_H;
        const m = room ? surfaceMat(room.wall) : doorMat;
        wallQuad(b, 'wall_' + (room ? room.wall : 'door'), m, ex0, ez0, ex1, ez1, 0, top, nx, nz);
        if (room) {
          const pm = PLINTH[room.wall] || (room.wall === 'rubble' ? 'rubble' : 'flag');
          wallBand(b, 'plinth_' + pm, surfaceMat(pm), ex0, ez0, ex1, ez1, nx, nz, 0, PLINTH[room.wall] ? 0.28 : 0.42, PLINTH[room.wall] ? 0.05 : 0.11);
          if (room.ceiling === 'beams' || room.ceiling === 'coffer' || room.ceiling === 'hammer' || (room.ceiling === 'vault' && top < room.h) || room.ceiling === 'dome')
            buildCornice(b, room, ex0, ez0, ex1, ez1, nx, nz, top);
        }
      } else if (room && nc === -2) {
        // header above a doorway, on this room's side
        wallQuad(b, 'wall_' + room.wall, surfaceMat(room.wall), ex0, ez0, ex1, ez1, DOOR_H, wallTop(room, dir), nx, nz);
        if (room.ceiling === 'beams' || room.ceiling === 'coffer' || room.ceiling === 'hammer' || (room.ceiling === 'vault' && wallTop(room, dir) < room.h) || room.ceiling === 'dome')
          buildCornice(b, room, ex0, ez0, ex1, ez1, nx, nz, wallTop(room, dir));
      }
    }
  }

  // solid masonry for every wall cell, tall enough to hide anything behind it
  const exterior = surfaceMat('ashlar');
  for (let tz = 0; tz < CASTLE_GRID_H; tz++) for (let tx = 0; tx < CASTLE_GRID_W; tx++) {
    if (castleCellAt(tx, tz) !== -1) continue;
    let h = 0, nearSky = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = castleCellAt(tx + dx, tz + dz);
      if (c >= 0) { const r = CASTLE_ROOMS[c]; h = Math.max(h, r.h + (r.ceiling === 'sky' || r.ceiling === 'dome' ? 0 : 0.6)); if (r.ceiling === 'sky' || r.ceiling === 'dome') nearSky = true; }
      if (c === -2) h = Math.max(h, 6);
    }
    if (!h) continue;
    const i = 0.03, x0 = tx * T + i, z0 = tz * T + i, x1 = (tx + 1) * T - i, z1 = (tz + 1) * T - i;
    floorQuad(b, 'masonry', exterior, x0, z0, x1, z1, h);
    wallQuad(b, 'masonry', exterior, x1, z0, x0, z0, 0, h, 0, -1);
    wallQuad(b, 'masonry', exterior, x0, z1, x1, z1, 0, h, 0, 1);
    wallQuad(b, 'masonry', exterior, x0, z0, x0, z1, 0, h, -1, 0);
    wallQuad(b, 'masonry', exterior, x1, z1, x1, z0, 0, h, 1, 0);
    if (nearSky) {
      for (const [mx, mz] of [[0.25, 0.25], [0.75, 0.75]]) {
        const cx = tx * T + mx * T, cz = tz * T + mz * T, m = 0.32;
        const top = h + 0.85;
        floorQuad(b, 'masonry', exterior, cx - m, cz - m, cx + m, cz + m, top);
        wallQuad(b, 'masonry', exterior, cx + m, cz - m, cx - m, cz - m, h, top, 0, -1);
        wallQuad(b, 'masonry', exterior, cx - m, cz + m, cx + m, cz + m, h, top, 0, 1);
        wallQuad(b, 'masonry', exterior, cx - m, cz - m, cx - m, cz + m, h, top, -1, 0);
        wallQuad(b, 'masonry', exterior, cx + m, cz + m, cx + m, cz - m, h, top, 1, 0);
      }
    }
  }

  CASTLE_ROOMS.forEach(r => buildCeiling(b, r));
  CASTLE_ROOMS.forEach(r => { if (r.ceiling !== 'sky' && r.ceiling !== 'dome') buildRoof(b, r); });
  b.build(S.scene, true);

  CASTLE_DOORS.forEach(buildDoorSurround);
  buildWindows();
  buildSkyAndLandscape();
  buildTurrets();
}

/* ---------- ceilings ---------- */
function buildCeiling(b, r) {
  const x0 = r.x0 * T, z0 = r.z0 * T, x1 = (r.x1 + 1) * T, z1 = (r.z1 + 1) * T;
  const { lx, lz, longX } = roomAxis(r);
  const beamMat = M.darkwood();
  if (r.ceiling === 'beams' || r.ceiling === 'coffer') {
    floorQuad(b, 'ceil_beam', surfaceMat('beam'), x0, z0, x1, z1, r.h, true);
    const step = 2.5;
    // main beams across the short span, plus cross beams for coffers
    if (longX) for (let x = x0 + step; x < x1 - 0.5; x += step) addBox(beamMat, x, r.h - 0.25, (z0 + z1) / 2, 0.35, 0.5, lz);
    else for (let z = z0 + step; z < z1 - 0.5; z += step) addBox(beamMat, (x0 + x1) / 2, r.h - 0.25, z, lx, 0.5, 0.35);
    if (r.ceiling === 'coffer') {
      if (longX) for (let z = z0 + step; z < z1 - 0.5; z += step) addBox(beamMat, (x0 + x1) / 2, r.h - 0.2, z, lx, 0.4, 0.25);
      else for (let x = x0 + step; x < x1 - 0.5; x += step) addBox(beamMat, x, r.h - 0.2, (z0 + z1) / 2, 0.25, 0.4, lz);
    }
  } else if (r.ceiling === 'vault') {
    const spring = vaultSpring(r), w = longX ? lz : lx, len = longX ? lx : lz, rise = r.h - spring;
    // half cylinder (+z half, axis Y) turned so its axis runs along the room and the curve points up
    const geo = new THREE.CylinderGeometry(w / 2, w / 2, len, 32, 1, true, -Math.PI / 2, Math.PI);
    const m = surfaceMat(r.wall === 'rubble' ? 'rubble' : 'plaster', { side: THREE.BackSide });
    const s = m.userData.scale || 3;
    const uvs = geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * Math.PI * w / 2 / s, uvs.getY(i) * len / s);
    if (longX) { geo.rotateZ(-Math.PI / 2); geo.rotateX(-Math.PI / 2); } else geo.rotateX(-Math.PI / 2);
    geo.scale(1, rise / (w / 2), 1);
    const vault = new THREE.Mesh(geo, m);
    vault.position.set((x0 + x1) / 2, spring, (z0 + z1) / 2);
    vault.receiveShadow = true;
    S.scene.add(vault);
    // stone ribs every few metres
    for (let k = 1; k < len / 4; k++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 0.05, 0.14, 6, 24, Math.PI), M.stone());
      rib.scale.set(1, rise / (w / 2), 1);
      const along = (longX ? x0 : z0) + k * 4;
      if (longX) { rib.position.set(along, spring, (z0 + z1) / 2); rib.rotation.y = Math.PI / 2; }
      else { rib.position.set((x0 + x1) / 2, spring, along); }
      S.scene.add(rib);
    }
  } else if (r.ceiling === 'hammer') {
    // pitched timber roof: ridge along the long axis
    const rise = (longX ? lz : lx) * 0.35;
    const ridge = r.h + rise;
    const m = surfaceMat('beam');
    if (!longX) {
      const xm = (x0 + x1) / 2, s = m.userData.scale;
      // two sloping planes, seen from below
      b.quad('ceil_roof', m, [[x0, r.h, z1], [x0, r.h, z0], [xm, ridge, z0], [xm, ridge, z1]], unit([rise, -(xm - x0), 0]),
        [[0, z1 / s], [0, z0 / s], [3, z0 / s], [3, z1 / s]]);
      b.quad('ceil_roof', m, [[x1, r.h, z0], [x1, r.h, z1], [xm, ridge, z1], [xm, ridge, z0]], unit([-rise, -(x1 - xm), 0]),
        [[0, z0 / s], [0, z1 / s], [3, z1 / s], [3, z0 / s]]);
      // gable ends in stone
      const wm = surfaceMat(r.wall), ws = wm.userData.scale;
      b.tri('wall_' + r.wall, wm, [[x0, r.h, z0], [x1, r.h, z0], [xm, ridge, z0]], [0, 0, 1], [[x0 / ws, r.h / ws], [x1 / ws, r.h / ws], [xm / ws, ridge / ws]]);
      b.tri('wall_' + r.wall, wm, [[x1, r.h, z1], [x0, r.h, z1], [xm, ridge, z1]], [0, 0, -1], [[x1 / ws, r.h / ws], [x0 / ws, r.h / ws], [xm / ws, ridge / ws]]);
      // trusses
      const wood = M.darkwood();
      for (let z = z0 + 3; z < z1 - 1; z += 3.2) {
        const slopeLen = Math.hypot(xm - x0, rise), ang = Math.atan2(rise, xm - x0);
        for (const sgn of [-1, 1]) {
          const raf = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.45, 0.35), wood);
          raf.position.set(xm + sgn * (xm - x0) / 2, r.h + rise / 2 - 0.25, z); raf.rotation.z = -sgn * ang; S.scene.add(raf);
          const brace = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 16, Math.PI / 2), wood);
          brace.position.set(sgn < 0 ? x0 + 2.2 : x1 - 2.2, r.h - 2.2 + 0.0, z); brace.rotation.z = sgn < 0 ? Math.PI / 2 : 0; S.scene.add(brace);
          const hammer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.4), wood);
          hammer.position.set(sgn < 0 ? x0 + 1.2 : x1 - 1.2, r.h, z); S.scene.add(hammer);
          const angel = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.gold());
          angel.position.set(sgn < 0 ? x0 + 2.35 : x1 - 2.35, r.h - 0.15, z); S.scene.add(angel);
        }
        const collar = new THREE.Mesh(new THREE.BoxGeometry((xm - x0) * 0.9, 0.4, 0.35), wood);
        collar.position.set(xm, r.h + rise * 0.55, z); S.scene.add(collar);
      }
    }
  } else if (r.ceiling === 'dome') {
    // open observatory dome: a cornice ring and ribs meeting at an oculus
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rad = Math.min(lx, lz) / 2 - 0.4;
    const cornice = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.3, 8, 48), M.stone());
    cornice.rotation.x = Math.PI / 2; cornice.position.set(cx, r.h, cz); S.scene.add(cornice);
    const oculus = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.25, 8, 32), M.brass());
    oculus.rotation.x = Math.PI / 2; oculus.position.set(cx, r.h + 6, cz); S.scene.add(oculus);
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2;
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, rr = rad + (2.2 - rad) * Math.sin(t * Math.PI / 2); pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, r.h + 6 * (1 - Math.cos(t * Math.PI / 2)), cz + Math.sin(a) * rr)); }
      const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.16, 6), M.brass());
      S.scene.add(rib);
    }
    // corner piers carrying the ring
    for (const [px, pz] of [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.2], [x0 + 1.2, z1 - 1.2], [x1 - 1.2, z1 - 1.2]]) {
      addBox(M.stone(), px, r.h / 2, pz, 1.4, r.h, 1.4);
      S.colliders.push({ x: px, z: pz, r: 0.9 });
    }
  }
}
function unit(v) { const l = Math.hypot(...v); return v.map(c => c / l); }
function addBox(material, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; S.scene.add(m); return m;
}

/* ---------- exterior roofs (seen from the courtyard and observatory) ---------- */
function buildRoof(b, r) {
  const x0 = r.x0 * T - 0.6, z0 = r.z0 * T - 0.6, x1 = (r.x1 + 1) * T + 0.6, z1 = (r.z1 + 1) * T + 0.6;
  const { longX } = roomAxis(r);
  const base = r.ceiling === 'hammer' ? r.h + 0.2 : r.h + 0.6;
  const span = longX ? z1 - z0 : x1 - x0, rise = span * (r.ceiling === 'hammer' ? 0.36 : 0.3);
  const top = base + rise, m = surfaceMat('slate'), s = m.userData.scale, wm = surfaceMat('ashlar'), ws = wm.userData.scale;
  if (longX) {
    const zm = (z0 + z1) / 2;
    b.quad('roof', m, [[x1, base, z0], [x0, base, z0], [x0, top, zm], [x1, top, zm]], unit([0, span / 2, -rise]), [[x1 / s, 0], [x0 / s, 0], [x0 / s, 4], [x1 / s, 4]]);
    b.quad('roof', m, [[x0, base, z1], [x1, base, z1], [x1, top, zm], [x0, top, zm]], unit([0, span / 2, rise]), [[x0 / s, 0], [x1 / s, 0], [x1 / s, 4], [x0 / s, 4]]);
    b.tri('masonry', wm, [[x0, base, z0], [x0, base, z1], [x0, top, zm]], [-1, 0, 0], [[z0 / ws, base / ws], [z1 / ws, base / ws], [zm / ws, top / ws]]);
    b.tri('masonry', wm, [[x1, base, z1], [x1, base, z0], [x1, top, zm]], [1, 0, 0], [[z1 / ws, base / ws], [z0 / ws, base / ws], [zm / ws, top / ws]]);
  } else {
    const xm = (x0 + x1) / 2;
    b.quad('roof', m, [[x0, base, z0], [x0, base, z1], [xm, top, z1], [xm, top, z0]], unit([-rise, span / 2, 0]), [[z0 / s, 0], [z1 / s, 0], [z1 / s, 4], [z0 / s, 4]]);
    b.quad('roof', m, [[x1, base, z1], [x1, base, z0], [xm, top, z0], [xm, top, z1]], unit([rise, span / 2, 0]), [[z1 / s, 0], [z0 / s, 0], [z0 / s, 4], [z1 / s, 4]]);
    b.tri('masonry', wm, [[x1, base, z0], [x0, base, z0], [xm, top, z0]], [0, 0, -1], [[x1 / ws, base / ws], [x0 / ws, base / ws], [xm / ws, top / ws]]);
    b.tri('masonry', wm, [[x0, base, z1], [x1, base, z1], [xm, top, z1]], [0, 0, 1], [[x0 / ws, base / ws], [x1 / ws, base / ws], [xm / ws, top / ws]]);
  }
  // a chimney over the great hall fireplace and the forge
  if (r.id === 'hall') addBox(surfaceMat('brick'), 1.2, base + rise * 0.6, 26, 2.2, rise * 1.4, 2.4);
  if (r.id === 'armoury') addBox(surfaceMat('brick'), 64.5, base + rise * 0.6, 34, 2, rise * 1.3, 2);
}

/* ---------- doorways: stone arch surround on both faces ---------- */
function buildDoorSurround(d) {
  const alongX = d.x1 - d.x0 >= d.z1 - d.z0 && d.z0 === d.z1;
  const w = alongX ? (d.x1 - d.x0 + 1) * T : (d.z1 - d.z0 + 1) * T;
  const cx = (d.x0 + d.x1 + 1) / 2 * T, cz = (d.z0 + d.z1 + 1) / 2 * T;
  // one outline that runs up the jamb, over the arch and down again, open at
  // the bottom (a hole touching the outer edge would fail to triangulate and
  // leave a solid slab across the doorway)
  const ow = w / 2 + 0.55, oh = DOOR_H + 0.7, hw = w / 2, spring = DOOR_H - Math.min(hw, DOOR_H * 0.45);
  const outer = new THREE.Shape();
  outer.moveTo(-ow, 0); outer.lineTo(-hw, 0); outer.lineTo(-hw, spring);
  outer.absellipse(0, spring, hw, DOOR_H - spring, Math.PI, 0, true);
  outer.lineTo(hw, 0); outer.lineTo(ow, 0); outer.lineTo(ow, oh); outer.lineTo(-ow, oh); outer.lineTo(-ow, 0);
  const geo = metreUVs(new THREE.ExtrudeGeometry(outer, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 24 }), 'ashlar');
  const m = mat(0xa89c88, { roughness: 0.85, tex: 'ashlar' });
  const thick = T; // the wall line is one tile thick
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = mesh.receiveShadow = true;
    if (alongX) { mesh.position.set(cx, 0, cz + side * (thick / 2 + 0.02)); if (side < 0) mesh.rotation.y = Math.PI; }
    else { mesh.position.set(cx + side * (thick / 2 + 0.02), 0, cz); mesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
    S.scene.add(mesh);
  }
}

/* ---------- windows: deep reveals, glass glowing with moonlight, light shafts ---------- */
const WINDOWS = [
  // room, wall side, centre along the wall (world), sill, width, height, style
  ['hall', 'w', 20, 3.5, 1.6, 5.2, 'lancet'], ['hall', 'w', 32, 3.5, 1.6, 5.2, 'lancet'], ['hall', 'w', 38.5, 3.5, 1.6, 5.2, 'lancet'],
  ['hall', 'n', 15, 11.6, 4.2, 4.2, 'rose'],
  ['gallery', 'n', 4.5, 2.2, 1.1, 2.6, 'lancet'], ['gallery', 'n', 11.5, 2.2, 1.1, 2.6, 'lancet'], ['gallery', 'n', 19.5, 2.4, 1.1, 2.4, 'lancet'],
  ['library', 'n', 30, 6.2, 1.4, 3.2, 'lancet'], ['library', 'n', 38, 6.2, 1.4, 3.2, 'lancet'], ['library', 'e', 19, 6.2, 1.4, 3.2, 'lancet'],
  ['entrance', 's', 27.5, 3, 1.5, 4.5, 'lancet'], ['entrance', 's', 40.5, 3, 1.5, 4.5, 'lancet'],
  ['dungeon', 'n', 57, 2.4, 1.0, 0.8, 'slit'], ['dungeon', 'n', 63, 2.4, 1.0, 0.8, 'slit'],
  ['armoury', 'e', 29, 3.2, 1.4, 3.2, 'lancet'],
  // lit rooms above the courtyard: warm candlelight behind leaded glass
  ['courtyard', 'n', 27.4, 5.2, 1.2, 2.5, 'lit'], ['courtyard', 'n', 40.6, 5.2, 1.2, 2.5, 'lit'], ['courtyard', 'n', 34, 6.0, 1.0, 2.0, 'lit'],
  ['courtyard', 'w', 50.6, 5.4, 1.1, 2.3, 'lit'], ['courtyard', 'w', 58, 5.6, 1.0, 2.0, 'lit'],
  ['courtyard', 'e', 47.6, 5.4, 1.1, 2.3, 'lit'], ['courtyard', 'e', 53.2, 5.5, 1.1, 2.3, 'lit']
];
function stainedGlass() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#0b0b10'; g.fillRect(0, 0, s, s);
    const cols = ['#b8202a', '#2050b8', '#d8a020', '#208a50', '#7a2a9a'];
    const cx = s / 2, cy = s / 2;
    for (let ring = 4; ring >= 1; ring--) {
      const segs = ring * 6;
      for (let k = 0; k < segs; k++) {
        g.beginPath(); g.moveTo(cx, cy);
        g.arc(cx, cy, ring * s / 9, k / segs * Math.PI * 2, (k + 1) / segs * Math.PI * 2); g.closePath();
        g.fillStyle = cols[(k + ring) % cols.length]; g.fill();
        g.strokeStyle = '#111'; g.lineWidth = 3; g.stroke();
      }
    }
    g.fillStyle = '#f0d070'; g.beginPath(); g.arc(cx, cy, s / 14, 0, Math.PI * 2); g.fill();
  });
}
function warmGlass() {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = '#c47a2c'; g.fillRect(0, 0, s, s);
    const r = rng(19);
    for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) { g.fillStyle = `rgba(255,${170 + r() * 50},${80 + r() * 50},${0.25 + r() * 0.4})`; g.fillRect(x, y, 16, 16); }
    // a soft glow from a lamp somewhere inside, brighter low down
    const gr = g.createRadialGradient(s * 0.5, s * 0.75, 4, s * 0.5, s * 0.7, s * 0.8);
    gr.addColorStop(0, 'rgba(255,220,150,.55)'); gr.addColorStop(1, 'rgba(60,20,0,.35)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#1a120a'; g.lineWidth = 2.5;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
}
function leadedGlass() {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = '#3a5684'; g.fillRect(0, 0, s, s);
    const r = rng(9);
    for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) { g.fillStyle = `rgba(${150 + r() * 60},${180 + r() * 50},${230},${0.25 + r() * 0.3})`; g.fillRect(x, y, 16, 16); }
    g.strokeStyle = '#151820'; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
}
let shaftTex = null;
function buildWindows() {
  const glassTex = leadedGlass(), roseTex = stainedGlass(), litTex = warmGlass();
  shaftTex = shaftTex || canvasTexture(128, (g, s) => {
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const side = Math.sin(Math.PI * x / (s - 1)), fall = Math.pow(1 - y / s, 1.6), streak = 0.75 + 0.25 * Math.sin(x * 0.35);
      const a = side * side * fall * streak * 140, i = (y * s + x) * 4;
      img.data[i] = 170; img.data[i + 1] = 195; img.data[i + 2] = 255; img.data[i + 3] = a;
    }
    g.putImageData(img, 0, 0);
  });
  for (const [roomId, side, along, sill, w, h, style] of WINDOWS) {
    const r = CASTLE_ROOMS.find(x => x.id === roomId);
    const x0 = r.x0 * T, z0 = r.z0 * T, x1 = (r.x1 + 1) * T, z1 = (r.z1 + 1) * T;
    let px, pz, rotY;
    if (side === 'n') { px = along; pz = z0 + 0.03; rotY = 0; }
    if (side === 's') { px = along; pz = z1 - 0.03; rotY = Math.PI; }
    if (side === 'w') { px = x0 + 0.03; pz = along; rotY = Math.PI / 2; }
    if (side === 'e') { px = x1 - 0.03; pz = along; rotY = -Math.PI / 2; }
    const grp = new THREE.Group();
    const shape = new THREE.Shape();
    if (style === 'rose') { shape.absarc(0, 0, w / 2, 0, Math.PI * 2, false); }
    else {
      const hw = w / 2, springY = style === 'slit' ? h : h - hw * 1.2;
      shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(hw, springY);
      if (style === 'slit') shape.lineTo(-hw, springY);
      else { shape.quadraticCurveTo(hw, h - hw * 0.2, 0, h); shape.quadraticCurveTo(-hw, h - hw * 0.2, -hw, springY); }
      shape.lineTo(-hw, 0);
    }
    const isRose = style === 'rose', lit = style === 'lit', tex = isRose ? roseTex : lit ? litTex : glassTex;
    const glassMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: isRose ? 1.6 : lit ? 1.25 : 0.9, roughness: 0.2 });
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), glassMat);
    // normalise UVs to 0..1 for the glass texture
    const uv = glass.geometry.attributes.uv; const bb = new THREE.Box2(new THREE.Vector2(-w / 2, isRose ? -w / 2 : 0), new THREE.Vector2(w / 2, isRose ? w / 2 : h));
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (uv.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    grp.add(glass);
    // stone surround
    const frameShape = new THREE.Shape(); const fw = w / 2 + 0.3;
    if (isRose) { frameShape.absarc(0, 0, fw, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, w / 2, 0, Math.PI * 2, true); frameShape.holes.push(hole); }
    else { frameShape.moveTo(-fw, -0.3); frameShape.lineTo(fw, -0.3); frameShape.lineTo(fw, h + 0.3); frameShape.lineTo(-fw, h + 0.3); frameShape.lineTo(-fw, -0.3); frameShape.holes.push(new THREE.Path(shape.getPoints(24))); }
    const frame = new THREE.Mesh(metreUVs(new THREE.ExtrudeGeometry(frameShape, { depth: 0.22, bevelEnabled: false, curveSegments: 24 }), 'ashlar'), mat(0x9a8e7c, { roughness: 0.85, tex: 'ashlar' }));
    grp.add(frame);
    if (!isRose) { // mullion and transom
      if (style !== 'slit') grp.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.1), M.iron()), 0, h / 2, 0.05));
      grp.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.1), M.iron()), 0, h * 0.45, 0.05));
    }
    if (lit) {
      // seen from outside: a sill below and the glass set back in a deep reveal
      grp.add(at(new THREE.Mesh(metreUVs(new THREE.BoxGeometry(w + 0.7, 0.14, 0.42), 'ashlar'), mat(0x9a8e7c, { roughness: 0.85, tex: 'ashlar' })), 0, -0.36, 0.2));
      grp.position.set(px, sill, pz); grp.rotation.y = rotY;
      S.scene.add(grp);
      continue;
    }
    // light shaft: soft additive plane slanting down into the room
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, Math.max(4, sill + h)), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: isRose ? 0.45 : 0.3 }));
    shaft.position.set(0, (isRose ? 0 : h / 2) - 1.2, 2.2); shaft.rotation.x = -0.9;
    grp.add(shaft);
    grp.position.set(px, sill + (isRose ? 0 : 0), pz); grp.rotation.y = rotY;
    S.scene.add(grp);
    if (isRose) S.lightSources.push({ x: px, y: sill - 1, z: pz + 3, color: 0xffd8b0, intensity: 25, distance: 16, room: roomId, kind: 'window' });
  }
}

/* ---------- sky, moon, distant hills ---------- */
function buildSkyAndLandscape() {
  const sky = canvasTexture(1024, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#02030a'); gr.addColorStop(0.42, '#0b1430'); gr.addColorStop(0.5, '#25335e'); gr.addColorStop(0.52, '#151c33'); gr.addColorStop(1, '#05060c');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    const r = rng(99);
    for (let i = 0; i < 2600; i++) {
      const y = Math.pow(r(), 1.4) * s * 0.5, a = 0.25 + r() * 0.75, rad = r() < 0.03 ? 1.5 : 0.7;
      g.fillStyle = `rgba(255,${235 + r() * 20 | 0},${215 + r() * 40 | 0},${a})`; g.beginPath(); g.arc(r() * s, y, rad, 0, Math.PI * 2); g.fill();
    }
    // a faint band of the milky way
    for (let i = 0; i < 3000; i++) { const x = r() * s, y = s * 0.12 + Math.sin(x / s * Math.PI * 2) * s * 0.06 + (r() - 0.5) * s * 0.07; g.fillStyle = `rgba(200,210,255,${r() * 0.12})`; g.fillRect(x, y, 2, 2); }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false }));
  dome.position.set(34, 0, 31); S.scene.add(dome);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff4dc, fog: false }));
  moon.position.set(-60, 150, -170); S.scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(190,205,255,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(80, 80, 1); halo.position.copy(moon.position); S.scene.add(halo);
  // hills ring, dark against the sky
  const r = rng(5), hillMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, d = 160 + r() * 60, hh = 18 + r() * 40;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(30 + r() * 30, hh, 6), hillMat);
    hill.position.set(34 + Math.cos(a) * d, hh / 2 - 6, 31 + Math.sin(a) * d); S.scene.add(hill);
  }
  // ground outside the walls
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 32), new THREE.MeshStandardMaterial({ color: 0x141a14, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(34, -0.05, 31); S.scene.add(ground);
}

/* ---------- towers with conical slate roofs: the castle's silhouette ---------- */
function buildTurrets() {
  const stone = surfaceMat('ashlar'), slate = surfaceMat('slate');
  const towers = [[-2.5, -2.5, 3.6, 19], [70.5, -2.5, 3.6, 19], [-2.5, 64.5, 3.6, 17], [70.5, 64.5, 3.6, 17], [26.5, 63.5, 2.6, 14], [41.5, 63.5, 2.6, 14], [34, -5, 4.6, 27], [70, 31, 3, 16]];
  for (const [x, z, rad, h] of towers) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.08, h, 28, 1, true), stone);
    const uv = body.geometry.attributes.uv; const s = stone.userData.scale;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * rad / s, uv.getY(i) * h / s);
    body.position.set(x, h / 2, z); body.castShadow = true; body.receiveShadow = true; S.scene.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.25, rad * 2.4, 28), slate);
    roof.position.set(x, h + rad * 1.2, z); roof.castShadow = true; S.scene.add(roof);
    const ruv = roof.geometry.attributes.uv; const rs = slate.userData.scale;
    for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * Math.PI * 2 * rad / rs, ruv.getY(i) * rad * 2.4 / rs);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 6), M.gold()); finial.position.set(x, h + rad * 2.4 + 0.6, z); S.scene.add(finial);
    // a few lit windows so the towers feel inhabited
    for (let k = 0; k < 2; k++) {
      const a = (k * 2.3 + x) % (Math.PI * 2), y = h * (0.45 + k * 0.25);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), M.glow(0xffb860, 1.6));
      win.position.set(x + Math.cos(a) * (rad + 0.02), y, z + Math.sin(a) * (rad + 0.02)); win.lookAt(x + Math.cos(a) * 10, y, z + Math.sin(a) * 10);
      S.scene.add(win);
    }
  }
}
