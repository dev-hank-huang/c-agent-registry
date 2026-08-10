"""merge dependency-source and registry-sync branches

Revision ID: 0850e047f539
Revises: f64afce7bce0, e747a70f59e9
Create Date: 2026-08-11 02:41:45.273989

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0850e047f539'
down_revision: Union[str, Sequence[str], None] = ('f64afce7bce0', 'e747a70f59e9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
