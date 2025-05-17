#!/bin/bash
set -e

INSTALL_DIR=/app/deps

# Only build if the deps directory doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    echo "First run: Setting up dependencies..."
    mkdir -p $INSTALL_DIR
    
    # Download and install COLMAP (from source to ensure compatibility)
    cd $INSTALL_DIR
    git clone https://github.com/colmap/colmap.git
    cd colmap
    mkdir build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$INSTALL_DIR
    make -j$(nproc)
    make install
    
    # Download and build OpenMVS
    cd $INSTALL_DIR
    git clone https://github.com/cdcseacave/openMVS.git
    cd openMVS
    mkdir build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$INSTALL_DIR -DVCG_ROOT=$INSTALL_DIR/vcglib
    make -j$(nproc)
    make install
    
    echo "Dependencies installed successfully!"
fi

# Start the FastAPI application
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8000 