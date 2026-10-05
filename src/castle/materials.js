import * as THREE from 'three';
import { texSet, rng } from './textures.js';

// Every material that uses a texture set, so real textures can be swapped in later.
const byTex = {};
function track(name, m) { (byTex[name] = byTex[name] || []).push(m); return m; }
export function materialsUsingTexture(name) { return byTex[name] || []; }

/* Breaks up texture tiling and adds age: two octaves of large-scale noise
   vary colour and roughness across a wall, and grime creeps up from the floor.
   World-space, so it never repeats with the texture. */
let noiseTex = null;
function grimeNoise() {
  if (noiseTex) return noiseTex;
  const N = 256, L = 8, data = new Uint8Array(N * N * 4);
  const r = rng(91);
  const lat = [[], []];
  for (let o = 0; o < 2; o++) for (let i = 0; i < L * L * 16; i++) lat[o].push(r());
  const smooth = t => t * t * (3 - 2 * t);
  const val = (o, x, y, cells) => {
    const fx = x / N * cells, fy = y / N * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const at = (i, j) => lat[o][((j % cells) * cells + (i % cells)) % lat[o].length];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    for (let o = 0; o < 2; o++) {
      const v = val(o, x, y, 4) * 0.5 + val(o, x, y, 8) * 0.3 + val(o, x, y, 16) * 0.2;
      data[i + o] = Math.round(v * 255);
    }
    data[i + 2] = 0; data[i + 3] = 255;
  }
  noiseTex = new THREE.DataTexture(data, N, N);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.magFilter = THREE.LinearFilter; noiseTex.minFilter = THREE.LinearMipmapLinearFilter; noiseTex.generateMipmaps = true;
  noiseTex.needsUpdate = true;
  return noiseTex;
}
function addWeathering(m, grime) {
  m.onBeforeCompile = shader => {
    shader.uniforms.gNoise = { value: grimeNoise() };
    shader.vertexShader = 'varying vec3 vGWorld;\nvarying vec3 vGNormal;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vGNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = 'uniform sampler2D gNoise;\nvarying vec3 vGWorld;\nvarying vec3 vGNormal;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec2 gP = abs(vGNormal.y) > 0.5 ? vGWorld.xz : vec2(vGWorld.x + vGWorld.z, vGWorld.y);
  float gN1 = texture2D(gNoise, gP / 13.0).r, gN2 = texture2D(gNoise, gP / 3.1 + 0.37).g;
  float gV = mix(0.78, 1.1, gN1) * mix(0.9, 1.06, gN2);
  float gWall = 1.0 - abs(vGNormal.y);
  gV *= 1.0 - ${grime.toFixed(2)} * gWall * (1.0 - smoothstep(0.0, 0.5 + gN1 * 1.1, vGWorld.y));
  gV *= 1.0 - 0.22 * step(0.5, -vGNormal.y) * gN2;
  diffuseColor.rgb *= gV;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor * mix(0.82, 1.12, gN1), 0.04, 1.0);');
  };
  m.customProgramCacheKey = () => 'weathered' + grime;
  return m;
}

// Surfaces that use world-space UVs (walls, floors, ceilings): one material per texture set.
const surf = {};
export function surfaceMat(name, extra) {
  const key = name + JSON.stringify(extra || {});
  if (!surf[key]) {
    const t = texSet(name);
    surf[key] = new THREE.MeshStandardMaterial(Object.assign({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0,
      normalScale: new THREE.Vector2(1, 1)
    }, extra || {}));
    surf[key].userData.scale = t.scale;
    addWeathering(surf[key], name === 'plaster' || name === 'panel' || name === 'parquet' ? 0.18 : 0.3);
    track(name, surf[key]);
  }
  return surf[key];
}

// Props: plain physically-based materials, cached by parameters.
const cache = {};
export function mat(color, o) {
  o = o || {};
  const key = color + JSON.stringify(o);
  if (!cache[key]) {
    const params = Object.assign({ color, roughness: 0.7, metalness: 0 }, o);
    const tex = o.tex;
    if (tex) { const t = texSet(tex); params.map = t.map; params.normalMap = t.normalMap; params.roughnessMap = t.roughnessMap; delete params.tex; }
    cache[key] = new THREE.MeshStandardMaterial(params);
    if (tex) track(tex, cache[key]);
  }
  return cache[key];
}
export const M = {
  gold: () => mat(0xd4a64a, { metalness: 1, roughness: 0.32 }),
  brass: () => mat(0xc29a50, { metalness: 1, roughness: 0.4 }),
  bronze: () => mat(0xa8763a, { metalness: 1, roughness: 0.45 }),
  iron: () => mat(0x3a3b40, { metalness: 0.85, roughness: 0.55 }),
  steel: () => mat(0xc4c8d0, { metalness: 1, roughness: 0.28 }),
  wood: () => mat(0xe8c8a8, { roughness: 0.6, tex: 'oak' }),
  darkwood: () => mat(0xc09878, { roughness: 0.65, tex: 'beam' }),
  stone: () => mat(0xd8d0c4, { roughness: 0.9, tex: 'ashlar' }),
  marble: () => mat(0xf0ece4, { roughness: 0.18 }),
  velvet: () => mat(0x7a1a22, { roughness: 0.95 }),
  glass: () => mat(0xcfe4f4, { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25 }),
  glow: (c, i) => mat(c, { emissive: c, emissiveIntensity: i || 2.5, roughness: 0.6 })
};
