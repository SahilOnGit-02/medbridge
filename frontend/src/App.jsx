import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8001";
function PatientDashboard({
  accessToken,
  patient,
  patientSummary,
  patientLoading,
  patientError,
  patientConsents,
  patientConsentLoading,
  patientConsentError,
  onGrantConsent,
  onRevokeConsent,
  patientConsentActionLoading,
  patientAccessHistory,
  patientAccessHistoryLoading,
  patientAccessHistoryError,
    patientEmergencyProfile,
    patientEmergencyProfileLoading,
    patientEmergencyProfileError,
    setPatientEmergencyProfile,
    setPatientEmergencyProfileError,
    patientEmergencyProfileSaving,
    setPatientEmergencyProfileSaving,
    patientEmergencyProfileEdit,
    patientEmergencyProfileForm,
    setPatientEmergencyProfileEdit,
    setPatientEmergencyProfileForm,
  onLogout,
}) {
  if (patientLoading) {
    return (
      <div className="patient-app">
        <div className="patient-state-card">
          Loading your health records...
        </div>
      </div>
    );
  }

  if (patientError) {
    return (
      <div className="patient-app">
        <div className="patient-state-card patient-error">
          {patientError}
        </div>
      </div>
    );
  }

  if (!patientSummary) {
    return (
      <div className="patient-app">
        <div className="patient-state-card">
          No health record data is available yet.
        </div>
      </div>
    );
  }

  const profile = patientSummary.patient || patient;

  return (
    <div className="patient-app">
      <header className="patient-header">
        <div>
          <span className="patient-eyebrow">MEDBRIDGE</span>
          <h1>My Health Records</h1>
          <p>
            Welcome, {profile?.full_name || "Patient"}
          </p>
        </div>

        <button
          type="button"
          className="patient-logout-button"
          onClick={onLogout}
        >
          Sign out
        </button>
      </header>

      <main className="patient-dashboard">
        <section className="patient-welcome-card">
          <div>
            <span className="patient-eyebrow">
              PERSONAL HEALTH PROFILE
            </span>

            <h2>{profile?.full_name || "Patient"}</h2>

            <p>
              MedBridge ID:{" "}
              {profile?.medbridge_id || "Not available"}
            </p>
          </div>

          <div className="patient-blood-group">
            <span>Blood Group</span>
            <strong>
              {profile?.blood_group || "Not recorded"}
            </strong>
          </div>
        </section>

        <section className="patient-stat-grid">
          <div className="patient-stat-card">
            <span>Encounters</span>
            <strong>
              {patientSummary.encounters?.length || 0}
            </strong>
          </div>

          <div className="patient-stat-card">
            <span>Conditions</span>
            <strong>
              {patientSummary.conditions?.length || 0}
            </strong>
          </div>

          <div className="patient-stat-card">
            <span>Allergies</span>
            <strong>
              {patientSummary.allergies?.length || 0}
            </strong>
          </div>

          <div className="patient-stat-card">
            <span>Medications</span>
            <strong>
              {patientSummary.prescriptions?.length || 0}
            </strong>
          </div>
        </section>

        <section className="patient-record-grid">
          <div className="patient-panel">
            <div className="patient-panel-header">
              <h3>Allergies</h3>
            </div>

            {!patientSummary.allergies?.length ? (
              <p className="patient-empty">
                No allergies recorded.
              </p>
            ) : (
              patientSummary.allergies.map((allergy) => (
                <div
                  className="patient-record-item"
                  key={allergy.id}
                >
                  <strong>
                    {allergy.substance || "Unknown substance"}
                  </strong>

                  <span>
                    {allergy.reaction ||
                      "Reaction not recorded"}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="patient-panel">
            <div className="patient-panel-header">
              <h3>Current Medications</h3>
            </div>

            {!patientSummary.prescriptions?.length ? (
              <p className="patient-empty">
                No prescriptions recorded.
              </p>
            ) : (
              patientSummary.prescriptions.map(
                (prescription) => (
                  <div
                    className="patient-record-item"
                    key={prescription.id}
                  >
                    <strong>
                      {prescription.medication?.name ||
                        "Medication"}
                    </strong>

                    <span>
                      {prescription.dose ||
                        "Dose not recorded"}

                      {prescription.frequency
                        ? ` • ${prescription.frequency}`
                        : ""}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <section className="patient-panel patient-full-panel">
          <div className="patient-panel-header">
            <h3>Medical Conditions</h3>
          </div>

          {!patientSummary.conditions?.length ? (
            <p className="patient-empty">
              No medical conditions recorded.
            </p>
          ) : (
            patientSummary.conditions.map((condition) => (
              <div
                className="patient-record-item"
                key={condition.id}
              >
                <strong>
                  {condition.name || "Condition"}
                </strong>

                <span>
                  {condition.clinical_status ||
                    "Status not recorded"}
                </span>
              </div>
            ))
          )}
        </section>

<section className="patient-panel patient-full-panel patient-emergency-profile-panel">
  <div className="patient-panel-header">
    <div>
      <h3>Emergency Profile</h3>
      <p className="patient-empty">
        Information that can help medical staff during an emergency.
      </p>
    </div>

    {!patientEmergencyProfileLoading &&
      patientEmergencyProfile &&
      !patientEmergencyProfileEdit && (
        <button
          type="button"
          className="patient-secondary-button"
          onClick={() => {
            setPatientEmergencyProfileForm({
              blood_group:
                patientEmergencyProfile.blood_group || "",
              emergency_contact_name:
                patientEmergencyProfile.emergency_contact?.name || "",
              emergency_contact_phone:
                patientEmergencyProfile.emergency_contact?.phone || "",
            });
            setPatientEmergencyProfileEdit(true);
          }}
        >
          Edit
        </button>
      )}
  </div>

  {patientEmergencyProfileLoading ? (
    <p className="patient-empty">
      Loading emergency profile...
    </p>
  ) : patientEmergencyProfileError ? (
    <div className="patient-consent-error">
      {patientEmergencyProfileError}
    </div>
  ) : !patientEmergencyProfile ? (
    <p className="patient-empty">
      Emergency profile information is not available.
    </p>
  ) : patientEmergencyProfileEdit ? (
    <div className="patient-emergency-profile-form">
      <div className="patient-form-grid">
        <label>
          <span>Blood Group</span>
          <input
            type="text"
            value={patientEmergencyProfileForm.blood_group}
            onChange={(event) =>
              setPatientEmergencyProfileForm((current) => ({
                ...current,
                blood_group: event.target.value,
              }))
            }
            placeholder="e.g. O+"
          />
        </label>

        <label>
          <span>Emergency Contact Name</span>
          <input
            type="text"
            value={
              patientEmergencyProfileForm.emergency_contact_name
            }
            onChange={(event) =>
              setPatientEmergencyProfileForm((current) => ({
                ...current,
                emergency_contact_name: event.target.value,
              }))
            }
            placeholder="Full name"
          />
        </label>

        <label>
          <span>Emergency Contact Phone</span>
          <input
            type="tel"
            value={
              patientEmergencyProfileForm.emergency_contact_phone
            }
            onChange={(event) =>
              setPatientEmergencyProfileForm((current) => ({
                ...current,
                emergency_contact_phone: event.target.value,
              }))
            }
            placeholder="Phone number"
          />
        </label>
      </div>

      <p className="patient-empty">
        Allergies, medications, and medical conditions are managed
        through your medical records and cannot be edited here.
      </p>

      <div className="patient-consent-actions">
        <button
          type="button"
          className="patient-secondary-button"
          onClick={() => {
            setPatientEmergencyProfileEdit(false);
            setPatientEmergencyProfileForm({
              blood_group:
                patientEmergencyProfile.blood_group || "",
              emergency_contact_name:
                patientEmergencyProfile.emergency_contact?.name || "",
              emergency_contact_phone:
                patientEmergencyProfile.emergency_contact?.phone || "",
            });
          }}
          disabled={patientEmergencyProfileSaving}
        >
          Cancel
        </button>

        <button
          type="button"
          className="patient-primary-button"
          disabled={patientEmergencyProfileSaving}
          onClick={async () => {
            setPatientEmergencyProfileSaving(true);
            setPatientEmergencyProfileError("");

            try {
              const response = await fetch(
                `${API_BASE_URL}/patients/me/emergency-profile`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    blood_group:
                      patientEmergencyProfileForm.blood_group,
                    emergency_contact_name:
                      patientEmergencyProfileForm.emergency_contact_name,
                    emergency_contact_phone:
                      patientEmergencyProfileForm.emergency_contact_phone,
                  }),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.detail ||
                    "Unable to update your emergency profile."
                );
              }

              setPatientEmergencyProfile(data);

              setPatientEmergencyProfileForm({
                blood_group: data.blood_group || "",
                emergency_contact_name:
                  data.emergency_contact?.name || "",
                emergency_contact_phone:
                  data.emergency_contact?.phone || "",
              });

              setPatientEmergencyProfileEdit(false);
            } catch (requestError) {
              setPatientEmergencyProfileError(
                requestError.message ||
                  "Unable to update your emergency profile."
              );
            } finally {
              setPatientEmergencyProfileSaving(false);
            }
          }}
        >
          {patientEmergencyProfileSaving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </div>
  ) : (
    <div className="patient-emergency-profile-content">
      <div className="patient-emergency-profile-grid">
        <div className="patient-emergency-profile-card">
          <span>Blood Group</span>
          <strong>
            {patientEmergencyProfile.blood_group || "Not recorded"}
          </strong>
        </div>

        <div className="patient-emergency-profile-card">
          <span>Emergency Contact</span>
          <strong>
            {patientEmergencyProfile.emergency_contact?.name ||
              "Not recorded"}
          </strong>
          <small>
            {patientEmergencyProfile.emergency_contact?.phone ||
              "No phone number recorded"}
          </small>
        </div>
      </div>

      <div className="patient-emergency-profile-section">
        <h4>Allergies</h4>

        {!patientEmergencyProfile.allergies?.length ? (
          <p className="patient-empty">
            No allergies recorded.
          </p>
        ) : (
          <div className="patient-record-list">
            {patientEmergencyProfile.allergies.map((allergy) => (
              <div
                className="patient-record-item"
                key={allergy.id}
              >
                <strong>{allergy.substance}</strong>

                <span>
                  {allergy.reaction || "Reaction not recorded"}
                  {allergy.severity
                    ? ` · ${allergy.severity}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="patient-emergency-profile-section">
        <h4>Current Medications</h4>

        {!patientEmergencyProfile.current_medications?.length ? (
          <p className="patient-empty">
            No active medications recorded.
          </p>
        ) : (
          <div className="patient-record-list">
            {patientEmergencyProfile.current_medications.map(
              (medication) => (
                <div
                  className="patient-record-item"
                  key={medication.id}
                >
                  <strong>{medication.name}</strong>

                  <span>
                    {medication.strength || ""}
                    {medication.dose
                      ? ` · ${medication.dose}`
                      : ""}
                    {medication.frequency
                      ? ` · ${medication.frequency}`
                      : ""}
                    {medication.route
                      ? ` · ${medication.route}`
                      : ""}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="patient-emergency-profile-section">
        <h4>Active Conditions</h4>

        {!patientEmergencyProfile.active_conditions?.length ? (
          <p className="patient-empty">
            No active conditions recorded.
          </p>
        ) : (
          <div className="patient-record-list">
            {patientEmergencyProfile.active_conditions.map(
              (condition) => (
                <div
                  className="patient-record-item"
                  key={condition.id}
                >
                  <strong>{condition.name}</strong>

                  <span>
                    {condition.clinical_status || "Active"}
                    {condition.diagnosed_on
                      ? ` · Diagnosed ${condition.diagnosed_on}`
                      : ""}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )}
</section>

        <section className="patient-panel patient-full-panel patient-consent-panel">
          <div className="patient-panel-header">
            <h3>Consent & Sharing</h3>
          </div>

          <p className="patient-empty">
            Control which connected hospitals can access your
            MedBridge records.
          </p>

          {patientConsentLoading ? (
            <p className="patient-empty">
              Loading consent settings...
            </p>
          ) : patientConsentError ? (
            <div className="patient-consent-error">
              {patientConsentError}
            </div>
          ) : !patientConsents?.length ? (
            <p className="patient-consent-empty">
              You have not granted access to any connected
              hospital yet.
            </p>
          ) : (
            <div className="patient-consent-list">
              {patientConsents.map((consent) => {
                const mapping =
                  patientSummary.hospital_mappings?.find(
                    (item) =>
                      item.hospital_id ===
                      consent.hospital_id
                  );

                const hospitalName =
                  mapping?.source_system ||
                  `Hospital ${consent.hospital_id}`;

                const isActive =
                  consent.status === "active";

                return (
                  <div
                    className="patient-consent-item"
                    key={consent.id}
                  >
                    <div className="patient-consent-details">
                      <strong>{hospitalName}</strong>

                      <span>
                        Hospital patient ID:{" "}
                        {mapping?.external_patient_id ||
                          "Not available"}
                      </span>

                      <span>
                        Purpose: {consent.purpose}
                      </span>

                      <span
                        className={`patient-consent-status ${
                          isActive
                            ? "active"
                            : "revoked"
                        }`}
                      >
                        {consent.status}
                      </span>
                    </div>

                    {isActive ? (
                      <button
                        type="button"
                        className="patient-consent-action revoke"
                        disabled={
                          patientConsentActionLoading
                        }
                        onClick={() =>
                          onRevokeConsent(consent.id)
                        }
                      >
                        {patientConsentActionLoading
                          ? "Updating..."
                          : "Revoke access"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="patient-consent-action"
                        disabled={
                          patientConsentActionLoading
                        }
                        onClick={() =>
                          onGrantConsent(
                            consent.hospital_id
                          )
                        }
                      >
                        {patientConsentActionLoading
                          ? "Updating..."
                          : "Grant access"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

<section className="patient-panel patient-full-panel">
  <div className="patient-panel-header">
    <h3>Access History</h3>
  </div>

  <p className="patient-empty">
    See when your emergency medical profile has been accessed and by whom.
  </p>

  {patientAccessHistoryLoading ? (
    <p className="patient-empty">
      Loading access history...
    </p>
  ) : patientAccessHistoryError ? (
    <div className="patient-consent-error">
      {patientAccessHistoryError}
    </div>
  ) : !patientAccessHistory?.length ? (
    <p className="patient-empty">
      No emergency access activity has been recorded.
    </p>
  ) : (
    <div className="patient-consent-list">
      {patientAccessHistory.map((event) => {
        const actionLabels = {
          emergency_access_granted: "Emergency access granted",
          emergency_access_viewed: "Emergency profile viewed",
          emergency_access_ended: "Emergency access ended",
        };

        const actionLabel =
          actionLabels[event.action] || event.action;

        const eventDate = event.created_at
          ? new Date(event.created_at).toLocaleString()
          : "Unknown time";

        return (
          <div
            className="patient-consent-item"
            key={event.id}
          >
            <div className="patient-consent-details">
              <strong>{actionLabel}</strong>

              <span>
                Hospital:{" "}
                {event.action === "patient_emergency_profile_updated" ? "Patient account" : (event.hospital?.name || "Unknown hospital")}
              </span>

              <span>
                Accessed by:{" "}
                {event.user?.full_name ||
                  "Unknown user"}
                {event.user?.role
                  ? ` · ${event.user.role}`
                  : ""}
              </span>

              <span>
                Date: {eventDate}
              </span>

              {event.action ===
                "emergency_access_granted" &&
              event.details ? (
                <span>
                  Reason: {event.details}
                </span>
              ) : null}
            </div>

            <span
              className={`patient-consent-status ${
                event.success
                  ? "active"
                  : "revoked"
              }`}
            >
              {event.success
                ? "Recorded"
                : "Failed"}
            </span>
          </div>
        );
      })}
    </div>
  )}
</section>
      </main>
    </div>
  );
}

function App() {

  const [searchId, setSearchId] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [emergencyAccess, setEmergencyAccess] = useState(null);
  const [emergencyProfile, setEmergencyProfile] = useState(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("medbridge_access_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [patientSummary, setPatientSummary] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [patientConsents, setPatientConsents] = useState([]);
  const [patientConsentLoading, setPatientConsentLoading] = useState(false);
  const [patientConsentError, setPatientConsentError] = useState("");
const [patientConsentActionLoading, setPatientConsentActionLoading] =
  useState(false);
const [patientAccessHistory, setPatientAccessHistory] = useState([]);
const [patientAccessHistoryLoading, setPatientAccessHistoryLoading] =
  useState(false);
const [patientAccessHistoryError, setPatientAccessHistoryError] =
  useState("");
const [patientEmergencyProfile, setPatientEmergencyProfile] = useState(null);
const [patientEmergencyProfileLoading, setPatientEmergencyProfileLoading] =
  useState(false);
const [patientEmergencyProfileError, setPatientEmergencyProfileError] =
  useState("");
const [patientEmergencyProfileSaving, setPatientEmergencyProfileSaving] =
  useState(false);
const [patientEmergencyProfileEdit, setPatientEmergencyProfileEdit] =
  useState(false);
const [patientEmergencyProfileForm, setPatientEmergencyProfileForm] =
  useState({
    blood_group: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function loadPatientDashboard(token) {
  setPatientLoading(true);
  setPatientError("");
  setPatientConsentLoading(true);
  setPatientConsentError("");
  setPatientAccessHistoryLoading(true);
  setPatientAccessHistoryError("");
  setPatientEmergencyProfileLoading(true);
  setPatientEmergencyProfileError("");

  try {
    const [profileResponse, summaryResponse, consentResponse] =
      await Promise.all([
        fetch(`${API_BASE_URL}/patients/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_BASE_URL}/patients/me/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_BASE_URL}/consents/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

    if (!profileResponse.ok || !summaryResponse.ok) {
      throw new Error(
        "Unable to load your health records."
      );
    }

    if (!consentResponse.ok) {
      throw new Error(
        "Unable to load your consent settings."
      );
    }

    const profile = await profileResponse.json();
    const summary = await summaryResponse.json();
    const consents = await consentResponse.json();

    setPatient(profile);
    setPatientSummary(summary);
    setPatientConsents(consents);
try {
  const accessHistoryResponse = await fetch(
    `${API_BASE_URL}/patients/me/access-history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const accessHistoryData = await accessHistoryResponse.json();

  if (!accessHistoryResponse.ok) {
    throw new Error(
      accessHistoryData.detail ||
        "Unable to load your access history."
    );
  }

  setPatientAccessHistory(accessHistoryData);
} catch (accessHistoryRequestError) {
  setPatientAccessHistoryError(
    accessHistoryRequestError.message ||
      "Unable to load your access history."
  );
} finally {
  setPatientAccessHistoryLoading(false);
}

  } catch (requestError) {
    setPatientError(
      requestError.message ||
        "Unable to load your health records."
    );
  }
  finally {
    setPatientLoading(false);
    setPatientConsentLoading(false);
  }

  try {
    const emergencyProfileResponse = await fetch(
      `${API_BASE_URL}/patients/me/emergency-profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const emergencyProfileData =
      await emergencyProfileResponse.json();

    if (!emergencyProfileResponse.ok) {
      throw new Error(
        emergencyProfileData.detail ||
          "Unable to load your emergency profile."
      );
    }

    setPatientEmergencyProfile(emergencyProfileData);

    setPatientEmergencyProfileForm({
      blood_group:
        emergencyProfileData.blood_group || "",
      emergency_contact_name:
        emergencyProfileData.emergency_contact?.name || "",
      emergency_contact_phone:
        emergencyProfileData.emergency_contact?.phone || "",
    });
  } catch (emergencyProfileRequestError) {
    setPatientEmergencyProfileError(
      emergencyProfileRequestError.message ||
        "Unable to load your emergency profile."
    );
  } finally {
    setPatientEmergencyProfileLoading(false);
  }
}

async function handleGrantConsent(hospitalId) {
  setPatientConsentActionLoading(true);
  setPatientConsentError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/consents/me`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          hospital_id: hospitalId,
          purpose: "Continuity of care",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to grant consent."
      );
    }

    setPatientConsents((current) => {
  const existingIndex = current.findIndex(
    (consent) => consent.hospital_id === data.hospital_id
  );

  if (existingIndex === -1) {
    return [...current, data];
  }

  return current.map((consent, index) =>
    index === existingIndex ? data : consent
  );
});
  } catch (requestError) {
    setPatientConsentError(
      requestError.message ||
        "Unable to grant consent."
    );
  } finally {
    setPatientConsentActionLoading(false);
  }
}

async function handleRevokeConsent(consentId) {
  setPatientConsentActionLoading(true);
  setPatientConsentError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/consents/me/${consentId}/revoke`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to revoke consent."
      );
    }

    setPatientConsents((current) =>
      current.map((consent) =>
        consent.id === consentId
          ? data
          : consent
      )
    );
  } catch (requestError) {
    setPatientConsentError(
      requestError.message ||
        "Unable to revoke consent."
    );
  } finally {
    setPatientConsentActionLoading(false);
  }
}

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

if (user.role === "patient") {
  await loadPatientDashboard(data.access_token);
}
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
    setPatientSummary(null);
    setPatientError("");
    setPatientLoading(false);
    setRecord(null);
    setSearchResults([]);
    setSearchId("");
    setRecordSearch("");
    setEmergencyAccess(null);
    setEmergencyProfile(null);
    setEmergencyReason("");
    setEmergencyError("");
    setShowEmergencyDialog(false);
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
  setPatient(selectedPatient);
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

    const recordData = await recordResponse.json();

    if (!recordResponse.ok) {
      throw new Error(
        recordData.detail ||
          "Patient found, but clinical record could not be loaded."
      );
    }

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

async function requestEmergencyAccess() {
  if (!patient) {
    setEmergencyError("Select a patient before requesting emergency access.");
    return;
  }

  const reason = emergencyReason.trim();

  if (!reason) {
    setEmergencyError("An emergency reason is required.");
    return;
  }

  setEmergencyLoading(true);
  setEmergencyError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/emergency-access`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          patient_id: patient.id,
          reason,
        }),
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      logoutDoctor();
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to start emergency access."
      );
    }

    setEmergencyAccess(data);
    setEmergencyReason("");
    setShowEmergencyDialog(false);

    const profileResponse = await fetch(
      `${API_BASE_URL}/emergency-access/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      throw new Error(
        profileData.detail ||
          "Emergency access was created but the profile could not be loaded."
      );
    }

    setEmergencyProfile(profileData);
  } catch (requestError) {
    setEmergencyError(
      requestError.message ||
        "Unable to start emergency access."
    );
  } finally {
    setEmergencyLoading(false);
  }
}

async function endEmergencyAccess() {
  if (!emergencyAccess?.id) {
    return;
  }

  setEmergencyLoading(true);
  setEmergencyError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/emergency-access/${emergencyAccess.id}/end`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to end emergency access."
      );
    }

    setEmergencyAccess(null);
    setEmergencyProfile(null);
  } catch (requestError) {
    setEmergencyError(
      requestError.message ||
        "Unable to end emergency access."
    );
  } finally {
    setEmergencyLoading(false);
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

if (currentUser?.role === "patient") {
  return (
    <PatientDashboard
      accessToken={accessToken}
      patient={patient}
      patientSummary={patientSummary}
      patientLoading={patientLoading}
      patientError={patientError}
      patientConsents={patientConsents}
      patientConsentLoading={patientConsentLoading}
      patientConsentError={patientConsentError}
      onGrantConsent={handleGrantConsent}
      onRevokeConsent={handleRevokeConsent}
      patientConsentActionLoading={patientConsentActionLoading}
      patientAccessHistory={patientAccessHistory}
      patientAccessHistoryLoading={patientAccessHistoryLoading}
      patientAccessHistoryError={patientAccessHistoryError}
      patientEmergencyProfile={patientEmergencyProfile}
      setPatientEmergencyProfile={
        setPatientEmergencyProfile
      }
      patientEmergencyProfileLoading={patientEmergencyProfileLoading}
      patientEmergencyProfileError={patientEmergencyProfileError}
      setPatientEmergencyProfileError={
        setPatientEmergencyProfileError
      }
      patientEmergencyProfileSaving={patientEmergencyProfileSaving}
      setPatientEmergencyProfileSaving={
        setPatientEmergencyProfileSaving
      }
      patientEmergencyProfileEdit={patientEmergencyProfileEdit}
      patientEmergencyProfileForm={patientEmergencyProfileForm}
      setPatientEmergencyProfileEdit={setPatientEmergencyProfileEdit}
      setPatientEmergencyProfileForm={setPatientEmergencyProfileForm}
      onLogout={logoutDoctor}
    />
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

{showEmergencyDialog && (
  <div className="emergency-dialog-backdrop">
    <div className="emergency-dialog">
      <p className="section-label">
        EMERGENCY ACCESS
      </p>

      <h2>Request emergency access</h2>

      <p>
        Emergency access provides a restricted view of
        critical patient information for immediate care.
        The action is recorded in the audit trail.
      </p>

      <label htmlFor="emergency-reason">
        Reason for emergency access
      </label>

      <textarea
        id="emergency-reason"
        value={emergencyReason}
        onChange={(event) =>
          setEmergencyReason(event.target.value)
        }
        placeholder="Explain why emergency access is required..."
        rows={4}
        autoFocus
      />

      {emergencyError && (
        <div className="search-error">
          {emergencyError}
        </div>
      )}

      <div className="emergency-dialog-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setShowEmergencyDialog(false);
            setEmergencyReason("");
            setEmergencyError("");
          }}
          disabled={emergencyLoading}
        >
          Cancel
        </button>

        <button
          type="button"
          className="emergency-button"
          onClick={requestEmergencyAccess}
          disabled={
            emergencyLoading ||
            !emergencyReason.trim()
          }
        >
          {emergencyLoading
            ? "Requesting..."
            : "Confirm Emergency Access"}
        </button>
      </div>
    </div>
  </div>
)}

    {emergencyProfile && (
  <section className="emergency-view">
    <div className="emergency-header">
      <div>
        <p className="section-label">
          EMERGENCY ACCESS ACTIVE
        </p>

        <h2>Critical Patient Information</h2>

        <p className="section-description">
          Restricted emergency information authorized for
          immediate care.
        </p>
      </div>

      <button
        className="emergency-exit-button"
        onClick={endEmergencyAccess}
        disabled={emergencyLoading}
      >
        {emergencyLoading
          ? "Ending..."
          : "End Emergency Access"}
      </button>
    </div>

    {emergencyError && (
      <div className="search-error">
        {emergencyError}
      </div>
    )}

    <div className="emergency-content">
      <div className="emergency-patient-card">
        <div className="emergency-patient-identity">
          <div className="emergency-patient-avatar">
            {emergencyProfile.patient.full_name
              .split(" ")
              .map((name) => name[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>

          <div className="emergency-patient-name">
            <span>Patient</span>

            <strong>
              {emergencyProfile.patient.full_name}
            </strong>

            <small>
              {emergencyProfile.patient.medbridge_id}
            </small>
          </div>
        </div>

        <div className="emergency-patient-meta">
          <div>
            <span>Date of birth</span>
            <strong>
              {emergencyProfile.patient.date_of_birth ||
                "Not recorded"}
            </strong>
          </div>

          <div>
            <span>Blood group</span>
            <strong>
              {emergencyProfile.patient.blood_group ||
                "Not recorded"}
            </strong>
          </div>

          <div>
            <span>Access expires</span>
            <strong>
              {new Date(
                emergencyProfile.access.expires_at
              ).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
            {emergencyProfile.patient.blood_group ||
              "Not recorded"}
          </strong>
        </div>

        <div className="emergency-card allergy-warning">
          <span className="emergency-card-label">
            ALLERGIES
          </span>

          <strong>
            {emergencyProfile.allergies?.length
              ? emergencyProfile.allergies
                  .map((allergy) => {
                    const severity = allergy.severity
                      ? ` (${allergy.severity})`
                      : "";

                    return `${allergy.substance}${severity}`;
                  })
                  .join(", ")
              : "No known allergies recorded"}
          </strong>
        </div>

        <div className="emergency-card">
          <span className="emergency-card-label">
            ACTIVE MEDICATIONS
          </span>

          <strong>
            {emergencyProfile.medications?.length
              ? emergencyProfile.medications
                  .map(
                    (medication) =>
                      medication.name ||
                      medication.generic_name ||
                      "Medication"
                  )
                  .join(", ")
              : "No active medications recorded"}
          </strong>
        </div>

        <div className="emergency-card">
          <span className="emergency-card-label">
            ACTIVE CONDITIONS
          </span>

          <strong>
            {emergencyProfile.conditions?.length
              ? emergencyProfile.conditions
                  .map(
                    (condition) =>
                      condition.name || "Condition"
                  )
                  .join(", ")
              : "No active conditions recorded"}
          </strong>
        </div>
      </div>

      <div className="emergency-card">
        <span className="emergency-card-label">
          EMERGENCY CONTACT
        </span>

        <strong>
          {emergencyProfile.emergency_contact?.name ||
            "Not recorded"}
        </strong>

        {emergencyProfile.emergency_contact?.phone && (
          <small>
            {emergencyProfile.emergency_contact.phone}
          </small>
        )}
      </div>

      <div className="emergency-access-notice">
        <strong>Emergency access is audited</strong>

        <span>
          Reason: {emergencyProfile.access.reason}
        </span>

        <span>
          This session expires automatically after 30
          minutes or can be ended manually.
        </span>
      </div>
    </div>
  </section>
)}

        {!emergencyProfile && (
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
                  onClick={() => {
                       setEmergencyError("");
                       setShowEmergencyDialog(true);
                   }}
                   disabled={!patient || emergencyLoading}
              >
                   {emergencyLoading
                       ? "Emergency Access..."
                        : "Emergency Access"}
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
