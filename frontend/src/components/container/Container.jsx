import React from 'react'
import { useNavigate } from "react-router-dom";
import { 
  Briefcase, 
  Mail, 
  BarChart3, 
  Zap, 
  Shield, 
  ArrowRight,
  Layers,
  Target,
  Clock,
  CheckCircle2,
  TrendingUp
} from "lucide-react";

const Container = () => {
  const navigate = useNavigate(); 
  
  const handleGetStarted = () => {
    navigate("/login"); 
  };

  const features = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Integration",
      desc: "Automatically sync job emails from Gmail"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Dashboard",
      desc: "Visualize your application progress"
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Smart Grouping",
      desc: "Group emails by application"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Auto Classification",
      desc: "AI-powered status detection"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy First",
      desc: "Your data stays on your device"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Timeline View",
      desc: "Track every step of your applications"
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 md:px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-[100px]"></div>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-zinc-100">CareerPulse</span>
        </div>

        {/* Main Heading */}
        <div className="text-center max-w-3xl mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-zinc-100">Track Your </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Job Applications
            </span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            Organize your job applications, stay updated on your progress, and land your dream job faster.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <button 
            onClick={handleGetStarted}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Stats Preview */}
        <div className="flex items-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-100">500+</p>
            <p className="text-zinc-500 text-sm">Emails Processed</p>
          </div>
          <div className="w-px h-12 bg-zinc-800"></div>
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-100">98%</p>
            <p className="text-zinc-500 text-sm">Accuracy</p>
          </div>
          <div className="w-px h-12 bg-zinc-800"></div>
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-100">50+</p>
            <p className="text-zinc-500 text-sm">Companies</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
              Everything you need
            </h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              Powerful features to help you manage your job search effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
              How it works
            </h2>
          </div>

          <div className="space-y-6">
            {[
              { step: "01", title: "Connect Gmail", desc: "Securely connect your Gmail account" },
              { step: "02", title: "Auto Import", desc: "We automatically fetch and analyze your job emails" },
              { step: "03", title: "Track Progress", desc: "Monitor your applications with smart grouping" }
            ].map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-6 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
              >
                <span className="text-4xl font-bold text-zinc-700">{item.step}</span>
                <div>
                  <h3 className="text-xl font-semibold text-zinc-100 mb-1">{item.title}</h3>
                  <p className="text-zinc-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-zinc-400">CareerPulse</span>
          </div>
          <p className="text-zinc-600 text-sm">© 2026 CareerPulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Container;
