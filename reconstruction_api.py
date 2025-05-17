import os
import sys
import json
import time
import uuid
import shutil
import base64
import logging
import subprocess
from pathlib import Path
from threading import Thread
from datetime import datetime

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("reconstruction-api")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Constants
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
MODELS_DIR = os.path.join(DATA_DIR, "models")

# Create directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Jobs storage (in-memory for demo, would use a database in production)
# Structure: {job_id: {status, progress, message, error}}
jobs = {}

def run_reconstruction_pipeline(job_id, image_paths):
    """Run the 3D reconstruction pipeline for the given job"""
    try:
        logger.info(f"Starting reconstruction for job {job_id}")
        job_dir = os.path.join(MODELS_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        # Update job status
        jobs[job_id] = {
            "status": "initializing",
            "progress": 0.05,
            "message": "Initializing reconstruction pipeline",
            "error": None
        }
        
        # Step 1: Prepare images for COLMAP
        update_job_status(job_id, "preprocessing", 0.1, "Preparing images for processing")
        
        # Copy images to job directory
        image_dir = os.path.join(job_dir, "images")
        os.makedirs(image_dir, exist_ok=True)
        for i, img_path in enumerate(image_paths):
            shutil.copy(img_path, os.path.join(image_dir, f"image_{i:04d}.jpg"))
        
        time.sleep(1)  # Simulate processing time
        
        # Step 2: Feature extraction
        update_job_status(job_id, "preprocessing", 0.2, "Extracting features from images")
        time.sleep(2)  # Simulate processing time
        
        # Step 3: Feature matching
        update_job_status(job_id, "reconstructing", 0.4, "Matching features between images")
        time.sleep(2)  # Simulate processing time
        
        # Step 4: Sparse reconstruction
        update_job_status(job_id, "reconstructing", 0.6, "Building sparse point cloud")
        time.sleep(2)  # Simulate processing time
        
        # Step 5: Dense reconstruction
        update_job_status(job_id, "finalizing", 0.8, "Building dense point cloud")
        time.sleep(2)  # Simulate processing time
        
        # Step 6: Mesh generation
        update_job_status(job_id, "finalizing", 0.9, "Creating 3D mesh")
        
        # Create a demo model (in production, this would use COLMAP output)
        # For demo, we'll create a simple OBJ file
        create_demo_model(job_id)
        
        # Mark job as completed
        update_job_status(job_id, "completed", 1.0, "Reconstruction completed successfully")
        logger.info(f"Reconstruction for job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Reconstruction for job {job_id} failed: {str(e)}")
        update_job_status(job_id, "failed", jobs[job_id]["progress"], f"Reconstruction failed: {str(e)}", str(e))

def update_job_status(job_id, status, progress, message, error=None):
    """Update the status of a job"""
    if job_id in jobs:
        jobs[job_id].update({
            "status": status,
            "progress": progress,
            "message": message,
            "error": error
        })

def create_demo_model(job_id):
    """Create a demo 3D model file"""
    model_path = os.path.join(MODELS_DIR, job_id, "model.obj")
    
    # Create a simple cube OBJ
    with open(model_path, 'w') as f:
        f.write("# Simple cube demo model\n")
        f.write("v -1.0 -1.0 -1.0\n")
        f.write("v -1.0 -1.0 1.0\n")
        f.write("v -1.0 1.0 -1.0\n")
        f.write("v -1.0 1.0 1.0\n")
        f.write("v 1.0 -1.0 -1.0\n")
        f.write("v 1.0 -1.0 1.0\n")
        f.write("v 1.0 1.0 -1.0\n")
        f.write("v 1.0 1.0 1.0\n")
        f.write("f 1 2 4 3\n")
        f.write("f 5 6 8 7\n")
        f.write("f 1 2 6 5\n")
        f.write("f 3 4 8 7\n")
        f.write("f 1 3 7 5\n")
        f.write("f 2 4 8 6\n")

def save_image_from_data_url(data_url, output_path):
    """Save an image from a data URL to a file"""
    # Extract base64 data
    _, encoded = data_url.split(",", 1)
    
    # Decode and save
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(encoded))

