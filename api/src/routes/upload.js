import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdir, existsSync } from 'fs'
import fetch from 'node-fetch'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Set up multer for handling multipart/form-data (file uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Generate a unique job ID for this upload session
    if (!req.jobId) {
      req.jobId = uuidv4()
    }
    
    // Create directory for this job if it does not exist
    const jobDir = join(__dirname, '../../../data', req.jobId)
    
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

// POST /api/upload
router.post('/', upload.array('images'), async (req, res) => {
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
    
    // If mock implementation is enabled, return success immediately
    if (process.env.USE_MOCK_IMPLEMENTATION === 'true') {
      console.log('Using mock implementation for reconstruction')
      return res.status(200).json({
        jobId,
        status: 'pending',
        progress: 0,
        message: 'Upload complete, reconstruction queued (mock)'
      })
    }
    
    // Forward the job to the reconstruction service
    try {
      const RECON_SERVICE_URL = process.env.RECON_SERVICE_URL || 'http://recon:8000'
      const response = await fetch(`${RECON_SERVICE_URL}/reconstruct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          imageCount: uploadedFiles.length
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start reconstruction')
      }
      
      return res.status(200).json({
        jobId,
        status: 'pending',
        progress: 0,
        message: 'Upload complete, reconstruction queued'
      })
    } catch (error) {
      console.error('Error forwarding to reconstruction service:', error)
      
      // Still return success to client since files were uploaded
      return res.status(200).json({
        jobId,
        status: 'pending',
        progress: 0,
        message: 'Upload complete, reconstruction queued (service connection issue)'
      })
    }
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      error: error.message || 'Failed to process upload',
      status: 'failed'
    })
  }
})

export default router
