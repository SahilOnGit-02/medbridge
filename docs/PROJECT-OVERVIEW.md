# Project overview

MedBridge is a capstone prototype for bringing synthetic records from multiple hospital systems into a canonical patient record. Its audiences are clinicians finding a patient and reviewing available history, patients reviewing their own records and controlling hospital sharing, and administrators approving doctor registrations.

Implemented: separate portal sign-in and registration, email verification and recovery, administrator-approved doctor access, name/ID and DOB search, recent patients, unified clinical categories and timelines, consent scopes, emergency sessions, PDF reports, FHIR-compatible mapping, and simulated hospital ingestion exports.

AI-generated clinical summaries, real hospital integration, ABDM production integration and clinical validation are not implemented. SMTP delivery is configurable; a real provider, verified sender and final URLs are still needed. The project uses synthetic data and should not be presented as a deployed clinical service.

Primary doctor journey: sign in, search and confirm name/DOB/ID, open a focused record, scan current information, review history and permitted PDF reports. Primary patient journey: sign in, review identity/profile, browse history or Medical Reports, review sharing and access history.
