FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    libgomp1 \
    curl \
    # WeasyPrint deps
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
# Copy requirements files
COPY requirements.txt .
COPY requirements.dev.txt .
# For quick local dev builds skip heavy ML packages by installing a smaller dev requirements file
RUN if [ -f requirements.dev.txt ]; then pip install --no-cache-dir -r requirements.dev.txt; else pip install --no-cache-dir -r requirements.txt; fi

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads models temp

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application. For quick local testing we skip alembic migrations
# and rely on the app to create tables in development via SQLAlchemy metadata.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
