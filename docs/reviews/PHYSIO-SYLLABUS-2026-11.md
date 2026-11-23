# Physio syllabus review: exercise library, desk, duck feet (Nov 2026)

Reviewer role: senior MSK / sports physiotherapist and strength coach (same reviewer as `PHYSIO-REVIEW-2026-11.md`).
Profile: adult male, L4–L5 disc history, **extension-intolerant**, right glute inhibition, mild APT, right hip IR deficit, forward head / rounded shoulders, desk worker, self-reported "duck feet".
New files (data only, nothing wired yet): `data/exercises-extra.json` (68 exercises), `data/desk.json` (8 problems, 10 ergonomics items, 6 micro-breaks), this review.
Validated (scratch script): every dose parses through `prescribe()` without the fallback; every equipment id is in the taxonomy; ids are kebab-case and unique against the 56 existing; every id in `desk.json` and in the menus below exists; `exclusionReason(ex, {extension-intolerant})` is null for 67 of 68. The one exclusion is deliberate (`ab-wheel-kneeling-short`, see §4).

## 0. What was added

| Group | Count | Ids (short) |
|---|---|---|
| A. Advanced band | 17 | band-row-anchored, band-facepull-high, pallof-half-kneeling, pallof-tall-kneeling, pallof-overhead-press, band-lat-pulldown-kneeling, band-straight-arm-pulldown, deadbug-band-anchored, band-chest-press-doorway, band-er-90, band-ytw, band-hip-hinge, band-split-squat, monster-walk, band-lateral-lunge, band-row-single-arm, bridge-march-band |
| B. Stretching | 14 | doorway-lat-stretch, strap-hamstring-supine, hipflexor-band-distraction, figure4-wall, piriformis-cross-body, adductor-rockback, calf-stretch-wall, ankle-dorsiflexion-wall, quad-stretch-strap, upper-trap-stretch, levator-stretch, childs-pose-side-reach, wrist-flexor-stretch, wrist-extensor-stretch |
| C. Hip IR / duck feet | 9 | hip-ir-iso-wall, seated-hip-ir-band-slow, sidelying-hip-ir-lift, quadruped-hip-ir-rock, hip-airplane-supported, ir9090-pin-iso, bridge-toe-in, short-foot-tripod, gait-line-drill |
| D. Desk | 9 | desk-hipflexor-chair, desk-seated-figure4, desk-pushaway-thoracic, chintuck-lean-back, seated-goalpost-slide, standing-hip-ext-squeeze, desk-calf-raise, median-nerve-glide, eye-neck-microbreak |
| E. Equipment showcase | 19 | foam-roller-thoracic, foam-roller-quads, foam-roller-lats, foam-roller-chest-opener, massage-ball-glute, massage-ball-pec, massage-ball-foot, kb-deadlift-blocks, goblet-box-squat, farmer-carry, db-chest-supported-row, db-split-squat, ball-deadbug, ball-hamstring-curl, ab-wheel-kneeling-short, step-down-eccentric, slider-hamstring-curl, dead-hang-supported, bridge-block-squeeze |

Deliberately **not** added:
- **Band good-morning.** The load sits across the upper back with the longest lever on the lumbar spine; at fatigue the spine rounds under load (loaded flexion) or the finish turns into a lumbar arch. Neither is acceptable for an L4–L5 disc that is extension-intolerant. The band hip hinge (hands at the hips) and the KB deadlift from blocks train the same hinge with a short lever.
- **Kettlebell halo.** Little value for this profile; overhead circling invites rib flare and lumbar arch. Wall slides, Y-T-W and the face pull cover the same shoulder range more safely.
- **Prone Y-T-W, supermans, reverse hypers, cable chops/lifts, Russian twists, sit-ups.** Prone or loaded extension, or loaded rotation/flexion (invariants 1–2).
- **Seated toe-touch hamstring stretch.** Sustained flexion under the trunk's weight; replaced by the supine strap stretch.

`spinal_load` is marked for the **lumbar** spine. Three entries move the thoracic or cervical spine and are marked `none` on purpose, with the reason in `source`: `foam-roller-thoracic` (hips down, roller never below the ribcage), `desk-pushaway-thoracic` (ribs tucked) and `levator-stretch` (neck only). `childs-pose-side-reach` is honestly `flexion`: unloaded, so the safety layer allows it, and it carries `contra: ["flexion-intolerant"]`.

