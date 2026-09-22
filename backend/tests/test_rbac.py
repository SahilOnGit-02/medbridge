from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.deps import require_role


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