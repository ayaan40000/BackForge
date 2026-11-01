"""State export/import — the backforge_v1 localStorage shape round-trips."""
from app.state import default_state, export_state, import_state

FRONTEND_STATE = {
    "v": 1,
    "answers": {"dirbend": "better", "dirext": "worse"},
    "results": [{"sev": "high", "t": "Extension-intolerant pattern", "d": "d", "fix": "f"}],
    "assessHistory": [{"date": "2026-10-26", "flags": ["Extension-intolerant pattern"]}],
    "log": [
        {"date": "2026-11-01", "kind": "full", "title": "Strength A", "pain": 2},
        {"date": "2026-11-02", "kind": "micro", "title": "Micro session", "pain": None},
    ],
    "checkins": [
        {"date": "2026-11-01", "pain": 3, "where": "back", "sleep": "ok"},
        {"date": "2026-11-02", "pain": 2, "where": "leg-r", "sleep": "great"},
    ],
    "bandLevel": {"glutebridge": 2, "clamshell": 3},
    "swaps": {"row": {"to": "facepull", "date": "2026-11-02"}},
    "player": None,
    "reminder": {"on": True, "time": "19:00"},
    "livePrefs": {"mins": 20, "energy": None, "caveats": [], "touched": "2026-11-02"},
    "exLog": [{"date": "2026-11-01", "id": "curlup"}, {"date": "2026-11-02", "id": "birddog"}],
    "livePlayer": None,
}


def test_empty_db_exports_default_shape(db):
    out = export_state(db)
    assert out == default_state()
    assert set(out.keys()) == {
        "v", "answers", "results", "assessHistory", "log", "checkins",
        "bandLevel", "swaps", "player", "reminder", "livePrefs", "exLog", "livePlayer",
    }


def test_import_export_roundtrip(db):
    import_state(db, FRONTEND_STATE)
    out = export_state(db)
    for key in FRONTEND_STATE:
        assert out[key] == FRONTEND_STATE[key], key


def test_import_rejects_wrong_version(db):
    import pytest

    with pytest.raises(ValueError):
        import_state(db, {"v": 2})


def test_import_preserves_profile(db):
    from app.models import Profile
    from app.state import get_profile, set_profile

    set_profile(db, Profile(hip_ir_deficit_side="left"))
    import_state(db, FRONTEND_STATE)
    assert get_profile(db).hip_ir_deficit_side == "left"


def test_state_endpoints_roundtrip(client):
    r = client.post("/state/import", json={"state": FRONTEND_STATE})
    assert r.status_code == 200
    out = client.get("/state/export").json()
    for key in FRONTEND_STATE:
        assert out[key] == FRONTEND_STATE[key], key
    # imported findings drive the plan (extension-intolerant -> prone lying out)
    plan = client.post("/plan", json={"date": "2026-11-02"}).json()
    assert plan["foundation"][0]["items"][0]["skip"] is True
    # imported check-ins drive progress
    prog = client.get("/progress", params={"date": "2026-11-02"}).json()
    assert prog["pain_trend"][-1] == {"date": "2026-11-02", "pain": 2}
    assert prog["total_sessions"] == 2