## 1. Syllabus coverage map

| Domain (MSK rehab + S&C syllabus) | Before | Now | Remaining gap |
|---|---|---|---|
| Motor control (lumbopelvic) | Dead bug, bird-dog, pelvic tilt, 90/90 march | + anchored-band dead bug, ball dead bug, bridge march, hip airplane | Graded single-leg balance / proprioception ladder (eyes closed, unstable surface) |
| Trunk endurance (McGill Big 3) | Curl-up, side plank, bird-dog, Pallof | + half/tall-kneeling Pallof, Pallof overhead, straight-arm pulldown, carries | Full side plank / side plank with reach progression; timed endurance retest in plan |
| Strength (hinge, squat, lunge, push, pull, carry) | Band row, pull-through, wall squat, step-up, suitcase carry | All six patterns now present: band/KB hinge, goblet box squat, split squats, lateral lunge, chest press, rows, lat pulldown, farmer carry | No calibrated load ladder in the engine (kg / band colour per week); no power or plyometric work |
| Mobility / flexibility | Hip flexor, figure-4, doorway chest, open book | + 14 stretches incl. lats, hamstrings (supine), adductors, calves, ankle, quads, neck, wrists | Hip extension end-range (couch stretch skipped on purpose: lumbar arch risk) |
| Nerve mobility | Sciatic glide | + median nerve slider | Ulnar and femoral (slump-free) sliders; nerve tensioners (deliberately not added: sliders only for a disc history) |
| Thoracic | Open book, cat-camel, wall angel, seated opener | + foam-roller extension, desk push-away, lat work, Y-T-W | Quadruped thoracic rotation with the lumbar locked (half-kneeling reach-back) |
| Cervical | Chin tuck, DNF, | + chin tuck lean-back, upper-trap and levator stretches, eye/neck micro-break | Cervical extensor and rotation endurance (isometrics with hand) |
| Scapular | Pull-apart, face pull, wall slide, scap pinch | + ER at 90°, Y-T-W, goalpost slide, chest press (serratus), dead hang | Serratus wall slide with foam roller; prone-free lower-trap loading is now covered by band Y |
| Hip | IR test + 6 IR/glute moves | + 9 IR moves (iso → eccentric → closed chain → gait), monster walk, lateral lunge, step-down | Hip ER strength (for balance with the IR work), adductor strength (Copenhagen short lever) |
| Foot and ankle | None | Short foot, calf/soleus stretch, knee-to-wall, foot roll, calf raise | Single-leg balance on the tripod, toe yoga |
| Desk / ergonomics | 8 desk moves | `desk.json`: 8 problems, 10 checklist items, 6 micro-breaks | Wiring a sit-timer to `everyMinutes` |
| Conditioning / walking | None | `gait-line-drill` only | Walking dose (the best-evidenced activity for chronic LBP) belongs in the plan, not the library |

## 2. Duck feet and hip internal rotation

**What "duck feet" means here.** Feet that point out more than usual when standing and walking. A turned-out foot can come from habit, from limited or weak hip internal rotation, from tight calves (the foot turns out to avoid ankle bend), or from how the thigh and shin bones are shaped (femoral retroversion, external tibial torsion). The last one is normal variation and must never be "corrected" by forcing the feet straight: that twists the knee. So the app screens two things: how far the feet turn out, and whether the hip can actually turn in and hold it.

### 2.1 Test 1: `foot-angle` (screen, never Priority)

Normal adult foot progression angle in walking is roughly 5–15° out (mean about 7°; Seber et al. 1981; Lösel et al. 1996). Over about 20–25° is marked out-toeing. A phone photo from above is accurate to within a few degrees; a self-check is a screen, not a measurement.

