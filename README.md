# BackForge — Assess. Correct. Rebuild.

**Live:** https://ayaan40000.github.io/BackForge/ · **Demo with 120 days of data:** https://ayaan40000.github.io/BackForge/?demo=1 · **Classic v4.0 app:** `/classic/`

**v4.6.1 (2026-11-23): physio-reviewed scoring.** A physiotherapist review (`docs/reviews/PHYSIO-REVIEW-2026-11.md`) recalibrated the tests, made the extension-intolerant flag stay on after a single good retest, added leg-spread, arm-symptom and dizziness stops, and added a hips & glutes area to the plan.

**v4.6 "Assess & Correct":** the movement assessment, a posture check (8 band + 5 bodyweight tests) and a photo check read by Muse are now part of the new app. Their grades build a phased posture plan for forward head, a hunched upper back, rounded shoulders and anterior pelvic tilt, and the voice coach runs it as a Live session. Each corrective move ends with a quick form rating.

**v4.5 "Live Studio":** a rebuilt app with a liquid-glass UI that works on phone, tablet and desktop, and a **real-time, voice-coached Live mode**. Pick a length (5–60 min) and press Start. BackForge builds the session second by second (warm-up, main work, cool-down, sets, sides, rests) and a voice coach runs it the way a personal trainer would. Demo mode shows the app full of data, including Google Fit and Samsung Health. See `CHANGELOG.md`; the plan to v5.0 is in `docs/ROADMAP.md`.

An assessment-led, resistance-band-first back-strength trainer. No account, no server, no build step: everything lives on your device.

## The app (v4.5)

| Place | What you do there |
|---|---|
| **Today** | Readiness ring with its reasons · one-tap pain check-in · today's session with one **Start** · posture cues · health strip (steps, sleep stages, resting HR, HRV, Zone 2, weight) · your week |
| **Live** | Three pre-filled choices (length, energy, adjustments) → a preview of the timeline → **Start** → the full-screen player |
| **Moves** | 56 exercises, search and filters, a detail sheet with the exact setup and focus cues the coach speaks, easier/harder versions, videos, "Preview voice" |
| **Progress** | Overview (pain trend, 17-week consistency map, sessions per week, progression gate, insights, what the coach learned) · Health · Body · Posture |
| **Check-ups** (`#/checkup`) | Movement assessment (13 tests) · posture check (8 band + 5 bodyweight tests, graded per area) · your posture plan (phase per weak area, Start posture session) · photo check with Muse (consistency with your tests, then vs now) |
| **You** | Name, coach voice and chattiness, theme, reduce motion, solid surfaces, demo data, backup |

