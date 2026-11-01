# BackForge — Exercise Directory

**48 exercises** · Band-first · Built for chronic L4–L5 pain with right-side sciatica, anterior pelvic tilt (APT), forward-head posture, and a right-hip internal-rotation deficit.

Machine-readable source: `backend/data/exercises.json` — this document is generated from that file, in the same order and with the same content.

Counts by category: Warm-Up 2 · Mobility 9 · Core 6 · Glute 7 · Hip 7 · Strength 10 · Cool-Down 3 · Flare Relief 4.

## Safety rules — no exceptions

- **No loaded spinal flexion.** No Jefferson curls, no crunches, no sit-ups. Nothing in this directory loads the spine in flexion.
- **No both-knees-to-chest stretch, in any entry, ever.** The only knee-to-chest entry (`kneechest`) is strictly one knee at a time, with the other foot planted.
- **No loaded spinal twisting.** Anti-rotation work (e.g. Pallof Press) trains *resisting* rotation with a neutral spine. The one rotation-mobility entry (Thoracic Open Book) rotates only the upper back with the pelvis and lumbar spine locked still, unloaded.
- **Extension is gated, not banned outright.** Ayaan is extension-intolerant, so every extension-biased entry carries `"contra": ["extension-intolerant"]` and `"spinal_load": "extension"`. See below.
- **Modify, don't stop.** Every entry has a regression. A flare day uses the `relief` category only.
- Pain that travels further down the leg, or new sharp/electric pain, stops the exercise — it is not a "push through it" signal.

## How `contra` tags work

Each entry has a `contra` array. The planning engine must exclude any exercise whose `contra` list intersects the user's active findings/flags.

- Example: with the finding **extension-intolerant** active, the engine excludes `proneext` (Prone Back Extension Hold), `sphinx`, and `pressup` — all three are tagged `"contra": ["extension-intolerant"]`.
- Entries with `"contra": []` are not excluded by that finding.
- `spinal_load` is one of `none | flexion | extension | rotation`. In this directory every entry is `none` except the three gated extension entries above. There are **zero** entries with `spinal_load` of `flexion` or `rotation`.

## Target keys

Targets use the app's existing finding keys plus the expanded backend keys, side by side so both engines match: legacy — `core-endurance`, `glute-weak`, `lateral-gap`, `upper-crossed`, `posture`, `sciatica`, `hinge`; expanded — `core-stability`, `glute-med`, `glute-max`, `hip-ir`, `apt`, `hip-flexor`, `forward-head`, `lateral-endurance`, `ql`, `hamstring-control`, `sciatica-relief`, `thoracic-mobility`, `back-extension`, `nerve-mobility`.

Equipment keys: `none | band` (long band) `| mini-band` (loop) `| dumbbell | chair | wall | towel`. Original app field `band: loop` maps to `mini-band`, `band: long` maps to `band`.

Levels: 1 = starter / flare-safe base, 2 = standard progression, 3 = advanced (only entry: 90/90 IR Lift-Off).

## Warm-Up (2)

### Cat-Camel (`catcamel`)

- **Dose:** 5–6 slow cycles before Big 3 · **Level:** 1 · **Equipment:** none
- **Targets:** core-stability, core-endurance
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Motion, not stretch — move through a comfortable arc
  - McGill: this reduces stiffness before stability work
  - Breathe with the movement
- **Common mistakes:**
  - Pushing end range hard
  - Rushing it
- **Regression → Progression:** Seated version → Add segmental control — move one vertebra at a time

### 360° Breathing & Brace (`breathing360`)

- **Dose:** 2 × 6 breaths · **Level:** 1 · **Equipment:** none
- **Targets:** core-stability, core-endurance, apt
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Hands on lower ribs — breathe into front, sides and back
  - Long slow exhale, ribs drop down and in
  - Finish each exhale with a gentle brace, like bracing for a cough
- **Common mistakes:**
  - Chest-only breathing, shoulders rising
  - Hard breath-holding or bearing down
- **Regression → Progression:** Supine with knees bent, fewer breaths → Standing brace, then brace while marching in place

## Mobility (9)

### Half-Kneeling Hip Flexor Stretch (`hipflexorstretch`)

