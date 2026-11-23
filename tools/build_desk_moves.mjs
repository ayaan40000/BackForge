/* One-off migration: copies the 8 desk & travel moves that exist only in the
   classic app's EX list into data/exercises-desk.json (backend schema), so the
   new app's library = backend/data/exercises.json + this file. */
import fs from 'fs';
const lines = fs.readFileSync(new URL('../classic/index.html', import.meta.url), 'utf8').split('\n');
const EX = lines.filter(l => l.startsWith("{id:'new-")).map(l => new Function('return ' + l.replace(/,\s*$/, ''))());
const desk = EX.filter(e => e.id.startsWith('new-')).map(e => ({
  id: e.id, name: e.n, category: 'mobility', targets: e.targets || [],
  equipment: e.band && e.band !== 'none' ? ['band'] : ['none'], dose: e.dose, level: 1,
  cues: e.cues || [], mistakes: e.mistakes || [], regression: e.reg || '', progression: e.prog || '',
  spinal_load: 'none', contra: [], tags: ['desk'],
}));
fs.writeFileSync(new URL('../data/exercises-desk.json', import.meta.url), JSON.stringify(desk, null, 1) + '\n');
console.log(desk.length, desk.map(d => d.id + ' | ' + d.dose).join('\n'));
