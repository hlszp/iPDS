"""Auth schemas — login request and token response."""

from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., max_length=64)
    password: str = Field(..., max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    display_name: Optional[str] = None


class UserSummary(BaseModel):
    username: str
    role: str
    display_name: Optional[str] = None
    created_at: Optional[str] = None
