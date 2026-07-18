"""add recruiter interviews

Revision ID: 5b91c7e4a203
Revises: 3fd7e5c9d2a1
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "5b91c7e4a203"
down_revision: Union[str, Sequence[str], None] = "3fd7e5c9d2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("interviewer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("interview_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(length=80), nullable=False),
        sa.Column("location", sa.String(length=500), nullable=True),
        sa.Column("meeting_url", sa.String(length=1000), nullable=True),
        sa.Column("recruiter_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("scheduled_end > scheduled_start", name="ck_interviews_end_after_start"),
        sa.CheckConstraint("status IN ('DRAFT', 'PENDING_CONFIRMATION', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'NEEDS_RESCHEDULING')", name="ck_interviews_status"),
        sa.CheckConstraint("interview_type IN ('SCREENING', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'FINAL', 'OTHER')", name="ck_interviews_type"),
        sa.CheckConstraint("meeting_url IS NULL OR meeting_url ~ '^https?://[^[:space:]]+$'", name="ck_interviews_meeting_url"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interviewer_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interviews_application_id", "interviews", ["application_id"])
    op.create_index("ix_interviews_interviewer_id", "interviews", ["interviewer_id"])
    op.create_index("ix_interviews_interview_type", "interviews", ["interview_type"])
    op.create_index("ix_interviews_status", "interviews", ["status"])
    op.create_index("ix_interviews_scheduled_start", "interviews", ["scheduled_start"])
    op.create_index("ix_interviews_calendar_range", "interviews", ["scheduled_start", "scheduled_end"])


def downgrade() -> None:
    op.drop_table("interviews")
