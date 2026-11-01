"""Live workout builder — port of buildLiveWorkout(), correctivePool(),
applyCaveats(), estMins(), parseDose() and derivedEnergy() from index.html.

Inputs: time budget (5/10/20/35/50 min), energy (great/ok/low/flare) and
caveats (standing, right, left, knees, noband, quiet). Output: warm-up /
main / cool-down sections plus plain-language reasons. Every exercise is
resolved through the safety-filtered Library before it is served.

Deviation from the frontend: reason strings are returned without the
<b>…</b> markup the UI used for emphasis (same words, no HTML).
"""
from __future__ import annotations

import re

from ..exercises import Library, has_band
from .context import Ctx, day_str
from .plan import FLARE_ITEMS, STRENGTH, recovery_tune, session_exercises
from .progress import streak

LIVE_WARM = ["catcamel", "kneechest", "figure4", "chintuck", "hipflexorstretch"]
LIVE_COOL = ["hipflexorstretch", "figure4", "qlreach", "kneechest", "chintuck"]

CAVEATS = {"standing", "right", "left", "knees", "noband", "quiet"}
ENERGIES = {"great", "ok", "low", "flare"}


# --------------------------------------------------------------- dose math
_SETS_RE = re.compile(r"(\d+)\s*×")
_HOLD_RANGE_RE = re.compile(r"(\d+)[–-](\d+)\s*sec")
_HOLD_RE = re.compile(r"(\d+)\s*sec")


def parse_dose(d: str) -> dict:
    """{sets, perSide, hold} — sets capped at 3, holds under 8s ignored."""
    sets = 1
    m = _SETS_RE.search(d)
    if m:
        sets = min(3, int(m.group(1)))
    hold = None
    hm = _HOLD_RANGE_RE.search(d) or _HOLD_RE.search(d)
    if hm:
        hold = int(hm.group(2) if hm.lastindex and hm.lastindex >= 2 else hm.group(1))
    if hold is not None and hold < 8:
        hold = None
    return {"sets": sets, "perSide": "/ side" in d, "hold": hold}


def est_mins(dose: str) -> float:
    p = parse_dose(dose)
    per = (p["hold"] + 20) if p["hold"] else 45
    return p["sets"] * (2 if p["perSide"] else 1) * per / 60 + 0.4


def _cap_sets(dose: str, max_sets: int) -> str:
    def repl(m: re.Match) -> str:
        return f"{min(int(m.group(1)), max_sets)} ×"

    return _SETS_RE.sub(repl, dose, count=1)


# ----------------------------------------------------------------- energy
def derived_energy(ctx: Ctx) -> str:
    c = ctx.todays_checkin()
    if c:
        pain = c.get("pain") or 0
        if pain >= 7:
            return "flare"
        if pain >= 5 or c.get("sleep") == "poor":
            return "low"
        return "ok"
    return "ok"


# -------------------------------------------------------------- correctives
def corrective_pool(ctx: Ctx) -> list[str]:
    out: list[str] = []

    def push(ids):
        for i in ids:
            if i not in out:
                out.append(i)

    if ctx.has("internal rotation deficit") or ctx.has("rotation stiffness") or ctx.has("internal rotation limited"):
        push(["proneir", "hipir9090", "adductorsqueeze"])
    if ctx.has("Anterior pelvic tilt"):
        push(["hipflexorstretch", "deadbug"])
    if ctx.has("Glute inhibition"):
        push(["clamshell", "sidesteps"])
    if ctx.has("Lateral endurance gap"):
        push(["sideplank", "qlreach"])
    if ctx.has("Forward-head") or ctx.has("Rounded shoulders"):
        push(["facepull", "pullapart", "wallangel", "chintuck"])
    if ctx.has("Guarding"):
        push(["singlebridge"])
    if not out:
        push(["clamshell", "hipir9090"])
    return out


