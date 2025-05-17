import React, { useState, useRef, Suspense, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { CodeBracketIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useScanStore } from '../store/scanStore'
import { generateCAD } from '../api/client'
import { detectWebGL } from '../utils/webglDetector'

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
  } = useScanStore()
  
  const [prompt, setPrompt] = useState('')
  const [showCADSource, setShowCADSource] = useState(false)
  const [cadSource, setCADSource] = useState('')
  const [webGLInfo, setWebGLInfo] = useState({ checking: true, supported: false, error: null })
  const [ThreeComponents, setThreeComponents] = useState(null)
  
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
  
  // Mock loaded mesh URL if it doesn't exist in store
  const modelUrl = meshUrl || '/sample/object.glb'
  
  // Load Three.js components lazily to prevent blank screen on errors
  const loadThreeComponents = async () => {
    try {
      // Dynamic imports to prevent blank screen on Three.js load errors
      const { Canvas } = await import('@react-three/fiber')
      const { OrbitControls, Environment } = await import('@react-three/drei')
      const THREE = await import('three')
      
      // Basic model component that uses a colored box instead of GLTF
      const SimpleModel = ({ color = '#ff3b3f', position = [0, 0, 0] }) => {
        return (
          <mesh position={position}>
            <boxGeometry args={[50, 50, 50]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      }
      
      // Create simple scene with fallback models
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
            <SimpleModel color="#ff3b3f" />
            {cadUrl && <SimpleModel color="#3b87ff" position={[60, 0, 0]} />}
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
  
  const generateCADMutation = useMutation(
    (request) => generateCAD(request),
    {
      onSuccess: (data) => {
        if (data.modelUrl) {
          setCadUrl(data.modelUrl)
          
          // In a real app we would load the JSCAD source
          setCADSource(`// OpenJSCAD source for generated model
function main() {
  const dimensions = {
    width: ${objectDimensions?.width || 100},
    height: ${objectDimensions?.height || 80},
    depth: ${objectDimensions?.depth || 50}
  };
  
  // Create a parametric design based on scanned object
  const case = createCase(dimensions);
  
  return case;
}

// Create a case that wraps around the object with a small offset
function createCase(dimensions) {
  const offset = 3; // 3mm wall thickness
  
  return CSG.cube({
    center: [0, 0, 0],
    radius: [
      dimensions.width/2 + offset,
      dimensions.height/2 + offset,
      dimensions.depth/2 + offset
    ]
  }).subtract(
    CSG.cube({
      center: [0, 0, offset/2], // Shift slightly to create a base
      radius: [
        dimensions.width/2,
        dimensions.height/2,
        dimensions.depth/2
      ]
    })
  );
}`)
          
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
      dimensions: objectDimensions
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
        
        <div className="mb-4 flex-grow">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Describe what you want to generate:
          </label>
          <textarea 
            id="prompt"
            ref={promptInputRef}
            className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-brand-red focus:border-brand-red"
            placeholder="e.g., Generate a phone case with a magsafe ring and a kickstand"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <button
            className="w-full btn btn-primary flex items-center justify-center"
            disabled={generateCADMutation.isLoading || !prompt}
            onClick={handleGenerateCAD}
          >
            {generateCADMutation.isLoading ? (
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