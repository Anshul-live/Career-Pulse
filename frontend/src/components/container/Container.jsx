import React from 'react'
import { useNavigate } from "react-router-dom";

const Container = () => {

    const navigate = useNavigate(); 
    
      const handleGetStarted = () => {
        navigate("/login"); 
      };
      
  return (
    <div>
    <section className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-black text-center px-6 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 blur-3xl rounded-full"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/30 blur-3xl rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl"></div>
      </div>

      {/* Main Heading */}
      <div className="mb-6">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight">
          Career<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Pulse</span>
        </h1>
        <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
          Organize your job applications, stay updated, and land your dream job faster 🚀
        </p>
      </div>

      {/* Call-to-Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center mb-12">
        <button onClick={handleGetStarted}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          Get Started Free
        </button>
        <button className="border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 px-8 py-4 rounded-full font-semibold transition-all duration-300">
          See How It Works
        </button>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-800 mb-2">Track Applications</h3>
          <p className="text-gray-500 text-sm">Monitor all your job applications in one place</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="font-semibold text-gray-800 mb-2">Interview Calendar</h3>
          <p className="text-gray-500 text-sm">Never miss an important date again</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow">
          <div className="text-3xl mb-3">📈</div>
          <h3 className="font-semibold text-gray-800 mb-2">Analytics</h3>
          <p className="text-gray-500 text-sm">Get insights into your job search progress</p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-gray-500 text-sm mt-12 tracking-wide">
        Empowering candidates to take control of their job search ✨
      </p>
    </section>
       
    </div>
  )
}

export default Container
