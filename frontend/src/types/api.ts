export interface ReconstructionResponse {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  meshUrl?: string
  error?: string
}

export interface ReconstructionProgressEvent {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  meshUrl?: string
  error?: string
  dimensions?: {
    width: number
    height: number
    depth: number
  }
}

export interface CADGenerationRequest {
  meshId: string
  prompt: string
  dimensions: {
    width: number
    height: number
    depth: number
  }
}

export interface CADGenerationResponse {
  cadId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  modelUrl?: string
  sourceUrl?: string
  error?: string
} 