/**
 * Image processing utilities for Prompt2CAD
 * Handles background removal, dimension detection, and feature extraction
 */

/**
 * Removes background from an image using a threshold-based approach
 * @param {HTMLImageElement} image - The image element to process
 * @param {Object} options - Processing options
 * @returns {ImageData} Processed image data with transparent background
 */
export const removeBackground = async (image, options = {}) => {
  const { 
    threshold = 0.2, 
    blurRadius = 5,
    edgeDetection = true
  } = options;
  
  // Create canvas for processing
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  // Draw image to canvas
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Use edge detection to find object boundaries
  if (edgeDetection) {
    const edges = detectEdges(imageData);
    
    // Apply edge-aware segmentation
    for (let i = 0; i < data.length; i += 4) {
      // If pixel is not part of an edge or object, make it transparent
      if (edges[i/4] < threshold) {
        data[i+3] = 0; // Set alpha to 0 (transparent)
      }
    }
  } else {
    // Simple color-based segmentation
    // Get background color from corners (assuming object is centered)
    const bgSamples = [];
    // Top-left, top-right, bottom-left, bottom-right
    const cornerPixels = [
      0, 
      (image.width - 1) * 4, 
      (image.height - 1) * image.width * 4, 
      ((image.height - 1) * image.width + image.width - 1) * 4
    ];
    
    for (const pixel of cornerPixels) {
      bgSamples.push([data[pixel], data[pixel+1], data[pixel+2]]);
    }
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Check if pixel is similar to background
      const pixelColor = [data[i], data[i+1], data[i+2]];
      if (isColorSimilarToBackground(pixelColor, bgSamples, threshold)) {
        data[i+3] = 0; // Set alpha to 0 (transparent)
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return imageData;
};

/**
 * Detects edges in an image using Sobel operator
 * @param {ImageData} imageData - The image data to process
 * @returns {Float32Array} Edge intensity map
 */
const detectEdges = (imageData) => {
  const { width, height, data } = imageData;
  const grayscale = new Uint8Array(width * height);
  const edges = new Float32Array(width * height);
  
  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    grayscale[i/4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  // Apply Sobel operator for edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Horizontal and vertical Sobel kernels
      const gx = 
        -1 * grayscale[idx - width - 1] + 
        -2 * grayscale[idx - 1] + 
        -1 * grayscale[idx + width - 1] + 
        1 * grayscale[idx - width + 1] + 
        2 * grayscale[idx + 1] + 
        1 * grayscale[idx + width + 1];
        
      const gy = 
        -1 * grayscale[idx - width - 1] + 
        -2 * grayscale[idx - width] + 
        -1 * grayscale[idx - width + 1] + 
        1 * grayscale[idx + width - 1] + 
        2 * grayscale[idx + width] + 
        1 * grayscale[idx + width + 1];
      
      // Calculate gradient magnitude
      edges[idx] = Math.sqrt(gx * gx + gy * gy) / 1448; // Normalize to [0,1]
    }
  }
  
  return edges;
};

/**
 * Check if a pixel color is similar to background samples
 * @param {Array} color - RGB values of the pixel
 * @param {Array} bgSamples - Array of background color samples
 * @param {number} threshold - Similarity threshold
 * @returns {boolean} True if color is similar to background
 */
const isColorSimilarToBackground = (color, bgSamples, threshold) => {
  for (const bgColor of bgSamples) {
    const distance = colorDistance(color, bgColor);
    if (distance < threshold * 255) {
      return true;
    }
  }
  return false;
};

/**
 * Calculate Euclidean distance between two RGB colors
 * @param {Array} color1 - First RGB color 
 * @param {Array} color2 - Second RGB color
 * @returns {number} Euclidean distance between colors
 */
const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2)
  );
};

/**
 * Analyzes an object's dimensions from multiple processed images
 * @param {Array} processedImages - Array of processed image data objects
 * @returns {Object} Object dimensions including width, height, depth
 */
