// Live workout builder. Port of classic buildLiveWorkout() / backend engine/live.py.
// Output sections are then turned into a real-time timeline by ../live/compiler.js.
import { estMins, capSets } from './dose.js';
import { hasBand } from './library.js';
import { sessionExercises, flareActive, recoveryTune, STRENGTH, FLARE_ITEMS } from './plan.js';
import { streak, exerciseResponse } from './progress.js';
import { daysBetween, weekday } from './dates.js';

export const LIVE_WARM = ['catcamel', 'breathing360', 'kneechest', 'figure4', 'chintuck', 'hipflexorstretch'];
export const LIVE_COOL = ['hipflexorstretch', 'figure4', 'kneechest', 'constructiverest', 'chintuck'];
export const DESK_BLOCK = ['chintuck', 'wallangel', 'hipflexorstretch', 'pullapart', 'new-standing-glute-tilt'];
export const CAVEATS = [
  ['standing', 'Standing hurts'], ['right', 'Right side touchy'], ['left', 'Left side touchy'],
  ['knees', 'Sore knees'], ['noband', 'No bands'], ['quiet', 'Keep it quiet'],
];

export function correctivePool(ctx) {
  const out = []; const push = ids => ids.forEach(i => { if (!out.includes(i)) out.push(i); });
  if (ctx.has('internal rotation deficit') || ctx.has('rotation stiffness') || ctx.has('internal rotation limited')) push(['proneir', 'hipir9090', 'adductorsqueeze']);
  if (ctx.has('Anterior pelvic tilt')) push(['hipflexorstretch', 'deadbug']);
  if (ctx.has('Glute inhibition')) push(['clamshell', 'sidesteps']);
  if (ctx.has('Lateral endurance gap')) push(['sideplank']);
  if (ctx.has('Forward-head') || ctx.has('Rounded shoulders')) push(['facepull', 'pullapart', 'wallangel', 'chintuck']);
  if (ctx.has('Guarding')) push(['singlebridge']);
  if (!out.length) push(['clamshell', 'hipir9090']);
  return out;
}

export function applyCaveats(lib, ctx, items, caveats, energy) {
  const notes = []; let out = items.map(i => ({ ...i }));
  const drop = (ids, why) => { const n = out.length; out = out.filter(i => !ids.includes(i.id)); if (out.length < n) notes.push(why); };
  if (caveats.includes('standing')) drop(['sidesteps', 'march9090', 'wallsquat', 'pullthrough', 'hiphinge', 'new-standing-glute-tilt'], 'Floor-based today — standing work is out.');
  if (caveats.includes('knees')) { drop(['wallsquat'], 'Wall squats dropped — knees are sore.'); }
  if (caveats.includes('quiet')) drop(['pullthrough', 'wallsquat'], 'Low-key picks only — nothing that needs space or noise.');
  if (caveats.includes('noband')) {
    const removed = out.filter(i => lib.get(i.id) && hasBand(lib.get(i.id)));
    out = out.filter(i => !removed.includes(i));
    for (const r of removed) {
      const rex = lib.get(r.id);
      const alt = lib.all.find(c => !hasBand(c) && c.id !== r.id && c.targets.some(t => rex.targets.includes(t)) && !out.some(o => o.id === c.id) && lib.safeGet(c.id, ctx.flags) && !(c.equipment || []).includes('dumbbell'));
      if (alt) out.push({ id: alt.id, dose: alt.dose });
    }
    if (removed.length) notes.push(`No bands: swapped ${removed.length} band move${removed.length > 1 ? 's' : ''} for bodyweight equivalents.`);
  }
  if (energy === 'low') { out = out.map(i => ({ ...i, dose: capSets(i.dose, 2) })); notes.push('Low energy: sets capped at 2. Finishing small beats skipping.'); }
  for (const sd of ['right', 'left']) if (caveats.includes(sd)) {
    out = out.map(i => /\/\s*side/.test(i.dose) ? { ...i, dose: capSets(i.dose, 2), note: `Easy on the ${sd} side today` } : i);
    notes.push(`Gentle dosing on the ${sd} side. The other side still works.`);
  }
  return { items: out, notes };
}

const named = (lib, ctx, items) => items.map(i => { const ex = lib.safeGet(i.id, ctx.flags); return ex && { ...i, name: ex.name }; }).filter(Boolean);

/**
 * @param {{mins:number, energy:'great'|'ok'|'low'|'flare', caveats:string[], variant?:'standard'|'desk'}} opts
 */
