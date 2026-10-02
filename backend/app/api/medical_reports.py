from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.clinical import require_patient_hospital_access
from app.api.deps import get_current_patient, get_current_user
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.consent import PatientHospitalConsent
from app.models.medical_report import MedicalReport
from app.models.patient import Patient
from app.schemas.medical_report import MedicalReportRead


router = APIRouter(
    prefix="/patients",
    tags=["Medical Reports"],

)

REPORT_ROOT = (
    Path(__file__).resolve().parent.parent / "demo_reports"
)


def resolve_report_file(report: MedicalReport) -> Path:
    file_name = Path(report.file_name)

    if (
        file_name.name != report.file_name
        or file_name.is_absolute()
    ):
        raise HTTPException(
            status_code=500,
            detail="Medical report storage path is invalid",
        )

    file_path = (REPORT_ROOT / file_name).resolve()

    try:
        file_path.relative_to(REPORT_ROOT.resolve())
    except ValueError:
        raise HTTPException(
            status_code=500,
            detail="Medical report storage path is invalid",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Medical report file not found",
        )

    return file_path


def require_report_read_access(
    db: Session,
    current_user,
    patient_id: int,
):
    if current_user.role == "system_admin":
        return None

    if current_user.role not in {"doctor", "hospital_admin"}:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions",
        )

    if current_user.hospital_id is None:
        raise HTTPException(
            status_code=403,
            detail="User is not associated with a hospital",
        )

    consent = db.scalar(
        select(PatientHospitalConsent)
        .where(
            PatientHospitalConsent.patient_id == patient_id,
            PatientHospitalConsent.hospital_id == current_user.hospital_id,
            PatientHospitalConsent.status == "active",
        )
        .order_by(
            PatientHospitalConsent.created_at.desc()
        )
    )

    if consent is None:
        raise HTTPException(
            status_code=403,
            detail="Patient has not granted clinical record access to this hospital",
        )

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if consent.expires_at is not None and consent.expires_at <= now:
        raise HTTPException(
            status_code=403,
            detail="Patient clinical record access has expired",
        )

    if not consent.share_reports:
        raise HTTPException(
            status_code=403,
            detail="Patient has not granted medical report access to this hospital",
        )

    require_patient_hospital_access(
        db,
        current_user,
        patient_id,
    )

    return consent


def report_to_read(report: MedicalReport) -> MedicalReportRead:
    return MedicalReportRead(
        id=report.id,
        patient_id=report.patient_id,
        hospital_id=report.hospital_id,
        title=report.title,
        report_type=report.report_type,
        description=report.description,
        issued_on=report.issued_on,
        issuing_doctor=report.issuing_doctor,
        department=report.department,
        file_name=report.file_name,
        mime_type=report.mime_type,
        created_at=report.created_at,
    )


@router.get(
    "/me/reports",
    response_model=list[MedicalReportRead],
)
def list_my_reports(
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    reports = db.scalars(
        select(MedicalReport)
        .where(
            MedicalReport.patient_id == current_patient.id,
        )
        .order_by(
            MedicalReport.issued_on.desc(),
            MedicalReport.id.desc(),
        )
    ).all()

    return [report_to_read(report) for report in reports]


@router.get(
    "/{patient_id}/reports",
    response_model=list[MedicalReportRead],
)
def list_patient_reports(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    require_report_read_access(
        db,
        current_user,
        patient_id,
    )

    reports = db.scalars(
        select(MedicalReport)
        .where(
            MedicalReport.patient_id == patient_id,
        )
        .order_by(
            MedicalReport.issued_on.desc(),
            MedicalReport.id.desc(),
        )
    ).all()

    return [report_to_read(report) for report in reports]


@router.get(
    "/me/reports/{report_id}/file",
)
def get_my_report_file(
    report_id: int,
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    report = db.get(MedicalReport, report_id)

    if report is None or report.patient_id != current_patient.id:
        raise HTTPException(
            status_code=404,
            detail="Medical report not found",
        )

    file_path = resolve_report_file(report)

    db.add(
        AuditLog(
            user_id=current_patient.user_id,
            hospital_id=report.hospital_id,
            patient_id=report.patient_id,
            action="medical_report_view",
            resource_type="medical_report",
            resource_id=report.id,
            success=True,
            details="Patient viewed medical report",
        )
    )
    db.commit()

    return FileResponse(
        path=file_path,
        media_type=report.mime_type,
        filename=report.file_name,
    )


@router.get(
    "/{patient_id}/reports/{report_id}/file",
)
def get_patient_report_file(
    patient_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    report = db.get(MedicalReport, report_id)

    if report is None or report.patient_id != patient_id:
        raise HTTPException(
            status_code=404,
            detail="Medical report not found",
        )

    require_report_read_access(
        db,
        current_user,
        patient_id,
    )

    file_path = resolve_report_file(report)

    db.add(
        AuditLog(
            user_id=current_user.id,
            hospital_id=current_user.hospital_id,
            patient_id=patient_id,
            action="medical_report_view",
            resource_type="medical_report",
            resource_id=report.id,
            success=True,
            details="Hospital user viewed medical report",
        )
    )
    db.commit()

    return FileResponse(
        path=file_path,
        media_type=report.mime_type,
        filename=report.file_name,
    )
