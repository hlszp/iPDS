"""Application settings via Pydantic."""

from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PDS"
    environment: str = "development"
    debug: bool = False
    cors_allow_all: bool = True
    cors_origins: List[str] = Field(default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"])

    # Database
    database_url: str = "sqlite:///pds_config.db"

    # Runtime data source
    runtime_data_source: str = "mock"

    # TDengine
    tdengine_host: str = "localhost"
    tdengine_port: int = 6030
    tdengine_user: str = "root"
    tdengine_password: str = "taosdata"
    tdengine_database: str = "pds"

    # Auth
    dev_jwt_secret: str = "change-me-in-development-32-bytes"
    jwt_secret: str = "change-me-in-development-32-bytes"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Bootstrap
    enable_dev_seed: bool = True
    dev_admin_username: str = "admin"
    dev_admin_password: str = "admin123"
    bootstrap_admin_username: Optional[str] = None
    bootstrap_admin_password: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_prefix="PDS_")


settings = Settings()
