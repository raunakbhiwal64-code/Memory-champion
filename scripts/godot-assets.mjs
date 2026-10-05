// Copies the castle's CC0 assets into the Godot project. Godot 4.7 can't read
// meshopt-compressed or quantized geometry, so models are rewritten without either (textures stay
// WebP, which Godot reads). Run after `npm run assets`:
//   node scripts/godot-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { dequantize } from '@gltf-transform/functions';

const SRC = path.resolve('public/assets');
const OUT = path.resolve('godot/assets/castle');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const manifest = JSON.parse(await fs.readFile(path.join(SRC, 'manifest.json'), 'utf-8'));

await fs.mkdir(path.join(OUT, 'models'), { recursive: true });
let bytes = 0;
for (const [id, m] of Object.entries(manifest.models)) {
  const doc = await io.read(path.join(SRC, m.file));
  // Godot reads neither meshopt compression nor quantized vertex attributes
  await doc.transform(dequantize());
  doc.getRoot().listExtensionsUsed().filter(e => ['EXT_meshopt_compression', 'KHR_mesh_quantization'].includes(e.extensionName)).forEach(e => e.dispose());
  const out = path.join(OUT, 'models', `${id}.glb`);
  await io.write(out, doc);
  bytes += (await fs.stat(out)).size;
}
for (const key of Object.keys(manifest.textures)) {
  await fs.mkdir(path.join(OUT, 'textures', key), { recursive: true });
  for (const map of ['color', 'normal', 'rough']) {
    await fs.copyFile(path.join(SRC, 'textures', key, `${map}.webp`), path.join(OUT, 'textures', key, `${map}.webp`));
  }
}
await fs.copyFile(path.join(SRC, 'manifest.json'), path.join(OUT, 'manifest.json'));
await fs.copyFile(path.join(SRC, 'CREDITS.md'), path.join(OUT, 'CREDITS.md'));
console.log(`${Object.keys(manifest.models).length} models (${(bytes / 1e6).toFixed(1)} MB) and ${Object.keys(manifest.textures).length} texture sets copied to godot/assets/castle`);