```json
{
  "id": "foot-angle",
  "name": "Foot Angle (toe-out) Check",
  "pattern": "hips",
  "kind": "bodyweight",
  "equipment": "A straight floor line or a strip of tape · phone (protractor or level app)",
  "setup": "Barefoot. Walk ten normal steps along the line and stop without looking down or correcting your feet. Take a photo straight down from above (or ask someone). On the photo, draw a line from the middle of the heel to the second toe and read its angle against the floor line. This is a screen: a few degrees either way does not matter.",
  "inputs": [
    { "key": "R", "label": "RIGHT foot", "options": [["in", "Points in"], ["0", "Straight to 15° out (typical)"], ["1", "16–25° out"], ["2", "More than 25° out"]] },
    { "key": "L", "label": "LEFT foot",  "options": [["in", "Points in"], ["0", "Straight to 15° out (typical)"], ["1", "16–25° out"], ["2", "More than 25° out"]] },
    { "key": "straight", "label": "Stand with both feet pointing straight ahead for 30 seconds", "options": [["easy", "Easy, feels normal"], ["effort", "I can, but my knees or feet feel twisted"], ["no", "I can't get them straight"]] }
  ],
  "planChange": {
    "Clear": "No change.",
    "Mild": "Foot tripod and calf work join the warm-up. If your feet won't go straight comfortably, that can be how your bones are built: the plan trains the hip, it never forces the feet.",
    "Moderate": "The duck-feet hip block joins the corrective plan (hip IR isometrics, toe-forward bridges, straight-foot walking drill), worse side first.",
    "Priority": "Not given by this test (it is a screen). The hip IR tests decide the priority."
  },
  "evidence": "Typical adult foot progression angle about 5–15° out (Seber 1981; Lösel 1996). Out-toeing can be bony (femoral or tibial torsion), so it is graded with how easily the feet go straight, and never above Moderate."
}
```

Grader (add to `GRADERS` in `posture.js`):
```js
'foot-angle': i => {
  const v = s => (s === 'in' ? 0 : +s);            // in-toeing is not a duck-feet sign; recorded only
  const R = v(i.R), L = v(i.L), w = Math.max(R, L), a = Math.abs(R - L);
  if (w === 0) return 'Clear';
  if (w === 2 || a >= 2) return i.straight === 'easy' ? 'Moderate' : 'Mild'; // can't/strains = likely build: don't push the foot
  return 'Mild';                                     // 16–25° out on either side
},
```
Rationale for the `straight` rule: if the feet go straight easily, the turn-out is habit or hip control, which trains well, so it earns the hip block. If they will not go straight, forcing them is harmful, so the grade stays Mild and the IR tests decide.

### 2.2 Test 2: `hip-ir-strength` (banded endurance, side difference)

The existing `hip-ir-band` measures **range**. This one measures whether the IR muscles can **work** through that range.

```json
{
  "id": "hip-ir-strength",
  "name": "Hip Internal Rotation Strength (banded reps)",
  "pattern": "hips",
  "kind": "band",
  "equipment": "Loop (mini) band around both ankles · firm chair",
  "setup": "Sit tall on a firm chair, knees at a right angle and together, mini-band around both ankles. Keep the thighs still and the knees touching. Swing one shin outward (the hip turns in) against the band, two seconds out, two seconds back. Count clean reps until the shin can't reach the same point, the thigh moves, or you hit 20. Rest a minute, then the other side. Use the same band each time you retest.",
  "inputs": [
    { "key": "R", "label": "RIGHT side clean reps", "options": [["3", "15 or more"], ["2", "10–14"], ["1", "5–9"], ["0", "Fewer than 5"]] },
    { "key": "L", "label": "LEFT side clean reps",  "options": [["3", "15 or more"], ["2", "10–14"], ["1", "5–9"], ["0", "Fewer than 5"]] },
    { "key": "quality", "label": "What happened", "options": [["still", "Thighs stayed still, trunk tall"], ["lean", "Trunk leaned to help"], ["knees", "Knees came apart or the thigh moved"]] }
  ],
  "planChange": {
    "Clear": "IR strength work stays in the maintenance rotation.",
    "Mild": "Banded IR joins the Strengthen days, weaker side first.",
    "Moderate": "Daily IR isometrics, then banded IR on alternate days, weaker side first with an extra set.",
    "Priority": "Daily IR isometrics only (wall press, 90/90 press); banded reps and 90/90 lift-offs wait for the retest. Show the side difference to your physio if it has not changed in 6 weeks."
  },
  "evidence": "Hip rotator weakness is common with hip and back pain and side differences matter more than absolute numbers (clinical consensus; Cibulka et al. 2010 on hip rotation asymmetry in LBP). Reps at a fixed tempo against the same band are a practical home endurance measure."
}
```

