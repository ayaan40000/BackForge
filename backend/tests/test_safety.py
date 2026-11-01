"""SAFETY INVARIANTS — first-class tests.

These encode Ayaan's L4-L5 precautions. If any of them fail, the backend
must not ship:
  1. No loaded spinal-flexion or twisting exercise is ever served.
  2. Both-knees-to-chest never appears.
  3. Extension-intolerant profile excludes press-ups / sphinx.
  4. Pain >= 7 yields the flare/relief protocol only.
"""
from datetime import timedelta

from app.engine import live as live_engine
from app.engine import plan as plan_engine
from app.exercises import exclusion_reason, is_loaded
from conftest import AYAAN_ANSWERS, AYAAN_FLAGS, MONDAY, checkin, make_ctx
from app.engine.assessment import score_assessment

TRAP_IDS = {"jeffersoncurl", "russiantwist", "bandedcrunch", "bothkneestochest"}
EXT_IDS = {"pressup", "sphinx"}
RELIEF_IDS = {"kneechest", "figure4", "catcamel", "qlreach"}


def _all_served_ids(lib, client_state_findings):
    """Exercise ids served by every plan day + a sweep of live builds."""
    served = set()
    findings = score_assessment(AYAAN_ANSWERS)
    for offset in range(7):  # a full week of plans
        day = MONDAY + timedelta(days=offset)
        ctx = make_ctx(lib, today=day, findings=findings)
        sess = plan_engine.session_exercises(lib, ctx)
        for it in sess["items"] or []:
            served.add(it["id"])
    for mins in (5, 10, 20, 35, 50):
        for energy in ("great", "ok", "low"):
            for caveats in ([], ["standing"], ["noband"], ["knees"], ["quiet"], ["right"], ["left"]):
                ctx = make_ctx(lib, findings=findings)
                w = live_engine.build_live_workout(lib, ctx, mins, energy, caveats)
                for sec in w["sections"]:
                    for it in sec["items"]:
                        served.add(it["id"])
    return served


# ---------------------------------------------------------- invariant 1
def test_no_loaded_flexion_or_rotation_in_library_allowlist(lib):
    for ex in lib.allowed(AYAAN_FLAGS):
        assert not (
            ex["spinal_load"] in ("flexion", "rotation") and is_loaded(ex)
        ), f"loaded {ex['spinal_load']} served: {ex['id']}"


def test_loaded_traps_excluded_with_reasons(lib):
    by_id = lib.by_id
    for trap in ("jeffersoncurl", "russiantwist", "bandedcrunch"):
        reason = exclusion_reason(by_id[trap], AYAAN_FLAGS)
        assert reason and "loaded spinal" in reason


def test_no_loaded_flexion_or_rotation_ever_served(lib):
    served = _all_served_ids(lib, None)
    assert served, "sweep served nothing — test is broken"
    assert not (served & TRAP_IDS)
    for ex_id in served:
        ex = lib.by_id[ex_id]
        assert not (ex["spinal_load"] in ("flexion", "rotation") and is_loaded(ex))


def test_unloaded_mobility_flexion_still_available(lib):
    """Cat-camel / single knee-to-chest are unloaded mobility — the program
    includes them by design; the invariant bans LOADED flexion only."""
    allowed = lib.allowed_ids(AYAAN_FLAGS)
    assert "catcamel" in allowed and "kneechest" in allowed


# ---------------------------------------------------------- invariant 2
def test_both_knees_to_chest_never_served(lib):
    assert "bothkneestochest" not in lib.allowed_ids(AYAAN_FLAGS)
    assert "bothkneestochest" not in lib.allowed_ids(set())  # banned for everyone
    reason = exclusion_reason(lib.by_id["bothkneestochest"], set())
    assert reason and "both-knees-to-chest" in reason
    assert "bothkneestochest" not in _all_served_ids(lib, None)


def test_both_knees_absent_from_api(client):
    ids = [e["id"] for e in client.get("/exercises").json()["exercises"]]
    assert "bothkneestochest" not in ids


# ---------------------------------------------------------- invariant 3
def test_extension_intolerant_excludes_pressups_and_sphinx(lib):
    allowed = lib.allowed_ids(AYAAN_FLAGS)
    assert not (allowed & EXT_IDS)
    # press-up carries the contra tag; sphinx relies on the spinal_load rule
    assert "contraindicated" in exclusion_reason(lib.by_id["pressup"], AYAAN_FLAGS)
    assert "extension" in exclusion_reason(lib.by_id["sphinx"], AYAAN_FLAGS)


def test_extension_moves_allowed_without_the_profile_flag(lib):
    """The exclusion is profile-driven, not a global ban on the library."""
    allowed = lib.allowed_ids(set())
    assert "pressup" in allowed and "sphinx" in allowed


def test_extension_moves_absent_from_api_default_profile(client):
    ids = [e["id"] for e in client.get("/exercises").json()["exercises"]]
    assert not (set(ids) & EXT_IDS)
    rows = client.get("/exercises", params={"include_excluded": True}).json()["exercises"]
    ext_rows = [r for r in rows if r["id"] in EXT_IDS]
    assert len(ext_rows) == 2 and all("excluded_reason" in r for r in ext_rows)


def test_safe_get_enforces_safety(lib):
    assert lib.safe_get("pressup", AYAAN_FLAGS) is None
    assert lib.safe_get("curlup", AYAAN_FLAGS) is not None


# ---------------------------------------------------------- invariant 4
def test_pain_7_forces_flare_session_only(lib):
    findings = score_assessment(AYAAN_ANSWERS)
    ctx = make_ctx(lib, findings=findings, checkins=[checkin(MONDAY, 8)])
    sess = plan_engine.session_exercises(lib, ctx)
    assert sess["kind"] == "flare"
    assert {it["id"] for it in sess["items"]} == RELIEF_IDS


def test_pain_7_forces_flare_live_workout_only(lib):
    findings = score_assessment(AYAAN_ANSWERS)
    ctx = make_ctx(lib, findings=findings, checkins=[checkin(MONDAY, 9)])
    w = live_engine.build_live_workout(lib, ctx, 35, "ok", [])
    assert w["title"] == "Live — flare protocol"
    assert [s["name"] for s in w["sections"]] == ["Relief"]
    assert {it["id"] for it in w["sections"][0]["items"]} == RELIEF_IDS


def test_energy_flare_forces_relief_even_without_checkin(lib):
    ctx = make_ctx(lib)
    w = live_engine.build_live_workout(lib, ctx, 20, "flare", [])
    assert [s["name"] for s in w["sections"]] == ["Relief"]


def test_pain_6_is_not_a_flare(lib):
    ctx = make_ctx(lib, checkins=[checkin(MONDAY, 6)])
    sess = plan_engine.session_exercises(lib, ctx)
    assert sess["kind"] == "strength"  # micro version, not flare
