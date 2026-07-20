"""Point ml_predictions at course offerings; enrich recommendations

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-07-20 00:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ml_predictions", sa.Column("course_offering_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_ml_predictions_course_offering_id",
        "ml_predictions",
        "course_offerings",
        ["course_offering_id"],
        ["id"],
    )
    op.drop_constraint("ml_predictions_semester_id_fkey", "ml_predictions", type_="foreignkey")
    op.drop_column("ml_predictions", "semester_id")
    op.add_column("ml_predictions", sa.Column("explanation", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.add_column("recommendations", sa.Column("course_offering_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_recommendations_course_offering_id",
        "recommendations",
        "course_offerings",
        ["course_offering_id"],
        ["id"],
    )
    op.add_column("recommendations", sa.Column("course_code", sa.String(length=50), nullable=True))
    op.add_column("recommendations", sa.Column("title", sa.String(length=255), nullable=True))
    op.add_column("recommendations", sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))
    op.alter_column("recommendations", "message", existing_type=sa.String(), type_=sa.Text(), existing_nullable=True)


def downgrade() -> None:
    op.drop_column("recommendations", "is_active")
    op.drop_column("recommendations", "title")
    op.drop_column("recommendations", "course_code")
    op.drop_constraint("fk_recommendations_course_offering_id", "recommendations", type_="foreignkey")
    op.drop_column("recommendations", "course_offering_id")

    op.drop_column("ml_predictions", "explanation")
    op.add_column("ml_predictions", sa.Column("semester_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("ml_predictions_semester_id_fkey", "ml_predictions", "semesters", ["semester_id"], ["id"])
    op.drop_constraint("fk_ml_predictions_course_offering_id", "ml_predictions", type_="foreignkey")
    op.drop_column("ml_predictions", "course_offering_id")
