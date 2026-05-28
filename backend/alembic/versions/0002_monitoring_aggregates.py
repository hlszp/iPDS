"""add monitoring_aggregate_snapshots

Revision ID: 0002_monitoring_aggregates
Revises: 0001_baseline
Create Date: 2026-05-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_monitoring_aggregates"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monitoring_aggregate_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("scope_type", sa.String(length=32), nullable=False),
        sa.Column("scope_ref", sa.String(length=64), nullable=False),
        sa.Column("dimension", sa.String(length=16), nullable=False),
        sa.Column("bucket_label", sa.String(length=32), nullable=False),
        sa.Column("bucket_start", sa.DateTime(), nullable=False),
        sa.Column("bucket_end", sa.DateTime(), nullable=False),
        sa.Column("avg_performance_score", sa.Float(), nullable=False),
        sa.Column("avg_auto_control_rate", sa.Float(), nullable=False),
        sa.Column("avg_stability_rate", sa.Float(), nullable=False),
        sa.Column("data_completeness", sa.Float(), nullable=False, server_default=sa.text("1.0")),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("1.0")),
        sa.Column("trusted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("trust_reason", sa.String(length=128), nullable=True),
        sa.Column("metrics_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_monitoring_aggregate_snapshots_snapshot_id", "monitoring_aggregate_snapshots", ["snapshot_id"], unique=True)
    op.create_index("ix_monitoring_aggregate_snapshots_scope", "monitoring_aggregate_snapshots", ["scope_type", "scope_ref"])
    op.create_index("ix_monitoring_aggregate_snapshots_dimension", "monitoring_aggregate_snapshots", ["dimension"])
    op.create_index("ix_monitoring_aggregate_snapshots_bucket_start", "monitoring_aggregate_snapshots", ["bucket_start"])


def downgrade() -> None:
    op.drop_index("ix_monitoring_aggregate_snapshots_bucket_start", table_name="monitoring_aggregate_snapshots")
    op.drop_index("ix_monitoring_aggregate_snapshots_dimension", table_name="monitoring_aggregate_snapshots")
    op.drop_index("ix_monitoring_aggregate_snapshots_scope", table_name="monitoring_aggregate_snapshots")
    op.drop_index("ix_monitoring_aggregate_snapshots_snapshot_id", table_name="monitoring_aggregate_snapshots")
    op.drop_table("monitoring_aggregate_snapshots")
