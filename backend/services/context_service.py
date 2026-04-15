from typing import Dict, List, Optional
from datetime import datetime, timedelta
import re
from db.storage import storage

class ContextService:
    def __init__(self):
        self.storage = storage

    def get_full_context(self) -> Dict:
        tasks = self.storage.get_tasks()
        notes = self.storage.get_notes()
        
        analyzed_tasks = self._analyze_tasks(tasks)
        summary = self._generate_intelligent_summary(analyzed_tasks, notes)
        
        return {
            "tasks": analyzed_tasks,
            "notes": notes,
            "summary": summary,
            "context_hash": self._generate_context_hash(analyzed_tasks, notes)
        }

    def _analyze_tasks(self, tasks: List[Dict]) -> List[Dict]:
        now = datetime.now()
        today = now.date()
        
        analyzed = []
        for task in tasks:
            task = task.copy()
            
            if task.get("deadline"):
                try:
                    deadline = datetime.fromisoformat(task["deadline"])
                    days_until = (deadline.date() - today).days
                    
                    if days_until < 0:
                        task["status"] = "overdue"
                        task["urgency_score"] = 100 + abs(days_until) * 10
                    elif days_until == 0:
                        task["status"] = "today"
                        task["urgency_score"] = 90
                    elif days_until == 1:
                        task["status"] = "tomorrow"
                        task["urgency_score"] = 70
                    elif days_until <= 7:
                        task["status"] = "this_week"
                        task["urgency_score"] = 50
                    else:
                        task["status"] = "upcoming"
                        task["urgency_score"] = 30
                        
                except (ValueError, TypeError):
                    task["status"] = "no_deadline"
                    task["urgency_score"] = 20
            else:
                task["status"] = "no_deadline"
                task["urgency_score"] = 20
            
            priority_boost = {"high": 30, "medium": 15, "low": 0}
            task["urgency_score"] = task.get("urgency_score", 50) + priority_boost.get(task.get("priority", "medium"), 15)
            
            analyzed.append(task)
        
        return sorted(analyzed, key=lambda x: x.get("urgency_score", 0), reverse=True)

    def _generate_intelligent_summary(self, tasks: List[Dict], notes: List[Dict]) -> Dict:
        now = datetime.now()
        
        overdue = [t for t in tasks if t.get("status") == "overdue"]
        today = [t for t in tasks if t.get("status") == "today"]
        high_priority = [t for t in tasks if t.get("priority") == "high"]
        
        all_deadlines = []
        for task in tasks:
            if task.get("deadline"):
                try:
                    deadline = datetime.fromisoformat(task["deadline"])
                    all_deadlines.append({
                        "title": task.get("title"),
                        "deadline": deadline,
                        "days_until": (deadline.date() - now.date()).days
                    })
                except:
                    pass
        
        upcoming_deadlines = sorted(all_deadlines, key=lambda x: x["deadlines_until"] if "deadlines_until" in x else x.get("days_until", 999))[:5]
        
        return {
            "total_tasks": len(tasks),
            "high_priority_count": len(high_priority),
            "overdue_count": len(overdue),
            "due_today_count": len(today),
            "overdue_tasks": overdue[:3],
            "today_tasks": today[:3],
            "high_priority_tasks": high_priority[:5],
            "upcoming_deadlines": upcoming_deadlines,
            "notes_count": len(notes),
            "context_age": now.isoformat(),
            "attention_required": len(overdue) > 0 or len(today) > 0
        }

    def _generate_context_hash(self, tasks: List[Dict], notes: List[Dict]) -> str:
        return hash((len(tasks), len(notes), datetime.now().strftime("%Y%m%d%H")))

    def extract_and_save_tasks(self, user_input: str) -> List[Dict]:
        from services.gemini_service import gemini_service
        
        extracted = gemini_service.extract_tasks(user_input)
        saved_tasks = []
        
        for task_data in extracted:
            if isinstance(task_data, dict) and task_data.get("title"):
                saved = self.storage.add_task(task_data)
                saved_tasks.append(saved)
        
        return saved_tasks

    def merge_contexts(self, *contexts: Dict) -> Dict:
        merged = {
            "tasks": [],
            "notes": [],
            "summary": {}
        }
        
        task_ids = set()
        note_ids = set()
        
        for ctx in contexts:
            if not ctx:
                continue
            
            for task in ctx.get("tasks", []):
                if task.get("id") and task["id"] not in task_ids:
                    merged["tasks"].append(task)
                    task_ids.add(task["id"])
            
            for note in ctx.get("notes", []):
                if note.get("id") and note["id"] not in note_ids:
                    merged["notes"].append(note)
                    note_ids.add(note["id"])
        
        merged["tasks"] = self._analyze_tasks(merged["tasks"])
        merged["summary"] = self._generate_intelligent_summary(merged["tasks"], merged["notes"])
        
        return merged

context_service = ContextService()
