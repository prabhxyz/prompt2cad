#!/bin/bash
set -e

echo "========================================================="
echo "Prompt2CAD 3D Reconstruction API Server Setup"
echo "========================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python not found! Please install Python 3.8 or higher."
    echo "Visit https://www.python.org/downloads/ to download Python."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "[INFO] Detected Python version: $PYTHON_VERSION"

# Create data directories if they don't exist
mkdir -p data/uploads
mkdir -p data/models

echo "[INFO] Checking and installing required dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies!"
    exit 1
fi

echo "[SUCCESS] Dependencies installed successfully."
echo ""
echo "========================================================="
echo "Starting 3D Reconstruction API server..."
echo "========================================================="
echo ""
echo "The server will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server when you're done."
echo ""

# Start the server
python3 reconstruction_api.py

# Check if server started successfully
if [ $? -ne 0 ]; then
    echo "[ERROR] Server failed to start!"
    echo "Check the error message above for details."
    exit 1
fi 