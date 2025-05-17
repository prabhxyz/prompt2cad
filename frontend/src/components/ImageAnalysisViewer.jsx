import React, { useEffect, useState, useRef } from 'react';
import { 
  removeBackground, 
  extractFeaturePoints, 
  createDimensionVisualization
} from '../utils/imageProcessing';

/**
 * Component for displaying image analysis with dimensions and feature extraction
 */
const ImageAnalysisViewer = ({ 
  images, 
  selectedImageIndex = 0,
  dimensions,
  onDimensionsDetected,
  className = ''
}) => {
  const [processedImages, setProcessedImages] = useState([]);
  const [featurePoints, setFeaturePoints] = useState([]);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [viewMode, setViewMode] = useState('normal'); // normal, segmented, features, dimensions
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(selectedImageIndex);
  const canvasRef = useRef(null);
  
  // Process images when they change
  useEffect(() => {
    if (!images || images.length === 0) return;
    
    const processAllImages = async () => {
      setIsProcessing(true);
      
      const processed = [];
      let allFeatures = [];
      let allBounds = [];
      
      for (const imageUrl of images) {
        try {
          // Load image
          const image = await loadImage(imageUrl);
          
          // Remove background
          const imageData = await removeBackground(image, { 
            threshold: 0.2,
            edgeDetection: true
          });
          
          // Extract feature points
          const features = extractFeaturePoints(imageData, 300);
          
          // Get bounds
          const bounds = {
            x: Math.min(...features.map(f => f[0])),
            y: Math.min(...features.map(f => f[1])),
            width: Math.max(...features.map(f => f[0])) - Math.min(...features.map(f => f[0])),
            height: Math.max(...features.map(f => f[1])) - Math.min(...features.map(f => f[1]))
          };
          
          processed.push({
            original: image,
            processed: imageData,
            features,
            bounds
          });
          
          allFeatures = allFeatures.concat(features);
          allBounds.push(bounds);
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
      
      setProcessedImages(processed);
      setFeaturePoints(allFeatures);
      
      // Update current image bounds
      if (processed.length > 0 && currentImageIndex < processed.length) {
        setBounds(processed[currentImageIndex].bounds);
      }
      
      // Estimate dimensions based on all processed images
      if (processed.length > 0 && onDimensionsDetected) {
        // Get largest dimensions from all views
        const maxWidth = Math.max(...allBounds.map(b => b.width));
        const maxHeight = Math.max(...allBounds.map(b => b.height));
        // Depth is harder to estimate accurately without true 3D reconstruction
        // For demo, use the second largest width as depth estimate
        const sortedWidths = [...allBounds.map(b => b.width)].sort((a, b) => b - a);
        const estimatedDepth = sortedWidths.length > 1 ? sortedWidths[1] : maxWidth * 0.8;
        
        const estimatedDimensions = {
          width: Math.round(maxWidth),
          height: Math.round(maxHeight),
          depth: Math.round(estimatedDepth)
        };
        
        onDimensionsDetected(estimatedDimensions);
      }
      
      setIsProcessing(false);
    };
    
    processAllImages();
  }, [images]);
  
  // Update canvas when view mode or current image changes
  useEffect(() => {
    if (!canvasRef.current || processedImages.length === 0 || 
        currentImageIndex >= processedImages.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentImage = processedImages[currentImageIndex];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    switch (viewMode) {
      case 'segmented':
        // Draw processed image with transparent background
        ctx.putImageData(currentImage.processed, 0, 0);
        break;
        
      case 'features':
        // Draw original image
        ctx.drawImage(currentImage.original, 0, 0);
        
        // Draw feature points
        currentImage.features.forEach(point => {
          const [x, y, confidence] = point;
          // Color based on confidence (red -> yellow -> green)
          const r = Math.min(255, 100 + confidence * 400);
          const g = Math.min(255, confidence * 500);
          const b = 50;
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.beginPath();
          ctx.arc(x, y, 2 + confidence * 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
        
      case 'dimensions':
        // Create and draw dimension visualization
        const vizCanvas = createDimensionVisualization(
          currentImage.original, 
          dimensions || { 
            width: currentImage.bounds.width, 
            height: currentImage.bounds.height, 
            depth: currentImage.bounds.width * 0.8 
          },
          currentImage.bounds
        );
        ctx.drawImage(vizCanvas, 0, 0);
        break;
        
      case 'normal':
      default:
        // Draw original image
        ctx.drawImage(currentImage.original, 0, 0);
        break;
    }
  }, [viewMode, currentImageIndex, processedImages, dimensions]);
  
  // Helper function to load an image from URL
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };
  
  // Handle image selection
  const handleImageSelect = (index) => {
    if (index >= 0 && index < processedImages.length) {
      setCurrentImageIndex(index);
      setBounds(processedImages[index].bounds);
    }
  };
  
  // When no images are available
  if (!images || images.length === 0) {
    return (
      <div className={`image-analysis-viewer empty ${className}`}>
        <p>No images available for analysis</p>
      </div>
    );
  }
  
  return (
    <div className={`image-analysis-viewer ${className}`}>
      {/* Main canvas for displaying current image */}
      <div className="canvas-container relative">
        {isProcessing && (
          <div className="processing-overlay absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="spinner mb-2"></div>
              <p>Processing images...</p>
            </div>
          </div>
        )}
        
        {processedImages.length > 0 && currentImageIndex < processedImages.length && (
          <canvas
            ref={canvasRef}
            width={processedImages[currentImageIndex].original.width}
            height={processedImages[currentImageIndex].original.height}
            className="max-w-full h-auto"
          />
        )}
      </div>
      
      {/* View mode controls */}
      <div className="view-controls flex mt-4 space-x-2">
        <button
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            viewMode === 'normal' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setViewMode('normal')}
        >
          Original
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            viewMode === 'segmented' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setViewMode('segmented')}
        >
          Segmented
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            viewMode === 'features' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setViewMode('features')}
        >
          Features
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            viewMode === 'dimensions' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setViewMode('dimensions')}
        >
          Dimensions
        </button>
      </div>
      
      {/* Image thumbnails */}
      {images.length > 1 && (
        <div className="image-thumbnails mt-4 flex space-x-2 overflow-x-auto pb-2">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className={`image-thumbnail cursor-pointer ${
                currentImageIndex === index ? 'ring-2 ring-brand-red' : ''
              }`}
              onClick={() => handleImageSelect(index)}
            >
              <img 
                src={imageUrl} 
                alt={`View ${index + 1}`}
                className="h-16 w-auto object-cover rounded"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Dimension results */}
      {dimensions && (
        <div className="dimension-results mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="text-sm font-semibold mb-2">Detected Dimensions</h4>
          <div className="flex flex-wrap gap-2">
            <span className="dimension-chip">W: {dimensions.width}px → {dimensions.width}mm</span>
            <span className="dimension-chip">H: {dimensions.height}px → {dimensions.height}mm</span>
            <span className="dimension-chip">D: {dimensions.depth}px → {dimensions.depth}mm</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            * Depth is estimated from multiple views or based on object type
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysisViewer; 