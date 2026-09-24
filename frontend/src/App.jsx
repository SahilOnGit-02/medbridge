import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:8001";

function App() {
  const [searchId, setSearchId] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("medbridge_access_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function loginDoctor(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error("Invalid doctor email or password.");
    }

    const data = await response.json();

    localStorage.setItem("medbridge_access_token", data.access_token);
    setAccessToken(data.access_token);

    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    if (!meResponse.ok) {
      localStorage.removeItem("medbridge_access_token");
      setAccessToken("");
      throw new Error("Unable to load doctor profile.");
    }

    const user = await meResponse.json();
    setCurrentUser(user);
  }

  async function handleLogin(event) {
    event.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      await loginDoctor(loginEmail.trim(), loginPassword);
      setLoginPassword("");
    } catch (requestError) {
      setLoginError(
        requestError.message || "Unable to sign in."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function logoutDoctor() {
    localStorage.removeItem("medbridge_access_token");
    setAccessToken("");
    setCurrentUser(null);
    setPatient(null);
    setRecord(null);
    setSearchResults([]);
    setSearchId("");
    setRecordSearch("");
    setEmergencyMode(false);
    setError("");
  }

  async function searchPatient(event) {
    event.preventDefault();

    const query = searchId.trim();

    if (!query) {
      setError("Enter a patient name or MedBridge Patient ID.");
      setSearchResults([]);
      setPatient(null);
      setRecord(null);
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);
    setPatient(null);
    setRecord(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 401) {
        logoutDoctor();
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error("Unable to search patients.");
      }

      const data = await response.json();

      if (!data.length) {
        setError("No matching patients found.");
        return;
      }

      setSearchResults(data);

      if (data.length === 1) {
        await selectPatient(data[0]);
      }
    } catch (requestError) {
      setError(
        requestError.message || "Unable to search patients."
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectPatient(selectedPatient) {
    setLoading(true);
    setError("");
    setPatient(null);
    setRecord(null);

    try {
      const recordResponse = await fetch(
        `${API_BASE_URL}/clinical/patients/${selectedPatient.id}/record`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (recordResponse.status === 401) {
        logoutDoctor();
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!recordResponse.ok) {
        throw new Error(
          "Patient found, but clinical record could not be loaded."
        );
      }

      const recordData = await recordResponse.json();

  setPatient(selectedPatient);
  setRecord(recordData);
  setSearchResults([]);
  setActiveView("dashboard");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Patient found, but clinical record could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }


  async function loadPatients() {
    if (!accessToken) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        logoutDoctor();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load patients.");
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load patients."
      );
    } finally {
      setLoading(false);
    }
  }

  const recordSearchTerm = recordSearch.trim().toLowerCase();

  const recordMatches =
    recordSearchTerm && record
      ? {
          encounters: record.encounters.filter((encounter) =>
            [
              encounter.reason,
              encounter.encounter_type,
              encounter.attending_doctor,
            ]
              .filter(Boolean)
              .some((value) =>
                value.toLowerCase().includes(recordSearchTerm)
              )
          ),

          conditions: record.conditions.filter((condition) =>
            [
              condition.name,
              condition.code,
              condition.clinical_status,
              condition.notes,
            ]
              .filter(Boolean)
              .some((value) =>
                value.toLowerCase().includes(recordSearchTerm)
              )
          ),

          allergies: record.allergies.filter((allergy) =>
            [
              allergy.substance,
              allergy.reaction,
              allergy.severity,
            ]
              .filter(Boolean)
              .some((value) =>
                value.toLowerCase().includes(recordSearchTerm)
              )
          ),

          prescriptions: record.prescriptions.filter((prescription) =>
            [
              prescription.medication?.name,
              prescription.medication?.generic_name,
              prescription.dose,
              prescription.frequency,
              prescription.route,
              prescription.status,
              prescription.instructions,
            ]
              .filter(Boolean)
              .some((value) =>
                value.toLowerCase().includes(recordSearchTerm)
              )
          ),

          observations: record.observations.filter((observation) => {
            const searchableValues = [
              observation.name,
              observation.value,
              observation.unit,
              observation.reference_range,
              observation.status,
            ];

            const aliases = {
              crp: "c-reactive protein",
            };

            const expandedSearchTerm =
              aliases[recordSearchTerm] || recordSearchTerm;

            return searchableValues
              .filter(Boolean)
              .some((value) =>
                value.toLowerCase().includes(expandedSearchTerm)
              );
          }),
        }
      : null;

  /*
   * LOGIN SCREEN
   */
  if (!accessToken) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark">M</div>

            <div>
              <div className="brand-name">MedBridge</div>
              <div className="brand-subtitle">
                Clinical Intelligence
              </div>
            </div>
          </div>

          <div className="login-heading">
            <p className="section-label">DOCTOR PORTAL</p>

            <h1>Sign in to MedBridge</h1>

            <p>
              Access unified patient records across connected
              hospitals.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              type="email"
              placeholder="doctor@medbridge.in"
              value={loginEmail}
              onChange={(event) =>
                setLoginEmail(event.target.value)
              }
              required
              autoComplete="email"
            />

            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={loginPassword}
              onChange={(event) =>
                setLoginPassword(event.target.value)
              }
              required
              autoComplete="current-password"
            />

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loginLoading}
            >
              {loginLoading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="login-footer">
            Authorized medical staff only
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>

          <div>
            <div className="brand-name">MedBridge</div>
            <div className="brand-subtitle">
              Clinical Intelligence
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
  className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
  onClick={() => setActiveView("dashboard")}
>
  <span>D</span>
  Dashboard
</button>

          <button
  className={`nav-item ${activeView === "patients" ? "active" : ""}`}
  onClick={async () => {
  setActiveView("patients");
  await loadPatients();
}}
>
  <span>P</span>
  Patients
</button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            System operational
          </div>

          <div className="version">
            MedBridge v0.2.0
          </div>
        </div>
      </aside>

      <main className="main-content">
{activeView === "patients" ? (
  <section className="patients-directory">
    <div className="page-header">
      <div>
        <div className="eyebrow">PATIENT DIRECTORY</div>
        <h1>Patients</h1>
        <p>
          Patients available to you through your hospital access.
        </p>
      </div>

      <div className="directory-count">
        {searchResults.length} patients
      </div>
    </div>

    {loading && (
      <div className="dashboard-card">
        <p>Loading patients...</p>
      </div>
    )}

    {!loading && error && (
      <div className="dashboard-card">
        <p className="error-message">{error}</p>
      </div>
    )}

    {!loading && !error && (
      <section className="patients-grid">
        {searchResults.map((listedPatient) => (
          <button
            className="patient-directory-card"
            key={listedPatient.id}
            onClick={() => selectPatient(listedPatient)}
          >
            <div className="patient-avatar">
              {listedPatient.full_name
                .split(" ")
                .map((name) => name[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="patient-directory-info">
              <h3>{listedPatient.full_name}</h3>

              <span>
                {listedPatient.medbridge_id}
              </span>

              <div className="patient-directory-meta">
                <span>
                  DOB:{" "}
                  {listedPatient.date_of_birth || "Not recorded"}
                </span>

                <span>
                  Blood group:{" "}
                  {listedPatient.blood_group || "Not recorded"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </section>
    )}
  </section>
) : (
  <>
    {emergencyMode && (
          <section className="emergency-view">
            <div className="emergency-header">
              <div>
                <p className="section-label">
                  EMERGENCY MODE
                </p>

                <h2>Critical Patient Information</h2>

                <p className="section-description">
                  Rapid access to essential clinical
                  information for emergency care.
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
                  Search for a patient first, then activate
                  Emergency Mode.
                </span>
              </div>
            ) : (
  <div className="emergency-content">
    <div className="emergency-patient-card">
  <div className="emergency-patient-identity">
    <div
      className={`emergency-patient-avatar ${
        patient.profile_photo_url ? "has-photo" : ""
      }`}
    >
      {patient.profile_photo_url ? (
        <img
          src={patient.profile_photo_url}
          alt={`${patient.full_name} profile`}
        />
      ) : (
        patient.full_name
          .split(" ")
          .map((name) => name[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      )}
    </div>

    <div className="emergency-patient-name">
      <span>Patient</span>
      <strong>{patient.full_name}</strong>
      <small>{patient.medbridge_id}</small>
    </div>
  </div>

  <div className="emergency-patient-meta">
    <div>
      <span>Date of birth</span>
      <strong>{patient.date_of_birth || "Not recorded"}</strong>
    </div>

    <div>
      <span>Age</span>
      <strong>
        {patient.date_of_birth
          ? Math.floor(
              (new Date() - new Date(patient.date_of_birth)) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : "Not recorded"}
      </strong>
    </div>

    <div>
      <span>Blood group</span>
      <strong>{patient.blood_group || "Not recorded"}</strong>
    </div>

    <div>
      <span>Identity</span>
      <strong>
        {patient.identity_verification_status === "verified"
          ? "Verified"
          : "Not verified"}
      </strong>
    </div>
  </div>
</div>
                <div className="emergency-grid">
                  <div className="emergency-card">
                    <span className="emergency-card-label">
                      BLOOD GROUP
                    </span>

                    <strong>
                      {patient.blood_group ||
                        "Not recorded"}
                    </strong>
                  </div>

                  <div className="emergency-card allergy-warning">
                    <span className="emergency-card-label">
                      ALLERGIES
                    </span>

                    <strong>
                      {record.allergies.length
                        ? record.allergies
                            .map(
                              (allergy) =>
                                allergy.substance
                            )
                            .join(", ")
                        : "No known allergies recorded"}
                    </strong>
                  </div>

                  <div className="emergency-card">
                    <span className="emergency-card-label">
                      ACTIVE MEDICATIONS
                    </span>

                    <strong>
                      {record.prescriptions.length
                        ? [
                            ...new Set(
                              record.prescriptions.map(
                                (prescription) =>
                                  prescription.medication
                                    ?.name ||
                                  "Medication"
                              )
                            ),
                          ].join(", ")
                        : "No medications recorded"}
                    </strong>
                  </div>

                  <div className="emergency-card">
                    <span className="emergency-card-label">
                      RECENT CONDITIONS
                    </span>

                    <strong>
                      {record.conditions.length
                        ? [
                            ...new Set(
                              record.conditions
                                .slice(0, 3)
                                .map(
                                  (condition) =>
                                    condition.name
                                )
                            ),
                          ].join(", ")
                        : "No conditions recorded"}
                    </strong>
                  </div>

                  <div className="emergency-card">
                    <span className="emergency-card-label">
                      RECENT ENCOUNTER
                    </span>

                    <strong>
                      {record.encounters.length
                        ? record.encounters
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(
                                  b.started_at
                                ) -
                                new Date(
                                  a.started_at
                                )
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
                                new Date(
                                  b.started_at
                                ) -
                                new Date(
                                  a.started_at
                                )
                            )[0].started_at
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}

                        {" • "}

                        {
                          record.encounters
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(
                                  b.started_at
                                ) -
                                new Date(
                                  a.started_at
                                )
                            )[0].attending_doctor
                        }
                      </small>
                    )}
                  </div>

                  <div className="emergency-card">
                    <span className="emergency-card-label">
                      LATEST OBSERVATIONS
                    </span>

                    <strong>
                      {record.observations.length
                        ? [
                            ...new Map(
                              record.observations
                                .slice()
                                .sort(
                                  (a, b) =>
                                    new Date(
                                      b.observed_at
                                    ) -
                                    new Date(
                                      a.observed_at
                                    )
                                )
                                .map(
                                  (observation) => [
                                    observation.name,
                                    observation,
                                  ]
                                )
                            ).values(),
                          ]
                            .slice(0, 3)
                            .map(
                              (observation) =>
                                `${observation.name}: ${observation.value} ${
                                  observation.unit || ""
                                }`
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
                <div className="eyebrow">
                  DOCTOR PORTAL
                </div>

                <h1>Clinical Dashboard</h1>
              </div>

              <button
                className="emergency-button"
                onClick={() =>
                  setEmergencyMode(!emergencyMode)
                }
              >
                Emergency Mode
              </button>

              <div className="doctor-profile">
                <div className="doctor-avatar">
                  DR
                </div>

                <div>
                  <strong>
                    {currentUser?.full_name ||
                      "Doctor"}
                  </strong>

                  <span>
                    {currentUser?.role ||
                      "Medical Staff"}
                  </span>
                </div>

                <button
                  type="button"
                  className="logout-button"
                  onClick={logoutDoctor}
                >
                  Sign out
                </button>
              </div>
            </header>

            <section className="welcome-section">
              <div>
                <p className="section-label">
                  UNIFIED HEALTH RECORD
                </p>

                <h2>Find a patient</h2>

                <p className="section-description">
                  Access consolidated clinical information
                  across connected hospitals through
                  MedBridge.
                </p>
              </div>

              <form
                className="search-card"
                onSubmit={searchPatient}
              >
                <label htmlFor="patient-search">
                  Search Patient
                </label>

                <div className="search-row">
                  <input
                    id="patient-search"
                    type="text"
                    placeholder="Name or MedBridge ID"
                    value={searchId}
                    onChange={(event) =>
                      setSearchId(event.target.value)
                    }
                  />

                  <button
                    type="submit"
                    className="search-button"
                    disabled={loading}
                  >
                    {loading
                      ? "Searching..."
                      : "Search Patient"}
                  </button>
                </div>

                {error && (
                  <div className="search-error">
                    {error}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className="search-result"
                        onClick={() =>
                          selectPatient(result)
                        }
                        disabled={loading}
                      >
                        <span className="search-result-primary">
                          <strong>
                            {result.full_name}
                          </strong>

                          <small>
                            {result.medbridge_id}
                          </small>
                        </span>

                        <span className="search-result-details">
                          <span>
                            DOB:{" "}
                            {result.date_of_birth ||
                              "Not recorded"}
                          </span>

                          <span>
                            Blood group:{" "}
                            {result.blood_group ||
                              "Not recorded"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card patient-card">
                <div className="card-header">
                  <div>
                    <p className="card-label">
                      PATIENT OVERVIEW
                    </p>

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
                        <div className={`patient-avatar ${patient.profile_photo_url ? "has-photo" : ""}`}>
  {patient.profile_photo_url ? (
    <img
      src={patient.profile_photo_url}
      alt={`${patient.full_name} profile`}
    />
  ) : (
    patient.full_name
      .split(" ")
      .map((name) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  )}
</div>
<div>
  <span>Internal ID</span>
  <strong>#{patient.id}</strong>
</div>

<div className="identity-verification">
  <div>
    <span>Identity verification</span>
    <strong>
      {patient.identity_verification_status === "verified"
        ? "Verified"
        : "Not verified"}
    </strong>
  </div>

  {patient.identity_verified_at && (
    <div>
      <span>Verified at</span>
      <strong>
        {new Date(patient.identity_verified_at).toLocaleString()}
      </strong>
    </div>
  )}
</div>
                        <div>
                          <strong>
                            {patient.full_name}
                          </strong>

                          <span>
                            {patient.medbridge_id}
                          </span>
                        </div>
                      </div>

                      <div className="patient-fields">
  <div>
    <span>Date of birth</span>
    <strong>{patient.date_of_birth || "Not recorded"}</strong>
  </div>

  <div>
    <span>Age</span>
    <strong>
      {patient.date_of_birth
        ? Math.floor(
            (new Date() - new Date(patient.date_of_birth)) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : "Not recorded"}
    </strong>
  </div>

  <div>
    <span>Gender</span>
    <strong>{patient.gender || "Not recorded"}</strong>
  </div>

  <div>
    <span>Blood group</span>
    <strong>{patient.blood_group || "Not recorded"}</strong>
  </div>

  <div>
    <span>Phone</span>
    <strong>{patient.phone || "Not recorded"}</strong>
  </div>

  <div>
    <span>Email</span>
    <strong>{patient.email || "Not recorded"}</strong>
  </div>

  <div>
    <span>Address</span>
    <strong>{patient.address || "Not recorded"}</strong>
  </div>

  <div>
    <span>Emergency contact</span>
    <strong>
      {patient.emergency_contact_name
        ? `${patient.emergency_contact_name}${
            patient.emergency_contact_phone
              ? ` · ${patient.emergency_contact_phone}`
              : ""
          }`
        : "Not recorded"}
    </strong>
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
                          <p className="card-label">
                            CONNECTED IDENTITIES
                          </p>

                          <strong>
                            Hospital records
                          </strong>
                        </div>

                        <span className="card-badge">
                          {record?.hospital_mappings
                            ?.length || 0}
                        </span>
                      </div>

                      <div className="identity-list">
                        {record?.hospital_mappings?.map(
                          (mapping) => (
                            <div
                              className="identity-item"
                              key={mapping.id}
                            >
                              <div>
                                <strong>
                                  Hospital #
                                  {mapping.hospital_id}
                                </strong>

                                <span>
                                  {mapping.source_system}
                                </span>
                              </div>

                              <div>
                                <span>
                                  External Patient ID
                                </span>

                                <strong>
                                  {
                                    mapping.external_patient_id
                                  }
                                </strong>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      +
                    </div>

                    <strong>
                      No patient selected
                    </strong>

                    <span>
                      Search for a patient by name or
                      MedBridge ID to view the unified
                      record.
                    </span>
                  </div>
                )}
              </article>

              <article className="dashboard-card">
                <div className="card-header">
                  <div>
                    <p className="card-label">
                      CLINICAL RECORD
                    </p>

                    <h3>Record summary</h3>
                  </div>

                  <div className="interoperability-badge">
                    <strong>
                      FHIR-COMPATIBLE
                    </strong>

                    <span>
                      Interoperability mappings available
                    </span>
                  </div>
                </div>

                <div className="record-search">
                  <label htmlFor="record-search-input">
                    Search clinical record
                  </label>

                  <input
                    id="record-search-input"
                    type="text"
                    placeholder="e.g. bronchitis, penicillin, CRP"
                    value={recordSearch}
                    onChange={(event) =>
                      setRecordSearch(event.target.value)
                    }
                  />
                </div>

                <div className="record-stats">
                  <div>
                    <strong>
                      {record
                        ? record.encounters.length
                        : "-"}
                    </strong>

                    <span>Encounters</span>
                  </div>

                  <div>
                    <strong>
                      {record
                        ? record.conditions.length
                        : "-"}
                    </strong>

                    <span>Conditions</span>
                  </div>

                  <div>
                    <strong>
                      {record
                        ? record.allergies.length
                        : "-"}
                    </strong>

                    <span>Allergies</span>
                  </div>

                  <div>
                    <strong>
                      {record
                        ? record.prescriptions.length
                        : "-"}
                    </strong>

                    <span>Medications</span>
                  </div>
                </div>

                {record && record.patient.medbridge_id === "MB-A-DEMO-005" && (
                  <div className="source-documents">
                    <div className="source-documents-header">
                      <div>
                        <p className="card-label">
                          SOURCE DOCUMENTS
                        </p>

                        <h4>
                          Diagnostic reports
                        </h4>
                      </div>

                      <span className="card-badge">
                        2
                      </span>
                    </div>

                    <div className="source-document-list">
                      <a
                        className="source-document"
                        href="/demo-reports/MedBridge_Rohan_Mehta_CBC_CRP_Synthetic_Report.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div>
                          <strong>
                            CBC + CRP Blood Test
                          </strong>

                          <span>
                            Hospital A - 20 Aug 2026
                          </span>
                        </div>

                        <span>
                          View PDF -&gt;
                        </span>
                      </a>

                      <a
                        className="source-document"
                        href="/demo-reports/MedBridge_Rohan_Mehta_Typhoid_Widal_Synthetic_Report.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div>
                          <strong>
                            Typhoid / Widal Test
                          </strong>

                          <span>
                            Hospital B - 22 Aug 2026
                          </span>
                        </div>

                        <span>
                          View PDF -&gt;
                        </span>
                      </a>
                    </div>
                  </div>
                )}
              </article>
            </section>

            <section className="dashboard-card timeline-card">
              <div className="card-header">
                <div>
                  <p className="card-label">
                    CLINICAL TIMELINE
                  </p>

                  <h3>Recent activity</h3>
                </div>

                <span className="muted-text">
                  {record
                    ? `${record.encounters.length} encounters`
                    : "Awaiting patient selection"}
                </span>
              </div>

              {record ? (
                <div className="timeline-list">
                  {(recordSearchTerm
                    ? recordMatches.encounters
                    : record.encounters
                  )
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.started_at) -
                        new Date(a.started_at)
                    )
                    .map((encounter) => (
                      <div
                        className="timeline-item"
                        key={encounter.id}
                      >
                        <div className="timeline-marker"></div>

                        <div className="timeline-content">
                          <div className="timeline-date">
                            {new Date(
                              encounter.started_at
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </div>

                          <div className="timeline-main">
                            <strong>
                              {encounter.reason}
                            </strong>

                            <span>
                              {encounter.encounter_type}{" "}
                              -{" "}
                              {
                                encounter.attending_doctor
                              }
                            </span>
                          </div>

                          <div className="timeline-time">
                            {new Date(
                              encounter.started_at
                            ).toLocaleTimeString(
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
                  Clinical events will appear here
                  after a patient is selected.
                </div>
              )}
            </section>

            {record && (
              <section className="clinical-details-grid">
                <article className="dashboard-card detail-card">
                  <div className="card-header">
                    <div>
                      <p className="card-label">
                        CONDITIONS
                      </p>

                      <h3>Diagnoses</h3>
                    </div>

                    <span className="card-badge">
                      {record.conditions.length}
                    </span>
                  </div>

                  <div className="detail-list">
                    {(recordSearchTerm
                      ? recordMatches.conditions
                      : record.conditions
                    ).map((condition) => (
                      <div
                        className="detail-item"
                        key={condition.id}
                      >
                        <div>
                          <strong>
                            {condition.name}
                          </strong>

                          <span>
                            {condition.code ||
                              "No code"}{" "}
                            -{" "}
                            {condition.clinical_status}
                          </span>
                        </div>

                        <small>
                          {condition.diagnosed_on ||
                            "Date not recorded"}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card detail-card">
                  <div className="card-header">
                    <div>
                      <p className="card-label">
                        ALLERGIES
                      </p>

                      <h3>Known allergies</h3>
                    </div>

                    <span className="card-badge">
                      {record.allergies.length}
                    </span>
                  </div>

                  <div className="detail-list">
                    {(recordSearchTerm
                      ? recordMatches.allergies
                      : record.allergies
                    ).map((allergy) => (
                      <div
                        className="detail-item"
                        key={allergy.id}
                      >
                        <div>
                          <strong>
                            {allergy.substance}
                          </strong>

                          <span>
                            {allergy.reaction ||
                              "Reaction not recorded"}{" "}
                            -{" "}
                            {allergy.severity ||
                              "Severity not recorded"}
                          </span>
                        </div>

                        <small>
                          {allergy.verified
                            ? "Verified"
                            : "Unverified"}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card detail-card">
                  <div className="card-header">
                    <div>
                      <p className="card-label">
                        MEDICATIONS
                      </p>

                      <h3>Prescriptions</h3>
                    </div>

                    <span className="card-badge">
                      {record.prescriptions.length}
                    </span>
                  </div>

                  <div className="detail-list">
                    {(recordSearchTerm
                      ? recordMatches.prescriptions
                      : record.prescriptions
                    ).map((prescription) => (
                      <div
                        className="detail-item"
                        key={prescription.id}
                      >
                        <div>
                          <strong>
                            {prescription.medication
                              ?.name ||
                              "Medication"}
                          </strong>

                          <span>
                            {prescription.dose} -{" "}
                            {prescription.frequency} -{" "}
                            {prescription.route}
                          </span>
                        </div>

                        <small>
                          {prescription.status}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card detail-card">
                  <div className="card-header">
                    <div>
                      <p className="card-label">
                        OBSERVATIONS
                      </p>

                      <h3>
                        Clinical measurements
                      </h3>
                    </div>

                    <span className="card-badge">
                      {record.observations.length}
                    </span>
                  </div>

                  <div className="detail-list">
                    {(recordSearchTerm
                      ? recordMatches.observations
                      : record.observations
                    ).map((observation) => (
                      <div
                        className="detail-item"
                        key={observation.id}
                      >
                        <div>
                          <strong>
                            {observation.name}
                          </strong>

                          <span>
                            Reference:{" "}
                            {observation.reference_range ||
                              "Not recorded"}
                          </span>
                        </div>

                        <small>
                          {observation.value}{" "}
                          {observation.unit}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </>
    )}
    </main>
    </div>
  );
}

export default App;