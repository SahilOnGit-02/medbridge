# Security boundaries and remaining review

Implemented protections include active-account checks, role-specific portal entry, hospital/patient authorization, consent scopes, expiring single-use recovery tokens, password-reset session invalidation, persistent throttles, private local capture, TLS SMTP, report path confinement and non-cacheable authenticated PDF responses.

Email logs contain only portal and purpose on delivery failure. They intentionally omit raw provider exceptions, credentials, recipient addresses, email bodies and link tokens. Captured mail and JWT/database/SMTP secrets must stay outside public directories and Git. `.env` variants are ignored while `.env.example` remains tracked.

`python -m scripts.check_repository_secrets` scans tracked text for common token/private-key formats and rejects tracked environment files. It prints locations/categories only. This is a heuristic current-tree check, not a history scan, penetration test or guarantee that every secret format is covered. Review diffs and deployment secret settings as well.

Important prototype limits: JWTs live in browser localStorage; profile photos are served by a public static mount; system_admin has broad access; clinician consent creation remains supported; audit coverage is incomplete for denied report events; no SMTP queue/bounce/retry worker exists. Operational encryption, backups, monitoring, comprehensive authorization review and formal security testing remain required before real healthcare use.

All test/demo data must be synthetic. No compliance, medical safety or clinical outcome claim is established by these checks.
