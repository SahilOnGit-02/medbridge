"""Separate portal entry, verified signup and configurable account email delivery."""

from datetime import date, datetime, timedelta
from hashlib import sha256
import secrets
import hmac
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.core.audit import log_audit_event
from app.core.config import settings
from app.core.jwt import create_access_token
from app.core.security import hash_password, verify_password
from app.services.account_mail import delivery_ready, deliver_or_report
from app.models.account import (
    AccountThrottle,
    AccountToken,
    DoctorRegistration,
    EmailVerification,
)
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["accounts"])
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))
GENERIC_RECOVERY = {
    "message": "If an account matches these details, recovery instructions will be sent to its registered email. Check your inbox or contact your administrator."
}


class PortalLogin(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class Signup(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    username: str | None = Field(
        default=None, min_length=3, max_length=60, pattern=r"^[A-Za-z0-9._-]+$"
    )
    password: str = Field(min_length=12, max_length=128)
    date_of_birth: date | None = None
    registration_number: str | None = Field(default=None, max_length=100)
    organization: str | None = Field(default=None, max_length=200)

    @field_validator("full_name", "registration_number", "organization")
    @classmethod
    def trim_text(cls, value):
        if value is not None and not value.strip():
            raise ValueError("This field cannot contain only spaces")
        return " ".join(value.split()) if value else value

    @field_validator("date_of_birth")
    @classmethod
    def valid_birth(cls, value):
        if value and value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class Recovery(BaseModel):
    email: EmailStr


class TokenInput(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class PasswordReset(TokenInput):
    password: str = Field(min_length=12, max_length=128)


class Approval(BaseModel):
    hospital_id: int


def portal_roles(portal):
    if portal not in {"doctor", "patient"}:
        raise HTTPException(404, "Portal not found")
    return (
        {"patient"}
        if portal == "patient"
        else {"doctor", "hospital_admin", "system_admin"}
    )


def throttle_key(request, portal, purpose, identifier):
    return sha256(
        f"{request.client.host if request.client else 'unknown'}:{portal}:{purpose}:{identifier.lower().strip()}".encode()
    ).hexdigest()


def throttled(db, request, portal, purpose, identifier):
    # Persisted between application restarts; hash identifiers rather than storing them.
    key = throttle_key(request, portal, purpose, identifier)
    now = datetime.utcnow()
    row = db.scalar(
        select(AccountThrottle).where(AccountThrottle.key == key).with_for_update()
    )
    if row is None:
        row = AccountThrottle(key=key, started_at=now, attempts=0)
        db.add(row)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            row = db.scalar(
                select(AccountThrottle)
                .where(AccountThrottle.key == key)
                .with_for_update()
            )
    if row.started_at < now - timedelta(minutes=15):
        row.started_at, row.attempts = now, 0
    row.attempts += 1
    exceeded = row.attempts > 5
    db.commit()
    return exceeded


def issue_token(db, user, portal, purpose):
    raw = secrets.token_urlsafe(32)
    db.add(
        AccountToken(
            user_id=user.id,
            digest=sha256(raw.encode()).hexdigest(),
            portal=portal,
            purpose=purpose,
            expires_at=datetime.utcnow()
            + timedelta(minutes=30 if purpose == "reset" else 1440),
        )
    )
    action = "reset-password" if purpose == "reset" else "verify-email"
    return f"{settings.public_app_url.rstrip('/')}/{portal}/{action}?token={quote(raw)}"


@router.post("/{portal}/login")
def portal_login(
    portal: str, payload: PortalLogin, request: Request, db: Session = Depends(get_db)
):
    roles = portal_roles(portal)
    identifier = payload.identifier.strip().lower()
    if throttled(db, request, portal, "login", identifier):
        raise HTTPException(
            429, "Too many sign-in attempts. Wait 15 minutes and try again."
        )
    user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == identifier,
                func.lower(User.username) == identifier,
            )
        )
    )
    password_valid = verify_password(
        payload.password, user.password_hash if user else DUMMY_PASSWORD_HASH
    )
    if user is None or user.role not in roles or not password_valid:
        raise HTTPException(401, "Invalid username, email or password for this portal")
    if not user.is_active:
        if user.registration_status == "pending_email":
            raise HTTPException(
                403,
                "Verify your email before signing in. Use the verification email or request a new one below.",
            )
        if user.registration_status == "pending_approval":
            raise HTTPException(
                403,
                "Your doctor registration is awaiting administrator approval. You cannot access patient records yet.",
            )
        raise HTTPException(403, "Account inactive. Contact your administrator.")
    db.execute(
        update(AccountThrottle)
        .where(
            AccountThrottle.key == throttle_key(request, portal, "login", identifier)
        )
        .values(attempts=0)
    )
    log_audit_event(
        db,
        current_user=user,
        action="login_success",
        resource_type="user",
        resource_id=user.id,
        success=True,
    )
    db.commit()
    return {
        "access_token": create_access_token(user.id, user.role, user.auth_version),
        "token_type": "bearer",
    }


