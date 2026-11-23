/* Lists EVERY sentence the Live coach can say, so a neural voice can pre-record
   them (tools/render_voice.py). Sentences, not whole lines: the player splits a
   line into sentences and plays one clip per sentence.
   Run: node tools/voice_corpus.mjs > /tmp/corpus.json   (prints {count, sentences}) */
import fs from 'fs';
const R = p => new URL('../' + p, import.meta.url);
const J = p => (fs.existsSync(R(p)) ? JSON.parse(fs.readFileSync(R(p), 'utf8')) : null);
const { fill, doseText } = await import(R('app/js/live/coach.js'));
const { prescribe } = await import(R('app/js/engine/dose.js'));
const { splitSentences } = await import(R('app/js/live/sentences.js'));
const lines = J('data/voice-lines.json');
const ex = [...J('backend/data/exercises.json'), ...J('data/exercises-desk.json'), ...(J('data/exercises-extra.json') || [])];
const coach = { ...J('data/coaching.json').exercises };
for (const e of ex) coach[e.id] = { ...(coach[e.id] || {}), ...(e.setupCue ? { setupCue: e.setupCue } : {}), ...(e.focusCue ? { focusCue: e.focusCue } : {}) };
const out = new Set();
const add = t => { for (const s of splitSentences(t || '')) if (s && /[a-z0-9]/i.test(s)) out.add(s); };
const range = (a, b, st = 1) => Array.from({ length: Math.floor((b - a) / st) + 1 }, (_, i) => a + i * st);
const holds = new Set(), reps = new Set();
for (const e of ex) { const p = prescribe(e.dose); if (p.holdSec) holds.add(p.holdSec); if (p.durationSec) holds.add(p.durationSec); if (p.reps) reps.add(p.reps); }
const D = {
  side: ['left', 'right'], otherSide: ['left', 'right'], weakSide: ['left', 'right'], Side: ['Left', 'Right'],
  set: range(1, 4), sets: range(1, 4), reps: [...reps], sec: [...holds], longest: [...holds],
  minutes: range(5, 60, 5), minsLeft: range(1, 60), moves: range(1, 20), pain: range(0, 10), rest: range(5, 120),
  sleepPhrase: ['a short night', 'a solid night'], loadPhrase: ['a full session', 'a steady session', 'a lighter session', 'a gentle relief session'],
  name: ['Ayaan'], goal: [],
};
const EX_KEYS = ['ex', 'setupCue', 'focusCue', 'cue', 'regression'], NEXT_KEYS = ['next', 'nextSetup'];
const exVars = e => { const c = coach[e.id] || {}, p = prescribe(e.dose); return { _reps: p.reps, _sec: p.holdSec || p.durationSec, ex: e.name, setupCue: c.setupCue || e.cues[0] || '', focusCue: c.focusCue || e.cues[1] || e.cues[0] || '', cue: e.cues[2] || e.cues[1] || '', regression: (e.regression || '').replace(/\.$/, '').toLowerCase() }; };
function expand(tpl) {
  const keys = [...new Set([...tpl.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort((a, b) => (a === 'sets' ? -1 : b === 'sets' ? 1 : 0));
  let envs = [{}];
  if (keys.some(k => EX_KEYS.includes(k))) envs = ex.map(exVars);
  if (keys.some(k => NEXT_KEYS.includes(k))) envs = envs.flatMap(v => ex.map(e => ({ ...v, next: e.name, nextSetup: coach[e.id]?.setupCue || e.cues[0] || '' })));
  for (const k of keys) if (!EX_KEYS.includes(k) && !NEXT_KEYS.includes(k)) envs = envs.flatMap(v => {
    // an exercise's own reps / hold, not every number
    if (k === 'reps' && v._reps != null) return [{ ...v, reps: v._reps }];
    if ((k === 'sec' || k === 'longest') && v._sec != null) return [{ ...v, [k]: v._sec }];
    if (k === 'set' && v.sets != null) return range(1, v.sets).map(x => ({ ...v, set: x }));
    return (D[k] || []).map(x => ({ ...v, [k]: x }));
  });
  for (const v of envs) { if (v.set != null && v.sets != null && v.set > v.sets) continue; const t = fill(tpl, v); if (t) add(t); }
}
for (const [k, v] of Object.entries(lines)) {
  if (k.startsWith('_')) continue;
  const pools = Array.isArray(v) ? [v] : Object.values(v);
  for (const pool of pools) {
    // exercise-specific templates multiply by the whole library: record the first 3 variants only.
    // In voice-pack mode the coach picks among recorded lines (makePicker `covers`).
    let exT = 0;
    for (const tpl of pool) { const exy = /\{(ex|next|setupCue|focusCue|cue|nextSetup|regression)\}/.test(tpl); if (exy && exT++ >= 3) continue; for (const st of splitSentences(tpl)) expand(st); }
  }
}
// code-built sentences (coach.js): doses, setup cues as sentences, counting, side switch prompts
const sentence = s => { s = (s || '').replace(/\s*[—–]\s*/g, ', ').replace(/[.\s]+$/, ''); return s ? s[0].toUpperCase() + s.slice(1) + '.' : ''; };
for (const e of ex) {
  const p = prescribe(e.dose), c = coach[e.id] || {};
  for (const sets of range(1, 4)) add(doseText({ ...p, sets, sides: p.perSide && !p.alternating ? ['right', 'left'] : [null], holdSec: p.holdSec || p.durationSec || null }));
  add(sentence(c.setupCue || e.cues[0]));
}
for (const n of ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']) add(n);
add('Two more.'); add('Last one.');
// plan / caveat notes spoken in the briefing (engine/corrective.js, engine/live.js)
for (const n of ['Reset version: chin-tuck holds on the floor, no lift', 'Arch only back to a flat back, not past it', 'Leg to hip height only', 'Pillow between the knees, top knee pinned to the floor', 'Right side first, extra set on the right', 'Left side first, extra set on the left', 'Tuck first, no arch (front-thigh tightness on the hip-flexor test)', 'Easy on the right side today', 'Easy on the left side today']) add(sentence(n));
for (const e of ex) { add(sentence(`Felt hard lately — easier version: ${e.regression || 'smaller range'}`)); add(sentence(`Clean on 3 ratings over 2+ days — ready for one change: add a set, then hold time, then band (${e.progression || 'next step'})`)); }
const sentences = [...out].sort();
process.stdout.write(JSON.stringify({ count: sentences.length, sentences }, null, 0));