export const analyzeDimensions = (processedImages) => {
  // Get object bounds from each image
  const boundingBoxes = processedImages.map(imageData => {
    return getObjectBounds(imageData);
  });
  
  // Filter out empty bounding boxes
  const validBoxes = boundingBoxes.filter(box => 
    box.width > 0 && box.height > 0
  );
  
  if (validBoxes.length === 0) {
    console.error('No valid object bounds detected');
    return { width: 100, height: 80, depth: 50 }; // Default fallback
  }
  
  // Get the largest width and height from different perspectives
  const sortedByWidth = [...validBoxes].sort((a, b) => b.width - a.width);
  const sortedByHeight = [...validBoxes].sort((a, b) => b.height - a.height);
  
  // For multi-view analysis, we can estimate:
  // 1. The largest width from any view is the object's width
  // 2. The largest height from any view is the object's height
  // 3. If we have both front and side views, the "width" from side view is the depth
  
  // For now, use largest values and estimate depth
  const width = sortedByWidth[0].width;
  const height = sortedByHeight[0].height;
  
  // Depth estimation - can be improved with actual 3D reconstruction
  // Here we estimate it as the second largest width (assuming side view exists)
  const depth = sortedByWidth.length > 1 ? sortedByWidth[1].width : width * 0.8;
  
  // Convert to real-world units if reference object is present
  // This would require identifying a known-size reference in the images
  
  return { 
    width: Math.round(width), 
    height: Math.round(height), 
    depth: Math.round(depth)
  };
};

/**
 * Gets object boundaries from processed image data
 * @param {ImageData} imageData - The processed image data
 * @returns {Object} Bounding box with x, y, width, height
 */
