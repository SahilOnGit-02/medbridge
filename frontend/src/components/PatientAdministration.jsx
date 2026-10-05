import { useState } from "react";
import { request } from "../lib";
import { Field, Modal, Notice, PencilIcon } from "./UI";
export function ProfileEditor({
  token,
  patient,
  onDone,
  onCancel,
  own = false,
  onBusyChange,
  onProfileCommitted,
  restricted = false,
}) {
  const fields = [
    ["full_name", "Full name", "text"],
    ["date_of_birth", "Date of birth", "date"],
    ["gender", "Gender", "text"],
    ["phone", "Phone", "tel"],
    ["email", "Contact email", "email"],
    ["address", "Address", "text"],
    ["emergency_contact_name", "Emergency contact name", "text"],
    ["emergency_contact_phone", "Emergency contact phone", "tel"],
  ].filter(
    ([key]) =>
      !restricted ||
      !["full_name", "date_of_birth", "gender", "email"].includes(key),
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries([
      ...fields.map(([key]) => [key, patient[key] || ""]),
      ["blood_group", patient.blood_group || ""],
    ]),
  );
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      if (photo && photo.size > 5 * 1024 * 1024)
        throw new Error("Select a photo of 5 MB or smaller.");
      await request(
        own
          ? "/patients/me/profile"
          : `/patients/${encodeURIComponent(patient.medbridge_id)}/profile`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify(
            Object.fromEntries(
              Object.entries(values).map(([key, value]) => [
                key,
                value.trim() || null,
              ]),
            ),
          ),
        },
      );
      onProfileCommitted?.();
      if (photo) {
        const body = new FormData();
        body.append("file", photo);
        try {
          await request(
            own
              ? "/patients/me/photo"
              : `/patients/${encodeURIComponent(patient.medbridge_id)}/photo`,
            token,
            { method: "POST", body },
          );
        } catch (failure) {
          throw new Error(
            `Profile saved, but photo was not updated: ${failure.message}`,
            { cause: failure },
          );
        }
      }
      onDone("Patient profile saved.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <form onSubmit={save} className="admin-form" aria-busy={busy}>
      <p className="help">
        {restricted
          ? "You can update blood group, contact phone, address, emergency contacts and photo. Identity and account details require the patient or an administrator."
          : "Contact email is separate from your sign-in email. Updating this profile does not change your login."}
      </p>
      <Field
        label="Profile photo (optional)"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hint="JPEG, PNG or WebP, up to 5 MB. Leave empty to keep the current photo."
        onChange={(event) => setPhoto(event.target.files[0] || null)}
      />
      <Field
        label="Blood group"
        hint={
          own
            ? "Changes are saved as patient reported. Clinical verification remains separate."
            : "Saved as clinician entered. Clinical verification remains separate."
        }
      >
        {(id) => (
          <select
            id={id}
            value={values.blood_group}
            onChange={(event) =>
              setValues({ ...values, blood_group: event.target.value })
            }
          >
            <option value="">Unknown</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
        )}
      </Field>
      <div className="metadata-grid">
        {fields.map(([key, label, type]) => (
          <Field
            key={key}
            label={label}
            type={type}
            required={key === "full_name"}
            maxLength={
              key === "address"
                ? 500
                : key === "email"
                  ? 255
                  : ["phone", "emergency_contact_phone", "gender"].includes(key)
                    ? 30
                    : 200
            }
            max={
              key === "date_of_birth"
                ? new Date().toISOString().slice(0, 10)
                : undefined
            }
            value={values[key]}
            onChange={(event) =>
              setValues({ ...values, [key]: event.target.value })
            }
          />
        ))}
      </div>
      <Notice error>{error}</Notice>
      <div className="actions end">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
export default function PatientAdministration({
  token,
  patient,
  onRefresh,
  own = false,
  restricted = false,
}) {
  const [mode, setMode] = useState("");
  const [committed, setCommitted] = useState(false);
  function closeProfile() {
    setMode("");
    if (committed)
      onRefresh("Profile changes saved. Photo upload was not completed.");
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function done(text) {
    setMode("");
    onRefresh(text);
  }
  async function verify() {
    setBusy(true);
    setError("");
    try {
      await request(
        `/patients/${encodeURIComponent(patient.medbridge_id)}/verify`,
        token,
        { method: "POST" },
      );
      done("Identity verification recorded.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="tertiary profile-edit"
        onClick={() => {
          setCommitted(false);
          setMode("profile");
        }}
      >
        <PencilIcon />
        {own ? "Edit my profile" : "Edit patient profile"}
      </button>
      {!own && patient.identity_verification_status !== "verified" && (
        <button
          onClick={() => {
            setError("");
            setMode("verify");
          }}
        >
          Verify identity
        </button>
      )}
      {mode === "profile" && (
        <Modal
          title={own ? "Edit my profile" : "Edit patient profile"}
          busy={busy}
          onClose={closeProfile}
        >
          <ProfileEditor
            token={token}
            patient={patient}
            own={own}
            restricted={restricted}
            onBusyChange={setBusy}
            onProfileCommitted={() => setCommitted(true)}
            onDone={done}
            onCancel={closeProfile}
          />
        </Modal>
      )}
      {mode === "verify" && (
        <Modal
          title="Record identity verification?"
          busy={busy}
          onClose={() => setMode("")}
        >
          <p>
            Confirm that you have checked {patient.full_name}’s identity using
            your organization’s approved process. This does not verify clinical
            information.
          </p>
          <Notice error>{error}</Notice>
          <div className="actions end">
            <button disabled={busy} onClick={() => setMode("")}>
              Cancel
            </button>
            <button className="primary" disabled={busy} onClick={verify}>
              {busy ? "Recording…" : "Confirm identity verified"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
