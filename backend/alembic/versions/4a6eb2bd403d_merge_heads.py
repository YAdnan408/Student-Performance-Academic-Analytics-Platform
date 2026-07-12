"""merge heads

Revision ID: 4a6eb2bd403d
Revises: 8f3a1b2c9d5e, 6e1f3a4b5c6d
Create Date: 2026-06-29 03:15:43.982169

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a6eb2bd403d'
down_revision: Union[str, Sequence[str], None] = ('8f3a1b2c9d5e', '6e1f3a4b5c6d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
