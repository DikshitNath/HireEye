import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Mic, Github, Terminal, Sun, Moon } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

export default function Home() {
  // 🌓 Theme State
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300">
      
      {/* 🧭 Consistent Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <span className="text-2xl font-extrabold tracking-tighter italic">
            Hire<span className="text-zinc-400 dark:text-zinc-500 font-medium not-italic">Eye</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* ✨ Theme Toggle */}
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* ✨ Conditional Auth UI */}
          <SignedIn>
            {/* Shows the Google Avatar and a dropdown menu when clicked */}
            <div className="hidden sm:block">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          
          <SignedOut>
            {/* Only shows if the user is NOT logged in */}
            <Link to="/dashboard" className="text-sm font-bold hover:text-zinc-500 transition-colors hidden sm:block">
              Sign In
            </Link>
          </SignedOut>

          {/* Launch App Button (Always visible or you can wrap it in SignedIn too!) */}
          <Link to="/dashboard" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all active:scale-95">
            Launch App
          </Link>
        </div>
      </nav>

      {/* 🚀 Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 shadow-sm">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Next-Gen Recruitment Engine
        </div>
        
        <h1 className="text-6xl md:text-9xl font-extrabold tracking-tighter mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Hire with <br />
          <span className="text-zinc-400 dark:text-zinc-600">Absolute Precision.</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-medium mb-12 leading-relaxed">
          An automated pipeline that parses resumes, evaluates live GitHub repositories, and conducts real-time AI voice interviews.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-lg flex items-center justify-center gap-2 group transition-all hover:scale-105 active:scale-95 shadow-xl">
            Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
            View Protocol
          </a>
        </div>
      </main>

      {/* ⚡ Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32 border-t border-zinc-200 dark:border-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="CV Intelligence"
            desc="Gemini-powered extraction identifies top-tier talent from raw PDFs in milliseconds."
          />
          <FeatureCard 
            icon={<Github className="w-6 h-6" />}
            title="Code Provenance"
            desc="Live repository analysis to verify technical depth and code quality automatically."
          />
          <FeatureCard 
            icon={<Mic className="w-6 h-6" />}
            title="Voice Assessment"
            desc="Real-time, low-latency AI interviews to evaluate communication and soft skills."
          />
        </div>
      </section>

      {/* 🔒 Trust Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center border-t border-zinc-200 dark:border-zinc-900 opacity-50">
        <p className="text-xs font-bold tracking-widest uppercase mb-4 md:mb-0">© 2026 HireEye Engineering</p>
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
          <ShieldCheck className="w-4 h-4" />
          End-to-End Encrypted Selection
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group">
      <div className="w-12 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:border-zinc-900 dark:group-hover:border-white transition-all duration-300 group-hover:shadow-lg">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  );
}