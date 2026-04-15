# app.py
# Responsible for: initializing the Flask app, registering all route blueprints
# under the /api prefix, enabling CORS, and exposing a health-check endpoint.

from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load paymates/backend/.env regardless of current working directory (so FRONTEND_BASE_URL
# and SMTP settings apply when Flask is started from the repo root or from paymates/backend).
_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

from routes.auth import auth_bp
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
# Health check
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    """Simple liveness probe — confirms Flask is running."""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
