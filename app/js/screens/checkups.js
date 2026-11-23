// Check-ups: movement assessment (13 tests), posture check (8 band + 5 bodyweight),
// the corrective posture plan they build, and the photo check read by Muse.
import { html, useState, useEffect } from '../../vendor/htm-preact.mjs';
import { Icon, glyphFor } from '../ui/icons.js';
import { Sheet } from '../ui/kit.js';
import { state, update, isDemo } from '../store.js';
import { ctx, lib, movementTests, postureTests, postureDoc, BASE } from '../data.js';
import { route, go } from '../router.js';
import { scoreAssessment, answeredCount, directionFlags } from '../engine/assessment.js';
import { finishCheck, postureFindings, checkGate, retestDue, GSEV, testComplete, STOP_PAIN } from '../engine/posture.js';
import { buildCorrectivePlan, PHASES } from '../engine/corrective.js';
import { flareActive } from '../engine/plan.js';
import { dayStr, daysBetween } from '../engine/dates.js';
import { VIEWS, STANCE, buildRequest, parseResult, consistency, PHOTO_LABEL, VERDICT_TEXT, TO_TEST } from '../engine/photo.js';
import * as media from '../media.js';

const GCLS = { Clear: 'good', Mild: 'calm', Moderate: 'warn', Priority: 'att' };
export const GradeChip = ({ g }) => (g ? html`<span class=${`tag ${GCLS[g] || ''}`}>${g}</span>` : html`<span class="caption">not tested</span>`);
const fmtD = d => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: daysBetween(d, dayStr()) > 300 ? 'numeric' : undefined }) : 'never');
const RedFlags = () => html`<section class="card glass-thin" style="box-shadow:var(--g-border),inset 3px 0 0 var(--c-bad)"><div class="kicker" style="color:var(--c-bad)">Stop rules — read first</div>
  <p class="callout mt-2">New numbness in the groin or saddle area, new leg weakness, or changes in bladder or bowel control need urgent care — not a test. Pain that is worse at night and not eased by any position, fever, unexplained weight loss, or pain after a fall or accident: see a doctor before testing. Sharp, electric, leg or arm pain, or dizziness during any test: stop that test. BackForge screens patterns; it does not diagnose.</p></section>`;

export function Checkups() {
  const sub = route().parts[1];
  if (sub === 'movement') return html`<${MovementWizard} />`;
  if (sub === 'posture') return html`<${PostureWizard} />`;
  if (sub === 'photos') return html`<${PhotoCheck} />`;
  return html`<${Hub} />`;
}

// ------------------------------------------------------------------ hub
function Hub() {
  const S = state(), c = ctx(), plan = buildCorrectivePlan(lib(), c, S);
  const last = S.posture.bandChecks.at(-1), due = retestDue(last), photo = S.posture.assessments.at(-1);
  const cons = photo && last ? consistency(photo, last) : [];
  return html`<header class="screen-head"><div><div class="sub">Assess · correct · retest</div><h1>Check-ups</h1></div></header>
  <div class="grid-2"><div class="col">
    <${PlanCard} plan=${plan} />
    <section class="card glass"><div class="row between"><div><div class="kicker">Posture check · 13 tests</div><div class="headline">Band + bodyweight</div></div><span class="caption">${fmtD(last?.date)}</span></div>
      <p class="callout mt-2">Grades your pelvis & core, head & neck, upper back and shoulders. The grades write your posture plan.</p>
      ${last && html`<div class="list mt-3">${Object.entries(postureDoc().patterns).map(([k, p]) => html`<div><span class="grow"><span class="t">${p.problem}</span><br/><span class="d">${p.label}</span></span><${GradeChip} g=${last.summary?.[k] || (k === 'head' || k === 'shoulders' ? last.summary?.upper : null)} /></div>`)}</div>`}
      ${due && html`<p class="caption mt-2">${due <= dayStr() ? 'Retest is due now.' : `Retest on ${fmtD(due)}.`}</p>`}
      <a class="btn primary mt-3" href="#/checkup/posture">${last ? 'Retake the posture check' : 'Start the posture check'} · ~15 min</a></section>
  </div><div class="col">
    <section class="card glass"><div class="row between"><div><div class="kicker">Movement assessment · 13 tests</div><div class="headline">Direction, glutes, hips, core</div></div><span class="caption">${fmtD(S.assessHistory.at(-1)?.date)}</span></div>
      <p class="callout mt-2">${S.results?.length ? `${S.results.filter(f => f.sev !== 'ok').length} findings shape every session.` : 'Finds your direction preference, glute firing, hip rotation and endurance gaps — the plan is built from these.'}</p>
      <a class="btn ${S.results?.length ? 'ghost' : 'primary'} mt-3" href="#/checkup/movement">${S.results?.length ? 'Retake' : 'Start'} · ~12 min</a></section>
    <section class="card glass"><div class="row between"><div><div class="kicker">Photo check · read by Muse</div><div class="headline">Four standing photos</div></div><span class="caption">${fmtD(photo?.date)}</span></div>
      <p class="callout mt-2">Photos confirm what the tests found and show change over time. They stay on this device until you send them to Muse.</p>
      ${cons.length > 0 && html`<div class="list mt-3">${cons.map(x => html`<div><span class="grow"><span class="t">${PHOTO_LABEL[x.pattern]}</span><br/><span class="d">${VERDICT_TEXT[x.verdict]}</span></span><${Verdict} v=${x.verdict} /></div>`)}</div>`}
      <a class="btn ${photo ? 'ghost' : 'primary'} mt-3" href="#/checkup/photos">Open photo check</a></section>
    <section class="card glass-thin"><p class="caption">Encrypted photo vault and PIN setup stay in the <a href=${BASE + 'classic/index.html#more'}>classic tools</a> for now — same data.</p></section>
  </div></div>`;
}
const Verdict = ({ v }) => html`<span class=${`tag ${v === 'agrees' ? 'good' : v === 'photo-shows-more' ? 'warn' : v === 'photo-shows-less' ? 'calm' : ''}`}>${v === 'agrees' ? 'Agrees' : v === 'photo-shows-more' ? 'More' : v === 'photo-shows-less' ? 'Less' : '—'}</span>`;

