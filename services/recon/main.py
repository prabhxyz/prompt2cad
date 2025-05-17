import os
import time
import json
import uuid
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

import trimesh
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("recon-service")

# Initialize FastAPI app
app = FastAPI(title="Reconstruction Service")

# Constants
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
ENABLE_CPU_OPTIMIZATION = os.environ.get("ENABLE_CPU_OPTIMIZATION", "false").lower() == "true"

# Jobs storage (in-memory for demo, would use Redis or similar in production)
# Structure: {job_id: {status, progress, message, error, mesh_url}}
jobs = {}

# Models
class ReconstructionRequest(BaseModel):
    jobId: str
    imageCount: int

class ReconstructionStatus(BaseModel):
    jobId: str
    status: str
    progress: float
    message: str
    meshUrl: Optional[str] = None
    error: Optional[str] = None

# Helper functions
def get_job_dir(job_id: str) -> Path:
    """Get the directory path for a specific job"""
    return Path(DATA_DIR) / job_id

def run_photogrammetry_pipeline(job_id: str):
    """Run the photogrammetry pipeline for a specific job"""
    try:
        job_dir = get_job_dir(job_id)
        
        if not job_dir.exists():
            raise Exception(f"Job directory {job_dir} does not exist")
        
        # Update job status
        jobs[job_id] = {
            "status": "processing",
            "progress": 5.0,
            "message": "Starting photogrammetry pipeline",
            "error": None,
            "mesh_url": None
        }
        
        # In a real implementation, this would use subprocess to run COLMAP and OpenMVS
        # Here, we'll simulate the pipeline
        
        # Step 1: Feature extraction (20% of progress)
        logger.info(f"Job {job_id}: Starting feature extraction")
        jobs[job_id]["message"] = "Extracting features from images"
        jobs[job_id]["progress"] = 10.0
        # Simulate processing time
        time.sleep(2)
        
        # Step 2: Feature matching (40% of progress)
        logger.info(f"Job {job_id}: Starting feature matching")
        jobs[job_id]["message"] = "Matching features between images"
        jobs[job_id]["progress"] = 30.0
        # Simulate processing time
        time.sleep(2)
        
        # Step 3: Sparse reconstruction (60% of progress)
        logger.info(f"Job {job_id}: Starting sparse reconstruction")
        jobs[job_id]["message"] = "Building sparse point cloud"
        jobs[job_id]["progress"] = 50.0
        # Simulate processing time
        time.sleep(2)
        
        # Step 4: Dense reconstruction (80% of progress)
        logger.info(f"Job {job_id}: Starting dense reconstruction")
        jobs[job_id]["message"] = "Building dense point cloud"
        jobs[job_id]["progress"] = 70.0
        # Simulate processing time
        time.sleep(2)
        
        # Step 5: Mesh generation (90% of progress)
        logger.info(f"Job {job_id}: Generating mesh")
        jobs[job_id]["message"] = "Creating 3D mesh from point cloud"
        jobs[job_id]["progress"] = 85.0
        # Simulate processing time
        time.sleep(2)
        
        # Step 6: Mesh cleanup and export (100% of progress)
        logger.info(f"Job {job_id}: Finalizing mesh")
        jobs[job_id]["message"] = "Optimizing and exporting mesh"
        jobs[job_id]["progress"] = 95.0
        
        # Create a demo sphere mesh
        mesh = trimesh.creation.icosphere(subdivisions=3, radius=50.0)
        
        # Save mesh as GLB
        mesh_path = job_dir / "object.glb"
        mesh.export(mesh_path)
        
        # Update job status
        mesh_url = f"/data/{job_id}/object.glb"
        jobs[job_id] = {
            "status": "completed",
            "progress": 100.0,
            "message": "Reconstruction completed successfully",
            "error": None,
            "mesh_url": mesh_url
        }
        
        logger.info(f"Job {job_id}: Completed successfully")
    except Exception as e:
        logger.error(f"Job {job_id}: Failed with error {str(e)}")
        jobs[job_id] = {
            "status": "failed",
            "progress": jobs[job_id]["progress"] if job_id in jobs else 0.0,
            "message": "Reconstruction failed",
            "error": str(e),
            "mesh_url": None
        }

# Endpoints
@app.get("/")
def read_root():
    return {"message": "Reconstruction Service API", "version": "0.1.0"}

@app.post("/reconstruct", response_model=ReconstructionStatus)
def start_reconstruction(request: ReconstructionRequest, background_tasks: BackgroundTasks):
    job_id = request.jobId
    
    # Check if job already exists
    if job_id in jobs:
        return ReconstructionStatus(
            jobId=job_id,
            status=jobs[job_id]["status"],
            progress=jobs[job_id]["progress"],
            message=jobs[job_id]["message"],
            meshUrl=jobs[job_id].get("mesh_url"),
            error=jobs[job_id].get("error")
        )
    
    # Initialize job status
    jobs[job_id] = {
        "status": "pending",
        "progress": 0.0,
        "message": "Job queued for processing",
        "error": None,
        "mesh_url": None
    }
    
    # Start reconstruction in background
    background_tasks.add_task(run_photogrammetry_pipeline, job_id)
    
    return ReconstructionStatus(
        jobId=job_id,
        status="pending",
        progress=0.0,
        message="Job queued for processing",
        meshUrl=None,
        error=None
    )

@app.get("/status/{job_id}", response_model=ReconstructionStatus)
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    job = jobs[job_id]
    
    return ReconstructionStatus(
        jobId=job_id,
        status=job["status"],
        progress=job["progress"],
        message=job["message"],
        meshUrl=job.get("mesh_url"),
        error=job.get("error")
    )

@app.get("/health")
def health_check():
    return {"status": "ok"} 