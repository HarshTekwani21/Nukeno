from google import genai
from google.genai import types
from typing import Optional, Dict, List
from config import config


class GeminiService:
    SYSTEM_PROMPT = """You are Nukeno, a smart AI personal assistant with real-time web search.

Use Google Search automatically when asked about:
- Current news, top stories, breaking events
- Weather, prices, scores, or recent facts
- Any information that may have changed recently

For tasks and notes: help create, list, and manage them.
Keep responses concise and conversational. Never use placeholder text."""

    def __init__(self):
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required")
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)

    def _config_with_search(self):
        return types.GenerateContentConfig(
            system_instruction=self.SYSTEM_PROMPT,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            max_output_tokens=1000,
        )

    def _config_plain(self):
        return types.GenerateContentConfig(
            system_instruction=self.SYSTEM_PROMPT,
            temperature=0.85,
            max_output_tokens=1000,
        )

    def generate_response(self, user_input: str, context: Optional[Dict] = None, history: str = "") -> str:
        parts = []
        if history:
            parts.append(f"Conversation:\n{history}")
        ctx = self._build_context_string(context)
        if ctx:
            parts.append(f"Current context:\n{ctx}")
        parts.append(f"User: {user_input}")
        prompt = "\n\n".join(parts)

        try:
            response = self.client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
                config=self._config_with_search(),
            )
            text = self._extract_text(response)
            if text:
                return text
        except Exception as e:
            print(f"Gemini search error: {e}")

        try:
            response = self.client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
                config=self._config_plain(),
            )
            return self._extract_text(response) or "I'm here! Ask me anything."
        except Exception as e:
            print(f"Gemini error: {e}")
            return "I encountered an issue. Please try again!"

    def _extract_text(self, response) -> str:
        try:
            if response.text:
                return response.text.strip()
        except Exception:
            pass
        try:
            for candidate in (response.candidates or []):
                for part in (candidate.content.parts or []):
                    if hasattr(part, 'text') and part.text:
                        return part.text.strip()
        except Exception:
            pass
        return ""

    def _build_context_string(self, context: Optional[Dict]) -> str:
        if not context:
            return ""
        parts = []
        if tasks := context.get("tasks"):
            high = [t for t in tasks if t.get("priority") == "high" and not t.get("completed")]
            if high:
                parts.append(f"HIGH PRIORITY: {', '.join(t['title'] for t in high[:3])}")
        if summary := context.get("summary"):
            total = summary.get("total_tasks", 0)
            if total > 0:
                parts.append(f"Tasks: {total} total ({summary.get('high_priority_count', 0)} high priority)")
        return "\n".join(parts) if parts else ""

    def extract_tasks(self, user_input: str) -> List[Dict]:
        prompt = (
            f'Extract tasks from: "{user_input}"\n'
            'Return JSON array: [{"title":"...","priority":"high|medium|low","deadline":"ISO or null"}]\n'
            'Return [] if no tasks. Only JSON, no explanation.'
        )
        try:
            response = self.client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
            )
            text = (self._extract_text(response) or "").replace("```json", "").replace("```", "").strip()
            return __import__('json').loads(text)
        except Exception as e:
            print(f"Task extraction error: {e}")
            return []


gemini_service = GeminiService()
