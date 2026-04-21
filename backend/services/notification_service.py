from typing import List, Dict
from db.storage import storage
from services.context_service import context_service

class NotificationService:
    def async_get_notifications(self):
        pass

    async def get_notifications(self) -> List[Dict]:
        tasks = storage.get_tasks()
        analyzed = context_service._analyze_tasks(tasks)
        notifications = []

        for task in analyzed:
            if task.get("completed"):
                continue

            task_id = task.get("id", "unknown")
            status = task.get("status")

            if status == "overdue":
                notifications.append({
                    "id": f"overdue_{task_id}",
                    "type": "overdue",
                    "title": f"Overdue: {task['title']}",
                    "message": "This task is past its deadline.",
                    "priority": task.get("priority", "medium"),
                    "urgency": task.get("urgency_score", 100),
                    "task_id": task_id
                })
            elif status == "today":
                notifications.append({
                    "id": f"today_{task_id}",
                    "type": "due_today",
                    "title": f"Due today: {task['title']}",
                    "message": "This task is due today.",
                    "priority": task.get("priority", "medium"),
                    "urgency": task.get("urgency_score", 90),
                    "task_id": task_id
                })

        return sorted(notifications, key=lambda x: -x["urgency"])[:5]

notification_service = NotificationService()
