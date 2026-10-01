"""Run an isolated browser-test API on port 8002. Data is discarded on exit."""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "synthetic-ux-fixture-secret-for-local-testing-only"
from app.main import app
from app.api.deps import get_db
from tests.ux_fixtures import create_fixture_database
import uvicorn
from tempfile import TemporaryDirectory
from pathlib import Path
from datetime import datetime, timezone
from app.models.consent import PatientHospitalConsent

fixture_dir = TemporaryDirectory(prefix="medbridge-ux-", dir="/private/tmp")
engine, sessions = create_fixture_database(Path(fixture_dir.name) / "test.sqlite")
with sessions() as db:
    db.add(
        PatientHospitalConsent(
            patient_id=1,
            hospital_id=1,
            status="active",
            purpose="Synthetic browser test care",
            granted_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    db.commit()


def database():
    with sessions() as db:
        yield db


app.dependency_overrides[get_db] = database
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002)
