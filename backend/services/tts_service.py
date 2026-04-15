import base64
from typing import Optional
from config import config

class TTSService:
    def __init__(self):
        self.use_gemini_live = True

    async def generate_speech(self, text: str, prefer_native: bool = False) -> dict:
        if prefer_native:
            return await self._browser_native_tts(text)
        
        if not self.use_gemini_live:
            return await self._browser_native_tts(text)
        
        gemini_result = await self._gemini_tts(text)
        if gemini_result:
            return gemini_result
        
        return await self._browser_native_tts(text)

    async def _gemini_tts(self, text: str) -> Optional[dict]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=config.GEMINI_API_KEY)
            
            model = genai.GenerativeModel(config.GEMINI_LIVE_MODEL)
            
            response = model.generate_content(
                [{"text": text}],
                generation_config={
                    "response_modalities": ["audio"]
                }
            )
            
            if hasattr(response, 'candidates'):
                for candidate in response.candidates:
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                audio_data = base64.b64encode(part.inline_data.data).decode()
                                return {
                                    "text": text,
                                    "audio_data": audio_data,
                                    "mime_type": part.inline_data.mime_type,
                                    "source": "gemini"
                                }
            
            self.use_gemini_live = False
            return None
            
        except Exception as e:
            print(f"Gemini TTS error: {e}")
            self.use_gemini_live = False
            return None

    async def _browser_native_tts(self, text: str) -> dict:
        return {
            "text": text,
            "audio_data": None,
            "mime_type": "text/plain",
            "source": "browser_speech_synthesis"
        }

    def get_audio_config(self) -> dict:
        return {
            "voice": "en-US-Neural2-F",
            "rate": 1.1,
            "pitch": 1.0,
            "volume": 1.0
        }

tts_service = TTSService()
