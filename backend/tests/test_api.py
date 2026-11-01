"""Endpoint tests — the full API surface over the seed library."""
from conftest import AYAAN_ANSWERS


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["exercises_loaded"] == 32


def test_exercises_default_excludes_unsafe_for_ayaan_profile(client):
    ids = [e["id"] for e in client.get("/exercises").json()["exercises"]]
    for banned in ("pressup", "sphinx", "jeffersoncurl", "russiantwist",
                   "bandedcrunch", "bothkneestochest"):
        assert banned not in ids
    assert "curlup" in ids and "catcamel" in ids


def test_exercises_filters(client):
    core = client.get("/exercises", params={"category": "core"}).json()["exercises"]
    assert core and all(e["category"] == "core" for e in core)
    glute = client.get("/exercises", params={"target": "glute-weak"}).json()["exercises"]
    assert glute and all("glute-weak" in e["targets"] for e in glute)
    banded = client.get("/exercises", params={"equipment": "band"}).json()["exercises"]
    assert banded and all("band" in e["equipment"] for e in banded)
    lvl = client.get("/exercises", params={"level": 1}).json()["exercises"]
    assert lvl and all(e["level"] == 1 for e in lvl)


def test_profile_roundtrip(client):
    p = client.get("/profile").json()
    assert p["extension_intolerant"] is True  # Ayaan's default
    p["hip_ir_deficit_side"] = "left"
    client.put("/profile", json=p)
    assert client.get("/profile").json()["hip_ir_deficit_side"] == "left"


def test_assess_endpoint_scores_and_saves(client):
    r = client.post("/assess", json={"answers": AYAAN_ANSWERS, "date": "2026-11-02"})
    assert r.status_code == 200
    body = r.json()
    assert body["answered_count"] == 13 and body["scorable"] is True
    titles = [f["t"] for f in body["findings"]]
    assert "Extension-intolerant pattern" in titles
    # saved: the plan endpoint now works off the stored findings
    plan = client.post("/plan", json={"date": "2026-11-02"}).json()
    names = [b["name"] for b in plan["foundation"]]
    assert "Hip internal rotation" in names and "Tilt correction" in names


def test_plan_endpoint_week_and_session(client):
    client.post("/assess", json={"answers": AYAAN_ANSWERS, "date": "2026-11-02"})
    plan = client.post("/plan", json={"date": "2026-11-02"}).json()  # a Monday
    assert plan["today_kind"] == "A"
    assert len(plan["week"]) == 7
    assert plan["session"]["title"] == "Strength A — Lower body + pull"
    assert plan["flare"] is False


def test_live_endpoint_and_validation(client):
    client.post("/assess", json={"answers": AYAAN_ANSWERS, "date": "2026-11-02"})
    w = client.post("/workout/live", json={"mins": 20, "date": "2026-11-02"}).json()
    assert [s["name"] for s in w["sections"]] == ["Warm-up", "Main work", "Cool-down"]
    assert client.post("/workout/live", json={"mins": 7}).status_code == 422
    assert client.post("/workout/live", json={"mins": 20, "caveats": ["bogus"]}).status_code == 422
    assert client.post("/workout/live", json={"mins": 20, "energy": "bogus"}).status_code == 422


def test_checkin_then_flare_plan_via_api(client):
    r = client.post("/log/checkin", json={"pain": 8, "where": "leg-r", "sleep": "poor",
                                          "date": "2026-11-02"})
    assert r.json()["flare"] is True
    plan = client.post("/plan", json={"date": "2026-11-02"}).json()
    assert plan["session"]["kind"] == "flare"
    live = client.post("/workout/live", json={"mins": 35, "date": "2026-11-02"}).json()
    assert [s["name"] for s in live["sections"]] == ["Relief"]


def test_session_logging_feeds_progress(client):
    for i in range(3):
        client.post("/log/session", json={"kind": "full", "title": "Strength",
                                          "pain": 2, "date": f"2026-11-0{i + 1}",
                                          "exercise_ids": ["curlup", "birddog"]})
    prog = client.get("/progress", params={"date": "2026-11-03"}).json()
    assert prog["total_sessions"] == 3
    assert prog["streak"] == 3


def test_promote_blocked_until_gate_ready(client):
    r = client.post("/progress/promote")
    assert r.status_code == 409


def test_promote_works_when_gate_ready(client):
    # 5 low-pain check-ins + 8 sessions inside the window ending 2026-11-09
    for i in range(5):
        client.post("/log/checkin", json={"pain": 2, "where": "back", "sleep": "ok",
                                          "date": f"2026-11-0{5 + i}"})
    for i in range(8):
        client.post("/log/session", json={"kind": "full", "title": "S", "pain": 2,
                                          "date": f"2026-11-0{2 + (i % 7)}"})
    prog = client.get("/progress", params={"date": "2026-11-09"}).json()
    assert prog["gate"]["ready"] is True
    # gate is evaluated relative to the promote call's date too
    r = client.post("/progress/promote", params={"date": "2026-11-09"})
    assert r.status_code == 200
    levels = r.json()["band_levels"]
    assert levels["glutebridge"] == 2 and "curlup" not in levels
