from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConsentCreate(BaseModel):
    patient_id: int
    hospital_id: int
    status: str = "active"
    purpose: str
    granted_at: datetime
    expires_at: datetime | None = None


class ConsentRead(ConsentCreate):
    id: int
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)