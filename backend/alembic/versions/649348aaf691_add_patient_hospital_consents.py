"""add patient hospital consents

Revision ID: 649348aaf691
Revises: 4bf4c5472504
Create Date: 2026-09-23 14:06:33.888659
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "649348aaf691"
down_revision: Union[str, Sequence[str], None] = "4bf4c5472504"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patient_hospital_consents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_index(
        "ix_patient_hospital_consents_patient_id",
        "patient_hospital_consents",
        ["patient_id"],
    )
    op.create_index(
        "ix_patient_hospital_consents_hospital_id",
        "patient_hospital_consents",
        ["hospital_id"],
    )
    op.create_index(
        "ix_patient_hospital_consents_status",
        "patient_hospital_consents",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_patient_hospital_consents_status",
        table_name="patient_hospital_consents",
    )
    op.drop_index(
        "ix_patient_hospital_consents_hospital_id",
        table_name="patient_hospital_consents",
    )
    op.drop_index(
        "ix_patient_hospital_consents_patient_id",
        table_name="patient_hospital_consents",
    )
    op.drop_table("patient_hospital_consents")