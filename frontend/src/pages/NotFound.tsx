import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <h1 className="text-6xl font-bold text-brand-red mb-4">404</h1>
      <p className="text-2xl mb-8">Page not found</p>
      <Link to="/" className="btn btn-primary">
        Return Home
      </Link>
    </div>
  )
}

export default NotFound 