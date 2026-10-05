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
import PatientAdministration from "./PatientAdministration";
import CreatePatientForm from "./CreatePatientForm";

function PatientCard({ patient, onSelect, recent = false }) {
  const connected = patient.connected !== false;

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

        {!recent && (
          <p className="record-meta">
            {connected
              ? "✓ Connected to your hospital"
              : "⚠ Not connected to your hospital"}
          </p>
        )}
      </div>

      {connected ? (
        <button
          onClick={() => onSelect(patient)}
          aria-label={`Open record for ${patient.full_name}, ${patient.medbridge_id}`}
        >
          Open record
        </button>
      ) : (
        <span className="record-meta">
          Patient must connect this hospital
        </span>
      )}
    </article>
  );
}

function PatientSearch({
  token,
  initialPatients,
  onSelect,
  compact = false,
}) {
  const [query, setQuery] = useState("");
  const [dob, setDob] = useState("");
  const [results, setResults] = useState(null);
  const [identityResult, setIdentityResult] = useState(null);
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

      if (!event.altKey) {
        setActive((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % suggestions.length
            : index < 0
              ? suggestions.length - 1
              : (index - 1 + suggestions.length) % suggestions.length,
        );
      }
    } else if (event.key === "Escape") {
      setSuggesting(false);
      setActive(-1);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    }
  }

  useEffect(() => {
    if (expanded && active >= 0) {
      document
        .getElementById(`${suggestionId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [active, expanded, suggestionId]);

  async function search(event) {
    event.preventDefault();
    setSuggesting(false);
    setActive(-1);

    if (!query.trim() && !dob && compact) {
      setError(
        "Enter a patient name, MedBridge ID or date of birth to search.",
      );
      return;
    }

    const run = ++sequence.current;

    setBusy(true);
    setError("");
    setIdentityResult(null);

    try {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set("q", query.trim().replace(/\s+/g, " "));
      }

      if (dob) {
        params.set("date_of_birth", dob);
      }

      let data = [];

      if (params.size) {
        data = await request(`/patients/search?${params}`, token);

        /*
         * If no connected patient was found and the query looks like
         * a MedBridge ID, perform the limited identity lookup.
         *
         * This does NOT grant clinical access.
         */
        const normalizedQuery = query.trim().replace(/\s+/g, " ");

        if (
          !data.length &&
          normalizedQuery &&
          /^MB-[A-Z0-9-]+$/i.test(normalizedQuery)
        ) {
          try {
            const identity = await request(
              `/patients/identity/${encodeURIComponent(normalizedQuery)}`,
              token,
            );

            if (sequence.current === run) {
              setIdentityResult(identity);
            }
          } catch (identityFailure) {
            if (identityFailure.status === 404) {
              setIdentityResult(null);
            } else {
              throw identityFailure;
            }
          }
        }
      } else {
        data = initialPatients || [];
      }

      if (sequence.current === run) {
        setResults(data);
        setPage(0);
      }
    } catch (failure) {
      if (sequence.current === run) {
        setError(failure.message);
      }
    } finally {
      if (sequence.current === run) {
        setBusy(false);
      }
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
              expanded && active >= 0
                ? `${suggestionId}-${active}`
                : undefined
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
                  DOB {dateText(patient.date_of_birth)} ·{" "}
                  {patient.medbridge_id}
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
              setIdentityResult(null);
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

      {identityResult && (
        <section className="card" aria-label="Patient identity result">
          <PatientCard
            patient={identityResult}
            onSelect={onSelect}
          />

          {!identityResult.connected && (
            <p className="help">
              This patient exists in MedBridge but is not connected to your
              hospital. The patient must connect your hospital from their
              MedBridge account before you can access their clinical record.
            </p>
          )}
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
              : `${patients.length} ${
                  results ? "matching" : "accessible"
                } ${patients.length === 1 ? "patient" : "patients"}`}
          </p>

          {patients.length ? (
            <div className="patient-list">
              {patients
                .slice(page * 10, (page + 1) * 10)
                .map((patient) => (
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
                    {page * 10 + 1}–
                    {Math.min((page + 1) * 10, patients.length)} of{" "}
                    {patients.length}
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
  page,
  token,
  user,
  knownPatient,
  onEmergency,
  onChanged,
  onViewed,
}) {
  const [feedback, setFeedback] = useState("");
  const remote = useRemote(`/clinical/patients/${id}/record`, token);
  const record = remote.data;
  const patient = record?.patient || knownPatient;
  const recordPath = `/patients/${id}/records`;

  useEffect(() => {
    if (record) onViewed();
  }, [record, onViewed]);

  return (
    <>
      <Breadcrumbs
        items={[
          ["Home", "/patients"],
          [
            patient?.full_name || "Patient record",
            page ? `/patients/${id}` : undefined,
          ],
          ...(page
            ? [[
                page === "records"
                  ? "Record history"
                  : "Medical reports",
              ]]
            : []),
        ]}
      />

      <Identity patient={patient} record={record} details={!page}>
        {patient && (
          <PatientAdministration
            token={token}
            patient={patient}
            restricted={user.role === "doctor"}
            onRefresh={(message) => {
              setFeedback(message);
              remote.reload();
              onChanged();
            }}
          />
        )}

        <button
          className="primary emergency-button"
          disabled={!patient}
          onClick={() => onEmergency(patient)}
        >
          Emergency access
        </button>
      </Identity>

      <Notice>{feedback}</Notice>

      <State
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      >
        {record &&
          (!page ? (
            <>
              <CriticalInformation
                record={record}
                doctor
                recordPath={recordPath}
              />

              <RecentVisits record={record} recordPath={recordPath} />

              <div className="overview-actions">
                <Link className="button secondary" to={recordPath}>
                  View record history
                </Link>

                <Link
                  className="button secondary"
                  to={`/patients/${id}/reports`}
                >
                  View medical reports
                </Link>
              </div>
            </>
          ) : page === "records" ? (
            <Records key={id} record={record} />
          ) : (
            <MedicalReports
              key={id}
              token={token}
              patientId={id}
              patient={patient}
            />
          ))}
      </State>
    </>
  );
}

export default function DoctorWorkspace({ token, route, user }) {
  const directory = useRemote("/patients", token);

  const recent = useRemote(
    route === "/patients/recent"
      ? "/patients/recent?limit=20"
      : null,
    token,
  );

  const [emergencyStatus, setEmergencyStatus] = useState({
    checking: true,
    activePatientId: null,
  });

  const [selected, setSelected] = useState(null);
  const [emergencyPatient, setEmergencyPatient] = useState(null);
  const [feedback, setFeedback] = useState("");

  const match = route.match(/^\/patients\/(\d+)(?:\/(records|reports))?$/);
  const id = match?.[1];
  const page = match?.[2];

  const patient =
    selected?.id === Number(id)
      ? selected
      : directory.data?.find((row) => row.id === Number(id));

  const open = (row) => {
    setSelected(row);
    navigate(`/patients/${row.id}`);
  };

  const home = route === "/patients";
  const listing = route === "/patients/directory";
  const recentlyOpened = route === "/patients/recent";

  const approvals =
    route === "/patients/registrations" &&
    ["hospital_admin", "system_admin"].includes(user.role);

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
                <h1>
                  {home
                    ? "Home"
                    : listing
                      ? "Patient directory"
                      : recentlyOpened
                        ? "Recently opened patients"
                        : approvals
                          ? "Doctor registrations"
                          : "Page not found"}
                </h1>

                <p>
                  {home
                    ? "Find the right patient quickly by name, date of birth or MedBridge ID."
                    : listing
                      ? "All patients connected to your hospital, in alphabetical order."
                      : recentlyOpened
                        ? "Your last 20 successful record views. Confirm identity before reopening."
                        : ""}
                </p>
              </div>

              {home &&
                ["doctor", "hospital_admin"].includes(user.role) &&
                user.hospital_id != null && (
                  <DirectoryActions
                    token={token}
                    onRefresh={directory.reload}
                    onMessage={setFeedback}
                  />
                )}
            </section>
          )}

          <Notice>{feedback}</Notice>

          {user.hospital_id == null &&
            user.role !== "system_admin" &&
            !id && (
              <Notice>
                Your account has no hospital assignment. Contact your
                administrator.
              </Notice>
            )}

          {id ? (
            <PatientRecord
              key={`${id}-${page || "overview"}`}
              id={id}
              page={page}
              user={user}
              token={token}
              knownPatient={patient}
              onEmergency={setEmergencyPatient}
              onChanged={directory.reload}
              onViewed={recent.reload}
            />
          ) : home || listing ? (
            <State
              loading={directory.loading}
              error={directory.error}
              retry={directory.reload}
            >
              <div className="card directory-card">
                {home && <h2>Find a patient</h2>}

                <PatientSearch
                  key={route}
                  token={token}
                  initialPatients={directory.data}
                  onSelect={open}
                  compact={home}
                />

                {home && (
                  <p className="help">
                    Recently opened records and the complete patient directory
                    are available in the navigation.
                  </p>
                )}
              </div>
            </State>
          ) : recentlyOpened ? (
            <State
              loading={recent.loading}
              error={recent.error}
              retry={recent.reload}
            >
              {recent.data?.length ? (
                <div className="card patient-list">
                  {recent.data.map((row) => (
                    <PatientCard
                      key={row.id}
                      patient={row}
                      onSelect={open}
                      recent
                    />
                  ))}
                </div>
              ) : (
                <Empty title="No recently opened patients">
                  Records will appear here after you open them successfully.
                </Empty>
              )}
            </State>
          ) : approvals ? (
            <DoctorApprovals token={token} user={user} />
          ) : (
            <Empty title="Page not found">
              <Link to="/patients">Return to home</Link>
            </Empty>
          )}
        </>
      )}
    </>
  );
}

function DirectoryActions({ token, onRefresh, onMessage }) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="directory-actions">
      <button className="secondary" onClick={() => setCreating(true)}>
        Create patient account
      </button>

      {creating && (
        <Modal
          title="Create patient account"
          busy={busy}
          onClose={() => setCreating(false)}
        >
          <CreatePatientForm
            token={token}
            onBusyChange={setBusy}
            onCancel={() => setCreating(false)}
            onDone={(message) => {
              setCreating(false);
              onMessage(message);
              onRefresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DoctorApprovals({ token, user }) {
  const pending = useRemote("/auth/registrations/pending", token);

  const hospitals = useRemote(
    user.role === "system_admin"
      ? "/auth/registrations/hospitals"
      : null,
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
          body: JSON.stringify({
            hospital_id: Number(hospitalId),
          }),
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