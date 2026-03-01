const express = require('express');
const Job = require('../models/Job');
const router = express.Router();

// 1. POST: Create a new Job Protocol
router.post('/', async (req, res) => {
  try {
    const { title, department, description, userId } = req.body;
    
    const newJob = new Job({
      userId,
      title,
      description,
    });

    await newJob.save();
    res.status(201).json(newJob);
  } catch (error) {
    console.error("Job Creation Error:", error);
    res.status(500).json({ error: "Failed to initialize role." });
  }
});

// 2. GET: Fetch all roles for a specific Recruiter
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

module.exports = router;