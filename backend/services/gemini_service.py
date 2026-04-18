import os
import json
import google.generativeai as genai
from google.generativeai import types
from typing import Optional, Dict, List
from datetime import datetime, timedelta
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
        
        self.model = genai.GenerativeModel(
            config.GEMINI_MODEL,
            tools=[genai.prototypes.SearchToolbank.get_tool('search')]
        )
        self._safety_settings = {
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
        }

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
        
        parts = [self.SYSTEM_PROMPT]
        if history:
            parts.append(f"\nConversation:\n{history}")
        if context_str:
            parts.append(f"\nCurrent context:\n{context_str}")
        parts.append(f"\nUser: {user_input}\nNukeno:")
        
        full_prompt = "\n\n".join(parts)
        
        try:
            response = self.model.generate_content(
                full_prompt,
                tools=[genai.prototypes.SearchToolbank.get_tool('search')],
                safety_settings=self._safety_settings,
                generation_config={
                    "temperature": 0.85,
                    "max_output_tokens": 250,
                }
            )
            
            # Check if model wanted to search
            if response.candidates and hasattr(response.candidates[0], 'content'):
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') or hasattr(part, 'text'):
                            if hasattr(part, 'text') and part.text:
                                return part.text.strip()
            
            # Fallback to text response
            if hasattr(response, 'text') and response.text:
                return response.text.strip()
            
            return "I'm thinking... Ask me something else!"
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return f"I encountered an issue. Let's try again!"

gemini_service = GeminiService()