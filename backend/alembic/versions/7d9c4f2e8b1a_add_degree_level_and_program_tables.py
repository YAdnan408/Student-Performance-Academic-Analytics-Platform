"""add_degree_level_and_program_tables

Revision ID: 7d9c4f2e8b1a
Revises: a3b5aefb1bd9
Create Date: 2026-06-27 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '7d9c4f2e8b1a'
down_revision: Union[str, Sequence[str], None] = 'a3b5aefb1bd9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('programs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.Column('degree_level', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.add_column('students', sa.Column('degree_level', sa.String(length=20), nullable=True))
    op.add_column('students', sa.Column('program_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_students_program_id', 'students', 'programs', ['program_id'], ['id'])
    op.add_column('instructors', sa.Column('degree_level', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('instructors', 'degree_level')
    op.drop_constraint('fk_students_program_id', 'students', type_='foreignkey')
    op.drop_column('students', 'program_id')
    op.drop_column('students', 'degree_level')
    op.drop_table('programs')
