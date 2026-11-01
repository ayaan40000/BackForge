"""Assessment engine — faithful port of scoreAssessment() in index.html.

13 tests; answers arrive in the frontend's shape:
  opts tests:   answers[test_id] = option value ('skip' = skipped)
  sides tests:  answers[test_id + '_L' / '_R'] = option value
  nums test:    answers['sideplanksec_L' / '_R'] = seconds (string or number)

Skipped or missing answers produce NO data and NO finding — never a
phantom result. The frontend only offers scoring at >= 6 answered tests;
the API reports answered_count + scorable and lets the caller decide.
"""
from __future__ import annotations

# id -> kind (opts | sides | nums), in the frontend's order
TESTS: list[tuple[str, str]] = [
    ("dirbend", "opts"),
    ("dirext", "opts"),
    ("firing", "sides"),
    ("slbridge", "sides"),
    ("clamfeel", "sides"),
    ("thomas", "sides"),
    ("pelvis", "opts"),
    ("slr", "opts"),
    ("hipir", "sides"),
    ("switch9090", "opts"),
    ("sideplanksec", "nums"),
    ("posturewall", "opts"),
    ("guard", "opts"),
]

MIN_ANSWERED_TO_SCORE = 6


def _answered(answers: dict, key: str) -> bool:
    v = answers.get(key)
    return v is not None and v != ""


def answered_count(answers: dict) -> int:
    n = 0
    for tid, kind in TESTS:
        if kind == "opts" and _answered(answers, tid):
            n += 1
        elif kind == "sides" and _answered(answers, tid + "_L") and _answered(answers, tid + "_R"):
            n += 1
        elif kind == "nums" and (_answered(answers, tid + "_L") or _answered(answers, tid + "_R")):
            n += 1
    return n


def _opt(answers: dict, key: str):
    """Option value with the frontend's 'skip' -> null rule."""
    v = answers.get(key)
    if v is None or v == "skip":
        return None
    return v


def _js_float(v) -> float | None:
    """parseFloat() semantics: unparseable / missing -> None (NaN in JS)."""
    if v is None or v == "":
        return None
    try:
        return float(str(v))
    except (TypeError, ValueError):
        return None


def _ir_score(v) -> int:
    return {"full": 3, "mid": 2, "low": 1}.get(v, 0)


