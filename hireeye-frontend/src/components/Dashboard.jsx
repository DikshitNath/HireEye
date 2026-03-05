import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Users, Star, X, RefreshCw, Github, Link as LinkIcon, Loader2, Trash2, Mic, User as UserIcon, CheckCircle, Briefcase, MessageSquare, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [githubUrl, setManualGithubUrl] = useState('');
  const [evaluatingIds, setEvaluatingIds] = useState([]);
  const [filterJobId, setFilterJobId] = useState("all");

  const [showTranscript, setShowTranscript] = useState(false);

  // Logic to filter the candidates array
  const filteredCandidates = filterJobId === "all"
    ? candidates
    : candidates.filter(c => String(c.jobId?._id) === String(filterJobId));

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    const candidatesToEvaluate = candidates.filter(
      (c) => c.githubUrl && !c.aiProjectScore && !evaluatingIds.includes(c._id)
    );
    candidatesToEvaluate.forEach((candidate) => {
      triggerAutoEvaluation(candidate);
    });
  }, [candidates]);

  const { userId, getToken } = useAuth();

  const fetchCandidates = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = await getToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/candidates?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setCandidates(Array.isArray(data) ? data : []);
      } else {
        console.error("Backend rejected request:", data.error);
        setCandidates([]);
      }

    } catch (error) {
      console.error('Failed to fetch candidates', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoEvaluation = async (candidate) => {
    setEvaluatingIds((prev) => [...prev, candidate._id]);
    try {
      const token = await getToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/github/evaluate-profile/${candidate._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      // ✅ Corrected triggerAutoEvaluation update
      if (response.ok) {
        setCandidates((prev) => prev.map((c) =>
          c._id === data.candidate._id
            ? { ...c, ...data.candidate, jobId: c.jobId }
            : c
        ));
        setSelectedCandidate((prev) =>
          prev?._id === data.candidate._id
            ? { ...prev, ...data.candidate, jobId: prev.jobId }
            : prev
        );
      } else {
        console.error("Auto-eval rejected by backend:", data.error);
      }
    } catch (error) {
      console.error(`Auto-eval failed for ${candidate.name}:`, error);
    } finally {
      setEvaluatingIds((prev) => prev.filter((id) => id !== candidate._id));
    }
  };

  const handleManualEvaluation = async () => {
    if (!githubUrl || !selectedCandidate) return;
    setEvaluatingIds((prev) => [...prev, selectedCandidate._id]);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/github/evaluate/${selectedCandidate._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl })
      });
      const data = await response.json();
      setSelectedCandidate(data.candidate);
      fetchCandidates();
      setManualGithubUrl('');
    } catch (error) {
      alert('Failed to evaluate manual project link.');
    } finally {
      setEvaluatingIds((prev) => prev.filter((id) => id !== selectedCandidate._id));
    }
  };

  const updateStatus = async (status) => {
    try {
      const token = await getToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/candidates/${selectedCandidate._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("Backend rejected request");

      const updatedCandidate = await response.json();
      setSelectedCandidate(updatedCandidate);
      setCandidates(prev => prev.map(c =>
        c._id === updatedCandidate._id
          ? { ...c, ...updatedCandidate, jobId: c.jobId } // Force keep the old jobId object
          : c
      ));
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status");
    }
  };

  const deleteCandidate = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedCandidate.name}?`);
    if (!confirmDelete) return;

    try {
      const token = await getToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/candidates/${selectedCandidate._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Backend rejected delete request");

      const remaining = candidates.filter(c => c._id !== selectedCandidate._id);
      setCandidates(remaining);
      setSelectedCandidate(remaining.length > 0 ? remaining[0] : null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete candidate");
    }
  };

  const sendInterviewLink = async (candidateId, candidateEmail) => {
    try {
      alert(`Drafting email to ${candidateEmail}...`);
      const token = await getToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/candidates/${candidateId}/send-interview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        alert('✅ Success: ' + data.message);
        fetchCandidates();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error("Email dispatch error:", error);
      alert('Network error. Check if the backend is running.');
    }
  };

  // ✨ OPTIMIZATION: Extract unique jobs in a single, highly efficient pass
  const uniqueJobs = Array.from(
    new Map(
      candidates
        .filter(c => c.jobId && c.jobId._id && typeof c.jobId.title === 'string')
        .map(c => [c.jobId._id, c.jobId])
    ).values()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 transition-colors duration-300 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Candidate Pipeline</h2>
        </div>

        <button onClick={fetchCandidates} disabled={loading} className="cursor-pointer flex items-center gap-2 bg-white dark:bg-[#111] px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-900 dark:text-white' : 'text-zinc-500'}`} />
          Sync Data
        </button>
      </div>

      {/* 🔍 Global Filter Bar */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#111] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Briefcase className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Filter_By_Protocol</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <button
                onClick={() => setFilterJobId("all")}
                className={`cursor-pointer px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${filterJobId === "all"
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
              >
                All_Records
              </button>

              {/* ✨ THE FIX: Render pre-filtered unique jobs */}
              {uniqueJobs.map((job) => (
                <button
                  key={job._id}
                  onClick={() => setFilterJobId(job._id)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${filterJobId === job._id
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  {job.title.replace(/\s+/g, '_')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono font-bold text-zinc-400">
          Showing {filteredCandidates.length} of {candidates.length}
        </div>
      </div>

      {/* Split Layout Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ================= LEFT COLUMN: CANDIDATE LIST ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[700px] custom-scrollbar">
          {filteredCandidates.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No Records Found</p>
              <p className="text-[10px] text-zinc-400 mt-1">Change the filter to see other protocols.</p>
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const isSelected = selectedCandidate?._id === candidate._id;

              return (
                <div
                  key={candidate._id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`cursor-pointer rounded-lg p-3 flex items-center gap-3 transition-all duration-150 border ${isSelected
                    ? 'bg-white dark:bg-[#151515] border-zinc-400 dark:border-zinc-600 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-[#111]'
                    }`}
                >
                  <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                    {candidate.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">{candidate.name}</h3>
                      <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 px-1 rounded flex-shrink-0">
                        {candidate.jobId?.title?.replace(/\s+/g, '_') || "GENERAL"}
                      </span>

                      {/* ✨ THE FIX: Left Sidebar Red Flag Badge */}
                      {candidate.proctoringStrikes > 0 && (
                        <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-800/50 flex-shrink-0">
                          <ShieldAlert className="w-3 h-3" />
                          {candidate.proctoringStrikes} Flag{candidate.proctoringStrikes > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-2">{candidate.email}</p>

                    <div className="flex gap-1.5">
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                        CV:{candidate.aiCvScore || '--'}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                        HUB:{candidate.aiProjectScore || '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================= RIGHT COLUMN: CANDIDATE DETAILS ================= */}
        <div className="flex-[2] bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[500px] flex flex-col shadow-sm">
          {selectedCandidate ? (
            <div className="flex flex-col h-full">

              {/* Detail Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {selectedCandidate.name}
                    </h2>
                    <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                      Target_{selectedCandidate.jobId?.title || "General_Role"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{selectedCandidate.email}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${selectedCandidate.status === 'Shortlisted' ? 'text-emerald-600 dark:text-emerald-400' :
                      selectedCandidate.status === 'Rejected' ? 'text-rose-600 dark:text-rose-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`}>
                      {selectedCandidate.status || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => updateStatus('Shortlisted')} className="cursor-pointer px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded shadow-sm transition-colors">
                    Approve
                  </button>
                  <button onClick={() => updateStatus('Rejected')} className="cursor-pointer px-3 py-1.5 bg-white dark:bg-[#151515] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold rounded transition-colors">
                    Reject
                  </button>
                  <button onClick={deleteCandidate} className="px-3 py-1.5 cursor-pointer bg-white dark:bg-[#151515] border border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-bold rounded transition-colors" title="Delete Candidate">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Sections */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[calc(100vh-300px)]">

                {/* ✨ THE FIX: Detailed Proctoring Alert Box */}
                {selectedCandidate.proctoringStrikes > 0 && (
                  <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex flex-col gap-3 animate-in fade-in duration-300 shadow-sm">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                      <ShieldAlert className="w-5 h-5" />
                      <h3 className="tracking-tight text-lg">Proctoring Violations Detected</h3>
                    </div>
                    <ul className="space-y-2 mt-2">
                      {selectedCandidate.proctoringFlags?.map((flag, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 font-medium bg-red-100/50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-800/30">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium opacity-80 mt-2">
                      * The candidate's assessment was automatically flagged by the Vision AI. Review the transcript below for exact context.
                    </p>
                  </div>
                )}

                {/* 1. Resume Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-1">Resume</div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl font-black text-zinc-900 dark:text-white">{selectedCandidate.aiCvScore}</div>
                      <div className="text-xs text-zinc-500 font-medium">/100</div>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium bg-zinc-50 dark:bg-[#151515] p-3 rounded border border-zinc-100 dark:border-zinc-800">
                      "{selectedCandidate.aiCvSummary}"
                    </p>
                  </div>
                </div>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* 2. Code Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-1">Code</div>
                  <div className="col-span-3">

                    {evaluatingIds.includes(selectedCandidate._id) ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Repo...</div>
                    ) : selectedCandidate.aiProjectScore ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl font-black text-zinc-900 dark:text-white">{selectedCandidate.aiProjectScore}</div>
                          <div className="text-xs text-zinc-500 font-medium">/100</div>
                          {selectedCandidate.githubUrl && (
                            <a href={selectedCandidate.githubUrl} target="_blank" rel="noreferrer" className="ml-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                              <LinkIcon className="w-3 h-3" /> Repository
                            </a>
                          )}
                        </div>
                        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                          {Array.isArray(selectedCandidate.aiProjectAnalysis)
                            ? selectedCandidate.aiProjectAnalysis.map((point, i) => {
                              const formattedPoint = point.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                                part.startsWith('**') && part.endsWith('**')
                                  ? <strong key={index} className="text-zinc-900 dark:text-white font-extrabold">{part.slice(2, -2)}</strong>
                                  : part
                              );
                              return <li key={i} className="flex gap-2 items-start"><span className="text-zinc-400">•</span> <span>{formattedPoint}</span></li>;
                            })
                            : <p>{selectedCandidate.aiProjectAnalysis}</p>
                          }
                        </ul>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="GitHub URL to evaluate..."
                          className="w-full bg-zinc-50 dark:bg-[#151515] border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                          value={githubUrl}
                          onChange={(e) => setManualGithubUrl(e.target.value)}
                        />
                        <button onClick={handleManualEvaluation} disabled={!githubUrl} className="cursor-pointer self-start bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50">
                          Run Analysis
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* 3. Voice Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-1">AI Interview</div>
                  <div className="col-span-3 flex flex-col gap-3">

                    {selectedCandidate.interviewStatus === 'Completed' ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{selectedCandidate.interviewScore}</div>
                          <div className="text-xs text-zinc-500 font-medium">/100</div>

                          {/* Transcript Viewer Button */}
                          {selectedCandidate.transcript && selectedCandidate.transcript.length > 0 && (
                            <button
                              onClick={() => setShowTranscript(true)}
                              className="cursor-pointer ml-2 flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-bold transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> View Transcript
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3 rounded">
                          "{selectedCandidate.interviewFeedback}"
                        </p>
                      </>
                    ) : selectedCandidate.interviewStatus === 'Pending' ? (
                      <div className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Link Sent. Awaiting Completion.
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Not initiated.</div>
                    )}

                    <button
                      onClick={() => sendInterviewLink(selectedCandidate._id, selectedCandidate.email)}
                      disabled={selectedCandidate.interviewStatus === 'Completed'}
                      className={`self-start flex items-center gap-2 px-4 py-2 mt-2 rounded text-xs font-bold transition-all ${selectedCandidate.interviewStatus === 'Completed'
                        ? 'bg-zinc-100 dark:bg-[#151515] text-zinc-400 cursor-not-allowed border border-transparent'
                        : 'bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-white text-zinc-900 dark:text-white'
                        }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {selectedCandidate.interviewStatus === 'Completed' ? 'Interview Logged' : 'Dispatch Interview Link'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 p-10">
              <Users className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm font-bold tracking-tight">Select a candidate record.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal Popup */}
      {showTranscript && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111] w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Interview Transcript</h3>
                <p className="text-xs text-zinc-500">{selectedCandidate.name} • Score: {selectedCandidate.interviewScore}/100</p>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Chat Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50 dark:bg-[#0A0A0A]">
              {selectedCandidate.transcript?.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${msg.sender === 'ai'
                    ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm shadow-sm'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-sm shadow-md font-medium'
                    }`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-50">
                      {msg.sender === 'ai' ? 'Interviewer (AI)' : 'Candidate'}
                    </p>
                    <p className="leading-relaxed text-[14px]">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}