from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class EmergencyAccess(Base):
    __tablename__ = "emergency_access"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"),
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        index=True,
    )

    reason: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        index=True,
    )

    granted_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    expires_at: Mapped[datetime] = mapped_column(DateTime)

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    patient = relationship(
        "Patient",
        back_populates="emergency_accesses",
    )

    user = relationship(
        "User",
        back_populates="emergency_accesses",
    )

    hospital = relationship(
        "Hospital",
        back_populates="emergency_accesses",
    )