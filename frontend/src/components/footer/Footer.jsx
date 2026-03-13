import React from 'react'
import { Briefcase, Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black border-t border-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-zinc-400">CareerPulse</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>

          {/* Social */}
          <div className="flex items-center gap-3">
            <a href="#" className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <Twitter className="w-4 h-4 text-zinc-400" />
            </a>
            <a href="#" className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <Github className="w-4 h-4 text-zinc-400" />
            </a>
            <a href="#" className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <Linkedin className="w-4 h-4 text-zinc-400" />
            </a>
          </div>
        </div>

        <div className="text-center text-zinc-600 text-sm mt-8 pt-8 border-t border-zinc-900">
          © {new Date().getFullYear()} CareerPulse. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
