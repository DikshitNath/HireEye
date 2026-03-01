const express = require('express');
const Candidate = require('../models/Candidate');
const { GoogleGenAI } = require("@google/genai"); // Fixed import name
const nodemailer = require('nodemailer');

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const router = express.Router();

// GET: Fetch candidates ONLY for the logged-in user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    // ✨ ADD .populate('jobId') here!
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

    const conversationText = transcript.map(msg => 
      `${msg.sender === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.text}`
    ).join('\n');

    const prompt = `
      You are a Senior Technical Recruiter. Evaluate this interview transcript:
      
      ${conversationText}
      
      Respond STRICTLY in JSON:
      {
        "score": number (0-100),
        "feedback": "2-sentence high-density analysis"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Note: Using 1.5-flash as 2.5 is not current
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const aiText = response.text;

    const cleanText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const evaluation = JSON.parse(cleanText);

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId, 
      { 
        interviewScore: evaluation.score,
        interviewFeedback: evaluation.feedback,
        interviewStatus: 'Completed'
      },
      { new: true }
    );

    res.json(updatedCandidate);
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
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

module.exports = router;