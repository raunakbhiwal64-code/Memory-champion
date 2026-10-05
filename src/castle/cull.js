import * as THREE from 'three';
import { S } from './state.js';

/* Room culling. Stone walls hide everything behind them, but WebGL still draws
   it, so only the room you're in and the rooms through its doorways are drawn.
   Objects are sorted into rooms by their bounds the first time they're seen
   (streamed models included); anything that spans rooms or sits outside one
   (merged geometry, architecture, doors, the sky) is always drawn. */
let neighbours = null, lastRoom = null, lastScan = -1;
const box = new THREE.Box3(), centre = new THREE.Vector3(), size = new THREE.Vector3();

function buildNeighbours() {
  const n = {};
  CASTLE_ROOMS.forEach(r => { n[r.id] = new Set([r.id]); });
  for (const d of CASTLE_DOORS) {
    const rooms = new Set();
    for (let tz = d.z0 - 1; tz <= d.z1 + 1; tz++) for (let tx = d.x0 - 1; tx <= d.x1 + 1; tx++) {
      const c = castleCellAt(tx, tz);
      if (c >= 0) rooms.add(CASTLE_ROOMS[c].id);
    }
    for (const a of rooms) for (const b of rooms) n[a].add(b);
  }
  return n;
}

function roomOf(o) {
  box.setFromObject(o);
  if (box.isEmpty()) return null;
  box.getSize(size);
  if (Math.max(size.x, size.z) > 14) return null;
  box.getCenter(centre);
  const a = castleRoomAt(box.min.x + 0.01, box.min.z + 0.01), b = castleRoomAt(box.max.x - 0.01, box.max.z - 0.01), c = castleRoomAt(centre.x, centre.z);
  return c && a === c && b === c ? c.id : null;
}

export function updateCulling(t, skip) {
  if (!S.currentRoom) return;
  if (!neighbours) neighbours = buildNeighbours();
  const roomChanged = S.currentRoom.id !== lastRoom;
  // re-scan now and then so models that streamed in get a room too
  if (!roomChanged && t - lastScan < 1.5) return;
  lastScan = t; lastRoom = S.currentRoom.id;
  const show = neighbours[lastRoom];
  for (const o of S.scene.children) {
    if (skip.has(o) || o.isLight || o.userData.noCull) continue;
    if (o.userData.cullRoom === undefined) o.userData.cullRoom = roomOf(o);
    const room = o.userData.cullRoom;
    if (!room) continue;
    if (show.has(room)) { if (o.userData.culled) { o.visible = true; o.userData.culled = false; } }
    else if (o.visible) { o.visible = false; o.userData.culled = true; }
  }
}
// for tests: is culling on, and how many objects is it hiding right now?
export function cullStats() { let hidden = 0; for (const o of S.scene.children) if (o.userData.culled) hidden++; return { room: lastRoom, hidden }; }