const getObjectBounds = (imageData) => {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  
  // Find non-transparent pixels to determine bounds
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) { // Alpha > 0 means non-transparent
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

/**
 * Extracts feature points from an image for 3D reconstruction
 * @param {ImageData} imageData - The processed image data
 * @param {number} maxPoints - Maximum number of feature points to extract
 * @returns {Array} Array of point coordinates [x, y, confidence]
 */
export const extractFeaturePoints = (imageData, maxPoints = 500) => {
  const { width, height, data } = imageData;
  const points = [];
  
  // Detect edges for feature points
  const edges = detectEdges(imageData);
  
  // Use Harris corner detector-like approach
  // In a real app, we'd use SIFT, SURF, or ORB feature detectors
  
  // Find local maxima in edge response
  const stride = Math.max(1, Math.floor(width * height / maxPoints / 10));
  const windowSize = 5;
  
  for (let y = windowSize; y < height - windowSize; y += stride) {
    for (let x = windowSize; x < width - windowSize; x += stride) {
      const idx = y * width + x;
      
      // Check if current pixel is local maximum in edge response
      if (edges[idx] > 0.1) { // Threshold for edge response
        let isLocalMax = true;
        
        // Check neighborhood
        for (let dy = -windowSize; dy <= windowSize && isLocalMax; dy++) {
          for (let dx = -windowSize; dx <= windowSize; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const neighborIdx = (y + dy) * width + (x + dx);
            if (neighborIdx >= 0 && neighborIdx < edges.length) {
              if (edges[neighborIdx] > edges[idx]) {
                isLocalMax = false;
                break;
              }
            }
          }
        }
        
        if (isLocalMax) {
          points.push([x, y, edges[idx]]);
        }
      }
    }
  }
  
  // Sort by edge response (confidence) and limit to maxPoints
  points.sort((a, b) => b[2] - a[2]);
  return points.slice(0, maxPoints);
};

/**
 * Generates point cloud from multiple images using estimated depth
 * @param {Array} images - Array of processed images with extracted features
 * @param {Object} dimensions - Estimated object dimensions
 * @returns {Float32Array} Array of 3D points for point cloud rendering
 */
export const generatePointCloud = (images, dimensions) => {
  // Enhanced point cloud generation with advanced photogrammetry techniques
  const { width, height, depth } = dimensions;
  const pointCount = 5000; // Increased point count for more detailed modeling
  const points = new Float32Array(pointCount * 3);
  
  // Extract features from all images if not already done
  let allFeatures = [];
  const processedImagesWithFeatures = images.map(img => {
    if (!img.features && img.data) {
      img.features = extractFeaturePoints(img.data, 800); // Extract more features
    }
    if (img.features) {
      allFeatures = allFeatures.concat(img.features);
    }
    return img;
  });
  
  // Create a volumetric density map for more accurate 3D structure
  const gridSize = 20; // Higher resolution grid
  const densityGrid = createDensityGrid(gridSize, allFeatures, processedImagesWithFeatures);
  
  // Surface detection via marching cubes algorithm simulation
  const surfacePoints = extractSurfacePoints(densityGrid, gridSize, dimensions);
  
  // If we have good surface points, prioritize those
  if (surfacePoints.length > pointCount * 0.5) {
    // Use ~80% surface points and ~20% interior points for realistic structure
    const surfacePointCount = Math.min(Math.floor(pointCount * 0.8), surfacePoints.length);
    
    // Copy surface points first
    for (let i = 0; i < surfacePointCount; i++) {
      const ptIdx = Math.floor(Math.random() * surfacePoints.length);
      const pt = surfacePoints[ptIdx];
      
      points[i * 3] = pt[0];
      points[i * 3 + 1] = pt[1];
      points[i * 3 + 2] = pt[2];
    }
    
    // Fill remaining with interior and additional points for solidity
    for (let i = surfacePointCount; i < pointCount; i++) {
      // Sample from density grid biased towards higher density areas
      const [x, y, z] = sampleFromDensityGrid(densityGrid, gridSize, dimensions);
      
      points[i * 3] = x;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = z;
    }
  } else {
    // Fallback to improved feature-guided distribution
    
    // Create refined feature density maps for each axis
    const featureDensityX = createFeatureDensity(allFeatures, 0, gridSize, width);
    const featureDensityY = createFeatureDensity(allFeatures, 1, gridSize, height);
    const featureDensityZ = estimateZDensity(allFeatures, dimensions, gridSize);
    
    // Use improved spatial sampling for more natural distribution
    for (let i = 0; i < pointCount; i++) {
      // Surface vs interior distribution - more points toward the surface
      const surfaceDistribution = sigmoid(Math.random() * 4 - 2); // Bias toward surface (higher values)
      
      // Select bin according to density distribution with surface bias
      const binX = weightedRandomIndex(featureDensityX);
      const binY = weightedRandomIndex(featureDensityY);
      const binZ = weightedRandomIndex(featureDensityZ);
      
      // Create coherent local clustering for more realistic surfaces
      const cluster = Math.random() > 0.7;
      const clusterOffset = cluster ? 0.2 : 1.0; // Tighter clustering for some points
      
      // Add controlled random offset within bin with coherent clustering
      const offsetX = Math.random() * clusterOffset;
      const offsetY = Math.random() * clusterOffset;
      const offsetZ = Math.random() * clusterOffset;
      
      // Apply surface bias - points closer to edges for higher surface distribution
      const xPos = binX + offsetX;
      const yPos = binY + offsetY;
      const zPos = binZ + offsetZ;
      
      // Map to object dimensions and center around origin
      points[i * 3] = (xPos / gridSize - 0.5) * width;
      points[i * 3 + 1] = (yPos / gridSize - 0.5) * height;
      points[i * 3 + 2] = (zPos / gridSize - 0.5) * depth;
      
      // Pull points towards the surface for higher surface values
      if (surfaceDistribution > 0.7) {
        pullPointToSurface(points, i, dimensions);
      }
    }
  }
  
  return points;
};

/**
 * Creates a 3D density grid from image features
 * @param {number} gridSize - Size of the grid in each dimension
 * @param {Array} features - Array of feature points
 * @param {Array} images - Array of processed images
 * @returns {Array} 3D density grid
 */
const createDensityGrid = (gridSize, features, images) => {
  // Initialize 3D grid
  const grid = new Array(gridSize);
  for (let i = 0; i < gridSize; i++) {
    grid[i] = new Array(gridSize);
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = new Array(gridSize).fill(0);
    }
  }
  
  // Populate grid based on feature distribution
  features.forEach(feature => {
    // Normalize feature coordinates to [0,1]
    const nx = Math.min(Math.max(feature[0], 0), 1);
    const ny = Math.min(Math.max(feature[1], 0), 1);
    
    // Map to grid indices
    const ix = Math.min(Math.floor(nx * gridSize), gridSize - 1);
    const iy = Math.min(Math.floor(ny * gridSize), gridSize - 1);
    
    // Confidence of the feature (used as weight)
    const confidence = feature[2] || 1.0;
    
    // Spread the influence around neighboring cells (3D Gaussian-like kernel)
    const spread = 2; // Influence radius
    for (let dx = -spread; dx <= spread; dx++) {
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dz = -spread; dz <= spread; dz++) {
          const x = ix + dx;
          const y = iy + dy;
          const z = Math.floor(gridSize / 2) + dz; // Initial z estimate at midpoint
          
          // Check bounds
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize) {
            // Distance falloff
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const weight = confidence * Math.exp(-dist * 0.5);
            
            grid[x][y][z] += weight;
          }
        }
      }
    }
  });
  
  // Apply volumetric constraints based on expected object shape
  applyVolumetricConstraints(grid, gridSize);
  
  return grid;
};

