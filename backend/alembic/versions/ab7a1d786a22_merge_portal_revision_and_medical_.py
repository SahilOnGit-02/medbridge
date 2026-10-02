"""merge portal revision and medical reports

Revision ID: ab7a1d786a22
Revises: b82a15c30102, fae30a76e7fd
Create Date: 2026-10-02 17:34:16.912930
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'ab7a1d786a22'
down_revision: Union[str, Sequence[str], None] = ('b82a15c30102', 'fae30a76e7fd')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
