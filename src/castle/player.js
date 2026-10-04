import { S, PLAYER_R } from './state.js';
import { setHeroVisible } from './hero.js';

const P = S.player, cam = S.cam, keys = S.keys, input = S.input;

export function blocked(x, z) {
  const r = PLAYER_R;
  if (!castleWalkable(x - r, z - r) || !castleWalkable(x + r, z - r) || !castleWalkable(x - r, z + r) || !castleWalkable(x + r, z + r)) return true;
  for (const c of S.colliders) { const dx = x - c.x, dz = z - c.z, rr = c.r + r; if (dx * dx + dz * dz < rr * rr) return true; }
  return false;
}
function angleLerp(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; }

export function movePlayer(dt) {
  let fwd = 0, side = 0;
  if (keys.KeyW || keys.ArrowUp) fwd += 1;
  if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyD) side += 1;
  if (keys.KeyA) side -= 1;
  if (keys.ArrowLeft) cam.yaw += dt * 2.0;
  if (keys.ArrowRight) cam.yaw -= dt * 2.0;
  fwd += -input.joyZ; side += input.joyX;
  const len = Math.hypot(fwd, side);
  if (len < 0.05 || S.panelStation !== -1) { P.speed = Math.max(0, P.speed - dt * 12); return; }
  fwd /= Math.max(1, len); side /= Math.max(1, len);
  const run = keys.ShiftLeft || keys.ShiftRight || (Math.min(1, len) > 0.92 && (input.joyX || input.joyZ));
  const target = (run ? 6.2 : 3.3) * Math.min(1, len);
  P.speed += (target - P.speed) * Math.min(1, dt * 10);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx;
  let mx = fx * fwd + rx * side, mz = fz * fwd + rz * side;
  const ml = Math.hypot(mx, mz); mx /= ml; mz /= ml;
  const step = P.speed * dt, nx = P.x + mx * step, nz = P.z + mz * step;
  if (!blocked(nx, P.z)) P.x = nx;
  if (!blocked(P.x, nz)) P.z = nz;
  P.yaw = angleLerp(P.yaw, Math.atan2(mx, mz), Math.min(1, dt * 12));
}

// Third-person camera that pulls in rather than clipping through walls or ceilings.
function cameraClear(x, y, z) {
  if (!castleWalkable(x, z)) return false;
  const room = castleRoomAt(x, z);
  if (!room) return y < CASTLE_DOOR_H - 0.3;
  return y < room.h - 0.5 || room.ceiling === 'sky' || room.ceiling === 'dome';
}
export function updateCamera(dt) {
  cam.pitch = Math.max(0.02, Math.min(1.15, cam.pitch));
  cam.dist = Math.max(2.2, Math.min(10, cam.dist));
  // over-the-shoulder: look slightly to the keeper's right so they don't hide what's ahead
  const sh = Math.min(0.55, cam.curDist * 0.12);
  let tx = P.x + Math.cos(cam.yaw) * sh, tz = P.z - Math.sin(cam.yaw) * sh;
  if (!castleWalkable(tx, tz)) { tx = P.x; tz = P.z; }
  const ty = 1.75;
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  let allowed = cam.dist;
  for (let d = 0.3; d <= cam.dist; d += 0.15) {
    if (!cameraClear(tx + dx * d, ty + dy * d, tz + dz * d)) { allowed = Math.max(0.6, d - 0.35); break; }
  }
  cam.curDist = allowed < cam.curDist ? allowed : cam.curDist + (allowed - cam.curDist) * Math.min(1, dt * 4);
  S.camera.position.set(tx + dx * cam.curDist, ty + dy * cam.curDist, tz + dz * cam.curDist);
  S.camera.lookAt(tx, ty, tz);
  setHeroVisible(cam.curDist > 0.9);
}

export function placeAt(x, z, yaw) {
  P.x = x; P.z = z; P.yaw = yaw; P.speed = 0; cam.yaw = yaw + Math.PI; cam.pitch = 0.28;
}

let drag = null;
function inTextField(e) { return e.target && e.target.closest && e.target.closest('input, textarea, select'); }
export function wireInput(canvas, handlers) {
  window.addEventListener('keydown', e => {
    if (!S.running) return;
    if (inTextField(e)) { if (e.code === 'Escape') handlers.closePanel(); return; }
    if (e.code === 'Escape') { if (S.panelStation !== -1) handlers.closePanel(); else handlers.escape(); return; }
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (S.panelStation === -1) handlers.interact(); return; }
    if (e.code === 'KeyM') { handlers.toggleMap(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); handlers.userGesture(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch += (e.clientY - drag.y) * 0.004;
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist += e.deltaY * 0.005; }, { passive: false });
  const joy = document.getElementById('castle-joy'), knob = document.getElementById('castle-joy-knob');
  let joyId = null;
  const joyMove = e => {
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const max = r.width / 2 - 10, l = Math.hypot(dx, dy);
    if (l > max) { dx *= max / l; dy *= max / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joyX = dx / max; input.joyZ = dy / max;
  };
  joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.stopPropagation(); handlers.userGesture(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; input.joyX = input.joyZ = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
  document.getElementById('castle-act').addEventListener('click', () => { if (S.panelStation === -1) handlers.interact(); });
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) document.getElementById('castle-root').classList.add('castle-touch-on');
}