- **Dose:** 2 × 45 sec / side · **Level:** 1 · **Equipment:** none
- **Targets:** apt, hip-flexor
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Tuck the tailbone first — squeeze the glute of the back leg
  - Shift forward only after the tuck; no low-back arch
  - This is the direct counter to anterior pelvic tilt
- **Common mistakes:**
  - Arching the low back and calling it a stretch
  - Knee pain — pad it
- **Regression → Progression:** Standing version holding a chair → Add the long band overhead reach

### Chin Tuck (`chintuck`)

- **Dose:** 3 × 10 · 5-sec holds · **Level:** 1 · **Equipment:** none
- **Targets:** forward-head, upper-crossed
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Glide the chin straight back — make a double chin
  - Eyes stay level
  - Tall through the crown of the head
- **Common mistakes:**
  - Tilting the head down instead of gliding back
  - Full backward head rolls (never)
- **Regression → Progression:** Against a wall for feedback → Seated with band resistance behind the head

### Wall Angel (`wallangel`)

- **Dose:** 2 × 10 · **Level:** 1 · **Equipment:** wall
- **Targets:** forward-head, upper-crossed, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Head, upper back and tailbone on the wall
  - Slide arms up only as far as contact holds
  - Ribs down — no arching off the wall
- **Common mistakes:**
  - Low back leaving the wall
  - Shrugging to reach higher
- **Regression → Progression:** Smaller range, floor angel on your back → Banded wall angel

### Dowel Hip Hinge (`hiphinge`)

- **Dose:** 3 × 8 slow · **Level:** 1 · **Equipment:** none
- **Targets:** hinge, glute-max
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Dowel (or broom handle) touches head, mid-back and tailbone — all three, always
  - Push the hips back like closing a door with your backside
  - Stop where contact breaks — that is your current range
- **Common mistakes:**
  - Rounding to reach lower (the dowel tells you)
  - Bending the knees into a squat
- **Regression → Progression:** Shorter range, wall-tap hinge → Banded pull-through 3 × 15

### QL Side Reach / Side Bend (gentle) (`qlreach`)

- **Dose:** 2 × 8 / side, gentle · **Level:** 1 · **Equipment:** none
- **Targets:** ql, lateral-endurance, lateral-gap
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Small range, smooth breathing — this is mobility, not loading
  - Gentle side-bend work for the quadratus lumborum
  - Stop if it refers pain down the leg
- **Common mistakes:**
  - Loading this move with weight (never in this program)
  - Forcing range
- **Regression → Progression:** Seated version → Standing with wall support

### Doorway Chest Stretch (`doorwaychest`)

- **Dose:** 2 × 30 sec / side · **Level:** 1 · **Equipment:** wall
- **Targets:** forward-head, upper-crossed, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Forearm on the door frame, elbow at shoulder height
  - Step through gently until the front of the chest opens
  - Chin lightly tucked, ribs down — no low-back arch
- **Common mistakes:**
  - Forcing the shoulder deep into the stretch
  - Arching the back to feel more stretch
- **Regression → Progression:** Elbow lower, smaller step through → Both arms on a corner, 45 sec holds

### Scapular Wall Slide (`wallslide`)

- **Dose:** 2 × 10 · **Level:** 1 · **Equipment:** wall
- **Targets:** forward-head, upper-crossed, posture, thoracic-mobility
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Forearms on the wall, slide up in a narrow V
  - Keep ribs down and neck long as you slide
  - Slide only as high as the forearms stay on the wall
- **Common mistakes:**
  - Shrugging to the ears
  - Low back arching off neutral
- **Regression → Progression:** Smaller slide, seated → Add a mini-band around the wrists

### Thoracic Open Book (`openbook`)

- **Dose:** 2 × 8 / side · **Level:** 1 · **Equipment:** none
- **Targets:** thoracic-mobility, forward-head, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Side-lying, knees stacked and held still — pelvis does not roll
  - Rotate only through the upper back, follow your hand with your eyes
  - Exhale as you open; lumbar spine stays quiet
- **Common mistakes:**
  - Letting the knees and pelvis roll with you (that turns it into lumbar twisting)
  - Forcing end range
- **Regression → Progression:** Smaller range, pillow under the head → Add a 5-sec hold at end range

### Standing Rectus Femoris Stretch (`rectusstretch`)

