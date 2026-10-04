import * as THREE from 'three';
import { texSet } from './textures.js';

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
    if (o.tex) { const t = texSet(o.tex); params.map = t.map; params.normalMap = t.normalMap; params.roughnessMap = t.roughnessMap; delete params.tex; }
    cache[key] = new THREE.MeshStandardMaterial(params);
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
