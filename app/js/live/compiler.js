// Session compiler: a built workout (sections of {id, dose}) → a real-time
// timeline of segments the player runs second by second.
//
//   intro → [prep → work (→ switch → work) → rest]… per exercise → outro
//
// The timeline is fitted to the chosen duration by stretching/shrinking rests
// first, then adding or removing whole sets — never by changing the safety
// dose (holds and reps stay as prescribed).
import { prescribe } from '../engine/dose.js';

export const TIMING = {
  intro: 22, outro: 26, prep: 14, prepFirst: 18, switchSide: 7,
  // seconds per rep by category (concentric + eccentric at rehab tempo)
  tempo: { strength: 3.5, glute: 3, core: 3, hip: 3.5, mobility: 4, warmup: 4.5, relief: 4, cooldown: 4 },
  rest: { strength: 45, glute: 35, core: 30, hip: 25, mobility: 15, warmup: 10, relief: 12, cooldown: 10 },
  restMin: { strength: 25, glute: 20, core: 20, hip: 15, mobility: 8, warmup: 6, relief: 8, cooldown: 6 },
  restMax: { strength: 75, glute: 60, core: 60, hip: 45, mobility: 30, warmup: 20, relief: 25, cooldown: 20 },
  restBetweenExercises: 1.2, // multiplier on the set rest for the transition rest
  maxWork: 180, minWork: 15,
};

function workSeconds(rx, cat) {
  if (rx.durationSec) return rx.durationSec;
  if (rx.holdSec) return rx.holdSec;
  const tempo = (TIMING.tempo[cat] || 3.5) * (rx.slow ? 1.4 : 1);
  const per = tempo + (rx.repHoldSec || 0);
  const reps = rx.alternating && rx.perSide ? rx.reps : rx.reps;
  return Math.max(TIMING.minWork, Math.min(TIMING.maxWork, Math.round(reps * per)));
}

/** Expand one exercise into its per-set/per-side work units (no rests yet). */
export function expandExercise(lib, item, sectionTag, opts = {}) {
  const ex = lib.get(item.id);
  const cat = ex?.category || 'mobility';
  const rx = prescribe(item.dose);
  const sides = rx.perSide && !rx.alternating ? sideOrder(opts.firstSide) : [null];
  const work = workSeconds(rx, cat);
  const repSec = rx.reps ? work / rx.reps : null;
  return { item, ex, cat, rx, sides, work, repSec, sets: rx.sets, sectionTag };
}
const sideOrder = first => (first === 'left' ? ['left', 'right'] : ['right', 'left']);

function restFor(unit, scale) {
  const base = TIMING.rest[unit.cat] ?? 20;
  const r = Math.round(base * scale);
  return Math.max(TIMING.restMin[unit.cat] ?? 8, Math.min(TIMING.restMax[unit.cat] ?? 60, r));
}

function layout(units, scale) {
  const segs = [];
  let t = 0;
  const push = s => { s.start = t; t += s.sec; segs.push(s); };
  push({ type: 'intro', sec: TIMING.intro });
  units.forEach((u, ui) => {
    push({ type: 'prep', sec: ui === 0 ? TIMING.prepFirst : TIMING.prep, unit: ui });
    for (let set = 1; set <= u.sets; set++) {
      u.sides.forEach((side, si) => {
        if (si > 0) push({ type: 'switch', sec: TIMING.switchSide, unit: ui, set, side });
        push({ type: 'work', sec: u.work, unit: ui, set, side });
      });
      const lastSet = set === u.sets, lastUnit = ui === units.length - 1;
      if (!lastSet) push({ type: 'rest', sec: restFor(u, scale), unit: ui, set, between: false });
      else if (!lastUnit) {
        const tag = u.sectionTag, nextTag = units[ui + 1].sectionTag;
        const r = tag === 'main' && nextTag === 'main' ? Math.round(restFor(u, scale) * TIMING.restBetweenExercises) : Math.max(8, Math.round(restFor(u, scale) * 0.6));
        push({ type: 'rest', sec: Math.min(r, 90), unit: ui, set, between: true });
      }
    }
  });
  push({ type: 'outro', sec: TIMING.outro });
  return { segs, total: t };
}

