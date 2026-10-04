from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    date_of_birth: date | None = None
    blood_group: str | None = None
    gender: str | None = Field(default=None, max_length=30)
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    emergency_contact_name: str | None = Field(default=None, max_length=200)
    emergency_contact_phone: str | None = None

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value):
        if value is None or len(value.strip()) < 2:
            raise ValueError("Enter a full name with at least 2 characters")
        return " ".join(value.split())

    @field_validator("date_of_birth")
    @classmethod
    def validate_birth(cls, value):
        if value and value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value

    @field_validator("blood_group")
    @classmethod
    def normalize_blood(cls, value):
        return EmergencyProfileUpdate.normalize_blood_group(value)

    @field_validator("phone", "emergency_contact_phone")
    @classmethod
    def normalize_phone(cls, value, info):
        return EmergencyProfileUpdate.normalize_contact(value, info)


class PatientEnrollment(PatientProfileUpdate):
    full_name: str = Field(min_length=2, max_length=200)
    date_of_birth: date
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    identity_checked: bool


class PatientRead(PatientCreate):
    id: int
    has_account: bool = False
    blood_group_source: str | None = None
    emergency_details_updated_at: datetime | None = None
    identity_verification_status: str | None = None
    identity_verified_at: datetime | None = None
    identity_verified_by: int | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientSearchResult(PatientRead):
    pass


class RecentPatientRead(PatientSearchResult):
    last_viewed_at: datetime


class PatientAccountCreate(BaseModel):
    @field_validator("email", mode="before")
    @classmethod
    def normalize_account_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

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
    blood_group_source: str | None = None
    updated_at: datetime | None = None
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

    @field_validator("blood_group")
    @classmethod
    def normalize_blood_group(cls, value):
        if value is None or not value.strip() or value.strip().lower() == "unknown":
            return None
        value = value.strip().upper().replace(" ", "")
        if value not in {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}:
            raise ValueError("Select a known blood group or Unknown")
        return value

    @field_validator("emergency_contact_name", "emergency_contact_phone")
    @classmethod
    def normalize_contact(cls, value, info):
        if value is None or not value.strip():
            return None
        value = value.strip()
        if info.field_name == "emergency_contact_name":
            if len(value) > 200:
                raise ValueError("Contact name must be 200 characters or fewer")
            return value
        import re

        if re.search(r"[^0-9+().\s-]", value):
            raise ValueError(
                "Use digits, spaces, parentheses, or a leading + country code"
            )
        cleaned = re.sub(r"[().\s-]", "", value)
        if not re.fullmatch(r"\+?[0-9]{7,15}", cleaned):
            raise ValueError(
                "Enter 7 to 15 digits with an optional leading + country code"
            )
        return cleaned
