# CLAUDE-REVIEW.md — BackForge handoff for Claude

**For:** Claude (review + future development partner, per Ayaan's shared agent protocol)
**From:** Muse (builder), 2026-10-30
**Repo:** `ayaan40000/Reserved-2` · **App:** `index.html` (single file, ~89 KB, no build step)
**Live (after Ayaan enables Pages):** https://ayaan40000.github.io/Reserved-2/

## 1. What this is

BackForge is Ayaan's self-sustainable exercise planner: resistance-band-focused back strength, built around **his** existing regimen (the Claude-built program in his Back exercise regimen goal: daily morning blocks + McGill Big 3, Strength A/B/C, Zone 2 cardio, 7k steps) and generalized into a product-grade front end:

**Assess → findings → generated plan → daily check-in tunes load → guided player → pain-gated progression.**

Differentiator vs Fitbod/Hevy/Strong: those apps generate from equipment/recovery or just log. BackForge generates from a **clinical-style movement assessment** and shows its work — every finding carries an "In your plan: …" line stating exactly what changed. That traceability is the moat; protect it in any refactor.

## 2. Review checklist (what Ayaan wants your eyes on)

- [ ] **Assessment logic** — read `scoreAssessment()` against §4 below. Are thresholds sane (glute = ≥2 of 3 tests per side; side-plank gap = >10% per McGill; IR compared per side)? Any flag that can fire from partial/skipped data is a bug — this was expert-review issue #3 and is fixed; keep it fixed.
- [ ] **Safety invariants** (§5) — confirm no code path can reintroduce a banned movement.
- [ ] **Plan personalization** — `buildFoundation()` adds/removes blocks purely from findings in `S.results`. Check the extension-intolerant path end to end.
- [ ] **Player dose parsing** — `parseDose()`/`expandSteps()` turn dose strings ("3 × 8 / side · 8-sec holds") into set × side steps. Fragile by nature; if you change dose strings in `EX`, re-check parsing.
- [ ] **Copy neutrality** — test instructions must stay population-level ("a common finding is…"); personalization belongs in *results*, never in test prompts (expert-review issue #16).
- [ ] **Data model** (§6) — any new persisted field needs a default in `load()`'s merge-over-defaults, or old installs crash.

## 3. Architecture

Vanilla HTML/CSS/JS in one file, three `<script>` blocks:

1. **Data + state** — `EX` (26 exercises), `TESTS` (13 assessment tests), `ROADMAP`, `REFS`, localStorage state `S` (key `backforge_v1`).
2. **Engine** — `scoreAssessment()` (answers → findings), `buildFoundation()`, `STRENGTH` A/B/C, `weekPlan()`, `recoveryTune()`, `flareActive()`.
3. **UI** — nav, Today render, check-in, assessment UI, library + modal, guided player (timestamp timers, WebAudio beep, Wake Lock, resume persisted in `S.player`), progress charts (canvas, DPR-scaled), export/wipe, reminder loop, runtime-generated PWA manifest.

Dates: **all local** via `todayStr()` (expert-review blocker #1 was UTC dates — evening users logged into tomorrow; do not regress to `toISOString()`).

## 4. Assessment → finding map

| Input | Finding (severity) | Plan effect |
|---|---|---|
| Extension worse, flexion not | Extension-intolerant (Priority) | Prone lying + press-ups removed; ribs-down cues |
| Flexion worse, extension not | Flexion-intolerant (Priority) | Hinge range capped; modified curl-up only |
| ≥2 of {firing, bridge, clamshell} compensating per side | Glute inhibition, side-named (Priority) | Daily activation; weaker side doubled |
| Thomas lifted / pelvis = APT | Anterior pelvic tilt, lower-crossed (Priority) | Tilt-correction block (hip flexor stretch + dead bug) daily |
| SLR passive ≫ active | Hamstring control gap (Watch) | No aggressive hamstring stretching anywhere |
| SLR nerve tug | Nerve tension sign (Priority) | Flossing capped at mild tug; physio flag |
| Hip IR side < other side | Hip IR deficit, side-named (Priority) | Daily IR block, deficit side first + doubled |
| Side-plank L/R diff > 10% | Lateral endurance gap (Watch) | Extra set, weaker side |
| Side-plank min < 20 s | Low core endurance (Watch) | Big 3 as 10-sec exposures |
| Wall test head/shoulders | Forward head / rounded shoulders (Watch) | Chin tucks daily / rows + face pulls 3×wk |
| Guarding L/R | Weight-shift guarding (Watch) | Extra single-leg work on the avoided side |

## 5. Safety invariants — NEVER BREAK

These encode Ayaan's L4–L5 precautions from his regimen. They are product rules, not suggestions:

1. No loaded spinal flexion. No loaded twisting. Jefferson curl / loaded flexion work is **deliberately excluded** (documented decision, conflicts with disc precautions).
2. Never both knees to chest simultaneously — single knee-to-chest only.
3. Extension-intolerant ⇒ no press-ups, no prone lying, no lumbar-arch finishes on hip thrust / deadlift patterns.
4. Skipped assessment answers = no data. No finding (positive *or* "clear") may be emitted from a skip.
5. Pain ≥ 7 ⇒ flare protocol only. Pain gates progression; the calendar never does.
6. Every exercise keeps a regression (modify-don't-stop). Swaps must actually apply to the rendered session (expert-review blocker #2 was a fake swap — regression-test this if you touch `sessionExercises()`).
7. The app screens patterns; it does not diagnose. Red-flag copy stays at the top of Assess.

## 6. Data model (localStorage `backforge_v1`)

```jsonc
{
  "v": 1,
  "answers": { "dirext": "worse", "hipir_R": "low", "sideplanksec_L": "25", /* testId[_L|_R] */ },
  "results": [ { "sev": "high|mod|ok", "t": "title", "d": "detail", "fix": "plan effect" } ],
  "assessHistory": [ { "date": "YYYY-MM-DD", "flags": ["titles…"] } ],
  "log":      [ { "date": "...", "kind": "full|micro", "title": "...", "pain": 0-10|null } ],
  "checkins": [ { "date": "...", "pain": 0-10, "where": "back|leg-r|…", "sleep": "poor|ok|great" } ],
  "bandLevel": { "exerciseId": 1 },
  "swaps":    { "exerciseId": { "to": "exerciseId", "date": "YYYY-MM-DD" } },
  "player":   { "date": "...", "idx": 0, "items": [ /* expanded steps */ ] } | null,
  "reminder": { "on": true, "time": "19:00", "lastFired": "YYYY-MM-DD" } | null
}
```

## 7. Verification already done (2026-10-30, Muse)

- JS syntax checked (node --check) after every edit round.
- Engine smoke-tested in node with Ayaan's known profile (extension-intolerant, right glute inhibition, APT, right hip IR deficit, left guarding, side-plank 25 s vs 18 s): all 11 expected findings fired, prone lying removed, IR + tilt blocks added.
- All-skips profile: **zero** findings (no false "direction-neutral", no phantom IR deficit).
- `todayStr()` verified local at 21:30 CT.

## 8. Expert review (2026-10-30) — summary

An independent UI/exercise-app expert review scored v1 "a genuinely smart clinical prototype, one tier below Fitbod/Hevy" and raised 17 issues. **All blockers/majors were fixed in this build:** UTC dates, fake swap, skip-scoring, player state loss (resume added), timer drift (timestamps + beep + wake lock), dose modeling (set × side expansion), flare-player contradiction (flare = flare list only), marketing-page home for returning users (compact hero, session first, header Start), fabricated check-in defaults (all inputs required, rehydrated), test count (13, stated correctly; sticky progress; autosave copy), band-level engine (implemented for real: Library steppers + gate promotions), accessibility (aria-pressed, Esc, focus return, 44 px targets, `--faint` raised to ≥4.5:1, severity labels Priority/Watch/Clear), fixed 0–10 pain scale, DPR charts, neutral test copy. Minors deferred: full focus trap, chart text alternatives beyond labels, exercise imagery to replace emoji thumbs.

## 9. Known limitations

- **Reminder** fires only while the app is installed/open on the device (no push server in v1). It replaces Ayaan's 7 PM chat check-in per his 2026-10-30 instruction — the chat cron was disabled at deploy.
- Video demos are YouTube *search* links per exercise per source (deliberate: no invented video IDs). One verified embed only: Squat University Big 3, ID `2_e4I-brfqs`, sourced from squatuniversity.com.
- Access scores/copy are written for a general user; Ayaan's own answers are **not** pre-loaded (his results generate when he takes the assessment in-app).
- No sync yet: Phase 2 is macro counting + Google Fit / Samsung Health via Health Connect, bridged by Muse (designed in the *More* roadmap cards).

## 10. Working agreement (Ayaan's protocol)

- Code changes: branch `claude/<topic>` or `muse/<topic>` + PR for Ayaan's merge, unless he says push. Data-only commits to main start with `data:` and never touch layout/CSS.
- Never force-push main. Check open PRs before editing.
- Every work session ends with a short summary to Ayaan: what changed, what's UNVERIFIED, what's blocked.
- Hand work back via GitHub issues: `for-muse` / `for-claude` labels.

## 11. Open questions for Claude

1. `parseDose()` regexes vs the dose strings in `EX` — worth a small test table if you extend the library past 26.
2. Should the flare protocol also *suppress the next day's* strength session if pain stays ≥ 7 for 2+ days? Engine currently decides day-by-day from the morning check-in only.
3. Phase 2 design: protein floor default (1.6 g/kg?) and the Health Connect → recovery-score mapping (steps, Zone 2 minutes, sleep) — propose in an issue before building.
