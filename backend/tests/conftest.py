import os

# Ensure tests use a benign DATABASE_URL when none is provided
os.environ.setdefault("DATABASE_URL", "postgresql://localhost/revvbase_test")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
