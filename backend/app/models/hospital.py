from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient_mappings = relationship(
        "PatientHospitalMapping",
        back_populates="hospital",
        cascade="all, delete-orphan",
    )
    encounters = relationship(
        "Encounter",
        back_populates="hospital",
        cascade="all, delete-orphan",
    )
    users = relationship(
        "User",
        back_populates="hospital",
    )
