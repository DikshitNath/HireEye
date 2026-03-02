import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Mic, PhoneOff, Terminal, Sparkles, Loader2, Square, Sun, Moon, Send, ShieldAlert } from 'lucide-react';

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  // 🎛️ System State
  const [isStarted, setIsStarted] = useState(false);
  const [status, setStatus] = useState('Initializing Protocol...');
  const [isValidating, setIsValidating] = useState(false); // Set to true if you have a loader
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  // 🗣️ Voice & UI Lock State
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Locks UI while waiting for Python
  const [liveTranscript, setLiveTranscript] = useState([]);

  // 🧠 Hardware Refs
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);
  const chatScrollRef = useRef(null);
  const transcriptRef = useRef([]); // ✨ Guaranteed latest data for endSession

  // Sync state with Ref to prevent "No Data" bug
  useEffect(() => {
    transcriptRef.current = liveTranscript;
  }, [liveTranscript]);

  // 🌓 Theme Logic
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // 📜 Auto-Scroll Chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // 🔐 Link Verification
  useEffect(() => {
    const verifyLink = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/candidates/${id}`);
        const data = await response.json();

        if (data.jobId) {
          setJobData({
            title: data.jobId.title,
            description: data.jobId.description
          });
        }

        if (data.interviewStatus === 'Completed') setAccessDenied(true);
      } catch (error) { 
        console.error("Link verification failed", error); 
      } finally {
        // ✨ THE FIX: Turn off the loader whether it succeeds or fails
        setIsValidating(false); 
      }
    };
    verifyLink();
    
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (socketRef.current) socketRef.current.close();
    }
  }, [id]);

  // 🎤 Setup Media Recorder
  const setupAudioHardware = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'audio', data: base64Audio }));
          }
        };
      };

      mediaRecorderRef.current = recorder;
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  // 🚀 Start Session
  const beginSession = () => {
    setIsStarted(true);
    setStatus('Connecting...');

    socketRef.current = new WebSocket(`ws://localhost:8000/ws/interview-v2/${id}`);

    socketRef.current.onopen = () => {
      setupAudioHardware();
      setStatus('Live');
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'text') {
        const aiMessage = data.message;
        setLiveTranscript(prev => [...prev, { sender: 'ai', text: aiMessage }]);

        // ✨ THE FIX: Unlock the UI the moment the AI replies
        setIsProcessing(false); 
        setStatus('Interviewer is speaking...');

        // Check for the Final Keyword
        if (aiMessage.includes("FINISH_INTERVIEW")) {
          const cleanMessage = aiMessage.replace("FINISH_INTERVIEW", "").trim();

          speakText(cleanMessage, () => {
            setStatus('Submission in progress...');
            setTimeout(() => {
              endSession(); 
            }, 5000); // ✨ 5s wait AFTER speaking
          });
        } else {
          speakText(aiMessage, () => setStatus('Ready. Tap to Speak.'));
        }
      }

      // Handle Whisper Transcriptions
      else if (data.type === 'transcription') {
        setLiveTranscript(prev => [...prev, { sender: 'candidate', text: data.message }]);
        setStatus('Interviewer is evaluating...');
        setIsProcessing(true); // 🔒 Lock the mic while the AI "thinks"
      }

      // Handle Adaptive Auto-Submit
      else if (data.type === 'auto_submit') {
        setStatus('Interview Concluded.');
        setTimeout(() => {
          endSession();
        }, 2000);
      }

      // Handle Errors
      else if (data.type === 'error') {
        setStatus('Ready');
        setIsProcessing(false); // ✨ Unlock UI on error so they aren't stuck
      }
    };

    socketRef.current.onclose = () => setStatus('Disconnected');
  };

  // 🔊 Setup Text-to-Speech
  const speakText = (text, callback) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Stop current speech
    setIsAiSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (callback) callback(); 
    };

    synthRef.current.speak(utterance);
  };

  // 👆 Handle Tap-to-Speak Button
  const toggleRecording = () => {
    // 🔒 Prevent clicking if AI is processing or speaking
    if (isProcessing || isAiSpeaking || !mediaRecorderRef.current) return;

    if (!isRecording) {
      // START
      synthRef.current.cancel(); 
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('Recording... Tap to send.');
    } else {
      // STOP & SEND
      setIsRecording(false);
      setIsProcessing(true); // 🔒 Lock the button immediately
      setStatus('Uploading audio...');

      setTimeout(() => {
        mediaRecorderRef.current.stop();
      }, 400); // Buffer to catch the final word
    }
  };

  // 🛑 End Session & Submit
  const endSession = async () => {
    const finalData = transcriptRef.current; // ✨ Always gets the latest transcript

    if (finalData.length === 0) {
      console.warn("No data to record.");
      return navigate('/dashboard');
    }

    try {
      const token = await getToken();
      setStatus('Finalizing Assessment...');

      const response = await fetch(`http://localhost:5000/api/candidates/${id}/interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transcript: finalData })
      });

      if (response.ok) {
        setIsFinished(true); // Trigger the native Thank You screen
      } else {
        alert("Failed to save interview. Please contact support.");
      }
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  // --- RENDERERS ---

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="w-16 h-16 relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
            Verifying Secure Link
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Initializing assessment protocol...
          </p>
        </div>
      </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-white">Link Expired</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
            This interview link has already been used and the assessment is marked as <strong>Completed</strong>.
          </p>
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800">
            For security and fairness, candidates may only attempt the interview once. If you believe this is an error, please contact the recruitment team for a new link.
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-white">Interview Complete</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
            Your assessment for the <strong>{jobData?.title || 'Software Engineer'}</strong> role has been successfully submitted.
          </p>
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm text-zinc-500">
            The recruitment team has been notified. You can now safely close this window.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300 h-screen overflow-hidden">

      <header className="p-6 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-black/20 backdrop-blur-md flex-shrink-0">
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
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${isStarted ? (isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500') : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{status}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {!isStarted ? (
          <div className="w-full flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl text-zinc-900 dark:text-white">
                <Mic className="w-8 h-8" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">Assessment</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-sm font-medium leading-relaxed px-4">
                AI-conducted technical interview. We use a Push-to-Talk system. Tap the microphone when you are ready to answer.
              </p>
              <button onClick={beginSession} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-lg hover:opacity-90 transition-all active:scale-95 shadow-2xl">
                Begin Session
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col md:flex-row h-full">

            <div className="w-full md:w-1/3 border-r border-zinc-200 dark:border-zinc-900 bg-white/30 dark:bg-black/10 flex flex-col items-center justify-center p-8 relative">
              <div className="relative mb-12">
                <div className={`w-40 h-40 border rounded-full flex items-center justify-center relative z-10 shadow-inner transition-colors duration-500 ${isAiSpeaking ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
                  <Sparkles className={`w-12 h-12 ${isAiSpeaking ? 'text-emerald-500 animate-pulse' : 'text-zinc-300 dark:text-zinc-700'}`} />
                </div>
                {isAiSpeaking && (
                  <div className="absolute inset-0 w-40 h-40 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                )}
              </div>

              {/* ✨ SMART LOCKED BUTTON */}
              <button
                onClick={toggleRecording}
                disabled={isProcessing || isAiSpeaking}
                className={`group relative flex flex-col items-center justify-center w-32 h-32 rounded-3xl border-2 transition-all duration-300 ${(isProcessing || isAiSpeaking) ? 'opacity-30 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' :
                  isRecording ? 'bg-rose-500 border-rose-600 shadow-[0_0_40px_rgba(244,63,94,0.4)] scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-xl cursor-pointer active:scale-95'
                  }`}
              >
                {isRecording ? (
                  <>
                    <Send className="w-10 h-10 text-white mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Tap to Send</span>
                  </>
                ) : (
                  <>
                    <Mic className={`w-10 h-10 mb-2 ${(isProcessing || isAiSpeaking) ? 'text-zinc-400' : 'text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors'}`} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center px-2">
                      {isAiSpeaking ? 'AI Speaking...' : isProcessing ? 'Processing...' : 'Tap to Speak'}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="w-full md:w-2/3 flex flex-col bg-[#FAFAFA] dark:bg-[#0A0A0A] relative">
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth pb-32">

                {liveTranscript.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-5 ${msg.sender === 'ai'
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm shadow-sm'
                      : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm shadow-md font-medium'
                      }`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50">
                        {msg.sender === 'ai' ? 'Interviewer' : 'You'}
                      </p>
                      <p className="leading-relaxed text-[15px]">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A] flex justify-end">
                <button onClick={endSession} className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-rose-500/20">
                  <PhoneOff className="w-5 h-5" /> Terminate & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}