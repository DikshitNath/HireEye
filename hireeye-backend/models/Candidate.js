const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  
  // Phase 1: CV Data
  resumeText: { type: String }, // The raw text extracted from the PDF
  aiCvScore: { type: Number, min: 0, max: 100 },
  aiCvSummary: { type: String }, // "Explain this score"
  
  // Phase 2: GitHub Data
  githubUrl: { type: String },
  aiProjectScore: { type: Number, min: 0, max: 100 },
  aiProjectAnalysis: [{ type: String }], // Feedback on complexity/originality
  
  // App Status
  status: { 
    type: String, 
    enum: ['Applied', 'Shortlisted', 'Interviewing', 'Rejected', 'Hired'], 
    default: 'Applied' 
  },

  // Add this inside your CandidateSchema
  interviewScore: { type: Number, default: null },
  interviewFeedback: { type: String, default: null },
  interviewStatus: { 
    type: String, 
    enum: ['Not Started', 'Pending', 'Completed'], 
    default: 'Not Started' 
  },

  proctoringStrikes: { 
    type: Number, 
    default: 0 
  },
  proctoringFlags: [{ 
    type: String 
  }],

  transcript: [{
    sender: { 
      type: String, 
      enum: ['ai', 'candidate'], 
      required: true 
    },
    text: { 
      type: String, 
      required: true 
    }
  }],

  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);