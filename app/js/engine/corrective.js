// Corrective posture plan: turns posture-check grades (and movement-assessment
// findings when there is no posture check yet) into a phased program per
// pattern, built from band + bodyweight moves in the safety-filtered library.
//
// Phase follows the grade — the weaker the pattern, the earlier the phase:
//   Priority → Reset (mobility + breathing, unloaded)   Moderate → Control (activation, light band)
//   Mild → Strengthen (band strength, more sets)          Clear → Integrate (maintenance, standing/daily life)
// Retests move a pattern forward (or back) a phase. Form ratings logged in Live
// sessions regress a move that keeps feeling hard and flag one that's ready to progress.
import { capSets } from './dose.js';
import { GSEV } from './posture.js';
import { daysBetween } from './dates.js';

export const PHASES = {
  reset: { label: 'Reset', what: 'Unloaded mobility and breathing to restore range.', maxSets: 2, perWeek: 7 },
  control: { label: 'Control', what: 'Light activation — own the position before loading it.', maxSets: 2, perWeek: 6 },
  strengthen: { label: 'Strengthen', what: 'Band strength and endurance for the weak links.', maxSets: 3, perWeek: 4 },
  integrate: { label: 'Integrate', what: 'Maintenance — carry the position into daily life.', maxSets: 2, perWeek: 2 },
};
export const PHASE_OF = { Priority: 'reset', Moderate: 'control', Mild: 'strengthen', Clear: 'integrate' };

/** Move menus per pattern and phase (ids from the library; unsafe ids are filtered out per profile). */
export const MENU = {
  apt: {
    label: 'Anterior pelvic tilt', area: 'Pelvis & core',
    reset: ['breathing360', 'pelvictilt', 'hipflexorstretch', 'kneechest'],
    control: ['pelvictilt', 'deadbug', 'glutebridge', 'hipflexorstretch', 'clamshell'],
    strengthen: ['glutebridge', 'deadbug', 'singlebridge', 'pallof', 'sidesteps'],
    integrate: ['hiphinge', 'pallof', 'new-standing-glute-tilt', 'pullthrough'],
  },
  head: {
    label: 'Forward head', area: 'Head & neck',
    reset: ['chintuck', 'breathing360', 'doorwaychest'],
    control: ['chintuck', 'deepneckflexor', 'wallangel'],
    strengthen: ['deepneckflexor', 'chintuck', 'facepull', 'row'],
    integrate: ['new-seated-scap-pinch', 'chintuck', 'facepull'],
  },
  back: {
    label: 'Hunched upper back', area: 'Upper back',
    reset: ['openbook', 'catcamel', 'new-seated-thoracic-opener', 'breathing360'],
    control: ['openbook', 'wallslide', 'wallangel'],
    strengthen: ['row', 'wallslide', 'pullapart', 'openbook'],
    integrate: ['new-standing-wall-reset', 'row', 'facepull'],
  },
  shoulders: {
    label: 'Rounded shoulders', area: 'Shoulders',
    reset: ['doorwaychest', 'new-standing-chest-opener', 'openbook'],
    control: ['pullapart', 'wallslide', 'new-seated-scap-pinch', 'doorwaychest'],
    strengthen: ['facepull', 'row', 'pullapart'],
    integrate: ['facepull', 'row', 'new-standing-wall-reset'],
  },
};

/** Pattern grades: the latest posture check wins; otherwise derive from movement findings. */
export function patternGrades(S) {
  const checks = S.posture?.bandChecks || [];
  const last = checks[checks.length - 1];
  const out = {}, source = {};
  if (last?.summary) for (const p of Object.keys(MENU)) if (last.summary[p]) { out[p] = last.summary[p]; source[p] = 'check'; }
  // classic (v4.0) checks have only apt/upper: map upper onto head + shoulders
  if (last?.summary && !last.v) { if (!out.head && last.summary.upper) { out.head = last.summary.upper; source.head = 'check'; } if (!out.shoulders && last.summary.upper) { out.shoulders = last.summary.upper; source.shoulders = 'check'; } }
  const t = (S.results || []).map(f => f.t).join(' | ');
  const derive = (p, re) => { if (!out[p] && re.test(t)) { out[p] = 'Moderate'; source[p] = 'assessment'; } };
  derive('apt', /Anterior pelvic tilt/i); derive('head', /Forward-head/i); derive('shoulders', /rounded shoulders/i);
  return { grades: out, source, last };
}

/** Form log → per-exercise adjustment. ratings: 'clean' | 'shaky' | 'hard'. */
export function formStatus(formLog = [], id) {
  const r = formLog.filter(x => x.id === id).slice(-3).map(x => x.r);
  if (r.filter(x => x === 'hard').length >= 2) return 'regress';
  if (r.length === 3 && r.every(x => x === 'clean')) return 'progress';
  return r.length ? 'steady' : null;
}

