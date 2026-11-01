"""Assessment engine tests — scoring fidelity + invariant 6:
skipped answers produce NO findings, never phantom results."""
from app.engine.assessment import answered_count, score_assessment
from conftest import AYAAN_ANSWERS


def titles(findings):
    return [f["t"] for f in findings]


# ---------------------------------------------------------- invariant 6
def test_empty_answers_produce_no_findings():
    assert score_assessment({}) == []


def test_all_skipped_produce_no_findings():
    answers = {
        "dirbend": "skip", "dirext": "skip",
        "firing_L": "skip", "firing_R": "skip",
        "slbridge_L": "skip", "slbridge_R": "skip",
        "clamfeel_L": "skip", "clamfeel_R": "skip",
        "thomas_L": "skip", "thomas_R": "skip",
        "hipir_L": "skip", "hipir_R": "skip",
        "switch9090": "skip", "posturewall": "skip",
    }
    assert score_assessment(answers) == []


def test_single_answered_test_yields_only_its_finding():
    findings = score_assessment({"guard": "left"})
    assert titles(findings) == ["Guarding: you shift LEFT when bending"]


def test_one_sided_ir_low_reports_tested_side_only():
    findings = score_assessment({"hipir_R": "low"})
    assert titles(findings) == ["Hip internal rotation limited on the tested side"]


def test_one_sided_ir_full_reports_nothing():
    assert score_assessment({"hipir_L": "full"}) == []


def test_direction_needs_both_screens_for_neutral_ok():
    # only one direction answered -> no direction finding at all (frontend rule)
    assert score_assessment({"dirbend": "better"}) == []
    findings = score_assessment({"dirbend": "better", "dirext": "same"})
    assert titles(findings) == ["Direction-neutral (for now)"]


# ------------------------------------------------------------- Ayaan case
def test_ayaan_profile_scores_expected_findings():
    findings = score_assessment(AYAAN_ANSWERS)
    t = titles(findings)
    assert "Extension-intolerant pattern" in t
    assert "Glute inhibition — worse on the right side" in t
    assert "Anterior pelvic tilt pattern (lower-crossed)" in t
    assert "Hamstring control gap — not shortness" in t
    assert "Right hip internal rotation deficit" in t
    assert "90/90 switch confirms rotation stiffness" in t
    assert "Lateral endurance gap (35s vs 25s)" in t
    assert "Forward-head posture" in t
    assert "Rounded shoulders (upper-crossed)" in t
    assert "Guarding: you shift LEFT when bending" in t
    # severity sanity: the dangerous patterns are 'high'
    sev = {f["t"]: f["sev"] for f in findings}
    assert sev["Extension-intolerant pattern"] == "high"
    assert sev["Right hip internal rotation deficit"] == "high"


def test_flexion_intolerant_branch():
    findings = score_assessment({"dirbend": "worse", "dirext": "better"})
    assert titles(findings) == ["Flexion-intolerant pattern"]


def test_both_directions_provoke_branch():
    findings = score_assessment({"dirbend": "worse", "dirext": "worse"})
    assert titles(findings) == ["Both directions provoke"]


def test_both_provoke_with_neutral_pelvis():
    findings = score_assessment({"dirbend": "worse", "dirext": "worse", "pelvis": "neutral"})
    assert "Both directions provoke" in titles(findings)
    assert "Pelvic position looks neutral" in titles(findings)


# ------------------------------------------------------------- thresholds
def test_glute_inhibition_needs_two_hits_per_side():
    # one hit only on the right (hamstring fires first), clean elsewhere
    answers = {"firing_L": "glute", "firing_R": "ham",
               "slbridge_L": "clean", "slbridge_R": "clean",
               "clamfeel_L": "glute", "clamfeel_R": "glute"}
    assert score_assessment(answers) == [
        {"sev": "ok", "t": "Glutes are firing",
         "d": "Firing order and bridge holds look clean. Progress loading as programmed.",
         "fix": "Standard progression."}
    ]


def test_lateral_gap_threshold_is_10_percent():
    # 30 vs 28 -> ratio 6.7% -> balanced
    findings = score_assessment({"sideplanksec_L": "30", "sideplanksec_R": "28"})
    assert titles(findings) == ["Lateral endurance balanced"]
    # 30 vs 26 -> ratio 13.3% -> gap
    findings = score_assessment({"sideplanksec_L": "30", "sideplanksec_R": "26"})
    assert titles(findings) == ["Lateral endurance gap (30s vs 26s)"]


def test_low_endurance_adds_second_finding():
    findings = score_assessment({"sideplanksec_L": "15", "sideplanksec_R": "14"})
    t = titles(findings)
    assert "Lateral endurance balanced" in t
    assert "Core endurance is low overall" in t


def test_sideplank_needs_both_sides():
    assert score_assessment({"sideplanksec_L": "30"}) == []
    assert score_assessment({"sideplanksec_L": "", "sideplanksec_R": ""}) == []


def test_answered_count_rules():
    assert answered_count({}) == 0
    assert answered_count(AYAAN_ANSWERS) == 13
    # sides test counts only when BOTH sides answered
    assert answered_count({"firing_L": "glute"}) == 0
    assert answered_count({"firing_L": "glute", "firing_R": "ham"}) == 1
    # nums test counts when either side present
    assert answered_count({"sideplanksec_L": "30"}) == 1
