

import React from 'react'
import { useEffect, useState } from "react";
import {NavLink,Link,useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from '../../assets/logo.png';

const Navbar = () => {

  const navigate = useNavigate(); 
  const { isLoggedIn } = useAuth();

  const handleGetStarted = () => {
    navigate("/signup"); 
    
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    alert("Logout Successfully");
    navigate("/");
    window.location.reload();
  };


  const Homepage = () => {
    navigate("/"); 
  };

  return (
    <div>
  <nav className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg">
  <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
    <div className="relative flex h-16 items-center justify-between">
      <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
        <button type="button" command="--toggle" commandfor="mobile-menu" class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/10 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500 transition-colors">
          <span className="absolute -inset-0.5"></span>
          <span className="sr-only">Open main menu</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 in-aria-expanded:hidden">
            <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 not-in-aria-expanded:hidden">
            <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
        <div class="flex shrink-0 items-center">
          <h1 onClick={Homepage} className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent cursor-pointer hover:from-blue-300 hover:to-indigo-300 transition-all">
            Career-Pulse
          </h1>
        </div>
        <div className="hidden sm:ml-6 sm:block">
          <div className="flex space-x-2">
            <NavLink
                   to="/dashboard"
                   className={({ isActive }) =>
                     `rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                       isActive
                         ? "bg-white/10 text-white border-b-2 border-blue-500"
                         : "text-gray-300 hover:bg-white/5 hover:text-white"
                     }`
                   }
                 >
                   Dashboard
            </NavLink>
            <NavLink
                   to="/applications"
                   className={({ isActive }) =>
                     `rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                       isActive
                         ? "bg-white/10 text-white border-b-2 border-blue-500"
                         : "text-gray-300 hover:bg-white/5 hover:text-white"
                     }`
                   }
                 >
                   Applications
            </NavLink>  
          </div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
        <button type="button" class="relative rounded-full p-2 text-gray-400 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 transition-colors">
          <span className="absolute -inset-1.5"></span>
          <span className="sr-only">View notifications</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6">
            <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

              <button
                onClick={isLoggedIn ? handleLogout : handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold ml-4 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isLoggedIn ? "Logout" : "Get Started"}
              </button>
           
      </div>
    </div>
  </div>

 
</nav>
      
    </div>
  )
}

export default Navbar