@router.post("/{portal}/signup", status_code=202)
def signup(
    portal: str, payload: Signup, request: Request, db: Session = Depends(get_db)
):
    portal_roles(portal)
    delivery_ready()
    if portal == "doctor" and (
        not payload.registration_number or not payload.organization
    ):
        raise HTTPException(
            422, "Medical registration number and organization are required"
        )
    if portal == "patient" and not payload.date_of_birth:
        raise HTTPException(422, "Date of birth is required")
    email = str(payload.email).strip().lower()
    username = payload.username.lower() if payload.username else None
    response = {
        "message": "Check your email for the next step. "
        + (
            "Verify your email, then wait for administrator approval. "
            if portal == "doctor"
            else "Verify your email to activate your empty patient profile. "
        )
        + "If you already have an account, sign in or use account recovery.",
        "challenge": secrets.token_hex(32),
        "resend_after": 90,
    }
    if throttled(db, request, portal, "signup", email):
        return response
    if db.scalar(
        select(User).where(
            or_(func.lower(User.email) == email, func.lower(User.username) == username)
            if username
            else func.lower(User.email) == email
        )
    ):
        return response
    user = User(
        email=email,
        username=username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=portal,
        is_active=False,
        registration_status="pending_email",
    )
    db.add(user)
    try:
        db.flush()
        if portal == "doctor":
            db.add(
                DoctorRegistration(
                    user_id=user.id,
                    registration_number=payload.registration_number,
                    organization=payload.organization,
                )
            )
        else:
            # Never claim or link another person's existing medical record by email/DOB.
            db.add(
                Patient(
                    user_id=user.id,
                    medbridge_id=f"MB-{secrets.token_hex(8).upper()}",
                    full_name=payload.full_name,
                    date_of_birth=payload.date_of_birth,
                    email=email,
                    identity_verification_status="unverified",
                )
            )
        challenge, code, link = issue_verification(db, user, portal)
        response["challenge"] = challenge
        db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        return response
    deliver_or_report(
        email,
        "Verify your MedBridge email",
        verification_message(portal, challenge, code, link)
        + (
            "Doctor accounts remain inactive until administrator approval.\n"
            if portal == "doctor"
            else ""
        )
        + "If you did not request this, ignore this message.",
        portal=portal,
        purpose="verify",
    )
    return response


@router.post("/{portal}/recover/{kind}", status_code=202)
def recover(
    portal: str,
    kind: str,
    payload: Recovery,
    request: Request,
    db: Session = Depends(get_db),
):
    roles = portal_roles(portal)
    if kind not in {"username", "password", "verification"}:
        raise HTTPException(404, "Recovery option not found")
    if kind == "verification":
        return request_verification(portal, payload, request, db)
    delivery_ready()
    email = str(payload.email).strip().lower()
    if throttled(db, request, portal, kind, email):
        return GENERIC_RECOVERY
    user = db.scalar(
        select(User).where(func.lower(User.email) == email, User.role.in_(roles))
    )
    if user:
        if kind == "username":
            body = f"Your {portal} portal sign-in identifier is: {user.username or user.email}\nSign in at {settings.public_app_url.rstrip(chr(47))}/{portal}/sign-in. If you did not request this message, ignore it."
        elif kind == "password":
            body = f"Reset your password within 30 minutes: {issue_token(db, user, portal, 'reset')}\nThis link works once. If you did not request it, ignore this message."
        else:
            return GENERIC_RECOVERY
        db.flush()
        db.commit()
        deliver_or_report(
            email,
            f"MedBridge {kind} help",
            body,
            portal=portal,
            purpose=kind,
            recovery=True,
        )
    return GENERIC_RECOVERY


