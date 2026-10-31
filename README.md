# BackForge — Assess. Correct. Rebuild.

**Live:** https://ayaan40000.github.io/Reserved-2/ (enable Pages once: Settings → Pages → Deploy from branch `main`, folder `/ (root)`)

An assessment-led, resistance-band-first back-strength planner in a single self-contained `index.html`. No build step, no backend, no account — all data lives in the browser's localStorage and can be exported (JSON/CSV) or wiped from the Progress tab.

## What it does

1. **13-test movement assessment** — direction tolerance (flexion vs extension), glute firing order, single-leg bridge control, clamshell compensation, Thomas test (hip flexor length), pelvic tilt check, hamstring control-vs-length, prone hip internal rotation per side, 90/90 switch, timed side-plank endurance (McGill ratio), wall posture test, weight-shift guarding check.
2. **Findings engine** — turns answers into plain-language findings with severity (Priority / Watch / Clear). Skipped tests count as *no data* and can never generate a finding.
3. **Plan generator** — rebuilds the daily foundation blocks (in-bed, posture, band activation, hip IR, tilt correction, McGill Big 3) and the weekly A/B/C + Zone 2 split *from the findings*: extension-intolerant backs lose prone lying and press-ups automatically; the weaker side gets extra sets; a hip IR deficit adds a daily IR block; anterior pelvic tilt adds a tilt-correction block.
4. **Daily check-in → load tuning** — pain (0–10), location and sleep set today's load: full, minus top set, micro-only, or flare protocol at pain ≥ 7.
5. **Guided player** — sessions expand into set × side steps with parsed hold timers (timestamp-based, audible beep, wake lock), auto rest between exercises, resume-where-you-left-off, and an in-player pain score at the end.
6. **Library** — 26 band-first exercises with cues, common mistakes, a regression and a progression for each, per-exercise band levels, and form-video links from multiple sources (Squat University, BackFitPro/McGill, E3 Rehab, Low Back Ability, Christina Nicci, Bob & Brad). One verified embed: Squat University's McGill Big 3 walkthrough.
7. **Progress** — pain trend on a fixed 0–10 scale, sessions/week, assessment history, and a rolling 14-day progression gate (avg pain ≤ 3 **and** 8+ sessions) that unlocks band-level promotions.
8. **In-app daily reminder** — set a time under *More → Daily reminder*; replaces the chat check-in from deploy day.

## Safety invariants (do not break — see CLAUDE-REVIEW.md)

- No loaded spinal flexion, no loaded twisting, never both knees to chest at once.
- Press-ups / prone lying are removed for extension-intolerant patterns.
- Modify-don't-stop: every exercise ships a regression; swaps apply to today's session.
- Red-flag stop rules lead the assessment; the app screens patterns, it does not diagnose.

## Roadmap (designed in, under *More*)

- **Phase 2:** Macro & protein counting (photo-first log, protein floor); health sync via Muse (Google Fit / Samsung Health → Health Connect → recovery score + charts).
- **Phase 3:** AI form check (phone camera); physio/coach read-only share link.
- **Phase 4:** Opt-in community streaks.

## Tech

Single file, vanilla HTML/CSS/JS (~89 KB). State key `backforge_v1` in localStorage. Fonts: Space Grotesk + Inter (graceful system-font fallback offline). Installable: theme color, icon, runtime-generated web manifest.
