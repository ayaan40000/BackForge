# BackForge — Assess. Correct. Rebuild.

**Live:** https://ayaan40000.github.io/BackForge/ · **Demo with 120 days of data:** https://ayaan40000.github.io/BackForge/?demo=1 · **Classic v4.0 app:** `/classic/`

**Latest (v4.8, 2026-11-23):** the classic app has retired (PIN, encrypted vault and erase-everything moved into the app). The coach has a natural, pre-recorded neural voice (Kokoro, open source). Plans use only the equipment you tick, and use all of it. 68 new exercises came from a physiotherapy syllabus pass: advanced and door-anchored band work, stretching, desk moves, and hip internal-rotation work for duck feet. There are two new hip tests, a Desk section with break reminders and a calendar export, a Learn tutorial, stop-motion photo demos plus video links for every move, and a new icon.

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
| **Desk** (`#/desk`) | Sitting/slouching problems with one-tap fixes, 1–2 min coached breaks, a setup checklist, work-hours reminders and a calendar export |
| **Learn** (`#/learn`) | Nine short lessons; every screen's ? opens its lesson |
| **You** | Name, equipment on hand, coach voice, theme, privacy & data (PIN, encrypted vault, erase), demo data, backup |

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
npm test               # 47 tests: safety for every Live build, duration fit, coach timing and wording rules, data files, health import (no installs)
npm run test:browser   # 74 real-browser checks at phone / tablet / desktop (needs Playwright; serve the repo on :8765 first)
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

## Voice pack (natural coach voice)

`app/voice/` holds one clip per sentence the coach can say, plus `manifest.json` (text → file and length), in switchable packs listed in `app/voice/index.json`. The default is `coach_nova/` ("Nova", an energetic female trainer voice; MP3 clips rendered with a neural text-to-speech engine to the spec in `docs/VOICE-PACK-FOR-MUSE.md`, loudness-matched at −16 LUFS). The original pack, `af_heart/`, holds AAC clips rendered on a computer with Kokoro-82M (Apache-2.0) via `kokoro-onnx`; see the header of `tools/render_voice.py`. Rebuild the Kokoro pack after changing voice lines, exercise names or cues: `node tools/voice_corpus.mjs > /tmp/corpus.json`, then run `render_voice.py`. It only renders new sentences. A line without a recording falls back to the device voice for safety and brief lines, and to captions only for small talk.

## Roadmap

**[docs/ROADMAP.md](docs/ROADMAP.md)** — v4.5 Live Studio (shipping) → v4.7 The coach sees and hears (on-device form tracking, hands-free voice, live heart rate, classic retired) → v5.0 The platform (encrypted sync across devices, clinician mode, periodisation, open schema, published outcomes).
