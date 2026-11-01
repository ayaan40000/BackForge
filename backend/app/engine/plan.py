"""Plan generator — port of buildFoundation(), STRENGTH/WEEK/weekPlan(),
sessionExercises(), flareActive() and recoveryTune() from index.html.

Exercise references in strength/flare sessions are library ids; every id is
resolved through the safety-filtered Library before it is served — an id
that is missing or excluded for the profile is dropped, never served.
Foundation blocks are name/dose text exactly as the frontend renders them.
"""
from __future__ import annotations

from ..exercises import Library
from .context import Ctx, day_str

# ------------------------------------------------------------------ tuning
def flare_active(ctx: Ctx) -> bool:
    c = ctx.todays_checkin()
    return bool(c) and (c.get("pain") or 0) >= 7


def recovery_tune(ctx: Ctx) -> dict | None:
    c = ctx.todays_checkin()
    if not c:
        return None
    load, note = "Full session", "Check-in looks steady. Full session as planned."
    pain = c.get("pain") or 0
    if pain >= 7:
        load = "Flare day"
        note = (
            "Pain 7+. Today is the relief protocol only — gentle mobility, no strength work. "
            "This is the plan working, not a day off."
        )
    elif pain >= 5:
        load = "Micro + foundation"
        note = "Pain 5–6. Foundation plus the micro version of today’s session. Modify, don’t stop."
    elif c.get("sleep") == "poor":
        load = "Full, minus top set"
        note = "Poor sleep drops tissue tolerance. Keep the session, drop the hardest set."
    return {"load": load, "note": note}


# -------------------------------------------------------------- foundation
def build_foundation(ctx: Ctx) -> list[dict]:
    blocks: list[dict] = []
    ext_bad = ctx.has("Extension-intolerant")
    in_bed = [
        {"t": "Single knee-to-chest", "d": "8 reps alternating, 20-sec holds — never both knees together", "skip": False},
        {"t": "Figure-4 stretch", "d": "30 sec / side", "skip": False},
        {"t": "Prone hip IR rocks", "d": "1 × 10 / side", "skip": False},
    ]
    if not ext_bad:
        in_bed.insert(0, {"t": "Prone lying", "d": "60–90 sec, hips relaxed — skip if it provokes symptoms", "skip": False})
    else:
        in_bed.insert(0, {"t": "Prone lying", "d": "REMOVED — extension-intolerant pattern", "skip": True})
    blocks.append({"name": "In bed, before standing", "mins": 5, "items": in_bed})

    blocks.append({
        "name": "Posture reset",
        "mins": 3,
        "items": [
            {"t": "Chin tuck", "d": "1 × 10 · 5-sec holds", "skip": False},
            {"t": "Doorway chest stretch", "d": "1 × 30 sec", "skip": False},
            {"t": "Wall angel", "d": "1 × 10", "skip": False},
        ],
    })

    clamshell_dose = "1 × 15 / side" + (" — weaker side twice" if ctx.has("Glute inhibition") else "")
    blocks.append({
        "name": "Band activation",
        "mins": 3,
        "items": [
            {"t": "Band pull-apart", "d": "1 × 15", "skip": False},
            {"t": "Glute bridge", "d": "1 × 20", "skip": False},
            {"t": "Banded clamshell", "d": clamshell_dose, "skip": False},
        ],
    })

    if ctx.has("internal rotation deficit") or ctx.has("rotation stiffness"):
        if ctx.has("Right hip internal"):
            side = "right first"
        elif ctx.has("Left hip internal"):
            side = "left first"
        else:
            side = "both sides"
        blocks.append({
            "name": "Hip internal rotation",
            "mins": 3,
            "items": [
                {"t": "90/90 hip switch", "d": "1 × 8 slow, " + side, "skip": False},
                {"t": "Side-lying adductor squeeze", "d": "1 × 10 / side · 5-sec squeeze", "skip": False},
                {"t": "Prone hip IR rocks", "d": "1 × 10 / side", "skip": False},
            ],
        })

    if ctx.has("Anterior pelvic tilt"):
        blocks.append({
            "name": "Tilt correction",
            "mins": 3,
            "items": [
                {"t": "Half-kneeling hip flexor stretch", "d": "45 sec / side — tailbone tucked, glute squeezed", "skip": False},
                {"t": "Dead bug (band-assisted)", "d": "1 × 8 / side, back heavy on the floor", "skip": False},
            ],
        })

    side_plank_dose = "20 sec / side" + (" — weaker side twice" if ctx.has("Lateral endurance gap") else "")
    blocks.append({
        "name": "McGill Big 3 — one round",
        "mins": 5,
        "items": [
            {"t": "Modified curl-up", "d": "1 × 8 · hands under back", "skip": False},
            {"t": "Bird-dog", "d": "1 × 8 / side · 8-sec holds", "skip": False},
            {"t": "Side plank from knees", "d": side_plank_dose, "skip": False},
        ],
    })
    return blocks


