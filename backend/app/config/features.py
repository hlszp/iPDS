"""T14: Feature flags — module-level authorization per customer deployment.

Allows deploying a single codebase with per-customer module toggles.
Stored in the config database with a simple admin API.
"""

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


@dataclass
class FeatureSet:
    """In-memory feature flag snapshot, loaded at startup."""
    assessment: bool = True
    diagnosis: bool = True
    identification: bool = True
    tuning: bool = True
    simulation: bool = True
    reporting: bool = True
    alarm_management: bool = False  # separate product
    customer_name: str = "default"


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    key = Column(String(64), primary_key=True)
    enabled = Column(Boolean, default=True, nullable=False)


# In-memory cache, set at startup
_features: Optional[FeatureSet] = None


def load_features(db) -> FeatureSet:
    """Load feature flags from database. Called at startup."""
    global _features
    flags = {f.key: f.enabled for f in db.query(FeatureFlag).all()}
    _features = FeatureSet(
        assessment=flags.get("assessment", True),
        diagnosis=flags.get("diagnosis", True),
        identification=flags.get("identification", True),
        tuning=flags.get("tuning", True),
        simulation=flags.get("simulation", True),
        reporting=flags.get("reporting", True),
        alarm_management=flags.get("alarm_management", False),
        customer_name=flags.get("customer_name", "default"),
    )
    return _features


def get_features() -> FeatureSet:
    """Get current feature set. Returns defaults if not yet loaded."""
    global _features
    if _features is None:
        _features = FeatureSet()
    return _features


def is_enabled(module: str) -> bool:
    fs = get_features()
    return getattr(fs, module, False)
