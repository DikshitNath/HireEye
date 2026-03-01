require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cvRoutes = require('./routes/cvRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const githubRoutes = require('./routes/githubRoutes');
const jobRoutes = require('./routes/jobRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to accept JSON data

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'HireEye API is running!' });
});


app.use('/api/cv', cvRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/jobs', jobRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});