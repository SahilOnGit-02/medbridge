import { useEffect, useId, useRef, useState } from "react";
import { navigate, dateText, API } from "../lib";
export function Link({ to, children, onClick, ...props }) {
  return (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          navigate(to);
          onClick?.();
        }
      }}
    >
      {children}
    </a>
  );
}
function LoadingState({ retry }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="state">
      <div role="status">
        <span className="spinner" aria-hidden="true" />{" "}
        {slow
          ? "This is taking longer than expected. You can retry or keep waiting."
          : "Loading records…"}
      </div>
      {slow && retry && <button onClick={retry}>Retry loading</button>}
    </div>
  );
}
export function State({ loading, error, retry, children }) {
  if (loading) return <LoadingState retry={retry} />;
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        {retry && <button onClick={retry}>Retry</button>}
      </div>
    );
  return children;
}
export function Notice({ children, error = false }) {
  return children ? (
    <div
      className={`notice ${error ? "error" : "success"}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function Field({
  label,
  hint,
  error,
  id: suppliedId,
  children,
  ...props
}) {
  const autoId = useId();
  const id = suppliedId || autoId;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        children(id)
      ) : (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${id}-help` : undefined}
          {...props}
        />
      )}
      {(hint || error) && (
        <p id={`${id}-help`} className={error ? "field-error" : "help"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
export function PasswordField({ label = "Password", hint, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="password-control">
          <input
            {...props}
            id={id}
            type={shown ? "text" : "password"}
            aria-describedby={hint ? `${id}-help` : undefined}
          />
          <button
            type="button"
            className="password-eye"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            onClick={() => setShown(!shown)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {shown && <path d="m3 3 18 18" />}
            </svg>
          </button>
        </div>
      )}
    </Field>
  );
}
export function PencilIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" />
    </svg>
  );
}
export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector("[data-initial-focus]")?.focus();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
      else document.getElementById("main")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          ref.current.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]',
          ),
        ).filter((control) => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          ref.current.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map(([label, to], index) => (
          <li key={`${label}-${index}`}>
            {to ? (
              <Link to={to}>{label}</Link>
            ) : (
              <span aria-current="page">{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function Identity({ patient, record, details = true, children }) {
  const withheld = record?.access?.withheld_categories || [];
  const encounters = [...(record?.encounters || [])].sort((a, b) =>
    (b.started_at || "").localeCompare(a.started_at || ""),
  );
  const conditions = (record?.conditions || []).filter(
    (row) => row.clinical_status === "active",
  );
  return (
    <section
      className="identity patient-overview"
      id="patient-details"
      aria-label="Patient profile"
    >
      <div className="patient-identity-heading">
        {patient?.profile_photo_url && (
          <img
            className="patient-photo"
            src={
              patient.profile_photo_url.startsWith("/")
                ? `${API}${patient.profile_photo_url}`
                : patient.profile_photo_url
            }
            alt="Patient profile photo"
          />
        )}
        <div>
          <h1>{patient?.full_name || "Patient record"}</h1>
          <p className="record-meta">
            MedBridge ID: {patient?.medbridge_id || "Not recorded"}
          </p>
          <dl className="profile-grid">
            {[
              ["Date of birth", dateText(patient?.date_of_birth)],
              ["Gender", patient?.gender || "Not recorded"],
              ...(details
                ? [
                    ["Blood group", patient?.blood_group || "Not recorded"],
                    ["Phone", patient?.phone || "Not recorded"],
                    ["Contact email", patient?.email || "Not recorded"],
                    ["Address", patient?.address || "Not recorded"],
                    [
                      "Emergency contact",
                      `${patient?.emergency_contact_name || "Not recorded"} ${patient?.emergency_contact_phone || ""}`,
                    ],
                  ]
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {details && patient?.blood_group && (
            <p className="help">
              Blood group:{" "}
              {patient.blood_group_source === "patient_reported"
                ? "patient reported"
                : patient.blood_group_source === "clinician_recorded"
                  ? "clinician entered"
                  : "source not recorded"}
              . Clinical verification remains separate.
            </p>
          )}
        </div>
        <div className="identity-actions">{children}</div>
      </div>
      {details && record && (
        <div className="patient-brief">
          <h2>Patient summary</h2>
          <p>
            {withheld.includes("encounters")
              ? "Visit history is not shared."
              : encounters.length
                ? `${encounters.length} recorded ${encounters.length === 1 ? "visit" : "visits"}. Latest visit: ${dateText(encounters[0].started_at)}${encounters[0].reason ? `, ${encounters[0].reason}` : ""}.`
                : "No visits recorded."}
          </p>
          <p>
            {withheld.includes("conditions")
              ? "Conditions are not shared."
              : conditions.length
                ? `Active conditions: ${conditions
                    .slice(0, 3)
                    .map((row) => row.name)
                    .join(
                      ", ",
                    )}${conditions.length > 3 ? ` and ${conditions.length - 3} more` : ""}.`
                : "No active conditions recorded."}{" "}
            {withheld.includes("allergies")
              ? "Allergies are not shared."
              : `${record.allergies?.length || 0} recorded ${record.allergies?.length === 1 ? "allergy" : "allergies"}.`}
          </p>
          <p className="help">
            Summary of available records. Missing information does not confirm
            the absence of a condition or allergy.
          </p>
        </div>
      )}
    </section>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
