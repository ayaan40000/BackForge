"""Progression engine — port of gateStatus(), streak(), sessionsThisWeek(),
sessionWeeks() and promoteBands() from index.html.

THE GATE (rolling 14 days): promotion unlocks when the average check-in
pain over the last 14 days is <= 3 AND at least 8 sessions were logged in
the same window. Fewer than 5 check-ins in the window = 'Warming up'
(not enough signal — the frontend refuses to judge).
"""
from __future__ import annotations

from datetime import timedelta

from ..exercises import Library, has_band
from .context import Ctx, parse_day

GATE_WINDOW_DAYS = 14
GATE_MIN_CHECKINS = 5
GATE_MAX_AVG_PAIN = 3.0
GATE_MIN_SESSIONS = 8


def _in_window(day: str, ctx: Ctx, days: int = GATE_WINDOW_DAYS) -> bool:
    return parse_day(day) >= ctx.today - timedelta(days=days)


def gate_status(ctx: Ctx) -> dict:
    ck = [c for c in ctx.checkins if _in_window(c.get("date", ""), ctx)]
    sess = sum(1 for l in ctx.log if _in_window(l.get("date", ""), ctx))
    if len(ck) < GATE_MIN_CHECKINS:
        return {
            "status": "warming_up",
            "label": "Warming up",
            "ready": False,
            "checkins_in_window": len(ck),
            "sessions_in_window": sess,
            "avg_pain": None,
        }
    avg = sum(c.get("pain") or 0 for c in ck) / len(ck)
    ready = avg <= GATE_MAX_AVG_PAIN and sess >= GATE_MIN_SESSIONS
    return {
        "status": "ready" if ready else "hold",
        "label": "READY — level up" if ready else "Hold — pain or consistency",
        "ready": ready,
        "checkins_in_window": len(ck),
        "sessions_in_window": sess,
        "avg_pain": round(avg, 2),
    }


def streak(ctx: Ctx) -> int:
    days = {l.get("date") for l in ctx.log}
    n = 0
    d = ctx.today
    if d.isoformat() not in days:
        d = d - timedelta(days=1)
    while d.isoformat() in days:
        n += 1
        d = d - timedelta(days=1)
    return n


def sessions_this_week(ctx: Ctx) -> int:
    monday = ctx.today - timedelta(days=ctx.today.weekday())
    return sum(1 for l in ctx.log if parse_day(l.get("date")) >= monday)


def session_weeks(ctx: Ctx) -> list[int]:
    """Session counts for the last 4 calendar weeks, oldest first."""
    out = [0, 0, 0, 0]
    for l in ctx.log:
        diff = (ctx.today - parse_day(l.get("date"))).days
        w = diff // 7
        if 0 <= w < 4:
            out[3 - w] += 1
    return out


def pain_trend(ctx: Ctx, limit: int = 14) -> list[dict]:
    return [{"date": c.get("date"), "pain": c.get("pain")} for c in ctx.checkins[-limit:]]


def promote_bands(lib: Library, band_levels: dict) -> dict:
    """promoteBands(): +1 level on every band exercise. Returns new levels."""
    out = dict(band_levels)
    for ex in lib.all:
        if has_band(ex):
            out[ex["id"]] = out.get(ex["id"], 1) + 1
    return out


def progress_summary(lib: Library, ctx: Ctx) -> dict:
    return {
        "date": ctx.today.isoformat(),
        "gate": gate_status(ctx),
        "streak": streak(ctx),
        "sessions_this_week": sessions_this_week(ctx),
        "total_sessions": len(ctx.log),
        "session_weeks": session_weeks(ctx),
        "pain_trend": pain_trend(ctx),
        "band_levels": dict(ctx.band_levels),
    }
