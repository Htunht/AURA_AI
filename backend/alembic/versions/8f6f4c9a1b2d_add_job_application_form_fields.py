"""add job application form fields

Revision ID: 8f6f4c9a1b2d
Revises: 0e5f4d649ee4
Create Date: 2026-07-18 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8f6f4c9a1b2d"
down_revision: Union[str, Sequence[str], None] = "0e5f4d649ee4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_application_form_fields",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("job_id", sa.UUID(), nullable=False),
        sa.Column("field_key", sa.String(length=160), nullable=False),
        sa.Column("label", sa.String(length=300), nullable=False),
        sa.Column("field_type", sa.String(length=40), nullable=False),
        sa.Column("placeholder", sa.String(length=300), nullable=True),
        sa.Column("help_text", sa.Text(), nullable=True),
        sa.Column("required", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("linked_requirement_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("evaluation_categories", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "field_key", name="uq_job_application_form_fields_job_key"),
    )
    op.create_index(op.f("ix_job_application_form_fields_job_id"), "job_application_form_fields", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_application_form_fields_job_id"), table_name="job_application_form_fields")
    op.drop_table("job_application_form_fields")
