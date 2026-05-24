"""Authentication routes — login, token refresh, user info."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user, require_role
from ..auth.jwt import create_access_token
from ..data.database import get_db
from ..models.auth_schemas import LoginRequest, TokenResponse, UserSummary
from ..models.user import User

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


@router.get("/users", response_model=list[UserSummary])
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [
        UserSummary(
            username=u.username,
            role=u.role,
            display_name=u.display_name,
            created_at=u.created_at.isoformat() if u.created_at else None,
        )
        for u in users
    ]
