import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Field, Notice } from "./UI";

GlobalWorkerOptions.workerSrc = workerUrl;

function Page({ document, number, width, zoom, title }) {
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let renderTask;
    document
      .getPage(number)
      .then(async (page) => {
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: (width / base.width) * zoom,
        });
        const outputScale = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(16000000 / (viewport.width * viewport.height)),
        );
        const target = canvas.current;
        target.width = Math.ceil(viewport.width * outputScale);
        target.height = Math.ceil(viewport.height * outputScale);
        target.style.width = `${Math.floor(viewport.width)}px`;
        target.style.height = `${Math.floor(viewport.height)}px`;
        renderTask = page.render({
          canvasContext: target.getContext("2d"),
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
        if (cancelled) return;
        setReady(true);
        const content = await page.getTextContent();
        if (!cancelled)
          setText(
            content.items
              .map((item) => (item.str || "") + (item.hasEOL ? "\n" : " "))
              .join(""),
          );
      })
      .catch((failure) => {
        if (!cancelled)
          setError(failure.message || "This page could not be displayed.");
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, number, width, zoom]);
  return (
    <>
      <Notice error>
        {error &&
          "This page could not be displayed. Use Open in new tab or Save a copy."}
      </Notice>
      {!ready && !error && <p role="status">Rendering page…</p>}
      <div
        className="pdf-page-viewport"
        role="region"
        aria-label="Report page, scroll to read zoomed content"
        tabIndex={0}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${title}, page ${number}. The page text is available below.`}
        />
      </div>
      {text && (
        <details className="pdf-page-text">
          <summary>Read page text</summary>
          <p className="help">
            Extracted from this page. Formatting may differ from the original.
          </p>
          <p>{text}</p>
        </details>
      )}
    </>
  );
}
export default function ReportPreview({ url, title }) {
  const container = useRef(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(240);
  const [number, setNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const task = getDocument({ url, isEvalSupported: false });
    let cancelled = false;
    task.promise
      .then((value) => {
        if (!cancelled) setDocument(value);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "This PDF could not be displayed. Use Open in new tab or Save a copy.",
          );
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(100, Math.floor(entry.contentRect.width))),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="report-preview" ref={container}>
      <Notice error>{error}</Notice>
      {!document && !error && <p role="status">Loading document viewer…</p>}
      {document && (
        <>
          <div className="pdf-controls">
            <p role="status">
              Page {number} of {document.numPages}
            </p>
            <Field label="Zoom">
              {(id) => (
                <select
                  id={id}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                >
                  <option value={1}>Fit width</option>
                  <option value={2}>200%</option>
                  <option value={3}>300%</option>
                  <option value={4}>400%</option>
                </select>
              )}
            </Field>
            {document.numPages > 1 && (
              <div className="actions">
                <button
                  disabled={number === 1}
                  onClick={() => setNumber(number - 1)}
                >
                  Previous page
                </button>
                <button
                  disabled={number === document.numPages}
                  onClick={() => setNumber(number + 1)}
                >
                  Next page
                </button>
              </div>
            )}
          </div>
          <Page
            key={`${number}-${width}-${zoom}`}
            document={document}
            number={number}
            width={width}
            zoom={zoom}
            title={title}
          />
        </>
      )}
    </div>
  );
}