export function buildLive(lib, ctx, { mins, energy = 'ok', caveats = [], variant = 'standard' }) {
  if (flareActive(ctx) || energy === 'flare') {
    return {
      title: 'Relief session', kind: 'flare', mins, reasons: ['Pain is at flare level, so today is the relief protocol only. This is the plan working — and it still protects the streak.'],
      sections: [{ name: 'Relief', tag: 'cool', items: named(lib, ctx, FLARE_ITEMS.map(([id, dose]) => ({ id, dose }))) }],
    };
  }
  if (variant === 'desk') {
    const items = applyCaveats(lib, ctx, DESK_BLOCK.map(id => ({ id, dose: lib.get(id)?.dose || '1 × 10' })), caveats, energy).items;
    return { title: 'Desk-day reset', kind: 'desk', mins, reasons: ['A standing posture block for a long sitting day.'], sections: [{ name: 'Reset', tag: '', items: named(lib, ctx, items) }] };
  }
  const s = sessionExercises(lib, ctx);
  let main = s.items ? s.items.map(i => ({ id: i.id, dose: i.dose })) : (() => {
    const L = ['A', 'B', 'C'][weekday(ctx.today) % 3];
    return STRENGTH[L].ex.slice(0, 3).map(([id, dose]) => ({ id, dose })).concat(['curlup', 'birddog', 'sideplank'].map(id => ({ id, dose: lib.get(id).dose })));
  })();
  const corr = correctivePool(ctx).filter(id => lib.get(id)).map(id => ({ id, dose: lib.get(id).dose }));
  let warm = LIVE_WARM.slice(0, mins >= 35 ? 3 : 2).filter(id => lib.get(id)).map(id => ({ id, dose: lib.get(id).dose }));
  let cool = LIVE_COOL.filter(id => !warm.some(w => w.id === id) && lib.get(id)).slice(0, 2).map(id => ({ id, dose: lib.get(id).dose }));
  const mixed = []; for (let i = 0; i < Math.max(main.length, corr.length); i++) { if (main[i]) mixed.push(main[i]); if (corr[i]) mixed.push(corr[i]); }
  const seen = new Set(); let dedup = mixed.filter(i => !seen.has(i.id) && seen.add(i.id));
  const resp = exerciseResponse(ctx); const rank = id => ({ helps: 0, watch: 2 }[resp[id]?.verdict] ?? 1);
  dedup.sort((a, b) => rank(a.id) - rank(b.id));
  const cv = applyCaveats(lib, ctx, dedup, caveats, energy);
  const wc = applyCaveats(lib, ctx, warm, caveats, energy), cc = applyCaveats(lib, ctx, cool, caveats, energy);
  warm = wc.items; cool = cc.items;
  let chosen = [];
  if (mins <= 6) { chosen = cv.items.slice(0, 2); warm = warm.slice(0, 1); cool = cool.slice(0, 1); }
  else { let acc = [...warm, ...cool].reduce((a, i) => a + estMins(i.dose), 0); for (const it of cv.items) { const e = estMins(it.dose); if (acc + e > mins && chosen.length >= 3) break; chosen.push(it); acc += e; } }
  { const used = new Set(chosen.map(i => i.id)); const pool = LIVE_COOL.filter(id => !warm.some(w => w.id === id) && !used.has(id) && lib.get(id)); cool = applyCaveats(lib, ctx, pool.slice(0, mins <= 6 ? 1 : 2).map(id => ({ id, dose: lib.get(id).dose })), caveats, energy).items; }
  if (ctx.deloadUntil && ctx.deloadUntil >= ctx.today) { if (chosen.length > 3) chosen = chosen.slice(0, -1); chosen = chosen.map(i => ({ ...i, dose: capSets(i.dose, 2) })); }

  const reasons = [];
  reasons.push(`Built for a ${s.kind === 'strength' ? s.title : s.kind === 'cardio' ? 'Zone 2 day — strength sampler' : 'rest day — foundation strength'} shape, sized to ${mins} minutes.`);
  const act = ctx.findings.filter(f => f.sev !== 'ok');
  if (act.length) {
    const keyOf = t => { const f = t.toLowerCase(); return f.includes('rotation') ? 'hip-ir' : f.includes('glute') ? 'glute-weak' : f.includes('tilt') ? 'apt' : f.includes('lateral') ? 'lateral-gap' : f.includes('head') || f.includes('shoulder') ? 'upper-crossed' : ''; };
    let f = act[0], hit = null;
    for (const c of act) { const k = keyOf(c.t); if (!k) continue; const h = chosen.find(i => lib.get(i.id)?.targets.includes(k)); if (h) { f = c; hit = h; break; } }
    reasons.push(`${f.t} is a ${f.sev === 'high' ? 'Priority' : 'Watch'} finding${hit ? ` — ${lib.get(hit.id).name} targets it directly.` : '.'}`);
  } else reasons.push('Starter mix — take the assessment and this rebuilds around your findings.');
  const last = {}; for (const x of ctx.exLog) if (!last[x.id] || x.date > last[x.id]) last[x.id] = x.date;
  const due = chosen.map(i => ({ i, d: last[i.id] ? daysBetween(last[i.id], ctx.today) : null })).sort((a, b) => (b.d ?? 999) - (a.d ?? 999))[0];
  if (due) reasons.push(due.d == null ? `${lib.get(due.i.id).name} is new to your log — first reps teach the pattern.` : `You last did ${lib.get(due.i.id).name} ${due.d} day${due.d === 1 ? '' : 's'} ago — it was due.`);
  const tune = recoveryTune(ctx); if (tune) reasons.push(`Today's check-in set the load: ${tune.load}.`);
  reasons.push(...new Set([...cv.notes, ...wc.notes, ...cc.notes]));
  const st = streak(ctx); if (st > 0) reasons.push(`Day ${st + 1} of your streak is decided in the next ${mins} minutes.`);
  return {
    title: `${mins}-minute ${s.kind === 'strength' ? s.title.split(' — ')[0] : 'foundation'} session`, kind: 'live', mins, reasons,
    sections: [
      { name: 'Warm-up', tag: 'warm', items: named(lib, ctx, warm) },
      { name: 'Main work', tag: 'main', items: named(lib, ctx, chosen) },
      { name: 'Cool-down', tag: 'cool', items: named(lib, ctx, cool) },
    ].filter(s => s.items.length),
  };
}
