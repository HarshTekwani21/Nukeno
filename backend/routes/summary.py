from fastapi import APIRouter, HTTPException
from services.context_service import context_service

router = APIRouter(prefix="/daily-summary", tags=["summary"])

@router.get("")
async def get_daily_summary():
    try:
        context = context_service.get_full_context()
        summary = context.get("summary", {})
        
        return {
            "date": context.get("date", ""),
            "summary": summary,
            "urgent_tasks": summary.get("overdue_tasks", []) + summary.get("upcoming_tasks", []),
            "high_priority": [t for t in context.get("tasks", []) if t.get("priority") == "high"][:5],
            "recent_notes": context.get("notes", [])[-3:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