export function PlanCard({ plan, compact = false }) {
  if (!plan.hasData) return html`<section class="card glass"><div class="kicker">Your posture plan</div><div class="headline mt-2">Built from what's weak</div><p class="callout mt-2">Take the posture check (band + bodyweight tests). BackForge grades forward head, hunched upper back, rounded shoulders and pelvic tilt, then builds a phased plan around the weakest links.</p><a class="btn primary mt-3" href="#/checkup/posture">Start the posture check</a></section>`;
  return html`<section class="card glass"><div class="row between"><div><div class="kicker">Your posture plan</div><div class="headline">${plan.focus.length ? `${plan.focus.length} area${plan.focus.length > 1 ? 's' : ''} to correct` : 'Maintaining'}</div></div>${plan.retestIn != null && html`<span class="caption">retest ${plan.retestIn === 0 ? 'due' : `in ${plan.retestIn} d`}</span>`}</div>
    <div class="list mt-3">${plan.patterns.map(p => html`<details class="pattern-row"><summary class="row" style="width:100%;gap:12px;cursor:pointer;list-style:none">
      <span class="grow"><span class="t">${p.label}</span><br/><span class="d">${p.phaseLabel} phase · ${p.perWeek >= 7 ? 'daily' : `${p.perWeek}× a week`}${p.trend ? ` · ${p.trend === 'better' ? 'improving' : p.trend === 'worse' ? 'slipped' : 'holding'} since last check` : ''}${p.source === 'assessment' ? ' · from movement assessment' : ''}</span></span><${GradeChip} g=${p.grade} /></summary>
      ${!compact && html`<div style="padding:4px 0 10px"><p class="caption mb-2">${p.phaseWhat}</p>${p.moves.map(m => html`<a class="row" href=${`#/moves/${m.id}`} style="gap:10px;padding:6px 0"><span class="glyph" style="width:36px;height:36px"><${Icon} n=${glyphFor(lib().get(m.id))} s=${18} /></span><span class="grow"><span class="t" style="font-size:14px">${m.name}</span><br/><span class="d">${m.dose}${m.note ? ` · ${m.note}` : ''}</span></span>${m.form === 'progress' && html`<span class="tag good">Progress</span>`}${m.form === 'regress' && html`<span class="tag warn">Easier</span>`}</a>`)}</div>`}
    </details>`)}</div>
    <a class="btn primary big mt-4" href="#/live/play?variant=posture&mins=15&energy=ok"><${Icon} n="play" fill /> Start posture session · 15 min</a>
    <p class="caption mt-2">Voice-coached. Rate your form after each move — it tunes the plan.</p></section>`;
}

