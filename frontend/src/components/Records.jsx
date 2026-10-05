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
function recordedDate(item) {
  return (
    item.recorded_on ||
    item.started_on ||
    item.diagnosed_on ||
    item.started_at ||
    item.observed_at ||
    ""
  );
}
function newestFirst(a, b) {
  return recordedDate(b).localeCompare(recordedDate(a)) || b.id - a.id;
}
function revealCategory(category) {
  window.dispatchEvent(
    new CustomEvent("reveal-record", { detail: `records-${category}` }),
  );
}
export function RecentVisits({ record, patient = false, recordPath }) {
  const visits = [...(record.encounters || [])].sort(newestFirst).slice(0, 3);
  return (
    <section
      className="card recent-visits"
      aria-labelledby="recent-visits-heading"
    >
      <div className="section-heading">
        <h2 id="recent-visits-heading">Recent visits</h2>
        {patient ? (
          <Link to="/my-health/records#records-encounters">
            View all visits →
          </Link>
        ) : recordPath ? (
          <Link to={`${recordPath}#records-encounters`}>View all visits →</Link>
        ) : (
          <a
            href="#records-encounters"
            onClick={() => revealCategory("encounters")}
          >
            View all visits →
          </a>
        )}
      </div>
      {withheld(record, "encounters") ? (
        <p>Visits are not shared under the current consent.</p>
      ) : visits.length ? (
        <div className="recent-visits-grid">
          {visits.map((visit) => (
            <div key={visit.id}>
              <p className="eyebrow">{dateText(visit.started_at)}</p>
              <h3>{visit.reason || "Reason not recorded"}</h3>
              <p className="record-meta">
                {visit.hospital_name || "Provider not recorded"} •{" "}
                {visit.encounter_type}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No visits recorded in the available data.</p>
      )}
    </section>
  );
}
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
      {provider?.source_system &&
      provider.source_system !== "Synthetic local demo dataset"
        ? ` • ${provider.source_system}`
        : ""}
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
  recordPath,
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
    <section
      id="critical-information"
      className="critical-section"
      aria-labelledby="critical-heading"
    >
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
                  (doctor && recordPath ? (
                    <Link to={`${recordPath}#records-${key}`}>
                      Review{" "}
                      {entries.length > 3
                        ? `all ${entries.length} entries`
                        : "details"}
                    </Link>
                  ) : doctor ? (
                    <a
                      href={`#records-${key}`}
                      onClick={() => {
                        revealCategory(key);
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
function HistoryRows({ items, category, record }) {
  const [visible, setVisible] = useState(10);
  return (
    <>
      <p className="help" role="status">
        Showing {Math.min(visible, items.length)} of {items.length}, newest
        first.
      </p>
      {items.slice(0, visible).map((item) => (
        <details className="compact-record" key={item.id}>
          <summary>
            <span className="compact-date">{dateText(recordedDate(item))}</span>
            <strong>
              {item.substance ||
                item.medication?.name ||
                item.name ||
                item.reason ||
                "Details not recorded"}
            </strong>
            <span className="record-meta">
              {category === "prescriptions"
                ? isCurrent(item)
                  ? "Current"
                  : item.status
                : item.severity ||
                  item.clinical_status ||
                  item.encounter_type ||
                  item.status}
            </span>
          </summary>
          <RecordItem category={category} item={item} record={record} />
        </details>
      ))}
      {visible < items.length && (
        <button onClick={() => setVisible((count) => count + 10)}>
          Show 10 more{" "}
          {groups.find(([key]) => key === category)[1].toLowerCase()}
        </button>
      )}
    </>
  );
}
function Timeline({ record, match, recordType }) {
  const [visible, setVisible] = useState(25);
  const entries = groups
    .filter(([category]) => recordType === "all" || recordType === category)
    .flatMap(([category, label]) =>
      (record[category] || []).filter(match).map((item) => ({
        category,
        label,
        item,
        date: recordedDate(item),
      })),
    );
  entries.sort(
    (a, b) =>
      (b.date ? new Date(b.date).getTime() : -Infinity) -
      (a.date ? new Date(a.date).getTime() : -Infinity),
  );
  return (
    <div className="timeline-list">
      {entries.length ? (
        <>
          <p className="help" role="status">
            Showing {Math.min(visible, entries.length)} of {entries.length}{" "}
            timeline entries, newest first. Expand an entry for details. Undated
            entries appear last.
          </p>
          {entries.slice(0, visible).map(({ category, label, item, date }) => (
            <details className="timeline-entry" key={`${category}-${item.id}`}>
              <summary>
                <time className="timeline-date" dateTime={date || undefined}>
                  {dateText(date)}
                </time>
                <span className="timeline-description">
                  <span className="record-meta">{label}</span>
                  <strong>
                    {item.substance ||
                      item.medication?.name ||
                      item.name ||
                      item.reason ||
                      "Details not recorded"}
                  </strong>
                  <span className="record-meta">
                    {item.source_hospital_name ||
                      item.hospital_name ||
                      "Source provider not recorded"}
                  </span>
                </span>
                <span
                  className={`badge ${item.severity === "severe" ? "warning" : ""}`}
                >
                  {category === "observations"
                    ? `${item.value} ${item.unit || ""}`
                    : category === "prescriptions"
                      ? isCurrent(item)
                        ? "Current"
                        : item.status || "Status not recorded"
                      : item.severity ||
                        item.clinical_status ||
                        item.encounter_type}
                </span>
              </summary>
              <div className="disclosure-body">
                <RecordItem category={category} item={item} record={record} />
              </div>
            </details>
          ))}
          {visible < entries.length && (
            <button onClick={() => setVisible((count) => count + 25)}>
              Show 25 older entries
            </button>
          )}
        </>
      ) : (
        <Empty title="No available timeline entries">
          Try clearing the filter or check the category view for availability.
        </Empty>
      )}
    </div>
  );
}
export default function Records({ record, initialView = "categories" }) {
  const [filter, setFilter] = useState("");
  const [view, setView] = useState(initialView);
  const [year, setYear] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("encounters");
  const [recordType, setRecordType] = useState("all");
  useEffect(() => {
    let frame;
    const reveal = (event) => {
      const targetId = event?.detail || window.location.hash.slice(1);
      if (
        !/^records-(allergies|prescriptions|conditions|encounters|observations|documents)$/.test(
          targetId,
        )
      )
        return;
      setFilter("");
      setYear("all");
      setRecordType("all");
      setView("categories");
      setSelectedCategory(targetId.replace("records-", ""));
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
    window.addEventListener("reveal-record", reveal);
    if (window.location.hash) frame = requestAnimationFrame(reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("reveal-record", reveal);
      cancelAnimationFrame(frame);
    };
  }, []);
  const query = filter.trim().toLowerCase();
  const filtered = Boolean(query || year !== "all" || recordType !== "all");
  const years = [
    ...new Set(
      groups.flatMap(([key]) =>
        (record[key] || [])
          .map((item) => recordedDate(item).slice(0, 4))
          .filter(Boolean),
      ),
    ),
  ]
    .sort()
    .reverse();
  const match = (item) => {
    const text = JSON.stringify(item).toLowerCase();
    return (
      (year === "all" || recordedDate(item).startsWith(year)) &&
      (!query ||
        text.includes(query) ||
        (query === "crp" && text.includes("c-reactive protein")))
    );
  };
  const total = groups.reduce(
    (sum, [key]) => sum + (record[key]?.length || 0),
    0,
  );
  const matched = groups.reduce(
    (sum, [key]) =>
      sum +
      (recordType === "all" || recordType === key
        ? record[key]?.filter(match).length || 0
        : 0),
    0,
  );
  return (
    <section
      id="record-history"
      className="records-section"
      aria-labelledby="records-heading"
    >
      <div className="section-heading">
        <div>
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
      <div className="record-controls">
        <Field
          label="Filter record details"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Medication, condition, test or date"
        />

        <Field label="Record type">
          {(id) => (
            <select
              id={id}
              value={recordType}
              onChange={(event) => {
                setRecordType(event.target.value);
                if (event.target.value !== "all")
                  setSelectedCategory(event.target.value);
              }}
            >
              <option value="all">All types</option>
              {groups.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Recorded year">
          {(id) => (
            <select
              id={id}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option value="all">All years</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button
          disabled={!filtered}
          onClick={() => {
            setFilter("");
            setYear("all");
            setRecordType("all");
          }}
        >
          Clear filters
        </button>
      </div>
      <p className="result-count" role="status">
        {matched} of {total} available entries
        {query ? ` match “${filter.trim()}”` : ""}.
        {year !== "all" ? ` Recorded in ${year}.` : ""}
      </p>
      {filtered && matched === 0 && (
        <Empty title="No matching details">
          Try another term or clear the filter to view the available entries.
        </Empty>
      )}
      {view === "timeline" && (
        <Timeline
          key={`${query}:${year}:${recordType}`}
          record={record}
          match={match}
          recordType={recordType}
        />
      )}
      <div className="accordion-list" hidden={view !== "categories"}>
        {groups
          .filter(([key]) => recordType === "all" || key === recordType)
          .map(([key, label]) => {
            const all = record[key] || [];
            const items = all.filter(match).sort(newestFirst);
            return (
              <details
                key={`${key}-${query}-${year}`}
                id={`records-${key}`}
                open={selectedCategory === key}
              >
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setSelectedCategory(selectedCategory === key ? null : key);
                  }}
                >
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
                    <HistoryRows items={items} category={key} record={record} />
                  ) : (
                    <p>
                      {filtered
                        ? "No matching entries in this category."
                        : "No entries recorded in the available data."}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
      </div>
    </section>
  );
}
