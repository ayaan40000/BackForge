// Dose strings → numbers. Two parsers on purpose:
//  * parseDose()  — exact port of the classic/backend rule used for sizing (estMins).
//  * prescribe()  — the Live compiler's richer reading: reps, holds, per-side, tempo.
const SETS_RE = /(\d+)\s*×/;
export function parseDose(d) {
  const m = SETS_RE.exec(d);
  const sets = m ? Math.min(3, +m[1]) : 1;
  const hm = /(\d+)[–-](\d+)\s*sec/.exec(d) || /(\d+)\s*sec/.exec(d);
  let hold = hm ? +(hm[2] || hm[1]) : null;
  if (hold != null && hold < 8) hold = null;
  return { sets, perSide: d.includes('/ side'), hold };
}
export const estMins = dose => { const p = parseDose(dose); const per = p.hold ? p.hold + 20 : 45; return p.sets * (p.perSide ? 2 : 1) * per / 60 + 0.4; };
export const capSets = (dose, max) => dose.replace(SETS_RE, (_, n) => `${Math.min(+n, max)} ×`);

/**
 * Read a dose for real-time coaching.
 * @returns {{sets:number, reps:number|null, holdSec:number|null, repHoldSec:number, perSide:boolean, alternating:boolean, slow:boolean, durationSec:number|null}}
 *  - holdSec: a timed hold per set (e.g. "30 sec / side")
 *  - reps + repHoldSec: counted reps, each held repHoldSec (e.g. "8 · 8-sec holds")
 *  - durationSec: a whole-block time (e.g. "3–5 min")
 */
export function prescribe(dose, fallbackReps = 10) {
  const d = String(dose || '');
  const sm = SETS_RE.exec(d);
  const sets = sm ? Math.min(4, +sm[1]) : 1;
  const perSide = /\/\s*side/.test(d);
  const alternating = /alternat/i.test(d);
  const slow = /slow/i.test(d);
  const min = /(\d+)(?:[–-](\d+))?\s*min/.exec(d);
  if (min) return { sets: 1, reps: null, holdSec: null, repHoldSec: 0, perSide, alternating, slow, durationSec: +(min[1]) * 60 };
  const repHold = /(\d+)[–-]?(\d+)?-sec\s*(holds?|squeeze)/.exec(d);
  const afterSets = sm ? d.slice(sm.index + sm[0].length) : d;
  // "N × 20–30 sec" / "N × 20-sec holds" / "30 sec / side" = a timed hold per set
  const timed = /^\s*(\d+)(?:[–-](\d+))?\s*-?\s*sec(?!\w)/.exec(afterSets);
  if (timed) return { sets, reps: null, holdSec: +timed[1], repHoldSec: 0, perSide, alternating, slow, durationSec: null };
  let reps = null;
  const r = /^\s*(\d+)(?:[–-](\d+))?/.exec(afterSets);
  if (sm && r) reps = +(r[2] || r[1]);
  else { const lone = /^(\d+)(?:[–-](\d+))?\s*(reps?|cycles?|breaths?|alternating|slow)/i.exec(d); if (lone) reps = +(lone[2] || lone[1]); }
  if (reps != null) return { sets, reps, holdSec: null, repHoldSec: repHold ? +(repHold[2] || repHold[1]) : 0, perSide, alternating, slow, durationSec: null };
  return { sets, reps: fallbackReps, holdSec: null, repHoldSec: 0, perSide, alternating, slow, durationSec: null };
}
