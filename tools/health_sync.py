#!/usr/bin/env python3
"""BackForge v3.0 -- Health Connect sync bridge generator.

Reads the user's Health Connect data through the health-cli connector
(``/opt/hatch/bin/health-cli``, always with ``--provider healthconnect``)
and writes a small JSON payload that the user imports into the BackForge
app ("Health Connect sync via Muse").

Usage:
    python3 health_sync.py [--days N] [--end YYYY-MM-DD]
                           (--age N | --zone2-min BPM --zone2-max BPM)
                           [--out PATH]

Payload shape (version 1):
    {"kind": "backforge-health-sync", "version": 1,
     "generatedAt": <ISO local timestamp>,
     "source": "Health Connect via Muse (health-cli)",
     "window": {"from": ..., "to": ...},
     "zone2": {"hrMin": ..., "hrMax": ..., "basis": ..., "method": ...},
     "coverage": {"complete": <bool>, "note": <str>},
     "days": [{"date", "steps", "zone2Min", "sleepMin", "sleepDeepMin",
               "sleepScore", "weightKg"}, ...]}   # ascending by date

Transformation rules:
  * One record is emitted for every date in the window. ``steps`` is null
    for dates absent from the metrics response (never fabricated as 0);
    ``weightKg`` is null except on days with a weigh-in (sparse).
  * Sleep is attributed to its END date (the wake day). Multiple sessions
    ending on the same date are summed. Asleep seconds per session =
    core + deep + REM + asleep-unspecified. ``sleepScore`` is
    sleep_efficiency * 100 when present, else quality_score, else null;
    with multiple scored sessions the score of the longest-asleep session
    is used.
  * Zone 2 minutes: a logged workout session contributes its active
    minutes when its average HR falls inside the band (inclusive),
    attributed to the session's start date. Sessions without an average
    HR contribute 0. Unlogged activity is not counted (raw HR samples are
    not exposed by the connector).
  * The sleep query starts one day before the window so a session that
    began the previous evening but ends on the first window date is not
    missed; sessions are kept only when their end date is in the window.

Standard library only.
"""

import argparse
import json
import subprocess
import sys
from datetime import date, datetime, timedelta

HEALTH_CLI = "/opt/hatch/bin/health-cli"
PROVIDER = "healthconnect"

ZONE2_METHOD = (
    "Logged workout sessions whose average HR falls in the band contribute "
    "their active minutes. Unlogged activity and walks without a logged "
    "workout are not counted; raw HR samples are not exposed by the "
    "connector."
)

ASLEEP_FIELDS = (
    "sleep_core_duration_sec",
    "sleep_deep_duration_sec",
    "sleep_rem_duration_sec",
    "sleep_asleep_unspecified_duration_sec",
)


# ---------------------------------------------------------------------------
# Zone 2 band
# ---------------------------------------------------------------------------

def resolve_zone2_band(age=None, zone2_min=None, zone2_max=None):
    """Return (hr_min, hr_max, basis_text).

    An explicit --zone2-min/--zone2-max pair wins. Otherwise the band is
    derived from age: HRmax = 220 - age, band = 60-70% of HRmax (rounded).
    Raises ValueError with a user-facing message when the band cannot be
    determined.
    """
    if (zone2_min is None) != (zone2_max is None):
        raise ValueError(
            "--zone2-min and --zone2-max must be given together "
            "(or neither, with --age instead)."
        )
    if zone2_min is not None:
        if zone2_min > zone2_max:
            raise ValueError("--zone2-min must not exceed --zone2-max.")
        return zone2_min, zone2_max, "explicit override via --zone2-min/--zone2-max"
    if age is None:
        raise ValueError(
            "cannot determine the Zone 2 band: pass --age N (band = 60-70% "
            "of estimated HRmax 220-age) or --zone2-min/--zone2-max."
        )
    if age <= 0 or age > 120:
        raise ValueError("--age must be between 1 and 120.")
    hr_max_est = 220 - age
    hr_min = round(0.60 * hr_max_est)
    hr_max = round(0.70 * hr_max_est)
    basis = f"60-70% of estimated HRmax {hr_max_est} (220-age)"
    return hr_min, hr_max, basis


# ---------------------------------------------------------------------------
# Pure transformation helpers (unit-tested in test_health_sync.py)
# ---------------------------------------------------------------------------

def _date_part(datetime_str):
    """'YYYY-MM-DD HH:MM:SS' (or ISO variant) -> 'YYYY-MM-DD'."""
    return str(datetime_str)[:10]


def _sec_to_min(seconds):
    return int(round(seconds / 60.0))


