import os
from dotenv import load_dotenv

load_dotenv()

def _cuda_available():
    try:
        import ctranslate2
        return "cuda" in ctranslate2.get_supported_compute_types("cuda")
    except Exception:
        return False

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = "gemini-2.0-flash-exp"
    GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"

    WHISPER_MODEL = "base"
    WHISPER_DEVICE = "cuda" if _cuda_available() else "cpu"
    WHISPER_COMPUTE_TYPE = "float16" if WHISPER_DEVICE == "cuda" else "int8"

    DB_PATH = "nukeno/backend/db/data.json"

    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nukeno.onrender.com",
    ]

config = Config()