- **Dose:** 2 × 30 sec / side · **Level:** 1 · **Equipment:** chair, towel
- **Targets:** apt, hip-flexor
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Hold a chair, bend one knee and hold the ankle (or a towel loop) behind you
  - Tuck the tailbone and squeeze that glute first, then ease the knee back
  - Thighs stay side by side — no low-back arch
- **Common mistakes:**
  - Arching the back to pull the foot higher
  - Pulling the ankle hard into the buttock
- **Regression → Progression:** Towel loop, smaller range → Half-kneeling version with a pad under the knee

## Core (6)

### McGill Curl-Up (`curlup`)

- **Dose:** 3 × 8 · 8-sec holds · **Level:** 1 · **Equipment:** none
- **Targets:** core-stability, core-endurance
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Hands under the small of your back — keep the natural curve
  - Lift head, neck and shoulders as one unit, barely off the floor
  - Breathe out slowly through pursed lips on the lift
- **Common mistakes:**
  - Curling the neck to the chest
  - Flattening the low back into the floor
- **Regression → Progression:** Fewer reps, 5-sec holds → Pyramid sets 6/4/2 with 10-sec holds

### Bird-Dog (`birddog`)

- **Dose:** 3 × 8 / side · 8-sec holds · **Level:** 1 · **Equipment:** none
- **Targets:** core-stability, core-endurance, glute-max, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Opposite arm and leg, reach long — not high
  - Pelvis stays level: imagine a glass of water on your low back
  - Sweep the floor with your hand to reset each rep
- **Common mistakes:**
  - Arching the low back to lift the leg higher
  - Pelvis rotating open
- **Regression → Progression:** Leg only, or arm only → Band around the feet for resistance

### Side Plank (from knees) (`sideplank`)

- **Dose:** 3 × 20–30 sec / side · **Level:** 1 · **Equipment:** none
- **Targets:** core-stability, core-endurance, lateral-endurance, lateral-gap, ql
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Elbow under shoulder, hips stacked
  - Lift hips until the body is one straight line
  - Breathe steadily — no breath-holding
- **Common mistakes:**
  - Hips rolling forward
  - Holding to shaking failure — stop at form loss
- **Regression → Progression:** Shorter holds, more sets (10-sec exposures) → Full side plank from feet (Week 4+)

### Pallof Press (`pallof`)

- **Dose:** 3 × 10 / side · **Level:** 2 · **Equipment:** band
- **Targets:** core-stability, core-endurance, apt
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Band at chest height, stand side-on, feet shoulder width
  - Press straight out and resist the rotation — ribs down
  - Exhale on the press
- **Common mistakes:**
  - Letting the band twist the torso (that is the load winning)
  - Holding your breath
- **Regression → Progression:** Lighter band, kneeling → Half-kneeling Pallof, then split stance

### Dead Bug (band-assisted) (`deadbug`)

- **Dose:** 3 × 8 / side · **Level:** 1 · **Equipment:** band
- **Targets:** core-stability, core-endurance, apt
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Low back stays heavy on the floor — that is the whole exercise
  - Extend one leg slowly while the band holds your arms
  - Exhale fully before you move
- **Common mistakes:**
  - Low back arching off the floor as the leg drops
  - Rushing — 3 seconds out, 3 back
- **Regression → Progression:** Arms only, knees bent (toe taps) → Longer levers, slower tempo

### Supine Pelvic Tilt Drill (`pelvictilt`)

- **Dose:** 2 × 10 · 3-sec holds · **Level:** 1 · **Equipment:** none
- **Targets:** apt, core-stability
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - On your back, knees bent — gently roll the pelvis so the waistband tips up
  - Use deep abdominals and glutes, small pain-free range only
  - This teaches the posterior tilt the hip-flexor stretch needs
- **Common mistakes:**
  - Big, forceful tilting into end range
  - Holding your breath
- **Regression → Progression:** Smaller range, hands under pelvis for feedback → Progress to dead bug toe taps keeping the tilt

## Glute (7)

### Banded Clamshell (`clamshell`)

- **Dose:** 2 × 15 / side · **Level:** 1 · **Equipment:** mini-band
- **Targets:** glute-med, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Feel it deep in the buttock — that is glute med working
  - Pelvis does not roll back as the knee opens
  - Feet stay glued together
- **Common mistakes:**
  - Rolling the pelvis to fake range
  - Feeling it at the front of the hip (TFL taking over) — reduce range
- **Regression → Progression:** No band → Add a side-plank clamshell

