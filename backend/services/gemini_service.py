import google.generativeai as genai
from google.generativeai import types
from typing import Optional, Dict, List
from datetime import datetime
from config import config


class GeminiService:
    SYSTEM_PROMPT = """You are Nukeno, a smart AI assistant with web search.

CAPABILITIES:
1. Web Search - Search the internet for current info
2. Task Management - Create/delete/list tasks
3. Note Taking - Save notes
4. Conversation - Natural chat

WHEN TO SEARCH:
- If user asks about current events, weather, news → SEARCH
- If user asks for factual info you don't know → SEARCH
- Otherwise → use your knowledge

RESPOND NATURALLY:
- Short, conversational responses
- Be helpful and friendly
- Let user know if you searched for something"""

    def __init__(self):
        api_key = config.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        genai.configure(api_key=api_key)

        self._safety_settings = {
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
        }

        self._search_tools = self._build_search_tools()

        self.model = genai.GenerativeModel(
            config.GEMINI_MODEL,
            tools=self._search_tools or None,
            system_instruction=self.SYSTEM_PROMPT
        )

    def _build_search_tools(self) -> list:
        """Try to build Google Search grounding tool; fall back to no tools."""
        try:
            tool = types.Tool(
                google_search_retrieval=types.GoogleSearchRetrieval(
                    dynamic_retrieval_config=types.DynamicRetrievalConfig(
                        mode=types.DynamicRetrievalConfig.Mode.MODE_DYNAMIC,
                        dynamic_threshold=0.3,
                    )
                )
            )
            return [tool]
        except AttributeError:
            pass

        try:
            # Fallback for older type layouts
            tool = types.Tool(google_search_retrieval=types.GoogleSearchRetrieval())
            return [tool]
        except Exception:
            pass

        return []

    def _build_context_string(self, context: Optional[Dict]) -> str:
        if not context:
            return ""

        parts = []
        if tasks := context.get("tasks"):
            high = [t for t in tasks if t.get("priority") == "high" and not t.get("completed")]
            if high:
                parts.append(f"🔴 HIGH PRIORITY: {', '.join([t['title'] for t in high[:3]])}")

        if summary := context.get("summary"):
            total = summary.get("total_tasks", 0)
            if total > 0:
                parts.append(f"Tasks: {total} total ({summary.get('high_priority_count', 0)} high)")

        return "\n".join(parts) if parts else ""

    def generate_response(self, user_input: str, context: Optional[Dict] = None, history: str = "") -> str:
        context_str = self._build_context_string(context)

        parts = []
        if history:
            parts.append(f"Conversation:\n{history}")
        if context_str:
            parts.append(f"Current context:\n{context_str}")
        parts.append(f"User: {user_input}\nNukeno:")

        prompt = "\n\n".join(parts)

        try:
            response = self.model.generate_content(
                prompt,
                safety_settings=self._safety_settings,
                generation_config=genai.GenerationConfig(
                    temperature=0.85,
                    max_output_tokens=300,
                ),
            )

            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        return part.text.strip()

            if hasattr(response, 'text') and response.text:
                return response.text.strip()

            return "I'm here! Ask me anything."

        except Exception as e:
            print(f"Gemini error: {e}")
            return "I encountered an issue. Please try again!"

    def extract_tasks(self, user_input: str) -> List[Dict]:
        """Extract structured task data from natural language."""
        prompt = f"""Extract tasks from: "{user_input}"
Return JSON array like: [{{"title":"...", "priority":"high|medium|low", "deadline":"ISO or null"}}]
Return [] if no tasks. Only JSON, no explanation."""

        try:
            simple_model = genai.GenerativeModel(config.GEMINI_MODEL)
            response = simple_model.generate_content(prompt)
            text = response.text.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            return __import__('json').loads(text)
        except Exception as e:
            print(f"Task extraction error: {e}")
            return []


gemini_service = GeminiService()
