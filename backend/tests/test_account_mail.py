"""TLS transport, safe failure handling and account flows with an SMTP test double."""

import re
import smtplib

import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import select

from app.core.config import settings
from app.models.account import AccountToken, EmailVerification
from app.models.user import User
from app.core.security import hash_password
from app.services import account_mail
from tests.test_account_flows import fixture, signup, login, PASSWORD


@pytest.fixture
def smtp(monkeypatch):
    messages, calls = [], []
    for key, value in {
        "account_mail_mode": "smtp",
        "smtp_host": "smtp.example.com",
        "smtp_port": 587,
        "smtp_username": "test-sender",
        "smtp_password": SecretStr("synthetic-smtp-password"),
        "smtp_security": "starttls",
        "account_mail_from": "sender@example.com",
        "app_env": "production",
        "public_app_url": "https://portal.example.com",
    }.items():
        monkeypatch.setattr(settings, key, value)

    class SMTP:
        def __init__(self, **kwargs):
            calls.append(("connect", kwargs))

        def __enter__(self):
            return self

        def __exit__(self, *args):
            calls.append(("close", None))

        def ehlo(self):
            calls.append(("ehlo", None))

        def starttls(self, **kwargs):
            calls.append(("tls", kwargs))

        def login(self, *args):
            calls.append(("login", args))

        def send_message(self, message):
            messages.append(message)
            calls.append(("send", None))
            return {}

    monkeypatch.setattr(smtplib, "SMTP", SMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", SMTP)
    return messages, calls


@pytest.mark.parametrize("mode,port", [("starttls", 587), ("ssl", 465)])
def test_verified_tls_transport_and_timeout(smtp, monkeypatch, mode, port):
    messages, calls = smtp
    monkeypatch.setattr(settings, "smtp_security", mode)
    monkeypatch.setattr(settings, "smtp_port", port)
    account_mail.send_account_mail(
        "recipient@example.com", "Synthetic test", "test body"
    )
    connect = calls[0][1]
    assert connect["timeout"] == 10 and connect["port"] == port
    if mode == "starttls":
        assert [item[0] for item in calls] == [
            "connect",
            "ehlo",
            "tls",
            "ehlo",
            "login",
            "send",
            "close",
        ]
        context = next(value["context"] for kind, value in calls if kind == "tls")
    else:
        context = connect["context"]
        assert not any(kind == "tls" for kind, _ in calls)
    assert context.check_hostname
    assert messages[0]["To"] == "recipient@example.com"
    assert "sender@example.com" in messages[0]["From"]


@pytest.mark.parametrize("portal", ["patient", "doctor"])
def test_smtp_signup_verification_recovery_and_reset(
    fixture, smtp, monkeypatch, portal
):
    client, sessions, _ = fixture
    # The imported account fixture defaults to capture; smtp runs after it.
    messages, _ = smtp
    original = account_mail.send_account_mail

    def after_commit(email, subject, body):
        with sessions() as db:
            user = db.scalar(select(User).where(User.email == email))
            assert user is not None
            assert (
                db.scalar(select(AccountToken).where(AccountToken.user_id == user.id))
                is not None
            )
        original(email, subject, body)

    monkeypatch.setattr(account_mail, "send_account_mail", after_commit)
    assert signup(client, portal).status_code == 202
    body = messages[-1].get_content()
    assert f"https://portal.example.com/{portal}/verify-email?token=" in body
    token = re.search(r"token=([A-Za-z0-9_-]+)", body)[1]
    assert (
        client.post(f"/auth/{portal}/verify-email", json={"token": token}).status_code
        == 200
    )
    if portal == "doctor":
        assert login(client, portal, "test.doctor", PASSWORD).status_code == 403
    else:
        assert login(client, portal, "test.patient", PASSWORD).status_code == 200
    email = f"new.{portal}@example.com"
    assert (
        client.post(
            f"/auth/{portal}/recover/username", json={"email": email}
        ).status_code
        == 202
    )
    assert f"{portal}/sign-in" in messages[-1].get_content()
    assert (
        client.post(
            f"/auth/{portal}/recover/password", json={"email": email}
        ).status_code
        == 202
    )
    body = messages[-1].get_content()
    assert f"https://portal.example.com/{portal}/reset-password?token=" in body
    token = re.search(r"token=([A-Za-z0-9_-]+)", body)[1]
    reset = {"token": token, "password": "SyntheticNewPassword123!"}
    assert client.post(f"/auth/{portal}/reset-password", json=reset).status_code == 200
    assert client.post(f"/auth/{portal}/reset-password", json=reset).status_code == 400
    assert login(client, portal, f"test.{portal}", reset["password"]).status_code == (
        403 if portal == "doctor" else 200
    )
    if portal == "doctor":
        with sessions() as db:
            applicant_id = db.scalar(select(User).where(User.email == email)).id
            db.add(
                User(
                    email="approval.smtp@example.com",
                    full_name="Synthetic Approver",
                    role="hospital_admin",
                    hospital_id=1,
                    is_active=True,
                    password_hash=hash_password(PASSWORD),
                )
            )
            db.commit()
        admin = login(client, "doctor", "approval.smtp@example.com", PASSWORD)
        headers = {"Authorization": "Bearer " + admin.json()["access_token"]}
        assert (
            client.post(
                f"/auth/registrations/{applicant_id}/approve",
                headers=headers,
                json={"hospital_id": 1},
            ).status_code
            == 200
        )
        assert (
            login(client, "doctor", "test.doctor", reset["password"]).status_code == 200
        )


def test_failed_signup_is_resendable_and_recovery_remains_generic(
    fixture, smtp, monkeypatch, caplog
):
    client, sessions, _ = fixture
    secret_marker = "do-not-expose-smtp-secret"
    original = account_mail.send_account_mail

    def failure(*args):
        raise smtplib.SMTPAuthenticationError(535, secret_marker.encode())

    monkeypatch.setattr(account_mail, "send_account_mail", failure)
    response = signup(client, "patient")
    assert response.status_code == 503 and "registration is saved" in response.text
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == "new.patient@example.com"))
        assert user.registration_status == "pending_email" and not user.is_active
    known = client.post(
        "/auth/patient/recover/password", json={"email": "new.patient@example.com"}
    )
    unknown = client.post(
        "/auth/patient/recover/password", json={"email": "unknown@example.com"}
    )
    assert (
        known.status_code == unknown.status_code == 202
        and known.json() == unknown.json()
    )
    assert secret_marker not in response.text + caplog.text
    assert "new.patient@example.com" not in caplog.text
    # Simulate the required resend interval without slowing the test suite.
    from datetime import datetime, timedelta
    from app.models.account import EmailVerification

    with sessions() as db:
        for row in db.scalars(select(EmailVerification)):
            row.sent_at = datetime.utcnow() - timedelta(seconds=91)
        db.commit()
    monkeypatch.setattr(account_mail, "send_account_mail", original)
    assert (
        client.post(
            "/auth/patient/recover/verification",
            json={"email": "new.patient@example.com"},
        ).status_code
        == 202
    )
    assert len(smtp[0]) == 1


