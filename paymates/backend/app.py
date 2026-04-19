# app.py
# Responsible for: initializing the Flask app, registering all route blueprints
# under the /api prefix, enabling CORS, and exposing a health-check endpoint.

from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS

# Load paymates/backend/.env regardless of current working directory (so FRONTEND_BASE_URL
# and SMTP settings apply when Flask is started from the repo root or from paymates/backend).
_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

from routes.auth import auth_bp, get_valid_token_record
from routes.bills import bills_bp
from routes.dues import dues_bp
from routes.expenses import expenses_bp
from routes.homes import homes_bp
from routes.items import items_bp
from routes.roommates import roommates_bp

app = Flask(__name__)

# Allow requests from the Vite dev server
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# ---------------------------------------------------------------------------
# Register blueprints – all live under /api
# ---------------------------------------------------------------------------
app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(homes_bp,     url_prefix="/api")       # UC02 home CRUD
app.register_blueprint(roommates_bp, url_prefix="/api/homes") # UC03 member mgmt
app.register_blueprint(bills_bp,     url_prefix="/api")
app.register_blueprint(expenses_bp,  url_prefix="/api")
app.register_blueprint(items_bp,     url_prefix="/api")
app.register_blueprint(dues_bp,      url_prefix="/api")       # UC06 dues


# ---------------------------------------------------------------------------
# Auth middleware — protect all /api/* endpoints except the public allowlist
# ---------------------------------------------------------------------------
# Public endpoints callable without an Authorization header. Entries here are
# matched against the Flask endpoint name (blueprint.view_func) so blueprint
# URL prefixes don't have to be duplicated.
_PUBLIC_ENDPOINTS = frozenset({
    "health",
    "auth.login",
    "auth.signup",
    "auth.verify",
    "auth.setup",
})


def _extract_bearer_token() -> str:
    """Pull the bearer token out of the Authorization header, if present."""
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return ""
    return header.split(" ", 1)[1].strip()


@app.before_request
def _require_auth_for_api():
    """Reject unauthenticated requests to protected /api/* endpoints."""
    # Preflight requests carry no Authorization header; flask-cors handles them.
    if request.method == "OPTIONS":
        return None

    # Only guard API traffic — anything else (if ever added) is left untouched.
    if not request.path.startswith("/api/"):
        return None

    # Allow the auth bootstrap + health routes without a token.
    if request.endpoint in _PUBLIC_ENDPOINTS:
        return None

    # Unknown routes fall through to Flask's own 404 handler; we only guard
    # requests that resolved to a real endpoint to avoid hiding 404s as 401s.
    if request.endpoint is None:
        return None

    token = _extract_bearer_token()
    record = get_valid_token_record(token)
    if not record:
        return jsonify({"error": "Authentication required"}), 401

    # Stash the resolved identity so downstream handlers can rely on it.
    g.auth_email = record.get("email")
    g.auth_token = token
    return None


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    """Simple liveness probe — confirms Flask is running."""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
