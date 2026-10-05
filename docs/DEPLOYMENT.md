# Deployment and release checklist

This is a release runbook, not evidence of a completed deployment. Provider details and final frontend/backend URLs remain pending user input. The branch must not be represented as production-ready until the staging and release checks below pass.

## Sequence

Sync merged source > fixes and regression > email integration > staging verification > finalize documentation > release and smoke test > demo video > submit.

## Before staging

- Back up the target database and confirm the repository, branch and target environment.
- Apply `alembic upgrade head`. The merged migration head is `ab7a1d786a22`, joining portal/account and Medical Reports migrations. This branch adds no further schema migration.
- Configure backend database/JWT secrets privately and the exact `CORS_ORIGINS` frontend origin.
- Choose and verify a sender with an SMTP provider. Configure TLS delivery and `PUBLIC_APP_URL` for the staging frontend.
- Build the frontend with the staging `VITE_API_BASE_URL`. Deploy backend, migration and frontend changes together because the shared login endpoint is absent.
- Run `python -m scripts.check_release_config` from backend/. This checks configuration only and sends no email.
- Run the backend suite, frontend lint/build, generated-reference check and tracked-file secret check.

## Staging acceptance

- Patient signup > real inbox email > verification > patient login and empty profile.
- Doctor signup > verification > pending approval > authorized hospital assignment > doctor login. Resetting a password before approval must not activate the doctor.
- Username recovery and password reset > real email > correct portal link > single-use consumption. Previous sessions must fail after reset.
- Expired/used/wrong-portal links, resend, incorrect credentials and delivery failure show actionable feedback without exposing account existence.
- Report-only grant works; disabling/revoking/expiring report sharing blocks lists and previously listed file requests. Other permitted categories continue to work.
- Exercise both portals, mobile layouts and keyboard navigation using fresh sessions.

## Release and rollback

Freeze the tested code and update verification evidence. Record frontend/backend release versions and the database migration head. Deploy only after staging acceptance, then repeat health, login, sharing and report-download smoke checks against the final URLs.

Keep a verified database backup and the previous application release. Do not blindly downgrade schema or restore a backup over newer writes. Plan any rollback with the database owner. Neither production deployment nor rollback has been performed in this branch.

The existing backend Dockerfile applies migrations and starts Uvicorn on PORT (default 8000). The backend default is now 8000, matching the existing Compose port mapping. Persist report storage and uploads. Monitoring, backups, report upload/storage operations, delivery retries and formal security review remain separate release work.
