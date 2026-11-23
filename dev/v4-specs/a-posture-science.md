# BackForge v4.0 — Spec A: Posture Science

**Scope:** Daily posture cues + band-based posture assessment with severity grading.
**User constraints (non-negotiable):** extension-intolerant (no press-ups, no lumbar-extension loading, no prone tests), never both knees to chest, no loaded spinal flexion/twisting, no aggressive hamstring stretching, pain-gated, home-alone safe, band + wall/chair only.
**Existing blocks referenced:** `tilt-correction` (hip-flexor stretch `hipflexorstretch` + `deadbug` + `pelvictilt`), `hip-ir` (`seatedhipir`, `hipir9090`, `adductorsqueeze`), `band-activation` (`pullapart`, `facepull`, `clamshell`, `glutebridge`, `sidesteps`), `big3` (`curlup`, `birddog`, `sideplank`), `chin-tucks-daily` (`chintuck`, `deepneckflexor`), `rows-facepulls` (`row`, `facepull`, `pullapart`).

Grades everywhere: `Clear=0 | Mild=1 | Moderate=2 | Priority=3`. App severity mapping: `Clear→ok`, `Mild/Moderate→mod (Watch)`, `Priority→high`.

---

## 1. Daily Posture Cues

Rule for UI: show **one cue at a time**, triggered by moment/context, never a list wall. Max 2 lines on screen. Dismiss = done.

```js
const POSTURE_CUES = [
 // pattern:"apt" — anterior pelvic tilt / lower-crossed
 {id:"apt-desk-belt", pattern:"apt", moment:"sitting-desk",
  feel:"Belt buckle tips down, low back feels arched and tight.",
  fix:"Exhale, tip belt buckle up, squeeze glutes 5 sec. Feet flat."},
 {id:"apt-stand-line", pattern:"apt", moment:"standing-in-line",
  feel:"Weight in toes, belly pushed forward, back pinched.",
  fix:"Shift weight to heels, tuck tail slightly, squeeze glutes 10 sec."},
 {id:"apt-after-sitting", pattern:"apt", moment:"after-sitting-30min",
  feel:"First steps feel stiff, hips tight at the front.",
  fix:"Stand, tuck tail, squeeze glutes, take 5 slow steps before walking fast."},
 {id:"apt-driving", pattern:"apt", moment:"driving",
  feel:"Slumped then arched, low back aches at lights.",
  fix:"At a stop: exhale ribs down, light tuck, press low back gently into seat 10 sec."},
 {id:"apt-brushing", pattern:"apt", moment:"brushing-teeth",
  feel:"Leaning on sink, back arched, belly forward.",
  fix:"Soften knees, tuck tail, squeeze one glute then the other, 5 each."},
 {id:"apt-stairs", pattern:"apt", moment:"stairs",
  feel:"You pull up with your back, knees cave, right side avoids work.",
  fix:"Whole foot on step, drive through heel with glute, pelvis level. Use rail."},
 {id:"apt-carrying", pattern:"apt", moment:"carrying-bags",
  feel:"One bag pulls you sideways, back arches to cope.",
  fix:"Split bags both sides, ribs down, tuck tail, brace like a cough for 10 sec."},
 {id:"apt-cooking-standing", pattern:"apt", moment:"standing-long",
  feel:"After ~20 min standing: deep right-side ache builds.",
  fix:"Sit before it builds. Standing: one foot on a low step, tuck + glute squeeze 10 sec, swap."},

 // pattern:"upper" — forward head / rounded shoulders / upper-crossed
 {id:"upper-desk-screen", pattern:"upper", moment:"sitting-desk",
  feel:"Chin pokes toward screen, shoulders rolled forward.",
  fix:"Glide chin straight back (double chin), hold 5 sec x2. Screen at eye level."},
 {id:"upper-phone", pattern:"upper", moment:"phone-use",
  feel:"Head dropped, looking down, neck front tired.",
  fix:"Raise phone to eye level, chin tuck 5 sec, drop shoulders down and back."},
 {id:"upper-driving", pattern:"upper", moment:"driving",
  feel:"Head ahead of shoulders, upper back rounded over wheel.",
  fix:"At a stop: head back to headrest, chin tuck 5 sec x2, shoulder blades lightly together."},
 {id:"upper-stand-line", pattern:"upper", moment:"standing-in-line",
  feel:"Shoulders rolled in, chest closed, head forward.",
  fix:"Thumbs turn out, shoulder blades pocket-down, chin glides back. Hold 10 sec."},
 {id:"upper-after-sitting", pattern:"upper", moment:"after-sitting-30min",
  feel:"Stiff between shoulder blades when you stand up.",
  fix:"Stand in doorway, forearm on frame, small step through, 10 sec each side. No back arch."},
 {id:"upper-carrying", pattern:"upper", moment:"carrying-bags",
  feel:"Shoulders shrug to ears or roll forward under load.",
  fix:"Set bags down, shrug-drop shoulders x3, chin tuck, re-pick up with blades down."},
 {id:"upper-brushing", pattern:"upper", moment:"brushing-teeth",
  feel:"Head craned toward mirror, one shoulder higher.",
  fix:"Step back from mirror, stand tall through crown, chin tuck 5 sec x2."},
 {id:"upper-stairs", pattern:"upper", moment:"stairs",
  feel:"Looking straight down, whole upper back hunched.",
  fix:"Eyes to horizon, only glance down per step, tall crown, blades lightly together."},
];
```

