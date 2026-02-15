import React from 'react'
import { Link } from 'react-router-dom'

const calendar = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      {/* Lordicon Animation */}
      <lord-icon
        src="https://cdn.lordicon.com/iltqorsz.json"
        trigger="loop"
        delay="1500"
        colors="primary:#2563eb,secondary:#1e3a8a"
        style={{ width: "120px", height: "120px" }}
      ></lord-icon>

      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-6 text-center">
        Work in <span className="text-blue-600">Progress</span>
      </h1>

      {/* Subtext */}
      <p className="text-gray-500 mt-3 text-center max-w-md">
        We’re currently building something awesome here! 🚀  
        Check back soon to explore this section.
      </p>

      {/* Back Button */}
      <Link
        to="/"
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-md transition-all duration-300"
      >
        Back to Home
      </Link>

      {/* Footer Note */}
      <p className="text-gray-400 text-sm mt-10">© 2025 JobTracker. All rights reserved.</p>
    </div>
  )
}

export default calendar
