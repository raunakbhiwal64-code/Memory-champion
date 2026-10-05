import * as THREE from 'three';

/* Procedural PBR texture sets. Each surface is drawn as a height field plus
   a colour layer; the normal map is derived from the height (Sobel filter)
   and the roughness map from height + wetness. Nothing is downloaded, and
   every set tiles seamlessly because all drawing wraps around the edges. */

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Seamless value noise (fbm) on an N x N grid.
function makeNoise(N, seed) {
  const r = rng(seed);
  const lat = []; const L = 16;
  for (let i = 0; i < L * L; i++) lat.push(r());
  const at = (x, y) => lat[((y % L + L) % L) * L + ((x % L + L) % L)];
  const smooth = t => t * t * (3 - 2 * t);
  function v(x, y, f) {
    const fx = x * f, fy = y * f, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const per = f; const w = (a) => ((a % per) + per) % per;
    const a = at(w(x0), w(y0)), b = at(w(x0 + 1), w(y0)), c = at(w(x0), w(y0 + 1)), d = at(w(x0 + 1), w(y0 + 1));
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  return (u, w, octaves = 4, base = 4) => { // u, w in [0,1)
    let sum = 0, amp = 0.5, f = base;
    for (let o = 0; o < octaves; o++) { sum += amp * v(u, w, Math.min(f, 16)); amp *= 0.5; f *= 2; }
    return sum;
  };
}

function finish(N, height, color, rough, opts) {
  // colour canvas
  const cc = document.createElement('canvas'); cc.width = cc.height = N;
  const cctx = cc.getContext('2d'); const cimg = cctx.createImageData(N, N);
  // normal canvas
  const nc = document.createElement('canvas'); nc.width = nc.height = N;
  const nctx = nc.getContext('2d'); const nimg = nctx.createImageData(N, N);
  const rc = document.createElement('canvas'); rc.width = rc.height = N;
  const rctx = rc.getContext('2d'); const rimg = rctx.createImageData(N, N);
  const strength = opts.normalStrength || 2.5;
  const H = (x, y) => height[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, p = i * 4;
    cimg.data[p] = color[i * 3]; cimg.data[p + 1] = color[i * 3 + 1]; cimg.data[p + 2] = color[i * 3 + 2]; cimg.data[p + 3] = 255;
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
    let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    nimg.data[p] = (nx * 0.5 + 0.5) * 255; nimg.data[p + 1] = (ny * 0.5 + 0.5) * 255; nimg.data[p + 2] = (nz * 0.5 + 0.5) * 255; nimg.data[p + 3] = 255;
    const rv = Math.max(0, Math.min(1, rough[i])) * 255;
    rimg.data[p] = rimg.data[p + 1] = rimg.data[p + 2] = rv; rimg.data[p + 3] = 255;
  }
  cctx.putImageData(cimg, 0, 0); nctx.putImageData(nimg, 0, 0); rctx.putImageData(rimg, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cc, true), normalMap: tex(nc, false), roughnessMap: tex(rc, false), scale: opts.scale || 3 };
}

const mix = (a, b, t) => a + (b - a) * t;
function shade(base, k) { return [base[0] * k, base[1] * k, base[2] * k]; }

/* Blocks laid in courses (ashlar / brick / flagstones). */
function blocks(N, seed, o) {
  const r = rng(seed), noise = makeNoise(N, seed + 3);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  const rows = o.rows; const rowH = N / rows; const blockId = new Int32Array(N * N); const blockTone = [];
  const rowOffsets = []; const rowWidths = [];
  for (let y = 0; y < rows; y++) {
    const ws = []; let total = 0;
    while (total < N) { const w = Math.round(N / o.cols * (o.irregular ? (0.6 + r() * 0.9) : 1)); ws.push(w); total += w; }
    ws[ws.length - 1] -= total - N;
    rowWidths.push(ws); rowOffsets.push(o.stagger ? Math.floor(r() * N) : (y % 2) * (N / o.cols / 2));
  }
  for (let y = 0; y < N; y++) {
    const row = Math.floor(y / rowH), inRowY = y - row * rowH;
    for (let x = 0; x < N; x++) {
      const xx = (x + rowOffsets[row]) % N; let acc = 0, bi = 0;
      const ws = rowWidths[row]; while (bi < ws.length - 1 && acc + ws[bi] <= xx) { acc += ws[bi]; bi++; }
      const inX = xx - acc, bw = ws[bi];
      const id = row * 64 + bi; if (blockTone[id] === undefined) blockTone[id] = r();
      const edge = Math.min(inX, bw - inX, inRowY, rowH - inRowY);
      const m = o.mortar;
      const i = y * N + x, u = x / N, w = y / N;
      const n = noise(u, w, 5, 8), n2 = noise(u + 0.37, w + 0.11, 3, 2);
      let h, col, ro;
      if (edge < m) { // mortar
        h = 0.05 + n * 0.08; col = shade(o.mortarColor, 0.85 + n * 0.3); ro = 0.95;
      } else {
        const bevel = Math.min(1, (edge - m) / o.bevel);
        const tone = blockTone[id];
        h = 0.35 + bevel * 0.45 + (n - 0.5) * o.bump + tone * 0.06;
        const c0 = o.colors[Math.floor(tone * o.colors.length) % o.colors.length];
        const k = (0.78 + n * 0.35) * (0.9 + tone * 0.2) * (1 - (1 - bevel) * 0.15);
        col = shade(c0, k);
        if (o.grime) { const g = Math.max(0, n2 - 0.45) * o.grime; col = col.map((c, j) => mix(c, [40, 38, 34][j], g)); }
        ro = o.rough + (n - 0.5) * 0.2;
      }
      if (o.wet) { const puddle = Math.max(0, noise(u + 0.5, w + 0.2, 3, 2) - (1 - o.wet)); if (puddle > 0) { ro *= 0.25; col = shade(col, 0.75); h = Math.max(h, 0.4); } }
      height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = ro;
    }
  }
  return finish(N, height, color, rough, o);
}

