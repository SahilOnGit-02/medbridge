# Testing and evidence

Backend tests use isolated SQLite databases and synthetic data. They must never be pointed at the live/local demonstration database. From backend/:

```sh
DATABASE_URL=sqlite:// JWT_SECRET_KEY=isolated-test-secret python -m pytest -q --disable-warnings
python -m scripts.generate_reference --check
python -m scripts.check_repository_secrets
```

The last two commands require configured environment variables too. Run frontend `npm run lint` and `npm run build` from frontend/. GitHub Actions runs these checks on pull requests and main/codex branch pushes.

New report regressions cover ownership, hospital boundaries, scope creation/update/reactivation, reports-only grants, independent clinical scopes, expiry/revocation after listing, path confinement, auditing, emergency isolation and unique route/operation registration.

SMTP tests use a test double, not an external provider. They check verified TLS contexts, SMTP ordering/authentication/timeout, persisted tokens before send, patient and doctor lifecycle, administrator approval, single-use reset, failure privacy and invalid/incomplete configuration. They do not prove inbox delivery, sender reputation or DNS/domain verification.

Browser verification should follow UI > API > data > response using isolated fixtures where account/consent changes are needed. Record route, viewport, state and screenshot. A successful build is not a visual check, and an accessibility scan is not a full accessibility certification.

The final run results and remaining checks are recorded in [finalization verification](finalization/VERIFICATION.md). Existing deprecation warnings are reported separately from test failures. Staging/provider tests and final deployed smoke tests remain pending.
