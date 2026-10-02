"""add medical reports

Revision ID: fae30a76e7fd
Revises: fa6b12e9c09f
Create Date: 2026-09-30 21:50:16.676053
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "fae30a76e7fd"
down_revision: Union[str, Sequence[str], None] = "fa6b12e9c09f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medical_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("report_type", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("issued_on", sa.Date(), nullable=False),
        sa.Column("issuing_doctor", sa.String(length=200), nullable=True),
        sa.Column("department", sa.String(length=200), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hospital_id"],
            ["hospitals.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_medical_reports_hospital_id",
        "medical_reports",
        ["hospital_id"],
        unique=False,
    )

    op.create_index(
        "ix_medical_reports_patient_id",
        "medical_reports",
        ["patient_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_medical_reports_patient_id",
        table_name="medical_reports",
    )
    op.drop_index(
        "ix_medical_reports_hospital_id",
        table_name="medical_reports",
    )
    op.drop_table("medical_reports")