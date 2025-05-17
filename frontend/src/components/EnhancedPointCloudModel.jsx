import React, { useMemo, useRef, useEffect } from 'react';
import { generatePointCloud } from '../utils/imageProcessing';
import * as THREE from 'three';

/**
 * Enhanced point cloud model component that generates a more accurate representation
 * of an object based on image analysis rather than random points
 */
const EnhancedPointCloudModel = ({ 
  dimensions, 
  processedImages = [], 
  position = [0, 0, 0], 
  color = '#ff3b3f',
  pointSize = 1.5,
  pointCount = 5000
}) => {
  const modelRef = useRef();
  const meshRef = useRef();
  
  // Generate point cloud data based on feature points and dimensions
  const pointCloudData = useMemo(() => {
    console.log("Generating point cloud with", processedImages.length, "images");
    // If we have processed images with feature points, use them to guide the point cloud
    if (processedImages && processedImages.length > 0) {
      return generatePointCloud(processedImages, dimensions);
    }
    
    // Fallback to a more basic object approximation if no processed images
    const { width, height, depth } = dimensions;
    const points = new Float32Array(pointCount * 3);
    
    // Generate points that approximate the object shape based on dimensions
    for (let i = 0; i < pointCount; i++) {
      // Surface distribution vs. volume distribution
      const useSurface = Math.random() > 0.3; // 70% points on surface, 30% inside
      
      if (useSurface) {
        // Select which surface
        const side = Math.floor(Math.random() * 6);
        
        // Generate point on the selected surface
        switch (side) {
          case 0: // Front
            points[i * 3] = (Math.random() - 0.5) * width;
            points[i * 3 + 1] = (Math.random() - 0.5) * height;
            points[i * 3 + 2] = depth / 2;
            break;
          case 1: // Back
            points[i * 3] = (Math.random() - 0.5) * width;
            points[i * 3 + 1] = (Math.random() - 0.5) * height;
            points[i * 3 + 2] = -depth / 2;
            break;
          case 2: // Top
            points[i * 3] = (Math.random() - 0.5) * width;
            points[i * 3 + 1] = height / 2;
            points[i * 3 + 2] = (Math.random() - 0.5) * depth;
            break;
          case 3: // Bottom
            points[i * 3] = (Math.random() - 0.5) * width;
            points[i * 3 + 1] = -height / 2;
            points[i * 3 + 2] = (Math.random() - 0.5) * depth;
            break;
          case 4: // Left
            points[i * 3] = -width / 2;
            points[i * 3 + 1] = (Math.random() - 0.5) * height;
            points[i * 3 + 2] = (Math.random() - 0.5) * depth;
            break;
          case 5: // Right
            points[i * 3] = width / 2;
            points[i * 3 + 1] = (Math.random() - 0.5) * height;
            points[i * 3 + 2] = (Math.random() - 0.5) * depth;
            break;
        }
        
        // Add small random offset to create more natural look
        points[i * 3] += (Math.random() - 0.5) * 2;
        points[i * 3 + 1] += (Math.random() - 0.5) * 2;
        points[i * 3 + 2] += (Math.random() - 0.5) * 2;
      } else {
        // Points inside the volume
        points[i * 3] = (Math.random() - 0.5) * width * 0.9;
        points[i * 3 + 1] = (Math.random() - 0.5) * height * 0.9;
        points[i * 3 + 2] = (Math.random() - 0.5) * depth * 0.9;
      }
    }
    
    return points;
  }, [dimensions, processedImages, pointCount]);

  // Create colors for each point for more realistic visualization
  const pointColors = useMemo(() => {
    const colors = new Float32Array(pointCloudData.length);
    const colorObj = new THREE.Color(color);
    const baseR = colorObj.r;
    const baseG = colorObj.g;
    const baseB = colorObj.b;
    
    for (let i = 0; i < pointCloudData.length / 3; i++) {
      // Add subtle color variation based on position for more realistic look
      const pointIndex = i * 3;
      const x = pointCloudData[pointIndex];
      const y = pointCloudData[pointIndex + 1];
      const z = pointCloudData[pointIndex + 2];
      
      // Distance from center influences color variation
      const distFromCenter = Math.sqrt(x*x + y*y + z*z) / 
                           Math.sqrt(dimensions.width*dimensions.width + 
                                    dimensions.height*dimensions.height + 
                                    dimensions.depth*dimensions.depth);
      
      // Subtle variations for natural look
      const variation = 0.15;
      colors[i * 3] = baseR + (Math.random() - 0.5) * variation * (1 - distFromCenter * 0.5);
      colors[i * 3 + 1] = baseG + (Math.random() - 0.5) * variation * (1 - distFromCenter * 0.5);
      colors[i * 3 + 2] = baseB + (Math.random() - 0.5) * variation * (1 - distFromCenter * 0.5);
    }
    
    return colors;
  }, [pointCloudData, color, dimensions]);
  
  // Create box geometry for the wireframe
  const boxGeometry = useMemo(() => {
    return new THREE.BoxGeometry(
      dimensions.width,
      dimensions.height,
      dimensions.depth
    );
  }, [dimensions]);

  // Create edges geometry for the wireframe
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(boxGeometry);
  }, [boxGeometry]);
  
  return (
    <group position={position} ref={modelRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={pointCloudData.length / 3}
            array={pointCloudData}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={pointColors.length / 3}
            array={pointColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          size={pointSize} 
          vertexColors
          sizeAttenuation={true}
          transparent
          alphaTest={0.5}
        />
      </points>
      
      {/* Optional bounding box wireframe to show dimensions */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
};

export default EnhancedPointCloudModel; 