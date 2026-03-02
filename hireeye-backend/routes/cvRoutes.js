const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Import our MongoDB Schemas
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');

// ✨ Import your new Groq utility
const { generateJson } = require('../utils/groqClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const { userId, jobId } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    if (!jobId) return res.status(400).json({ error: 'A Target Role (Job ID) must be selected' });

    // 1. Fetch the specific Job Protocol the recruiter selected
    const selectedJob = await Job.findById(jobId);
    if (!selectedJob) {
      return res.status(404).json({ error: 'Selected Job Protocol not found' });
    }

    // 2. Extract Text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    // 3. The Upgraded Groq Prompts
    const systemPrompt = `You are a Senior Technical Recruiter at a high-growth tech firm. Your task is to extract data and evaluate a candidate's resume with extreme precision. You must always respond in valid JSON format.`;
    
    const userPrompt = `
      # CONTEXT
      Target Job Description: ${selectedJob.title} - ${selectedJob.description}
      
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
      Respond strictly in JSON:
      {
        "name": "string",
        "email": "string",
        "githubUrl": "string or null",
        "score": number,
        "summary": "A 3-sentence, high-density professional analysis focusing on the 'Technical Stack' and 'Experience Depth' rubrics.",
        "skillsFound": ["string"]
      }
    `;

    // 4. Call the AI via Groq Utility (It handles the JSON parsing automatically!)
    const aiResult = await generateJson(systemPrompt, userPrompt);

    // 5. Save everything to MongoDB
    const newCandidate = new Candidate({
      userId: userId, 
      jobId: selectedJob._id,
      name: aiResult.name || "Unknown Candidate",
      email: aiResult.email || "No email found",
      githubUrl: aiResult.githubUrl || "",
      resumeText: resumeText,
      aiCvScore: aiResult.score,
      aiCvSummary: aiResult.summary,
      skills: aiResult.skillsFound || [] 
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