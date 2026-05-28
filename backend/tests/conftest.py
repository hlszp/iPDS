"""Shared test fixtures — isolated SQLite DB and TestClient."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.features import FeatureFlag
from app.config.settings import settings
from app.data import database as database_module
from app.data import runtime_provider as runtime_provider_module
from app.data.database import get_db
from app.main import app
from app import main_seed as main_seed_module
from app.models.loop import Base as LoopBase
from app.models.production import MonitoringAggregateSnapshot, ReportArtifact, ReportJob
from app.models.user import Base as UserBase, User

TEST_DB_URL = "sqlite:///./test_pds_config.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def test_db(monkeypatch):
    """Create tables fresh, seed, yield, then drop."""
    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(database_module, "engine", engine)
    monkeypatch.setattr(database_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(runtime_provider_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(main_seed_module, "engine", engine)
    monkeypatch.setattr(main_seed_module, "SessionLocal", TestingSessionLocal)
    runtime_provider_module.reset_runtime_provider()

    LoopBase.metadata.create_all(bind=engine)
    UserBase.metadata.create_all(bind=engine)
    FeatureFlag.__table__.create(bind=engine, checkfirst=True)

    db = TestingSessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            pw_hash, salt = User.hash_password("admin123")
            db.add(User(username="admin", password_hash=pw_hash, salt=salt, role="admin", display_name="管理员"))
        defaults = {"assessment": True, "diagnosis": True, "identification": True, "tuning": True, "simulation": True, "reporting": True}
        for key, enabled in defaults.items():
            if not db.query(FeatureFlag).filter(FeatureFlag.key == key).first():
                db.add(FeatureFlag(key=key, enabled=enabled))
        db.commit()
    finally:
        db.close()

    main_seed_module.migrate_plant_device()
    main_seed_module.seed_loop_groups()
    main_seed_module.seed_loops()

    yield

    FeatureFlag.__table__.drop(bind=engine, checkfirst=True)
    UserBase.metadata.drop_all(bind=engine)
    LoopBase.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def auth_headers(client):
    login_r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
