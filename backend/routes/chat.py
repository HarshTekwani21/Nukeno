from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.gemini_service import gemini_service
from services.context_service import context_service
from services.session_manager import session_manager

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    use_context: bool = True

class ChatResponse(BaseModel):
    response: str
    tasks_extracted: List[dict] = []
    context_used: bool = False
    session_id: str = "default"

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        session_id = request.session_id or "default"
        
        await session_manager.add_message(session_id, "user", request.message)
        
        context = None
        tasks_extracted = []
        
        if request.use_context:
            try:
                context = context_service.get_full_context()
            except Exception as e:
                print(f"Context loading error: {e}")
        
        try:
            history = await session_manager.get_history(session_id)
            history_str = session_manager.format_history_for_prompt(history)
            response = gemini_service.generate_response(request.message, context, history_str)
        except Exception as e:
            print(f"Gemini error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
        
        await session_manager.add_message(session_id, "assistant", response)
        
        keywords = ["remind me", "add task", "create task", "remember to", "don't forget", "todo", "task:", "i need to", "i should"]
        if any(keyword in request.message.lower() for keyword in keywords):
            try:
                tasks_extracted = context_service.extract_and_save_tasks(request.message)
            except Exception as e:
                print(f"Task extraction error: {e}")
        
        return ChatResponse(
            response=response,
            tasks_extracted=tasks_extracted,
            context_used=context is not None,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
