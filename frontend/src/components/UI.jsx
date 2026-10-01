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
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
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
export function Identity({ patient, children }) {
  return (
    <section className="identity">
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
        <p className="eyebrow">{patient?.medbridge_id || "Patient profile"}</p>
        <h1>{patient?.full_name || "Health record"}</h1>
        <p>
          Date of birth: {dateText(patient?.date_of_birth)}{" "}
          <span className="separator">•</span>{" "}
          {patient?.gender || "Gender not recorded"}
        </p>
      </div>
      <div className="identity-actions">{children}</div>
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
