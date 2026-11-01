# Changelog

All notable changes to BackForge. Versions follow the roadmap in `docs/ROADMAP.md`.

## Backend engine + exercise directory (2026-11-01)

- **BackForge Engine v0.1 (`backend/`).** FastAPI + SQLite port of the frontend's assessment scoring (all 13 tests, same finding wording and severities), plan generator, Live workout builder, and rolling 14-day progression gate. Endpoints: `/health`, `/exercises` (filtered, profile-aware), `/profile`, `/assess`, `/plan`, `/workout/live`, `/log/checkin`, `/log/session`, `/progress`, `/progress/promote` (gate-enforced — 409 until the gate is ready), `/state/export`, `/state/import` (round-trips the app's `backforge_v1` shape).
- **Safety invariants as tests — 78 passing.** Trap exercises (Jefferson curl, Russian twist, banded crunch) are never served; both-knees-to-chest never appears for any profile; extension-intolerant profiles exclude press-ups, sphinx, and prone extension (contra tags plus a spinal-load fallback rule); pain ≥ 7 yields relief-only plans and Live builds; gate boundaries tested (average pain exactly 3.0 passes; day-20 activity falls out of the window); skipped answers produce zero findings.
- **One frontend bug deliberately not ported:** in the app, a skipped glute test can read as "firing" (the string `skip` is truthy in JS). The engine cleans skips to no-data before scoring, per the skip = no data invariant.
- **Exercise directory: 26 → 48 exercises** (`backend/data/exercises.json`; human-readable `docs/EXERCISE-DIRECTORY.md`). New coverage: hip internal rotation (seated and standing banded IR, 90/90 lift-off), QL (suitcase carry, seated QL stretch), prone hip-extension firing drill, sciatic nerve glide, deep neck flexor holds, 360° breathing and brace. Validated: 0 loaded-flexion and 0 loaded-rotation entries; the only 3 extension-biased entries all carry the extension-intolerant exclusion tag.

## v2.0 — Live Mode (2026-11-01)

- **Live workout partner (new Live tab).** Three taps — time on hand (5/10/20/35/50 min), body feel (great / okay / low energy / pain flare), and caveats (standing hurts, right/left side touchy, knees sore, no bands, quiet) — build a complete session: warm-up, main work, cool-down. One start button; no other decisions.
- **Self-updating defaults.** The default workout re-derives after every logged session and assessment from: assessment findings + severity, per-exercise logged history (new `S.exLog` — the guided player now records it too), today's pain/sleep check-in, and the A/B/C + Zone 2 weekly slot. A "Why this workout?" receipt explains every build in plain language.
- **Partner player.** Set × side steps with a coach cue on every step, hold timers, 45s auto-rests, progress bar, one-tap **Regress** (modify, don't stop), guilt-free **Skip** (skip = no data), resume after interruption (persisted in `S.livePlayer`), and a celebration finish: specific praise, a real-person quote, streak impact, and a one-tap pain score that feeds the progression gates.
- **Flare safety.** Flare energy (or a pain ≥ 7 check-in) runs the relief protocol only — Live Mode cannot build a strength session on a flare day.
- **Motivation system.** Daily rotating quotes from real, attributed people (James Clear, Mark Twain, Bruce Lee, Marcus Aurelius, Vince Lombardi, Muhammad Ali, Jim Rohn, Seneca, Confucius, Lao Tzu, Nietzsche, Henry Ford, Arnold Schwarzenegger, Jocko Willink, Karen Lamb, Jim Ryun, Will Durant on Aristotle); rotating coach notes on proven anti-procrastination mechanics (2-minute rule, don't-break-the-chain, implementation intentions, temptation bundling, future-self continuity, self-compassion research, identity voting).
- **Habit tracking.** Week dots (Mon–Sun chain view), milestone badges (first session, first Live workout, 3-day chain, week unbroken, 10/25/50 sessions, 14-day streak, gate opened) with a "next badge" target, and a done-today state that reframes extra work as bonus.
- Today view: a "already in the bank" encouragement line once today is logged.
- In-app roadmap cards rewritten to the version roadmap (v2.0 → v5.0). Full roadmap: `docs/ROADMAP.md`.
- Tested: JS syntax on all script blocks; jsdom functional suite in seeded (assessment + history) and fresh states — builder sections/budgets/caveats/flare, strength-day and rest-day paths, full player flow to logged session, regress path. All green.

## v1.0 — Clinical core (2026-10-30/31)

- 13-test movement assessment; findings engine (skip = no data); findings-driven plan generator (daily foundation blocks + A/B/C + Zone 2 week); daily check-in load tuning with flare protocol at pain ≥ 7; guided player with set × side expansion, hold timers, wake lock, resume; 26-exercise band-first library with multi-source videos; Progress with fixed 0–10 pain chart and the rolling 14-day progression gate; in-app daily reminder; single-file PWA on GitHub Pages.
- Safety invariants established: no loaded spinal flexion/twisting, never both knees to chest, press-ups/prone removed for extension-intolerant patterns, modify-don't-stop.
