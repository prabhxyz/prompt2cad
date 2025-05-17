import React, { useState, useRef, Suspense, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { CodeBracketIcon, ArrowPathIcon, ArrowDownTrayIcon, CubeIcon } from '@heroicons/react/24/outline'
import { useScanStore } from '../store/scanStore'
import { generateCAD } from '../api/client'
import { detectWebGL } from '../utils/webglDetector'
// Import THREE statically to avoid dynamic loading issues
import * as THREE from 'three'

// Simplified component without Three.js dependencies
const DesignStudio = () => {
  const { meshId } = useParams()
  const navigate = useNavigate()
  const promptInputRef = useRef()
  
  const {
    meshUrl,
    cadUrl,
    objectDimensions,
    setCadUrl,
    setObjectType,
    objectType
  } = useScanStore()
  
  const [prompt, setPrompt] = useState('')
  const [showCADSource, setShowCADSource] = useState(false)
  const [cadSource, setCADSource] = useState('')
  const [webGLInfo, setWebGLInfo] = useState({ checking: true, supported: false, error: null })
  const [ThreeComponents, setThreeComponents] = useState(null)
  const [isModelProcessing, setIsModelProcessing] = useState(false)
  const [cadModification, setCadModification] = useState(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [styleOptions, setStyleOptions] = useState({
    roundedCorners: false,
    hollow: false,
    pattern: null,
    color: null
  })
  
  // Object type detection/selection
  const [detectedObjectTypes, setDetectedObjectTypes] = useState([
    { id: 'unknown', name: 'Auto-detect', icon: <CubeIcon className="w-4 h-4" /> },
    { id: 'box', name: 'Box', icon: <CubeIcon className="w-4 h-4" /> },
    { id: 'bottle', name: 'Bottle', icon: <CubeIcon className="w-4 h-4" /> },
    { id: 'cup', name: 'Cup', icon: <CubeIcon className="w-4 h-4" /> },
    { id: 'sphere', name: 'Sphere', icon: <CubeIcon className="w-4 h-4" /> }
  ])
  
  // Check WebGL support immediately when component mounts
  useEffect(() => {
    try {
      const result = detectWebGL()
      console.log('WebGL detection:', result)
      setWebGLInfo({ 
        checking: false,
        supported: result.supported,
        error: result.error || null
      })
      
      // Only try to load Three.js if WebGL is supported
      if (result.supported) {
        loadThreeComponents()
      }
    } catch (e) {
      console.error('Error during WebGL detection:', e)
      setWebGLInfo({
        checking: false,
        supported: false,
        error: e.message || 'Unknown error detecting WebGL support'
      })
    }
  }, [])
  
  // Reload Three.js components when object type changes
  useEffect(() => {
    // Only reload if WebGL is supported and we've already loaded components once
    if (webGLInfo.supported && ThreeComponents !== null) {
      console.log("Object type changed to:", objectType);
      loadThreeComponents();
    }
  }, [objectType, webGLInfo.supported]);
  
  // If no object type is set, attempt to detect one from the images
  useEffect(() => {
    if (!objectType && meshUrl) {
      detectObjectType(meshUrl);
    }
  }, [meshUrl, objectType]);
  
  // Detect object type from images using image recognition
  const detectObjectType = async (imageUrl) => {
    try {
      // Mock image detection - in a real app, call vision API
      console.log('Detecting object type from', imageUrl);
      
      // Simulate API call with timeout
      setTimeout(() => {
        // Randomly select an object type for demonstration
        const types = ['box', 'bottle', 'cup', 'sphere'];
        const detectedType = types[Math.floor(Math.random() * types.length)];
        console.log('Detected object type:', detectedType);
        
        // Update store with detected type
        setObjectType(detectedType);
      }, 1500);
      
      // A real implementation would use:
      // 1. Send images to a vision API (Google Cloud Vision, Azure Computer Vision)
      // 2. Process the labels and classifications returned
      // 3. Map the classifications to our supported object types
      
    } catch (error) {
      console.error('Error detecting object type:', error);
      setObjectType('unknown'); // Default to unknown if detection fails
    }
  };
  
  // Mock loaded mesh URL if it doesn't exist in store
  const modelUrl = meshUrl || '/sample/object.glb'
  
  // Load Three.js components lazily to prevent blank screen on errors
  const loadThreeComponents = async () => {
    try {
      // Dynamic imports to prevent blank screen on Three.js load errors
      const { Canvas } = await import('@react-three/fiber')
      const { OrbitControls, Environment, Html } = await import('@react-three/drei')
      
      // Import our enhanced point cloud model
      const EnhancedPointCloudModel = (await import('../components/EnhancedPointCloudModel')).default;
      
      // Point cloud approximation for more organic shapes
      const PointCloudModel = ({ dimensions, color }) => {
        // Use our enhanced point cloud model instead of the basic version
        return <EnhancedPointCloudModel dimensions={dimensions} color={color} pointSize={2} />;
      };
      
      // Component to visualize dimensions with lines
      const DimensionVisualizer = ({ dimensions }) => {
        const { width, height, depth } = dimensions;
        
        // Calculate half dimensions for positioning
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfDepth = depth / 2;
        
        return (
          <group>
            {/* Width dimension line and label */}
            <group position={[0, -halfHeight - 10, 0]}>
              {/* Horizontal line */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[width, 0.5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* End caps */}
              <mesh position={[-halfWidth, 0, 0]}>
                <boxGeometry args={[0.5, 5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[halfWidth, 0, 0]}>
                <boxGeometry args={[0.5, 5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Label */}
              <Html position={[0, -8, 0]} center>
                <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '3px', fontSize: '0.7rem' }}>
                  {width}mm
                </div>
              </Html>
            </group>
            
            {/* Height dimension line and label */}
            <group position={[-halfWidth - 10, 0, 0]}>
              {/* Vertical line */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.5, height, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* End caps */}
              <mesh position={[0, -halfHeight, 0]}>
                <boxGeometry args={[5, 0.5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, halfHeight, 0]}>
                <boxGeometry args={[5, 0.5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Label */}
              <Html position={[-8, 0, 0]} center>
                <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '3px', fontSize: '0.7rem' }}>
                  {height}mm
                </div>
              </Html>
            </group>
            
            {/* Depth dimension line and label */}
            <group position={[halfWidth + 10, 0, 0]}>
              {/* Depth line */}
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <boxGeometry args={[0.5, depth, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* End caps */}
              <mesh position={[0, 0, -halfDepth]}>
                <boxGeometry args={[5, 0.5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, halfDepth]}>
                <boxGeometry args={[5, 0.5, 0.5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Label */}
              <Html position={[8, 0, 0]} center>
                <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '3px', fontSize: '0.7rem' }}>
                  {depth}mm
                </div>
              </Html>
            </group>
          </group>
        );
      };
      
      // Sophisticated model generation component
      const AdvancedModelRenderer = ({ modelType, dimensions, position = [0, 0, 0], color = '#ff3b3f', style = null, operation = null, components = [] }) => {
        // Convert dimensions to number values in case they're strings
        const width = Number(dimensions?.width) || 100;
        const height = Number(dimensions?.height) || 80;
        const depth = Number(dimensions?.depth) || 50;
        
        // Reference to the mesh for measurements
        const modelRef = useRef();
        
        // Default style properties
        const roundedCorners = style?.roundedCorners || false;
        const hollow = style?.hollow || false;
        const pattern = style?.pattern || null;
        const modelColor = style?.color ? style?.color : color;
        
        // Create a more sophisticated 3D model based on object type
        switch(modelType) {
          case 'bottle':
            return (
              <group position={position} ref={modelRef}>
                {/* Bottle body */}
                <mesh position={[0, height/4, 0]}>
                  <cylinderGeometry args={[width/4, width/3, height*0.7, 32]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Bottle neck */}
                <mesh position={[0, height/1.7, 0]}>
                  <cylinderGeometry args={[width/8, width/4, height*0.3, 32]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Bottle cap */}
                <mesh position={[0, height/1.3, 0]}>
                  <cylinderGeometry args={[width/8, width/8, height*0.1, 32]} />
                  <meshStandardMaterial color={modelColor === '#ff3b3f' ? '#cc2c2f' : '#2c62cc'} />
                </mesh>
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'box':
            return (
              <group position={position} ref={modelRef}>
                <mesh>
                  {roundedCorners ? (
                    <boxGeometry args={[width, height, depth, 1, 1, 1]} />
                  ) : (
                    <boxGeometry args={[width, height, depth]} />
                  )}
                  <meshStandardMaterial color={modelColor} transparent opacity={hollow ? 0.7 : 0.9} />
                </mesh>
                {hollow && (
                  <mesh>
                    <boxGeometry args={[width * 0.85, height * 0.85, depth * 0.85]} />
                    <meshStandardMaterial color={modelColor} side={THREE.BackSide} />
                  </mesh>
                )}
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'sphere':
            const radius = Math.max(width, height, depth) / 2;
            return (
              <group position={position} ref={modelRef}>
                <mesh>
                  <sphereGeometry args={[radius, 32, 32]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width: radius*2, height: radius*2, depth: radius*2}} />
              </group>
            );
          case 'cup':
            return (
              <group position={position} ref={modelRef}>
                {/* Cup body - hollow cylinder */}
                <mesh position={[0, height/4, 0]}>
                  <cylinderGeometry args={[width/3, width/3.5, height*0.8, 32]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Cup inside - to create hollow effect */}
                <mesh position={[0, height/4, 0]}>
                  <cylinderGeometry args={[width/3.5, width/4, height*0.75, 32]} />
                  <meshStandardMaterial color="#000" side={THREE.BackSide} />
                </mesh>
                {/* Cup handle */}
                <mesh position={[width/3, height/4, 0]}>
                  <torusGeometry args={[width/8, width/25, 16, 32, Math.PI]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'lid':
            return (
              <group position={position} ref={modelRef}>
                {/* Main lid body */}
                <mesh>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Optional lip for better fit */}
                <mesh position={[0, -height/2, 0]}>
                  <cylinderGeometry args={[Math.min(width, depth) * 0.45, Math.min(width, depth) * 0.45, height * 0.8, 32]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'handle':
            return (
              <group position={position} ref={modelRef}>
                {/* Handle shape - can be curved or straight based on style */}
                {roundedCorners ? (
                  // Curved handle with torus
                  <mesh rotation={[0, 0, Math.PI/2]}>
                    <torusGeometry args={[height * 0.4, width * 0.5, 16, 32, Math.PI]} />
                    <meshStandardMaterial color={modelColor} />
                  </mesh>
                ) : (
                  // Standard cuboid handle
                  <mesh>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={modelColor} />
                  </mesh>
                )}
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'base':
            return (
              <group position={position} ref={modelRef}>
                {/* Main base body */}
                <mesh>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Hollow center if needed */}
                {hollow && (
                  <mesh position={[0, height * 0.15, 0]}>
                    <boxGeometry args={[width * 0.8, height * 0.7, depth * 0.8]} />
                    <meshStandardMaterial color="black" side={THREE.BackSide} />
                  </mesh>
                )}
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'spout':
            return (
              <group position={position} ref={modelRef}>
                {/* Tapered cylinder for spout */}
                <mesh>
                  <cylinderGeometry args={[
                    Math.min(width, depth) * 0.3, // top radius
                    Math.min(width, depth) * 0.5, // bottom radius
                    height,
                    32
                  ]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Inner channel if hollow */}
                {hollow && (
                  <mesh>
                    <cylinderGeometry args={[
                      Math.min(width, depth) * 0.2,
                      Math.min(width, depth) * 0.35,
                      height * 1.1,
                      16
                    ]} />
                    <meshStandardMaterial color="black" side={THREE.BackSide} />
                  </mesh>
                )}
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'hole':
            // For holes, we would normally use CSG subtraction
            // In Three.js we'll just simulate with a colored cylinder
            return (
              <group position={position} ref={modelRef}>
                <mesh>
                  <cylinderGeometry args={[
                    Math.min(width, depth) * 0.5,
                    Math.min(width, depth) * 0.5,
                    height,
                    32
                  ]} />
                  <meshStandardMaterial color="black" transparent opacity={0.6} />
                </mesh>
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          case 'divider':
            return (
              <group position={position} ref={modelRef}>
                <mesh>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={modelColor} />
                </mesh>
                {/* Add pattern if requested */}
                {pattern === 'grid' && Array(5).fill(0).map((_, i) => (
                  <mesh key={i} position={[0, (i - 2) * height/5, 0]}>
                    <boxGeometry args={[width * 1.01, height * 0.05, depth * 1.01]} />
                    <meshStandardMaterial color="black" />
                  </mesh>
                ))}
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
          default:
            // Generate a point cloud approximation for unknown shapes
            // This creates a more organic shape than a simple cube
            return (
              <group position={position} ref={modelRef}>
                <PointCloudModel dimensions={{width, height, depth}} color={modelColor} />
                {/* Add dimension visualization */}
                <DimensionVisualizer dimensions={{width, height, depth}} />
              </group>
            );
        }
      };
      
      // Create simple scene with our advanced models
      const ModelScene = () => (
        <Canvas 
          shadows 
          camera={{ position: [0, 0, 150], fov: 50 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 1)
          }}
        >
          <color attach="background" args={['#000']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <Suspense fallback={null}>
            <AdvancedModelRenderer 
              modelType={objectType || 'unknown'} 
              dimensions={objectDimensions} 
              color="#ff3b3f" 
            />
            {cadUrl && cadModification && (
              <AdvancedModelRenderer 
                modelType={cadModification.type} 
                dimensions={cadModification.dimensions} 
                position={cadModification.position || [0, objectDimensions?.height || 50, 0]} 
                color="#3b87ff" 
                style={cadModification.style}
                operation={cadModification.operation}
                components={cadModification.components}
              />
            )}
            <Environment preset="city" />
          </Suspense>
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05}
            rotateSpeed={0.5}
            minDistance={50}
            maxDistance={500}
          />
          <gridHelper args={[200, 20]} />
        </Canvas>
      )
      
      setThreeComponents({ ModelScene })
    } catch (error) {
      console.error('Failed to load Three.js components:', error)
      setWebGLInfo(prev => ({
        ...prev,
        supported: false,
        error: `Error loading 3D components: ${error.message || 'Unknown error'}`
      }))
    }
  }
  
  // Enhanced CAD generation that interprets the prompt and adds a new component
  const generateCadWithPrompt = async (request) => {
    // In a real app, this would call an AI service to interpret the prompt
    setIsModelProcessing(true);
    
    try {
      const { prompt, dimensions, objectType, styleOptions } = request;
      
      // Wait to simulate API processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use the enhanced generateCAD function from the client API
      // This now uses more sophisticated parametric modeling
      const generatedCAD = await generateCAD({
        meshId: request.meshId,
        prompt,
        dimensions,
        objectType: objectType || 'unknown',
        styleOptions // Pass style options selected by user
      });
      
      // Store the modification details for rendering with enhanced parameters
      setCadModification({
        type: generatedCAD.type || 'box',
        operation: generatedCAD.operation,
        dimensions: generatedCAD.dimensions,
        position: generatedCAD.position,
        style: generatedCAD.style || styleOptions, // Use provided style or fallback to user selections
        components: generatedCAD.components
      });
      
      setIsModelProcessing(false);
      return {
        ...generatedCAD,
        modelUrl: generatedCAD.modelUrl || '/api/files/cad/cad-' + request.meshId
      };
    } catch (error) {
      console.error('Error generating CAD:', error);
      setIsModelProcessing(false);
      throw error;
    }
  };
  
  const generateCADMutation = useMutation(
    (request) => {
      // Call our enhanced prompting function instead of the basic API
      return generateCadWithPrompt(request);
    },
    {
      onSuccess: (data) => {
        if (data.modelUrl) {
          setCadUrl(data.modelUrl)
          
          // Set the generated JSCAD source
          setCADSource(data.code || `// OpenJSCAD source for generated model
function main() {
  const dimensions = {
    width: ${objectDimensions?.width || 100},
    height: ${objectDimensions?.height || 80},
    depth: ${objectDimensions?.depth || 50}
  };
  
  // Create a parametric design based on scanned object
  const base = createBase(dimensions);
  const modification = createModification(dimensions);
  
  return base.union(modification);
}

// Create the base object
function createBase(dimensions) {
  return CSG.cube({
    center: [0, 0, 0],
    radius: [
      dimensions.width/2,
      dimensions.height/2,
      dimensions.depth/2
    ]
  });
}

// Create the modification based on prompt
function createModification(dimensions) {
  return CSG.cube({
    center: [0, dimensions.height/2 + ${data.dimensions?.height || 10}/2, 0],
    radius: [
      ${data.dimensions?.width || dimensions.width * 0.8}/2,
      ${data.dimensions?.height || 10}/2,
      ${data.dimensions?.depth || dimensions.depth * 0.8}/2
    ]
  });
}`);
          
          toast.success('CAD model generated successfully!')
        } else {
          toast.error('Failed to generate CAD model')
        }
      },
      onError: (error) => {
        toast.error(`Error generating CAD: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  )
  
  const handleGenerateCAD = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt describing what you want to generate')
      return
    }
    
    if (!objectDimensions) {
      toast.error('Object dimensions not available')
      return
    }
    
    const request = {
      meshId: meshId || 'demo',
      prompt: prompt,
      dimensions: objectDimensions,
      objectType: objectType || 'unknown',
      styleOptions: styleOptions
    }
    
    generateCADMutation.mutate(request)
  }
  
  const handleDownloadSTL = () => {
    if (cadUrl) {
      // In a real app, this would download the actual STL file
      window.open(cadUrl, '_blank')
    } else {
      toast.error('No CAD model available yet')
    }
  }
  
  const handleDownloadJSCAD = () => {
    if (cadSource) {
      // Create a download link for the JSCAD file
      const element = document.createElement('a')
      const file = new Blob([cadSource], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = 'model.jscad'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } else {
      toast.error('No JSCAD source available')
    }
  }
  
  const handleReset = () => {
    navigate('/scan')
  }
  
  const handleObjectTypeChange = (type) => {
    console.log("Changing object type from", objectType, "to", type);
    
    // Show loading toast
    toast.loading(`Updating model to ${type} type...`, { id: 'object-type-change' });
    
    // Update the object type in the store
    setObjectType(type);
    
    // Dismiss loading toast after a short delay
    setTimeout(() => {
      toast.success(`Model updated to ${type} type`, { id: 'object-type-change' });
    }, 800);
  };
  
  // Render appropriate UI based on WebGL support and loading state
  const renderCanvasContent = () => {
    if (webGLInfo.checking) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center text-white">
            <div className="animate-spin h-10 w-10 border-4 border-white border-t-brand-red rounded-full mb-4"></div>
            <p>Checking 3D support...</p>
          </div>
        </div>
      )
    }
    
    if (!webGLInfo.supported) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-800">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <h3 className="font-bold">3D Rendering Not Available</h3>
            <p className="my-2">{webGLInfo.error || 'Your browser does not support WebGL which is required for 3D rendering.'}</p>
            <div className="flex gap-2 mt-3">
              <button 
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={handleReset}
              >
                Go Back
              </button>
              <button 
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    if (!ThreeComponents) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center text-white">
            <div className="animate-spin h-10 w-10 border-4 border-white border-t-brand-red rounded-full mb-4"></div>
            <p>Loading 3D viewer...</p>
          </div>
        </div>
      )
    }
    
    return <ThreeComponents.ModelScene />
  }
  
  return (
    <div className="design-studio-container">
      <div className="canvas-container">
        {renderCanvasContent()}
      </div>
      
      <div className="prompt-panel">
        <h2 className="text-xl font-bold mb-4">Design Your CAD Add-on</h2>
        
        {objectDimensions && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Object Dimensions:</p>
            <div className="flex flex-wrap">
              <span className="dimension-chip">
                W: {objectDimensions.width}mm
              </span>
              <span className="dimension-chip">
                H: {objectDimensions.height}mm
              </span>
              <span className="dimension-chip">
                D: {objectDimensions.depth}mm
              </span>
            </div>
          </div>
        )}
        
        {/* Object type selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Object Type:</p>
          <div className="flex flex-wrap gap-2">
            {detectedObjectTypes.map(type => (
              <button
                key={type.id}
                className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                  objectType === type.id 
                    ? 'bg-brand-red text-white' 
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}
                onClick={() => handleObjectTypeChange(type.id)}
              >
                {type.icon}
                {type.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4 flex-grow">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Describe what you want to generate:
          </label>
          <textarea 
            id="prompt"
            ref={promptInputRef}
            className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-brand-red focus:border-brand-red"
            placeholder="e.g., Add a lid to the top of the container, Add a handle to the side, Create a base for stability"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          
          {/* Advanced style options */}
          <div className="mt-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Style Options</h3>
              <button 
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showAdvancedOptions ? 'Hide Options' : 'Show Options'}
              </button>
            </div>
            
            {showAdvancedOptions && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-brand-red rounded"
                      checked={styleOptions.roundedCorners}
                      onChange={() => setStyleOptions({...styleOptions, roundedCorners: !styleOptions.roundedCorners})}
                    />
                    <span className="ml-2 text-sm">Rounded Corners</span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-brand-red rounded"
                      checked={styleOptions.hollow}
                      onChange={() => setStyleOptions({...styleOptions, hollow: !styleOptions.hollow})}
                    />
                    <span className="ml-2 text-sm">Hollow</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Pattern</label>
                  <select
                    className="form-select w-full text-sm p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    value={styleOptions.pattern || ""}
                    onChange={(e) => setStyleOptions({...styleOptions, pattern: e.target.value || null})}
                  >
                    <option value="">No Pattern</option>
                    <option value="grid">Grid</option>
                    <option value="honeycomb">Honeycomb</option>
                    <option value="wave">Wave</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['red', 'blue', 'green', 'yellow', 'white', 'black'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border ${styleOptions.color === color ? 'ring-2 ring-brand-red ring-offset-1' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setStyleOptions({...styleOptions, color: color})}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      className="text-xs px-2 border border-gray-300 rounded-full"
                      onClick={() => setStyleOptions({...styleOptions, color: null})}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            className="w-full btn btn-primary flex items-center justify-center"
            disabled={generateCADMutation.isLoading || isModelProcessing || !prompt}
            onClick={handleGenerateCAD}
          >
            {generateCADMutation.isLoading || isModelProcessing ? (
              <>
                <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                Generating...
              </>
            ) : (
              'Generate CAD Model'
            )}
          </button>
          
          {cadUrl && (
            <>
              <div className="flex space-x-2">
                <button
                  className="flex-1 btn btn-secondary flex items-center justify-center"
                  onClick={handleDownloadSTL}
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                  Download STL
                </button>
                <button
                  className="flex-1 btn btn-secondary flex items-center justify-center"
                  onClick={handleDownloadJSCAD}
                >
                  <CodeBracketIcon className="h-5 w-5 mr-1" />
                  Download JSCAD
                </button>
              </div>
              
              <button
                className="w-full btn btn-secondary"
                onClick={() => setShowCADSource(!showCADSource)}
              >
                {showCADSource ? 'Hide JSCAD Source' : 'Show JSCAD Source'}
              </button>
              
              {showCADSource && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-md overflow-auto max-h-48">
                  <pre className="text-xs">
                    {cadSource}
                  </pre>
                </div>
              )}
            </>
          )}
          
          <button
            className="w-full btn btn-secondary"
            onClick={handleReset}
          >
            Start New Scan
          </button>
        </div>
      </div>
    </div>
  )
}

export default DesignStudio 