# ---------------------------------------------------------------- caveats
def apply_caveats(lib: Library, ctx: Ctx, items: list[dict], caveats: list[str], energy: str):
    """Returns (items, notes). Items are {id, dose[, note]} dicts."""
    notes: list[str] = []
    out = [dict(it) for it in items]

    def drop(ids, why):
        nonlocal out
        before = len(out)
        out = [it for it in out if it["id"] not in ids]
        if len(out) < before:
            notes.append(why)

    if "standing" in caveats:
        drop(["sidesteps", "march9090", "wallsquat", "pullthrough"],
             "Floor-based today — standing work is out, per your caveat.")
    if "knees" in caveats:
        drop(["wallsquat"], "Wall squats dropped — knees are sore.")
        if not any(it["id"] == "glutebridge" for it in out):
            gb = lib.safe_get("glutebridge", ctx.profile_flags)
            if gb:
                out.append({"id": "glutebridge", "dose": gb["dose"]})
    if "quiet" in caveats:
        drop(["pullthrough", "wallsquat"],
             "Low-key picks only today — nothing that needs space or noise.")
    if "noband" in caveats:
        removed = [it for it in out if (lib.get(it["id"]) and has_band(lib.get(it["id"])))]
        out = [it for it in out if it not in removed]
        for r in removed:
            rex = lib.get(r["id"])
            alt = None
            for cand in lib.all:
                if has_band(cand) or cand["id"] == r["id"]:
                    continue
                if not any(t in cand.get("targets", []) for t in rex.get("targets", [])):
                    continue
                if any(it["id"] == cand["id"] for it in out):
                    continue
                if lib.safe_get(cand["id"], ctx.profile_flags) is None:
                    continue
                alt = cand
                break
            if alt:
                out.append({"id": alt["id"], "dose": alt["dose"]})
        if removed:
            notes.append(
                f"No bands: swapped {len(removed)} band move{'s' if len(removed) > 1 else ''} "
                "for bodyweight equivalents."
            )
    if energy == "low":
        out = [{**it, "dose": _cap_sets(it["dose"], 2)} for it in out]
        notes.append("Low energy: sets capped at 2. Finishing small beats skipping entirely.")
    for sd in ("right", "left"):
        if sd in caveats:
            new_out = []
            for it in out:
                if "/ side" in it["dose"]:
                    new_out.append({**it, "dose": _cap_sets(it["dose"], 2),
                                    "note": f"Easy dose — {sd} side is touchy today"})
                else:
                    new_out.append(it)
            out = new_out
            notes.append(f"Gentle dosing on the {sd} side, per your caveat. The other side still works.")
    return out, notes


# ----------------------------------------------------------------- builder
def _last_done_map(ctx: Ctx) -> dict:
    m: dict[str, str] = {}
    for x in ctx.ex_log:
        if x.get("id") not in m or x.get("date", "") > m[x["id"]]:
            m[x["id"]] = x.get("date")
    return m


def _days_ago(ctx: Ctx, ds) -> int | None:
    if not ds:
        return None
    from .context import parse_day

    return (ctx.today - parse_day(ds)).days


def _named(lib: Library, ctx: Ctx, items: list[dict]) -> list[dict]:
    out = []
    for it in items:
        ex = lib.safe_get(it["id"], ctx.profile_flags)
        if ex is None:
            continue
        row = {"id": it["id"], "name": ex["name"], "dose": it["dose"],
               "band_level": ctx.band_levels.get(it["id"], 1)}
        if it.get("note"):
            row["note"] = it["note"]
        out.append(row)
    return out


