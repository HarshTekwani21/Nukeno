from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.orchestrator import orchestrator
from services.session_manager import session_manager

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    use_context: bool = True

class ChatResponse(BaseModel):
    response: str
    action: Optional[str] = None
    data: dict = {}
    agent: str = "chat"
    session_id: str = "default"

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        session_id = request.session_id or f"user_{request.user_id or 'default'}"
        
        await session_manager.get_or_create_session(session_id, request.user_id)
        await session_manager.add_message(session_id, "user", request.message)
        
        context = None
        if request.use_context:
            try:
                from services.context_service import context_service
                context = context_service.get_full_context()
            except Exception as e:
                print(f"Context error: {e}")
        
        try:
            history = await session_manager.get_history(session_id)
            history_str = session_manager.format_history_for_prompt(history)
            
            result = orchestrator.process(
                user_input=request.message,
                user_id=request.user_id or session_id,
                context=context,
                history=history_str
            )
            
            response = result["response"]
        except Exception as e:
            print(f"Orchestrator error: {e}")
            response = "Oops! Something went wrong. Let's try again!"
        
        await session_manager.add_message(session_id, "assistant", response)
        
        return ChatResponse(
            response=response,
            action=result.get("action"),
            data=result.get("data", {}),
            agent=result.get("agent", "chat"),
            session_id=session_id
        )
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/clear")
async def clear_chat(session_id: str = "default"):
    try:
        await session_manager.clear_session(session_id)
        return {"success": True, "message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))