// Exports the app's built-in content from index.html (the web app) into
// godot/data/content.json, so the Godot app and the website share one source:
// the curriculum, drill settings and word lists, the Major System and the
// castle layout. Lesson bodies are converted from HTML to Godot BBCode.
//   node scripts/export-godot-data.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf-8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const app = scripts.find(s => s.includes('const CURRICULUM'));
if (!app) throw new Error('app script not found in index.html');

const NAMES = ['DISCIPLINES', 'LEVELS', 'WORD_BANK', 'FIRST_NAMES', 'LAST_NAMES', 'MAJOR_SYSTEM_LEGEND', 'MAJOR_SYSTEM_DEFAULTS',
  'CURRICULUM', 'DRILL_PREREQUISITES', 'CASTLE_NAME', 'CASTLE_TILE', 'CASTLE_GRID_W', 'CASTLE_GRID_H', 'CASTLE_ROOMS',
  'CASTLE_DOORS', 'CASTLE_DOOR_H', 'CASTLE_START', 'CASTLE_STATIONS', 'CASTLE_RING_OFFSET', 'CASTLE_FACE_VEC'];
const stub = { addEventListener() {}, document: { getElementById() { return null; }, querySelectorAll() { return []; } } };
const ctx = vm.createContext({ window: stub, document: stub.document, console, Math, Date, JSON, setTimeout, Object, Array, String, Number, Set, Map });
vm.runInContext(app + `\n;globalThis.__out = { ${NAMES.join(', ')} };`, ctx);
const o = ctx.__out;

// HTML (as used in lesson bodies: p, br, strong, em) -> BBCode for RichTextLabel
function toBBCode(s) {
  return s
    .replace(/\s*\n\s*/g, ' ')
    .replace(/<br\s*\/?>\s*/g, '\n')
    .replace(/<p>\s*/g, '').replace(/\s*<\/p>/g, '\n\n')
    .replace(/<strong>/g, '[b]').replace(/<\/strong>/g, '[/b]')
    .replace(/<em>/g, '[i]').replace(/<\/em>/g, '[/i]')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\[(?!\/?[bi]\])/g, '[lb]')
    .split('\n').map(l => l.trim()).join('\n')
    .trim();
}

const content = {
  source: 'Generated from index.html by scripts/export-godot-data.mjs. Do not edit by hand.',
  disciplines: o.DISCIPLINES,
  levels: o.LEVELS,
  wordBank: o.WORD_BANK,
  firstNames: o.FIRST_NAMES,
  lastNames: o.LAST_NAMES,
  majorLegend: o.MAJOR_SYSTEM_LEGEND,
  majorDefaults: o.MAJOR_SYSTEM_DEFAULTS,
  drillPrerequisites: o.DRILL_PREREQUISITES,
  curriculum: o.CURRICULUM.map(level => ({
    levelNum: level.levelNum, levelTitle: level.levelTitle,
    lessons: level.lessons.map(l => ({ id: l.id, title: l.title, gap: !!l.gap, tryAction: l.tryAction || null, tryLabel: l.tryLabel || null,
      secondaryAction: l.secondaryAction || null, secondaryLabel: l.secondaryLabel || null, body: toBBCode(l.body) }))
  })),
  castle: {
    name: o.CASTLE_NAME, tile: o.CASTLE_TILE, gridW: o.CASTLE_GRID_W, gridH: o.CASTLE_GRID_H, doorH: o.CASTLE_DOOR_H,
    start: o.CASTLE_START, rooms: o.CASTLE_ROOMS, doors: o.CASTLE_DOORS, ringOffset: o.CASTLE_RING_OFFSET, faceVec: o.CASTLE_FACE_VEC,
    stations: o.CASTLE_STATIONS.map(s => ({ id: s.id, n: s.n, room: s.room, title: s.title, prop: s.prop, x: s.x, z: s.z, face: s.face }))
  }
};
fs.mkdirSync('godot/data', { recursive: true });
fs.writeFileSync('godot/data/content.json', JSON.stringify(content, null, 1));
const lessons = content.curriculum.reduce((n, l) => n + l.lessons.length, 0);
console.log(`wrote godot/data/content.json: ${lessons} lessons, ${content.wordBank.length} words, ${content.castle.stations.length} castle stations`);
