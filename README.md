# MedBridge

AI-assisted interoperable healthcare record system capstone project.

## Phase 2 — Unified Clinical Record

This phase extends the Phase 1 foundation with a normalized clinical record model:
- hospital-specific patient mappings
- encounters
- conditions/diagnoses
- allergies
- medications
- prescriptions
- observations/lab results
- Alembic database migrations
- CRUD APIs for the clinical record

All development/demo data must be synthetic. MedBridge is a prototype interoperability layer, not a diagnostic or prescribing system.

## Run

```bash
cp .env.example .env
docker compose up --build
```

API docs: http://localhost:8000/docs

For local Python development:

```bash
cd backend
python -m venv .venv
# activate the environment
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```
