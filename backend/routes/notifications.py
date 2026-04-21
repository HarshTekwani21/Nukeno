from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
from services.notification_service import notification_service

router = APIRouter()

@router.get("/notifications")
async def get_notifications():
    notifications = await notification_service.get_notifications()
    return {"notifications": notifications}

@router.get("/notifications/stream")
async def notification_stream(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            notifications = await notification_service.get_notifications()

            if notifications:
                yield {
                    "event": "alert",
                    "data": json.dumps(notifications)
                }
            else:
                yield {
                    "event": "heartbeat",
                    "data": "{}"
                }

            await asyncio.sleep(30)

    return EventSourceResponse(event_generator())
