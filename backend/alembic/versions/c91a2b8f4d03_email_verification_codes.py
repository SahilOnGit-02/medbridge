"""Add single-use enrollment verification codes.

Revision ID: c91a2b8f4d03
Revises: ab7a1d786a22
"""

from alembic import op
import sqlalchemy as sa

revision = "c91a2b8f4d03"
down_revision = "ab7a1d786a22"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("challenge_digest", sa.String(64), unique=True, nullable=False),
        sa.Column("code_digest", sa.String(64), nullable=False),
        sa.Column("portal", sa.String(20), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_email_verifications_user_id", "email_verifications", ["user_id"]
    )


def downgrade():
    op.drop_table("email_verifications")
