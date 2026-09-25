"""add patient consent sharing scopes

Revision ID: 84d5c7a74414
Revises: f4dd9bdcf01f
Create Date: 2026-09-25 15:30:50.467144
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "84d5c7a74414"
down_revision: Union[str, Sequence[str], None] = "f4dd9bdcf01f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_allergies",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_medications",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_conditions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_prescriptions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_observations",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "patient_hospital_consents",
        sa.Column(
            "share_encounters",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "patient_hospital_consents",
        "share_encounters",
    )
    op.drop_column(
        "patient_hospital_consents",
        "share_observations",
    )
    op.drop_column(
        "patient_hospital_consents",
        "share_prescriptions",
    )
    op.drop_column(
        "patient_hospital_consents",
        "share_conditions",
    )
    op.drop_column(
        "patient_hospital_consents",
        "share_medications",
    )
    op.drop_column(
        "patient_hospital_consents",
        "share_allergies",
    )