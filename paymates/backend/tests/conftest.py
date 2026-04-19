# tests/conftest.py
# Shared pytest fixtures for the auth REST API test suite.
#
# - Adds the backend directory to sys.path so `import app` works when pytest
#   is invoked from the repo root.
# - Sets the env vars the auth blueprint looks at (MAGIC_LINK_RETURN_TOKEN so
#   tokens come back in JSON, FRONTEND_BASE_URL so the email-service helper
#   can build a URL) BEFORE importing the Flask app.
# - Stubs out `services.email_service.send_magic_link` to avoid real SMTP and
#   to let individual tests force failure paths.
# - Resets the in-memory DB between tests via an autouse fixture that calls
#   seed() after clearing all collections.

import os
import sys
from pathlib import Path

import pytest

# Ensure `paymates/backend/` is importable (pytest may run from the repo root).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Must be set before `app` is imported because auth helpers read them at
# request time, but the email-service helper validates FRONTEND_BASE_URL
# the moment a magic link is built.
os.environ.setdefault("MAGIC_LINK_RETURN_TOKEN", "true")
os.environ.setdefault("FRONTEND_BASE_URL", "http://localhost:5173")


@pytest.fixture(scope="session")
def flask_app():
    """Build the Flask app once per session; individual tests get test_client."""
    from app import app as _app

    _app.testing = True
    return _app


@pytest.fixture
def client(flask_app, monkeypatch):
    """Flask test client with SMTP stubbed to a no-op by default."""
    monkeypatch.setattr("routes.auth.send_magic_link", lambda *a, **k: None)
    with flask_app.test_client() as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_db():
    """Wipe the in-memory DB before each test and re-seed demo data."""
    from mock_db import DB, seed

    for key in ("users", "tokens", "homes", "invites", "bills", "dues", "expenses", "items"):
        DB[key].clear()
    seed()
    yield


@pytest.fixture
def signup_and_get_token(client):
    """Helper: hit /signup for a new email and return the magic-link token."""

    def _do(email: str) -> str:
        resp = client.post("/api/auth/signup", json={"email": email})
        assert resp.status_code == 200, resp.get_json()
        body = resp.get_json()
        assert "token" in body, "MAGIC_LINK_RETURN_TOKEN should expose the token"
        return body["token"]

    return _do
