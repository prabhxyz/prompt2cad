import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Log useful diagnostic information for debugging
const logDiagnosticInfo = () => {
  console.log('===== PROMPT2CAD DIAGNOSTIC INFO =====')
  console.log('User Agent:', navigator.userAgent)
  console.log('Screen size:', window.screen.width, 'x', window.screen.height)
  console.log('Device pixel ratio:', window.devicePixelRatio)
  console.log('Language:', navigator.language)
  
  // Try to get GPU info
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        console.log('WebGL vendor:', vendor)
        console.log('WebGL renderer:', renderer)
      } else {
        console.log('WebGL Debug Info not available')
      }
      
      console.log('WebGL version:', gl.getParameter(gl.VERSION))
      console.log('WebGL shading version:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION))
      console.log('WebGL vendor:', gl.getParameter(gl.VENDOR))
    } else {
      console.log('WebGL not available')
    }
  } catch (e) {
    console.log('Error getting WebGL info:', e)
  }
  console.log('=====================================')
}

// Log diagnostic information on startup
logDiagnosticInfo()

// Add a global error boundary to prevent blank screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Error:", error, errorInfo);
    // Log diagnostic info on error to help debugging
    logDiagnosticInfo();
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when app crashes
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h1 className="text-red-600 text-2xl font-bold mb-4">Application Error</h1>
            <p className="mb-4">Something went wrong with the application.</p>
            <pre className="bg-gray-100 p-2 rounded text-sm mb-4 overflow-auto max-h-40">
              {this.state.error?.toString() || "Unknown error"}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Find the root element or create one if it doesn't exist
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found, creating one');
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
}

// Create the React application
ReactDOM.createRoot(rootElement || document.createElement('div')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#363636',
                color: '#fff',
              },
              duration: 3000,
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
) 