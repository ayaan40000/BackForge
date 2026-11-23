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
import { GSEV, combineGrades } from './posture.js';
import { available } from './kit.js';
import { daysBetween } from './dates.js';

export const PHASES = {
  reset: { label: 'Reset', what: 'The lowest-load version of what is weak: short daily doses, holds of 5–10 s, pain no higher than 3/10 and settled by next morning.', maxSets: 2, perWeek: 7 },
  control: { label: 'Control', what: 'Light activation — own the position before loading it. Quality over volume.', maxSets: 2, perWeek: 5 },
  strengthen: { label: 'Strengthen', what: 'Band and bodyweight strength and endurance, on non-consecutive days.', maxSets: 3, perWeek: 3 },
  integrate: { label: 'Integrate', what: 'Maintenance — carry the position into daily life.', maxSets: 2, perWeek: 2 },
};
export const PHASE_OF = { Priority: 'reset', Moderate: 'control', Mild: 'strengthen', Clear: 'integrate' };

/** Move menus per pattern and phase (physio review §4). Order is the prescription:
 *  the first 3 (2 in Integrate) are used; later ids are fallbacks when one is filtered out. */
export const MENU = {
  apt: {
    label: 'Anterior pelvic tilt', area: 'Pelvis & core',
    reset: ['pelvictilt', 'hipflexorstretch', 'breathing360', 'kneechest'],
    control: ['pelvictilt', 'deadbug', 'hipflexorstretch', 'new-seated-pelvic-tilt'],
    strengthen: ['deadbug', 'pallof', 'sideplank', 'birddog'],
    integrate: ['pallof', 'new-standing-glute-tilt', 'hiphinge'],
  },
  hips: {
    label: 'Hip rotation & glutes', area: 'Hips & glutes',
    reset: ['new-seated-desk-hip-ir', 'hipir9090', 'clamshell', 'adductorsqueeze'],
    control: ['seatedhipir', 'clamshell', 'glutebridge', 'sidelieabduction'],
    strengthen: ['singlebridge', 'sidesteps', 'ir9090liftoff', 'standinghipir'],
    integrate: ['stepup', 'standinghipir', 'pullthrough'],
  },
  // duck feet (feet turned out + weak hip IR): physio syllabus §2.3 — used instead of `hips` when indicated
  hipsDuck: {
    label: 'Hip rotation & glutes', area: 'Hips & glutes',
    reset: ['hip-ir-iso-wall', 'new-seated-desk-hip-ir', 'quadruped-hip-ir-rock', 'short-foot-tripod', 'hipir9090', 'clamshell'],
    control: ['seatedhipir', 'ir9090-pin-iso', 'bridge-toe-in', 'sidelying-hip-ir-lift', 'clamshell', 'glutebridge'],
    strengthen: ['seated-hip-ir-band-slow', 'ir9090liftoff', 'monster-walk', 'sidelying-hip-ir-lift', 'singlebridge', 'standinghipir'],
    integrate: ['hip-airplane-supported', 'gait-line-drill', 'step-down-eccentric', 'standinghipir', 'stepup'],
  },
  head: {
    label: 'Forward head', area: 'Head & neck',
    reset: ['chintuck', 'deepneckflexor', 'doorwaychest'],
    control: ['deepneckflexor', 'chintuck', 'wallslide'],
    strengthen: ['deepneckflexor', 'facepull', 'row'],
    integrate: ['chintuck', 'new-seated-scap-pinch'],
  },
  back: {
    label: 'Hunched upper back', area: 'Upper back',
    reset: ['openbook', 'catcamel', 'breathing360'],
    control: ['openbook', 'wallslide', 'new-standing-wall-reset'],
    strengthen: ['row', 'wallslide', 'openbook'],
    integrate: ['row', 'new-standing-wall-reset'],
  },
  shoulders: {
    label: 'Rounded shoulders', area: 'Shoulders',
    reset: ['doorwaychest', 'new-seated-scap-pinch', 'wallslide'],
    control: ['pullapart', 'wallslide', 'doorwaychest'],
    strengthen: ['row', 'facepull', 'pullapart'],
    integrate: ['facepull', 'new-standing-wall-reset'],
  },
};

