"""add status, class_schedule to courses; remove credit_hours, department_id from courses; remove section from course_offerings

Revision ID: 9d8e7c6b5a4f
Revises: 4a6eb2bd403d
Create Date: 2026-06-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


# revision identifiers, used by Alembic.
revision: str = '9d8e7c6b5a4f'
down_revision: Union[str, Sequence[str], None] = '4a6eb2bd403d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to courses
    op.add_column('courses', sa.Column('status', sa.String(length=20), server_default='active', nullable=True))
    op.add_column('courses', sa.Column('class_schedule', JSON(), nullable=True))

    # Remove columns from courses
    op.drop_constraint(op.f('courses_department_id_fkey'), 'courses', type_='foreignkey')
    op.drop_column('courses', 'department_id')
    op.drop_column('courses', 'credit_hours')

    # Remove section from course_offerings
    op.drop_column('course_offerings', 'section')


def downgrade() -> None:
    # Restore section to course_offerings
    op.add_column('course_offerings', sa.Column('section', sa.String(length=10), nullable=True))

    # Restore columns to courses
    op.add_column('courses', sa.Column('credit_hours', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('department_id', UUID(as_uuid=True), sa.ForeignKey('departments.id'), nullable=True))
    op.create_foreign_key(op.f('courses_department_id_fkey'), 'courses', 'departments', ['department_id'], ['id'])

    # Remove new columns from courses
    op.drop_column('courses', 'class_schedule')
    op.drop_column('courses', 'status')
