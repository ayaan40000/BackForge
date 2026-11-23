/* One-off migration (kept for reference): pulls the v4.0 exercise extras
   (helps, muscles, postureFix, gotIt, videos, contexts) out of
   classic/index.html into data/coaching.json, keyed by the ids in
   backend/data/exercises.json. Run: node tools/build_coaching.mjs
   After this, data/coaching.json is the source of truth — edit it by hand. */
import fs from 'fs';
const html = fs.readFileSync(new URL('../classic/index.html', import.meta.url), 'utf8').split('\n');
const src = html.slice(1840, 1883).join('\n'); // YTS + const EXDB={...};
const EXDB = new Function(src + '\nreturn EXDB;')();
const lib = JSON.parse(fs.readFileSync(new URL('../backend/data/exercises.json', import.meta.url), 'utf8'));
const ids = new Set(lib.map(e => e.id));
const out = {};
let hit = 0, miss = [];
for (const [id, x] of Object.entries(EXDB)) {
  if (!ids.has(id)) { miss.push(id); }
  out[id] = {
    helps: x.helps || '', muscles: x.muscles || '', postureFix: x.postureFix || '',
    gotIt: x.gotIt || '', holdTarget: x.holdTarget || 0, bandTarget: x.bandTarget || 'none',
    contexts: x.contexts || ['home'],
    videos: (x.vids || []).map(v => ({ channel: v.ch, type: v.type, url: v.url })),
  };
  hit++;
}
console.log('extras', hit, 'not in backend library:', miss.join(', ') || 'none');
console.log('backend ids without extras:', [...ids].filter(i => !out[i]).join(', '));
const prev = fs.existsSync(new URL('../data/coaching.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/coaching.json', import.meta.url))) : null;
const doc = { _about: 'Per-exercise coaching extras for the app. Keyed by backend/data/exercises.json id. See AGENTS.md > Add an exercise.', exercises: out };
if (prev) for (const [id, v] of Object.entries(prev.exercises || {})) doc.exercises[id] = { ...doc.exercises[id], ...v };
fs.writeFileSync(new URL('../data/coaching.json', import.meta.url), JSON.stringify(doc, null, 1) + '\n');
