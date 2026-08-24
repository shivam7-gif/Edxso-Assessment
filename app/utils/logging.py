"""Logging configuration using standard Python logging and Rich formatting."""

import logging
import sys
from typing import Optional
from rich.console import Console
from rich.logging import RichHandler

# Ensure UTF-8 output encoding across Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(legacy_windows=False)

_loggers: dict[str, logging.Logger] = {}


def get_logger(name: str = "edxso_outreach", level: Optional[str] = None) -> logging.Logger:
    """Get or configure a rich-formatted logger."""
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)
    log_level = getattr(logging, (level or "INFO").upper(), logging.INFO)
    logger.setLevel(log_level)

    if not logger.handlers:
        handler = RichHandler(
            console=console,
            show_time=True,
            show_path=False,
            rich_tracebacks=True,
            markup=True,
        )
        formatter = logging.Formatter("%(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.propagate = False
    _loggers[name] = logger
    return logger
