"""add emergency access

Revision ID: 7849e8944772
Revises: 84d5c7a74414
Create Date: 2026-09-25 16:37:37.950838
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7849e8944772"
down_revision: Union[str, Sequence[str], None] = "84d5c7a74414"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "emergency_access",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_emergency_access_patient_id"),
        "emergency_access",
        ["patient_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_emergency_access_user_id"),
        "emergency_access",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_emergency_access_hospital_id"),
        "emergency_access",
        ["hospital_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_emergency_access_status"),
        "emergency_access",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_emergency_access_status"),
        table_name="emergency_access",
    )

    op.drop_index(
        op.f("ix_emergency_access_hospital_id"),
        table_name="emergency_access",
    )

    op.drop_index(
        op.f("ix_emergency_access_user_id"),
        table_name="emergency_access",
    )

    op.drop_index(
        op.f("ix_emergency_access_patient_id"),
        table_name="emergency_access",
    )

    op.drop_table("emergency_access")