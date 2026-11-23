# BackForge v4.0 — Spec B: Exercise Database + Video References

**Author role:** Exercise Database + Video expert, v4.0 overhaul
**Date:** 2026-11-22
**Sources:** `backend/data/exercises.json` (48 exercises, canonical IDs used throughout), in-app `EX` array in `index.html` (26 exercises), `~/workspace/goals/back-exercise-regimen/GOAL.md` (precautions).
**User profile driving every choice:** L4–L5 disc issue, right sciatica, anterior pelvic tilt (APT / lower-crossed), forward head + rounded shoulders (upper-crossed), right hip internal-rotation deficit, **extension-intolerant** (self-reported 2026-09-26).

## Hard constraints applied (non-negotiable)

- ❌ No loaded spinal flexion or loaded twisting.
- ❌ Never both knees to chest (single knee only — `kneechest` already enforces this).
- ❌ No press-ups, no sphinx, no prone extension holds, no lumbar-extension-loaded moves.
- ❌ No aggressive hamstring stretching (nerve glide = glide only, never a held stretch).
- ⚠️ Side-bend work (`qlreach`, `qlstretch`) stays **gentle and unloaded only** — torsion/side-flexion can trigger spasms in this user; stop on any leg referral.

### ⛔ FLAGGED & EXCLUDED from the v4 database view

These three records exist in `exercises.json` but **must not surface** in the v4 database view, routines, or video lists for this user — all are lumbar-extension moves and all carry `contra: ["extension-intolerant"]` in the source data:

| id | name | why excluded |
|---|---|---|
| `pressup` | Prone Press-Up | Extension-loaded; explicitly removed from the program 2026-09-26 |
| `sphinx` | Sphinx (Prone on Elbows) | Passive lumbar extension; its own progression points to press-ups |
| `proneext` | Prone Back Extension Hold (unloaded) | Extension hold, `spinal_load: "extension"` |

No enriched record and no video reference is provided for these three, deliberately.

### Field definitions (new in v4)

| field | meaning |
|---|---|
| `helps` | What it helps — one line, plain language |
| `muscles` | Primary target muscles |
| `postureFix` | The posture improvement it drives — one line |
| `gotIt` | Objective "you've got it" marker — the user can self-check form/posture is correct |
| `holdTarget` | Target hold in seconds (`0` = rep-based, no hold target) |
| `bandTarget` | Target band level / resistance description (`"none"` = no band) |
| `contexts` | `home` \| `desk` \| `travel` — desk/travel means: no equipment, doable in work clothes, quiet |

---

## 1. Enriched exercise records (20 existing exercises)

Paste-ready. IDs, names, dose and cues are unchanged from `exercises.json`; only the new fields are added.

### APT correction + Big 3 core

#### `curlup` — McGill Curl-Up
- **helps:** Builds front-core endurance without bending the spine under load.
- **muscles:** Rectus abdominis, obliques (bracing)
- **postureFix:** A braced, rib-down trunk that stops the pelvis dumping forward into APT.
- **gotIt:** Hold 8s with head/neck/shoulders lifted as one unit, natural low-back curve preserved on your hands, breathing through pursed lips.
- **holdTarget:** 8 (progress to 10)
- **bandTarget:** none
- **contexts:** home, travel

#### `birddog` — Bird-Dog
- **helps:** Trains the back and glutes to hold the spine still while limbs move.
- **muscles:** Gluteus maximus, spinal extensors (isometric), obliques, transverse abdominis
- **postureFix:** Pelvis that stays level in walking and lifting instead of tipping forward.
- **gotIt:** Hold 8s per side with pelvis level (imagined glass of water stays on your low back) and leg reaching long, not high.
- **holdTarget:** 8 (progress to 10)
- **bandTarget:** none (progression only: light loop around feet)
- **contexts:** home, travel

#### `sideplank` — Side Plank (from knees)
- **helps:** Builds the side-core endurance that is this user's known lateral gap.
- **muscles:** Quadratus lumborum, obliques, gluteus medius
- **postureFix:** A pelvis that doesn't drop or roll sideways in single-leg stance and gait.
- **gotIt:** Hold 30s per side in one straight line from head to knees, hips stacked, breathing steadily — stop the set at form loss, not shaking failure.
- **holdTarget:** 30
- **bandTarget:** none
- **contexts:** home, travel

