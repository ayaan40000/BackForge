"""SQLite storage (stdlib sqlite3 only).

Layout: normalized tables for check-ins, session log and exercise log
(the data the progression engine queries), plus a kv table for the rest of
the frontend state (answers, results, band levels, swaps, prefs) so the
localStorage shape round-trips exactly through export/import.
"""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "backforge.db"
ENV_VAR = "BACKFORGE_DB_PATH"

SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
    date TEXT PRIMARY KEY,
    pain INTEGER NOT NULL,
    where_ TEXT,
    sleep TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    kind TEXT,
    title TEXT,
    pain INTEGER
);
CREATE TABLE IF NOT EXISTS ex_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exercise_id TEXT NOT NULL
);
"""


def resolve_db_path(explicit: str | Path | None = None) -> Path:
    if explicit:
        return Path(explicit)
    env = os.environ.get(ENV_VAR)
    if env:
        return Path(env)
    return DEFAULT_DB


class DB:
    def __init__(self, path: str | Path | None = None):
        self.path = resolve_db_path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    # ------------------------------------------------------------- kv ----
    def kv_get(self, key: str, default=None):
        row = self.conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
        if row is None:
            return default
        return json.loads(row["value"])

    def kv_set(self, key: str, value) -> None:
        self.conn.execute(
            "INSERT INTO kv (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )
        self.conn.commit()

    # -------------------------------------------------------- check-ins --
    def upsert_checkin(self, date: str, pain: int, where: str, sleep: str) -> dict:
        self.conn.execute(
            "INSERT INTO checkins (date, pain, where_, sleep) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(date) DO UPDATE SET pain = excluded.pain, "
            "where_ = excluded.where_, sleep = excluded.sleep",
            (date, pain, where, sleep),
        )
        self.conn.commit()
        return {"date": date, "pain": pain, "where": where, "sleep": sleep}

    def checkins(self) -> list[dict]:
        rows = self.conn.execute(
            'SELECT date, pain, where_ AS "where", sleep FROM checkins ORDER BY date'
        ).fetchall()
        return [dict(r) for r in rows]

    # --------------------------------------------------------- sessions --
    def add_session(self, date: str, kind: str, title: str, pain, exercise_ids: list[str]) -> dict:
        cur = self.conn.execute(
            "INSERT INTO sessions (date, kind, title, pain) VALUES (?, ?, ?, ?)",
            (date, kind, title, pain),
        )
        for ex_id in exercise_ids:
            self.conn.execute(
                "INSERT INTO ex_log (date, exercise_id) VALUES (?, ?)", (date, ex_id)
            )
        self.conn.commit()
        return {"date": date, "kind": kind, "title": title, "pain": pain}

    def sessions(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT date, kind, title, pain FROM sessions ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]

    def ex_log(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT date, exercise_id AS id, id AS seq FROM ex_log ORDER BY seq"
        ).fetchall()
        return [{"date": r["date"], "id": r["id"]} for r in rows]

    # ------------------------------------------------------------ reset ----
    def wipe(self) -> None:
        for table in ("kv", "checkins", "sessions", "ex_log"):
            self.conn.execute(f"DELETE FROM {table}")
        self.conn.commit()
