# Environment setup

## Backend

Use Python 3.12. Create an environment, install `backend/requirements.txt`, and configure `backend/.env` privately using `.env.example`. Replace the JWT placeholder with a long random secret. Provide a PostgreSQL `DATABASE_URL`. From backend/:

```sh
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The application creates its uploads directory if missing. Use a writable, persistent uploads location for a hosted deployment. Database schema changes must come from migrations, not from tests or seed scripts.

## Frontend

Use Node 24 and the committed lockfile. Copy `frontend/.env.example` to `.env` for local development. From frontend/:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Set `VITE_API_BASE_URL` to the target backend before a hosted build. It is public build configuration, never a place for SMTP/JWT/database credentials. The code retains an existing hosted API fallback; explicit configuration is required to avoid unintentionally pointing a staging frontend at that backend.

## Account email

| Variable | Purpose |
|---|---|
| APP_ENV | development locally, production for release checks |
| PUBLIC_APP_URL | Frontend origin used for both verification and reset links |
| CORS_ORIGINS | JSON list of exact allowed frontend origins |
| ACCOUNT_MAIL_MODE | disabled, capture or smtp |
| ACCOUNT_MAILBOX_DIR | Private absolute directory for local capture |
| ACCOUNT_MAIL_FROM / SMTP_FROM_EMAIL | Provider-verified sender; the existing SMTP_FROM_EMAIL name remains supported |
| SMTP_FROM_NAME | Display name; defaults to MedBridge System |
| SMTP_HOST / SMTP_PORT | Provider hostname and port |
| SMTP_SECURITY | starttls or ssl; if omitted, port 465 uses ssl and other ports use starttls |
| SMTP_USERNAME / SMTP_PASSWORD | Configure both or neither, according to provider requirements |
| SMTP_TIMEOUT_SECONDS | Socket timeout, 1 to 30 seconds; default 10 |

SMTP credentials must come from private deployment settings. Capture requires a development loopback frontend and a directory outside public assets/uploads. Hosted origins must use HTTPS, with no subpath, credentials, query or fragment.

The existing workspace runtime uses a local pgserver fallback and an external private `.local` folder. Those machine-specific helpers are not a portable repository dependency and are not committed. Docker Compose is a legacy setup requiring the external `medbridge-phase2_default` network; its port and n8n assumptions must be checked before use.
