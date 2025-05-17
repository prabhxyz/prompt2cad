FROM python:3.10-slim-buster

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    build-essential \
    cmake \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g @jscad/cli

# Create directories
RUN mkdir -p /app/data /app/cache

# Install Python dependencies - replaced llama-cpp-python with requests
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    python-multipart \
    aiofiles \
    requests \
    trimesh \
    numpy

# Copy application code
COPY . .

EXPOSE 8001

# Start the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"] 