from typing import Dict, List, Optional, Any
from services.gemini_service import gemini_service
from services.context_service import context_service
from db.storage import storage
import re

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
        intent = self._detect_intent(user_input)
        
        if intent == "create":
            return self._create_task(user_input, user_id)
        elif intent == "delete":
            return self._delete_task(user_input, user_id)
        elif intent == "list":
            return self._list_tasks(user_input)
        elif intent == "complete":
            return self._complete_task(user_input, user_id)
        else:
            return AgentResponse("I couldn't understand that task request. Try saying 'add task' or 'delete task'.")
    
    def _detect_intent(self, text: str) -> str:
        text_lower = text.lower()
        create_keywords = ["create", "add", "new", "make", "todo", "task:"]
        delete_keywords = ["delete", "remove", "clear", "done", "complete"]
        list_keywords = ["list", "show", "what", "all", "get", "tasks"]
        
        for kw in delete_keywords:
            if f"delete {kw}" in text_lower or f"remove {kw}" in text_lower:
                return "delete"
        for kw in create_keywords:
            if f"add {kw}" in text_lower or f"create {kw}" in text_lower:
                return "create"
        if any(kw in text_lower for kw in delete_keywords):
            return "delete"
        if any(kw in text_lower for kw in list_keywords):
            return "list"
        if any(kw in text_lower for kw in create_keywords):
            return "create"
        return "unknown"
    
    def _extract_task_info(self, text: str) -> Dict:
        priority = "medium"
        if any(w in text.lower() for w in ["urgent", "asap", "important", "high priority"]):
            priority = "high"
        elif any(w in text.lower() for w in ["low priority", "whenever"]):
            priority = "low"
        
        deadline = None
        deadline_patterns = [
            (r"by\s+(\w+day)", "day"),
            (r"by\s+(\d+/\d+)", "date"),
            (r"at\s+(\d+:\d+)", "time"),
        ]
        
        title = text
        for pattern, _ in deadline_patterns:
            match = re.search(pattern, text.lower())
            if match:
                deadline = match.group(1)
                title = re.sub(pattern, "", title)
        
        title = re.sub(r"(add task|create task|todo|remember to|i need to|i should)", "", title, flags=re.I).strip()
        title = title[:100] if title else "Untitled task"
        
        return {"title": title, "priority": priority, "deadline": deadline}
    
    def _create_task(self, text: str, user_id: str) -> AgentResponse:
        task_info = self._extract_task_info(text)
        try:
            task = self.storage.add_task(task_info)
            return AgentResponse(
                f"Added: {task['title']}",
                action="task_created",
                data={"task": task}
            )
        except Exception as e:
            return AgentResponse(f"Failed to add task: {str(e)}")
    
    def _delete_task(self, text: str, user_id: str) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            keyword = text.lower().replace("delete", "").replace("remove", "").strip()
            for task in tasks:
                if keyword in task.get("title", "").lower():
                    self.storage.delete_task(task["id"])
                    return AgentResponse(f"Deleted: {task['title']}", action="task_deleted", data={"task": task})
            return AgentResponse("Couldn't find that task. Try being more specific.")
        except Exception as e:
            return AgentResponse(f"Failed to delete: {str(e)}")
    
    def _list_tasks(self, text: str) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            if not tasks:
                return AgentResponse("No tasks yet!")
            
            high = [t for t in tasks if t.get("priority") == "high"]
            medium = [t for t in tasks if t.get("priority") == "medium"]
            low = [t for t in tasks if t.get("priority") == "low"]
            
            response = []
            if high:
                response.append(f"🔴 High ({len(high)}): " + ", ".join([t["title"][:30] for t in high[:3]]))
            if medium:
                response.append(f"🟡 Medium ({len(medium)}): " + ", ".join([t["title"][:30] for t in medium[:3]]))
            if low:
                response.append(f"🟢 Low ({len(low)}): " + ", ".join([t["title"][:30] for t in low[:3]]))
            
            return AgentResponse("\n".join(response), action="tasks_listed", data={"tasks": tasks})
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")
    
    def _complete_task(self, text: str, user_id: str) -> AgentResponse:
        try:
            tasks = self.storage.get_tasks()
            keyword = text.lower().replace("complete", "").replace("done", "").strip()
            for task in tasks:
                if keyword in task.get("title", "").lower():
                    self.storage.update_task(task["id"], {"completed": True})
                    return AgentResponse(f"Done: {task['title']}", action="task_completed", data={"task": task})
            return AgentResponse("Couldn't find that task.")
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")