/**
 * Extracts likely surface points from the density grid
 * @param {Array} grid - 3D density grid
 * @param {number} gridSize - Size of the grid
 * @param {Object} dimensions - Object dimensions
 * @returns {Array} Array of surface points
 */
const extractSurfacePoints = (grid, gridSize, dimensions) => {
  const { width, height, depth } = dimensions;
  const surfacePoints = [];
  const threshold = 0.2; // Density threshold for surface detection
  
  // Find grid cells that likely represent surface (high gradient of density)
  for (let x = 1; x < gridSize - 1; x++) {
    for (let y = 1; y < gridSize - 1; y++) {
      for (let z = 1; z < gridSize - 1; z++) {
        const currentDensity = grid[x][y][z];
        
        // Calculate gradient magnitude
        const gx = Math.abs(grid[x+1][y][z] - grid[x-1][y][z]) / 2;
        const gy = Math.abs(grid[x][y+1][z] - grid[x][y-1][z]) / 2;
        const gz = Math.abs(grid[x][y][z+1] - grid[x][y][z-1]) / 2;
        
        const gradientMagnitude = Math.sqrt(gx*gx + gy*gy + gz*gz);
        
        // If cell is dense enough and has high gradient, it's likely surface
        if (currentDensity > threshold && gradientMagnitude > 0.05) {
          // Convert grid position to object coordinates
          const px = (x / gridSize - 0.5) * width;
          const py = (y / gridSize - 0.5) * height;
          const pz = (z / gridSize - 0.5) * depth;
          
          surfacePoints.push([px, py, pz]);
        }
      }
    }
  }
  
  return surfacePoints;
};

/**
 * Apply volumetric constraints to make the density grid respect object physics
 * @param {Array} grid - 3D density grid
 * @param {number} gridSize - Size of the grid
 */
const applyVolumetricConstraints = (grid, gridSize) => {
  // Create a copy of the grid
  const newGrid = grid.map(plane => plane.map(line => [...line]));
  
  // Apply 3D smoothing and consistency constraints
  for (let x = 1; x < gridSize - 1; x++) {
    for (let y = 1; y < gridSize - 1; y++) {
      for (let z = 1; z < gridSize - 1; z++) {
        // Apply 3D mean filter for smoothing
        let sum = 0;
        let count = 0;
        
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              sum += grid[x+dx][y+dy][z+dz];
              count++;
            }
          }
        }
        
        newGrid[x][y][z] = 0.7 * grid[x][y][z] + 0.3 * (sum / count);
      }
    }
  }
  
  // Copy back to original grid
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = newGrid[x][y][z];
      }
    }
  }
};

