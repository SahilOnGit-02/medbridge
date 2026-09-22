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