// ------------------------------------------------------------------ shared wizard bits
function Choice({ label, options, value, onPick, name }) {
  return html`<fieldset class="mt-4" style="border:0;padding:0"><legend class="kicker mb-2">${label}</legend>
    <div class="choice-list" role="radiogroup" aria-label=${label}>${options.map(([v, l]) => html`<button role="radio" aria-checked=${value === v} class="choice" onClick=${() => onPick(v)} name=${name}>${l}</button>`)}</div></fieldset>`;
}
const Progress = ({ i, n }) => html`<div class="wiz-prog" role="progressbar" aria-valuemin="0" aria-valuemax=${n} aria-valuenow=${i}><i style=${`width:${(i / n) * 100}%`}></i></div>`;

// ------------------------------------------------------------------ movement assessment
function MovementWizard() {
  const tests = movementTests();
  const [step, setStep] = useState(0), [, force] = useState(0), [done, setDone] = useState(null);
  const S = state(), A = S.answers;
  const set = (k, v) => { update(x => { x.answers[k] = v; }); force(n => n + 1); };
  const n = answeredCount(tests, A);
  if (done) return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Your findings</h1></div></header>
    <section class="card glass"><p class="callout">${done.filter(f => f.sev !== 'ok').length} findings. Each says exactly what changed in your plan.</p>
    <div class="list mt-3">${done.map(f => html`<div style="align-items:flex-start"><span class=${`tag ${f.sev === 'high' ? 'att' : f.sev === 'mod' ? 'warn' : 'good'}`}>${f.sev === 'high' ? 'Priority' : f.sev === 'mod' ? 'Watch' : 'Clear'}</span><span class="grow"><span class="t">${f.t}</span><br/><span class="d">${f.d}</span><br/><span class="d" style="color:var(--c-ink-2)"><b>In your plan:</b> ${f.fix}</span></span></div>`)}</div>
    <${DirectionNote} findings=${done} />
    <div class="row wrap mt-4"><a class="btn primary" href="#/checkup/posture">Next: posture check</a><a class="btn ghost" href="#/today">Back to Today</a></div></section>`;
  if (step === 0) return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Movement assessment</h1></div></header>
    <div class="grid-2"><div class="col"><${RedFlags} /><section class="card glass"><p class="callout">13 short tests, about 12 minutes. Answer honestly — the plan is built from these. Skip anything painful: a skipped test is no data and never creates a finding.</p>
      <p class="caption mt-2">${n} of 13 answered so far. Answers save as you go.</p>
      <button class="btn primary big mt-4" onClick=${() => setStep(1)}>${n ? 'Continue' : 'Start'} — test 1 of 13</button></section></div></div>`;
  const t = tests[step - 1];
  const sides = t.kind === 'sides' ? ['L', 'R'] : null;
  const next = () => { if (step < tests.length) { setStep(step + 1); scrollTo(0, 0); } else setStep(99); };
  if (step === 99) return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Ready to score</h1></div></header>
    <section class="card glass"><p class="callout">${n} of 13 tests answered.${n < 6 ? ' At least 6 are needed for a fair read.' : ''}</p>
      <div class="row wrap mt-4"><button class="btn primary" disabled=${n < 6} onClick=${() => { const st = state(), F = scoreAssessment(st.answers); update(x => { x.results = F; x.assessHistory.push({ date: dayStr(), flags: F.map(f => f.t), dir: { dirext: st.answers.dirext ?? null, dirbend: st.answers.dirbend ?? null } }); const d = directionFlags(x, F, dayStr()); x.profile = { ...(x.profile || {}), ...d.set }; }); setDone(F); }}>Score my assessment</button><button class="btn ghost" onClick=${() => setStep(1)}>Review answers</button></div></section>`;
  return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a> · ${t.domain}</div><h1 style="font-size:28px;line-height:34px">${t.name}</h1></div></header>
    <${Progress} i=${step} n=${tests.length} />
    <div class="grid-2 mt-4"><div class="col"><section class="card glass"><div class="kicker">How</div><p class="mt-2">${t.how}</p><details class="more mt-3"><summary>Why this test</summary><p class="callout">${t.why}</p></details></section></div>
    <div class="col"><section class="card glass">
      ${t.kind === 'opts' && html`<${Choice} label="Your result" options=${t.options} value=${A[t.id]} onPick=${v => set(t.id, v)} />`}
      ${sides && sides.map(sd => html`<${Choice} label=${sd === 'L' ? 'Left side' : 'Right side'} options=${t.options} value=${A[t.id + '_' + sd]} onPick=${v => set(t.id + '_' + sd, v)} />`)}
      ${t.kind === 'nums' && html`<div class="grid-2 mt-3">${['L', 'R'].map(sd => html`<label><span class="kicker">${sd === 'L' ? 'Left' : 'Right'} — seconds</span><input type="number" inputmode="numeric" min="0" max="600" value=${A[t.id + '_' + sd] ?? ''} onInput=${e => set(t.id + '_' + sd, e.target.value)} /></label>`)}</div>`}
      <div class="row between mt-6"><button class="btn ghost" onClick=${() => setStep(step - 1)}>Back</button><button class="btn primary" onClick=${next}>${step === tests.length ? 'Finish' : 'Next'}</button></div>
    </section></div></div>`;
}

