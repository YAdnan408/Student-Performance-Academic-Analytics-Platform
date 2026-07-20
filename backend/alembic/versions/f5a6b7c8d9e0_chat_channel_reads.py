"""Add chat channel read receipts for unread counts

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-07-21 00:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_channel_reads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_offering_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_offering_id"], ["course_offerings.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "course_offering_id", name="uq_chat_channel_reads_user_offering"),
    )
    op.create_index("ix_chat_channel_reads_user_id", "chat_channel_reads", ["user_id"])
    op.create_index("ix_chat_channel_reads_course_offering_id", "chat_channel_reads", ["course_offering_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_channel_reads_course_offering_id", table_name="chat_channel_reads")
    op.drop_index("ix_chat_channel_reads_user_id", table_name="chat_channel_reads")
    op.drop_table("chat_channel_reads")
