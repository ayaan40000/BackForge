// Movement assessment scoring. Ported from the classic app's scoreAssessment()
// (v4.6), then revised after the physio review (v4.7 — docs/reviews/PHYSIO-REVIEW-2026-11.md):
// leg spread / centralisation on the direction tests, a 'painful' answer that
// counts as worse, sticky direction intolerance, IR severity by band gap, APT as
// a training target (mod) not a risk, side-plank timing tolerance, no diagnostic wording.
// Invariant: a skipped answer is NO DATA and can never produce a finding.

/** @param {Record<string,string>} answers  S.answers (testId or testId_L/_R → value) */
export function scoreAssessment(answers = {}) {
  const A = {}, F = [];
  for (const k of Object.keys(answers)) A[k] = answers[k] === 'skip' ? null : answers[k];
  const add = (sev, t, d, fix) => F.push({ sev, t, d, fix });
  // direction: 'painful' and 'leg' (spread down the leg) count as worse; 'central' counts as better
  const dir = v => (v === 'painful' || v === 'leg' ? 'worse' : v === 'central' ? 'better' : v);
  const bend = dir(A.dirbend), ext = dir(A.dirext);
  if (A.dirbend === 'leg' || A.dirext === 'leg') add('high', 'Symptoms spread into the leg on direction test', 'Pain travelled further into the buttock or leg during the ' + (A.dirext === 'leg' ? 'back-bend' : 'forward-bend') + ' test. That direction is out of your plan for now.', 'Stop this direction. If this is new, or comes with numbness or weakness, see a clinician.');
  if (ext === 'worse' && bend !== 'worse') add('high', 'Extension-intolerant pattern', 'Standing extension provokes symptoms while flexion does not. Press-ups, sphinx and prone back extension are out; hip thrusts and deadlifts finish with glutes, never a low-back arch. Anything done face-down uses a pillow under your belly.', 'Plan removes: press-ups, sphinx, prone extension. Adds: ribs-down bracing cues everywhere.');
  else if (bend === 'worse' && ext !== 'worse') add('high', 'Flexion-intolerant pattern', 'Forward bending provokes symptoms. Loaded spinal flexion is banned (it already is here) and hinge range stays above your cutoff.', 'Plan caps hinge range; McGill curl-up stays modified with hands under the back.');
  else if (bend === 'worse' && ext === 'worse') add('high', 'Both directions provoke', 'Both flexion and extension worsen symptoms — keep everything in the neutral middle and raise this with your physio before progressing load.', 'Neutral-spine only; micro versions until retest.');
  else if (bend && ext) add('ok', 'Direction-neutral (for now)', 'Neither direction clearly provokes. Proceed with the balanced program and retest in 4 weeks.', 'Standard plan.');
  let gluteHits = 0; const weak = new Set();
  for (const sd of ['L', 'R']) {
    const f = A['firing_' + sd], b = A['slbridge_' + sd], c = A['clamfeel_' + sd];
    let hits = 0;
    if (f === 'ham' || f === 'back') hits++;
    if (b === 'cramp' || b === 'drop') hits++;
    if (c === 'tfl') hits++;
    if (hits >= 2) { gluteHits++; weak.add(sd); }
  }
  if (gluteHits) add('high', 'Glute inhibition' + (weak.size ? ' — worse on the ' + [...weak].map(s => (s === 'L' ? 'left' : 'right')).join(' & ') + ' side' : ''), 'Two or more glute tests show compensation: hamstrings or low back firing first, cramping, or TFL taking over. Your back is doing your glutes’ job.', 'Daily band activation block; extra set on the weaker side; hamstring loading stays gentle until firing cleans up.');
  else if ((A.firing_L || A.slbridge_L) && (A.firing_R || A.slbridge_R)) add('ok', 'Glutes are firing', 'Firing order and bridge holds look clean. Progress loading as programmed.', 'Standard progression.');
  const thL = A.thomas_L, thR = A.thomas_R;
  const thomasSign = thL === 'lifted' || thL === 'lifted-ext' || thR === 'lifted' || thR === 'lifted-ext';
  if (thomasSign || A.pelvis === 'apt')
    add('mod', 'Anterior pelvic tilt pattern (lower-crossed)', (thomasSign && A.pelvis === 'apt' ? 'Both the hip-flexor test and the mirror check point to anterior tilt.' : 'One sign of anterior tilt; the posture check will confirm or rule it out.') + ' The hip-flexor test suggests tightness at the front while glutes and deep core under-work behind — a training target, not a risk.', 'Daily: hip flexor stretch + dead bug + glute bridge. Desk rule: stand every 30–40 min.' + (thL === 'lifted-ext' || thR === 'lifted-ext' ? ' Knee straightened on the test: the front-thigh (rectus) stretch replaces the hip-flexor stretch.' : ''));
  else if (A.pelvis && A.pelvis !== 'unsure') add('ok', 'Pelvic position looks neutral', 'No clear tilt pattern on self-check.', 'Maintenance mobility only.');
  if (A.slr === 'gap') add('mod', 'Hamstring control gap — not shortness', 'Passive range far exceeds active range. These hamstrings are firing protectively; aggressive stretching would make it worse. Strength and safety signals fix this.', 'No aggressive hamstring stretching anywhere in your plan.');
  if (A.slr === 'nerve') add('high', 'Nerve tension sign on leg raise', 'An electric or shooting tug, or one that grows when you pull your toes up, behaves like nerve sensitivity rather than muscle. Do not stretch into it; nerve work stays at a mild tug that fades within 10 seconds.', 'Flossing intensity capped; flag to physio if it persists. If this is new, or below the knee with numbness or weakness, see a clinician.');
  if (A.slr === 'equal') add('ok', 'Hamstrings genuinely short-ish', 'Active and passive match with a firm stretch — gentle stretching on your back with a strap is reasonable; never sitting toe-touch stretches.', 'Standard mobility dose, lying down only.');
  const irL = A.hipir_L, irR = A.hipir_R;
  const ir = v => ({ full: 3, mid: 2, low: 1 }[v] || 0);
  if ((irL && irR) || ((irL || irR) && (ir(irL) === 1 || ir(irR) === 1))) {
    if ((!irL || !irR) && (ir(irL) === 1 || ir(irR) === 1)) add('mod', 'Hip internal rotation limited on the tested side', 'The tested hip barely rotates inward. Complete the other side at the next sitting to check symmetry.', 'Prone IR rocks + 90/90 switches daily.');
    else if (ir(irR) > 0 && ir(irR) < ir(irL)) add(ir(irL) - ir(irR) >= 2 ? 'high' : 'mod', 'Right hip internal rotation deficit', 'The right hip rotates inward less than the left' + (ir(irL) - ir(irR) >= 2 ? ' by a clear margin' : ' (one band — within self-measurement error, so treated as a watch item)') + '. A stiff hip makes the lumbar spine rotate in its place during walking.', 'Daily IR block, right side first and doubled: prone IR rocks, 90/90 switches, adductor squeeze. Worth showing your physio if it has not changed by the retest.');
    else if (ir(irL) > 0 && ir(irL) < ir(irR)) add(ir(irR) - ir(irL) >= 2 ? 'high' : 'mod', 'Left hip internal rotation deficit', 'The left hip rotates inward less than the right' + (ir(irR) - ir(irL) >= 2 ? ' by a clear margin' : ' (one band — within self-measurement error)') + '. A stiff hip makes the lumbar spine rotate in its place.', 'Daily IR block, left side first and doubled. Worth showing your physio if it has not changed by the retest.');
    else if (ir(irL) === 1 || ir(irR) === 1) add('mod', 'Hip internal rotation limited both sides', 'Both hips are short on inward rotation. Daily mobility dose, no forcing.', '90/90 switches daily.');
    else add('ok', 'Hip rotation balanced', 'IR looks symmetric. Maintain with 90/90 work twice a week.', 'Maintenance dose.');
  }
  if (A.switch9090 === 'r-stuck' || A.switch9090 === 'l-stuck' || A.switch9090 === 'both') add('mod', '90/90 switch confirms rotation stiffness', 'The seated switch agrees with the prone test — rotation work stays daily until the retest.', 'See hip IR block.');
  const spL = parseFloat(A.sideplanksec_L), spR = parseFloat(A.sideplanksec_R);
  if (!isNaN(spL) && !isNaN(spR) && spL > 0 && spR > 0) {
    const ratio = Math.abs(spL - spR) / Math.max(spL, spR);
    if (ratio > 0.10 && Math.abs(spL - spR) >= 5) add('mod', 'Lateral endurance gap (' + Math.round(spL) + 's vs ' + Math.round(spR) + 's)', 'Side-bridge sides differ by more than 10% and at least 5 s (the app’s self-timing allowance on McGill’s guide). The weaker side gets an extra set until they converge.', 'Extra side-plank set on the weaker side.');
    else add('ok', 'Lateral endurance balanced', 'Sides within 10% of each other.', 'Standard Big 3 dosing.');
    if (Math.min(spL, spR) < 20) add('mod', 'Core endurance is low overall', 'At least one side is under 20 seconds from the knees. Endurance — not max strength — is the first rebuild target.', 'Big 3 in 10-second exposures, more sets, never to form failure.');
  }
  if (A.posturewall === 'nohead' || A.posturewall === 'both') add('mod', 'Forward-head posture', 'The head cannot reach the wall without strain — the test suggests the deep neck flexors tire early while the back of the neck overworks.', 'Chin tucks daily; monitor top at eye level.');
  if (A.posturewall === 'shoulders' || A.posturewall === 'both') add('mod', 'Rounded shoulders (upper-crossed)', 'Tight chest, weak scapular stabilizers. Rows, face pulls and pull-aparts are the counter — all band work, already in your plan.', 'Upper-body band block 3×/week.');
  if (A.guard === 'left') add('mod', 'Guarding: you shift LEFT when bending', 'You offload the right side — protective today, overloading the left side over time. The plan adds right-side single-leg work so the right side relearns trust.', 'Extra right-side bridge set; conscious even loading on hinges.');
  if (A.guard === 'right') add('mod', 'Guarding: you shift RIGHT when bending', 'You offload the left side. The plan adds left-side single-leg work to rebalance.', 'Extra left-side bridge set.');
  return F;
}

