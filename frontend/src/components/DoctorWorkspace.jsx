import { bloodSourceText } from "../lib";
import { useEffect, useRef, useState } from "react";
import { dateText, navigate, request, useRemote } from "../lib";
import { Breadcrumbs, Empty, Field, Identity, Link, Notice, State } from "./UI";
import Records, { CriticalInformation, RecentVisits } from "./Records";
import EmergencyAccess from "./EmergencyAccess";
import PatientAdministration from "./PatientAdministration";
function PatientCard({ patient, onSelect, recent = false }) {
  return (
    <article className="patient-result">
      <div>
        <h3>{patient.full_name}</h3>
        <p>Date of birth: {dateText(patient.date_of_birth)}</p>
        <p className="record-meta">{patient.medbridge_id}</p>
        {recent && (
          <p className="record-meta">
            Opened: {dateText(patient.last_viewed_at, true)}
          </p>
        )}
      </div>
      <button
        onClick={() => onSelect(patient)}
        aria-label={`Open record for ${patient.full_name}, ${patient.medbridge_id}`}
      >
        Open record
      </button>
    </article>
  );
}
function PatientSearch({
  token,
  initialPatients,
  onSelect,
  recent,
  compact = false,
}) {
  const [query, setQuery] = useState("");
  const [dob, setDob] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const sequence = useRef(0);
  async function search(event) {
    event.preventDefault();
    const run = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim().replace(/\s+/g, " "));
      if (dob) params.set("date_of_birth", dob);
      const data = params.size
        ? await request(`/patients/search?${params}`, token)
        : initialPatients;
      if (sequence.current === run) {
        setResults(data);
        setPage(0);
      }
    } catch (failure) {
      if (sequence.current === run) setError(failure.message);
    } finally {
      if (sequence.current === run) setBusy(false);
    }
  }
  const patients = results ?? initialPatients ?? [];
  return (
    <section
      className={`patient-search ${compact ? "compact" : ""}`}
      aria-label="Find a patient"
    >
      <form onSubmit={search} className="search-form" aria-busy={busy}>
        <Field
          label="Patient name or MedBridge ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="Search your accessible patients"
          hint={
            compact
              ? undefined
              : "Compare name, date of birth and ID before opening a record."
          }
        />
        <Field
          label="Date of birth (optional)"
          type="date"
          value={dob}
          onChange={(event) => setDob(event.target.value)}
          hint={compact ? undefined : "Use on its own or with a name or ID."}
        />
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Searching…" : "Find patient"}
          </button>
          <button
            type="button"
            onClick={() => {
              sequence.current += 1;
              setQuery("");
              setDob("");
              setResults(null);
              setPage(0);
              setError("");
              setBusy(false);
            }}
          >
            Clear search
          </button>
        </div>
      </form>
      <Notice error>{error}</Notice>
      {results === null && recent && !compact && (
        <section
          className="recent-patients"
          aria-labelledby="recent-patients-heading"
        >
          <h2 id="recent-patients-heading">Recently opened patients</h2>
          <p className="help">
            Your most recent successful record views. Confirm identity before
            reopening.
          </p>
          <State
            loading={recent.loading}
            error={recent.error}
            retry={recent.reload}
          >
            {recent.data?.length ? (
              <div className="recent-patient-grid">
                {recent.data.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onSelect={onSelect}
                    recent
                  />
                ))}
              </div>
            ) : (
              <p>
                No records opened yet. Find a patient below; opened records will
                appear here.
              </p>
            )}
          </State>
        </section>
      )}
      {(!compact || results !== null) && (
        <>
          <h2>
            {results === null ? "All accessible patients" : "Search results"}
          </h2>
          <p role="status" className="result-count">
            {busy
              ? "Searching accessible patients…"
              : `${patients.length} ${results ? "matching" : "accessible"} patients`}
          </p>
          {patients.length ? (
            <div className="patient-list">
              {patients.slice(page * 10, (page + 1) * 10).map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onSelect={onSelect}
                />
              ))}
              {patients.length > 10 && (
                <nav
                  className="list-pagination"
                  aria-label="Patient directory pages"
                >
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous patients
                  </button>
                  <span role="status">
                    {page * 10 + 1}–{Math.min((page + 1) * 10, patients.length)}{" "}
                    of {patients.length}
                  </span>
                  <button
                    disabled={(page + 1) * 10 >= patients.length}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next patients
                  </button>
                </nav>
              )}
            </div>
          ) : (
            <Empty
              title={
                results
                  ? "No patients match this search"
                  : "No accessible patients yet"
              }
            >
              {results
                ? "Check the name or MedBridge ID, remove the date filter, or clear the search."
                : "Patients appear here after your hospital assignment and patient connections are configured."}
            </Empty>
          )}
        </>
      )}
    </section>
  );
}
function PatientRecord({
  id,
  token,
  knownPatient,
  onEmergency,
  onChanged,
  onViewed,
}) {
  const [feedback, setFeedback] = useState("");
  const remote = useRemote(`/clinical/patients/${id}/record`, token);
  const record = remote.data;
  const patient = record?.patient || knownPatient;
  useEffect(() => {
    if (record) onViewed();
  }, [record, onViewed]);
  return (
    <>
      <Breadcrumbs
        items={[
          ["Patients", "/patients"],
          [patient?.full_name || "Patient record"],
        ]}
      />
      <Identity patient={patient}>
        {record?.hospital_mappings?.some(
          (mapping) => mapping.source_system === "Synthetic local demo dataset",
        ) && <span className="badge">Synthetic demo</span>}
        <span className="badge">
          {record
            ? record.access?.mode === "administrative"
              ? "Administrative access"
              : "Consent-based access"
            : "Access not confirmed"}
        </span>
        <button
          className="emergency-button"
          disabled={!patient}
          onClick={() => onEmergency(patient)}
        >
          Emergency access
        </button>
      </Identity>
      <Notice>
        {feedback && (
          <>
            <span>{feedback}</span>{" "}
            <button onClick={() => setFeedback("")}>Dismiss</button>
          </>
        )}
      </Notice>
      <State
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      >
        {record && (
          <>
            <CriticalInformation record={record} doctor />
            <RecentVisits record={record} />
            <Records key={id} record={record} />
            <details className="administrative">
              <summary>Patient and provider details</summary>
              <div className="disclosure-body metadata-grid">
                <div>
                  <h3>Patient profile</h3>
                  <p>Blood group: {patient.blood_group || "Not recorded"}</p>
                  <p className="help">
                    {bloodSourceText(patient.blood_group_source)}
                  </p>
                  <p>Phone: {patient.phone || "Not recorded"}</p>
                  <p>Email: {patient.email || "Not recorded"}</p>
                  <p>Address: {patient.address || "Not recorded"}</p>
                  <p>
                    Identity:{" "}
                    {patient.identity_verification_status ||
                      "Verification not recorded"}
                  </p>
                  <p>
                    Emergency contact:{" "}
                    {patient.emergency_contact_name || "Not recorded"} /{" "}
                    {patient.emergency_contact_phone || "Not recorded"}
                  </p>
                </div>
                <div>
                  <h3>Connected providers</h3>
                  {record.hospital_mappings.length ? (
                    record.hospital_mappings.map((mapping) => (
                      <p key={mapping.id}>
                        <strong>
                          {mapping.hospital_name ||
                            "Provider name not recorded"}
                        </strong>
                        <br />
                        {mapping.source_system || "Source system not recorded"}
                        <br />
                        Provider patient ID: {mapping.external_patient_id}
                      </p>
                    ))
                  ) : (
                    <p>No provider mappings available.</p>
                  )}
                  <p className="help">
                    Consent expiry:{" "}
                    {record.access?.expires_at
                      ? dateText(record.access.expires_at, true)
                      : "No fixed expiry supplied"}
                  </p>
                </div>
              </div>
              <div className="disclosure-body">
                <PatientAdministration
                  token={token}
                  patient={patient}
                  onRefresh={(message) => {
                    setFeedback(message);
                    remote.reload();
                    onChanged();
                  }}
                />
              </div>
            </details>
          </>
        )}
      </State>
    </>
  );
}
export default function DoctorWorkspace({ token, route, user }) {
  const directory = useRemote("/patients", token);
  const recent = useRemote("/patients/recent?limit=6", token);
  const [emergencyStatus, setEmergencyStatus] = useState({
    checking: true,
    activePatientId: null,
  });
  const [selected, setSelected] = useState(null);
  const [emergencyPatient, setEmergencyPatient] = useState(null);
  const match = route.match(/^\/patients\/(\d+)$/);
  const id = match?.[1];
  const patient =
    selected?.id === Number(id)
      ? selected
      : directory.data?.find((row) => row.id === Number(id));
  const open = (row) => {
    setSelected(row);
    navigate(`/patients/${row.id}`);
  };
  return (
    <>
      <EmergencyAccess
        token={token}
        onSessionState={setEmergencyStatus}
        patient={emergencyPatient}
        onClose={() => setEmergencyPatient(null)}
      />
      {emergencyStatus.checking ? (
        <State loading />
      ) : emergencyStatus.activePatientId ? (
        <Notice>
          End emergency access to return to normal patient records. The active
          profile above remains linked to its named patient.
        </Notice>
      ) : (
        <>
          <section className={id ? "switch-patient" : "directory-heading"}>
            {id ? (
              <div className="card">
                <State
                  loading={directory.loading}
                  error={directory.error}
                  retry={directory.reload}
                >
                  <PatientSearch
                    token={token}
                    initialPatients={directory.data}
                    onSelect={open}
                    compact
                  />
                </State>
              </div>
            ) : (
              <>
                <p className="eyebrow">Clinical workspace</p>
                <h1>Find a patient</h1>
                <p>
                  Identify the right patient, then review critical information
                  and record details.
                </p>
                {user.hospital_id == null && user.role !== "system_admin" && (
                  <Notice>
                    Your account has no hospital assignment. Contact your
                    administrator to connect your hospital and its patients.
                  </Notice>
                )}
                {directory.data?.some((row) =>
                  row.medbridge_id.startsWith("MB-SYN-"),
                ) && (
                  <Notice>
                    Synthetic local demo: fictional patient histories for
                    interface review.
                  </Notice>
                )}
              </>
            )}
          </section>
          {id ? (
            <PatientRecord
              key={id}
              id={id}
              token={token}
              knownPatient={patient}
              onEmergency={setEmergencyPatient}
              onChanged={directory.reload}
              onViewed={recent.reload}
            />
          ) : (
            <State
              loading={directory.loading}
              error={directory.error}
              retry={directory.reload}
            >
              <div className="card directory-card">
                <PatientSearch
                  token={token}
                  initialPatients={directory.data}
                  onSelect={open}
                  recent={recent}
                />
              </div>
            </State>
          )}
          {route !== "/patients" && !id && (
            <Empty title="Page not found">
              <Link to="/patients">Return to patients</Link>
            </Empty>
          )}
        </>
      )}
    </>
  );
}
