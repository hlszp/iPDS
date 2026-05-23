"""Authentication routes — login, token refresh, user info."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..auth.jwt import create_access_token
from ..data.database import get_db
from ..models.user import User
from ..models.auth_schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not user.verify_password(payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.username, user.role)
    return TokenResponse(
        access_token=token,
        username=user.username,
        role=user.role,
        display_name=user.display_name,
    )


@router.get("/me", response_model=TokenResponse)
def me(user: User = Depends(get_current_user)):
    return TokenResponse(
        access_token="",
        username=user.username,
        role=user.role,
        display_name=user.display_name,
    )
