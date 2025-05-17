// Camera utility for accessing and controlling device cameras

interface CameraOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export async function getCamera(
  videoElement: HTMLVideoElement,
  options: CameraOptions = {}
): Promise<MediaStream> {
  try {
    // Default camera options
    const constraints: MediaStreamConstraints = {
      video: {
        width: options.width || { ideal: 1280 },
        height: options.height || { ideal: 720 },
        facingMode: options.facingMode || 'environment',
      },
      audio: false,
    }

    // Make sure any previous streams are stopped first
    if (videoElement.srcObject) {
      const oldStream = videoElement.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    // Connect the stream to the video element
    videoElement.srcObject = stream
    
    // Make sure video starts playing
    try {
      await videoElement.play();
    } catch (err) {
      console.error('Error playing video:', err);
      // Try again with a delay
      setTimeout(() => {
        videoElement.play().catch(e => console.error('Failed to play video on retry:', e));
      }, 500);
    }
    
    return stream
  } catch (error) {
    console.error('Camera access error:', error)
    throw new Error(`Failed to access camera: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function stopCamera(videoElement: HTMLVideoElement): void {
  const stream = videoElement.srcObject as MediaStream
  
  if (stream) {
    const tracks = stream.getTracks()
    tracks.forEach(track => {
      try {
        track.stop()
      } catch (e) {
        console.error('Error stopping track:', e)
      }
    })
    videoElement.srcObject = null
  }
}

export async function takePhoto(
  videoElement: HTMLVideoElement,
  canvasElement?: HTMLCanvasElement
): Promise<string> {
  // Create a canvas element if one isn't provided
  const canvas = canvasElement || document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  if (!context) {
    throw new Error('Could not get canvas context')
  }
  
  // Check if video has valid dimensions
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    throw new Error('Video has no dimensions - camera may not be initialized properly')
  }
  
  // Set canvas dimensions to match video
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  
  // Draw the current video frame to the canvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  
  // Get the image data URL
  return canvas.toDataURL('image/jpeg', 0.9)
} 