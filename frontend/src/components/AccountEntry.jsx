import { useEffect, useState } from "react";
import { navigate, request } from "../lib";
import { Field, Link, Notice, PasswordField } from "./UI";

const titles = {
  "sign-in": "Sign in",
  "sign-up": "Create an account",
  "forgot-username": "Recover your sign-in details",
  "forgot-password": "Reset your password",
  "reset-password": "Set a new password",
  "verify-email": "Verify your email",
  "verify-code": "Enter your verification code",
  "resend-verification": "Request a verification email",
};
export default function AccountEntry({ route, onLogin, message }) {
  const [, portal, path] = route.split("/");
  const selected = ["doctor", "patient"].includes(portal);
  const mode = titles[path] ? path : "sign-in";
  const doctor = portal === "doctor";
  const prefix = `/${portal}`;
  const storageKey = `medbridge_verification_${portal}`;
  const [verification, setVerification] = useState(() => {
    try {
      const linkChallenge = new URLSearchParams(window.location.search).get(
        "challenge",
      );
      return linkChallenge
        ? { challenge: linkChallenge, resendAt: Date.now() + 90000 }
        : JSON.parse(sessionStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  });
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const query = new URLSearchParams(window.location.search);
  const token = query.get("token") || "";
  const challenge = verification.challenge || query.get("challenge");
  const remaining = Math.max(
    0,
    Math.ceil(((verification.resendAt || 0) - now) / 1000),
  );
  const signup = mode === "sign-up";
  const password = mode === "sign-in" || signup || mode === "reset-password";
  const recovery = [
    "forgot-username",
    "forgot-password",
    "resend-verification",
  ].includes(mode);
  useEffect(() => {
    if (mode !== "verify-code") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (mode !== "verify-code" || !challenge) return;
    const controller = new AbortController();
    request(`/auth/${portal}/verification/status`, null, {
      method: "POST",
      body: JSON.stringify({ challenge }),
      signal: controller.signal,
    })
      .then((result) =>
        setVerification((previous) => ({
          ...previous,
          resendAt: Date.now() + result.resend_after * 1000,
        })),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [mode, portal, challenge]);
  function remember(result, email) {
    const next = {
      challenge: result.challenge || challenge,
      email,
      resendAt: Date.now() + (result.resend_after || 90) * 1000,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(next));
    setVerification(next);
    if (mode === "verify-code")
      window.history.replaceState({}, "", window.location.pathname);
    setNow(Date.now());
  }
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
          full_name: `${values.first_name.trim()} ${values.last_name.trim()}`,
          email: values.email.trim().toLowerCase(),
          password: values.password,
          ...(doctor
            ? {
                organization: values.organization.trim(),
                registration_number: values.registration_number.trim(),
              }
            : { date_of_birth: values.date_of_birth }),
        };
      } else if (mode === "verify-code") {
        if (!challenge)
          throw new Error("Request a verification email to get a new code.");
        endpoint = "verify-code";
        body = { challenge, code: values.code.replace(/[\s-]/g, "") };
      } else if (recovery) {
        endpoint =
          mode === "resend-verification"
            ? "verification/request"
            : `recover/${mode === "forgot-username" ? "username" : "password"}`;
        body = { email: values.email.trim().toLowerCase() };
      } else {
        if (!token)
          throw new Error(
            "Open the link from your email or request a new email.",
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
      } else if (signup || mode === "resend-verification") {
        remember(result, body.email);
        navigate(`${prefix}/verify-code`);
      } else {
        setSuccess(result.message);
        setValues({ ...values, password: "" });
        if (["verify-code", "verify-email"].includes(mode))
          sessionStorage.removeItem(storageKey);
        if (["verify-email", "reset-password", "verify-code"].includes(mode))
          window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (failure) {
      if (
        mode === "sign-in" &&
        failure.status === 403 &&
        failure.message.startsWith("Verify your email")
      ) {
        navigate(
          `${prefix}/${verification.challenge && verification.email?.toLowerCase() === values.identifier.trim().toLowerCase() ? "verify-code" : "resend-verification"}`,
        );
      } else setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      const result = await request(
        `/auth/${portal}/verification/resend`,
        null,
        { method: "POST", body: JSON.stringify({ challenge }) },
      );
      remember(result, verification.email);
      setSuccess("");
      setValues({ ...values, code: "" });
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
              {[
                [
                  "doctor",
                  "Doctor",
                  "Find patients and review their clinical records.",
                ],
                [
                  "patient",
                  "Patient",
                  "Review your history and manage record sharing.",
                ],
              ].map(([key, label, description]) => (
                <article key={key}>
                  <h2>{label} portal</h2>
                  <p>{description}</p>
                  <div className="portal-choice-actions">
                    <Link
                      className="button primary"
                      to={`/${key}/sign-in`}
                      aria-label={`${label} portal sign in`}
                    >
                      Sign in
                    </Link>
                    <Link
                      className="button secondary"
                      to={`/${key}/sign-up`}
                      aria-label={`Sign up for the ${key} portal`}
                    >
                      Sign up
                    </Link>
                  </div>
                  {key === "doctor" && (
                    <small>Administrator approval required.</small>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <Link className="account-back" to="/">
              ← Choose another portal
            </Link>
            <p className="eyebrow">
              {doctor ? "Doctor portal" : "Patient portal"}
            </p>
            <h1>{titles[mode]}</h1>
            <p>
              {signup
                ? doctor
                  ? "Create your account, verify your email, then wait for administrator approval."
                  : "Create your account and verify your email. Your provider can then connect your records after checking your identity."
                : recovery
                  ? "Enter your email address. Instructions are sent only to that address if an account matches."
                  : mode === "sign-in"
                    ? "Welcome back. Enter your account details."
                    : mode === "verify-code"
                      ? `Enter the 6-digit code sent to ${verification.email || "your email address"}. It expires in 10 minutes.`
                      : mode === "verify-email"
                        ? "Confirm your email to continue your registration."
                        : "Choose a password of at least 12 characters. Previous sessions will be signed out."}
            </p>
            <Notice>{message}</Notice>
            <Notice>{success}</Notice>
            {!success && (
              <form onSubmit={submit} aria-busy={busy}>
                {signup && (
                  <div className="name-fields">
                    {field("first_name", "First name", {
                      autoComplete: "given-name",
                      maxLength: 100,
                    })}
                    {field("last_name", "Last name", {
                      autoComplete: "family-name",
                      maxLength: 99,
                    })}
                  </div>
                )}
                {mode === "sign-in" &&
                  field("identifier", "Email or username", {
                    autoComplete: "username",
                    maxLength: 255,
                  })}
                {(signup || recovery) &&
                  field("email", "Email address", {
                    type: "email",
                    autoComplete: "email",
                    maxLength: 255,
                  })}
                {signup &&
                  (doctor ? (
                    <>
                      {field("organization", "Hospital or organization", {
                        maxLength: 200,
                      })}
                      {field(
                        "registration_number",
                        "Medical registration number",
                        {
                          maxLength: 100,
                          hint: "Your administrator will check your professional credentials.",
                        },
                      )}
                    </>
                  ) : (
                    field("date_of_birth", "Date of birth", {
                      type: "date",
                      max: new Date().toISOString().slice(0, 10),
                    })
                  ))}
                {password && (
                  <div>
                    <PasswordField
                      required
                      value={values.password || ""}
                      onChange={(event) =>
                        setValues({ ...values, password: event.target.value })
                      }
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      minLength={mode === "sign-in" ? 1 : 12}
                      maxLength={128}
                      hint={
                        mode === "sign-in"
                          ? undefined
                          : "At least 12 characters. You can paste a password from a password manager."
                      }
                    />
                    {mode === "sign-in" && (
                      <Link
                        className="password-recovery"
                        to={`${prefix}/forgot-password`}
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                )}
                {mode === "verify-code" &&
                  field("code", "Verification code", {
                    inputMode: "numeric",
                    autoComplete: "one-time-code",
                    maxLength: 11,
                    pattern: "[0-9\\s-]{6,11}",
                    hint: "6 digits. You can paste the code including spaces.",
                  })}
                <Notice error>{error}</Notice>
                <button
                  className="primary full"
                  disabled={busy || (mode === "verify-code" && !challenge)}
                >
                  {busy
                    ? "Please wait…"
                    : mode === "sign-in"
                      ? "Sign in"
                      : signup
                        ? "Create account"
                        : mode === "verify-code"
                          ? "Verify email"
                          : mode === "resend-verification"
                            ? "Send verification email"
                            : recovery
                              ? "Send recovery email"
                              : mode === "verify-email"
                                ? "Verify email"
                                : "Save new password"}
                </button>
                {mode === "verify-code" && (
                  <div className="verification-resend">
                    <button
                      type="button"
                      disabled={busy || remaining > 0 || !challenge}
                      onClick={resend}
                    >
                      Resend verification email
                    </button>
                    <p className="help" aria-live="off">
                      {remaining > 0
                        ? `Resend available in ${remaining} seconds`
                        : "You can request another code now."}
                    </p>
                  </div>
                )}
              </form>
            )}
            <div className="account-links">
              {mode === "sign-in" ? (
                <>
                  <div className="signup-prompt">
                    <span>New to MedBridge?</span>
                    <Link className="button secondary" to={`${prefix}/sign-up`}>
                      Create an account
                    </Link>
                  </div>
                  <Link to={`${prefix}/forgot-username`}>Forgot username?</Link>
                  <Link to={`${prefix}/resend-verification`}>
                    Need to verify your email?
                  </Link>
                </>
              ) : (
                <Link
                  className={success ? "button primary" : "account-back"}
                  to={`${prefix}/sign-in`}
                >
                  Return to sign in
                </Link>
              )}
              {mode === "verify-code" && !success && (
                <Link to={`${prefix}/resend-verification`}>
                  Use a different email or request a new code
                </Link>
              )}
              {mode === "reset-password" && (
                <Link to={`${prefix}/forgot-password`}>
                  Request a new reset link
                </Link>
              )}
              {signup && error && (
                <Link to={`${prefix}/resend-verification`}>
                  Request a verification email
                </Link>
              )}
            </div>
            {(recovery || error || mode === "verify-code") && (
              <details className="recovery-help">
                <summary>Can’t access your email or need help?</summary>
                <p>
                  Check your spam folder and confirm you are using the correct
                  portal. Contact your organization’s MedBridge administrator if
                  you cannot access your email.
                </p>
                <p>
                  Email verification confirms access to your inbox. Doctor
                  accounts also need administrator approval before patient
                  records are available.
                </p>
              </details>
            )}
          </>
        )}
      </section>
    </main>
  );
}