/** Sticky direction intolerance: say it stays on, and offer to clear only when two retests ≥ 28 days apart allow it. */
function DirectionNote({ findings }) {
  const [, force] = useState(0);
  const S = state(), d = directionFlags(S, findings, dayStr()), p = S.profile || {};
  const kept = (p.extIntolerant && !findings.some(f => f.t.startsWith('Extension-intolerant'))) || (p.flexIntolerant && !findings.some(f => f.t.startsWith('Flexion-intolerant')));
  if (!kept && !d.canClearExt && !d.canClearFlex) return null;
  const clear = k => { update(x => { x.profile = { ...(x.profile || {}) }; delete x.profile[k]; }); force(n => n + 1); };
  return html`<div class="banner mt-4" style="background:color-mix(in oklab,var(--c-calm) 14%,transparent);display:block">
    ${p.extIntolerant && html`<p><b>Back-bending stays out of your plan.</b> You were extension-intolerant on ${p.extIntolerant.since}; one good retest doesn't change that.</p>`}
    ${p.flexIntolerant && html`<p class="mt-2"><b>Loaded forward bending stays capped.</b> Flexion-intolerant since ${p.flexIntolerant.since}.</p>`}
    ${d.canClearExt && html`<div class="mt-3"><p class="callout">Your last two extension tests, at least 28 days apart, didn't provoke symptoms. Allow back-bending moves again?</p><button class="btn ghost mt-2" onClick=${() => clear('extIntolerant')}>Yes, allow them again</button></div>`}
    ${d.canClearFlex && html`<div class="mt-3"><p class="callout">Your last two forward-bend tests, at least 28 days apart, were fine. Lift the flexion cap?</p><button class="btn ghost mt-2" onClick=${() => clear('flexIntolerant')}>Yes, lift it</button></div>`}
  </div>`;
}

// ------------------------------------------------------------------ posture check
const SETS = { all: 'All 13 tests (~15 min)', band: '8 band tests', bodyweight: '5 bodyweight tests (no band)' };
function PostureWizard() {
  const S = state(), doc = postureDoc(), all = doc.tests, c = ctx();
  const [w, setW] = useState(() => S.posture.draftV2 || { step: 0, inputs: {}, band: 'light', set: 'all' });
  const [result, setResult] = useState(null);
  const save = nw => { setW(nw); update(x => { x.posture.draftV2 = nw.step === 0 && !Object.keys(nw.inputs).length ? null : nw; }); };
  const tests = all.filter(t => w.set === 'all' || t.kind === w.set);
  const last = S.posture.bandChecks.at(-1);
  const gate = checkGate({ today: dayStr(), flare: flareActive(c), last });
  const finish = inputs => {
    const check = finishCheck({ inputs, tests: all, date: dayStr(), band: w.band, prev: last });
    if (!check) { save({ ...w, step: 0, inputs: {} }); return; }
    const findings = postureFindings(check, all);
    update(x => { x.posture.bandChecks.push(check); x.posture.findings = findings; x.posture.draftV2 = null; });
    setResult(check); scrollTo(0, 0);
  };
  const advance = nw => { if (nw.step > tests.length) finish(nw.inputs); else save(nw); };
  if (result) return html`<${PostureResult} check=${result} />`;
  if (!gate.ok) return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Not today</h1></div></header><section class="card glass"><p>${gate.why}</p><a class="btn ghost mt-4" href="#/checkup">Back</a></section>`;
  if (w.step === 0) return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Posture check</h1></div></header>
    <div class="grid-2"><div class="col"><${RedFlags} />
      <section class="card glass"><p class="callout">Short band and bodyweight tests that grade four areas: <b>pelvis & core</b> (anterior pelvic tilt), <b>head & neck</b> (forward head), <b>upper back</b> (hunched / kyphosis) and <b>shoulders</b> (rounded). Honest grades beat heroic ones. Skipping a test records nothing; tests you don't retake keep their last grade.</p></section></div>
    <div class="col"><section class="card glass">
      <${Choice} label="Which tests" options=${Object.entries(SETS)} value=${w.set} onPick=${v => save({ ...w, set: v })} />
      ${w.set !== 'bodyweight' && html`<${Choice} label="Band you're using" options=${[['light', 'Lightest'], ['medium', 'Medium']]} value=${w.band} onPick=${v => save({ ...w, band: v })} />`}
      <button class="btn primary big mt-6" onClick=${() => save({ ...w, step: 1 })}>${Object.keys(w.inputs).length ? 'Continue' : 'Start'} — test 1 of ${tests.length}</button>
      ${Object.keys(w.inputs).length > 0 && html`<button class="btn text w-full" onClick=${() => save({ step: 0, inputs: {}, band: 'light', set: w.set })}>Discard saved answers</button>`}
    </section></div></div>`;
  const t = tests[w.step - 1], inp = w.inputs[t.id] || {};
  const setIn = (k, v) => save({ ...w, inputs: { ...w.inputs, [t.id]: { ...inp, [k]: v, skip: undefined } } });
  const complete = testComplete(t, inp);
  const area = doc.patterns[t.pattern];
  return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a> · ${area.label} · ${t.kind === 'band' ? 'band' : 'bodyweight'}</div><h1 style="font-size:28px;line-height:34px">${t.name}</h1></div></header>
    <${Progress} i=${w.step} n=${tests.length} />
    <div class="grid-2 mt-4"><div class="col"><section class="card glass"><div class="kicker">Equipment</div><p class="callout">${t.equipment}</p><div class="kicker mt-3">How</div><p class="mt-2">${t.setup}</p>${t.evidence && html`<details class="more mt-3"><summary>Why this test</summary><p class="callout">${t.evidence}</p></details>`}</section></div>
    <div class="col"><section class="card glass">
      ${t.inputs.map(x => html`<${Choice} label=${x.label} options=${x.options} value=${inp[x.key]} onPick=${v => setIn(x.key, v)} />`)}
      <${Choice} label="Pain during this test" options=${doc.painOptions} value=${inp.pain} onPick=${v => setIn('pain', v)} />
      ${STOP_PAIN.includes(inp.pain) && html`<p class="callout mt-2" style="color:var(--c-attention)">Stop this test now. It grades Priority and flags your physio — don't push through it.${inp.pain === 'arm' || inp.pain === 'dizzy' ? ' If arm symptoms or dizziness are new or don’t settle, see a clinician.' : ''}</p>`}
      <div class="row between mt-6 wrap">
        <button class="btn ghost" onClick=${() => save({ ...w, step: w.step - 1 })}>Back</button>
        <button class="btn text" onClick=${() => advance({ ...w, step: w.step + 1, inputs: { ...w.inputs, [t.id]: { skip: true } } })}>Skip test</button>
        <button class="btn primary" disabled=${!complete} onClick=${() => { advance({ ...w, step: w.step + 1 }); scrollTo(0, 0); }}>${w.step === tests.length ? 'See my grades' : 'Next'}</button></div>
      ${!complete && html`<p class="caption mt-2">Answer every group (or skip the test) — an unanswered test records nothing.</p>`}
    </section></div></div>`;
}

function PostureResult({ check }) {
  const S = state(), doc = postureDoc(), prev = S.posture.bandChecks.at(-2), plan = buildCorrectivePlan(lib(), ctx(), S);
  return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Your posture grades</h1></div></header>
  <div class="grid-2"><div class="col"><section class="card glass">
    <div class="list">${Object.entries(doc.patterns).map(([k, p]) => html`<div><span class="grow"><span class="t">${p.problem}</span><br/><span class="d">${p.label}${prev?.summary?.[k] ? ` · was ${prev.summary[k]}` : ''}</span></span><${GradeChip} g=${check.summary[k]} /></div>`)}</div>
    ${check.painFlag && html`<p class="callout mt-3" style="color:var(--c-attention)"><b>A test was stopped for leg or sharp pain.</b> It grades Priority and is flagged for your physio. No retest for 7 days.</p>`}
    ${Object.keys(check.carried).length > 0 && html`<p class="caption mt-3">Kept from ${Object.values(check.carried)[0]} (not retaken today): ${Object.keys(check.carried).map(k => doc.tests.find(t => t.id === k)?.name || k).join(', ')}.</p>`}
    <details class="more mt-3"><summary>Every test</summary><div class="list">${doc.tests.filter(t => check.grades[t.id]).map(t => html`<div><span class="grow t" style="font-size:14px">${t.name}</span><${GradeChip} g=${check.grades[t.id]} /></div>`)}</div></details>
  </section></div><div class="col"><${PlanCard} plan=${plan} />
    <section class="card glass-thin"><div class="headline">Confirm with photos</div><p class="callout mt-2">Take the four standing photos now and send them to Muse — it checks whether the photos agree with these grades.</p><a class="btn ghost mt-3" href="#/checkup/photos">Photo check</a></section></div></div>`;
}

