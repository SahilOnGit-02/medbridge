from app.models.patient import Patient
from app.models.hospital import Hospital
from app.models.clinical import PatientHospitalMapping, Encounter, Condition, Allergy, Medication, Prescription, Observation


def patient_to_fhir(patient: Patient) -> dict:
    https = chr(104) + chr(116) + chr(116) + chr(112) + chr(115) + chr(58) + chr(47) + chr(47)
    patient_id_system = https + "medbridge.local/patient-id"
    hospital_id_system = https + "medbridge.local/hospital-patient-id"
    blood_group_url = https + "medbridge.local/fhir/StructureDefinition/blood-group"

    resource = {
        "resourceType": "Patient",
        "id": str(patient.id),
        "identifier": [
            {
                "system": patient_id_system,
                "value": patient.medbridge_id,
            }
        ],
        "name": [{"text": patient.full_name}],
    }

    for mapping in patient.hospital_mappings:
        resource["identifier"].append(
            {
                "system": hospital_id_system,
                "value": mapping.external_patient_id,
                "assigner": {
                    "display": f"Hospital/{mapping.hospital_id}",
                },
            }
        )

    if patient.date_of_birth is not None:
        resource["birthDate"] = patient.date_of_birth.isoformat()

    if patient.blood_group is not None:
        resource["extension"] = [
            {"url": blood_group_url, "valueString": patient.blood_group}
        ]

    return resource


def encounter_to_fhir(encounter: Encounter) -> dict:
    resource = {
        "resourceType": "Encounter",
        "id": str(encounter.id),
        "status": "finished" if encounter.ended_at else "in-progress",
        "class": {
            "code": encounter.encounter_type,
            "display": encounter.encounter_type,
        },
        "subject": {"reference": f"Patient/{encounter.patient_id}"},
        "period": {"start": encounter.started_at.isoformat()},
    }

    if encounter.ended_at is not None:
        resource["period"]["end"] = encounter.ended_at.isoformat()

    if encounter.reason:
        resource["reason"] = [{"text": encounter.reason}]

    if encounter.attending_doctor:
        resource["participant"] = [
            {"individual": {"display": encounter.attending_doctor}}
        ]

    return resource


def condition_to_fhir(condition: Condition) -> dict:
    resource = {
        "resourceType": "Condition",
        "id": str(condition.id),
        "clinicalStatus": {"text": condition.clinical_status},
        "subject": {"reference": f"Patient/{condition.patient_id}"},
        "code": {"text": condition.name},
    }

    if condition.code:
        resource["code"]["coding"] = [
            {"code": condition.code, "display": condition.name}
        ]

    if condition.encounter_id is not None:
        resource["encounter"] = {"reference": f"Encounter/{condition.encounter_id}"}

    if condition.diagnosed_on is not None:
        resource["onsetDateTime"] = condition.diagnosed_on.isoformat()

    if condition.notes:
        resource["note"] = [{"text": condition.notes}]

    return resource


def allergy_to_fhir(allergy: Allergy) -> dict:
    resource = {
        "resourceType": "AllergyIntolerance",
        "id": str(allergy.id),
        "patient": {"reference": f"Patient/{allergy.patient_id}"},
        "code": {"text": allergy.substance},
        "verificationStatus": {
            "text": "confirmed" if allergy.verified else "unconfirmed"
        },
    }

    if allergy.reaction:
        resource["reaction"] = [
            {"manifestation": [{"text": allergy.reaction}]}
        ]

    if allergy.severity:
        resource["reaction"] = resource.get("reaction", [{}])
        resource["reaction"][0]["severity"] = allergy.severity

    if allergy.recorded_on is not None:
        resource["recordedDate"] = allergy.recorded_on.isoformat()

    return resource


def medication_to_fhir(medication: Medication) -> dict:
    resource = {
        "resourceType": "Medication",
        "id": str(medication.id),
        "code": {
            "text": medication.name,
        },
    }

    if medication.generic_name:
        resource["code"]["coding"] = [
            {
                "display": medication.generic_name,
            }
        ]

    if medication.form or medication.strength:
        resource["form"] = {
            "text": medication.form or "",
        }

    if medication.strength:
        resource["ingredient"] = [
            {
                "itemCodeableConcept": {
                    "text": medication.name,
                },
                "strength": {
                    "numerator": {
                        "value": medication.strength,
                    },
                },
            }
        ]

    return resource


def prescription_to_fhir(prescription: Prescription) -> dict:
    resource = {
        "resourceType": "MedicationRequest",
        "id": str(prescription.id),
        "status": prescription.status,
        "intent": "order",
        "subject": {
            "reference": f"Patient/{prescription.patient_id}",
        },
        "medicationReference": {
            "reference": f"Medication/{prescription.medication_id}",
        },
    }

    if prescription.encounter_id is not None:
        resource["encounter"] = {
            "reference": f"Encounter/{prescription.encounter_id}",
        }

    dosage = {}

    if prescription.dose:
        dosage["doseAndRate"] = [
            {
                "doseQuantity": {
                    "value": prescription.dose,
                }
            }
        ]

    if prescription.route:
        dosage["route"] = {
            "text": prescription.route,
        }

    if prescription.frequency:
        dosage["timing"] = {
            "code": {
                "text": prescription.frequency,
            }
        }

    if prescription.instructions:
        dosage["text"] = prescription.instructions

    if dosage:
        resource["dosageInstruction"] = [dosage]

    if prescription.started_on or prescription.ended_on:
        resource["dispenseRequest"] = {}

        if prescription.started_on:
            resource["dispenseRequest"]["validityPeriod"] = {
                "start": prescription.started_on.isoformat(),
            }

        if prescription.ended_on:
            resource["dispenseRequest"].setdefault("validityPeriod", {})[
                "end"
            ] = prescription.ended_on.isoformat()

    return resource


def observation_to_fhir(observation: Observation) -> dict:
    resource = {
        "resourceType": "Observation",
        "id": str(observation.id),
        "status": observation.status,
        "subject": {
            "reference": f"Patient/{observation.patient_id}",
        },
        "code": {
            "text": observation.name,
        },
        "valueString": observation.value,
        "effectiveDateTime": observation.observed_at.isoformat(),
    }

    if observation.encounter_id is not None:
        resource["encounter"] = {
            "reference": f"Encounter/{observation.encounter_id}",
        }

    if observation.unit:
        resource["valueQuantity"] = {
            "value": observation.value,
            "unit": observation.unit,
        }
        resource.pop("valueString", None)

    if observation.reference_range:
        resource["referenceRange"] = [
            {
                "text": observation.reference_range,
            }
        ]

    return resource


def hospital_to_fhir(hospital: Hospital) -> dict:
    return {
        "resourceType": "Organization",
        "id": str(hospital.id),
        "identifier": [
            {
                "system": "https://medbridge.local/hospital-id",
                "value": hospital.code,
            }
        ],
        "name": hospital.name,
        "active": True,
    }
