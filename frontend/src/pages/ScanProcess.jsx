import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { ArrowPathIcon, ArrowRightIcon, EyeIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useScanStore } from '../store/scanStore';
import { processImages } from '../api/client';
import ImageAnalysisViewer from '../components/ImageAnalysisViewer';

// Constants for image requirements
const MIN_RECOMMENDED_IMAGES = 10;
const IDEAL_IMAGES = 12;

const ScanProcess = () => {
  const navigate = useNavigate();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [processedImages, setProcessedImages] = useState([]);
  const [imageQualityScores, setImageQualityScores] = useState({});
  
  const {
    images,
    setIsProcessing,
    setProcessingProgress,
    setJobId,
    setMeshUrl,
    objectDimensions,
    setObjectDimensions,
    setObjectType
  } = useScanStore();
  
  // Calculate overall image collection quality
  const imageCollectionQuality = React.useMemo(() => {
    if (!images || images.length === 0) return 0;
    
    // Factor 1: Number of images (max score: 50)
    const countScore = Math.min(images.length / IDEAL_IMAGES, 1) * 50;
    
    // Factor 2: Coverage of different angles (rough estimation)
    // In a real app, this would analyze feature distribution across images
    const coverageScore = Math.min(images.length / 8, 1) * 30;
    
    // Factor 3: Average image quality (max score: 20)
    const qualityScores = Object.values(imageQualityScores);
    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0.7; // Default quality if not assessed
    const qualityScore = avgQuality * 20;
    
    return Math.min(Math.round(countScore + coverageScore + qualityScore), 100);
  }, [images, imageQualityScores]);
  
  // Analyze image quality when images change
  useEffect(() => {
    if (!images || images.length === 0) return;
    
    // Process each image to assess quality
    const assessImageQuality = async () => {
      const newScores = {};
      
      for (const image of images) {
        if (!imageQualityScores[image.id]) {
          // Simple mock quality assessment - in a real app, this would use 
          // image analysis to check focus, lighting, and composition
          const mockScore = 0.6 + Math.random() * 0.4; // Random score between 0.6 and 1.0
          newScores[image.id] = mockScore;
        } else {
          newScores[image.id] = imageQualityScores[image.id];
        }
      }
      
      setImageQualityScores(newScores);
    };
    
    assessImageQuality();
  }, [images]);
  
  // Redirect if no images
  useEffect(() => {
    if (!images || images.length === 0) {
      navigate('/scan');
    }
  }, [images, navigate]);
  
  // Handle dimension detection from image analysis
  const handleDimensionsDetected = (dimensions) => {
    console.log('Dimensions detected:', dimensions);
    setObjectDimensions(dimensions);
  };
  
  // Mock object type detection based on dimensions
  const detectObjectType = (dimensions) => {
    if (!dimensions) return 'unknown';
    
    const { width, height, depth } = dimensions;
    const aspectRatio = height / Math.max(width, depth);
    
    if (aspectRatio > 2) {
      return 'bottle';
    } else if (Math.abs(width - depth) < width * 0.2 && Math.abs(width - height) < width * 0.2) {
      return 'sphere';
    } else if (aspectRatio < 0.7 && width > height) {
      return 'box';
    } else if (aspectRatio > 0.7 && aspectRatio < 1.5) {
      return 'cup';
    } else {
      return 'box'; // Default
    }
  };
  
  // Process images mutation
  const processImagesMutation = useMutation(
    (request) => {
      setIsProcessing(true);
      return processImages(request);
    },
    {
      onSuccess: (data) => {
        if (data.jobId) {
          setJobId(data.jobId);
          
          // Simulate processing steps
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            setProcessingProgress(progress);
            
            if (progress >= 100) {
              clearInterval(interval);
              setIsProcessing(false);
              
              // Mock mesh URL
              setMeshUrl(`/api/files/mesh/${data.jobId}`);
              
              // Detect object type based on dimensions
              const detectedType = detectObjectType(objectDimensions);
              setObjectType(detectedType);
              
              toast.success('3D model generated successfully!');
              navigate(`/design/${data.jobId}`);
            }
          }, 1000);
        } else {
          setIsProcessing(false);
          toast.error('Failed to process images');
        }
      },
      onError: (error) => {
        setIsProcessing(false);
        toast.error(`Error processing images: ${error.message}`);
      }
    }
  );
  
  // Handle submission to begin 3D model generation
  const handleSubmit = () => {
    if (!images || images.length === 0) {
      toast.error('No images available for processing');
      return;
    }
    
    if (!objectDimensions) {
      toast.error('Object dimensions not detected. Please try again with clearer images.');
      return;
    }
    
    // Warn if not enough images for high-quality reconstruction
    if (images.length < MIN_RECOMMENDED_IMAGES) {
      const proceed = window.confirm(
        `You only have ${images.length} images. For best results, we recommend at least ${MIN_RECOMMENDED_IMAGES} images from different angles. Continue anyway?`
      );
      
      if (!proceed) return;
    }
    
    // In a real app, this would send the actual images to the server
    // For demo, we'll just mock the processing
    const imageUrls = images.map(img => img.dataUrl);
    processImagesMutation.mutate({ images: imageUrls });
  };
  
  // Return to capture page
  const handleRetake = () => {
    navigate('/scan');
  };
  
  // Render quality indicator for an image
  const renderQualityIndicator = (imageId) => {
    const quality = imageQualityScores[imageId] || 0;
    
    if (quality > 0.8) {
      return (
        <div className="absolute top-1 right-1 bg-green-500 bg-opacity-80 rounded-full p-1" title="Good quality">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>
      );
    } else if (quality > 0.6) {
      return (
        <div className="absolute top-1 right-1 bg-yellow-500 bg-opacity-80 rounded-full p-1" title="Acceptable quality">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>
      );
    } else {
      return (
        <div className="absolute top-1 right-1 bg-red-500 bg-opacity-80 rounded-full p-1" title="Poor quality - consider retaking">
          <ExclamationCircleIcon className="h-4 w-4 text-white" />
        </div>
      );
    }
  };
  
  return (
    <div className="scan-process-container p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Image Analysis & Processing</h1>
      
      {/* Image collection quality indicator */}
      <div className="mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Image Collection Quality</h2>
        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full ${
              imageCollectionQuality > 75 ? 'bg-green-500' :
              imageCollectionQuality > 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${imageCollectionQuality}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{imageCollectionQuality}%</span>
          <span className="flex items-center">
            {images.length}/{IDEAL_IMAGES} Recommended Images
          </span>
        </div>
        <div className="mt-2 text-sm">
          {imageCollectionQuality < 50 && (
            <p className="text-red-500">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              Poor image collection. Please capture at least {MIN_RECOMMENDED_IMAGES} images from various angles.
            </p>
          )}
          {imageCollectionQuality >= 50 && imageCollectionQuality < 75 && (
            <p className="text-yellow-500">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              Adequate image collection. Adding more images from different angles would improve results.
            </p>
          )}
          {imageCollectionQuality >= 75 && (
            <p className="text-green-500">
              <CheckCircleIcon className="h-4 w-4 inline mr-1" />
              Good image collection. Your 3D model should have good quality.
            </p>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Image Analysis</h2>
            <button
              className="px-3 py-1 flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-red dark:hover:text-brand-red"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
          </div>
          
          {showAnalytics ? (
            <div className="analytics-panel">
              <ImageAnalysisViewer 
                images={images.map(img => img.dataUrl)}
                dimensions={objectDimensions}
                onDimensionsDetected={handleDimensionsDetected}
              />
            </div>
          ) : (
            <div className="image-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative rounded overflow-hidden aspect-square">
                  <img 
                    src={image.dataUrl} 
                    alt={`Scan ${index + 1}`} 
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                    {index + 1}
                  </div>
                  {renderQualityIndicator(image.id)}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>For best results:</strong> Capture 10-12 images of your object from different angles, 
              including top, bottom and sides. Ensure good lighting and keep the object centered.
            </p>
          </div>
        </div>
      </div>
      
      <div className="dimension-panel mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Detected Dimensions</h2>
        
        {objectDimensions ? (
          <div>
            <div className="flex flex-wrap gap-3 mb-2">
              <div className="dimension-badge">
                <span className="font-semibold">Width:</span> {objectDimensions.width}mm
              </div>
              <div className="dimension-badge">
                <span className="font-semibold">Height:</span> {objectDimensions.height}mm
              </div>
              <div className="dimension-badge">
                <span className="font-semibold">Depth:</span> {objectDimensions.depth}mm
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dimensions are approximate and will be used to generate the 3D model.
            </p>
          </div>
        ) : (
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
            Analyzing dimensions...
          </div>
        )}
      </div>
      
      <div className="object-type-panel mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Object Recognition</h2>
        
        {objectDimensions ? (
          <div>
            <div className="mb-2 font-medium">
              Detected Object Type: <span className="text-brand-red">{detectObjectType(objectDimensions)}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Object type is estimated based on dimensions and will be used to optimize the 3D model.
              You can change this later in the design studio.
            </p>
          </div>
        ) : (
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
            Analyzing object type...
          </div>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mt-8">
        <button
          className="btn btn-secondary flex-1 flex items-center justify-center"
          onClick={handleRetake}
        >
          {images && images.length < MIN_RECOMMENDED_IMAGES ? "Add More Images" : "Retake Images"}
        </button>
        
        <button
          className="btn btn-primary flex-1 flex items-center justify-center"
          onClick={handleSubmit}
          disabled={processImagesMutation.isLoading || !objectDimensions}
        >
          {processImagesMutation.isLoading ? (
            <>
              <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
              Processing...
            </>
          ) : (
            <>
              Continue to Design Studio
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScanProcess; 