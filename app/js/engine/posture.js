// Posture check grading: 8 band tests (ported from classic) + 5 bodyweight tests,
// revised in v4.7 after the physio review (docs/reviews/PHYSIO-REVIEW-2026-11.md).
// Grades: Clear · Mild · Moderate · Priority. Pain rule: leg, arm, sharp pain or
// dizziness during a test = stop, Priority + physio flag + 7-day retest lock;
// "my usual back ache went up" = no better than Moderate.
import { addDays, daysBetween } from './dates.js';

export const GRADES = ['Clear', 'Mild', 'Moderate', 'Priority'];
export const GSEV = { Clear: 0, Mild: 1, Moderate: 2, Priority: 3 };
export const PATTERN_KEYS = ['apt', 'hips', 'head', 'back', 'shoulders'];
export const STOP_PAIN = ['leg', 'arm', 'sharp', 'dizzy'];
export const CHECK_VERSION = 3;

function holdGrade(hold, q, sidesSimilar) {
  let g;
  if (hold === 0) g = 'Priority';
  else if (q === 'arch' && hold < 2) g = 'Priority';
  else if (q === 'turn') g = 'Moderate';
  else if (hold === 3 && q === 'clean') g = 'Clear';
  else if (hold === 3 && q === 'lean') g = 'Mild';
  else if (hold === 2 && q === 'clean') g = 'Mild';
  else g = 'Moderate';
  if (g === 'Clear' && sidesSimilar === false) g = 'Mild';
  return g;
}

/** Grade functions keyed by test id. Input = the answers object for that test. */
export const GRADERS = {
  'tilt-control': i => { const h = +i.hold, q = i.quality; if (h === 0 || (q === 'shakes' && h < 2)) return 'Priority'; if (q === 'arches' || h === 1) return 'Moderate'; if (q === 'shakes') return 'Moderate'; if (h === 3 && q === 'flat') return 'Clear'; return 'Mild'; },
  'deadbug-band': i => { const r = +i.reps, q = i.quality; if (r === 0 && q === 'arches') return 'Priority'; if (r === 2 && q === 'heavy') return 'Clear'; if ((r === 2 && (q === 'flare' || q === 'breath')) || (r === 1 && q === 'heavy')) return 'Mild'; return 'Moderate'; }, // S10: breath-hold at full reps = cue issue
  'hip-ir-band': i => { const R = +i.rR, L = +i.rL, w = Math.min(R, L), a = Math.abs(R - L); if (w === 0 || (a >= 2 && i.quality !== 'still')) return 'Priority'; if (w === 1 || a >= 2) return 'Moderate'; if (w === 2 || a === 1) return 'Mild'; return i.quality === 'still' ? 'Clear' : 'Mild'; },
  'pallof-hold': i => holdGrade(+i.hold, i.quality === 'clean' ? 'clean' : i.quality === 'lean' ? 'lean' : i.quality === 'turn' ? 'turn' : 'arch', i.sides === 'similar'),
  'glutemed-wall': i => { let g = holdGrade(+i.hold, i.quality === 'clean' ? 'clean' : i.quality === 'lean' || i.quality === 'foh' ? 'lean' : 'turn', true); if (i.quality === 'foh') g = +i.hold >= 2 ? 'Moderate' : 'Priority'; return g; },
  'pullapart-endurance': i => { const r = +i.reps, q = i.quality; if (r === 0 || (q === 'arch' && r <= 1)) return 'Priority'; if (r === 1 || q === 'shrug') return 'Moderate'; if (q === 'arch') return 'Moderate'; if (r === 3 && q === 'clean') return 'Clear'; return 'Mild'; },
  'wallslide-band': i => { const r = +i.reps, q = i.quality; if (r === 0 || (q === 'shrug' && r <= 1)) return 'Priority'; if (r === 1 || q === 'leaves') return 'Moderate'; if ((r === 2 && (q === 'holds' || q === 'poke')) || (r === 3 && q === 'poke')) return 'Mild'; if (r === 3 && q === 'holds') return 'Clear'; return 'Moderate'; },
  // S9: a nod (tilt) is a technique error, not severity: Moderate, Priority only at 0 reps
  'chintuck-band': i => { const r = +i.reps, q = i.quality; if (r === 0) return 'Priority'; if (r === 1 || q === 'front' || q === 'tilt') return 'Moderate'; if ((r === 2 && (q === 'glide' || q === 'breath')) || (r === 3 && q === 'breath')) return 'Mild'; if (r === 3 && q === 'glide') return 'Clear'; return 'Moderate'; },
  // ---- bodyweight (v4.6) ----
  'occiput-wall': i => { const g = +i.gap, b = i.blades; if (g === 3 || (g === 2 && b === 'none')) return 'Priority'; if (g === 2 || b === 'none') return 'Moderate'; if (g === 1 || b === 'one') return 'Mild'; return 'Clear'; },
  // M6: losing the tuck is the normal end of the test — grade on time only (<10 / 10–19 / 20–29 / ≥30 s)
  'dnf-endurance': i => ['Priority', 'Moderate', 'Mild', 'Clear'][+i.hold],
  // M5: ≤2.5 cm is normal; weak diagnostic accuracy, so never Priority
  'pec-minor': i => ['Clear', 'Mild', 'Moderate'][Math.max(+i.R, +i.L)],
  // M7: ribs-down range only; shoulder/lat-limited too, so never Priority
  'overhead-reach': i => ({ floor: 'Clear', gap: 'Mild', far: 'Moderate', arch: 'Moderate' }[i.reach]),
  'thoracic-rotation': i => { const R = +i.R, L = +i.L, w = Math.min(R, L); if (R === 0 && L === 0) return 'Priority'; if (w === 0 || Math.abs(R - L) >= 2) return 'Moderate'; return w === 1 ? 'Mild' : 'Clear'; },
};

