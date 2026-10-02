from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.hospital import Hospital
from app.models.medical_report import MedicalReport
from app.models.patient import Patient


REPORTS = [
    {
        "title": "Complete Blood Count & CRP Laboratory Report",
        "report_type": "Laboratory Report",
        "description": "CBC and C-reactive protein investigation performed during evaluation of respiratory symptoms.",
        "issued_on": date(2026, 8, 18),
        "issuing_doctor": "Dr. Arjun Malhotra",
        "department": "Laboratory Medicine",
        "file_name": "01_CBC_CRP_Laboratory_Report.pdf",
    },
    {
        "title": "Chest X-Ray Report",
        "report_type": "Diagnostic Imaging",
        "description": "Chest radiograph performed during evaluation of suspected lower respiratory tract infection.",
        "issued_on": date(2026, 8, 18),
        "issuing_doctor": "Dr. Kavya Mehra",
        "department": "Radiology",
        "file_name": "02_Chest_XRay_Report.pdf",
    },
    {
        "title": "Clinical Consultation Report",
        "report_type": "Clinical Consultation",
        "description": "Internal medicine consultation documenting assessment and treatment plan.",
        "issued_on": date(2026, 8, 18),
        "issuing_doctor": "Dr. Arjun Malhotra",
        "department": "Internal Medicine",
        "file_name": "03_Clinical_Consultation_Report.pdf",
    },
    {
        "title": "Prescription",
        "report_type": "Prescription",
        "description": "Medication prescription issued during treatment for community-acquired pneumonia.",
        "issued_on": date(2026, 8, 18),
        "issuing_doctor": "Dr. Arjun Malhotra",
        "department": "Internal Medicine",
        "file_name": "04_Prescription.pdf",
    },
    {
        "title": "Discharge Summary",
        "report_type": "Discharge Summary",
        "description": "Hospital discharge summary documenting treatment course and clinical status at discharge.",
        "issued_on": date(2026, 8, 21),
        "issuing_doctor": "Dr. Arjun Malhotra",
        "department": "Internal Medicine",
        "file_name": "05_Discharge_Summary.pdf",
    },
]


def main():
    db = SessionLocal()

    try:
        patient = db.scalar(
            select(Patient).where(
                Patient.medbridge_id == "MB-DEMO-001"
            )
        )

        if patient is None:
            raise RuntimeError(
                "Aarav Sharma (MB-DEMO-001) was not found."
            )

        source_hospital = db.scalar(
            select(Hospital).where(
                Hospital.name == "MedBridge City Hospital"
            )
        )

        if source_hospital is None:
            source_hospital = db.scalar(
                select(Hospital).where(
                    Hospital.code == "MB-HOSP-A-002"
                )
            )

        if source_hospital is None:
            raise RuntimeError(
                "Demo source hospital was not found."
            )

        report_dir = (
            Path(__file__).resolve().parent
            / "app"
            / "demo_reports"
        )

        for item in REPORTS:
            file_path = report_dir / item["file_name"]

            if not file_path.is_file():
                raise RuntimeError(
                    f"Missing report file: {file_path}"
                )

            existing = db.scalar(
                select(MedicalReport).where(
                    MedicalReport.patient_id == patient.id,
                    MedicalReport.file_name == item["file_name"],
                )
            )

            if existing is None:
                db.add(
                    MedicalReport(
                        patient_id=patient.id,
                        hospital_id=source_hospital.id,
                        title=item["title"],
                        report_type=item["report_type"],
                        description=item["description"],
                        issued_on=item["issued_on"],
                        issuing_doctor=item["issuing_doctor"],
                        department=item["department"],
                        file_name=item["file_name"],
                        file_path=item["file_name"],
                        mime_type="application/pdf",
                    )
                )

        db.commit()

        reports = db.scalars(
            select(MedicalReport)
            .where(
                MedicalReport.patient_id == patient.id
            )
            .order_by(MedicalReport.issued_on.desc())
        ).all()

        print("Medical report seed complete")
        print(f"Patient: {patient.medbridge_id} / {patient.full_name}")
        print(f"Reports: {len(reports)}")

        for report in reports:
            print(
                f"- {report.id}: "
                f"{report.title} | "
                f"{report.file_name}"
            )

    finally:
        db.close()


if __name__ == "__main__":
    main()