#### `deadbug` — Dead Bug (band-assisted)
- **helps:** Teaches the core to hold a tucked, rib-down pelvis while the legs move — the anti-APT skill.
- **muscles:** Transverse abdominis, rectus abdominis, obliques
- **postureFix:** Posterior-tilt control on demand, so standing posture stops defaulting to an arched APT stance.
- **gotIt:** Full set with low back staying heavy on the floor for every rep — the moment it arches off, the rep doesn't count.
- **holdTarget:** 0 (tempo target instead: 3s out, 3s back)
- **bandTarget:** Light long band anchored overhead holding the arms; if the back arches, drop the band and do toe taps.
- **contexts:** home, travel (band-free toe-tap version)

#### `pallof` — Pallof Press
- **helps:** Anti-rotation strength — the trunk refuses to be twisted by everyday loads.
- **muscles:** Obliques, transverse abdominis, gluteus medius (stance side)
- **postureFix:** Ribs stacked over pelvis under load, instead of the ribs flaring and pelvis tipping.
- **gotIt:** 10 presses per side with ribs down, hips square, and zero torso rotation as the arms extend.
- **holdTarget:** 2 (pause at full extension)
- **bandTarget:** Light-to-medium long band at chest height — heavy enough that the last 2 reps are work, light enough that the torso never rotates.
- **contexts:** home

#### `breathing360` — 360° Breathing & Brace
- **helps:** Restores diaphragmatic breathing and the brace every other exercise depends on.
- **muscles:** Diaphragm, transverse abdominis, pelvic floor, obliques
- **postureFix:** Ribs that drop down-and-in on the exhale instead of flaring up into APT.
- **gotIt:** 6 breaths where your hands on the lower ribs move out sideways and back — not up — and each exhale ends in a gentle brace with ribs down.
- **holdTarget:** 0 (breath-based; exhale ~5s)
- **bandTarget:** none
- **contexts:** home, desk, travel

#### `pelvictilt` — Supine Pelvic Tilt Drill
- **helps:** Teaches the posterior tilt itself — the exact movement APT correction is built on.
- **muscles:** Deep abdominals, gluteus maximus
- **postureFix:** Voluntary control of pelvic position, the prerequisite for the hip-flexor stretch and dead bug.
- **gotIt:** Hold 3s per rep with the waistband visibly tipping up using abs + glutes, pain-free, breathing throughout.
- **holdTarget:** 3
- **bandTarget:** none
- **contexts:** home, travel

#### `hipflexorstretch` — Half-Kneeling Hip Flexor Stretch
- **helps:** Lengthens the tight hip flexors that pull the pelvis into APT.
- **muscles:** Iliopsoas, rectus femoris (stretched); gluteus maximus of the back leg (active)
- **postureFix:** The direct counter to APT — pelvis can sit neutral instead of being dragged forward.
- **gotIt:** Hold 45s per side feeling the stretch in the front of the hip with tailbone tucked and **no** low-back arch — if you feel it in your back, you are arching, not stretching.
- **holdTarget:** 45
- **bandTarget:** none
- **contexts:** home, travel (standing chair-supported version: desk)

### Glute activation

#### `glutebridge` — Banded Glute Bridge
- **helps:** Wakes up the glute max that APT and sitting switch off.
- **muscles:** Gluteus maximus, gluteus medius (band), hamstrings (assist only)
- **postureFix:** Glutes strong enough to hold the pelvis tucked in standing, not just on the floor.
- **gotIt:** Top of every rep held 2s with ribs down, knees pushing out into the band, squeeze coming from the glutes — never an arch to finish.
- **holdTarget:** 2 (top hold per rep)
- **bandTarget:** Light-to-medium mini-band above the knees — knees stay out for all 20 reps without caving.
- **contexts:** home, travel (no-band version)

#### `clamshell` — Banded Clamshell
- **helps:** Builds glute med, the pelvic-stability muscle that is weak on the guarding pattern.
- **muscles:** Gluteus medius, deep hip external rotators
- **postureFix:** Pelvis that stays level in single-leg support instead of dropping toward the weak side.
- **gotIt:** Full set felt deep in the buttock with pelvis not rolling back and feet glued — feeling it at the front of the hip means TFL has taken over: reduce range.
- **holdTarget:** 1 (brief top pause)
- **bandTarget:** Light mini-band above the knees; no band until the deep-buttock feel is reliable.
- **contexts:** home, travel (no-band version)

### Upper-crossed correction (forward head / rounded shoulders)

