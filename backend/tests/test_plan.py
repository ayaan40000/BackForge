"""Plan generator tests — foundation blocks, week shape, session tuning."""
from app.engine import plan as plan_engine
from app.engine.assessment import score_assessment
from conftest import AYAAN_ANSWERS, MONDAY, SUNDAY, TUESDAY, checkin, make_ctx

FINDINGS = score_assessment(AYAAN_ANSWERS)


def block_names(blocks):
    return [b["name"] for b in blocks]


def test_week_plan_shape(lib):
    week = plan_engine.week_plan()
    assert [w["day"] for w in week] == ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    assert [w["kind"] for w in week] == ["A", "cardio", "B", "cardio", "C", "cardio", "rest"]
    assert week[0]["label"] == "Strength A"
    assert week[1]["label"] == "Zone 2 cardio"
    assert week[6]["label"] == "Rest — foundation only"


def test_foundation_base_blocks_without_findings(lib):
    ctx = make_ctx(lib, findings=[])
    blocks = plan_engine.build_foundation(ctx)
    assert block_names(blocks) == [
        "In bed, before standing", "Posture reset", "Band activation", "McGill Big 3 — one round",
    ]
    # no extension finding -> prone lying present and NOT skipped
    first = blocks[0]["items"][0]
    assert first["t"] == "Prone lying" and first["skip"] is False


def test_foundation_removes_prone_lying_for_extension_intolerant(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    blocks = plan_engine.build_foundation(ctx)
    first = blocks[0]["items"][0]
    assert first["t"] == "Prone lying" and first["skip"] is True
    assert "REMOVED" in first["d"]


def test_foundation_adds_ir_and_tilt_blocks_from_findings(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    blocks = plan_engine.build_foundation(ctx)
    assert block_names(blocks) == [
        "In bed, before standing", "Posture reset", "Band activation",
        "Hip internal rotation", "Tilt correction", "McGill Big 3 — one round",
    ]
    ir = next(b for b in blocks if b["name"] == "Hip internal rotation")
    assert "right first" in ir["items"][0]["d"]  # right hip deficit in Ayaan's findings
    act = next(b for b in blocks if b["name"] == "Band activation")
    assert "weaker side twice" in act["items"][2]["d"]  # glute inhibition
    big3 = blocks[-1]
    assert "weaker side twice" in big3["items"][2]["d"]  # lateral gap


def test_foundation_never_lists_both_knees(lib):
    ctx = make_ctx(lib, findings=FINDINGS)
    for b in plan_engine.build_foundation(ctx):
        for it in b["items"]:
            assert "both" not in it["t"].lower() or "never both" in it["d"]


def test_monday_strength_a_session(lib):
    ctx = make_ctx(lib, today=MONDAY, findings=FINDINGS)
    sess = plan_engine.session_exercises(lib, ctx)
    assert sess["kind"] == "strength"
    assert sess["title"] == "Strength A — Lower body + pull"
    assert [it["id"] for it in sess["items"]] == [
        "glutebridge", "wallsquat", "row", "singlebridge", "pallof",
    ]


def test_sunday_is_rest_and_tuesday_is_cardio(lib):
    sess = plan_engine.session_exercises(lib, make_ctx(lib, today=SUNDAY))
    assert sess["kind"] == "rest" and sess["items"] is None
    sess = plan_engine.session_exercises(lib, make_ctx(lib, today=TUESDAY))
    assert sess["kind"] == "cardio" and "Elliptical" in sess["note"]


def test_pain_5_gives_micro_version(lib):
    ctx = make_ctx(lib, today=MONDAY, findings=FINDINGS, checkins=[checkin(MONDAY, 5)])
    sess = plan_engine.session_exercises(lib, ctx)
    assert sess["title"].endswith("— MICRO version")
    assert len(sess["items"]) == 2
    assert all(it["dose"] == "1 set only" for it in sess["items"])


def test_poor_sleep_drops_top_set_but_not_micro(lib):
    ctx = make_ctx(lib, today=MONDAY, checkins=[checkin(MONDAY, 2, sleep="poor")])
    tune = plan_engine.recovery_tune(ctx)
    assert tune["load"] == "Full, minus top set"
    sess = plan_engine.session_exercises(lib, ctx)
    assert len(sess["items"]) == 5


def test_no_checkin_means_no_tune(lib):
    ctx = make_ctx(lib, today=MONDAY)
    assert plan_engine.recovery_tune(ctx) is None
    assert plan_engine.flare_active(ctx) is False


def test_swap_applies_only_today(lib):
    swaps = {"glutebridge": {"to": "singlebridge", "date": MONDAY.isoformat()}}
    ctx = make_ctx(lib, today=MONDAY, swaps=swaps)
    sess = plan_engine.session_exercises(lib, ctx)
    first = sess["items"][0]
    assert first["id"] == "singlebridge" and "swapped in" in first["dose"]
    # yesterday's swap does not leak into today
    swaps = {"glutebridge": {"to": "singlebridge", "date": "2026-11-01"}}
    ctx = make_ctx(lib, today=MONDAY, swaps=swaps)
    sess = plan_engine.session_exercises(lib, ctx)
    assert sess["items"][0]["id"] == "glutebridge"