/* Rounded stones packed together (cobbles, rubble walls) via jittered Voronoi. */
function stones(N, seed, o) {
  const r = rng(seed), noise = makeNoise(N, seed + 7);
  const cells = o.cells, pts = [];
  for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) pts.push([(gx + 0.15 + r() * 0.7) / cells, (gy + 0.15 + r() * 0.7) / cells, r()]);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, w = y / N; let d1 = 9, d2 = 9, tone = 0;
    const cx = Math.floor(u * cells), cy = Math.floor(w * cells);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const gx = (cx + ox + cells) % cells, gy = (cy + oy + cells) % cells, p = pts[gy * cells + gx];
      let dx = p[0] - u, dy = p[1] - w; dx -= Math.round(dx); dy -= Math.round(dy);
      const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; tone = p[2]; } else if (d < d2) d2 = d;
    }
    const gap = (d2 - d1) * cells; const n = noise(u, w, 4, 8);
    const i = y * N + x;
    let h, col, ro;
    if (gap < o.gap) { h = 0.05 + n * 0.1; col = shade(o.gapColor, 0.8 + n * 0.4); ro = 0.95; }
    else { const dome = Math.min(1, (gap - o.gap) / 0.35); h = 0.3 + Math.sqrt(dome) * 0.6 + (n - 0.5) * 0.12; col = shade(o.colors[Math.floor(tone * o.colors.length)], 0.75 + n * 0.4); ro = o.rough + (n - 0.5) * 0.15; }
    if (o.moss) { const m = Math.max(0, noise(u + 0.3, w + 0.6, 3, 2) - 0.55) * o.moss * 3; if (gap < o.gap * 2.5) col = col.map((c, j) => mix(c, [52, 70, 38][j], Math.min(1, m))); }
    if (o.wet) { const puddle = noise(u + 0.71, w + 0.13, 3, 2); if (puddle > 1 - o.wet) { ro = 0.08; col = shade(col, 0.7); } else ro *= 0.7; }
    height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = ro;
  }
  return finish(N, height, color, rough, o);
}

/* Wooden boards: long planks or herringbone parquet, with grain. */
function wood(N, seed, o) {
  const r = rng(seed), noise = makeNoise(N, seed + 11);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  const boards = o.boards, bw = N / boards; const tones = []; const cuts = [];
  for (let b = 0; b < boards; b++) { tones.push(r()); cuts.push([r() * N, r() * N]); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N;
    let bx, along, across, bi;
    if (o.herring) {
      const cell = N / boards, cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      const flip = (cx + cy) % 2; bi = (cx * 7 + cy * 3) % boards;
      along = flip ? (x % cell) : (y % cell); across = flip ? (y % cell) / cell : (x % cell) / cell;
      bx = Math.min(across, 1 - across) * cell;
    } else {
      bi = Math.floor(x / bw); across = (x % bw) / bw; along = y; bx = Math.min(across, 1 - across) * bw;
      const c = cuts[bi]; if (Math.abs(((y - c[0]) % N + N) % N) < 2 || Math.abs(((y - c[1]) % N + N) % N) < 2) bx = 0;
    }
    const tone = tones[bi];
    const grain = Math.sin((across * 14 + noise(u * 0.5 + bi * 0.13, w, 3, 2) * 10) * Math.PI) * 0.5 + 0.5;
    const n = noise(u, w, 4, 8);
    const seam = bx < 1.5;
    const h = seam ? 0.1 : 0.6 + grain * 0.08 + (n - 0.5) * 0.06;
    const k = (0.72 + tone * 0.4) * (0.82 + grain * 0.22) * (seam ? 0.45 : 1);
    const col = shade(o.color, k);
    height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2];
    rough[i] = o.rough + (n - 0.5) * 0.15 + (seam ? 0.2 : 0);
  }
  return finish(N, height, color, rough, o);
}