def consume_token(db, portal, raw, purpose):
    roles = portal_roles(portal)
    now = datetime.utcnow()
    digest = sha256(raw.encode()).hexdigest()
    token = db.scalar(
        select(AccountToken).where(
            AccountToken.digest == digest,
            AccountToken.portal == portal,
            AccountToken.purpose == purpose,
            AccountToken.consumed_at.is_(None),
            AccountToken.expires_at > now,
        )
    )
    if token is None:
        raise HTTPException(
            400, "This link is invalid, expired or already used. Request a new email."
        )
    # Lifecycle changes lock the user first to avoid token/user lock inversion.
    user = db.scalar(select(User).where(User.id == token.user_id).with_for_update())
    if user is None or user.role not in roles:
        raise HTTPException(400, "This link does not match the portal")
    # Conditional update also protects against double consumption without row locks on SQLite.
    result = db.execute(
        update(AccountToken)
        .where(
            AccountToken.id == token.id,
            AccountToken.consumed_at.is_(None),
            AccountToken.expires_at > datetime.utcnow(),
        )
        .values(consumed_at=now)
    )
    if result.rowcount != 1:
        raise HTTPException(
            400, "This link has already been used. Request a new email."
        )
    return user


@router.post("/{portal}/verify-email")
def verify_email(portal: str, payload: TokenInput, db: Session = Depends(get_db)):
    user = consume_token(db, portal, payload.token, "verify")
    return complete_verification(db, user, portal)


