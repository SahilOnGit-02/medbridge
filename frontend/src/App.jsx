import { useEffect, useState } from "react";
import { navigate, request, useRoute } from "./lib";
import { Link, State } from "./components/UI";
import DoctorWorkspace from "./components/DoctorWorkspace";
import PatientPortal from "./components/PatientPortal";
import AccountEntry from "./components/AccountEntry";
import "./App.css";
export default function App() {
  const route = useRoute();
  const [token, setToken] = useState(
    () =>
      localStorage.getItem("medbridge_access_token") ||
      localStorage.getItem("accessToken") ||
      "",
  );
  const [session, setSession] = useState({
    loading: Boolean(token),
    user: null,
    error: "",
  });
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  function signOut(reason = "") {
    localStorage.removeItem("medbridge_access_token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("medbridge_emergency_id");
    setToken("");
    setSession({ loading: false, user: null, error: "" });
    setMessage(reason);
    navigate(
      session.user?.role === "patient"
        ? "/patient/sign-in"
        : session.user
          ? "/doctor/sign-in"
          : "/",
      true,
    );
  }
  useEffect(() => {
    if (!token || session.user) return;
    const controller = new AbortController();
    request("/auth/me", token, { signal: controller.signal })
      .then((user) => setSession({ loading: false, user, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted && error.status !== 401)
          setSession({ loading: false, user: null, error: error.message });
      });
    return () => controller.abort();
  }, [token, retry, session.user]);
  useEffect(() => {
    const expired = () => {
      localStorage.removeItem("medbridge_access_token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("medbridge_emergency_id");
      setToken("");
      setSession({ loading: false, user: null, error: "" });
      setMessage("Your session has expired. Sign in again to continue.");
      navigate("/sign-in", true);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  const user = session.user;
  const patientRole = user?.role === "patient";
  const home = patientRole ? "/my-health/overview" : "/patients";
  useEffect(() => {
    if (
      user &&
      (route === "/" ||
        route === "/sign-in" ||
        (user.role === "patient"
          ? !route.startsWith("/my-health/")
          : !route.startsWith("/patients")))
    )
      navigate(
        user.role === "patient" ? "/my-health/overview" : "/patients",
        true,
      );
  }, [user, route]);
  useEffect(() => {
    const pageNames = {
      overview: "Overview",
      records: "Records",
      reports: "Medical reports",
      emergency: "Emergency profile",
      sharing: "Sharing",
      history: "Access history",
    };
    document.title = user
      ? `MedBridge | ${patientRole ? pageNames[route.split("/")[2]] || "Patient portal" : route === "/patients" ? "Home" : route === "/patients/recent" ? "Recently opened patients" : route === "/patients/directory" ? "Patient directory" : "Patient record"}`
      : "MedBridge | Portal access";
    document.querySelector("#main")?.focus({ preventScroll: true });
  }, [route, user, patientRole]);
  if (!token)
    return (
      <AccountEntry
        key={route}
        route={route}
        message={message}
        onLogin={(value, account) => {
          localStorage.setItem("medbridge_access_token", value);
          setToken(value);
          setSession({ loading: false, user: account, error: "" });
          navigate(
            account.role === "patient" ? "/my-health/overview" : "/patients",
            true,
          );
        }}
      />
    );
  if (!user)
    return (
      <main id="main" tabIndex={-1} className="session-state">
        <div className="brand">MedBridge</div>
        <State
          loading={session.loading}
          error={session.error}
          retry={() => {
            setSession({ loading: true, user: null, error: "" });
            setRetry((value) => value + 1);
          }}
        />
        <button onClick={() => signOut()}>Return to sign in</button>
      </main>
    );
  if (
    !["patient", "doctor", "hospital_admin", "system_admin"].includes(user.role)
  )
    return (
      <main className="session-state">
        <h1>Portal unavailable for this role</h1>
        <p>Contact your administrator for access.</p>
        <button onClick={() => signOut()}>Sign out</button>
      </main>
    );
  const nav = patientRole
    ? [
        ["Overview", "/my-health/overview"],
        ["Records", "/my-health/records"],
        ["Medical reports", "/my-health/reports"],
        ["Emergency profile", "/my-health/emergency"],
        ["Sharing", "/my-health/sharing"],
        ["Access history", "/my-health/history"],
      ]
    : [
        ["Home", "/patients"],
        ["Recently opened", "/patients/recent"],
        ["Patient directory", "/patients/directory"],
        ...(["hospital_admin", "system_admin"].includes(user.role)
          ? [["Doctor registrations", "/patients/registrations"]]
          : []),
      ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <Link className="brand" to={home}>
          <span className="brand-mark" aria-hidden="true">
            +
          </span>{" "}
          MedBridge
        </Link>
        <div className="account">
          <span>
            <strong>{user.full_name}</strong>
            <small>{patientRole ? "Patient portal" : "Doctor portal"}</small>
          </span>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
      </header>
      <div className="portal-shell">
        <aside className="portal-sidebar">
          <p className="eyebrow">
            {patientRole ? "Patient portal" : "Doctor portal"}
          </p>
          <nav className="primary-nav" aria-label="Primary">
            {nav.map(([label, path]) => (
              <Link
                key={path}
                to={path}
                aria-current={route === path ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          {!patientRole &&
            route.match(/^\/patients\/\d+(?:\/(records|reports))?$/) && (
              <nav className="record-nav" aria-label="Opened patient">
                <p className="eyebrow">Opened patient</p>
                {[
                  ["Patient overview", ""],
                  ["Record history", "/records"],
                  ["Medical reports", "/reports"],
                ].map(([label, suffix]) => {
                  const path = `/patients/${route.split("/")[2]}${suffix}`;
                  return (
                    <Link
                      key={path}
                      to={path}
                      aria-current={route === path ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            )}
        </aside>
        <main id="main" tabIndex={-1} className="workspace">
          {patientRole ? (
            <PatientPortal
              token={token}
              route={route}
              onProfileSaved={async () => {
                const updated = await request("/auth/me", token);
                setSession({ loading: false, user: updated, error: "" });
              }}
            />
          ) : (
            <DoctorWorkspace token={token} route={route} user={user} />
          )}
        </main>
      </div>
      <footer className="app-footer">
        MedBridge{" "}
        <span>
          Record availability depends on connected providers and sharing
          permissions.
        </span>
      </footer>
    </>
  );
}