/**
 * @param {import('../engine/library.js').Library} lib
 * @param {{sections:{name:string, tag:string, items:{id:string,dose:string,name?:string,note?:string}[]}[]}} workout
 * @param {{targetMin:number, firstSide?:'left'|'right'}} opts
 */
export function compile(lib, workout, { targetMin, firstSide } = {}) {
  let units = [];
  for (const sec of workout.sections) for (const it of sec.items) units.push(expandExercise(lib, it, sec.tag, { firstSide }));
  const target = Math.max(3, targetMin || 20) * 60;
  let scale = 1, out = layout(units, scale);
  // 1) shrink/stretch rests (binary search on scale)
  let lo = 0.2, hi = 2.2;
  for (let i = 0; i < 18; i++) { scale = (lo + hi) / 2; out = layout(units, scale); if (out.total > target) hi = scale; else lo = scale; }
  out = layout(units, scale = lo);
  // 2) still too long → drop a set from main exercises (last first), then drop exercises (keep ≥ 2 main)
  const mains = () => units.filter(u => u.sectionTag === 'main');
  let guard = 60;
  while (out.total > target * 1.04 && guard--) {
    const cand = [...mains()].reverse().find(u => u.sets > 1) || [...units].reverse().find(u => u.sets > 1);
    if (cand) cand.sets--;
    else if (mains().length > 2) units.splice(units.lastIndexOf(mains().at(-1)), 1);
    else if (units.length > 2) units.splice(units.length - 2, 1);
    else break;
    out = layout(units, scale);
  }
  // 3) too short → add sets to main work (round-robin, ≤ 4 sets), then let rests breathe
  guard = 60;
  while (out.total < target * 0.9 && guard--) {
    const pool = mains().length ? mains() : units;
    const cand = pool.filter(u => u.sets < 4).sort((a, b) => a.sets - b.sets)[0];
    if (!cand) break;
    cand.sets++;
    const next = layout(units, scale);
    if (next.total > target * 1.04) { cand.sets--; break; }
    out = next;
  }
  lo = 0.2; hi = 2.2;
  for (let i = 0; i < 18; i++) { const s = (lo + hi) / 2; const o = layout(units, s); if (o.total > target) hi = s; else lo = s; }
  out = layout(units, lo);

  // decorate segments with what the UI + coach need
  const exCount = units.length;
  out.segs.forEach((s, i) => {
    s.i = i;
    if (s.unit != null) {
      const u = units[s.unit];
      Object.assign(s, {
        exId: u.item.id, name: u.item.name || u.ex?.name || u.item.id, dose: u.item.dose, note: u.item.note || null,
        section: u.sectionTag, sets: u.sets, sides: u.sides, reps: u.rx.reps, holdSec: u.rx.holdSec || u.rx.durationSec || null,
        repHoldSec: u.rx.repHoldSec, repSec: u.repSec, alternating: u.rx.alternating, exIndex: s.unit, exCount,
        setupCue: u.ex?.coach?.setupCue || '', focusCue: u.ex?.coach?.focusCue || '', glyph: u.ex?.category || 'mobility',
        cues: u.ex?.cues || [], mistakes: u.ex?.mistakes || [], regression: u.ex?.regression || '', category: u.cat,
      });
    }
  });
  return { segments: out.segs, totalSec: out.total, units: units.map(u => ({ id: u.item.id, name: u.item.name || u.ex?.name, sets: u.sets, section: u.sectionTag, dose: u.item.dose })), targetSec: target };
}

/** Where are we? Binary search the segment at elapsed seconds. */
export function locate(timeline, elapsed) {
  const segs = timeline.segments;
  let lo = 0, hi = segs.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (segs[mid].start <= elapsed) lo = mid; else hi = mid - 1; }
  const seg = segs[lo];
  return { seg, index: lo, into: Math.max(0, elapsed - seg.start), left: Math.max(0, seg.start + seg.sec - elapsed) };
}

/** Recompute starts after an in-session edit (e.g. +15 s rest, regression). */
export function reflow(timeline) {
  let t = 0;
  for (const s of timeline.segments) { s.start = t; t += s.sec; }
  timeline.totalSec = t;
  return timeline;
}
