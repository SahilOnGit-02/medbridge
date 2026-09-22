from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.patients import router as patients_router
from app.api.clinical import router as clinical_router
from app.api.fhir import router as fhir_router
from app.api.auth import router as auth_router

app = FastAPI(title="MedBridge API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "medbridge-api"}


app.include_router(patients_router)
app.include_router(clinical_router)
app.include_router(fhir_router)
app.include_router(auth_router)
