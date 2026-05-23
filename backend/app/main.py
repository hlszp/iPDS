"""PDS — PID Performance Assessment & Tuning System API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config.settings import settings
from .data.database import SessionLocal, engine
from .models.loop import Base
from .models.user import Base as UserBase, User
from .routers import auth as auth_router, config as config_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    UserBase.metadata.create_all(bind=engine)
    _seed_admin()
    yield


def _seed_admin():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            pw_hash, salt = User.hash_password("admin123")
            db.add(User(username="admin", password_hash=pw_hash, salt=salt, role="admin", display_name="管理员"))
            db.commit()
    finally:
        db.close()


app = FastAPI(
    title="PDS",
    version="0.1.0",
    docs_url="/api/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(config_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version}
