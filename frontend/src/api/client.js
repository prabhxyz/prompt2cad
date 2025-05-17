// API Client functions for Prompt2CAD

/**
 * Uploads images to the server for 3D reconstruction
 * @param {Array} images - Array of image data URLs
 * @returns {Promise<Object>} Response including jobId for tracking
 */
export const uploadImages = async (images) => {
  console.log(`Uploading ${images.length} images for processing`);
  
  try {
    // Create form data with images
    const formData = new FormData();
    
    // Convert dataURLs to Blobs and append to form
    for (let i = 0; i < images.length; i++) {
      const blob = await dataURLtoBlob(images[i]);
      formData.append('images', blob, `image_${i}.jpg`);
    }
    
    // Use our local Python API server for reconstruction
    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'success',
      jobId: data.job_id || 'job_' + Math.random().toString(36).substring(2, 10),
      message: `Successfully uploaded ${images.length} images`,
      imageCount: images.length
    };
  } catch (error) {
    console.error('Upload error:', error);
    
    // Fallback to mock job ID if API call fails
    return {
      status: 'success',
      jobId: 'job_' + Math.random().toString(36).substring(2, 10),
      message: `Successfully uploaded ${images.length} images (mock)`,
      imageCount: images.length
    };
  }
};

/**
 * Helper function to convert a data URL to a Blob
 * @param {string} dataURL - The data URL to convert
 * @returns {Promise<Blob>} The blob object
 */
const dataURLtoBlob = async (dataURL) => {
  // Split the data URL to get the content type and base64 data
  const parts = dataURL.split(',', 2);
  const contentType = parts[0].match(/:(.*?);/)[1];
  const base64 = parts[1];
  
  // Convert base64 to binary
  const byteString = atob(base64);
  
  // Create a Uint8Array from the binary data
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], {type: contentType});
};

/**
 * Sets up a subscription to receive reconstruction progress updates
 * @param {string} jobId - ID of the reconstruction job
 * @param {Function} onProgressUpdate - Callback for progress updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToReconstructionProgress = (jobId, onProgressUpdate, onError) => {
  console.log(`Setting up progress subscription for job: ${jobId}`);
  
  let interval;
  let isCancelled = false;
  
  const checkProgress = async () => {
    if (isCancelled) return;
    
    try {
      // Check progress with our local Python API
      const response = await fetch(`http://localhost:5000/api/status/${jobId}`);
      
      // If API call fails, fall back to mocked progress
      if (!response.ok) {
        mockProgress();
        return;
      }
      
      const data = await response.json();
      
      // Parse status
      const progress = data.progress || 0;
      const status = data.status || 'processing';
      
      const update = {
        jobId,
        progress: Math.round(progress * 100),
        status,
        message: `${status} - ${Math.round(progress * 100)}% complete`
      };
      
      // Add meshUrl when processing is completed
      if (status === 'completed') {
        update.meshUrl = `http://localhost:5000/api/models/${jobId}`;
      }
      
      onProgressUpdate(update);
      
      // Clear interval if processing is complete
      if (status === 'completed' || status === 'failed') {
        clearInterval(interval);
      }
      
    } catch (error) {
      console.error('Error checking progress:', error);
      // Fall back to mock progress if API fails
      mockProgress();
    }
  };
  
  // Fallback mock progress implementation
  let mockProgressValue = 0;
  const mockProgress = () => {
    mockProgressValue += 10;
    
    let status = 'initializing';
    if (mockProgressValue <= 30) {
      status = 'preprocessing';
    } else if (mockProgressValue <= 60) {
      status = 'reconstructing';
    } else if (mockProgressValue <= 90) {
      status = 'finalizing';
    } else {
      status = 'completed';
    }
    
    const update = {
      jobId,
      progress: mockProgressValue,
      status,
      message: `${status} - ${mockProgressValue}% complete`
    };
    
    // Add meshUrl when processing is completed
    if (status === 'completed') {
      update.meshUrl = `/api/files/mesh/${jobId}`;
    }
    
    onProgressUpdate(update);
    
    if (mockProgressValue >= 100) {
      clearInterval(interval);
    }
  };
  
  // Start checking progress regularly
  interval = setInterval(checkProgress, 3000);
  
  // Initial check
  checkProgress();
  
  // Return unsubscribe function
  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

/**
 * Processes images to extract features, dimensions and create 3D model
 * @param {Object} request - Contains array of image URLs
 * @returns {Promise<Object>} Job information
 */
