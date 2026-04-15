from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from db.storage import storage

router = APIRouter(prefix="/notes", tags=["notes"])

class NoteCreate(BaseModel):
    title: str
    content: str

@router.get("")
async def get_notes():
    try:
        notes = storage.get_notes()
        return {"notes": notes, "count": len(notes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_note(note: NoteCreate):
    try:
        note_data = note.dict()
        saved = storage.add_note(note_data)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{note_id}")
async def delete_note(note_id: str):
    try:
        deleted = storage.delete_note(note_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