# ------------------------------------------------------------------- week
STRENGTH = {
    "A": {
        "name": "Strength A — Lower body + pull",
        "ex": [("glutebridge", "3 × 20"), ("wallsquat", "3 × 12"), ("row", "3 × 12"),
               ("singlebridge", "3 × 12 / side"), ("pallof", "3 × 10 / side")],
    },
    "B": {
        "name": "Strength B — Hinge + scapular",
        "ex": [("hiphinge", "3 × 8 dowel"), ("pullthrough", "3 × 15"), ("facepull", "3 × 15"),
               ("pullapart", "3 × 15"), ("sideplank", "3 × 30 sec / side")],
    },
    "C": {
        "name": "Strength C — Volume + posture",
        "ex": [("sidesteps", "3 × 12 / side"), ("clamshell", "3 × 15 / side"), ("deadbug", "3 × 8 / side"),
               ("chintuck", "3 × 10"), ("march9090", "2 × 8 / side")],
    },
}
WEEK = [("Mon", "A"), ("Tue", "cardio"), ("Wed", "B"), ("Thu", "cardio"),
        ("Fri", "C"), ("Sat", "cardio"), ("Sun", "rest")]

CARDIO_NOTE = (
    "Elliptical 25–30 min at 120–135 bpm, or treadmill 30–35 min at 3.5–4.2 mph, "
    "2–4% incline. Plus the daily foundation below."
)
FLARE_ITEMS = [("kneechest", "8 alternating"), ("figure4", "30 sec / side"),
               ("catcamel", "6 cycles"), ("qlreach", "2 × 8 / side gentle")]


def week_plan() -> list[dict]:
    out = []
    for day, kind in WEEK:
        if kind == "cardio":
            label = "Zone 2 cardio"
        elif kind == "rest":
            label = "Rest — foundation only"
        else:
            label = "Strength " + kind
        out.append({"day": day, "kind": kind, "label": label})
    return out


def today_kind(ctx: Ctx) -> str:
    dow = (ctx.today.weekday())  # Mon=0 — matches the frontend's (getDay()+6)%7
    return WEEK[dow][1]


def _resolve(lib: Library, ctx: Ctx, items: list[tuple[str, str]]) -> list[dict]:
    """Resolve (id, dose) pairs through the safety filter, adding names."""
    out = []
    for ex_id, dose in items:
        ex = lib.safe_get(ex_id, ctx.profile_flags)
        if ex is None:
            continue
        out.append({"id": ex_id, "name": ex["name"], "dose": dose,
                    "band_level": ctx.band_levels.get(ex_id, 1)})
    return out


def session_exercises(lib: Library, ctx: Ctx) -> dict:
    """Port of sessionExercises(): today's session for the given context."""
    kind = today_kind(ctx)
    tune = recovery_tune(ctx)
    if flare_active(ctx):
        return {
            "title": "Flare protocol — Back & Hip Relief",
            "kind": "flare",
            "items": _resolve(lib, ctx, FLARE_ITEMS),
        }
    if kind == "rest":
        return {"title": "Rest day — daily foundation", "kind": "rest", "items": None}
    if kind == "cardio":
        return {"title": "Zone 2 cardio", "kind": "cardio", "items": None, "note": CARDIO_NOTE}
    micro = bool(tune) and "Micro" in tune["load"]
    s = STRENGTH[kind]
    if micro:
        items = [(ex_id, "1 set only") for ex_id, _ in s["ex"][:2]]
    else:
        items = list(s["ex"])
    swapped: list[tuple[str, str]] = []
    for ex_id, dose in items:
        sw = ctx.swaps.get(ex_id)
        if sw and sw.get("date") == day_str(ctx.today) and lib.get(sw.get("to")):
            swapped.append((sw["to"], dose + " · swapped in"))
        else:
            swapped.append((ex_id, dose))
    return {
        "title": s["name"] + (" — MICRO version" if micro else ""),
        "kind": "strength",
        "items": _resolve(lib, ctx, swapped),
    }


def build_plan(lib: Library, ctx: Ctx) -> dict:
    """Full plan payload for POST /plan."""
    return {
        "date": day_str(ctx.today),
        "today_kind": today_kind(ctx),
        "flare": flare_active(ctx),
        "tune": recovery_tune(ctx),
        "week": week_plan(),
        "foundation": build_foundation(ctx),
        "session": session_exercises(lib, ctx),
    }