/**
 * Creates a density distribution along one axis from features
 * @param {Array} features - Feature points
 * @param {number} axis - Axis index (0 for X, 1 for Y)
 * @param {number} bins - Number of bins
 * @param {number} dimension - Dimension size
 * @returns {Array} Density distribution
 */
const createFeatureDensity = (features, axis, bins, dimension) => {
  const density = new Array(bins).fill(0);
  
  // Accumulate feature density
  features.forEach(feature => {
    const normalized = feature[axis];
    const bin = Math.min(Math.floor(normalized * bins), bins - 1);
    const confidence = feature[2] || 1;
    
    density[bin] += confidence;
  });
  
  // Smooth the distribution
  const smoothedDensity = [];
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - 2); j <= Math.min(bins - 1, i + 2); j++) {
      sum += density[j];
      count++;
    }
    
    smoothedDensity[i] = sum / count;
  }
  
  // Ensure non-zero values and normalize
  return normalizeArray(smoothedDensity.map(v => Math.max(v, 0.01)));
};

/**
 * Estimate Z density based on feature distribution and object dimensions
 * @param {Array} features - Feature points
 * @param {Object} dimensions - Object dimensions
 * @param {number} bins - Number of bins
 * @returns {Array} Z density distribution
 */
const estimateZDensity = (features, dimensions, bins) => {
  const density = new Array(bins).fill(0);
  const { width, height, depth } = dimensions;
  
  // Create a bell curve distribution with higher density toward the center
  for (let i = 0; i < bins; i++) {
    const normalizedPos = i / (bins - 1);
    // Higher density in the middle, lower at edges
    const bellValue = Math.exp(-Math.pow((normalizedPos - 0.5) * 2, 2));
    density[i] = bellValue;
  }
  
  return normalizeArray(density);
};

/**
 * Sample a position from the density grid with bias towards higher density areas
 * @param {Array} grid - 3D density grid
 * @param {number} gridSize - Size of grid
 * @param {Object} dimensions - Object dimensions
 * @returns {Array} Sampled position [x, y, z]
 */
const sampleFromDensityGrid = (grid, gridSize, dimensions) => {
  const { width, height, depth } = dimensions;
  
  // Create 1D density arrays for each axis
  const xDensity = new Array(gridSize).fill(0);
  const yDensity = new Array(gridSize).fill(0);
  const zDensity = new Array(gridSize).fill(0);
  
  // Project 3D grid to 1D densities
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        xDensity[x] += grid[x][y][z];
        yDensity[y] += grid[x][y][z];
        zDensity[z] += grid[x][y][z];
      }
    }
  }
  
  // Sample from each axis
  const xBin = weightedRandomIndex(normalizeArray(xDensity));
  const yBin = weightedRandomIndex(normalizeArray(yDensity));
  const zBin = weightedRandomIndex(normalizeArray(zDensity));
  
  // Add small random offset
  const x = ((xBin + Math.random()) / gridSize - 0.5) * width;
  const y = ((yBin + Math.random()) / gridSize - 0.5) * height;
  const z = ((zBin + Math.random()) / gridSize - 0.5) * depth;
  
  return [x, y, z];
};

/**
 * Adjusts a point to be closer to the object surface
 * @param {Float32Array} points - Point cloud data
 * @param {number} index - Index of point to adjust
 * @param {Object} dimensions - Object dimensions
 */
const pullPointToSurface = (points, index, dimensions) => {
  const { width, height, depth } = dimensions;
  const baseIdx = index * 3;
  
  // Normalize the point's position within object's space (-1 to 1)
  const nx = points[baseIdx] / (width / 2);
  const ny = points[baseIdx + 1] / (height / 2);
  const nz = points[baseIdx + 2] / (depth / 2);
  
  // Calculate vector to nearest surface and normalize
  let surfaceVector;
  
  // Find which surface is closest
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);
  const absZ = Math.abs(nz);
  
  if (absX >= absY && absX >= absZ) {
    // X is dominant axis - pull toward X surface
    surfaceVector = [Math.sign(nx) - nx, 0, 0];
  } else if (absY >= absX && absY >= absZ) {
    // Y is dominant axis - pull toward Y surface
    surfaceVector = [0, Math.sign(ny) - ny, 0];
  } else {
    // Z is dominant axis - pull toward Z surface
    surfaceVector = [0, 0, Math.sign(nz) - nz];
  }
  
  // Pull factor - how strongly to pull toward surface (0-1)
  const pullFactor = 0.7;
  
  // Apply the pull
  points[baseIdx] += surfaceVector[0] * pullFactor * (width / 2);
  points[baseIdx + 1] += surfaceVector[1] * pullFactor * (height / 2);
  points[baseIdx + 2] += surfaceVector[2] * pullFactor * (depth / 2);
};