Grader:
```js
'hip-ir-strength': i => {
  const R = +i.R, L = +i.L, w = Math.min(R, L), d = Math.abs(R - L);
  if (w === 0 || (d >= 2 && i.quality !== 'still')) return 'Priority';
  if (w === 1 || d >= 2) return 'Moderate';
  if (w === 2 || d === 1 || i.quality !== 'still') return 'Mild';
  return 'Clear';
},
```
Deficit side: the lower of `R`/`L`. In `buildCorrectivePlan`, use it when `hip-ir-band` gave no side (range equal but strength not).

### 2.3 Findings and the hips menu

Findings (in `posture.js` findings, `mod` severity, never `high` on a screen):
```js
const fa = g['foot-angle'], irs = g['hip-ir-strength'], irr = g['hip-ir-band'];
const irWeak = GSEV[irs] >= 2 || GSEV[irr] >= 2;           // Moderate or worse on either IR test
if (GSEV[fa] >= 1 && irWeak) push('Feet turn out with limited hip internal rotation — posture check', 'mod',
  'Foot angle ' + fa + '; hip IR ' + (irs || irr) + '.', 'The duck-feet hip block leads the hips plan, weaker side first.');
else if (GSEV[fa] >= 1) push('Feet turn out; hip rotation tests look fine — posture check', 'mod',
  'Foot angle ' + fa + '.', inp.straight === 'easy' ? 'Straight-foot walking drill and foot tripod work.' : 'This can be how your hips and shins are built. No foot forcing; calf and foot work only.');
if (GSEV[irs] >= 2) push((side ? side + ' ' : '') + 'hip internal rotation weakness — band check', irs === 'Priority' ? 'high' : 'mod', 'Banded IR reps graded ' + irs + '.', 'Daily IR isometrics, weaker side first.');
```
Keep the title fragment "internal rotation" so `derive('hips', /…internal rotation deficit/)` style matching still works; extend that regex to `/Glute inhibition|internal rotation (deficit|weakness)|Feet turn out/i`.

`patternGrades` fallback for old checks: `combineGrades([g['hip-ir-band'], g['glutemed-wall'], g['hip-ir-strength'], g['foot-angle']].filter(Boolean))`.

**Menu.** Keep the current glute-led `hips` menu as the default. Use this **duck-feet variant** when `foot-angle` ≥ Mild **or** `hip-ir-strength` ≥ Moderate (first 3 used, 2 in Integrate; later ids are fallbacks):
```js
hipsDuck: {
  reset:      ['hip-ir-iso-wall', 'new-seated-desk-hip-ir', 'quadruped-hip-ir-rock', 'short-foot-tripod', 'hipir9090', 'clamshell'],
  control:    ['seatedhipir', 'ir9090-pin-iso', 'bridge-toe-in', 'sidelying-hip-ir-lift', 'clamshell', 'glutebridge'],
  strengthen: ['seated-hip-ir-band-slow', 'ir9090liftoff', 'monster-walk', 'sidelying-hip-ir-lift', 'singlebridge', 'standinghipir'],
  integrate:  ['hip-airplane-supported', 'gait-line-drill', 'step-down-eccentric', 'standinghipir', 'stepup'],
},
```
Engine rules: `ir9090liftoff` stays gated off while `hip-ir-band` **or** `hip-ir-strength` is Priority (fallback `ir9090-pin-iso`). Drop `gait-line-drill` and `bridge-toe-in`'s toe-in cue when `foot-angle.straight !== 'easy'` (use `bridge-block-squeeze`). Deficit side gets the existing note "Right side first, extra set on the right". Retest both hip tests every 4 weeks like the others.

## 3. Stretching protocol for the plan

