import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { Moon, Sun, Terminal } from 'lucide-react';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import CVUploader from './components/CVUploader';
import Interview from './components/Interview';

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/dashboard" element={
          <>
            <SignedIn>
              {/* ✨ The new Studio Backdrop: Ultra-clean FAFAFA light, 0A0A0A dark */}
              <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 py-10 selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300">

                <header className="mb-10 max-w-7xl mx-auto flex justify-between items-center px-4 md:px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center transition-colors">
                      <Terminal className="w-5 h-5 text-white dark:text-zinc-900" />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tighter italic">
                      Hire<span className="text-zinc-400 dark:text-zinc-500 font-medium not-italic">Eye</span>
                    </h1>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <a href="/" className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-lg shadow-sm">
                      Exit
                    </a>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </header>

                <CVUploader />
                <Dashboard />
              </div>
            </SignedIn>

            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/interview/:id" element={<Interview />} />
      </Routes>
    </Router>
  );
}

export default App;