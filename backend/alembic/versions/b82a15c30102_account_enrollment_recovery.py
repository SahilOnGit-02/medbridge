"""Add approved enrollment and portal-bound account recovery."""

from alembic import op
import sqlalchemy as sa

revision = "b82a15c30102"
down_revision = "a73d91e5b204"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("username", sa.String(60), nullable=True))
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.add_column(
        "users",
        sa.Column(
            "registration_status",
            sa.String(30),
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "account_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("digest", sa.String(64), nullable=False, unique=True),
        sa.Column("portal", sa.String(20), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_account_tokens_user_id", "account_tokens", ["user_id"])
    op.create_table(
        "doctor_registrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("registration_number", sa.String(100), nullable=False),
        sa.Column("organization", sa.String(200), nullable=False),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("reviewed_at", sa.DateTime()),
    )
    op.create_table(
        "account_throttles",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table("account_throttles")
    op.drop_table("doctor_registrations")
    op.drop_table("account_tokens")
    op.drop_column("users", "auth_version")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "registration_status")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