Notes: `apt-cooking-standing` encodes his known ~2 h standing trigger — cue says sit *early*, do not push through. No cue instructs lumbar extension, end-range flexion, or twisting.

---

## 2. Band-Based Assessment Tests

### 2.0 Global rules (implement first)

```js
const POSTURE_TEST_VERSION = 1;
const BAND_FOR_TESTS = "light"; // always the lightest long/loop band the user owns; store bandLevel used. Retest must use same band or grades are not comparable.
// Pain gate — applies to EVERY test, overrides all scoring:
function painGate(input){ // input.pain: "none"|"back-only"|"leg"|"sharp-electric"
  if(input.pain==="leg" || input.pain==="sharp-electric")
    return {grade:"Priority", physioFlag:true, stop:true,
            note:"Leg/sharp pain reproduced — stop test, do not retest for 7 days, physio flag."};
  if(input.pain==="back-only") return {cap:"Moderate", note:"Back-only ache: grade capped no better than Moderate; stop if it rises."};
  return null;
}
// Skipped / not attempted = NO grade, NO finding (existing invariant §5.4 of CLAUDE-REVIEW). Never emit Clear from a skip.
```

Each test UI = setup card → attempt → 2–3 multiple-choice inputs (below) → grade. No free-text, no stopwatch required (second *bands* are selectable).

### 2.1 Test definitions

| id | Name | Pattern | Equipment |
|---|---|---|---|
| `tilt-control` | Band-Resisted Pelvic Tilt Control | apt | long band, floor |
| `deadbug-band` | Banded Dead Bug — Anti-Extension Control | apt | long band anchored overhead/behind head |
| `hip-ir-band` | Seated Banded Hip IR — Side Comparison | apt (hip-ir) | loop band, chair |
| `pallof-hold` | Banded Pallof Hold — Anti-Rotation | apt/core | long band, door anchor at chest height |
| `glutemed-wall` | Banded Glute Med Wall Press | apt/glute | loop band, wall |
| `pullapart-endurance` | Band Pull-Apart Endurance & Quality | upper | long band |
| `wallslide-band` | Banded Wall Slide | upper | loop band, wall |
| `chintuck-band` | Band-Resisted Chin Tuck | upper | long band, chair/wall |

#### T1 `tilt-control` — Band-Resisted Pelvic Tilt Control
- **Setup:** Supine, knees bent, feet flat. Light long band anchored behind head, hold one end in each hand, arms straight up. Exhale, gently tip pelvis so low back gets heavy on floor (posterior tilt — small range only).
- **Attempt:** Hold the tilt while breathing normally. Do not flatten forcefully.
- **Inputs:** `hold` (seconds band): `0-4|5-9|10-19|20+` · `quality`: `holds-flat|arches-off|holds-breath|shakes-early` · `pain` (global).
- **Grading:**

| Result | Grade |
|---|---|
| hold ≥20 + `holds-flat` | Clear |
| hold 10–19 + `holds-flat`, or ≥20 + `holds-breath` | Mild |
| hold 5–9, or any hold + `arches-off` | Moderate |
| hold 0–4, or `shakes-early` + hold <10, or pain gate | Priority |

- **Plan consequence:** Clear → `tilt-correction` at maintenance (3×/wk). Mild → `tilt-correction` daily, standard dose. Moderate → `tilt-correction` daily + `pelvictilt` before `deadbug` in every session. Priority → `tilt-correction` daily, `deadbug` regressed to toe-taps only, gate `pullthrough`/hip-thrust top-end arch (ribs-down cue forced), retest in 2 wks.