| Slot | Type | Dose | Picks (examples) |
|---|---|---|---|
| Warm-up | **Dynamic only**: moving in and out of range, no long holds before strength work | 1–2 moves, 6–10 slow reps or 2 × 20 s | cat-camel, adductor-rockback, ankle-dorsiflexion-wall, quadruped-hip-ir-rock, foam-roller-thoracic |
| Corrective Reset phase | Static or iso-stretch of the short side of the pattern | 2 × 30–45 s per side, daily | hipflexor-band-distraction, desk-hipflexor-chair, doorway-lat-stretch, upper-trap-stretch |
| Cool-down | **Static**, the muscles just trained | 30–60 s per side, 1–2 rounds; 2 moves at 20+ min sessions | strap-hamstring-supine, figure4-wall, calf-stretch-wall, doorwaychest |
| Desk breaks | Short holds and gentle movement, standing or seated | 20–30 s holds, 60–120 s total (`desk.json` microBreaks) | see `desk.json` |
| Flare days (pain ≥ 7) | Relief only, unloaded, position of comfort | Per relief protocol | childs-pose-side-reach (if flexion eases), constructiverest, figure4-wall |

Rules:
1. Static stretching longer than 60 s per muscle directly before strength work is avoided (small strength loss; Behm et al. 2016). Under 60 s is fine.
2. Stretch to a 3–4/10 pull, never pain, never a nerve tug or tingling. Breathe out into the stretch.
3. **Extension-intolerant:** every hip-flexor and quad stretch starts with "tuck the tail, squeeze the glute"; the stretch ends when the low back would have to arch. No couch stretch, no cobra/upward dog, no standing back bends. Prone positions only with a pillow under the belly (S2). Thoracic extension only with the hips down and the lumbar spine neutral.
4. **Disc history:** no long-sitting toe-touches or slumped hamstring stretches; hamstrings are stretched supine with a strap. Child's pose only if flexion eases symptoms (contra `flexion-intolerant`).
5. Never two hip-flexor holds in one session; one stretch per region per slot.
6. Frequency beats intensity: 5–7 days a week of short doses for the Reset phase; 2–3 for maintenance.

## 4. Equipment rules

The planner should only pick an exercise when **every** item in its `equipment` is owned. `tube-band` should satisfy `band` for handled moves (rows, presses, Pallof). Proposed engine change: add `kettlebell`, `cable`, `ab-wheel`, `tube-band`, `stability-ball` and `slider` to `LOAD_EQUIPMENT` in `library.js` so the loaded-flexion/rotation rule covers them (today only band, mini-band and dumbbell count as loaded; none of the new entries break the rule, but future ones could).

| Equipment | Unlocks | When the planner should prefer it |
|---|---|---|
| none / mat | Most motor control, IR isometrics, desk moves | Always available; Reset and flare days |
| wall | figure4-wall, calf/knee-to-wall, wall slides, IR iso | Reset and desk; prefer `figure4-wall` over hand-pulled figure-4 (no pulling into flexion) |
| chair | Desk set, hip airplane support, goblet box target | Desk breaks; support for single-leg work |
| doorway | doorway-lat-stretch, doorwaychest | Reset and cool-down for upper-crossed patterns |
| strap / towel | strap-hamstring-supine, quad-stretch-strap, rectusstretch | Cool-down; replaces any seated hamstring stretch |
| step | step-down-eccentric, stepup | Strengthen/Integrate for hips (frontal-plane control) |
| bench | db-chest-supported-row | Gym days; preferred over any bent-over row for a disc |
| mini-band | monster-walk, band-lateral-lunge, bridge-march-band, seatedhipir | Control and Strengthen for hips; IR test |
| band | band-hip-hinge, band-split-squat, seated-hip-ir-band-slow | Strengthen; travel days |
| band + door-anchor | Anchored rows, high face pull, Pallof family, lat and straight-arm pulldown, chest press, ER at 90°, Y-T-W, anchored dead bug, banded hip-flexor stretch | **Replace free-band rows/face pulls at Strengthen** (fixed line of pull, easier to progress). Anchor on the hinge side, door shut and opening away from you |
| foam-roller | Thoracic extension, quads, lats, chest opener | Warm-up (thoracic, 60–90 s) before rows and wall slides; never on the low back |
| massage-ball | Glute (wall), pec, foot | Warm-up or desk; foot roll before short-foot work. Stop if it refers into the leg or arm |
| kettlebell | kb-deadlift-blocks, goblet-box-squat, farmer-carry, suitcasecarry | Strengthen/Integrate **only** when pain < 3/10, no flare in 7 days and the band hinge is clean. Deadlift from blocks first; lower the blocks before adding weight |
| dumbbell | db-split-squat, db-chest-supported-row, suitcasecarry | Same gate as kettlebell |
| stability-ball | ball-deadbug, ball-hamstring-curl, wallsquat option | Control (ball dead bug), Strengthen (curl) |
| yoga-block | bridge-block-squeeze, KB deadlift height | Duck-feet variant when feet won't go straight |
| slider | slider-hamstring-curl | Strengthen/Integrate, level 3, after the ball curl is clean |
| pullup-bar | dead-hang-supported | Optional relief/shoulder; feet always supported at first; skip with arm symptoms |
| ab-wheel | ab-wheel-kneeling-short | **Excluded for this profile** (`contra: ["extension-intolerant"]`): at failure the lumbar spine sags into loaded extension. Use ball-deadbug, Pallof overhead and straight-arm pulldowns for anti-extension instead |
| cable (gym) | Cable versions of the anchored-band moves | Gym days only; same rules as band + door-anchor |

