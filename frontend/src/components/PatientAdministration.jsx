import { useState } from "react";
import { request } from "../lib";
import { Field, Modal, Notice } from "./UI";
function ProfileEditor({ token, patient, onDone, onCancel }) {
  const fields = [
    ["full_name", "Full name", "text"],
    ["date_of_birth", "Date of birth", "date"],
    ["gender", "Gender", "text"],
    ["phone", "Phone", "tel"],
    ["email", "Email", "email"],
    ["address", "Address", "text"],
    ["emergency_contact_name", "Emergency contact name", "text"],
    ["emergency_contact_phone", "Emergency contact phone", "tel"],
  ];
  const [values, setValues] = useState(() =>
    Object.fromEntries([
      ...fields.map(([key]) => [key, patient[key] || ""]),
      ["blood_group", patient.blood_group || ""],
    ]),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        `/patients/${encodeURIComponent(patient.medbridge_id)}/profile`,
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
      onDone("Patient profile saved.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="admin-form" aria-busy={busy}>
      <h3>Edit patient profile</h3>
      <Field
        label="Blood group"
        hint="A clinician-entered value is recorded with its source. Clinical verification remains separate."
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
function AccountEditor({ token, patient, onDone, onCancel }) {
  const [email, setEmail] = useState(patient.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        `/patients/${encodeURIComponent(patient.medbridge_id)}/create-account`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        },
      );
      setPassword("");
      onDone(
        "Patient account created. Use your approved process to provide the credentials to the patient.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={save} aria-busy={busy}>
      <h3>Create patient sign-in account</h3>
      <p>
        This links an account to {patient.full_name}. No email is sent by this
        action.
      </p>
      <Field
        label="Patient account email"
        type="email"
        required
        autoComplete="off"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Field
        label="Initial password"
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        hint="Use at least 8 characters. Provide credentials through your approved process."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Notice error>{error}</Notice>
      <div className="actions end">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
export default function PatientAdministration({ token, patient, onRefresh }) {
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);
  function done(text) {
    setMode("");
    setMessage(text);
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
  async function upload(event) {
    event.preventDefault();
    if (!photo) return;
    if (photo.size > 5 * 1024 * 1024) {
      setError("Select a photo smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", photo);
    try {
      await request(
        `/patients/${encodeURIComponent(patient.medbridge_id)}/photo`,
        token,
        { method: "POST", body: form },
      );
      done("Patient photo updated.");
      setPhoto(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="patient-administration">
      <h3>Manage patient profile</h3>
      <p className="help">
        Profile management is separate from the clinical record and identity
        verification.
      </p>
      <Notice>{message}</Notice>
      <Notice error>{error}</Notice>
      {mode === "profile" ? (
        <ProfileEditor
          token={token}
          patient={patient}
          onDone={done}
          onCancel={() => setMode("")}
        />
      ) : mode === "account" ? (
        <AccountEditor
          token={token}
          patient={patient}
          onDone={done}
          onCancel={() => setMode("")}
        />
      ) : (
        <div className="actions">
          <button onClick={() => setMode("profile")}>
            Edit patient profile
          </button>
          <button onClick={() => setMode("account")}>
            Create patient account
          </button>
          <button
            onClick={() => {
              setMode("verify");
              setError("");
            }}
          >
            Verify identity
          </button>
          <button onClick={() => setMode("photo")}>Update photo</button>
        </div>
      )}
      {mode === "photo" && (
        <form className="admin-form" onSubmit={upload}>
          <Field
            label="Patient photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            hint="JPEG, PNG or WebP, up to 5 MB."
            onChange={(event) => setPhoto(event.target.files[0])}
          />
          <div className="actions end">
            <button type="button" disabled={busy} onClick={() => setMode("")}>
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Uploading…" : "Upload photo"}
            </button>
          </div>
        </form>
      )}
      {mode === "verify" && (
        <Modal
          title="Record identity verification?"
          busy={busy}
          onClose={() => setMode("")}
        >
          <p>
            Confirm that you have checked {patient.full_name}’s identity using
            your organization’s approved process. This marks identity as
            verified. It does not verify clinical information.
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
    </section>
  );
}
