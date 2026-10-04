import { useEffect, useId, useRef, useState } from "react";
import { dateText, navigate, request, useRemote } from "../lib";
import {
  Breadcrumbs,
  Empty,
  Field,
  Identity,
  Link,
  Modal,
  Notice,
  State,
} from "./UI";
import Records, { CriticalInformation, RecentVisits } from "./Records";
import MedicalReports from "./MedicalReports";
import EmergencyAccess from "./EmergencyAccess";
import PatientAdministration, {
  AccountEditor,
  ProfileDetails,
  ProfileEditor,
} from "./PatientAdministration";
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
  const suggestionId = useId();
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = (initialPatients || [])
    .filter(
      (patient) =>
        query.trim() &&
        (patient.full_name
          .toLowerCase()
          .includes(query.trim().replace(/\s+/g, " ").toLowerCase()) ||
          patient.medbridge_id
            .toLowerCase()
            .includes(query.trim().replace(/\s+/g, " ").toLowerCase())) &&
        (!dob || patient.date_of_birth === dob),
    )
    .slice(0, 8);
  const expanded = suggesting && suggestions.length > 0;
  function choose(row) {
    setSuggesting(false);
    setActive(-1);
    onSelect(row);
  }
  function keys(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      setSuggesting(true);
      if (!event.altKey)
        setActive((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % suggestions.length
            : index < 0
              ? suggestions.length - 1
              : (index - 1 + suggestions.length) % suggestions.length,
        );
    } else if (event.key === "Escape") {
      setSuggesting(false);
      setActive(-1);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    }
  }
  useEffect(() => {
    if (expanded && active >= 0)
      document
        .getElementById(`${suggestionId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, suggestionId]);
  async function search(event) {
    event.preventDefault();
    setSuggesting(false);
    setActive(-1);
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
      id="patient-search"
      className={`patient-search ${compact ? "compact" : ""}`}
      aria-label="Find a patient"
    >
      <form onSubmit={search} className="search-form" aria-busy={busy}>
        <div className="patient-combobox">
          <Field
            label="Patient name or MedBridge ID"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggesting(true);
              setActive(-1);
            }}
            onFocus={() => setSuggesting(true)}
            onBlur={() => {
              setSuggesting(false);
              setActive(-1);
            }}
            onKeyDown={keys}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={suggestionId}
            aria-activedescendant={
              expanded && active >= 0 ? `${suggestionId}-${active}` : undefined
            }
            autoComplete="off"
            placeholder="Start typing a patient’s name"
            hint="Choose a match after comparing name, date of birth and ID."
          />
          <ul
            id={suggestionId}
            role="listbox"
            aria-label="Matching patients"
            className="patient-suggestions"
            hidden={!expanded}
          >
            {suggestions.map((patient, index) => (
              <li
                key={patient.id}
                id={`${suggestionId}-${index}`}
                role="option"
                aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(patient)}
              >
                <strong>{patient.full_name}</strong>
                <span>
                  DOB {dateText(patient.date_of_birth)} · {patient.medbridge_id}
                </span>
              </li>
            ))}
          </ul>
          {suggesting && query.trim() && (
            <span className="sr-only" role="status">
              {suggestions.length
                ? `${suggestions.length} suggestions. Use arrow keys to review and Enter to open.`
                : "No suggestions. Try a different name or date of birth."}
            </span>
          )}
        </div>
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
          id="recent-patients"
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
          <h2 id="patient-directory">
            {results === null ? "All accessible patients" : "Search results"}
          </h2>
          <p role="status" className="result-count">
            {busy
              ? "Searching accessible patients…"
              : `${patients.length} ${results ? "matching" : "accessible"} ${patients.length === 1 ? "patient" : "patients"}`}
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
        {patient && (
          <PatientAdministration
            token={token}
            patient={patient}
            onRefresh={(message) => {
              setFeedback(message);
              remote.reload();
              onChanged();
            }}
          />
        )}
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
            <ProfileDetails patient={patient} />
            <CriticalInformation record={record} doctor />
            <RecentVisits record={record} />
            <Records key={id} record={record} />
            <MedicalReports
              key={id}
              token={token}
              patientId={id}
              patient={patient}
            />
            <section className="card provider-details" id="provider-details">
              <h2>Connected providers</h2>
              <ul className="provider-list">
                {record.hospital_mappings.map((mapping) => (
                  <li key={mapping.id}>
                    <strong>
                      {mapping.hospital_name || "Provider name not recorded"}
                    </strong>
                    <span>
                      Provider patient ID: {mapping.external_patient_id}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="help">
                Access:{" "}
                {record.access?.mode === "administrative"
                  ? "Administrative"
                  : "Patient consent"}
                . Consent expiry:{" "}
                {record.access?.expires_at
                  ? dateText(record.access.expires_at, true)
                  : "No fixed expiry supplied"}
                .
              </p>
            </section>
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
          {!id && (
            <section className="directory-heading">
              <div>
                <h1>Find a patient</h1>
                <p>Search by name, date of birth or MedBridge ID.</p>
              </div>
              <DirectoryActions
                token={token}
                patients={directory.data || []}
                onRefresh={directory.reload}
              />
              {user.hospital_id == null && user.role !== "system_admin" && (
                <Notice>
                  Your account has no hospital assignment. Contact your
                  administrator.
                </Notice>
              )}
            </section>
          )}
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
          {!id && ["hospital_admin", "system_admin"].includes(user.role) && (
            <DoctorApprovals token={token} user={user} />
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
function DirectoryActions({ token, patients, onRefresh }) {
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  function close() {
    setMode("");
    setSelected("");
    if (committed) onRefresh();
  }
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const profile = useRemote(
    selected ? `/patients/${encodeURIComponent(selected)}` : null,
    token,
  );
  function done(text) {
    setMessage(text);
    setMode("");
    setSelected("");
    onRefresh();
  }
  return (
    <div className="directory-actions">
      <div className="actions">
        <button
          onClick={() => {
            setSelected("");
            setCommitted(false);
            setMode("profile");
          }}
        >
          Edit patient profile
        </button>
        <button
          onClick={() => {
            setSelected("");
            setCommitted(false);
            setMode("account");
          }}
        >
          Create patient account
        </button>
      </div>
      <Notice>{message}</Notice>
      {mode && (
        <Modal
          title={
            mode === "account"
              ? "Create patient account"
              : "Edit patient profile"
          }
          busy={busy}
          onClose={close}
        >
          <Field
            label="Select patient"
            hint="Compare date of birth and patient ID before continuing."
          >
            {(id) => (
              <select
                id={id}
                disabled={busy}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Choose a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.medbridge_id}>
                    {patient.full_name} · {dateText(patient.date_of_birth)} ·{" "}
                    {patient.medbridge_id}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {selected && (
            <State
              loading={profile.loading}
              error={profile.error}
              retry={profile.reload}
            >
              {profile.data &&
                (mode === "profile" ? (
                  <ProfileEditor
                    token={token}
                    patient={profile.data}
                    onDone={done}
                    onBusyChange={setBusy}
                    onProfileCommitted={() => setCommitted(true)}
                    onCancel={close}
                  />
                ) : profile.data.has_account ? (
                  <Notice>
                    This patient already has a sign-in account. Use the patient
                    portal’s account recovery if they need help signing in.
                  </Notice>
                ) : profile.data.identity_verification_status === "verified" ? (
                  <AccountEditor
                    token={token}
                    patient={profile.data}
                    onDone={done}
                    onBusyChange={setBusy}
                    onCancel={close}
                  />
                ) : (
                  <Notice>
                    Identity must be verified first. Open this patient’s record
                    and use Verify identity after completing your organization’s
                    identity checks.
                  </Notice>
                ))}
            </State>
          )}
        </Modal>
      )}
    </div>
  );
}
function DoctorApprovals({ token, user }) {
  const pending = useRemote("/auth/registrations/pending", token);
  const hospitals = useRemote(
    user.role === "system_admin" ? "/auth/registrations/hospitals" : null,
    token,
  );
  const [hospitalId, setHospitalId] = useState(user.hospital_id || "");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function approve(applicant) {
    setBusy(applicant.id);
    setError("");
    try {
      const result = await request(
        `/auth/registrations/${applicant.id}/approve`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ hospital_id: Number(hospitalId) }),
        },
      );
      setMessage(result.message);
      pending.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="card" id="doctor-registrations">
      <h2>Doctor registrations</h2>
      <p>
        Verify professional credentials and organization membership before
        approving access. Approval is recorded with the administrator and
        hospital assignment.
      </p>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      {user.role === "system_admin" && (
        <State
          loading={hospitals.loading}
          error={hospitals.error}
          retry={hospitals.reload}
        >
          <Field label="Verified hospital for assignment">
            {(id) => (
              <select
                id={id}
                value={hospitalId}
                onChange={(event) => setHospitalId(event.target.value)}
              >
                <option value="">Choose the verified hospital</option>
                {hospitals.data?.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} ({hospital.code})
                  </option>
                ))}
              </select>
            )}
          </Field>
        </State>
      )}
      <State
        loading={pending.loading}
        error={pending.error}
        retry={pending.reload}
      >
        {pending.data?.length ? (
          pending.data.map((applicant) => (
            <article className="patient-result" key={applicant.id}>
              <div>
                <h3>{applicant.full_name}</h3>
                <p>
                  {applicant.email} · {applicant.organization}
                </p>
                <p>Registration: {applicant.registration_number}</p>
              </div>
              <button
                disabled={busy !== null || !hospitalId}
                onClick={() => approve(applicant)}
              >
                {busy === applicant.id
                  ? "Approving…"
                  : "Approve verified doctor"}
              </button>
            </article>
          ))
        ) : (
          <p>No verified registrations awaiting approval.</p>
        )}
      </State>
    </section>
  );
}
