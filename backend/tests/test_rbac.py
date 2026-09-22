from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.deps import require_role
from app.core.jwt import create_access_token, decode_access_token


def test_require_role_allows_allowed_role():
    checker = require_role("doctor", "hospital_admin")

    user = SimpleNamespace(role="doctor")

    result = checker(user)

    assert result is user


def test_require_role_rejects_disallowed_role():
    checker = require_role("doctor", "hospital_admin")

    user = SimpleNamespace(role="system_admin")

    with pytest.raises(HTTPException) as exc_info:
        checker(user)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Insufficient permissions"
from app.api.deps import require_hospital_access


def test_require_hospital_access_allows_same_hospital():
    user = SimpleNamespace(role="doctor", hospital_id=1)

    result = require_hospital_access(1, user)

    assert result is user


def test_require_hospital_access_rejects_different_hospital():
    user = SimpleNamespace(role="doctor", hospital_id=1)

    with pytest.raises(HTTPException) as exc_info:
        require_hospital_access(2, user)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "User does not have access to this hospital"


def test_require_hospital_access_allows_system_admin():
    user = SimpleNamespace(role="system_admin", hospital_id=None)

    result = require_hospital_access(2, user)

    assert result is user

def test_access_token_rejects_tampered_token():
    token = create_access_token(123, "doctor")
    parts = token.split(".")

    tampered_payload = parts[1][:-1] + (
        "a" if parts[1][-1] != "a" else "b"
    )
    tampered_token = ".".join(
        [parts[0], tampered_payload, parts[2]]
    )

    with pytest.raises(Exception):
        decode_access_token(tampered_token)