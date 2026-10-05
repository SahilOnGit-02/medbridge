import { useState } from "react";
import { request } from "../lib";
import { Field, Notice, PasswordField } from "./UI";

export default function CreatePatientForm({
  token,
  onDone,
  onCancel,
  onBusyChange,
}) {
  const [values, setValues] = useState({});
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function field(key, label, props = {}) {
    return (
      <Field
        label={label}
        value={values[key] || ""}
        onChange={(event) =>
          setValues({ ...values, [key]: event.target.value })
        }
        {...props}
      />
    );
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const patient = await request("/patients/enroll", token, {
        method: "POST",
        body: JSON.stringify({
          full_name: `${values.first_name.trim()} ${values.last_name.trim()}`,
          date_of_birth: values.date_of_birth,
          email: values.email.trim().toLowerCase(),
          password: values.password,
          identity_checked: checked,
          ...Object.fromEntries(
            [
              "gender",
              "phone",
              "address",
              "emergency_contact_name",
              "emergency_contact_phone",
            ]
              .filter((key) => values[key]?.trim())
              .map((key) => [key, values[key].trim()]),
          ),
        }),
      });
      onDone(
        `Account created for ${patient.full_name}. The patient must verify their email before signing in. Clinical sharing still requires their consent.`,
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={save} aria-busy={busy}>
      <p>
        Create a new patient profile and sign-in account. A verification email
        will be sent to the patient.
      </p>
      <div className="name-fields">
        {field("first_name", "First name", {
          required: true,
          autoComplete: "off",
          maxLength: 100,
        })}
        {field("last_name", "Last name", {
          required: true,
          autoComplete: "off",
          maxLength: 99,
        })}
      </div>
      <div className="metadata-grid">
        {field("date_of_birth", "Date of birth", {
          required: true,
          type: "date",
          max: new Date().toISOString().slice(0, 10),
        })}
        {field("email", "Email address", {
          required: true,
          type: "email",
          maxLength: 255,
        })}
      </div>
      <PasswordField
        label="Initial password"
        required
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        value={values.password || ""}
        onChange={(event) =>
          setValues({ ...values, password: event.target.value })
        }
        hint="At least 12 characters. Provide this to the patient using your organization's approved process."
      />
      <details>
        <summary>Add contact and emergency details (optional)</summary>
        <div className="metadata-grid enrollment-extra">
          {field("gender", "Gender", { maxLength: 30 })}
          {field("phone", "Phone", { type: "tel", maxLength: 30 })}
          {field("address", "Address", { maxLength: 500 })}
          {field("emergency_contact_name", "Emergency contact name", {
            maxLength: 200,
          })}
          {field("emergency_contact_phone", "Emergency contact phone", {
            type: "tel",
            maxLength: 30,
          })}
        </div>
      </details>
      <label className="check">
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        I have checked the patient's identity using my organization's approved
        process.
      </label>
      <Notice error>{error}</Notice>
      <div className="actions end">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Creating…" : "Create patient account"}
        </button>
      </div>
    </form>
  );
}
