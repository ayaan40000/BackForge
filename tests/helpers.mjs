import fs from 'fs';
const R = p => new URL('../' + p, import.meta.url);
export const json = p => JSON.parse(fs.readFileSync(R(p), 'utf8'));
export const { Library } = await import(R('app/js/engine/library.js'));
export const lib = new Library([...json('backend/data/exercises.json'), ...json('data/exercises-desk.json')], json('data/coaching.json').exercises);
export const lines = json('data/voice-lines.json');
export const AYAAN = [
  { t: 'Extension-intolerant pattern', sev: 'high' }, { t: 'Right glute inhibition', sev: 'high' },
  { t: 'Anterior pelvic tilt (lower-crossed)', sev: 'high' }, { t: 'Right hip internal rotation deficit', sev: 'high' },
  { t: 'Lateral endurance gap', sev: 'mod' }, { t: 'Forward-head / rounded shoulders', sev: 'mod' },
];
