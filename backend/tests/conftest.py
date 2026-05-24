"""Shared test fixtures — isolated SQLite DB and TestClient."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.database import get_db
from app.main import app

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
def test_db():
    """Create tables fresh, seed, yield, then drop."""
    from app.models.loop import Base as LoopBase
    from app.models.user import Base as UserBase
    from app.config.features import FeatureFlag

    LoopBase.metadata.create_all(bind=engine)
    UserBase.metadata.create_all(bind=engine)
    FeatureFlag.__table__.create(bind=engine, checkfirst=True)

    db = TestingSessionLocal()
    try:
        from app.models.user import User
        if not db.query(User).filter(User.username == "admin").first():
            pw_hash, salt = User.hash_password("admin123")
            db.add(User(username="admin", password_hash=pw_hash, salt=salt, role="admin", display_name="管理员"))
        defaults = {"assessment": True, "diagnosis": True, "identification": True, "tuning": True, "simulation": True, "reporting": True}
        for key, enabled in defaults.items():
            if not db.query(FeatureFlag).filter(FeatureFlag.key == key).first():
                db.add(FeatureFlag(key=key, enabled=enabled))
        from app.data.mock import PRESET_LOOPS
        from app.models.loop import LoopTag
        ENG_UNIT_MAP = {"FLOW": "t/h", "LEVEL": "%", "TEMP": "°C", "PRESSURE": "MPa"}
        for c in PRESET_LOOPS:
            if not db.query(LoopTag).filter(LoopTag.tag_name == c.tag_name).first():
                db.add(LoopTag(
                    tag_name=c.tag_name, unit=c.unit, loop_type=c.loop_type,
                    description=c.description or f"{c.tag_name} 控制回路",
                    pv_tag=f"{c.tag_name}.PV", sp_tag=f"{c.tag_name}.SP",
                    op_tag=f"{c.tag_name}.OP", mode_tag=f"{c.tag_name}.MODE",
                    eng_unit=ENG_UNIT_MAP.get(c.loop_type, "EU"),
                    sample_interval=c.sample_interval, dead_time_typical=c.dead_time,
                ))
        db.commit()
    finally:
        db.close()

    yield

    LoopBase.metadata.drop_all(bind=engine)
    UserBase.metadata.drop_all(bind=engine)
    FeatureFlag.__table__.drop(bind=engine, checkfirst=True)


@pytest.fixture
def client():
    return TestClient(app)