def session_sleep_score(record):
    """Score for one sleep session, or None.

    sleep_efficiency (0-1) * 100 takes precedence over quality_score.
    """
    eff = record.get("sleep_efficiency")
    if eff is not None:
        return round(float(eff) * 100, 1)
    quality = record.get("quality_score")
    if quality is not None:
        return float(quality)
    return None


def session_asleep_sec(record):
    total = 0.0
    for field in ASLEEP_FIELDS:
        value = record.get(field)
        if value is not None:
            total += float(value)
    return total


def aggregate_sleep(records, window_dates=None):
    """Group sleep sessions by END date (wake day).

    Returns {date: {"sleepMin": int, "sleepDeepMin": int,
                    "sleepScore": number|None}}.
    When window_dates is given, sessions ending outside it are dropped.
    """
    by_date = {}
    for record in records:
        end_dt = record.get("end_datetime")
        if not end_dt:
            continue
        day = _date_part(end_dt)
        if window_dates is not None and day not in window_dates:
            continue
        asleep = session_asleep_sec(record)
        deep = record.get("sleep_deep_duration_sec")
        deep_sec = float(deep) if deep is not None else 0.0
        score = session_sleep_score(record)
        entry = by_date.setdefault(
            day, {"asleep_sec": 0.0, "deep_sec": 0.0,
                  "sleepScore": None, "_score_asleep_sec": -1.0}
        )
        entry["asleep_sec"] += asleep
        entry["deep_sec"] += deep_sec
        # Score comes from the longest-asleep scored session that day.
        if score is not None and asleep >= entry["_score_asleep_sec"]:
            entry["sleepScore"] = score
            entry["_score_asleep_sec"] = asleep
    result = {}
    for day, entry in by_date.items():
        result[day] = {
            "sleepMin": _sec_to_min(entry["asleep_sec"]),
            "sleepDeepMin": _sec_to_min(entry["deep_sec"]),
            "sleepScore": entry["sleepScore"],
        }
    return result


def aggregate_workouts(records, hr_min, hr_max, window_dates=None):
    """Zone 2 minutes per workout START date.

    A session counts only when hr_average_bpm is present and inside
    [hr_min, hr_max] inclusive. Returns {date: zone2Min int}.
    """
    sec_by_date = {}
    for record in records:
        hr = record.get("hr_average_bpm")
        if hr is None:
            continue
        if not (hr_min <= float(hr) <= hr_max):
            continue
        start_dt = record.get("start_datetime")
        if not start_dt:
            continue
        day = _date_part(start_dt)
        if window_dates is not None and day not in window_dates:
            continue
        duration = record.get("active_duration_sec")
        if duration is None:
            continue
        sec_by_date[day] = sec_by_date.get(day, 0.0) + float(duration)
    return {day: _sec_to_min(sec) for day, sec in sec_by_date.items()}


def aggregate_metrics(records):
    """Returns {date: {"steps": int|None, "weightKg": number|None}}."""
    by_date = {}
    for record in records:
        day = record.get("date")
        if not day:
            continue
        steps = record.get("step_count")
        weight = record.get("body_mass_kg")
        by_date[day] = {
            "steps": int(round(float(steps))) if steps is not None else None,
            "weightKg": float(weight) if weight is not None else None,
        }
    return by_date


def window_date_list(end_date, days):
    """Ascending list of YYYY-MM-DD strings, `days` long, ending at end_date."""
    start = end_date - timedelta(days=days - 1)
    return [(start + timedelta(days=i)).isoformat() for i in range(days)]


def build_days(dates, metrics_by_date, sleep_by_date, zone2_by_date):
    """One record per window date, ascending, nulls where unknown."""
    days = []
    for day in dates:
        metric = metrics_by_date.get(day, {})
        sleep = sleep_by_date.get(day)
        days.append({
            "date": day,
            "steps": metric.get("steps"),
            "zone2Min": int(zone2_by_date.get(day, 0)),
            "sleepMin": sleep["sleepMin"] if sleep else None,
            "sleepDeepMin": sleep["sleepDeepMin"] if sleep else None,
            "sleepScore": sleep["sleepScore"] if sleep else None,
            "weightKg": metric.get("weightKg"),
        })
    return days


def build_payload(dates, days_records, hr_min, hr_max, basis,
                  coverage_complete, coverage_note, generated_at):
    return {
        "kind": "backforge-health-sync",
        "version": 1,
        "generatedAt": generated_at,
        "source": "Health Connect via Muse (health-cli)",
        "window": {"from": dates[0], "to": dates[-1]},
        "zone2": {
            "hrMin": hr_min,
            "hrMax": hr_max,
            "basis": basis,
            "method": ZONE2_METHOD,
        },
        "coverage": {"complete": bool(coverage_complete), "note": coverage_note or ""},
        "days": days_records,
    }


