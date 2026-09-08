from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medbridge_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    hospital_mappings = relationship(
        "PatientHospitalMapping", back_populates="patient", cascade="all, delete-orphan"
    )
    encounters = relationship(
        "Encounter", back_populates="patient", cascade="all, delete-orphan"
    )
    conditions = relationship(
        "Condition", back_populates="patient", cascade="all, delete-orphan"
    )
    allergies = relationship(
        "Allergy", back_populates="patient", cascade="all, delete-orphan"
    )
    prescriptions = relationship(
        "Prescription", back_populates="patient", cascade="all, delete-orphan"
    )
    observations = relationship(
        "Observation", back_populates="patient", cascade="all, delete-orphan"
    )
