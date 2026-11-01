# BackForge backend

Server-side engine for the BackForge PWA (`../index.html`). The frontend is
localStorage-only today; this backend ports its logic 1:1 so the app can sync
later without changing behavior:

- **Assessment** — the 13-test scoring engine (`scoreAssessment()`), producing
  the same findings with the same wording, severities and plan fixes.
- **Plan generator** — daily foundation blocks, the A/B/C strength week with
  Zone 2 cardio days, micro versions, swaps, and check-in load tuning.
- **Live builder** — time (5/10/20/35/50) + energy + caveats → warm-up / main /
  cool-down with plain-language reasons.
- **Progression** — the rolling 14-day gate: average check-in pain ≤ 3 **and**
  ≥ 8 logged sessions (with ≥ 5 check-ins required before the gate judges at
  all) unlocks band-level promotion.

Stack: Python 3 + FastAPI + SQLite (stdlib `sqlite3`). No other services.

## Run

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8077
```

Requires `data/exercises.json` (the exercise library). The loader refuses to
start without it — BackForge never serves a plan from an invented library.
Override paths with `BACKFORGE_EXERCISES_PATH` / `BACKFORGE_DB_PATH`.
The SQLite database defaults to `backend/backforge.db`.

## Tests

```bash
.venv/bin/python -m pytest tests/ -q
```

Tests run against `tests/fixtures/exercises_seed.json` (the frontend's
26-exercise library mapped to the backend schema, plus deliberate trap
exercises). Safety invariants are first-class tests in `tests/test_safety.py`.

## Endpoints

| Method | Path | What |
|---|---|---|
| GET | `/health` | liveness, library size |
| GET | `/exercises` | library; filters `category`, `target`, `equipment`, `level`; unsafe-for-profile exercises excluded unless `include_excluded=true` (then each carries `excluded_reason`) |
| GET / PUT | `/profile` | the stored profile (extension-intolerance, sciatica/guarding side, precautions) |
| POST | `/assess` | `{answers, date?, save?}` → findings, `answered_count`, `scorable` (≥ 6). Saves answers/results/history like the frontend's Score button |
| POST | `/plan` | `{findings?, profile?, checkin?, swaps?, date?}` → foundation blocks, 7-day week, today's session, load tune |
| POST | `/workout/live` | `{mins, energy?, caveats?, findings?, profile?, date?}` → sections + reasons; energy derived from today's check-in when omitted |
| POST | `/log/checkin` | one check-in per day (replaces); returns the day's tune + flare flag |
| POST | `/log/session` | session log entry + `exercise_ids` into the exercise log; returns streak + gate |
| GET | `/progress` | gate status, streak, sessions this week, 4-week buckets, pain trend, band levels |
| POST | `/progress/promote` | +1 band level on every band exercise — **409 unless the gate is READY** |
| GET | `/state/export` | the exact `backforge_v1` localStorage object |
| POST | `/state/import` | load a `backforge_v1` object (`{state: {...}}`); profile is server-side and survives import |

Requests accept per-call `findings`/`profile` overrides; otherwise stored
state is used, so a bare `POST /plan {"date": "..."}` behaves like opening
the app that day.

## Safety model (defense in depth)

The frontend already encodes Ayaan's L4-L5 precautions; the backend enforces
them again on every exercise it serves (`app/exercises.py`):

1. **Loaded spinal flexion/rotation is never served.** "Loaded" = strength
   category, or band / mini-band / dumbbell equipment. Unloaded bodyweight
   mobility (cat-camel, single knee-to-chest) stays — it is in the program
   by design.
2. **Both-knees-to-chest never appears**, for any profile.
3. **`contra` tags exclude**: exercises tagged `extension-intolerant`
   (press-ups) are excluded for Ayaan's profile; additionally, anything with
   `spinal_load: "extension"` is excluded for an extension-intolerant
   profile even if its contra list forgot the tag (sphinx case).
4. **Pain ≥ 7 → flare protocol only** (single knee-to-chest, figure-4,
   cat-camel, gentle QL reach) in both `/plan` and `/workout/live`.
5. **Progression is earned**: the gate above, and `/progress/promote`
   refuses with 409 while the gate is closed.

## Design notes / deviations from the frontend

- **Pure engine, explicit context.** The frontend reads globals; the engine
  takes a `Ctx` (findings, check-ins, log, exercise log, swaps, band levels,
  profile flags, "today"). Every engine function is a faithful port —
  finding text, doses, block order, gate constants all match `index.html`.
- **Answers shape is the frontend's**: `firing_L`, `sideplanksec_R`, `'skip'`
  means no data. Skipped answers never produce findings.
- **One frontend quirk deliberately NOT ported**: in the JS, the string
  `'skip'` is truthy, so if every glute test is skipped the frontend's
  glute-ok branch fires a phantom "Glutes are firing" finding. The backend
  cleans `'skip'` to absent before scoring, per the rule that skipped =
  no data. (`answered_count` keeps the frontend semantics — it is a
  progress meter, and there a stored `'skip'` counts as answered.)
- **`/assess` does not hard-fail below 6 answered tests** (the frontend's
  Score button refuses with a toast). The API returns `answered_count` and
  `scorable` so the client can apply the same rule.
- **Live reasons are plain text.** The frontend wraps names in `<b>` tags;
  the API returns the same sentences without markup.
- **Missing library ids degrade, never crash.** If `exercises.json` lacks an
  id the plan references, that item is skipped. (The frontend would break;
  the backend stays up.) The seed fixture contains all referenced ids.
- **Foundation blocks are text, like the frontend.** They are name/dose
  strings (e.g. "Prone lying — REMOVED — extension-intolerant pattern" with
  `skip: true`), not library ids, mirroring `buildFoundation()` exactly.
- **Profile is server-side only**, kept out of the `backforge_v1` export so
  the export stays byte-compatible with the app's own Export JSON.
- **Dates** are `YYYY-MM-DD`; endpoints that depend on "today" accept a
  `date` override (the frontend uses the device clock).
