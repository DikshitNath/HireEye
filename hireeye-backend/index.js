require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ✨ 1. Import Clerk Middleware
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const cvRoutes = require('./routes/cvRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const githubRoutes = require('./routes/githubRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 🔓 PUBLIC ROUTES (No Auth Required)
// ==========================================

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'HireEye API is running!' });
});

// Resumes are uploaded by candidates without accounts
app.use('/api/cv', cvRoutes);

// ✨ 2. THE SECURITY BYPASS FOR INTERVIEWS
// We create a custom wrapper for candidate routes. 
// It allows public POST requests to `/api/candidates/:id/interview`
// but strictly blocks everything else (like fetching lists or deleting).
const requireAuth = ClerkExpressRequireAuth();
const secureCandidateRoutes = (req, res, next) => {
  if (req.method === 'POST' && req.path.match(/^\/[a-zA-Z0-9]+\/interview\/?$/)) {
    return next(); // Let candidates submit their interview
  }
  if (req.method === 'GET' && req.path.match(/^\/[a-fA-F0-9]{24}\/?$/)) {
    return next();
  }
  
  return requireAuth(req, res, next); // Block everything else
};

app.use('/api/candidates', secureCandidateRoutes, candidateRoutes);


// ==========================================
// 🔒 PROTECTED ROUTES (Requires Recruiter Login)
// ==========================================

app.use('/api/github', requireAuth, githubRoutes);
app.use('/api/jobs', requireAuth, jobRoutes);

// ✨ 3. CLEAN ERROR HANDLER
// If someone tries to hack your dashboard without a token, send a JSON error
app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing Clerk token.' });
  }
  next(err); // Pass other errors down the chain
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});