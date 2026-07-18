"""add frontend job flow fields

Revision ID: 3fd7e5c9d2a1
Revises: 8f6f4c9a1b2d
Create Date: 2026-07-18 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3fd7e5c9d2a1"
down_revision: Union[str, Sequence[str], None] = "8f6f4c9a1b2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("position_count", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("jobs", sa.Column("employment_type", sa.String(length=40), nullable=False, server_default="FULL_TIME"))
    op.add_column("jobs", sa.Column("work_arrangement", sa.String(length=40), nullable=False, server_default="HYBRID"))
    op.add_column("jobs", sa.Column("location", sa.String(length=200), nullable=True))
    op.add_column("jobs", sa.Column("minimum_experience_years", sa.Numeric(precision=4, scale=1), nullable=False, server_default="0"))
    op.add_column("jobs", sa.Column("application_deadline", sa.Date(), nullable=True))
    op.alter_column("jobs", "position_count", server_default=None)
    op.alter_column("jobs", "employment_type", server_default=None)
    op.alter_column("jobs", "work_arrangement", server_default=None)
    op.alter_column("jobs", "minimum_experience_years", server_default=None)


def downgrade() -> None:
    op.drop_column("jobs", "application_deadline")
    op.drop_column("jobs", "minimum_experience_years")
    op.drop_column("jobs", "location")
    op.drop_column("jobs", "work_arrangement")
    op.drop_column("jobs", "employment_type")
    op.drop_column("jobs", "position_count")
