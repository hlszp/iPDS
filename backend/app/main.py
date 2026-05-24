"""PDS — PID Performance Assessment & Tuning System API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import json

from .config.features import FeatureFlag, load_features
from .config.settings import settings
from .data.database import SessionLocal, engine
from .data.mock import PRESET_LOOPS
from .models.loop import Base, LoopTag
from .models.user import Base as UserBase, User
from .routers import auth as auth_router, config as config_router, commissioning as commissioning_router, features as features_router, loop as loop_router, reports as reports_router

ENG_UNIT_MAP = {"FLOW": "t/h", "LEVEL": "%", "TEMP": "°C", "PRESSURE": "MPa"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    UserBase.metadata.create_all(bind=engine)
    FeatureFlag.__table__.create(bind=engine, checkfirst=True)
    _seed_admin()
    _seed_features()
    _seed_loops()
    yield


def _seed_features():
    db = SessionLocal()
    try:
        defaults = {"assessment": True, "diagnosis": True, "identification": True, "tuning": True, "simulation": True, "reporting": True}
        for key, enabled in defaults.items():
            if not db.query(FeatureFlag).filter(FeatureFlag.key == key).first():
                db.add(FeatureFlag(key=key, enabled=enabled))
        db.commit()
        load_features(db)
    finally:
        db.close()


def _seed_admin():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            pw_hash, salt = User.hash_password("admin123")
            db.add(User(username="admin", password_hash=pw_hash, salt=salt, role="admin", display_name="管理员"))
            db.commit()
    finally:
        db.close()


def _seed_loops():
    db = SessionLocal()
    try:
        for c in PRESET_LOOPS:
            if not db.query(LoopTag).filter(LoopTag.tag_name == c.tag_name).first():
                db.add(LoopTag(
                    tag_name=c.tag_name,
                    unit=c.unit,
                    loop_type=c.loop_type,
                    description=c.description or f"{c.tag_name} 控制回路",
                    pv_tag=f"{c.tag_name}.PV",
                    sp_tag=f"{c.tag_name}.SP",
                    op_tag=f"{c.tag_name}.OP",
                    mode_tag=f"{c.tag_name}.MODE",
                    eng_unit=ENG_UNIT_MAP.get(c.loop_type, "EU"),
                    sample_interval=c.sample_interval,
                    dead_time_typical=c.dead_time,
                ))
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
app.include_router(reports_router.router)
app.include_router(loop_router.router)
app.include_router(commissioning_router.router)
app.include_router(features_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version}
