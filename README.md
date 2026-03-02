![HireEye](https://ik.imagekit.io/myBlogApp/hireeye-logo.svg)

> **AI-Powered Recruitment Platform** | Revolutionizing Technical Hiring with Intelligent Screening & Live Interviews

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F55733?style=for-the-badge&logo=groq&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk_Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)

---

## 📋 Overview

**HireEye** is a cutting-edge recruitment platform that leverages artificial intelligence to streamline the hiring process. From intelligent CV screening powered by Groq's ultra-fast AI to real-time technical interviews with adaptive difficulty levels, HireEye automates and enhances every stage of candidate evaluation.

### 🌟 Key Highlights

- ⚡ **AI-Powered CV Analysis** - Extract and score candidate profiles instantly with Groq API
- 🎤 **Live AI Interviews** - Real-time technical interviews with adaptive difficulty and audio transcription
- 🐙 **GitHub Integration** - Analyze candidate projects with auto-evaluation and manual input
- 📊 **Intelligent Scoring** - Multi-stage evaluation with detailed feedback
- 💼 **Job Management** - Create and manage multiple job positions with AI context
- 🔐 **Secure Authentication** - User management with Clerk and data isolation
- 🌓 **Beautiful UI** - Modern, responsive interface with dark/light mode toggle
- 🚀 **Real-time Processing** - WebSocket-based live communication with adaptive AI

---

## ✨ What's New (Latest Updates)

### Recent Enhancements
- **Groq AI Integration** - Upgraded to Groq's ultra-fast API for instant JSON responses and interview generation
- **Job Management System** - Create and manage multiple job positions with detailed descriptions
- **Adaptive Interview Engine** - Multi-level difficulty progression (Easy → Medium → Hard) with strike tracking
- **Dark/Light Mode** - System-wide theme toggle for comfortable recruiter dashboard usage
- **GitHub Auto-Evaluation** - Automatically evaluate candidate GitHub profiles when detected
- **Manual GitHub Input** - Allow recruiters to manually add GitHub URLs for analysis
- **Job-Linked Candidates** - Associate candidates with specific job positions for contextual evaluation
- **Interview Link Verification** - Secure interview sessions with completion status validation
- **Multi-Tenant Support** - Complete user isolation with Clerk-based userId separation

---

## 📁 Project Architecture

HireEye is built as a **full-stack monorepo** with three distinct services:

```
HireEye/
├── hireeye-backend/        # Express.js REST API
├── hireeye-frontend/       # React + Vite SPA
└── hireeye-python/         # FastAPI AI Engine
```

### 🏗️ Technology Stack

#### **Frontend** (`hireeye-frontend`)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Auth**: Clerk
- **State Management**: React Hooks
- **File Upload**: React Dropzone
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Theme**: Dark/Light mode with system toggle

#### **Backend** (`hireeye-backend`)
- **Server**: Express.js 5
- **Database**: MongoDB with Mongoose
- **AI API**: Groq API (replacing Gemini for faster JSON responses)
- **File Processing**: Multer, PDF-Parse
- **GitHub Integration**: Octokit REST API
- **Email**: Nodemailer
- **Job Management**: Multi-tenant job routing system
- **Environment**: Dotenv, CORS

#### **AI Engine** (`hireeye-python`)
- **Framework**: FastAPI with WebSocket support
- **AI Model**: Groq API for fast, efficient responses
- **Real-time**: WebSocket Communication
- **Adaptive Interview Logic**: Multi-level difficulty progression
- **Architecture**: Async FastAPI for high-performance streaming
- **Language**: Python 3.10+

---

## 🎬 How It Works

### **Phase 1: Job Setup**
1. Recruiter creates a new job position with title and detailed description
2. AI uses job context for intelligent CV screening and interview questions
3. Job becomes available for resume uploads and candidate applications

### **Phase 2: CV Screening**
1. Recruiter selects the target job position
2. Candidate uploads resume (PDF)
3. AI extracts candidate data using Groq API (name, email, GitHub, skills)
4. Resume scored against job requirements with detailed feedback
5. Candidate profile created with CV score & analysis

