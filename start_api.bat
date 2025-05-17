@echo off
echo =========================================================
echo Prompt2CAD 3D Reconstruction API Server Setup
echo =========================================================

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found! Please install Python 3.8 or higher.
    echo Visit https://www.python.org/downloads/ to download Python.
    pause
    exit /b 1
)

:: Check Python version
for /f "tokens=2" %%a in ('python --version 2^>^&1') do set PYTHON_VERSION=%%a
echo [INFO] Detected Python version: %PYTHON_VERSION%

:: Create data directories if they don't exist
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\models" mkdir data\models

echo [INFO] Checking and installing required dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed successfully.
echo.
echo =========================================================
echo Starting 3D Reconstruction API server...
echo =========================================================
echo.
echo The server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

python reconstruction_api.py

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server failed to start!
    echo Check the error message above for details.
    pause
    exit /b 1
)

pause 