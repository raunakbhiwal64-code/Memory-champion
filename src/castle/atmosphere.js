import * as THREE from 'three';
import { S } from './state.js';
import { glowTexture, rng } from './textures.js';

/* ---------- particles: each room has its own air ---------- */
const T = CASTLE_TILE;
const systems = [];
function roomBox(id) { const r = CASTLE_ROOMS.find(x => x.id === id); return { x0: r.x0 * T, z0: r.z0 * T, x1: (r.x1 + 1) * T, z1: (r.z1 + 1) * T, h: r.h }; }

function points(count, box, opts) {
  const r = rng(opts.seed || 3), pos = new Float32Array(count * 3), vel = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.x0 + r() * (box.x1 - box.x0); pos[i * 3 + 1] = (opts.yMin || 0) + r() * ((opts.yMax || box.h) - (opts.yMin || 0)); pos[i * 3 + 2] = box.z0 + r() * (box.z1 - box.z0);
    vel[i * 3] = (r() - 0.5) * (opts.drift || 0.1); vel[i * 3 + 1] = opts.vy ? opts.vy * (0.6 + r() * 0.8) : (r() - 0.5) * 0.05; vel[i * 3 + 2] = (r() - 0.5) * (opts.drift || 0.1);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: glowTexture(opts.color), size: opts.size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: opts.opacity || 1 });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; S.scene.add(p);
  systems.push({ p, pos, vel, box, opts, r });
}
function rain(box) {
  const count = 1400, pos = new Float32Array(count * 6), r = rng(77), speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = box.x0 + r() * (box.x1 - box.x0), y = r() * 14, z = box.z0 + r() * (box.z1 - box.z0);
    pos.set([x, y, z, x + 0.02, y + 0.45, z + 0.04], i * 6); speeds[i] = 14 + r() * 6;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.35, depthWrite: false }));
  lines.frustumCulled = false; S.scene.add(lines);
  S.animated.push((t, dt) => {
    for (let i = 0; i < count; i++) {
      let y = pos[i * 6 + 1] - speeds[i] * dt;
      if (y < 0) { y += 14; const x = box.x0 + r() * (box.x1 - box.x0), z = box.z0 + r() * (box.z1 - box.z0); pos[i * 6] = x; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x + 0.02; pos[i * 6 + 5] = z + 0.04; }
      pos[i * 6 + 1] = y; pos[i * 6 + 4] = y + 0.45;
    }
    geo.attributes.position.needsUpdate = true;
  });
}
export function buildAtmosphere() {
  rain(roomBox('courtyard'));
  for (const id of ['entrance', 'library', 'gallery']) points(160, roomBox(id), { color: 'rgba(255,225,170,0.9)', size: 0.06, drift: 0.12, yMin: 0.5, opacity: 0.7, seed: id.length });
  points(120, { x0: 3, z0: 22, x1: 8, z1: 30, h: 8 }, { color: 'rgba(255,140,50,1)', size: 0.08, vy: 0.9, drift: 0.3, yMin: 0.5, yMax: 7, respawnY: 0.6, seed: 9 }); // fireplace embers
  points(90, { x0: 61.5, z0: 32.5, x1: 65.5, z1: 35.5, h: 6 }, { color: 'rgba(255,170,60,1)', size: 0.07, vy: 1.6, drift: 0.6, yMin: 1.2, yMax: 6, respawnY: 1.2, seed: 11 }); // forge sparks
  points(40, roomBox('dungeon'), { color: 'rgba(190,205,195,0.3)', size: 3.2, drift: 0.2, yMin: 0.1, yMax: 1.2, opacity: 0.1, seed: 5 }); // low, faint mist
  S.animated.push((t, dt) => {
    for (const s of systems) {
      const { pos, vel, box, opts } = s;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += vel[i] * dt + Math.sin(t * 0.3 + i) * 0.002; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt;
        const top = opts.yMax || box.h;
        if (opts.vy && pos[i + 1] > top) { pos[i + 1] = opts.respawnY || 0.5; pos[i] = box.x0 + s.r() * (box.x1 - box.x0); pos[i + 2] = box.z0 + s.r() * (box.z1 - box.z0); }
        if (!opts.vy) { if (pos[i + 1] < (opts.yMin || 0) || pos[i + 1] > top) vel[i + 1] *= -1; if (pos[i] < box.x0 || pos[i] > box.x1) vel[i] *= -1; if (pos[i + 2] < box.z0 || pos[i + 2] > box.z1) vel[i + 2] *= -1; }
      }
      s.p.geometry.attributes.position.needsUpdate = true;
    }
  });
}

