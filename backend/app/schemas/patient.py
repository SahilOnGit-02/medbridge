from datetime import date
from pydantic import BaseModel, ConfigDict

class PatientCreate(BaseModel):
    medbridge_id: str
    full_name: str
    date_of_birth: date | None = None
    blood_group: str | None = None

class PatientRead(PatientCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)
