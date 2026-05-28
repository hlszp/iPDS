"""Standalone simulation API — closed-loop step, disturbance, and stiction scenarios."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..models.loop import LoopTag
from ..services.identification.engine import ProcessModel, identify_best
from ..services.simulation.engine import analyze_simulation, simulate_step_response
from ..services.tuning.engine import PIDParams, tune_imc, tune_imc_aggressive, tune_lambda

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


class SimulationRequest(BaseModel):
    tag_name: str
    scenario: str = Field("step", description="Simulation scenario: step, disturbance, or stiction")
    method: str = Field("imc", description="PID tuning method: imc, lambda, or aggressive")
    desired_tau: Optional[float] = Field(None, description="Desired closed-loop time constant (lambda method)")
    # Manual model override (optional)
    gain: Optional[float] = Field(None, description="Override model gain K")
    tau: Optional[float] = Field(None, description="Override model time constant (s)")
    dead_time: Optional[float] = Field(None, description="Override model dead time (s)")


@router.post("/run")
def run_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    """Run a standalone closed-loop simulation with configurable scenario and tuning method."""
    tag_name = payload.tag_name
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

    query_result = get_runtime_source_manager().resolve_loop_data(hours=24, seed=42)
    ld = next((item for item in query_result.loops if item.config.tag_name == tag_name), None)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"No runtime data for '{tag_name}'")

    config = ld.config

    if payload.gain is not None and payload.tau is not None and payload.dead_time is not None:
        model = ProcessModel(
            gain=payload.gain, tau=payload.tau, dead_time=payload.dead_time,
            r_squared=0.9, method="manual",
            excitation_index=0.8,
        )
    else:
        ident_result = identify_best(
            pv=ld.pv, op=ld.op, sp=ld.sp,
            sample_interval=float(config.sample_interval),
        )
        if ident_result.best_model is None:
            raise HTTPException(status_code=422, detail="Identification failed — consider using manual model override (gain/tau/dead_time).")
        model = ident_result.best_model

    method = payload.method
    if method == "lambda":
        pid_params = tune_lambda(model, desired_tau=payload.desired_tau)
    elif method == "aggressive":
        pid_params = tune_imc_aggressive(model)
    else:
        pid_params = tune_imc(model, desired_tau=payload.desired_tau)

    sp_change = 10.0
    if payload.scenario == "disturbance":
        sp_change = 2.0
    elif payload.scenario == "stiction":
        sp_change = 5.0

    sim_data = simulate_step_response(
        model=model, pid=pid_params,
        sp_change=sp_change, duration=300.0, dt=0.5,
    )
    sim_result = analyze_simulation(sim_data, sp_change=sp_change)
    sim_result.tag_name = tag_name

    return {
        "tag_name": tag_name,
        "scenario": payload.scenario,
        "model": {
            "gain": model.gain,
            "tau": model.tau,
            "dead_time": model.dead_time,
            "r_squared": model.r_squared,
            "method": model.method,
        },
        "pid_params": {
            "Kc": pid_params.Kc,
            "Ti": pid_params.Ti,
            "Td": pid_params.Td,
            "method": pid_params.method,
        },
        "simulation_result": {
            "settling_time": sim_result.settling_time,
            "overshoot_pct": sim_result.overshoot_pct,
            "rise_time": sim_result.rise_time,
            "steady_state_error": sim_result.steady_state_error,
            "gain_margin_db": sim_result.gain_margin_db,
            "phase_margin_deg": sim_result.phase_margin_deg,
            "confidence_score": sim_result.confidence_score,
            "confidence_level": sim_result.confidence_level,
            "recommendation": sim_result.recommendation,
        },
        "step_response": {
            "time": sim_data.time,
            "pv": sim_data.pv,
            "sp": sim_data.sp,
            "op": sim_data.op,
        },
    }


@router.get("/scenarios")
def list_scenarios():
    """Return available simulation scenarios with descriptions."""
    return {
        "scenarios": [
            {"key": "step", "label": "设定值阶跃", "description": "设定值阶跃变化 10%，观察闭环响应。"},
            {"key": "disturbance", "label": "负荷扰动", "description": "小幅设定值变化（2%），观察扰动抑制能力。"},
            {"key": "stiction", "label": "阀门粘滞", "description": "中等设定值变化（5%），关注阀门动作与粘滞影响。"},
        ],
    }