/** Pattern grades: the latest posture check wins; otherwise derive from movement findings. */
export function patternGrades(S) {
  const checks = S.posture?.bandChecks || [];
  const last = checks[checks.length - 1];
  const out = {}, source = {};
  if (last?.summary) for (const p of Object.keys(MENU).filter(k => k !== 'hipsDuck')) if (last.summary[p]) { out[p] = last.summary[p]; source[p] = 'check'; }
  // checks from before v4.7 graded hip IR + glute med under 'apt': rebuild the hips grade from those two tests
  if (last?.grades && !out.hips) { const g = combineGrades([last.grades['hip-ir-band'], last.grades['glutemed-wall'], last.grades['hip-ir-strength'], last.grades['foot-angle']]); if (g) { out.hips = g; source.hips = 'check'; } }
  // classic (v4.0) checks have only apt/upper: map upper onto head + shoulders
  if (last?.summary && !last.v) { if (!out.head && last.summary.upper) { out.head = last.summary.upper; source.head = 'check'; } if (!out.shoulders && last.summary.upper) { out.shoulders = last.summary.upper; source.shoulders = 'check'; } }
  const t = (S.results || []).map(f => f.t).join(' | ');
  const derive = (p, re) => { if (!out[p] && re.test(t)) { out[p] = 'Moderate'; source[p] = 'assessment'; } };
  derive('apt', /Anterior pelvic tilt/i); derive('head', /Forward-head/i); derive('shoulders', /rounded shoulders/i); derive('hips', /Glute inhibition|internal rotation (deficit|weakness)|Feet turn out/i);
  return { grades: out, source, last, phases: last?.phases || {} };
}

/**
 * Form ratings → per-move mode (physio review §5). Only ratings logged after the
 * move's last change count. 'shaky' is neutral.
 *  regress  — 2 of the last 3 are 'hard', or the last is 'hard' and that day's
 *             post-session pain was ≥ 1 point above the morning check-in.
 *  progress — the last 3 are 'clean', on ≥ 2 different days, ≥ 7 days since the
 *             last change, no check-in pain ≥ 4 on those days, and the pattern is not Priority.
 *  A regressed move that then meets the progress rule returns to normal (null).
 * @returns {'regress'|'progress'|null}
 */
