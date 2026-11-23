# Physio review: self-assessment and corrective logic (Nov 2026)

Reviewer role: senior MSK / sports physiotherapist (spinal rehab, McGill-informed core, Janda crossed patterns, return-to-activity S&C).
Scope: `data/assessments/movement-tests.json`, `app/js/engine/assessment.js`, `data/assessments/posture-tests.json`, `app/js/engine/posture.js`, `app/js/engine/corrective.js`, `backend/data/exercises.json`, `data/exercises-desk.json`, AGENTS.md §3.
Profile under review: adult male, L4–L5 disc history, extension-intolerant, right glute inhibition, APT, right hip IR deficit, forward head / rounded shoulders.
Rule for the implementer: never rename an option **value** (history stores them). Labels, thresholds, graders, new values and new patterns are fine. Grades are stored per check, so relabelling does not rewrite old results; bump the posture check `v` to 3 when you ship the new graders.

## 1. Verdict

1. Broadly sound and conservative: skip = no data, leg/sharp-pain stop with a 7-day retest gate, flare gate, single-knee-only, extension contra on press-up/sphinx/prone extension. The architecture (grade → phase → menu) is good.
2. Biggest safety risk: the extension-intolerant flag exists only while the latest movement assessment says `dirext = worse`. A painful extension test answered "Skipped — painful" (value `skip`) or a later retest silently removes the flag, and press-ups/sphinx come back.
3. Second risk: the direction and SLR tests do not capture leg symptoms (peripheralisation), the one finding that matters most for an L4–L5 disc; and the posture pain question has no neck/arm option for the four neck and shoulder tests.
4. The five new bodyweight tests are usable but two are mis-calibrated: the pec-minor test grades a normal shoulder (about 2.5 cm off the floor) as abnormal, and the DNF test grades on "what ended it", which is the normal way the test ends. Overhead-reach over-calls Priority. Occiput-wall needs a "don't arch your low back" cue.
5. The plan has no hip pattern: the owner's right hip IR deficit and glute findings are folded into "apt" and never reach the IR or glute exercises. Several findings (APT, a one-band IR difference) are marked `high` on weak, eyeballed evidence.

## 2. MUST-FIX

