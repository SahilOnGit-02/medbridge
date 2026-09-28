from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PatientCreate(BaseModel):
    medbridge_id: str
    full_name: str
    date_of_birth: date | None = None
    blood_group: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    profile_photo_url: str | None = None


class PatientProfileUpdate(BaseModel):
    full_name: str | None = None
    date_of_birth: date | None = None
    blood_group: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    profile_photo_url: str | None = None


class PatientRead(PatientCreate):
    id: int
    identity_verification_status: str | None = None
    identity_verified_at: datetime | None = None
    identity_verified_by: int | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientSearchResult(PatientRead):
    pass


class PatientAccountCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class EmergencyContactRead(BaseModel):
    name: str | None = None
    phone: str | None = None


class EmergencyAllergyRead(BaseModel):
    id: int
    substance: str
    reaction: str | None = None
    severity: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EmergencyMedicationRead(BaseModel):
    id: int
    name: str
    generic_name: str | None = None
    strength: str | None = None
    dose: str | None = None
    frequency: str | None = None
    route: str | None = None


class EmergencyConditionRead(BaseModel):
    id: int
    name: str
    clinical_status: str
    diagnosed_on: date | None = None

    model_config = ConfigDict(from_attributes=True)


class EmergencyProfileRead(BaseModel):
    blood_group: str | None = None
    emergency_contact: EmergencyContactRead
    allergies: list[EmergencyAllergyRead]
    current_medications: list[EmergencyMedicationRead]
    active_conditions: list[EmergencyConditionRead]


class EmergencyProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blood_group: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None