/* ---------- sound: synthesised in the browser, nothing downloaded ---------- */
let ctx = null, master = null, beds = {}, muted = false, current = null, stepGain = null, lastStepPhase = 0;
function noiseBuffer(type) {
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return buf;
}
function loopNoise(type, filterType, freq, q) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(type); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(master); src.start();
  return { g, f };
}
function reverb() {
  const len = ctx.sampleRate * 2.5, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const conv = ctx.createConvolver(); conv.buffer = buf; conv.connect(master); return conv;
}
let verb = null;
function blip(freq, dur, vol, type, toVerb) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(toVerb ? verb : master); o.start(); o.stop(ctx.currentTime + dur + 0.05);
}
function crackle(vol) {
  const len = Math.floor(ctx.sampleRate * 0.02), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
const MIX = { // target gains per bed for each room's soundscape
  rain:    { rain: 0.22, wind: 0.05 },
  hall:    { room: 0.05, fire: 0.05 },
  fire:    { room: 0.04, fire: 0.18 },
  clock:   { room: 0.05 },
  library: { room: 0.04, fire: 0.03 },
  drips:   { room: 0.06, cave: 0.08 },
  forge:   { fire: 0.22, room: 0.04 },
  wind:    { wind: 0.2 }
};
export function startAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
  verb = reverb();
  beds.rain = loopNoise('white', 'bandpass', 2500, 0.5);
  beds.wind = loopNoise('white', 'bandpass', 500, 2);
  beds.fire = loopNoise('brown', 'lowpass', 600);
  beds.room = loopNoise('brown', 'lowpass', 180);
  beds.cave = loopNoise('brown', 'lowpass', 300);
  stepGain = ctx.createGain(); stepGain.gain.value = 0.5; stepGain.connect(master);
}
export function updateAudio(t, dt, room) {
  if (!ctx || ctx.state !== 'running') return;
  const mix = MIX[room ? room.sound : 'hall'] || {};
  for (const k in beds) { const g = beds[k].g.gain; g.value += ((mix[k] || 0) - g.value) * Math.min(1, dt * 1.5); }
  beds.wind.f.frequency.value = 380 + Math.sin(t * 0.21) * 160 + Math.sin(t * 0.57) * 60;
  const snd = room && room.sound;
  if ((snd === 'fire' || snd === 'forge' || snd === 'library') && Math.random() < dt * (snd === 'library' ? 2 : 9)) crackle(0.05 + Math.random() * 0.12);
  if (snd === 'drips' && Math.random() < dt * 0.9) blip(900 + Math.random() * 700, 0.25, 0.08, 'sine', true);
  if (snd === 'clock') { const tick = Math.floor(t); if (tick !== current) { current = tick; blip(tick % 2 ? 1800 : 1400, 0.05, 0.05, 'square', true); } }
  if (snd === 'forge' && Math.random() < dt * 0.15) { [523, 1251, 1764, 2490].forEach((f, i) => blip(f, 1.4 - i * 0.2, 0.05, 'sine', true)); }
}
// one soft footstep per stride, brighter on stone than on wood
export function footstep(phase, speed, room) {
  if (!ctx || ctx.state !== 'running' || speed < 0.5) return;
  const step = Math.floor(phase / Math.PI);
  if (step === lastStepPhase) return; lastStepPhase = step;
  const wood = room && (room.floor === 'oak' || room.floor === 'parquet');
  const len = Math.floor(ctx.sampleRate * 0.08), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = wood ? 500 : 1400;
  const g = ctx.createGain(); g.gain.value = Math.min(0.5, speed / 8) * (room && room.floor === 'cobble' ? 0.7 : 1);
  s.connect(f); f.connect(g); g.connect(stepGain); g.connect(verb); s.start();
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; }
export function isMuted() { return muted; }
export function suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); }
