import express from 'express'
import fetch from 'node-fetch'

const router = express.Router()

// Helper to send SSE events
function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
  res.flush && res.flush()
}

// GET /api/reconstruct/:jobId
router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params

  if (!jobId) {
    return res.status(400).json({
      error: 'Job ID is required',
      status: 'failed'
    })
  }

  try {
    // If mock implementation is enabled, return mock data
    if (process.env.USE_MOCK_IMPLEMENTATION === 'true') {
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
      
      return
    }

    // Real implementation - Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Send initial event
    sendEvent(res, {
      jobId,
      status: 'pending',
      progress: 0,
      message: 'Connecting to reconstruction service...'
    })

    // Forward to reconstruction service to get progress
    const RECON_SERVICE_URL = process.env.RECON_SERVICE_URL || 'http://recon:8000'

    try {
      // Initial check if the job exists
      const response = await fetch(`${RECON_SERVICE_URL}/status/${jobId}`)

      if (!response.ok) {
        const errorData = await response.json()
        sendEvent(res, {
          jobId,
          status: 'failed',
          progress: 0,
          error: errorData.error || 'Failed to connect to reconstruction service'
        })
        return res.end()
      }

      const jobData = await response.json()

      // Send job initial status
      sendEvent(res, {
        jobId,
        status: jobData.status,
        progress: jobData.progress || 0,
        message: jobData.message || 'Processing...'
      })

      // If job is already done, return early
      if (jobData.status === 'completed' || jobData.status === 'failed') {
        sendEvent(res, {
          jobId,
          status: jobData.status,
          progress: 100,
          message: jobData.message || (jobData.status === 'completed' ? 'Complete' : 'Failed'),
          meshUrl: jobData.meshUrl,
          error: jobData.error
        })
        return res.end()
      }

      // Set up polling
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`${RECON_SERVICE_URL}/status/${jobId}`)

          if (!pollResponse.ok) {
            throw new Error(`Error polling reconstruction status: ${pollResponse.statusText}`)
          }

          const pollData = await pollResponse.json()

          // Forward events to client
          sendEvent(res, {
            jobId,
            status: pollData.status,
            progress: pollData.progress || 0,
            message: pollData.message || 'Processing...',
            meshUrl: pollData.meshUrl
          })

          // If job is done, end the connection
          if (pollData.status === 'completed' || pollData.status === 'failed') {
            clearInterval(pollInterval)
            return res.end()
          }
        } catch (err) {
          console.error('Error polling reconstruction:', err)
        }
      }, 2000)

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(pollInterval)
      })
    } catch (error) {
      console.error('Error processing reconstruction:', error)

      sendEvent(res, {
        jobId,
        status: 'failed',
        progress: 0,
        error: error.message
      })

      return res.end()
    }
  } catch (error) {
    console.error('Error setting up SSE:', error)

    return res.status(500).json({
      error: error.message,
      status: 'failed'
    })
  }
})

export default router 