/* Polished marble checker with veins. */
function marble(N, seed, o) {
  const noise = makeNoise(N, seed);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  const t = o.tiles, tw = N / t;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N;
    const tx = Math.floor(x / tw), ty = Math.floor(y / tw), dark = (tx + ty) % 2;
    const edge = Math.min(x % tw, tw - x % tw, y % tw, tw - y % tw);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + w * 2 + noise(u, w, 5, 4) * 3) * Math.PI)), 12);
    const base = dark ? o.dark : o.light;
    let col = shade(base, 0.92 + noise(u + 0.2, w, 3, 4) * 0.12);
    col = col.map((c, j) => mix(c, dark ? [190, 185, 175][j] : [120, 115, 110][j], vein * 0.6));
    const grout = edge < 1.2;
    height[i] = grout ? 0.3 : 0.6; if (grout) col = shade(col, 0.6);
    color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2];
    rough[i] = grout ? 0.8 : 0.12 + noise(u, w, 2, 4) * 0.12;
  }
  return finish(N, height, color, rough, Object.assign({ normalStrength: 1.2 }, o));
}

/* Plaster / panelling / slate share a simpler generator. */
function plaster(N, seed, o) {
  const noise = makeNoise(N, seed);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N, n = noise(u, w, 6, 4), n2 = noise(u + 0.4, w + 0.7, 3, 2);
    const col = shade(o.color, 0.86 + n * 0.22 - Math.max(0, n2 - 0.6) * 0.5);
    height[i] = n * 0.4; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = 0.85;
  }
  return finish(N, height, color, rough, Object.assign({ normalStrength: 1.5 }, o));
}
// furrowed bark: vertical ridges, wandering with noise, broken by cracks
function bark(N, seed, o) {
  const noise = makeNoise(N, seed);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N, warp = noise(u, w, 4, 2), n = noise(u + 0.3, w + 0.6, 5, 8);
    const ridge = Math.pow(Math.abs(Math.sin((u * o.ridges + warp * 1.6) * Math.PI)), 0.55);
    const h = ridge * 0.75 + n * 0.35;
    const col = shade(o.color, 0.45 + h * 0.75 + Math.max(0, n - 0.62) * 0.6);
    height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = 0.95 - h * 0.1;
  }
  return finish(N, height, color, rough, Object.assign({ normalStrength: 5 }, o));
}
function panels(N, seed, o) {
  const wd = wood(N, seed, Object.assign({}, o, { boards: 8 }));
  // raised rectangles drawn over the planks via a second height pass
  const noise = makeNoise(N, seed + 5);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  const pw = N / 2, ph = N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N;
    const ex = Math.min(x % pw, pw - x % pw), ey = Math.min(y % ph, ph - y % ph), e = Math.min(ex, ey);
    const grain = Math.sin((u * 30 + noise(u, w, 3, 2) * 6) * Math.PI) * 0.5 + 0.5;
    let h = 0.5, k = 0.85 + grain * 0.15;
    if (e < 10) { h = 0.8; k *= 1.05; } else if (e < 16) { h = 0.8 - (e - 10) / 6 * 0.5; k *= 0.8; } else { h = 0.3 + grain * 0.03; }
    const col = shade(o.color, k * (0.9 + noise(u, w, 4, 8) * 0.2));
    height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = 0.55;
  }
  wd.map.dispose(); wd.normalMap.dispose(); wd.roughnessMap.dispose();
  return finish(N, height, color, rough, o);
}
function starmap(N, seed, o) {
  const r = rng(seed), noise = makeNoise(N, seed);
  const height = new Float32Array(N * N), color = new Float32Array(N * N * 3), rough = new Float32Array(N * N);
  const stars = []; for (let k = 0; k < 40; k++) stars.push([r() * N, r() * N, 1 + r() * 2.5]);
  const t = 2, tw = N / t;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, w = y / N;
    const edge = Math.min(x % tw, tw - x % tw, y % tw, tw - y % tw);
    let col = shade([28, 38, 74], 0.85 + noise(u, w, 4, 4) * 0.3), h = 0.6, ro = 0.2;
    for (const s of stars) { const d = Math.hypot(x - s[0], y - s[1]); if (d < s[2]) { col = [212, 176, 92]; h = 0.75; ro = 0.3; } }
    const ring = Math.abs(Math.hypot(x - N / 2, y - N / 2) - N * 0.42);
    if (ring < 1.5) { col = [190, 156, 80]; h = 0.7; }
    if (edge < 1.5) { col = shade(col, 0.5); h = 0.3; ro = 0.8; }
    height[i] = h; color[i * 3] = col[0]; color[i * 3 + 1] = col[1]; color[i * 3 + 2] = col[2]; rough[i] = ro;
  }
  return finish(N, height, color, rough, Object.assign({ normalStrength: 1.2 }, o));
}