/** How many of the 13 tests have an answer (classic answeredCount()). Scorable at ≥ 6. */
export function answeredCount(tests, answers) {
  let n = 0;
  for (const t of tests) {
    if (t.kind === 'opts' && answers[t.id]) n++;
    if (t.kind === 'sides' && answers[t.id + '_L'] && answers[t.id + '_R']) n++;
    if (t.kind === 'nums' && (answers[t.id + '_L'] || answers[t.id + '_R'])) n++;
  }
  return n;
}

/**
 * Sticky direction intolerance (physio review M1). Once an assessment produces
 * Extension-/Flexion-intolerant, the flag stays on the profile even if a later
 * retest is fine. It may only be cleared when the last TWO assessments at least
 * 28 days apart both had that direction test answered "same" or "better" — and
 * the user confirms. Returns what to set and what may be offered for clearing.
 */
export function directionFlags(S, findings, today) {
  const prof = S.profile || {};
  const has = t => findings.some(f => f.t.startsWith(t));
  const set = {};
  if (has('Extension-intolerant') || has('Both directions')) set.extIntolerant = prof.extIntolerant || { since: today };
  if (has('Flexion-intolerant') || has('Both directions')) set.flexIntolerant = prof.flexIntolerant || { since: today };
  const ok = (key, v) => ['same', 'better', 'central'].includes(v);
  const canClear = k => {
    const field = k === 'extIntolerant' ? 'dirext' : 'dirbend';
    const hist = (S.assessHistory || []).filter(h => h.dir && h.dir[field] != null);
    if (hist.length < 2) return false;
    const a = hist[hist.length - 1], b = hist.slice(0, -1).reverse().find(h => (Date.parse(a.date) - Date.parse(h.date)) / 864e5 >= 28);
    return !!b && ok(k, a.dir[field]) && ok(k, b.dir[field]);
  };
  return { set, canClearExt: !!prof.extIntolerant && !set.extIntolerant?.fresh && canClear('extIntolerant') && !has('Extension-intolerant'), canClearFlex: !!prof.flexIntolerant && canClear('flexIntolerant') && !has('Flexion-intolerant') };
}
