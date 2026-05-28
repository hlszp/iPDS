"""Database engine and session management.

MVP uses SQLite for configuration data. Phase 2 migrates to PostgreSQL.
TDengine handles time-series loop data via the existing data pipeline.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..config.settings import settings

DATABASE_URL = settings.database_url

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