### Banded Glute Bridge (`glutebridge`)

- **Dose:** 2 × 20 · 2-sec top hold · **Level:** 1 · **Equipment:** mini-band
- **Targets:** glute-max, glute-med, glute-weak, apt
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Push knees out into the band the whole rep
  - Ribs down, squeeze glutes to lift — never arch to finish
  - Heels drive, toes light
- **Common mistakes:**
  - Low back arching at the top
  - Hamstrings cramping (feet too far away — walk them in)
- **Regression → Progression:** No band, fewer reps → Single-leg glute bridge 3 × 12 / side

### Banded Side Steps (`sidesteps`)

- **Dose:** 2 × 12 / side · **Level:** 1 · **Equipment:** mini-band
- **Targets:** glute-med, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Soft knees, hips back slightly, toes forward
  - Stay the same height — no bouncing
  - Band stays tight every step
- **Common mistakes:**
  - Knees caving inward
  - Standing tall between steps
- **Regression → Progression:** Band above knees, smaller steps → Band at ankles, lower stance

### Single-Leg Glute Bridge (`singlebridge`)

- **Dose:** 3 × 12 / side · **Level:** 2 · **Equipment:** none
- **Targets:** glute-max, glute-weak, hamstring-control
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Pelvis stays level — no drop on the free side
  - Extra set on your weaker side, always
  - Hamstring cramp = feet closer in
- **Common mistakes:**
  - Pelvis rotating open
  - Arching to fake height
- **Regression → Progression:** Two-leg bridge with a march → Foot elevated single-leg bridge

### Side-Lying Hip Abduction (`sidelieabduction`)

- **Dose:** 2 × 12 / side · **Level:** 1 · **Equipment:** none
- **Targets:** glute-med, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Side-lying, top leg straight and slightly behind the body line
  - Lift from the deep buttock, toes pointing slightly down
  - Keep the pelvis stacked — no rolling back
- **Common mistakes:**
  - Rolling the pelvis back and using the front of the hip
  - Lifting the leg high with a trunk lean
- **Regression → Progression:** Bent-knee version, smaller range → Add a mini-band above the knees

### Banded Standing Glute Kickback (`kickback`)

- **Dose:** 2 × 12 / side · **Level:** 2 · **Equipment:** mini-band, chair
- **Targets:** glute-max, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Mini-band above the ankles, hold a chair, hinge very slightly
  - Drive the heel back a short way by squeezing the glute
  - Pelvis stays square — the low back does not arch to finish
- **Common mistakes:**
  - Kicking high and arching the low back
  - Swinging the leg with momentum
- **Regression → Progression:** No band, smaller range → Slower tempo with a 2-sec squeeze at the back

### Prone Hip Extension (glute firing) (`pronehipext`)

- **Dose:** 2 × 8 / side · **Level:** 1 · **Equipment:** none
- **Targets:** glute-max, glute-weak, hamstring-control
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Face down, forehead on hands, gentle abdominal brace first
  - Lift one straight leg a few inches by squeezing the glute first
  - Hamstring may help — low back should stay quiet
- **Common mistakes:**
  - Low back firing first or arching to lift
  - Lifting the leg high
- **Regression → Progression:** Bent-knee version, smaller lift → Add a mini-band above the knees

## Hip (7)

### 90/90 Hip Switch (`hipir9090`)

- **Dose:** 2 × 8 slow switches · **Level:** 1 · **Equipment:** none
- **Targets:** hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Both knees at 90°, rotate like windshield wipers
  - Go slow into the stiff side — that side is the point
  - Sit taller as range opens
- **Common mistakes:**
  - Forcing end range with pain
  - Leaning away to fake the rotation
- **Regression → Progression:** Hands behind you for support, smaller range → No hands, add a lift-off on the trailing leg

### Prone Hip IR Rocks (`proneir`)

- **Dose:** 2 × 10 / side · **Level:** 1 · **Equipment:** none
- **Targets:** hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Face down, knee bent 90°, let the foot drop outward slowly
  - Pelvis stays glued to the floor
  - Compare sides — note which one barely moves
- **Common mistakes:**
  - Pelvis lifting off the floor to cheat range
  - Dropping the foot fast
- **Regression → Progression:** Smaller range, pillow under hips → Add a light ankle band resistance

### Side-Lying Adductor Squeeze (`adductorsqueeze`)

