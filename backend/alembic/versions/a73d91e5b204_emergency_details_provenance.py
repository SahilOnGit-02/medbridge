"""Record provenance for patient-entered emergency details."""

from alembic import op
import sqlalchemy as sa

revision = "a73d91e5b204"
down_revision = "7849e8944772"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "patients", sa.Column("blood_group_source", sa.String(30), nullable=True)
    )
    op.add_column(
        "patients",
        sa.Column("emergency_details_updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_column("patients", "emergency_details_updated_at")
    op.drop_column("patients", "blood_group_source")
