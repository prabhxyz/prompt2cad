# Prompt2CAD with Local 3D Reconstruction API

This application converts real-world objects into 3D CAD models by first reconstructing a 3D mesh from photos and then generating parametric CAD models.

## System Architecture

The system consists of two main components:

1. **Frontend**: A React application that provides the user interface for taking photos, processing them, and designing CAD models.
2. **Local 3D Reconstruction API**: A Python Flask server that processes images and creates 3D models.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- Python (3.8 or higher)
- pip (Python package manager)

### Starting the 3D Reconstruction API

1. For Windows users:
   ```bash
   start_api.bat
   ```

2. For macOS/Linux users:
   ```bash
   chmod +x start_api.sh
   ./start_api.sh
   ```

This will:
- Install the required Python dependencies
- Start the API server on port 5000

### Starting the Frontend

From another terminal:

```bash
cd frontend
npm install
npm run dev
```

This will start the frontend development server (typically on port 3000 or 5173).

## Using the Application

1. Open the application in your browser.
2. Follow the scanning wizard to capture multiple images of your object.
3. The processing page will show the reconstruction progress.
4. Once complete, you'll be taken to the Design Studio where you can customize your 3D model.

## Troubleshooting

- If the 3D model doesn't appear after processing, check the Python API server logs for errors.
- Make sure your firewall allows connections to the local API server (port 5000).
- If you get CORS errors, verify that the Flask server is properly configured with CORS enabled.

## Technical Details

- The 3D reconstruction uses photogrammetry techniques to create 3D meshes from 2D images.
- The API server creates a simple demo 3D model for testing purposes. In a production setup, it would use COLMAP or another photogrammetry tool to create accurate 3D reconstructions.
- The frontend communicates with the API via HTTP requests for uploading images and checking processing status. 