## 5. Progression ladders for band work

**Rule of progression:** change one thing at a time; progress only when the form-rating rule says `progress` (3 clean ratings on 2+ days, 7+ days since the last change, pain < 4). Pain gates progression; the calendar never does.

**Resistance.** Light → medium → heavy (colour of the user's set). Move up when the top of the rep range is clean for two sessions; drop reps to the bottom of the range on the new band. Distance from the anchor is the micro-step between colours (one foot length = small step).

**Anchor height.**
- Low (door bottom): band-hip-hinge alternatives, hip-flexor distraction, anchored dead bug.
- Chest: rows, chest press, Pallof family, ER at 90°, Y-T-W.
- High (door top): face pull, lat pulldown, straight-arm pulldown.

**Stance ladder (anti-rotation and pulling):**
1. Seated on a chair (back supported) → 2. Standing, feet wide → 3. **Half-kneeling** (longest base, glute and hip flexor engaged) → 4. **Tall-kneeling** (narrow base, no leg help) → 5. Split stance standing → 6. Standing feet together or single-leg (Integrate only).

**Pallof family:** standing Pallof (existing `pallof`) → `pallof-half-kneeling` → `pallof-tall-kneeling` → `pallof-overhead-press` (reach stops where the ribs flare). Holds go 5 s → 10 s before adding band.

**Pull family:** `row` (free band) → `band-row-anchored` → `band-row-single-arm` (anti-rotation) → `db-chest-supported-row` (gym). Face pull: `facepull` → `band-facepull-high` → half-kneeling.

**Anti-extension:** `deadbug` → `ball-deadbug` → `deadbug-band-anchored` → `band-straight-arm-pulldown` standing. (Ab wheel never, for this profile.)

**Hinge:** `hiphinge` (dowel) → `pullthrough` → `band-hip-hinge` → `kb-deadlift-blocks` (high → low blocks → heavier). No good-mornings.

**Single leg:** `stepup` → `band-split-squat` → `db-split-squat`; frontal plane `sidesteps` → `monster-walk` → `band-lateral-lunge` → `step-down-eccentric`.

**Hip IR:** `hip-ir-iso-wall` / `ir9090-pin-iso` (isometric) → `seatedhipir` (mini-band) → `seated-hip-ir-band-slow` (eccentric) → `ir9090liftoff` → `standinghipir` → `hip-airplane-supported` (both hands → one fingertip → none) → `gait-line-drill` in daily walking.

## 6. Notes for the implementer

1. `data/exercises-extra.json` is not loaded yet. Add it to `app/js/data.js` and `tests/helpers.mjs` next to `exercises-desk.json`, and add the `stretch` category to the AGENTS.md list.
2. The new fields (`contexts`, `setupCue`, `focusCue`, `youtube`, `tags`, `freeDbId`, `source`) live on the exercise itself. Either move them into `data/coaching.json` (AGENTS.md recipe) or teach `Library` to read them from the exercise; `youtube` entries are search queries, never invented video ids (`type: "search"`).
3. `freeDbId` is set only where the open dataset shows the same movement (14 entries); its photos may show a different implement (cable vs band) for `Face_Pull` and `Straight-Arm_Pulldown`.
4. Bump the posture check version and add both tests' graders before shipping §2; `npm test` must grade every input combination.
5. Pick-up for the corrective `noband` caveat: treat `door-anchor` moves as band moves.