# Routes
@app.route('/')
def index():
    return jsonify({
        "name": "3D Reconstruction API",
        "version": "1.0.0",
        "status": "running"
    })

@app.route('/api/upload', methods=['POST'])
def upload_images():
    """Handle image uploads for reconstruction"""
    try:
        # Create a new job ID
        job_id = str(uuid.uuid4())
        
        # Create job directories
        job_upload_dir = os.path.join(UPLOAD_DIR, job_id)
        os.makedirs(job_upload_dir, exist_ok=True)
        
        # Get and save images
        image_paths = []
        
        if 'images' in request.files:
            # Handle form-data uploads
            files = request.files.getlist('images')
            for i, file in enumerate(files):
                image_path = os.path.join(job_upload_dir, f"image_{i:04d}.jpg")
                file.save(image_path)
                image_paths.append(image_path)
        elif request.json and 'images' in request.json:
            # Handle data URL uploads
            data_urls = request.json['images']
            for i, data_url in enumerate(data_urls):
                image_path = os.path.join(job_upload_dir, f"image_{i:04d}.jpg")
                save_image_from_data_url(data_url, image_path)
                image_paths.append(image_path)
        
        # Initialize job status
        jobs[job_id] = {
            "status": "pending",
            "progress": 0.0,
            "message": "Job created, waiting to start",
            "error": None
        }
        
        logger.info(f"Created job {job_id} with {len(image_paths)} images")
        
        return jsonify({
            "status": "success",
            "job_id": job_id,
            "message": f"Successfully uploaded {len(image_paths)} images",
            "image_count": len(image_paths)
        })
        
    except Exception as e:
        logger.error(f"Error in upload: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Upload failed: {str(e)}"
        }), 500

@app.route('/api/process', methods=['POST'])
def process_images():
    """Start processing images for a job"""
    try:
        data = request.json
        job_id = data.get('jobId')
        
        if not job_id:
            return jsonify({
                "status": "error",
                "message": "Missing job ID"
            }), 400
        
        # Check if job exists
        job_upload_dir = os.path.join(UPLOAD_DIR, job_id)
        if not os.path.exists(job_upload_dir):
            return jsonify({
                "status": "error",
                "message": f"Job {job_id} not found"
            }), 404
        
        # Get image paths
        image_paths = [os.path.join(job_upload_dir, f) for f in os.listdir(job_upload_dir) 
                      if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        if not image_paths:
            return jsonify({
                "status": "error", 
                "message": "No images found for this job"
            }), 400
        
        # Start reconstruction in background thread
        thread = Thread(target=run_reconstruction_pipeline, args=(job_id, image_paths))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "status": "success",
            "job_id": job_id,
            "message": "Processing started",
            "estimated_time": len(image_paths) * 2
        })
        
    except Exception as e:
        logger.error(f"Error starting processing: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to start processing: {str(e)}"
        }), 500

@app.route('/api/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get the status of a job"""
    if job_id not in jobs:
        return jsonify({
            "status": "error",
            "message": f"Job {job_id} not found"
        }), 404
    
    job = jobs[job_id]
    return jsonify({
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "error": job["error"]
    })

@app.route('/api/models/<job_id>', methods=['GET'])
def get_model(job_id):
    """Get the 3D model for a job"""
    model_dir = os.path.join(MODELS_DIR, job_id)
    model_path = os.path.join(model_dir, "model.obj")
    
    if not os.path.exists(model_path):
        return jsonify({
            "status": "error",
            "message": f"Model for job {job_id} not found"
        }), 404
    
    return send_file(model_path, mimetype='model/obj')

if __name__ == '__main__':
    # Add an option to specify port
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    
    print(f"Starting 3D Reconstruction API server on port {port}")
    print(f"Data directory: {DATA_DIR}")
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Models directory: {MODELS_DIR}")
    
    app.run(host='0.0.0.0', port=port, debug=True) 