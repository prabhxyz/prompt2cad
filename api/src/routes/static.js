import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Base data directory path
const dataDir = join(__dirname, '../../../data')

// GET /api/files/meshes/:meshId
router.get('/meshes/:meshId', (req, res) => {
  const { meshId } = req.params
  
  if (!meshId) {
    return res.status(400).json({
      error: 'Mesh ID is required',
      status: 'failed'
    })
  }
  
  // For mock implementation, use a placeholder file or create one
  if (process.env.USE_MOCK_IMPLEMENTATION === 'true') {
    // Use the first file as a mesh (or create a dummy one)
    res.status(200).json({
      message: 'Mock mesh would be served here',
      meshId
    })
    return
  }
  
  const meshPath = join(dataDir, meshId, 'object.glb')
  
  if (!existsSync(meshPath)) {
    return res.status(404).json({
      error: 'Mesh file not found',
      status: 'failed'
    })
  }
  
  res.sendFile(meshPath)
})

// GET /api/files/cad/:cadId
router.get('/cad/:cadId', (req, res) => {
  const { cadId } = req.params
  
  if (!cadId) {
    return res.status(400).json({
      error: 'CAD ID is required',
      status: 'failed'
    })
  }
  
  // For mock implementation, return a mockup
  if (process.env.USE_MOCK_IMPLEMENTATION === 'true') {
    res.status(200).json({
      message: 'Mock CAD model would be served here',
      cadId
    })
    return
  }
  
  const cadPath = join(dataDir, 'cad', `${cadId}.stl`)
  
  if (!existsSync(cadPath)) {
    return res.status(404).json({
      error: 'CAD file not found',
      status: 'failed'
    })
  }
  
  res.sendFile(cadPath)
})

// GET /api/files/source/:cadId
router.get('/source/:cadId', (req, res) => {
  const { cadId } = req.params
  
  if (!cadId) {
    return res.status(400).json({
      error: 'CAD ID is required',
      status: 'failed'
    })
  }
  
  // For mock implementation, return a mockup
  if (process.env.USE_MOCK_IMPLEMENTATION === 'true') {
    res.status(200).json({
      message: 'Mock source code would be served here',
      cadId
    })
    return
  }
  
  const sourcePath = join(dataDir, 'cad', `${cadId}.jscad`)
  
  if (!existsSync(sourcePath)) {
    return res.status(404).json({
      error: 'Source file not found',
      status: 'failed'
    })
  }
  
  res.sendFile(sourcePath)
})

export default router