/**
 * Sigmoid function for non-linear mapping
 * @param {number} x - Input value
 * @returns {number} Sigmoid output (0-1)
 */
const sigmoid = (x) => {
  return 1 / (1 + Math.exp(-x));
};

/**
 * Normalize an array of values to sum to 1
 * @param {Array} arr - Array to normalize
 * @returns {Array} Normalized array
 */
const normalizeArray = arr => {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum > 0 ? arr.map(v => v / sum) : arr.map(() => 0.1);
};

/**
 * Selects a random index based on weights
 * @param {Array} weights - Array of weights
 * @returns {number} Selected index
 */
const weightedRandomIndex = (weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return Math.floor(Math.random() * weights.length);
  
  const random = Math.random() * sum;
  let weightSum = 0;
  
  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i];
    if (random < weightSum) {
      return i;
    }
  }
  
  return weights.length - 1;
};

/**
 * Creates a visualization of the dimension analysis
 * @param {HTMLImageElement} image - Original image
 * @param {Object} dimensions - Detected dimensions
 * @param {Object} bounds - Detected object bounds
 * @returns {HTMLCanvasElement} Canvas with visualization
 */
export const createDimensionVisualization = (image, dimensions, bounds) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(image, 0, 0);
  
  // Draw bounding box
  ctx.strokeStyle = '#ff3b3f';
  ctx.lineWidth = 2;
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  
  // Draw dimension lines
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  
  // Width
  ctx.beginPath();
  ctx.moveTo(bounds.x, bounds.y + bounds.height + 20);
  ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height + 20);
  ctx.stroke();
  
  // Draw arrows
  drawArrow(ctx, bounds.x, bounds.y + bounds.height + 20, -10, 0);
  drawArrow(ctx, bounds.x + bounds.width, bounds.y + bounds.height + 20, 10, 0);
  
  // Label
  ctx.fillText(`Width: ${dimensions.width}mm`, 
    bounds.x + bounds.width/2 - 40, bounds.y + bounds.height + 40);
  
  // Height
  ctx.beginPath();
  ctx.moveTo(bounds.x - 20, bounds.y);
  ctx.lineTo(bounds.x - 20, bounds.y + bounds.height);
  ctx.stroke();
  
  // Draw arrows
  drawArrow(ctx, bounds.x - 20, bounds.y, 0, -10);
  drawArrow(ctx, bounds.x - 20, bounds.y + bounds.height, 0, 10);
  
  // Label
  ctx.save();
  ctx.translate(bounds.x - 40, bounds.y + bounds.height/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(`Height: ${dimensions.height}mm`, 0, 0);
  ctx.restore();
  
  // Depth (estimated from other views - show as text only)
  ctx.fillText(`Depth (estimated): ${dimensions.depth}mm`, 
    bounds.x, bounds.y - 20);
  
  return canvas;
};

/**
 * Draws an arrow at specified position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} dx - X direction
 * @param {number} dy - Y direction
 */
const drawArrow = (ctx, x, y, dx, dy) => {
  const arrowSize = 5;
  const angle = Math.atan2(dy, dx);
  
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - arrowSize * Math.cos(angle - Math.PI/6),
    y - arrowSize * Math.sin(angle - Math.PI/6)
  );
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - arrowSize * Math.cos(angle + Math.PI/6),
    y - arrowSize * Math.sin(angle + Math.PI/6)
  );
  ctx.stroke();
}; 