- **Dose:** 2 × 10 / side · 5-sec squeeze · **Level:** 1 · **Equipment:** none
- **Targets:** hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Pillow between the knees, squeeze at 70% effort
  - Pairs with the 90/90 work — it teaches the inward rotators
  - Breathe out on the squeeze
- **Common mistakes:**
  - Max-effort squeezing (cramp risk)
  - Holding breath
- **Regression → Progression:** 3-sec squeezes → Longer holds, 8 sec

### 90/90 March (banded hip control) (`march9090`)

- **Dose:** 2 × 8 / side · **Level:** 2 · **Equipment:** mini-band
- **Targets:** hip-ir, glute-med, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Control before load
  - Band above knees, march tall, pelvis level
  - Slow — 3 seconds per step
- **Common mistakes:**
  - Trunk leaning to lift the leg
  - Speed over control
- **Regression → Progression:** No band, seated march → Standing banded march with a pause

### Seated Hip Internal Rotation (banded) (`seatedhipir`)

- **Dose:** 2 × 12 / side · **Level:** 1 · **Equipment:** mini-band, chair
- **Targets:** hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Sit tall on a chair, knee bent 90°, mini-band around the ankles or foot anchored
  - Rotate the shin outward so the hip turns inward — thigh stays still
  - Prioritise the stiff (right) side: do it first and add an extra set
- **Common mistakes:**
  - Thigh swinging or trunk leaning to fake the rotation
  - Fast, bouncy reps
- **Regression → Progression:** No band, smaller range, hands on chair → Slower tempo with a 3-sec end-range hold

### Standing Hip Internal Rotation Drill (`standinghipir`)

- **Dose:** 2 × 10 / side · **Level:** 2 · **Equipment:** band, chair
- **Targets:** hip-ir, glute-med
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Stand side-on holding a chair, band anchored low pulling the ankle outward
  - Turn the whole leg inward from the hip — toes, knee and thigh rotate together
  - Pelvis faces forward the whole rep
- **Common mistakes:**
  - Rotating the pelvis and trunk instead of the hip
  - Letting the knee cave in
- **Regression → Progression:** No band, hand on chair, smaller range → No chair support, slower tempo

### 90/90 Internal Rotation Lift-Off (`ir9090liftoff`)

- **Dose:** 2 × 6 / side · 3-sec holds · **Level:** 3 · **Equipment:** none
- **Targets:** hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - From the 90/90 position, in the trailing-leg (internal rotation) side
  - Lift the ankle off the floor using only the hip — no trunk lean
  - Tiny range is fine; this is end-range strength, not mobility
- **Common mistakes:**
  - Leaning the trunk away to lift the foot
  - Cramps or sharp hip pinch — stop and reduce range
- **Regression → Progression:** 90/90 switches only, no lift-off → Add a light ankle weight or band resistance

## Strength (10)

### Band Pull-Apart (`pullapart`)

- **Dose:** 3 × 15 · **Level:** 1 · **Equipment:** band
- **Targets:** forward-head, upper-crossed, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Arms straight, band to chest, shoulder blades pinch together
  - Ribs down — no low-back arch
  - Slow return, 2 seconds
- **Common mistakes:**
  - Shrugging to the ears
  - Bouncing the reps
- **Regression → Progression:** Lighter band, half range → Slow eccentrics, 4-sec return

### Banded Face Pull (`facepull`)

- **Dose:** 3 × 15 · **Level:** 1 · **Equipment:** band
- **Targets:** forward-head, upper-crossed, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Pull to forehead height, knuckles back, elbows high
  - Rotate the forearms out at the end — thumbs behind you
  - Neck stays long, chin slightly tucked
- **Common mistakes:**
  - Pulling to the chest (that is a row)
  - Arching the back to finish
- **Regression → Progression:** Lighter band, seated → Add a 2-sec pause at full rotation

### Banded Row (`row`)

- **Dose:** 3 × 12 · **Level:** 1 · **Equipment:** band
- **Targets:** forward-head, upper-crossed, posture
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Hinge slightly, spine neutral, pull to the lower ribs
  - Shoulder blades glide together — chest tall
  - Ribs down at the finish
- **Common mistakes:**
  - Rounding the low back to pull harder
  - Yanking with the arms only
- **Regression → Progression:** Seated row, lighter band → One-arm banded row 3 × 12 / side