/**
 * @returns {{patterns: Array, hasData: boolean, retest: string|null}}
 */
export function buildCorrectivePlan(lib, ctx, S) {
  const { grades, source, last } = patternGrades(S);
  const formLog = S.posture?.formLog || [];
  const patterns = Object.entries(grades)
    .map(([key, grade]) => {
      const phase = PHASE_OF[grade];
      const menu = MENU[key];
      const moves = menu[phase].map(id => lib.safeGet(id, ctx.flags)).filter(Boolean).slice(0, phase === 'integrate' ? 2 : 3).map(ex => {
        let dose = capSets(ex.dose, PHASES[phase].maxSets);
        const fs = formStatus(formLog, ex.id);
        let note = null;
        if (fs === 'regress') { dose = capSets(dose, 1); note = `Felt hard twice lately — easier version: ${ex.regression || 'smaller range'}`; }
        if (fs === 'progress') note = `Three clean sets in a row — ready to progress: ${ex.progression || 'add a set'}`;
        return { id: ex.id, name: ex.name, dose, note, form: fs };
      });
      const prevChecks = (S.posture?.bandChecks || []).filter(c => c.summary?.[key]);
      const before = prevChecks.length > 1 ? prevChecks[prevChecks.length - 2].summary[key] : null;
      const trend = before == null ? null : GSEV[grade] < GSEV[before] ? 'better' : GSEV[grade] > GSEV[before] ? 'worse' : 'same';
      return { key, label: menu.label, area: menu.area, grade, phase, phaseLabel: PHASES[phase].label, phaseWhat: PHASES[phase].what, perWeek: PHASES[phase].perWeek, source: source[key], moves, before, trend };
    })
    .sort((a, b) => GSEV[b.grade] - GSEV[a.grade]);
  const retest = last ? (Object.values(last.grades || {}).includes('Priority') ? 14 : 28) : null;
  return {
    patterns, hasData: patterns.length > 0, lastCheck: last?.date || null,
    retestIn: last ? Math.max(0, retest - daysBetween(last.date, ctx.today)) : null,
    focus: patterns.filter(p => GSEV[p.grade] >= 1),
  };
}

/** A Live workout (same shape as buildLive) for the posture plan — run by the voice coach. */
export function buildPostureWorkout(lib, ctx, S, { mins = 15, caveats = [] } = {}) {
  const plan = buildCorrectivePlan(lib, ctx, S);
  const focus = plan.focus.length ? plan.focus : plan.patterns;
  const seen = new Set(), main = [];
  // interleave patterns, worst first, so every weak area gets work even in a short session
  const queues = focus.map(p => [...p.moves]);
  while (queues.some(q => q.length)) for (const q of queues) { const m = q.shift(); if (m && !seen.has(m.id)) { seen.add(m.id); main.push({ id: m.id, dose: m.dose, note: m.note || undefined }); } }
  const warmIds = ['breathing360', 'catcamel'].filter(id => !seen.has(id));
  const coolIds = ['doorwaychest', 'figure4', 'chintuck', 'kneechest'].filter(id => !seen.has(id));
  const pick = ids => ids.map(id => lib.safeGet(id, ctx.flags)).filter(Boolean).map(e => ({ id: e.id, dose: e.dose, name: e.name }));
  const named = arr => arr.map(i => ({ ...i, name: lib.get(i.id)?.name || i.id }));
  let chosen = main;
  if (caveats.includes('standing')) chosen = chosen.filter(i => !/standing|wall|sidesteps|hiphinge|pullthrough/.test(i.id));
  if (caveats.includes('noband')) chosen = chosen.filter(i => !(lib.get(i.id)?.equipment || []).some(e => e === 'band' || e === 'mini-band'));
  const budget = Math.max(2, Math.round((mins - 4) / 2.6));
  chosen = chosen.slice(0, budget);
  return {
    title: `${mins}-minute posture session`, kind: 'posture', mins,
    reasons: focus.length ? focus.map(p => `${p.label}: ${p.grade} → ${p.phaseLabel} phase. ${p.phaseWhat}`) : ['Take the posture check and this session rebuilds around what is weak.'],
    sections: [
      { name: 'Warm-up', tag: 'warm', items: pick(warmIds).slice(0, mins >= 20 ? 2 : 1) },
      { name: 'Posture work', tag: 'main', items: named(chosen) },
      { name: 'Cool-down', tag: 'cool', items: pick(coolIds).slice(0, mins >= 20 ? 2 : 1) },
    ].filter(s => s.items.length),
  };
}
