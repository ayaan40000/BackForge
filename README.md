# BackForge — Assess. Correct. Rebuild.

**Live:** https://ayaan40000.github.io/BackForge/

**Latest (v2.0.1, 2026-11-02):** assessment skip-handling fix — the scorer now cleans a skipped answer to no-data before scoring (as the backend engine already did), so skipping the glute tests can no longer produce a phantom "Glutes are firing" finding. See `CHANGELOG.md`.

An assessment-led, resistance-band-first back-strength planner in a single self-contained `index.html`. No build step, no account — all data lives in the browser's localStorage and can be exported (JSON/CSV) or wiped from the Progress tab. An optional backend engine (`backend/`) mirrors the same logic server-side for sync and future clients; the app works fully without it.

## What it does

1. **13-test movement assessment** — direction tolerance (flexion vs extension), glute firing order, single-leg bridge control, clamshell compensation, Thomas test (hip flexor length), pelvic tilt check, hamstring control-vs-length, prone hip internal rotation per side, 90/90 switch, timed side-plank endurance (McGill ratio), wall posture test, weight-shift guarding check.
2. **Findings engine** — turns answers into plain-language findings with severity (Priority / Watch / Clear). Skipped tests count as *no data* and can never generate a finding.
3. **Plan generator** — rebuilds the daily foundation blocks (in-bed, posture, band activation, hip IR, tilt correction, McGill Big 3) and the weekly A/B/C + Zone 2 split *from the findings*: extension-intolerant backs lose prone lying and press-ups automatically; the weaker side gets extra sets; a hip IR deficit adds a daily IR block; anterior pelvic tilt adds a tilt-correction block.
4. **Daily check-in → load tuning** — pain (0–10), location and sleep set today's load: full, minus top set, micro-only, or flare protocol at pain ≥ 7.
5. **Guided player** — sessions expand into set × side steps with parsed hold timers (timestamp-based, audible beep, wake lock), auto rest between exercises, resume-where-you-left-off, and an in-player pain score at the end.
6. **Library** — 26 band-first exercises in the app with cues, common mistakes, a regression and a progression for each, per-exercise band levels, and form-video links from multiple sources (Squat University, BackFitPro/McGill, E3 Rehab, Low Back Ability, Christina Nicci, Bob & Brad). One verified embed: Squat University's McGill Big 3 walkthrough. The canonical directory (`backend/data/exercises.json`, browsable in `docs/EXERCISE-DIRECTORY.md`) now holds 48 exercises, and the backend engine serves all 48.
7. **Progress** — pain trend on a fixed 0–10 scale, sessions/week, assessment history, and a rolling 14-day progression gate (avg pain ≤ 3 **and** 8+ sessions) that unlocks band-level promotions.
8. **In-app daily reminder** — set a time under *More → Daily reminder*; replaces the chat check-in from deploy day.

## Live Mode (v2.0)

The **Live** tab is a workout partner built for zero-decision starts:

- **Three taps build the workout** — time on hand (5/10/20/35/50 min), body feel, and caveats (standing hurts, a touchy side, sore knees, no bands, quiet) produce a full session: warm-up → main work → cool-down. Flare days get the relief protocol only.
- **Defaults that update themselves** — the builder re-derives the default session from assessment findings, per-exercise logged history, today's check-in and the weekly slot, and prints a "Why this workout?" receipt for every build.
- **Partner player** — coach cue on every step, hold timers, auto-rests, one-tap Regress and guilt-free Skip, resume after interruption, and a celebration finish (specific praise + a real-person quote + one-tap pain score).
- **Habit system** — week-chain dots, milestone badges, daily attributed motivational quotes (Clear, Twain, Bruce Lee, Aurelius, Lombardi, Ali…) and rotating coach notes on proven anti-procrastination mechanics (2-minute rule, never-miss-twice, temptation bundling, identity votes). Micro counts, always.

## Safety invariants (do not break — see CLAUDE-REVIEW.md)

- No loaded spinal flexion, no loaded twisting, never both knees to chest at once.
- Press-ups / prone lying are removed for extension-intolerant patterns.
- Modify-don't-stop: every exercise ships a regression; swaps apply to today's session.
- Red-flag stop rules lead the assessment; the app screens patterns, it does not diagnose.

## Backend engine & exercise directory

- **BackForge Engine (`backend/`)** — Python (FastAPI + SQLite) port of the app's assessment, plan, Live-builder, and progression logic, with the user profile kept server-side. Endpoints: exercises (filtered, profile-aware), assess, plan, live workout, check-in/session logging, progress with gate-enforced band promotion, and `backforge_v1` state import/export so the app can sync later. Run instructions: `backend/README.md`.
- **Safety as tests** — the invariants below are enforced by a server-side safety layer and 78 automated tests: no loaded flexion/twisting is ever served, both-knees-to-chest never appears, extension-intolerant profiles lose all extension-biased moves, pain ≥ 7 returns relief work only, and skipped assessment answers produce no findings.
- **Exercise directory** — 48 band-first exercises with dose, level, equipment, cues, mistakes, regression/progression, and safety tags (`backend/data/exercises.json`; human-readable: `docs/EXERCISE-DIRECTORY.md`).

## Roadmap

Full roadmap to v5.0: **[docs/ROADMAP.md](docs/ROADMAP.md)** — v2.0 Live Mode (shipped) → v2.5 Coach's memory → v3.0 Connected body (Health Connect) → v3.5 Eyes on form → v4.0 Clinic edition → v4.5 Circles → v5.0 Platform. The *More* tab carries the summary cards. Version history: [CHANGELOG.md](CHANGELOG.md).

## Tech

Single file, vanilla HTML/CSS/JS (~119 KB). Backend (optional): Python 3 + FastAPI + SQLite in `backend/` (pytest, 78 tests passing). State key `backforge_v1` in localStorage (v2.0 adds `livePrefs`, `exLog`, `livePlayer` — old saves upgrade in place). Fonts: Space Grotesk + Inter (graceful system-font fallback offline). Installable: theme color, icon, runtime-generated web manifest.
