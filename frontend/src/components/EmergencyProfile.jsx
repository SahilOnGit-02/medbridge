import { bloodSourceText } from "../lib";
import { useState } from "react";
import { dateText, request } from "../lib";
import { Field, Link, Notice } from "./UI";
function EmergencyEditor({ token, patient, onSaved, onCancel }) {
  const [blood, setBlood] = useState(patient.blood_group || "");
  const [name, setName] = useState(patient.emergency_contact_name || "");
  const [phone, setPhone] = useState(patient.emergency_contact_phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const preview = phone.trim().replace(/[().\s-]/g, "");
  async function save(event) {
    event.preventDefault();
    setError("");
    if (phone.trim() && !/^\+?\d{7,15}$/.test(preview)) {
      setPhoneError(
        "Enter 7 to 15 digits, with an optional leading + country code.",
      );
      document.getElementById("emergency-phone")?.focus();
      return;
    }
    setPhoneError("");
    setBusy(true);
    try {
      const profile = await request("/patients/me/emergency-profile", token, {
        method: "PATCH",
        body: JSON.stringify({
          blood_group: blood || null,
          emergency_contact_name: name.trim() || null,
          emergency_contact_phone: preview || null,
        }),
      });
      onSaved({
        blood_group: profile.blood_group,
        blood_group_source: profile.blood_group_source,
        emergency_details_updated_at: profile.updated_at,
        emergency_contact_name: profile.emergency_contact.name,
        emergency_contact_phone: profile.emergency_contact.phone,
      });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="card emergency-editor" aria-busy={busy}>
      <h3>Edit emergency details</h3>
      <p>
        Information you enter is patient reported. It does not replace clinical
        verification.
      </p>
      <Field
        label="Blood group"
        hint="Choose Unknown if you do not know your blood group."
      >
        {(id) => (
          <select
            id={id}
            value={blood}
            onChange={(event) => setBlood(event.target.value)}
            aria-describedby={`${id}-help`}
          >
            <option value="">Unknown</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
        )}
      </Field>
      <Field
        label="Emergency contact name"
        autoComplete="off"
        value={name}
        maxLength={200}
        onChange={(event) => setName(event.target.value)}
      />
      <Field
        id="emergency-phone"
        label="Emergency contact phone"
        type="tel"
        autoComplete="off"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          setPhoneError("");
        }}
        error={phoneError}
        hint="Include a country code where known, for example +91 or +1. Spaces, parentheses and hyphens are accepted."
      />
      <p className="help" aria-live="polite">
        Saved phone format: {preview || "Not recorded"}
      </p>
      <Notice error>{error}</Notice>
      <div className="actions end">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save emergency details"}
        </button>
      </div>
      {busy && <p role="status">Saving your emergency details…</p>}
    </form>
  );
}
export default function EmergencyProfile({ token, patient, onSaved, record }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Keep this information current</p>
          <h2>Emergency profile</h2>
          <p>
            Contact information and the clinical information available for
            emergency care.
          </p>
        </div>
        {!editing && (
          <button
            className="primary"
            onClick={() => {
              setEditing(true);
              setMessage("");
            }}
          >
            Edit emergency details
          </button>
        )}
      </div>
      <Notice>{message}</Notice>
      {editing ? (
        <EmergencyEditor
          token={token}
          patient={patient}
          onCancel={() => setEditing(false)}
          onSaved={(values) => {
            onSaved(values);
            setEditing(false);
            setMessage(
              "Emergency details saved. Your profile now shows the updated information.",
            );
          }}
        />
      ) : (
        <div className="card metadata-grid">
          <div>
            <h3>Blood group</h3>
            <p className="large-value">{patient.blood_group || "Unknown"}</p>
            <p className="help">
              {bloodSourceText(patient.blood_group_source)}
            </p>
          </div>
          <div>
            <h3>Emergency contact</h3>
            <p>{patient.emergency_contact_name || "Not recorded"}</p>
            <p>{patient.emergency_contact_phone || "Phone not recorded"}</p>
            <p className="help">
              Last update:{" "}
              {dateText(patient.emergency_details_updated_at, true)}
            </p>
          </div>
        </div>
      )}
      <div className="card emergency-clinical">
        <h3>Clinical information</h3>
        <p>
          Allergies, medications and conditions are maintained in your clinical
          record. Contact your care team if they need correction.
        </p>
        <ul>
          <li>{record.allergies.length} available allergy entries</li>
          <li>
            {
              record.prescriptions.filter((item) => item.status === "active")
                .length
            }{" "}
            prescriptions marked active
          </li>
          <li>
            {
              record.conditions.filter(
                (item) => item.clinical_status === "active",
              ).length
            }{" "}
            active conditions
          </li>
        </ul>
        <Link to="/my-health/records">Review clinical records →</Link>
      </div>
    </section>
  );
}
