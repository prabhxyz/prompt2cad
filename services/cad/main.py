import os
import time
import json
import uuid
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

import numpy as np
import trimesh
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

from llm import LlamaModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cad-service")

# Initialize FastAPI app
app = FastAPI(title="CAD Generation Service")

# Constants
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
MODEL_PATH = os.environ.get("MODEL_PATH", "/app/models/gemma-2b.gguf")
ENABLE_CPU_OPTIMIZATION = os.environ.get("ENABLE_CPU_OPTIMIZATION", "false").lower() == "true"

# Initialize LLM
llm = LlamaModel(MODEL_PATH)

# Models
class CADGenerationRequest(BaseModel):
    meshId: str
    prompt: str
    dimensions: Dict[str, float]

class CADGenerationResponse(BaseModel):
    cadId: str
    status: str
    modelUrl: Optional[str] = None
    sourceUrl: Optional[str] = None
    error: Optional[str] = None

# Helper functions
def get_cad_dir() -> Path:
    """Get the directory path for CAD files"""
    path = Path(DATA_DIR) / "cad"
    path.mkdir(exist_ok=True, parents=True)
    return path

def get_mesh_path(mesh_id: str) -> Path:
    """Get the path to the mesh file"""
    return Path(DATA_DIR) / mesh_id / "object.glb"

def generate_jscad(prompt: str, dimensions: Dict[str, float], cad_id: str) -> str:
    """Generate OpenJSCAD code using LLM"""
    context = f"""
You are a CAD designer that generates OpenJSCAD code to create accessories for 3D scanned objects.

The user has scanned an object with these dimensions:
- Width: {dimensions.get('width', 0)} mm
- Height: {dimensions.get('height', 0)} mm
- Depth: {dimensions.get('depth', 0)} mm

The user wants: {prompt}

Your task:
1. Generate clean, valid OpenJSCAD code that creates a parametric design
2. The design should fit the dimensions of the scanned object
3. Create a main() function that returns the final CSG object
4. Use proper parameters for customization

Only respond with the OpenJSCAD code and no other text.
"""
    
    # Generate code with LLM
    jscad_code = llm.generate(context)
    
    # Save the JSCAD code to file
    cad_dir = get_cad_dir()
    jscad_path = cad_dir / f"{cad_id}.jscad"
    
    with open(jscad_path, "w") as f:
        f.write(jscad_code)
    
    return jscad_code

def run_jscad_to_stl(cad_id: str) -> bool:
    """Run OpenJSCAD to convert JSCAD to STL"""
    try:
        cad_dir = get_cad_dir()
        jscad_path = cad_dir / f"{cad_id}.jscad"
        stl_path = cad_dir / f"{cad_id}.stl"
        
        # Run jscad CLI to convert to STL
        result = subprocess.run(
            ["jscad", str(jscad_path), "-o", str(stl_path)],
            capture_output=True,
            text=True,
            check=True
        )
        
        logger.info(f"JSCAD conversion completed: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"JSCAD conversion failed: {e.stderr}")
        return False

def generate_demo_jscad(dimensions: Dict[str, float], cad_id: str) -> str:
    """Generate a demo JSCAD file for development/testing"""
    width = dimensions.get('width', 100)
    height = dimensions.get('height', 80)
    depth = dimensions.get('depth', 50)
    
    jscad_code = f"""// OpenJSCAD source for generated model
function main() {{
  const dimensions = {{
    width: {width},
    height: {height},
    depth: {depth}
  }};
  
  // Create a parametric design based on scanned object
  const case = createCase(dimensions);
  
  return case;
}}

// Create a case that wraps around the object with a small offset
function createCase(dimensions) {{
  const offset = 3; // 3mm wall thickness
  
  return CSG.cube({{
    center: [0, 0, 0],
    radius: [
      dimensions.width/2 + offset,
      dimensions.height/2 + offset,
      dimensions.depth/2 + offset
    ]
  }}).subtract(
    CSG.cube({{
      center: [0, 0, offset/2], // Shift slightly to create a base
      radius: [
        dimensions.width/2,
        dimensions.height/2,
        dimensions.depth/2
      ]
    }})
  );
}}"""
    
    # Save the JSCAD code to file
    cad_dir = get_cad_dir()
    jscad_path = cad_dir / f"{cad_id}.jscad"
    
    with open(jscad_path, "w") as f:
        f.write(jscad_code)
    
    return jscad_code

def generate_demo_stl(cad_id: str) -> bool:
    """Generate a demo STL file for development/testing"""
    try:
        cad_dir = get_cad_dir()
        stl_path = cad_dir / f"{cad_id}.stl"
        
        # Create a simple box mesh
        mesh = trimesh.creation.box(extents=[100, 80, 50])
        mesh.export(str(stl_path))
        
        return True
    except Exception as e:
        logger.error(f"STL generation failed: {e}")
        return False

# Endpoints
@app.get("/")
def read_root():
    return {"message": "CAD Generation Service API", "version": "0.1.0"}

@app.post("/generate", response_model=CADGenerationResponse)
async def generate_cad(request: CADGenerationRequest):
    mesh_id = request.meshId
    prompt = request.prompt
    dimensions = request.dimensions
    
    # Generate a unique ID for this CAD model
    cad_id = f"cad-{mesh_id}-{uuid.uuid4().hex[:8]}"
    
    try:
        # Check if the mesh exists
        mesh_path = get_mesh_path(mesh_id)
        if not mesh_path.exists() and mesh_id != 'demo':
            raise HTTPException(status_code=404, detail=f"Mesh {mesh_id} not found")
        
        # Generate JSCAD code (use demo for development/testing)
        # In production, use: jscad_code = generate_jscad(prompt, dimensions, cad_id)
        jscad_code = generate_demo_jscad(dimensions, cad_id)
        
        # Convert JSCAD to STL (use demo for development/testing)
        # In production, use: success = run_jscad_to_stl(cad_id)
        success = generate_demo_stl(cad_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to generate STL file")
        
        # Generate URLs
        model_url = f"/data/cad/{cad_id}.stl"
        source_url = f"/data/cad/{cad_id}.jscad"
        
        return CADGenerationResponse(
            cadId=cad_id,
            status="completed",
            modelUrl=model_url,
            sourceUrl=source_url
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CAD generation error: {str(e)}")
        return CADGenerationResponse(
            cadId=cad_id,
            status="failed",
            error=str(e)
        )

@app.get("/health")
def health_check():
    return {"status": "ok"} 