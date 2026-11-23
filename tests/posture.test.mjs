// v4.6: movement assessment, posture check (band + bodyweight), corrective plan, photo/Muse contract.
// Classic parity for scoring/grading is proven separately by dev/parity-assessment.mjs (27,000 cases).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, json, AYAAN } from './helpers.mjs';
import { scoreAssessment, answeredCount } from '../app/js/engine/assessment.js';
import { GRADERS, gradeTest, finishCheck, postureFindings, summarise, checkGate, retestDue, combineGrades } from '../app/js/engine/posture.js';
import { buildCorrectivePlan, buildPostureWorkout, formStatus, MENU } from '../app/js/engine/corrective.js';
import { buildLive } from '../app/js/engine/live.js';
import { makeCtx } from '../app/js/engine/context.js';
import { compile } from '../app/js/live/compiler.js';
import { parseResult, consistency, buildRequest, VIEWS } from '../app/js/engine/photo.js';
import { exclusionReason } from '../app/js/engine/library.js';

const MT = json('data/assessments/movement-tests.json').tests;
const PD = json('data/assessments/posture-tests.json'), PT = PD.tests;
const TODAY = '2026-11-23';

test('assessment data: 13 movement tests, 13 posture tests (8 band + 5 bodyweight), every test has a grader', () => {
  assert.equal(MT.length, 13);
  assert.equal(PT.filter(t => t.kind === 'band').length, 8);
  assert.equal(PT.filter(t => t.kind === 'bodyweight').length, 5);
  for (const t of PT) { assert.ok(GRADERS[t.id], t.id); assert.ok(PD.patterns[t.pattern], t.id); assert.ok(['hips', 'apt', 'head', 'back', 'shoulders'].includes(t.pattern)); for (const g of ['Clear', 'Mild', 'Moderate', 'Priority']) assert.ok(t.planChange[g], `${t.id} planChange.${g}`); }
  for (const p of Object.keys(PD.patterns)) assert.ok(PT.some(t => t.pattern === p), 'pattern without tests: ' + p);
});
test('every grader returns a valid grade for every possible input', () => {
  const combos = t => t.inputs.reduce((acc, x) => acc.flatMap(a => x.options.map(([v]) => ({ ...a, [x.key]: v }))), [{}]);
  for (const t of PT) for (const inp of combos(t)) assert.ok(['Clear', 'Mild', 'Moderate', 'Priority'].includes(GRADERS[t.id](inp)), `${t.id} ${JSON.stringify(inp)}`);
});
test('movement scoring: all skipped = no findings; the known profile scores its findings', () => {
  const skip = {}; for (const t of MT) { if (t.kind === 'sides' || t.kind === 'nums') { skip[t.id + '_L'] = 'skip'; skip[t.id + '_R'] = 'skip'; } else skip[t.id] = 'skip'; }
  assert.deepEqual(scoreAssessment(skip), []);
  const A = { dirbend: 'same', dirext: 'worse', firing_R: 'ham', slbridge_R: 'cramp', clamfeel_R: 'tfl', firing_L: 'glute', slbridge_L: 'clean', clamfeel_L: 'glute', thomas_L: 'lifted', thomas_R: 'lifted', pelvis: 'apt', slr: 'gap', hipir_L: 'full', hipir_R: 'low', switch9090: 'r-stuck', sideplanksec_L: '25', sideplanksec_R: '18', posturewall: 'both', guard: 'left' };
  const t = scoreAssessment(A).map(f => f.t).join(' | ');
  for (const k of ['Extension-intolerant', 'Glute inhibition — worse on the right', 'Anterior pelvic tilt', 'Right hip internal rotation deficit', 'Lateral endurance gap', 'Core endurance is low', 'Forward-head', 'Rounded shoulders', 'Guarding']) assert.ok(t.includes(k), k);
  assert.equal(answeredCount(MT, A), 13);
});
test('posture pain rule: leg/sharp pain = Priority + physio flag; back ache = at least Moderate; skipped = no data', () => {
  const dnf = PT.find(t => t.id === 'dnf-endurance');
  assert.deepEqual(gradeTest(dnf, { hold: '3', quality: 'tuck', pain: 'none' }), { grade: 'Clear', painStop: false });
  assert.deepEqual(gradeTest(dnf, { hold: '3', quality: 'tuck', pain: 'back' }), { grade: 'Moderate', painStop: false });
  assert.deepEqual(gradeTest(dnf, { hold: '3', quality: 'tuck', pain: 'leg' }), { grade: 'Priority', painStop: true });
  assert.equal(gradeTest(dnf, { skip: true }), null);
  assert.equal(gradeTest(dnf, { hold: '3', pain: 'none' }), null, 'incomplete = no data');
});
test('bodyweight graders: worked examples', () => {
  assert.equal(GRADERS['occiput-wall']({ gap: '0', blades: 'both' }), 'Clear');
  assert.equal(GRADERS['occiput-wall']({ gap: '2', blades: 'both' }), 'Moderate');
  assert.equal(GRADERS['occiput-wall']({ gap: '3', blades: 'both' }), 'Priority');
  // physio review M5: ≤2.5 cm is normal, never Priority
  assert.equal(GRADERS['pec-minor']({ R: '0', L: '0' }), 'Clear');
  assert.equal(GRADERS['pec-minor']({ R: '2', L: '0' }), 'Moderate');
  assert.equal(GRADERS['pec-minor']({ R: '2', L: '2' }), 'Moderate');
  // M7: never Priority
  assert.equal(GRADERS['overhead-reach']({ reach: 'arch' }), 'Moderate');
  assert.equal(GRADERS['overhead-reach']({ reach: 'far' }), 'Moderate');
  assert.equal(GRADERS['thoracic-rotation']({ R: '2', L: '0' }), 'Moderate');
  // M6: time only — losing the tuck is the normal end
  assert.equal(GRADERS['dnf-endurance']({ hold: '0', quality: 'tuck' }), 'Priority');
  assert.equal(GRADERS['dnf-endurance']({ hold: '3', quality: 'poke' }), 'Clear');
  assert.equal(GRADERS['dnf-endurance']({ hold: '1', quality: 'shake' }), 'Moderate');
  // S9 / S10
  assert.equal(GRADERS['chintuck-band']({ reps: '3', quality: 'tilt' }), 'Moderate');
  assert.equal(GRADERS['chintuck-band']({ reps: '0', quality: 'glide' }), 'Priority');
  assert.equal(GRADERS['deadbug-band']({ reps: '2', quality: 'breath' }), 'Mild');
  for (const t of PT) for (const g of [0, 1]) if (['pec-minor', 'overhead-reach'].includes(t.id)) assert.ok(true);
});
test('finishCheck: summary per pattern, carry-over keeps old grades + pain history, findings use titles the classic plan reads', () => {
  const prev = { date: '2026-10-01', grades: { 'tilt-control': 'Moderate' }, inputs: { 'tilt-control': { hold: '1', quality: 'arches', pain: 'leg' } } };
  const ch = finishCheck({ inputs: { 'occiput-wall': { gap: '3', blades: 'none', pain: 'none' }, 'dnf-endurance': { hold: '1', quality: 'poke', pain: 'none' }, 'pec-minor': { R: '2', L: '1', pain: 'none' } }, tests: PT, date: TODAY, prev });
  assert.equal(ch.grades['tilt-control'], 'Moderate'); assert.equal(ch.carried['tilt-control'], '2026-10-01'); assert.equal(ch.painFlag, true);
  assert.equal(ch.summary.back, 'Priority'); assert.equal(ch.summary.head, 'Moderate'); assert.equal(ch.summary.shoulders, 'Moderate');
  const F = postureFindings(ch, PT).map(f => f.t).join(' | ');
  for (const k of ['Hunched upper back', 'Forward-head posture', 'Rounded shoulders', 'Anterior pelvic tilt — band check', 'physio flag']) assert.ok(F.includes(k), k);
  assert.equal(finishCheck({ inputs: { 'dnf-endurance': { skip: true } }, tests: PT, date: TODAY }), null, 'nothing answered = nothing recorded');
  assert.equal(combineGrades(['Priority', 'Priority', 'Clear']), 'Priority');
});
test('gates: no check on a flare day, 7-day lock after a pain-stopped check, retest in 2 weeks while Priority', () => {
  assert.equal(checkGate({ today: TODAY, flare: true }).ok, false);
  assert.equal(checkGate({ today: TODAY, flare: false, last: { date: '2026-11-20', painFlag: true } }).ok, false);
  assert.equal(checkGate({ today: TODAY, flare: false, last: { date: '2026-11-10', painFlag: true } }).ok, true);
  assert.equal(retestDue({ date: '2026-11-01', grades: { a: 'Priority' } }), '2026-11-15');
  assert.equal(retestDue({ date: '2026-11-01', grades: { a: 'Mild' } }), '2026-11-29');
});
const stateWith = (summary, extra = {}) => ({ results: AYAAN, checkins: [], log: [], exLog: [], posture: { bandChecks: [{ date: '2026-11-20', grades: {}, summary, v: 2 }], findings: [], formLog: [], ...extra } });
test('corrective plan: phase follows grade, worst first, only safe moves, form log regresses/progresses', () => {
  const S = stateWith({ apt: 'Mild', head: 'Priority', back: 'Moderate', shoulders: 'Clear' });
  const ctx = makeCtx(S, TODAY), plan = buildCorrectivePlan(lib, ctx, S);
  assert.deepEqual(plan.patterns.map(p => [p.key, p.phase]), [['head', 'reset'], ['back', 'control'], ['hips', 'control'], ['apt', 'strengthen'], ['shoulders', 'integrate']]);
  assert.equal(plan.patterns.find(p => p.key === 'hips').source, 'assessment', 'hips comes from the glute / hip IR findings when the check has no hips grade');
  for (const p of plan.patterns) for (const m of p.moves) assert.equal(exclusionReason(lib.get(m.id), ctx.flags), null, m.id);
  for (const k of Object.keys(MENU)) for (const ph of ['reset', 'control', 'strengthen', 'integrate']) for (const id of MENU[k][ph]) assert.ok(lib.get(id), `menu ${k}.${ph} references unknown move ${id}`);
  assert.equal(formStatus([{ id: 'x', r: 'hard' }, { id: 'x', r: 'clean' }, { id: 'x', r: 'hard' }], 'x'), 'regress');
  assert.equal(formStatus([{ id: 'x', r: 'clean' }, { id: 'x', r: 'clean' }, { id: 'x', r: 'clean' }], 'x'), 'progress');
  const S2 = stateWith({ head: 'Priority' }, { formLog: [{ id: 'chintuck', date: '2026-11-20', r: 'hard' }, { id: 'chintuck', date: '2026-11-21', r: 'hard' }] });
  const m = buildCorrectivePlan(lib, makeCtx(S2, TODAY), S2).patterns[0].moves.find(x => x.id === 'chintuck');
  assert.equal(m.form, 'regress'); assert.ok(/^[12] ×/.test(m.dose), m.dose); assert.ok(/easier version/.test(m.note), 'regress swaps to the easier version but keeps up to 2 sets (review §5)');
});
test('corrective plan falls back to movement findings when there is no posture check', () => {
  const S = { results: AYAAN, checkins: [], log: [], exLog: [], posture: { bandChecks: [], findings: [], formLog: [] } };
  const plan = buildCorrectivePlan(lib, makeCtx(S, TODAY), S);
  assert.deepEqual(plan.patterns.map(p => p.key).sort(), ['apt', 'head', 'hips', 'shoulders']);
  assert.ok(plan.patterns.every(p => p.source === 'assessment'));
});
test('posture Live session: built from the weak areas, safe, flare still wins, fits the clock', () => {
  const S = stateWith({ apt: 'Moderate', head: 'Priority', back: 'Moderate', shoulders: 'Mild' });
  const ctx = makeCtx(S, TODAY);
  const w = buildLive(lib, ctx, { mins: 15, energy: 'ok', caveats: [], variant: 'posture', S });
  assert.equal(w.kind, 'posture');
  const ids = w.sections.flatMap(s => s.items.map(i => i.id));
  for (const id of ids) assert.equal(exclusionReason(lib.get(id), ctx.flags), null, id);
  assert.ok(ids.some(id => MENU.head.reset.includes(id)) && ids.some(id => MENU.back.control.includes(id)), 'covers the worst areas');
  const tl = compile(lib, w, { targetMin: 15 }); assert.ok(Math.abs(tl.totalSec - 900) <= 90, String(tl.totalSec));
  const flare = { ...S, checkins: [{ date: TODAY, pain: 8 }] };
  assert.equal(buildLive(lib, makeCtx(flare, TODAY), { mins: 15, variant: 'posture', S: flare }).kind, 'flare');
});
test('posture findings reach the everyday Live builder (hunched upper back → thoracic work)', () => {
  const S = { results: [], checkins: [], log: [], exLog: [], posture: { findings: [{ t: 'Hunched upper back (thoracic kyphosis) — posture check', sev: 'mod' }] } };
  const ctx = makeCtx(S, TODAY);
  assert.ok(ctx.has('Hunched upper back'));
  const ids = buildLive(lib, ctx, { mins: 35 }).sections.flatMap(s => s.items.map(i => i.id));
  assert.ok(ids.includes('openbook') || ids.includes('wallslide'), ids.join(','));
});
test('photo contract: request carries test grades; result validated; consistency computed on-device', () => {
  const S = stateWith({ apt: 'Mild', head: 'Moderate', back: 'Priority', shoulders: 'Clear' });
  const req = buildRequest({ capture: { views: { front: 'a', 'side-right': 'b' } }, prevCapture: { date: '2026-10-01', views: { front: 'c' } }, S, today: TODAY });
  assert.equal(req.version, 2); assert.equal(req.assessment.patterns.thoracicKyphosis, 'Priority');
  assert.deepEqual(req.images.map(i => i.view), ['side-right', 'front']); assert.equal(req.previous.images[0].file, 'prev-front.jpg');
  assert.throws(() => parseResult({ kind: 'nope' }, TODAY)); assert.throws(() => parseResult({ kind: 'backforge-posture-result', version: 9 }, TODAY));
  const r = parseResult({ kind: 'backforge-posture-result', version: 2, patterns: { forwardHead: { grade: 'moderate', confidence: 3, viewsUsed: ['side-right', 'ceiling'], observations: ['x'], consistency: 'agrees' }, thoracicKyphosis: { grade: 'mild' }, pelvicTilt: { grade: 'huge' }, shoulderRound: { grade: 'marked' } } }, TODAY);
  assert.equal(r.patterns.forwardHead.confidence, 1); assert.deepEqual(r.patterns.forwardHead.viewsUsed, ['side-right']); assert.equal(r.dropped, 1);
  const c = Object.fromEntries(consistency(r, S.posture.bandChecks[0]).map(x => [x.pattern, x.verdict]));
  assert.equal(c.forwardHead, 'agrees'); assert.equal(c.thoracicKyphosis, 'photo-shows-less'); assert.equal(c.shoulderRound, 'photo-shows-more');
  assert.equal(parseResult({ kind: 'backforge-posture-result', version: 1, patterns: {} }, TODAY).version, 1, 'classic v1 results still import');
  assert.equal(VIEWS.length, 4);
});

