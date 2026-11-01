import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from app.db import DB
from app.engine.context import Ctx
from app.exercises import Library, load_exercises
from app.main import create_app

SEED = Path(__file__).resolve().parent / "fixtures" / "exercises_seed.json"

# 2026-11-02 is a Monday; 2026-11-01 is a Sunday (rest day)
MONDAY = date(2026, 11, 2)
SUNDAY = date(2026, 11, 1)
TUESDAY = date(2026, 11, 3)

AYAAN_FLAGS = {"extension-intolerant"}

# Answers matching Ayaan's known picture: extension-intolerant, right hip IR
# deficit, APT, right glute inhibition, guarding left, lateral gap.
AYAAN_ANSWERS = {
    "dirbend": "better",
    "dirext": "worse",
    "firing_L": "glute", "firing_R": "ham",
    "slbridge_L": "clean", "slbridge_R": "cramp",
    "clamfeel_L": "glute", "clamfeel_R": "tfl",
    "thomas_L": "flat", "thomas_R": "lifted",
    "pelvis": "apt",
    "slr": "gap",
    "hipir_L": "full", "hipir_R": "low",
    "switch9090": "r-stuck",
    "sideplanksec_L": "35", "sideplanksec_R": "25",
    "posturewall": "both",
    "guard": "left",
}


@pytest.fixture()
def lib() -> Library:
    return Library(load_exercises(SEED))


@pytest.fixture()
def db(tmp_path) -> DB:
    return DB(tmp_path / "test.db")


@pytest.fixture()
def client(tmp_path) -> TestClient:
    app = create_app(exercises_path=SEED, db_path=tmp_path / "api.db")
    return TestClient(app)


def make_ctx(lib, today=MONDAY, findings=None, checkins=None, log=None,
             ex_log=None, swaps=None, band_levels=None, flags=None) -> Ctx:
    return Ctx(
        today=today,
        findings=findings or [],
        checkins=checkins or [],
        log=log or [],
        ex_log=ex_log or [],
        swaps=swaps or {},
        band_levels=band_levels or {},
        profile_flags=AYAAN_FLAGS if flags is None else flags,
    )


def checkin(day: date, pain: int, where="back", sleep="ok") -> dict:
    return {"date": day.isoformat(), "pain": pain, "where": where, "sleep": sleep}


def session(day: date, kind="full", title="Session", pain=None) -> dict:
    return {"date": day.isoformat(), "kind": kind, "title": title, "pain": pain}
