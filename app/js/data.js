// Loads the data files once and derives everything the screens read.
import { Library } from './engine/library.js';
import { makeCtx } from './engine/context.js';
import { dayStr, addDays, daysBetween, parseDay } from './engine/dates.js';
import { state } from './store.js';

export const BASE = new URL('../../', import.meta.url).href; // repo root (works on GitHub Pages sub-path)
let LIB = null, LINES = null, MTESTS = null, PTESTS = null, MEDIA = {}, DESK = null;
export async function loadData() {
  const get = p => fetch(BASE + p).then(r => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });
  const opt = p => get(p).catch(() => null);
  const [ex, desk, extra, coaching, lines, mt, pt, media, deskDoc] = await Promise.all([get('backend/data/exercises.json'), get('data/exercises-desk.json'), opt('data/exercises-extra.json'), get('data/coaching.json'), get('data/voice-lines.json'), get('data/assessments/movement-tests.json'), get('data/assessments/posture-tests.json'), opt('data/media.json'), opt('data/desk.json')]);
  LIB = new Library([...ex, ...desk, ...(extra || [])], coaching.exercises);
  MEDIA = media?.photos || {}; DESK = deskDoc;
  // extras carry their own spoken cues + YouTube queries
  for (const e of LIB.all) { if (e.setupCue && !e.coach.setupCue) e.coach = { ...e.coach, setupCue: e.setupCue }; if (e.focusCue && !e.coach.focusCue) e.coach = { ...e.coach, focusCue: e.focusCue }; } LINES = lines; MTESTS = mt; PTESTS = pt;
}
export const lib = () => LIB;
export const voiceLines = () => LINES;
export const deskDoc = () => DESK;
/** Photo pair (stop-motion) for an exercise, or null. */
export const photosFor = id => (MEDIA[id] ? { frames: [`${BASE}app/media/${id}-0.webp`, `${BASE}app/media/${id}-1.webp`], similar: MEDIA[id].similar || null, source: `https://github.com/yuhonas/free-exercise-db/tree/main/exercises/${MEDIA[id].freeDb}` } : null);
const YT = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
/** Every exercise gets video links: verified/curated ones first, then labelled searches. */
export function videosFor(ex) {
  const out = [...(ex.coach?.videos || []).map(v => ({ label: v.type === 'direct' ? v.channel : `${v.channel} (search)`, url: v.url, direct: v.type === 'direct' }))];
  for (const q of ex.youtube || []) out.push({ label: `YouTube: ${q}`, url: YT(q), direct: false });
  if (out.length < 2) out.push({ label: `YouTube: ${ex.name} physiotherapy`, url: YT(`${ex.name} physiotherapy exercise`), direct: false });
  return out;
}
export const movementTests = () => MTESTS.tests;
export const postureDoc = () => PTESTS;
export const postureTests = () => PTESTS.tests;
export const ctx = () => makeCtx(state(), dayStr());

// ---------- health ----------
export const healthDays = () => { const S = state(); return S.health && !S.health.paused ? S.health.days || {} : {}; };
/** Last n calendar days (oldest first) of one metric; missing = null. */
export function series(metric, n, end = dayStr()) {
  const d = healthDays();
  return Array.from({ length: n }, (_, i) => { const k = addDays(end, i - n + 1); const v = d[k]?.[metric]; return typeof v === 'number' ? v : null; });
}
export const dayLabels = (n, end = dayStr(), fmt = { day: 'numeric', month: 'short' }) => Array.from({ length: n }, (_, i) => parseDay(addDays(end, i - n + 1)).toLocaleDateString(undefined, fmt));
export const mean = a => { const x = a.filter(v => v != null); return x.length ? x.reduce((p, c) => p + c, 0) / x.length : null; };
export const sd = a => { const x = a.filter(v => v != null), m = mean(x); return x.length > 1 ? Math.sqrt(x.reduce((p, c) => p + (c - m) ** 2, 0) / (x.length - 1)) : null; };
/** Latest value within `within` days, with its date. */
export function latest(metric, within = 3) {
  const d = healthDays();
  for (let i = 0; i <= within; i++) { const k = addDays(dayStr(), -i); const v = d[k]?.[metric]; if (typeof v === 'number') return { v, date: k, ago: i }; }
  return null;
}
export function lastOf(metric) { const d = healthDays(); const k = Object.keys(d).filter(x => typeof d[x][metric] === 'number').sort().at(-1); return k ? { v: d[k][metric], date: k, ago: daysBetween(k, dayStr()) } : null; }
export const hasHealth = () => Object.keys(healthDays()).length > 0;
export function lastNight() { const d = healthDays(); for (let i = 0; i <= 2; i++) { const k = addDays(dayStr(), -i); if (d[k]?.sleepMin) return { ...d[k], date: k, ago: i }; } return null; }
export function zone2Week() { return series('zone2Min', 7).reduce((a, b) => a + (b || 0), 0); }

// ---------- insights (protocol §11: n on every comparison, "early signal" under 5, nothing under 3) ----------
export function insights() {
  const S = state(), out = [];
  const ck = Object.fromEntries(S.checkins.map(c => [c.date, c.pain]));
  // weeks with 4+ sessions vs fewer
  const weeks = {};
  for (const c of S.checkins) { const w = Math.floor(daysBetween(c.date, dayStr()) / 7); (weeks[w] ||= { pain: [], s: 0 }).pain.push(c.pain); }
  for (const l of S.log) { const w = Math.floor(daysBetween(l.date, dayStr()) / 7); (weeks[w] ||= { pain: [], s: 0 }).s++; }
  const hi = Object.values(weeks).filter(w => w.s >= 4 && w.pain.length), lo = Object.values(weeks).filter(w => w.s < 4 && w.pain.length);
  if (hi.length >= 3 && lo.length >= 3) {
    const d = mean(lo.map(w => mean(w.pain))) - mean(hi.map(w => mean(w.pain)));
    if (Math.abs(d) >= 0.3) out.push({ icon: 'calendar', text: `Pain averaged ${Math.abs(d).toFixed(1)} ${d > 0 ? 'lower' : 'higher'} in weeks with 4+ sessions.`, n: `${hi.length} vs ${lo.length} weeks`, early: hi.length + lo.length < 10 });
  }
  // short nights → next-day pain
  const hd = healthDays(), shortD = [], okD = [];
  for (const [d, rec] of Object.entries(hd)) { const nxt = ck[d]; if (nxt == null || !rec.sleepMin) continue; (rec.sleepMin < 360 ? shortD : okD).push(nxt); }
  if (shortD.length >= 3 && okD.length >= 3) {
    const d = mean(shortD) - mean(okD);
    if (Math.abs(d) >= 0.3) out.push({ icon: 'moon', text: `After nights under 6 h, pain ran ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} that morning.`, n: `${shortD.length} short nights`, early: shortD.length < 5 });
  }
  // best responder exercise
  const resp = {};
  for (const x of S.exLog) { const a = ck[x.date], b = ck[addDays(x.date, 1)]; if (a == null || b == null) continue; (resp[x.id] ||= []).push(b - a); }
  const best = Object.entries(resp).filter(([, v]) => v.length >= 3).map(([id, v]) => ({ id, n: v.length, drops: v.filter(x => x < 0).length })).sort((a, b) => b.drops / b.n - a.drops / a.n)[0];
  if (best && best.drops / best.n >= 0.5) out.push({ icon: 'spark', text: `${LIB?.get(best.id)?.name || best.id} preceded a pain drop ${best.drops} of ${best.n} times.`, n: `${best.n} sessions`, early: best.n < 5 });
  return out.slice(0, 3);
}
