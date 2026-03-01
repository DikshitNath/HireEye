const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

// Import our MongoDB Schemas
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    // ✨ EXTRACTION: Capture the userId sent from the frontend
    const { userId, jobId } = req.body; // ✨ Extract both IDs from the request

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    if (!jobId) return res.status(400).json({ error: 'A Target Role (Job ID) must be selected' });

    // 1. Fetch the specific Job Protocol the recruiter selected
    const selectedJob = await Job.findById(jobId);
    if (!selectedJob) {
      return res.status(404).json({ error: 'Selected Job Protocol not found' });
    }

    /// 2. Extract Text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    // 2. Fetch actual job
    const activeJob = await Job.findById(jobId);
    if (!activeJob) return res.status(404).json({ error: "Job criteria not found" });

    // 3. The Upgraded AI Prompt
    const prompt = `
      # ROLE
      You are a Senior Technical Recruiter at a high-growth tech firm. Your task is to extract data and evaluate a candidate's resume with extreme precision.

      # CONTEXT
      Target Job Description: ${activeJob.title} - ${activeJob.description}
      
      # DATA EXTRACTION RULES
      1. **Name**: Extract the full legal name.
      2. **Email**: Extract the primary contact email.
      3. **GitHub**: Find the GitHub profile URL. Sanitize it: remove trailing slashes or "mailto:" prefixes. If not found, return null.
      4. **Skills**: Identify exactly 5-8 of the most relevant technical skills that overlap with the Job Description.

      # SCORING RUBRIC (Total 100 points)
      - **Technical Stack (40 pts)**: Direct match of languages, frameworks, and tools.
      - **Experience Depth (30 pts)**: Seniority, project complexity, and years of active work.
      - **Project Relevance (20 pts)**: Do their past projects mirror the JD requirements?
      - **Communication (10 pts)**: Clarity of resume, formatting, and impact-driven bullet points.

      # RESUME TEXT
      ${resumeText}

      # OUTPUT SPECIFICATION
      Respond strictly in JSON.
      {
        "name": "string",
        "email": "string",
        "githubUrl": "string or null",
        "score": number,
        "summary": "A 3-sentence, high-density professional analysis focusing on the 'Technical Stack' and 'Experience Depth' rubrics.",
        "skillsFound": ["string"]
      }
    `;

    // 4. Call the AI
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Note: Using 1.5-flash as 2.5 is not current
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const aiResult = JSON.parse(response.text);

    // 5. Save everything to MongoDB!
    const newCandidate = new Candidate({
      userId: userId, // ✨ THE FIX: Link the candidate to the specific recruiter
      jobId: selectedJob._id,
      name: aiResult.name || "Unknown Candidate",
      email: aiResult.email || "No email found",
      githubUrl: aiResult.githubUrl || "",
      resumeText: resumeText,
      aiCvScore: aiResult.score,
      aiCvSummary: aiResult.summary,
      skills: aiResult.skillsFound || [] // Ensure skills are saved if they are in your schema
    });

    await newCandidate.save();

    // 6. Send the success response
    res.status(200).json({
      message: 'CV Processed & Saved to Your Account',
      candidateId: newCandidate._id,
      evaluation: aiResult
    });

  } catch (error) {
    console.error('Error processing CV:', error);
    res.status(500).json({ error: 'Failed to process CV' });
  }
});

module.exports = router;