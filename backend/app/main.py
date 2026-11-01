"""BackForge backend API.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8077
(from the backend/ directory, inside the venv)

Endpoints:
  GET  /health            liveness + library size
  GET  /exercises         library, filtered + profile-aware exclusion
  GET  /profile           stored profile        PUT /profile
  POST /assess            answers -> findings (saves like the frontend)
  POST /plan              findings+profile -> foundation + week + today
  POST /workout/live      time/energy/caveats -> live session
  POST /log/checkin       daily check-in (one per day, replaces)
  POST /log/session       session log (+ exercise log)
  GET  /progress          gate status, streak, pain trend
  POST /progress/promote  band promotion (only when the gate is READY)
  GET  /state/export      backforge_v1 localStorage shape
  POST /state/import      load a backforge_v1 state object
"""
from __future__ import annotations

from datetime import date

from fastapi import FastAPI, HTTPException, Query

from .db import DB
from .engine import assessment, live as live_engine, plan as plan_engine, progress as progress_engine
from .engine.context import day_str
from .exercises import Library, exclusion_reason, load_exercises
from .models import (
    AssessRequest,
    CheckinRequest,
    ImportRequest,
    LiveRequest,
    PlanRequest,
    Profile,
    SessionRequest,
)
from .state import build_ctx, export_state, get_profile, import_state, set_profile


def create_app(exercises_path=None, db_path=None) -> FastAPI:
    exercises = load_exercises(exercises_path)  # required — raises if absent
    lib = Library(exercises)
    db = DB(db_path)

    app = FastAPI(title="BackForge backend", version="2.0.0")
    app.state.lib = lib
    app.state.db = db

    # ------------------------------------------------------------ health
    @app.get("/health")
    def health():
        return {"status": "ok", "exercises_loaded": len(lib.all), "version": "2.0.0"}

    # ---------------------------------------------------------- profile
    @app.get("/profile")
    def read_profile():
        return get_profile(db).model_dump()

    @app.put("/profile")
    def write_profile(profile: Profile):
        set_profile(db, profile)
        return profile.model_dump()

    # --------------------------------------------------------- exercises
    @app.get("/exercises")
    def list_exercises(
        category: str | None = Query(default=None),
        target: str | None = Query(default=None),
        equipment: str | None = Query(default=None),
        level: int | None = Query(default=None),
        include_excluded: bool = Query(default=False),
    ):
        profile = get_profile(db)
        flags = profile.active_flags()
        results = db.kv_get("results") or []
        for f in results:
            if "Extension-intolerant" in f.get("t", ""):
                flags.add("extension-intolerant")
        band_levels = db.kv_get("bandLevel") or {}
        out = []
        for ex in lib.all:
            if category and ex["category"] != category:
                continue
            if target and target not in ex.get("targets", []):
                continue
            if equipment and equipment not in ex.get("equipment", []):
                continue
            if level is not None and ex.get("level") != level:
                continue
            reason = exclusion_reason(ex, flags)
            if reason and not include_excluded:
                continue
            row = dict(ex)
            row["band_level"] = band_levels.get(ex["id"], 1)
            if reason:
                row["excluded_reason"] = reason
            out.append(row)
        return {"count": len(out), "exercises": out}

    # ------------------------------------------------------------ assess
    @app.post("/assess")
    def assess(req: AssessRequest):
        findings = assessment.score_assessment(req.answers)
        n = assessment.answered_count(req.answers)
        if req.save:
            db.kv_set("answers", req.answers)
            db.kv_set("results", findings)
            history = db.kv_get("assessHistory") or []
            history.append({
                "date": req.date or day_str(date.today()),
                "flags": [f["t"] for f in findings],
            })
            db.kv_set("assessHistory", history)
        return {
            "findings": findings,
            "answered_count": n,
            "scorable": n >= assessment.MIN_ANSWERED_TO_SCORE,
        }

    # -------------------------------------------------------------- plan
    @app.post("/plan")
    def make_plan(req: PlanRequest):
        checkin_override = None
        if req.checkin:
            checkin_override = {
                "date": req.checkin.get("date") or req.date or day_str(date.today()),
                "pain": req.checkin.get("pain"),
                "where": req.checkin.get("where"),
                "sleep": req.checkin.get("sleep"),
            }
        ctx = build_ctx(
            db,
            today=req.date,
            findings=[f.model_dump() for f in req.findings] if req.findings is not None else None,
            profile=req.profile,
            checkin_override=checkin_override,
            swaps_override=req.swaps,
        )
        return plan_engine.build_plan(lib, ctx)

    # -------------------------------------------------------------- live
    @app.post("/workout/live")
    def live_workout(req: LiveRequest):
        if req.mins not in (5, 10, 20, 35, 50):
            raise HTTPException(422, "mins must be one of 5, 10, 20, 35, 50")
        bad = [c for c in req.caveats if c not in live_engine.CAVEATS]
        if bad:
            raise HTTPException(422, f"unknown caveats: {bad}")
        ctx = build_ctx(
            db,
            today=req.date,
            findings=[f.model_dump() for f in req.findings] if req.findings is not None else None,
            profile=req.profile,
        )
        energy = req.energy or live_engine.derived_energy(ctx)
        if energy not in live_engine.ENERGIES:
            raise HTTPException(422, "energy must be one of great, ok, low, flare")
        return live_engine.build_live_workout(lib, ctx, req.mins, energy, req.caveats)

    # --------------------------------------------------------------- log
    @app.post("/log/checkin")
    def log_checkin(req: CheckinRequest):
        day = req.date or day_str(date.today())
        saved = db.upsert_checkin(day, req.pain, req.where, req.sleep)
        ctx = build_ctx(db, today=day)
        return {"checkin": saved, "tune": plan_engine.recovery_tune(ctx),
                "flare": plan_engine.flare_active(ctx)}

    @app.post("/log/session")
    def log_session(req: SessionRequest):
        day = req.date or day_str(date.today())
        saved = db.add_session(day, req.kind, req.title, req.pain, req.exercise_ids)
        ctx = build_ctx(db, today=day)
        return {"session": saved, "streak": progress_engine.streak(ctx),
                "gate": progress_engine.gate_status(ctx)}

    # ---------------------------------------------------------- progress
    @app.get("/progress")
    def progress(day: str | None = Query(default=None, alias="date")):
        ctx = build_ctx(db, today=day)
        out = progress_engine.progress_summary(lib, ctx)
        out["assessments"] = len(db.kv_get("assessHistory") or [])
        return out

    @app.post("/progress/promote")
    def promote(day: str | None = Query(default=None, alias="date")):
        ctx = build_ctx(db, today=day)
        gate = progress_engine.gate_status(ctx)
        if not gate["ready"]:
            raise HTTPException(
                409,
                f"Progression gate is not open ({gate['label']}). Promotion is "
                "earned by the 14-day pain + consistency rule.",
            )
        new_levels = progress_engine.promote_bands(lib, ctx.band_levels)
        db.kv_set("bandLevel", new_levels)
        return {"band_levels": new_levels, "gate": gate}

    # ------------------------------------------------------------- state
    @app.get("/state/export")
    def state_export():
        return export_state(db)

    @app.post("/state/import")
    def state_import(req: ImportRequest):
        try:
            return import_state(db, req.state)
        except ValueError as e:
            raise HTTPException(422, str(e))

    return app


app = create_app()