#### `pullapart` — Band Pull-Apart
- **helps:** Strengthens the upper-back muscles that sitting switches off.
- **muscles:** Rhomboids, middle/lower trapezius, posterior deltoid
- **postureFix:** Shoulder blades that sit down-and-together by default, undoing rounded shoulders.
- **gotIt:** 15 reps with band touching the chest, shoulder blades pinching, ribs down and no low-back arch, 2-second return.
- **holdTarget:** 1 (pause at chest)
- **bandTarget:** Light long band — full range to the chest for all 15 reps with no shrug; if you shrug, the band is too heavy.
- **contexts:** home, desk (if a band is in the desk drawer), travel (band packs flat)

#### `facepull` — Banded Face Pull
- **helps:** Trains external rotation + upper back together — the full upper-crossed antidote.
- **muscles:** Infraspinatus/teres minor (external rotators), rhomboids, middle trapezius, posterior deltoid
- **postureFix:** Shoulders that rotate open and sit back instead of rolling forward and in.
- **gotIt:** Finish position held with knuckles back, thumbs behind you, elbows high, neck long and chin tucked — for all 15 reps.
- **holdTarget:** 1 (progress to 2s pause at full rotation)
- **bandTarget:** Light long band anchored at face height — rotation must complete on every rep; chest-height pulling means it's too heavy or too low.
- **contexts:** home, travel (door anchor)

#### `row` — Banded Row
- **helps:** Builds the mid-back pulling strength that holds the chest tall.
- **muscles:** Rhomboids, middle trapezius, latissimus dorsi, posterior deltoid
- **postureFix:** A tall chest and retracted shoulder blades that persist through the workday.
- **gotIt:** 12 reps pulled to the lower ribs with spine neutral, shoulder blades gliding together, ribs down at the finish — no rounding to pull harder.
- **holdTarget:** 1 (pause at ribs)
- **bandTarget:** Medium long band — the last 2 reps are effortful but the spine never rounds.
- **contexts:** home, travel (door anchor)

#### `chintuck` — Chin Tuck
- **helps:** Wakes up the deep neck flexors and glides the head back over the shoulders.
- **muscles:** Deep cervical flexors (longus colli/capitis)
- **postureFix:** Head stacked over the shoulders instead of jutting forward of them.
- **gotIt:** Hold 5s per rep with a straight-back glide (double chin made), eyes level, no downward tilt — 10 clean reps.
- **holdTarget:** 5
- **bandTarget:** none (progression only: light band behind head)
- **contexts:** home, desk, travel

#### `deepneckflexor` — Supine Deep Neck Flexor Hold
- **helps:** Builds endurance in the deep neck flexors so the chin tuck holds all day, not just for 10 reps.
- **muscles:** Deep cervical flexors (longus colli/capitis)
- **postureFix:** Forward-head correction that lasts — endurance, not just mobility.
- **gotIt:** Hold 10s with the tuck kept the whole time, head barely off the floor, breathing normally, front-of-neck (SCM) staying quiet.
- **holdTarget:** 10 (progress to 20)
- **bandTarget:** none
- **contexts:** home, travel

#### `wallangel` — Wall Angel
- **helps:** Combines thoracic mobility with lower-trap control against a wall that gives honest feedback.
- **muscles:** Lower/middle trapezius, serratus anterior; thoracic extensors (mobility)
- **postureFix:** Arms can reach overhead without the ribs flaring and low back arching off the wall.
- **gotIt:** 10 reps with head, upper back and tailbone all staying on the wall and ribs down for the whole slide — range only counts while contact holds.
- **holdTarget:** 0
- **bandTarget:** none (progression: banded wall angel)
- **contexts:** home, desk, travel (any wall)

#### `wallslide` — Scapular Wall Slide
- **helps:** Teaches the shoulder blades to slide up-and-around without shrugging — the movement rounded shoulders lose.
- **muscles:** Serratus anterior, lower trapezius
- **postureFix:** Upward scapular rotation with a long neck, replacing the shrug-and-round pattern.
- **gotIt:** 10 slides in a narrow V with forearms staying on the wall, ribs down, neck long, no ear-shrug at the top.
- **holdTarget:** 0
- **bandTarget:** none (progression: mini-band around wrists)
- **contexts:** home, desk, travel (any wall)

#### `doorwaychest` — Doorway Chest Stretch
- **helps:** Opens the tight pecs that pull the shoulders forward.
- **muscles:** Pectoralis major/minor (stretched)
- **postureFix:** Removes the front-side tightness so the upper-back work can actually hold the shoulders back.
- **gotIt:** Hold 30s per side with stretch felt in the front of the chest, chin lightly tucked, ribs down, zero low-back arch.
- **holdTarget:** 30
- **bandTarget:** none
- **contexts:** home, desk, travel (any door frame)

### Hip internal rotation (right-side priority)

