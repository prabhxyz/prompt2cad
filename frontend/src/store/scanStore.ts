import { create } from 'zustand'

export interface ScanImage {
  id: string
  dataUrl: string
  timestamp: number
}

export interface ObjectDimensions {
  width: number  // in mm
  height: number // in mm
  depth: number  // in mm
}

export interface ScanState {
  images: ScanImage[]
  currentStep: number
  isUploading: boolean
  isProcessing: boolean
  processingProgress: number
  jobId: string | null
  meshUrl: string | null
  cadUrl: string | null
  objectDimensions: ObjectDimensions | null
  
  // Actions
  setCurrentStep: (step: number) => void
  addImage: (dataUrl: string) => void
  removeImage: (id: string) => void
  clearImages: () => void
  setIsUploading: (isUploading: boolean) => void
  setIsProcessing: (isProcessing: boolean) => void
  setProcessingProgress: (progress: number) => void
  setJobId: (jobId: string | null) => void
  setMeshUrl: (url: string | null) => void
  setCadUrl: (url: string | null) => void
  setObjectDimensions: (dimensions: ObjectDimensions | null) => void
  reset: () => void
}

const initialState = {
  images: [],
  currentStep: 0,
  isUploading: false,
  isProcessing: false,
  processingProgress: 0,
  jobId: null,
  meshUrl: null,
  cadUrl: null,
  objectDimensions: null,
}

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),
  
  addImage: (dataUrl) => set((state) => ({
    images: [...state.images, {
      id: crypto.randomUUID(),
      dataUrl,
      timestamp: Date.now(),
    }],
  })),
  
  removeImage: (id) => set((state) => ({
    images: state.images.filter((image) => image.id !== id),
  })),
  
  clearImages: () => set({ images: [] }),
  
  setIsUploading: (isUploading) => set({ isUploading }),
  
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  
  setProcessingProgress: (processingProgress) => set({ processingProgress }),
  
  setJobId: (jobId) => set({ jobId }),
  
  setMeshUrl: (meshUrl) => set({ meshUrl }),
  
  setCadUrl: (cadUrl) => set({ cadUrl }),
  
  setObjectDimensions: (objectDimensions) => set({ objectDimensions }),
  
  reset: () => set(initialState),
})) 