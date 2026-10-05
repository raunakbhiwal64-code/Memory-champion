// Downloads the castle's CC0 assets from Poly Haven and optimises them for the web.
//   node scripts/fetch-assets.mjs            fetch anything missing
//   node scripts/fetch-assets.mjs --force    re-fetch everything
// Output: public/assets/{textures,models}/..., public/assets/manifest.json, public/assets/CREDITS.md
// Every asset here is CC0 (public domain): free for commercial use, no attribution required.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const OUT = path.resolve('public/assets');
const TMP = path.resolve('.asset-cache');
const FORCE = process.argv.includes('--force');
const FORCE_MODELS = FORCE || process.argv.includes('--models');
// triangle budget per model: big centrepieces get more detail than small table-top props
const TRI_BUDGET = { large_iron_gate: 16000, treasure_chest: 14000, cannon_01: 14000, vintage_cabinet_01: 12000, Chandelier_03: 9000, WoodenChair_01: 14000, gothic_statue: 14000, lion_head: 9000, marble_bust_01: 9000, street_lamp_01: 9000, street_lamp_02: 8000, shrub_02: 20000, shrub_04: 16000, moss_01: 8000 };
const DEFAULT_TRIS = 6000;

// castle surface name -> Poly Haven texture id
const TEXTURES = {
  ashlar: 'castle_wall_varriation',
  brick: 'castle_brick_02_red',
  rubble: 'mossy_stone_wall',
  plaster: 'medieval_wall_01',
  panel: 'wooden_panels',
  cobble: 'cobblestone_floor_04',
  marble: 'checkered_pavement_tiles',
  oak: 'wood_floor_worn',
  parquet: 'herringbone_parquet',
  beam: 'dark_wood',
  wetstone: 'monastery_stone_floor',
  flag: 'rock_tile_floor_02',
  slate: 'roof_slates_02',
  bark: 'jolcham_oak_bark_01',
  wool: 'rough_linen'
};
// Poly Haven model id -> max texture size (small props get smaller textures)
const MODELS = {
  large_iron_gate: 1024, vintage_grandfather_clock_01: 1024, ornate_mirror_01: 1024, antique_ceramic_vase_01: 1024,
  marble_bust_01: 1024, wooden_bookshelf_worn: 1024, ArmChair_01: 1024, vintage_oil_lamp: 512, book_encyclopedia_set_01: 512,
  WoodenChair_01: 512, wooden_barrels_01: 1024, chemistry_set: 1024, wine_bottles_01: 512,
  treasure_chest: 1024, cannon_01: 1024, kite_shield: 1024, antique_estoc: 512, ornate_medieval_mace: 512,
  ornate_war_hammer: 512, wooden_axe: 512, vintage_cabinet_01: 1024, brass_goblets: 512, Chandelier_03: 1024,
  lantern_chandelier_01: 1024, wooden_crate_01: 1024, wooden_crate_02: 1024, wine_barrel_01: 1024, wooden_bucket_01: 512,
  wooden_lantern_01: 512, GothicCabinet_01: 1024, GothicCommode_01: 1024, gothic_statue: 1024, horse_statue_01: 1024,
  lion_head: 1024, jug_01: 512, spinning_wheel_01: 1024, painted_wooden_shelves: 1024,
  street_lamp_01: 1024, street_lamp_02: 1024, fern_02: 1024, shrub_02: 1024
};

const api = p => `https://api.polyhaven.com/${p}`;
async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
async function download(url, file) {
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await r.arrayBuffer()));
}
const exists = f => fs.access(f).then(() => true, () => false);

async function fetchTexture(key, id) {
  const dir = path.join(OUT, 'textures', key);
  const info = await getJSON(api(`info/${id}`));
  const scale = info.dimensions ? info.dimensions[0] / 1000 : 2;
  if (!FORCE && await exists(path.join(dir, 'color.webp'))) return { id, scale, name: info.name };
  const files = await getJSON(api(`files/${id}`));
  const maps = { color: files.Diffuse, normal: files.nor_gl, rough: files.Rough };
  await fs.mkdir(dir, { recursive: true });
  for (const [name, entry] of Object.entries(maps)) {
    const src = entry['1k'].jpg.url, tmp = path.join(TMP, 'tex', `${id}_${name}.jpg`);
    await download(src, tmp);
    await sharp(tmp).resize(1024, 1024, { fit: 'fill' }).webp({ quality: name === 'normal' ? 92 : 82 }).toFile(path.join(dir, `${name}.webp`));
  }
  return { id, scale, name: info.name };
}

let io;
async function fetchModel(id, size) {
  const out = path.join(OUT, 'models', `${id}.glb`);
  const info = await getJSON(api(`info/${id}`));
  if (!FORCE_MODELS && await exists(out)) return { id, name: info.name };
  const files = await getJSON(api(`files/${id}`));
  const g = files.gltf['1k'].gltf, dir = path.join(TMP, 'models', id);
  const main = path.join(dir, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, f] of Object.entries(g.include || {})) await download(f.url, path.join(dir, rel));
  const doc = await io.read(main);
  let tris = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  const ratio = Math.min(1, (TRI_BUDGET[id] || DEFAULT_TRIS) / tris);
  await doc.transform(dedup(), prune(), weld());
  if (ratio < 0.95) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02 }));
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' })
  );
  await fs.mkdir(path.dirname(out), { recursive: true });
  await io.write(out, doc);
  return { id, name: info.name };
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const manifest = { source: 'Poly Haven (polyhaven.com), CC0 1.0', textures: {}, models: {} };
  for (const [key, id] of Object.entries(TEXTURES)) {
    process.stdout.write(`texture ${key} <- ${id} ... `);
    const t = await fetchTexture(key, id);
    manifest.textures[key] = { id, scale: t.scale, name: t.name };
    console.log(`ok (${t.scale} m)`);
  }
  for (const [id, size] of Object.entries(MODELS)) {
    process.stdout.write(`model ${id} ... `);
    const m = await fetchModel(id, size);
    const bytes = (await fs.stat(path.join(OUT, 'models', `${id}.glb`))).size;
    manifest.models[id] = { file: `models/${id}.glb`, name: m.name, bytes };
    console.log(`ok (${(bytes / 1e6).toFixed(2)} MB)`);
  }
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const credits = ['# Asset credits', '', 'All 3D models and textures in this folder come from [Poly Haven](https://polyhaven.com) and are released under **CC0 1.0** (public domain): free to use commercially, no attribution required. Listed here anyway, with thanks.', '',
    '## Textures', ...Object.entries(manifest.textures).map(([k, t]) => `- ${t.name} (\`${t.id}\`) — used for "${k}" — https://polyhaven.com/a/${t.id}`), '',
    '## Models', ...Object.values(manifest.models).map(m => `- ${m.name} — https://polyhaven.com/a/${m.file.slice(7, -4)}`), ''];
  await fs.writeFile(path.join(OUT, 'CREDITS.md'), credits.join('\n'));
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
