# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nukeno is a proactive AI assistant with voice, task, and note management. The backend is a FastAPI service using Google Gemini for AI responses, and the frontend is a React/Vite/Tailwind SPA.

## Commands

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt

# Dev server (hot reload)
uvicorn main:app --reload --port 10000

# Production
uvicorn main:app --host 0.0.0.0 --port 10000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview production build
```

### Environment Variables
- Backend: `GEMINI_API_KEY` (from aistudio.google.com)
- Frontend: `VITE_API_URL` (default: `http://localhost:10000`)

Copy `.env.example` files in both `backend/` and `frontend/` to `.env`.

## Architecture

### Request Flow
```
React (ChatUI.jsx) → api.js (Axios with retry) → POST /chat
  → chat.py (route) → orchestrator.py
      ├── task keywords  → TaskAgent  → storage.py (data.json)
      ├── note keywords  → NoteAgent  → storage.py (data.json)
      └── default        → gemini_service.py (Gemini 2.0-flash-exp)
  → context_service.py injects task/note context into prompt
  → session_manager.py maintains in-memory conversation history (max 15 msgs)
```

### Key Services (`backend/services/`)
| File | Responsibility |
|------|---------------|
| `orchestrator.py` | Keyword-based intent detection → routes to TaskAgent, NoteAgent, or Gemini |
| `context_service.py` | Aggregates tasks/notes, calculates urgency scores, feeds context to Gemini |
| `gemini_service.py` | Gemini API calls; also handles web search tool integration |
| `session_manager.py` | In-memory session store (lost on restart) |
| `whisper_service.py` | Faster-Whisper speech-to-text (base model, downloads on first run) |
| `tts_service.py` | Gemini TTS with browser SpeechSynthesis fallback |

### Storage
- **All persistence:** single JSON file at `backend/db/data.json` via `storage.py`
- No ORM, no migrations — direct dict manipulation
- Sessions are **in-memory only** and lost on server restart

### Intent Detection (Orchestrator)
Pattern-matched keywords (not ML-based):
- **Task:** "add task", "create task", "delete task", "show tasks", "remind me", "need to", "priority"
- **Note:** "add note", "create note", "show notes", "remember", "save note"
- **Default:** natural conversation via Gemini

### Voice Flow
1. Browser records audio (WebM/WAV) → `POST /voice-chat` (multipart)
2. Whisper transcribes → text processed as normal chat
3. Gemini TTS generates audio response → falls back to browser `SpeechSynthesis`

## API Endpoints

```
POST   /chat               # Main chat (body: {message, session_id, user_id, use_context})
POST   /chat/clear         # Clear session history
POST   /voice-chat         # Voice input (multipart/form-data audio file)

GET    /tasks              # List tasks
POST   /tasks              # Create task
PUT    /tasks/{task_id}    # Update task
DELETE /tasks/{task_id}    # Delete task

GET    /notes              # List notes
POST   /notes              # Create note
DELETE /notes/{note_id}    # Delete note

GET    /daily-summary      # Urgent/high-priority task briefing
GET    /health             # Health check
```

## Frontend Structure (`frontend/src/`)
- `App.jsx` — top-level layout: `<Sidebar>` + `<ChatUI>`
- `components/ChatUI.jsx` — main chat interface, message list, sends to `api.js`
- `components/Sidebar.jsx` — task and notes panel
- `services/api.js` — Axios wrapper with 3-retry exponential backoff, session tracking

## Deployment (Render.com)
Configured via `render.yaml` at project root:
- **Backend:** Python runtime, `uvicorn main:app --host 0.0.0.0 --port 10000`, health check at `/health`
- **Frontend:** Static site (SPA), `VITE_API_URL` auto-set from backend URL, `_redirects` for client-side routing

## Gemini Models
- Chat: `gemini-2.0-flash-exp`
- Voice/TTS: `gemini-3.1-flash-live` (configured in `backend/config.py`)

Whisper uses the `base` model; it downloads automatically to a local cache on first run.
