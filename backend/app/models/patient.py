from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )

    medbridge_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(String(200))
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)

    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    emergency_contact_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    emergency_contact_phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    profile_photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    identity_verification_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    identity_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    identity_verified_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="patient",
    )

    hospital_mappings = relationship(
        "PatientHospitalMapping",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    encounters = relationship(
        "Encounter",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    conditions = relationship(
        "Condition",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    allergies = relationship(
        "Allergy",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    prescriptions = relationship(
        "Prescription",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    observations = relationship(
        "Observation",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    consents = relationship(
        "PatientHospitalConsent",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    identity_verified_user = relationship(
        "User",
        foreign_keys=[identity_verified_by],
    )