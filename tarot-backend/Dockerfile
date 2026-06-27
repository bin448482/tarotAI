FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
# System deps for healthcheck and building some wheels
RUN set -eux; \
    # Prefer Aliyun mirrors on CN hosts (ECS) to reduce apt flakiness; safe elsewhere too.
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources; \
    elif [ -f /etc/apt/sources.list ]; then \
      sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list; \
    fi; \
    apt-get update -o Acquire::Retries=5 -o Acquire::ForceIPv4=true; \
    apt-get install -y --no-install-recommends curl build-essential; \
    rm -rf /var/lib/apt/lists/*
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
