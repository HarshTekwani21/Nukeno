from datetime import datetime
from typing import Dict, List, Optional
import asyncio

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, List[Dict]] = {}
        self._lock = asyncio.Lock()
        self.max_history = 10
        self.session_timeout = 3600

    async def get_history(self, session_id: str) -> List[Dict]:
        async with self._lock:
            return self._sessions.get(session_id, [])

    async def add_message(self, session_id: str, role: str, content: str):
        async with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = []
            
            self._sessions[session_id].append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            if len(self._sessions[session_id]) > self.max_history * 2:
                self._sessions[session_id] = self._sessions[session_id][-self.max_history * 2:]

    async def clear_session(self, session_id: str):
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]

    def format_history_for_prompt(self, history: List[Dict]) -> str:
        if not history:
            return ""
        
        formatted = []
        for msg in history[-self.max_history:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            formatted.append(f"{role.upper()}: {content}")
        
        return "\n".join(formatted)

session_manager = SessionManager()
