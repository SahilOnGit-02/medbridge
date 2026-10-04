# Authentication and account lifecycle

Source: `app/api/accounts.py`, `app/api/deps.py`, `app/core/jwt.py`, `app/services/account_mail.py`.

## Portal boundaries

`POST /auth/{portal}/login` accepts `identifier` and `password`. The portal is `doctor` or `patient`. Identifiers are trimmed and compared without case sensitivity. Patient login accepts patient accounts only. Doctor login accepts doctor, hospital_admin and system_admin accounts. The shared `/auth/login` endpoint is absent.

## Registration

Both signup endpoints require full name, a unique email and a password of at least 12 characters. The interface collects first and last name separately and combines them for the existing full-name field. Username is optional for API compatibility and is not requested on either signup screen. Existing usernames still work at sign-in and in recovery. Patient signup additionally requires DOB and creates a new, empty, unverified clinical profile. It never claims another person's record by matching email or DOB.

Doctor signup requires registration number and organization. New accounts start inactive with `pending_email`. Verification changes the doctor state to `pending_approval`; only a hospital or system administrator can approve and assign a permitted hospital. A doctor cannot approve their own registration or bypass approval through password reset.

## Verification and recovery

`POST /auth/{portal}/recover/{kind}` supports username, password and verification. The default registration flow uses a six-digit email code on a separate screen. Codes expire after 10 minutes, are limited to five attempts, and are bound to a high-entropy challenge and portal. Digests use an HMAC with the configured secret. Verification resends require 90 seconds on the server as well as the interface. The status endpoint returns the remaining wait for links opened from email or a refreshed page. Resending supersedes outstanding codes and verification links. Verification links remain supported for email and older clients and expire after 24 hours; reset links expire after 30 minutes. Completing either verification path consumes both outstanding codes and links. Existing active accounts continue signing in directly. Tokens are random, stored as SHA-256 digests, bound to portal and purpose, and consumed once. Successful password reset increments `auth_version`, invalidating existing sessions and outstanding reset links.

Recovery returns a generic 202 response for matching and unknown accounts. Signup duplicate handling also avoids confirming which email/username already exists. Throttles are persisted in the database. Exact request/response schemas are in the [API reference](API-DOCUMENTATION.md).

## Delivery and failures

`ACCOUNT_MAIL_MODE` selects disabled, capture or smtp. Capture requires development and a loopback frontend origin; it writes private JSON messages and sends no external email. SMTP uses STARTTLS or implicit TLS with certificate/hostname verification and optional paired username/password authentication. Existing SMTP_FROM_EMAIL and SMTP_FROM_NAME settings remain supported. If SMTP_SECURITY is omitted, port 465 uses implicit TLS and other ports use STARTTLS. Production links require a non-loopback HTTPS origin without credentials, path, query or fragment.

User/token state commits before sending. A failed signup email returns 503, keeps the pending registration and instructs the user to resend verification. Recovery delivery failures are logged without recipient, token, password or provider error content, while retaining the same generic response. There is no automatic delivery retry; use resend and inspect service logs. Real inbox delivery remains pending provider configuration.

## Doctor-created patients and editing

The Home action submits a new profile form to `POST /patients/enroll`. It requires an assigned doctor/hospital administrator and confirmation of the organization's identity check. It creates a fresh patient, hospital mapping and inactive account, then sends email verification instructions. It never claims existing records and never creates a clinical sharing grant. The patient controls subsequent sharing. System administrators without this enrollment role use the existing administrative workflows.

Doctors can patch blood group, contact phone, address and emergency contacts, and upload a profile photo. Doctor attempts to change name, DOB, gender or contact email are rejected by the API. Patient and administrator identity editing remains available. Account email, password, user linkage and role are never editable through the profile schema.

The older `/{medbridge_id}/create-account` API remains an explicit manual credential workflow for an existing identity-verified patient. The new Home form uses `/enroll`, not this legacy endpoint.
