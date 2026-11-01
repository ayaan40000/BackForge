"""State assembly: DB <-> the frontend's localStorage object (backforge_v1).

Export reproduces the exact shape load() in index.html expects:
{v:1, answers, results, assessHistory, log, checkins, bandLevel, swaps,
 player, reminder, livePrefs, exLog, livePlayer}
Import accepts that shape and writes it back into the tables/kv.
The user profile is server-side only and is NOT part of the export.
"""
from __future__ import annotations

from .db import DB
from .engine.context import Ctx, parse_day
from .models import Profile

# kv keys that are plain frontend state
_KV_KEYS = ("answers", "results", "assessHistory", "bandLevel", "swaps",
            "player", "reminder", "livePrefs", "livePlayer")


def default_state() -> dict:
    return {
        "v": 1,
        "answers": {},
        "results": None,
        "assessHistory": [],
        "log": [],
        "checkins": [],
        "bandLevel": {},
        "swaps": {},
        "player": None,
        "reminder": None,
        "livePrefs": None,
        "exLog": [],
        "livePlayer": None,
    }


def get_profile(db: DB) -> Profile:
    raw = db.kv_get("profile")
    if raw:
        return Profile(**raw)
    return Profile()


def set_profile(db: DB, profile: Profile) -> None:
    db.kv_set("profile", profile.model_dump())


def export_state(db: DB) -> dict:
    state = default_state()
    for key in _KV_KEYS:
        value = db.kv_get(key)
        if value is not None:
            state[key] = value
    state["log"] = db.sessions()
    state["checkins"] = db.checkins()
    state["exLog"] = db.ex_log()
    return state


def import_state(db: DB, state: dict) -> dict:
    if state.get("v", 1) != 1:
        raise ValueError("Unsupported state version (expected backforge_v1 shape)")
    # preserve the server-side profile across an import (read before wipe)
    profile = db.kv_get("profile")
    db.wipe()
    for key in _KV_KEYS:
        if key in state and state[key] is not None:
            db.kv_set(key, state[key])
    if profile is not None:
        db.kv_set("profile", profile)
    for c in state.get("checkins", []):
        db.upsert_checkin(c["date"], int(c["pain"]), c.get("where"), c.get("sleep"))
    for s in state.get("log", []):
        db.add_session(s["date"], s.get("kind", "full"), s.get("title", ""), s.get("pain"), [])
    for x in state.get("exLog", []):
        db.conn.execute(
            "INSERT INTO ex_log (date, exercise_id) VALUES (?, ?)", (x["date"], x["id"])
        )
    db.conn.commit()
    return export_state(db)


def profile_flags_for(db: DB, profile: Profile | None, findings: list[dict] | None) -> set[str]:
    """Contra flags = profile flags + flags implied by current findings.

    The frontend removes press-ups whenever the extension-intolerant finding
    is present; mirror that by deriving the flag from finding titles too.
    """
    flags = set((profile or get_profile(db)).active_flags())
    for f in findings or []:
        t = f.get("t", "")
        if "Extension-intolerant" in t:
            flags.add("extension-intolerant")
        if "Flexion-intolerant" in t:
            flags.add("flexion-intolerant")
    return flags


def build_ctx(
    db: DB,
    *,
    today: str | None = None,
    findings: list[dict] | None = None,
    profile: Profile | None = None,
    checkin_override: dict | None = None,
    swaps_override: dict | None = None,
) -> Ctx:
    """Assemble an engine Ctx from stored state plus per-request overrides."""
    state_findings = findings
    if state_findings is None:
        state_findings = db.kv_get("results") or []
    checkins = db.checkins()
    if checkin_override:
        day = checkin_override["date"]
        checkins = [c for c in checkins if c["date"] != day] + [checkin_override]
        checkins.sort(key=lambda c: c["date"])
    return Ctx(
        today=parse_day(today),
        findings=[dict(f) for f in state_findings],
        checkins=checkins,
        log=db.sessions(),
        ex_log=db.ex_log(),
        swaps=swaps_override if swaps_override is not None else (db.kv_get("swaps") or {}),
        band_levels=db.kv_get("bandLevel") or {},
        profile_flags=profile_flags_for(db, profile, state_findings),
    )