/** Is every input of the test answered (and the pain question)? */
export const testComplete = (t, inp) => !!inp && !inp.skip && t.inputs.every(x => inp[x.key] != null) && inp.pain != null;

/** Grade one test with the pain rule. Returns {grade, painStop} or null (skipped/incomplete = no data). */
export function gradeTest(t, inp) {
  if (!testComplete(t, inp)) return null;
  if (STOP_PAIN.includes(inp.pain)) return { grade: 'Priority', painStop: true };
  let g = GRADERS[t.id](inp);
  if (!g) return null;
  if (inp.pain === 'back' && GSEV[g] < 2) g = 'Moderate';
  return { grade: g, painStop: false };
}

/** classic combineGrades(): worst and mean pulled together, two Priority → Priority. */
export function combineGrades(gs) {
  gs = gs.filter(Boolean); if (!gs.length) return null;
  const pts = gs.map(g => GSEV[g]); const worst = Math.max(...pts), mean = pts.reduce((a, b) => a + b, 0) / pts.length;
  let s = Math.round((worst + mean) / 2);
  if (pts.filter(x => x === 3).length >= 2) s = 3;
  if (pts.filter(x => x >= 2).length >= 2) s = Math.max(s, 2);
  return GRADES[s];
}

/** Per-pattern summary. Keeps the classic keys (apt, upper, overall) so the classic app still reads it. */
export function summarise(grades, tests) {
  const by = p => tests.filter(t => t.pattern === p).map(t => grades[t.id]);
  const out = {};
  for (const p of PATTERN_KEYS) out[p] = combineGrades(by(p));
  out.upper = combineGrades(['pullapart-endurance', 'wallslide-band', 'chintuck-band'].map(id => grades[id]));
  out.overall = combineGrades(PATTERN_KEYS.map(p => out[p]));
  return out;
}

const short = n => n.replace(' Test', '').replace(' (banded)', '');
/** Findings written to S.posture.findings. Classic titles kept for the band tests (the classic plan reads them). */
export function postureFindings(check, tests) {
  const out = [], g = check.grades || {};
  const push = (t, sev, d, fix) => out.push({ sev, t, d, fix });
  for (const t of tests) {
    const gr = g[t.id]; if (!gr || gr === 'Clear') continue;
    push((t.kind === 'bodyweight' ? 'Posture check: ' : 'Band check: ') + short(t.name) + ' — ' + gr, gr === 'Priority' ? 'high' : 'mod', 'Graded ' + gr.toLowerCase() + ' on ' + check.date + '.', t.planChange?.[gr] || '');
  }
  const mod = id => ['Moderate', 'Priority'].includes(g[id]);
  if (mod('hip-ir-band')) { const inp = check.inputs?.['hip-ir-band'] || {}; const R = inp.rR != null ? +inp.rR : null, L = inp.rL != null ? +inp.rL : null; push((R != null && L != null && R < L ? 'Right hip internal rotation deficit' : R != null && L != null && L < R ? 'Left hip internal rotation deficit' : 'Hip internal rotation deficit') + ' — band check', g['hip-ir-band'] === 'Priority' ? 'high' : 'mod', 'Banded IR test graded ' + g['hip-ir-band'] + '.', 'Daily IR work stays the corrective priority, deficit side first.'); }
  if (mod('tilt-control') || mod('deadbug-band')) push('Anterior pelvic tilt — band check', 'mod', 'Tilt control graded by band test.', 'Tilt drill + hip-flexor work drive the foundation block.');
  if (mod('glutemed-wall')) push('Glute inhibition — band check', 'mod', 'Glute med wall test graded ' + g['glutemed-wall'] + '.', 'Daily glute med rotation.');
  if (g['glutemed-wall'] === 'Priority') push('Guarding pattern — band check', 'mod', 'Glute med wall test graded Priority — the pelvis cannot hold level under load.', 'Supported single-leg work only; figure-4 and single-knee relief enter the corrective pool.');
  if (mod('pullapart-endurance') || mod('wallslide-band') || mod('pec-minor')) push('Rounded shoulders (upper-crossed) — posture check', 'mod', 'Shoulder tests graded moderate or worse.', 'Daily pull-apart / wall-slide work; chest opening.');
  if (mod('chintuck-band') || mod('dnf-endurance')) push('Forward-head posture — posture check', 'mod', 'Neck tests graded moderate or worse.', 'Daily chin tucks + deep neck flexor holds.');
  const s = check.summary || {};
  if (['Moderate', 'Priority'].includes(s.back)) push('Hunched upper back (thoracic kyphosis) — posture check', s.back === 'Priority' ? 'high' : 'mod', 'Upper-back tests graded ' + s.back.toLowerCase() + '.', 'Daily thoracic mobility (open book, wall slides) before rows and face pulls.');
  const pri = Object.values(g).filter(x => x === 'Priority').length;
  if (check.painFlag || pri >= 2) push('Band check: physio flag', 'high', (check.painFlag ? 'A test was stopped for leg/sharp pain. ' : '') + (pri >= 2 ? pri + ' tests graded Priority.' : ''), 'Show these grades to your physiotherapist at the next visit.');
  return out;
}

