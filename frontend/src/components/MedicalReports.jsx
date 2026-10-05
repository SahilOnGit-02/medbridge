import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { dateText, request, useRemote } from "../lib";
import { Empty, Field, Modal, Notice, State } from "./UI";

const ReportPreview = lazy(() => import("./ReportPreview"));

export default function MedicalReports({ token, patientId, patient }) {
  const path = patientId
    ? `/patients/${patientId}/reports`
    : "/patients/me/reports";
  const remote = useRemote(path, token);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [visible, setVisible] = useState(10);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  const download = useRef(null);
  useEffect(() => () => download.current?.abort(), []);
  const reports = remote.data || [];
  const types = [
    ...new Set(reports.map((report) => report.report_type)),
  ].sort();
  const matches = reports.filter(
    (report) =>
      (type === "all" || report.report_type === type) &&
      `${report.title} ${report.description || ""} ${report.issuing_doctor || ""} ${report.issued_on}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  async function openReport(report) {
    const controller = new AbortController();
    download.current = controller;
    setBusy(report.id);
    setError("");
    setPreview(report);
    setPreviewUrl("");
    try {
      // Re-authorize every download, including after sharing has changed.
      const blob = await request(`${path}/${report.id}/file`, token, {
        responseType: "blob",
        signal: controller.signal,
        headers: { Accept: "application/pdf" },
      });
      if (controller.signal.aborted) return;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure.status === 403) {
          // Clear the previously listed metadata when sharing changes.
          setError("");
          remote.reload();
        } else setError(failure.message);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  return (
    <section
      className="card medical-reports"
      id="medical-reports"
      aria-labelledby="reports-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="reports-heading">Medical reports</h2>
          <p className="help">
            {patientId
              ? `Reports for ${patient?.full_name || "this patient"}.`
              : "Your reports, newest first."}{" "}
            Open a report to review it or save a copy.
          </p>
        </div>
        <button
          onClick={remote.reload}
          disabled={remote.loading || busy !== null}
        >
          Refresh reports
        </button>
      </div>
      <Notice error>{error}</Notice>
      {preview && (
        <Modal
          title={preview.title}
          onClose={() => {
            download.current?.abort();
            setPreview(null);
            setPreviewUrl("");
            setBusy(null);
            setError("");
          }}
        >
          {previewUrl ? (
            <>
              <div className="actions report-preview-actions">
                <a
                  className="button secondary"
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in new tab
                </a>
                <a
                  className="button secondary"
                  href={previewUrl}
                  download={preview.file_name}
                >
                  Save a copy
                </a>
              </div>
              <Suspense
                fallback={<p role="status">Loading document viewer…</p>}
              >
                <ReportPreview
                  key={previewUrl}
                  url={previewUrl}
                  title={preview.title}
                />
              </Suspense>
            </>
          ) : busy !== null ? (
            <div role="status" className="state">
              Loading report…
            </div>
          ) : (
            <Notice error>
              {error ||
                "This report is no longer available under the current sharing permissions."}
            </Notice>
          )}
        </Modal>
      )}
      <State
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      >
        {reports.length > 0 ? (
          <>
            <div className="report-filters">
              <Field
                label="Find a report"
                type="search"
                value={query}
                placeholder="Title, doctor or date"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(10);
                }}
              />
              <Field label="Report type">
                {(id) => (
                  <select
                    id={id}
                    value={type}
                    onChange={(event) => {
                      setType(event.target.value);
                      setVisible(10);
                    }}
                  >
                    <option value="all">All types</option>
                    {types.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <p className="result-count" role="status">
              {matches.length} of {reports.length} reports
            </p>
            {matches.length ? (
              <ul className="report-list">
                {matches.slice(0, visible).map((report) => (
                  <li key={report.id}>
                    <div>
                      <h3>{report.title}</h3>
                      <p className="record-meta">
                        {report.report_type} · {dateText(report.issued_on)}
                      </p>
                      <p className="record-meta">
                        {[report.issuing_doctor, report.department]
                          .filter(Boolean)
                          .join(" · ") || "Provider details not recorded"}
                      </p>
                      {report.description && <p>{report.description}</p>}
                    </div>
                    <button
                      disabled={busy !== null}
                      onClick={() => openReport(report)}
                      aria-label={`Open ${/prescription/i.test(`${report.report_type} ${report.title}`) ? "prescription" : "report"}: ${report.title}`}
                    >
                      {busy === report.id
                        ? "Opening…"
                        : /prescription/i.test(
                              `${report.report_type} ${report.title}`,
                            )
                          ? "Open prescription"
                          : "Open report"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No matching reports">
                Change the report type or search term.
              </Empty>
            )}
            {visible < matches.length && (
              <button onClick={() => setVisible((count) => count + 10)}>
                Show 10 older reports
              </button>
            )}
          </>
        ) : (
          <Empty title="No medical reports available">
            Reports will appear when they are added to your connected record.
          </Empty>
        )}
      </State>
    </section>
  );
}