### **Phase 3: GitHub Analysis**
1. System automatically detects and evaluates candidate's GitHub profile
2. AI analyzes project complexity and relevance to job requirements
3. Project quality score generated with specific feedback
4. **Optional**: Recruiters can manually add GitHub URLs for analysis

### **Phase 4: AI Interview**
1. Qualified candidates enter live interview session
2. FastAPI WebSocket connects to Groq-powered interview engine
3. AI conducts adaptive technical interview with difficulty progression
4. Real-time audio transcription and response generation
5. Interview scored on technical knowledge & communication
6. Feedback provided to recruiter with full transcript

### **Phase 5: Decision**
1. All scores aggregated (CV, GitHub, Interview)
2. Candidate status updated (Applied → Shortlisted → Interviewing → Hired/Rejected)
3. Dashboard shows comprehensive candidate profile with job-specific context
4. Dark/Light mode for comfortable recruiter dashboard browsing

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ & npm
- **Python** 3.10+
- **MongoDB** (local or Atlas)
- **Groq API Key** ([Get here](https://console.groq.com/keys)) 
- **Clerk Account** ([Create here](https://clerk.com))
- **GitHub Token** (optional, for GitHub integration)

### 1️⃣ Backend Setup

```bash
cd hireeye-backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGO_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/hireeye
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
EOF

# Start development server
npm run dev
# Server runs on http://localhost:5000
```

### 2️⃣ Python AI Engine Setup

```bash
cd hireeye-python

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn groq python-multipart python-dotenv httpx

# Create .env file
cat > .env << EOF
GROQ_API_KEY=your_groq_api_key
EOF

# Start AI engine with WebSocket support
python -m uvicorn main:app --reload --port 8000
# Server runs on http://localhost:8000
```

### 3️⃣ Frontend Setup

```bash
cd hireeye-frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
EOF

# Start development server
npm run dev
# App runs on http://localhost:5173
```

---

## 📡 API Endpoints

### **Job Routes** (`/api/jobs`)
```
POST /api/jobs
  - Create new job posting
  - Body: { userId, title, description }
  - Returns: Job object with ID
  
GET /api/jobs?userId={userId}
  - Fetch all jobs for authenticated user
  - Returns: Array of job postings
```

### **CV Routes** (`/api/cv`)
```
POST /api/cv/upload
  - Upload resume and trigger AI analysis using Groq API
  - Body: { userId, jobId, resume (file) }
  - Returns: Candidate profile with detailed CV evaluation
```

### **Candidate Routes** (`/api/candidates`)
```
GET /api/candidates?userId={userId}
  - Fetch all candidates for user with job context
  
GET /api/candidates/:id
  - Get single candidate details including job association
  
PATCH /api/candidates/:id
  - Update candidate status and interview scores
```

### **GitHub Routes** (`/api/github`)
```
POST /api/github/analyze
  - Analyze GitHub profile against job requirements
  - Body: { githubUrl, candidateId, jobId }
  - Returns: Project analysis & score
```

### **WebSocket** (Python) - FastAPI
```
WS /ws/interview-v2/{candidate_id}
  - Real-time AI interview with adaptive difficulty
  - Supports audio and text streaming
  - Groq-powered conversational AI
  - Returns: Interview transcript, scores, and feedback
```

---

## 🎨 Features

### ✨ Smart CV Analysis
- Automatic text extraction from PDFs
- Named entity recognition (NER) for contact info
- Skill matching against job requirements
- AI-powered evaluation using Groq API with JSON parsing
- Resume scoring with technical depth analysis

### 🤖 Live AI Interviews
- Real-time WebSocket communication via FastAPI
- Audio input from candidate microphone with echo cancellation
- Groq AI for natural, adaptive conversation
- Multi-level difficulty progression (Easy → Medium → Hard)
- Adaptive questioning system with strike tracking
- Interview transcripts saved for review
- Real-time speech synthesis for AI responses

### 📊 Candidate Dashboard
- View all applicants with detailed profiles
- **Filter candidates by job position**
- Track hiring pipeline status (Applied → Shortlisted → Interviewing → Hired/Rejected)
- **Auto-evaluate GitHub profiles**
- **Manual GitHub URL input** 
- Export candidate reports
- User isolation with Clerk authentication

### 🌐 Job Management System 
- Create and manage multiple job postings
- Associate candidates with specific job positions
- Add detailed job descriptions for AI context
- Job-specific CV screening and interview evaluation
- Multi-tenant support with userId isolation

### 🌓 Dark/Light Mode Theme
- System-wide dark and light mode toggle
- Persistent theme preference
- Studio-quality design with professional color palettes
- Smooth transitions and consistent styling

### 🔐 Security & Access Control
- User isolation via userId (Clerk integration)
- Secure file uploads with multer
- Interview link verification
- Completion status validation
- Environment-based secrets
- CORS protection

---

## 📝 Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGO_URI=mongodb+srv://...
GROQ_API_KEY=...
GITHUB_TOKEN=...
MAIL_USER=...
MAIL_PASS=...
```

### Frontend (`.env`)
```
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_API_BASE_URL=http://localhost:5000
VITE_AI_ENGINE_URL=http://localhost:8000
```

### Python (`.env`)
```
GROQ_API_KEY=...
```

---

## 📦 Project Structure

```
hireeye-backend/
├── index.js                 # Express app & server initialization
├── package.json
├── .env                     # Environment variables
├── models/
│   ├── Candidate.js        # Candidate schema
│   └── Job.js              # Job posting schema
└── routes/
    ├── cvRoutes.js         # CV upload & analysis
    ├── candidateRoutes.js  # Candidate CRUD
    ├── jobRoutes.js        # Job management
    └── githubRoutes.js     # GitHub integration

hireeye-frontend/
├── src/
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   ├── components/
│   │   ├── Home.jsx       # Landing page
│   │   ├── Dashboard.jsx  # Admin dashboard
│   │   ├── CVUploader.jsx # Resume upload
│   │   └── Interview.jsx  # Interview interface
│   ├── App.css
│   └── index.css
├── vite.config.js
├── package.json
└── .env

hireeye-python/
├── main.py               # FastAPI app & WebSocket
├── .env
└── __pycache__/
```

---

## 🎯 Usage Workflow

### For Recruiters

1. **Create Job Position**
   - Add title, description, requirements

2. **Review Candidates**
   - View uploaded resumes
   - Check AI scores (CV, GitHub, Interview)
   - Filter by status

3. **Conduct Interview**
   - Invite candidate to live AI interview
   - Monitor real-time conversation
   - Review transcript after completion

4. **Make Decision**
   - Aggregate all scores
   - Update candidate status
   - Generate hire/reject decision

### For Candidates

1. **Apply for Position**
   - Upload resume/CV
   - System extracts info automatically

2. **Await Screening**
   - Receive CV analysis feedback
   - GitHub projects analyzed

3. **Technical Interview**
   - Join live AI interview session
   - Answer technical questions
   - Get real-time feedback

4. **Track Status**
   - View application progress
   - Check interview results

---

## 🧪 Testing

### Test CV Upload
```bash
curl -X POST http://localhost:5000/api/cv/upload \
  -F "resume=@sample.pdf" \
  -F "userId=user123" \
  -F "jobId=job456"
```

### Test API Health
```bash
curl http://localhost:5000/api/health
```

### Test Frontend
```bash
npm run dev  # in hireeye-frontend/
# Visit http://localhost:5173
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙌 Acknowledgments

- [Groq API](https://groq.com/) - Ultra-fast AI inference engine
- [MongoDB](https://www.mongodb.com/) - Data persistence
- [Clerk](https://clerk.com/) - Authentication
- [React & Vite](https://vitejs.dev/) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python API framework with WebSocket support
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icon library

---

## 📞 Support & Contact

For issues, questions, or feedback:
- 📧 Email: dikshitnath36@gmail.com

---

**Made with ❤️ by Dikshit Nath**

*HireEye - Where AI meets Recruitment.*
