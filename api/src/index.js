import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdir, existsSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

// Get current file and directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '../../data')

// Ensure data directory exists
if (!existsSync(dataDir)) {
  mkdir(dataDir, { recursive: true }, (err) => {
    if (err) console.error('Error creating data directory:', err)
  })
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Generate a unique job ID for this upload session
    if (!req.jobId) {
      req.jobId = uuidv4()
    }
    
    // Create directory for this job if it does not exist
    const jobDir = join(dataDir, req.jobId)
    
    if (!existsSync(jobDir)) {
      mkdir(jobDir, { recursive: true }, (err) => {
        if (err) return cb(err)
        cb(null, jobDir)
      })
    } else {
      cb(null, jobDir)
    }
  },
  filename: (req, file, cb) => {
    // Use the original name, or add timestamp for uniqueness
    const uniqueFilename = `${Date.now()}-${file.originalname}`
    cb(null, uniqueFilename)
  }
})

const upload = multer({ storage })

// Helper function to send SSE events
function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
  res.flush && res.flush()
}

// === ROUTES ===

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Prompt2Cad API Gateway',
    version: '0.1.0',
    endpoints: [
      '/api/upload',
      '/api/reconstruct/:jobId',
      '/api/generate-cad',
      '/api/files/meshes/:meshId',
      '/api/files/cad/:cadId',
      '/api/files/source/:cadId',
      '/health'
    ]
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// === UPLOAD ROUTES ===

// POST /api/upload - Upload images for reconstruction
app.post('/api/upload', upload.array('images'), async (req, res) => {
  try {
    const jobId = req.jobId || uuidv4()
    const uploadedFiles = req.files || []
    
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        error: 'No images uploaded',
        status: 'failed'
      })
    }
    
    console.log(`Uploaded ${uploadedFiles.length} images for job ${jobId}`)
    
    return res.status(200).json({
      jobId,
      status: 'pending',
      progress: 0,
      message: 'Upload complete, reconstruction queued'
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      error: error.message || 'Failed to process upload',
      status: 'failed'
    })
  }
})

// === RECONSTRUCTION ROUTES ===

// GET /api/reconstruct/:jobId - Get reconstruction progress
app.get('/api/reconstruct/:jobId', async (req, res) => {
  const { jobId } = req.params

  if (!jobId) {
    return res.status(400).json({
      error: 'Job ID is required',
      status: 'failed'
    })
  }

  try {
    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Send initial event
    sendEvent(res, {
      jobId,
      status: 'pending',
      progress: 0,
      message: 'Starting reconstruction...'
    })

    // Mock progress steps
    const mockProgressSteps = [
      { progress: 10, message: 'Analyzing images...', delay: 1000 },
      { progress: 25, message: 'Extracting features...', delay: 1500 },
      { progress: 40, message: 'Matching features...', delay: 1500 },
      { progress: 60, message: 'Creating point cloud...', delay: 2000 },
      { progress: 80, message: 'Generating mesh...', delay: 1500 },
      { progress: 100, message: 'Reconstruction complete!', delay: 1000 }
    ]

    // Run through mock progress steps
    let step = 0
    const progressInterval = setInterval(() => {
      if (step >= mockProgressSteps.length) {
        clearInterval(progressInterval)
        
        // Send completion event
        sendEvent(res, {
          jobId,
          status: 'completed',
          progress: 100,
          message: 'Reconstruction complete',
          meshUrl: `/api/files/meshes/${jobId}`
        })
        
        res.end()
        return
      }
      
      // Send current step
      sendEvent(res, {
        jobId,
        status: 'processing',
        progress: mockProgressSteps[step].progress,
        message: mockProgressSteps[step].message
      })
      
      step++
    }, 1500)

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(progressInterval)
    })
  } catch (error) {
    console.error('Error setting up SSE:', error)

    return res.status(500).json({
      error: error.message,
      status: 'failed'
    })
  }
})

// === CAD GENERATION ROUTES ===

// POST /api/generate-cad - Generate CAD model from reconstruction
app.post('/api/generate-cad', async (req, res) => {
  try {
    const { meshId, prompt, dimensions } = req.body
    
    if (!meshId || !prompt || !dimensions) {
      return res.status(400).json({
        error: 'Missing required parameters: meshId, prompt, and dimensions are required',
        status: 'failed'
      })
    }
    
    // Validate dimensions
    if (!dimensions.width || !dimensions.height || !dimensions.depth) {
      return res.status(400).json({
        error: 'Dimensions must include width, height, and depth values',
        status: 'failed'
      })
    }
    
    console.log(`Mock CAD generation for mesh ${meshId} with dimensions:`, dimensions)
    
    // Wait a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate a CAD ID
    const cadId = `cad-${meshId}`
    
    return res.status(200).json({
      cadId,
      status: 'completed',
      modelUrl: `/api/files/cad/${cadId}`,
      sourceUrl: `/api/files/source/${cadId}`
    })
  } catch (error) {
    console.error('CAD generation error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to process CAD generation request',
      status: 'failed'
    })
  }
})

// === FILE ACCESS ROUTES ===

// GET /api/files/meshes/:meshId - Get reconstructed mesh
app.get('/api/files/meshes/:meshId', (req, res) => {
  const { meshId } = req.params
  
  if (!meshId) {
    return res.status(400).json({
      error: 'Mesh ID is required',
      status: 'failed'
    })
  }
  
  // Return mock data since we don't have real meshes
  res.status(200).json({
    message: 'Mock mesh would be served here',
    meshId
  })
})

// GET /api/files/cad/:cadId - Get CAD model
app.get('/api/files/cad/:cadId', (req, res) => {
  const { cadId } = req.params
  
  if (!cadId) {
    return res.status(400).json({
      error: 'CAD ID is required',
      status: 'failed'
    })
  }
  
  // Return mock data
  res.status(200).json({
    message: 'Mock CAD model would be served here',
    cadId
  })
})

// GET /api/files/source/:cadId - Get CAD source code
app.get('/api/files/source/:cadId', (req, res) => {
  const { cadId } = req.params
  
  if (!cadId) {
    return res.status(400).json({
      error: 'CAD ID is required',
      status: 'failed'
    })
  }
  
  // Return mock data
  res.status(200).json({
    message: 'Mock source code would be served here',
    cadId
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: err.message || 'Something went wrong',
    status: 'error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 