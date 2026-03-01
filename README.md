![HireEye](https://ik.imagekit.io/myBlogApp/svgviewer-output%20(2).svg)

> **AI-Powered Recruitment Platform** | Revolutionizing Technical Hiring with Intelligent Screening & Live Interviews

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk_Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)

---

## 📋 Overview

**HireEye** is a cutting-edge recruitment platform that leverages artificial intelligence to streamline the hiring process. From intelligent CV screening to real-time technical interviews powered by Google's Gemini AI, HireEye automates and enhances every stage of candidate evaluation.

### 🌟 Key Highlights

- ⚡ **AI-Powered CV Analysis** - Extract and score candidate profiles instantly
- 🎤 **Live AI Interviews** - Real-time technical interviews with audio transcription
- 🐙 **GitHub Integration** - Analyze candidate projects and portfolio
- 📊 **Intelligent Scoring** - Multi-stage evaluation with detailed feedback
- 🔐 **Secure Authentication** - User management with Clerk
- 🌓 **Beautiful UI** - Modern, responsive interface with dark mode
- 🚀 **Real-time Processing** - WebSocket-based live communication with AI

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

#### **Backend** (`hireeye-backend`)
- **Server**: Express.js 5
- **Database**: MongoDB with Mongoose
- **AI**: Google GenAI SDK
- **File Processing**: Multer, PDF-Parse
- **GitHub Integration**: Octokit REST API
- **Email**: Nodemailer
- **Environment**: Dotenv, CORS

#### **AI Engine** (`hireeye-python`)
- **Framework**: FastAPI
- **AI Model**: Google Gemini 2.5 Flash
- **Real-time**: WebSocket Communication
- **Audio Processing**: Base64 Audio Encoding
- **Language**: Python 3.10+

---

## 🎬 How It Works

### **Phase 1: CV Screening**
1. Admin/Recruiter uploads job description
2. Candidate uploads resume (PDF)
3. AI extracts candidate data (name, email, GitHub, skills)
4. Resume scored against job requirements
5. Candidate profile created with score & feedback

### **Phase 2: GitHub Analysis**
1. System fetches candidate's GitHub portfolio
2. AI analyzes project complexity and relevance
3. Project quality score generated
4. Detailed feedback on technical capabilities

### **Phase 3: AI Interview**
1. Qualified candidates enter live interview
2. Google Gemini conducts technical interview via WebSocket
3. Real-time audio transcription and response generation
4. Interview scored on technical knowledge & communication
5. Feedback provided to recruiter

### **Phase 4: Decision**
1. All scores aggregated
2. Candidate status updated (Applied → Shortlisted → Interviewing → Hired/Rejected)
3. Dashboard shows comprehensive candidate profile

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ & npm
- **Python** 3.10+
- **MongoDB** (local or Atlas)
- **Google Gemini API Key** ([Get here](https://ai.google.dev/))
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
GEMINI_API_KEY=your_gemini_api_key
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
pip install fastapi uvicorn google-genai-sdk python-multipart python-dotenv

# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key
EOF

# Start AI engine
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

### **CV Routes** (`/api/cv`)
```
POST /api/cv/upload
  - Upload resume and trigger AI analysis
  - Body: { userId, jobId, resume (file) }
  - Returns: Candidate profile with CV score
```

### **Candidate Routes** (`/api/candidates`)
```
GET /api/candidates
  - Fetch all candidates for user
  
GET /api/candidates/:id
  - Get single candidate details
  
PATCH /api/candidates/:id
  - Update candidate status/interview scores
```

### **Job Routes** (`/api/jobs`)
```
POST /api/jobs
  - Create new job posting
  
GET /api/jobs
  - Fetch all jobs for user
  
DELETE /api/jobs/:id
  - Delete job posting
```

### **GitHub Routes** (`/api/github`)
```
POST /api/github/analyze
  - Analyze GitHub profile
  - Body: { githubUrl }
  - Returns: Project analysis & score
```

### **WebSocket** (Python)
```
WS /ws/interview
  - Real-time AI interview
  - Supports audio and text input
  - Streams AI responses in real-time
```

---

## 🎨 Features

### ✨ Smart CV Analysis
- Automatic text extraction from PDFs
- Named entity recognition (NER) for contact info
- Skill matching against job requirements
- Similarity scoring using AI embeddings

### 🤖 Live AI Interviews
- Real-time WebSocket communication
- Audio input from candidate microphone
- Gemini 2.5 Flash for natural conversation
- Interview transcripts saved for review

### 📊 Candidate Dashboard
- View all applicants
- Filter by job position
- Track hiring pipeline status
- Export candidate reports

### 🌐 GitHub Integration
- Fetch public repository data
- Analyze code quality metrics
- Evaluate project complexity
- Identify relevant tech stack

### 🔐 Security
- User isolation via userId
- Secure file uploads
- Environment-based secrets
- CORS protection

---

## 📝 Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGO_URI=mongodb+srv://...
GEMINI_API_KEY=...
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
GEMINI_API_KEY=...
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

- [Google Gemini AI](https://ai.google.dev/) - AI interview engine
- [MongoDB](https://www.mongodb.com/) - Data persistence
- [Clerk](https://clerk.com/) - Authentication
- [React & Vite](https://vitejs.dev/) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python API framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📞 Support & Contact

For issues, questions, or feedback:
- 📧 Email: dikshitnath36@gmail.com

---

**Made with ❤️ by Dikshit Nath**

*HireEye - Where AI meets Recruitment.*
