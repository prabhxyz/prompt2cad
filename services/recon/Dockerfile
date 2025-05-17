FROM python:3.10-slim-buster

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libboost-all-dev \
    libeigen3-dev \
    libfmt-dev \
    libgflags-dev \
    libgoogle-glog-dev \
    libsuitesparse-dev \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install COLMAP dependencies
RUN pip install --no-cache-dir \
    numpy \
    scipy \
    matplotlib \
    opencv-python-headless \
    trimesh \
    fastapi \
    uvicorn \
    python-multipart \
    aiofiles \
    requests

# Add a script to download and build OpenMVS when the container starts
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy application code
COPY . .

EXPOSE 8000

# Use entrypoint script to handle download/build steps first time
CMD ["/app/entrypoint.sh"] 