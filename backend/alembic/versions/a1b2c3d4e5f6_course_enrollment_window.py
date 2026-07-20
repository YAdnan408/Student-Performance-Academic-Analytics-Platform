"""Add course enrollment window datetimes

Revision ID: a1b2c3d4e5f6
Revises: f5a6b7c8d9e0
Create Date: 2026-07-21 03:25:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("enrollment_opens_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "courses",
        sa.Column("enrollment_closes_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Old courses: default close = start_date at 00:00 Asia/Dhaka
    op.execute(
        """
        UPDATE courses
        SET enrollment_closes_at = (start_date::timestamp AT TIME ZONE 'Asia/Dhaka')
        WHERE start_date IS NOT NULL
          AND enrollment_closes_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("courses", "enrollment_closes_at")
    op.drop_column("courses", "enrollment_opens_at")
