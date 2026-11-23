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
  for (const t of PT) { assert.ok(GRADERS[t.id], t.id); assert.ok(PD.patterns[t.pattern], t.id); for (const g of ['Clear', 'Mild', 'Moderate', 'Priority']) assert.ok(t.planChange[g], `${t.id} planChange.${g}`); }
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
  assert.equal(GRADERS['pec-minor']({ R: '2', L: '0' }), 'Moderate');
  assert.equal(GRADERS['pec-minor']({ R: '2', L: '2' }), 'Priority');
  assert.equal(GRADERS['overhead-reach']({ reach: 'arch' }), 'Moderate');
  assert.equal(GRADERS['thoracic-rotation']({ R: '2', L: '0' }), 'Moderate');
  assert.equal(GRADERS['dnf-endurance']({ hold: '0', quality: 'tuck' }), 'Priority');
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
  assert.deepEqual(plan.patterns.map(p => [p.key, p.phase]), [['head', 'reset'], ['back', 'control'], ['apt', 'strengthen'], ['shoulders', 'integrate']]);
  for (const p of plan.patterns) for (const m of p.moves) assert.equal(exclusionReason(lib.get(m.id), ctx.flags), null, m.id);
  for (const k of Object.keys(MENU)) for (const ph of ['reset', 'control', 'strengthen', 'integrate']) for (const id of MENU[k][ph]) assert.ok(lib.get(id), `menu ${k}.${ph} references unknown move ${id}`);
  assert.equal(formStatus([{ id: 'x', r: 'hard' }, { id: 'x', r: 'clean' }, { id: 'x', r: 'hard' }], 'x'), 'regress');
  assert.equal(formStatus([{ id: 'x', r: 'clean' }, { id: 'x', r: 'clean' }, { id: 'x', r: 'clean' }], 'x'), 'progress');
  const S2 = stateWith({ head: 'Priority' }, { formLog: [{ id: 'chintuck', r: 'hard' }, { id: 'chintuck', r: 'hard' }] });
  const m = buildCorrectivePlan(lib, makeCtx(S2, TODAY), S2).patterns[0].moves.find(x => x.id === 'chintuck');
  assert.equal(m.form, 'regress'); assert.ok(/^1 ×/.test(m.dose), m.dose);
});
test('corrective plan falls back to movement findings when there is no posture check', () => {
  const S = { results: AYAAN, checkins: [], log: [], exLog: [], posture: { bandChecks: [], findings: [], formLog: [] } };
  const plan = buildCorrectivePlan(lib, makeCtx(S, TODAY), S);
  assert.deepEqual(plan.patterns.map(p => p.key).sort(), ['apt', 'head', 'shoulders']);
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
