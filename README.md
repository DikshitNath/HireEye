![HireEye](https://ik.imagekit.io/myBlogApp/hireeye-logo.svg)

> **AI-Powered Recruitment Platform** | Revolutionizing Technical Hiring with Intelligent Screening & Live Interview


![React](https://img.shields.io/badge/React-19-20232A?style=flat\&logo=react)
![Node](https://img.shields.io/badge/Node.js-18+-43853D?style=flat\&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-4EA94B?style=flat\&logo=mongodb)
![FastAPI](https://img.shields.io/badge/FastAPI-AI%20Engine-009688?style=flat\&logo=fastapi)
![Groq](https://img.shields.io/badge/Groq-AI-F55733?style=flat)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat)

</p>

---

# 🚀 Overview

**HireEye** is an **AI-powered recruitment platform** that automates the entire hiring workflow.

Instead of manual resume screening and static interviews, HireEye uses **AI-driven evaluation** to analyze:

• Candidate resumes
• GitHub repositories
• Technical interview performance
• Interview integrity using webcam monitoring

The platform acts as an **autonomous technical recruiter** capable of evaluating candidates at scale.

---

# ✨ Features

### 🧠 AI Resume Screening

Automatically extract and evaluate candidate data using **Groq AI inference**.

* Resume parsing
* Skill extraction
* Job relevance scoring
* Candidate profile generation

---

### 🐙 GitHub Project Evaluation

HireEye automatically analyzes candidate repositories.

Evaluation includes:

* project complexity
* code originality
* technology stack relevance
* tutorial clone detection

---

### 🎤 AI Technical Interviews

HireEye conducts **real-time technical interviews** powered by AI.

Capabilities:

* adaptive difficulty progression
* conversational responses
* transcript generation
* recruiter feedback reports

---

### 👁 Vision-Based Interview Proctoring

To maintain interview integrity:

* webcam monitoring
* cheating detection
* suspicious behavior tracking

---

### 📊 Intelligent Candidate Scoring

HireEye aggregates multiple signals:

| Evaluation Stage | Score Source       |
| ---------------- | ------------------ |
| CV Analysis      | Resume evaluation  |
| GitHub Score     | Project complexity |
| Interview Score  | AI interview       |
| Integrity Score  | Proctoring results |

Recruiters receive a **final candidate recommendation**.

---

# 🏗 Architecture

HireEye uses a **multi-service architecture**.

```
                 React Frontend
                (Recruiter Dashboard)
                        │
                        │ REST API
                        ▼
                Express Backend
         CV Parsing • GitHub Analysis
         Candidate & Job Management
                        │
                        │ WebSockets
                        ▼
                 FastAPI AI Engine
          AI Interview + Voice Processing
          Vision-based Proctoring
                        │
                        ▼
                     Groq AI
            LLM + Speech + Vision Models
```

---

# ⚙️ Technology Stack

## Frontend

* React 19
* Vite
* Tailwind CSS
* Framer Motion
* React Router v7
* Clerk Authentication

---

## Backend

* Express.js
* MongoDB
* Mongoose
* Multer
* PDF-Parse
* Octokit (GitHub API)
* Nodemailer

---

## AI Engine

* FastAPI
* WebSockets
* Groq API
* Whisper Speech-to-Text
* Vision AI for proctoring

---

# 📁 Project Structure

```
HireEye
│
├── hireeye-frontend
│   ├── components
│   ├── pages
│   └── hooks
│
├── hireeye-backend
│   ├── models
│   ├── routes
│   └── index.js
│
└── hireeye-python
    ├── ai
    ├── websocket
    └── main.py
```

---

# 🚀 Quick Start

### Requirements

* Node.js **18+**
* Python **3.10+**
* MongoDB
* Groq API Key
* Clerk Account

---

## Backend

```
cd hireeye-backend
npm install
npm run dev
```

Create `.env`

```
PORT=5000
MONGO_URI=mongodb_uri
GROQ_API_KEY=your_key
GITHUB_TOKEN=github_token
MAIL_USER=email
MAIL_PASS=password
```

---

## AI Engine

```
cd hireeye-python

python -m venv venv
source venv/Scripts/activate

pip install fastapi uvicorn groq python-dotenv httpx
python -m uvicorn main:app --reload --port 8000
```

---

## Frontend

```
cd hireeye-frontend
npm install
npm run dev
```

App runs on:

```
http://localhost:5173
```

---

# 🔐 Security

HireEye enforces strict access control.

### Recruiter Access

Authenticated via **Clerk**.

---

### Candidate Interview Access

Candidates receive **secure one-time interview links**.

```
GET /:id
POST /:id/interview
```

Once completed:

* interview locked
* database record sealed
* retries disabled

---

# 📊 Performance

HireEye is optimized for **low-latency AI evaluation**.

| Feature                | Avg Latency |
| ---------------------- | ----------- |
| Resume analysis        | < 2 seconds |
| GitHub evaluation      | < 3 seconds |
| AI response generation | ~300 ms     |
| Interview streaming    | Real-time   |

---

# 🧪 Testing

Test CV upload

```
curl -X POST http://localhost:5000/api/cv/upload
```

Test API health

```
curl http://localhost:5000/api/health
```

---

# 🤝 Contributing

Contributions welcome.

```
git fork
git checkout -b feature/new-feature
git commit -m "Add feature"
git push
```

Open a Pull Request.

---

# 📄 License

ISC License.

---

# 👨‍💻 Author

**Dikshit Nath**

📧 [dikshitnath36@gmail.com](mailto:dikshitnath36@gmail.com)

---

⭐ If you like this project, consider **starring the repository**.

---

<p align="center">
HireEye — Where AI Meets Recruitment
</p>
