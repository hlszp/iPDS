"""PDS — PID Performance Assessment & Tuning System API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import settings

app = FastAPI(
    title="PDS",
    version="0.1.0",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version}
