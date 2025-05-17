import { ScanImage } from '../store/scanStore'
import { 
  ReconstructionResponse, 
  ReconstructionProgressEvent,
  CADGenerationRequest,
  CADGenerationResponse
} from '../types/api'

const API_URL = import.meta.env.VITE_API_URL || ''

export async function uploadImages(images: ScanImage[]): Promise<ReconstructionResponse> {
  const formData = new FormData()
  
  // Only use the first image since we now process just one image
  if (images.length > 0) {
    const blob = dataURLtoBlob(images[0].dataUrl)
    formData.append('image', blob, 'image.jpg')
  } else {
    throw new Error('No images to upload')
  }

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response.json()
}

export function subscribeToReconstructionProgress(
  jobId: string,
  onProgress: (event: ReconstructionProgressEvent) => void,
  onError: (error: Error) => void
): () => void {
  // Setup polling instead of EventSource
  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/api/status/${jobId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`)
      }
      
      const data = await response.json() as ReconstructionProgressEvent
      onProgress(data)
      
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(intervalId)
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)))
      clearInterval(intervalId)
    }
  }, 1000) // Poll every second
  
  // Return a cleanup function
  return () => {
    clearInterval(intervalId)
  }
}

export async function generateCAD(request: CADGenerationRequest): Promise<CADGenerationResponse> {
  const response = await fetch(`${API_URL}/api/generate-cad`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`CAD generation failed: ${response.statusText}`)
  }

  return response.json()
}

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
} 