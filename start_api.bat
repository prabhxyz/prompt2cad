@echo off
echo Installing requirements...
pip install -r requirements.txt

echo Starting 3D Reconstruction API server...
python reconstruction_api.py

pause 