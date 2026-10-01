import { useState } from "react";
import { dateText, request, timeZone, useRemote } from "../lib";
import { Empty, Notice, State } from "./UI";
const labels = {
  patient_record_view: "Clinical record viewed",
  fhir_patient_view: "Patient profile viewed",
  fhir_record_view: "Clinical data viewed",
  emergency_access_granted: "Emergency access started",
  emergency_access_viewed: "Emergency profile viewed",
  emergency_access_ended: "Emergency access ended",
  patient_emergency_profile_updated: "You updated emergency details",
  patient_sharing_updated: "You changed sharing",
  patient_sharing_revoked: "You revoked sharing",
};
function HistoryList({ token, filter }) {
  const remote = useRemote(
    `/patients/me/access-history?limit=25&activity=${filter}`,
    token,
  );
  const [more, setMore] = useState([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = [...(remote.data || []), ...more];
  async function loadMore() {
    setBusy(true);
    setError("");
    try {
      const data = await request(
        `/patients/me/access-history?limit=25&activity=${filter}&before_id=${rows.at(-1).id}`,
        token,
      );
      setMore([...more, ...data]);
      setDone(data.length < 25);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.action.startsWith("emergency_")
      ? `emergency-${row.resource_id}`
      : `event-${row.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  function entry(row) {
    return (
      <article className="history-entry" key={row.id}>
        <div className="row-title">
          <h3>{labels[row.action] || "Recorded activity"}</h3>
          <span className="badge">
            {row.success ? "Completed" : "Unsuccessful"}
          </span>
        </div>
        <p>
          {row.user.full_name} <span className="separator">•</span>{" "}
          {row.hospital.name === "Unknown hospital"
            ? "No provider recorded"
            : row.hospital.name}
        </p>
        <p className="record-meta">{dateText(row.created_at, true)}</p>
        {row.details && (
          <details>
            <summary>Activity details</summary>
            <div className="disclosure-body">
              <p>{row.details}</p>
            </div>
          </details>
        )}
      </article>
    );
  }
  return (
    <State loading={remote.loading} error={remote.error} retry={remote.reload}>
      {rows.length ? (
        <>
          <p className="result-count" role="status">
            {rows.length} activities loaded. Times shown in {timeZone}.
          </p>
          <div className="history-list">
            {Array.from(groups, ([key, items]) =>
              key.startsWith("emergency-") ? (
                <details key={key} className="emergency-history">
                  <summary>
                    <span>Emergency session • {items[0].user.full_name}</span>
                    <span className="badge">{items.length} loaded events</span>
                  </summary>
                  <div className="disclosure-body">
                    {items.map(entry)}
                    <p className="help">
                      Older events in this session may appear as you load more
                      activity.
                    </p>
                  </div>
                </details>
              ) : (
                <div className="card" key={key}>
                  {entry(items[0])}
                </div>
              ),
            )}
          </div>
          <Notice error>{error}</Notice>
          {!done && (remote.data?.length >= 25 || more.length >= 25) && (
            <button disabled={busy} onClick={loadMore}>
              {busy ? "Loading older activity…" : "Load older activity"}
            </button>
          )}
        </>
      ) : (
        <Empty title="No activity in this category yet">
          Clinical record views, emergency access and your profile or sharing
          changes appear here when recorded.
        </Empty>
      )}
    </State>
  );
}
export default function AccessHistory({ token }) {
  const [filter, setFilter] = useState("all");
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Transparency in your care</p>
          <h2>Access history</h2>
          <p>
            Review recorded normal access, emergency sessions and your own
            changes.
          </p>
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Filter activity">
        {[
          ["all", "All activity"],
          ["normal", "Normal access"],
          ["emergency", "Emergency"],
          ["changes", "My changes"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <HistoryList key={filter} token={token} filter={filter} />
    </section>
  );
}
