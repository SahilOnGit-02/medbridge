# Authentication and account lifecycle

Source: `app/api/accounts.py`, `app/api/deps.py`, `app/core/jwt.py`, `app/services/account_mail.py`.

## Portal boundaries

`POST /auth/{portal}/login` accepts `identifier` and `password`. The portal is `doctor` or `patient`. Identifiers are trimmed and compared without case sensitivity. Patient login accepts patient accounts only. Doctor login accepts doctor, hospital_admin and system_admin accounts. The shared `/auth/login` endpoint is absent.

## Registration

Both signup endpoints require full name, unique email/username and a password of at least 12 characters. Patient signup additionally requires DOB and creates a new, empty, unverified clinical profile. It never claims another person's record by matching email or DOB.

Doctor signup requires registration number and organization. New accounts start inactive with `pending_email`. Verification changes the doctor state to `pending_approval`; only a hospital or system administrator can approve and assign a permitted hospital. A doctor cannot approve their own registration or bypass approval through password reset.

## Verification and recovery

`POST /auth/{portal}/recover/{kind}` supports username, password and verification. Verification links expire after 24 hours; reset links after 30 minutes. Tokens are random, stored as SHA-256 digests, bound to portal and purpose, and consumed once. Successful password reset increments `auth_version`, invalidating existing sessions and outstanding reset links.

Recovery returns a generic 202 response for matching and unknown accounts. Signup duplicate handling also avoids confirming which email/username already exists. Throttles are persisted in the database. Exact request/response schemas are in the [API reference](API-DOCUMENTATION.md).

## Delivery and failures

`ACCOUNT_MAIL_MODE` selects disabled, capture or smtp. Capture requires development and a loopback frontend origin; it writes private JSON messages and sends no external email. SMTP uses STARTTLS or implicit TLS with certificate/hostname verification and optional paired username/password authentication. Production links require a non-loopback HTTPS origin without credentials, path, query or fragment.

User/token state commits before sending. A failed signup email returns 503, keeps the pending registration and instructs the user to resend verification. Recovery delivery failures are logged without recipient, token, password or provider error content, while retaining the same generic response. There is no automatic delivery retry; use resend and inspect service logs. Real inbox delivery remains pending provider configuration.
