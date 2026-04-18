from typing import Dict, List, Optional, Any
from services.gemini_service import gemini_service
from services.context_service import context_service
from db.storage import storage

class AgentResponse:
    def __init__(self, response: str, action: str = None, data: Any = None):
        self.response = response
        self.action = action
        self.data = data or {}

class TaskAgent:
    """Agent responsible for task operations"""
    
    def __init__(self):
        self.storage = storage
    
    def process(self, user_input: str, user_id: str) -> AgentResponse:
        text = user_input.lower().strip()
        
        if self._is_listing(text):
            return self._list_tasks()
        
        if self._is_creating(text):
            return self._create_task(user_input, user_id)
        
        if self._is_deleting(text):
            return self._delete_task(user_input)
        
        if self._is_completing(text):
            return self._complete_task(user_input)
        
        return AgentResponse("I didn't catch that. Say 'add task [name]' to create, or 'show tasks' to list.")
    
    def _is_creating(self, text: str) -> bool:
        return any(kw in text for kw in ["add task", "create task", "new task", "add to", "task:", "todo:", "i need to", "i should", "remember to", "call ", "remind me", "remind to", "need ", "should "])
    
    def _is_deleting(self, text: str) -> bool:
        return any(kw in text for kw in ["delete task", "remove task", "clear task", "delete", "remove "])
    
    def _is_completing(self, text: str) -> bool:
        return any(kw in text for kw in ["complete task", "done task", "mark done", "finished"])
    
    def _is_listing(self, text: str) -> bool:
        return any(kw in text for kw in ["show tasks", "list tasks", "what tasks", "all tasks", "my tasks", "get tasks", "top priority", "priorities", "what's my", "how many"])
    
    def _extract_task_title(self, text: str) -> str:
        import re
        text_lower = text.lower()
        
        # Remove all common prefixes
        prefixes = ["add task to ", "add task:", "add a task to ", "add ", "create task to ", "create task: ", "new task: ", "call ", "remind me to ", "remind to ", "i need to ", "i should ", "remember to "]
        
        title = text_lower
        for prefix in prefixes:
            title = title.replace(prefix, "")
        
        # Remove time references like "7:00 PM", "at 7:00"
        title = re.sub(r'\s+(at|by|on|before)\s+\d{1,2}:\d{2}\s*(?:am|pm)?.*', '', title, flags=re.IGNORECASE)
        
        return title.strip()[:80] if title.strip() else "Untitled"
    
    def _extract_deadline(self, text: str) -> Optional[str]:
        import re
        patterns = [
            r"by\s+(\w+day)",
            r"by\s+(\d+/\d+)",
            r"at\s+(\d+:\d+\s*(?:am|pm)?)",
            r"on\s+(\w+day|\d+/\d+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_priority(self, text: str) -> str:
        priority = "medium"
        if any(w in text.lower() for w in ["urgent", "asap", "important", "high priority", "critical"]):
            priority = "high"
        elif any(w in text.lower() for w in ["low priority", "whenever", "someday"]):
            priority = "low"
        return priority
    
    def _create_task(self, text: str, user_id: str) -> AgentResponse:
        title = self._extract_task_title(text)
        deadline = self._extract_deadline(text)
        priority = self._extract_priority(text)
        
        if not title or len(title) < 2:
            return AgentResponse("What should I name the task? Try: add task [name]")
        
        try:
            task = self.storage.add_task({
                "title": title,
                "priority": priority,
                "deadline": deadline
            })
            location = f" due {deadline}" if deadline else ""
            status = f"🔴 HIGH" if priority == "high" else "🟡 MEDIUM"
            return AgentResponse(
                f"Task added: {title} ({status}){location}",
                action="task_created",
                data={"task": task}
            )
        except Exception as e:
            return AgentResponse(f"Oops! {str(e)}")
    
    def _delete_task(self, text: str) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            title = text.lower().replace("delete", "").replace("remove", "").strip()
            
            for task in tasks:
                if title in task.get("title", "").lower():
                    self.storage.delete_task(task["id"])
                    return AgentResponse(f"Done! Deleted '{task['title']}'", action="task_deleted")
            
            return AgentResponse("Which task? Try being more specific.")
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")
    
    def _complete_task(self, text: str) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            title = text.lower().replace("complete", "").replace("done", "").replace("mark done", "").strip()
            
            for task in tasks:
                if title in task.get("title", "").lower():
                    self.storage.update_task(task["id"], {"completed": True})
                    return AgentResponse(f"Marked complete: {task['title']}", action="task_completed")
            
            return AgentResponse("Which task?")
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")
    
    def _list_tasks(self) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            
            if not tasks:
                return AgentResponse("No tasks yet! Say 'add task [name]' to create one.")
            
            high = [t for t in tasks if t.get("priority") == "high" and not t.get("completed")]
            med = [t for t in tasks if t.get("priority") == "medium" and not t.get("completed")]
            low = [t for t in tasks if t.get("priority") == "low" and not t.get("completed")]
            
            lines = []
            if high:
                lines.append(f"🔴 HIGH ({len(high)}): " + ", ".join([t["title"][:30] for t in high]))
            if med:
                lines.append(f"🟡 MEDIUM ({len(med)}): " + ", ".join([t["title"][:30] for t in med]))
            if low:
                lines.append(f"🟢 LOW ({len(low)}): " + ", ".join([t["title"][:30] for t in low]))
            
            total = len(high) + len(med) + len(low)
            header = f"You have {total} task{total > 1 and 's' or ''}:"
            
            return AgentResponse(f"{header}\n" + "\n".join(lines), action="tasks_listed", data={"tasks": tasks})
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")


class NoteAgent:
    """Agent for note operations"""
    
    def __init__(self):
        self.storage = storage
    
    def process(self, user_input: str, user_id: str) -> AgentResponse:
        text = user_input.lower().strip()
        
        if self._is_listing(text):
            return self._list_notes()
        
        if self._is_creating(text):
            return self._create_note(user_input)
        
        return AgentResponse("Say 'add note [title]: [content]' or 'show notes'.")
    
    def _is_creating(self, text: str) -> bool:
        return any(kw in text for kw in ["add note", "create note", "new note", "note:", "remember", "save note"])
    
    def _is_listing(self, text: str) -> bool:
        return any(kw in text for kw in ["show notes", "list notes", "all notes", "my notes"])
    
    def _create_note(self, text: str) -> AgentResponse:
        import re
        title = "Untitled Note"
        content = text
        
        title_match = re.search(r"(?:note[:]|title[:])\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()[:100]
            content = text.split(title_match.group(1), 1)[1].strip()
        else:
            title_match = re.search(r"(?:remember|save)\s+(?:that\s+)?(.+?)$", text, re.IGNORECASE)
            if title_match:
                title = title_match.group(1).strip()[:100]
                content = text.replace(title_match.group(), "").strip()
        
        content = content or "No content"
        
        try:
            note = self.storage.add_note({"title": title, "content": content[:500]})
            return AgentResponse(f"Note saved: {title}", action="note_created", data={"note": note})
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")
    
    def _list_notes(self) -> AgentResponse:
        try:
            notes = self.storage.get_notes()
            if not notes:
                return AgentResponse("No notes yet!")
            
            lines = [f"• {n['title']}" for n in notes[:10]]
            return AgentResponse("Your notes:\n" + "\n".join(lines), action="notes_listed")
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")


class Orchestrator:
    """Routes requests to the right agent"""
    
    def __init__(self):
        self.task_agent = TaskAgent()
        self.note_agent = NoteAgent()
        self.chat_agent = gemini_service
    
    def process(self, user_input: str, user_id: str, context: Dict = None, history: str = "") -> Dict:
        text = user_input.lower().strip()
        
        if self._is_task_request(text):
            response = self.task_agent.process(user_input, user_id)
        elif self._is_note_request(text):
            response = self.note_agent.process(user_input, user_id)
        else:
            chat_response = self.chat_agent.generate_response(user_input, context, history)
            response = AgentResponse(chat_response, action="chat")
        
        return {
            "response": response.response,
            "action": response.action,
            "data": response.data,
            "agent": "task" if self._is_task_request(text) else "note" if self._is_note_request(text) else "chat"
        }
    
    def _is_task_request(self, text: str) -> bool:
        return any(kw in text for kw in ["add task", "create task", "delete task", "remove task", "complete task", "show tasks", "list tasks", "my tasks", "task:", "todo:", "call ", "remind me", "need to", "should ", "top priority"])
    
    def _is_note_request(self, text: str) -> bool:
        return any(kw in text for kw in ["add note", "create note", "delete note", "show notes", "list notes", "note:", "remember"])


orchestrator = Orchestrator()