| # | File / test id | Current rule | New rule (exact) | Rationale | Evidence |
|---|---|---|---|---|---|
| M1 | `engine/context.js` + `assessment.js` / `dirext` | Flag `extension-intolerant` exists only while `S.results` holds the finding. `skip` ("Skipped — painful") = no data. | (a) Add option value `painful` "Stopped: it hurt" to `dirext` and `dirbend`. Relabel `skip` to "Skipped: didn't do it". (b) Scoring: treat `painful` and `leg` (M2) as `worse` for the direction rules. (c) Make the flag sticky: when the finding is produced, set `S.profile.extIntolerant = {since: date}`. `makeCtx` adds the flag if `S.profile.extIntolerant` is set, whatever the latest results say. Clear it only when **two** assessments at least 28 days apart both have `dirext ∈ {same, better}` **and** the user confirms in a dialog ("Your last two extension tests didn't provoke symptoms. Allow back-bending moves again?"). Same rule for `flexion-intolerant`. | One retest on a good day must not put press-ups back for a known extension-intolerant disc. A painful test is an answer, not a skip; invariant 4 still holds (`skip` stays no data). | Long, Donelson & Fung 2004, *Spine* 29:2593 (directional preference: matching vs opposite exercise changes outcome); clinical consensus. |
| M2 | `movement-tests.json` / `dirbend`, `dirext` | Options better / same / worse / skip; symptoms not located. | Add values `leg` "Pain spread further into the buttock or leg" and `central` "Leg symptoms moved back toward the spine / eased". Scoring: `leg` ⇒ treat as `worse` **and** add a finding `sev:'high'`, title "Symptoms spread into the leg on direction test", fix "Stop this direction. If this is new, or comes with numbness or weakness, see a clinician." `central` ⇒ treat as `better`. Add to `how`: "Note where your symptoms are before you start. Stop at the first rep that sends symptoms further down the leg." Reduce `dirext` to "up to 5", `dirbend` to "up to 10, slide hands down the thighs". | Centralisation and peripheralisation are the most prognostic self-observable signs in disc-related pain; the current options cannot record them. | Werneke & Hart 2001, *Spine* 26:758 (centralisation prognosis); Long et al. 2004. |
| M3 | `posture-tests.json` `painOptions` + `posture.js gradeTest`, `checkGate` | Options none / back / leg / sharp; only leg/sharp stop the test. Back-centred wording on neck and shoulder tests. | Add `['arm','Pain, pins and needles or numbness into the arm']` and `['dizzy','Dizziness, headache or blurred vision']`. In `gradeTest`: `if (['leg','sharp','arm','dizzy'].includes(inp.pain)) return {grade:'Priority', painStop:true}`. In `finishCheck`, treat `arm`/`dizzy` like `leg` for `carriedPain`. `checkGate` message: "…stopped for leg, arm or sharp pain, or dizziness…". | DNF, chin-tuck, pec-minor and overhead tests load the neck and shoulder; arm symptoms and dizziness are the neck equivalents of leg pain. | Finucane et al. 2020, *JOSPT* 50:350 (red-flag framework); clinical consensus. |
| M4 | `movement-tests.json` / `slr` + `assessment.js` | `nerve` = "Sharp / electric tug behind the knee". `equal` ⇒ "gentle sustained stretching is reasonable". | `how` adds step 3: "Lower the leg just below where you feel the tug. Pull your toes toward you. Does the tug get stronger or spread?" and "Stop at the first tug; never pull through it." Relabel `nerve`: "Electric or shooting pain, my usual leg pain, OR the tug got stronger when I pulled my toes up". Finding for `nerve` keeps `high` and adds to `fix`: "If this is new, or below the knee with numbness or weakness, see a clinician." `equal` finding text: "…gentle stretching on your back with a strap, never sitting toe-touch stretches." | Behind-the-knee tug is normal on SLR, so the label is too unclear for self-judging. Ankle dorsiflexion is the standard way to tell nerve from muscle. Long-sitting stretches are loaded flexion for a disc. | Devillé et al. 2000, *Spine* 25:1140 (SLR is sensitive for disc herniation); Butler 2000, *The Sensitive Nervous System*. |
| M5 | `posture-tests.json` / `pec-minor` + grader | "Rests flat on the floor" = Clear; 1 finger = Mild; 2+ fingers = Moderate; both 2 = Priority. | Measure the **back of the bony tip of the shoulder (acromion)** to the floor. Setup: "Lie on your back, arms by your sides, palms up. Stand a bank card on its long edge on the floor next to your shoulder (it is 5.4 cm tall). Have someone look, or film from floor level at your side." Labels (values same): `0` "About 1 finger-width (2.5 cm) or less", `1` "Between 1 finger-width and the card's height (2.5–5 cm)", `2` "Higher than the card (over 5 cm)". Grader: `w=max(R,L); return ['Clear','Mild','Moderate'][w]`. **No Priority** from this test. Fix the `evidence` string to: "Acromion height in lying is a common screen for a short pec minor, but it is poor at telling short from normal. It is used only as a minor sign." | A normal shoulder sits about 2.5 cm off the table, so the current "flat" option marks almost everyone Mild or worse. The test is reliable but has weak diagnostic accuracy, so it must not drive a Priority grade. | Sahrmann 2002 (about 1 inch normal); Lewis & Valentine 2007, *BMC Musculoskelet Disord* 8:64 (reliable, poor diagnostic accuracy). |
| M6 | `posture-tests.json` / `dnf-endurance` + grader | Grades on time **and** quality; `poke` (tuck lost) and `shake` downgrade even at 30 s+. | Grader: `return ['Priority','Moderate','Mild','Clear'][+i.hold]`; quality is recorded only. Setup adds: "Put a folded towel under your head. Start a phone timer, tuck, lift just off the towel. The test **ends** when the tuck is lost, your chin pokes, or your head touches the towel for more than a second. Stop at 60 s." Relabel quality: `tuck` "Reached 60 s, or stopped by choice", `poke` "Tuck lost / chin poked (the normal end)", `shake` "Neck shook or ached early". Evidence string: "Deep neck flexor endurance test (Harris 2005): healthy adults averaged about 39 s, people with neck pain about 24 s." Remove "Jull" from it (Jull's test is the pressure-biofeedback CCFT, a different test). | In the published protocol, losing the tuck is the stop signal, not a fault. Grading on it counts it twice. Time bands are consistent with the norms. | Harris et al. 2005, *Phys Ther* 85:1349; Domenech et al. 2011, *PM&R* 3:105 (normative DNF endurance); Jull, O'Leary & Falla 2008, *JMPT* 31:525 (CCFT, separate test). |
| M7 | `posture-tests.json` / `overhead-reach` + grader | `arch` = Moderate, `far` = Priority; the options mix distance and compensation. | Measure **with ribs down only**. Labels: `floor` "Thumbs touch the floor, ribs stayed down", `gap` "Short by less than a hand-width", `far` "Short by a hand-width or more", `arch` "Couldn't keep my ribs down at all" (legacy). Grader: `{floor:'Clear', gap:'Mild', far:'Moderate', arch:'Moderate'}`. **No Priority.** Setup adds: "Feet flat, knees bent. If it pinches your low back or shoulder, stop." | Supine flexion range is limited by the shoulder and lats as much as the thoracic spine. It is not a strong enough single sign for Reset and a 14-day retest. | Sahrmann 2002 (shoulder flexion / lat length test); clinical consensus. |
| M8 | `posture-tests.json` / `occiput-wall` | Heels, buttocks, upper back on the wall; no lumbar cue. Gap bands skip 1 and 3 fingers. | Setup adds: "Do **not** arch your low back to get your shoulders or head onto the wall. A hand-flat gap at the low back is normal. Stop if your back complains." Labels (values same): `0` "Touches easily, chin level", `1` "Touches only if I tip my chin up, or a 1-finger gap", `2` "2–3 finger gap (about 3–5 cm)", `3` "4 fingers or more (about 6 cm+)". Keep the grader as it is. `planChange.Priority` adds: "A gap this size can be partly structural. Show your physio; not all of it will change with exercise." | An APT, extension-intolerant person will arch the lumbar spine to "pass", which provokes symptoms and hides the finding. The grader logic itself is reasonable (normal OWD in adults is 0). | Clinical consensus (OWD is a standard kyphosis / forward-head screen; normal is 0 cm). |
| M9 | `posture-tests.json` + `posture.js` + `corrective.js` / `hip-ir-band`, `glutemed-wall` | Both are `pattern: "apt"`. MENU has no hip/glute pattern, so IR and glute exercises never reach the corrective plan. | New pattern key `hips` (`patterns.hips = {label:'Hips & glutes', problem:'Hip rotation and glute control'}`). Set `pattern:'hips'` on `hip-ir-band` and `glutemed-wall`. `PATTERN_KEYS = ['apt','hips','head','back','shoulders']`. In `patternGrades`, if `last.summary.hips` is missing, compute `combineGrades([last.grades['hip-ir-band'], last.grades['glutemed-wall']])`. Add `derive('hips', /Glute inhibition\|internal rotation deficit/i)`. MENU in §4. Deficit side first: take the side from `hip-ir-band` (`rR`/`rL`) or the movement `hipir` finding title. | The owner's two most specific findings (right IR deficit, right glute) currently send him to pelvic-tilt and dead-bug work. | Ellison, Rose & Sahrmann 1990, *Phys Ther* 70:537 (hip rotation patterns in LBP). |
| M10 | `posture-tests.json` / `glutemed-wall` | "Inside leg is the stance leg; press the outside knee into the wall." This is physically backwards. | "Stand side-on, about a forearm's length from the wall. Stand on the leg **further** from the wall: that is the side being tested. Lift the near-wall knee to hip height and press the outside of that knee into the wall. Pelvis level, trunk upright. Hold, then turn round for the other side." | As written, the test cannot be done as intended, so the grades are noise. | Clinical consensus. |
| M11 | `assessment.js` / `hipir` | Any one-band L/R difference (for example `full` vs `mid`) ⇒ `high` "Right hip IR deficit … Physio should assess the right hip capsule". Bands overlap (40–45°). | Labels: `full` "40° or more", `mid` "25–39°", `low` "Under 25°". `how` adds: "Phone level app against the shin: read the angle from vertical." Pillow under the belly. Severity: a difference of 2 bands (`full` vs `low`) ⇒ `high`; 1 band ⇒ `mod` (title unchanged, so `derive` still matches). Replace "Physio should assess the right hip capsule" with "Worth showing your physio if it has not changed by the retest." | Eyeballed 15° bands; a one-band gap is within self-measurement error. "Capsule" is a diagnosis (invariant 6). | Ellison et al. 1990; clinical consensus on measurement error. |
| M12 | `assessment.js` / APT block | One `thomas` lifted on either side **or** `pelvis = apt` ⇒ `high`. | Severity `mod` always (title kept). Text: when both signs are present, "Both the hip-flexor test and the mirror check point to anterior tilt"; with one sign, "One sign of anterior tilt; the posture check will confirm or rule it out." Keep `high` only for safety findings: direction intolerance, both directions, nerve sign, leg spread (M2). | Mild APT is normal in most men, and pelvic tilt / lordosis does not differ between people with and without LBP. A self-administered Thomas test has poor pass/fail reliability. It is a training target, not a risk. | Herrington 2011, *Man Ther* 16:646 (most asymptomatic men tilt anteriorly); Laird et al. 2014, *BMC Musculoskelet Disord* 15:229; Peeler & Anderson 2007, *Phys Ther Sport* 8:14 (Thomas test reliability). |

## 3. SHOULD-CHANGE

| # | File / test id | Current | Change to | Why / evidence |
|---|---|---|---|---|
| S1 | `firing` (prone hip extension) | Self-palpated firing order; prone; lift 6 inches. | Pillow under the belly; lift "2–3 cm, knee straight". Add to `why`: "This is a rough self-check; it only counts together with the bridge and clam tests." Scoring is unchanged (2 of 3 per side already protects against one bad test). | Poor inter-examiner reliability even for clinicians: Murphy et al. 2006, *JMPT* 29:374. Prone hip extension through range extends the lumbar spine. |
| S2 | Finding text (Extension-intolerant) | "Press-ups and prone lying are OUT" (yet `proneir`, `pronehipext` and two tests are prone). | "Press-ups, sphinx and prone back extension are out. Anything done face-down uses a pillow under your belly." | Consistency with invariant 2 and the library. |
| S3 | `thomas` | Lie back hugging one knee; no exit cue. | "Hug the knee until your low back is flat on the table. To get up, roll onto your side and push up with your arms, never sit straight up." | Sitting up from supine is bodyweight flexion; the hanging leg extends the lumbar spine if the hug is loose. |
| S4 | `sideplanksec` + `assessment.js` | Gap when ratio > 10%, credited to "McGill's ~10%". "Core endurance is low" fires if **either** side < 20 s but says "Both sides". | Gap when `ratio > 0.10 && Math.abs(spL-spR) >= 5`. Text: "McGill uses a 5% guide on full side bridges timed by a clinician; for a self-timed knee version the app uses 10% and 5 s to allow for timing error." Low-endurance check `Math.max(spL,spR) < 20` (text "both") or keep `min` and say "at least one side". `how`: "Stop at 60 s, at the first form break, or at any pain. Rest 1 min between sides." | McGill, Childs & Liebenson 1999, *Arch Phys Med Rehabil* 80:941. |
| S5 | `posturewall` vs `occiput-wall` | Movement test: "heels a few inches out". Posture test: heels on the wall. | Use the same stance as M8 in both, with the same no-arch cue. | Two set-ups give two different answers for the same question. |
| S6 | `switch9090` | "Stiff turning right-in" | `r-stuck` "Stiff when the RIGHT knee drops inward", `l-stuck` "…LEFT knee…". `how`: "Hands behind you for support; keep it slow." | Clearer; matches the IR side logic. |
| S7 | `hip-ir-band` | "Full ≈ the foot travels its whole arc." | Phone level on the shin, angle from vertical: `3` "35° or more", `2` "25–34°", `1` "15–24°", `0` "Under 15°". | Self-judging an "arc" is not reproducible. |
| S8 | `thoracic-rotation` | "Shoulders turn well past the knees (about 45°+)"; gap 30–45. | Setup: "Squeeze a pillow between your knees, feet flat, sit tall, broom handle across the front of your shoulders. Phone compass flat on your breastbone: note the start reading. Turn slowly; stop before your low back or hips join in. Never bounce." Labels: `2` "45° or more", `1` "30–44°", `0` "Under 30°". Grader unchanged. | Seated rotation with the pelvis fixed is a reliable thoracic measure: Johnson et al. 2012, *J Athl Train* 47:52. Unloaded and slow, so allowed for this profile. |
| S9 | `chintuck-band` grader | `tilt` (nodded instead of glided) ⇒ Priority at any rep count. | `tilt` ⇒ Moderate; Priority only if `reps = 0`. | A technique error, not severity. |
| S10 | `deadbug-band` grader | `reps = 2` (6–8) with `breath` ⇒ Moderate. | `reps = 2 && breath` ⇒ Mild. | Breath-holding at full reps is a cue issue. |
| S11 | `painOptions.back` | "Back-only ache" caps the grade at Moderate. | Relabel "My usual back ache went **up** during the test". Keep the rule. | A chronic disc back often aches at rest; only an increase should cap the grade. |
| S12 | Red-flag card (`screens/checkups.js`) | Cauda equina, weakness, sharp/leg-pain stop. | Add: "Pain that is worse at night and not eased by any position, fever, unexplained weight loss, or pain after a fall or accident: see a doctor before testing." | Finucane et al. 2020. |
| S13 | Finding wording (`assessment.js`) | "deep neck flexors are asleep", "is nerve, not muscle", "Tight hip flexors (iliopsoas)". | "…test suggests the deep neck flexors tire early", "…behaves like nerve sensitivity", "the hip-flexor test suggests tightness". | Invariant 6 (never diagnose). |
| S14 | `thomas` `lifted-ext` | Same as `lifted`. | Also add `rectusstretch` to the APT menu note: when either side is `lifted-ext`, swap `hipflexorstretch` → `rectusstretch` in Control (cue "tuck first, no arch"). | Knee extension on Thomas points to rectus femoris (clinical consensus). |

## 4. Corrective plan review

**Grade → phase.** Keep the ladder (Priority→Reset, Moderate→Control, Mild→Strengthen, Clear→Integrate). Two changes:
- Reset must mean "lowest-load version of the right quality", not only mobility. A Priority on an endurance test (DNF, dead bug, Pallof) needs very low-load endurance work, not stretching. The menus below do this.
- **One phase per retest upward.** A pattern may move at most one phase forward per retest (for example, Priority→Clear in 14 days becomes Strengthen, not Integrate). Moving back has no limit. Store `phaseByPattern` in `S.posture` to do this. Big jumps at home are usually measurement noise.

**Engine note.** `buildCorrectivePlan` uses only the first 3 ids (2 in Integrate). Order in the arrays is therefore the prescription; anything after position 3 is a fallback for when an id is filtered out by `safeGet` or the `noband`/`standing` caveats.

**MENU (existing ids only):**
```js
apt: {   // core control + hip-flexor length (glutes moved to hips)
  reset:      ['pelvictilt', 'hipflexorstretch', 'breathing360', 'kneechest'],
  control:    ['pelvictilt', 'deadbug', 'hipflexorstretch', 'new-seated-pelvic-tilt'],
  strengthen: ['deadbug', 'pallof', 'sideplank', 'birddog'],
  integrate:  ['pallof', 'new-standing-glute-tilt', 'hiphinge'],
},
hips: {  // NEW: label 'Hips & glutes', area 'Hips'
  reset:      ['new-seated-desk-hip-ir', 'hipir9090', 'clamshell', 'adductorsqueeze'],
  control:    ['seatedhipir', 'clamshell', 'glutebridge', 'sidelieabduction'],
  strengthen: ['singlebridge', 'sidesteps', 'ir9090liftoff', 'standinghipir'],
  integrate:  ['stepup', 'standinghipir', 'pullthrough'],
},
head: {
  reset:      ['chintuck', 'deepneckflexor', 'doorwaychest'],   // deepneckflexor at its regression (no lift) in Reset
  control:    ['deepneckflexor', 'chintuck', 'wallslide'],
  strengthen: ['deepneckflexor', 'facepull', 'row'],
  integrate:  ['chintuck', 'new-seated-scap-pinch'],
},
back: {
  reset:      ['openbook', 'catcamel', 'breathing360'],
  control:    ['openbook', 'wallslide', 'new-standing-wall-reset'],
  strengthen: ['row', 'wallslide', 'openbook'],
  integrate:  ['row', 'new-standing-wall-reset'],
},
shoulders: {
  reset:      ['doorwaychest', 'new-seated-scap-pinch', 'wallslide'],
  control:    ['pullapart', 'wallslide', 'doorwaychest'],
  strengthen: ['row', 'facepull', 'pullapart'],
  integrate:  ['facepull', 'new-standing-wall-reset'],
},
```
Engine additions: in Reset, `deepneckflexor` gets `note: 'Reset version: chin-tuck holds on the floor, no lift'`. `ir9090liftoff` is skipped while `hip-ir-band` is Priority (the planChange already says so; enforce it). When the deficit side is known, hips moves get `note: 'Right side first, extra set on the right'` (or left).

**Removed from the menus, and why**
- `new-seated-thoracic-opener` (extension over the chair back): too easy to spill into lumbar extension for an extension-intolerant L4–L5. Keep it in the desk routine with its cue, not in the corrective plan.
- `wallangel`: standing overhead arms with the low back on the wall drives an APT lumbar spine into extension. `wallslide` (forearms on the wall) gives the same scapular work more safely.
- `new-standing-chest-opener` in Reset: a passive extension-biased stretch. The unilateral doorway stretch is the better pec-minor stretch (Borstad & Ludewig 2006, *J Shoulder Elbow Surg* 15:324).
- `kickback` (standing hip extension) and `pullthrough` early: these finish in lumbar extension when the glute is weak. `pullthrough` is only in hips Integrate.

**Safety of specific moves for this back**
- Open book: safe and useful, provided the knees stay stacked and still (add the cue "pillow between the knees, top knee pinned to the floor").
- Thoracic rotation test: acceptable (seated, unloaded, slow, pelvis fixed). It is never a loaded twist.
- Overhead reach (supine, knees bent, ribs down): safe. Standing overhead work is where extension creeps in.
- Cat-camel: keep (McGill uses it before the Big 3). When `extension-intolerant`, add `note: 'Arch only back to a flat back, not past it'`.
- Single knee-to-chest: fine (flexion-biased relief suits this profile; never both knees).
- Birddog: keep. Cue "leg to hip height only" for this profile.

**Sets and frequency (`PHASES`)**
| Phase | maxSets | perWeek | Notes |
|---|---|---|---|
| Reset | 2 | 7 | Short daily doses; holds of 5–10 s; pain no higher than 3/10 and settles by next morning. |
| Control | 2 | 5 (was 6) | Quality over volume; 2 rest days protect the 24-hour response check. |
| Strengthen | 3 | 3 (was 4) | Non-consecutive days; 2–3 days/week per muscle group is the strength-training standard (ACSM 2009 position stand, *Med Sci Sports Exerc* 41:687). |
| Integrate | 2 | 2 | Unchanged. |

## 5. Form-rating rules

Keep the idea, tighten the rule (`formStatus` in `corrective.js`).
- **Regress** when 2 of the last 3 ratings for that move are `hard`, **or** the last rating is `hard` and that session's check-in pain is 1 or more points higher than before the session. Action: swap to the `regression` text and keep the phase's sets (capped at 2). Do **not** also cut to 1 set; doing both at once regresses twice.
- **Progress** when the last 3 ratings are `clean` **and** they span at least 2 different days **and** at least 7 days have passed since the last change to that move **and** none of those days had check-in pain of 4 or more **and** the pattern is not Priority. Offer one change at a time, in this order: sets (up to the phase cap), then hold time or reps, then band level.
- **Reset after a change.** Only count ratings logged after the last progress or regress (store `changedAt` per id).
- `shaky` stays neutral. This fits invariant 7: pain and form gate progress; the calendar never does.

## 6. Leave these alone

- Skip = no data (invariant 4). M1 adds a separate `painful` answer instead of weakening it.
- Pain rule: leg/sharp during a test ⇒ Priority + physio flag + 7-day retest gate; flare day ⇒ no check. Conservative and correct.
- `combineGrades` (worst and mean averaged; two Priority ⇒ Priority; two Moderate+ ⇒ at least Moderate). This weights the worst test sensibly without letting one noisy test dominate.
- `holdGrade` and the Pallof / glute-med / tilt-control / pull-apart / wall-slide graders. They are reasonable and well matched to band testing at home.
- Retest every 28 days, or every 14 days while anything is Priority.
- The glute inhibition rule (2 of 3 tests on one side). It already protects against the unreliable firing-order test.
- The `safeGet` safety layer, extension contra on `pressup` / `sphinx` / `proneext`, the both-knees ban, and the no-loaded-flexion/rotation rule.
- Side plank **from the knees** for testing, and no Biering-Sørensen (prone extension) test for this profile.
- SLR "control gap ⇒ no aggressive hamstring stretching". This is sound and matches how protective hamstrings behave.
- Grades stored per check (not recomputed), so relabelled options do not rewrite history.
