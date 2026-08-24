"""Exponential backoff retry decorator for network/API calls."""

import time
import functools
from typing import Callable, Any, Type, Tuple
from app.utils.logging import get_logger

logger = get_logger("retry")


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
) -> Callable:
    """Decorator to retry a function with exponential backoff upon encountering specific exceptions."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.warning(
                            f"[Retry] {func.__name__} failed on final attempt ({attempt}/{max_retries}): {e}"
                        )
                        raise
                    
                    logger.info(
                        f"[Retry] {func.__name__} failed (attempt {attempt}/{max_retries}): {e}. Retrying in {delay:.1f}s..."
                    )
                    time.sleep(delay)
                    delay *= backoff_factor

            if last_exception:
                raise last_exception

        return wrapper

    return decorator
