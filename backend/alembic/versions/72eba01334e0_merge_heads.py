"""merge heads

Revision ID: 72eba01334e0
Revises: 2a62135bfd8f, 62a1917c0a90
Create Date: 2026-08-10 22:50:14.001233

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72eba01334e0'
down_revision: Union[str, Sequence[str], None] = ('2a62135bfd8f', '62a1917c0a90')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