# ---------------------------------------------------------------------------
# Connector access
# ---------------------------------------------------------------------------

def run_health_cli(args):
    """Run health-cli and return the parsed JSON dict."""
    cmd = [HEALTH_CLI] + args
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        raise RuntimeError("health-cli not found at %s" % HEALTH_CLI)
    except subprocess.TimeoutExpired:
        raise RuntimeError("health-cli timed out: %s" % " ".join(cmd))
    if proc.returncode != 0:
        raise RuntimeError(
            "health-cli failed (%d): %s\n%s"
            % (proc.returncode, " ".join(cmd), (proc.stderr or proc.stdout or "").strip())
        )
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("health-cli returned non-JSON output: %s" % exc)


def fetch_all(from_str, to_str):
    """Query metrics, sleep and workouts for the window.

    Sleep is queried from one day before the window (see module docstring).
    Returns (metrics_json, sleep_records, workout_records).
    """
    metrics = run_health_cli([
        "query", "metrics", "--provider", PROVIDER,
        "--start-date", from_str, "--end-date", to_str,
        "--interval", "daily", "--fields", "step_count,body_mass_kg",
    ])
    sleep_from = (date.fromisoformat(from_str) - timedelta(days=1)).isoformat()
    sleep = run_health_cli([
        "query", "sessions", "--provider", PROVIDER, "--category", "sleep",
        "--start-date", sleep_from, "--end-date", to_str,
    ])
    workouts = run_health_cli([
        "query", "sessions", "--provider", PROVIDER, "--category", "workout",
        "--start-date", from_str, "--end-date", to_str,
    ])
    return metrics, sleep.get("records", []), workouts.get("records", [])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Generate a BackForge Health Connect sync payload "
                    "from health-cli (Health Connect via Muse)."
    )
    parser.add_argument("--days", type=int, default=28,
                        help="window length in days (default 28)")
    parser.add_argument("--end", default=None, metavar="YYYY-MM-DD",
                        help="last day of the window (default: today)")
    parser.add_argument("--age", type=int, default=None,
                        help="age in years; used only to derive the Zone 2 "
                             "band (HRmax = 220 - age, band = 60-70%%)")
    parser.add_argument("--zone2-min", type=int, default=None,
                        help="explicit Zone 2 lower bound (bpm); overrides --age")
    parser.add_argument("--zone2-max", type=int, default=None,
                        help="explicit Zone 2 upper bound (bpm); overrides --age")
    parser.add_argument("--out", default="./backforge-health-sync.json",
                        help="output path (default ./backforge-health-sync.json)")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    if args.days < 1:
        print("error: --days must be at least 1", file=sys.stderr)
        return 2

    try:
        hr_min, hr_max, basis = resolve_zone2_band(
            age=args.age, zone2_min=args.zone2_min, zone2_max=args.zone2_max
        )
    except ValueError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 2

    if args.end:
        try:
            end_date = date.fromisoformat(args.end)
        except ValueError:
            print("error: --end must be YYYY-MM-DD, got %r" % args.end, file=sys.stderr)
            return 2
    else:
        end_date = datetime.now().astimezone().date()

    dates = window_date_list(end_date, args.days)
    date_set = set(dates)

    try:
        metrics_json, sleep_records, workout_records = fetch_all(dates[0], dates[-1])
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1

    metrics_by_date = aggregate_metrics(metrics_json.get("records", []))
    sleep_by_date = aggregate_sleep(sleep_records, window_dates=date_set)
    zone2_by_date = aggregate_workouts(workout_records, hr_min, hr_max,
                                       window_dates=date_set)
    day_records = build_days(dates, metrics_by_date, sleep_by_date, zone2_by_date)

    coverage = metrics_json.get("coverage", {}) or {}
    payload = build_payload(
        dates=dates,
        days_records=day_records,
        hr_min=hr_min,
        hr_max=hr_max,
        basis=basis,
        coverage_complete=coverage.get("complete", False),
        coverage_note=coverage.get("warning", "") or "",
        generated_at=datetime.now().astimezone().isoformat(timespec="seconds"),
    )

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")

    days_with_steps = sum(1 for d in day_records if d["steps"] is not None)
    total_zone2 = sum(d["zone2Min"] for d in day_records)
    weigh_ins = sum(1 for d in day_records if d["weightKg"] is not None)
    print(
        "Wrote %s: %d days emitted, %d days with steps, %d total zone2 minutes, "
        "%d weigh-ins found."
        % (args.out, len(day_records), days_with_steps, total_zone2, weigh_ins)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