class NoteAgent:
    """Agent responsible for note operations"""
    
    def __init__(self):
        self.storage = storage
    
    def process(self, user_input: str, user_id: str) -> AgentResponse:
        intent = self._detect_intent(user_input)
        
        if intent == "create":
            return self._create_note(user_input, user_id)
        elif intent == "delete":
            return self._delete_note(user_input, user_id)
        elif intent == "list":
            return self._list_notes(user_input)
        else:
            return AgentResponse("I couldn't understand that note request.")
    
    def _detect_intent(self, text: str) -> str:
        text_lower = text.lower()
        if any(w in text_lower for w in ["delete note", "remove note"]):
            return "delete"
        if any(w in text_lower for w in ["add note", "create note", "new note", "write note"]):
            return "create"
        if any(w in text_lower for w in ["list notes", "show notes", "all notes"]):
            return "list"
        if any(w in text_lower for w in ["note", "remember"]):
            return "create"
        return "unknown"
    
    def _create_note(self, text: str, user_id: str) -> AgentResponse:
        title = "Untitled Note"
        content = text
        
        title_match = re.search(r"note[:]\s*(.+?)(?:\n|$)", text, re.I)
        if title_match:
            title = title_match.group(1).strip()[:100]
            content = text.split(title_match.group(1), 1)[1].strip()
        else:
            title_match = re.search(r"(?:remember|note that|save)(?:ing)?\s*(.+?)(?:\n|$)", text, re.I)
            if title_match:
                title = title_match.group(1).strip()[:100]
                content = text.split(title_match.group(1), 1)[1].strip()
        
        content = content[:500] if content else "No content"
        
        try:
            note = self.storage.add_note({"title": title, "content": content})
            return AgentResponse(f"Saved note: {title}", action="note_created", data={"note": note})
        except Exception as e:
            return AgentResponse(f"Failed: {str(e)}")
    
    def _delete_note(self, text: str, user_id: str) -> AgentResponse:
        try:
            notes = self.storage.get_notes()
            keyword = text.lower().replace("delete note", "").replace("remove note", "").strip()
            for note in notes:
                if keyword in note.get("title", "").lower():
                    self.storage.delete_note(note["id"])
                    return AgentResponse(f"Deleted: {note['title']}", action="note_deleted", data={"note": note})
            return AgentResponse("Couldn't find that note.")
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")
    
    def _list_notes(self, text: str) -> AgentResponse:
        try:
            notes = self.storage.get_notes()
            if not notes:
                return AgentResponse("No notes yet!")
            
            response = "Your notes:\n" + "\n".join([f"• {n['title']}" for n in notes[:10]])
            return AgentResponse(response, action="notes_listed", data={"notes": notes})
        except Exception as e:
            return AgentResponse(f"Error: {str(e)}")


class Orchestrator:
    """
    Multi-agent orchestrator that routes user requests to the appropriate agent.
    
    Flow:
    1. Analyze user input
    2. Route to Task Agent, Note Agent, or Chat Agent
    3. Execute action and return response
    """
    
    def __init__(self):
        self.task_agent = TaskAgent()
        self.note_agent = NoteAgent()
        self.chat_agent = gemini_service
    
    def process(self, user_input: str, user_id: str, context: Dict = None, history: str = "") -> Dict:
        intent = self._analyze_intent(user_input)
        
        if intent == "task":
            response = self.task_agent.process(user_input, user_id)
        elif intent == "note":
            response = self.note_agent.process(user_input, user_id)
        else:
            chat_response = self.chat_agent.generate_response(user_input, context, history)
            response = AgentResponse(chat_response, action="chat")
        
        return {
            "response": response.response,
            "action": response.action,
            "data": response.data,
            "agent": "task" if intent == "task" else "note" if intent == "note" else "chat"
        }
    
    def _analyze_intent(self, text: str) -> str:
        text_lower = text.lower()
        
        task_keywords = ["task", "todo", "add", "delete", "remove", "complete", "done", "remind"]
        note_keywords = ["note", "remember", "save", "write"]
        
        task_score = sum(1 for kw in task_keywords if kw in text_lower)
        note_score = sum(1 for kw in note_keywords if kw in text_lower)
        
        if task_score > note_score:
            return "task"
        elif note_score > task_score:
            return "note"
        return "chat"


orchestrator = Orchestrator()