"""Feature flags API — list and toggle feature switches."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config.features import FeatureFlag, load_features
from ..data.database import get_db

router = APIRouter(prefix="/api/features", tags=["features"])


@router.get("")
def list_features(db: Session = Depends(get_db)):
    """List all feature flags."""
    flags = db.query(FeatureFlag).all()
    return [
        {"key": f.key, "enabled": f.enabled}
        for f in flags
    ]


@router.put("/{key}")
def update_feature(key: str, enabled: bool, db: Session = Depends(get_db)):
    """Enable or disable a feature flag."""
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature '{key}' not found")
    flag.enabled = enabled
    db.commit()
    load_features(db)
    return {"key": key, "enabled": enabled}
