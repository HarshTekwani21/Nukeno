from datetime import datetime
from typing import Dict, List, Optional
import asyncio

class SessionManager:
    """
    Multi-user session manager.
    
    Features:
    - Per-user conversation history
    - Automatic cleanup of old sessions
    - Session metadata (created, last activity, message count)
    """
    
    def __init__(self):
        self._sessions: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
        self.max_history = 15
        self.session_timeout = 7200
    
    async def get_or_create_session(self, session_id: str, user_id: str = None) -> Dict:
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "user_id": user_id or session_id,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "last_activity": datetime.now().isoformat(),
                "message_count": 0
            }
        
        self._sessions[session_id]["last_activity"] = datetime.now().isoformat()
        return self._sessions[session_id]
    
    async def get_history(self, session_id: str) -> List[Dict]:
        async with self._lock:
            session = self._sessions.get(session_id, {})
            return session.get("messages", [])
    
    async def add_message(self, session_id: str, role: str, content: str):
        async with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "user_id": session_id,
                    "messages": [],
                    "created_at": datetime.now().isoformat(),
                    "last_activity": datetime.now().isoformat(),
                    "message_count": 0
                }
            
            self._sessions[session_id]["messages"].append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            self._sessions[session_id]["message_count"] += 1
            self._sessions[session_id]["last_activity"] = datetime.now().isoformat()
            
            if len(self._sessions[session_id]["messages"]) > self.max_history:
                self._sessions[session_id]["messages"] = self._sessions[session_id]["messages"][-self.max_history:]
    
    async def clear_session(self, session_id: str):
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
    
    async def get_all_sessions(self) -> List[str]:
        async with self._lock:
            return list(self._sessions.keys())
    
    def format_history_for_prompt(self, history: List[Dict]) -> str:
        if not history:
            return ""
        
        formatted = []
        for msg in history[-self.max_history:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            formatted.append(f"{role.upper()}: {content}")
        
        return "\n".join(formatted)
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        session = self._sessions.get(session_id, {})
        if session:
            return {
                "message_count": session.get("message_count", 0),
                "created_at": session.get("created_at"),
                "last_activity": session.get("last_activity")
            }
        return None

session_manager = SessionManager()