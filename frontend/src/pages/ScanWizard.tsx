import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CameraIcon, ArrowUpTrayIcon, CheckCircleIcon, CubeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { getCamera, stopCamera, takePhoto } from '../utils/camera'
import { uploadImages, subscribeToReconstructionProgress } from '../api/client'
import { useScanStore } from '../store/scanStore'
import { motion } from 'framer-motion'
import { estimateDimensions, getDefaultDimensions, AnalysisData } from '../utils/objectDetection'

// Note: Using enhanced implementation for object detection in objectDetection.ts

const steps = [
  'Introduction',
  'Image Acquisition',
  'Capture Photos',
  'Object Dimensions',
  'Processing',
]

const ScanWizard = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagePreviewRef = useRef<HTMLImageElement>(null)
  
  const {
    images,
    currentStep,
    isUploading,
    isProcessing,
    processingProgress,
    jobId,
    meshUrl,
    objectDimensions,
    setCurrentStep,
    addImage,
    clearImages,
    setIsUploading,
    setIsProcessing,
    setProcessingProgress,
    setJobId,
    setMeshUrl,
    setObjectDimensions,
  } = useScanStore()

  const [hasCamera, setHasCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isEstimatingDimensions, setIsEstimatingDimensions] = useState(false)
  const [acquisitionMethod, setAcquisitionMethod] = useState<'camera' | 'upload'>('camera')
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([])
  
  // Camera setup - update to handle both step 1 and 2 and reinitialize when needed
  useEffect(() => {
    // Initialize camera on steps 1 and 2 if no stream exists and camera method selected
    if ((currentStep === 1 || currentStep === 2) && videoRef.current && !stream && acquisitionMethod === 'camera') {
      initCamera()
    }
    
    // Reinitialize camera after step changes if needed
    if (currentStep === 2 && videoRef.current && stream && !videoRef.current.srcObject && acquisitionMethod === 'camera') {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(error => {
        console.error('Error playing video:', error)
      })
    }
    
    return () => {
      // Only stop camera when leaving both step 1 and 2
      if (currentStep !== 1 && currentStep !== 2 && stream && videoRef.current) {
        stopCamera(videoRef.current)
      }
    }
  }, [currentStep, stream, acquisitionMethod])
  
  // Process monitoring
  useEffect(() => {
    if (jobId && isProcessing) {
      const unsubscribe = subscribeToReconstructionProgress(
        jobId,
        (event) => {
          setProcessingProgress(event.progress)
          
          if (event.status === 'completed' && event.meshUrl) {
            setIsProcessing(false)
            setMeshUrl(event.meshUrl)
            toast.success('Scan complete!')
            // Navigate to design studio
            navigate(`/design/${jobId}`)
          } else if (event.status === 'failed') {
            setIsProcessing(false)
            toast.error(`Reconstruction failed: ${event.error || 'Unknown error'}`)
          }
        },
        (error) => {
          setIsProcessing(false)
          toast.error(`Error monitoring progress: ${error instanceof Error ? error.message : String(error)}`)
        }
      )
      
      return unsubscribe
    }
  }, [jobId, isProcessing, navigate, setIsProcessing, setMeshUrl, setProcessingProgress])
  
  const initCamera = async () => {
    if (!videoRef.current) return
    
    try {
      // Check if in secure context, but allow override with env variable
      const insecureCameraAllowed = import.meta.env?.VITE_INSECURE_CAMERA === 'true'
      if (window.isSecureContext === false && !insecureCameraAllowed) {
        toast.error('Camera access requires HTTPS or localhost. Current page is not in a secure context.')
        setHasCamera(false)
        return
      }

      // Verify camera permissions with specific constraints
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment',
        },
        audio: false,
      }
      
      // Release any existing tracks before requesting new ones
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream
        if (oldStream) {
          oldStream.getTracks().forEach(track => {
            track.stop()
          })
        }
      }
      
      // Use navigator.mediaDevices to get camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Set the stream to the video element
      videoRef.current.srcObject = cameraStream
      
      // Play the video once metadata is loaded
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(error => {
          console.error('Error playing video:', error)
          toast.error(`Error starting camera stream: ${error instanceof Error ? error.message : String(error)}`)
        })
      }
      
      setStream(cameraStream)
      setHasCamera(true)
      toast.success('Camera initialized!')
    } catch (error) {
      console.error('Camera error:', error)
      toast.error(`Camera error: ${error instanceof Error ? error.message : String(error)}. Try reloading the page.`)
      setHasCamera(false)
    }
  }
  
  // Add a function to manually reinitialize camera when needed
  const reinitializeCamera = () => {
    if (stream) {
      // Stop existing tracks
      stream.getTracks().forEach(track => {
        track.stop()
      })
      setStream(null)
    }
    
    // Clear video srcObject
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null
    }
    
    // Delay a bit before reinitializing
    setTimeout(() => {
      initCamera()
    }, 500)
  }
  
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not properly initialized')
      
      // Try to reinitialize camera
      if (!stream || !videoRef.current.srcObject) {
        reinitializeCamera()
        toast.info('Trying to reinitialize camera...')
        return
      }
      return
    }
    
    try {
      // Ensure we have a valid video stream
      if (!videoRef.current.srcObject) {
        if (stream) {
          videoRef.current.srcObject = stream
          await new Promise(resolve => {
            videoRef.current!.onloadedmetadata = resolve
          })
        } else {
          throw new Error('No camera stream available')
        }
      }
      
      const photoDataUrl = await takePhoto(videoRef.current, canvasRef.current)
      addImage(photoDataUrl)
      toast.success(`Photo ${images.length + 1} captured!`)
      
      if (images.length >= 5) {
        toast.success('You have enough photos! Continue to the next step or take more for better quality.')
      }
    } catch (error) {
      console.error('Photo capture error:', error)
      toast.error(`Photo capture error: ${error instanceof Error ? error.message : String(error)}`)
      
      // Try to reinitialize camera on error
      reinitializeCamera()
    }
  }
  
  // Handle file selection for upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    // Process each file
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`)
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string
          addImage(dataUrl)
          toast.success(`Image "${file.name}" loaded`)
        }
      }
      reader.onerror = () => {
        toast.error(`Failed to read file ${file.name}`)
      }
      reader.readAsDataURL(file)
    })
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleNext = () => {
    // Validate that we can proceed
    if (currentStep === 2 && images.length < 3) {
      return toast.error('Please take at least 3 photos')
    }
    
    if (currentStep === 3 && !objectDimensions) {
      estimateObjectDimensions()
    }
    
    // Handle special steps
    if (currentStep === 3) {
      handleUpload()
    }
    
    // Proceed to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 0) {
      // If moving back to camera steps, ensure camera is working
      if (currentStep === 3 && !stream && acquisitionMethod === 'camera') {
        reinitializeCamera()
      }
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleUpload = async () => {
    if (images.length === 0) {
      return toast.error('No images to upload')
    }
    
    try {
      setIsUploading(true)
      toast.loading('Uploading images...')
      
      const response = await uploadImages(images)
      
      setJobId(response.jobId)
      setIsProcessing(true)
      setIsUploading(false)
      
      toast.success('Images uploaded, starting processing')
    } catch (error) {
      setIsUploading(false)
      toast.error(`Upload error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Real object dimension estimation
  const estimateObjectDimensions = async () => {
    if (images.length === 0) {
      setObjectDimensions(getDefaultDimensions())
      toast.warning('No images available, using default dimensions')
      return
    }
    
    setIsEstimatingDimensions(true)
    toast.loading('Analyzing object dimensions...')
    
    try {
      // Create image elements for each captured image
      const imageElements: HTMLImageElement[] = await Promise.all(
        images.map(image => {
          return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = image.dataUrl
          })
        })
      ) as HTMLImageElement[]
      
      // If we have video element and it's active, add it too
      if (videoRef.current && videoRef.current.srcObject && acquisitionMethod === 'camera') {
        imageElements.push(videoRef.current)
      }
      
      // Run the multi-view analysis
      const result = await estimateDimensions(imageElements)
      
      setObjectDimensions(result.dimensions)
      setAnalysisData(result.analysisData)
      
      toast.success(`Object dimensions estimated with ${Math.round(result.dimensions.confidence * 100)}% confidence`)
    } catch (error) {
      console.error('Dimension estimation error:', error)
      setObjectDimensions(getDefaultDimensions())
      toast.error('Error estimating dimensions, using defaults')
    } finally {
      setIsEstimatingDimensions(false)
    }
  }
  
  // Choose acquisition method (camera or upload)
  const chooseAcquisitionMethod = (method: 'camera' | 'upload') => {
    setAcquisitionMethod(method)
    
    // Initialize camera if needed
    if (method === 'camera' && !stream) {
      setTimeout(() => {
        initCamera()
      }, 300)
    }
    
    // Move to next step
    setCurrentStep(2)
  }
  
  // Determine if we should show the camera or file upload UI
  const renderAcquisitionUI = () => {
    if (currentStep === 1) {
      return (
        <div className="text-center">
          <p className="mb-6">Choose how you want to acquire images:</p>
          
          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
            <button 
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 rounded-lg hover:border-brand-red hover:bg-gray-50 transition-colors"
              onClick={() => chooseAcquisitionMethod('camera')}
            >
              <CameraIcon className="h-16 w-16 mb-4 text-brand-red" />
              <span className="font-medium">Use Camera</span>
              <p className="text-sm text-gray-500 mt-2">Take photos in real-time with your device camera</p>
            </button>
            
            <button 
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 rounded-lg hover:border-brand-red hover:bg-gray-50 transition-colors"
              onClick={() => chooseAcquisitionMethod('upload')}
            >
              <ArrowUpTrayIcon className="h-16 w-16 mb-4 text-brand-red" />
              <span className="font-medium">Upload Images</span>
              <p className="text-sm text-gray-500 mt-2">Use existing photos from your device</p>
            </button>
          </div>
        </div>
      )
    }
    
    if (currentStep === 2) {
      if (acquisitionMethod === 'camera') {
        // Camera UI
        return (
          <div>
            <p className="mb-4 text-center">
              Take 6-8 photos as you rotate around the object. 
              <br/>
              Captured: <strong>{images.length}</strong>
            </p>
            <div className="camera-view mb-4">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef} 
                className="hidden"
              />
            </div>
            
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {images.slice(-4).map((image) => (
                  <div key={image.id} className="aspect-[4/3] rounded overflow-hidden bg-gray-200">
                    <img src={image.dataUrl} alt="Captured" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between">
              <button 
                className="btn btn-secondary" 
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={capturePhoto}
              >
                <CameraIcon className="h-5 w-5 mr-1 inline" />
                Take Photo
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleNext}
                disabled={images.length < 3}
              >
                Next
              </button>
            </div>
          </div>
        )
      } else {
        // File upload UI
        return (
          <div>
            <p className="mb-4 text-center">
              Upload 6-8 photos of your object from different angles.
              <br/>
              Uploaded: <strong>{images.length}</strong>
            </p>
            
            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <PhotoIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="mb-4">Drag and drop images here, or click to select files</p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleFileSelect}
                className="hidden" 
                id="file-upload" 
              />
              <button 
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="h-5 w-5 mr-1 inline" />
                Select Images
              </button>
            </div>
            
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {images.map((image) => (
                  <div key={image.id} className="aspect-[4/3] rounded overflow-hidden bg-gray-200">
                    <img src={image.dataUrl} alt="Uploaded" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between">
              <button 
                className="btn btn-secondary" 
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleNext}
                disabled={images.length < 3}
              >
                Next
              </button>
            </div>
          </div>
        )
      }
    }
    
    return null
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-center items-center">
          {steps.map((step, index) => (
            <div 
              key={step} 
              className="flex items-center"
            >
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium
                  ${currentStep >= index 
                    ? 'bg-brand-red text-white' 
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
              >
                {index + 1}
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={`h-1 w-10 mx-1
                    ${currentStep > index 
                      ? 'bg-brand-red' 
                      : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-2">
          <h2 className="text-xl font-semibold">{steps[currentStep]}</h2>
        </div>
      </div>
      
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="scan-step"
      >
        {/* Step content */}
        {currentStep === 0 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-brand-red mb-6">Welcome to Prompt2Cad</h1>
            <p className="mb-6">
              This wizard will guide you through scanning an object and turning it into a 3D model.
            </p>
            <div className="flex justify-center mb-6">
              <CameraIcon className="h-24 w-24 text-brand-red" />
            </div>
            <p className="mb-8">
              You'll need to take 6-8 photos of your object from different angles. 
              For best results, place the object on a contrasting background with good lighting.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={handleNext}
            >
              Get Started
            </button>
          </div>
        )}
        
        {currentStep === 1 || currentStep === 2 ? renderAcquisitionUI() : null}
        
        {currentStep === 3 && (
          <div>
            <p className="mb-4 text-center">
              Analyzing images to detect object and estimate dimensions
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
              {!objectDimensions ? (
                <div className="flex flex-col items-center">
                  <button 
                    className="btn btn-primary mb-4"
                    onClick={estimateObjectDimensions}
                    disabled={isEstimatingDimensions}
                  >
                    {isEstimatingDimensions ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Images...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CubeIcon className="h-5 w-5 mr-1 inline" />
                        Analyze Dimensions
                      </span>
                    )}
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    This will analyze your uploaded images to detect the object and estimate its dimensions.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-4">
                    <CheckCircleIcon className="h-8 w-8 text-green-500 mr-2" />
                    <h3 className="text-lg font-medium">Analysis Complete</h3>
                  </div>
                  
                  {/* Dimension display */}
                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-6">
                    <div className="bg-white dark:bg-gray-700 p-3 rounded text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Width</p>
                      <p className="font-bold">{objectDimensions.width} mm</p>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Height</p>
                      <p className="font-bold">{objectDimensions.height} mm</p>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Depth</p>
                      <p className="font-bold">{objectDimensions.depth} mm</p>
                    </div>
                  </div>
                  
                  {/* Confidence indicator */}
                  <div className="w-full max-w-sm mb-6">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Confidence</span>
                      <span className="text-sm font-medium">{Math.round(objectDimensions.confidence * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: `${Math.round(objectDimensions.confidence * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Analysis details */}
                  {analysisData.length > 0 && (
                    <div className="w-full">
                      <h4 className="font-medium mb-2">Analysis Details</h4>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                        <ul className="space-y-1">
                          {analysisData.map((data, index) => (
                            <li key={index} className="flex items-start">
                              <span className="inline-block w-6 h-6 bg-brand-red text-white rounded-full text-center leading-6 mr-2">{index + 1}</span>
                              <div>
                                <span className="font-medium">
                                  {data.referenceObject 
                                    ? `Detected: ${data.referenceObject}`
                                    : 'Unknown object'}
                                </span>
                                {data.scaleFactor && (
                                  <span className="ml-2 text-gray-500">
                                    (Scale: {data.scaleFactor.toFixed(2)}x)
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                          <p>The analysis combines data from all provided images, giving more weight to high-confidence detections.</p>
                          {analysisData.some(data => data.referenceObject) ? (
                            <p className="mt-1">Using known reference objects to calibrate measurements.</p>
                          ) : (
                            <p className="mt-1">No reference objects detected. Estimating based on visual cues.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Visualization sample */}
                  {analysisData.length > 0 && images.length > 0 && (
                    <div className="w-full mt-4">
                      <h4 className="font-medium mb-2">Measurement Visualization</h4>
                      <div className="aspect-[4/3] relative rounded overflow-hidden bg-gray-800">
                        <img 
                          ref={imagePreviewRef}
                          src={images[0].dataUrl} 
                          alt="Analysis" 
                          className="w-full h-full object-contain" 
                        />
                        {analysisData[0]?.measurements && (
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Width line */}
                            <line 
                              x1={analysisData[0].measurements.width.points[0][0]} 
                              y1={analysisData[0].measurements.width.points[0][1]} 
                              x2={analysisData[0].measurements.width.points[1][0]} 
                              y2={analysisData[0].measurements.width.points[1][1]} 
                              stroke="red" 
                              strokeWidth="0.5"
                              strokeDasharray="2,1"
                            />
                            {/* Height line */}
                            <line 
                              x1={analysisData[0].measurements.height.points[0][0]} 
                              y1={analysisData[0].measurements.height.points[0][1]} 
                              x2={analysisData[0].measurements.height.points[1][0]} 
                              y2={analysisData[0].measurements.height.points[1][1]} 
                              stroke="green" 
                              strokeWidth="0.5"
                              strokeDasharray="2,1"
                            />
                            {/* Depth line */}
                            <line 
                              x1={analysisData[0].measurements.depth.points[0][0]} 
                              y1={analysisData[0].measurements.depth.points[0][1]} 
                              x2={analysisData[0].measurements.depth.points[1][0]} 
                              y2={analysisData[0].measurements.depth.points[1][1]} 
                              stroke="blue" 
                              strokeWidth="0.5"
                              strokeDasharray="2,1"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex mt-2 text-xs justify-center space-x-4">
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>
                          <span>Width: {objectDimensions.width}mm</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>
                          <span>Height: {objectDimensions.height}mm</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span>
                          <span>Depth: {objectDimensions.depth}mm</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button 
                className="btn btn-secondary" 
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!objectDimensions}
              >
                Continue to Processing
              </button>
            </div>
          </div>
        )}
        
        {currentStep === 4 && (
          <div>
            <p className="mb-4 text-center">
              Building your 3D model...
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg mb-6">
              {/* Progress tracker with stages */}
              <div className="mb-6">
                <div className="relative">
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div 
                      style={{ width: `${processingProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand-red"
                    />
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <div className="text-center">
                      <div className={`w-5 h-5 mb-1 mx-auto rounded-full flex items-center justify-center ${processingProgress >= 10 ? 'bg-brand-red text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>1</div>
                      <span>Uploading</span>
                    </div>
                    <div className="text-center">
                      <div className={`w-5 h-5 mb-1 mx-auto rounded-full flex items-center justify-center ${processingProgress >= 30 ? 'bg-brand-red text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>2</div>
                      <span>Analyzing</span>
                    </div>
                    <div className="text-center">
                      <div className={`w-5 h-5 mb-1 mx-auto rounded-full flex items-center justify-center ${processingProgress >= 50 ? 'bg-brand-red text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>3</div>
                      <span>Point Cloud</span>
                    </div>
                    <div className="text-center">
                      <div className={`w-5 h-5 mb-1 mx-auto rounded-full flex items-center justify-center ${processingProgress >= 70 ? 'bg-brand-red text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>4</div>
                      <span>Meshing</span>
                    </div>
                    <div className="text-center">
                      <div className={`w-5 h-5 mb-1 mx-auto rounded-full flex items-center justify-center ${processingProgress >= 90 ? 'bg-brand-red text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>5</div>
                      <span>Texturing</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <div className="text-2xl font-bold">{processingProgress}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {processingProgress < 20 ? 'Uploading images...' : 
                     processingProgress < 40 ? 'Analyzing image features...' :
                     processingProgress < 60 ? 'Generating point cloud...' :
                     processingProgress < 80 ? 'Creating 3D mesh...' :
                     processingProgress < 100 ? 'Applying textures...' : 'Completed!'}
                  </div>
                </div>
              </div>
              
              {/* Technical explanation */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-sm mb-6">
                <h4 className="font-medium mb-2">What's happening?</h4>
                <div className="space-y-2">
                  <p>Our AI-powered reconstruction pipeline is processing your images through several technical stages:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li className={processingProgress >= 10 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      <strong>Feature extraction</strong> - Identifying unique points across images
                    </li>
                    <li className={processingProgress >= 30 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      <strong>Camera position estimation</strong> - Determining camera viewpoints
                    </li>
                    <li className={processingProgress >= 50 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      <strong>Structure from Motion (SfM)</strong> - Creating sparse 3D points
                    </li>
                    <li className={processingProgress >= 70 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      <strong>Multi-View Stereo (MVS)</strong> - Densifying point cloud
                    </li>
                    <li className={processingProgress >= 90 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      <strong>Meshing and texturing</strong> - Creating the final 3D model
                    </li>
                  </ol>
                </div>
              </div>
              
              {/* Visual status indicator */}
              <div className="text-center">
                <div className="inline-block relative mx-auto">
                  <div className="relative w-32 h-32 rounded-full border-4 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <svg className="animate-spin absolute" width="100" height="100" viewBox="0 0 100 100" fill="none">
                      <path 
                        d="M50 8 A 42 42 0 0 1 92 50" 
                        stroke="#FF3B3B" 
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center">
                      <ArrowUpTrayIcon className="h-10 w-10 mx-auto text-brand-red" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  This process typically takes 2-3 minutes depending on the number of photos and their quality.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ScanWizard 