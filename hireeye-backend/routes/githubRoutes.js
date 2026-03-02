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
    const systemPrompt = "You are an elite Principal Software Engineer. Evaluate a candidate's GitHub portfolio specifically against the following Job Description. You must always respond in valid JSON format.";
    
    const userPrompt = `
      # TARGET JOB CRITERIA
      ${jobCriteria}
      
      # CANDIDATE REPOS (Top 3 Original)
      ${projectsContext}
      
      # MISSION
      Analyze if their actual code projects demonstrate the skills required for the TARGET JOB. 
      - If the Job requires React/Node and they only have Python scripts, the score MUST reflect this mismatch.
      - Differentiate between "Tutorial Clones" and "Custom Engineering".
      
      # OUTPUT SPECIFICATION
      Respond STRICTLY in JSON:
      {
        "score": number (1-100),
        "analysis": [
          "**Stack Alignment:** (Does their GitHub stack match the Job Description?)",
          "**System Complexity:** (Are they building production-level logic or basic scripts?)",
          "**Engineering Rigor:** (Code organization, documentation, and architecture quality.)",
          "**Verdict:** (A final punchy summary on why they are or aren't a technical fit for THIS specific role.)"
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