### Banded Pull-Through (`pullthrough`)

- **Dose:** 3 × 15 · **Level:** 2 · **Equipment:** band
- **Targets:** glute-max, glute-weak, hinge
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Hinge pattern, glutes snap you upright
  - Ribs down at the top — squeeze, do not arch
  - Band anchored low behind you
- **Common mistakes:**
  - Squatting it instead of hinging
  - Low back finishing the rep
- **Regression → Progression:** Dowel hinge practice → Heavier band; gym swap: cable pull-through / light kettlebell deadlift 12–16 kg

### Stability-Ball Wall Squat (`wallsquat`)

- **Dose:** 3 × 12 · **Level:** 2 · **Equipment:** wall
- **Targets:** hinge, glute-max, glute-weak
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Ball or wall supports the back — squat only as deep as symptoms allow
  - Knees track over toes, heels down
  - Wall support is a feature while the pattern rebuilds
- **Common mistakes:**
  - Knees caving in
  - Deep squats through symptoms
- **Regression → Progression:** Shallower range, chair squat → Banded goblet squat to a box

### Supine Deep Neck Flexor Hold (`deepneckflexor`)

- **Dose:** 3 × 10 sec · **Level:** 1 · **Equipment:** none
- **Targets:** forward-head, upper-crossed
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Start with a small chin tuck, then lift the head barely off the floor
  - Keep the tuck the whole hold — head heavy, effort light
  - Breathe normally; stop before the front-of-neck muscles take over
- **Common mistakes:**
  - Lifting high with the big front neck muscles
  - Losing the chin tuck
- **Regression → Progression:** Chin tuck holds without the lift → Longer holds, up to 20 sec

### Suitcase Carry (`suitcasecarry`)

- **Dose:** 3 × 30 sec / side · **Level:** 2 · **Equipment:** dumbbell
- **Targets:** lateral-endurance, lateral-gap, ql, core-stability
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - One light dumbbell at your side, stand tall as if balancing a book on your head
  - Walk slowly — do not lean away from the weight
  - Ribs down, opposite side (QL and obliques) does the holding
- **Common mistakes:**
  - Leaning away from or into the weight
  - Shrugging the shoulder to the ear
- **Regression → Progression:** Lighter dumbbell, stand in place marching → Heavier dumbbell, longer walks up to 60 sec / side

### Prone Back Extension Hold (unloaded) (`proneext`)

- **Dose:** 3 × 10 sec · **Level:** 2 · **Equipment:** none
- **Targets:** back-extension
- **Safety:** spinal_load `extension` · contra `extension-intolerant` — exclude when this finding is active
- **Cues:**
  - Face down, arms at your sides, lift the chest a small way using the back muscles
  - Range stays small and pain-free — this is endurance, not height
  - Glutes lightly on, neck in line with the spine
- **Common mistakes:**
  - Lifting as high as possible
  - Leg pain or pain that travels down the leg — stop
- **Regression → Progression:** Chest supported on a pillow, smaller lift → Longer holds, up to 20 sec, or add slow arm reaches

### 90/90 Hamstring Lower (active control) (`hamstring9090`)

- **Dose:** 2 × 8 / side · **Level:** 2 · **Equipment:** none
- **Targets:** hamstring-control, sciatica-relief
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - On your back, hip and knee at 90°, hands behind the thigh
  - Slowly straighten the knee as far as control allows, then lower the whole leg a few inches
  - Keep the low back heavy on the floor — control, not stretch-chasing
- **Common mistakes:**
  - Yanking the leg straight with a towel
  - Low back arching off the floor
- **Regression → Progression:** Smaller straighten, leg lowers less → Slower 5-sec lowers

### Low Step-Up (`stepup`)

- **Dose:** 2 × 8 / side · **Level:** 2 · **Equipment:** chair
- **Targets:** glute-max, glute-weak, hinge
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Use a low step or sturdy chair seat edge height you can control
  - Whole foot on the step, drive up through the heel using the glute
  - Pelvis level, knee tracks over the toes
- **Common mistakes:**
  - Pushing off hard with the back foot
  - Knee caving inward
- **Regression → Progression:** Lower step, hand on wall or chair for balance → Higher step, slower tempo, light dumbbell in the opposite hand

## Cool-Down (3)

### Figure-4 Stretch (`figure4`)

