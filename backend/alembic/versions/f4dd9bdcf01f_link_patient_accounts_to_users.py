"""link patient accounts to users

Revision ID: f4dd9bdcf01f
Revises: 1fd81a9e9deb
Create Date: 2026-09-25 11:00:00.610687
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4dd9bdcf01f"
down_revision: Union[str, Sequence[str], None] = "1fd81a9e9deb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Link a patient account to a User account."""
    op.add_column(
        "patients",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )

    op.create_index(
        op.f("ix_patients_user_id"),
        "patients",
        ["user_id"],
        unique=True,
    )

    op.create_foreign_key(
        None,
        "patients",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Remove the patient-to-user account link."""
    op.drop_constraint(
        None,
        "patients",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_patients_user_id"),
        table_name="patients",
    )

    op.drop_column(
        "patients",
        "user_id",
    )