"""Pydantic models for the BackForge API.

The state-shaped models mirror the frontend's localStorage object
(key ``backforge_v1``) so /state/export and /state/import stay compatible.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------- profile
class Profile(BaseModel):
    """Ayaan's standing profile and precautions (L4-L5, extension-intolerant)."""

    extension_intolerant: bool = True
    flexion_intolerant: bool = False
    sciatica_side: Optional[str] = "right"  # side of the sciatica symptoms
    guarding_side: Optional[str] = "right"  # side he offloads (shifts left)
    hip_ir_deficit_side: Optional[str] = "right"
    precautions: list[str] = Field(
        default_factory=lambda: [
            "No loaded spinal flexion",
            "No loaded spinal twisting",
            "Never both knees to chest",
            "No press-ups or prone lying (extension-intolerant)",
            "No loaded end-range extension",
        ]
    )

    def active_flags(self) -> set[str]:
        """Contra flags this profile excludes (matched against exercise.contra)."""
        flags: set[str] = set()
        if self.extension_intolerant:
            flags.add("extension-intolerant")
        if self.flexion_intolerant:
            flags.add("flexion-intolerant")
        return flags


# ---------------------------------------------------------------- findings
class Finding(BaseModel):
    sev: str  # 'high' | 'mod' | 'ok'
    t: str  # title — the plan/live engines match on substrings of this
    d: str = ""
    fix: str = ""


# ---------------------------------------------------------------- requests
class AssessRequest(BaseModel):
    answers: dict[str, Any]
    date: Optional[str] = None  # YYYY-MM-DD; defaults to today
    save: bool = True


class PlanRequest(BaseModel):
    findings: Optional[list[Finding]] = None  # defaults to stored results
    profile: Optional[Profile] = None  # defaults to stored profile
    checkin: Optional[dict[str, Any]] = None  # today's check-in override
    swaps: Optional[dict[str, Any]] = None  # defaults to stored swaps
    date: Optional[str] = None


class LiveRequest(BaseModel):
    mins: int = 20  # one of 5/10/20/35/50 in the app
    energy: Optional[str] = None  # great|ok|low|flare; derived if omitted
    caveats: list[str] = Field(default_factory=list)
    findings: Optional[list[Finding]] = None
    profile: Optional[Profile] = None
    date: Optional[str] = None


class CheckinRequest(BaseModel):
    pain: int = Field(ge=0, le=10)
    where: str  # none|back|leg-r|leg-l|neck
    sleep: str  # poor|ok|great
    date: Optional[str] = None


class SessionRequest(BaseModel):
    kind: str = "full"  # full|micro|live|foundation|cardio
    title: str = ""
    pain: Optional[int] = Field(default=None, ge=0, le=10)
    exercise_ids: list[str] = Field(default_factory=list)
    date: Optional[str] = None


class ImportRequest(BaseModel):
    state: dict[str, Any]