// ------------------------------------------------------------------ photo check
function PhotoCheck() {
  const S = state();
  const [, force] = useState(0); const refresh = () => force(n => n + 1);
  const [urls, setUrls] = useState({});
  const [sheet, setSheet] = useState(null); const [msg, setMsg] = useState('');
  const caps = S.posture.captures.filter(c => c.status !== 'discarded');
  const cap = [...caps].reverse().find(c => c.status !== 'done') || null;
  const prev = [...caps].reverse().find(c => c !== cap && Object.keys(c.views || {}).length);
  useEffect(() => { (async () => { const ids = caps.flatMap(c => Object.values(c.views || {})); const o = {}; for (const id of ids) o[id] = await media.url(id); setUrls(o); })(); }, [S.posture.captures.length, JSON.stringify(cap?.views || {})]);
  const start = () => { update(x => x.posture.captures.push({ id: 'cap-' + Date.now().toString(36), date: dayStr(), status: 'collecting', views: {}, viewMeta: {}, requestId: null, checks: {} })); refresh(); };
  const mut = fn => { update(x => { const c = x.posture.captures.find(y => y.id === cap.id); fn(c); }); refresh(); };
  const onFile = async (view, file) => {
    if (!file) return;
    try { const n = await media.normalise(file); const pid = 'ph-' + Date.now().toString(36) + '-' + view; await media.put(pid, n.blob); if (cap.views[view]) await media.del(cap.views[view]); mut(c => { c.views[view] = pid; c.viewMeta = { ...(c.viewMeta || {}), [view]: { widthPx: n.widthPx, heightPx: n.heightPx } }; }); setMsg('Photo saved on this device.'); }
    catch (e) { setMsg('Could not save that photo: ' + e.message); }
  };
  const have = cap ? Object.keys(cap.views || {}) : [];
  const ready = have.includes('front') && (have.includes('side-right') || have.includes('side-left'));
  const sendToMuse = async () => {
    const req = buildRequest({ capture: cap, prevCapture: prev, S: state(), today: dayStr() });
    mut(c => { c.requestId = req.requestId; c.status = 'waiting'; });
    const files = [new File([JSON.stringify(req, null, 1)], 'backforge-posture-request.json', { type: 'application/json' })];
    for (const v of VIEWS) { const id = cap.views[v.id]; if (id) files.push(new File([await media.get(id)], v.id + '.jpg', { type: 'image/jpeg' })); }
    if (prev) for (const v of VIEWS) { const id = prev.views?.[v.id]; if (id) { const b = await media.get(id); if (b) files.push(new File([b], 'prev-' + v.id + '.jpg', { type: 'image/jpeg' })); } }
    try { await navigator.clipboard?.writeText(req.prompt); } catch {}
    if (navigator.canShare?.({ files })) { try { await navigator.share({ files, title: 'BackForge posture check', text: 'Muse: please run this BackForge posture check (request file + photos attached) and reply with the result JSON.' }); setMsg('Shared. When Muse replies, tap "Record Muse’s result".'); return; } catch (e) { if (e.name === 'AbortError') return; } }
    for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); await new Promise(r => setTimeout(r, 250)); }
    setMsg(`Downloaded ${files.length} files and copied the prompt. Send them all to Muse, then record the reply here.`);
  };
  const lastA = S.posture.assessments.at(-1), lastCheck = S.posture.bandChecks.at(-1);
  const cons = lastA ? consistency(lastA, lastCheck) : [];

  return html`<header class="screen-head"><div><div class="sub"><a href="#/checkup">Check-ups</a></div><h1>Photo check</h1></div></header>
  <div class="grid-2"><div class="col">
    ${!cap ? html`<section class="card glass"><div class="headline">Four standing photos</div><ul class="callout mt-2" style="padding-left:18px">${STANCE.map(s => html`<li>${s}</li>`)}</ul>
      <p class="caption mt-2">Photos are re-encoded on this device (location and camera data removed) and never leave it unless you send them.</p>
      <button class="btn primary mt-4" onClick=${start}>Start a photo check</button></section>`
    : html`<section class="card glass"><div class="row between"><div class="headline">${have.length} of 4 views</div><span class="caption">${fmtD(cap.date)} · ${cap.status === 'waiting' ? 'waiting for Muse' : 'collecting'}</span></div>
      <div class="photo-grid mt-3">${VIEWS.map(v => { const id = cap.views[v.id], ghost = !id && prev?.views?.[v.id]; const checks = cap.checks?.[v.id] || []; const allTicked = checks.length === v.checks.length;
        return html`<div class="photo-cell glass-thin">
          <div class="photo-frame">${id && urls[id] ? html`<img src=${urls[id]} alt=${v.label + ' photo'} />` : ghost && urls[ghost] ? html`<img src=${urls[ghost]} style="opacity:.35" alt="Last time — line up with this" /><span class="caption ghost-note">Last time — line up with this</span>` : html`<${Icon} n="you" s=${40} />`}</div>
          <b>${v.label}</b>
          ${!id && html`<div class="mt-2">${v.checks.map((ch, i) => html`<label class="row caption" style="gap:8px;padding:3px 0"><input type="checkbox" checked=${checks.includes(i)} onChange=${e => mut(c => { const cur = new Set(c.checks?.[v.id] || []); e.target.checked ? cur.add(i) : cur.delete(i); c.checks = { ...(c.checks || {}), [v.id]: [...cur] }; })} />${ch}</label>`)}</div>`}
          <label class=${`btn ${id ? 'ghost' : allTicked ? 'primary' : 'ghost'} mt-2`} style="min-height:40px;font-size:14px">${id ? 'Retake' : allTicked ? 'Take photo' : 'Take anyway'}<input type="file" accept="image/*" capture="environment" hidden onChange=${e => { onFile(v.id, e.target.files?.[0]); e.target.value = ''; }} /></label>
        </div>`; })}</div>
      ${msg && html`<p class="caption mt-2" role="status">${msg}</p>`}
      <button class="btn primary big mt-4" disabled=${!ready} onClick=${sendToMuse}><${Icon} n="spark" s=${18} /> Send to Muse for review</button>
      <p class="caption mt-2">${ready ? `Shares the photos${prev ? ', your previous set' : ''} and a request with your test grades, so Muse can say whether the photos agree and what changed.` : 'Needs the front view and at least one side view.'}</p>
      <div class="row wrap mt-3"><button class="btn ghost" onClick=${() => setSheet('import')}>Record Muse’s result</button>
        <button class="btn text" style="color:var(--c-attention)" onClick=${async () => { for (const id of Object.values(cap.views)) await media.del(id); mut(c => { c.status = 'discarded'; c.views = {}; }); }}>Discard set</button></div>
    </section>`}
    ${caps.filter(c => Object.keys(c.views || {}).length).length >= 2 && html`<${Compare} caps=${caps.filter(c => Object.keys(c.views || {}).length)} urls=${urls} />`}
  </div><div class="col">
    ${lastA ? html`<section class="card glass"><div class="row between"><div class="kicker">Muse's read · ${fmtD(lastA.date)}</div>${lastCheck && html`<span class="caption">vs tests ${fmtD(lastCheck.date)}</span>`}</div>
      ${lastA.summary && html`<p class="mt-2">${lastA.summary}</p>`}
      ${cons.length > 0 && html`<div class="kicker mt-4 mb-2">Photos vs your tests</div><div class="list">${cons.map(x => html`<div style="align-items:flex-start"><span class="grow"><span class="t">${PHOTO_LABEL[x.pattern]}</span><br/><span class="d">Photo: ${x.photo || '—'} · Tests: ${x.test || '—'}${x.progress ? ` · ${x.progress === 'better' ? 'better than last photos' : x.progress === 'worse' ? 'worse than last photos' : x.progress === 'same' ? 'no visible change' : ''}` : ''}</span>${x.muse && x.muse !== x.verdict && html`<br/><span class="d" style="color:var(--c-warn)">Muse's read: ${VERDICT_TEXT[x.muse]?.toLowerCase()}</span>`}${x.why && html`<br/><span class="d" style="color:var(--c-ink-2)">${x.why}</span>`}</span><${Verdict} v=${x.verdict} /></div>`)}</div>
        <p class="caption mt-2">"Agrees" = within one grade. When photos show more than the tests, retake the tests; when they show less, your stance may have been posed. Photos are observations — your plan changes only from the tests.</p>`}
      <details class="more mt-3"><summary>All patterns Muse graded</summary><div class="list">${Object.entries(lastA.patterns).map(([k, p]) => html`<div style="align-items:flex-start"><span class="grow"><span class="t">${PHOTO_LABEL[k]}</span><br/><span class="d">${p.observations.join(' · ')}</span></span><span class="tag">${p.grade}${p.confidence != null ? ` · ${Math.round(p.confidence * 100)}%` : ''}</span></div>`)}</div></details>
      ${lastA.suggestedFocus?.length > 0 && html`<p class="caption mt-2">Muse suggests focusing on: ${lastA.suggestedFocus.join(', ')} (observation only).</p>`}
    </section>` : html`<section class="card glass-thin"><div class="headline">How the Muse review works</div><ol class="callout mt-2" style="padding-left:18px;display:grid;gap:6px"><li>Take the four photos above (ticking the stance checks).</li><li>Send to Muse — the share sheet opens on your phone; pick your chat with Muse. The request carries your test grades.</li><li>Muse replies with a result JSON. Paste it in "Record Muse’s result".</li><li>BackForge compares the photos with your tests and with last time.</li></ol></section>`}
    ${S.posture.assessments.length > 1 && html`<section class="card glass"><div class="kicker mb-3">Photo history</div><div class="list">${[...S.posture.assessments].reverse().map(a => html`<div><span class="grow"><span class="t">${fmtD(a.date)}</span><br/><span class="d">${Object.entries(TO_TEST).map(([k]) => a.patterns[k] ? `${PHOTO_LABEL[k]}: ${a.patterns[k].grade}` : null).filter(Boolean).join(' · ')}</span></span></div>`)}</div></section>`}
  </div></div>
  <${Sheet} open=${sheet === 'import'} onClose=${() => setSheet(null)} label="Record Muse's result"><${ImportResult} onDone=${t => { setSheet(null); setMsg(t); refresh(); }} capId=${cap?.id} /></${Sheet}>`;
}

