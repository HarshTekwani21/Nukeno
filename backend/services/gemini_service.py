import os
import json
import google.generativeai as genai
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from config import config

class GeminiService:
    SYSTEM_PROMPT = """You are Nukeno — a proactive personal AI operating system.

Your job is NOT to answer questions.
Your job is to analyze, prioritize, and guide.

---

INPUT:
User query + structured context

CONTEXT INCLUDES:
- tasks (with priority and deadlines)
- notes (relevant information)
- meetings
- deadlines

---

THINKING PIPELINE (internal, never mention):

1. INTENT DETECTION
   - What does the user want?
   - What's the emotional state?
   - Is there urgency?

2. CONTEXT AGGREGATION
   - Merge relevant tasks
   - Cross-reference notes
   - Check deadlines

3. PRIORITY DETECTION
   - What must be done NOW?
   - What can wait?
   - What can be delegated?

4. TASK EXTRACTION
   - Identify action items
   - Assign priorities
   - Set deadlines if mentioned

5. ACTION GENERATION
   - One clear next step
   - Why it matters
   - Optional bonus action

---

OUTPUT RULES (STRICT):

- MAX 3 LINES
- NO filler phrases like "Based on your context"
- NO generic responses
- NO repeated user input
- ALWAYS actionable
- Be direct, confident, slightly authoritative

---

RESPONSE FORMAT:

[If urgent]
🔴 PRIORITY: [specific action]

[One clear next step]
[Why now]

[Optional: bonus action]

---

EXAMPLES:

User: "what should I do today"
Nukeno:
🔴 Client meeting in 2 hours.
Finish Rahul's proposal now.
10 min prep before meeting.

---

User: "i'm overwhelmed"
Nukeno:
You're carrying too much.
Pick ONE: finish the proposal.
Everything else waits.

---

User: "remind me to call mom"
Nukeno:
What time? Be specific.
"I need to call mom at 3 PM" works.

---

User: "how's my week looking"
Nukeno:
📅 3 deadlines this week.
2 high-priority tasks.
Clear Monday/Tuesday first.

---

PERSONALITY:

- Calm under pressure
- Sharp and decisive
- Like a chief of staff
- Proactive, not reactive

---

GOAL:

User should think:
"This AI actually gets my life and tells me what matters."

Be concise. Be actionable. Be smart."""

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
            parts.append("📋 TASKS:")
            for t in sorted(tasks, key=lambda x: (
                {"high": 0, "medium": 1, "low": 2}.get(x.get("priority", "medium"), 1),
                x.get("deadline") or "9999"
            ))[:5]:
                priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(t.get("priority", "medium"), "⚪")
                deadline = t.get("deadline", "no deadline")
                if deadline and deadline != "no deadline":
                    try:
                        dt = datetime.fromisoformat(deadline)
                        now = datetime.now()
                        if dt.date() < now.date():
                            deadline = f"OVERDUE ({deadline})"
                        elif dt.date() == now.date():
                            deadline = f"TODAY at {dt.strftime('%I:%M %p')}"
                        else:
                            deadline = f"Due: {dt.strftime('%b %d')}"
                    except:
                        pass
                parts.append(f"  {priority_emoji} {t.get('title', '')} [{t.get('priority', 'medium').upper()}] {deadline}")
        
        if notes := context.get("notes"):
            parts.append("\n📓 RECENT NOTES:")
            for n in notes[-3:]:
                content = n.get("content", "")[:80]
                parts.append(f"  • {n.get('title', 'Untitled')}: {content}...")
        
        if summary := context.get("summary"):
            parts.append("\n📊 OVERVIEW:")
            parts.append(f"  Total: {summary.get('total_tasks', 0)} tasks")
            parts.append(f"  High priority: {summary.get('high_priority_count', 0)}")
            if summary.get('overdue_count', 0) > 0:
                parts.append(f"  🔴 OVERDUE: {summary.get('overdue_count', 0)}")
        
        return "\n".join(parts) if parts else ""

    def generate_response(self, user_input: str, context: Optional[Dict] = None) -> str:
        context_str = self._build_context_string(context)
        
        if context_str:
            full_prompt = f"{self.SYSTEM_PROMPT}\n\n---\nCONTEXT:\n{context_str}\n---\n\nUser: {user_input}\n\nNukeno:"
        else:
            full_prompt = f"{self.SYSTEM_PROMPT}\n\nUser: {user_input}\n\nNukeno:"
        
        try:
            response = self.model.generate_content(
                full_prompt,
                safety_settings=self._safety_settings,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 150,
                    "top_p": 0.9,
                    "top_k": 40
                }
            )
            
            if not response.text:
                return "I'm processing that. Give me a moment."
            
            return response.text.strip()
            
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg:
                return "⚠️ API limit reached. Try again shortly."
            elif "blocked" in error_msg:
                return "I can't respond to that. Let's try something else."
            elif "api key" in error_msg:
                return "Configuration error. Check API key."
            else:
                print(f"Gemini error: {e}")
                return "Something went wrong. Try again."

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

    async def generate_streaming_response(self, user_input: str, context: Optional[Dict] = None):
        context_str = self._build_context_string(context)
        
        if context_str:
            full_prompt = f"{self.SYSTEM_PROMPT}\n\n---\nCONTEXT:\n{context_str}\n---\n\nUser: {user_input}\n\nNukeno:"
        else:
            full_prompt = f"{self.SYSTEM_PROMPT}\n\nUser: {user_input}\n\nNukeno:"
        
        try:
            response = self.model.generate_content(
                full_prompt,
                safety_settings=self._safety_settings,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 150,
                },
                stream=True
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"Streaming error: {e}")
            yield "Error generating response."

gemini_service = GeminiService()
