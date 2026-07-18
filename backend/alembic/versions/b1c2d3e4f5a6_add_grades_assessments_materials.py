"""Add grades/assessments portal fields, grading policies, materials, notifications

Revision ID: b1c2d3e4f5a6
Revises: 9d8e7c6b5a4f
Create Date: 2026-07-18 06:15:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9d8e7c6b5a4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum alterations must run outside a transaction on some Postgres versions
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE assessmenttype ADD VALUE IF NOT EXISTS 'lab'"))
    connection.execute(sa.text("ALTER TYPE assessmenttype ADD VALUE IF NOT EXISTS 'attendance'"))

    op.add_column("assessments", sa.Column("sequence_number", sa.Integer(), server_default="1"))
    op.add_column("assessments", sa.Column("form_url", sa.String(length=500), nullable=True))
    op.add_column("assessments", sa.Column("file_url", sa.String(length=500), nullable=True))
    op.add_column("assessments", sa.Column("window_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assessments", sa.Column("window_end", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assessments", sa.Column("is_published", sa.Boolean(), server_default="false"))
    op.add_column("assessments", sa.Column("description", sa.Text(), nullable=True))

    materialtype = postgresql.ENUM("file", "video", "link", name="materialtype", create_type=False)
    materialtype.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "grading_policies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("course_offering_id", sa.UUID(), nullable=False),
        sa.Column("component_type", sa.String(length=50), nullable=False),
        sa.Column("planned_count", sa.Integer(), server_default="1"),
        sa.Column("drop_lowest", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["course_offering_id"], ["course_offerings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_offering_id", "component_type", name="uq_offering_component"),
    )

    op.create_table(
        "course_materials",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("course_offering_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("material_type", postgresql.ENUM("file", "video", "link", name="materialtype", create_type=False), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("external_url", sa.String(length=500), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["course_offering_id"], ["course_offerings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("course_materials")
    op.drop_table("grading_policies")
    op.drop_column("assessments", "description")
    op.drop_column("assessments", "is_published")
    op.drop_column("assessments", "window_end")
    op.drop_column("assessments", "window_start")
    op.drop_column("assessments", "file_url")
    op.drop_column("assessments", "form_url")
    op.drop_column("assessments", "sequence_number")
    op.execute("DROP TYPE IF EXISTS materialtype")
