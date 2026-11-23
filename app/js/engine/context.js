// Build the engine context from the app state (the classic `backforge_v1` object).
import { dayStr } from './dates.js';
import { kitOf } from './kit.js';
export function makeCtx(S, today = dayStr()) {
  // movement-assessment findings + posture-check findings (classic flagSet() does the same)
  const findings = [...(Array.isArray(S.results) ? S.results : []), ...(Array.isArray(S.posture?.findings) ? S.posture.findings : [])];
  const flags = new Set();
  for (const f of findings) {
    if ((f.t || '').includes('Extension-intolerant')) flags.add('extension-intolerant');
    if ((f.t || '').includes('Flexion-intolerant')) flags.add('flexion-intolerant');
  }
  // sticky direction intolerance (physio review M1): survives a single good retest
  if (S.profile?.extIntolerant) flags.add('extension-intolerant');
  if (S.profile?.flexIntolerant) flags.add('flexion-intolerant');
  const checkins = Array.isArray(S.checkins) ? S.checkins : [];
  return {
    today, findings, flags, checkins,
    log: Array.isArray(S.log) ? S.log : [], exLog: Array.isArray(S.exLog) ? S.exLog : [],
    kit: kitOf(S), swaps: S.swaps || {}, bandLevel: S.bandLevel || {}, deloadUntil: S.deloadUntil || null,
    health: S.health && !S.health.paused ? (S.health.days || {}) : {},
    has: txt => findings.some(f => (f.t || '').includes(txt)),
    todaysCheckin: () => { const c = checkins[checkins.length - 1]; return c && c.date === today ? c : null; },
  };
}