function ImportResult({ onDone, capId }) {
  const [txt, setTxt] = useState(''), [err, setErr] = useState('');
  const save = raw => {
    try {
      const r = parseResult(raw, dayStr());
      update(x => { x.posture.assessments.push(r); const c = x.posture.captures.find(y => y.id === capId); if (c && c.status === 'waiting') c.status = 'done'; });
      onDone(`Muse's result recorded${r.dropped ? ` (${r.dropped} pattern${r.dropped > 1 ? 's' : ''} had unknown grades and were dropped)` : ''}.`);
    } catch (e) { setErr(e.message); }
  };
  return html`<h2 class="title2">Record Muse's result</h2><p class="callout mt-2">Paste the JSON Muse sent back, or pick the file.</p>
    <textarea class="mt-3" rows="8" placeholder='{"kind":"backforge-posture-result","version":2,...}' value=${txt} onInput=${e => setTxt(e.target.value)}></textarea>
    ${err && html`<p class="caption mt-2" style="color:var(--c-attention)">${err}</p>`}
    <div class="row wrap mt-3"><button class="btn primary" onClick=${() => save(txt)}>Save</button><label class="btn ghost">Pick file<input type="file" accept="application/json,.json,.txt" hidden onChange=${async e => { const f = e.target.files?.[0]; if (f) save(await f.text()); }} /></label></div>`;
}

