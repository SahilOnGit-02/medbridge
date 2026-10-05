"""Check production account-mail settings without sending email or printing secrets."""

from fastapi import HTTPException
from app.core.config import settings
from app.services.account_mail import delivery_ready


def main():
    problems = []
    if settings.app_env != "production":
        problems.append("APP_ENV must be production for this release check.")
    if settings.account_mail_mode != "smtp":
        problems.append("ACCOUNT_MAIL_MODE must be smtp for deployed account email.")
    if len(settings.jwt_secret_key) < 32 or settings.jwt_secret_key.startswith(
        "replace-"
    ):
        problems.append("Configure a strong, private JWT_SECRET_KEY.")
    if settings.public_app_url.rstrip("/") not in settings.cors_origins:
        problems.append("CORS_ORIGINS must include the exact PUBLIC_APP_URL origin.")
    try:
        delivery_ready()
    except HTTPException:
        problems.append(
            "SMTP delivery or the public HTTPS origin is not fully configured."
        )
    if problems:
        raise SystemExit("\n".join(problems))
    print(
        "Production account-mail configuration checks passed. Provider connectivity and inbox delivery still require staging tests."
    )


if __name__ == "__main__":
    main()
