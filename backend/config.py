import os
from dotenv import load_dotenv

load_dotenv()

def _cuda_available():
    try:
        import ctranslate2
        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = "gemini-2.5-flash-lite"
    GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts"
    GEMINI_TTS_VOICE = "Aoede"

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
