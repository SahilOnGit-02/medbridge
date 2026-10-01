import { useEffect, useState } from "react";
import { dateText, isCurrent } from "../lib";
import { Empty, Field, Link, Notice } from "./UI";
const groups = [
  ["allergies", "Allergies"],
  ["prescriptions", "Medications and prescriptions"],
  ["conditions", "Conditions"],
  ["encounters", "Visits"],
  ["observations", "Test results"],
];
function Source({ item, record, date }) {
  const encounter = item.hospital_id
    ? item
    : record.encounters?.find((row) => row.id === item.encounter_id);
  const provider = record.hospital_mappings?.find(
    (mapping) => mapping.hospital_id === encounter?.hospital_id,
  );
  return (
    <p className="record-meta">
      {item.source_hospital_name ||
        encounter?.hospital_name ||
        provider?.hospital_name ||
        "Source provider not recorded"}{" "}
      <span className="separator">•</span> {dateText(date)}
      {provider?.source_system ? ` • ${provider.source_system}` : ""}
    </p>
  );
}
export function RecordItem({ category, item, record }) {
  if (category === "allergies")
    return (
      <article className="record-row">
        <div className="row-title">
          <h3>{item.substance}</h3>
          <span
            className={`badge ${item.severity === "severe" ? "warning" : ""}`}
          >
            {item.severity || "Severity not recorded"}
          </span>
        </div>
        <p>Reaction: {item.reaction || "Not recorded"}</p>
        <p className="record-meta">
          {item.verified
            ? "Allergy verified in record"
            : "Verification not recorded"}
        </p>
        <Source item={item} record={record} date={item.recorded_on} />
      </article>
    );
  if (category === "prescriptions")
    return (
      <article className="record-row">
        <div className="row-title">
          <h3>
            {item.medication?.name ||
              "Medication details withheld or not recorded"}
          </h3>
          <span className="badge">
            {isCurrent(item) ? "Current" : item.status || "Status not recorded"}
          </span>
        </div>
        {item.medication?.generic_name && <p>{item.medication.generic_name}</p>}
        <p>
          Strength: {item.medication?.strength || "Not available"}{" "}
          <span className="separator">•</span> Prescribed dose:{" "}
          {item.dose || "Not recorded"}
        </p>
        <p>
          {item.frequency || "Frequency not recorded"}{" "}
          <span className="separator">•</span>{" "}
          {item.route || "Route not recorded"}
        </p>
        {item.instructions && <p>{item.instructions}</p>}
        <Source item={item} record={record} date={item.started_on} />
        {item.ended_on && (
          <p className="record-meta">Ends: {dateText(item.ended_on)}</p>
        )}
      </article>
    );
  if (category === "conditions")
    return (
      <article className="record-row">
        <div className="row-title">
          <h3>{item.name}</h3>
          <span className="badge">
            {item.clinical_status || "Status not recorded"}
          </span>
        </div>
        {item.code && <p className="record-meta">Clinical code: {item.code}</p>}
        {item.notes && <p>{item.notes}</p>}
        <Source item={item} record={record} date={item.diagnosed_on} />
      </article>
    );
  if (category === "encounters")
    return (
      <article className="record-row">
        <div className="row-title">
          <h3>{item.reason || "Reason not recorded"}</h3>
          <span className="badge">{item.encounter_type}</span>
        </div>
        <p>{item.attending_doctor || "Clinician not recorded"}</p>
        <Source item={item} record={record} date={item.started_at} />
        {item.ended_at && (
          <p className="record-meta">Ended: {dateText(item.ended_at, true)}</p>
        )}
      </article>
    );
  return (
    <article className="record-row">
      <div className="row-title">
        <h3>{item.name}</h3>
        <strong>
          {item.value} {item.unit}
        </strong>
      </div>
      <p>Reference range: {item.reference_range || "Not recorded"}</p>
      <p className="record-meta">
        Result status: {item.status || "Not recorded"}
      </p>
      <Source item={item} record={record} date={item.observed_at} />
    </article>
  );
}
function withheld(record, category) {
  return record.access?.withheld_categories?.includes(category);
}
export function CriticalInformation({
  record,
  doctor = false,
  emergency = false,
}) {
  const critical = [
    ["allergies", "Allergies", record.allergies || []],
    [
      "prescriptions",
      "Current medications",
      (record.prescriptions || []).filter(isCurrent),
    ],
    [
      "conditions",
      "Active conditions",
      (record.conditions || []).filter(
        (item) => item.clinical_status === "active",
      ),
    ],
  ];
  return (
    <section className="critical-section" aria-labelledby="critical-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {doctor ? "Review first" : "Your current information"}
          </p>
          <h2 id="critical-heading">
            {doctor ? "Critical information" : "Health overview"}
          </h2>
        </div>
      </div>
      <div className="critical-grid">
        {critical.map(([key, title, entries]) => (
          <section
            key={key}
            className={`card critical-card ${key === "allergies" ? "allergy-card" : ""}`}
          >
            <h3>{title}</h3>
            {withheld(record, key) ? (
              <p className="withheld">Not shared under the current consent.</p>
            ) : entries.length ? (
              <>
                <ul className="critical-list">
                  {entries.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <strong>
                        {item.substance ||
                          item.medication?.name ||
                          item.name ||
                          "Medication details withheld"}
                      </strong>
                      <span>
                        {key === "allergies"
                          ? `${item.reaction || "Reaction not recorded"} • ${item.severity || "Severity not recorded"}`
                          : key === "prescriptions"
                            ? `Dose: ${item.dose || "Not recorded"} • ${item.frequency || "Frequency not recorded"}`
                            : `Diagnosed: ${dateText(item.diagnosed_on)}`}
                      </span>
                      {key === "allergies" && (
                        <span>
                          {item.verified
                            ? "Verified in record"
                            : "Verification not recorded"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {!emergency &&
                  (doctor ? (
                    <a
                      href={`#records-${key}`}
                      onClick={() => {
                        const target = document.getElementById(
                          `records-${key}`,
                        );
                        if (target) {
                          target.open = true;
                          target
                            .querySelector("summary")
                            ?.focus({ preventScroll: true });
                        }
                      }}
                    >
                      Review{" "}
                      {entries.length > 3
                        ? `all ${entries.length} entries`
                        : "details"}
                    </a>
                  ) : (
                    <Link to={`/my-health/records#records-${key}`}>
                      Review details
                    </Link>
                  ))}
              </>
            ) : (
              <p>
                No {title.toLowerCase()} recorded in the available data. This
                does not confirm clinical absence.
              </p>
            )}
          </section>
        ))}
      </div>
      {record.access?.withheld_categories?.length > 0 && (
        <Notice>
          Some categories are withheld by patient consent:{" "}
          {record.access.withheld_categories.join(", ")}.
        </Notice>
      )}
      <p className="help">
        Recorded dates and sources appear in record details. Provider sync time
        is not available.
      </p>
    </section>
  );
}
function Timeline({ record, match }) {
  const entries = groups.flatMap(([category, label]) =>
    (record[category] || []).filter(match).map((item) => ({
      category,
      label,
      item,
      date:
        item.recorded_on ||
        item.started_on ||
        item.diagnosed_on ||
        item.started_at ||
        item.observed_at,
    })),
  );
  entries.sort(
    (a, b) =>
      (b.date ? new Date(b.date).getTime() : -Infinity) -
      (a.date ? new Date(a.date).getTime() : -Infinity),
  );
  return (
    <div className="timeline-list">
      <p className="help">
        Newest recorded events first. Undated entries appear last. This reflects
        available records and does not indicate source sync time.
      </p>
      {entries.length ? (
        entries.map(({ category, label, item, date }) => (
          <section className="card" key={`${category}-${item.id}`}>
            <p className="eyebrow">
              {dateText(date)} • {label}
            </p>
            <RecordItem category={category} item={item} record={record} />
          </section>
        ))
      ) : (
        <Empty title="No available timeline entries">
          Try clearing the filter or check the category view for availability.
        </Empty>
      )}
    </div>
  );
}
export default function Records({ record }) {
  const [filter, setFilter] = useState("");
  const [view, setView] = useState("categories");
  useEffect(() => {
    let frame;
    const reveal = () => {
      const targetId = window.location.hash.slice(1);
      if (
        !/^records-(allergies|prescriptions|conditions|encounters|observations|documents)$/.test(
          targetId,
        )
      )
        return;
      setFilter("");
      setView("categories");
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) {
          target.open = true;
          target.scrollIntoView();
          target.querySelector("summary")?.focus({ preventScroll: true });
        }
      });
    };
    window.addEventListener("hashchange", reveal);
    if (window.location.hash) frame = requestAnimationFrame(reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      cancelAnimationFrame(frame);
    };
  }, []);
  const query = filter.trim().toLowerCase();
  const match = (item) => {
    const text = JSON.stringify(item).toLowerCase();
    return (
      !query ||
      text.includes(query) ||
      (query === "crp" && text.includes("c-reactive protein"))
    );
  };
  const total = groups.reduce(
    (sum, [key]) => sum + (record[key]?.length || 0),
    0,
  );
  const matched = groups.reduce(
    (sum, [key]) => sum + (record[key]?.filter(match).length || 0),
    0,
  );
  return (
    <section className="records-section" aria-labelledby="records-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Explore the available record</p>
          <h2 id="records-heading">Record details</h2>
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Record layout">
        <button
          aria-pressed={view === "categories"}
          onClick={() => setView("categories")}
        >
          By category
        </button>
        <button
          aria-pressed={view === "timeline"}
          onClick={() => setView("timeline")}
        >
          Timeline
        </button>
      </div>
      <div className="filter-bar">
        <Field
          label="Filter record details"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Medication, condition, test or date"
          hint="This filters details below. Critical information stays visible."
        />
        <button disabled={!filter} onClick={() => setFilter("")}>
          Clear filter
        </button>
      </div>
      <p className="result-count" role="status">
        {matched} of {total} available entries
        {query ? ` match “${filter.trim()}”` : ""}.
      </p>
      {query && matched === 0 && (
        <Empty title="No matching details">
          Try another term or clear the filter to view the available entries.
        </Empty>
      )}
      {view === "timeline" && <Timeline record={record} match={match} />}
      <div className="accordion-list" hidden={view !== "categories"}>
        {groups.map(([key, label]) => {
          const all = record[key] || [];
          const items = all.filter(match);
          return (
            <details
              key={`${key}-${query ? "filtered" : "all"}`}
              id={`records-${key}`}
              open={query ? items.length > 0 : key === "prescriptions"}
            >
              <summary>
                <span>{label}</span>
                <span className="badge">
                  {withheld(record, key)
                    ? "Not shared"
                    : `${items.length}${query ? ` / ${all.length}` : ""}`}
                </span>
              </summary>
              <div className="disclosure-body">
                {withheld(record, key) ? (
                  <p>Not shared under the current consent.</p>
                ) : items.length ? (
                  items.map((item) => (
                    <RecordItem
                      key={item.id}
                      category={key}
                      item={item}
                      record={record}
                    />
                  ))
                ) : (
                  <p>
                    {query
                      ? "No matching entries in this category."
                      : "No entries recorded in the available data."}
                  </p>
                )}
              </div>
            </details>
          );
        })}
        <details id="records-documents">
          <summary>
            <span>Documents</span>
            <span className="badge">
              {record.patient.medbridge_id === "MB-A-DEMO-005" &&
              !withheld(record, "observations")
                ? 2
                : "Not connected"}
            </span>
          </summary>
          <div className="disclosure-body">
            {record.patient.medbridge_id === "MB-A-DEMO-005" &&
            !withheld(record, "observations") ? (
              <>
                <p>
                  Existing synthetic prototype reports for this patient. These
                  public files are demonstration documents.
                </p>
                <ul className="document-list">
                  <li>
                    <a
                      href="/demo-reports/MedBridge_Rohan_Mehta_CBC_CRP_Synthetic_Report.pdf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CBC + CRP synthetic report (PDF, opens a new tab)
                    </a>
                  </li>
                  <li>
                    <a
                      href="/demo-reports/MedBridge_Rohan_Mehta_Typhoid_Widal_Synthetic_Report.pdf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Typhoid / Widal synthetic report (PDF, opens a new tab)
                    </a>
                  </li>
                </ul>
              </>
            ) : (
              <p>No document source is connected for this record.</p>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
