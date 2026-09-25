from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConsentCreate(BaseModel):
    patient_id: int
    hospital_id: int
    status: str = "active"
    purpose: str

    share_allergies: bool = True
    share_medications: bool = True
    share_conditions: bool = True
    share_prescriptions: bool = True
    share_observations: bool = True
    share_encounters: bool = True

    granted_at: datetime
    expires_at: datetime | None = None


class PatientConsentCreate(BaseModel):
    hospital_id: int
    purpose: str = "Continuity of care"

    share_allergies: bool = True
    share_medications: bool = True
    share_conditions: bool = True
    share_prescriptions: bool = True
    share_observations: bool = True
    share_encounters: bool = True

    expires_at: datetime | None = None


class ConsentRead(ConsentCreate):
    id: int
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)