def score_assessment(answers: dict) -> list[dict]:
    """Return findings as [{sev, t, d, fix}] in the frontend's order."""
    # 'skip' means NO DATA. The frontend stores the string 'skip', which is
    # truthy in JS — its glute-ok branch can therefore fire a phantom
    # "Glutes are firing" when every glute test was skipped. The port cleans
    # 'skip' to absent before any check (invariant: skipped = no findings).
    A = {k: (None if v == "skip" else v) for k, v in answers.items()}
    F: list[dict] = []

    def add(sev, t, d, fix):
        F.append({"sev": sev, "t": t, "d": d, "fix": fix})

    # ---- Direction ------------------------------------------------------
    bend = _opt(A, "dirbend")
    ext = _opt(A, "dirext")
    if ext == "worse" and bend != "worse":
        add(
            "high",
            "Extension-intolerant pattern",
            "Standing extension provokes symptoms while flexion does not. Press-ups and prone lying are OUT; hip thrusts and deadlifts must finish with glutes, never a low-back arch.",
            "Plan removes: press-ups, prone lying. Adds: ribs-down bracing cues everywhere.",
        )
    elif bend == "worse" and ext != "worse":
        add(
            "high",
            "Flexion-intolerant pattern",
            "Forward bending provokes symptoms. Loaded spinal flexion is banned (it already is here) and hinge range stays above your cutoff.",
            "Plan caps hinge range; McGill curl-up stays modified with hands under the back.",
        )
    elif bend == "worse" and ext == "worse":
        add(
            "high",
            "Both directions provoke",
            "Both flexion and extension worsen symptoms — keep everything in the neutral middle and raise this with your physio before progressing load.",
            "Neutral-spine only; micro versions until retest.",
        )
    elif bend and ext:
        add(
            "ok",
            "Direction-neutral (for now)",
            "Neither direction clearly provokes. Proceed with the balanced program and retest in 4 weeks.",
            "Standard plan.",
        )

    # ---- Glutes ---------------------------------------------------------
    weak_sides: list[str] = []
    for sd in ("L", "R"):
        f = A.get("firing_" + sd)
        b = A.get("slbridge_" + sd)
        c = A.get("clamfeel_" + sd)
        hits = 0
        if f in ("ham", "back"):
            hits += 1
        if b in ("cramp", "drop"):
            hits += 1
        if c == "tfl":
            hits += 1
        if hits >= 2:
            weak_sides.append(sd)
    if weak_sides:
        side_txt = " & ".join("left" if s == "L" else "right" for s in weak_sides)
        add(
            "high",
            "Glute inhibition — worse on the " + side_txt + " side",
            "Two or more glute tests show compensation: hamstrings or low back firing first, cramping, or TFL taking over. Your back is doing your glutes’ job.",
            "Daily band activation block; extra set on the weaker side; hamstring loading stays gentle until firing cleans up.",
        )
    elif (A.get("firing_L") or A.get("slbridge_L")) and (A.get("firing_R") or A.get("slbridge_R")):
        add(
            "ok",
            "Glutes are firing",
            "Firing order and bridge holds look clean. Progress loading as programmed.",
            "Standard progression.",
        )

    # ---- Hip flexors / APT ----------------------------------------------
    th_l, th_r = A.get("thomas_L"), A.get("thomas_R")
    if (
        th_l in ("lifted", "lifted-ext")
        or th_r in ("lifted", "lifted-ext")
        or A.get("pelvis") == "apt"
    ):
        add(
            "high",
            "Anterior pelvic tilt pattern (lower-crossed)",
            "Tight hip flexors pull the pelvis forward while inhibited glutes and deep core fail to hold it level — a deep low-back arch and a spine that absorbs what the hips should.",
            "Daily: hip flexor stretch + dead bug + glute bridge. Desk rule: stand every 30–40 min.",
        )
    elif A.get("pelvis") and A.get("pelvis") != "unsure":
        add(
            "ok",
            "Pelvic position looks neutral",
            "No clear tilt pattern on self-check.",
            "Maintenance mobility only.",
        )

    # ---- Hamstrings -------------------------------------------------------
    if A.get("slr") == "gap":
        add(
            "mod",
            "Hamstring control gap — not shortness",
            "Passive range far exceeds active range. These hamstrings are firing protectively; aggressive stretching would make it worse. Strength and safety signals fix this.",
            "No aggressive hamstring stretching anywhere in your plan.",
        )
    if A.get("slr") == "nerve":
        add(
            "high",
            "Nerve tension sign on leg raise",
            "A sharp/electric tug is nerve, not muscle. Do not stretch into it; nerve work stays at a mild tug that fades within 10 seconds.",
            "Flossing intensity capped; flag to physio if it persists.",
        )
    if A.get("slr") == "equal":
        add(
            "ok",
            "Hamstrings genuinely short-ish",
            "Active and passive match with a firm stretch — gentle sustained stretching is reasonable.",
            "Standard mobility dose.",
        )

    # ---- Hip internal rotation -------------------------------------------
    ir_l = _opt(A, "hipir_L")
    ir_r = _opt(A, "hipir_R")
    if (ir_l and ir_r) or ((ir_l or ir_r) and (_ir_score(ir_l) == 1 or _ir_score(ir_r) == 1)):
        if (not ir_l or not ir_r) and (_ir_score(ir_l) == 1 or _ir_score(ir_r) == 1):
            add(
                "mod",
                "Hip internal rotation limited on the tested side",
                "The tested hip barely rotates inward. Complete the other side at the next sitting to check symmetry.",
                "Prone IR rocks + 90/90 switches daily.",
            )
        elif _ir_score(ir_r) > 0 and _ir_score(ir_r) < _ir_score(ir_l):
            add(
                "high",
                "Right hip internal rotation deficit",
                "The right hip barely rotates inward compared with the left — the same side as right-sided symptoms. A stiff hip forces the lumbar spine to rotate in its place during gait.",
                "Daily IR block, right side first and doubled: prone IR rocks, 90/90 switches, adductor squeeze. Physio should assess the right hip capsule.",
            )
        elif _ir_score(ir_l) > 0 and _ir_score(ir_l) < _ir_score(ir_r):
            add(
                "high",
                "Left hip internal rotation deficit",
                "The left hip rotates inward less than the right. A stiff hip forces the lumbar spine to rotate in its place.",
                "Daily IR block, left side first and doubled.",
            )
        elif _ir_score(ir_l) == 1 or _ir_score(ir_r) == 1:
            add(
                "mod",
                "Hip internal rotation limited both sides",
                "Both hips are short on inward rotation. Daily mobility dose, no forcing.",
                "90/90 switches daily.",
            )
        else:
            add(
                "ok",
                "Hip rotation balanced",
                "IR looks symmetric. Maintain with 90/90 work twice a week.",
                "Maintenance dose.",
            )
    if A.get("switch9090") in ("r-stuck", "l-stuck", "both"):
        add(
            "mod",
            "90/90 switch confirms rotation stiffness",
            "The seated switch agrees with the prone test — rotation work stays daily until the retest.",
            "See hip IR block.",
        )

    # ---- Side plank endurance ---------------------------------------------
    sp_l = _js_float(A.get("sideplanksec_L"))
    sp_r = _js_float(A.get("sideplanksec_R"))
    if sp_l is not None and sp_r is not None and sp_l > 0 and sp_r > 0:
        ratio = abs(sp_l - sp_r) / max(sp_l, sp_r)
        if ratio > 0.10:
            add(
                "mod",
                f"Lateral endurance gap ({round(sp_l)}s vs {round(sp_r)}s)",
                "Side-bridge sides differ by more than McGill’s ~10% guide. The weaker side gets an extra set until they converge.",
                "Extra side-plank set on the weaker side.",
            )
        else:
            add(
                "ok",
                "Lateral endurance balanced",
                "Sides within 10% of each other.",
                "Standard Big 3 dosing.",
            )
        if min(sp_l, sp_r) < 20:
            add(
                "mod",
                "Core endurance is low overall",
                "Both sides under 20 seconds from the knees. Endurance — not max strength — is the first rebuild target.",
                "Big 3 in 10-second exposures, more sets, never to form failure.",
            )

    # ---- Posture ------------------------------------------------------------
    if A.get("posturewall") in ("nohead", "both"):
        add(
            "mod",
            "Forward-head posture",
            "The head cannot reach the wall without strain — deep neck flexors are asleep and the neck extensors are overworking.",
            "Chin tucks daily; monitor top at eye level.",
        )
    if A.get("posturewall") in ("shoulders", "both"):
        add(
            "mod",
            "Rounded shoulders (upper-crossed)",
            "Tight chest, weak scapular stabilizers. Rows, face pulls and pull-aparts are the counter — all band work, already in your plan.",
            "Upper-body band block 3×/week.",
        )

    # ---- Guarding -------------------------------------------------------------
    if A.get("guard") == "left":
        add(
            "mod",
            "Guarding: you shift LEFT when bending",
            "You offload the right side — protective today, overloading the left side over time. The plan adds right-side single-leg work so the right side relearns trust.",
            "Extra right-side bridge set; conscious even loading on hinges.",
        )
    if A.get("guard") == "right":
        add(
            "mod",
            "Guarding: you shift RIGHT when bending",
            "You offload the left side. The plan adds left-side single-leg work to rebalance.",
            "Extra left-side bridge set.",
        )

    return F
