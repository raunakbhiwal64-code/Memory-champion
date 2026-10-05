import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { S } from './state.js';

/* Rendering quality presets. The light pool size stays constant across
   presets so switching never recompiles every shader mid-walk. */
export const QUALITY = {
  low:    { pixelRatio: 1,    shadows: false, bloom: false, ao: false, shadowEvery: 0 },
  medium: { pixelRatio: 1.25, shadows: true,  bloom: true,  ao: false, shadowEvery: 3 },
  high:   { pixelRatio: 2,    shadows: true,  bloom: true,  ao: true,  shadowEvery: 2 }
};
const POOL = 8, SHADOW_LIGHTS = 1;
const pool = [];
let moon, lantern, hemi, frameNo = 0, lastAssign = -1;
let bloomPass, aoPass, gradePass;

export function initRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  S.renderer = renderer;
  return renderer;
}

export function initLighting() {
  const scene = S.scene;
  // soft image-based fill so metals and polished floors have something to reflect
  const pmrem = new THREE.PMREMGenerator(S.renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  hemi = new THREE.HemisphereLight(0x8a9cd8, 0x2a2018, 0.35);
  scene.add(hemi);
  // the moon: the one big shadow caster, lighting the courtyard and observatory
  moon = new THREE.DirectionalLight(0xaabfff, 0.9);
  moon.position.set(-20, 60, -40); moon.target.position.set(40, 0, 40);
  moon.shadow.camera.left = -60; moon.shadow.camera.right = 60; moon.shadow.camera.top = 60; moon.shadow.camera.bottom = -60;
  moon.shadow.camera.near = 10; moon.shadow.camera.far = 160;
  moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);
  for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffaa66, 0, 10, 2);
    l.userData = { src: null, cur: 0 };
    if (i < SHADOW_LIGHTS) { l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.004; l.shadow.normalBias = 0.05; l.shadow.radius = 3; }
    scene.add(l); pool.push(l);
  }
  // the keeper's lantern always lights the way
  lantern = new THREE.PointLight(0xffc27a, 6, 9, 2);
  scene.add(lantern);
  return lantern;
}

export function initComposer() {
  const { renderer, scene, camera } = S;
  // a multisampled target keeps edges smooth once post-processing is on
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  aoPass = new GTAOPass(scene, camera, 1, 1);
  aoPass.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2 });
  aoPass.blendIntensity = 0.85;
  // glows, particles and light shafts are see-through effects: keep them out of the occlusion pass
  const fx = [];
  scene.traverse(o => { if (o.isSprite || o.isPoints || o.isLine || (o.material && o.material.blending === THREE.AdditiveBlending)) fx.push(o); });
  const aoRender = aoPass.render.bind(aoPass);
  aoPass.render = (...args) => { const vis = fx.map(o => o.visible); fx.forEach(o => { o.visible = false; }); aoRender(...args); fx.forEach((o, i) => { o.visible = vis[i]; }); };
  composer.addPass(aoPass);
  // only genuinely bright things (flames, the moon in glass) should bloom
  bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.4, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  gradePass = new ShaderPass(GRADE);
  composer.addPass(gradePass);
  S.composer = composer;
}

