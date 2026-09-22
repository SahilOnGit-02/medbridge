import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:8001";

function App() {
  const [searchId, setSearchId] = useState("");
const [patient, setPatient] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [record, setRecord] = useState(null);
const [emergencyMode, setEmergencyMode] = useState(false);

  async function searchPatient(event) {
    event.preventDefault();

    const medbridgeId = searchId.trim();

    if (!medbridgeId) {
      setError("Enter a MedBridge Patient ID.");
      setPatient(null);
      return;
    }

    setLoading(true);
    setError("");
    setPatient(null);
    setRecord(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/${encodeURIComponent(medbridgeId)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Patient not found.");
        }

        throw new Error("Unable to retrieve patient.");
      }

      const data = await response.json();
      setPatient(data);

      const recordResponse = await fetch(
        `${API_BASE_URL}/clinical/patients/${data.id}/record`
      );

      if (!recordResponse.ok) {
        throw new Error("Patient found, but clinical record could not be loaded.");
      }

      const recordData = await recordResponse.json();
      setRecord(recordData);
    } catch (requestError) {
      setError(requestError.message || "Unable to retrieve patient.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MedBridge</div>
            <div className="brand-subtitle">Clinical Intelligence</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span>D</span>
          Dashboard
          </button>

          <button className="nav-item">
            <span>P</span>
          Patients
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            System operational
          </div>
          <div className="version">MedBridge v0.2.0</div>
        </div>
      </aside>

      <main className="main-content">
{emergencyMode && (
  <section className="emergency-view">
    <div className="emergency-header">
      <div>
        <p className="section-label">EMERGENCY MODE</p>
        <h2>Critical Patient Information</h2>
        <p className="section-description">
          Rapid access to essential clinical information for emergency care.
        </p>
      </div>

      <button
        className="emergency-exit-button"
        onClick={() => setEmergencyMode(false)}
      >
        Exit Emergency Mode
      </button>
    </div>

    {!patient || !record ? (
      <div className="emergency-empty">
        <strong>No patient selected</strong>
        <span>
          Search for a patient first, then activate Emergency Mode.
        </span>
      </div>
    ) : (
      <div className="emergency-content">
        <div className="emergency-patient-card">
          <span>Patient</span>
          <strong>{patient.full_name}</strong>
          <small>{patient.medbridge_id}</small>
        </div>

        <div className="emergency-grid">
        <div className="emergency-card">
            <span className="emergency-card-label">BLOOD GROUP</span>
            <strong>{patient.blood_group || "Not recorded"}</strong>
          </div>

          <div className="emergency-card allergy-warning">
            <span className="emergency-card-label">ALLERGIES</span>
            <strong>
              {record.allergies.length
                ? record.allergies.map((allergy) => allergy.substance).join(", ")
                : "No known allergies recorded"}
            </strong>
          </div>

          <div className="emergency-card">
            <span className="emergency-card-label">ACTIVE MEDICATIONS</span>
            <strong>
              {record.prescriptions.length
                   ? [...new Set(
                          record.prescriptions.map(
                               (prescription) => prescription.medication?.name || "Medication"
                           )
                      )].join(", ")
                   : "No medications recorded"}
            </strong>
          </div>

          <div className="emergency-card">
            <span className="emergency-card-label">RECENT CONDITIONS</span>
            <strong>
             {record.conditions.length
                  ? [...new Set(
                         record.conditions
                            .slice(0, 3)
                            .map((condition) => condition.name)
                   )].join(", ")
                : "No conditions recorded"}
            </strong>
          </div>
<div className="emergency-card">
  <span className="emergency-card-label">RECENT ENCOUNTER</span>
  <strong>
    {record.encounters.length
      ? record.encounters
          .slice()
          .sort(
            (a, b) =>
              new Date(b.started_at) - new Date(a.started_at)
          )[0].reason
      : "No encounters recorded"}
  </strong>

  {record.encounters.length > 0 && (
    <small>
      {new Date(
        record.encounters
          .slice()
          .sort(
            (a, b) =>
              new Date(b.started_at) - new Date(a.started_at)
          )[0].started_at
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
      {" • "}
      {record.encounters
        .slice()
        .sort(
          (a, b) =>
            new Date(b.started_at) - new Date(a.started_at)
        )[0].attending_doctor}
    </small>
  )}
</div>
   
<div className="emergency-card">
  <span className="emergency-card-label">LATEST OBSERVATIONS</span>
  <strong>
    {record.observations.length
  ? [
      ...new Map(
        record.observations
          .slice()
          .sort(
            (a, b) =>
              new Date(b.observed_at) - new Date(a.observed_at)
          )
          .map((observation) => [
            observation.name,
            observation,
          ])
      ).values(),
    ]
      .slice(0, 3)
      .map(
        (observation) =>
          `${observation.name}: ${observation.value} ${observation.unit || ""}`
      )
      .join(", ")
  : "No observations recorded"}
  </strong>
</div>
</div>
</div>
)}
</section>
)}

{!emergencyMode && (
  <>
    <header className="topbar">
          <div>
            <div className="eyebrow">DOCTOR PORTAL</div>
            <h1>Clinical Dashboard</h1>
          </div>

          <button
  className="emergency-button"
  onClick={() => setEmergencyMode(!emergencyMode)}
>
  {emergencyMode ? "Exit Emergency Mode" : "Emergency Mode"}
</button>

<div className="doctor-profile">
            <div className="doctor-avatar">DR</div>
            <div>
              <strong>Demo Doctor</strong>
              <span>Medical Staff</span>
            </div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <p className="section-label">UNIFIED HEALTH RECORD</p>
            <h2>Find a patient</h2>
            <p className="section-description">
              Access consolidated clinical information across connected
              hospitals through MedBridge.
            </p>
          </div>

          <form className="search-card" onSubmit={searchPatient}>
            <label htmlFor="patient-search">MedBridge Patient ID</label>

            <div className="search-row">
              <input
                id="patient-search"
                type="text"
                placeholder="e.g. MB-A-DEMO-005"
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
              />

              <button
                type="submit"
                className="search-button"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search Patient"}
              </button>
            </div>

            {error && <div className="search-error">{error}</div>}
          </form>
        </section>

        <section className="dashboard-grid">
        <article className="dashboard-card patient-card">
          <div className="card-header">
            <div>
              <p className="card-label">PATIENT OVERVIEW</p>
              <h3>Patient information</h3>
            </div>

            <span className="card-badge">
              {patient ? "FOUND" : "READY"}
            </span>
          </div>

          {patient ? (
            <div className="patient-details">
              <div className="patient-content">
                <div className="patient-primary">
                  <div className="patient-avatar">
                    {patient.full_name
.split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
.join("")
.toUpperCase()}
                  </div>

                  <div>
                    <strong>{patient.full_name}</strong>
                    <span>{patient.medbridge_id}</span>
                  </div>
                </div>

                <div className="patient-fields">
                  <div>
                    <span>Date of birth</span>
                    <strong>{patient.date_of_birth || "Not recorded"}</strong>
                  </div>

                  <div>
                    <span>Blood group</span>
                    <strong>{patient.blood_group || "Not recorded"}</strong>
                  </div>

                  <div>
                    <span>Internal ID</span>
                    <strong>#{patient.id}</strong>
                  </div>
                </div>
              </div>

              <div className="identity-section">
                <div className="identity-header">
                  <div>
                    <p className="card-label">CONNECTED IDENTITIES</p>
                    <strong>Hospital records</strong>
                  </div>

                  <span className="card-badge">
                    {record?.hospital_mappings?.length || 0}
                  </span>
                </div>

                <div className="identity-list">
                  {record?.hospital_mappings?.map((mapping) => (
                    <div className="identity-item" key={mapping.id}>
                      <div>
                        <strong>Hospital #{mapping.hospital_id}</strong>
                        <span>{mapping.source_system}</span>
                      </div>

                      <div>
                        <span>External Patient ID</span>
                        <strong>{mapping.external_patient_id}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">+</div>
              <strong>No patient selected</strong>
              <span>
                Search for a MedBridge Patient ID to view the unified record.
              </span>
            </div>
          )}
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="card-label">CLINICAL RECORD</p>
              <h3>Record summary</h3>
            </div>

            <div className="interoperability-badge">
              <strong>FHIR-COMPATIBLE</strong>
              <span>Interoperability mappings available</span>
            </div>
          </div>

          <div className="record-stats">
            <div>
              <strong>{record ? record.encounters.length : "-"}</strong>
              <span>Encounters</span>
            </div>

            <div>
              <strong>{record ? record.conditions.length : "-"}</strong>
              <span>Conditions</span>
            </div>

            <div>
              <strong>{record ? record.allergies.length : "-"}</strong>
              <span>Allergies</span>
            </div>

            <div>
              <strong>{record ? record.prescriptions.length : "-"}</strong>
              <span>Medications</span>
            </div>
          </div>
        </article>

      </section>
        <section className="dashboard-card timeline-card">
          <div className="card-header">
            <div>
              <p className="card-label">CLINICAL TIMELINE</p>
              <h3>Recent activity</h3>
            </div>

            <span className="muted-text">
              {record ? `${record.encounters.length} encounters` : "Awaiting patient selection"}
            </span>
          </div>

          {record ? (
            <div className="timeline-list">
              {record.encounters
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.started_at) - new Date(a.started_at)
                )
                .map((encounter) => (
                  <div className="timeline-item" key={encounter.id}>
                    <div className="timeline-marker"></div>

                    <div className="timeline-content">
                      <div className="timeline-date">
                        {new Date(encounter.started_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </div>

                      <div className="timeline-main">
                        <strong>{encounter.reason}</strong>
                        <span>
                         {encounter.encounter_type} -{" "}
                          {encounter.attending_doctor}
                        </span>
                      </div>

                      <div className="timeline-time">
                        {new Date(encounter.started_at).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="timeline-placeholder">
              Clinical events will appear here after a patient is selected.
            </div>
          )}
        </section>

        {record && (
          <section className="clinical-details-grid">
            <article className="dashboard-card detail-card">
              <div className="card-header">
                <div>
                  <p className="card-label">CONDITIONS</p>
                  <h3>Diagnoses</h3>
                </div>
                <span className="card-badge">{record.conditions.length}</span>
              </div>

              <div className="detail-list">
                {record.conditions.map((condition) => (
                  <div className="detail-item" key={condition.id}>
                    <div>
                      <strong>{condition.name}</strong>
                      <span>
                        {condition.code || "No code"} -{" "}
                        {condition.clinical_status}
                      </span>
                    </div>
                    <small>
                      {condition.diagnosed_on || "Date not recorded"}
                    </small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card detail-card">
              <div className="card-header">
                <div>
                  <p className="card-label">ALLERGIES</p>
                  <h3>Known allergies</h3>
                </div>
                <span className="card-badge">{record.allergies.length}</span>
              </div>

              <div className="detail-list">
                {record.allergies.map((allergy) => (
                  <div className="detail-item" key={allergy.id}>
                    <div>
                      <strong>{allergy.substance}</strong>
                      <span>
                        {allergy.reaction || "Reaction not recorded"} -{" "}
                        {allergy.severity || "Severity not recorded"}
                      </span>
                    </div>
                    <small>
                      {allergy.verified ? "Verified" : "Unverified"}
                    </small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card detail-card">
              <div className="card-header">
                <div>
                  <p className="card-label">MEDICATIONS</p>
                  <h3>Prescriptions</h3>
                </div>
                <span className="card-badge">{record.prescriptions.length}</span>
              </div>

              <div className="detail-list">
                {record.prescriptions.map((prescription) => (
                  <div className="detail-item" key={prescription.id}>
                    <div>
                      <strong>
                        {prescription.medication?.name || "Medication"}
                      </strong>
                      <span>
                        {prescription.dose} - {prescription.frequency} -{" "}
                        {prescription.route}
                      </span>
                    </div>
                    <small>{prescription.status}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card detail-card">
              <div className="card-header">
                <div>
                  <p className="card-label">OBSERVATIONS</p>
                  <h3>Clinical measurements</h3>
                </div>
                <span className="card-badge">{record.observations.length}</span>
              </div>

              <div className="detail-list">
                {record.observations.map((observation) => (
                  <div className="detail-item" key={observation.id}>
                    <div>
                      <strong>{observation.name}</strong>
                      <span>
                        Reference: {observation.reference_range || "Not recorded"}
                      </span>
                    </div>
                    <small>
                      {observation.value} {observation.unit}
                    </small>
                  </div>
                ))}
              </div>
            </article>
                </section>
               )}
    </>
      )}
      </main>
    </div>
  );
}

export default App;