export function formMode(id, { formLog = [], state = {}, checkins = [], log = [], priority = false, today }) {
  const prev = state[id] || { mode: null, changedAt: null };
  const r = formLog.filter(x => x.id === id && (!prev.changedAt || x.date > prev.changedAt)).slice(-3);
  const painOn = d => checkins.find(c => c.date === d)?.pain;
  const hard = r.filter(x => x.r === 'hard').length;
  const last = r[r.length - 1];
  const painRose = last && last.r === 'hard' && (() => { const pre = painOn(last.date), post = [...log].reverse().find(l => l.date === last.date)?.pain; return pre != null && post != null && post - pre >= 1; })();
  if (hard >= 2 || painRose) return 'regress';
  const since = prev.changedAt || (formLog.find(x => x.id === id)?.date ?? null);
  const daysSince = since && today ? Math.round((Date.parse(today) - Date.parse(since)) / 864e5) : 0;
  const okProgress = r.length === 3 && r.every(x => x.r === 'clean') && new Set(r.map(x => x.date)).size >= 2 && daysSince >= 7 && r.every(x => (painOn(x.date) ?? 0) < 4) && !priority;
  if (okProgress) return prev.mode === 'regress' ? null : 'progress';
  return prev.mode;
}
/** Back-compat helper used by older callers/tests: mode from ratings alone. */
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
  const { grades, source, last, phases } = patternGrades(S);
  const formLog = S.posture?.formLog || [], formState = S.posture?.formState || {};
  // deficit side from the banded IR test, else from the movement-assessment finding
  const irIn = last?.inputs?.['hip-ir-band'];
  const side = irIn && irIn.rR != null && irIn.rL != null && +irIn.rR !== +irIn.rL ? (+irIn.rR < +irIn.rL ? 'Right' : 'Left')
    : (() => { const q = last?.inputs?.['hip-ir-strength']; return q && q.R != null && q.L != null && +q.R !== +q.L ? (+q.R < +q.L ? 'Right' : 'Left') : null; })()
    || (ctx.has('Right hip internal') ? 'Right' : ctx.has('Left hip internal') ? 'Left' : null);
  const irPriority = last?.grades?.['hip-ir-band'] === 'Priority' || last?.grades?.['hip-ir-strength'] === 'Priority';
  const fa = last?.grades?.['foot-angle'], straightEasy = last?.inputs?.['foot-angle']?.straight === 'easy';
  const duck = GSEV[fa] >= 1 || GSEV[last?.grades?.['hip-ir-strength']] >= 2 || ctx.has('Feet turn out');
  const extInt = ctx.flags.has('extension-intolerant');
  const patterns = Object.entries(grades)
    .map(([key, grade]) => {
      const phase = phases[key] && source[key] === 'check' ? phases[key] : PHASE_OF[grade];
      const menu = key === 'hips' && duck ? { ...MENU.hipsDuck, label: 'Hip rotation & duck feet' } : MENU[key];
      const ids = menu[phase].filter(id => !(id === 'ir9090liftoff' && irPriority)).map(id => (!straightEasy && duck && id === 'bridge-toe-in' ? 'bridge-block-squeeze' : id)).filter(id => !(duck && !straightEasy && fa && id === 'gait-line-drill'));
      const moves = ids.map(id => lib.safeGet(id, ctx.flags)).filter(ex => ex && (!ctx.kit || available(ex, ctx.kit))).slice(0, phase === 'integrate' ? 2 : 3).map(ex => {
        let dose = capSets(ex.dose, PHASES[phase].maxSets);
        const fs = formMode(ex.id, { formLog, state: formState, checkins: ctx.checkins, log: ctx.log, priority: grade === 'Priority', today: ctx.today });
        const notes = [];
        if (fs === 'regress') { dose = capSets(dose, 2); notes.push(`Felt hard lately — easier version: ${ex.regression || 'smaller range'}`); }
        if (fs === 'progress') notes.push(`Clean on 3 ratings over 2+ days — ready for one change: add a set, then hold time, then band (${ex.progression || 'next step'})`);
        if (ex.id === 'deepneckflexor' && phase === 'reset') notes.push('Reset version: chin-tuck holds on the floor, no lift');
        if (ex.id === 'catcamel' && extInt) notes.push('Arch only back to a flat back, not past it');
        if (ex.id === 'birddog') notes.push('Leg to hip height only');
        if (ex.id === 'openbook') notes.push('Pillow between the knees, top knee pinned to the floor');
        if (key === 'hips' && side && /hip|clam|bridge|abduction|sidesteps|stepup|liftoff/.test(ex.id + ex.name.toLowerCase())) notes.push(`${side} side first, extra set on the ${side.toLowerCase()}`);
        if (key === 'apt' && ex.id === 'hipflexorstretch' && Object.values(S.answers || {}).includes('lifted-ext')) { const rf = lib.safeGet('rectusstretch', ctx.flags); if (rf) return { id: rf.id, name: rf.name, dose: capSets(rf.dose, PHASES[phase].maxSets), note: 'Tuck first, no arch (front-thigh tightness on the hip-flexor test)', form: null }; }
        return { id: ex.id, name: ex.name, dose, note: notes.join(' · ') || null, form: fs };
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
