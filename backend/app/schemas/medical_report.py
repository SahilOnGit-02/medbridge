from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MedicalReportRead(BaseModel):
    id: int
    patient_id: int
    hospital_id: int
    title: str
    report_type: str
    description: str | None = None
    issued_on: date
    issuing_doctor: str | None = None
    department: str | None = None
    file_name: str
    mime_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
