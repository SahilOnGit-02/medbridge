FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini .
COPY alembic ./alembic
COPY seed_render.py .

CMD ["sh", "-c", "alembic upgrade head && if [ \"$RUN_DEMO_SEED\" = \"true\" ]; then python seed_render.py; fi && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]