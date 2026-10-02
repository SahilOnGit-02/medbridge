"""add medical report consent scope

Revision ID: fa6b12e9c09f
Revises: 7849e8944772
Create Date: 2026-09-30 21:37:40.201526
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "fa6b12e9c09f"
down_revision: Union[str, Sequence[str], None] = "7849e8944772"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_reports",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "patient_hospital_consents",
        "share_reports",
    )