/**
 * Finish a check: grade what was answered, carry over grades not retested
 * (with their pain history), summarise, build findings. Returns the check or null if nothing was answered.
 */
export function finishCheck({ inputs, tests, date, band = 'light', prev = null }) {
  const grades = {}; let painFlag = false; const ins = { ...inputs };
  for (const t of tests) { const r = gradeTest(t, ins[t.id]); if (!r) continue; grades[t.id] = r.grade; if (r.painStop) painFlag = true; }
  if (!Object.keys(grades).length) return null;
  const carried = {}, carriedPain = {};
  if (prev?.grades) for (const k of Object.keys(prev.grades)) if (!(k in grades)) {
    grades[k] = prev.grades[k]; carried[k] = prev.date;
    if (prev.inputs?.[k]) { ins[k] = prev.inputs[k]; if (STOP_PAIN.includes(prev.inputs[k].pain)) { painFlag = true; carriedPain[k] = prev.date; } }
  }
  const check = { date, bandLevel: band, grades, inputs: ins, painFlag, carried, carriedPain, v: CHECK_VERSION };
  check.summary = summarise(grades, tests);
  check.phases = nextPhases(prev?.phases, prev?.summary, check.summary);
  return check;
}

/** Can a check be taken today? (flare day = no; 7 days after a pain-stopped check = no) */
export function checkGate({ today, flare, last }) {
  if (flare) return { ok: false, why: 'Today’s check-in puts you in the flare protocol (pain 7+). A check today would grade the flare, not your posture. Run the relief session and test on a normal day.' };
  if (last?.painFlag) { const d = daysBetween(last.date, today); if (d >= 0 && d < 7) return { ok: false, why: `Your last check (${last.date}) was stopped for leg, arm or sharp pain, or dizziness. No retest for 7 days — ${7 - d} to go. If leg pain is new, worse, or comes with weakness or numbness, see a clinician.` }; }
  return { ok: true };
}
/**
 * Phase per pattern after a check (physio review §4): the phase follows the
 * grade, but a pattern moves UP at most one phase per retest (big jumps at home
 * are usually measurement noise). Moving back has no limit.
 */
const ORDER = ['reset', 'control', 'strengthen', 'integrate'];
const PHASE_FOR = { Priority: 'reset', Moderate: 'control', Mild: 'strengthen', Clear: 'integrate' };
export function nextPhases(prevPhases, prevSummary, summary) {
  const out = {};
  for (const p of PATTERN_KEYS) {
    const g = summary?.[p]; if (!g) continue;
    let want = ORDER.indexOf(PHASE_FOR[g]);
    const before = prevPhases?.[p] ?? (prevSummary?.[p] ? PHASE_FOR[prevSummary[p]] : null);
    if (before) want = Math.min(want, ORDER.indexOf(before) + 1);
    out[p] = ORDER[want];
  }
  return out;
}
/** Retest every 4 weeks; 2 while any grade is Priority. */
export function retestDue(last) {
  if (!last) return null;
  const pri = Object.values(last.grades || {}).includes('Priority');
  return addDays(last.date, pri ? 14 : 28);
}
