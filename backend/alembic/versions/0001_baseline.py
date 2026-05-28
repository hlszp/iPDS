"""baseline schema

Revision ID: 0001_baseline
Revises:
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("username", sa.String(length=64), primary_key=True),
        sa.Column("password_hash", sa.String(length=128), nullable=False),
        sa.Column("salt", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("display_name", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "plants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("plant_id", sa.Integer(), sa.ForeignKey("plants.id"), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=256), nullable=True),
        sa.Column("monitoring_enabled", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "loop_groups",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=True),
        sa.Column("description", sa.String(length=256), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "loop_tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tag_name", sa.String(length=64), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("sub_unit", sa.String(length=32), nullable=True),
        sa.Column("loop_type", sa.String(length=16), nullable=False),
        sa.Column("loop_category", sa.String(length=8), nullable=True),
        sa.Column("loop_weight", sa.Integer(), nullable=True),
        sa.Column("loop_group_id", sa.Integer(), sa.ForeignKey("loop_groups.id"), nullable=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=True),
        sa.Column("description", sa.String(length=256), nullable=True),
        sa.Column("pv_tag", sa.String(length=64), nullable=False),
        sa.Column("sp_tag", sa.String(length=64), nullable=False),
        sa.Column("op_tag", sa.String(length=64), nullable=False),
        sa.Column("mode_tag", sa.String(length=64), nullable=True),
        sa.Column("eng_unit", sa.String(length=16), nullable=True),
        sa.Column("pv_lo", sa.Float(), nullable=True),
        sa.Column("pv_hi", sa.Float(), nullable=True),
        sa.Column("op_lo", sa.Float(), nullable=True),
        sa.Column("op_hi", sa.Float(), nullable=True),
        sa.Column("sample_interval", sa.Integer(), nullable=True),
        sa.Column("dead_time_typical", sa.Float(), nullable=True),
        sa.Column("cascade_parent", sa.String(length=64), nullable=True),
        sa.Column("feedforward_tags", sa.Text(), nullable=True),
        sa.Column("stability_threshold", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_loop_tags_tag_name", "loop_tags", ["tag_name"], unique=True)
    op.create_index("ix_loop_tags_unit", "loop_tags", ["unit"], unique=False)
    op.create_index("ix_loop_groups_unit", "loop_groups", ["unit"], unique=False)

    op.create_table(
        "feature_flags",
        sa.Column("key", sa.String(length=64), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("host", sa.String(length=128), nullable=True),
        sa.Column("port", sa.Integer(), nullable=True),
        sa.Column("database_name", sa.String(length=128), nullable=True),
        sa.Column("username", sa.String(length=128), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "loop_signal_bindings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("signal_type", sa.String(length=32), nullable=False),
        sa.Column("tag_code", sa.String(length=128), nullable=False),
        sa.Column("quality_rule", sa.String(length=128), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=128), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("scope", sa.String(length=32), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "feature_entitlements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("deployment_key", sa.String(length=64), nullable=False),
        sa.Column("feature_key", sa.String(length=64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "ingest_watermarks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("data_source_id", sa.Integer(), sa.ForeignKey("data_sources.id"), nullable=False),
        sa.Column("last_timestamp", sa.DateTime(), nullable=True),
        sa.Column("last_status", sa.String(length=32), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "assessment_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("window_start", sa.DateTime(), nullable=False),
        sa.Column("window_end", sa.DateTime(), nullable=False),
        sa.Column("performance_score", sa.Float(), nullable=False),
        sa.Column("grade", sa.String(length=8), nullable=False),
        sa.Column("engine_version", sa.String(length=32), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "diagnosis_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("window_start", sa.DateTime(), nullable=False),
        sa.Column("window_end", sa.DateTime(), nullable=False),
        sa.Column("primary_fault", sa.String(length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "identification_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("window_start", sa.DateTime(), nullable=False),
        sa.Column("window_end", sa.DateTime(), nullable=False),
        sa.Column("gain", sa.Float(), nullable=False),
        sa.Column("tau", sa.Float(), nullable=False),
        sa.Column("dead_time", sa.Float(), nullable=False),
        sa.Column("r_squared", sa.Float(), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "tuning_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("kc", sa.Float(), nullable=False),
        sa.Column("ti", sa.Float(), nullable=False),
        sa.Column("td", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "dashboard_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("scope", sa.String(length=32), nullable=False),
        sa.Column("window_start", sa.DateTime(), nullable=False),
        sa.Column("window_end", sa.DateTime(), nullable=False),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "recommendation_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recommendation_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("loop_tag_id", sa.Integer(), sa.ForeignKey("loop_tags.id"), nullable=False),
        sa.Column("assessment_snapshot_id", sa.Integer(), sa.ForeignKey("assessment_snapshots.id"), nullable=False),
        sa.Column("diagnosis_snapshot_id", sa.Integer(), sa.ForeignKey("diagnosis_snapshots.id"), nullable=False),
        sa.Column("tuning_snapshot_id", sa.Integer(), sa.ForeignKey("tuning_snapshots.id"), nullable=False),
        sa.Column("risk_level", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "recommendation_actions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recommendation_snapshot_id", sa.Integer(), sa.ForeignKey("recommendation_snapshots.id"), nullable=False),
        sa.Column("action_type", sa.String(length=32), nullable=False),
        sa.Column("actor", sa.String(length=64), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "outcome_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recommendation_snapshot_id", sa.Integer(), sa.ForeignKey("recommendation_snapshots.id"), nullable=False),
        sa.Column("before_snapshot_id", sa.Integer(), sa.ForeignKey("assessment_snapshots.id"), nullable=False),
        sa.Column("after_snapshot_id", sa.Integer(), sa.ForeignKey("assessment_snapshots.id"), nullable=False),
        sa.Column("delta_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "report_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("scope_type", sa.String(length=32), nullable=False),
        sa.Column("scope_ref", sa.String(length=64), nullable=False),
        sa.Column("period", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("requested_by", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "report_artifacts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("artifact_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("report_job_id", sa.Integer(), sa.ForeignKey("report_jobs.id"), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column("storage_uri", sa.String(length=256), nullable=False),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "scheduler_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("job_type", sa.String(length=32), nullable=False),
        sa.Column("cron_expr", sa.String(length=64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("config_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "scheduler_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("scheduler_job_id", sa.Integer(), sa.ForeignKey("scheduler_jobs.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("scheduler_runs")
    op.drop_table("scheduler_jobs")
    op.drop_table("report_artifacts")
    op.drop_table("report_jobs")
    op.drop_table("outcome_snapshots")
    op.drop_table("recommendation_actions")
    op.drop_table("recommendation_snapshots")
    op.drop_table("dashboard_snapshots")
    op.drop_table("tuning_snapshots")
    op.drop_table("identification_snapshots")
    op.drop_table("diagnosis_snapshots")
    op.drop_table("assessment_snapshots")
    op.drop_table("ingest_watermarks")
    op.drop_table("feature_entitlements")
    op.drop_table("system_settings")
    op.drop_table("loop_signal_bindings")
    op.drop_table("data_sources")
    op.drop_table("feature_flags")
    op.drop_index("ix_loop_groups_unit", table_name="loop_groups")
    op.drop_index("ix_loop_tags_unit", table_name="loop_tags")
    op.drop_index("ix_loop_tags_tag_name", table_name="loop_tags")
    op.drop_table("loop_tags")
    op.drop_table("loop_groups")
    op.drop_table("devices")
    op.drop_table("plants")
    op.drop_table("users")
