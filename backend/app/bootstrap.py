"""Application bootstrap helpers."""

import secrets
from typing import Dict

from .config.features import FeatureFlag, load_features
from .config.settings import settings
from .data.database import SessionLocal
from .models.user import User
from .main_seed import ensure_loop_schema, migrate_plant_device, seed_loop_groups, seed_loops
from .tdengine_init import init_tdengine_runtime_schema


def bootstrap_application() -> None:
    ensure_loop_schema()
    _seed_features()
    if settings.runtime_data_source == "tdengine":
        try:
            init_tdengine_runtime_schema()
        except Exception:
            pass
    if settings.enable_dev_seed:
        _seed_admin()
        migrate_plant_device()
        seed_loop_groups()
        seed_loops()
    elif settings.bootstrap_admin_username and settings.bootstrap_admin_password:
        create_initial_admin(settings.bootstrap_admin_username, settings.bootstrap_admin_password)


def validate_security_defaults() -> None:
    if settings.environment != "development":
        if not settings.jwt_secret or settings.jwt_secret == settings.dev_jwt_secret:
            raise RuntimeError("PDS_JWT_SECRET must be set to a non-default value outside development")
        if settings.enable_dev_seed:
            raise RuntimeError("PDS_ENABLE_DEV_SEED must be false outside development")
        if settings.cors_allow_all:
            raise RuntimeError("Wildcard CORS is only allowed in development")
        if not settings.bootstrap_admin_username or not settings.bootstrap_admin_password:
            raise RuntimeError("Bootstrap admin credentials are required outside development")


def create_initial_admin(username: str, password: str, display_name: str = "管理员") -> None:
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            return
        pw_hash, salt = User.hash_password(password)
        db.add(User(username=username, password_hash=pw_hash, salt=salt, role="admin", display_name=display_name))
        db.commit()
    finally:
        db.close()


def generate_bootstrap_admin_password() -> str:
    return secrets.token_urlsafe(18)


def _seed_admin() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == settings.dev_admin_username).first():
            pw_hash, salt = User.hash_password(settings.dev_admin_password)
            db.add(User(
                username=settings.dev_admin_username,
                password_hash=pw_hash,
                salt=salt,
                role="admin",
                display_name="管理员",
            ))
            db.commit()
    finally:
        db.close()


def _seed_features() -> None:
    db = SessionLocal()
    try:
        defaults: Dict[str, bool] = {
            "assessment": True,
            "diagnosis": True,
            "identification": True,
            "tuning": True,
            "simulation": True,
            "reporting": True,
        }
        for key, enabled in defaults.items():
            if not db.query(FeatureFlag).filter(FeatureFlag.key == key).first():
                db.add(FeatureFlag(key=key, enabled=enabled))
        db.commit()
        load_features(db)
    finally:
        db.close()
