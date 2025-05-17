import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

// Pages
import ScanWizard from './pages/ScanWizard'
import DesignStudio from './pages/DesignStudio'
import NotFound from './pages/NotFound'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode')
    return savedMode ? JSON.parse(savedMode) : false
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/favicon.svg" alt="Prompt2Cad Logo" className="h-8 w-8 mr-2" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Prompt2Cad</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white focus:outline-none"
          >
            {darkMode ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanWizard />} />
          <Route path="/design/:meshId" element={<DesignStudio />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App 