import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = "gemini-2.0-flash-exp"
    GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"
    
    WHISPER_MODEL = "base"
    
    DB_PATH = "nukeno/backend/db/data.json"
    
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nukeno.onrender.com",
    ]

config = Config()
