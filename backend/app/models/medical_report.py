from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"),
        index=True,
    )

    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200))
    report_type: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    issued_on: Mapped[date] = mapped_column(Date)
    issuing_doctor: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    department: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(
        String(100),
        default="application/pdf",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    patient = relationship(
        "Patient",
        back_populates="medical_reports",
    )
    hospital = relationship("Hospital")
