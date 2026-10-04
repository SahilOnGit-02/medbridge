# Database design

Generated from SQLAlchemy metadata. Actual database creation and changes are governed by Alembic migrations.
This inventory describes the schema, not populated data.

## Entity relationship diagram

```mermaid
erDiagram
    account_throttles {
        VARCHAR key PK
        DATETIME started_at
        INTEGER attempts
    }
    account_tokens {
        INTEGER id PK
        INTEGER user_id FK
        VARCHAR digest
        VARCHAR portal
        VARCHAR purpose
        DATETIME expires_at
        DATETIME consumed_at
    }
    allergies {
        INTEGER id PK
        INTEGER patient_id FK
        VARCHAR substance
        TEXT reaction
        VARCHAR severity
        BOOLEAN verified
        DATE recorded_on
    }
    audit_logs {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER hospital_id FK
        INTEGER patient_id FK
        VARCHAR action
        VARCHAR resource_type
        INTEGER resource_id
        BOOLEAN success
        TEXT details
        DATETIME created_at
    }
    conditions {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER encounter_id FK
        VARCHAR code
        VARCHAR name
        VARCHAR clinical_status
        DATE diagnosed_on
        TEXT notes
    }
    doctor_registrations {
        INTEGER id PK
        INTEGER user_id FK
        VARCHAR registration_number
        VARCHAR organization
        INTEGER reviewed_by FK
        DATETIME reviewed_at
    }
    email_verifications {
        INTEGER id PK
        INTEGER user_id FK
        VARCHAR challenge_digest
        VARCHAR code_digest
        VARCHAR portal
        DATETIME sent_at
        DATETIME expires_at
        INTEGER attempts
        DATETIME consumed_at
    }
    emergency_access {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER user_id FK
        INTEGER hospital_id FK
        TEXT reason
        VARCHAR status
        DATETIME granted_at
        DATETIME expires_at
        DATETIME ended_at
        DATETIME created_at
    }
    encounters {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER hospital_id FK
        VARCHAR encounter_type
        TEXT reason
        DATETIME started_at
        DATETIME ended_at
        VARCHAR attending_doctor
    }
    hospitals {
        INTEGER id PK
        VARCHAR code
        VARCHAR name
        DATETIME created_at
    }
    medical_reports {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER hospital_id FK
        VARCHAR title
        VARCHAR report_type
        TEXT description
        DATE issued_on
        VARCHAR issuing_doctor
        VARCHAR department
        VARCHAR file_name
        VARCHAR file_path
        VARCHAR mime_type
        DATETIME created_at
    }
    medications {
        INTEGER id PK
        VARCHAR name
        VARCHAR generic_name
        VARCHAR form
        VARCHAR strength
    }
    observations {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER encounter_id FK
        VARCHAR name
        VARCHAR value
        VARCHAR unit
        VARCHAR reference_range
        DATETIME observed_at
        VARCHAR status
    }
    patient_hospital_consents {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER hospital_id FK
        VARCHAR status
        TEXT purpose
        BOOLEAN share_allergies
        BOOLEAN share_medications
        BOOLEAN share_conditions
        BOOLEAN share_prescriptions
        BOOLEAN share_observations
        BOOLEAN share_encounters
        BOOLEAN share_reports
        DATETIME granted_at
        DATETIME expires_at
        DATETIME revoked_at
        DATETIME created_at
    }
    patient_hospital_mappings {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER hospital_id FK
        VARCHAR external_patient_id
        VARCHAR source_system
    }
    patients {
        INTEGER id PK
        INTEGER user_id FK
        VARCHAR medbridge_id
        VARCHAR full_name
        DATE date_of_birth
        VARCHAR blood_group
        VARCHAR blood_group_source
        DATETIME emergency_details_updated_at
        VARCHAR gender
        VARCHAR phone
        VARCHAR email
        VARCHAR address
        VARCHAR emergency_contact_name
        VARCHAR emergency_contact_phone
        VARCHAR profile_photo_url
        VARCHAR identity_verification_status
        DATETIME identity_verified_at
        INTEGER identity_verified_by FK
        DATETIME created_at
    }
    prescriptions {
        INTEGER id PK
        INTEGER patient_id FK
        INTEGER medication_id FK
        INTEGER encounter_id FK
        VARCHAR dose
        VARCHAR frequency
        VARCHAR route
        DATE started_on
        DATE ended_on
        VARCHAR status
        TEXT instructions
    }
    users {
        INTEGER id PK
        VARCHAR email
        VARCHAR full_name
        VARCHAR password_hash
        VARCHAR role
        VARCHAR username
        VARCHAR registration_status
        DATETIME email_verified_at
        INTEGER auth_version
        INTEGER hospital_id FK
        BOOLEAN is_active
        DATETIME created_at
        DATETIME updated_at
    }
    users ||--o{ account_tokens : "user_id"
    patients ||--o{ allergies : "patient_id"
    hospitals |o--o{ audit_logs : "hospital_id"
    patients |o--o{ audit_logs : "patient_id"
    users |o--o{ audit_logs : "user_id"
    encounters |o--o{ conditions : "encounter_id"
    patients ||--o{ conditions : "patient_id"
    users |o--o{ doctor_registrations : "reviewed_by"
    users ||--o| doctor_registrations : "user_id"
    users ||--o{ email_verifications : "user_id"
    hospitals ||--o{ emergency_access : "hospital_id"
    patients ||--o{ emergency_access : "patient_id"
    users ||--o{ emergency_access : "user_id"
    hospitals ||--o{ encounters : "hospital_id"
    patients ||--o{ encounters : "patient_id"
    hospitals ||--o{ medical_reports : "hospital_id"
    patients ||--o{ medical_reports : "patient_id"
    encounters |o--o{ observations : "encounter_id"
    patients ||--o{ observations : "patient_id"
    hospitals ||--o{ patient_hospital_consents : "hospital_id"
    patients ||--o{ patient_hospital_consents : "patient_id"
    hospitals ||--o{ patient_hospital_mappings : "hospital_id"
    patients ||--o{ patient_hospital_mappings : "patient_id"
    users |o--o{ patients : "identity_verified_by"
    users |o--o| patients : "user_id"
    encounters |o--o{ prescriptions : "encounter_id"
    medications ||--o{ prescriptions : "medication_id"
    patients ||--o{ prescriptions : "patient_id"
    hospitals |o--o{ users : "hospital_id"
```