function Compare({ caps, urls }) {
  const views = VIEWS.filter(v => caps.filter(c => c.views?.[v.id]).length >= 2);
  const [view, setView] = useState(views[0]?.id), [pos, setPos] = useState(50);
  if (!views.length) return null;
  const withV = caps.filter(c => c.views?.[view]);
  const a = withV[0], b = withV[withV.length - 1];
  return html`<section class="card glass"><div class="row between wrap"><div class="kicker">Then vs now</div><div class="chips">${views.map(v => html`<button class="chip sm" aria-pressed=${v.id === view} onClick=${() => setView(v.id)}>${v.label}</button>`)}</div></div>
    <div class="compare mt-3" style=${`--pos:${pos}%`}><img src=${urls[a.views[view]]} alt=${'First photo, ' + a.date} /><img class="after" src=${urls[b.views[view]]} alt=${'Latest photo, ' + b.date} /><i class="divider"></i>
      <span class="tag" style="position:absolute;left:8px;top:8px">${fmtD(a.date)}</span><span class="tag" style="position:absolute;right:8px;top:8px">${fmtD(b.date)}</span></div>
    <input type="range" min="0" max="100" value=${pos} onInput=${e => setPos(+e.target.value)} aria-label="Slide between first and latest photo" class="mt-3" /></section>`;
}
