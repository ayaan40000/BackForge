"""Exercise library loading + the server-side safety layer.

The library lives at backend/data/exercises.json (schema: id, name, category,
targets, equipment, dose, level, cues, mistakes, regression, progression,
spinal_load, contra). The loader REQUIRES the file — BackForge never serves
a plan from an invented library.

Safety layer (applied to every exercise the API serves, on top of the
frontend's own rules):

1. Loaded spinal flexion or rotation is never served. "Loaded" means a
   strength-category exercise or one using band / mini-band / dumbbell.
   Unloaded bodyweight mobility (cat-camel, single knee-to-chest) stays —
   it is in the program by design.
2. Both-knees-to-chest never appears, in any form.
3. An exercise whose ``contra`` tags intersect the profile's active flags
   is excluded (e.g. press-ups carry "extension-intolerant").
4. For an extension-intolerant profile, anything tagged
   spinal_load="extension" is excluded even if its contra list forgot
   the tag (press-ups / sphinx are the canonical case).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "exercises.json"
ENV_VAR = "BACKFORGE_EXERCISES_PATH"

LOAD_EQUIPMENT = {"band", "mini-band", "dumbbell"}
BAND_EQUIPMENT = {"band", "mini-band"}


def resolve_path(explicit: str | Path | None = None) -> Path:
    if explicit:
        return Path(explicit)
    env = os.environ.get(ENV_VAR)
    if env:
        return Path(env)
    return DEFAULT_PATH


def load_exercises(path: str | Path | None = None) -> list[dict]:
    """Load and minimally validate the exercise library. Raises if absent."""
    p = resolve_path(path)
    if not p.exists():
        raise FileNotFoundError(
            f"Exercise library not found at {p}. BackForge requires "
            "backend/data/exercises.json (see backend/README.md)."
        )
    data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError(f"Exercise library at {p} must be a non-empty JSON list")
    for ex in data:
        for key in ("id", "name", "category", "dose"):
            if key not in ex:
                raise ValueError(f"Exercise {ex.get('id', '?')!r} missing field {key!r}")
        ex.setdefault("targets", [])
        ex.setdefault("equipment", ["none"])
        ex.setdefault("level", 1)
        ex.setdefault("cues", [])
        ex.setdefault("mistakes", [])
        ex.setdefault("regression", "")
        ex.setdefault("progression", "")
        ex.setdefault("spinal_load", "none")
        ex.setdefault("contra", [])
    return data


def is_loaded(ex: dict) -> bool:
    if ex.get("category") == "strength":
        return True
    return bool(set(ex.get("equipment", [])) & LOAD_EQUIPMENT)


def has_band(ex: dict) -> bool:
    return bool(set(ex.get("equipment", [])) & BAND_EQUIPMENT)


_BOTH_KNEES = re.compile(r"(both|double)[-_ ]?knees?", re.IGNORECASE)
_BOTH_KNEES_ID = re.compile(r"^(both|double)knees?tochest$", re.IGNORECASE)


def is_both_knees_to_chest(ex: dict) -> bool:
    name = ex.get("name", "")
    eid = ex.get("id", "")
    if _BOTH_KNEES.search(name) and "chest" in name.lower():
        return True
    if _BOTH_KNEES_ID.match(eid.replace("-", "").replace("_", "")):
        return True
    return False


def exclusion_reason(ex: dict, profile_flags: set[str]) -> str | None:
    """None if the exercise may be served, else why it is excluded."""
    if is_both_knees_to_chest(ex):
        return "both-knees-to-chest is banned in this program"
    load = ex.get("spinal_load", "none")
    if load in ("flexion", "rotation") and is_loaded(ex):
        return f"loaded spinal {load} is never served"
    contra_hit = set(ex.get("contra", [])) & set(profile_flags)
    if contra_hit:
        return "contraindicated for profile: " + ", ".join(sorted(contra_hit))
    if "extension-intolerant" in profile_flags and load == "extension":
        return "spinal extension excluded for extension-intolerant profile"
    return None


class Library:
    """Indexed, safety-filtered view over the raw exercise list."""

    def __init__(self, exercises: list[dict]):
        self.all = exercises
        self.by_id = {e["id"]: e for e in exercises}

    def get(self, ex_id: str) -> dict | None:
        return self.by_id.get(ex_id)

    def allowed(self, profile_flags: set[str]) -> list[dict]:
        return [e for e in self.all if exclusion_reason(e, profile_flags) is None]

    def allowed_ids(self, profile_flags: set[str]) -> set[str]:
        return {e["id"] for e in self.allowed(profile_flags)}

    def safe_get(self, ex_id: str, profile_flags: set[str]) -> dict | None:
        """Library lookup that also enforces the safety layer."""
        ex = self.by_id.get(ex_id)
        if ex is None or exclusion_reason(ex, profile_flags) is not None:
            return None
        return ex