#### T2 `deadbug-band` — Banded Dead Bug Anti-Extension Control
- **Setup:** As `deadbug` in directory: supine, band anchored overhead holding arms still, hips/knees 90°. Exhale fully, then lower one leg slowly (3 sec out).
- **Attempt:** Alternate legs, max 8/side. Stop at form loss.
- **Inputs:** `repsClean` per worst side (band): `0-2|3-5|6-8` · `quality`: `back-stays-heavy|arches-off|ribs-flare|holds-breath` · `pain`.
- **Grading:**

| Result | Grade |
|---|---|
| 6–8 clean + `back-stays-heavy` | Clear |
| 6–8 + `ribs-flare`, or 3–5 + `back-stays-heavy` | Mild |
| 3–5 + `arches-off`/`ribs-flare`, or 0–2 + `back-stays-heavy` | Moderate |
| 0–2 + `arches-off`, or pain gate | Priority |

- **Plan consequence:** Clear → `deadbug` standard progression in `tilt-correction` + Big 3 unchanged. Mild → `deadbug` daily in `tilt-correction`. Moderate → `deadbug` daily regressed (toe-taps), Big 3 kept as 10-sec exposures (do not progress side-plank duration). Priority → same as Moderate + remove longer-lever core work, physio flag if also T1 Priority.

#### T3 `hip-ir-band` — Seated Banded Hip IR, Side Comparison
- **Setup:** As `seatedhipir`: sit tall on chair, knee 90°, loop band around ankles/anchored, rotate shin outward (hip turns in), thigh still. Do left, then right (right = known deficit side, test it second, compare honestly).
- **Attempt:** 8 slow reps/side against light loop band, 3-sec end hold on last rep.
- **Inputs (per side):** `range_R`, `range_L`: `full|about-3/4|about-half|barely-moves` · `quality`: `thigh-still|trunk-leans|pelvis-rolls` · `pain`.
- **Grading (uses worse side + asymmetry):**

| Result | Grade |
|---|---|
| Both `full`, symmetric, `thigh-still` | Clear |
| Worse side `about-3/4`, or one-step asymmetry | Mild |
| Worse side `about-half`, or two-step asymmetry | Moderate |
| Worse side `barely-moves`, or ≥two-step asymmetry + `trunk-leans`/`pelvis-rolls`, or pain gate | Priority |

- **Plan consequence:** Clear → `hip-ir` block 3×/wk maintenance. Mild → `hip-ir` daily, standard. Moderate → `hip-ir` daily, deficit side first + doubled (existing rule). Priority → `hip-ir` daily doubled + `standinghipir`/`ir9090liftoff` **gated off** (range before load), physio flag: "assess right hip capsule" (already an open item in GOAL.md).

#### T4 `pallof-hold` — Banded Pallof Hold (anti-rotation)
- **Safety note:** Spine stays neutral and still; band *resists* rotation. This is not loaded spinal twisting.
- **Setup:** Band at chest height, stand side-on, feet shoulder width, ribs down. Press hands straight out and hold.
- **Attempt:** Hold per side, max 20 sec/side.
- **Inputs (worst side):** `hold`: `0-4|5-9|10-19|20+` · `quality`: `stays-square|trunk-turns|leans-away|arches-back` · `pain`.
- **Grading:**

| Result | Grade |
|---|---|
| ≥20 + `stays-square`, both sides within one band | Clear |
| 10–19 + `stays-square`, or ≥20 + `leans-away` | Mild |
| 5–9, or any hold + `trunk-turns` | Moderate |
| 0–4, or `arches-back` + hold <10, or pain gate | Priority |

- **Plan consequence:** Clear → `pallof` standard in Strength B/C. Mild → `pallof` 2×/wk, light band. Moderate → `pallof` regressed to half-kneeling, Big 3 prioritised over Pallof progression. Priority → Pallof held at kneeling regression only, add extra `birddog` set (weaker side), no carry/`suitcasecarry` progression until retest ≥Moderate.

