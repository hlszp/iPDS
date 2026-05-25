"""Pydantic response schemas for loop API endpoints."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tag_name: str
    unit: str
    self_control_rate: float
    stability_rate: float
    performance_score: float
    accuracy_rate: float
    fast_rate: float
    effective_auto_rate: float
    grade: str
    iae: float
    oscillation_index: float
    oscillation_period: Optional[float] = None
    valve_saturation_rate: float
    operation_frequency: float
    nonlinearity_degree: float
    reference_time: str


class DiagnosisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tag_name: str
    stiction_detected: bool
    stiction_confidence: float
    oscillation_detected: bool
    oscillation_period: Optional[float] = None
    oscillation_confidence: float
    nonlinearity_detected: bool
    nonlinearity_degree: float
    coupling_candidates: List[str]
    coupling_strength: float
    settling_time: Optional[float] = None
    travel_index: float
    good_rate: float
    primary_fault: str


class ProcessModelOut(BaseModel):
    gain: float
    tau: float
    dead_time: float
    r_squared: float
    method: str
    excitation_index: float


class IdentificationOut(BaseModel):
    tag_name: str
    excitation_index: float
    excitation_sufficient: bool
    best_model: Optional[ProcessModelOut] = None
    fallback_reason: Optional[str] = None


class PIDParamsOut(BaseModel):
    Kc: float
    Ti: float
    Td: float
    method: str
    closed_loop_tau: float


class SimulationOut(BaseModel):
    tag_name: str
    settling_time: float
    overshoot_pct: float
    rise_time: float
    steady_state_error: float
    gain_margin_db: float
    phase_margin_deg: float
    confidence_score: float
    confidence_level: str
    recommendation: str


class StepResponseOut(BaseModel):
    time: List[float]
    pv: List[float]
    sp: List[float]
    op: List[float]


class HistoryTrendResponse(BaseModel):
    tag_name: str
    hours: float
    playback_step: int
    trend: StepResponseOut


# ── Dashboard ───────────────────────────────────────────────────────────────

class UnitHeatmapRow(BaseModel):
    unit: str
    counts: List[int]


class Top10Item(BaseModel):
    tag_name: str
    unit: str
    grade: str
    performance_score: float
    faults: List[str]
    weight: int


class TrendPoint(BaseModel):
    date: str
    value: float


class UnitTrend(BaseModel):
    unit: str
    data: List[TrendPoint]


class Event(BaseModel):
    time: str
    type: str
    title: str
    meta: str = ""


class DashboardResponse(BaseModel):
    kpi: dict
    heatmap: List[UnitHeatmapRow]
    top10: List[Top10Item]
    trends: List[UnitTrend]
    events: List[Event]


# ── Loop Detail ─────────────────────────────────────────────────────────────

class LoopDetailResponse(BaseModel):
    loop_info: dict
    assessment: AssessmentOut
    diagnosis: DiagnosisOut
    trend: StepResponseOut


# ── Tuning Pipeline ─────────────────────────────────────────────────────────

class ExcitationCheckResponse(BaseModel):
    tag_name: str
    excitation_index: float
    excitation_sufficient: bool
    message: str


class TuningRequest(BaseModel):
    tag_name: str
    method: str = "imc"
    desired_tau: Optional[float] = None


class TuningPipelineResponse(BaseModel):
    identification: IdentificationOut
    pid_params: PIDParamsOut
    simulation_result: SimulationOut
    step_response: StepResponseOut
