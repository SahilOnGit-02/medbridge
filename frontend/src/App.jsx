import { useEffect, useState } from "react";
import { navigate, request, useRoute } from "./lib";
import { Field, Link, Notice, State } from "./components/UI";
import DoctorWorkspace from "./components/DoctorWorkspace";
import PatientPortal from "./components/PatientPortal";
import "./App.css";
function SignIn({ onLogin, message }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await request("/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const user = await request("/auth/me", token.access_token);
      onLogin(token.access_token, user);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>{" "}
          MedBridge
        </div>
        <p className="eyebrow">Connected care, clear information</p>
        <h1>
          Your health records.
          <br />
          One place to begin.
        </h1>
        <p>
          Find patient information, review your own records, and manage how you
          share them.
        </p>
        <div className="login-note">
          Doctor and patient accounts use the same secure sign-in.
        </div>
      </section>
      <section className="login-card" aria-labelledby="signin-heading">
        <p className="eyebrow">Welcome back</p>
        <h2 id="signin-heading">Sign in to MedBridge</h2>
        <p>Use the email associated with your account.</p>
        <Notice>{message}</Notice>
        <form onSubmit={submit} aria-busy={busy}>
          <Field
            label="Email address"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint="Spaces around your email are removed automatically."
          />
          <Field
            label="Password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={error ? "login-error" : undefined}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={show}
              onChange={(event) => setShow(event.target.checked)}
            />{" "}
            Show password
          </label>
          {error && (
            <p className="notice error" id="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {busy && (
            <p role="status" className="help">
              Connecting to your account. You will enter the portal assigned to
              your role.
            </p>
          )}
        </form>
        <p className="help">
          Need an account or password help? Contact your MedBridge
          administrator.
        </p>
      </section>
    </main>
  );
}
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
    navigate("/sign-in", true);
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
      emergency: "Emergency profile",
      sharing: "Sharing",
      history: "Access history",
    };
    document.title = user
      ? `MedBridge | ${patientRole ? pageNames[route.split("/")[2]] || "My health" : route === "/patients" ? "Find a patient" : "Patient record"}`
      : "MedBridge | Sign in";
    document.querySelector("#main")?.focus({ preventScroll: true });
  }, [route, user, patientRole]);
  if (!token)
    return (
      <SignIn
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
        ["Emergency profile", "/my-health/emergency"],
        ["Sharing", "/my-health/sharing"],
        ["Access history", "/my-health/history"],
      ]
    : [["Patients", "/patients"]];
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
            <small>{patientRole ? "Patient portal" : "Clinical portal"}</small>
          </span>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
      </header>
      <nav className="primary-nav" aria-label="Primary">
        {nav.map(([label, path]) => (
          <Link
            key={path}
            to={path}
            aria-current={
              route === path || (!patientRole && route.startsWith("/patients/"))
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <main id="main" tabIndex={-1} className="workspace">
        {patientRole ? (
          <PatientPortal token={token} route={route} />
        ) : (
          <DoctorWorkspace token={token} route={route} user={user} />
        )}
      </main>
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
