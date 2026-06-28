"""add profile_photo to instructors

Revision ID: 8f3a1b2c9d5e
Revises: 5504d2dda6c4
Create Date: 2026-06-27 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8f3a1b2c9d5e'
down_revision: Union[str, Sequence[str], None] = '5504d2dda6c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('instructors', sa.Column('profile_photo', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('instructors', 'profile_photo')