#### `hipir9090` — 90/90 Hip Switch
- **helps:** Restores hip rotation so the lumbar spine stops compensating for a stiff right hip.
- **muscles:** Hip internal/external rotators, gluteus medius, adductors (control through range)
- **postureFix:** A right hip that rotates inward in gait, ending the left-side weight-shift guarding.
- **gotIt:** 8 slow switches sitting tall with both knees reaching the floor on both sides — the stiff (right IR) side is the measure; leaning away to fake it doesn't count.
- **holdTarget:** 2 (brief settle at each end)
- **bandTarget:** none
- **contexts:** home, travel

#### `seatedhipir` — Seated Hip Internal Rotation (banded)
- **helps:** Strengthens right hip IR in a chair — the desk-friendly version of the IR program.
- **muscles:** Hip internal rotators (adductor group, gluteus medius anterior fibres, TFL as rotator)
- **postureFix:** Active IR strength, not just passive range, on the side that guards.
- **gotIt:** 12 reps per side with thigh pinned still and trunk tall — rotation comes from the hip only; right side done first, plus an extra set.
- **holdTarget:** 1 (progress to 3s end-range hold)
- **bandTarget:** Light mini-band around the ankles/foot anchored — full set without the thigh swinging; no band until the pattern is clean.
- **contexts:** home, desk (no-band version in work clothes), travel

---

## 2. New no-equipment work/travel exercises (8 proposed additions)

All screened against the hard constraints: no spinal loading, no flexion/twist under load, no extension-loaded moves, no hamstring stretching. All are doable in work clothes, quietly, with no equipment. IDs are new (`new-` prefix until merged into `exercises.json`).

#### `new-seated-pelvic-tilt` — Seated Pelvic Tilt & Rib Stack (desk)
- **dose:** 2 × 8 · 3-sec holds, hourly at the desk
- **helps:** Resets APT while seated — the position the tilt is worst in.
- **muscles:** Deep abdominals, gluteus maximus (seated squeeze)
- **postureFix:** A seated pelvis that can find neutral instead of slumping then arching.
- **gotIt:** Hold 3s with waistband tipped up, ribs stacked over pelvis, feet flat, no breath-hold.
- **holdTarget:** 3
- **bandTarget:** none
- **contexts:** desk, travel
- **cues:** (1) Sit on your sit-bones, feet flat. (2) Gently roll the pelvis under like tucking a tail. (3) Exhale as you tuck, ribs drop.
- **regression:** Smaller range, hands on thighs for feedback.

#### `new-seated-scap-pinch` — Seated Scapular Pinch & Set (desk)
- **dose:** 2 × 10 · 3-sec holds
- **helps:** No-band substitute for pull-aparts during the workday.
- **muscles:** Rhomboids, middle/lower trapezius
- **postureFix:** Shoulder blades re-set down-and-together after every hour of screen slouch.
- **gotIt:** Hold 3s with blades pinched and slid down toward back pockets, chest tall, no low-back arch, no shrug.
- **holdTarget:** 3
- **bandTarget:** none
- **contexts:** desk, travel
- **cues:** (1) Sit tall, arms relaxed. (2) Pinch blades together and down. (3) Keep the neck long — chin lightly tucked.
- **regression:** 1-sec holds, smaller pinch.

#### `new-standing-wall-reset` — Standing Wall Posture Reset (desk/travel)
- **dose:** 3 × 20-sec holds, between meetings
- **helps:** A full-stack posture check — head, ribs, pelvis — against a wall's honest feedback.
- **muscles:** Deep cervical flexors, lower trapezius, deep abdominals (all isometric)
- **postureFix:** Re-teaches the stacked standing posture APT + forward head erase.
- **gotIt:** Hold 20s with tailbone, upper back and back of head all on the wall, chin tucked, ribs down, breathing normally.
- **holdTarget:** 20
- **bandTarget:** none
- **contexts:** desk, travel, home
- **cues:** (1) Three points on the wall: tailbone, shoulder blades, head. (2) Chin in, don't look up to force head contact. (3) Breathe — if you can't breathe, you're forcing it.
- **regression:** Head doesn't reach the wall yet — hold with head off the wall, chin tucked, and measure the gap shrinking over weeks.

