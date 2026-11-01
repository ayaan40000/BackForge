"""Progression tests — invariant 5: the rolling 14-day gate math,
plus streak math and band promotion."""
from datetime import timedelta

from app.engine import progress as progress_engine
from conftest import MONDAY, checkin, make_ctx, session


def _days(n, pain=2, kind="checkin"):
    base = MONDAY - timedelta(days=n)
    return checkin(base, pain) if kind == "checkin" else session(base)


def test_gate_warming_up_below_5_checkins(lib):
    ctx = make_ctx(lib,
                   checkins=[_days(i) for i in range(4)],
                   log=[_days(i, kind="session") for i in range(10)])
    gate = progress_engine.gate_status(ctx)
    assert gate["status"] == "warming_up" and gate["ready"] is False
    assert gate["avg_pain"] is None and gate["checkins_in_window"] == 4


def test_gate_ready_when_pain_low_and_8_sessions(lib):
    ctx = make_ctx(lib,
                   checkins=[_days(i, pain=p) for i, p in enumerate([2, 3, 2, 3, 2])],
                   log=[_days(i, kind="session") for i in range(8)])
    gate = progress_engine.gate_status(ctx)
    assert gate["ready"] is True and gate["status"] == "ready"
    assert gate["label"] == "READY — level up"
    assert abs(gate["avg_pain"] - 2.4) < 0.01
    assert gate["sessions_in_window"] == 8


def test_gate_holds_when_pain_too_high(lib):
    ctx = make_ctx(lib,
                   checkins=[_days(i, pain=4) for i in range(6)],
                   log=[_days(i, kind="session") for i in range(10)])
    gate = progress_engine.gate_status(ctx)
    assert gate["ready"] is False and gate["status"] == "hold"


def test_gate_holds_when_sessions_short(lib):
    ctx = make_ctx(lib,
                   checkins=[_days(i, pain=1) for i in range(6)],
                   log=[_days(i, kind="session") for i in range(7)])
    assert progress_engine.gate_status(ctx)["ready"] is False


def test_gate_boundary_avg_pain_exactly_3(lib):
    ctx = make_ctx(lib,
                   checkins=[_days(i, pain=3) for i in range(5)],
                   log=[_days(i, kind="session") for i in range(8)])
    assert progress_engine.gate_status(ctx)["ready"] is True


def test_old_activity_falls_out_of_the_window(lib):
    old_checkins = [checkin(MONDAY - timedelta(days=20 + i), 1) for i in range(6)]
    old_sessions = [session(MONDAY - timedelta(days=20 + i)) for i in range(10)]
    ctx = make_ctx(lib, checkins=old_checkins, log=old_sessions)
    gate = progress_engine.gate_status(ctx)
    assert gate["checkins_in_window"] == 0 and gate["sessions_in_window"] == 0
    assert gate["status"] == "warming_up"


def test_streak_counts_back_from_today(lib):
    log = [session(MONDAY), session(MONDAY - timedelta(days=1)),
           session(MONDAY - timedelta(days=2)), session(MONDAY - timedelta(days=4))]
    assert progress_engine.streak(make_ctx(lib, log=log)) == 3


def test_streak_survives_missing_today(lib):
    log = [session(MONDAY - timedelta(days=1)), session(MONDAY - timedelta(days=2))]
    assert progress_engine.streak(make_ctx(lib, log=log)) == 2
    assert progress_engine.streak(make_ctx(lib, log=[])) == 0


def test_sessions_this_week_and_weeks(lib):
    log = [session(MONDAY), session(MONDAY - timedelta(days=3)),  # this week (Mon + prev Fri? no: Mon-3 = Friday of last week)
           session(MONDAY - timedelta(days=8))]
    ctx = make_ctx(lib, log=log)
    assert progress_engine.sessions_this_week(ctx) == 1  # only Monday itself
    weeks = progress_engine.session_weeks(ctx)
    assert sum(weeks) == 3 and weeks[3] >= 1


def test_promote_bands_only_touches_band_exercises(lib):
    levels = {"glutebridge": 2}
    out = progress_engine.promote_bands(lib, levels)
    assert out["glutebridge"] == 3
    assert out["clamshell"] == 2  # mini-band, was default 1
    assert "curlup" not in out  # bodyweight — untouched
    assert levels == {"glutebridge": 2}  # input not mutated