#### T5 `glutemed-wall` — Banded Glute Med Wall Press
- **Setup:** Loop band above knees. Stand side-on to wall, inside leg is stance leg; press outside knee into wall against band, pelvis level, hold. Swap sides.
- **Attempt:** Hold per side, max 20 sec/side.
- **Inputs (worst side):** `hold`: `0-4|5-9|10-19|20+` · `quality`: `pelvis-level|pelvis-drops|trunk-leans|front-of-hip-feel` (`front-of-hip-feel` = TFL takeover, counts as form loss) · `pain`.
- **Grading:** Same hold/quality thresholds as T4, with `pelvis-drops` ≡ `trunk-turns`, `front-of-hip-feel` ≡ `leans-away` one grade worse.
- **Plan consequence:** Clear → `band-activation` standard. Mild → `band-activation` daily + extra `clamshell` set on worse side. Moderate → `band-activation` daily, worse side doubled, `sidesteps` regressed to band-above-knees. Priority → `band-activation` daily doubled on worse side, single-leg work (`singlebridge`, `stepup`) gated to supported versions, add guarding finding if worse side = right (his avoided side).

#### T6 `pullapart-endurance` — Band Pull-Apart Endurance & Quality
- **Setup:** As `pullapart`: standing/sitting tall, ribs down, arms straight, light band to chest, 2-sec return.
- **Attempt:** Continuous reps to form loss, cap 20.
- **Inputs:** `reps` band: `0-5|6-10|11-15|16-20` · `quality`: `blades-pinch-clean|shrugs|arches-back|bounces-fast` · `pain`.
- **Grading:**

| Result | Grade |
|---|---|
| 16–20 + `blades-pinch-clean` | Clear |
| 11–15 + clean, or 16–20 + `bounces-fast` | Mild |
| 6–10, or any reps + `shrugs` | Moderate |
| 0–5, or `arches-back` + reps ≤10, or pain gate | Priority |

- **Plan consequence:** Clear → `rows-facepulls` 3×/wk standard. Mild → `rows-facepulls` 3×/wk + `pullapart` in daily `band-activation`. Moderate → `rows-facepulls` 3×/wk with lighter band + `wallslide` added daily. Priority → daily `band-activation` pull-aparts at half range/light band, face pulls seated regression, no band-level promotion on `pullapart`/`facepull` until retest ≥Moderate.

#### T7 `wallslide-band` — Banded Wall Slide
- **Setup:** As `wallslide` + loop band around wrists: back to wall (head, upper back, tailbone touching), forearms on wall, slide up into narrow V, ribs down.
- **Attempt:** 10 slow reps.
- **Inputs:** `repsClean` band: `0-3|4-6|7-9|10` · `quality`: `contact-holds|low-back-leaves-wall|shrugs|head-pokes-forward` · `pain`.
- **Grading:**

| Result | Grade |
|---|---|
| 10 + `contact-holds` | Clear |
| 7–9 + `contact-holds`, or 10 + `head-pokes-forward` | Mild |
| 4–6, or any reps + `low-back-leaves-wall` | Moderate |
| 0–3, or `shrugs` + reps ≤6, or pain gate | Priority |

- **Plan consequence:** Clear → `wallslide`/`wallangel` in posture block standard. Mild → posture block daily (already daily — boost `wallslide` to 2×10). Moderate → posture block daily + doorway chest stretch dose doubled, `rows-facepulls` kept 3×/wk minimum (do not drop). Priority → same as Moderate + thoracic work kept **upper-back only** (towel T4–T7 per GOAL.md, stop if symptoms refer down), physio flag if also T8 Priority.

#### T8 `chintuck-band` — Band-Resisted Chin Tuck / Deep Neck Flexor
- **Setup:** Sit tall in chair against wall, light long band behind head held in both hands with light forward pull. Glide chin straight back against band (double chin), eyes level. Never tilt down, never roll head back.
- **Attempt:** 10 reps, 5-sec holds.
- **Inputs:** `repsClean` band: `0-3|4-6|7-9|10` · `quality`: `clean-glide|tilts-down|front-neck-takes-over|holds-breath` · `pain` (neck/leg/sharp — leg/sharp still triggers global gate).
- **Grading:**

| Result | Grade |
|---|---|
| 10 + `clean-glide` | Clear |
| 7–9 + `clean-glide`, or 10 + `holds-breath` | Mild |
| 4–6, or any reps + `front-neck-takes-over` | Moderate |
| 0–3, or `tilts-down` on most reps, or pain gate | Priority |

