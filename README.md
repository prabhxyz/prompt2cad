# Prompt2CAD 3D Reconstruction System

This application converts real-world objects into 3D CAD models by taking photos, reconstructing a 3D mesh, and generating parametric CAD models.

## System Architecture

The system consists of two essential components that must both be running:

1. **Frontend (React)**: The user interface for capturing images, visualizing models, and CAD design
2. **Backend (Python Flask API)**: Handles 3D reconstruction processing

## Detailed Setup Guide

### Prerequisites

- Node.js 14+ (for frontend): [Download Node.js](https://nodejs.org/)
- Python 3.8+ (for backend): [Download Python](https://www.python.org/downloads/)
- pip (Python package manager)
- Git (optional): [Download Git](https://git-scm.com/downloads)

### Step 1: Clone or Download the Repository

```bash
git clone https://github.com/your-username/prompt2cad.git
# OR download and extract the ZIP file
cd prompt2cad
```

### Step 2: Set Up and Start the Backend

The backend must be running before you start using the frontend.

#### Windows Setup:

1. Open Command Prompt or PowerShell
2. Navigate to the project directory:
   ```
   cd path\to\prompt2cad
   ```
3. Run the setup script:
   ```
   start_api.bat
   ```
   
This will:
- Install required Python packages
- Create necessary directories
- Start the Flask server on port 5000

#### macOS/Linux Setup:

1. Open Terminal
2. Navigate to the project directory:
   ```
   cd path/to/prompt2cad
   ```
3. Make the script executable and run it:
   ```
   chmod +x start_api.sh
   ./start_api.sh
   ```

#### Manual Backend Setup (All Platforms):

If the scripts don't work, follow these manual steps:

1. Create and activate a virtual environment (recommended):
   ```
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Start the Flask server:
   ```
   python reconstruction_api.py
   ```

4. Verify the backend is running by visiting http://localhost:5000 in your browser. You should see a JSON response with API status.

### Step 3: Set Up and Start the Frontend

In a separate terminal window:

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. The terminal will show a URL (typically http://localhost:5173 or http://localhost:3000). Open this URL in your web browser.

## Code Explanation

### Backend (reconstruction_api.py)

The backend is a Flask server that handles:

1. **Image Uploads**: Accepts images via REST API endpoints
2. **3D Reconstruction**: Processes images to create 3D models
3. **Status Tracking**: Provides progress updates
4. **Model Serving**: Delivers the final 3D model to the frontend

Key components:

- **Flask API Routes**:
  - `/api/upload`: Receives and stores images
  - `/api/process`: Starts the reconstruction process
  - `/api/status/<job_id>`: Reports progress
  - `/api/models/<job_id>`: Serves the final 3D model

- **Reconstruction Pipeline**:
  The `run_reconstruction_pipeline` function processes images through:
  - Image preparation
  - Feature extraction
  - Feature matching
  - Sparse reconstruction
  - Dense reconstruction
  - Mesh generation

### Frontend (client.js)

The frontend communicates with the backend through:

1. **uploadImages**: Sends images to the server
2. **subscribeToReconstructionProgress**: Monitors processing status
3. **processImages**: Initiates the reconstruction process

## Troubleshooting

### Backend Issues

1. **Backend Not Starting:**
   - Check Python is installed correctly: `python --version`
   - Ensure required ports are not in use: `netstat -ano | findstr 5000` (Windows) or `lsof -i:5000` (macOS/Linux)
   - Check for error messages in the terminal

2. **Dependency Issues:**
   - Make sure pip is installed
   - Try running `pip install -r requirements.txt` manually
   - Check for error messages during installation

3. **Access Issues:**
   - Ensure firewall is not blocking connections
   - Try accessing http://localhost:5000 directly to verify the API is running

### Frontend Issues

1. **Frontend Not Starting:**
   - Check Node.js is installed correctly: `node --version`
   - Try deleting `node_modules` and running `npm install` again
   - Check for error messages in the terminal

2. **Connection Errors:**
   - Ensure backend is running first
   - Check browser console for CORS or connection errors
   - Verify API URLs in the frontend code match the backend location

3. **Image Processing Issues:**
   - Make sure images are properly captured
   - Check browser console for upload errors
   - Verify the backend logs for processing errors

## Removing Mock Components

If you want to implement actual 3D reconstruction instead of the demo cube model:

1. Install additional dependencies for 3D reconstruction:
   ```
   pip install opencv-python trimesh
   ```

2. Modify the backend to use real photogrammetry techniques
3. Update the client.js file to handle real processing times

## Reference: File Structure

```
prompt2cad/
├── frontend/                # React frontend
│   ├── src/                 # Source code
│   │   ├── api/             # API client code
│   │   │   └── client.js    # Backend communication
│   │   ├── components/      # React components
│   │   └── pages/           # Page components
│   └── package.json         # Frontend dependencies
├── reconstruction_api.py    # Backend Flask server
├── requirements.txt         # Python dependencies
├── start_api.bat            # Windows startup script
├── start_api.sh             # macOS/Linux startup script
└── README.md                # This file
``` 