/* Final grade, in display space: a gentle filmic S-curve, slightly cooler
   shadows and warmer highlights, a lens vignette and fine moving grain. */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.94, 0.98, 1.06), 1.0 - smoothstep(0.0, 0.35, l));
      col = mix(col, col * vec3(1.04, 1.0, 0.95), smoothstep(0.45, 1.0, l));
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.25);
      vec2 d = vUv - 0.5;
      col *= mix(1.0, 0.68, smoothstep(0.2, 0.75, dot(d, d) * 2.2));
      col += (hash(vUv * 1024.0 + fract(time) * 97.0) - 0.5) * 0.022;
      gl_FragColor = vec4(col, c.a);
    }`
};

export function applyQuality(name) {
  const q = QUALITY[name] || QUALITY.medium;
  S.quality = name;
  const r = S.renderer;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
  const shadowsChanged = r.shadowMap.enabled !== q.shadows;
  r.shadowMap.enabled = q.shadows;
  r.shadowMap.autoUpdate = false;
  moon.castShadow = q.shadows;
  for (let i = 0; i < SHADOW_LIGHTS; i++) pool[i].castShadow = q.shadows;
  if (shadowsChanged) S.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  if (aoPass) aoPass.enabled = q.ao;
  if (bloomPass) bloomPass.enabled = q.bloom;
  r.shadowMap.needsUpdate = true;
}
export function usesComposer() { const q = QUALITY[S.quality]; return q.bloom || q.ao; }

const FLICKER = { torch: 1, fire: 1, candle: 1, chandelier: 0.5, lantern: 0.25, brazier: 1 };
function score(src, px, pz, room) {
  const d = Math.hypot(src.x - px, src.z - pz);
  return d + (room && src.room !== room.id ? 10 : 0) - (src.intensity > 30 ? 3 : 0);
}
export function updateLights(t, dt) {
  const P = S.player, room = S.currentRoom;
  frameNo++;
  if (gradePass) gradePass.uniforms.time.value = t;
  // re-pick which sources get a real light four times a second
  if (t - lastAssign > 0.25) {
    lastAssign = t;
    const ranked = S.lightSources.map(s => ({ s, k: score(s, P.x, P.z, room) })).sort((a, b) => a.k - b.k);
    const wantShadow = ranked.filter(r => r.s.shadow).slice(0, SHADOW_LIGHTS).map(r => r.s);
    const want = ranked.slice(0, POOL).map(r => r.s);
    // shadow-casting lights get the shadow-flagged sources first
    for (let i = 0; i < SHADOW_LIGHTS; i++) {
      const src = wantShadow[i] || null;
      if (pool[i].userData.src !== src) { pool[i].userData.src = src; pool[i].userData.cur = 0; if (src) pool[i].position.set(src.x, src.y, src.z); S.renderer.shadowMap.needsUpdate = true; }
    }
    const taken = new Set(pool.slice(0, SHADOW_LIGHTS).map(l => l.userData.src));
    const free = [];
    for (let i = SHADOW_LIGHTS; i < POOL; i++) { const s = pool[i].userData.src; if (s && want.includes(s) && !taken.has(s)) taken.add(s); else free.push(pool[i]); }
    for (const src of want) {
      if (taken.has(src)) continue;
      const l = free.shift(); if (!l) break;
      l.userData.src = src; l.userData.cur = 0; l.position.set(src.x, src.y, src.z); taken.add(src);
    }
    free.forEach(l => { l.userData.src = null; });
  }
  for (const l of pool) {
    const src = l.userData.src;
    const target = src ? src.intensity : 0;
    l.userData.cur += (target - l.userData.cur) * Math.min(1, dt * 5);
    if (src) {
      const f = FLICKER[src.kind] || 0;
      const n = 1 - f * (0.08 + Math.sin(t * 9.7 + src.x) * 0.05 + Math.sin(t * 23.1 + src.z) * 0.04);
      l.intensity = l.userData.cur * n; l.color.setHex(src.color); l.distance = src.distance;
    } else l.intensity = l.userData.cur;
  }
  // the lantern swings with the keeper's hand
  lantern.intensity = 5.5 + Math.sin(t * 11) * 0.25;
  const q = QUALITY[S.quality];
  if (q.shadows && q.shadowEvery && frameNo % q.shadowEvery === 0) S.renderer.shadowMap.needsUpdate = true;
}
export function setLanternPos(x, y, z) { lantern.position.set(x, y, z); }
export function resizeComposer(w, h) {
  if (!S.composer) return;
  S.composer.setPixelRatio(S.renderer.getPixelRatio());
  S.composer.setSize(w, h);
  if (aoPass) aoPass.setSize(w, h);
}
