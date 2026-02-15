import React from 'react'
const Last_container = () => {
  return (
    <div>

    {/* <section className="py-20 bg-gray-950 text-white flex flex-col items-center px-6"> */}
     <section className="py-20 bg-white text-black flex flex-col items-center px-6">
      {/* Heading */}
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
        How <span className="text-blue-500">Job Tracker</span> Works
      </h2>

      {/* Subheading */}
      <p className="text-gray-600 text-center max-w-2xl mb-12">
        Keep your job search organized with smart tracking and timely reminders.
      </p>

      {/* Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
        
        {/* 1️⃣ Search Jobs */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-blue-200 transition-all duration-300 border border-gray-100">
          <div className="flex justify-center mb-4">
            <lord-icon
              src="https://cdn.lordicon.com/unukghxb.json"
              trigger="hover"
              colors="primary:#2563eb,secondary:#1e293b"
              style={{ width: "60px", height: "60px" }}
            ></lord-icon>
          </div>
          <h3 className="text-xl font-semibold mb-2">Search & Save Jobs</h3>
          <p className="text-gray-500 text-sm">
            Find and save the best job listings that match your interests.
          </p>
        </div>

        {/* 2️⃣ Notifications */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-blue-200 transition-all duration-300 border border-gray-100">
          <div className="flex justify-center mb-4">
            <lord-icon
              src="https://cdn.lordicon.com/psnhyobz.json"
              trigger="hover"
              colors="primary:#2563eb,secondary:#1e293b"
              style={{ width: "60px", height: "60px" }}
            ></lord-icon>
          </div>
          <h3 className="text-xl font-semibold mb-2">Get Notifications</h3>
          <p className="text-gray-500 text-sm">
            Stay reminded of important dates and follow-up times automatically.
          </p>
        </div>

        {/* 3️⃣ Calendar */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-blue-200 transition-all duration-300 border border-gray-100">
          <div className="flex justify-center mb-4">
            <lord-icon
              src="https://cdn.lordicon.com/mecwbjnp.json"
              trigger="hover"
              colors="primary:#2563eb,secondary:#1e293b"
              style={{ width: "60px", height: "60px" }}
            ></lord-icon>
          </div>
          <h3 className="text-xl font-semibold mb-2">Track Interviews</h3>
          <p className="text-gray-500 text-sm">
            Mark and manage your interviews easily with calendar integration.
          </p>
        </div>

        {/* 4️⃣ Analytics */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-blue-200 transition-all duration-300 border border-gray-100">
          <div className="flex justify-center mb-4">
            <lord-icon
              src="https://cdn.lordicon.com/kbtmbyzy.json"
              trigger="hover"
              colors="primary:#2563eb,secondary:#1e293b"
              style={{ width: "60px", height: "60px" }}
            ></lord-icon>
          </div>
          <h3 className="text-xl font-semibold mb-2">Analyze Progress</h3>
          <p className="text-gray-500 text-sm">
            Visualize your progress and make smarter job search decisions.
          </p>
        </div>
      </div>
    </section>
      
    </div>
  )
}

export default Last_container
