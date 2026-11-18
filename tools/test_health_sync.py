#!/usr/bin/env python3
"""Unit tests for health_sync.py's pure transformation logic.

Fixture JSON dicts only -- no health-cli calls. Run from this directory:

    python3 -m unittest test_health_sync -v
    # or
    python3 -m pytest test_health_sync.py
"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import health_sync as hs


# --- Fixtures (shaped like real health-cli records) -------------------------

# Night ending 2026-11-17 (real values): asleep = 10950+8940+7230 = 27120s
# = 452 min; deep = 8940s = 149 min.
SLEEP_NIGHT_ENDING_1117 = {
    "start_datetime": "2026-11-16 23:09:00",
    "end_datetime": "2026-11-17 07:55:30",
    "sleep_core_duration_sec": 10950.0,
    "sleep_deep_duration_sec": 8940.0,
    "sleep_rem_duration_sec": 7230.0,
    "sleep_awake_duration_sec": 4470.0,
    "sleep_in_bed_duration_sec": 31590.0,
}

# Two sessions both ending 2026-11-15 (real values): they must sum.
SLEEP_1115_A = {
    "start_datetime": "2026-11-15 00:55:00",
    "end_datetime": "2026-11-15 05:22:00",
    "sleep_core_duration_sec": 10440.0,
    "sleep_deep_duration_sec": 1110.0,
    "sleep_rem_duration_sec": 870.0,
    "sleep_awake_duration_sec": 3600.0,
}
SLEEP_1115_B = {
    "start_datetime": "2026-11-15 05:42:00",
    "end_datetime": "2026-11-15 10:55:00",
    "sleep_core_duration_sec": 7530.0,
    "sleep_deep_duration_sec": 4590.0,
    "sleep_rem_duration_sec": 5100.0,
    "sleep_awake_duration_sec": 1560.0,
}


def workout(start, hr, duration_sec):
    rec = {"start_datetime": start, "active_duration_sec": duration_sec,
           "workout_type": "walking"}
    if hr is not None:
        rec["hr_average_bpm"] = hr
    return rec


# --- Zone 2 band ------------------------------------------------------------

class TestZone2Band(unittest.TestCase):
    def test_age_36_band(self):
        hr_min, hr_max, basis = hs.resolve_zone2_band(age=36)
        self.assertEqual((hr_min, hr_max), (110, 129))
        self.assertEqual(basis, "60-70% of estimated HRmax 184 (220-age)")

    def test_age_40_band(self):
        hr_min, hr_max, _ = hs.resolve_zone2_band(age=40)
        self.assertEqual((hr_min, hr_max), (108, 126))  # HRmax 180

    def test_explicit_override_wins_over_age(self):
        hr_min, hr_max, basis = hs.resolve_zone2_band(
            age=36, zone2_min=115, zone2_max=135)
        self.assertEqual((hr_min, hr_max), (115, 135))
        self.assertIn("explicit", basis)

    def test_missing_band_and_age_raises(self):
        with self.assertRaises(ValueError):
            hs.resolve_zone2_band()

    def test_partial_override_raises(self):
        with self.assertRaises(ValueError):
            hs.resolve_zone2_band(zone2_min=110)
        with self.assertRaises(ValueError):
            hs.resolve_zone2_band(zone2_max=129)

    def test_inverted_override_raises(self):
        with self.assertRaises(ValueError):
            hs.resolve_zone2_band(zone2_min=140, zone2_max=120)


# --- Sleep aggregation --------------------------------------------------------

class TestSleepAggregation(unittest.TestCase):
    def test_attributed_to_end_date_not_start_date(self):
        result = hs.aggregate_sleep([SLEEP_NIGHT_ENDING_1117])
        self.assertIn("2026-11-17", result)
        self.assertNotIn("2026-11-16", result)

    def test_asleep_and_deep_minutes(self):
        result = hs.aggregate_sleep([SLEEP_NIGHT_ENDING_1117])
        day = result["2026-11-17"]
        self.assertEqual(day["sleepMin"], 452)       # (10950+8940+7230)/60
        self.assertEqual(day["sleepDeepMin"], 149)   # 8940/60
        self.assertIsNone(day["sleepScore"])

    def test_awake_and_in_bed_not_counted_as_sleep(self):
        # Awake (4470s) and in-bed time must not inflate sleepMin.
        result = hs.aggregate_sleep([SLEEP_NIGHT_ENDING_1117])
        self.assertNotEqual(result["2026-11-17"]["sleepMin"], 527)

    def test_multiple_sessions_same_end_date_sum(self):
        result = hs.aggregate_sleep([SLEEP_1115_A, SLEEP_1115_B])
        day = result["2026-11-15"]
        # asleep: (10440+1110+870) + (7530+4590+5100) = 29640s = 494 min
        self.assertEqual(day["sleepMin"], 494)
        # deep: (1110+4590)/60 = 95 min
        self.assertEqual(day["sleepDeepMin"], 95)

    def test_asleep_unspecified_counted(self):
        rec = {"start_datetime": "2026-11-01 22:00:00",
               "end_datetime": "2026-11-02 06:00:00",
               "sleep_asleep_unspecified_duration_sec": 3600.0,
               "sleep_deep_duration_sec": 600.0}
        result = hs.aggregate_sleep([rec])
        self.assertEqual(result["2026-11-02"]["sleepMin"], 70)  # 4200s
        self.assertEqual(result["2026-11-02"]["sleepDeepMin"], 10)

    def test_window_filter_drops_outside_end_dates(self):
        result = hs.aggregate_sleep(
            [SLEEP_NIGHT_ENDING_1117], window_dates={"2026-11-16"})
        self.assertEqual(result, {})

    def test_score_from_efficiency_times_100(self):
        rec = dict(SLEEP_NIGHT_ENDING_1117, sleep_efficiency=0.9)
        result = hs.aggregate_sleep([rec])
        self.assertEqual(result["2026-11-17"]["sleepScore"], 90.0)

    def test_score_quality_fallback_and_precedence(self):
        rec_q = dict(SLEEP_NIGHT_ENDING_1117, quality_score=82)
        self.assertEqual(
            hs.aggregate_sleep([rec_q])["2026-11-17"]["sleepScore"], 82.0)
        rec_both = dict(SLEEP_NIGHT_ENDING_1117,
                        sleep_efficiency=0.85, quality_score=50)
        self.assertEqual(
            hs.aggregate_sleep([rec_both])["2026-11-17"]["sleepScore"], 85.0)


# --- Workout / Zone 2 aggregation --------------------------------------------

class TestWorkoutAggregation(unittest.TestCase):
    def test_in_band_minutes_attributed_to_start_date(self):
        recs = [workout("2026-10-30 20:57:38", 111.0, 748.963)]
        result = hs.aggregate_workouts(recs, 110, 129)
        self.assertEqual(result, {"2026-10-30": 12})  # 748.963s -> 12 min

    def test_band_bounds_are_inclusive(self):
        recs = [workout("2026-11-01 10:00:00", 110, 600.0),
                workout("2026-11-01 12:00:00", 129, 600.0),
                workout("2026-11-01 14:00:00", 109, 600.0),
                workout("2026-11-01 16:00:00", 130, 600.0)]
        result = hs.aggregate_workouts(recs, 110, 129)
        self.assertEqual(result, {"2026-11-01": 20})  # only 110 and 129 count

    def test_missing_hr_counts_zero(self):
        recs = [workout("2026-11-01 10:00:00", None, 3600.0)]
        self.assertEqual(hs.aggregate_workouts(recs, 110, 129), {})

    def test_same_day_sessions_sum_before_rounding(self):
        recs = [workout("2026-10-31 17:15:56", 112.0, 847.768),
                workout("2026-10-31 17:31:53", 117.0, 1655.046)]
        result = hs.aggregate_workouts(recs, 110, 129)
        self.assertEqual(result, {"2026-10-31": 42})  # 2502.814s -> 42 min


# --- Metrics + day building ----------------------------------------------------

class TestMetricsAndDays(unittest.TestCase):
    def test_metrics_steps_int_and_sparse_weight(self):
        records = [
            {"date": "2026-09-11", "step_count": 5000.0, "body_mass_kg": 84.8},
            {"date": "2026-09-12", "step_count": 3680.0},
        ]
        result = hs.aggregate_metrics(records)
        self.assertEqual(result["2026-09-11"], {"steps": 5000, "weightKg": 84.8})
        self.assertEqual(result["2026-09-12"], {"steps": 3680, "weightKg": None})

    def test_every_window_date_emitted_with_nulls(self):
        dates = hs.window_date_list(date(2026, 11, 17), 3)
        self.assertEqual(dates, ["2026-11-15", "2026-11-16", "2026-11-17"])
        metrics = hs.aggregate_metrics(
            [{"date": "2026-11-16", "step_count": 14304.0}])
        sleep = hs.aggregate_sleep([SLEEP_NIGHT_ENDING_1117])
        days = hs.build_days(dates, metrics, sleep, {})
        self.assertEqual(len(days), 3)
        # Unsynced day: steps stay null (never fabricated 0), zone2 defaults 0.
        self.assertIsNone(days[0]["steps"])
        self.assertEqual(days[0]["zone2Min"], 0)
        self.assertIsNone(days[0]["sleepMin"])
        # Known day.
        self.assertEqual(days[1]["steps"], 14304)
        # Sleep lands on its wake day even though that day has no steps.
        self.assertIsNone(days[2]["steps"])
        self.assertEqual(days[2]["sleepMin"], 452)
        self.assertEqual(days[2]["sleepDeepMin"], 149)

    def test_payload_shape(self):
        dates = ["2026-11-17"]
        days = hs.build_days(dates, {}, {}, {})
        payload = hs.build_payload(
            dates, days, 110, 129, "60-70% of estimated HRmax 184 (220-age)",
            False, "some warning", "2026-11-17T22:00:00-05:00")
        self.assertEqual(payload["kind"], "backforge-health-sync")
        self.assertEqual(payload["version"], 1)
        self.assertEqual(payload["window"], {"from": "2026-11-17", "to": "2026-11-17"})
        self.assertEqual(payload["zone2"]["hrMin"], 110)
        self.assertEqual(payload["zone2"]["hrMax"], 129)
        self.assertEqual(payload["coverage"],
                         {"complete": False, "note": "some warning"})
        self.assertEqual(
            list(payload["days"][0].keys()),
            ["date", "steps", "zone2Min", "sleepMin", "sleepDeepMin",
             "sleepScore", "weightKg"])


if __name__ == "__main__":
    unittest.main()
