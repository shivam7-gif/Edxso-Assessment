"""Pytest configuration and global fixtures."""

import pytest
from app.database.database import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database schema and all columns are initialized before tests run."""
    init_db()
