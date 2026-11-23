// Readiness, streak, gate, exercise response. Ports of the classic app's
// computeReadiness(), streak(), gateStatus(), exerciseResponse() — same numbers.
import { addDays, daysBetween } from './dates.js';

const ckOn = (ctx, d) => [...ctx.checkins].reverse().find(c => c.date === d) || null;
const hd = (ctx, d) => ctx.health[d] || null;

export function readiness(ctx) {
  const t = ckOn(ctx, ctx.today) || ctx.checkins[ctx.checkins.length - 1];
  if (!t) return null;
  const stale = daysBetween(t.date, ctx.today) > 1;
  if (t.pain >= 7) return { level: 'relief', score: 25, drivers: [{ text: `Pain ${t.pain}/10 — flare rules apply`, pts: null }], stale };
  let score = 70; const drivers = [];
  const add = (pts, text) => { score += pts; drivers.push({ pts, text }); };
  if (t.sleep === 'great') add(10, 'Slept great'); else if (t.sleep === 'poor') add(-15, 'Poor sleep'); else add(0, 'Slept okay');
  if (t.pain >= 5) add(-20, `Pain at ${t.pain}/10`); else if (t.pain >= 3) add(-5, `Pain at ${t.pain}/10`); else add(10, `Pain low at ${t.pain}/10`);
  const cs = [...ctx.checkins].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (cs.length >= 2) {
    const d = cs[cs.length - 1].pain - cs[cs.length - 2].pain;
    if (d <= -1) add(10, `Pain fell ${-d} since last check-in`); else if (d >= 2) add(-15, `Pain rose ${d} since last check-in`);
  }
  const recent = ctx.log.filter(l => { const d = daysBetween(l.date, ctx.today); return d >= 0 && d <= 2; }).length;
  if (recent >= 3) add(-5, 'Three sessions in two days');
  const today = hd(ctx, ctx.today), yest = hd(ctx, addDays(ctx.today, -1));
  const night = today && today.sleepMin != null ? today : yest && yest.sleepMin != null ? yest : null;
  if (night && night.sleepMin >= 180) {
    if (night.sleepMin < 360) add(-10, `Only ${(night.sleepMin / 60).toFixed(1)} h sleep (Health Connect)`);
    else if (night.sleepMin >= 450) add(5, `${(night.sleepMin / 60).toFixed(1)} h sleep (Health Connect)`);
  }
  if (yest && yest.steps >= 9000) add(-5, `${yest.steps.toLocaleString()} steps yesterday`);
  if (ctx.deloadUntil && ctx.deloadUntil >= ctx.today) { score = Math.min(score, 64); drivers.push({ pts: null, text: 'Deload week caps the session' }); }
  score = Math.max(5, Math.min(98, Math.round(score)));
  const level = score >= 75 ? 'full' : score >= 55 ? 'trimmed' : score >= 35 ? 'micro' : 'relief';
  return { level, score, drivers, stale };
}
export const READINESS_WORD = { full: 'Full session', trimmed: 'Trimmed session', micro: 'Micro only', relief: 'Relief only' };
/** readiness level → Live energy default */
export const energyFor = r => !r ? 'ok' : r.level === 'relief' ? 'flare' : r.level === 'micro' ? 'low' : r.level === 'full' ? 'great' : 'ok';

export function streak(ctx) {
  const days = new Set(ctx.log.map(l => l.date));
  let d = ctx.today, n = 0;
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function gate(ctx) {
  const inWin = s => daysBetween(s, ctx.today) <= 14;
  const ck = ctx.checkins.filter(c => inWin(c.date));
  const sessions = ctx.log.filter(l => inWin(l.date)).length;
  if (ck.length < 5) return { status: 'warming', label: 'Warming up', ready: false, checkins: ck.length, sessions, avgPain: null };
  const avg = ck.reduce((a, c) => a + (c.pain || 0), 0) / ck.length;
  const ready = avg <= 3 && sessions >= 8;
  return { status: ready ? 'ready' : 'hold', label: ready ? 'Ready to level up' : 'Hold', ready, checkins: ck.length, sessions, avgPain: Math.round(avg * 10) / 10 };
}
export function exerciseResponse(ctx) {
  const out = {};
  for (const id of new Set(ctx.exLog.map(x => x.id))) {
    const days = [...new Set(ctx.exLog.filter(x => x.id === id).map(x => x.date))];
    const deltas = [];
    for (const d of days) { const a = ckOn(ctx, d), b = ckOn(ctx, addDays(d, 1)); if (a && b) deltas.push(b.pain - a.pain); }
    if (deltas.length < 2) { out[id] = { n: days.length, verdict: 'learning', dAvg: null }; continue; }
    const dAvg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    out[id] = { n: days.length, dAvg, verdict: dAvg <= -0.75 ? 'helps' : dAvg >= 1 ? 'watch' : 'neutral' };
  }
  return out;
}
/** Session counts for the last `weeks` calendar weeks (oldest first). */
export function weeklySessions(ctx, weeks = 12) {
  const out = Array(weeks).fill(0);
  for (const l of ctx.log) { const w = Math.floor(daysBetween(l.date, ctx.today) / 7); if (w >= 0 && w < weeks) out[weeks - 1 - w]++; }
  return out;
}
