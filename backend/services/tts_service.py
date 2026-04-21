import base64
from typing import Optional
from config import config


class TTSService:
    def __init__(self):
        self._gemini_available = True

    async def generate_speech(self, text: str, prefer_native: bool = False) -> dict:
        if prefer_native or not self._gemini_available:
            return self._browser_fallback(text)

        result = await self._gemini_tts(text)
        return result if result else self._browser_fallback(text)

    async def _gemini_tts(self, text: str) -> Optional[dict]:
        try:
            from google import genai as new_genai
            from google.genai import types as new_types

            client = new_genai.Client(api_key=config.GEMINI_API_KEY)

            response = client.models.generate_content(
                model=config.GEMINI_TTS_MODEL,
                contents=text,
                config=new_types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=new_types.SpeechConfig(
                        voice_config=new_types.VoiceConfig(
                            prebuilt_voice_config=new_types.PrebuiltVoiceConfig(
                                voice_name=config.GEMINI_TTS_VOICE
                            )
                        )
                    )
                )
            )

            if response.candidates:
                for candidate in response.candidates:
                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode()
                                return {
                                    "text": text,
                                    "audio_data": audio_b64,
                                    "mime_type": part.inline_data.mime_type or "audio/wav",
                                    "source": "gemini"
                                }

            self._gemini_available = False
            return None

        except Exception as e:
            print(f"Gemini TTS error: {e}")
            self._gemini_available = False
            return None

    def _browser_fallback(self, text: str) -> dict:
        return {
            "text": text,
            "audio_data": None,
            "mime_type": "text/plain",
            "source": "browser_speech_synthesis"
        }


tts_service = TTSService()
