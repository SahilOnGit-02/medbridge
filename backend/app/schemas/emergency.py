from datetime import datetime

from pydantic import BaseModel


class EmergencyAccessCreate(BaseModel):
    patient_id: int
    reason: str


class EmergencyAccessRead(BaseModel):
    id: int
    patient_id: int
    user_id: int
    hospital_id: int
    reason: str
    status: str
    granted_at: datetime
    expires_at: datetime
    ended_at: datetime | None = None

    model_config = {"from_attributes": True}