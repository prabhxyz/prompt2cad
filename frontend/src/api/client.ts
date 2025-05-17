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
  
  // Convert data URLs to Blobs
  images.forEach((image, index) => {
    const blob = dataURLtoBlob(image.dataUrl)
    formData.append('images', blob, `image-${index}.jpg`)
  })

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
  const eventSource = new EventSource(`${API_URL}/api/reconstruct/${jobId}`)
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ReconstructionProgressEvent
      onProgress(data)
      
      if (data.status === 'completed' || data.status === 'failed') {
        eventSource.close()
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)))
      eventSource.close()
    }
  }
  
  eventSource.onerror = (error) => {
    onError(new Error('EventSource connection error'))
    eventSource.close()
  }
  
  // Return a cleanup function
  return () => {
    eventSource.close()
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