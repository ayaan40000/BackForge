// App state. The SAME `backforge_v1` object the classic app uses — the new
// app reads it whole and writes it whole, so every field it doesn't know about
// (posture, vault, PIN, sync requests…) survives untouched.
// Demo mode uses its own key (`backforge_demo`) and never touches real data.
import { dayStr, addDays, daysBetween } from './engine/dates.js';

export const KEY = 'backforge_v1', DEMO_KEY = 'backforge_demo', UI_KEY = 'backforge_ui';
const ls = (() => { try { const k = '__bf'; localStorage.setItem(k, k); localStorage.removeItem(k); return localStorage; } catch { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; } })();

const DEFAULTS = () => ({ v: 1, schema: 3, answers: {}, results: null, assessHistory: [], log: [], checkins: [], bandLevel: {}, swaps: {}, player: null, reminder: null, livePrefs: null, exLog: [], livePlayer: null, protein: {}, bodyweightKg: null, deloadUntil: null, health: { days: {}, meta: null, paused: false, lastSyncAt: null }, waist: [], backup: { destination: '', lastExportAt: null } });

/** Repair types without dropping unknown fields. */
export function normalise(raw) {
  const S = { ...DEFAULTS(), ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const k of ['log', 'checkins', 'exLog', 'assessHistory', 'waist']) if (!Array.isArray(S[k])) S[k] = [];
  for (const k of ['answers', 'bandLevel', 'swaps', 'protein']) if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = {};
  if (!S.health || typeof S.health !== 'object') S.health = DEFAULTS().health;
  if (!S.health.days || typeof S.health.days !== 'object') S.health.days = {};
  if (S.results != null && !Array.isArray(S.results)) S.results = null;
  if (!S.posture || typeof S.posture !== 'object') S.posture = {};
  for (const k of ['bandChecks', 'findings', 'captures', 'assessments', 'formLog']) if (!Array.isArray(S.posture[k])) S.posture[k] = [];
  if (!S.posture.cues || typeof S.posture.cues !== 'object') S.posture.cues = {};
  return S;
}

let ui = (() => { try { return JSON.parse(ls.getItem(UI_KEY)) || {}; } catch { return {}; } })();
export const uiPrefs = () => ({ voice: true, bed: false, cueVolume: 0.8, rate: 1.04, voiceName: null, theme: 'auto', demo: false, mins: 20, ...ui });
export function setUi(patch) { ui = { ...ui, ...patch }; try { ls.setItem(UI_KEY, JSON.stringify(ui)); } catch {} emit(); }

/** Shift every YYYY-MM-DD in the demo so its last day is today. */
export function rebase(obj, from, to) {
  const shift = daysBetween(from, to); if (!shift) return obj;
  const re = /^(\d{4}-\d{2}-\d{2})/;
  const walk = v => {
    if (typeof v === 'string') { const m = re.exec(v); return m ? addDays(m[1], shift) + v.slice(10) : v; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [re.test(k) ? addDays(k, shift) : k, walk(x)]));
    return v;
  };
  return walk(obj);
}

let S = null; const subs = new Set();
const emit = () => subs.forEach(f => f());
export const subscribe = f => (subs.add(f), () => subs.delete(f));
export const isDemo = () => !!uiPrefs().demo;

export function load() {
  const key = isDemo() ? DEMO_KEY : KEY;
  try { S = normalise(JSON.parse(ls.getItem(key))); } catch { S = normalise(null); }
  return S;
}
export const state = () => S || load();
export function save() { try { ls.setItem(isDemo() ? DEMO_KEY : KEY, JSON.stringify(S)); } catch {} emit(); }
export function update(fn) { fn(state()); save(); }

export async function enterDemo(base = '') {
  const res = await fetch(base + 'data/demo/demo-state.json');
  const doc = await res.json();
  const st = rebase(doc.state, doc.anchor, dayStr());
  ls.setItem(DEMO_KEY, JSON.stringify(st));
  setUi({ demo: true }); load(); emit();
}
export function exitDemo() { ls.removeItem(DEMO_KEY); setUi({ demo: false }); load(); emit(); }

// ---- writes the classic app also understands --------------------------------
export function logCheckin({ pain, where = 'back', sleep = 'ok' }) {
  update(S => { const d = dayStr(); S.checkins = S.checkins.filter(c => c.date !== d); S.checkins.push({ date: d, pain, where, sleep }); });
}
export function logSession({ kind = 'live', title, pain = null, mins, exerciseIds = [] }) {
  update(S => {
    const d = dayStr();
    S.log.push({ date: d, kind, title, pain, mins });
    exerciseIds.forEach(id => S.exLog.push({ date: d, id }));
  });
}

// ---- health import (Muse's Health Connect sync file) ------------------------
// Accepts sync payload v1/v2 (tools/health_sync.py) and v3 (adds resting HR,
// HRV, sleep stages, VO2 max, SpO2, workouts). Unknown fields are ignored;
// every number is range-checked; a bad day is skipped, never zero-filled.
const FIELDS = { steps: 100000, zone2Min: 1440, sleepMin: 1440, sleepDeepMin: 1440, sleepRemMin: 1440, sleepLightMin: 1440, sleepAwakeMin: 1440, sleepScore: 100, weightKg: 400, caloriesIn: 20000, caloriesOut: 20000, activeKcal: 10000, restingHr: 220, hrvMs: 400, vo2max: 100, spo2: 100, bodyFatPct: 80, distanceKm: 300 };
export function parseHealthPayload(json) {
  const p = typeof json === 'string' ? JSON.parse(json) : json;
  const days = Array.isArray(p?.days) ? p.days : null;
  if (!days) throw new Error('Not a BackForge health sync file (no "days" list).');
  const out = {}; let skipped = 0;
  for (const d of days) {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || '') || isNaN(new Date(d.date))) { skipped++; continue; }
    const rec = {};
    for (const [k, max] of Object.entries(FIELDS)) { const v = d[k]; if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= max) rec[k] = v; }
    if (Array.isArray(d.workouts)) rec.workouts = d.workouts.filter(w => w && typeof w.type === 'string' && typeof w.min === 'number').slice(0, 12).map(w => ({ type: w.type.slice(0, 40), min: Math.min(600, w.min), avgHr: typeof w.avgHr === 'number' ? w.avgHr : null }));
    out[d.date] = rec;
  }
  return { days: out, skipped, meta: { source: String(p.source || p.meta?.source || 'Health Connect via Muse').slice(0, 120), version: p.version || p.schema || 1 } };
}
export function importHealth(json) {
  const r = parseHealthPayload(json);
  update(S => { for (const [d, rec] of Object.entries(r.days)) S.health.days[d] = { ...(S.health.days[d] || {}), ...rec }; S.health.meta = { ...(S.health.meta || {}), ...r.meta }; S.health.lastSyncAt = new Date().toISOString(); });
  return r;
}
