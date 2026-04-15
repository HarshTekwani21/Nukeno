from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from services.whisper_service import whisper_service
from services.gemini_service import gemini_service
from services.context_service import context_service
from services.tts_service import tts_service

router = APIRouter(prefix="/voice-chat", tags=["voice"])

@router.post("")
async def voice_chat(audio: UploadFile = File(...)):
    try:
        if not audio.content_type or not audio.content_type.startswith(('audio/', 'video/')):
            raise HTTPException(status_code=400, detail="Invalid audio format")
        
        audio_data = await audio.read()
        
        if len(audio_data) < 1000:
            return {
                "transcript": "",
                "response": "Audio too short. Try again.",
                "audio_data": None,
                "error": "Audio too short"
            }
        
        transcript = whisper_service.transcribe(audio_data)
        
        if not transcript or len(transcript.strip()) < 2:
            return {
                "transcript": "",
                "response": "I couldn't understand that. Could you repeat?",
                "audio_data": None,
                "error": "No speech detected"
            }
        
        try:
            context = context_service.get_full_context()
            response = gemini_service.generate_response(transcript, context)
        except Exception as e:
            print(f"Response generation error: {e}")
            response = "I'm having trouble generating a response. Please try again."
        
        if any(keyword in transcript.lower() for keyword in ["remind", "add task", "create task", "todo", "remember"]):
            try:
                context_service.extract_and_save_tasks(transcript)
            except Exception as e:
                print(f"Task extraction error: {e}")
        
        try:
            tts_result = await tts_service.generate_speech(response)
            audio_data_response = tts_result.get("audio_data")
            mime_type = tts_result.get("mime_type", "audio/pcm")
        except Exception as e:
            print(f"TTS error: {e}")
            audio_data_response = None
            mime_type = "audio/pcm"
        
        return {
            "transcript": transcript,
            "response": response,
            "audio_data": audio_data_response,
            "mime_type": mime_type,
            "source": tts_result.get("source", "unknown")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Voice chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")
