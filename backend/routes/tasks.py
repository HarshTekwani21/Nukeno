from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from db.storage import storage

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"
    deadline: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    completed: Optional[bool] = None

@router.get("")
async def get_tasks():
    try:
        tasks = storage.get_tasks()
        return {"tasks": tasks, "count": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_task(task: TaskCreate):
    try:
        task_data = task.dict()
        saved = storage.add_task(task_data)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}")
async def update_task(task_id: str, updates: TaskUpdate):
    try:
        updated = storage.update_task(task_id, updates.dict(exclude_none=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    try:
        deleted = storage.delete_task(task_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
