FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
# System deps for healthcheck and building some wheels
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl build-essential \
    && rm -rf /var/lib/apt/lists/*
# Install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
# Copy app code and static assets
COPY app ./app
COPY static ./static
# Expose service
EXPOSE 8000
# Start with gunicorn + uvicorn worker for production
# gunicorn manages multiple worker processes for better concurrency
# uvicorn.workers.UvicornWorker allows each worker to handle async requests efficiently
CMD ["gunicorn", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "debug", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "app.main:app"]