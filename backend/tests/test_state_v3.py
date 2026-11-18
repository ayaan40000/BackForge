"""State v3.0 passthrough — new frontend keys survive import -> export.

The envelope stays v:1; v3.0 adds a data-model ``schema: 2`` field plus
top-level ``health``, ``waist``, ``backup`` and ``migratedFrom`` keys, and
the backend must also stop dropping the v2.5 keys ``protein``,
``bodyweightKg`` and ``deloadUntil``.

Passthrough is opt-in by presence: keys not present in the imported state
must not appear in the export, and the empty-DB export (default_state)
is unchanged.
"""
import pytest

from app.state import export_state, import_state
from tests.test_state import FRONTEND_STATE

V3_STATE = {
    **FRONTEND_STATE,
    "schema": 2,
    "health": {
        "paused": False,
        "meta": {"lastSyncAt": "2026-11-17T12:00:00Z", "source": "health_connect"},
        "days": [
            {"date": "2026-11-15", "steps": 7200, "sleepH": 7.5},
            {"date": "2026-11-16", "steps": 8100, "sleepH": 6.9},
        ],
    },
    "waist": [{"date": "2026-11-16", "cm": 84.5}],
    "backup": {"destination": "google_drive", "lastExportAt": "2026-11-16T20:00:00Z"},
    "protein": {"2026-11-15": 130, "2026-11-16": 145},
    "bodyweightKg": 82.5,
    "deloadUntil": "2026-11-23",
    "migratedFrom": "v2.5",
}

V3_KEYS = (
    "schema",
    "health",
    "waist",
    "backup",
    "protein",
    "bodyweightKg",
    "deloadUntil",
    "migratedFrom",
)


def test_v3_state_roundtrips_all_new_keys(db):
    import_state(db, V3_STATE)
    out = export_state(db)
    for key in V3_KEYS:
        assert key in out, key
        assert out[key] == V3_STATE[key], key
    # the original v1 keys still round-trip alongside the new ones
    for key in FRONTEND_STATE:
        assert out[key] == FRONTEND_STATE[key], key


def test_v1_state_export_has_no_v3_keys(db):
    import_state(db, FRONTEND_STATE)
    out = export_state(db)
    for key in FRONTEND_STATE:
        assert out[key] == FRONTEND_STATE[key], key
    for key in ("health", "waist", "backup"):
        assert key not in out, key
    # passthrough only when present: none of the new keys leak in
    for key in V3_KEYS:
        assert key not in out, key


def test_import_rejects_v2_envelope_still(db):
    with pytest.raises(ValueError):
        import_state(db, {"v": 2})
