"""Production-oriented PostgreSQL domain models."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from .loop import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False, unique=True)
    source_type = Column(String(32), nullable=False)
    host = Column(String(128), nullable=True)
    port = Column(Integer, nullable=True)
    database_name = Column(String(128), nullable=True)
    username = Column(String(128), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoopSignalBinding(Base):
    __tablename__ = "loop_signal_bindings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    signal_type = Column(String(32), nullable=False)
    tag_code = Column(String(128), nullable=False)
    quality_rule = Column(String(128), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    scope = Column(String(32), nullable=False, default="system")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeatureEntitlement(Base):
    __tablename__ = "feature_entitlements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deployment_key = Column(String(64), nullable=False, index=True)
    feature_key = Column(String(64), nullable=False, index=True)
    enabled = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IngestWatermark(Base):
    __tablename__ = "ingest_watermarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False, index=True)
    last_timestamp = Column(DateTime, nullable=True)
    last_status = Column(String(32), nullable=False, default="pending")
    detail = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AssessmentSnapshot(Base):
    __tablename__ = "assessment_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    performance_score = Column(Float, nullable=False)
    grade = Column(String(8), nullable=False)
    engine_version = Column(String(32), nullable=False)
    metrics_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DiagnosisSnapshot(Base):
    __tablename__ = "diagnosis_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    primary_fault = Column(String(32), nullable=False)
    confidence = Column(Float, nullable=False)
    details_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class IdentificationSnapshot(Base):
    __tablename__ = "identification_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    gain = Column(Float, nullable=False)
    tau = Column(Float, nullable=False)
    dead_time = Column(Float, nullable=False)
    r_squared = Column(Float, nullable=False)
    details_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TuningSnapshot(Base):
    __tablename__ = "tuning_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    method = Column(String(32), nullable=False)
    kc = Column(Float, nullable=False)
    ti = Column(Float, nullable=False)
    td = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    details_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    scope = Column(String(32), nullable=False)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    summary_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecommendationSnapshot(Base):
    __tablename__ = "recommendation_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_id = Column(String(64), nullable=False, unique=True, index=True)
    loop_tag_id = Column(Integer, ForeignKey("loop_tags.id"), nullable=False, index=True)
    assessment_snapshot_id = Column(Integer, ForeignKey("assessment_snapshots.id"), nullable=False)
    diagnosis_snapshot_id = Column(Integer, ForeignKey("diagnosis_snapshots.id"), nullable=False)
    tuning_snapshot_id = Column(Integer, ForeignKey("tuning_snapshots.id"), nullable=False)
    risk_level = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="pending_review")
    summary_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecommendationAction(Base):
    __tablename__ = "recommendation_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_snapshot_id = Column(Integer, ForeignKey("recommendation_snapshots.id"), nullable=False, index=True)
    action_type = Column(String(32), nullable=False)
    actor = Column(String(64), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OutcomeSnapshot(Base):
    __tablename__ = "outcome_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_snapshot_id = Column(Integer, ForeignKey("recommendation_snapshots.id"), nullable=False, index=True)
    before_snapshot_id = Column(Integer, ForeignKey("assessment_snapshots.id"), nullable=False)
    after_snapshot_id = Column(Integer, ForeignKey("assessment_snapshots.id"), nullable=False)
    delta_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MonitoringAggregateSnapshot(Base):
    __tablename__ = "monitoring_aggregate_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), nullable=False, unique=True, index=True)
    scope_type = Column(String(32), nullable=False, index=True)
    scope_ref = Column(String(64), nullable=False, index=True)
    dimension = Column(String(16), nullable=False, index=True)
    bucket_label = Column(String(32), nullable=False)
    bucket_start = Column(DateTime, nullable=False, index=True)
    bucket_end = Column(DateTime, nullable=False)
    avg_performance_score = Column(Float, nullable=False)
    avg_auto_control_rate = Column(Float, nullable=False)
    avg_stability_rate = Column(Float, nullable=False)
    data_completeness = Column(Float, nullable=False, default=1.0)
    confidence = Column(Float, nullable=False, default=1.0)
    trusted = Column(Boolean, nullable=False, default=False)
    trust_reason = Column(String(128), nullable=True)
    metrics_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReportJob(Base):
    __tablename__ = "report_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), nullable=False, unique=True, index=True)
    scope_type = Column(String(32), nullable=False)
    scope_ref = Column(String(64), nullable=False)
    period = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="pending")
    failure_code = Column(String(64), nullable=True)
    failure_detail = Column(Text, nullable=True)
    requested_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReportArtifact(Base):
    __tablename__ = "report_artifacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    artifact_id = Column(String(64), nullable=False, unique=True, index=True)
    report_job_id = Column(Integer, ForeignKey("report_jobs.id"), nullable=False, index=True)
    format = Column(String(16), nullable=False)
    storage_uri = Column(String(256), nullable=False)
    checksum = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SchedulerJob(Base):
    __tablename__ = "scheduler_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_key = Column(String(64), nullable=False, unique=True, index=True)
    job_type = Column(String(32), nullable=False)
    cron_expr = Column(String(64), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    config_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SchedulerRun(Base):
    __tablename__ = "scheduler_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), nullable=False, unique=True, index=True)
    scheduler_job_id = Column(Integer, ForeignKey("scheduler_jobs.id"), nullable=False, index=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(32), nullable=False)
    message = Column(Text, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), nullable=False, unique=True, index=True)
    event_type = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=False)
    target_type = Column(String(64), nullable=False)
    target_id = Column(String(64), nullable=False)
    payload_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
