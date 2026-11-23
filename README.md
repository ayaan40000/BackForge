# BackForge — Assess. Correct. Rebuild.

**Live:** https://ayaan40000.github.io/BackForge/

**Latest (v4.0, 2026-11-22):** The Clinic Edition — a full app-shell overhaul (5 tabs: Home / Train / Posture / Moves / Progress, Profile behind the header avatar, segmented panels, per-tab scroll restore), daily posture cues for anterior pelvic tilt and forward-head/rounded shoulders, an 8-test band-graded posture assessment whose grades rewrite the plan, a 40-exercise database with "you've got it" markers and click-to-play videos, a photo posture check via the Muse bridge with an AES-256-GCM encrypted vault for GitHub backup, a local PIN gate, and a pain-guarded calorie + weight-loss body plan fed by Sync-with-Muse v2. Built under a three-round adversarial review (5.4 → 5.8 → 6.4 / 10); the remaining path to 8/10 is documented in `docs/ROADMAP.md`. See `CHANGELOG.md`.

An assessment-led, resistance-band-first back-strength planner in a single self-contained `index.html`. No build step, no account — all data lives in the browser's localStorage and can be exported (JSON/CSV) or wiped from the Progress tab. An optional backend engine (`backend/`) mirrors the same logic server-side for sync and future clients; the app works fully without it.

## What it does

1. **13-test movement assessment** — direction tolerance (flexion vs extension), glute firing order, single-leg bridge control, clamshell compensation, Thomas test (hip flexor length), pelvic tilt check, hamstring control-vs-length, prone hip internal rotation per side, 90/90 switch, timed side-plank endurance (McGill ratio), wall posture test, weight-shift guarding check.
2. **Findings engine** — turns answers into plain-language findings with severity (Priority / Watch / Clear). Skipped tests count as *no data* and can never generate a finding.
3. **Plan generator** — rebuilds the daily foundation blocks (in-bed, posture, band activation, hip IR, tilt correction, McGill Big 3) and the weekly A/B/C + Zone 2 split *from the findings*: extension-intolerant backs lose prone lying and press-ups automatically; the weaker side gets extra sets; a hip IR deficit adds a daily IR block; anterior pelvic tilt adds a tilt-correction block.
4. **Daily check-in → load tuning** — pain (0–10), location and sleep set today's load: full, minus top set, micro-only, or flare protocol at pain ≥ 7.
5. **Guided player** — sessions expand into set × side steps with parsed hold timers (timestamp-based, audible beep, wake lock), auto rest between exercises, resume-where-you-left-off, and an in-player pain score at the end.
6. **Library (Moves)** — 40 exercises in the app (26 originals + the backend directory's breathing/tilt/neck/wall-slide/doorway/seated-IR set + 8 no-equipment desk & travel moves) with cues, common mistakes, a regression and a progression for each, per-exercise band levels, and form-video links from multiple sources (Squat University, BackFitPro/McGill, E3 Rehab, Low Back Ability, Christina Nicci, Bob & Brad). One verified embed: Squat University's McGill Big 3 walkthrough. The canonical directory (`backend/data/exercises.json`, browsable in `docs/EXERCISE-DIRECTORY.md`) now holds 48 exercises, and the backend engine serves all 48.
7. **Progress** — pain trend on a fixed 0–10 scale, sessions/week, assessment history, and a rolling 14-day progression gate (avg pain ≤ 3 **and** 8+ sessions) that unlocks band-level promotions. Since v3.0 the gate also reads synced recovery data — see below.
8. **In-app daily reminder** — set a time under *More → Daily reminder*; replaces the chat check-in from deploy day.

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

## Data architecture (v3.0)

- State schema is versioned (`schema: 3` since v4.0; was 2 in v3.0) inside the unchanged `backforge_v1` localStorage envelope. Migrations are additive and lossless, and v4 additionally repairs partial/corrupt v4 subfields on every load instead of crashing — every v1/v2.5 field carries over; the pre-migration state is kept on the device under `backforge_v1_premigration` as a rollback copy. Verified by a seeded-v2.5-payload test in `dev/harness-v3.mjs`.
- **Weekly backup ritual** (Progress → Your data is yours): name where backups live (a Drive folder, an email to yourself, a USB stick), then one tap exports a dated full-state JSON. The export refuses to run until the destination is named — data never leaves the device without a named destination. Still local-first: nothing is uploaded by the app, ever.

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

Full roadmap to v5.0: **[docs/ROADMAP.md](docs/ROADMAP.md)** — v2.0 Live Mode (shipped) → v2.5 Coach's memory (shipped) → v3.0 Connected body (shipped) → v3.5 Eyes on form → v4.0 Clinic edition → v4.5 Circles → v5.0 Platform. The *More* tab carries the summary cards. Version history: [CHANGELOG.md](CHANGELOG.md).

## Tech

Single file, vanilla HTML/CSS/JS (~139 KB). Backend (optional): Python 3 + FastAPI + SQLite in `backend/` (pytest, 81 tests passing — the state round-trip now also preserves the v2.5 and v3.0 fields instead of dropping them). State key `backforge_v1` in localStorage, data schema v2 (v2.0 adds `livePrefs`, `exLog`, `livePlayer`; v2.5 adds `protein`, `bodyweightKg`, `deloadUntil`; v3.0 adds `health`, `waist`, `backup` — old saves migrate in place, losslessly). Sync generator: `tools/health_sync.py` (stdlib-only Python, run by Muse against the Health Connect connector). Fonts: Space Grotesk + Inter (graceful system-font fallback offline). Installable: theme color, icon, runtime-generated web manifest.