Relationship lines show foreign-key connections; nullable foreign keys and application-level constraints are listed below.

## account_throttles

| Column | Type | Nullable | References |
|---|---|---|---|
| `key` | VARCHAR(64) | No | - |
| `started_at` | DATETIME | No | - |
| `attempts` | INTEGER | No | - |

## account_tokens

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `user_id` | INTEGER | No | users.id |
| `digest` | VARCHAR(64) | No | - |
| `portal` | VARCHAR(20) | No | - |
| `purpose` | VARCHAR(20) | No | - |
| `expires_at` | DATETIME | No | - |
| `consumed_at` | DATETIME | Yes | - |

## allergies

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `substance` | VARCHAR(200) | No | - |
| `reaction` | TEXT | Yes | - |
| `severity` | VARCHAR(30) | Yes | - |
| `verified` | BOOLEAN | No | - |
| `recorded_on` | DATE | Yes | - |

## audit_logs

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `user_id` | INTEGER | Yes | users.id |
| `hospital_id` | INTEGER | Yes | hospitals.id |
| `patient_id` | INTEGER | Yes | patients.id |
| `action` | VARCHAR(100) | No | - |
| `resource_type` | VARCHAR(50) | No | - |
| `resource_id` | INTEGER | Yes | - |
| `success` | BOOLEAN | No | - |
| `details` | TEXT | Yes | - |
| `created_at` | DATETIME | No | - |

## conditions

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `encounter_id` | INTEGER | Yes | encounters.id |
| `code` | VARCHAR(50) | Yes | - |
| `name` | VARCHAR(200) | No | - |
| `clinical_status` | VARCHAR(50) | No | - |
| `diagnosed_on` | DATE | Yes | - |
| `notes` | TEXT | Yes | - |

## doctor_registrations

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `user_id` | INTEGER | No | users.id |
| `registration_number` | VARCHAR(100) | No | - |
| `organization` | VARCHAR(200) | No | - |
| `reviewed_by` | INTEGER | Yes | users.id |
| `reviewed_at` | DATETIME | Yes | - |

## email_verifications

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `user_id` | INTEGER | No | users.id |
| `challenge_digest` | VARCHAR(64) | No | - |
| `code_digest` | VARCHAR(64) | No | - |
| `portal` | VARCHAR(20) | No | - |
| `sent_at` | DATETIME | No | - |
| `expires_at` | DATETIME | No | - |
| `attempts` | INTEGER | No | - |
| `consumed_at` | DATETIME | Yes | - |

## emergency_access

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `user_id` | INTEGER | No | users.id |
| `hospital_id` | INTEGER | No | hospitals.id |
| `reason` | TEXT | No | - |
| `status` | VARCHAR(20) | No | - |
| `granted_at` | DATETIME | No | - |
| `expires_at` | DATETIME | No | - |
| `ended_at` | DATETIME | Yes | - |
| `created_at` | DATETIME | No | - |

## encounters

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `hospital_id` | INTEGER | No | hospitals.id |
| `encounter_type` | VARCHAR(50) | No | - |
| `reason` | TEXT | Yes | - |
| `started_at` | DATETIME | No | - |
| `ended_at` | DATETIME | Yes | - |
| `attending_doctor` | VARCHAR(200) | Yes | - |

