import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
export const API =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://medbridge-hwbz.onrender.com"
    : "http://127.0.0.1:8001");
export async function request(path, token, options = {}) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort("timeout"), 30000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token)
        window.dispatchEvent(new Event("session-expired"));
      const detail = data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
                .map(
                  (item) =>
                    `${item.loc?.at(-1)?.replaceAll("_", " ") || "Input"}: ${item.msg.replace(/^Value error, /, "")}`,
                )
                .join(". ")
            : "The request could not be completed. Please try again.";
      throw Object.assign(new Error(message), { status: response.status });
    }
    return data;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted)
      throw new Error(
        "The service is taking longer than expected. Please retry. Your input has been kept.",
        { cause: error },
      );
    if (error instanceof TypeError)
      throw new Error(
        "Cannot connect to MedBridge. Check your connection and retry.",
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
export function useRemote(path, token) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [result, setResult] = useState({
    key: null,
    data: null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    if (!path || !token) return;
    const controller = new AbortController();
    request(path, token, { signal: controller.signal })
      .then((data) => setResult({ key, data, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ key, data: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [path, token, key]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return {
    ...(result.key === key
      ? result
      : { data: null, loading: Boolean(path), error: "" }),
    reload,
  };
}
const subscribeRoute = (callback) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export function useRoute() {
  return useSyncExternalStore(subscribeRoute, () => window.location.pathname);
}
export function navigate(path, replace = false) {
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function dateText(value, withTime = false) {
  if (!value) return "Not recorded";
  const parsed = new Date(
    value.length === 10
      ? `${value}T12:00:00`
      : /Z$|[+-]\d{2}:\d{2}$/.test(value)
        ? value
        : `${value}Z`,
  );
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(
        undefined,
        withTime
          ? { dateStyle: "medium", timeStyle: "short" }
          : { dateStyle: "medium" },
      ).format(parsed);
}
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const categories = [
  ["allergies", "Allergies"],
  ["medications", "Medication details"],
  ["conditions", "Conditions"],
  ["prescriptions", "Prescriptions"],
  ["observations", "Test results"],
  ["encounters", "Visits"],
];
export function consentState(consent) {
  return !consent
    ? "No grant"
    : consent.status === "active" &&
        consent.expires_at &&
        new Date(`${consent.expires_at.replace(/Z$/, "")}Z`) <= new Date()
      ? "Expired"
      : consent.status[0].toUpperCase() + consent.status.slice(1);
}
export function isCurrent(item) {
  return (
    item.status === "active" &&
    (!item.ended_on || item.ended_on >= new Date().toISOString().slice(0, 10))
  );
}

export function bloodSourceText(source) {
  return source === "patient_reported"
    ? "Patient reported. Clinical verification not recorded."
    : source === "clinician_recorded"
      ? "Clinician entered. Clinical verification not recorded."
      : "Source and clinical verification not recorded.";
}
