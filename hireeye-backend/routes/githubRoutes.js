const express = require('express');
const { Octokit } = require('@octokit/rest');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');

// ✨ Import your new Groq utility
const { generateJson } = require('../utils/groqClient');

const router = express.Router();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// POST route to evaluate a single GitHub project
router.post('/evaluate/:candidateId', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    const { candidateId } = req.params;

    if (!githubUrl) return res.status(400).json({ error: "GitHub URL is required" });

    // 1. Extract owner and repo from the URL
    const urlParts = githubUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];

    if (!owner || !repo) return res.status(400).json({ error: "Invalid GitHub URL format" });

    // 2. Fetch repository details via Octokit
    const repoData = await octokit.rest.repos.get({ owner, repo });
    const languagesData = await octokit.rest.repos.listLanguages({ owner, repo });

    let readmeText = "No README provided.";
    try {
      const readmeData = await octokit.rest.repos.getReadme({ owner, repo });
      readmeText = Buffer.from(readmeData.data.content, 'base64').toString('utf-8');
    } catch (e) {
      console.log("No README found for this repo.");
    }

    // 3. The Groq Prompts
    const systemPrompt = "You are a Senior Technical Lead reviewing a candidate's GitHub project. You must always respond in valid JSON format.";
    
    const userPrompt = `
      Project Details:
      - Name: ${repoData.data.name}
      - Description: ${repoData.data.description || 'None'}
      - Primary Languages/Stack: ${Object.keys(languagesData.data).join(', ')}
      
      README Content:
      ${readmeText.substring(0, 3000)}
      
      Analyze this project. Respond strictly in JSON format with the following keys:
      {
        "score": number (1 to 100 based on complexity, documentation, and apparent effort),
        "analysis": "A 2-3 sentence summary of your technical thoughts on this project",
        "isTutorialClone": boolean (true/false indicating if this looks like a basic, generic tutorial project)
      }
    `;

    // 4. Call Groq Utility
    const aiResult = await generateJson(systemPrompt, userPrompt);

    // 5. Update the Candidate in MongoDB
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        githubUrl: githubUrl,
        aiProjectScore: aiResult.score,
        aiProjectAnalysis: aiResult.analysis
      },
      { new: true }
    );

    res.status(200).json({
      message: "GitHub Project Evaluated Successfully",
      candidate: updatedCandidate,
      evaluation: aiResult
    });

  } catch (error) {
    console.error('Error evaluating GitHub:', error);
    res.status(500).json({ error: 'Failed to evaluate GitHub project' });
  }
});

// POST route to evaluate a candidate's entire GitHub Profile (Top 3 Projects)
router.post('/evaluate-profile/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate || !candidate.githubUrl) {
      return res.status(400).json({ error: "No GitHub URL found for this candidate." });
    }

    // Fetch the Job criteria linked to this candidate
    const targetJob = await Job.findById(candidate.jobId);
    const jobCriteria = targetJob
      ? `Role: ${targetJob.title}. Requirements: ${targetJob.description}`
      : "General Full-Stack Developer Role";

    const username = candidate.githubUrl.replace(/\/$/, '').split('/').pop();

    const reposData = await octokit.rest.repos.listForUser({
      username: username,
      per_page: 100,
      type: 'owner'
    });

    if (reposData.data.length === 0) {
      return res.status(404).json({ error: "No public repositories found." });
    }

    // 1. Fetch TOP 3 repositories (Filtered for original work)
    const topRepos = reposData.data
      .filter(repo => !repo.fork)
      .sort((a, b) => {
        if (b.stargazers_count === a.stargazers_count) {
          return new Date(b.pushed_at) - new Date(a.pushed_at);
        }
        return b.stargazers_count - a.stargazers_count;
      })
      .slice(0, 3);

    if (topRepos.length === 0) {
      return res.status(404).json({ error: "No original repositories found (only forks)." });
    }

    // 2. Build context for the AI
    let projectsContext = "";
    for (const repo of topRepos) {
      let readmeText = "No README provided.";
      try {
        const readmeData = await octokit.rest.repos.getReadme({ owner: username, repo: repo.name });
        readmeText = Buffer.from(readmeData.data.content, 'base64').toString('utf-8');
      } catch (e) {
        console.log(`No README found for ${repo.name}`);
      }

      projectsContext += `
      --- Project: ${repo.name} ---
      Description: ${repo.description || 'None'}
      Primary Language: ${repo.language || 'Unknown'}
      README Snippet: ${readmeText.substring(0, 1000)}
      `;
    }

    // 3. The "Principal Engineer" Groq Prompts
    const systemPrompt = `You are an elite, merciless Principal Software Engineer evaluating a candidate's GitHub portfolio. You do not give "participation trophies" for clean code if the tech stack is completely wrong for the job. You must evaluate strictly and always respond in valid JSON format.`;
        
    const userPrompt = `
      # TARGET JOB CRITERIA
      ${jobCriteria}
      
      # CANDIDATE REPOS (Top 3 Original)
      ${projectsContext}
      
      # 🛑 CRITICAL RELEVANCE GATE (Tech Stack Mismatch)
      If the core languages or frameworks required by the Target Job are completely missing from their GitHub projects (e.g., Job requires React/Node, but they only have Python/Jupyter scripts), YOU MUST FAIL THEM. 
      In the event of a total stack mismatch, their final score MUST NOT exceed 20/100, regardless of how good their unrelated code is.

      # 🛑 THE "TUTORIAL CLONE" PENALTY
      Look closely at the repo names and descriptions. If the projects are obvious beginner tutorials ("todo-app", "weather-app", "netflix-clone", "tic-tac-toe"), heavily penalize their System Complexity score. We are looking for Custom Engineering and real-world problem-solving.

      # STRICT SCORING RUBRIC (Total 100 points)
      - **Stack Alignment (40 pts)**: Do they write code in the languages we actually need? (Mismatch = 0 pts).
      - **System Complexity (30 pts)**: Are they building production-level logic, APIs, and databases, or just basic frontend scripts? (Tutorials = Max 5 pts).
      - **Engineering Rigor (30 pts)**: Code organization, clear READMEs, commits, and architecture quality.

      # OUTPUT SPECIFICATION
      Respond STRICTLY in JSON:
      {
        "score": number (0-100. Remember the Relevance Gate: < 20 for a wrong tech stack),
        "analysis": [
          "**Stack Alignment:** (Brutally honest assessment of whether their repo languages match the Job Description.)",
          "**System Complexity:** (Call out if these are tutorial clones or actual custom software.)",
          "**Engineering Rigor:** (Critique their architecture, documentation, and repo hygiene.)",
          "**Verdict:** (A final punchy summary. If they failed the stack match, state 'Not a technical fit for this stack' immediately.)"
        ]
      }
    `;

    // 4. Call Groq Utility
    const aiResult = await generateJson(systemPrompt, userPrompt);

    // 5. Save to DB
    candidate.aiProjectScore = aiResult.score;
    candidate.aiProjectAnalysis = aiResult.analysis;
    await candidate.save();

    res.status(200).json({ message: "GitHub Evaluated", candidate });
  } catch (error) {
    console.error('Error evaluating GitHub profile:', error);
    res.status(500).json({ error: 'Failed to evaluate GitHub profile' });
  }
});

module.exports = router;