## hospitals

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `code` | VARCHAR(32) | No | - |
| `name` | VARCHAR(200) | No | - |
| `created_at` | DATETIME | No | - |

## medical_reports

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `hospital_id` | INTEGER | No | hospitals.id |
| `title` | VARCHAR(200) | No | - |
| `report_type` | VARCHAR(100) | No | - |
| `description` | TEXT | Yes | - |
| `issued_on` | DATE | No | - |
| `issuing_doctor` | VARCHAR(200) | Yes | - |
| `department` | VARCHAR(200) | Yes | - |
| `file_name` | VARCHAR(255) | No | - |
| `file_path` | VARCHAR(500) | No | - |
| `mime_type` | VARCHAR(100) | No | - |
| `created_at` | DATETIME | No | - |

## medications

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `name` | VARCHAR(200) | No | - |
| `generic_name` | VARCHAR(200) | Yes | - |
| `form` | VARCHAR(100) | Yes | - |
| `strength` | VARCHAR(100) | Yes | - |

## observations

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `encounter_id` | INTEGER | Yes | encounters.id |
| `name` | VARCHAR(200) | No | - |
| `value` | VARCHAR(200) | No | - |
| `unit` | VARCHAR(50) | Yes | - |
| `reference_range` | VARCHAR(100) | Yes | - |
| `observed_at` | DATETIME | No | - |
| `status` | VARCHAR(30) | No | - |

## patient_hospital_consents

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `hospital_id` | INTEGER | No | hospitals.id |
| `status` | VARCHAR(20) | No | - |
| `purpose` | TEXT | No | - |
| `share_allergies` | BOOLEAN | No | - |
| `share_medications` | BOOLEAN | No | - |
| `share_conditions` | BOOLEAN | No | - |
| `share_prescriptions` | BOOLEAN | No | - |
| `share_observations` | BOOLEAN | No | - |
| `share_encounters` | BOOLEAN | No | - |
| `share_reports` | BOOLEAN | No | - |
| `granted_at` | DATETIME | No | - |
| `expires_at` | DATETIME | Yes | - |
| `revoked_at` | DATETIME | Yes | - |
| `created_at` | DATETIME | No | - |

## patient_hospital_mappings

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `hospital_id` | INTEGER | No | hospitals.id |
| `external_patient_id` | VARCHAR(100) | No | - |
| `source_system` | VARCHAR(100) | Yes | - |

## patients

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `user_id` | INTEGER | Yes | users.id |
| `medbridge_id` | VARCHAR(64) | No | - |
| `full_name` | VARCHAR(200) | No | - |
| `date_of_birth` | DATE | Yes | - |
| `blood_group` | VARCHAR(8) | Yes | - |
| `blood_group_source` | VARCHAR(30) | Yes | - |
| `emergency_details_updated_at` | DATETIME | Yes | - |
| `gender` | VARCHAR(30) | Yes | - |
| `phone` | VARCHAR(30) | Yes | - |
| `email` | VARCHAR(255) | Yes | - |
| `address` | VARCHAR(500) | Yes | - |
| `emergency_contact_name` | VARCHAR(200) | Yes | - |
| `emergency_contact_phone` | VARCHAR(30) | Yes | - |
| `profile_photo_url` | VARCHAR(500) | Yes | - |
| `identity_verification_status` | VARCHAR(30) | Yes | - |
| `identity_verified_at` | DATETIME | Yes | - |
| `identity_verified_by` | INTEGER | Yes | users.id |
| `created_at` | DATETIME | No | - |

## prescriptions

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `patient_id` | INTEGER | No | patients.id |
| `medication_id` | INTEGER | No | medications.id |
| `encounter_id` | INTEGER | Yes | encounters.id |
| `dose` | VARCHAR(100) | Yes | - |
| `frequency` | VARCHAR(100) | Yes | - |
| `route` | VARCHAR(50) | Yes | - |
| `started_on` | DATE | Yes | - |
| `ended_on` | DATE | Yes | - |
| `status` | VARCHAR(30) | No | - |
| `instructions` | TEXT | Yes | - |

## users

| Column | Type | Nullable | References |
|---|---|---|---|
| `id` | INTEGER | No | - |
| `email` | VARCHAR(255) | No | - |
| `full_name` | VARCHAR(200) | No | - |
| `password_hash` | VARCHAR(255) | No | - |
| `role` | VARCHAR(50) | No | - |
| `username` | VARCHAR(60) | Yes | - |
| `registration_status` | VARCHAR(30) | No | - |
| `email_verified_at` | DATETIME | Yes | - |
| `auth_version` | INTEGER | No | - |
| `hospital_id` | INTEGER | Yes | hospitals.id |
| `is_active` | BOOLEAN | No | - |
| `created_at` | DATETIME | No | - |
| `updated_at` | DATETIME | No | - |
