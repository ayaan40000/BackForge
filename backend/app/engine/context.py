"""Shared engine context: the inputs every ported function reads.

The frontend reads globals (S.results, S.checkins, S.log, S.exLog, S.swaps,
the wall clock). The backend passes them explicitly in a Ctx so every engine
function is pure and testable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


def parse_day(value: str | date | None, default: date | None = None) -> date:
    if value is None:
        return default or date.today()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def day_str(d: date) -> str:
    return d.isoformat()


@dataclass
class Ctx:
    today: date
    findings: list[dict] = field(default_factory=list)  # [{sev, t, d, fix}]
    checkins: list[dict] = field(default_factory=list)  # [{date, pain, where, sleep}]
    log: list[dict] = field(default_factory=list)  # [{date, kind, title, pain}]
    ex_log: list[dict] = field(default_factory=list)  # [{date, id}]
    swaps: dict = field(default_factory=dict)  # {ex_id: {to, date}}
    band_levels: dict = field(default_factory=dict)  # {ex_id: level}
    profile_flags: set = field(default_factory=set)  # contra flags to exclude

    def titles(self) -> list[str]:
        return [f.get("t", "") for f in self.findings]

    def has(self, txt: str) -> bool:
        """Frontend has(): substring match over finding titles."""
        return any(txt in t for t in self.titles())

    def latest_checkin(self) -> dict | None:
        return self.checkins[-1] if self.checkins else None

    def todays_checkin(self) -> dict | None:
        c = self.latest_checkin()
        if c and c.get("date") == day_str(self.today):
            return c
        return None
