"""Live workout builder tests — sizing, caveats, reasons, dose math."""
from app.engine import live as live_engine
from app.engine.assessment import score_assessment
from app.exercises import has_band
from conftest import AYAAN_ANSWERS, MONDAY, checkin, make_ctx

FINDINGS = score_assessment(AYAAN_ANSWERS)


def section(w, name):
    return next(s for s in w["sections"] if s["name"] == name)


def all_items(w):
    return [it for s in w["sections"] for it in s["items"]]


def test_parse_dose_matches_frontend_rules(lib):
    # '8-sec' matches neither JS regex (hyphen breaks both) -> hold is None,
    # exactly as parseDose() behaves in the frontend
    assert live_engine.parse_dose("3 × 8 · 8-sec holds") == {"sets": 3, "perSide": False, "hold": None}
    assert live_engine.parse_dose("3 × 8 · 8 sec holds")["hold"] == 8
    assert live_engine.parse_dose("3 × 20–30 sec / side") == {"sets": 3, "perSide": True, "hold": 30}
    assert live_engine.parse_dose("2 × 10 / side · 5-sec squeeze")["hold"] is None  # <8s ignored
    assert live_engine.parse_dose("6 cycles") == {"sets": 1, "perSide": False, "hold": None}
    assert live_engine.parse_dose("9 × 15")["sets"] == 3  # capped at 3


def test_sections_and_title(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 20, "ok", [])
    assert w["title"] == "Live workout — 20 min"
    assert [s["name"] for s in w["sections"]] == ["Warm-up", "Main work", "Cool-down"]
    assert w["est"] > 0 and w["reasons"]


def test_five_minute_version_is_tiny(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 5, "ok", [])
    assert len(section(w, "Main work")["items"]) <= 2
    assert len(section(w, "Warm-up")["items"]) <= 1
    assert len(section(w, "Cool-down")["items"]) <= 1


def test_bigger_budget_fits_more_main_work(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    small = live_engine.build_live_workout(lib, ctx, 10, "ok", [])
    big = live_engine.build_live_workout(lib, ctx, 50, "ok", [])
    assert len(section(big, "Main work")["items"]) >= len(section(small, "Main work")["items"])


def test_low_energy_caps_sets_at_two(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "low", [])
    for it in all_items(w):
        assert live_engine.parse_dose(it["dose"])["sets"] <= 2
    assert any("sets capped at 2" in r for r in w["reasons"])


def test_noband_caveat_removes_all_band_moves(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", ["noband"])
    for it in all_items(w):
        assert not has_band(lib.by_id[it["id"]]), it["id"]
    assert any("No bands" in r for r in w["reasons"])


def test_standing_caveat_drops_standing_moves(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", ["standing"])
    ids = {it["id"] for it in all_items(w)}
    assert not (ids & {"sidesteps", "march9090", "wallsquat", "pullthrough"})
    assert any("Floor-based" in r for r in w["reasons"])


def test_knees_caveat_drops_wallsquat_and_keeps_bridge(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", ["knees"])
    ids = {it["id"] for it in all_items(w)}
    assert "wallsquat" not in ids
    assert any("knees are sore" in r for r in w["reasons"])


def test_touchy_side_gets_easy_dose_note(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", ["right"])
    noted = [it for it in all_items(w) if it.get("note")]
    assert noted and all("right side is touchy" in it["note"] for it in noted)
    assert all("/ side" in it["dose"] for it in noted)
    assert any("Gentle dosing on the right side" in r for r in w["reasons"])


def test_reasons_name_the_top_finding_and_its_target(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", [])
    joined = " ".join(w["reasons"])
    # first actionable finding with a matching corrective in the session wins;
    # Ayaan's set targets hip-ir early via the IR correctives
    assert "finding from your assessment" in joined
    assert "sized to 35 minutes" in joined


def test_derived_energy_from_checkin(lib):
    ctx = make_ctx(lib, checkins=[checkin(MONDAY, 8)])
    assert live_engine.derived_energy(ctx) == "flare"
    ctx = make_ctx(lib, checkins=[checkin(MONDAY, 5)])
    assert live_engine.derived_energy(ctx) == "low"
    ctx = make_ctx(lib, checkins=[checkin(MONDAY, 2, sleep="poor")])
    assert live_engine.derived_energy(ctx) == "low"
    ctx = make_ctx(lib, checkins=[checkin(MONDAY, 2)])
    assert live_engine.derived_energy(ctx) == "ok"
    ctx = make_ctx(lib)  # no check-in today
    assert live_engine.derived_energy(ctx) == "ok"


def test_corrective_pool_follows_findings(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    pool = live_engine.corrective_pool(ctx)
    for expected in ("proneir", "hipir9090", "deadbug", "clamshell", "sideplank", "facepull", "singlebridge"):
        assert expected in pool
    ctx = make_ctx(lib, findings=[])
    assert live_engine.corrective_pool(ctx) == ["clamshell", "hipir9090"]
