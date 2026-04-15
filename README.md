# 🚀 Nukeno — Personal AI Operating System

<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-6366f1?style=for-the-badge" alt="AI Powered">
  <img src="https://img.shields.io/badge/Voice-Enabled-8b5cf6?style=for-the-badge" alt="Voice Enabled">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=for-the-badge" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-async-009688?style=for-the-badge" alt="FastAPI">
</p>

Nukeno is a proactive AI assistant that understands your life context (tasks, notes, schedule) and guides you with actionable intelligence.

> **Not just a chatbot. A decision engine.**

---

## 🎯 Features

- 🤖 **AI Chat** — Powered by Gemini 2.5 Flash with intelligent context awareness
- 🎤 **Voice Assistant** — Whisper-based STT with Gemini TTS
- 📓 **Notes Management** — Create and search notes
- ✅ **Task Management** — Priority-based task tracking
- 📊 **Daily Briefing** — Real-time overview of your priorities
- 🧠 **Context Engine** — Intelligent context merging and priority detection
- ⚡ **Proactive Suggestions** — Nukeno tells you what matters

---

## 🔥 What Makes Nukeno Different

Unlike traditional assistants:

- ❌ **Reactive** → waits for commands  
- ✅ **Nukeno** → proactively suggests actions  

---

## 🧠 Intelligence Engine

Nukeno uses a **5-step reasoning pipeline**:

1. **Intent Detection** — What does the user want?
2. **Context Aggregation** — Merge tasks, notes, deadlines
3. **Priority Detection** — What must be done NOW?
4. **Task Extraction** — Identify and save action items
5. **Action Generation** — One clear next step

---

## 🧠 System Prompt (Core Brain)

Nukeno is designed with a sophisticated system prompt that enables:

```text
You are Nukeno — a proactive personal AI operating system.

Your job is NOT to answer questions.
Your job is to analyze, prioritize, and guide.

---

INPUT:
User query + structured context

CONTEXT INCLUDES:
- tasks (with priority and deadlines)
- notes (relevant information)
- meetings
- deadlines

---

THINKING PIPELINE (internal, never mention):

1. INTENT DETECTION - What does the user want?
2. CONTEXT AGGREGATION - Merge relevant data
3. PRIORITY DETECTION - What must be done NOW?
4. TASK EXTRACTION - Identify action items
5. ACTION GENERATION - One clear next step

---

OUTPUT RULES (STRICT):
- MAX 3 LINES
- NO filler phrases
- NO generic responses
- ALWAYS actionable
- Be direct, confident, slightly authoritative
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone & Setup

```bash
cd nukeno
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:10000" > .env
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 10000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
nukeno/
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── config.py                  # Configuration management
│   ├── routes/                    # API endpoints
│   │   ├── chat.py               # Chat with context
│   │   ├── voice.py              # Voice processing
│   │   ├── tasks.py              # Task management
│   │   ├── notes.py              # Note management
│   │   └── summary.py            # Daily briefing
│   ├── services/                  # Business logic
│   │   ├── gemini_service.py     # AI responses
│   │   ├── whisper_service.py    # Speech-to-text
│   │   ├── tts_service.py        # Text-to-speech
│   │   └── context_service.py    # Context engine
│   ├── db/                       # Data layer
│   │   └── storage.py           # JSON storage
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ChatUI.jsx       # Main chat interface
│   │   │   ├── Sidebar.jsx      # Task & notes sidebar
│   │   │   ├── VoiceButton.jsx  # Voice recording
│   │   │   ├── MessageBubble.jsx # Message display
│   │   │   └── DailyBriefing.jsx # Daily overview
│   │   ├── services/
│   │   │   └── api.js           # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🌐 API Endpoints

### Chat
```bash
POST /chat
{
  "message": "What's my priority today?",
  "use_context": true
}
```

### Voice
```bash
POST /voice-chat
Content-Type: multipart/form-data
audio: <audio_file>
```

### Tasks
```bash
GET    /tasks          # List all tasks
POST   /tasks          # Create task
PUT    /tasks/{id}     # Update task
DELETE /tasks/{id}     # Delete task
```

### Notes
```bash
GET    /notes          # List all notes
POST   /notes          # Create note
DELETE /notes/{id}      # Delete note
```

### Summary
```bash
GET /daily-summary     # Get daily briefing
```

---

## 🎤 Voice Features

### How It Works

1. **Recording** — Click mic button to start recording
2. **Processing** — Audio sent to Whisper for transcription
3. **Understanding** — Transcript sent to Gemini with context
4. **Response** — Text + audio generated
5. **Playback** — Audio response plays automatically

### TTS Fallback

If Gemini TTS fails, the system automatically falls back to browser's SpeechSynthesis API.

---

## 🚀 Deploy on Render

### Backend Deployment

1. Create Render account at [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Add environment variable:
   - `GEMINI_API_KEY`: your_api_key

### Frontend Deployment

**Option 1: Render**
1. Create new Web Service
2. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l 3000`
3. Add environment variable:
   - `VITE_API_URL`: https://your-backend-service.onrender.com

**Option 2: Vercel**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Option 3: Netlify**
```bash
cd frontend
npm install -g netlify-cli
netlify deploy --prod
```

---

## ⚙️ Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:10000
```

---

## 🎯 Example Interactions

### What's on my plate today?
```
Nukeno: 🔴 Client meeting in 2 hours.
        Finish Rahul's proposal now.
        10 min prep before meeting.
```

### I'm overwhelmed
```
Nukeno: You're carrying too much.
        Pick ONE: finish the proposal.
        Everything else waits.
```

### Add a reminder
```
Nukeno: What time? Be specific.
        "I need to call mom at 3 PM" works.
```

---

## 🔧 Troubleshooting

### Common Issues

**Whisper model download**
- First run may take time to download the model
- Model cached for subsequent runs

**CORS errors**
- Ensure backend CORS origins include your frontend URL
- Check API_URL in frontend .env matches backend

**Voice not working**
- Check microphone permissions in browser
- Ensure HTTPS in production (required for mic access)

**API errors**
- Check GEMINI_API_KEY is valid
- Check API quota in Google AI Studio

---

## 📈 Production Quality Features

- ✅ **Async/await** — Non-blocking I/O throughout
- ✅ **Error handling** — Comprehensive try-catch with graceful fallbacks
- ✅ **Retry logic** — Automatic retries for failed requests
- ✅ **Type safety** — Pydantic models for request/response validation
- ✅ **Security** — CORS configured, no sensitive data in logs
- ✅ **Modular architecture** — Clean separation of concerns
- ✅ **Responsive UI** — Works on mobile and desktop
- ✅ **Accessibility** — Keyboard navigation, screen reader support
- ✅ **Performance** — Optimized re-renders, code splitting
- ✅ **Monitoring** — Health check endpoint

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (async Python web framework)
- Google Gemini API (chat + live audio)
- Faster-Whisper (speech-to-text)
- SQLite/JSON storage

**Frontend:**
- React 18
- Vite (build tool)
- Tailwind CSS
- Axios (HTTP client)

---

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

<div align="center">
  <p>
    <strong>Built with ❤️ using FastAPI, React, and Google Gemini</strong>
  </p>
  <p>
    Made for developers who value intelligence and efficiency
  </p>
</div>
