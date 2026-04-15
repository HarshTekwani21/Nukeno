from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.gemini_service import gemini_service
from services.context_service import context_service

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    use_context: bool = True

class ChatResponse(BaseModel):
    response: str
    tasks_extracted: List[dict] = []
    context_used: bool = False

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        context = None
        tasks_extracted = []
        
        if request.use_context:
            try:
                context = context_service.get_full_context()
            except Exception as e:
                print(f"Context loading error: {e}")
        
        try:
            response = gemini_service.generate_response(request.message, context)
        except Exception as e:
            print(f"Gemini error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
        
        if any(keyword in request.message.lower() for keyword in ["remind me", "add task", "create task", "remember to", "don't forget", "todo"]):
            try:
                tasks_extracted = context_service.extract_and_save_tasks(request.message)
            except Exception as e:
                print(f"Task extraction error: {e}")
        
        return ChatResponse(
            response=response,
            tasks_extracted=tasks_extracted,
            context_used=context is not None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
