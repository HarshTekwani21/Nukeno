import secrets
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

_USERS = {
    "admin": "harsh",
    "Nukeeta": "Nukeeta@123",
}

_sessions: dict[str, str] = {}  # token -> username


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    if _USERS.get(body.username) == body.password:
        token = secrets.token_hex(32)
        _sessions[token] = body.username
        return {"token": token, "username": body.username}
    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.post("/logout")
async def logout(body: dict):
    _sessions.pop(body.get("token", ""), None)
    return {"success": True}


def verify_token(token: str) -> str | None:
    return _sessions.get(token)
