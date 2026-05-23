"""PDS layered exception hierarchy."""


class PDSError(Exception):
    """Base exception for all PDS errors."""


class DataSourceError(PDSError):
    """TDengine connection or query failure."""


class InsufficientDataError(PDSError):
    """Not enough excitation in loop data for system identification."""


class IdentificationError(PDSError):
    """System identification failed to converge."""


class TuningError(PDSError):
    """PID tuning computation failed."""


class ConfigurationError(PDSError):
    """Invalid system configuration."""
