/**
 * WebGL detector utility to check for WebGL browser support
 */

export const detectWebGL = () => {
  // Try to create a WebGL context
  try {
    const canvas = document.createElement('canvas')
    const contextNames = ['webgl2', 'webgl', 'experimental-webgl']
    
    let gl = null
    for (const name of contextNames) {
      try {
        gl = canvas.getContext(name)
        if (gl) break
      } catch (e) {
        console.warn(`Error creating WebGL context with ${name}:`, e)
      }
    }
    
    if (!gl) {
      return {
        supported: false,
        error: 'WebGL not supported in this browser'
      }
    }
    
    // Check for WebGL features needed for Three.js
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown'
    
    // Check if certain problematic GPU configurations are detected
    const isBlacklistedGPU = 
      renderer.toLowerCase().includes('swiftshader') || 
      renderer.toLowerCase().includes('basic render') ||
      renderer.toLowerCase().includes('llvmpipe') ||
      // Add other known problematic renderers here
      false
    
    if (isBlacklistedGPU) {
      return {
        supported: false,
        error: 'Your GPU configuration may not support 3D rendering',
        renderer,
        vendor
      }
    }
    
    return {
      supported: true,
      renderer,
      vendor
    }
  } catch (e) {
    console.error('Error checking WebGL support:', e)
    return {
      supported: false,
      error: e.message || 'Unknown WebGL error'
    }
  }
}

export const isWebGLSupported = () => {
  const result = detectWebGL()
  return result.supported
}

export default detectWebGL 