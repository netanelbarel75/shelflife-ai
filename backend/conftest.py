import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set environment variables for testing
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DEBUG", "true")

import pytest
from unittest.mock import Mock

@pytest.fixture
def mock_db():
    """Mock database session for testing"""
    return Mock()

@pytest.fixture
def sample_user_id():
    """Sample user ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174000"

@pytest.fixture
def sample_item_id():
    """Sample item ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174001"