#### `new-seated-thoracic-opener` — Seated Thoracic Opener over Chair Back (desk)
- **dose:** 2 × 6 slow reps
- **helps:** Mobilises the stiff upper back (T4–T7) over the chair back — thoracic only, lumbar stays still.
- **muscles:** Thoracic extensors (mobility), deep neck flexors (head support)
- **postureFix:** Upper-back extension restored so the neck stops compensating for a rounded thorax.
- **gotIt:** 6 reps arching only over the chair-back edge at mid-back level, hands supporting the head, pelvis glued to the seat — no low-back movement.
- **holdTarget:** 2 (at each rep's end)
- **bandTarget:** none
- **contexts:** desk
- **cues:** (1) Chair back edge at the mid-back, never the low back. (2) Hands cradle the head, elbows wide. (3) Small range, exhale as you open. Stop if anything refers down the leg.
- **regression:** Rolled towel over the chair back to soften the edge, smaller range.

#### `new-standing-glute-tilt` — Standing Glute Squeeze & Posterior Tilt (desk/travel)
- **dose:** 3 × 8 · 5-sec holds, at a counter or desk edge
- **helps:** The standing version of the APT fix — glutes on, pelvis tucked, while waiting for coffee.
- **muscles:** Gluteus maximus, deep abdominals
- **postureFix:** Standing posture with the pelvis tucked by glutes instead of hanging on the hip flexors and low back.
- **gotIt:** Hold 5s standing tall with glutes squeezed, belt buckle tipped up toward the ribs, knees soft, breathing normally.
- **holdTarget:** 5
- **bandTarget:** none
- **contexts:** desk, travel, home
- **cues:** (1) Stand tall, feet hip-width. (2) Squeeze glutes and tip the belt buckle up. (3) Ribs stay down — tall, not arched.
- **regression:** 2-sec holds, hand on counter for balance.

#### `new-seated-desk-hip-ir` — Seated Desk Hip IR (no band)
- **dose:** 2 × 10 / side, right side first + extra set
- **helps:** The work-clothes version of the right-hip IR program — no band, no floor.
- **muscles:** Hip internal rotators
- **postureFix:** Keeps right IR range from stiffening back up across a desk day.
- **gotIt:** 10 reps with thigh still, trunk tall, shin rotating out from the hip only — no trunk lean.
- **holdTarget:** 2 (end-range)
- **bandTarget:** none
- **contexts:** desk, travel
- **cues:** (1) Sit tall at the chair edge, knee at 90°. (2) Keep the thigh pinned; swing the foot outward. (3) Slow — 2 seconds out, 2 back.
- **regression:** Smaller range, hands gripping the chair seat to lock the trunk.

#### `new-chair-sit-stand` — Chair Sit-to-Stand (desk/travel)
- **dose:** 2 × 8, slow 3-sec lower
- **helps:** Glute strength in the exact pattern of getting out of a chair — the movement done 50× a day.
- **muscles:** Gluteus maximus, quadriceps
- **postureFix:** Rising with glutes and a neutral spine instead of rounding then arching the low back.
- **gotIt:** 8 reps standing fully tall with glutes squeezed and pelvis tucked at the top, knees tracking over toes, no hand push-off.
- **holdTarget:** 1 (top squeeze)
- **bandTarget:** none
- **contexts:** desk, travel, home
- **cues:** (1) Feet flat, hinge slightly from the hips. (2) Drive through the heels. (3) Finish tall — squeeze, don't arch.
- **regression:** Higher chair, hands on thighs for assist.

#### `new-standing-chest-opener` — Standing Hands-Behind-Back Chest Opener (desk/travel)
- **dose:** 2 × 20-sec holds
- **helps:** Doorway-stretch substitute for hotel rooms and offices with no free door frame.
- **muscles:** Pectoralis major/minor, anterior deltoid (stretched)
- **postureFix:** Opens the chest anywhere, so rounded shoulders don't set in during travel days.
- **gotIt:** Hold 20s with hands clasped behind the back, arms gently straightening, chest open, chin tucked, ribs down — stretch in the chest, never the low back.
- **holdTarget:** 20
- **bandTarget:** none
- **contexts:** desk, travel, home
- **cues:** (1) Clasp hands behind your back. (2) Straighten arms gently and lift them a small way. (3) Chest tall, ribs down — don't arch to fake range.
- **regression:** Hold a towel between the hands if the clasp doesn't reach.

---

## 3. Video references

**Repo rule honoured:** a direct `watch?v=` URL is only used where the ID was actually resolved and opened/verified in this session (see Verification Log). Everything else is a labelled YouTube **search** URL — never an invented ID. Channel names on search-type rows are the intended target channel for the search, not a claim that a specific video exists.

| exercise id | video title | channel | URL | type |
|---|---|---|---|---|
| curlup | The 3 Best Core Exercises [Do These Every Day] — Big 3, curl-up segment | Squat University | https://www.youtube.com/watch?v=2_e4I-brfqs | direct |
| curlup | (search: McGill curl-up) | BackFitPro (target) | https://www.youtube.com/results?search_query=McGill+curl+up+BackFitPro | search |
| birddog | The 3 Best Core Exercises [Do These Every Day] — Big 3, bird-dog segment | Squat University | https://www.youtube.com/watch?v=2_e4I-brfqs | direct |
| birddog | (search: bird dog form) | E3 Rehab (target) | https://www.youtube.com/results?search_query=bird+dog+exercise+E3+Rehab | search |
| sideplank | The 3 Best Core Exercises [Do These Every Day] — Big 3, side plank segment | Squat University | https://www.youtube.com/watch?v=2_e4I-brfqs | direct |
| sideplank | (search: McGill side bridge) | BackFitPro (target) | https://www.youtube.com/results?search_query=McGill+side+bridge+side+plank+BackFitPro | search |
| deadbug | (search: dead bug form) | E3 Rehab (target) | https://www.youtube.com/results?search_query=dead+bug+exercise+E3+Rehab | search |
| deadbug | (search: dead bug core stability) | Squat University (target) | https://www.youtube.com/results?search_query=dead+bug+core+stability+Squat+University | search |
| pallof | (search: Pallof press form) | Squat University (target) | https://www.youtube.com/results?search_query=Pallof+press+Squat+University | search |
| pallof | (search: Pallof press anti-rotation) | E3 Rehab (target) | https://www.youtube.com/results?search_query=Pallof+press+anti+rotation+E3+Rehab | search |
| breathing360 | (search: 360 breathing brace) | Squat University (target) | https://www.youtube.com/results?search_query=360+breathing+abdominal+brace+Squat+University | search |
| breathing360 | (search: diaphragmatic breathing core) | E3 Rehab (target) | https://www.youtube.com/results?search_query=diaphragmatic+breathing+core+stability+E3+Rehab | search |
| pelvictilt | (search: supine pelvic tilt) | Bob and Brad (target) | https://www.youtube.com/results?search_query=pelvic+tilt+exercise+Bob+and+Brad | search |
| pelvictilt | (search: posterior pelvic tilt anterior pelvic tilt fix) | E3 Rehab (target) | https://www.youtube.com/results?search_query=posterior+pelvic+tilt+anterior+pelvic+tilt+exercise | search |
| hipflexorstretch | How To: Half Kneeling Hip Flexor Stretch | Live Lean TV | https://www.youtube.com/watch?v=Bfb-9dIWEr4 | direct |
| hipflexorstretch | (search: half kneeling hip flexor stretch, posterior tilt cue) | E3 Rehab (target) | https://www.youtube.com/results?search_query=half+kneeling+hip+flexor+stretch+E3+Rehab | search |
| glutebridge | (search: glute bridge form) | Squat University (target) | https://www.youtube.com/results?search_query=glute+bridge+form+Squat+University | search |
| glutebridge | (search: banded glute bridge) | E3 Rehab (target) | https://www.youtube.com/results?search_query=banded+glute+bridge+glute+activation | search |
| clamshell | (search: clamshell glute med) | E3 Rehab (target) | https://www.youtube.com/results?search_query=clamshell+exercise+glute+med+E3+Rehab | search |
| clamshell | (search: clamshell form mistakes) | Squat University (target) | https://www.youtube.com/results?search_query=clamshell+exercise+form+Squat+University | search |
| pullapart | How to Fix Forward Head Posture: 3 Simple Exercises — band pull-apart segment | Chad G — Ortho OT | https://www.youtube.com/watch?v=oMbijdp5IYY | direct |
| pullapart | (search: band pull-apart posture) | Squat University (target) | https://www.youtube.com/results?search_query=band+pull+apart+posture+Squat+University | search |
| facepull | (search: banded face pull external rotation) | Squat University (target) | https://www.youtube.com/results?search_query=face+pull+external+rotation+Squat+University | search |
| facepull | (search: face pull posture) | E3 Rehab (target) | https://www.youtube.com/results?search_query=banded+face+pull+posture+correction | search |
| row | (search: banded row form) | Squat University (target) | https://www.youtube.com/results?search_query=band+row+form+Squat+University | search |
| row | (search: seated band row posture) | E3 Rehab (target) | https://www.youtube.com/results?search_query=seated+band+row+posture+exercise | search |
| chintuck | How to Fix Forward Head Posture: 3 Simple Exercises — chin tuck segment | Chad G — Ortho OT | https://www.youtube.com/watch?v=oMbijdp5IYY | direct |
| chintuck | Best Posture Tricks — Stand Tall, Look & Feel Great! (chin tuck + wall work) | Bob and Brad | https://www.youtube.com/watch?v=87nFLQno0qQ | direct |
| chintuck | (search: chin tuck forward head) | E3 Rehab (target) | https://www.youtube.com/results?search_query=chin+tuck+forward+head+E3+Rehab | search |
| deepneckflexor | (search: deep neck flexor training) | E3 Rehab (target) | https://www.youtube.com/results?search_query=deep+neck+flexor+exercise+forward+head | search |
| deepneckflexor | (search: chin tuck hold deep cervical flexor) | Bob and Brad (target) | https://www.youtube.com/results?search_query=deep+cervical+flexor+chin+tuck+hold | search |
| wallangel | Best Posture Tricks — Stand Tall, Look & Feel Great! (wall angel segment) | Bob and Brad | https://www.youtube.com/watch?v=87nFLQno0qQ | direct |
| wallangel | (search: wall angel form) | Squat University (target) | https://www.youtube.com/results?search_query=wall+angel+exercise+Squat+University | search |
| wallslide | (search: scapular wall slide) | E3 Rehab (target) | https://www.youtube.com/results?search_query=scapular+wall+slide+serratus+anterior | search |
| wallslide | (search: wall slide shoulder posture) | Squat University (target) | https://www.youtube.com/results?search_query=wall+slide+exercise+posture+Squat+University | search |
| doorwaychest | (search: doorway chest stretch) | Bob and Brad (target) | https://www.youtube.com/results?search_query=doorway+chest+stretch+rounded+shoulders+Bob+and+Brad | search |
| doorwaychest | (search: pec stretch doorway form) | E3 Rehab (target) | https://www.youtube.com/results?search_query=doorway+pec+stretch+E3+Rehab | search |
| hipir9090 | 90/90 Hip Switch You Can Actually Do (Even With Tight Hips) (Short) | Christina Nicci | https://www.youtube.com/shorts/CVVg8haOYlQ | direct |
| hipir9090 | (search: hip range of motion, 90/90) | E3 Rehab (target) | https://www.youtube.com/results?search_query=how+to+improve+hip+range+of+motion+E3+Rehab | search |
| seatedhipir | (search: seated hip internal rotation) | E3 Rehab (target) | https://www.youtube.com/results?search_query=seated+hip+internal+rotation+exercise | search |
| seatedhipir | (search: hip internal rotation drills) | Squat University (target) | https://www.youtube.com/results?search_query=hip+internal+rotation+drills+Squat+University | search |
| new-seated-pelvic-tilt | (search: seated pelvic tilt) | Bob and Brad (target) | https://www.youtube.com/results?search_query=seated+pelvic+tilt+exercise+desk | search |
| new-seated-pelvic-tilt | (search: seated posture reset) | E3 Rehab (target) | https://www.youtube.com/results?search_query=seated+posture+reset+pelvic+tilt | search |
| new-seated-scap-pinch | (search: scapular retraction squeeze) | Bob and Brad (target) | https://www.youtube.com/results?search_query=scapular+retraction+squeeze+exercise+posture | search |
| new-seated-scap-pinch | (search: seated shoulder blade squeeze desk) | — | https://www.youtube.com/results?search_query=seated+shoulder+blade+squeeze+desk+exercise | search |
| new-standing-wall-reset | Best Posture Tricks — Stand Tall, Look & Feel Great! (wall posture test + reset) | Bob and Brad | https://www.youtube.com/watch?v=87nFLQno0qQ | direct |
| new-standing-wall-reset | (search: wall posture test three points) | E3 Rehab (target) | https://www.youtube.com/results?search_query=wall+posture+test+exercise | search |
| new-seated-thoracic-opener | How to Fix Forward Head Posture: 3 Simple Exercises — thoracic extension segment (use chair back instead of roller at a desk) | Chad G — Ortho OT | https://www.youtube.com/watch?v=oMbijdp5IYY | direct |
| new-seated-thoracic-opener | (search: seated thoracic extension chair) | Bob and Brad (target) | https://www.youtube.com/results?search_query=seated+thoracic+extension+chair+exercise | search |
| new-standing-glute-tilt | (search: standing posterior pelvic tilt glute squeeze) | E3 Rehab (target) | https://www.youtube.com/results?search_query=standing+posterior+pelvic+tilt+glute+squeeze | search |
| new-standing-glute-tilt | (search: anterior pelvic tilt standing fix) | Squat University (target) | https://www.youtube.com/results?search_query=anterior+pelvic+tilt+fix+Squat+University | search |
| new-seated-desk-hip-ir | (search: seated hip internal rotation chair) | — | https://www.youtube.com/results?search_query=seated+hip+internal+rotation+chair+drill | search |
| new-seated-desk-hip-ir | (search: hip internal rotation mobility) | E3 Rehab (target) | https://www.youtube.com/results?search_query=hip+internal+rotation+mobility+E3+Rehab | search |
| new-chair-sit-stand | (search: sit to stand exercise form) | Bob and Brad (target) | https://www.youtube.com/results?search_query=sit+to+stand+exercise+proper+form | search |
| new-chair-sit-stand | (search: chair stand glute strength) | E3 Rehab (target) | https://www.youtube.com/results?search_query=chair+sit+to+stand+glute+exercise | search |
| new-standing-chest-opener | (search: standing chest opener stretch hands behind back) | Bob and Brad (target) | https://www.youtube.com/results?search_query=standing+chest+opener+stretch+posture | search |
| new-standing-chest-opener | (search: chest stretch no equipment standing) | — | https://www.youtube.com/results?search_query=standing+chest+stretch+no+equipment+rounded+shoulders | search |

---

## Verification log

Checked 2026-11-22 (America/New_York session date; pages crawled 2026-11-23 UTC by the fetch service). Method for every direct link: the URL was first returned by `browser.search` (or, for the Bob and Brad video, printed as the original-video link on bobandbrad.com), then fetched with `browser.open`, which returned the video page with matching title and description. No video ID in this file was written from memory.

| URL | check | result |
|---|---|---|
| https://www.youtube.com/watch?v=2_e4I-brfqs | `browser.search` ("McGill curl up Squat University") returned it as result 0; `browser.open` fetched the page | ✅ Resolves. Title: "The 3 Best Core Exercises [Do These Every Day]". Description confirms Squat University / Dr. Stuart McGill Big 3 with curl-up, side plank and bird-dog segments — matches `curlup`, `birddog`, `sideplank`. |
| https://www.youtube.com/watch?v=87nFLQno0qQ | Found as the original-video (`youtu.be`) link on the bobandbrad.com article "Best Posture Tricks"; `browser.open` fetched the watch page | ✅ Resolves. Title: "Best Posture Tricks - Stand Tall, Look & Feel Great!". Channel links to @bobandbrad; keywords include forward head posture / rounded shoulders. Article transcript confirms chin tuck and wall angel content — used for `chintuck`, `wallangel`, `new-standing-wall-reset`. |
| https://www.youtube.com/watch?v=Bfb-9dIWEr4 | `browser.search` ("half kneeling hip flexor stretch") returned it as result 0 with matching title; `browser.open` fetched the page | ✅ Resolves. Title: "How To: Half Kneeling Hip Flexor Stretch". Channel: Live Lean TV. Description's form steps (glute contract → pelvic tuck → shift forward, no low-back arch) match `hipflexorstretch` cues exactly. Note: not an E3 Rehab video — earlier in-app search hints assumed E3; the verified video is Live Lean TV. |
| https://www.youtube.com/watch?v=oMbijdp5IYY | `browser.search` ("chin tuck exercise E3 Rehab forward head") returned it as result 0; `browser.open` fetched the page | ✅ Resolves. Title: "How to Fix Forward Head Posture: 3 Simple Exercises". Channel: Chad G — Ortho OT (hashtags #ChadGOrthoOT). Description confirms the three segments used here: chin tucks (`chintuck`), thoracic extension (`new-seated-thoracic-opener`), band pull-aparts (`pullapart`). Note: not E3 Rehab despite the search terms — labelled with its real channel. |
| https://www.youtube.com/shorts/CVVg8haOYlQ | `browser.search` ("90/90 hip switch E3 Rehab") returned it as result 2; `browser.open` fetched the Shorts page | ✅ Resolves. Title: "90/90 Hip Switch You Can Actually Do (Even With Tight Hips)". Creator identifies herself in the description as Christina Nicci, corrective movement specialist — matches `hipir9090`, including the elevated-surface regression already in the library. Note: it is a Short, and not E3 Rehab. |

**Search-type rows:** not individually opened — by design. Each is a live YouTube search URL, labelled `search`, following the repo's standing rule for unverified IDs. Promote a row to `direct` only after opening the watch page and confirming title + channel, then append the check to this log.

**Deliberately no references for:** `pressup`, `sphinx`, `proneext` — excluded as extension-loaded (see top of file). Also no video was sourced for any move involving both-knees-to-chest, loaded twisting, or aggressive hamstring stretching; none appears in this spec.
