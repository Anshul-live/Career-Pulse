import React from 'react'

const Footer = () => {
  return (
    <div>
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 py-12 px-6 border-t border-white/10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* 1️⃣ Brand Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Job Tracker</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Simplify your job search. Track applications, get reminders, and land your dream job effortlessly.
          </p>
        </div>

        {/* 2️⃣ Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
          <ul className="space-y-3 text-gray-400 text-sm">
            <li><a href="#" className="hover:text-blue-400 transition-colors">Home</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">How It Works</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
          </ul>
        </div>

        {/* 3️⃣ Resources */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
          <ul className="space-y-3 text-gray-400 text-sm">
            <li><a href="#" className="hover:text-blue-400 transition-colors">FAQs</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors">Support</a></li>
          </ul>
        </div>

        {/* 4️⃣ Social Media */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-300">
              <span>🐦</span>
            </a>
            <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <span>📘</span>
            </a>
            <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all duration-300">
              <span>💼</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="text-center border-t border-white/10 mt-10 pt-6 text-gray-500 text-sm">
        © {new Date().getFullYear()} Job Tracker. All rights reserved.
      </div>
    </footer>
    </div>
  )
}

export default Footer
