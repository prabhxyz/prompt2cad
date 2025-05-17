// Simple mock-based object detection and dimension estimation implementation

// Estimate object dimensions from a detection
export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  confidence: number; // Added confidence metric
}

// Reference object database with dimensions in mm
const REFERENCE_OBJECTS: Record<string, {width: number, height: number, depth: number}> = {
  'cell phone': {width: 70, height: 150, depth: 8},
  'remote': {width: 50, height: 160, depth: 20},
  'mouse': {width: 60, height: 110, depth: 35},
  'cup': {width: 80, height: 95, depth: 80},
  'bottle': {width: 70, height: 220, depth: 70},
  'keyboard': {width: 350, height: 150, depth: 20},
  'book': {width: 170, height: 240, depth: 25},
  'laptop': {width: 330, height: 230, depth: 20},
  'monitor': {width: 500, height: 340, depth: 50},
  'tv': {width: 900, height: 550, depth: 50},
  'credit card': {width: 85.6, height: 53.98, depth: 0.76}, // Credit card has standard dimensions
  'soda can': {width: 66, height: 123, depth: 66}, // Standard soda can 
};

// Structure to store analysis data for visualization
export interface AnalysisData {
  detectedObjects: any[];
  referenceObject?: string;
  scaleFactor?: number;
  keypoints?: any[];
  measurements?: {
    width: {value: number, points: number[][]},
    height: {value: number, points: number[][]},
    depth: {value: number, points: number[][]},
  };
}

// Mock implementation for object detection
async function mockImageAnalysis(imageElement: HTMLImageElement | HTMLVideoElement): Promise<AnalysisData> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Get dimensions of the image/video element
  const width = imageElement.clientWidth;
  const height = imageElement.clientHeight;
  
  // Create a simulated detection in the center of the frame
  const centerX = width * 0.3;
  const centerY = height * 0.3;
  const objWidth = width * 0.4;
  const objHeight = height * 0.4;
  
  // Generate random object type from reference objects
  const objectClasses = Object.keys(REFERENCE_OBJECTS);
  const randomClass = objectClasses[Math.floor(Math.random() * objectClasses.length)];
  
  console.log(`Mock detected object: ${randomClass}`);
  
  const prediction = {
    bbox: [centerX, centerY, objWidth, objHeight],
    class: randomClass,
    score: 0.86 + (Math.random() * 0.1)
  };
  
  // Generate dimension visualization points
  const measurements = generateMeasurementPoints(prediction.bbox, 1.2); // Mock scale factor
  
  return {
    detectedObjects: [prediction],
    referenceObject: randomClass,
    scaleFactor: 1.2,
    measurements
  };
}

// Generate measurement visualization points
function generateMeasurementPoints(bbox: number[], scaleFactor: number) {
  const [x, y, width, height] = bbox;
  
  return {
    width: {
      value: Math.round(width * scaleFactor),
      points: [[x, y + height/2], [x + width, y + height/2]]
    },
    height: {
      value: Math.round(height * scaleFactor),
      points: [[x + width/2, y], [x + width/2, y + height]]
    },
    depth: {
      value: Math.round((width * 0.7) * scaleFactor), // Estimated depth based on width
      points: [[x, y], [x + width * 0.3, y - height * 0.2]]
    }
  };
}

// Estimate object dimensions from all available data
export async function estimateDimensions(
  imageElements: Array<HTMLImageElement | HTMLVideoElement>
): Promise<{dimensions: Dimensions, analysisData: AnalysisData[]}> {
  try {
    console.log(`Starting mock dimension estimation with ${imageElements.length} images`);
    
    // Analyze all views
    const analysisResults = await Promise.all(
      imageElements.map(img => mockImageAnalysis(img))
    );
    
    // Extract dimensions from each view
    const allDimensions = analysisResults.map(result => {
      const mainObject = result.detectedObjects[0];
      const refDims = REFERENCE_OBJECTS[mainObject.class];
      
      return {
        width: refDims.width,
        height: refDims.height,
        depth: refDims.depth,
        confidence: mainObject.score
      };
    });
    
    // Combine all measurements, giving more weight to higher confidence detections
    const totalWeight = allDimensions.reduce((sum, dim) => sum + dim.confidence, 0);
    
    const combinedDimensions: Dimensions = {
      width: Math.round(
        allDimensions.reduce((sum, dim) => sum + (dim.width * dim.confidence), 0) / totalWeight
      ),
      height: Math.round(
        allDimensions.reduce((sum, dim) => sum + (dim.height * dim.confidence), 0) / totalWeight
      ),
      depth: Math.round(
        allDimensions.reduce((sum, dim) => sum + (dim.depth * dim.confidence), 0) / totalWeight
      ),
      confidence: Math.min(1.0, allDimensions.reduce((max, dim) => Math.max(max, dim.confidence), 0))
    };
    
    return {
      dimensions: combinedDimensions,
      analysisData: analysisResults
    };
  } catch (error) {
    console.error('Error in dimension estimation:', error);
    
    // Create a mock analysis with default dimensions as fallback
    const defaultDims = getDefaultDimensions();
    const mockAnalysis = await mockImageAnalysis(imageElements[0]);
    
    return {
      dimensions: defaultDims,
      analysisData: [mockAnalysis]
    };
  }
}

// Fallback function for when estimation fails
export function getDefaultDimensions(): Dimensions {
  return {
    width: 120,
    height: 80,
    depth: 50,
    confidence: 0.5
  };
} 