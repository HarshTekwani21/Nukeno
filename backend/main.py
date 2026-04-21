from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from config import config
from routes import chat, voice, tasks, notes, summary, notifications
from routes.auth import router as auth_router, verify_token

_PUBLIC = {"/", "/health", "/auth/login", "/docs", "/redoc", "/openapi.json"}
_PUBLIC_PREFIXES = ("/notifications", "/assets", "/_vite")

DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    mode = "production (serving frontend)" if DIST_DIR.exists() else "API-only"
    print(f"Nukeno API v2 [{mode}] — Whisper: {config.WHISPER_DEVICE} ({config.WHISPER_COMPUTE_TYPE})")
    yield


app = FastAPI(
    title="Nukeno API",
    description="AI Assistant System",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path in _PUBLIC or any(path.startswith(p) for p in _PUBLIC_PREFIXES):
        return await call_next(request)
    # Let static/SPA files through unauthenticated
    if DIST_DIR.exists() and not path.startswith(("/chat", "/voice", "/tasks", "/notes", "/auth", "/daily")):
        return await call_next(request)
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    if not verify_token(auth[7:]):
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
    return await call_next(request)


# ── API routers ────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(summary.router)
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "whisper_device": config.WHISPER_DEVICE,
        "whisper_compute_type": config.WHISPER_COMPUTE_TYPE,
    }


# ── Frontend static files (production) ────────────────────────────────────────
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file = DIST_DIR / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(DIST_DIR / "index.html"))
else:
    @app.get("/")
    async def root():
        return {"name": "Nukeno", "version": "2.0.0", "status": "running — build frontend for UI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
