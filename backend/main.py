from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from config import config
from routes import chat, voice, tasks, notes, summary
from routes import notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.dirname(config.DB_PATH), exist_ok=True)
    print(f"Nukeno API v2 starting — Whisper: {config.WHISPER_DEVICE} ({config.WHISPER_COMPUTE_TYPE})")
    yield

app = FastAPI(
    title="Nukeno API",
    description="AI Assistant System",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(summary.router)
app.include_router(notifications.router)

@app.get("/")
async def root():
    return {"name": "Nukeno", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "whisper_device": config.WHISPER_DEVICE,
        "whisper_compute_type": config.WHISPER_COMPUTE_TYPE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