const RECIPES = {
  ashlar:   () => blocks(512, 21, { rows: 5, cols: 2, irregular: true, stagger: true, mortar: 4, bevel: 7, bump: 0.6, mortarColor: [70, 66, 60], colors: [[124, 116, 104], [108, 104, 98], [136, 124, 106], [98, 94, 90], [118, 108, 92], [130, 128, 122]], rough: 0.9, grime: 1.3, scale: 4.2, normalStrength: 4.5 }),
  brick:    () => blocks(512, 31, { rows: 12, cols: 4, mortar: 3, bevel: 4, bump: 0.15, mortarColor: [70, 62, 56], colors: [[132, 66, 44], [120, 58, 40], [146, 78, 52], [104, 54, 40]], rough: 0.85, grime: 1.2, scale: 2.4, normalStrength: 2.5 }),
  flag:     () => blocks(512, 41, { rows: 3, cols: 2, irregular: true, stagger: true, mortar: 3, bevel: 6, bump: 0.3, mortarColor: [60, 56, 50], colors: [[124, 118, 106], [110, 104, 96], [134, 126, 112]], rough: 0.8, grime: 0.8, scale: 4, normalStrength: 2.5 }),
  wetstone: () => blocks(512, 51, { rows: 3, cols: 3, irregular: true, stagger: true, mortar: 4, bevel: 8, bump: 0.35, mortarColor: [34, 38, 34], colors: [[70, 78, 70], [60, 66, 62], [80, 84, 76]], rough: 0.65, grime: 1, wet: 0.2, scale: 3.5, normalStrength: 3 }),
  cobble:   () => stones(512, 61, { cells: 9, gap: 0.08, gapColor: [48, 46, 40], colors: [[118, 114, 108], [100, 98, 94], [130, 124, 112], [92, 90, 88]], rough: 0.7, wet: 0.35, moss: 0.6, scale: 3, normalStrength: 4 }),
  rubble:   () => stones(512, 71, { cells: 6, gap: 0.1, gapColor: [36, 34, 30], colors: [[86, 84, 76], [74, 74, 68], [98, 92, 82]], rough: 0.65, moss: 1, wet: 0.2, scale: 2.6, normalStrength: 4 }),
  oak:      () => wood(512, 81, { boards: 6, color: [128, 84, 50], rough: 0.55, scale: 3, normalStrength: 1.6 }),
  parquet:  () => wood(512, 91, { boards: 8, herring: true, color: [138, 92, 54], rough: 0.4, scale: 2, normalStrength: 1.4 }),
  beam:     () => wood(256, 95, { boards: 3, color: [72, 50, 32], rough: 0.75, scale: 2, normalStrength: 2 }),
  marble:   () => marble(512, 101, { tiles: 2, light: [228, 222, 210], dark: [44, 42, 46], scale: 2.4 }),
  plaster:  () => plaster(256, 111, { color: [214, 196, 160], scale: 3 }),
  panel:    () => panels(512, 121, { color: [102, 66, 38], rough: 0.5, scale: 2.4 }),
  slate:    () => blocks(256, 131, { rows: 8, cols: 6, mortar: 2, bevel: 3, bump: 0.2, mortarColor: [30, 32, 38], colors: [[64, 70, 82], [56, 60, 72], [72, 76, 88]], rough: 0.6, scale: 2, normalStrength: 2 }),
  starmap:  () => starmap(512, 141, { scale: 4 }),
  bark:     () => bark(256, 151, { ridges: 8, color: [92, 80, 66], scale: 1 }),
  wool:     () => plaster(256, 161, { color: [120, 118, 112], scale: 1 })
};
const cache = {};
export function texSet(name) {
  if (!cache[name]) cache[name] = RECIPES[name]();
  return cache[name];
}

// Simple canvas texture (paintings, labels) in sRGB.
export function canvasTexture(size, draw, w) {
  const c = document.createElement('canvas'); c.width = w || size; c.height = size;
  draw(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function glowTexture(rgba) {
  return canvasTexture(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    // a tight core with a quick falloff, like real lens glare, not a wide halo
    gr.addColorStop(0, rgba); gr.addColorStop(0.12, rgba.replace(/[\d.]+\)$/, '0.5)'));
    gr.addColorStop(0.35, rgba.replace(/[\d.]+\)$/, '0.1)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
}
