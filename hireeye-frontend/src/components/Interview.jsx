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
  const [isValidating, setIsValidating] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  // 🗣️ Voice & UI Lock State
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);

  // 🧠 Hardware Refs
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);
  const chatScrollRef = useRef(null);
  const transcriptRef = useRef([]);

  // 🎥 Video Proctoring Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const streamRef = useRef(null); // Keep track of stream to turn off camera later

  // Sync state with Ref
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

  // 🔐 Link Verification & Cleanup
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
        setIsValidating(false);
      }
    };
    verifyLink();

    // Cleanup on unmount
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (socketRef.current) socketRef.current.close();
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); // Turn off camera light
    }
  }, [id]);

  // 🎥 1. Setup Hardware (With Audio Fallback & Stream Separation)
  const setupHardware = async () => {
    try {
      let stream;

      // Step A: Try to get BOTH Video and Audio
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { width: 640, height: 480, facingMode: "user" }
        });
      } catch (initialErr) {
        // Step B: Fallback to AUDIO ONLY if no camera is found
        if (initialErr.name === 'NotFoundError') {
          console.warn("No camera found. Falling back to audio-only mode.");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true }
          });
        } else {
          throw initialErr; // Throw permission errors to the main catch block
        }
      }

      streamRef.current = stream;

      // ✨ DEFINE hasVideo HERE
      const hasVideo = stream.getVideoTracks().length > 0;

      // Attach to UI only if video exists
      if (hasVideo && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // ✨ SEPARATE AUDIO FOR RECORDER
      const audioTrack = stream.getAudioTracks()[0];
      const audioOnlyStream = new MediaStream([audioTrack]);

      // Setup Audio Recording using the isolated audio stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(audioOnlyStream, { mimeType });

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

      // Start Vision Proctoring Loop ONLY if camera exists
      if (hasVideo) {
        proctorIntervalRef.current = setInterval(() => {
          if (videoRef.current && canvasRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            const context = canvasRef.current.getContext('2d');
            context.drawImage(videoRef.current, 0, 0, 640, 480);
            const base64Frame = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            socketRef.current.send(JSON.stringify({ type: 'vision_frame', data: base64Frame }));
          }
        }, 5000);
      }

      return true; // Hardware successfully loaded

    } catch (err) {
      console.error("HARDWARE ERROR DETAILED:", err.name, err.message);

      if (err.name === 'NotAllowedError') {
        alert("Error: Browser permissions are blocking access. Click the lock icon in your URL bar.");
      } else if (err.name === 'NotReadableError') {
        alert("Error: Your hardware is currently being used by another app (like Zoom). Please close it.");
      } else {
        alert(`Hardware Error: ${err.message}. Check console (F12).`);
      }

      return false; // Hardware failed
    }
  };

  // 🚀 2. Start Session (Hardware FIRST, then AI)
  const beginSession = async () => {
    setIsStarted(true);
    setStatus('Requesting Camera...');

    // Step 1: Request Hardware First
    const hardwareSuccess = await setupHardware();

    // If they block the camera, kick them back to the start screen
    if (!hardwareSuccess) {
      setIsStarted(false);
      setStatus('Ready');
      return;
    }

    // Step 2: Connect to Python AI
    setStatus('Connecting to AI...');
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/interview-v2/${id}`);

    socketRef.current.onopen = () => {
      setStatus('Live');
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'text') {
        const aiMessage = data.message;
        setLiveTranscript(prev => [...prev, { sender: 'ai', text: aiMessage }]);
        setIsProcessing(false);
        setStatus('Interviewer is speaking...');

        if (aiMessage.includes("FINISH_INTERVIEW")) {
          const cleanMessage = aiMessage.replace("FINISH_INTERVIEW", "").trim();
          speakText(cleanMessage, () => {
            setStatus('Submission in progress...');
            setTimeout(() => { endSession(); }, 5000);
          });
        } else {
          speakText(aiMessage, () => setStatus('Ready. Tap to Speak.'));
        }
      }
      else if (data.type === 'transcription') {
        setLiveTranscript(prev => [...prev, { sender: 'candidate', text: data.message }]);
        setStatus('Interviewer is evaluating...');
        setIsProcessing(true);
      }
      else if (data.type === 'auto_submit') {
        setStatus('Interview Concluded.');
        setTimeout(() => { endSession(); }, 2000);
      }
      else if (data.type === 'error') {
        setStatus('Ready');
        setIsProcessing(false);
      }
    };

    socketRef.current.onclose = () => setStatus('Disconnected');
  };

  // 🔊 Setup Text-to-Speech
  const speakText = (text, callback) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
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
    if (isProcessing || isAiSpeaking || !mediaRecorderRef.current) return;

    if (!isRecording) {
      synthRef.current.cancel();
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('Recording... Tap to send.');
    } else {
      setIsRecording(false);
      setIsProcessing(true);
      setStatus('Uploading audio...');

      setTimeout(() => {
        mediaRecorderRef.current.stop();
      }, 400);
    }
  };

  // 🛑 End Session & Submit
  const endSession = async () => {
    // Turn off camera and interval when session ends
    if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

    const finalData = transcriptRef.current;

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
        setIsFinished(true);
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
                AI-conducted technical interview. We use a Push-to-Talk system. Tap the microphone when you are ready to answer. Ensure your camera is clear.
              </p>
              <button onClick={beginSession} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-lg hover:opacity-90 transition-all active:scale-95 shadow-2xl">
                Begin Session
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col md:flex-row h-full">

            <div className="w-full md:w-1/3 border-r border-zinc-200 dark:border-zinc-900 bg-white/30 dark:bg-black/10 flex flex-col items-center justify-center p-8 relative">

              {/* ✨ LIVE PROCTORING CAMERA FEED */}
              <div className="relative mb-12 flex flex-col items-center justify-center w-full">
                <div className={`relative w-48 h-48 rounded-full overflow-hidden border-4 shadow-inner transition-all duration-500 ${isAiSpeaking ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-zinc-200 dark:border-zinc-800'}`}>
                  {/* The video element mirrors the user's face */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* 'Proctored' Badge */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-bold text-white tracking-widest uppercase">Proctored</span>
                    </div>
                  </div>

                  {/* AI Speaking Glow overlay */}
                  {isAiSpeaking && (
                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full animate-pulse pointer-events-none opacity-50"></div>
                  )}
                </div>

                {/* Hidden canvas to grab base64 frames */}
                <canvas ref={canvasRef} width="640" height="480" className="hidden" />
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