import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Terminal, Sparkles, Loader2, Square, Sun, Moon } from 'lucide-react';

export default function Interview() {
  const { id } = useParams();
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Initializing Protocol...');
  const [isValidating, setIsValidating] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // 🌓 Local Theme State for Candidate Experience
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const verifyLink = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/candidates/${id}`);
        const data = await response.json();
        if (data.interviewStatus === 'Completed') {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Link verification failed:", error);
      } finally {
        setIsValidating(false);
      }
    };
    verifyLink();
  }, [id]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Securing Connection</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mb-8 shadow-sm">
          <Square className="w-6 h-6 text-rose-500 fill-rose-500" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Session Expired</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-sm font-medium leading-relaxed">
          This secure interview link has already been used and the assessment is marked as completed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* 🧭 Consistent Header */}
      <header className="p-6 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white dark:text-zinc-900" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter italic">
            Hire<span className="text-zinc-400 dark:text-zinc-500 font-medium not-italic">Eye</span>
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest rounded not-italic">Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* ✨ Theme Toggle */}
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${isStarted ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{status}</span>
          </div>
        </div>
      </header>

      {/* 🎙️ Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {!isStarted ? (
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl text-zinc-900 dark:text-white">
              <Mic className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Assessment</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-sm font-medium leading-relaxed px-4">
              AI-conducted technical interview. Please ensure you are in a quiet space with an active microphone.
            </p>
            <button 
              onClick={() => { setIsStarted(true); setStatus('Live'); }}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-lg hover:opacity-90 transition-all active:scale-95 shadow-2xl"
            >
              Begin Session
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in duration-1000">
            <div className="relative mb-16">
               <div className="w-32 h-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center relative z-10 shadow-inner">
                  <Sparkles className={`w-10 h-10 ${isMuted ? 'text-zinc-300 dark:text-zinc-800' : 'text-zinc-900 dark:text-white animate-pulse'}`} />
               </div>
               {!isMuted && (
                 <div className="absolute inset-0 w-32 h-32 bg-zinc-900 dark:bg-white rounded-full animate-ping opacity-10"></div>
               )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold tracking-tight mb-2">Protocol Active</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium italic">Interviewer is listening...</p>
            </div>
          </div>
        )}
      </main>

      {/* 🎮 Controls */}
      <footer className="p-10 flex justify-center items-center gap-6 border-t border-zinc-100 dark:border-zinc-900">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          disabled={!isStarted}
          className={`p-4 rounded-xl border transition-all duration-300 ${
            !isStarted ? 'opacity-20 cursor-not-allowed' :
            isMuted ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/50' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button 
          onClick={() => window.close()}
          className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <PhoneOff className="w-5 h-5" /> End Session
        </button>
      </footer>
    </div>
  );
}