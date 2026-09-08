from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("medbridge_id", sa.String(length=64), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("blood_group", sa.String(length=8), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("medbridge_id"),
    )
    op.create_index("ix_patients_medbridge_id", "patients", ["medbridge_id"])

    op.create_table(
        "hospitals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_hospitals_code", "hospitals", ["code"])

    op.create_table(
        "medications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("generic_name", sa.String(length=200), nullable=True),
        sa.Column("form", sa.String(length=100), nullable=True),
        sa.Column("strength", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_medications_name", "medications", ["name"])

    op.create_table(
        "patient_hospital_mappings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_patient_id", sa.String(length=100), nullable=False),
        sa.Column("source_system", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_patient_hospital_mappings_patient_id", "patient_hospital_mappings", ["patient_id"])
    op.create_index("ix_patient_hospital_mappings_hospital_id", "patient_hospital_mappings", ["hospital_id"])
    op.create_index("ix_patient_hospital_mappings_external_patient_id", "patient_hospital_mappings", ["external_patient_id"])

    op.create_table(
        "encounters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("encounter_type", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("attending_doctor", sa.String(length=200), nullable=True),
    )
    op.create_index("ix_encounters_patient_id", "encounters", ["patient_id"])
    op.create_index("ix_encounters_hospital_id", "encounters", ["hospital_id"])

    op.create_table(
        "conditions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("encounter_id", sa.Integer(), sa.ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("clinical_status", sa.String(length=50), nullable=False),
        sa.Column("diagnosed_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_conditions_patient_id", "conditions", ["patient_id"])

    op.create_table(
        "allergies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("substance", sa.String(length=200), nullable=False),
        sa.Column("reaction", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=30), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=True),
    )
    op.create_index("ix_allergies_patient_id", "allergies", ["patient_id"])

    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("medication_id", sa.Integer(), sa.ForeignKey("medications.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("encounter_id", sa.Integer(), sa.ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dose", sa.String(length=100), nullable=True),
        sa.Column("frequency", sa.String(length=100), nullable=True),
        sa.Column("route", sa.String(length=50), nullable=True),
        sa.Column("started_on", sa.Date(), nullable=True),
        sa.Column("ended_on", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
    )
    op.create_index("ix_prescriptions_patient_id", "prescriptions", ["patient_id"])
    op.create_index("ix_prescriptions_medication_id", "prescriptions", ["medication_id"])

    op.create_table(
        "observations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("encounter_id", sa.Integer(), sa.ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("value", sa.String(length=200), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("reference_range", sa.String(length=100), nullable=True),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
    )
    op.create_index("ix_observations_patient_id", "observations", ["patient_id"])

def downgrade() -> None:
    op.drop_table("observations")
    op.drop_table("prescriptions")
    op.drop_table("allergies")
    op.drop_table("conditions")
    op.drop_table("encounters")
    op.drop_table("patient_hospital_mappings")
    op.drop_table("medications")
    op.drop_table("hospitals")
    op.drop_table("patients")
