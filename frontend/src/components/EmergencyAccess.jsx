import { bloodSourceText } from "../lib";
import { useEffect, useState } from "react";
import { dateText, request, useRemote } from "../lib";
import { Field, Link, Modal, Notice, State } from "./UI";
import { CriticalInformation } from "./Records";
function EmergencySession({ access, token, onEnd }) {
  const remote = useRemote(`/emergency-access/${access.id}`, token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expired =
    now >= new Date(`${access.expires_at.replace(/Z$/, "")}Z`).getTime();
  async function end() {
    setBusy(true);
    setError("");
    try {
      await request(`/emergency-access/${access.id}/end`, token, {
        method: "POST",
      });
      onEnd(access.id);
    } catch (failure) {
      if (
        failure.status === 404 ||
        (failure.status === 403 && failure.message.includes("expired"))
      )
        onEnd(access.id);
      else setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const profile = remote.data;
  const record = profile && {
    patient: profile.patient,
    allergies: profile.allergies,
    prescriptions: profile.medications.map((item) => ({
      ...item,
      medication: item.medication || item,
      status: "active",
    })),
    conditions: profile.conditions,
    encounters: [],
    hospital_mappings: [],
  };
  return (
    <section
      className="emergency-session"
      aria-label="Emergency access session"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {expired ? "Emergency access expired" : "Emergency access active"}
          </p>
          <h1>
            {access.patient_name ||
              profile?.patient?.full_name ||
              `Patient ${access.patient_id}`}
          </h1>
          <p>
            {access.medbridge_id || profile?.patient?.medbridge_id}{" "}
            <span className="separator">•</span> Expires{" "}
            {dateText(access.expires_at, true)}
          </p>
        </div>
        <button className="danger" disabled={busy} onClick={end}>
          {busy
            ? "Ending…"
            : expired
              ? "Dismiss expired session"
              : "End emergency access"}
        </button>
      </div>
      <p>
        Reason: {access.reason}. This access is recorded in the patient’s
        history.
      </p>
      <Link to={`/patients/${access.patient_id}`}>Return to this patient</Link>
      <Notice error>{error}</Notice>
      {!expired && (
        <State
          loading={remote.loading}
          error={remote.error}
          retry={remote.reload}
        >
          {record && (
            <>
              <CriticalInformation record={record} doctor emergency />
              <p>
                Blood group: {profile.patient.blood_group || "Not recorded"}.
                {bloodSourceText(profile.patient.blood_group_source)}
              </p>
              <p>
                Emergency contact:{" "}
                {profile.emergency_contact.name || "Not recorded"} /{" "}
                {profile.emergency_contact.phone || "Not recorded"}
              </p>
            </>
          )}
        </State>
      )}
    </section>
  );
}
export default function EmergencyAccess({
  token,
  patient,
  onClose,
  onSessionState,
}) {
  const remote = useRemote("/emergency-access/me/active", token);
  const [override, setOverride] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const sessions = override ?? remote.data ?? [];
  const activePatientId = sessions[0]?.patient_id ?? null;
  useEffect(() => {
    onSessionState({
      checking: remote.loading && override === null,
      activePatientId,
    });
  }, [onSessionState, remote.loading, override, activePatientId]);
  async function start(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("Describe why emergency access is needed.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const access = await request("/emergency-access", token, {
        method: "POST",
        body: JSON.stringify({ patient_id: patient.id, reason: reason.trim() }),
      });
      setOverride([
        ...sessions,
        {
          ...access,
          patient_name: patient.full_name,
          medbridge_id: patient.medbridge_id,
        },
      ]);
      setReason("");
      onClose();
      setMessage(
        "Emergency access granted. The emergency profile is limited to critical information.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice>{message}</Notice>
      {remote.error && (
        <Notice error>
          Emergency session status could not be checked.{" "}
          <button onClick={remote.reload}>Retry status check</button>
        </Notice>
      )}
      {sessions.map((access) => (
        <EmergencySession
          key={access.id}
          access={access}
          token={token}
          onEnd={(id) => {
            setOverride(sessions.filter((item) => item.id !== id));
            setMessage("Emergency session is no longer active.");
          }}
        />
      ))}
      {patient && (
        <Modal
          title="Start restricted emergency access"
          busy={busy}
          onClose={() => {
            setError("");
            onClose();
          }}
        >
          <p>
            <strong>{patient.full_name}</strong>
            <br />
            Date of birth: {dateText(patient.date_of_birth)}
            <br />
            {patient.medbridge_id}
          </p>
          <p>
            This grants a restricted profile for 30 minutes. Your identity,
            reason and access will be recorded.
          </p>
          {sessions.length ? (
            <Notice error>
              End the existing emergency session before starting another.
            </Notice>
          ) : (
            <form onSubmit={start}>
              <Field
                label="Reason for emergency access"
                error={error}
                hint="Required. Describe the immediate need for the restricted information."
              >
                {(id) => (
                  <textarea
                    id={id}
                    data-initial-focus
                    required
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={`${id}-help`}
                  />
                )}
              </Field>
              <div className="actions end">
                <button type="button" disabled={busy} onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="danger"
                  disabled={busy || remote.loading || Boolean(remote.error)}
                >
                  {busy ? "Requesting access…" : "Start emergency access"}
                </button>
              </div>
              {busy && <p role="status">Requesting restricted access…</p>}
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
