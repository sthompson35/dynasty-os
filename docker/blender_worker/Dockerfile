FROM python:3.12-slim

WORKDIR /app

COPY scripts /app/scripts
COPY blender /app/blender
COPY frontend /app/frontend

CMD ["python", "scripts/blender_worker.py"]