def complete_verification(db, user, portal):
    now = datetime.utcnow()
    user.email_verified_at = now
    if user.registration_status == "pending_email":
        user.registration_status = (
            "pending_approval" if portal == "doctor" else "active"
        )
        user.is_active = portal == "patient"
    # Both the code and any outstanding verification links become unusable.
    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    db.execute(
        update(AccountToken)
        .where(
            AccountToken.user_id == user.id,
            AccountToken.purpose == "verify",
            AccountToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    db.commit()
    return {
        "message": (
            "Email verified. Your doctor registration now awaits administrator approval."
            if portal == "doctor"
            else "Email verified. You can now sign in to your patient account."
        )
    }


class VerificationCode(BaseModel):
    challenge: str = Field(min_length=20, max_length=100)
    code: str = Field(pattern=r"^[0-9]{6}$")


def code_digest(challenge_digest, code):
    # A keyed digest protects a small code space if the database is exposed.
    return hmac.new(
        settings.jwt_secret_key.encode(),
        f"{challenge_digest}:{code}".encode(),
        "sha256",
    ).hexdigest()


def verification_message(portal, challenge, code, link):
    page = f"{settings.public_app_url.rstrip('/')}/{portal}/verify-code?challenge={challenge}"
    return (
        f"Your verification code is: {code}\nEnter it within 10 minutes at: {page}\n"
        f"Or verify using this single-use link within 24 hours: {link}\n"
        "If you did not request this, ignore this message."
    )


def verification_handle(user_id, sent_at):
    return hmac.new(
        settings.jwt_secret_key.encode(),
        f"verification:{user_id}:{sent_at.isoformat()}".encode(),
        "sha256",
    ).hexdigest()


def issue_verification(db, user, portal):
    now = datetime.utcnow()
    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    db.execute(
        update(AccountToken)
        .where(
            AccountToken.user_id == user.id,
            AccountToken.purpose == "verify",
            AccountToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    raw = verification_handle(user.id, now)
    digest = sha256(raw.encode()).hexdigest()
    code = f"{secrets.randbelow(1000000):06d}"
    db.add(
        EmailVerification(
            user_id=user.id,
            challenge_digest=digest,
            code_digest=code_digest(digest, code),
            portal=portal,
            sent_at=now,
            expires_at=now + timedelta(minutes=10),
            attempts=0,
        )
    )
    return raw, code, issue_token(db, user, portal, "verify")


@router.post("/{portal}/verification/request", status_code=202)
def request_verification(
    portal: str, payload: Recovery, request: Request, db: Session = Depends(get_db)
):
    roles = portal_roles(portal)
    delivery_ready()
    email = str(payload.email).strip().lower()
    response = {
        **GENERIC_RECOVERY,
        "challenge": secrets.token_hex(32),
        "resend_after": 90,
    }
    if throttled(db, request, portal, "verification-code-request", email):
        return response
    user = db.scalar(
        select(User)
        .where(func.lower(User.email) == email, User.role.in_(roles))
        .with_for_update()
    )
    if user and user.registration_status == "pending_email":
        latest = db.scalar(
            select(EmailVerification)
            .where(EmailVerification.user_id == user.id)
            .order_by(EmailVerification.sent_at.desc())
            .limit(1)
        )
        if (
            latest
            and latest.consumed_at is None
            and latest.sent_at > datetime.utcnow() - timedelta(seconds=90)
        ):
            response["challenge"] = verification_handle(user.id, latest.sent_at)
            return response
        raw, code, link = issue_verification(db, user, portal)
        db.commit()
        deliver_or_report(
            email,
            "Verify your MedBridge email",
            verification_message(portal, raw, code, link),
            portal=portal,
            purpose="verification",
            recovery=True,
        )
        response["challenge"] = raw
    return response


@router.post("/{portal}/verify-code")
def verify_code(portal: str, payload: VerificationCode, db: Session = Depends(get_db)):
    roles = portal_roles(portal)
    now = datetime.utcnow()
    digest = sha256(payload.challenge.encode()).hexdigest()
    row = db.scalar(
        select(EmailVerification).where(
            EmailVerification.challenge_digest == digest,
            EmailVerification.portal == portal,
            EmailVerification.consumed_at.is_(None),
            EmailVerification.expires_at > now,
            EmailVerification.attempts < 5,
        )
    )
    invalid = "This code is incorrect, expired or already used. Check the email or request a new code."
    if row is None:
        raise HTTPException(400, invalid)
    user = db.scalar(select(User).where(User.id == row.user_id).with_for_update())
    db.refresh(row)
    if (
        user is None
        or user.role not in roles
        or user.registration_status != "pending_email"
        or row.expires_at <= datetime.utcnow()
        or row.consumed_at is not None
    ):
        raise HTTPException(400, invalid)
    attempted = db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.id == row.id,
            EmailVerification.attempts < 5,
            EmailVerification.consumed_at.is_(None),
        )
        .values(attempts=EmailVerification.attempts + 1)
    )
    if attempted.rowcount != 1 or not hmac.compare_digest(
        row.code_digest, code_digest(digest, payload.code)
    ):
        db.commit()
        raise HTTPException(400, invalid)
    used = db.execute(
        update(EmailVerification)
        .where(EmailVerification.id == row.id, EmailVerification.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    if (
        used.rowcount != 1
        or user is None
        or user.role not in roles
        or user.registration_status != "pending_email"
    ):
        db.rollback()
        raise HTTPException(400, invalid)
    return complete_verification(db, user, portal)


class VerificationChallenge(BaseModel):
    challenge: str = Field(min_length=20, max_length=100)


@router.post("/{portal}/verification/status")
def verification_status(
    portal: str, payload: VerificationChallenge, db: Session = Depends(get_db)
):
    portal_roles(portal)
    row = db.scalar(
        select(EmailVerification).where(
            EmailVerification.challenge_digest
            == sha256(payload.challenge.encode()).hexdigest(),
            EmailVerification.portal == portal,
            EmailVerification.consumed_at.is_(None),
        )
    )
    remaining = (
        max(0, 90 - int((datetime.utcnow() - row.sent_at).total_seconds()))
        if row
        else 0
    )
    return {"resend_after": remaining}


@router.post("/{portal}/verification/resend", status_code=202)
def resend_verification(
    portal: str, payload: VerificationChallenge, db: Session = Depends(get_db)
):
    portal_roles(portal)
    delivery_ready()
    response = {**GENERIC_RECOVERY, "resend_after": 90}
    row = db.scalar(
        select(EmailVerification).where(
            EmailVerification.challenge_digest
            == sha256(payload.challenge.encode()).hexdigest(),
            EmailVerification.portal == portal,
            EmailVerification.consumed_at.is_(None),
        )
    )
    if row is None:
        return response
    user = db.scalar(select(User).where(User.id == row.user_id).with_for_update())
    db.refresh(row)
    if (
        user is None
        or user.registration_status != "pending_email"
        or row.consumed_at is not None
    ):
        return response
    now = datetime.utcnow()
    remaining = 90 - int((now - row.sent_at).total_seconds())
    if remaining > 0:
        raise HTTPException(
            429,
            f"Wait {remaining} seconds before requesting another code.",
            headers={"Retry-After": str(remaining)},
        )
    # A conditional update makes simultaneous resends single-use on SQLite too.
    changed = db.execute(
        update(EmailVerification)
        .where(EmailVerification.id == row.id, EmailVerification.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    if changed.rowcount != 1:
        db.rollback()
        return response
    raw, code, link = issue_verification(db, user, portal)
    db.commit()
    deliver_or_report(
        user.email,
        "Verify your MedBridge email",
        verification_message(portal, raw, code, link),
        portal=portal,
        purpose="verification",
        recovery=True,
    )
    response["challenge"] = raw
    return response


@router.post("/{portal}/reset-password")
def reset_password(portal: str, payload: PasswordReset, db: Session = Depends(get_db)):
    user = consume_token(db, portal, payload.token, "reset")
    user.password_hash = hash_password(payload.password)
    user.auth_version += 1
    # Other outstanding reset links become invalid after any successful reset.
    db.execute(
        update(AccountToken)
        .where(
            AccountToken.user_id == user.id,
            AccountToken.purpose == "reset",
            AccountToken.consumed_at.is_(None),
        )
        .values(consumed_at=datetime.utcnow())
    )
    db.commit()
    return {
        "message": "Password updated. Sign in with your new password. Previous sessions have been signed out."
    }


@router.get("/registrations/pending")
def pending_registrations(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hospital_admin", "system_admin")),
):
    query = (
        select(User, DoctorRegistration)
        .join(DoctorRegistration, DoctorRegistration.user_id == User.id)
        .where(User.registration_status == "pending_approval")
    )
    if user.role == "hospital_admin":
        hospital = db.get(Hospital, user.hospital_id)
        query = query.where(
            DoctorRegistration.organization == (hospital.name if hospital else "")
        )
    return [
        {
            "id": applicant.id,
            "full_name": applicant.full_name,
            "email": applicant.email,
            "organization": registration.organization,
            "registration_number": registration.registration_number,
        }
        for applicant, registration in db.execute(query).all()
    ]


@router.post("/registrations/{user_id}/approve")
def approve_registration(
    user_id: int,
    payload: Approval,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("hospital_admin", "system_admin")),
):
    if current.role != "system_admin" and payload.hospital_id != current.hospital_id:
        raise HTTPException(403, "You can only assign doctors to your own hospital")
    hospital = db.get(Hospital, payload.hospital_id)
    applicant = db.get(User, user_id)
    registration = db.scalar(
        select(DoctorRegistration).where(DoctorRegistration.user_id == user_id)
    )
    if (
        hospital is None
        or applicant is None
        or registration is None
        or applicant.registration_status != "pending_approval"
        or applicant.email_verified_at is None
    ):
        raise HTTPException(
            400,
            "A verified, pending doctor registration and valid hospital are required",
        )
    if current.role == "hospital_admin" and registration.organization != hospital.name:
        raise HTTPException(
            403, "This registration requires system administrator review"
        )
    applicant.hospital_id, applicant.is_active, applicant.registration_status = (
        hospital.id,
        True,
        "active",
    )
    registration.reviewed_by, registration.reviewed_at = current.id, datetime.utcnow()
    log_audit_event(
        db,
        current_user=current,
        action="doctor_registration_approved",
        resource_type="user",
        resource_id=applicant.id,
        success=True,
    )
    db.commit()
    return {"message": "Doctor approved and assigned to the hospital."}


@router.get("/registrations/hospitals")
def approval_hospitals(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hospital_admin", "system_admin")),
):
    query = select(Hospital).order_by(func.lower(Hospital.name))
    if user.role != "system_admin":
        query = query.where(Hospital.id == user.hospital_id)
    return [
        {"id": hospital.id, "name": hospital.name, "code": hospital.code}
        for hospital in db.scalars(query).all()
    ]
