from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.patient import PatientRead

class HospitalCreate(BaseModel):
    code: str
    name: str

class HospitalRead(HospitalCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class MappingCreate(BaseModel):
    patient_id: int
    hospital_id: int
    external_patient_id: str
    source_system: str | None = None

class MappingRead(MappingCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class EncounterCreate(BaseModel):
    patient_id: int
    hospital_id: int
    encounter_type: str
    reason: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    attending_doctor: str | None = None

class EncounterRead(EncounterCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ConditionCreate(BaseModel):
    patient_id: int
    encounter_id: int | None = None
    code: str | None = None
    name: str
    clinical_status: str = "active"
    diagnosed_on: date | None = None
    notes: str | None = None

class ConditionRead(ConditionCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AllergyCreate(BaseModel):
    patient_id: int
    substance: str
    reaction: str | None = None
    severity: str | None = None
    verified: bool = False
    recorded_on: date | None = None

class AllergyRead(AllergyCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class MedicationCreate(BaseModel):
    name: str
    generic_name: str | None = None
    form: str | None = None
    strength: str | None = None

class MedicationRead(MedicationCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PrescriptionCreate(BaseModel):
    patient_id: int
    medication_id: int
    encounter_id: int | None = None
    dose: str | None = None
    frequency: str | None = None
    route: str | None = None
    started_on: date | None = None
    ended_on: date | None = None
    status: str = "active"
    instructions: str | None = None


class PrescriptionRead(PrescriptionCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ObservationCreate(BaseModel):
    patient_id: int
    encounter_id: int | None = None
    name: str
    value: str
    unit: str | None = None
    reference_range: str | None = None
    observed_at: datetime
    status: str = "final"


class ObservationRead(ObservationCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UnifiedPrescriptionRead(PrescriptionRead):
    medication: MedicationRead | None = None


class UnifiedClinicalRecord(BaseModel):
    patient: PatientRead
    hospital_mappings: list[MappingRead]
    encounters: list[EncounterRead]
    conditions: list[ConditionRead]
    allergies: list[AllergyRead]
    prescriptions: list[UnifiedPrescriptionRead]
    observations: list[ObservationRead]


class PatientIdentityResolution(BaseModel):
    patient: PatientRead
    mapping: MappingRead
    hospital: HospitalRead
