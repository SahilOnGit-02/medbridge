from fastapi import FastAPI

from app.api.patients import router as patients_router
from app.api.clinical import router as clinical_router

app = FastAPI(title="MedBridge API", version="0.2.0")

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "medbridge-api"}

app.include_router(patients_router)
app.include_router(clinical_router)
