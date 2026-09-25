from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PatientHospitalConsent(Base):
    __tablename__ = "patient_hospital_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"),
        index=True,
    )

    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        index=True,
    )

    status: Mapped[str] = mapped_column(String(20), index=True)
    purpose: Mapped[str] = mapped_column(Text)

    # Patient-controlled record sharing scopes.
    share_allergies: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    share_medications: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    share_conditions: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    share_prescriptions: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    share_observations: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    share_encounters: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    granted_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    patient = relationship("Patient")
    hospital = relationship("Hospital")