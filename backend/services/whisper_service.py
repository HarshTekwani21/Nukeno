from faster_whisper import WhisperModel
from typing import BinaryIO, Optional
import tempfile
import os
from config import config

class WhisperService:
    def __init__(self):
        self.model = None
        self.model_size = config.WHISPER_MODEL
        self._load_attempted = False

    def _get_model(self):
        if self.model is not None:
            return self.model
        
        if self._load_attempted:
            return None
        
        self._load_attempted = True
        
        try:
            self.model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8"
            )
            print(f"Whisper model '{self.model_size}' loaded successfully")
            return self.model
        except Exception as e:
            print(f"Failed to load Whisper model: {e}")
            return None

    def transcribe(self, audio_data, language: str = "en") -> Optional[str]:
        model = self._get_model()
        
        if model is None:
            return None
        
        tmp_path = None
        try:
            if hasattr(audio_data, 'read'):
                audio_bytes = audio_data.read()
            else:
                audio_bytes = audio_data
            
            if len(audio_bytes) < 1000:
                return None
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            segments, info = model.transcribe(
                tmp_path,
                language=language,
                task="transcribe",
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())
            
            result = " ".join(text_parts).strip()
            
            if not result:
                return None
            
            return result
            
        except Exception as e:
            print(f"Transcription error: {e}")
            return None
            
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass

whisper_service = WhisperService()
