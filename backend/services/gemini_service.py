import os
import json
import google.generativeai as genai
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from config import config

class GeminiService:
    SYSTEM_PROMPT = """You are Nukeno, a smart AI assistant having a natural conversation.

PERSONALITY:
- Be friendly, helpful, and conversational
- Like talking to a smart friend who gets things done
- Keep responses natural and engaging
- Show you remember what was said before

HOW TO RESPOND:
1. If greeting → respond warmly, ask how you can help
2. If asking a question → answer directly and helpfully
3. If mentioning tasks → acknowledge and offer to help manage them
4. If expressing emotions → respond with empathy
5. If unclear → ask a clarifying question

RULES:
- Keep responses conversational (1-3 sentences usually)
- Don't be robotic or repetitive
- Don't start every response the same way
- If something was just discussed, reference it naturally
- Be direct but friendly

GOOD responses:
- "Hey! Good to chat. What's on your mind?"
- "That deadline sounds tight. Want me to add it to your tasks?"
- "Totally understand feeling overwhelmed. What's stressing you most?"

BAD responses (avoid these):
- "Based on your context, I can see that..."
- "I have analyzed your situation and determined..."
- Never repeat the same structure twice in a row"""

    def __init__(self):
        api_key = config.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required. Get one at https://aistudio.google.com/app/apikey")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)
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
            high_priority = [t for t in tasks if t.get("priority") == "high" and not t.get("completed")]
            if high_priority:
                parts.append(f"You have {len(high_priority)} high-priority task(s):")
                for t in high_priority[:3]:
                    parts.append(f"  • {t.get('title', '')}")
        
        if summary := context.get("summary"):
            if summary.get('overdue_count', 0) > 0:
                parts.append(f"\n⚠️ {summary.get('overdue_count', 0)} task(s) are overdue!")
        
        return "\n".join(parts) if parts else ""

    def generate_response(self, user_input: str, context: Optional[Dict] = None, history: str = "") -> str:
        context_str = self._build_context_string(context)
        
        parts = [self.SYSTEM_PROMPT]
        
        if history:
            parts.append(f"\nCONVERSATION HISTORY:\n{history}")
        
        if context_str:
            parts.append(f"\nCURRENT TASKS:\n{context_str}")
        
        parts.append(f"\nUser: {user_input}")
        parts.append("\nNukeno:")
        
        full_prompt = "\n\n".join(parts)
        
        try:
            response = self.model.generate_content(
                full_prompt,
                safety_settings=self._safety_settings,
                generation_config={
                    "temperature": 0.85,
                    "max_output_tokens": 200,
                    "top_p": 0.95,
                    "top_k": 40
                }
            )
            
            if not response.text:
                return "Hmm, I'm thinking... Give me a moment!"
            
            return response.text.strip()
            
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg:
                return "Oops, hit a limit. Give it a minute and try again!"
            elif "blocked" in error_msg:
                return "That one's tricky - let's talk about something else!"
            elif "api key" in error_msg:
                return "Configuration hiccup. Should be fixed soon!"
            else:
                print(f"Gemini error: {e}")
                return "Something slipped my mind. Let's try again!"

    def extract_tasks(self, user_input: str) -> List[Dict]:
        extraction_prompt = f"""Extract tasks from this message. Return ONLY valid JSON array.

Rules:
- Each task needs: title (required), priority (high/medium/low), deadline (ISO format or null)
- Detect urgency from words like "urgent", "asap", "important"
- Detect deadlines from phrases like "by tomorrow", "next week", "at 3pm"
- Keep titles under 50 characters

Message: {user_input}

JSON Response:"""

        try:
            response = self.model.generate_content(
                extraction_prompt,
                generation_config={"temperature": 0.1, "max_output_tokens": 500}
            )
            
            text = response.text.strip()
            
            if text.startswith("```"):
                parts = text.split("```")
                if len(parts) >= 3:
                    text = parts[1]
                    if text.startswith("json"):
                        text = text[4:]
            
            text = text.strip()
            
            tasks = json.loads(text)
            
            if not isinstance(tasks, list):
                return []
            
            normalized = []
            for task in tasks:
                if isinstance(task, dict) and task.get("title"):
                    normalized.append({
                        "title": task["title"][:100],
                        "priority": task.get("priority", "medium"),
                        "deadline": task.get("deadline")
                    })
            
            return normalized
            
        except json.JSONDecodeError as e:
            print(f"Task extraction JSON error: {e}")
            return []
        except Exception as e:
            print(f"Task extraction error: {e}")
            return []

gemini_service = GeminiService()