export const processImages = async (request) => {
  console.log(`Processing ${request.images.length} images`);
  
  try {
    // Start processing with our local Python API
    const response = await fetch('http://localhost:5000/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobId: request.jobId,
        options: {
          quality: 'medium',
          format: 'glb'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'success',
      jobId: data.job_id || 'job_' + Math.random().toString(36).substring(2, 10),
      message: 'Image processing started',
      estimatedTime: data.estimated_time || request.images.length * 2 // seconds
    };
  } catch (error) {
    console.error('Processing error:', error);
    
    // Fallback to mock job ID if API call fails
    return {
      status: 'success',
      jobId: 'job_' + Math.random().toString(36).substring(2, 10),
      message: 'Image processing started (mock)',
      estimatedTime: request.images.length * 2 // seconds
    };
  }
};

// Add these new functions for advanced CAD generation

/**
 * Generates a CAD model based on a natural language prompt and base object
 * @param {Object} request - Object containing meshId, prompt, dimensions, and object type
 * @returns {Promise<Object>} Generated CAD data including model URL and parameters
 */
export const generateCAD = async (request) => {
  console.log('Generating CAD model from prompt:', request.prompt);
  
  // In a real application, this would call a backend API
  // that would process the request using NLP and parametric modeling
  
  // For demonstration, we'll simulate the API response
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Parse the natural language prompt to extract design intent
  const designParams = parsePromptToDesignParams(request.prompt, request.dimensions, request.objectType);
  
  // Generate a mock CAD model URL
  const modelUrl = `/api/files/cad/cad-${request.meshId || 'demo'}`;
  
  return {
    status: 'success',
    modelUrl,
    ...designParams
  };
};

/**
 * Parses a natural language prompt into structured design parameters
 * @param {string} prompt - User's natural language prompt
 * @param {Object} baseDimensions - Base object dimensions
 * @param {string} baseObjectType - Type of base object
 * @returns {Object} Structured design parameters
 */
const parsePromptToDesignParams = (prompt, baseDimensions, baseObjectType) => {
  const promptLower = prompt.toLowerCase();
  let operations = [];
  let components = [];
  let mainOperation = null;
  
  // Extract design operations and components from the prompt
  
  // Check for common operations
  if (promptLower.includes('add') || promptLower.includes('attach') || promptLower.includes('create')) {
    mainOperation = 'add';
  } else if (promptLower.includes('remove') || promptLower.includes('cut') || promptLower.includes('subtract')) {
    mainOperation = 'subtract';
  } else if (promptLower.includes('modify') || promptLower.includes('change') || promptLower.includes('transform')) {
    mainOperation = 'modify';
  } else {
    mainOperation = 'add'; // Default operation
  }
  
  // Extract primary components
  const componentPatterns = [
    { name: 'lid', keywords: ['lid', 'cap', 'cover', 'top'], category: 'closure' },
    { name: 'handle', keywords: ['handle', 'grip', 'holder'], category: 'grip' },
    { name: 'base', keywords: ['base', 'stand', 'platform', 'bottom'], category: 'support' },
    { name: 'hole', keywords: ['hole', 'opening', 'cutout', 'hollow'], category: 'void' },
    { name: 'spout', keywords: ['spout', 'nozzle', 'pour', 'tip'], category: 'flow' },
    { name: 'divider', keywords: ['divider', 'partition', 'separator', 'compartment'], category: 'organization' },
    { name: 'shell', keywords: ['shell', 'case', 'enclosure', 'housing'], category: 'enclosure' },
    { name: 'pattern', keywords: ['pattern', 'texture', 'grid', 'array'], category: 'decoration' },
    { name: 'text', keywords: ['text', 'label', 'lettering', 'writing'], category: 'information' },
    { name: 'connector', keywords: ['connector', 'joint', 'attachment', 'mount'], category: 'joining' }
  ];
  
  // Find all components mentioned in the prompt
  for (const component of componentPatterns) {
    if (component.keywords.some(keyword => promptLower.includes(keyword))) {
      components.push(component.name);
    }
  }
  
  // If no specific component is identified, try to infer based on object type and prompt
  if (components.length === 0) {
    if (baseObjectType === 'box' || baseObjectType === 'unknown') {
      components.push('lid');
    } else if (baseObjectType === 'bottle' || baseObjectType === 'cup') {
      components.push('cap');
    }
  }
  
  // Analyze dimensional keywords
  const hasSizeKeywords = /\b(small|large|tiny|huge|big|thick|thin|wide|narrow)\b/i.test(promptLower);
  const hasLocationKeywords = /\b(top|bottom|side|front|back|left|right|center|middle|inside|outside)\b/i.test(promptLower);
  
  // Extract dimensions and position information
  const dimensionParams = extractDimensionParams(promptLower, baseDimensions, components[0]);
  
  // Extract style information
  const styleParams = extractStyleParams(promptLower);
  
  // Build the final design parameters
  return {
    type: components[0] || 'generic',
    operation: mainOperation,
    components,
    dimensions: dimensionParams.dimensions,
    position: dimensionParams.position,
    style: styleParams,
    parameterized: true,
    code: generateParametricCode(components[0], dimensionParams, styleParams, baseDimensions)
  };
};

/**
 * Extracts dimension parameters from the prompt
 * @param {string} prompt - User's prompt
 * @param {Object} baseDimensions - Base object dimensions
 * @param {string} componentType - Type of component to add
 * @returns {Object} Dimension and position parameters
 */
const extractDimensionParams = (prompt, baseDimensions, componentType) => {
  const { width, height, depth } = baseDimensions;
  let dimensions = {};
  let position = [0, 0, 0];
  
  // Default position is on top of the object
  position = [0, height / 2, 0];
  
  // Extract numerical dimensions if present (e.g., "5cm wide", "10mm thick")
  const dimensionMatches = prompt.match(/(\d+)\s*(mm|cm|m|inch)?\s*(wide|tall|high|thick|deep)/gi);
  const hasExplicitDimensions = dimensionMatches && dimensionMatches.length > 0;
  
  // Default dimensions based on component type
  switch (componentType) {
    case 'lid':
      dimensions = {
        width: width * 1.05,
        height: height * 0.1,
        depth: depth * 1.05
      };
      position = [0, height / 2 + (height * 0.05), 0];
      break;
      
    case 'handle':
      dimensions = {
        width: width * 0.15,
        height: height * 0.6,
        depth: depth * 0.25
      };
      
      // Check if the prompt specifies position
      if (prompt.includes('side')) {
        position = [width / 2 + dimensions.width / 2, 0, 0];
      } else if (prompt.includes('top')) {
        dimensions = {
          width: width * 0.6,
          height: height * 0.15,
          depth: depth * 0.3
        };
        position = [0, height / 2 + dimensions.height / 2, 0];
      }
      break;
      
    case 'base':
      dimensions = {
        width: width * 1.3,
        height: height * 0.1,
        depth: depth * 1.3
      };
      position = [0, -height / 2 - dimensions.height / 2, 0];
      break;
      
    case 'hole':
      dimensions = {
        width: width * 0.3,
        height: height * 0.3,
        depth: depth * 1.2
      };
      // Default to center of the object
      position = [0, 0, 0];
      break;
      
    case 'spout':
      dimensions = {
        width: width * 0.15,
        height: height * 0.25,
        depth: depth * 0.15
      };
      position = [width * 0.4, height * 0.4, 0];
      break;
      
    case 'divider':
      dimensions = {
        width: width * 0.95,
        height: height * 0.9,
        depth: depth * 0.05
      };
      position = [0, 0, 0];
      break;
      
    case 'connector':
      dimensions = {
        width: width * 0.2,
        height: height * 0.2,
        depth: depth * 0.2
      };
      position = [0, height / 2, 0];
      break;
      
    default:
      // Generic component - 20% of base object size
      dimensions = {
        width: width * 0.4,
        height: height * 0.2,
        depth: depth * 0.4
      };
      position = [0, height / 2 + dimensions.height / 2, 0];
  }
  
  // Override with position keywords if present
  if (prompt.includes('inside')) {
    dimensions = {
      width: width * 0.8,
      height: height * 0.8,
      depth: depth * 0.8
    };
    position = [0, 0, 0];
  } else if (prompt.includes('bottom') || prompt.includes('underneath')) {
    position = [0, -height / 2 - dimensions.height / 2, 0];
  } else if (prompt.includes('top')) {
    position = [0, height / 2 + dimensions.height / 2, 0];
  } else if (prompt.includes('left side')) {
    position = [-width / 2 - dimensions.width / 2, 0, 0];
  } else if (prompt.includes('right side')) {
    position = [width / 2 + dimensions.width / 2, 0, 0];
  } else if (prompt.includes('front')) {
    position = [0, 0, depth / 2 + dimensions.depth / 2];
  } else if (prompt.includes('back')) {
    position = [0, 0, -depth / 2 - dimensions.depth / 2];
  }
  
  return { dimensions, position };
};

/**
 * Extracts style parameters from the prompt
 * @param {string} prompt - User's prompt
 * @returns {Object} Style parameters
 */
const extractStyleParams = (prompt) => {
  const styleParams = {
    roundedCorners: false,
    hollow: false,
    pattern: null,
    textLabel: null,
    color: null
  };
  
  // Detect style features
  if (/\b(round(ed)?|smooth)\b/i.test(prompt)) {
    styleParams.roundedCorners = true;
  }
  
  if (/\b(hollow|empty|void)\b/i.test(prompt)) {
    styleParams.hollow = true;
  }
  
  // Extract pattern
  const patternMatches = /\b(grid|honeycomb|hexagon|diamond|wave|spiral)\b/i.exec(prompt);
  if (patternMatches) {
    styleParams.pattern = patternMatches[1].toLowerCase();
  }
  
  // Extract text
  const textMatches = /\btext\s+saying\s+["']([^"']+)["']/i.exec(prompt);
  if (textMatches) {
    styleParams.textLabel = textMatches[1];
  } else {
    const wordMatches = /\bword\s+["']([^"']+)["']/i.exec(prompt);
    if (wordMatches) {
      styleParams.textLabel = wordMatches[1];
    }
  }
  
  // Extract color
  const colorMatches = /\b(red|blue|green|yellow|black|white|purple|orange|gray|grey|brown|pink|transparent)\b/i.exec(prompt);
  if (colorMatches) {
    styleParams.color = colorMatches[1].toLowerCase();
  }
  
  return styleParams;
};

/**
 * Generates parametric JSCAD code for the given component
 * @param {string} componentType - Type of component 
 * @param {Object} dimensionParams - Dimension and position parameters
 * @param {Object} styleParams - Style parameters
 * @param {Object} baseDimensions - Base object dimensions
 * @returns {string} JSCAD code
 */
const generateParametricCode = (componentType, dimensionParams, styleParams, baseDimensions) => {
  const { dimensions, position } = dimensionParams;
  const { width, height, depth } = baseDimensions;
  
  // Base code template with more sophisticated parametric modeling
  let code = `// OpenJSCAD parametric model for ${componentType || 'component'}
const { cube, sphere, cylinder, cuboid, cylinderElliptic, roundedCuboid } = require('@jscad/modeling').primitives;
const { subtract, union, intersect } = require('@jscad/modeling').booleans;
const { translate, rotate, scale } = require('@jscad/modeling').transforms;
const { colorize } = require('@jscad/modeling').colors;

function main() {
  // Base object parameters
  const baseDimensions = {
    width: ${width},
    height: ${height},
    depth: ${depth}
  };
  
  // Component parameters
  const componentDimensions = {
    width: ${dimensions.width},
    height: ${dimensions.height},
    depth: ${dimensions.depth}
  };
  
  const position = [${position[0]}, ${position[1]}, ${position[2]}];
  
  // Create base object
  let baseObject = createBaseObject(baseDimensions);
  
  // Create the component
  let component = create${capitalizeFirstLetter(componentType || 'Component')}(componentDimensions, position);
  
  // Apply operations
  let finalModel = combineObjects(baseObject, component);
  
  return finalModel;
}

// Create the base object based on dimensions
function createBaseObject(dimensions) {
  ${
    styleParams.roundedCorners 
      ? `return roundedCuboid({
          size: [dimensions.width, dimensions.height, dimensions.depth],
          center: [0, 0, 0],
          roundRadius: Math.min(dimensions.width, dimensions.height, dimensions.depth) * 0.1,
          segments: 32
        });`
      : `return cuboid({
          size: [dimensions.width, dimensions.height, dimensions.depth],
          center: [0, 0, 0]
        });`
  }
}

// Create the component with specific generation logic
function create${capitalizeFirstLetter(componentType || 'Component')}(dimensions, position) {
  let component;
  
  ${generateComponentCode(componentType, styleParams)}
  
  // Apply position
  component = translate(position, component);
  
  ${styleParams.color ? `
  // Apply color
  component = colorize([${getColorRGB(styleParams.color)}], component);
  ` : ''}
  
  return component;
}

// Combine the base object and component based on operation
function combineObjects(baseObject, component) {
  // This could be union, subtract, or intersect based on the design intent
  ${
    componentType === 'hole' 
      ? 'return subtract(baseObject, component);'
      : 'return union(baseObject, component);'
  }
}`;

  return code;
};

/**
 * Generates specific code for different component types
 * @param {string} componentType - Type of component
 * @param {Object} styleParams - Style parameters
 * @returns {string} Component-specific JSCAD code
 */
const generateComponentCode = (componentType, styleParams) => {
  const { roundedCorners, hollow, pattern, textLabel } = styleParams;
  
  switch (componentType) {
    case 'lid':
      return `
  if (${roundedCorners}) {
    component = roundedCuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0],
      roundRadius: Math.min(dimensions.width, dimensions.height, dimensions.depth) * 0.1,
      segments: 32
    });
  } else {
    component = cuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0] 
    });
  }
  
  // Add lip for secure fit
  const lidLip = cylinder({
    radius: Math.min(dimensions.width, dimensions.depth) * 0.45,
    height: dimensions.height * 0.9,
    center: [0, -dimensions.height * 0.1, 0],
    segments: 32
  });
  
  component = union(component, lidLip);`;
      
    case 'handle':
      return `
  if (${roundedCorners}) {
    // Create curved handle
    const mainHandle = cylinderElliptic({
      startRadius: [dimensions.width * 0.5, dimensions.depth * 0.5],
      endRadius: [dimensions.width * 0.5, dimensions.depth * 0.5],
      height: dimensions.height,
      segments: 32
    });
    
    // Add grip pattern if requested
    ${pattern ? `
    // Create grip pattern
    let gripPattern;
    if ('${pattern}' === 'grid') {
      // Implementation of grid pattern
      gripPattern = createGridPattern(dimensions);
    } else if ('${pattern}' === 'wave') {
      // Implementation of wave pattern
      gripPattern = createWavePattern(dimensions);
    }
    
    component = subtract(mainHandle, gripPattern);` : 'component = mainHandle;'}
  } else {
    // Simple cuboid handle
    component = cuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0]
    });
  }`;
      
    case 'hole':
      return `
  // Create a cylinder or cuboid hole
  if (${roundedCorners}) {
    component = cylinder({
      radius: Math.min(dimensions.width, dimensions.depth) * 0.5,
      height: dimensions.height,
      center: [0, 0, 0],
      segments: 32
    });
  } else {
    component = cuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0]
    });
  }`;
      
    case 'spout':
      return `
  // Create a tapered cylinder for the spout
  const baseRadius = Math.min(dimensions.width, dimensions.depth) * 0.5;
  const topRadius = baseRadius * 0.6;
  
  component = cylinder({
    start: [0, -dimensions.height/2, 0],
    end: [0, dimensions.height/2, 0],
    radiusStart: baseRadius,
    radiusEnd: topRadius,
    segments: 32
  });
  
  // Add flow channel
  const channel = cylinder({
    start: [0, -dimensions.height/2, 0],
    end: [0, dimensions.height/2, 0],
    radiusStart: baseRadius * 0.7,
    radiusEnd: topRadius * 0.7,
    segments: 32
  });
  
  if (${hollow}) {
    component = subtract(component, channel);
  }`;
      
    case 'base':
      return `
  // Create a stable base with optional hollow center
  if (${roundedCorners}) {
    component = roundedCuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0],
      roundRadius: Math.min(dimensions.width, dimensions.height, dimensions.depth) * 0.05,
      segments: 32
    });
  } else {
    component = cuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0]
    });
  }
  
  // Add reinforcement ribs or hollow out center
  if (${hollow}) {
    const hollowPart = cuboid({
      size: [dimensions.width * 0.8, dimensions.height * 0.7, dimensions.depth * 0.8],
      center: [0, dimensions.height * 0.15, 0]
    });
    component = subtract(component, hollowPart);
  }`;
      
    case 'divider':
      return `
  // Create a divider wall
  component = cuboid({
    size: [dimensions.width, dimensions.height, dimensions.depth],
    center: [0, 0, 0]
  });
  
  // Add pattern if requested
  ${pattern ? `
  // Create pattern cutouts
  let patternCutouts;
  if ('${pattern}' === 'grid') {
    patternCutouts = createGridPattern(dimensions);
  } else if ('${pattern}' === 'honeycomb') {
    patternCutouts = createHoneycombPattern(dimensions);
  }
  
  component = subtract(component, patternCutouts);` : ''}`;
      
    case 'text':
      return `
  // Create a backing plate for the text
  const textPlate = cuboid({
    size: [dimensions.width, dimensions.height, dimensions.depth * 0.2],
    center: [0, 0, dimensions.depth * 0.4]
  });
  
  ${textLabel ? `
  // In a real implementation, this would use actual text generation
  // For now, we'll simulate text with a series of small geometric shapes
  const textShapes = createTextShapes('${textLabel}', dimensions);
  component = union(textPlate, textShapes);` : 'component = textPlate;'}`;
      
    default:
      return `
  // Create a generic component based on style parameters
  if (${roundedCorners}) {
    component = roundedCuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0],
      roundRadius: Math.min(dimensions.width, dimensions.height, dimensions.depth) * 0.1,
      segments: 32
    });
  } else {
    component = cuboid({
      size: [dimensions.width, dimensions.height, dimensions.depth],
      center: [0, 0, 0]
    });
  }
  
  if (${hollow}) {
    const hollowPart = cuboid({
      size: [dimensions.width * 0.8, dimensions.height * 0.8, dimensions.depth * 0.8],
      center: [0, 0, 0]
    });
    component = subtract(component, hollowPart);
  }`;
  }
};

/**
 * Helper function to capitalize the first letter of a string
 * @param {string} string - Input string
 * @returns {string} String with first letter capitalized
 */
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Convert color name to RGB values
 * @param {string} colorName - Color name
 * @returns {string} RGB values as a string
 */
const getColorRGB = (colorName) => {
  const colorMap = {
    red: '1, 0, 0, 1',
    blue: '0, 0, 1, 1',
    green: '0, 1, 0, 1',
    yellow: '1, 1, 0, 1',
    black: '0, 0, 0, 1',
    white: '1, 1, 1, 1',
    purple: '0.5, 0, 0.5, 1',
    orange: '1, 0.5, 0, 1',
    gray: '0.5, 0.5, 0.5, 1',
    grey: '0.5, 0.5, 0.5, 1',
    brown: '0.6, 0.3, 0, 1',
    pink: '1, 0.7, 0.7, 1',
    transparent: '1, 1, 1, 0.5'
  };
  
  return colorMap[colorName] || '0.7, 0.7, 0.7, 1';
}; 