// Weekly plan + today's session. Port of backend/app/engine/plan.py (and classic sessionExercises()).
import { weekday } from './dates.js';
export const STRENGTH = {
  A: { name: 'Strength A — Lower body + pull', ex: [['glutebridge', '3 × 20'], ['wallsquat', '3 × 12'], ['row', '3 × 12'], ['singlebridge', '3 × 12 / side'], ['pallof', '3 × 10 / side']] },
  B: { name: 'Strength B — Hinge + scapular', ex: [['hiphinge', '3 × 8 dowel'], ['pullthrough', '3 × 15'], ['facepull', '3 × 15'], ['pullapart', '3 × 15'], ['sideplank', '3 × 30 sec / side']] },
  C: { name: 'Strength C — Volume + posture', ex: [['sidesteps', '3 × 12 / side'], ['clamshell', '3 × 15 / side'], ['deadbug', '3 × 8 / side'], ['chintuck', '3 × 10'], ['march9090', '2 × 8 / side']] },
};
export const WEEK = [['Mon', 'A'], ['Tue', 'cardio'], ['Wed', 'B'], ['Thu', 'cardio'], ['Fri', 'C'], ['Sat', 'cardio'], ['Sun', 'rest']];
// v4.0 rule: no side-bend (qlreach) in the flare protocol — side flexion can trigger this user's spasms.
export const FLARE_ITEMS = [['kneechest', '8 alternating · 20-sec holds'], ['figure4', '30 sec / side'], ['catcamel', '6 slow cycles'], ['breathing360', '2 × 6 breaths']];

export const flareActive = ctx => { const c = ctx.todaysCheckin(); return !!c && (c.pain || 0) >= 7; };
export function recoveryTune(ctx) {
  const c = ctx.todaysCheckin(); if (!c) return null;
  const p = c.pain || 0;
  if (p >= 7) return { load: 'Flare day', note: 'Pain 7+. Relief protocol only — gentle mobility, no strength work. This is the plan working, not a day off.' };
  if (p >= 5) return { load: 'Micro + foundation', note: 'Pain 5–6. Foundation plus the micro version. Modify, don’t stop.' };
  if (c.sleep === 'poor') return { load: 'Full, minus top set', note: 'Poor sleep drops tissue tolerance. Keep the session, drop the hardest set.' };
  return { load: 'Full session', note: 'Check-in looks steady. Full session as planned.' };
}
export const todayKind = ctx => WEEK[weekday(ctx.today)][1];
export const weekPlan = () => WEEK.map(([day, kind]) => ({ day, kind, label: kind === 'cardio' ? 'Zone 2 cardio' : kind === 'rest' ? 'Rest — foundation only' : 'Strength ' + kind }));

function resolve(lib, ctx, pairs) {
  return pairs.map(([id, dose]) => { const ex = lib.safeGet(id, ctx.flags); return ex && { id, name: ex.name, dose, bandLevel: ctx.bandLevel[id] || 1 }; }).filter(Boolean);
}
export function sessionExercises(lib, ctx) {
  const kind = todayKind(ctx), tune = recoveryTune(ctx);
  if (flareActive(ctx)) return { title: 'Flare protocol — Back & Hip Relief', kind: 'flare', items: resolve(lib, ctx, FLARE_ITEMS) };
  if (kind === 'rest') return { title: 'Rest day — daily foundation', kind: 'rest', items: null };
  if (kind === 'cardio') return { title: 'Zone 2 cardio', kind: 'cardio', items: null, note: 'Elliptical 25–30 min at 120–135 bpm, or treadmill 30–35 min at 3.5–4.2 mph, 2–4% incline.' };
  const micro = !!tune && tune.load.includes('Micro');
  const s = STRENGTH[kind];
  const pairs = (micro ? s.ex.slice(0, 2).map(([id]) => [id, '1 set only']) : s.ex).map(([id, dose]) => {
    const sw = ctx.swaps[id];
    return sw && sw.date === ctx.today && lib.get(sw.to) ? [sw.to, dose + ' · swapped in'] : [id, dose];
  });
  return { title: s.name + (micro ? ' — MICRO version' : ''), kind: 'strength', letter: kind, items: resolve(lib, ctx, pairs) };
}