### Live mode — how a session runs
1. `app/js/engine/live.js` picks the moves (from your findings, today's check-in, caveats and response history), with the same rules as before. It is re-checked by the safety layer on every build.
2. `app/js/live/compiler.js` turns them into a timeline: intro, then per move a brief, work (per side), switch and rest, then the outro. It fits your minutes by flexing rests, then whole sets. Holds and reps are never shortened.
3. `app/js/live/coach.js` schedules what the coach says and when: a brief before the move (name and dose, one setup cue, one focus cue), a countdown, 1.5 s of quiet after "go", a form cue at about ⅓, encouragement at about ⅔, "two more" / "last five", specific praise and breathing in rests, a pain check after the first set of each main move, and a preview of the next move. Nothing is spoken in the last 3.2 s of any segment (that's the 3-2-1). Lines that don't fit are dropped, never delayed.
4. `app/js/live/player.js` keeps time with the wall clock, so a dimmed screen, a phone call or a throttled tab never drifts it. Voice comes from the Web Speech API (on-device voices), tones from Web Audio. Headphone and lock-screen control uses Media Session, and Wake Lock keeps the screen on.
5. In the player: Back / Play-Pause / Skip, **Easier** (switches to the regression for the rest of that move), **+15 s** rest, Voice, Music, and an always-visible **Pain** button (sharp or leg pain stops the move; red-flag symptoms stop the session with urgent-care copy). Desktop keys: Space, ← →, E, R, V, P, Esc.

### Demo data
**You → Data → Preview with demo data** (or `?demo=1`) loads `data/demo/demo-state.json`: 120 days of check-ins, sessions, assessments and Health Connect data (Google Fit / Samsung Health / Galaxy Watch). It covers steps, sleep stages, resting HR, HRV, SpO₂, VO₂ max, weight, body fat, calories and workouts. It is stored under its own key (`backforge_demo`) and your data is never touched. Regenerate it with `node tools/make_demo_data.mjs`.

## Architecture

- **No build step.** Native ES modules, Preact + htm vendored in `app/vendor/`, modern CSS (oklch tokens, `@layer`, nesting, container queries, View Transitions, `@starting-style`, scroll-driven animations, `backdrop-filter` glass). Installable PWA (`manifest.webmanifest`, `sw.js`, offline fonts).
- **One state object.** Both apps read and write the same `backforge_v1` localStorage object. The new app writes it back whole, so classic-only fields (posture, vault, PIN) survive.
- **Content is data.** `backend/data/exercises.json` + `data/exercises-desk.json` (the library), `data/coaching.json` (spoken cues, "you've got it" markers, videos), `data/voice-lines.json` (everything the coach says).
- **Design authority:** `docs/DESIGN-PROTOCOL.md`. **Maintenance guide (Muse and any AI):** `AGENTS.md`.

## Tests

```bash
npm test               # 39 tests: safety for every Live build, duration fit, coach timing and wording rules, data files, health import (no installs)
node dev/parity-assessment.mjs   # 18,000 cases: graders the physio review left unchanged == classic
npm run test:browser   # 56 real-browser checks at phone / tablet / desktop (needs Playwright; serve the repo on :8765 first)
npm run test:classic   # classic app harnesses (113 + 50)
cd backend && python3 -m pytest -q   # 81 backend tests
```

## Safety invariants (do not break — see CLAUDE-REVIEW.md)

- No loaded spinal flexion, no loaded twisting, never both knees to chest at once.
- Press-ups / prone lying are removed for extension-intolerant patterns.
- Modify-don't-stop: every exercise ships a regression; swaps apply to today's session.
- Red-flag stop rules lead the assessment; the app screens patterns, it does not diagnose.

## Health sync (v3.0) — how a sync actually runs

BackForge has no account and no server, so health data arrives the way the roadmap specified: **Muse is the bridge.**

1. Ask Muse (in chat) to run a BackForge health sync. Muse runs `tools/health_sync.py`, which reads Health Connect through Muse's connector (Galaxy Watch + phone: Google Fit and Samsung Health both land there) and writes one small file, `backforge-health-sync.json` — per-day steps, Zone 2 minutes, sleep duration/deep minutes, and scale weigh-ins for the last 28 days.
2. Muse sends you that file. In BackForge: **Progress → Health sync — via Muse → Import sync file** (or paste the JSON). Days merge by date; re-importing a newer file just refreshes the overlap.
3. Synced data feeds the morning readiness score (last night's sleep, yesterday's steps), the progression gate (recovery criteria), and the weight trend. It is **read-only** — importing never touches your check-ins, session log or plan. **Pause sync** makes every consumer ignore the data without deleting it; **Delete synced data** wipes it, and only it.

Honest limits, by design:

- **Zone 2 minutes** count logged workout sessions whose average heart rate falls in your Zone 2 band (60–70% of estimated HRmax, 220 − age; the band and method are recorded inside every payload). The connector does not expose raw heart-rate samples, so unlogged walks and cardio are *not* counted — the number is a floor, not a total.
- **Weight** comes from scale weigh-ins synced to Health Connect. They are sparse (the scale syncs when it syncs) — the trend works with whatever weigh-ins exist and says so.
- **Waist** is manual (Progress → Weight & waist vs pain): Health Connect carries no waist entries, so the app takes one number a week from you instead of pretending.
- **Desk-day defense** (Live tab): the app cannot read your phone's sedentary alerts. It infers a desk day from synced steps — a weekday under 3,000 steps — or you declare one, and offers a five-minute standing/posture block as a Live session variant. Flare days get the relief protocol instead.
- **Recovery gate rule:** synced data can only *hold* a promotion on clear evidence — at least 7 synced days in the 14-day window plus a clearly failing signal (step average under 4,000/day, or zero logged Zone 2 minutes). Missing data never blocks a promotion the pain trend earned.

**v4.5 sync format (v3):** the importer (Progress → Health → Import sync file) also accepts `restingHr`, `hrvMs`, `sleepRemMin`, `sleepLightMin`, `sleepAwakeMin`, `spo2`, `vo2max`, `bodyFatPct`, `activeKcal`, `distanceKm` and `workouts[{type, min, avgHr}]`. Every field is range-checked and nothing is zero-filled. See `AGENTS.md` §4.

## Backend engine & exercise directory

- **BackForge Engine (`backend/`)** — Python (FastAPI + SQLite) port of the app's assessment, plan, Live-builder, and progression logic, with the user profile kept server-side. Endpoints: exercises (filtered, profile-aware), assess, plan, live workout, check-in/session logging, progress with gate-enforced band promotion, and `backforge_v1` state import/export so the app can sync later. Run instructions: `backend/README.md`.
- **Safety as tests** — the invariants below are enforced by a server-side safety layer and 78 automated tests: no loaded flexion/twisting is ever served, both-knees-to-chest never appears, extension-intolerant profiles lose all extension-biased moves, pain ≥ 7 returns relief work only, and skipped assessment answers produce no findings.
- **Exercise directory** — 48 band-first exercises with dose, level, equipment, cues, mistakes, regression/progression, and safety tags (`backend/data/exercises.json`; human-readable: `docs/EXERCISE-DIRECTORY.md`).

## Classic app (v4.0) — still available at `/classic/`

Since v4.6 the assessments, posture check and photo check live in the new app. The classic app still hosts the encrypted photo vault and PIN setup, and both apps share the same data. The new app links to them under **You → Check-ups**, and the classic app has a "← New BackForge" link back. What the classic app does:

1. **13-test movement assessment** — direction tolerance (flexion vs extension), glute firing order, single-leg bridge control, clamshell compensation, Thomas test (hip flexor length), pelvic tilt check, hamstring control-vs-length, prone hip internal rotation per side, 90/90 switch, timed side-plank endurance (McGill ratio), wall posture test, weight-shift guarding check.
2. **Findings engine** — turns answers into plain-language findings with severity (Priority / Watch / Clear). Skipped tests count as *no data* and can never generate a finding.
3. **Plan generator** — rebuilds the daily foundation blocks (in-bed, posture, band activation, hip IR, tilt correction, McGill Big 3) and the weekly A/B/C + Zone 2 split *from the findings*: extension-intolerant backs lose prone lying and press-ups automatically; the weaker side gets extra sets; a hip IR deficit adds a daily IR block; anterior pelvic tilt adds a tilt-correction block.
4. **Daily check-in → load tuning** — pain (0–10), location and sleep set today's load: full, minus top set, micro-only, or flare protocol at pain ≥ 7.
5. **Guided player** — sessions expand into set × side steps with parsed hold timers (timestamp-based, audible beep, wake lock), auto rest between exercises, resume-where-you-left-off, and an in-player pain score at the end.
6. **Library (Moves)** — 40 exercises in the app (26 originals + the backend directory's breathing/tilt/neck/wall-slide/doorway/seated-IR set + 8 no-equipment desk & travel moves) with cues, common mistakes, a regression and a progression for each, per-exercise band levels, and form-video links from multiple sources (Squat University, BackFitPro/McGill, E3 Rehab, Low Back Ability, Christina Nicci, Bob & Brad). One verified embed: Squat University's McGill Big 3 walkthrough. The canonical directory (`backend/data/exercises.json`, browsable in `docs/EXERCISE-DIRECTORY.md`) now holds 48 exercises, and the backend engine serves all 48.
7. **Progress** — pain trend on a fixed 0–10 scale, sessions/week, assessment history, and a rolling 14-day progression gate (avg pain ≤ 3 **and** 8+ sessions) that unlocks band-level promotions. Since v3.0 the gate also reads synced recovery data — see below.
8. **In-app daily reminder** — set a time under *More → Daily reminder*; replaces the chat check-in from deploy day.

## Roadmap

**[docs/ROADMAP.md](docs/ROADMAP.md)** — v4.5 Live Studio (shipping) → v4.7 The coach sees and hears (on-device form tracking, hands-free voice, live heart rate, classic retired) → v5.0 The platform (encrypted sync across devices, clinician mode, periodisation, open schema, published outcomes).
