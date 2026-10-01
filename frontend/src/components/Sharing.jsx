import { useEffect, useState } from "react";
import { categories, consentState, dateText, request, useRemote } from "../lib";
import { Empty, Field, Modal, Notice, State } from "./UI";
function SharingEditor({ provider, consent, token, onSaved, onCancel }) {
  const [purpose, setPurpose] = useState(
    consent?.purpose || "Continuity of care",
  );
  const [scope, setScope] = useState(() =>
    Object.fromEntries(
      categories.map(([key]) => [
        `share_${key}`,
        consent ? Boolean(consent[`share_${key}`]) : false,
      ]),
    ),
  );
  const [duration, setDuration] = useState(
    consent?.expires_at ? "keep" : "none",
  );
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState("");
  function prepare(event) {
    event.preventDefault();
    if (!Object.values(scope).some(Boolean)) {
      setError("Choose at least one category to share.");
      return;
    }
    if (scope.share_medications && !scope.share_prescriptions) {
      setError(
        "Select Prescriptions as well to share the medication names and strengths attached to them.",
      );
      return;
    }
    const expiry =
      duration === "keep"
        ? consent.expires_at
        : duration === "custom"
          ? new Date(custom).toISOString()
          : duration === "none"
            ? null
            : new Date(Date.now() + Number(duration) * 86400000).toISOString();
    if (
      expiry &&
      new Date(expiry.endsWith("Z") ? expiry : `${expiry}Z`) <= new Date()
    ) {
      setError("Choose an expiry in the future.");
      return;
    }
    setError("");
    setReview({
      hospital_id: provider.hospital_id,
      purpose: purpose.trim(),
      ...scope,
      expires_at: expiry,
    });
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await request(
        consent ? `/consents/me/${consent.id}` : "/consents/me",
        token,
        { method: consent ? "PATCH" : "POST", body: JSON.stringify(review) },
      );
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card sharing-editor">
      <h3>{review ? "Confirm your sharing choices" : "Review sharing"}</h3>
      <p>
        <strong>
          {provider.hospital_name ||
            provider.source_system ||
            "Provider name not recorded"}
        </strong>
      </p>
      <Notice error>{error}</Notice>
      {review ? (
        <>
          <dl className="review-list">
            <dt>Purpose</dt>
            <dd>{review.purpose}</dd>
            <dt>Categories shared</dt>
            <dd>
              {categories
                .filter(([key]) => review[`share_${key}`])
                .map(([, label]) => label)
                .join(", ")}
            </dd>
            <dt>Expires</dt>
            <dd>
              {review.expires_at
                ? dateText(review.expires_at, true)
                : "No fixed expiry"}
            </dd>
          </dl>
          <p>
            The provider will be able to read the categories you selected until
            you revoke sharing or the grant expires. Emergency access is a
            separate, audited process.
          </p>
          <div className="actions end">
            <button disabled={busy} onClick={() => setReview(null)}>
              Change choices
            </button>
            <button className="primary" disabled={busy} onClick={confirm}>
              {busy ? "Saving…" : "Confirm sharing"}
            </button>
          </div>
          {busy && <p role="status">Updating sharing permissions…</p>}
        </>
      ) : (
        <form onSubmit={prepare}>
          <Field
            label="Purpose"
            required
            maxLength={500}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
          <fieldset>
            <legend>Record categories to share</legend>
            <p className="help">
              Only checked categories will be shared. Medication details and
              prescription instructions are separate categories.
            </p>
            <div className="scope-grid">
              {categories.map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={scope[`share_${key}`]}
                    onChange={(event) =>
                      setScope({
                        ...scope,
                        [`share_${key}`]: event.target.checked,
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Sharing duration">
            {(id) => (
              <select
                id={id}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                {consent?.expires_at && (
                  <option value="keep">
                    Keep existing expiry: {dateText(consent.expires_at, true)}
                  </option>
                )}
                <option value="none">No fixed expiry, until I revoke</option>
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="custom">Choose a date and time</option>
              </select>
            )}
          </Field>
          {duration === "custom" && (
            <Field
              label="Expiry date and time (your local time)"
              type="datetime-local"
              required
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
          )}
          <div className="actions end">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primary">Review choices</button>
          </div>
        </form>
      )}
    </div>
  );
}
export default function Sharing({ token, providers }) {
  const remote = useRemote("/consents/me", token);
  const [editing, setEditing] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const eligible = Array.from(
    new Map(
      providers.map((provider) => [provider.hospital_id, provider]),
    ).values(),
  );
  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await request(`/consents/me/${revoking.id}/revoke`, token, {
        method: "POST",
      });
      setRevoking(null);
      setMessage(
        "Sharing revoked. Normal clinical access through this grant is no longer allowed.",
      );
      remote.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your information, your choice</p>
          <h2>Sharing with providers</h2>
          <p>
            Choose categories and duration for each connected provider. You can
            change or revoke sharing later.
          </p>
        </div>
      </div>
      <Notice>{message}</Notice>
      <State
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      >
        {!eligible.length ? (
          <Empty title="No connected providers yet">
            A provider connection is needed before you can grant sharing.
            Contact your MedBridge administrator to connect your care provider.
          </Empty>
        ) : (
          eligible.map((provider) => {
            const consent = remote.data?.find(
              (item) => item.hospital_id === provider.hospital_id,
            );
            const status = consentState(consent);
            return (
              <div key={provider.hospital_id} className="provider-block">
                {editing === provider.hospital_id ? (
                  <SharingEditor
                    provider={provider}
                    consent={consent}
                    token={token}
                    onCancel={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null);
                      setMessage(
                        "Sharing choices saved. Your selected categories and duration are now in effect.",
                      );
                      remote.reload();
                    }}
                  />
                ) : (
                  <article className="card provider-card">
                    <div>
                      <div className="row-title">
                        <h3>
                          {provider.hospital_name ||
                            provider.source_system ||
                            "Provider name not recorded"}
                        </h3>
                        <span
                          className={`badge ${status === "Active" ? "positive" : ""}`}
                        >
                          {status}
                        </span>
                      </div>
                      <p>
                        {consent
                          ? consent.purpose
                          : "No sharing grant has been created for this provider."}
                      </p>
                      {consent && (
                        <>
                          <p className="help">
                            Selected categories:{" "}
                            {categories
                              .filter(([key]) => consent[`share_${key}`])
                              .map(([, label]) => label)
                              .join(", ") || "None"}
                          </p>
                          <p className="help">
                            {status === "Active" ? "Expires" : "Grant expiry"}:{" "}
                            {consent.expires_at
                              ? dateText(consent.expires_at, true)
                              : "No fixed expiry"}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="actions">
                      <button
                        className="primary"
                        onClick={() => {
                          setEditing(provider.hospital_id);
                          setMessage("");
                        }}
                      >
                        {status === "Active"
                          ? "Change sharing"
                          : "Review sharing"}
                      </button>
                      {status === "Active" && (
                        <button
                          onClick={() => {
                            setRevoking(consent);
                            setError("");
                          }}
                        >
                          Revoke sharing
                        </button>
                      )}
                    </div>
                  </article>
                )}
              </div>
            );
          })
        )}
      </State>
      {revoking && (
        <Modal
          title="Revoke provider sharing?"
          busy={busy}
          onClose={() => setRevoking(null)}
        >
          <p>
            This stops normal clinical access under this grant. It does not
            delete your records. Restricted emergency access remains a separate
            audited process.
          </p>
          <Notice error>{error}</Notice>
          <div className="actions end">
            <button disabled={busy} onClick={() => setRevoking(null)}>
              Keep sharing
            </button>
            <button className="danger" disabled={busy} onClick={revoke}>
              {busy ? "Revoking…" : "Revoke sharing"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
