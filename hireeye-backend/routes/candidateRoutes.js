const express = require('express');
const Candidate = require('../models/Candidate');
const nodemailer = require('nodemailer');

// ✨ Import your new Groq utility
const { generateJson } = require('../utils/groqClient');

const router = express.Router();

// GET: Fetch candidates ONLY for the logged-in user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const candidates = await Candidate.find({ userId })
      .populate('jobId') 
      .sort({ aiCvScore: -1 });
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// PATCH: Update status (Now checks ownership via ID)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    res.status(200).json(updatedCandidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE: Remove a candidate
router.delete('/:id', async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Candidate record purged' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// POST: Grade the AI Voice Interview
router.post('/:id/interview', async (req, res) => {
  try {
    const { transcript } = req.body;
    const candidateId = req.params.id;

    // ✨ 1. THE SECURITY LOCK
    const candidate = await Candidate.findById(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (candidate.interviewStatus === 'Completed') {
      return res.status(403).json({ error: 'This interview is already completed and locked.' });
    }

    // ✨ 2. PROCTORING EXTRACTION (NEW)
    // Scan the raw transcript for AI warnings before we format it
    const flags = transcript
      .filter(msg => msg.sender === 'ai' && msg.text.includes('Proctoring Warning:'))
      .map(msg => msg.text.replace('Proctoring Warning:', '').trim());

    // ✨ 3. Format Transcript for AI Grading
    const conversationText = transcript.map(msg => 
      `${msg.sender === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.text}`
    ).join('\n');

    // ✨ 4. Define strict prompts for Groq
    const systemPrompt = "You are a Senior Technical Recruiter. You must evaluate the candidate interview strictly and always respond in valid JSON format.";
    const userPrompt = `
      Evaluate this interview transcript:
      
      TRANSCRIPT:
      ${conversationText}
      
      OUTPUT STRICTLY IN THIS JSON FORMAT:
      {
        "score": number (0-100),
        "feedback": "2-sentence high-density analysis"
      }
    `;

    // ✨ 5. Call your central Groq utility
    const evaluation = await generateJson(systemPrompt, userPrompt);

    // ✨ 6. Save EVERYTHING and lock the account
    candidate.transcript = transcript; 
    candidate.interviewScore = evaluation.score;
    candidate.interviewFeedback = evaluation.feedback;
    candidate.interviewStatus = 'Completed'; 
    
    // Bind the proctoring data to the database
    candidate.proctoringStrikes = flags.length; 
    candidate.proctoringFlags = flags;           

    await candidate.save();

    res.status(200).json({ 
      message: "Interview securely graded and locked.",
      score: evaluation.score,
      strikes: flags.length // Send this back just in case the frontend wants to know
    });

  } catch (error) {
    console.error("Interview grading error:", error);
    res.status(500).json({ error: "Failed to grade interview" });
  }
});

// POST: Send interview link
router.post('/:id/send-interview', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    if (candidate.interviewStatus === 'Completed') return res.status(400).json({ error: "Interview already completed" });

    const interviewLink = `http://localhost:5173/interview/${candidate._id}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
      }
    });

    const mailOptions = {
      from: '"HireEye AI" <no-reply@hireeye.com>',
      to: candidate.email,
      subject: 'Action Required: Technical Assessment for HireEye',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; background-color: #fafafa; padding: 40px; color: #18181b;">
          <h2 style="font-weight: 800; letter-spacing: -0.05em;">Hello ${candidate.name},</h2>
          <p style="color: #71717a;">Your profile has advanced to the next stage. Please complete your AI Voice Interview below.</p>
          <div style="margin: 32px 0;">
            <a href="${interviewLink}" style="background-color: #18181b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
              Begin Assessment
            </a>
          </div>
          <p style="color: #a1a1aa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Secure Session • HireEye Engineering</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    candidate.interviewStatus = 'Pending';
    await candidate.save();

    res.status(200).json({ message: "Link dispatched", status: 'Pending' });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// GET: Fetch single candidate (For the Interview Room)
router.get('/:id', async (req, res) => {
  try {
    // ✨ THE FIX: You MUST .populate('jobId') here!
    const candidate = await Candidate.findById(req.params.id).populate('jobId');
    
    if (!candidate) return res.status(404).json({ error: 'Record not found' });
    
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

module.exports = router;