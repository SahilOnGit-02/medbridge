import { bloodSourceText } from "../lib";
import { useState } from "react";
import { useRemote } from "../lib";
import { Breadcrumbs, Empty, Identity, Link, Notice, State } from "./UI";
import Records, { CriticalInformation, RecentVisits } from "./Records";
import Sharing from "./Sharing";
import AccessHistory from "./AccessHistory";
import EmergencyProfile from "./EmergencyProfile";
const names = {
  overview: "Overview",
  records: "Records",
  emergency: "Emergency profile",
  sharing: "Sharing",
  history: "Access history",
};
export default function PatientPortal({ token, route }) {
  const summary = useRemote("/patients/me/summary", token);
  const [patch, setPatch] = useState({});
  const page = route.split("/")[2];
  const record = summary.data && {
    ...summary.data,
    patient: { ...summary.data.patient, ...patch },
  };
  return (
    <>
      <Breadcrumbs
        items={
          page === "overview"
            ? [["My health"]]
            : [
                ["My health", "/my-health/overview"],
                [names[page] || "Page not found"],
              ]
        }
      />
      <State
        loading={summary.loading}
        error={summary.error}
        retry={summary.reload}
      >
        {record && (
          <>
            <Identity patient={record.patient}>
              <span className="badge">My health</span>
            </Identity>
            {record.hospital_mappings.some(
              (mapping) =>
                mapping.source_system === "Synthetic local demo dataset",
            ) && (
              <Notice>
                Synthetic local demo: this fictional history is for interface
                review, not clinical care.
              </Notice>
            )}
            {page === "overview" && (
              <>
                <div className="overview-actions">
                  <Link className="button primary" to="/my-health/records">
                    View my records
                  </Link>
                  <Link className="button" to="/my-health/emergency">
                    Review emergency details
                  </Link>
                </div>
                <CriticalInformation record={record} />
                <RecentVisits record={record} patient />
                <section className="card next-actions">
                  <h2>You control record sharing</h2>
                  <p>
                    Review which connected providers can access your
                    information, then see who has accessed it.
                  </p>
                  <div className="actions">
                    <Link to="/my-health/sharing">Review sharing →</Link>
                    <Link to="/my-health/history">View access history →</Link>
                  </div>
                </section>
                <details>
                  <summary>Patient profile</summary>
                  <div className="disclosure-body">
                    <p>
                      Blood group:{" "}
                      {record.patient.blood_group || "Not recorded"}
                    </p>
                    <p className="help">
                      {bloodSourceText(record.patient.blood_group_source)}
                    </p>
                    <p>Phone: {record.patient.phone || "Not recorded"}</p>
                    <p>Email: {record.patient.email || "Not recorded"}</p>
                    <p>Address: {record.patient.address || "Not recorded"}</p>
                  </div>
                </details>
              </>
            )}
            {page === "records" && (
              <>
                <p className="page-intro">
                  Your available history, newest first. Switch to categories or
                  filter by year and record type. Missing entries do not confirm
                  that a condition or allergy is absent.
                </p>
                <Records record={record} initialView="timeline" />
              </>
            )}
            {page === "emergency" && (
              <EmergencyProfile
                token={token}
                patient={record.patient}
                onSaved={setPatch}
                record={record}
              />
            )}
            {page === "sharing" && (
              <Sharing token={token} providers={record.hospital_mappings} />
            )}
            {page === "history" && <AccessHistory token={token} />}
            {!names[page] && (
              <Empty title="Page not found">
                <Link to="/my-health/overview">Return to my health</Link>
              </Empty>
            )}
          </>
        )}
      </State>
    </>
  );
}