def build_live_workout(lib: Library, ctx: Ctx, mins: int, energy: str, caveats: list[str]) -> dict:
    from .plan import flare_active

    if flare_active(ctx) or energy == "flare":
        items = _named(lib, ctx, [{"id": i, "dose": d} for i, d in FLARE_ITEMS])
        return {
            "title": "Live — flare protocol",
            "est": 8,
            "reasons": [
                "Pain is at flare level, so today is the relief protocol only. "
                "This is the plan working — not a day off, and it still protects the streak."
            ],
            "sections": [{"name": "Relief", "tag": "cool", "items": items}],
        }

    s = session_exercises(lib, ctx)
    if s["items"]:
        main = [{"id": it["id"], "dose": it["dose"]} for it in s["items"]]
    else:
        letter = ["A", "B", "C"][(ctx.today.weekday()) % 3]
        main = [{"id": ex_id, "dose": dose} for ex_id, dose in STRENGTH[letter]["ex"][:3]]
        for ex_id in ("curlup", "birddog", "sideplank"):
            ex = lib.get(ex_id)
            if ex:
                main.append({"id": ex_id, "dose": ex["dose"]})

    corr = []
    for ex_id in corrective_pool(ctx):
        ex = lib.get(ex_id)
        if ex:
            corr.append({"id": ex_id, "dose": ex["dose"]})

    warm_n = 3 if mins >= 35 else 2
    warm = [{"id": i, "dose": lib.get(i)["dose"]} for i in LIVE_WARM[:warm_n] if lib.get(i)]
    warm_ids = {w["id"] for w in warm}
    cool = [{"id": i, "dose": lib.get(i)["dose"]} for i in LIVE_COOL if i not in warm_ids]
    cool = cool[:2]

    mixed: list[dict] = []
    for i in range(max(len(main), len(corr))):
        if i < len(main):
            mixed.append(main[i])
        if i < len(corr):
            mixed.append(corr[i])
    seen: set[str] = set()
    dedup = []
    for it in mixed:
        if it["id"] not in seen:
            seen.add(it["id"])
            dedup.append(it)

    cv_items, cv_notes = apply_caveats(lib, ctx, dedup, caveats, energy)
    warm, warm_notes = apply_caveats(lib, ctx, warm, caveats, energy)
    cool, cool_notes = apply_caveats(lib, ctx, cool, caveats, energy)

    fixed_est = sum(est_mins(it["dose"]) for it in warm + cool)
    if mins <= 6:
        chosen = cv_items[:2]
        warm = warm[:1]
        cool = cool[:1]
    else:
        chosen = []
        acc = fixed_est
        for it in cv_items:
            e = est_mins(it["dose"])
            if acc + e > mins and len(chosen) >= 3:
                break
            chosen.append(it)
            acc += e

    # ---- reasons ---------------------------------------------------------
    reasons: list[str] = []
    if s["kind"] == "strength":
        shape = s["title"]
    elif s["kind"] == "cardio":
        shape = "Zone 2 day — strength sampler added"
    else:
        shape = "rest day — foundation strength"
    reasons.append(f"Built for a {shape} shape, sized to {mins} minutes.")

    actionable = [f for f in ctx.findings if f.get("sev") != "ok"]
    if actionable:
        def key_of(title: str) -> str:
            fl = title.lower()
            if "rotation" in fl:
                return "hip-ir"
            if "glute" in fl:
                return "glute-weak"
            if "tilt" in fl:
                return "apt"
            if "lateral" in fl:
                return "lateral-gap"
            if "head" in fl or "shoulder" in fl:
                return "upper-crossed"
            return ""

        f0 = actionable[0]
        hit = None
        for cand in actionable:
            k = key_of(cand["t"])
            if not k:
                continue
            h = next(
                (it for it in chosen
                 if lib.get(it["id"]) and k in lib.get(it["id"]).get("targets", [])),
                None,
            )
            if h:
                f0, hit = cand, h
                break
        sev_word = "Priority" if f0.get("sev") == "high" else "Watch"
        txt = f"{f0['t']} is a {sev_word} finding from your assessment"
        if hit:
            txt += f" — {lib.get(hit['id'])['name']} in this session targets it directly."
        else:
            txt += "."
        reasons.append(txt)
    else:
        reasons.append("Starter mix — take the assessment and this rebuilds itself around your findings.")

    last_map = _last_done_map(ctx)
    if chosen:
        scored = sorted(
            ({"it": it, "d": _days_ago(ctx, last_map.get(it["id"]))} for it in chosen),
            key=lambda x: 999 if x["d"] is None else x["d"],
            reverse=True,
        )
        due = scored[0]
        ex = lib.get(due["it"]["id"])
        if ex:
            if due["d"] is None:
                reasons.append(f"{ex['name']} is new to your log — first reps are the ones that teach the pattern.")
            else:
                reasons.append(
                    f"You last did {ex['name']} {due['d']} day{'s' if due['d'] != 1 else ''} ago — it was due."
                )

    tune = recovery_tune(ctx)
    if tune:
        reasons.append(f"Today's check-in set the load: {tune['load']}.")
    for n in cv_notes + warm_notes + cool_notes:
        reasons.append(n)
    st = streak(ctx)
    if st > 0:
        reasons.append(f"Day {st + 1} of your streak is decided in the next {mins} minutes.")

    est = round(sum(est_mins(it["dose"]) for it in warm + chosen + cool))
    return {
        "title": f"Live workout — {mins} min",
        "est": est,
        "reasons": reasons,
        "sections": [
            {"name": "Warm-up", "tag": "warm", "items": _named(lib, ctx, warm)},
            {"name": "Main work", "tag": "", "items": _named(lib, ctx, chosen)},
            {"name": "Cool-down", "tag": "cool", "items": _named(lib, ctx, cool)},
        ],
    }
