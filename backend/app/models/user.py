"""User model — local authentication with role-based access."""

import hashlib
import secrets
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    username = Column(String(64), primary_key=True)
    password_hash = Column(String(128), nullable=False)
    salt = Column(String(64), nullable=False)
    role = Column(String(16), nullable=False, default="viewer")  # admin / engineer / viewer
    display_name = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
        salt = salt or secrets.token_hex(32)
        h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
        return h.hex(), salt

    def verify_password(self, password: str) -> bool:
        h, _ = self.hash_password(password, self.salt)
        return h == self.password_hash
