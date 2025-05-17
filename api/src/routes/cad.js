import express from "express"; import { join, dirname } from "path"; import { fileURLToPath } from "url"; import fs from "fs"; import path from "path"; import axios from "axios"; import fetch from 'node-fetch'
const router = express.Router(); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);

// POST /api/generate-cad
router.post('/', async (req, res) => {
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
    
    // Forward to CAD generation service
    const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL || 'http://cad:8001'
    
    try {
      console.log(`Forwarding CAD generation request for mesh ${meshId}`)
      
      const response = await fetch(`${CAD_SERVICE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meshId,
          prompt,
          dimensions
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate CAD model')
      }
      
      const data = await response.json()
      
      return res.status(200).json({
        cadId: data.cadId || `cad-${meshId}`,
        status: 'completed',
        modelUrl: data.modelUrl,
        sourceUrl: data.sourceUrl
      })
    } catch (error) {
      console.error('CAD service error:', error)
      return res.status(500).json({
        error: `CAD generation failed: ${error.message}`,
        status: 'failed'
      })
    }
  } catch (error) {
    console.error('CAD generation error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to process CAD generation request',
      status: 'failed'
    })
  }
})

export default router



