// Exercise library + the safety layer. Port of backend/app/exercises.py.
// Every exercise the app serves goes through safeGet(); never bypass it.
// anything that adds external load counts (physio syllabus §4)
const LOAD_EQUIPMENT = new Set(['band', 'mini-band', 'dumbbell', 'kettlebell', 'cable', 'ab-wheel', 'tube-band', 'stability-ball', 'slider']);
const BAND_EQUIPMENT = new Set(['band', 'mini-band']);
const BOTH_KNEES = /(both|double)[-_ ]?knees?/i;

export const isLoaded = ex => ex.category === 'strength' || (ex.equipment || []).some(e => LOAD_EQUIPMENT.has(e));
export const hasBand = ex => (ex.equipment || []).some(e => BAND_EQUIPMENT.has(e));
export const isBothKneesToChest = ex =>
  (BOTH_KNEES.test(ex.name || '') && /chest/i.test(ex.name || '')) ||
  /^(both|double)knees?tochest$/i.test(String(ex.id || '').replace(/[-_]/g, ''));

/** null if the exercise may be served, else a plain reason. */
export function exclusionReason(ex, flags) {
  if (isBothKneesToChest(ex)) return 'both-knees-to-chest is banned in this program';
  const load = ex.spinal_load || 'none';
  if ((load === 'flexion' || load === 'rotation') && isLoaded(ex)) return `loaded spinal ${load} is never served`;
  const hit = (ex.contra || []).filter(c => flags.has(c));
  if (hit.length) return 'contraindicated for profile: ' + hit.sort().join(', ');
  if (flags.has('extension-intolerant') && load === 'extension') return 'spinal extension excluded for extension-intolerant profile';
  return null;
}

export function normalise(ex) {
  return {
    targets: [], equipment: ['none'], level: 1, cues: [], mistakes: [], regression: '', progression: '',
    spinal_load: 'none', contra: [], ...ex,
  };
}

export class Library {
  /** @param {object[]} exercises backend schema  @param {Record<string,object>} coaching data/coaching.json .exercises */
  constructor(exercises, coaching = {}) {
    this.all = exercises.map(e => ({ ...normalise(e), coach: coaching[e.id] || {} }));
    this.byId = Object.fromEntries(this.all.map(e => [e.id, e]));
  }
  get(id) { return this.byId[id] || null; }
  allowed(flags) { return this.all.filter(e => !exclusionReason(e, flags)); }
  safeGet(id, flags) { const e = this.byId[id]; return e && !exclusionReason(e, flags) ? e : null; }
}
