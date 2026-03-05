import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle, Loader2, Sparkles, Plus, ChevronDown, Briefcase } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

export default function CVUploader() {
  const { userId, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Job Management State
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [showJobModal, setShowJobModal] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '' });

  // 1. Fetch user-specific jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!userId) return;
      try {
        const token = await getToken(); // ✨ Get the token

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // ✨ Attach the token
          }
        });

        const data = await response.json();
        if (response.ok) {
          setJobs(Array.isArray(data) ? data : []);
        } else {
          console.error("Failed to fetch jobs:", data);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, [userId, getToken]);
  // 2. Create Job Function

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description) return;

    try {
      const token = await getToken(); // ✨ 1. Grab the secure token

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✨ 2. Attach it to the headers
        },
        body: JSON.stringify({ ...newJob, userId })
      });

      if (response.ok) {
        const savedJob = await response.json();
        setJobs(prev => [savedJob, ...prev]);
        setSelectedJobId(savedJob._id); // Auto-selects the new job
        setShowJobModal(false);
        setNewJob({ title: '', description: '' });
      } else {
        console.error("Failed to save role: Unauthorized");
      }
    } catch (err) {
      console.error("Failed to save role", err);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!selectedJobId) return alert("Please select or create a job first");

    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', userId);
    formData.append('jobId', selectedJobId); // ✨ Pass the selected job ID

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cv/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data.evaluation);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to process CV');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedJobId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8 transition-colors duration-300 font-sans">

      <div className="flex flex-col lg:flex-row gap-6">

        {/* 📋 Left Side: Job Selection */}
        <div className="w-full lg:w-1/3 bg-white dark:bg-[#111] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Target_Protocol</h3>
              <button
                onClick={() => setShowJobModal(true)}
                className="p-1.5 cursor-pointer rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-80 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                <Plus className="w-3 h-3" /> New Role
              </button>
            </div>

            {jobs.length > 0 ? (
              <div className="relative group">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full appearance-none bg-zinc-50 dark:bg-[#151515] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-zinc-400 transition-all cursor-pointer"
                >
                  {/* ✨ THE FIX: Default Placeholder Option */}
                  <option value="" disabled>Select a Role Protocol...</option>

                  {jobs.map(job => (
                    <option key={job._id} value={job._id}>{job.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-500 font-medium italic">No roles defined yet.</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <Briefcase className="w-4 h-4 text-zinc-400 mt-0.5" />
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              AI will evaluate candidates against the selected role's specific technical requirements and scoring index.
            </p>
          </div>
        </div>

        {/* ☁️ Right Side: Dropzone */}
        <div className="flex-1 bg-white dark:bg-[#111111] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center min-h-[220px]">
          <div
            {...getRootProps()}
            className={`relative overflow-hidden border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group h-full flex flex-col items-center justify-center
              ${isDragActive
                ? 'border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900/50'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-[#FAFAFA] dark:bg-[#151515]'}`}
          >
            <input {...getInputProps()} />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-2">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-white mb-3" />
                <p className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">Processing document...</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Running extraction models</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                <div className="w-10 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold tracking-tight">Click or drag & drop a PDF resume</p>
                <p className="text-[10px] mt-1 font-mono uppercase tracking-widest opacity-60">Candidate_Upload_Service</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 Result Card Block (Remains same) */}
      {result && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="md:col-span-3 bg-zinc-900 dark:bg-white p-6 rounded-2xl flex flex-col justify-between border border-zinc-800 dark:border-zinc-200 shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
                  Extraction_Complete // Result_Index
                </span>
              </div>
              <p className="text-lg font-bold text-white dark:text-zinc-900 leading-tight tracking-tight mb-4 italic">
                "{result.summary}"
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.skillsFound.map((skill, index) => (
                <span key={index} className="text-[10px] font-mono font-bold border border-zinc-700 dark:border-zinc-200 text-zinc-400 dark:text-zinc-500 px-2 py-1 rounded-md uppercase">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="md:col-span-1 bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group">
            <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-zinc-50 dark:text-zinc-900 opacity-50 group-hover:rotate-12 transition-transform duration-700" />
            <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest mb-2 relative z-10">AI_SCORE</span>
            <div className={`text-6xl font-black tracking-tighter relative z-10 ${result.score >= 75 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
              {result.score}
            </div>
            <div className="mt-4 w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-1000 ease-out" style={{ width: `${result.score}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Job Creation Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/80 dark:bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-zinc-900">
                <Briefcase className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter">Define Protocol</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-2">Role_Title</label>
                <input
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. Lead MERN Architect"
                  className="w-full bg-zinc-50 dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-2">Evaluation_Criteria</label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Paste the job description here. AI will use this to score candidates..."
                  rows={6}
                  className="w-full bg-zinc-50 dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition-all font-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button
                onClick={handleCreateJob}
                className="cursor-pointer flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-xl font-bold text-sm tracking-tight transition-all active:scale-95 shadow-lg"
              >
                Initialize Role
              </button>
              <button
                onClick={() => setShowJobModal(false)}
                className="cursor-pointer px-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-4 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}