- **Dose:** 30 sec / side · **Level:** 1 · **Equipment:** none
- **Targets:** sciatica-relief, sciatica, hip-ir
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Ankle on opposite knee, gentle lean-in
  - Feel it in the buttock, not the knee
  - Breathe and let it soften
- **Common mistakes:**
  - Forcing the knee down
  - Rounding hard to reach
- **Regression → Progression:** Seated figure-4 in a chair → Pigeon progression on the floor

### Seated QL Stretch (`qlstretch`)

- **Dose:** 2 × 30 sec / side · **Level:** 1 · **Equipment:** chair
- **Targets:** ql, lateral-endurance
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Sit tall on a chair, one hand overhead reaching gently to the opposite side
  - Keep both sit-bones down and breathe into the stretched side
  - Gentle stretch only — this is a cool-down, not a loaded side bend
- **Common mistakes:**
  - Bouncing or forcing the reach
  - Twisting the trunk while bending
- **Regression → Progression:** Smaller reach, hand on thigh for support → Standing version with wall support

### Constructive Rest Breathing (`constructiverest`)

- **Dose:** 3–5 min · **Level:** 1 · **Equipment:** none
- **Targets:** sciatica-relief, core-stability
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Lie on your back, calves resting on a chair seat, hips and knees at about 90°
  - Let the low back settle heavy into the floor
  - Slow nasal breathing — longer exhales than inhales
- **Common mistakes:**
  - Using it to avoid all movement on normal days (it is for cool-down and flares)
  - Tensing the shoulders or jaw
- **Regression → Progression:** Pillow under the head, 2 min → Add gentle pelvic tilts in this position

## Flare Relief (4)

### Single Knee-to-Chest (`kneechest`)

- **Dose:** 8 reps alternating · 20-sec holds · **Level:** 1 · **Equipment:** none
- **Targets:** sciatica-relief, sciatica
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - ONE knee at a time — never both together
  - Gentle pull, mild stretch only
  - Other foot stays planted
- **Common mistakes:**
  - Pulling both limbs in together at the same time
  - Yanking to end range
- **Regression → Progression:** Smaller pull, shorter holds → Add a slow ankle pump during the hold

### Sphinx (Prone on Elbows) (`sphinx`)

- **Dose:** 2 × 30 sec · **Level:** 1 · **Equipment:** none
- **Targets:** back-extension, sciatica-relief
- **Safety:** spinal_load `extension` · contra `extension-intolerant` — exclude when this finding is active
- **Cues:**
  - Face down on forearms, elbows under shoulders, hips and legs relaxed
  - Only use if extension eases your symptoms — stop if leg pain increases
  - Breathe slowly and let the back settle
- **Common mistakes:**
  - Pushing into pain or forcing height
  - Using it on an extension-intolerant day
- **Regression → Progression:** Prone lying flat on a pillow instead → Progress to prone press-up only if this stays symptom-free

### Prone Press-Up (`pressup`)

- **Dose:** 2 × 8 slow · **Level:** 2 · **Equipment:** none
- **Targets:** back-extension, sciatica-relief
- **Safety:** spinal_load `extension` · contra `extension-intolerant` — exclude when this finding is active
- **Cues:**
  - Face down, hands under shoulders, press the chest up while the pelvis stays on the floor
  - Only use if extension clearly eases your symptoms — never push through leg pain
  - Move slowly, partial range is fine
- **Common mistakes:**
  - Forcing full elbow lockout
  - Continuing if pain moves further down the leg
- **Regression → Progression:** Sphinx position instead → Full press-ups with 2-sec holds at the top

### Sciatic Nerve Glide (`nerveglide`)

- **Dose:** 2 × 8 / side, gentle · **Level:** 1 · **Equipment:** chair, towel
- **Targets:** sciatica-relief, sciatica, nerve-mobility
- **Safety:** spinal_load `none` · no contraindication tags
- **Cues:**
  - Sit tall or lie on your back with a towel behind the thigh, knee bent
  - Gently straighten the knee a little while pointing the toes away, then bend it as you pull the toes toward you — a slow see-saw
  - This is a glide, not a stretch: stay well short of any sharp or electric pull
- **Common mistakes:**
  - Holding a hard hamstring stretch position
  - Pushing into electric, shooting pain
- **Regression → Progression:** Smaller range, seated version → Slightly larger range, still pain-free
