"""Application settings via Pydantic."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PDS"
    debug: bool = False
    cors_origins: list[str] = ["*"]

    # TDengine
    tdengine_host: str = "localhost"
    tdengine_port: int = 6030
    tdengine_user: str = "root"
    tdengine_password: str = "taosdata"
    tdengine_database: str = "pds"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    class Config:
        env_file = ".env"
        env_prefix = "PDS_"


settings = Settings()