// ---------------- physio review (v4.7) ----------------
import { directionFlags } from '../app/js/engine/assessment.js';
import { nextPhases, STOP_PAIN } from '../app/js/engine/posture.js';
import { formMode } from '../app/js/engine/corrective.js';
import { normalise } from '../app/js/store.js';

test('M1: extension intolerance is sticky — a good retest does not bring press-ups back', () => {
  const S = { results: [], checkins: [], log: [], exLog: [], profile: { extIntolerant: { since: '2026-09-01' } } };
  const ctx = makeCtx(S, TODAY);
  assert.ok(ctx.flags.has('extension-intolerant'));
  for (const id of ['pressup', 'sphinx', 'proneext']) assert.ok(exclusionReason(lib.get(id), ctx.flags), id);
  // a painful extension test is an answer (worse), not a skip
  assert.ok(scoreAssessment({ dirbend: 'same', dirext: 'painful' }).some(f => f.t === 'Extension-intolerant pattern'));
  assert.equal(scoreAssessment({ dirbend: 'same', dirext: 'skip' }).length, 0, 'skip stays no data');
  // clearing needs two not-worse tests ≥ 28 days apart
  const hist = d => ({ date: d, flags: [], dir: { dirext: 'same', dirbend: 'same' } });
  assert.equal(directionFlags({ ...S, assessHistory: [hist('2026-11-01'), hist('2026-11-20')] }, [], TODAY).canClearExt, false);
  assert.equal(directionFlags({ ...S, assessHistory: [hist('2026-10-01'), hist('2026-11-20')] }, [], TODAY).canClearExt, true);
  // existing users: a stored finding becomes a sticky flag on load
  assert.ok(normalise({ results: [{ t: 'Extension-intolerant pattern', sev: 'high' }], assessHistory: [{ date: '2026-10-30', flags: [] }] }).profile.extIntolerant);
});
test('M2: symptoms spreading into the leg = worse + a high finding; centralisation = better', () => {
  const F = scoreAssessment({ dirbend: 'same', dirext: 'leg' });
  assert.ok(F.some(f => f.t === 'Symptoms spread into the leg on direction test' && f.sev === 'high'));
  assert.ok(F.some(f => f.t === 'Extension-intolerant pattern'));
  assert.ok(scoreAssessment({ dirbend: 'central', dirext: 'same' }).some(f => f.t.startsWith('Direction-neutral')));
});
test('M3: arm symptoms or dizziness stop a posture test like leg pain', () => {
  assert.deepEqual(STOP_PAIN.sort(), ['arm', 'dizzy', 'leg', 'sharp']);
  const dnf = PT.find(t => t.id === 'dnf-endurance');
  for (const p of ['arm', 'dizzy']) assert.deepEqual(gradeTest(dnf, { hold: '3', quality: 'tuck', pain: p }), { grade: 'Priority', painStop: true });
  assert.ok(PD.painOptions.some(o => o[0] === 'arm') && PD.painOptions.some(o => o[0] === 'dizzy'));
});
test('M11/M12/S4: severity matches the evidence', () => {
  const ir1 = scoreAssessment({ hipir_L: 'full', hipir_R: 'mid' }).find(f => f.t === 'Right hip internal rotation deficit');
  const ir2 = scoreAssessment({ hipir_L: 'full', hipir_R: 'low' }).find(f => f.t === 'Right hip internal rotation deficit');
  assert.equal(ir1.sev, 'mod'); assert.equal(ir2.sev, 'high'); assert.ok(!/capsule/.test(ir2.fix), 'no diagnostic wording');
  assert.equal(scoreAssessment({ pelvis: 'apt', thomas_L: 'lifted', thomas_R: 'flat' }).find(f => f.t.startsWith('Anterior pelvic tilt')).sev, 'mod');
  assert.ok(!scoreAssessment({ sideplanksec_L: '22', sideplanksec_R: '25' }).some(f => f.t.startsWith('Lateral endurance gap')), '3 s is timing error');
  assert.ok(scoreAssessment({ sideplanksec_L: '18', sideplanksec_R: '30' }).some(f => f.t.startsWith('Lateral endurance gap')));
});
test('M9: hips is its own pattern with its own moves, deficit side first; old checks rebuild it', () => {
  const S = stateWith({ apt: 'Mild', hips: 'Moderate' });
  S.posture.bandChecks[0].inputs = { 'hip-ir-band': { rR: '1', rL: '3' } };
  const hips = buildCorrectivePlan(lib, makeCtx(S, TODAY), S).patterns.find(p => p.key === 'hips');
  assert.equal(hips.phase, 'control'); assert.ok(hips.moves.some(m => /Right side first/.test(m.note || '')));
  const old = { results: [], checkins: [], log: [], exLog: [], posture: { bandChecks: [{ date: '2026-10-01', grades: { 'hip-ir-band': 'Priority', 'glutemed-wall': 'Moderate' }, summary: { apt: 'Mild', upper: 'Mild' } }], formLog: [] } };
  const p = buildCorrectivePlan(lib, makeCtx(old, TODAY), old).patterns.find(x => x.key === 'hips');
  assert.ok(p && GSEVX(p.grade) >= 2, 'v2 check: hips grade rebuilt from the IR + glute med tests');
  assert.ok(!p.moves.some(m => m.id === 'ir9090liftoff'), 'lift-off gated while IR is Priority');
});
const GSEVX = g => ({ Clear: 0, Mild: 1, Moderate: 2, Priority: 3 })[g];
test('§4: a pattern moves up at most one phase per retest; down without limit', () => {
  assert.deepEqual(nextPhases({ head: 'reset' }, null, { head: 'Clear' }), { head: 'control' });
  assert.deepEqual(nextPhases({ head: 'integrate' }, null, { head: 'Priority' }), { head: 'reset' });
  assert.deepEqual(nextPhases(null, null, { back: 'Mild' }), { back: 'strengthen' });
});
test('§5: form rules — regress on 2 of 3 hard; progress needs 3 clean over 2+ days, 7+ days, low pain, not Priority', () => {
  const R = (d, r) => ({ id: 'row', date: d, r });
  assert.equal(formMode('row', { formLog: [R('2026-11-20', 'hard'), R('2026-11-21', 'shaky'), R('2026-11-22', 'hard')], today: TODAY }), 'regress');
  const clean = [R('2026-11-10', 'clean'), R('2026-11-15', 'clean'), R('2026-11-20', 'clean')];
  assert.equal(formMode('row', { formLog: clean, today: TODAY }), 'progress');
  assert.equal(formMode('row', { formLog: clean, today: TODAY, priority: true }), null, 'never progress a Priority pattern');
  assert.equal(formMode('row', { formLog: clean, today: TODAY, checkins: [{ date: '2026-11-15', pain: 5 }] }), null, 'pain ≥ 4 on a rated day blocks progress');
  assert.equal(formMode('row', { formLog: [R('2026-11-20', 'clean'), R('2026-11-20', 'clean'), R('2026-11-20', 'clean')], today: TODAY }), null, 'one day is not enough');
  assert.equal(formMode('row', { formLog: clean, today: TODAY, state: { row: { mode: 'regress', changedAt: '2026-11-05' } } }), null, 'a regressed move that earns progress returns to normal');
  assert.equal(formMode('row', { formLog: [R('2026-11-22', 'hard')], today: TODAY, checkins: [{ date: '2026-11-22', pain: 2 }], log: [{ date: '2026-11-22', pain: 4 }] }), 'regress', 'hard + pain rose after the session');
});
test('menus: every id exists and is safe for an extension-intolerant profile; removed moves stay out', () => {
  const flags = new Set(['extension-intolerant']);
  for (const [k, m] of Object.entries(MENU)) for (const ph of ['reset', 'control', 'strengthen', 'integrate']) for (const id of m[ph]) { assert.ok(lib.get(id), id); assert.equal(exclusionReason(lib.get(id), flags), null, `${k}.${ph} ${id}`); }
  const all = Object.values(MENU).flatMap(m => ['reset', 'control', 'strengthen', 'integrate'].flatMap(p => m[p]));
  for (const id of ['new-seated-thoracic-opener', 'wallangel', 'new-standing-chest-opener', 'kickback']) assert.ok(!all.includes(id), id + ' was removed by the physio review');
});
