"""Private development mail capture and TLS-protected SMTP account delivery."""

from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr
import ipaddress
import json
import logging
import os
from pathlib import Path
import secrets
import smtplib
import ssl
from urllib.parse import urlparse

from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


def delivery_ready():
    try:
        origin = urlparse(settings.public_app_url)
        hostname = origin.hostname
        origin.port
    except ValueError:
        raise HTTPException(
            503, "Account email delivery is not configured. Contact your administrator."
        ) from None
    try:
        loopback = ipaddress.ip_address(hostname or "").is_loopback
    except ValueError:
        loopback = False
    local = origin.hostname in {"localhost", "127.0.0.1", "::1"} or loopback
    valid_url = (
        origin.scheme in {"http", "https"}
        and origin.hostname
        and not origin.username
        and not origin.password
        and not origin.query
        and not origin.fragment
        and origin.path in {"", "/"}
    )
    if settings.app_env != "development":
        valid_url = valid_url and origin.scheme == "https" and not local
    capture = (
        settings.account_mail_mode == "capture"
        and settings.app_env == "development"
        and local
        and settings.account_mailbox_dir
    )
    smtp = (
        settings.account_mail_mode == "smtp"
        and settings.smtp_host
        and settings.account_mail_from
        and settings.smtp_security in {"starttls", "ssl"}
        and bool(settings.smtp_username) == bool(settings.smtp_password)
    )
    if not valid_url or not (capture or smtp):
        raise HTTPException(
            503, "Account email delivery is not configured. Contact your administrator."
        )


def send_account_mail(email, subject, body):
    """Send after the account/token transaction commits. Never log message contents."""
    delivery_ready()
    if settings.account_mail_mode == "capture":
        mailbox = Path(settings.account_mailbox_dir)
        mailbox.mkdir(parents=True, exist_ok=True, mode=0o700)
        destination = (
            mailbox / f"{datetime.utcnow():%Y%m%dT%H%M%S}-{secrets.token_hex(8)}.json"
        )
        fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as handle:
            json.dump(
                {
                    "to": email,
                    "subject": subject,
                    "body": body,
                    "delivery": "local capture only; no email sent",
                },
                handle,
                indent=2,
            )
        return

    message = EmailMessage()
    message["From"] = formataddr(("MedBridge", str(settings.account_mail_from)))
    message["To"] = email
    message["Subject"] = subject
    message.set_content(body)
    context = ssl.create_default_context()
    connection = smtplib.SMTP_SSL if settings.smtp_security == "ssl" else smtplib.SMTP
    kwargs = {
        "host": settings.smtp_host,
        "port": settings.smtp_port,
        "timeout": settings.smtp_timeout_seconds,
    }
    if settings.smtp_security == "ssl":
        kwargs["context"] = context
    with connection(**kwargs) as smtp:
        if settings.smtp_security == "starttls":
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
        if settings.smtp_username:
            smtp.login(
                settings.smtp_username, settings.smtp_password.get_secret_value()
            )
        # Some SMTP relays report recipient rejection without raising.
        if smtp.send_message(message):
            raise smtplib.SMTPException("Recipient rejected")


def deliver_or_report(email, subject, body, *, portal, purpose, recovery=False):
    try:
        send_account_mail(email, subject, body)
    except (OSError, smtplib.SMTPException):
        # Exception messages can contain credentials, recipient addresses or tokens.
        logger.error(
            "Account email delivery failed (portal=%s purpose=%s)", portal, purpose
        )
        if not recovery:
            raise HTTPException(
                503,
                "Your registration is saved, but the email could not be sent. "
                "Use Resend verification email or contact your administrator.",
            ) from None
        # Preserve the same response for matching and unknown recovery addresses.
