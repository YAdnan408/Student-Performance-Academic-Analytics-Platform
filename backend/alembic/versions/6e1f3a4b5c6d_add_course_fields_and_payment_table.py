"""add course cost duration dates marks_distribution and payment table

Revision ID: 6e1f3a4b5c6d
Revises: 5504d2dda6c4
Create Date: 2026-06-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


# revision identifiers, used by Alembic.
revision: str = '6e1f3a4b5c6d'
down_revision: Union[str, Sequence[str], None] = '5504d2dda6c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to courses table
    op.add_column('courses', sa.Column('cost', sa.Float(), server_default='0.0', nullable=True))
    op.add_column('courses', sa.Column('duration', sa.String(length=100), nullable=True))
    op.add_column('courses', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('courses', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('courses', sa.Column('marks_distribution', JSON(), nullable=True))

    # Create payments table
    op.create_table('payments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('enrollment_id', UUID(as_uuid=True), sa.ForeignKey('enrollments.id'), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('method', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='completed', nullable=True),
        sa.Column('transaction_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('payments')
    op.drop_column('courses', 'marks_distribution')
    op.drop_column('courses', 'end_date')
    op.drop_column('courses', 'start_date')
    op.drop_column('courses', 'duration')
    op.drop_column('courses', 'cost')
