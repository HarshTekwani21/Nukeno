import json
import os
from typing import Dict, List, Optional
from datetime import datetime
from config import config
import asyncio
from pathlib import Path

class Storage:
    def __init__(self):
        self.db_path = Path(config.DB_PATH)
        self._lock = asyncio.Lock()
        self._ensure_db()

    def _ensure_db(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            self._save({"tasks": [], "notes": []})

    def _load(self) -> Dict:
        try:
            if self.db_path.exists():
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Storage load error: {e}")
        return {"tasks": [], "notes": []}

    def _save(self, data: Dict):
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Storage save error: {e}")

    def get_tasks(self, include_completed: bool = True) -> List[Dict]:
        data = self._load()
        tasks = data.get("tasks", [])
        
        if not include_completed:
            tasks = [t for t in tasks if not t.get("completed")]
        
        return tasks

    def get_task_by_id(self, task_id: str) -> Optional[Dict]:
        tasks = self.get_tasks()
        return next((t for t in tasks if t.get("id") == task_id), None)

    def add_task(self, task: Dict) -> Dict:
        data = self._load()
        
        task["id"] = str(datetime.now().timestamp())
        task["created_at"] = datetime.now().isoformat()
        task["updated_at"] = task["created_at"]
        
        if "priority" not in task:
            task["priority"] = "medium"
        
        if "completed" not in task:
            task["completed"] = False
        
        data["tasks"].append(task)
        self._save(data)
        
        return task

    def update_task(self, task_id: str, updates: Dict) -> Optional[Dict]:
        data = self._load()
        
        for i, task in enumerate(data["tasks"]):
            if task.get("id") == task_id:
                data["tasks"][i].update(updates)
                data["tasks"][i]["updated_at"] = datetime.now().isoformat()
                self._save(data)
                return data["tasks"][i]
        
        return None

    def delete_task(self, task_id: str) -> bool:
        data = self._load()
        original_len = len(data["tasks"])
        data["tasks"] = [t for t in data["tasks"] if t.get("id") != task_id]
        
        if len(data["tasks"]) < original_len:
            self._save(data)
            return True
        
        return False

    def complete_task(self, task_id: str) -> Optional[Dict]:
        return self.update_task(task_id, {"completed": True, "completed_at": datetime.now().isoformat()})

    def get_notes(self, limit: Optional[int] = None) -> List[Dict]:
        data = self._load()
        notes = data.get("notes", [])
        
        if limit:
            notes = notes[-limit:]
        
        return notes

    def get_note_by_id(self, note_id: str) -> Optional[Dict]:
        notes = self.get_notes()
        return next((n for n in notes if n.get("id") == note_id), None)

    def add_note(self, note: Dict) -> Dict:
        data = self._load()
        
        note["id"] = str(datetime.now().timestamp())
        note["created_at"] = datetime.now().isoformat()
        note["updated_at"] = note["created_at"]
        
        data["notes"].append(note)
        self._save(data)
        
        return note

    def update_note(self, note_id: str, updates: Dict) -> Optional[Dict]:
        data = self._load()
        
        for i, note in enumerate(data["notes"]):
            if note.get("id") == note_id:
                data["notes"][i].update(updates)
                data["notes"][i]["updated_at"] = datetime.now().isoformat()
                self._save(data)
                return data["notes"][i]
        
        return None

    def delete_note(self, note_id: str) -> bool:
        data = self._load()
        original_len = len(data["notes"])
        data["notes"] = [n for n in data["notes"] if n.get("id") != note_id]
        
        if len(data["notes"]) < original_len:
            self._save(data)
            return True
        
        return False

    def search_notes(self, query: str) -> List[Dict]:
        notes = self.get_notes()
        query_lower = query.lower()
        
        results = []
        for note in notes:
            if (query_lower in note.get("title", "").lower() or 
                query_lower in note.get("content", "").lower()):
                results.append(note)
        
        return results

    def get_stats(self) -> Dict:
        data = self._load()
        tasks = data.get("tasks", [])
        notes = data.get("notes", [])
        
        completed = len([t for t in tasks if t.get("completed")])
        high_priority = len([t for t in tasks if t.get("priority") == "high" and not t.get("completed")])
        
        return {
            "total_tasks": len(tasks),
            "completed_tasks": completed,
            "pending_tasks": len(tasks) - completed,
            "high_priority_tasks": high_priority,
            "total_notes": len(notes)
        }

storage = Storage()
