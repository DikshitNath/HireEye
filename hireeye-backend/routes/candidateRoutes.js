const express = require('express');
const Candidate = require('../models/Candidate');

const SibApiV3Sdk = require('@getbrevo/brevo');

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

    const interviewLink = `${process.env.CLIENT_URL}/interview/${candidate._id}`;

    // ✨ 1. Initialize Brevo API Client
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY; // Add this to Render Env Vars

    // ✨ 2. Construct the Email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = "Action Required: Technical Assessment for HireEye";
    sendSmtpEmail.sender = { "name": "HireEye AI", "email": "your-verified-email@gmail.com" };
    sendSmtpEmail.to = [{ "email": candidate.email, "name": candidate.name }];
    sendSmtpEmail.htmlContent = `
        <div style="font-family: sans-serif; background-color: #fafafa; padding: 40px; color: #18181b;">
          <h2>Hello ${candidate.name},</h2>
          <p>Please complete your AI Voice Interview below.</p>
          <div style="margin: 32px 0;">
            <a href="${interviewLink}" style="background-color: #18181b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700;">
              Begin Assessment
            </a>
          </div>
          <p style="color: #a1a1aa; font-size: 12px;">Secure Session • HireEye Engineering</p>
        </div>
      `;

    // ✨ 3. Send via API (Not SMTP)
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    candidate.interviewStatus = 'Pending';
    await candidate.save();

    res.status(200).json({ message: "Link dispatched via API", status: 'Pending' });
  } catch (error) {
    console.error("Brevo API error:", error);
    res.status(500).json({ error: "Failed to dispatch email via API" });
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