@pytest.mark.parametrize(
    "url",
    [
        "http://portal.example.com",
        "https://localhost",
        "https://127.0.0.1",
        "https://portal.example.com?token=bad",
        "https://user:password@portal.example.com",
        "https://portal.example.com/#fragment",
        "https://portal.example.com/subpath",
        "https://portal.example.com:bad",
    ],
)
def test_invalid_production_link_configuration_is_rejected(smtp, monkeypatch, url):
    monkeypatch.setattr(settings, "public_app_url", url)
    with pytest.raises(HTTPException) as error:
        account_mail.delivery_ready()
    assert error.value.status_code == 503


@pytest.mark.parametrize(
    "field,value",
    [
        ("smtp_host", None),
        ("account_mail_from", None),
        ("smtp_username", None),
        ("smtp_password", None),
        ("smtp_security", "none"),
    ],
)
def test_incomplete_smtp_configuration_is_rejected(smtp, monkeypatch, field, value):
    monkeypatch.setattr(settings, field, value)
    with pytest.raises(HTTPException):
        account_mail.delivery_ready()


def test_capture_cannot_be_enabled_on_production(fixture, monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    with pytest.raises(HTTPException):
        account_mail.delivery_ready()


def test_existing_smtp_sender_environment_remains_compatible(monkeypatch):
    from app.core.config import Settings

    monkeypatch.delenv("ACCOUNT_MAIL_FROM", raising=False)
    monkeypatch.setenv("SMTP_FROM_EMAIL", "legacy-sender@example.com")
    configured = Settings(_env_file=None, jwt_secret_key="isolated-test-secret")
    assert configured.account_mail_from == "legacy-sender@example.com"
    assert configured.smtp_port == 465 and configured.smtp_security is None


@pytest.mark.parametrize("port,expected_tls", [(465, False), (587, True)])
def test_legacy_port_chooses_verified_tls_mode(smtp, monkeypatch, port, expected_tls):
    monkeypatch.setattr(settings, "smtp_security", None)
    monkeypatch.setattr(settings, "smtp_port", port)
    account_mail.send_account_mail(
        "recipient@example.com", "Synthetic compatibility", "test"
    )
    calls = smtp[1]
    assert any(kind == "tls" for kind, _ in calls) is expected_tls
    if not expected_tls:
        assert calls[0][1]["context"].check_hostname