- **Plan consequence:** Clear → `chin-tucks-daily` maintenance (morning block). Mild → `chin-tucks-daily` + add midday set (desk cue `upper-desk-screen`). Moderate → `chin-tucks-daily` 2×/day, `deepneckflexor` regressed to tuck-holds without head lift. Priority → `chin-tucks-daily` 2×/day at no-band regression first, `deepneckflexor` gated off until retest ≥Moderate.

### 2.2 Overall Posture Grade

```js
const PTS = {Clear:0, Mild:1, Moderate:2, Priority:3};
const GRADE = ["Clear","Mild","Moderate","Priority"];

function combineGrades(grades){ // grades: array of grade strings, skips already removed
  if(!grades.length) return null;               // no data = no grade (never Clear)
  const pts = grades.map(g=>PTS[g]);
  const worst = Math.max(...pts);
  const mean  = pts.reduce((a,b)=>a+b,0)/pts.length;
  let score = Math.round((worst + mean)/2);      // worst pulls up, one bad test alone can't max it
  if(pts.filter(p=>p===3).length>=2) score = 3;  // 2+ Priority = Priority
  if(pts.filter(p=>p>=2).length>=2) score = Math.max(score,2); // 2+ Moderate+ = at least Moderate
  return GRADE[score];
}

// APT grade: core = tilt-control, deadbug-band, pallof-hold
//            contributors = hip-ir-band, glutemed-wall (counted at half weight: include once, core counted as listed)
function postureGrades(t){ // t = {testId: grade|null}
  const pick = ids => ids.map(id=>t[id]).filter(Boolean);
  const apt = combineGrades([...pick(["tilt-control","deadbug-band","pallof-hold"]),
                             ...pick(["hip-ir-band","glutemed-wall"])]);
  const upper = combineGrades(pick(["pullapart-endurance","wallslide-band","chintuck-band"]));
  const overall = combineGrades([apt,upper].filter(Boolean));
  return {apt, upper, overall,
          physioFlag: Object.values(t).filter(g=>g==="Priority").length>=2
                      || /* any pain-gate Priority */ false /* OR in caller from painGate results */};
}
```

Worked examples (for tests): all Clear → Clear/Clear. APT: tilt=Priority, deadbug=Moderate, pallof=Mild, hip-ir=Priority, glutemed=Mild → 2 Priorities → **APT Priority**. Upper: pullapart=Mild, wallslide=Clear, chintuck=Mild → worst 1, mean 0.67 → **Upper Mild**. Single Priority among 3 upper tests, others Clear → worst 3, mean 1 → score 2 → **Moderate** (not Priority) unless a pain gate fired, in which case that *test* stays Priority and its plan consequence applies in full regardless of the summary grade.

**Retest:** every 4 weeks, or 2 weeks after any Priority. Same band, same time of day, not on a flare day (pain ≥7 = flare protocol only, defer testing). Store `{date, testId, bandLevel, inputs, grade}` in `assessHistory`; summary grades recomputed, never hand-edited.

**Findings emitted (existing `S.results` shape):** one per non-Clear test — `{sev, t:"<Test name> — <Grade>", d:"<inputs summary>", fix:"<plan consequence for that grade>"}` — plus one summary finding per pattern (`APT — <grade>`, `Upper-crossed — <grade>`). Clear tests emit no finding (consistent with §4 map: Watch/Priority only).

---

## Risks / uncertainties

- **Self-graded quality options are subjective.** `arches-off`, `shrugs` etc. depend on user noticing form loss without a mirror/coach. Mitigate: instruct wall/floor contact as the objective check where possible (T1, T2, T7); grades may still run optimistic.
- **Band resistance is unstandardised** across brands/colours. Thresholds assume the *lightest* band; if his lightest is heavy, endurance tests (T6) will under-grade. Retest comparability requires storing `bandLevel` — cross-band comparisons are invalid.
- **Hip IR range bands are visual estimates**, not goniometry. Good for side-to-side trend and asymmetry (the clinically relevant signal for him), not for absolute degrees; physio capsule assessment remains the reference standard.
- **Pallof / wall-press hold times conflate strength and balance.** A low score alone does not isolate glute med or anti-rotation weakness — hence they are contributors, not core, in the APT grade.
- **No prone or extension test is included by design** (extension intolerance). This leaves posterior-chain extension endurance unscreened — accepted gap; do not "fix" it by adding prone tests without physio sign-off.
- Thresholds are pragmatic, not validated norms for this population; treat first retest as calibration and adjust bands, not the user, if everything grades Priority/Clear at once.
