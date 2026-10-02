import { useState } from "react";
import { request } from "../lib";
import { Field, Link, Notice } from "./UI";

const titles = {
  "sign-in": "Sign in",
  "sign-up": "Create an account",
  "forgot-username": "Forgot username",
  "forgot-password": "Forgot password",
  "reset-password": "Set a new password",
  "verify-email": "Verify your email",
  "resend-verification": "Resend verification email",
};
export default function AccountEntry({ route, onLogin, message }) {
  const [, portal, path] = route.split("/");
  const selected = ["doctor", "patient"].includes(portal);
  const mode = titles[path] ? path : "sign-in";
  const doctor = portal === "doctor";
  const [values, setValues] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const prefix = `/${portal}`;
  const signup = mode === "sign-up";
  const password = mode === "sign-in" || signup || mode === "reset-password";
  const recovery = [
    "forgot-username",
    "forgot-password",
    "resend-verification",
  ].includes(mode);
  function field(key, label, props = {}) {
    return (
      <Field
        label={label}
        required
        value={values[key] || ""}
        onChange={(event) =>
          setValues({ ...values, [key]: event.target.value })
        }
        {...props}
      />
    );
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (signup || mode === "reset-password") {
        if (values.password !== values.confirm)
          throw new Error(
            "Passwords do not match. Check both password fields.",
          );
      }
      let endpoint, body;
      if (mode === "sign-in") {
        endpoint = "login";
        body = {
          identifier: values.identifier.trim(),
          password: values.password,
        };
      } else if (signup) {
        endpoint = "signup";
        body = {
          full_name: values.full_name.trim(),
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          ...(doctor
            ? {
                organization: values.organization.trim(),
                registration_number: values.registration_number.trim(),
              }
            : { date_of_birth: values.date_of_birth }),
        };
      } else if (recovery) {
        endpoint = `recover/${mode === "forgot-username" ? "username" : mode === "forgot-password" ? "password" : "verification"}`;
        body = { email: values.email.trim().toLowerCase() };
      } else {
        if (!token)
          throw new Error(
            "Open the link from your email. If it is missing or expired, request a new email below.",
          );
        endpoint = mode;
        body = {
          token,
          ...(mode === "reset-password" ? { password: values.password } : {}),
        };
      }
      const result = await request(`/auth/${portal}/${endpoint}`, null, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (mode === "sign-in") {
        const user = await request("/auth/me", result.access_token);
        onLogin(result.access_token, user);
      } else {
        setSuccess(result.message);
        setValues({ ...values, password: "", confirm: "" });
        if (["verify-email", "reset-password"].includes(mode))
          window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="account-entry">
      <a className="skip-link" href="#account-content">
        Skip to portal access
      </a>
      <section className="account-visual" aria-label="MedBridge">
        <img src="/images/account-care.png" alt="" />
        <div className="account-visual-copy">
          <Link className="brand" to="/">
            + MedBridge
          </Link>
          <h2>Care starts with a clear connection.</h2>
          <p>Patient information, in the right hands.</p>
        </div>
      </section>
      <section id="account-content" tabIndex={-1} className="account-content">
        {!selected ? (
          <>
            <p className="eyebrow">Welcome to MedBridge</p>
            <h1>Choose your portal</h1>
            <p>Enter the space for your account.</p>
            <Notice>{message}</Notice>
            <div className="portal-options">
              <article>
                <h2>Doctor portal</h2>
                <p>Find patients and review their clinical records.</p>
                <Link className="button primary full" to="/doctor/sign-in">
                  Doctor sign in
                </Link>
                <Link to="/doctor/sign-up">Sign up as a doctor</Link>
                <small>Administrator approval required.</small>
              </article>
              <article>
                <h2>Patient portal</h2>
                <p>Review your history and manage record sharing.</p>
                <Link className="button primary full" to="/patient/sign-in">
                  Patient sign in
                </Link>
                <Link to="/patient/sign-up">Sign up as a patient</Link>
              </article>
            </div>
          </>
        ) : (
          <>
            <Link to="/">← Choose another portal</Link>
            <p className="eyebrow">
              {doctor ? "Doctor portal" : "Patient portal"}
            </p>
            <h1>{titles[mode]}</h1>
            {signup ? (
              <p>
                {doctor
                  ? "Verify your email, then wait for administrator approval before accessing patient records."
                  : "Verify your email to open an empty patient profile. Ask your provider to verify your identity and connect existing records."}
              </p>
            ) : recovery ? (
              <p>
                Enter your registered email. Recovery instructions stay private
                and are sent only to that address.
              </p>
            ) : mode === "sign-in" ? (
              <p>
                Use your {doctor ? "doctor" : "patient"} account email or
                username.
              </p>
            ) : mode === "verify-email" ? (
              <p>Confirm the email link to continue your registration.</p>
            ) : (
              <p>
                Choose a password of at least 12 characters. Your previous
                sessions will be signed out.
              </p>
            )}
            <Notice>{message}</Notice>
            <Notice>{success}</Notice>
            {!success && (
              <form onSubmit={submit} aria-busy={busy}>
                {signup && (
                  <>
                    {field("full_name", "Full name", {
                      autoComplete: "name",
                      maxLength: 200,
                    })}
                    {field("username", "Username", {
                      autoComplete: "username",
                      minLength: 3,
                      maxLength: 60,
                      pattern: "[A-Za-z0-9._-]+",
                      hint: "3 to 60 letters, numbers, dots, underscores or hyphens.",
                    })}
                  </>
                )}
                {mode === "sign-in" &&
                  field("identifier", "Email or username", {
                    autoComplete: "username",
                    maxLength: 255,
                  })}
                {(signup || recovery) &&
                  field("email", "Registered email address", {
                    type: "email",
                    autoComplete: "email",
                    maxLength: 255,
                  })}
                {signup &&
                  (doctor ? (
                    <>
                      {field("organization", "Hospital or organization", {
                        maxLength: 200,
                        hint: "Your administrator will verify your organization and assign access.",
                      })}
                      {field(
                        "registration_number",
                        "Medical registration number",
                        { maxLength: 100 },
                      )}
                    </>
                  ) : (
                    field("date_of_birth", "Date of birth", {
                      type: "date",
                      max: new Date().toISOString().slice(0, 10),
                    })
                  ))}
                {password && (
                  <>
                    {field("password", "Password", {
                      type: show ? "text" : "password",
                      autoComplete:
                        mode === "sign-in"
                          ? "current-password"
                          : "new-password",
                      minLength: mode === "sign-in" ? 1 : 12,
                      maxLength: 128,
                      hint:
                        mode === "sign-in"
                          ? undefined
                          : "At least 12 characters. You can paste a password from a password manager.",
                    })}
                    {mode !== "sign-in" &&
                      field("confirm", "Confirm password", {
                        type: show ? "text" : "password",
                        autoComplete: "new-password",
                        minLength: 12,
                        maxLength: 128,
                      })}
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={show}
                        onChange={(event) => setShow(event.target.checked)}
                      />{" "}
                      Show password
                    </label>
                  </>
                )}
                <Notice error>{error}</Notice>
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "sign-in"
                      ? `Sign in to ${doctor ? "doctor" : "patient"} portal`
                      : signup
                        ? "Create account"
                        : recovery
                          ? "Send recovery email"
                          : mode === "verify-email"
                            ? "Verify email"
                            : "Save new password"}
                </button>
              </form>
            )}
            <div className="account-links">
              {mode === "sign-in" ? (
                <>
                  <Link to={`${prefix}/sign-up`}>Create an account</Link>
                  <div>
                    <Link to={`${prefix}/forgot-username`}>
                      Forgot username?
                    </Link>
                    <Link to={`${prefix}/forgot-password`}>
                      Forgot password?
                    </Link>
                  </div>
                  <Link to={`${prefix}/resend-verification`}>
                    Resend verification email
                  </Link>
                </>
              ) : (
                <Link
                  className={success ? "button primary" : undefined}
                  to={`${prefix}/sign-in`}
                >
                  Return to sign in
                </Link>
              )}
              {mode === "reset-password" && (
                <Link to={`${prefix}/forgot-password`}>
                  Request a new reset link
                </Link>
              )}
              {(mode === "verify-email" || signup) && (
                <Link to={`${prefix}/resend-verification`}>
                  Request a new verification email
                </Link>
              )}
            </div>
            {(recovery || error) && (
              <details className="recovery-help">
                <summary>Can’t access your email or still need help?</summary>
                <p>
                  Contact your organization’s MedBridge administrator to verify
                  your identity. Email addresses and usernames cannot be
                  revealed using a name or date of birth alone.
                </p>
                <p>
                  Use the portal for your account. Check spam folders. Reset
                  links expire after 30 minutes and work once; verification
                  links expire after 24 hours. Doctor email verification still
                  requires administrator approval.
                </p>
              </details>
            )}
            {import.meta.env.DEV && mode !== "sign-in" && (
              <p className="help">
                Local testing: messages are captured in the developer mailbox.
                No email is sent to an external inbox.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
